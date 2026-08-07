-- Content Hub Faza 1: profil X.com uczestnika (Master Import, kolumna 13 / indeks 12).
-- Idempotentne — bezpieczne przy ponownym uruchomieniu.

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS x_com TEXT;

COMMENT ON COLUMN public.teams.x_com IS
  'Excel SSOT: nick / handle X.com (np. @st0pamat). Używane m.in. do Content Hub / auto-postów.';
