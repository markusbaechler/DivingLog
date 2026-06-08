import { createClient } from "@/lib/supabase/server";
import { computeStats } from "@/lib/stats";
import type { DiveWithSite } from "@/lib/types";
import { StatCard } from "@/components/StatCard";
import { YearChart, DepthChart } from "@/components/StatsCharts";
import { formatDate } from "@/lib/format";

export default async function StatisticsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dives")
    .select("*, dive_site:dive_sites(*)")
    .order("dive_date", { ascending: false });

  const dives = (data ?? []) as DiveWithSite[];
  const s = computeStats(dives);

  if (dives.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Statistics
        </h1>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          No data for statistics yet.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
        Statistics
      </h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Dives" value={s.totalDives} accent />
        <StatCard label="Total time" value={s.totalBottomTimeH} unit="h" />
        <StatCard label="Deepest" value={s.maxDepth} unit="m" />
        <StatCard label="Avg depth" value={s.avgDepth} unit="m" />
        <StatCard label="Avg duration" value={s.avgDuration} unit="min" />
        <StatCard label="Longest" value={s.longestDiveMin} unit="min" />
        <StatCard label="Sites" value={s.sites} />
        <StatCard label="Countries" value={s.countries} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">
            Dives per year
          </h2>
          <YearChart data={s.divesPerYear} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">
            Depth distribution
          </h2>
          <DepthChart data={s.depthBuckets} />
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">
            Most frequent dive sites
          </h2>
          {s.topSites.length === 0 ? (
            <p className="text-sm text-slate-400">No dive sites recorded.</p>
          ) : (
            <ul className="space-y-2">
              {s.topSites.map((site) => (
                <li
                  key={site.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate text-slate-700 dark:text-slate-200">
                    {site.name}
                  </span>
                  <span className="ml-2 shrink-0 rounded-full bg-ocean-50 px-2 py-0.5 text-xs font-semibold text-ocean-700 dark:bg-ocean-950 dark:text-ocean-300">
                    {site.count}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">
            More values
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="First dive" value={formatDate(s.firstDive)} />
            <Row label="Last dive" value={formatDate(s.lastDive)} />
            <Row
              label="Coldest temperature"
              value={s.coldestTemp != null ? `${s.coldestTemp} °C` : "—"}
            />
            <Row
              label="Warmest temperature"
              value={s.warmestTemp != null ? `${s.warmestTemp} °C` : "—"}
            />
            <Row label="Total bottom time" value={`${s.totalBottomTimeMin} min`} />
          </dl>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 last:border-0 dark:border-slate-800">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-700 dark:text-slate-200">{value}</dd>
    </div>
  );
}
