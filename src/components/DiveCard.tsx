import Link from "next/link";
import type { DiveWithSite } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { MapPin, Gauge, Clock, Thermometer, Star } from "lucide-react";

export function DiveCard({ dive }: { dive: DiveWithSite }) {
  const title = dive.title || dive.dive_site?.name || "No dive site";
  return (
    <Link
      href={`/dives/${dive.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-ocean-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-ocean-700"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {dive.dive_number != null && (
              <span className="rounded-md bg-ocean-50 px-2 py-0.5 text-xs font-bold text-ocean-700 dark:bg-ocean-950 dark:text-ocean-300">
                #{dive.dive_number}
              </span>
            )}
            <h3 className="truncate font-semibold text-slate-800 dark:text-slate-100">
              {title}
            </h3>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <MapPin size={12} />
            {[dive.dive_site?.region, dive.dive_site?.country]
              .filter(Boolean)
              .join(", ") || "—"}
            <span className="mx-1">·</span>
            {formatDate(dive.dive_date)}
          </p>
        </div>
        {dive.rating != null && (
          <span className="flex shrink-0 items-center gap-0.5 text-amber-500">
            <Star size={14} fill="currentColor" />
            <span className="text-sm font-semibold">{dive.rating}</span>
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <Metric icon={<Gauge size={14} />} label="Depth">
          {dive.max_depth != null ? `${dive.max_depth} m` : "—"}
        </Metric>
        <Metric icon={<Clock size={14} />} label="Time">
          {dive.duration != null ? `${dive.duration} min` : "—"}
        </Metric>
        <Metric icon={<Thermometer size={14} />} label="Temp.">
          {(dive.water_temp_bottom ?? dive.water_temp_surface) != null
            ? `${dive.water_temp_bottom ?? dive.water_temp_surface} °C`
            : "—"}
        </Metric>
      </div>
    </Link>
  );
}

function Metric({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {icon}
        {label}
      </div>
      <div className="font-semibold text-slate-700 dark:text-slate-200">
        {children}
      </div>
    </div>
  );
}
