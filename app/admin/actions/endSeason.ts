"use server";

/**
 * End of Season Processing — Etap 1: kalkulacja statusów (admin).
 */

import {
  runCalculateEndSeasonStatuses,
  type CalculateEndSeasonStatusesResult,
} from "@/lib/admin/endSeasonCompute";
import { createClient } from "@/lib/supabase/server";

export type { CalculateEndSeasonStatusesResult };

async function requireAuth() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji. Zaloguj się ponownie.");
  return supabase;
}

/**
 * Analizuje sezon i zwraca mapę teamId → { status, next_tier, … }.
 */
export async function calculateEndSeasonStatuses(
  seasonId: string,
): Promise<CalculateEndSeasonStatusesResult> {
  try {
    const supabase = await requireAuth();
    return await runCalculateEndSeasonStatuses(supabase, seasonId);
  } catch (e) {
    console.error("[calculateEndSeasonStatuses]", e);
    return {
      error: e instanceof Error ? e.message : "Błąd kalkulacji statusów sezonu.",
    };
  }
}
