-- Zapis dla authenticated (sync FPL) — tylko tabele no_big_six_*

DROP POLICY IF EXISTS "no_big_six_config_write_authenticated" ON public.no_big_six_config;
CREATE POLICY "no_big_six_config_write_authenticated"
  ON public.no_big_six_config
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "no_big_six_teams_write_authenticated" ON public.no_big_six_teams;
CREATE POLICY "no_big_six_teams_write_authenticated"
  ON public.no_big_six_teams
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "no_big_six_gw_results_write_authenticated" ON public.no_big_six_gw_results;
CREATE POLICY "no_big_six_gw_results_write_authenticated"
  ON public.no_big_six_gw_results
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "no_big_six_penalties_write_authenticated" ON public.no_big_six_penalties;
CREATE POLICY "no_big_six_penalties_write_authenticated"
  ON public.no_big_six_penalties
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

GRANT INSERT, UPDATE, DELETE ON TABLE public.no_big_six_config TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.no_big_six_teams TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.no_big_six_gw_results TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.no_big_six_penalties TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE public.no_big_six_config_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.no_big_six_gw_results_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.no_big_six_penalties_id_seq TO authenticated;
