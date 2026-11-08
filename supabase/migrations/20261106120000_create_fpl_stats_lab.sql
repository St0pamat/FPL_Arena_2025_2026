-- =============================================================================
-- FPL Arena: Stats Lab — izolowany namespace (prefix fpl_lab_*)
-- Incremental ETL z oficjalnego API FPL (bootstrap-static + element-summary).
-- NIE jest częścią Na Minusie / No Big Six. Hard Reset ligi NIE kasuje tych tabel.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. fpl_lab_sync_meta — stan synchronizacji per sezon FPL
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fpl_lab_sync_meta (
  season_code VARCHAR(16) PRIMARY KEY,
  last_finished_gw INTEGER NOT NULL DEFAULT 0
    CHECK (last_finished_gw >= 0 AND last_finished_gw <= 38),
  last_bootstrap_sync_at TIMESTAMPTZ,
  last_history_sync_at TIMESTAMPTZ,
  total_players_synced INTEGER NOT NULL DEFAULT 0,
  sync_status VARCHAR(32) NOT NULL DEFAULT 'IDLE'
    CHECK (sync_status IN ('IDLE', 'RUNNING', 'COMPLETED', 'ERROR')),
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fpl_lab_sync_meta IS
  'Stats Lab: metadane Incremental ETL per season_code (np. 2026/27).';

-- ---------------------------------------------------------------------------
-- 2. fpl_lab_clubs — 20 klubów PL z bootstrap-static.teams
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fpl_lab_clubs (
  season_code VARCHAR(16) NOT NULL,
  fpl_team_id INTEGER NOT NULL CHECK (fpl_team_id >= 1 AND fpl_team_id <= 20),
  pulse_code INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  short_name VARCHAR(10) NOT NULL,
  strength INTEGER,
  primary_color VARCHAR(16),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (season_code, fpl_team_id)
);

COMMENT ON TABLE public.fpl_lab_clubs IS
  'Stats Lab: kluby Premier League z FPL API (fpl_team_id 1..20, pulse_code stały).';

CREATE INDEX IF NOT EXISTS idx_fpl_lab_clubs_pulse
  ON public.fpl_lab_clubs(season_code, pulse_code);

-- ---------------------------------------------------------------------------
-- 3. fpl_lab_players — snapshot bootstrap-static.elements + last_synced_gw
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fpl_lab_players (
  season_code VARCHAR(16) NOT NULL,
  fpl_element_id INTEGER NOT NULL,
  player_code INTEGER NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  second_name VARCHAR(100) NOT NULL,
  web_name VARCHAR(100) NOT NULL,
  fpl_team_id INTEGER NOT NULL,
  element_type INTEGER NOT NULL CHECK (element_type IN (1, 2, 3, 4)),
  status VARCHAR(8) NOT NULL DEFAULT 'a',
  now_cost INTEGER NOT NULL DEFAULT 0,
  selected_by_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  minutes INTEGER NOT NULL DEFAULT 0,
  starts INTEGER NOT NULL DEFAULT 0,
  goals_scored INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  clean_sheets INTEGER NOT NULL DEFAULT 0,
  goals_conceded INTEGER NOT NULL DEFAULT 0,
  own_goals INTEGER NOT NULL DEFAULT 0,
  penalties_saved INTEGER NOT NULL DEFAULT 0,
  penalties_missed INTEGER NOT NULL DEFAULT 0,
  yellow_cards INTEGER NOT NULL DEFAULT 0,
  red_cards INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  bonus INTEGER NOT NULL DEFAULT 0,
  bps INTEGER NOT NULL DEFAULT 0,
  influence NUMERIC(8, 2) NOT NULL DEFAULT 0,
  creativity NUMERIC(8, 2) NOT NULL DEFAULT 0,
  threat NUMERIC(8, 2) NOT NULL DEFAULT 0,
  ict_index NUMERIC(8, 2) NOT NULL DEFAULT 0,
  expected_goals NUMERIC(8, 2) NOT NULL DEFAULT 0,
  expected_assists NUMERIC(8, 2) NOT NULL DEFAULT 0,
  expected_goal_involvements NUMERIC(8, 2) NOT NULL DEFAULT 0,
  expected_goals_conceded NUMERIC(8, 2) NOT NULL DEFAULT 0,
  recoveries INTEGER NOT NULL DEFAULT 0,
  tackles INTEGER NOT NULL DEFAULT 0,
  interceptions INTEGER NOT NULL DEFAULT 0,
  clearances_blocks_interceptions INTEGER NOT NULL DEFAULT 0,
  penalties_order INTEGER,
  corners_and_indirect_freekicks_order INTEGER,
  direct_freekicks_order INTEGER,
  last_synced_gw INTEGER NOT NULL DEFAULT 0
    CHECK (last_synced_gw >= 0 AND last_synced_gw <= 38),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (season_code, fpl_element_id)
);

COMMENT ON TABLE public.fpl_lab_players IS
  'Stats Lab: snapshot zawodników FPL + last_synced_gw dla przyrostowego element-summary.';
COMMENT ON COLUMN public.fpl_lab_players.now_cost IS
  'Cena w dziesiątkach funta (150 = £15.0m).';
COMMENT ON COLUMN public.fpl_lab_players.last_synced_gw IS
  'Ostatnia kolejka historii zsynchronizowana z element-summary — Incremental ETL.';

CREATE INDEX IF NOT EXISTS idx_fpl_lab_players_position
  ON public.fpl_lab_players(season_code, element_type);

CREATE INDEX IF NOT EXISTS idx_fpl_lab_players_team
  ON public.fpl_lab_players(season_code, fpl_team_id);

CREATE INDEX IF NOT EXISTS idx_fpl_lab_players_points
  ON public.fpl_lab_players(season_code, total_points DESC);

CREATE INDEX IF NOT EXISTS idx_fpl_lab_players_code
  ON public.fpl_lab_players(season_code, player_code);

-- ---------------------------------------------------------------------------
-- 4. fpl_lab_player_gw_history — historia GW (element-summary.history)
--    PK zawiera fixture_id → poprawne Double Gameweeks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fpl_lab_player_gw_history (
  season_code VARCHAR(16) NOT NULL,
  fpl_element_id INTEGER NOT NULL,
  fixture_id INTEGER NOT NULL,
  gameweek INTEGER NOT NULL CHECK (gameweek >= 1 AND gameweek <= 38),
  opponent_team_id INTEGER NOT NULL,
  was_home BOOLEAN NOT NULL DEFAULT true,
  kickoff_time TIMESTAMPTZ,
  total_points INTEGER NOT NULL DEFAULT 0,
  value INTEGER NOT NULL DEFAULT 0,
  selected INTEGER NOT NULL DEFAULT 0,
  minutes INTEGER NOT NULL DEFAULT 0,
  starts INTEGER NOT NULL DEFAULT 0,
  goals_scored INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  clean_sheets INTEGER NOT NULL DEFAULT 0,
  goals_conceded INTEGER NOT NULL DEFAULT 0,
  own_goals INTEGER NOT NULL DEFAULT 0,
  penalties_saved INTEGER NOT NULL DEFAULT 0,
  penalties_missed INTEGER NOT NULL DEFAULT 0,
  yellow_cards INTEGER NOT NULL DEFAULT 0,
  red_cards INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  bonus INTEGER NOT NULL DEFAULT 0,
  bps INTEGER NOT NULL DEFAULT 0,
  influence NUMERIC(8, 2) NOT NULL DEFAULT 0,
  creativity NUMERIC(8, 2) NOT NULL DEFAULT 0,
  threat NUMERIC(8, 2) NOT NULL DEFAULT 0,
  ict_index NUMERIC(8, 2) NOT NULL DEFAULT 0,
  expected_goals NUMERIC(8, 2) NOT NULL DEFAULT 0,
  expected_assists NUMERIC(8, 2) NOT NULL DEFAULT 0,
  expected_goal_involvements NUMERIC(8, 2) NOT NULL DEFAULT 0,
  expected_goals_conceded NUMERIC(8, 2) NOT NULL DEFAULT 0,
  recoveries INTEGER NOT NULL DEFAULT 0,
  tackles INTEGER NOT NULL DEFAULT 0,
  clearances_blocks_interceptions INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (season_code, fpl_element_id, fixture_id)
);

COMMENT ON TABLE public.fpl_lab_player_gw_history IS
  'Stats Lab: statystyki mecz-po-meczu (fixture_id w PK = Double GW safe).';

CREATE INDEX IF NOT EXISTS idx_fpl_lab_gw_history_gw
  ON public.fpl_lab_player_gw_history(season_code, gameweek);

CREATE INDEX IF NOT EXISTS idx_fpl_lab_gw_history_player_gw
  ON public.fpl_lab_player_gw_history(season_code, fpl_element_id, gameweek);

-- ---------------------------------------------------------------------------
-- RLS — Stats Lab jest wewnętrznym narzędziem admina (authenticated)
-- ---------------------------------------------------------------------------
ALTER TABLE public.fpl_lab_sync_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fpl_lab_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fpl_lab_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fpl_lab_player_gw_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fpl_lab_sync_meta_all_authenticated" ON public.fpl_lab_sync_meta;
CREATE POLICY "fpl_lab_sync_meta_all_authenticated"
  ON public.fpl_lab_sync_meta
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "fpl_lab_clubs_all_authenticated" ON public.fpl_lab_clubs;
CREATE POLICY "fpl_lab_clubs_all_authenticated"
  ON public.fpl_lab_clubs
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "fpl_lab_players_all_authenticated" ON public.fpl_lab_players;
CREATE POLICY "fpl_lab_players_all_authenticated"
  ON public.fpl_lab_players
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "fpl_lab_player_gw_history_all_authenticated" ON public.fpl_lab_player_gw_history;
CREATE POLICY "fpl_lab_player_gw_history_all_authenticated"
  ON public.fpl_lab_player_gw_history
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.fpl_lab_sync_meta TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.fpl_lab_clubs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.fpl_lab_players TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.fpl_lab_player_gw_history TO authenticated;
