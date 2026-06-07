import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedDive } from "../types";

export interface ImportResult {
  imported: number;
  skipped: number;
  sitesCreated: number;
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

  // Bestehende Tauchplätze des Nutzers laden (für Wiederverwendung)
  const { data: existingSites } = await supabase
    .from("dive_sites")
    .select("id, name, latitude, longitude")
    .eq("user_id", userId);

  const siteCache = new Map<string, string>();
  for (const s of existingSites ?? []) {
    siteCache.set(siteKey(s.name, s.latitude, s.longitude), s.id);
  }

  for (const p of parsed) {
    // 1) Dedupe-Check
    const externalId = p.dive.external_id ?? null;
    if (externalId) {
      const { data: dup } = await supabase
        .from("dives")
        .select("id")
        .eq("user_id", userId)
        .eq("entry_source", p.dive.entry_source ?? "manual")
        .eq("external_id", externalId)
        .maybeSingle();
      if (dup) {
        skipped++;
        continue;
      }
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

    // 3) Tauchgang anlegen
    const { data: newDive, error: diveErr } = await supabase
      .from("dives")
      .insert({
        user_id: userId,
        dive_site_id: diveSiteId,
        dive_date: p.dive.dive_date ?? new Date().toISOString(),
        dive_number: p.dive.dive_number ?? null,
        max_depth: p.dive.max_depth ?? null,
        avg_depth: p.dive.avg_depth ?? null,
        duration: p.dive.duration ?? null,
        water_temp_surface: p.dive.water_temp_surface ?? null,
        water_temp_bottom: p.dive.water_temp_bottom ?? null,
        visibility: p.dive.visibility ?? null,
        notes: p.dive.notes ?? null,
        entry_source: p.dive.entry_source ?? "manual",
        external_id: externalId,
      })
      .select("id")
      .single();

    if (diveErr || !newDive) {
      skipped++;
      continue;
    }
    imported++;

    // 4) Samples (gebündelt einfügen)
    if (p.samples && p.samples.length) {
      const rows = p.samples.map((s) => ({
        dive_id: newDive.id,
        time_seconds: s.time_seconds,
        depth: s.depth,
        temperature: s.temperature,
      }));
      // In Blöcken einfügen, um Limits zu vermeiden
      for (let i = 0; i < rows.length; i += 500) {
        await supabase.from("dive_samples").insert(rows.slice(i, i + 500));
      }
    }
  }

  return { imported, skipped, sitesCreated };
}

function siteKey(name: string, lat: number | null, lon: number | null): string {
  const r = (n: number | null) => (n == null ? "" : n.toFixed(3));
  return `${name.trim().toLowerCase()}|${r(lat)}|${r(lon)}`;
}
