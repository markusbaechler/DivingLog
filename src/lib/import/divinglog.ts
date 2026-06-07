import { XMLParser } from "fast-xml-parser";
import type { ParsedDive } from "../types";

/**
 * Importiert UDDF-Dateien (Universal Dive Data Format), das von
 * DivingLog (divinglog.com) und vielen Tauchcomputern exportiert wird.
 *
 * UDDF-Konventionen: Tiefe in Metern, Dauer in Sekunden,
 * Temperaturen in Kelvin.
 */

function toArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isNaN(n) ? null : n;
}

function kelvinToC(v: unknown): number | null {
  const n = num(v);
  if (n == null) return null;
  // Werte > 100 sind mit hoher Wahrscheinlichkeit Kelvin.
  const c = n > 100 ? n - 273.15 : n;
  return Math.round(c * 10) / 10;
}

export function parseUddf(xml: string): ParsedDive[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: true,
    trimValues: true,
  });
  const doc = parser.parse(xml);
  const uddf = doc.uddf;
  if (!uddf) return [];

  // ---- Tauchplätze einlesen (id -> Site) ----
  const siteMap = new Map<string, ParsedDive["site"]>();
  const siteNodes = toArray(uddf.divesite?.site);
  for (const s of siteNodes) {
    const id = String(s["@_id"] ?? s.id ?? "");
    const geo = s.geography ?? {};
    siteMap.set(id, {
      name: String(s.name ?? geo.location ?? "Unbenannter Tauchplatz"),
      latitude: num(geo.latitude),
      longitude: num(geo.longitude),
      country: geo.country ? String(geo.country) : null,
      region: geo.location ? String(geo.location) : null,
      water_type: null,
      notes: null,
    });
  }

  // ---- Tauchgänge ----
  const dives: ParsedDive[] = [];
  const groups = toArray(uddf.profiledata?.repetitiongroup);

  for (const group of groups) {
    for (const d of toArray(group.dive)) {
      const before = d.informationbeforedive ?? {};
      const after = d.informationafterdive ?? {};

      const datetime =
        before.datetime ?? d.datetime ?? after.datetime ?? null;
      const diveDate = datetime
        ? new Date(String(datetime)).toISOString()
        : new Date().toISOString();

      // Profil-Samples
      const waypoints = toArray(d.samples?.waypoint);
      const samples = waypoints
        .map((w, i) => ({
          time_seconds: Math.round(num(w.divetime) ?? i),
          depth: num(w.depth),
          temperature: kelvinToC(w.temperature),
        }))
        .filter((s) => s.depth != null || s.temperature != null);

      const sampleDepths = samples
        .map((s) => s.depth)
        .filter((v): v is number => v != null);
      const sampleTemps = samples
        .map((s) => s.temperature)
        .filter((v): v is number => v != null);

      const durationSec =
        num(after.diveduration) ?? num(d.diveduration) ?? null;

      const externalId = String(d["@_id"] ?? d.id ?? `uddf:${diveDate}`);

      const parsed: ParsedDive = {
        dive: {
          dive_date: diveDate,
          dive_number: num(before.divenumber),
          max_depth:
            num(after.greatestdepth) ??
            (sampleDepths.length ? Math.max(...sampleDepths) : null),
          avg_depth: num(after.averagedepth),
          duration: durationSec != null ? Math.round(durationSec / 60) : null,
          water_temp_bottom:
            kelvinToC(after.lowesttemperature) ??
            (sampleTemps.length ? Math.min(...sampleTemps) : null),
          visibility: num(after.visibility?.underwater ?? after.visibility),
          notes: before.notes ? String(before.notes) : null,
          entry_source: "divinglog",
          external_id: externalId,
        },
        samples,
      };

      // Verknüpften Tauchplatz auflösen
      const ref = before.link?.["@_ref"] ?? before.link?.ref;
      if (ref && siteMap.has(String(ref))) {
        parsed.site = siteMap.get(String(ref));
      }

      dives.push(parsed);
    }
  }

  return dives;
}
