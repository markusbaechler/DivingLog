"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Watch,
  FileText,
  FileSpreadsheet,
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
        <h1 className="text-xl font-bold text-slate-800">Daten</h1>
        <p className="text-sm text-slate-500">
          Importiere Tauchgänge aus Garmin oder DivingLog und exportiere dein
          Logbuch nach Excel.
        </p>
      </div>

      <ImportCard
        endpoint="/api/import/garmin"
        accept=".fit"
        icon={<Watch className="text-ocean-600" size={22} />}
        title="Garmin Connect importieren"
        description="Lade die FIT-Dateien deiner Tauchaktivitäten hoch (Tiefe, Temperatur, GPS und Profil werden übernommen)."
        helpHref="https://connect.garmin.com/app/home"
        helpText="Garmin Connect öffnen"
        howto={[
          "In Garmin Connect die Tauchaktivität öffnen",
          'Über das Menü „Originaldatei exportieren" (FIT) herunterladen',
          "Die .fit-Datei(en) hier hochladen",
        ]}
      />

      <ImportCard
        endpoint="/api/import/uddf"
        accept=".uddf,.xml"
        icon={<FileText className="text-ocean-600" size={22} />}
        title="DivingLog importieren"
        description="Importiere deine Tauchgänge aus DivingLog im UDDF-Format (XML)."
        helpHref="https://www.divinglog.com/german/home/index.php"
        helpText="DivingLog öffnen"
        howto={[
          "In DivingLog: Datei → Exportieren → UDDF wählen",
          "Die exportierte .uddf-Datei hier hochladen",
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
      setResult({ error: "Upload fehlgeschlagen" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ocean-50">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-slate-800">{title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>

          <ol className="mt-3 list-inside list-decimal space-y-0.5 text-xs text-slate-500">
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
              {busy ? "Importiere…" : "Dateien wählen"}
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
              className="inline-flex items-center gap-1 text-sm text-ocean-600 hover:underline"
            >
              {helpText} <ExternalLink size={13} />
            </a>
          </div>

          {result && (
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
              {result.error ? (
                <p className="text-red-600">{result.error}</p>
              ) : (
                <p className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 size={16} />
                  {result.imported ?? 0} importiert
                  {result.skipped ? `, ${result.skipped} übersprungen` : ""}
                  {result.sitesCreated
                    ? `, ${result.sitesCreated} Tauchplätze angelegt`
                    : ""}
                </p>
              )}
              {result.errors && result.errors.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-xs text-amber-700">
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
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
          <FileSpreadsheet className="text-emerald-600" size={22} />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-slate-800">Excel-Export</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Lade dein komplettes Logbuch inklusive Statistik als Excel-Datei
            (.xlsx) herunter.
          </p>
          <a
            href="/api/export/excel"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <FileSpreadsheet size={16} /> Als Excel exportieren
          </a>
        </div>
      </div>
    </section>
  );
}
