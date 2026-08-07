-- Content Hub: globalne webhooki Discord per sezon (FA Ranking + FA Cup).
-- Nie są przypisane do dywizji H2H — tylko tekst / JSON embed.

ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS fa_ranking_webhook_url TEXT;

ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS fa_cup_webhook_url TEXT;

COMMENT ON COLUMN public.seasons.fa_ranking_webhook_url IS
  'Discord webhook — kanał The FA Ranking (globalny, Content Hub).';

COMMENT ON COLUMN public.seasons.fa_cup_webhook_url IS
  'Discord webhook — kanał FA Cup (globalny, Content Hub).';
