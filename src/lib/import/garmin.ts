import type { ParsedDive } from "../types";

// fit-file-parser ist ein CommonJS-Modul ohne Typdefinitionen.
type FitData = {
  sessions?: Array<Record<string, unknown>>;
  records?: Array<Record<string, unknown>>;
  dive_summary?: Array<Record<string, unknown>>;
  dive_gases?: Array<Record<string, unknown>>;
  dive_settings?: Record<string, unknown> | Array<Record<string, unknown>>;
  tank_summaries?: Array<Record<string, unknown>>;
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

function round(v: number | null, digits = 2): number | null {
  if (v == null) return null;
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}


async function parseFit(buffer: Buffer): Promise<FitData> {
  const mod = (await import("fit-file-parser")) as unknown as Record<string, unknown>;
  const candidates = [
    (mod.default as Record<string, unknown> | undefined)?.default,
    mod.default,
    mod,
  ];
  const FitParser = candidates.find((c) => typeof c === "function") as new (
    opts: unknown,
  ) => unknown;
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
 * Wandelt eine Garmin-FIT-Datei (Tauchaktivität) in einen normalisierten
 * Tauchgang inkl. Profil-Samples, Gas-, Tank- und Deko-Daten um.
 */
export async function parseGarminFit(buffer: Buffer): Promise<ParsedDive[]> {
  const data = await parseFit(buffer);
  const records = data.records ?? [];
  const session = data.sessions?.[0] ?? {};
  const settings = Array.isArray(data.dive_settings)
    ? data.dive_settings[0]
    : (data.dive_settings ?? {});
  const gas = data.dive_gases?.[0] ?? {};
  const tank = data.tank_summaries?.[0] ?? {};

  // ---- Tiefen-Skalierung einmal pro Tauchgang bestimmen ----
  // fit-file-parser liefert die Tiefe roh in Millimetern. Liegt der Maximalwert
  // über 300, sind die Werte in mm und werden durch 1000 geteilt; andernfalls
  // sind sie bereits in Metern. Die Entscheidung gilt für alle Samples gemeinsam,
  // damit flache Werte (z. B. 34 mm) nicht als 34 m fehlinterpretiert werden.
  const rawDepths = records
    .map((r) => num(r.depth ?? r.enhanced_depth))
    .filter((d): d is number => d != null);
  const depthScale = rawDepths.length && Math.max(...rawDepths) > 300 ? 0.001 : 1;
  const scaleDepth = (v: unknown): number | null => {
    const n = num(v);
    return n == null ? null : n * depthScale;
  };

  // ---- Profil-Samples ----
  const mapped = records
    .map((r, i) => {
      const elapsed = num(r.elapsed_time) ?? num(r.timer_time);
      const ts = toIso(r.timestamp);
      return {
        i,
        ts,
        elapsed,
        depth: scaleDepth(r.depth ?? r.enhanced_depth),
        temperature: num(r.temperature),
        heart_rate: num(r.heart_rate),
        ndl: num(r.ndl_time),
        n2: num(r.n2_load),
        cns: num(r.cns_load),
      };
    })
    .filter((s) => s.depth != null || s.temperature != null);

  const firstTs = mapped.find((s) => s.ts)?.ts ?? null;
  const base = firstTs ? new Date(firstTs).getTime() : null;

  const samples = mapped.map((s) => {
    let t = s.elapsed;
    if (t == null && base != null && s.ts) {
      t = Math.round((new Date(s.ts).getTime() - base) / 1000);
    }
    return {
      time_seconds: t ?? s.i,
      depth: round(s.depth),
      temperature: round(s.temperature, 1),
      heart_rate: s.heart_rate,
      ndl: s.ndl,
      n2_load: round(s.n2, 1),
      cns_load: round(s.cns, 1),
      pressure: null as number | null,
    };
  });

  const depths = mapped.map((s) => s.depth).filter((d): d is number => d != null);
  const temps = mapped
    .map((s) => s.temperature)
    .filter((d): d is number => d != null);
  const n2s = mapped.map((s) => s.n2).filter((d): d is number => d != null);
  const cnss = mapped.map((s) => s.cns).filter((d): d is number => d != null);

  // Aus den Samples ableiten (zuverlässiger als die teils fehlende Session-Angabe).
  const maxDepth = depths.length
    ? Math.max(...depths)
    : scaleDepth(session.max_depth);
  const avgDepth = depths.length
    ? depths.reduce((a, b) => a + b, 0) / depths.length
    : scaleDepth(session.avg_depth);

  const elapsed = num(session.total_elapsed_time) ?? num(session.total_timer_time);
  const duration = elapsed != null ? Math.round(elapsed / 60) : null;
  const startTimeUtc = toIso(session.start_time) ?? firstTs ?? new Date().toISOString();

  // Lokale Tauchzeit bestimmen: FIT liefert in der activity-Message timestamp
  // (UTC) und local_timestamp (Wanduhrzeit). Die Differenz ist der lokale
  // Offset. Wir speichern die lokale Wanduhrzeit als UTC-Instant, damit die
  // angezeigte Uhrzeit der tatsächlichen Tauchzeit entspricht.
  const activity = data.activity ?? {};
  const actUtc = toIso(activity.timestamp);
  const actLocal = toIso(activity.local_timestamp);
  let offsetMs = 0;
  if (actUtc && actLocal) {
    offsetMs = new Date(actLocal).getTime() - new Date(actUtc).getTime();
  }
  const startTime = new Date(
    new Date(startTimeUtc).getTime() + offsetMs,
  ).toISOString();

  const o2 = num(gas.oxygen_content);
  const he = num(gas.helium_content);
  const waterType = String(
    (settings as Record<string, unknown>).water_type ?? "",
  ).toLowerCase();

  const dive: ParsedDive = {
    dive: {
      dive_date: startTime,
      max_depth: round(maxDepth),
      avg_depth: round(avgDepth),
      duration,
      water_temp_avg: num(session.avg_temperature),
      water_temp_surface:
        num(session.max_temperature) ?? (temps.length ? Math.max(...temps) : null),
      water_temp_bottom:
        (data.dive_summary?.[0] && num(data.dive_summary[0].min_temperature)) ??
        (temps.length ? Math.min(...temps) : null),
      avg_heart_rate: num(session.avg_heart_rate),
      max_heart_rate: num(session.max_heart_rate),
      calories: num(session.total_calories),
      gas_o2: o2,
      gas_he: he && he > 0 ? he : null,
      pressure_start: round(num(tank.start_pressure), 0),
      pressure_end: round(num(tank.end_pressure), 0),
      n2_start: round(n2s[0] ?? null, 1),
      n2_end: round(n2s[n2s.length - 1] ?? null, 1),
      cns_start: round(cnss[0] ?? null, 1),
      cns_end: round(cnss[cnss.length - 1] ?? null, 1),
      water_density: num((settings as Record<string, unknown>).water_density),
      gf_low: num((settings as Record<string, unknown>).gf_low),
      gf_high: num((settings as Record<string, unknown>).gf_high),
      deco_model: (settings as Record<string, unknown>).model
        ? String((settings as Record<string, unknown>).model)
        : null,
      safety_stop:
        num((settings as Record<string, unknown>).safety_stop_enabled) === 1
          ? true
          : null,
      entry_latitude: num(session.start_position_lat),
      entry_longitude: num(session.start_position_long),
      entry_source: "garmin",
      external_id: `garmin-fit:${startTime}`,
    },
    samples,
  };

  // GPS-Position → Tauchplatz für die Karte
  const lat = num(session.start_position_lat);
  const lon = num(session.start_position_long);
  if (lat != null && lon != null) {
    dive.site = {
      name: `Dive site ${startTime.slice(0, 10)}`,
      latitude: lat,
      longitude: lon,
      water_type: waterType.includes("fresh")
        ? "fresh"
        : waterType.includes("salt")
          ? "salt"
          : null,
    };
  }

  return [dive];
}
