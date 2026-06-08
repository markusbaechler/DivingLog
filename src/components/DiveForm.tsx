"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DiveSite, DiveWithSite } from "@/lib/types";
import { toDatetimeLocal } from "@/lib/format";
import { Save, Trash2 } from "lucide-react";

const DIVE_TYPES = ["Recreational", "Drift", "Night", "Wreck", "Cave", "Ice", "Deep", "Training"];
const ENTRY_TYPES = ["Boat", "Shore", "Pier", "Liveaboard"];

function field(form: HTMLFormElement, name: string): string {
  const el = form.elements.namedItem(name) as HTMLInputElement | null;
  return el?.value ?? "";
}
function numOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = parseFloat(v.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}
function intOrNull(v: string): number | null {
  const n = numOrNull(v);
  return n == null ? null : Math.round(n);
}

export function DiveForm({
  dive,
  sites,
}: {
  dive?: DiveWithSite;
  sites: DiveSite[];
}) {
  const router = useRouter();
  const isEdit = !!dive;
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newSite, setNewSite] = useState(!isEdit && sites.length === 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const form = e.currentTarget;
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      // 1) Resolve dive site
      let diveSiteId: string | null = null;
      if (newSite) {
        const name = field(form, "site_name").trim();
        if (name) {
          const { data: site, error: siteErr } = await supabase
            .from("dive_sites")
            .insert({
              user_id: user.id,
              name,
              latitude: numOrNull(field(form, "site_lat")),
              longitude: numOrNull(field(form, "site_lng")),
              country: field(form, "site_country") || null,
              region: field(form, "site_region") || null,
              water_type: field(form, "site_water_type") || null,
            })
            .select("id")
            .single();
          if (siteErr) throw siteErr;
          diveSiteId = site.id;
        }
      } else {
        diveSiteId = field(form, "dive_site_id") || null;
      }

      // 2) Dive data
      const payload = {
        user_id: user.id,
        dive_site_id: diveSiteId,
        title: field(form, "title") || null,
        dive_number: intOrNull(field(form, "dive_number")),
        dive_date: new Date(field(form, "dive_date")).toISOString(),
        max_depth: numOrNull(field(form, "max_depth")),
        avg_depth: numOrNull(field(form, "avg_depth")),
        duration: intOrNull(field(form, "duration")),
        water_temp_surface: numOrNull(field(form, "water_temp_surface")),
        water_temp_bottom: numOrNull(field(form, "water_temp_bottom")),
        air_temp: numOrNull(field(form, "air_temp")),
        visibility: numOrNull(field(form, "visibility")),
        weather: field(form, "weather") || null,
        current_strength: field(form, "current_strength") || null,
        surface_conditions: field(form, "surface_conditions") || null,
        weight: numOrNull(field(form, "weight")),
        suit_type: field(form, "suit_type") || null,
        tank_volume: numOrNull(field(form, "tank_volume")),
        gas_o2: numOrNull(field(form, "gas_o2")),
        gas_he: numOrNull(field(form, "gas_he")),
        pressure_start: intOrNull(field(form, "pressure_start")),
        pressure_end: intOrNull(field(form, "pressure_end")),
        dive_type: field(form, "dive_type") || null,
        entry_type: field(form, "entry_type") || null,
        buddy: field(form, "buddy") || null,
        dive_guide: field(form, "dive_guide") || null,
        rating: intOrNull(field(form, "rating")),
        notes: field(form, "notes") || null,
      };

      if (isEdit) {
        const { error: upErr } = await supabase
          .from("dives")
          .update(payload)
          .eq("id", dive!.id);
        if (upErr) throw upErr;
        router.push(`/dives/${dive!.id}`);
      } else {
        const { data: created, error: insErr } = await supabase
          .from("dives")
          .insert({ ...payload, entry_source: "manual" })
          .select("id")
          .single();
        if (insErr) throw insErr;
        router.push(`/dives/${created.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving failed");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!dive || !confirm("Really delete this dive?")) return;
    const supabase = createClient();
    await supabase.from("dives").delete().eq("id", dive.id);
    router.push("/dives");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Dive site */}
      <Section title="Dive site">
        {!newSite && (
          <div className="sm:col-span-2">
            <Label>Existing dive site</Label>
            <select
              name="dive_site_id"
              defaultValue={dive?.dive_site_id ?? ""}
              className={inputCls}
            >
              <option value="">— none —</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.country ? ` (${s.country})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={() => setNewSite(!newSite)}
            className="text-sm font-medium text-ocean-600 hover:underline dark:text-ocean-400"
          >
            {newSite ? "↩ Choose existing dive site" : "+ Create new dive site"}
          </button>
        </div>

        {newSite && (
          <>
            <Input name="site_name" label="Name *" required />
            <Input name="site_country" label="Country" />
            <Input name="site_region" label="Region / place" />
            <div>
              <Label>Water</Label>
              <select name="site_water_type" className={inputCls} defaultValue="salt">
                <option value="salt">Salt water</option>
                <option value="fresh">Fresh water</option>
                <option value="brackish">Brackish</option>
              </select>
            </div>
            <Input name="site_lat" label="Latitude" placeholder="e.g. 27.85" />
            <Input name="site_lng" label="Longitude" placeholder="e.g. 34.30" />
          </>
        )}
      </Section>

      {/* Key facts */}
      <Section title="Key facts">
        <Input name="title" label="Title" defaultValue={dive?.title ?? ""} placeholder="e.g. House Reef II" />
        <Input
          name="dive_date"
          label="Date & time *"
          type="datetime-local"
          required
          defaultValue={toDatetimeLocal(dive?.dive_date ?? new Date().toISOString())}
        />
        <Input name="dive_number" label="Dive number" type="number" defaultValue={dive?.dive_number ?? ""} />
        <Input name="max_depth" label="Max depth (m)" defaultValue={dive?.max_depth ?? ""} />
        <Input name="avg_depth" label="Avg depth (m)" defaultValue={dive?.avg_depth ?? ""} />
        <Input name="duration" label="Duration (min)" type="number" defaultValue={dive?.duration ?? ""} />
        <div>
          <Label>Dive type</Label>
          <select name="dive_type" className={inputCls} defaultValue={dive?.dive_type ?? ""}>
            <option value="">—</option>
            {DIVE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Entry type</Label>
          <select name="entry_type" className={inputCls} defaultValue={dive?.entry_type ?? ""}>
            <option value="">—</option>
            {ENTRY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </Section>

      {/* Environment */}
      <Section title="Environment">
        <Input name="water_temp_surface" label="Surface temp (°C)" defaultValue={dive?.water_temp_surface ?? ""} />
        <Input name="water_temp_bottom" label="Bottom temp (°C)" defaultValue={dive?.water_temp_bottom ?? ""} />
        <Input name="air_temp" label="Air temp (°C)" defaultValue={dive?.air_temp ?? ""} />
        <Input name="visibility" label="Visibility (m)" defaultValue={dive?.visibility ?? ""} />
        <Input name="current_strength" label="Current" defaultValue={dive?.current_strength ?? ""} />
        <Input name="surface_conditions" label="Surface conditions" defaultValue={dive?.surface_conditions ?? ""} />
        <Input name="weather" label="Weather" defaultValue={dive?.weather ?? ""} />
      </Section>

      {/* Gear & gas */}
      <Section title="Gear & gas">
        <Input name="weight" label="Weight (kg)" defaultValue={dive?.weight ?? ""} />
        <Input name="suit_type" label="Suit" defaultValue={dive?.suit_type ?? ""} />
        <Input name="tank_volume" label="Tank (l)" defaultValue={dive?.tank_volume ?? ""} />
        <Input name="gas_o2" label="O₂ (%) – 21 = air" defaultValue={dive?.gas_o2 ?? ""} />
        <Input name="gas_he" label="He (%)" defaultValue={dive?.gas_he ?? ""} />
        <Input name="pressure_start" label="Start pressure (bar)" type="number" defaultValue={dive?.pressure_start ?? ""} />
        <Input name="pressure_end" label="End pressure (bar)" type="number" defaultValue={dive?.pressure_end ?? ""} />
      </Section>

      {/* Buddy & rating */}
      <Section title="Buddy & rating">
        <Input name="buddy" label="Buddy" defaultValue={dive?.buddy ?? ""} />
        <Input name="dive_guide" label="Guide / divemaster" defaultValue={dive?.dive_guide ?? ""} />
        <div>
          <Label>Rating</Label>
          <select name="rating" className={inputCls} defaultValue={dive?.rating ?? ""}>
            <option value="">—</option>
            {[1, 2, 3, 4, 5].map((r) => (
              <option key={r} value={r}>{"★".repeat(r)}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label>Notes</Label>
          <textarea
            name="notes"
            rows={4}
            defaultValue={dive?.notes ?? ""}
            className={inputCls}
            placeholder="Observations, marine life, highlights…"
          />
        </div>
      </Section>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="sticky bottom-16 flex items-center gap-3 md:bottom-4">
        <button
          type="submit"
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ocean-600 py-3 text-sm font-semibold text-white shadow-lg hover:bg-ocean-700 disabled:opacity-60 md:flex-none md:px-6"
        >
          <Save size={18} /> {saving ? "Saving…" : "Save"}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:bg-slate-900 dark:hover:bg-red-950"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <legend className="px-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {title}
      </legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
      {children}
    </label>
  );
}

function Input({
  name,
  label,
  type = "text",
  required = false,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        step={type === "number" ? "any" : undefined}
        className={inputCls}
      />
    </div>
  );
}
