-- Kontakt + status uczestnika z Excel SSOT (kolumny 11–13)
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Aktywny';

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS x_com TEXT;

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN public.teams.status IS
  'Excel: Status uczestnika (np. Aktywny). is_active pozostaje zsynchronizowany przy imporcie.';

COMMENT ON COLUMN public.teams.x_com IS
  'Excel: profil x.com (np. @st0pamat)';

COMMENT ON COLUMN public.teams.email IS
  'Excel: adres e-mail uczestnika';
