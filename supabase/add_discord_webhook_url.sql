-- Uruchom w Supabase SQL Editor, jeśli kolumna jeszcze nie istnieje:
ALTER TABLE public.divisions
  ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT;
