-- =============================================================================
-- fixtures: KOMPLETNY patch kolumn (staging + baraże / tie-breakery)
-- =============================================================================
-- Wklej CAŁOŚĆ do Supabase → SQL Editor → Run.
-- Idempotentne: ADD COLUMN IF NOT EXISTS — bezpieczne przy ponownym uruchomieniu.
-- Po sukcesie: odśwież aplikację (ew. hard refresh).
-- =============================================================================

-- --- Staging (MODUŁ 3) -------------------------------------------------------
ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;

-- --- Baraże / playoff --------------------------------------------------------
ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS is_playoff BOOLEAN NOT NULL DEFAULT false;

-- --- Tie-breakery (GW19 / GW38) — pola liczbowe -------------------------------
ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS tiebreaker_home_goals INTEGER NULL;

ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS tiebreaker_away_goals INTEGER NULL;

ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS tiebreaker_home_goals_conceded INTEGER NULL;

ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS tiebreaker_away_goals_conceded INTEGER NULL;

ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS tiebreaker_home_bench INTEGER NULL;

ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS tiebreaker_away_bench INTEGER NULL;

-- --- Zwycięzca TB + metoda + czytelny powód ----------------------------------
ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS tiebreaker_winner_id UUID NULL;

ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS tiebreaker_method TEXT NULL;

ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS tiebreaker_reason TEXT NULL;

-- FK na teams (tylko jeśli jeszcze nie ma)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fixtures_tiebreaker_winner_id_fkey'
  ) THEN
    ALTER TABLE public.fixtures
      ADD CONSTRAINT fixtures_tiebreaker_winner_id_fkey
      FOREIGN KEY (tiebreaker_winner_id)
      REFERENCES public.teams(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Dozwolone wartości metody TB (kanoniczne + legacy)
ALTER TABLE public.fixtures
  DROP CONSTRAINT IF EXISTS fixtures_tiebreaker_method_check;

ALTER TABLE public.fixtures
  ADD CONSTRAINT fixtures_tiebreaker_method_check
  CHECK (
    tiebreaker_method IS NULL
    OR tiebreaker_method IN (
      'FPL_POINTS',
      'GOALS_XI',
      'GOALS_CONCEDED',
      'BENCH_POINTS',
      'COIN_TOSS',
      -- legacy
      'GOALS',
      'CONCEDED',
      'BENCH',
      'MANUAL',
      'FPL'
    )
  );

-- --- Indeksy pomocnicze ------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_fixtures_published
  ON public.fixtures (division_id, is_published);

CREATE INDEX IF NOT EXISTS idx_fixtures_is_playoff
  ON public.fixtures (season_id, gameweek)
  WHERE is_playoff = true;

-- --- Komentarze (dokumentacja w DB) ------------------------------------------
COMMENT ON COLUMN public.fixtures.is_published IS
  'false = brudnopis (tylko admin); true = widoczne w Strefie Gracza';
COMMENT ON COLUMN public.fixtures.is_playoff IS
  'true = mecz barażowy (GW19/GW38), poza medianą ligową';
COMMENT ON COLUMN public.fixtures.home_fpl_points IS
  'Małe punkty FPL gospodarza (INTEGER signed — ujemne dozwolone)';
COMMENT ON COLUMN public.fixtures.away_fpl_points IS
  'Małe punkty FPL gościa (INTEGER signed — ujemne dozwolone)';
COMMENT ON COLUMN public.fixtures.tiebreaker_method IS
  'Kod metody TB: FPL_POINTS | GOALS_XI | GOALS_CONCEDED | BENCH_POINTS | COIN_TOSS (+ legacy)';
COMMENT ON COLUMN public.fixtures.tiebreaker_reason IS
  'Czytelny powód TB dla UI, np. „Więcej goli”, „Mniej straconych”';
COMMENT ON COLUMN public.fixtures.tiebreaker_winner_id IS
  'ID drużyny wygrywającej remis barażowy po tie-breaku';

-- --- RLS anon: tylko opublikowane (bezpieczne ponowne utworzenie) ------------
DROP POLICY IF EXISTS "fixtures_select_anon" ON public.fixtures;
CREATE POLICY "fixtures_select_anon"
  ON public.fixtures FOR SELECT TO anon
  USING (is_published = true);

-- --- Odśwież cache schematu PostgREST (Supabase API) -------------------------
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- Weryfikacja (opcjonalnie — wynik w gridzie):
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'fixtures'
--   AND column_name IN (
--     'is_published', 'is_playoff',
--     'tiebreaker_home_goals', 'tiebreaker_away_goals',
--     'tiebreaker_home_goals_conceded', 'tiebreaker_away_goals_conceded',
--     'tiebreaker_home_bench', 'tiebreaker_away_bench',
--     'tiebreaker_winner_id', 'tiebreaker_method', 'tiebreaker_reason'
--   )
-- ORDER BY column_name;
-- =============================================================================
