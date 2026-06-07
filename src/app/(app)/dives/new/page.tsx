import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { DiveSite } from "@/lib/types";
import { DiveForm } from "@/components/DiveForm";
import { ChevronLeft } from "lucide-react";

export default async function NewDivePage() {
  const supabase = await createClient();
  const { data: sites } = await supabase
    .from("dive_sites")
    .select("*")
    .order("name");

  return (
    <div className="space-y-4">
      <Link
        href="/dives"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-ocean-600"
      >
        <ChevronLeft size={16} /> Zurück
      </Link>
      <h1 className="text-xl font-bold text-slate-800">Neuer Tauchgang</h1>
      <DiveForm sites={(sites ?? []) as DiveSite[]} />
    </div>
  );
}
