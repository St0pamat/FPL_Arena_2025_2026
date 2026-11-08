-- =============================================================================
-- FPL Arena: Stats Lab — pełne oficjalne statystyki FPL + Defensive Contributions
-- Rozszerza fpl_lab_players oraz fpl_lab_player_gw_history (ADD COLUMN IF NOT EXISTS).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. fpl_lab_players — snapshot bootstrap-static (Overview / Value / DC)
-- ---------------------------------------------------------------------------
ALTER TABLE public.fpl_lab_players
  ADD COLUMN IF NOT EXISTS event_points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS form NUMERIC(6, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_per_game NUMERIC(6, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS value_form NUMERIC(6, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS value_season NUMERIC(6, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dreamteam_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfers_in INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfers_out INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfers_in_event INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfers_out_event INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_change_start INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_change_event INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS defensive_contribution INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.fpl_lab_players.event_points IS
  'Punkty w ostatniej kolejce (GWP) z bootstrap-static.';
COMMENT ON COLUMN public.fpl_lab_players.form IS
  'Forma FPL (średnia z ~30 dni).';
COMMENT ON COLUMN public.fpl_lab_players.points_per_game IS
  'Średnia punktów na mecz (PPM).';
COMMENT ON COLUMN public.fpl_lab_players.value_form IS
  'Value (form) = forma / cena.';
COMMENT ON COLUMN public.fpl_lab_players.value_season IS
  'Value (season) = punkty / cena.';
COMMENT ON COLUMN public.fpl_lab_players.dreamteam_count IS
  'Liczba wystąpień w Drużynie Kolejki (DT).';
COMMENT ON COLUMN public.fpl_lab_players.transfers_in IS
  'Transfery DO w sezonie (TI).';
COMMENT ON COLUMN public.fpl_lab_players.transfers_out IS
  'Transfery Z w sezonie (TO).';
COMMENT ON COLUMN public.fpl_lab_players.transfers_in_event IS
  'Transfery DO w bieżącej kolejce TI(GW).';
COMMENT ON COLUMN public.fpl_lab_players.transfers_out_event IS
  'Transfery Z w bieżącej kolejce TO(GW).';
COMMENT ON COLUMN public.fpl_lab_players.cost_change_start IS
  'Zmiana ceny od startu sezonu w dziesiątkach (9 = +£0.9m).';
COMMENT ON COLUMN public.fpl_lab_players.cost_change_event IS
  'Zmiana ceny w bieżącej kolejce w dziesiątkach.';
COMMENT ON COLUMN public.fpl_lab_players.defensive_contribution IS
  'Suma Defensive Contributions (DC) z API FPL / wyliczana.';

-- ---------------------------------------------------------------------------
-- 2. fpl_lab_player_gw_history — DC + transfery per GW/mecz
-- ---------------------------------------------------------------------------
ALTER TABLE public.fpl_lab_player_gw_history
  ADD COLUMN IF NOT EXISTS defensive_contribution INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfers_balance INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfers_in INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfers_out INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.fpl_lab_player_gw_history.defensive_contribution IS
  'Suma DC w danym meczu (element-summary.history).';
COMMENT ON COLUMN public.fpl_lab_player_gw_history.transfers_balance IS
  'Bilans transferów w danym GW.';
COMMENT ON COLUMN public.fpl_lab_player_gw_history.transfers_in IS
  'Transfery DO w danym GW.';
COMMENT ON COLUMN public.fpl_lab_player_gw_history.transfers_out IS
  'Transfery Z w danym GW.';
