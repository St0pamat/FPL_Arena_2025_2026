-- Discord ID z Excela SSOT (Master Import).
-- Uruchom w Supabase SQL Editor.

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS discord_id TEXT;

COMMENT ON COLUMN public.teams.discord_id IS
  'Excel: Discord ID (snowflake). Opcjonalne.';
