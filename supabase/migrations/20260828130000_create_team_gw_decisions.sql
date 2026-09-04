-- Decyzje FPL per gracz × kolejka (chipy, ławka, hit, kapitan).
-- Źródło danych: zewnętrzny pipeline (n8n) → UPSERT po (season_id, gameweek, team_id).
-- Fundament pod personalizowane zapowiedzi kolejek w Content Hub.

CREATE TABLE IF NOT EXISTS public.team_gw_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  gameweek INTEGER NOT NULL CHECK (gameweek >= 1 AND gameweek <= 38),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  points_total INTEGER NOT NULL DEFAULT 0,
  points_benched INTEGER NOT NULL DEFAULT 0,
  hit_cost INTEGER NOT NULL DEFAULT 0,
  chip_used VARCHAR(50),
  captain_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT team_gw_decisions_unique UNIQUE (season_id, gameweek, team_id)
);

CREATE INDEX IF NOT EXISTS idx_team_gw_decisions_season_gw
  ON public.team_gw_decisions(season_id, gameweek);

CREATE INDEX IF NOT EXISTS idx_team_gw_decisions_team
  ON public.team_gw_decisions(team_id);

ALTER TABLE public.team_gw_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_gw_decisions_select_anon" ON public.team_gw_decisions;
CREATE POLICY "team_gw_decisions_select_anon"
  ON public.team_gw_decisions FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "team_gw_decisions_select_authenticated" ON public.team_gw_decisions;
CREATE POLICY "team_gw_decisions_select_authenticated"
  ON public.team_gw_decisions FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "team_gw_decisions_write_authenticated" ON public.team_gw_decisions;
CREATE POLICY "team_gw_decisions_write_authenticated"
  ON public.team_gw_decisions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

GRANT SELECT ON TABLE public.team_gw_decisions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_gw_decisions TO authenticated;
