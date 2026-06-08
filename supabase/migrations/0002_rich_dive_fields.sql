-- ============================================================================
-- DivingLog – Migration 0002
-- Phase 1: Reichhaltige Tauchgang-Felder (Garmin-Datenmodell) + Sample-Erweiterung
-- Im Supabase SQL-Editor ausführen (nach 0001_init.sql).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- dives: zusätzliche Felder aus Garmin Connect / FIT
-- ---------------------------------------------------------------------------
alter table public.dives
  add column if not exists title text,                         -- Tauchgang-Bezeichnung (z. B. "House Reef II")
  add column if not exists event_type text,                    -- Eventtyp
  add column if not exists entry_type text,                    -- Einstiegstyp (Boot/Ufer …)
  add column if not exists current_strength text,              -- Strömung
  add column if not exists surface_conditions text,            -- Oberflächenbedingungen
  add column if not exists surface_interval integer,           -- Oberflächenpause (Sekunden)
  add column if not exists is_repetitive boolean default false,-- Wiederholungstauchgang
  add column if not exists water_temp_avg numeric(5, 2),       -- Ø Wassertemperatur
  add column if not exists gas_he numeric(4, 1),               -- Helium-Anteil (%)
  add column if not exists calories integer,                   -- Kalorien
  add column if not exists avg_heart_rate integer,             -- Ø Puls
  add column if not exists max_heart_rate integer,             -- Max. Puls
  add column if not exists n2_start numeric(5, 1),             -- N2-Belastung Anfang (%)
  add column if not exists n2_end numeric(5, 1),               -- N2-Belastung Ende (%)
  add column if not exists cns_start numeric(5, 1),            -- ZNS-Belastung Anfang (%)
  add column if not exists cns_end numeric(5, 1),              -- ZNS-Belastung Ende (%)
  add column if not exists water_density integer,              -- Wasserdichte (g/l)
  add column if not exists gf_low integer,                     -- Gradientenfaktor low
  add column if not exists gf_high integer,                    -- Gradientenfaktor high
  add column if not exists deco_model text,                    -- Deko-Modell (z. B. zhl_16c)
  add column if not exists safety_stop boolean,                -- Sicherheitsstopp absolviert
  add column if not exists entry_latitude double precision,    -- Eintauchposition
  add column if not exists entry_longitude double precision,
  add column if not exists exit_latitude double precision,     -- Auftauchposition
  add column if not exists exit_longitude double precision;

-- ---------------------------------------------------------------------------
-- dive_samples: Puls und Deko-Werte über die Zeit
-- ---------------------------------------------------------------------------
alter table public.dive_samples
  add column if not exists heart_rate integer,
  add column if not exists pressure numeric(6, 1),             -- Flaschendruck (bar)
  add column if not exists ndl integer,                        -- Nullzeit (Sekunden)
  add column if not exists n2_load numeric(5, 1),
  add column if not exists cns_load numeric(5, 1);
