import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { DiveWithSite } from "@/lib/types";
import { DiveCard } from "@/components/DiveCard";
import { Plus } from "lucide-react";

export default async function DivesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dives")
    .select("*, dive_site:dive_sites(*)")
    .order("dive_date", { ascending: false });

  const dives = (data ?? []) as DiveWithSite[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Dives
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {dives.length} {dives.length === 1 ? "entry" : "entries"}
          </p>
        </div>
        <Link
          href="/dives/new"
          className="flex items-center gap-1.5 rounded-lg bg-ocean-600 px-3 py-2 text-sm font-semibold text-white hover:bg-ocean-700"
        >
          <Plus size={16} /> New
        </Link>
      </div>

      {dives.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          No dives logged yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {dives.map((d) => (
            <DiveCard key={d.id} dive={d} />
          ))}
        </div>
      )}
    </div>
  );
}
