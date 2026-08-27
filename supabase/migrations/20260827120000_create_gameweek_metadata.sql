-- Metadane synchronizacji wyników FPL API per sezon × kolejka (Na Minusie).
-- Publiczny odczyt statusu PROVISIONAL / CONFIRMED + last_sync_at.

CREATE TABLE IF NOT EXISTS public.gameweek_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  gameweek INTEGER NOT NULL CHECK (gameweek >= 1 AND gameweek <= 38),
  last_sync_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  gw_status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED'
    CHECK (gw_status IN ('PROVISIONAL', 'CONFIRMED', 'NOT_STARTED')),
  CONSTRAINT gameweek_metadata_unique UNIQUE (season_id, gameweek)
);

CREATE INDEX IF NOT EXISTS idx_gameweek_metadata_season_gw
  ON public.gameweek_metadata(season_id, gameweek);

ALTER TABLE public.gameweek_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gameweek_metadata_select_anon" ON public.gameweek_metadata;
CREATE POLICY "gameweek_metadata_select_anon"
  ON public.gameweek_metadata FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "gameweek_metadata_select_authenticated" ON public.gameweek_metadata;
CREATE POLICY "gameweek_metadata_select_authenticated"
  ON public.gameweek_metadata FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "gameweek_metadata_write_authenticated" ON public.gameweek_metadata;
CREATE POLICY "gameweek_metadata_write_authenticated"
  ON public.gameweek_metadata FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

GRANT SELECT ON TABLE public.gameweek_metadata TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gameweek_metadata TO authenticated;
