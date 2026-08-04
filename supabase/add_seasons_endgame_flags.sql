-- =============================================================================
-- seasons: flagi End of Season Processing (is_completed / is_archived)
-- =============================================================================
-- Wklej do Supabase → SQL Editor → Run. Idempotentne.
-- =============================================================================

ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.seasons.is_completed IS
  'true = baraże zakończone, publiczne Podsumowanie Sezonu dostępne (Etap 1)';
COMMENT ON COLUMN public.seasons.is_archived IS
  'true = sezon spakowany; gracze przeniesieni do nowego sezonu (Etap 3)';

CREATE INDEX IF NOT EXISTS idx_seasons_completed
  ON public.seasons (is_completed)
  WHERE is_completed = true;

CREATE INDEX IF NOT EXISTS idx_seasons_archived
  ON public.seasons (is_archived)
  WHERE is_archived = true;

NOTIFY pgrst, 'reload schema';
