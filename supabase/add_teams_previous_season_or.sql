-- Overall Rank z poprzedniego sezonu (sortowanie Kreatora Dywizji).
-- Uruchom w Supabase SQL Editor.

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS previous_season_or INTEGER;
