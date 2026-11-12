-- =============================================================================
-- FPL Arena: Stats Lab — terminarz PL (fpl_lab_fixtures) + strength_* w klubach
-- Pod moduł Predykcje / FDR (Dixon-Coles v0.2, Zero-Data-Leakage).
-- NIE dotyczy public.fixtures (The FA League H2H).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. fpl_lab_clubs — pełne siły z bootstrap-static.teams
-- ---------------------------------------------------------------------------
ALTER TABLE public.fpl_lab_clubs
  ADD COLUMN IF NOT EXISTS strength_overall_home integer,
  ADD COLUMN IF NOT EXISTS strength_overall_away integer,
  ADD COLUMN IF NOT EXISTS strength_attack_home integer,
  ADD COLUMN IF NOT EXISTS strength_attack_away integer,
  ADD COLUMN IF NOT EXISTS strength_defence_home integer,
  ADD COLUMN IF NOT EXISTS strength_defence_away integer;

COMMENT ON COLUMN public.fpl_lab_clubs.strength_overall_home IS
  'FPL bootstrap teams.strength_overall_home (prior overall Dom).';
COMMENT ON COLUMN public.fpl_lab_clubs.strength_overall_away IS
  'FPL bootstrap teams.strength_overall_away (prior overall Wyjazd).';
COMMENT ON COLUMN public.fpl_lab_clubs.strength_attack_home IS
  'FPL bootstrap teams.strength_attack_home (prior ataku Dom).';
COMMENT ON COLUMN public.fpl_lab_clubs.strength_attack_away IS
  'FPL bootstrap teams.strength_attack_away (prior ataku Wyjazd).';
COMMENT ON COLUMN public.fpl_lab_clubs.strength_defence_home IS
  'FPL bootstrap teams.strength_defence_home (prior obrony Dom).';
COMMENT ON COLUMN public.fpl_lab_clubs.strength_defence_away IS
  'FPL bootstrap teams.strength_defence_away (prior obrony Wyjazd).';

-- ---------------------------------------------------------------------------
-- 2. fpl_lab_fixtures — pełny terminarz sezonu z /api/fixtures/
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fpl_lab_fixtures (
  season_code text NOT NULL,
  fixture_id integer NOT NULL,
  pulse_id integer,
  gameweek integer, -- nullable: mecze przełożone (Blank/Unscheduled) mają event = null
  kickoff_time timestamptz,
  deadline_time timestamptz, -- deadline kolejki z bootstrap.events[].deadline_time
  team_h integer NOT NULL,
  team_a integer NOT NULL,
  team_h_score integer,
  team_a_score integer,
  team_h_difficulty integer,
  team_a_difficulty integer,
  started boolean NOT NULL DEFAULT false,
  finished boolean NOT NULL DEFAULT false,
  finished_provisional boolean NOT NULL DEFAULT false,
  provisional_start_time boolean NOT NULL DEFAULT false,
  minutes integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (season_code, fixture_id)
);

COMMENT ON TABLE public.fpl_lab_fixtures IS
  'Stats Lab: terminarz Premier League z FPL /api/fixtures/ (fixture_id w PK = DGW-safe).';
COMMENT ON COLUMN public.fpl_lab_fixtures.gameweek IS
  'Numer kolejki (event). NULL = mecz bez przypisanej kolejki (przełożony / unscheduled).';
COMMENT ON COLUMN public.fpl_lab_fixtures.deadline_time IS
  'Deadline GW z bootstrap.events — wejście do Zero-Data-Leakage w projectionsEngine.';
COMMENT ON COLUMN public.fpl_lab_fixtures.pulse_id IS
  'Kod meczu FPL (fixtures.code), analogiczny do pulse_code klubów.';

CREATE INDEX IF NOT EXISTS idx_fpl_lab_fixtures_season_gw
  ON public.fpl_lab_fixtures (season_code, gameweek);

CREATE INDEX IF NOT EXISTS idx_fpl_lab_fixtures_season_team_h
  ON public.fpl_lab_fixtures (season_code, team_h);

CREATE INDEX IF NOT EXISTS idx_fpl_lab_fixtures_season_team_a
  ON public.fpl_lab_fixtures (season_code, team_a);

CREATE INDEX IF NOT EXISTS idx_fpl_lab_fixtures_season_finished
  ON public.fpl_lab_fixtures (season_code, finished);

-- ---------------------------------------------------------------------------
-- 3. RLS + GRANT — jak pozostałe tabele fpl_lab_*
-- ---------------------------------------------------------------------------
ALTER TABLE public.fpl_lab_fixtures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fpl_lab_fixtures_all_authenticated" ON public.fpl_lab_fixtures;
CREATE POLICY "fpl_lab_fixtures_all_authenticated"
  ON public.fpl_lab_fixtures
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.fpl_lab_fixtures TO authenticated;
