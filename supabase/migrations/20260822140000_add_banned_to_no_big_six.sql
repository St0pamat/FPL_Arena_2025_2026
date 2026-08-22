-- No Big Six: status zbanowany + opcjonalny bucket Storage (herby mogą też iść lokalnie)

ALTER TABLE public.no_big_six_teams
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.no_big_six_teams.is_banned IS
  'true = gracz usunięty z ligi FPL; historia wyników i kar zostaje w bazie.';

-- Opcjonalnie: Supabase Storage (alternatywa dla public/uploads/no-big-six-logos/)
INSERT INTO storage.buckets (id, name, public)
VALUES ('no_big_six_logos', 'no_big_six_logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "no_big_six_logos_public_read" ON storage.objects;
CREATE POLICY "no_big_six_logos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'no_big_six_logos');

DROP POLICY IF EXISTS "no_big_six_logos_admin_insert" ON storage.objects;
CREATE POLICY "no_big_six_logos_admin_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'no_big_six_logos');

DROP POLICY IF EXISTS "no_big_six_logos_admin_update" ON storage.objects;
CREATE POLICY "no_big_six_logos_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'no_big_six_logos')
  WITH CHECK (bucket_id = 'no_big_six_logos');

DROP POLICY IF EXISTS "no_big_six_logos_admin_delete" ON storage.objects;
CREATE POLICY "no_big_six_logos_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'no_big_six_logos');
