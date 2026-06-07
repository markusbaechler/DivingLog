"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { Save, CheckCircle2 } from "lucide-react";

export function ProfileForm({
  profile,
  email,
}: {
  profile: Profile | null;
  email: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    const form = e.currentTarget;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Nicht angemeldet.");
      setSaving(false);
      return;
    }

    const get = (n: string) =>
      (form.elements.namedItem(n) as HTMLInputElement)?.value || null;

    const { error: upErr } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: get("display_name"),
      certification_agency: get("certification_agency"),
      certification_level: get("certification_level"),
      unit_system: get("unit_system") ?? "metric",
    });

    if (upErr) {
      setError(upErr.message);
    } else {
      setSaved(true);
      router.refresh();
    }
    setSaving(false);
  }

  const cls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-200";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          E-Mail
        </label>
        <input value={email} disabled className={`${cls} bg-slate-50`} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Anzeigename
        </label>
        <input
          name="display_name"
          defaultValue={profile?.display_name ?? ""}
          className={cls}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Brevet-Organisation
          </label>
          <input
            name="certification_agency"
            placeholder="PADI, SSI, CMAS…"
            defaultValue={profile?.certification_agency ?? ""}
            className={cls}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Brevet-Stufe
          </label>
          <input
            name="certification_level"
            placeholder="Open Water, AOWD…"
            defaultValue={profile?.certification_level ?? ""}
            className={cls}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Einheitensystem
        </label>
        <select
          name="unit_system"
          defaultValue={profile?.unit_system ?? "metric"}
          className={cls}
        >
          <option value="metric">Metrisch (m, °C, bar)</option>
          <option value="imperial">Imperial (ft, °F, psi)</option>
        </select>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 rounded-lg bg-ocean-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ocean-700 disabled:opacity-60"
      >
        {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
        {saving ? "Speichern…" : saved ? "Gespeichert" : "Speichern"}
      </button>
    </form>
  );
}
