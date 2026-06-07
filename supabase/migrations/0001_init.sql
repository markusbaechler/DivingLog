-- ============================================================================
-- DivingLog – Initiales Datenbankschema
-- Postgres / Supabase. Alle Tabellen mit Row-Level-Security pro Benutzer.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Profile (1:1 zu auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  certification_agency text,        -- z. B. PADI, SSI, CMAS
  certification_level text,         -- z. B. Open Water, Advanced
  unit_system text not null default 'metric' check (unit_system in ('metric', 'imperial')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Tauchplätze (weltweit, für die Karte)
-- ---------------------------------------------------------------------------
create table if not exists public.dive_sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  latitude double precision,
  longitude double precision,
  country text,
  region text,
  water_type text check (water_type in ('salt', 'fresh', 'brackish')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists dive_sites_user_id_idx on public.dive_sites (user_id);

-- ---------------------------------------------------------------------------
-- Tauchgänge
-- ---------------------------------------------------------------------------
create table if not exists public.dives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  dive_site_id uuid references public.dive_sites (id) on delete set null,

  dive_number integer,
  dive_date timestamptz not null,

  -- Profil-Kennzahlen
  max_depth numeric(6, 2),          -- Meter
  avg_depth numeric(6, 2),          -- Meter
  duration integer,                 -- Minuten

  -- Umgebung
  water_temp_surface numeric(5, 2), -- °C
  water_temp_bottom numeric(5, 2),  -- °C
  air_temp numeric(5, 2),           -- °C
  visibility numeric(5, 1),         -- Meter
  weather text,

  -- Ausrüstung / Gas
  weight numeric(5, 1),             -- kg
  suit_type text,
  tank_volume numeric(5, 1),        -- Liter
  gas_o2 numeric(4, 1),             -- O2 % (21 = Luft)
  pressure_start integer,           -- bar
  pressure_end integer,             -- bar

  -- Begleitung & Kontext
  dive_type text,                   -- boat, shore, drift, night, wreck, cave ...
  buddy text,
  dive_guide text,

  rating smallint check (rating between 1 and 5),
  notes text,

  entry_source text not null default 'manual' check (entry_source in ('manual', 'garmin', 'divinglog', 'uddf')),
  external_id text,                 -- ID aus der Importquelle (Dedupe)

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dives_user_id_idx on public.dives (user_id);
create index if not exists dives_dive_date_idx on public.dives (user_id, dive_date desc);
create unique index if not exists dives_external_uniq
  on public.dives (user_id, entry_source, external_id)
  where external_id is not null;

-- ---------------------------------------------------------------------------
-- Profil-Samples (Tiefe/Temperatur über die Zeit, z. B. aus Garmin-FIT)
-- ---------------------------------------------------------------------------
create table if not exists public.dive_samples (
  id bigint generated always as identity primary key,
  dive_id uuid not null references public.dives (id) on delete cascade,
  time_seconds integer not null,    -- Sekunden ab Tauchbeginn
  depth numeric(6, 2),              -- Meter
  temperature numeric(5, 2)         -- °C
);

create index if not exists dive_samples_dive_id_idx on public.dive_samples (dive_id, time_seconds);

-- ---------------------------------------------------------------------------
-- updated_at automatisch pflegen
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists dives_set_updated_at on public.dives;
create trigger dives_set_updated_at
  before update on public.dives
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Neues Profil bei Registrierung anlegen
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row-Level-Security
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.dive_sites enable row level security;
alter table public.dives enable row level security;
alter table public.dive_samples enable row level security;

-- Profile: jeder nur sein eigenes
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Tauchplätze
drop policy if exists "dive_sites_all_own" on public.dive_sites;
create policy "dive_sites_all_own" on public.dive_sites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tauchgänge
drop policy if exists "dives_all_own" on public.dives;
create policy "dives_all_own" on public.dives
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Samples (über Zugehörigkeit zum eigenen Tauchgang)
drop policy if exists "dive_samples_all_own" on public.dive_samples;
create policy "dive_samples_all_own" on public.dive_samples
  for all using (
    exists (select 1 from public.dives d where d.id = dive_id and d.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.dives d where d.id = dive_id and d.user_id = auth.uid())
  );
