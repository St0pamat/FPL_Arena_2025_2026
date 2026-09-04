import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

/** Klient Supabase z uprawnieniami service role (omija RLS) — tylko po stronie serwera. */
export function createServiceClient(): SupabaseClient {
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!serviceKey) {
    throw new Error("Brak SUPABASE_SERVICE_ROLE_KEY w środowisku serwera.");
  }

  const { url } = getSupabaseEnv();

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
