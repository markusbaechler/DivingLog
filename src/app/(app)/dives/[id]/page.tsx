import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DiveSample, DiveWithSite } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { DiveProfileChart } from "@/components/DiveProfileChart";
import { MapClient } from "@/components/MapClient";
import { ChevronLeft, Pencil, MapPin, Star } from "lucide-react";

export default async function DiveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: dive } = await supabase
    .from("dives")
    .select("*, dive_site:dive_sites(*)")
    .eq("id", id)
    .maybeSingle();

  if (!dive) notFound();
  const d = dive as DiveWithSite;

  const { data: sampleData } = await supabase
    .from("dive_samples")
    .select("*")
    .eq("dive_id", id)
    .order("time_seconds");
  const samples = (sampleData ?? []) as DiveSample[];

  const hasGeo =
    d.dive_site?.latitude != null && d.dive_site?.longitude != null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href="/dives"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-ocean-600"
        >
          <ChevronLeft size={16} /> Tauchgänge
        </Link>
        <Link
          href={`/dives/${id}/edit`}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Pencil size={15} /> Bearbeiten
        </Link>
      </div>

      <header>
        <div className="flex items-center gap-2">
          {d.dive_number != null && (
            <span className="rounded-md bg-ocean-50 px-2 py-0.5 text-sm font-bold text-ocean-700">
              #{d.dive_number}
            </span>
          )}
          <h1 className="text-2xl font-bold text-slate-800">
            {d.dive_site?.name ?? "Tauchgang"}
          </h1>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
          <span>{formatDateTime(d.dive_date)}</span>
          {d.dive_site && (
            <span className="flex items-center gap-1">
              <MapPin size={13} />
              {[d.dive_site.region, d.dive_site.country]
                .filter(Boolean)
                .join(", ")}
            </span>
          )}
          {d.rating != null && (
            <span className="flex items-center gap-0.5 text-amber-500">
              <Star size={13} fill="currentColor" />
              {d.rating}
            </span>
          )}
          {d.entry_source !== "manual" && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs uppercase text-slate-500">
              {d.entry_source}
            </span>
          )}
        </p>
      </header>

      {/* Kennzahlen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact label="Max. Tiefe" value={d.max_depth} unit="m" />
        <Fact label="Ø Tiefe" value={d.avg_depth} unit="m" />
        <Fact label="Dauer" value={d.duration} unit="min" />
        <Fact
          label="Temperatur"
          value={d.water_temp_bottom ?? d.water_temp_surface}
          unit="°C"
        />
      </div>

      {/* Tauchprofil */}
      {samples.length > 1 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 font-semibold text-slate-700">Tauchprofil</h2>
          <DiveProfileChart samples={samples} />
        </section>
      )}

      {/* Details */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-700">Details</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <Detail label="Sicht" value={d.visibility} unit="m" />
          <Detail label="Tauchart" value={d.dive_type} />
          <Detail label="Wetter" value={d.weather} />
          <Detail label="Blei" value={d.weight} unit="kg" />
          <Detail label="Anzug" value={d.suit_type} />
          <Detail label="Flasche" value={d.tank_volume} unit="l" />
          <Detail label="Gas O₂" value={d.gas_o2} unit="%" />
          <Detail label="Druck Anfang" value={d.pressure_start} unit="bar" />
          <Detail label="Druck Ende" value={d.pressure_end} unit="bar" />
          <Detail label="Lufttemp." value={d.air_temp} unit="°C" />
          <Detail label="Buddy" value={d.buddy} />
          <Detail label="Guide" value={d.dive_guide} />
        </dl>
      </section>

      {d.notes && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 font-semibold text-slate-700">Notizen</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-600">{d.notes}</p>
        </section>
      )}

      {hasGeo && (
        <section>
          <h2 className="mb-2 font-semibold text-slate-700">Lage</h2>
          <div className="h-56 overflow-hidden rounded-xl border border-slate-200">
            <MapClient
              points={[
                {
                  lat: d.dive_site!.latitude!,
                  lng: d.dive_site!.longitude!,
                  label: d.dive_site!.name,
                },
              ]}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function Fact({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit?: string;
}) {
  return (
    <div className="rounded-xl border border-ocean-100 bg-ocean-50 p-3">
      <p className="text-xs uppercase tracking-wide text-ocean-400">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-ocean-900">
        {value != null ? value : "—"}
        {value != null && unit && (
          <span className="ml-1 text-sm font-medium text-ocean-400">{unit}</span>
        )}
      </p>
    </div>
  );
}

function Detail({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number | null;
  unit?: string;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-700">
        {value != null && value !== "" ? `${value}${unit ? ` ${unit}` : ""}` : "—"}
      </dd>
    </div>
  );
}
