-- No Big Six: rozróżnienie kar auto-sub vs celowe wystawienie

ALTER TABLE public.no_big_six_penalties
  ADD COLUMN IF NOT EXISTS is_auto_sub BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.no_big_six_penalties.is_auto_sub IS
  'true = kara za gracza Big Six wszedłego z ławki (auto-sub); false = celowe wystawienie w składzie.';
