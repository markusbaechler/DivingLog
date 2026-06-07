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
        <h1 className="text-xl font-bold text-slate-800">Statistik</h1>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Noch keine Daten für Statistiken.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Statistik</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Tauchgänge" value={s.totalDives} accent />
        <StatCard label="Gesamtzeit" value={s.totalBottomTimeH} unit="h" />
        <StatCard label="Tiefster" value={s.maxDepth} unit="m" />
        <StatCard label="Ø Tiefe" value={s.avgDepth} unit="m" />
        <StatCard label="Ø Dauer" value={s.avgDuration} unit="min" />
        <StatCard label="Längster" value={s.longestDiveMin} unit="min" />
        <StatCard label="Tauchplätze" value={s.sites} />
        <StatCard label="Länder" value={s.countries} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-slate-700">
            Tauchgänge pro Jahr
          </h2>
          <YearChart data={s.divesPerYear} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-slate-700">Tiefenverteilung</h2>
          <DepthChart data={s.depthBuckets} />
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-slate-700">
            Häufigste Tauchplätze
          </h2>
          {s.topSites.length === 0 ? (
            <p className="text-sm text-slate-400">Keine Tauchplätze erfasst.</p>
          ) : (
            <ul className="space-y-2">
              {s.topSites.map((site) => (
                <li
                  key={site.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate text-slate-700">{site.name}</span>
                  <span className="ml-2 shrink-0 rounded-full bg-ocean-50 px-2 py-0.5 text-xs font-semibold text-ocean-700">
                    {site.count}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-slate-700">Weitere Werte</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Erster Tauchgang" value={formatDate(s.firstDive)} />
            <Row label="Letzter Tauchgang" value={formatDate(s.lastDive)} />
            <Row
              label="Kälteste Temperatur"
              value={s.coldestTemp != null ? `${s.coldestTemp} °C` : "—"}
            />
            <Row
              label="Wärmste Temperatur"
              value={s.warmestTemp != null ? `${s.warmestTemp} °C` : "—"}
            />
            <Row
              label="Gesamttauchzeit"
              value={`${s.totalBottomTimeMin} min`}
            />
          </dl>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-700">{value}</dd>
    </div>
  );
}
