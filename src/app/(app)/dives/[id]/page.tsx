import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DiveSample, DiveWithSite } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { DiveProfileChart } from "@/components/DiveProfileChart";
import { MapClient } from "@/components/MapClient";
import { computeSac } from "@/lib/sac";
import { ChevronLeft, Pencil, MapPin, Star } from "lucide-react";

function fmtInterval(seconds: number | null): string | null {
  if (seconds == null) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

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

  const lat = d.entry_latitude ?? d.dive_site?.latitude ?? null;
  const lng = d.entry_longitude ?? d.dive_site?.longitude ?? null;
  const hasGeo = lat != null && lng != null;

  const sac = computeSac(d);
  const gasLabel = gasMix(d.gas_o2, d.gas_he);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href="/dives"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-ocean-600 dark:text-slate-400"
        >
          <ChevronLeft size={16} /> Dives
        </Link>
        <Link
          href={`/dives/${id}/edit`}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Pencil size={15} /> Edit
        </Link>
      </div>

      <header>
        <div className="flex items-center gap-2">
          {d.dive_number != null && (
            <span className="rounded-md bg-ocean-50 px-2 py-0.5 text-sm font-bold text-ocean-700 dark:bg-ocean-950 dark:text-ocean-300">
              #{d.dive_number}
            </span>
          )}
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {d.title || d.dive_site?.name || "Dive"}
          </h1>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-slate-500 dark:text-slate-400">
          <span>{formatDateTime(d.dive_date)}</span>
          {d.dive_site && (
            <span className="flex items-center gap-1">
              <MapPin size={13} />
              {[d.dive_site.name, d.dive_site.region, d.dive_site.country]
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
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {d.entry_source}
            </span>
          )}
        </p>
      </header>

      {/* Key facts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact label="Max depth" value={d.max_depth} unit="m" />
        <Fact label="Avg depth" value={d.avg_depth} unit="m" />
        <Fact label="Duration" value={d.duration} unit="min" />
        <Fact
          label="Temperature"
          value={d.water_temp_bottom ?? d.water_temp_avg ?? d.water_temp_surface}
          unit="°C"
        />
      </div>

      {/* Profile chart */}
      {samples.length > 1 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 font-semibold text-slate-700 dark:text-slate-200">
            Dive profile
          </h2>
          <DiveProfileChart samples={samples} />
        </section>
      )}

      {/* Details */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">Details</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <Detail label="Visibility" value={d.visibility} unit="m" />
          <Detail label="Dive type" value={d.dive_type} />
          <Detail label="Entry type" value={d.entry_type} />
          <Detail label="Current" value={d.current_strength} />
          <Detail label="Surface cond." value={d.surface_conditions} />
          <Detail label="Surface interval" value={fmtInterval(d.surface_interval)} />
          <Detail label="Weather" value={d.weather} />
          <Detail label="Weight" value={d.weight} unit="kg" />
          <Detail label="Suit" value={d.suit_type} />
          <Detail label="Tank" value={d.tank_volume} unit="l" />
          <Detail label="Gas" value={gasLabel} />
          <Detail label="Start pressure" value={d.pressure_start} unit="bar" />
          <Detail label="End pressure" value={d.pressure_end} unit="bar" />
          <Detail label="SAC" value={sac} unit="l/min" />
          <Detail label="Air temp" value={d.air_temp} unit="°C" />
          <Detail label="Calories" value={d.calories} unit="kcal" />
          <Detail label="Avg HR" value={d.avg_heart_rate} unit="bpm" />
          <Detail label="Max HR" value={d.max_heart_rate} unit="bpm" />
          <Detail label="Buddy" value={d.buddy} />
          <Detail label="Guide" value={d.dive_guide} />
        </dl>
      </section>

      {/* Physiology / deco (only if present) */}
      {(d.n2_start != null ||
        d.cns_start != null ||
        d.deco_model != null ||
        d.gf_low != null) && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">
            Decompression & physiology
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <Detail label="N₂ start" value={d.n2_start} unit="%" />
            <Detail label="N₂ end" value={d.n2_end} unit="%" />
            <Detail label="CNS start" value={d.cns_start} unit="%" />
            <Detail label="CNS end" value={d.cns_end} unit="%" />
            <Detail label="Deco model" value={d.deco_model} />
            <Detail
              label="Gradient factors"
              value={d.gf_low != null && d.gf_high != null ? `${d.gf_low}/${d.gf_high}` : null}
            />
            <Detail
              label="Safety stop"
              value={d.safety_stop == null ? null : d.safety_stop ? "Yes" : "No"}
            />
            <Detail label="Water density" value={d.water_density} unit="g/l" />
          </dl>
        </section>
      )}

      {d.notes && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 font-semibold text-slate-700 dark:text-slate-200">Notes</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
            {d.notes}
          </p>
        </section>
      )}

      {hasGeo && (
        <section>
          <h2 className="mb-2 font-semibold text-slate-700 dark:text-slate-200">Location</h2>
          <div className="h-56 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <MapClient
              points={[{ lat: lat!, lng: lng!, label: d.dive_site?.name ?? "Dive site" }]}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function gasMix(o2: number | null, he: number | null): string | null {
  if (o2 == null) return null;
  if (he && he > 0) return `Trimix ${o2}/${he}`;
  if (o2 === 21) return "Air";
  return `Nitrox ${o2}%`;
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
    <div className="rounded-xl border border-ocean-100 bg-ocean-50 p-3 dark:border-ocean-900 dark:bg-ocean-950">
      <p className="text-xs uppercase tracking-wide text-ocean-400">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-ocean-900 dark:text-ocean-200">
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
      <dt className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </dt>
      <dd className="font-medium text-slate-700 dark:text-slate-200">
        {value != null && value !== "" ? `${value}${unit ? ` ${unit}` : ""}` : "—"}
      </dd>
    </div>
  );
}
