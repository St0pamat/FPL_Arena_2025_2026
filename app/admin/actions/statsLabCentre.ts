"use server";

import { createClient } from "@/lib/supabase/server";
import { DEFAULT_STATS_LAB_SEASON } from "@/lib/stats-lab/syncEngine";
import {
  filterCachedHistoryByGwRange,
  getCachedStatsLabDataset,
} from "@/lib/stats-lab/serverDataCache";
import type { FplLabClub } from "@/lib/stats-lab/types";
import {
  buildStatsCentreResult,
  createDefaultStatsCentreFilter,
  type StatsCentreFilter,
  type StatsCentreResult,
} from "@/lib/stats-lab/statsCentreEngine";
import { logStatsCentreLoadError } from "@/lib/stats-lab/statsCentreI18n";

async function requireAuth() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji — zaloguj się w panelu admina.");
  return supabase;
}

/**
 * Stats Centre — pełna tabela (PLAYERS / PER_GW / TEAMS) dla filtra.
 * Dane surowe: Turbo-Cache RAM.
 * Błędy: console.error po stronie serwera (logi deployu) + rethrow do UI.
 */
export async function queryStatsCentreAction(
  filterInput: Partial<StatsCentreFilter> & { seasonCode?: string },
): Promise<StatsCentreResult> {
  try {
    await requireAuth();
    const seasonCode = filterInput.seasonCode || DEFAULT_STATS_LAB_SEASON;
    const defaults = createDefaultStatsCentreFilter(seasonCode);
    const filter: StatsCentreFilter = {
      ...defaults,
      ...filterInput,
      seasonCode,
      positions: filterInput.positions ?? defaults.positions,
      clubIds: filterInput.clubIds ?? defaults.clubIds,
    };

    const dataset = await getCachedStatsLabDataset(seasonCode);
    const maxGw = dataset.lastFinishedGw;
    const clubs = dataset.clubs.map((c) => ({
      fpl_team_id: c.fpl_team_id,
      name: c.name,
      short_name: c.short_name,
      pulse_code: c.pulse_code,
    })) as Pick<
      FplLabClub,
      "fpl_team_id" | "name" | "short_name" | "pulse_code"
    >[];
    const players = dataset.players;

    const history =
      maxGw > 0
        ? filterCachedHistoryByGwRange(dataset.playerGwHistory, 1, maxGw)
        : [];

    return buildStatsCentreResult({
      players,
      history,
      clubs,
      filter,
      maxGw,
    });
  } catch (err) {
    // Serwerowy log — widoczny w logach deployu / Vercel, nie tylko w przeglądarce.
    logStatsCentreLoadError(err);
    throw err;
  }
}
