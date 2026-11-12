/**
 * Turbo-Cache RAM dla surowych danych Stats Lab (per seasonCode).
 * Unika ponownego pobierania tysięcy wierszy przy każdym filtrze.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  FplLabClub,
  FplLabFixtureRow,
  FplLabPlayer,
  FplLabPlayerGwHistory,
} from "@/lib/stats-lab/types";

const CACHE_TTL_MS = 5 * 60 * 1000;
const GW_HISTORY_PAGE = 1000;
const HISTORY_CONCURRENCY = 6;

export type StatsLabCachedDataset = {
  seasonCode: string;
  /** Fingerprint invalidacji cache (updated_at + sync stamps). */
  lastSyncedAt: string | null;
  /** Surowe `updated_at` z meta — do UI / eksportu. */
  updatedAt: string | null;
  lastFinishedGw: number;
  lastBootstrapSyncAt: string | null;
  lastHistorySyncAt: string | null;
  cachedAt: number;
  clubs: FplLabClub[];
  players: FplLabPlayer[];
  fixtures: FplLabFixtureRow[];
  playerGwHistory: FplLabPlayerGwHistory[];
};

type CacheStore = {
  bySeason: Map<string, StatsLabCachedDataset>;
};

type GlobalWithCache = typeof globalThis & {
  __fplStatsLabDatasetCache?: CacheStore;
};

function getStore(): CacheStore {
  const g = globalThis as GlobalWithCache;
  if (!g.__fplStatsLabDatasetCache) {
    g.__fplStatsLabDatasetCache = { bySeason: new Map() };
  }
  return g.__fplStatsLabDatasetCache;
}

type SupabaseClient = ReturnType<typeof createClient>;

async function fetchHistoryPage(
  supabase: SupabaseClient,
  seasonCode: string,
  from: number,
): Promise<FplLabPlayerGwHistory[]> {
  const to = from + GW_HISTORY_PAGE - 1;
  const { data, error } = await supabase
    .from("fpl_lab_player_gw_history")
    .select("*")
    .eq("season_code", seasonCode)
    .order("fixture_id", { ascending: true })
    .order("fpl_element_id", { ascending: true })
    .range(from, to);
  if (error) throw new Error(error.message);
  return (data ?? []) as FplLabPlayerGwHistory[];
}

/** Równoległe stronicowanie historii GW (Turbo). */
async function fetchAllPlayerGwHistoryParallel(
  supabase: SupabaseClient,
  seasonCode: string,
): Promise<FplLabPlayerGwHistory[]> {
  const all: FplLabPlayerGwHistory[] = [];
  let from = 0;

  for (;;) {
    const offsets = Array.from(
      { length: HISTORY_CONCURRENCY },
      (_, i) => from + i * GW_HISTORY_PAGE,
    );
    const chunks = await Promise.all(
      offsets.map((offset) => fetchHistoryPage(supabase, seasonCode, offset)),
    );

    let exhausted = false;
    for (const chunk of chunks) {
      all.push(...chunk);
      if (chunk.length < GW_HISTORY_PAGE) {
        exhausted = true;
        break;
      }
    }
    if (exhausted) break;
    from += HISTORY_CONCURRENCY * GW_HISTORY_PAGE;
  }

  return all;
}

function shallowCopyDataset(
  entry: StatsLabCachedDataset,
): StatsLabCachedDataset {
  return {
    ...entry,
    clubs: entry.clubs.slice(),
    players: entry.players.slice(),
    fixtures: entry.fixtures.slice(),
    playerGwHistory: entry.playerGwHistory.slice(),
  };
}

/**
 * Zwraca dataset sezonu z RAM (gdy świeży) albo ładuje z Supabase i cache'uje.
 */
export async function getCachedStatsLabDataset(
  seasonCode: string,
): Promise<StatsLabCachedDataset> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji — zaloguj się w panelu admina.");

  const { data: metaRow, error: metaError } = await supabase
    .from("fpl_lab_sync_meta")
    .select(
      "season_code, last_finished_gw, last_bootstrap_sync_at, last_history_sync_at, updated_at",
    )
    .eq("season_code", seasonCode)
    .limit(1)
    .maybeSingle();

  if (metaError) throw new Error(metaError.message);

  const updatedAt = (metaRow?.updated_at as string | null | undefined) ?? null;
  const lastBootstrapSyncAt =
    (metaRow?.last_bootstrap_sync_at as string | null | undefined) ?? null;
  const lastHistorySyncAt =
    (metaRow?.last_history_sync_at as string | null | undefined) ?? null;
  // „last_synced_at” = fingerprint synchronizacji (updated_at + znaczniki bootstrap/history)
  const lastSyncedAt =
    [updatedAt ?? "", lastBootstrapSyncAt ?? "", lastHistorySyncAt ?? ""].join(
      "|",
    ) || null;
  const lastFinishedGw = Number(metaRow?.last_finished_gw ?? 0);

  const store = getStore();
  const hit = store.bySeason.get(seasonCode);
  const now = Date.now();
  if (
    hit &&
    hit.lastSyncedAt === lastSyncedAt &&
    now - hit.cachedAt < CACHE_TTL_MS
  ) {
    return shallowCopyDataset(hit);
  }

  const [clubsRes, playersRes, fixturesRes, playerGwHistory] =
    await Promise.all([
      supabase.from("fpl_lab_clubs").select("*").eq("season_code", seasonCode),
      supabase.from("fpl_lab_players").select("*").eq("season_code", seasonCode),
      supabase
        .from("fpl_lab_fixtures")
        .select("*")
        .eq("season_code", seasonCode)
        .order("gameweek", { ascending: true })
        .order("kickoff_time", { ascending: true }),
      fetchAllPlayerGwHistoryParallel(supabase, seasonCode),
    ]);

  if (clubsRes.error) throw new Error(clubsRes.error.message);
  if (playersRes.error) throw new Error(playersRes.error.message);
  if (fixturesRes.error) throw new Error(fixturesRes.error.message);

  const entry: StatsLabCachedDataset = {
    seasonCode,
    lastSyncedAt,
    updatedAt,
    lastFinishedGw,
    lastBootstrapSyncAt,
    lastHistorySyncAt,
    cachedAt: now,
    clubs: (clubsRes.data ?? []) as FplLabClub[],
    players: (playersRes.data ?? []) as FplLabPlayer[],
    fixtures: (fixturesRes.data ?? []) as FplLabFixtureRow[],
    playerGwHistory,
  };

  store.bySeason.set(seasonCode, entry);
  return shallowCopyDataset(entry);
}

/** Filtruje historię GW z cache (bez kolejnego round-trip do DB). */
export function filterCachedHistoryByGwRange(
  history: FplLabPlayerGwHistory[],
  gwFrom: number,
  gwTo: number,
): FplLabPlayerGwHistory[] {
  const lo = Math.min(gwFrom, gwTo);
  const hi = Math.max(gwFrom, gwTo);
  return history.filter((row) => {
    const gw = Number(row.gameweek);
    return gw >= lo && gw <= hi;
  });
}
