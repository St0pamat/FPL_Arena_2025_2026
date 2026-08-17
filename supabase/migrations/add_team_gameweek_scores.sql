-- Punkty FPL per gracz × kolejka (źródło prawdy dla The FA Ranking).
-- Oddzielone od fixtures H2H — krytyczne dla GW19/38 (baraże).

CREATE TABLE IF NOT EXISTS public.team_gameweek_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  gameweek INTEGER NOT NULL CHECK (gameweek >= 1 AND gameweek <= 38),
  fpl_points INTEGER NOT NULL,
  /** false = brudnopis; true = widoczne w The FA Ranking / Strefie */
  is_published BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT team_gameweek_scores_unique UNIQUE (season_id, team_id, gameweek)
);

CREATE INDEX IF NOT EXISTS idx_team_gw_scores_season_gw
  ON public.team_gameweek_scores(season_id, gameweek);

CREATE INDEX IF NOT EXISTS idx_team_gw_scores_team
  ON public.team_gameweek_scores(team_id);

CREATE INDEX IF NOT EXISTS idx_team_gw_scores_published
  ON public.team_gameweek_scores(season_id, is_published);

ALTER TABLE public.team_gameweek_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_gw_scores_select_anon" ON public.team_gameweek_scores;
CREATE POLICY "team_gw_scores_select_anon"
  ON public.team_gameweek_scores FOR SELECT TO anon
  USING (is_published = true);

DROP POLICY IF EXISTS "team_gw_scores_select_authenticated" ON public.team_gameweek_scores;
CREATE POLICY "team_gw_scores_select_authenticated"
  ON public.team_gameweek_scores FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "team_gw_scores_write_authenticated" ON public.team_gameweek_scores;
CREATE POLICY "team_gw_scores_write_authenticated"
  ON public.team_gameweek_scores FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

GRANT SELECT ON TABLE public.team_gameweek_scores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_gameweek_scores TO authenticated;

-- Backfill z istniejących fixtures (home + away).
INSERT INTO public.team_gameweek_scores (season_id, team_id, gameweek, fpl_points, is_published)
SELECT f.season_id, f.home_team_id, f.gameweek, f.home_fpl_points, COALESCE(f.is_published, false)
FROM public.fixtures f
WHERE f.home_fpl_points IS NOT NULL AND f.is_finished = true
ON CONFLICT (season_id, team_id, gameweek) DO UPDATE SET
  fpl_points = EXCLUDED.fpl_points,
  is_published = public.team_gameweek_scores.is_published OR EXCLUDED.is_published,
  updated_at = now();

INSERT INTO public.team_gameweek_scores (season_id, team_id, gameweek, fpl_points, is_published)
SELECT f.season_id, f.away_team_id, f.gameweek, f.away_fpl_points, COALESCE(f.is_published, false)
FROM public.fixtures f
WHERE f.away_fpl_points IS NOT NULL AND f.is_finished = true
ON CONFLICT (season_id, team_id, gameweek) DO UPDATE SET
  fpl_points = EXCLUDED.fpl_points,
  is_published = public.team_gameweek_scores.is_published OR EXCLUDED.is_published,
  updated_at = now();
