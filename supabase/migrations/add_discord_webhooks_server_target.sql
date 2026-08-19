-- Dwa niezależne zestawy webhooków: Na Minusie ™ (live) + FPL Arena (backup/test).
-- Istniejące wiersze → NA_MINUSIE. Unique: (kanał × serwer).

ALTER TABLE public.discord_webhooks
  ADD COLUMN IF NOT EXISTS server_target TEXT NOT NULL DEFAULT 'NA_MINUSIE';

ALTER TABLE public.discord_webhooks
  DROP CONSTRAINT IF EXISTS discord_webhooks_server_target_check;

ALTER TABLE public.discord_webhooks
  ADD CONSTRAINT discord_webhooks_server_target_check
  CHECK (server_target IN ('NA_MINUSIE', 'FPL_ARENA'));

UPDATE public.discord_webhooks
SET server_target = 'NA_MINUSIE'
WHERE server_target IS NULL OR btrim(server_target) = '';

DROP INDEX IF EXISTS public.discord_webhooks_global_unique;
DROP INDEX IF EXISTS public.discord_webhooks_division_level_unique;

CREATE UNIQUE INDEX IF NOT EXISTS discord_webhooks_global_unique
  ON public.discord_webhooks (global_type, server_target)
  WHERE scope = 'GLOBAL';

CREATE UNIQUE INDEX IF NOT EXISTS discord_webhooks_division_level_unique
  ON public.discord_webhooks (division_level, server_target)
  WHERE scope = 'DIVISION';

CREATE INDEX IF NOT EXISTS idx_discord_webhooks_server_target
  ON public.discord_webhooks (server_target);

COMMENT ON COLUMN public.discord_webhooks.server_target IS
  'NA_MINUSIE = serwer ligi live; FPL_ARENA = ukryty backup / test.';

-- Publiczne flagi obecności: tylko serwer live (Na Minusie)
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
      AND w.server_target = 'NA_MINUSIE'
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
      AND w.server_target = 'NA_MINUSIE'
      AND length(trim(w.url)) > 0
  );
$$;
