"use server";

import { createClient } from "@/lib/supabase/server";
import { DEFAULT_STATS_LAB_SEASON } from "@/lib/stats-lab/syncEngine";
import { getCachedStatsLabDataset } from "@/lib/stats-lab/serverDataCache";
import {
  buildStatsLabProjections,
  createDefaultProjectionsRange,
  runProjectionsEngineQaSelfCheck,
  type ProjectionsBuildResult,
  type ProjectionsHistoryXgRow,
  type ProjectionsSortKey,
  type ProjectionsVenueFilter,
} from "@/lib/stats-lab/projectionsEngine";

async function requireAuth() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji — zaloguj się w panelu admina.");
  return supabase;
}

export type StatsLabProjectionsQueryInput = {
  seasonCode?: string;
  startGw?: number;
  endGw?: number;
  hiddenGws?: number[];
  venueFilter?: ProjectionsVenueFilter;
  sortBy?: ProjectionsSortKey;
  sortDir?: "asc" | "desc";
  referenceGw?: number;
};

export type StatsLabProjectionsActionResult = ProjectionsBuildResult & {
  syncedAt: string | null;
  lastBootstrapSyncAt: string | null;
  lastHistorySyncAt: string | null;
};

/**
 * Predykcje klubów / FDR — Turbo-Cache RAM + Dixon-Coles v0.2.
 */
export async function queryStatsLabProjectionsAction(
  input: StatsLabProjectionsQueryInput = {},
): Promise<StatsLabProjectionsActionResult> {
  await requireAuth();
  const seasonCode = input.seasonCode || DEFAULT_STATS_LAB_SEASON;
  const dataset = await getCachedStatsLabDataset(seasonCode);

  const lastFinishedGw = dataset.lastFinishedGw;
  const { defaultStartGw, defaultEndGw } =
    createDefaultProjectionsRange(lastFinishedGw);

  const startGw = input.startGw ?? defaultStartGw;
  const endGw = input.endGw ?? defaultEndGw;

  const historyXg: ProjectionsHistoryXgRow[] = dataset.playerGwHistory.map(
    (row) => ({
      fixture_id: Number(row.fixture_id),
      was_home: Boolean(row.was_home),
      expected_goals: Number(row.expected_goals ?? 0),
    }),
  );

  const built = buildStatsLabProjections({
    seasonCode,
    clubs: dataset.clubs,
    fixtures: dataset.fixtures,
    historyXg,
    startGw,
    endGw,
    lastFinishedGw,
    hiddenGws: input.hiddenGws,
    venueFilter: input.venueFilter,
    sortBy: input.sortBy,
    sortDir: input.sortDir,
    referenceGw: input.referenceGw,
  });

  const qa = runProjectionsEngineQaSelfCheck();

  return {
    ...built,
    qaSelfCheck: qa,
    syncedAt: dataset.updatedAt,
    lastBootstrapSyncAt: dataset.lastBootstrapSyncAt,
    lastHistorySyncAt: dataset.lastHistorySyncAt,
  };
}

/** Lekki endpoint do weryfikacji QA bez ładowania pełnych danych. */
export async function runProjectionsQaSelfCheckAction(): Promise<{
  passed: boolean;
  checks: Record<string, boolean>;
}> {
  await requireAuth();
  return runProjectionsEngineQaSelfCheck();
}
