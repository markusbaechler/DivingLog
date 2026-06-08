import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseUddf } from "@/lib/import/divinglog";
import { persistParsedDives } from "@/lib/import/persist";
import type { ParsedDive } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Keine Dateien" }, { status: 400 });
  }

  const allParsed: ParsedDive[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const text = await file.text();
      const parsed = parseUddf(text);
      if (parsed.length === 0) {
        errors.push(`${file.name}: keine Tauchgänge gefunden (gültiges UDDF?)`);
      }
      allParsed.push(...parsed);
    } catch (err) {
      errors.push(
        `${file.name}: ${err instanceof Error ? err.message : "Parsing fehlgeschlagen"}`,
      );
    }
  }

  const result = await persistParsedDives(supabase, user.id, allParsed);
  return NextResponse.json({
    ...result,
    errors: [...errors, ...result.errors],
  });
}
