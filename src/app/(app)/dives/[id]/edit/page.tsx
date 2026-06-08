import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DiveSite, DiveWithSite } from "@/lib/types";
import { DiveForm } from "@/components/DiveForm";
import { ChevronLeft } from "lucide-react";

export default async function EditDivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: dive }, { data: sites }] = await Promise.all([
    supabase
      .from("dives")
      .select("*, dive_site:dive_sites(*)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("dive_sites").select("*").order("name"),
  ]);

  if (!dive) notFound();

  return (
    <div className="space-y-4">
      <Link
        href={`/dives/${id}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-ocean-600 dark:text-slate-400"
      >
        <ChevronLeft size={16} /> Back
      </Link>
      <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
        Edit dive
      </h1>
      <DiveForm dive={dive as DiveWithSite} sites={(sites ?? []) as DiveSite[]} />
    </div>
  );
}
