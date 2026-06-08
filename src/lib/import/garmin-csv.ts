import type { ParsedDive } from "../types";

/**
 * Importiert Garmin-CSV-Exporte (Aktivitätenliste / Tauchgang-Übersicht).
 *
 * Robust gegenüber:
 *  - Trennzeichen: Komma, Semikolon oder Tab (automatische Erkennung)
 *  - Dezimaltrennzeichen: Punkt oder Komma (z. B. "12.5" oder "12,5")
 *  - Deutschen und englischen Spaltenüberschriften
 *  - Zeitangaben wie "0:45:30", "45:30" oder "45"
 */

/** Eine CSV-Zeile in Felder zerlegen (mit Anführungszeichen-Behandlung). */
function splitLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/**
 * Garmin wickelt Datenzeilen teils komplett in Anführungszeichen und quotet
 * jedes Feld doppelt (z. B. `"...,""Fish Heaven"",""0.01"",..."`).
 * Diese Zeilen einmal "auswickeln", damit normales CSV-Parsing greift.
 */
function unwrapRow(line: string): string {
  let s = line.trim();
  if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
  return s.replace(/""/g, '"');
}

function detectDelimiter(headerLine: string): string {
  const candidates = [";", ",", "\t"];
  let best = ",";
  let bestCount = -1;
  for (const c of candidates) {
    const count = headerLine.split(c).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = c;
    }
  }
  return best;
}

/** Zahl aus String parsen – behandelt deutsche und englische Formate. */
function parseNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  let s = raw.replace(/[^0-9.,-]/g, "").trim();
  if (s === "" || s === "-") return null;

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  if (hasDot && hasComma) {
    // Das zuletzt auftretende Zeichen ist das Dezimaltrennzeichen.
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    // Nur Komma → als Dezimaltrennzeichen interpretieren.
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

/** Zeitangabe in Minuten umrechnen ("0:45:30", "45:30" oder "45,5"). */
function parseDurationMinutes(raw: string | undefined): number | null {
  if (!raw) return null;
  const s = raw.trim();
  if (s.includes(":")) {
    const parts = s.split(":").map((p) => parseInt(p, 10));
    if (parts.some((p) => Number.isNaN(p))) return null;
    let seconds = 0;
    if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
    else seconds = parts[0];
    return Math.round(seconds / 60);
  }
  const n = parseNumber(s);
  return n == null ? null : Math.round(n);
}

/**
 * Datum (+ optionale Zeit) als lokale Wanduhrzeit interpretieren und als
 * UTC-Instant speichern (damit die angezeigte Uhrzeit nie verschoben wird).
 * Unterstützt ISO (YYYY-MM-DD) und deutsches Format (DD.MM.YYYY).
 */
function parseDate(dateRaw?: string, timeRaw?: string): string | null {
  if (!dateRaw) return null;
  const combined = (timeRaw ? `${dateRaw} ${timeRaw}` : dateRaw).trim();

  const iso = combined.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (iso) {
    const [, y, mo, d, h = "0", mi = "0", se = "0"] = iso;
    return new Date(
      Date.UTC(+y, +mo - 1, +d, +h, +mi, +se),
    ).toISOString();
  }

  const de = combined.match(
    /(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (de) {
    const [, d, mo, y, h = "0", mi = "0", se = "0"] = de;
    const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
    return new Date(
      Date.UTC(year, +mo - 1, +d, +h, +mi, +se),
    ).toISOString();
  }

  const fallback = new Date(combined);
  return Number.isNaN(fallback.getTime()) ? null : fallback.toISOString();
}

/** Gewässerart aus Garmin-Text ableiten. */
function parseWaterType(raw: string | undefined): "salt" | "fresh" | "brackish" | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes("salz") || s.includes("salt") || s.includes("meer")) return "salt";
  if (s.includes("süss") || s.includes("süß") || s.includes("suss") || s.includes("fresh"))
    return "fresh";
  if (s.includes("brack")) return "brackish";
  return null;
}

/** Findet den Spaltenindex, dessen Überschrift einen der Aliasse enthält. */
function findCol(headers: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const idx = headers.findIndex((h) => h.includes(alias));
    if (idx !== -1) return idx;
  }
  return -1;
}

