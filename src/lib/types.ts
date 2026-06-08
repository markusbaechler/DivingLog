export type UnitSystem = "metric" | "imperial";
export type WaterType = "salt" | "fresh" | "brackish";
export type EntrySource = "manual" | "garmin" | "divinglog" | "uddf";

export interface Profile {
  id: string;
  display_name: string | null;
  certification_agency: string | null;
  certification_level: string | null;
  unit_system: UnitSystem;
  created_at: string;
  updated_at: string;
}

export interface DiveSite {
  id: string;
  user_id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  country: string | null;
  region: string | null;
  water_type: WaterType | null;
  notes: string | null;
  created_at: string;
}

export interface Dive {
  id: string;
  user_id: string;
  dive_site_id: string | null;

  dive_number: number | null;
  dive_date: string;
  title: string | null;

  max_depth: number | null;
  avg_depth: number | null;
  duration: number | null;
  surface_interval: number | null;
  is_repetitive: boolean | null;

  water_temp_surface: number | null;
  water_temp_bottom: number | null;
  water_temp_avg: number | null;
  air_temp: number | null;
  visibility: number | null;
  weather: string | null;
  current_strength: string | null;
  surface_conditions: string | null;

  weight: number | null;
  suit_type: string | null;
  tank_volume: number | null;
  gas_o2: number | null;
  gas_he: number | null;
  pressure_start: number | null;
  pressure_end: number | null;

  dive_type: string | null;
  entry_type: string | null;
  event_type: string | null;
  buddy: string | null;
  dive_guide: string | null;

  calories: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;

  n2_start: number | null;
  n2_end: number | null;
  cns_start: number | null;
  cns_end: number | null;
  water_density: number | null;
  gf_low: number | null;
  gf_high: number | null;
  deco_model: string | null;
  safety_stop: boolean | null;

  entry_latitude: number | null;
  entry_longitude: number | null;
  exit_latitude: number | null;
  exit_longitude: number | null;

  rating: number | null;
  notes: string | null;

  entry_source: EntrySource;
  external_id: string | null;

  created_at: string;
  updated_at: string;
}

export interface DiveSample {
  id: number;
  dive_id: string;
  time_seconds: number;
  depth: number | null;
  temperature: number | null;
  heart_rate: number | null;
  pressure: number | null;
  ndl: number | null;
  n2_load: number | null;
  cns_load: number | null;
}

/** Dive joined with its site, as returned by the list/detail queries. */
export interface DiveWithSite extends Dive {
  dive_site: DiveSite | null;
}

/** Shape used when creating/updating dives and on import. */
export type DiveInput = Omit<
  Dive,
  "id" | "user_id" | "created_at" | "updated_at"
>;

/** Normalised result produced by the importers before persisting. */
export interface ParsedDive {
  dive: Partial<DiveInput>;
  site?: Partial<Omit<DiveSite, "id" | "user_id" | "created_at">>;
  samples?: Array<{
    time_seconds: number;
    depth: number | null;
    temperature: number | null;
    heart_rate?: number | null;
    pressure?: number | null;
    ndl?: number | null;
    n2_load?: number | null;
    cns_load?: number | null;
  }>;
}
