"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Watch,
  FileText,
  FileSpreadsheet,
  FileDown,
  Upload,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface ImportResponse {
  imported?: number;
  skipped?: number;
  sitesCreated?: number;
  errors?: string[];
  error?: string;
}

export default function ImportExportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Data</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Import dives from Garmin or DivingLog and export your logbook to Excel.
        </p>
      </div>

      <ImportCard
        endpoint="/api/import/garmin"
        accept=".fit"
        icon={<Watch className="text-ocean-600" size={22} />}
        title="Garmin – FIT file (with profile)"
        description="Upload the FIT files of individual dive activities. This also imports the dive profile (depth/temperature over time), gas, tanks, deco data and GPS position."
        helpHref="https://connect.garmin.com/app/home"
        helpText="Open Garmin Connect"
        howto={[
          "In Garmin Connect, open the dive activity",
          'Use the gear menu to "Export to original file" (FIT)',
          "Upload the extracted .fit file(s) here",
        ]}
      />

      <ImportCard
        endpoint="/api/import/garmin-csv"
        accept=".csv"
        icon={<FileDown className="text-ocean-600" size={22} />}
        title="Garmin – CSV list (many dives)"
        description="Import many dives at once from the CSV export of the Garmin activity list (summary data: date, depth, duration, temperature). Delimiter and German/English columns are detected automatically."
        helpHref="https://connect.garmin.com/modern/activities"
        helpText="Open Garmin activities"
        howto={[
          "In Garmin Connect: Activities → filter by diving",
          'Top right, choose "Export to CSV"',
          "Upload the .csv file here",
        ]}
      />

      <ImportCard
        endpoint="/api/import/uddf"
        accept=".uddf,.xml"
        icon={<FileText className="text-ocean-600" size={22} />}
        title="DivingLog (UDDF)"
        description="Import your dives from DivingLog in the UDDF format (XML)."
        helpHref="https://www.divinglog.com/english/home/index.php"
        helpText="Open DivingLog"
        howto={[
          "In DivingLog: File → Export → choose UDDF",
          "Upload the exported .uddf file here",
        ]}
      />

      <ExportCard />
    </div>
  );
}

function ImportCard({
  endpoint,
  accept,
  icon,
  title,
  description,
  helpHref,
  helpText,
  howto,
}: {
  endpoint: string;
  accept: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  helpHref: string;
  helpText: string;
  howto: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setResult(null);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    try {
      const res = await fetch(endpoint, { method: "POST", body: fd });
      const json = (await res.json()) as ImportResponse;
      setResult(json);
      if (json.imported) router.refresh();
    } catch {
      setResult({ error: "Upload failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ocean-50 dark:bg-ocean-950">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>

          <ol className="mt-3 list-inside list-decimal space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
            {howto.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-ocean-600 px-4 py-2 text-sm font-semibold text-white hover:bg-ocean-700">
              {busy ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Upload size={16} />
              )}
              {busy ? "Importing…" : "Choose files"}
              <input
                type="file"
                accept={accept}
                multiple
                hidden
                disabled={busy}
                onChange={(e) => onFiles(e.target.files)}
              />
            </label>
            <a
              href={helpHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-ocean-600 hover:underline dark:text-ocean-400"
            >
              {helpText} <ExternalLink size={13} />
            </a>
          </div>

          {result && (
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
              {result.error ? (
                <p className="text-red-600 dark:text-red-400">{result.error}</p>
              ) : (
                <p className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 size={16} />
                  {result.imported ?? 0} imported
                  {result.skipped ? `, ${result.skipped} skipped` : ""}
                  {result.sitesCreated
                    ? `, ${result.sitesCreated} dive sites created`
                    : ""}
                </p>
              )}
              {result.errors && result.errors.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-xs text-amber-700 dark:text-amber-400">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ExportCard() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950">
          <FileSpreadsheet className="text-emerald-600" size={22} />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">
            Excel export
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Download your entire logbook including statistics as an Excel file
            (.xlsx).
          </p>
          <a
            href="/api/export/excel"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <FileSpreadsheet size={16} /> Export to Excel
          </a>
        </div>
      </div>
    </section>
  );
}