export function parseGarminCsv(text: string): ParsedDive[] {
  const lines = text
    .replace(/^﻿/, "") // BOM entfernen
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];

  const delim = detectDelimiter(lines[0]);
  const headers = splitLine(lines[0], delim).map((h) => h.toLowerCase());

  const col = {
    type: findCol(headers, ["activity type", "aktivitätstyp", "aktivitatstyp", "typ", "type"]),
    date: findCol(headers, ["date", "datum"]),
    time: findCol(headers, ["start time", "startzeit", "uhrzeit"]),
    title: findCol(headers, [
      "title", "titel", "tauchplatz", "location", "ort", "name", "site",
    ]),
    number: findCol(headers, ["dive number", "tauchgang nr", "nummer", "number", "#"]),
    maxDepth: findCol(headers, [
      "max depth", "maximale tiefe", "max. tiefe", "max tiefe", "greatest depth", "maximaltiefe",
    ]),
    avgDepth: findCol(headers, [
      "avg depth", "average depth", "durchschnittliche tiefe", "mittlere tiefe", "ø tiefe", "avg. depth",
    ]),
    bottomTime: findCol(headers, [
      "bottom time", "grundzeit", "tauchzeit", "dive time", "dauer",
    ]),
    duration: findCol(headers, ["time", "zeit", "duration"]),
    minTemp: findCol(headers, [
      "min temp", "min. temp", "minimale temp", "mindesttemperatur", "min. wassertemp",
    ]),
    maxTemp: findCol(headers, [
      "max temp", "max. temp", "maximale temp", "höchsttemperatur", "hochsttemperatur",
    ]),
    minWaterTemp: findCol(headers, [
      "minimale wassertemp", "min. wassertemp", "wassertemp niedrigste",
    ]),
    waterTemp: findCol(headers, ["wassertemp", "water temp", "temperatur", "temp"]),
    weight: findCol(headers, ["gewicht", "weight", "blei"]),
    waterClass: findCol(headers, ["gewässerart", "gewasserart", "wasserart", "water type"]),
    surface: findCol(headers, ["surface interval", "oberflächenpause", "oberflachenpause"]),
    calories: findCol(headers, ["kalorien", "calories"]),
    avgHr: findCol(headers, ["ø herzfrequenz", "durchschnittliche herzfrequenz", "avg hr", "average heart"]),
    maxHr: findCol(headers, ["maximale herzfrequenz", "max hr", "max heart"]),
    current: findCol(headers, ["strömung", "stromung", "current"]),
    surfaceCond: findCol(headers, ["oberflächenbedingungen", "oberflachenbedingungen", "surface condition"]),
    gasMix: findCol(headers, ["gasgemisch", "gas mix", "gemisch"]),
  };

  const depthFallback = col.maxDepth === -1 ? findCol(headers, ["tiefe", "depth"]) : -1;

  // Sauerstoffanteil aus Gasgemisch-Text ableiten ("EAN32" → 32, "Luft" → 21)
  const parseO2 = (raw: string | undefined): number | null => {
    if (!raw) return null;
    const t = raw.toLowerCase();
    if (t.includes("air") || t.includes("luft")) return 21;
    const m = raw.match(/(\d{2,3})/);
    if (m) {
      const v = parseInt(m[1], 10);
      if (v >= 21 && v <= 100) return v;
    }
    return null;
  };

  const dives: ParsedDive[] = [];

  for (let i = 1; i < lines.length; i++) {
    let cells = splitLine(lines[i], delim);
    // Garmins doppelt-gequotete Zeilen erkennen und auswickeln.
    if (cells.length < headers.length && lines[i].trim().startsWith('"')) {
      cells = splitLine(unwrapRow(lines[i]), delim);
    }
    const get = (idx: number) => {
      const v = idx >= 0 ? cells[idx] : undefined;
      return v === "--" || v === "" ? undefined : v;
    };

    // Wenn eine Typ-Spalte existiert: nur Tauch-Aktivitäten übernehmen.
    if (col.type >= 0) {
      const t = (get(col.type) ?? "").toLowerCase();
      if (t && !/tauch|div|scuba|apno|freediv|gerät|gerat/.test(t)) continue;
    }

    const diveDate = parseDate(get(col.date), get(col.time));
    if (!diveDate) continue; // ohne Datum kein sinnvoller Eintrag

    const maxDepth =
      parseNumber(get(col.maxDepth)) ??
      (depthFallback >= 0 ? parseNumber(get(depthFallback)) : null);

    // Dauer: bevorzugt Grundzeit, sonst allgemeine Zeit
    const duration =
      parseDurationMinutes(get(col.bottomTime)) ??
      parseDurationMinutes(get(col.duration));

    const title = get(col.title)?.trim();

    const surfaceSec = (() => {
      const min = parseDurationMinutes(get(col.surface));
      return min == null ? null : min * 60;
    })();

    const dive: ParsedDive = {
      dive: {
        dive_date: diveDate,
        title: title || null,
        dive_number: parseNumber(get(col.number))
          ? Math.round(parseNumber(get(col.number))!)
          : null,
        max_depth: maxDepth,
        avg_depth: parseNumber(get(col.avgDepth)),
        duration,
        surface_interval: surfaceSec,
        water_temp_bottom:
          parseNumber(get(col.minWaterTemp)) ??
          parseNumber(get(col.minTemp)) ??
          parseNumber(get(col.waterTemp)),
        water_temp_surface: parseNumber(get(col.maxTemp)),
        weight: parseNumber(get(col.weight)),
        gas_o2: parseO2(get(col.gasMix)),
        calories: parseNumber(get(col.calories))
          ? Math.round(parseNumber(get(col.calories))!)
          : null,
        avg_heart_rate: parseNumber(get(col.avgHr))
          ? Math.round(parseNumber(get(col.avgHr))!)
          : null,
        max_heart_rate: parseNumber(get(col.maxHr))
          ? Math.round(parseNumber(get(col.maxHr))!)
          : null,
        current_strength: get(col.current) ?? null,
        surface_conditions: get(col.surfaceCond) ?? null,
        entry_source: "garmin",
        external_id: `garmin-csv:${diveDate}${title ? `:${title}` : ""}`,
      },
    };

    if (title) {
      dive.site = { name: title, water_type: parseWaterType(get(col.waterClass)) };
    }

    dives.push(dive);
  }

  return dives;
}
