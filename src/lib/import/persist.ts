import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedDive } from "../types";

export interface ImportResult {
  imported: number;
  skipped: number;
  sitesCreated: number;
  errors: string[];
}

/**
 * Persistiert geparste Tauchgänge für einen Benutzer.
 * Dedupliziert anhand von (entry_source, external_id).
 * Tauchplätze werden anhand von Name (+Koordinaten) wiederverwendet.
 */
export async function persistParsedDives(
  supabase: SupabaseClient,
  userId: string,
  parsed: ParsedDive[],
): Promise<ImportResult> {
  let imported = 0;
  let skipped = 0;
  let sitesCreated = 0;
  const errorSet = new Set<string>();

  // Bestehende Tauchplätze des Nutzers laden (für Wiederverwendung)
  const { data: existingSites } = await supabase
    .from("dive_sites")
    .select("id, name, latitude, longitude")
    .eq("user_id", userId);

  const siteCache = new Map<string, string>();
  for (const s of existingSites ?? []) {
    siteCache.set(siteKey(s.name, s.latitude, s.longitude), s.id);
  }

  // Bestehende Tauchgänge für die unscharfe (quellenübergreifende) Dublettenprüfung
  const { data: existingDives } = await supabase
    .from("dives")
    .select("dive_date, max_depth, duration, entry_source, external_id")
    .eq("user_id", userId);
  const known: DiveFingerprint[] = (existingDives ?? []).map((d) => ({
    time: new Date(d.dive_date).getTime(),
    depth: d.max_depth,
    duration: d.duration,
    source: d.entry_source,
    externalId: d.external_id,
  }));

  for (const p of parsed) {
    const externalId = p.dive.external_id ?? null;
    const fp: DiveFingerprint = {
      time: new Date(p.dive.dive_date ?? Date.now()).getTime(),
      depth: p.dive.max_depth ?? null,
      duration: p.dive.duration ?? null,
      source: p.dive.entry_source ?? "manual",
      externalId,
    };

    // 1) Exakte Dublette (gleiche Quelle + externe ID) ODER unscharfe Dublette
    if (known.some((k) => isDuplicate(k, fp))) {
      skipped++;
      continue;
    }

    // 2) Tauchplatz auflösen / anlegen
    let diveSiteId: string | null = null;
    if (p.site && p.site.name) {
      const key = siteKey(
        p.site.name,
        p.site.latitude ?? null,
        p.site.longitude ?? null,
      );
      if (siteCache.has(key)) {
        diveSiteId = siteCache.get(key)!;
      } else {
        const { data: newSite, error } = await supabase
          .from("dive_sites")
          .insert({
            user_id: userId,
            name: p.site.name,
            latitude: p.site.latitude ?? null,
            longitude: p.site.longitude ?? null,
            country: p.site.country ?? null,
            region: p.site.region ?? null,
            water_type: p.site.water_type ?? null,
          })
          .select("id")
          .single();
        if (!error && newSite) {
          diveSiteId = newSite.id;
          siteCache.set(key, newSite.id);
          sitesCreated++;
        }
      }
    }

    // 3) Tauchgang anlegen (nur gesetzte Felder übernehmen)
    const d = p.dive;
    const payload: Record<string, unknown> = {
      user_id: userId,
      dive_site_id: diveSiteId,
      dive_date: d.dive_date ?? new Date().toISOString(),
      entry_source: d.entry_source ?? "manual",
      external_id: externalId,
    };
    const optional = [
      "title", "dive_number", "max_depth", "avg_depth", "duration",
      "surface_interval", "is_repetitive", "water_temp_surface",
      "water_temp_bottom", "water_temp_avg", "air_temp", "visibility",
      "weather", "current_strength", "surface_conditions", "weight",
      "suit_type", "tank_volume", "gas_o2", "gas_he", "pressure_start",
      "pressure_end", "dive_type", "entry_type", "event_type", "buddy",
      "dive_guide", "calories", "avg_heart_rate", "max_heart_rate",
      "n2_start", "n2_end", "cns_start", "cns_end", "water_density",
      "gf_low", "gf_high", "deco_model", "safety_stop", "entry_latitude",
      "entry_longitude", "exit_latitude", "exit_longitude", "rating", "notes",
    ] as const;
    for (const key of optional) {
      const value = (d as Record<string, unknown>)[key];
      if (value !== undefined && value !== null) payload[key] = value;
    }

    const { data: newDive, error: diveErr } = await supabase
      .from("dives")
      .insert(payload)
      .select("id")
      .single();

    if (diveErr || !newDive) {
      skipped++;
      if (diveErr?.message) errorSet.add(diveErr.message);
      continue;
    }
    imported++;
    known.push(fp); // gegen Dubletten innerhalb desselben Imports

    // 4) Samples (gebündelt einfügen)
    if (p.samples && p.samples.length) {
      const rows = p.samples.map((s) => ({
        dive_id: newDive.id,
        time_seconds: s.time_seconds,
        depth: s.depth,
        temperature: s.temperature,
        heart_rate: s.heart_rate ?? null,
        pressure: s.pressure ?? null,
        ndl: s.ndl ?? null,
        n2_load: s.n2_load ?? null,
        cns_load: s.cns_load ?? null,
      }));
      // In Blöcken einfügen, um Limits zu vermeiden
      for (let i = 0; i < rows.length; i += 500) {
        await supabase.from("dive_samples").insert(rows.slice(i, i + 500));
      }
    }
  }

  return { imported, skipped, sitesCreated, errors: [...errorSet].slice(0, 5) };
}

function siteKey(name: string, lat: number | null, lon: number | null): string {
  const r = (n: number | null) => (n == null ? "" : n.toFixed(3));
  return `${name.trim().toLowerCase()}|${r(lat)}|${r(lon)}`;
}

interface DiveFingerprint {
  time: number; // ms seit Epoch
  depth: number | null;
  duration: number | null;
  source: string;
  externalId: string | null;
}

// Zeitfenster für die unscharfe Prüfung. Bewusst klein gehalten, damit mehrere
// Tauchgänge pro Tag nicht fälschlich als Dublette verworfen werden. ±13 h deckt
// Zeitzonen-Verschiebungen (CSV in Lokalzeit vs. FIT in UTC) ab.
const FUZZY_WINDOW_MS = 13 * 60 * 60 * 1000;

/**
 * Dublettenerkennung:
 *  - exakt: gleiche Quelle + gleiche externe ID (z. B. erneuter Import derselben Datei)
 *  - unscharf (quellenübergreifend): nur wenn Tiefe UND Dauer beide vorhanden sind
 *    und sehr eng übereinstimmen (Tiefe ±1 m, Dauer ±2 min) und die Zeit innerhalb
 *    des Fensters liegt. Konservativ, um echte Tauchgänge nicht zu verlieren.
 */
function isDuplicate(a: DiveFingerprint, b: DiveFingerprint): boolean {
  if (a.externalId && b.externalId && a.source === b.source) {
    return a.externalId === b.externalId;
  }
  // Unscharf nur quellenübergreifend und nur mit beiden harten Kennzahlen.
  if (a.source === b.source) return false;
  if (a.depth == null || b.depth == null) return false;
  if (a.duration == null || b.duration == null) return false;
  if (Math.abs(a.time - b.time) > FUZZY_WINDOW_MS) return false;
  return Math.abs(a.depth - b.depth) <= 1 && Math.abs(a.duration - b.duration) <= 2;
}
