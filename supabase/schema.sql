-- =============================================================================
-- Na Minusie ™ — Schema V2 (Piramidy + Statusy sezonów)
-- Supabase Dashboard → SQL Editor → wklej CAŁOŚĆ → Run
-- UWAGA: DROP kasuje dane w seasons/divisions/teams/fixtures/pyramids
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- DROP (kolejność: zależności najpierw)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.fixtures CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.divisions CASCADE;
DROP TABLE IF EXISTS public.seasons CASCADE;
DROP TABLE IF EXISTS public.pyramids CASCADE;
-- admin_users zostawiamy jeśli istnieje (konta Auth); drop+recreate dla czystości:
DROP TABLE IF EXISTS public.admin_users CASCADE;

DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- ---------------------------------------------------------------------------
-- Tabele
-- ---------------------------------------------------------------------------

CREATE TABLE public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pyramids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED')),
  /** true = baraże zakończone → publiczne Podsumowanie */
  is_completed BOOLEAN NOT NULL DEFAULT false,
  /** true = sezon spakowany, gracze w nowym sezonie */
  is_archived BOOLEAN NOT NULL DEFAULT false,
  /** Content Hub: The FA Ranking (globalny webhook) */
  fa_ranking_webhook_url TEXT,
  /** Content Hub: FA Cup (globalny webhook) */
  fa_cup_webhook_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pyramid_id UUID NOT NULL REFERENCES public.pyramids(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tier INTEGER NOT NULL CHECK (tier >= 1),
  discord_webhook_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT divisions_unique_tier_per_pyramid_season UNIQUE (season_id, pyramid_id, tier)
);

CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  /** NULL = pula przed losowaniem dywizji / Master Import */
  division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL,
  /** Excel: FPL Manager */
  manager_name TEXT NOT NULL,
  /** Excel: Discord Name */
  discord_nick TEXT NOT NULL,
  /** Excel: Discord ID */
  discord_id TEXT,
  /** Excel: FPL ID (TEXT; wartość numeryczna) */
  fpl_id TEXT,
  /** Excel: FPL Team */
  fpl_team_name TEXT,
  /** Excel: Discord Club */
  chosen_club TEXT NOT NULL,
  fee_paid BOOLEAN NOT NULL DEFAULT false,
  /** Excel: Status — aktywny uczestnik */
  is_active BOOLEAN NOT NULL DEFAULT true,
  /** Excel: Status (tekst, np. Aktywny) */
  status TEXT NOT NULL DEFAULT 'Aktywny',
  /** Excel: x.com (np. @st0pamat) */
  x_com TEXT,
  /** Excel: e-mail uczestnika */
  email TEXT,
  /** Excel: OR (Overall Rank poprzedniego sezonu) */
  previous_season_or INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Terminarz (przygotowanie pod Fazę 5 — Maszyna Losująca)
CREATE TABLE public.fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  gameweek INTEGER NOT NULL CHECK (gameweek >= 1 AND gameweek <= 38),
  home_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  away_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  home_fpl_points INTEGER,
  away_fpl_points INTEGER,
  home_h2h_points INTEGER NOT NULL DEFAULT 0 CHECK (home_h2h_points IN (0, 1, 2)),
  away_h2h_points INTEGER NOT NULL DEFAULT 0 CHECK (away_h2h_points IN (0, 1, 2)),
  home_median_bonus INTEGER NOT NULL DEFAULT 0 CHECK (home_median_bonus IN (0, 1)),
  away_median_bonus INTEGER NOT NULL DEFAULT 0 CHECK (away_median_bonus IN (0, 1)),
  is_finished BOOLEAN NOT NULL DEFAULT false,
  /** false = brudnopis (tylko admin); true = widoczne w Strefie Gracza */
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_playoff BOOLEAN NOT NULL DEFAULT false,
  tiebreaker_home_goals INTEGER NULL,
  tiebreaker_away_goals INTEGER NULL,
  tiebreaker_home_goals_conceded INTEGER NULL,
  tiebreaker_away_goals_conceded INTEGER NULL,
  tiebreaker_home_bench INTEGER NULL,
  tiebreaker_away_bench INTEGER NULL,
  tiebreaker_winner_id UUID NULL REFERENCES public.teams(id) ON DELETE SET NULL,
  /** Kod: GOALS | CONCEDED | BENCH | COIN_TOSS | MANUAL */
  tiebreaker_method TEXT NULL
    CHECK (
      tiebreaker_method IS NULL
      OR tiebreaker_method IN ('GOALS', 'CONCEDED', 'BENCH', 'COIN_TOSS', 'MANUAL')
    ),
  /** Czytelny powód TB, np. „Więcej goli” */
  tiebreaker_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fixtures_different_teams CHECK (home_team_id <> away_team_id),
  CONSTRAINT fixtures_unique_match UNIQUE (season_id, division_id, gameweek, home_team_id, away_team_id)
);

