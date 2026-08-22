-- =============================================================================
-- FPL Arena: No Big Six — izolowany moduł (prefix no_big_six_)
-- NIE modyfikuje istniejących tabel Na Minusie / Igrzyska.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. no_big_six_config
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.no_big_six_config (
  id                SERIAL PRIMARY KEY,
  fpl_league_id     INTEGER NOT NULL,
  forbidden_team_ids INTEGER[] NOT NULL DEFAULT '{1, 5, 11, 13, 14, 18}',
  last_synced_gw    INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.no_big_six_config IS
  'Konfiguracja ligi FPL Arena: No Big Six (FPL league id, zakazane kluby, ostatnia sync GW).';
COMMENT ON COLUMN public.no_big_six_config.forbidden_team_ids IS
  'FPL team ids: 1=Arsenal, 5=Chelsea, 11=Liverpool, 13=Man City, 14=Man Utd, 18=Spurs.';

-- ---------------------------------------------------------------------------
-- 2. no_big_six_teams
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.no_big_six_teams (
  entry_id          INTEGER PRIMARY KEY,
  team_name         TEXT NOT NULL,
  player_name       TEXT NOT NULL,
  custom_logo_url   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.no_big_six_teams IS
  'Zespoły zarejestrowane w lidze No Big Six (PK = FPL entry_id menedżera).';

CREATE INDEX IF NOT EXISTS idx_no_big_six_teams_team_name
  ON public.no_big_six_teams(team_name);

-- ---------------------------------------------------------------------------
-- 3. no_big_six_gw_results
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.no_big_six_gw_results (
  id                SERIAL PRIMARY KEY,
  entry_id          INTEGER NOT NULL
                    REFERENCES public.no_big_six_teams(entry_id) ON DELETE CASCADE,
  event             INTEGER NOT NULL CHECK (event >= 1 AND event <= 38),
  raw_fpl_points    INTEGER NOT NULL DEFAULT 0,
  penalty_points    INTEGER NOT NULL DEFAULT 0,
  official_points   INTEGER NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_big_six_gw_results_entry_event_unique UNIQUE (entry_id, event)
);

COMMENT ON TABLE public.no_big_six_gw_results IS
  'Wyniki kolejek GW: raw FPL, kary Big Six, wynik oficjalny (raw - penalty).';

CREATE INDEX IF NOT EXISTS idx_no_big_six_gw_results_event
  ON public.no_big_six_gw_results(event);

CREATE INDEX IF NOT EXISTS idx_no_big_six_gw_results_entry
  ON public.no_big_six_gw_results(entry_id);

-- ---------------------------------------------------------------------------
-- 4. no_big_six_penalties
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.no_big_six_penalties (
  id                SERIAL PRIMARY KEY,
  entry_id          INTEGER NOT NULL
                    REFERENCES public.no_big_six_teams(entry_id) ON DELETE CASCADE,
  event             INTEGER NOT NULL CHECK (event >= 1 AND event <= 38),
  element_id        INTEGER NOT NULL,
  player_name       TEXT NOT NULL,
  fpl_team_id       INTEGER NOT NULL,
  deducted_points   INTEGER NOT NULL,
  reason            TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.no_big_six_penalties IS
  'Logi kar za zawodników z klubów Big Six (skład, auto-sub itd.).';

CREATE INDEX IF NOT EXISTS idx_no_big_six_penalties_entry_event
  ON public.no_big_six_penalties(entry_id, event);

CREATE INDEX IF NOT EXISTS idx_no_big_six_penalties_event
  ON public.no_big_six_penalties(event);

-- ---------------------------------------------------------------------------
-- Row Level Security — publiczny odczyt (SELECT)
-- ---------------------------------------------------------------------------
ALTER TABLE public.no_big_six_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_big_six_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_big_six_gw_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_big_six_penalties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read-access" ON public.no_big_six_config;
CREATE POLICY "Allow public read-access"
  ON public.no_big_six_config
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public read-access" ON public.no_big_six_teams;
CREATE POLICY "Allow public read-access"
  ON public.no_big_six_teams
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public read-access" ON public.no_big_six_gw_results;
CREATE POLICY "Allow public read-access"
  ON public.no_big_six_gw_results
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public read-access" ON public.no_big_six_penalties;
CREATE POLICY "Allow public read-access"
  ON public.no_big_six_penalties
  FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- GRANTY (odczyt publiczny; zapis — kolejny etap: polityki authenticated)
-- ---------------------------------------------------------------------------
GRANT SELECT ON TABLE public.no_big_six_config TO anon, authenticated;
GRANT SELECT ON TABLE public.no_big_six_teams TO anon, authenticated;
GRANT SELECT ON TABLE public.no_big_six_gw_results TO anon, authenticated;
GRANT SELECT ON TABLE public.no_big_six_penalties TO anon, authenticated;
