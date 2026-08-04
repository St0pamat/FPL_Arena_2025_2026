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

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyramids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixtures ENABLE ROW LEVEL SECURITY;

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

-- ---------------------------------------------------------------------------
-- GRANTY
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON TABLE public.pyramids, public.seasons, public.divisions, public.teams, public.fixtures TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.admin_users,
  public.pyramids,
  public.seasons,
  public.divisions,
  public.teams,
  public.fixtures
TO authenticated;

-- ---------------------------------------------------------------------------
-- Po uruchomieniu: (opcjonalnie) dodaj admina
-- INSERT INTO public.admin_users (user_id) VALUES ('uuid-z-auth-users');
-- ---------------------------------------------------------------------------
