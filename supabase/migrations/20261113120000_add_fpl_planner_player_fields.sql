-- FPL Planner: pola pod rekonstrukcję cen zakupu + xPts v1
-- cost_change_start może już istnieć (expand_fpl_stats_lab_full) — IF NOT EXISTS jest bezpieczne.

ALTER TABLE public.fpl_lab_players
  ADD COLUMN IF NOT EXISTS cost_change_start integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chance_of_playing_next_round integer NULL,
  ADD COLUMN IF NOT EXISTS news text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ep_next numeric(6, 2) NULL;

COMMENT ON COLUMN public.fpl_lab_players.cost_change_start IS
  'Zmiana ceny od startu sezonu w dziesiątych częściach £ (bootstrap cost_change_start).';
COMMENT ON COLUMN public.fpl_lab_players.chance_of_playing_next_round IS
  'Szansa gry w następnej kolejce: 0|25|50|75|100 lub NULL (bootstrap).';
COMMENT ON COLUMN public.fpl_lab_players.news IS
  'Komunikat kontuzji / zawieszenia z bootstrap-static.elements[].news.';
COMMENT ON COLUMN public.fpl_lab_players.ep_next IS
  'Oficjalne Expected Points FPL na następną kolejkę (bootstrap ep_next).';
