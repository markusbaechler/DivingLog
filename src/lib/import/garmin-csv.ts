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

/** Datum (+ optionale Zeit) robust parsen, inkl. deutschem Format. */
function parseDate(dateRaw?: string, timeRaw?: string): string | null {
  if (!dateRaw) return null;
  const combined = timeRaw ? `${dateRaw} ${timeRaw}`.trim() : dateRaw.trim();

  // Direkter Versuch (ISO, US, …)
  const direct = new Date(combined);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();

  // Deutsches Format: DD.MM.YYYY [HH:MM[:SS]]
  const m = combined.match(
    /(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (m) {
    const [, d, mo, y, h = "0", mi = "0", se = "0"] = m;
    const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
    const date = new Date(
      year,
      parseInt(mo, 10) - 1,
      parseInt(d, 10),
      parseInt(h, 10),
      parseInt(mi, 10),
      parseInt(se, 10),
    );
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
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
    waterTemp: findCol(headers, ["wassertemp", "water temp", "temperatur", "temp"]),
    surface: findCol(headers, ["surface interval", "oberflächenpause", "oberflachenpause"]),
  };

  const depthFallback = col.maxDepth === -1 ? findCol(headers, ["tiefe", "depth"]) : -1;

  const dives: ParsedDive[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i], delim);
    const get = (idx: number) => (idx >= 0 ? cells[idx] : undefined);

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

    const dive: ParsedDive = {
      dive: {
        dive_date: diveDate,
        dive_number: parseNumber(get(col.number))
          ? Math.round(parseNumber(get(col.number))!)
          : null,
        max_depth: maxDepth,
        avg_depth: parseNumber(get(col.avgDepth)),
        duration,
        water_temp_bottom:
          parseNumber(get(col.minTemp)) ?? parseNumber(get(col.waterTemp)),
        water_temp_surface: parseNumber(get(col.maxTemp)),
        entry_source: "garmin",
        external_id: `garmin-csv:${diveDate}${title ? `:${title}` : ""}`,
      },
    };

    if (title) {
      dive.site = { name: title, water_type: "salt" };
    }

    dives.push(dive);
  }

  return dives;
}
