import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildDiveWorkbook } from "@/lib/export/excel";
import type { DiveWithSite } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { data } = await supabase
    .from("dives")
    .select("*, dive_site:dive_sites(*)")
    .order("dive_date", { ascending: true });

  const dives = (data ?? []) as DiveWithSite[];
  const buffer = await buildDiveWorkbook(dives);

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="divinglog-export-${date}.xlsx"`,
    },
  });
}
