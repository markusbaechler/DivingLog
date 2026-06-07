"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DiveSite, DiveWithSite } from "@/lib/types";
import { toDatetimeLocal } from "@/lib/format";
import { Save, Trash2 } from "lucide-react";

const DIVE_TYPES = [
  "Boot",
  "Ufer",
  "Strömung",
  "Nacht",
  "Wrack",
  "Höhle",
  "Eis",
  "Training",
];

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
  const [newSite, setNewSite] = useState(
    !isEdit && sites.length === 0,
  );

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
      if (!user) throw new Error("Nicht angemeldet.");

      // 1) Tauchplatz auflösen
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

      // 2) Tauchgang-Daten
      const payload = {
        user_id: user.id,
        dive_site_id: diveSiteId,
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
        weight: numOrNull(field(form, "weight")),
        suit_type: field(form, "suit_type") || null,
        tank_volume: numOrNull(field(form, "tank_volume")),
        gas_o2: numOrNull(field(form, "gas_o2")),
        pressure_start: intOrNull(field(form, "pressure_start")),
        pressure_end: intOrNull(field(form, "pressure_end")),
        dive_type: field(form, "dive_type") || null,
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
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!dive || !confirm("Diesen Tauchgang wirklich löschen?")) return;
    const supabase = createClient();
    await supabase.from("dives").delete().eq("id", dive.id);
    router.push("/dives");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tauchplatz */}
      <Section title="Tauchplatz">
        {!newSite && (
          <div className="sm:col-span-2">
            <Label>Bestehender Tauchplatz</Label>
            <select
              name="dive_site_id"
              defaultValue={dive?.dive_site_id ?? ""}
              className={inputCls}
            >
              <option value="">— keiner —</option>
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
            className="text-sm font-medium text-ocean-600 hover:underline"
          >
            {newSite
              ? "↩ Bestehenden Tauchplatz wählen"
              : "+ Neuen Tauchplatz anlegen"}
          </button>
        </div>

        {newSite && (
          <>
            <Input name="site_name" label="Name *" required />
            <Input name="site_country" label="Land" />
            <Input name="site_region" label="Region / Ort" />
            <div>
              <Label>Gewässer</Label>
              <select name="site_water_type" className={inputCls} defaultValue="salt">
                <option value="salt">Salzwasser</option>
                <option value="fresh">Süsswasser</option>
                <option value="brackish">Brackwasser</option>
              </select>
            </div>
            <Input name="site_lat" label="Breitengrad (lat)" placeholder="z. B. 27.85" />
            <Input name="site_lng" label="Längengrad (lng)" placeholder="z. B. 34.30" />
          </>
        )}
      </Section>

      {/* Eckdaten */}
      <Section title="Eckdaten">
        <Input
          name="dive_date"
          label="Datum & Zeit *"
          type="datetime-local"
          required
          defaultValue={toDatetimeLocal(dive?.dive_date ?? new Date().toISOString())}
        />
        <Input name="dive_number" label="Tauchgang-Nr." type="number" defaultValue={dive?.dive_number ?? ""} />
        <Input name="max_depth" label="Max. Tiefe (m)" defaultValue={dive?.max_depth ?? ""} />
        <Input name="avg_depth" label="Ø Tiefe (m)" defaultValue={dive?.avg_depth ?? ""} />
        <Input name="duration" label="Dauer (min)" type="number" defaultValue={dive?.duration ?? ""} />
        <div>
          <Label>Tauchart</Label>
          <select name="dive_type" className={inputCls} defaultValue={dive?.dive_type ?? ""}>
            <option value="">—</option>
            {DIVE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </Section>

      {/* Umgebung */}
      <Section title="Umgebung">
        <Input name="water_temp_surface" label="Wassertemp. Oberfläche (°C)" defaultValue={dive?.water_temp_surface ?? ""} />
        <Input name="water_temp_bottom" label="Wassertemp. Grund (°C)" defaultValue={dive?.water_temp_bottom ?? ""} />
        <Input name="air_temp" label="Lufttemperatur (°C)" defaultValue={dive?.air_temp ?? ""} />
        <Input name="visibility" label="Sicht (m)" defaultValue={dive?.visibility ?? ""} />
        <Input name="weather" label="Wetter" defaultValue={dive?.weather ?? ""} />
      </Section>

      {/* Ausrüstung & Gas */}
      <Section title="Ausrüstung & Gas">
        <Input name="weight" label="Blei (kg)" defaultValue={dive?.weight ?? ""} />
        <Input name="suit_type" label="Anzug" defaultValue={dive?.suit_type ?? ""} />
        <Input name="tank_volume" label="Flasche (l)" defaultValue={dive?.tank_volume ?? ""} />
        <Input name="gas_o2" label="O₂ (%) – 21 = Luft" defaultValue={dive?.gas_o2 ?? ""} />
        <Input name="pressure_start" label="Druck Anfang (bar)" type="number" defaultValue={dive?.pressure_start ?? ""} />
        <Input name="pressure_end" label="Druck Ende (bar)" type="number" defaultValue={dive?.pressure_end ?? ""} />
      </Section>

      {/* Begleitung */}
      <Section title="Begleitung & Bewertung">
        <Input name="buddy" label="Buddy" defaultValue={dive?.buddy ?? ""} />
        <Input name="dive_guide" label="Guide / Divemaster" defaultValue={dive?.dive_guide ?? ""} />
        <div>
          <Label>Bewertung</Label>
          <select name="rating" className={inputCls} defaultValue={dive?.rating ?? ""}>
            <option value="">—</option>
            {[1, 2, 3, 4, 5].map((r) => (
              <option key={r} value={r}>
                {"★".repeat(r)}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label>Notizen</Label>
          <textarea
            name="notes"
            rows={4}
            defaultValue={dive?.notes ?? ""}
            className={inputCls}
            placeholder="Beobachtungen, Meeresleben, Besonderheiten…"
          />
        </div>
      </Section>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="sticky bottom-16 flex items-center gap-3 md:bottom-4">
        <button
          type="submit"
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ocean-600 py-3 text-sm font-semibold text-white shadow-lg hover:bg-ocean-700 disabled:opacity-60 md:flex-none md:px-6"
        >
          <Save size={18} /> {saving ? "Speichern…" : "Speichern"}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-200";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-xl border border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-slate-700">
        {title}
      </legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-medium text-slate-600">
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
