import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { computeStats } from "@/lib/stats";
import type { DiveWithSite } from "@/lib/types";
import { StatCard } from "@/components/StatCard";
import { DiveCard } from "@/components/DiveCard";
import { MapClient } from "@/components/MapClient";
import { Plus, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dives")
    .select("*, dive_site:dive_sites(*)")
    .order("dive_date", { ascending: false });

  const dives = (data ?? []) as DiveWithSite[];
  const stats = computeStats(dives);
  const recent = dives.slice(0, 4);

  const points = dives
    .filter((d) => d.dive_site?.latitude != null && d.dive_site?.longitude != null)
    .map((d) => ({
      lat: d.dive_site!.latitude!,
      lng: d.dive_site!.longitude!,
      label: d.dive_site!.name,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Übersicht</h1>
        <Link
          href="/dives/new"
          className="flex items-center gap-1.5 rounded-lg bg-ocean-600 px-3 py-2 text-sm font-semibold text-white hover:bg-ocean-700"
        >
          <Plus size={16} /> Tauchgang
        </Link>
      </div>

      {dives.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Tauchgänge" value={stats.totalDives} accent />
            <StatCard label="Tauchzeit" value={stats.totalBottomTimeH} unit="h" />
            <StatCard label="Tiefster" value={stats.maxDepth} unit="m" />
            <StatCard label="Tauchplätze" value={stats.sites} />
          </div>

          {points.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold text-slate-700">Tauchkarte</h2>
                <Link
                  href="/map"
                  className="flex items-center gap-1 text-sm text-ocean-600 hover:underline"
                >
                  Alle ansehen <ArrowRight size={14} />
                </Link>
              </div>
              <div className="h-64 overflow-hidden rounded-xl border border-slate-200">
                <MapClient points={points} />
              </div>
            </section>
          )}

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold text-slate-700">Letzte Tauchgänge</h2>
              <Link
                href="/dives"
                className="flex items-center gap-1 text-sm text-ocean-600 hover:underline"
              >
                Alle ansehen <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {recent.map((d) => (
                <DiveCard key={d.id} dive={d} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <h2 className="text-lg font-semibold text-slate-700">
        Willkommen an Bord! 🤿
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        Noch keine Tauchgänge. Erfasse deinen ersten Tauchgang manuell oder
        importiere deine Daten aus Garmin Connect oder DivingLog.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link
          href="/dives/new"
          className="rounded-lg bg-ocean-600 px-4 py-2 text-sm font-semibold text-white hover:bg-ocean-700"
        >
          Tauchgang erfassen
        </Link>
        <Link
          href="/import-export"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Daten importieren
        </Link>
      </div>
    </div>
  );
}
