-- Pula graczy przed podziałem na dywizje (Kreator Dywizji / Baza Graczy).
-- Uruchom w Supabase SQL Editor.

-- 1) division_id opcjonalne (NULL = jeszcze nieprzydzielony)
ALTER TABLE public.teams
  ALTER COLUMN division_id DROP NOT NULL;

-- 2) status aktywności (domyślnie aktywny uczestnik)
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.teams.division_id IS
  'NULL = pula przed losowaniem dywizji; po commitDivisionDraft ustawiane na konkretną dywizję.';
COMMENT ON COLUMN public.teams.is_active IS
  'false = nieaktywny (pomijany w Kreatorze Dywizji).';
