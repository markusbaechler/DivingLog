import type { ParsedDive } from "../types";

// fit-file-parser ist ein CommonJS-Modul ohne Typdefinitionen.
// Wir laden es dynamisch, damit der Build (Edge/Bundler) nicht stolpert.
type FitData = {
  sessions?: Array<Record<string, unknown>>;
  records?: Array<Record<string, unknown>>;
  dive_summary?: Array<Record<string, unknown>>;
  activity?: Record<string, unknown>;
};

function num(v: unknown): number | null {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function toIso(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

async function parseFit(buffer: Buffer): Promise<FitData> {
  // CommonJS-Interop: je nach Bundler liegt der Konstruktor unter
  // .default, .default.default oder direkt im Modulobjekt.
  const mod = (await import("fit-file-parser")) as unknown as Record<
    string,
    unknown
  >;
  const candidates = [
    (mod.default as Record<string, unknown> | undefined)?.default,
    mod.default,
    mod,
  ];
  const FitParser = candidates.find(
    (c) => typeof c === "function",
  ) as new (opts: unknown) => unknown;
  if (!FitParser) throw new Error("fit-file-parser konnte nicht geladen werden");

  const parser = new FitParser({
    force: true,
    speedUnit: "km/h",
    lengthUnit: "m",
    temperatureUnit: "celsius",
    elapsedRecordField: true,
    mode: "list",
  }) as { parse: (b: Buffer, cb: (err: unknown, data: FitData) => void) => void };

  return new Promise((resolve, reject) => {
    parser.parse(buffer, (err, data) => {
      if (err) reject(err instanceof Error ? err : new Error(String(err)));
      else resolve(data);
    });
  });
}

/**
 * Wandelt eine Garmin-FIT-Datei (Tauchaktivität) in einen oder mehrere
 * normalisierte Tauchgänge inkl. Profil-Samples um.
 */
export async function parseGarminFit(buffer: Buffer): Promise<ParsedDive[]> {
  const data = await parseFit(buffer);
  const records = data.records ?? [];
  const sessions = data.sessions ?? [];

  // Samples aus den Records (Tiefe/Temperatur über Zeit)
  const samples = records
    .map((r) => {
      const depth = num(r.depth) ?? num(r.enhanced_depth);
      const temperature = num(r.temperature);
      const elapsed = num(r.elapsed_time) ?? num(r.timer_time);
      const ts = toIso(r.timestamp);
      return { depth, temperature, elapsed, ts };
    })
    .filter((s) => s.depth != null || s.temperature != null);

  const firstTs = samples.find((s) => s.ts)?.ts ?? null;

  function buildSamples(): ParsedDive["samples"] {
    if (!samples.length) return [];
    const base = firstTs ? new Date(firstTs).getTime() : null;
    return samples.map((s, i) => {
      let t = s.elapsed;
      if (t == null && base != null && s.ts) {
        t = Math.round((new Date(s.ts).getTime() - base) / 1000);
      }
      return {
        time_seconds: t ?? i,
        depth: s.depth,
        temperature: s.temperature,
      };
    });
  }

  // Bevorzugt aus der Session, sonst aus den Samples ableiten.
  const session = sessions[0] ?? {};
  const depths = samples.map((s) => s.depth).filter((d): d is number => d != null);
  const temps = samples.map((s) => s.temperature).filter((d): d is number => d != null);

  const maxDepth =
    num(session.max_depth) ??
    num((data.dive_summary?.[0] ?? {}).max_depth) ??
    (depths.length ? Math.max(...depths) : null);
  const avgDepth =
    num(session.avg_depth) ??
    num((data.dive_summary?.[0] ?? {}).avg_depth) ??
    (depths.length ? depths.reduce((a, b) => a + b, 0) / depths.length : null);

  const elapsed = num(session.total_elapsed_time) ?? num(session.total_timer_time);
  const duration = elapsed != null ? Math.round(elapsed / 60) : null;

  const startTime = toIso(session.start_time) ?? firstTs ?? new Date().toISOString();

  const dive: ParsedDive = {
    dive: {
      dive_date: startTime,
      max_depth: maxDepth != null ? Math.round(maxDepth * 100) / 100 : null,
      avg_depth: avgDepth != null ? Math.round(avgDepth * 100) / 100 : null,
      duration,
      water_temp_bottom: temps.length ? Math.min(...temps) : null,
      water_temp_surface: temps.length ? Math.max(...temps) : null,
      entry_source: "garmin",
      external_id: `garmin:${startTime}`,
    },
    samples: buildSamples(),
  };

  // GPS-Position der Session (Start) – für die Karte
  const lat = num(session.start_position_lat);
  const lon = num(session.start_position_long);
  if (lat != null && lon != null) {
    dive.site = {
      name: `Tauchplatz ${startTime.slice(0, 10)}`,
      latitude: lat,
      longitude: lon,
      water_type: "salt",
    };
  }

  return [dive];
}
