-- Trwałe webhooki Discord (niezależne od sezonu / dywizji / Hard Reset).
-- Mapowanie dywizji: division_level = divisions.tier (1 = najwyższa).

CREATE TABLE IF NOT EXISTS public.discord_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('GLOBAL', 'DIVISION')),
  global_type TEXT NULL
    CHECK (global_type IS NULL OR global_type IN ('FA_RANKING', 'FA_CUP')),
  division_level INTEGER NULL CHECK (division_level IS NULL OR division_level >= 1),
  url TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT discord_webhooks_global_requires_type CHECK (
    (scope = 'GLOBAL' AND global_type IS NOT NULL AND division_level IS NULL)
    OR (scope = 'DIVISION' AND division_level IS NOT NULL AND global_type IS NULL)
  )
);

-- Jeden webhook na kanał globalny
CREATE UNIQUE INDEX IF NOT EXISTS discord_webhooks_global_unique
  ON public.discord_webhooks (global_type)
  WHERE scope = 'GLOBAL';

-- Jeden webhook na poziom dywizji
CREATE UNIQUE INDEX IF NOT EXISTS discord_webhooks_division_level_unique
  ON public.discord_webhooks (division_level)
  WHERE scope = 'DIVISION';

CREATE INDEX IF NOT EXISTS idx_discord_webhooks_scope
  ON public.discord_webhooks (scope);

ALTER TABLE public.discord_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "discord_webhooks_select_authenticated" ON public.discord_webhooks;
CREATE POLICY "discord_webhooks_select_authenticated"
  ON public.discord_webhooks FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "discord_webhooks_write_authenticated" ON public.discord_webhooks;
CREATE POLICY "discord_webhooks_write_authenticated"
  ON public.discord_webhooks FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Brak SELECT dla anon — URL webhooków nie powinny być publiczne
REVOKE ALL ON TABLE public.discord_webhooks FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.discord_webhooks TO authenticated;

COMMENT ON TABLE public.discord_webhooks IS
  'Trwałe webhooki Discord. Hard Reset (wipeLeagueData) NIE kasuje tej tabeli.';

-- Public: tylko flaga obecności (bez ujawniania URL)
CREATE OR REPLACE FUNCTION public.has_division_discord_webhook(p_level integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.discord_webhooks w
    WHERE w.scope = 'DIVISION'
      AND w.division_level = p_level
      AND length(trim(w.url)) > 0
  );
$$;

CREATE OR REPLACE FUNCTION public.has_global_discord_webhook(p_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.discord_webhooks w
    WHERE w.scope = 'GLOBAL'
      AND w.global_type = p_type
      AND length(trim(w.url)) > 0
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_division_discord_webhook(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_global_discord_webhook(text) TO anon, authenticated;

-- Backfill GLOBAL z najnowszego sezonu, który ma URL
INSERT INTO public.discord_webhooks (scope, global_type, url)
SELECT 'GLOBAL', 'FA_RANKING', trim(s.fa_ranking_webhook_url)
FROM public.seasons s
WHERE s.fa_ranking_webhook_url IS NOT NULL
  AND trim(s.fa_ranking_webhook_url) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.discord_webhooks w
    WHERE w.scope = 'GLOBAL' AND w.global_type = 'FA_RANKING'
  )
ORDER BY s.created_at DESC
LIMIT 1;

INSERT INTO public.discord_webhooks (scope, global_type, url)
SELECT 'GLOBAL', 'FA_CUP', trim(s.fa_cup_webhook_url)
FROM public.seasons s
WHERE s.fa_cup_webhook_url IS NOT NULL
  AND trim(s.fa_cup_webhook_url) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.discord_webhooks w
    WHERE w.scope = 'GLOBAL' AND w.global_type = 'FA_CUP'
  )
ORDER BY s.created_at DESC
LIMIT 1;

-- Backfill DIVISION: jeden URL na tier (najstarsza dywizja z webhookiem)
INSERT INTO public.discord_webhooks (scope, division_level, url)
SELECT 'DIVISION', src.tier, src.url
FROM (
  SELECT DISTINCT ON (d.tier)
    d.tier,
    trim(d.discord_webhook_url) AS url
  FROM public.divisions d
  WHERE d.discord_webhook_url IS NOT NULL
    AND trim(d.discord_webhook_url) <> ''
  ORDER BY d.tier ASC, d.created_at ASC
) src
WHERE NOT EXISTS (
  SELECT 1 FROM public.discord_webhooks w
  WHERE w.scope = 'DIVISION' AND w.division_level = src.tier
);