-- Trwałe webhooki Discord (NIE kasowane przez Hard Reset / wipeLeagueData)
CREATE TABLE IF NOT EXISTS public.discord_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('GLOBAL', 'DIVISION')),
  global_type TEXT NULL
    CHECK (global_type IS NULL OR global_type IN ('FA_RANKING', 'FA_CUP')),
  division_level INTEGER NULL CHECK (division_level IS NULL OR division_level >= 1),
  url TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT discord_webhooks_global_requires_type CHECK (
    (scope = 'GLOBAL' AND global_type IS NOT NULL AND division_level IS NULL)
    OR (scope = 'DIVISION' AND division_level IS NOT NULL AND global_type IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS discord_webhooks_global_unique
  ON public.discord_webhooks (global_type)
  WHERE scope = 'GLOBAL';

CREATE UNIQUE INDEX IF NOT EXISTS discord_webhooks_division_level_unique
  ON public.discord_webhooks (division_level)
  WHERE scope = 'DIVISION';

-- Punkty FPL per gracz × kolejka (The FA Ranking / Overall) — niezależne od H2H fixtures
CREATE TABLE public.team_gameweek_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  gameweek INTEGER NOT NULL CHECK (gameweek >= 1 AND gameweek <= 38),
  fpl_points INTEGER NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT team_gameweek_scores_unique UNIQUE (season_id, team_id, gameweek)
);

-- ---------------------------------------------------------------------------
-- Indeksy
-- ---------------------------------------------------------------------------
CREATE INDEX idx_divisions_season ON public.divisions(season_id);
CREATE INDEX idx_divisions_pyramid ON public.divisions(pyramid_id);
CREATE INDEX idx_teams_division ON public.teams(division_id);
CREATE INDEX idx_teams_fpl_id ON public.teams(fpl_id);
CREATE INDEX idx_fixtures_division_gw ON public.fixtures(division_id, gameweek);
CREATE INDEX idx_fixtures_published ON public.fixtures(division_id, is_published);
CREATE INDEX idx_seasons_status ON public.seasons(status);
CREATE INDEX idx_team_gw_scores_season_gw ON public.team_gameweek_scores(season_id, gameweek);
CREATE INDEX idx_team_gw_scores_team ON public.team_gameweek_scores(team_id);
CREATE INDEX idx_team_gw_scores_published ON public.team_gameweek_scores(season_id, is_published);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyramids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_gameweek_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_webhooks ENABLE ROW LEVEL SECURITY;

-- admin_users: zalogowany widzi swój wpis
CREATE POLICY "admin_users_select_authenticated"
  ON public.admin_users FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_users_write_authenticated"
  ON public.admin_users FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- pyramids
CREATE POLICY "pyramids_select_anon"
  ON public.pyramids FOR SELECT TO anon USING (true);
CREATE POLICY "pyramids_select_authenticated"
  ON public.pyramids FOR SELECT TO authenticated USING (true);
CREATE POLICY "pyramids_write_authenticated"
  ON public.pyramids FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- seasons
CREATE POLICY "seasons_select_anon"
  ON public.seasons FOR SELECT TO anon USING (true);
CREATE POLICY "seasons_select_authenticated"
  ON public.seasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "seasons_write_authenticated"
  ON public.seasons FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- divisions
CREATE POLICY "divisions_select_anon"
  ON public.divisions FOR SELECT TO anon USING (true);
CREATE POLICY "divisions_select_authenticated"
  ON public.divisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "divisions_write_authenticated"
  ON public.divisions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- teams
CREATE POLICY "teams_select_anon"
  ON public.teams FOR SELECT TO anon USING (true);
CREATE POLICY "teams_select_authenticated"
  ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "teams_write_authenticated"
  ON public.teams FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- fixtures: anon widzi tylko opublikowane (Strefa Gracza); admin (authenticated) — wszystko
CREATE POLICY "fixtures_select_anon"
  ON public.fixtures FOR SELECT TO anon
  USING (is_published = true);
CREATE POLICY "fixtures_select_authenticated"
  ON public.fixtures FOR SELECT TO authenticated USING (true);
CREATE POLICY "fixtures_write_authenticated"
  ON public.fixtures FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- team_gameweek_scores: anon tylko opublikowane; admin wszystko
CREATE POLICY "team_gw_scores_select_anon"
  ON public.team_gameweek_scores FOR SELECT TO anon
  USING (is_published = true);
CREATE POLICY "team_gw_scores_select_authenticated"
  ON public.team_gameweek_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "team_gw_scores_write_authenticated"
  ON public.team_gameweek_scores FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- discord_webhooks: tylko authenticated (URL-e niepubliczne)
CREATE POLICY "discord_webhooks_select_authenticated"
  ON public.discord_webhooks FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "discord_webhooks_write_authenticated"
  ON public.discord_webhooks FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.has_division_discord_webhook(p_level integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.discord_webhooks w
    WHERE w.scope = 'DIVISION' AND w.division_level = p_level
      AND length(trim(w.url)) > 0
  );
$$;

CREATE OR REPLACE FUNCTION public.has_global_discord_webhook(p_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.discord_webhooks w
    WHERE w.scope = 'GLOBAL' AND w.global_type = p_type
      AND length(trim(w.url)) > 0
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_division_discord_webhook(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_global_discord_webhook(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- GRANTY
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON TABLE public.pyramids, public.seasons, public.divisions, public.teams, public.fixtures, public.team_gameweek_scores TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.admin_users,
  public.pyramids,
  public.seasons,
  public.divisions,
  public.teams,
  public.fixtures,
  public.team_gameweek_scores,
  public.discord_webhooks
TO authenticated;

-- ---------------------------------------------------------------------------
-- Po uruchomieniu: (opcjonalnie) dodaj admina
-- INSERT INTO public.admin_users (user_id) VALUES ('uuid-z-auth-users');
-- ---------------------------------------------------------------------------
