import ExcelJS from "exceljs";
import type { DiveWithSite } from "../types";
import { computeStats } from "../stats";

/** Erzeugt eine Excel-Arbeitsmappe mit Tauchgängen + Statistik-Blatt. */
export async function buildDiveWorkbook(dives: DiveWithSite[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "DivingLog";
  wb.created = new Date();

  // ---- Blatt: Tauchgänge ----
  const ws = wb.addWorksheet("Tauchgänge", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = [
    { header: "Nr.", key: "dive_number", width: 6 },
    { header: "Datum", key: "date", width: 18 },
    { header: "Tauchplatz", key: "site", width: 24 },
    { header: "Land", key: "country", width: 16 },
    { header: "Max. Tiefe (m)", key: "max_depth", width: 14 },
    { header: "Ø Tiefe (m)", key: "avg_depth", width: 12 },
    { header: "Dauer (min)", key: "duration", width: 12 },
    { header: "Temp. (°C)", key: "temp", width: 11 },
    { header: "Sicht (m)", key: "visibility", width: 10 },
    { header: "Gas O₂ (%)", key: "gas", width: 11 },
    { header: "Anfang (bar)", key: "p_start", width: 12 },
    { header: "Ende (bar)", key: "p_end", width: 11 },
    { header: "Tauchart", key: "dive_type", width: 14 },
    { header: "Buddy", key: "buddy", width: 18 },
    { header: "Bewertung", key: "rating", width: 10 },
    { header: "Quelle", key: "source", width: 10 },
    { header: "Notizen", key: "notes", width: 40 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1463E1" },
  };
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  for (const d of dives) {
    ws.addRow({
      dive_number: d.dive_number ?? "",
      date: d.dive_date ? new Date(d.dive_date).toLocaleString("de-CH") : "",
      site: d.dive_site?.name ?? "",
      country: d.dive_site?.country ?? "",
      max_depth: d.max_depth ?? "",
      avg_depth: d.avg_depth ?? "",
      duration: d.duration ?? "",
      temp: d.water_temp_bottom ?? d.water_temp_surface ?? "",
      visibility: d.visibility ?? "",
      gas: d.gas_o2 ?? "",
      p_start: d.pressure_start ?? "",
      p_end: d.pressure_end ?? "",
      dive_type: d.dive_type ?? "",
      buddy: d.buddy ?? "",
      rating: d.rating ?? "",
      source: d.entry_source,
      notes: d.notes ?? "",
    });
  }

  // ---- Blatt: Statistik ----
  const stats = computeStats(dives);
  const sw = wb.addWorksheet("Statistik");
  sw.columns = [
    { header: "Kennzahl", key: "k", width: 30 },
    { header: "Wert", key: "v", width: 20 },
  ];
  sw.getRow(1).font = { bold: true };

  const rows: [string, string | number][] = [
    ["Anzahl Tauchgänge", stats.totalDives],
    ["Gesamttauchzeit (h)", stats.totalBottomTimeH],
    ["Tiefster Tauchgang (m)", stats.maxDepth],
    ["Durchschnittstiefe (m)", stats.avgDepth],
    ["Durchschnittsdauer (min)", stats.avgDuration],
    ["Längster Tauchgang (min)", stats.longestDiveMin],
    ["Kälteste Temperatur (°C)", stats.coldestTemp ?? "—"],
    ["Wärmste Temperatur (°C)", stats.warmestTemp ?? "—"],
    ["Besuchte Tauchplätze", stats.sites],
    ["Besuchte Länder", stats.countries],
    ["Erster Tauchgang", stats.firstDive ? stats.firstDive.slice(0, 10) : "—"],
    ["Letzter Tauchgang", stats.lastDive ? stats.lastDive.slice(0, 10) : "—"],
  ];
  for (const [k, v] of rows) sw.addRow({ k, v });

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
