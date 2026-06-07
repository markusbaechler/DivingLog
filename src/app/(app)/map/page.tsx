import { createClient } from "@/lib/supabase/server";
import type { DiveWithSite } from "@/lib/types";
import { MapClient } from "@/components/MapClient";
import type { MapPoint } from "@/components/DiveMap";

export default async function MapPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dives")
    .select("dive_site_id, dive_site:dive_sites(*)");

  const dives = (data ?? []) as unknown as Pick<
    DiveWithSite,
    "dive_site_id" | "dive_site"
  >[];

  // Pro Tauchplatz aggregieren
  const map = new Map<string, MapPoint>();
  for (const d of dives) {
    const s = d.dive_site;
    if (!s || s.latitude == null || s.longitude == null) continue;
    const existing = map.get(s.id);
    if (existing) {
      existing.count = (existing.count ?? 0) + 1;
    } else {
      map.set(s.id, {
        lat: s.latitude,
        lng: s.longitude,
        label: s.name,
        count: 1,
      });
    }
  }
  const points = [...map.values()];

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Tauchkarte</h1>
        <p className="text-sm text-slate-500">
          {points.length} Tauchplätze mit Koordinaten weltweit
        </p>
      </div>

      <div className="h-[70vh] overflow-hidden rounded-xl border border-slate-200">
        {points.length === 0 ? (
          <div className="flex h-full items-center justify-center bg-ocean-50 p-6 text-center text-sm text-slate-500">
            Noch keine Tauchplätze mit Koordinaten. Füge bei einem Tauchgang
            Längen-/Breitengrad hinzu oder importiere GPS-Daten von Garmin.
          </div>
        ) : (
          <MapClient points={points} />
        )}
      </div>
    </div>
  );
}
