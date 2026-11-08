"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FplLabSyncMeta, FplLabSyncStatus, FplPositionType } from "@/lib/stats-lab/types";
import {
  badgeExists,
  countCachedBadges,
  countCachedPlayerPhotos,
  ensureBadgeCached,
  ensurePlayerPhotoCached,
  mapPool,
  playerPhotoExists,
} from "@/lib/stats-lab/mediaArchive";
import {
  DEFAULT_STATS_LAB_SEASON,
  FPL_API_BASE,
  HISTORY_BATCH_SIZE_DEFAULT,
  HISTORY_CONCURRENCY,
  FplRateLimitError,
  chunkArray,
  fetchFplJsonWithRetry,
  historyBatchJitterMs,
  mapBootstrapClub,
  mapBootstrapPlayer,
  mapElementHistoryRows,
  resolveTargetGameweek,
  type BootstrapSyncResult,
  type FplBootstrapStatic,
  type FplElementSummary,
  type HistoryBatchSyncResult,
  type StatsLabOverview,
  type StatsLabTopPlayerRow,
} from "@/lib/stats-lab/syncEngine";

const UPSERT_CHUNK = 200;
const HISTORY_SUM_PAGE = 1000;

async function requireAuth() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji — zaloguj się w panelu admina.");
  return supabase;
}

type SupabaseClient = Awaited<ReturnType<typeof requireAuth>>;

/**
 * Suma total_points z historii GW per gracz (stronicowanie — limit PostgREST 1000).
 */
async function fetchHistoryPointsSumByPlayer(
  supabase: SupabaseClient,
  seasonCode: string,
): Promise<Map<number, number>> {
  const sums = new Map<number, number>();
  let from = 0;

  for (;;) {
    const to = from + HISTORY_SUM_PAGE - 1;
    const { data, error } = await supabase
      .from("fpl_lab_player_gw_history")
      .select("fpl_element_id, total_points")
      .eq("season_code", seasonCode)
      .order("fixture_id", { ascending: true })
      .order("fpl_element_id", { ascending: true })
      .range(from, to);

    if (error) throw new Error(error.message);

    const chunk = data ?? [];
    for (const row of chunk) {
      const id = Number(row.fpl_element_id);
      sums.set(id, (sums.get(id) ?? 0) + Number(row.total_points ?? 0));
    }

    if (chunk.length < HISTORY_SUM_PAGE) break;
    from += HISTORY_SUM_PAGE;
  }

  return sums;
}

/**
 * Gracze oznaczeni jako zsynchronizowani (last_synced_gw >= targetGw), ale
 * suma punktów w historii < snapshot `fpl_lab_players.total_points` — reset
 * last_synced_gw, żeby Incremental Sync dociągnął brakujące mecze.
 */
async function requeuePlayersWithIncompleteHistory(
  supabase: SupabaseClient,
  seasonCode: string,
  targetGw: number,
  nowIso: string,
): Promise<number> {
  if (targetGw < 1) return 0;

  const [histSums, playersRes] = await Promise.all([
    fetchHistoryPointsSumByPlayer(supabase, seasonCode),
    supabase
      .from("fpl_lab_players")
      .select("fpl_element_id, total_points, last_synced_gw")
      .eq("season_code", seasonCode)
      .gt("minutes", 0),
  ]);

  if (playersRes.error) throw new Error(playersRes.error.message);

  const toReset: number[] = [];
  for (const p of playersRes.data ?? []) {
    const id = Number(p.fpl_element_id);
    const snapshotPts = Number(p.total_points ?? 0);
    const histPts = histSums.get(id) ?? 0;
    const syncedGw = Number(p.last_synced_gw ?? 0);
    if (snapshotPts > 0 && histPts < snapshotPts && syncedGw >= targetGw) {
      toReset.push(id);
    }
  }

  if (!toReset.length) return 0;

  for (const ids of chunkArray(toReset, UPSERT_CHUNK)) {
    const { error } = await supabase
      .from("fpl_lab_players")
      .update({ last_synced_gw: 0, updated_at: nowIso })
      .eq("season_code", seasonCode)
      .in("fpl_element_id", ids);
    if (error) throw new Error(error.message);
  }

  return toReset.length;
}

function revalidateStatsLab() {
  revalidatePath("/admin/stats-lab");
  revalidatePath("/admin/stats-lab/sync");
}

async function upsertSyncMeta(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  patch: Partial<FplLabSyncMeta> & { season_code: string },
) {
  const { error } = await supabase.from("fpl_lab_sync_meta").upsert(
    {
      ...patch,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "season_code" },
  );
  if (error) throw new Error(error.message);
}

/**
 * Stan bazy Stats Lab + Top 10 wg punktów FPL.
 */
export async function getStatsLabOverview(
  seasonCode: string = DEFAULT_STATS_LAB_SEASON,
): Promise<StatsLabOverview> {
  const supabase = await requireAuth();

  const [
    metaRes,
    clubsRes,
    playersRes,
    activeRes,
    historyRes,
    metaGw,
    topRes,
  ] = await Promise.all([
    supabase
      .from("fpl_lab_sync_meta")
      .select("*")
      .eq("season_code", seasonCode)
      .maybeSingle(),
    supabase
      .from("fpl_lab_clubs")
      .select("fpl_team_id", { count: "exact", head: true })
      .eq("season_code", seasonCode),
    supabase
      .from("fpl_lab_players")
      .select("fpl_element_id", { count: "exact", head: true })
      .eq("season_code", seasonCode),
    supabase
      .from("fpl_lab_players")
      .select("fpl_element_id", { count: "exact", head: true })
      .eq("season_code", seasonCode)
      .gt("minutes", 0),
    supabase
      .from("fpl_lab_player_gw_history")
      .select("fixture_id", { count: "exact", head: true })
      .eq("season_code", seasonCode),
    supabase
      .from("fpl_lab_sync_meta")
      .select("last_finished_gw")
      .eq("season_code", seasonCode)
      .maybeSingle(),
    supabase
      .from("fpl_lab_players")
      .select(
        "fpl_element_id, web_name, element_type, fpl_team_id, now_cost, total_points, expected_goal_involvements, minutes, last_synced_gw",
      )
      .eq("season_code", seasonCode)
      .order("total_points", { ascending: false })
      .limit(10),
  ]);

  if (metaRes.error) throw new Error(metaRes.error.message);
  if (clubsRes.error) throw new Error(clubsRes.error.message);
  if (playersRes.error) throw new Error(playersRes.error.message);
  if (activeRes.error) throw new Error(activeRes.error.message);
  if (historyRes.error) throw new Error(historyRes.error.message);
  if (topRes.error) throw new Error(topRes.error.message);

  const targetGw = Number(metaGw.data?.last_finished_gw ?? 0);
  let playersNeedingHistory = 0;
  if (targetGw > 0) {
    const needRes = await supabase
      .from("fpl_lab_players")
      .select("fpl_element_id", { count: "exact", head: true })
      .eq("season_code", seasonCode)
      .gt("minutes", 0)
      .lt("last_synced_gw", targetGw);
    if (needRes.error) throw new Error(needRes.error.message);
    playersNeedingHistory = needRes.count ?? 0;
  }

  const clubIds = [
    ...new Set((topRes.data ?? []).map((p) => Number(p.fpl_team_id))),
  ];
  const clubMap = new Map<number, string>();
  if (clubIds.length) {
    const { data: clubs, error: clubErr } = await supabase
      .from("fpl_lab_clubs")
      .select("fpl_team_id, short_name")
      .eq("season_code", seasonCode)
      .in("fpl_team_id", clubIds);
    if (clubErr) throw new Error(clubErr.message);
    for (const c of clubs ?? []) {
      clubMap.set(Number(c.fpl_team_id), String(c.short_name));
    }
  }

  const topPlayers: StatsLabTopPlayerRow[] = (topRes.data ?? []).map((p) => ({
    fpl_element_id: Number(p.fpl_element_id),
    web_name: String(p.web_name),
    element_type: Number(p.element_type) as FplPositionType,
    fpl_team_id: Number(p.fpl_team_id),
    club_short: clubMap.get(Number(p.fpl_team_id)) ?? null,
    now_cost: Number(p.now_cost ?? 0),
    total_points: Number(p.total_points ?? 0),
    expected_goal_involvements: Number(p.expected_goal_involvements ?? 0),
    minutes: Number(p.minutes ?? 0),
    last_synced_gw: Number(p.last_synced_gw ?? 0),
  }));

  return {
    seasonCode,
    meta: (metaRes.data as FplLabSyncMeta | null) ?? null,
    clubsCount: clubsRes.count ?? 0,
    playersCount: playersRes.count ?? 0,
    activePlayersCount: activeRes.count ?? 0,
    historyRowsCount: historyRes.count ?? 0,
    playersNeedingHistory,
    targetGw,
    topPlayers,
  };
}

/**
 * Krok A — bootstrap-static → clubs + players (+ sync_meta).
 * Zachowuje istniejące last_synced_gw graczy.
 */
export async function runBootstrapSyncAction(
  seasonCode: string = DEFAULT_STATS_LAB_SEASON,
): Promise<BootstrapSyncResult> {
  const supabase = await requireAuth();
  const nowIso = new Date().toISOString();

  try {
    await upsertSyncMeta(supabase, {
      season_code: seasonCode,
      sync_status: "RUNNING" as FplLabSyncStatus,
      last_error: null,
    });

    const bootstrap = await fetchFplJsonWithRetry<FplBootstrapStatic>(
      `${FPL_API_BASE}/bootstrap-static/`,
    );
    const targetGw = resolveTargetGameweek(bootstrap.events);

    const clubs = (bootstrap.teams ?? []).map((t) =>
      mapBootstrapClub(seasonCode, t, nowIso),
    );

    const { data: existingPlayers, error: existingErr } = await supabase
      .from("fpl_lab_players")
      .select("fpl_element_id, last_synced_gw")
      .eq("season_code", seasonCode);
    if (existingErr) throw new Error(existingErr.message);

    const lastSyncedById = new Map<number, number>();
    for (const row of existingPlayers ?? []) {
      lastSyncedById.set(
        Number(row.fpl_element_id),
        Number(row.last_synced_gw ?? 0),
      );
    }

    const players = [];
    for (const el of bootstrap.elements ?? []) {
      const mapped = mapBootstrapPlayer(
        seasonCode,
        el,
        lastSyncedById.get(Number(el.id)) ?? 0,
        nowIso,
      );
      if (mapped) players.push(mapped);
    }

    for (const batch of chunkArray(clubs, UPSERT_CHUNK)) {
      const { error } = await supabase.from("fpl_lab_clubs").upsert(batch, {
        onConflict: "season_code,fpl_team_id",
      });
      if (error) throw new Error(`fpl_lab_clubs: ${error.message}`);
    }

    for (const batch of chunkArray(players, UPSERT_CHUNK)) {
      const { error } = await supabase.from("fpl_lab_players").upsert(batch, {
        onConflict: "season_code,fpl_element_id",
      });
      if (error) throw new Error(`fpl_lab_players: ${error.message}`);
    }

    await upsertSyncMeta(supabase, {
      season_code: seasonCode,
      last_finished_gw: targetGw,
      last_bootstrap_sync_at: nowIso,
      total_players_synced: players.length,
      sync_status: "COMPLETED",
      last_error: null,
    });

    revalidateStatsLab();

    return {
      ok: true,
      message: `Bootstrap OK — ${clubs.length} klubów, ${players.length} zawodników, target GW${targetGw}.`,
      seasonCode,
      targetGw,
      clubsUpserted: clubs.length,
      playersUpserted: players.length,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Błąd bootstrap sync.";
    console.error("[statsLab] bootstrap", e);
    try {
      await upsertSyncMeta(supabase, {
        season_code: seasonCode,
        sync_status: "ERROR",
        last_error: msg,
      });
    } catch {
      /* ignore meta write failure */
    }
    return {
      ok: false,
      message: msg,
      seasonCode,
      targetGw: 0,
      clubsUpserted: 0,
      playersUpserted: 0,
    };
  }
}

/**
 * Krok B — kolejna paczka element-summary (Incremental).
 * `forceFullResync=true` zeruje last_synced_gw WSZYSTKICH graczy sezonu (tylko raz — przed tą paczką).
 */
export async function runHistoryBatchSyncAction(
  seasonCode: string = DEFAULT_STATS_LAB_SEASON,
  batchSize = HISTORY_BATCH_SIZE_DEFAULT,
  forceFullResync = false,
): Promise<HistoryBatchSyncResult> {
  const supabase = await requireAuth();
  const nowIso = new Date().toISOString();
  const size = Math.max(
    1,
    Math.min(100, Math.round(batchSize) || HISTORY_BATCH_SIZE_DEFAULT),
  );
  const errors: string[] = [];
  let rateLimited = false;

  try {
    if (forceFullResync) {
      const { error: resetErr } = await supabase
        .from("fpl_lab_players")
        .update({ last_synced_gw: 0, updated_at: nowIso })
        .eq("season_code", seasonCode);
      if (resetErr) throw new Error(resetErr.message);
    }

    const { data: metaRow, error: metaErr } = await supabase
      .from("fpl_lab_sync_meta")
      .select("*")
      .eq("season_code", seasonCode)
      .maybeSingle();
    if (metaErr) throw new Error(metaErr.message);

    let targetGw = Number(metaRow?.last_finished_gw ?? 0);
    if (!targetGw) {
      const bootstrap = await fetchFplJsonWithRetry<FplBootstrapStatic>(
        `${FPL_API_BASE}/bootstrap-static/`,
      );
      targetGw = resolveTargetGameweek(bootstrap.events);
      await upsertSyncMeta(supabase, {
        season_code: seasonCode,
        last_finished_gw: targetGw,
        sync_status: "RUNNING",
        last_error: null,
      });
    } else {
      await upsertSyncMeta(supabase, {
        season_code: seasonCode,
        sync_status: "RUNNING",
        last_error: null,
      });
    }

    if (targetGw < 1) {
      return {
        ok: true,
        message: "Brak zakończonej kolejki do synchronizacji historii.",
        seasonCode,
        currentGw: 0,
        processedInBatch: 0,
        remainingPlayers: 0,
        totalActivePlayers: 0,
        isComplete: true,
        errors: [],
      };
    }

    // Snapshot ma pełne punkty, a historia może być ucięta / niekompletna —
    // wrzuć takich graczy z powrotem do kolejki Incremental Sync.
    const requeued = await requeuePlayersWithIncompleteHistory(
      supabase,
      seasonCode,
      targetGw,
      nowIso,
    );
    if (requeued > 0) {
      console.info(
        `[statsLab] requeued ${requeued} players with history pts < snapshot total_points`,
      );
    }

    const { count: activeCount, error: activeErr } = await supabase
      .from("fpl_lab_players")
      .select("fpl_element_id", { count: "exact", head: true })
      .eq("season_code", seasonCode)
      .gt("minutes", 0);
    if (activeErr) throw new Error(activeErr.message);
    const totalActivePlayers = activeCount ?? 0;

    // Tylko gracze z minutes > 0 oraz last_synced_gw < target_gw
    // (w tym requeued z niekompletną historią)
    const { data: batchPlayers, error: batchErr } = await supabase
      .from("fpl_lab_players")
      .select("fpl_element_id, web_name, last_synced_gw")
      .eq("season_code", seasonCode)
      .gt("minutes", 0)
      .lt("last_synced_gw", targetGw)
      .order("fpl_element_id", { ascending: true })
      .limit(size);
    if (batchErr) throw new Error(batchErr.message);

    const queue = batchPlayers ?? [];
    let processedInBatch = 0;

    outer: for (const group of chunkArray(queue, HISTORY_CONCURRENCY)) {
      const groupResults = await Promise.all(
        group.map(async (player) => {
          const elementId = Number(player.fpl_element_id);
          try {
            const summary = await fetchFplJsonWithRetry<FplElementSummary>(
              `${FPL_API_BASE}/element-summary/${elementId}/`,
            );
            const historyRows = mapElementHistoryRows(
              seasonCode,
              elementId,
              summary.history,
              nowIso,
            );

            if (historyRows.length) {
              for (const histChunk of chunkArray(historyRows, UPSERT_CHUNK)) {
                const { error: histErr } = await supabase
                  .from("fpl_lab_player_gw_history")
                  .upsert(histChunk, {
                    onConflict: "season_code,fpl_element_id,fixture_id",
                  });
                if (histErr) throw new Error(histErr.message);
              }
            }

            const { error: markErr } = await supabase
              .from("fpl_lab_players")
              .update({
                last_synced_gw: targetGw,
                updated_at: nowIso,
              })
              .eq("season_code", seasonCode)
              .eq("fpl_element_id", elementId);
            if (markErr) throw new Error(markErr.message);

            return { ok: true as const };
          } catch (err) {
            if (err instanceof FplRateLimitError) {
              return { ok: false as const, rateLimited: true as const, error: err.message };
            }
            const label = String(player.web_name ?? elementId);
            const msg =
              err instanceof Error ? err.message : "nieznany błąd historii";
            return {
              ok: false as const,
              rateLimited: false as const,
              error: `${label} (#${elementId}): ${msg}`,
            };
          }
        }),
      );

      for (const result of groupResults) {
        if (result.ok) {
          processedInBatch += 1;
          continue;
        }
        errors.push(result.error);
        if (result.rateLimited) {
          rateLimited = true;
        }
      }

      if (rateLimited) break outer;

      await new Promise((r) => setTimeout(r, historyBatchJitterMs()));
    }

    const { count: remainingCount, error: remErr } = await supabase
      .from("fpl_lab_players")
      .select("fpl_element_id", { count: "exact", head: true })
      .eq("season_code", seasonCode)
      .gt("minutes", 0)
      .lt("last_synced_gw", targetGw);
    if (remErr) throw new Error(remErr.message);

    const remainingPlayers = remainingCount ?? 0;
    const isComplete = remainingPlayers === 0 && !rateLimited;

    const rateLimitMsg =
      "FPL API rate-limit (429/503). Postęp zapisany — odczekaj ok. 1 minutę i wznów sync.";

    await upsertSyncMeta(supabase, {
      season_code: seasonCode,
      last_finished_gw: targetGw,
      last_history_sync_at: nowIso,
      sync_status: rateLimited ? "ERROR" : isComplete ? "COMPLETED" : "RUNNING",
      last_error: rateLimited
        ? rateLimitMsg
        : errors.length
          ? errors.slice(0, 5).join(" | ")
          : null,
    });

    revalidateStatsLab();

    return {
      ok: !rateLimited && (errors.length === 0 || processedInBatch > 0),
      message: rateLimited
        ? `${rateLimitMsg} (zapisano ${processedInBatch} graczy w tej paczce).`
        : isComplete
          ? `Historia kompletna dla GW${targetGw} (${totalActivePlayers} aktywnych).`
          : `Paczka: ${processedInBatch} graczy. Pozostało ${remainingPlayers}.`,
      seasonCode,
      currentGw: targetGw,
      processedInBatch,
      remainingPlayers,
      totalActivePlayers,
      isComplete,
      errors,
      rateLimited,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Błąd history batch sync.";
    console.error("[statsLab] history batch", e);
    try {
      await upsertSyncMeta(supabase, {
        season_code: seasonCode,
        sync_status: "ERROR",
        last_error: msg,
      });
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      message: msg,
      seasonCode,
      currentGw: 0,
      processedInBatch: 0,
      remainingPlayers: 0,
      totalActivePlayers: 0,
      isComplete: false,
      errors: [msg],
      rateLimited: e instanceof FplRateLimitError,
    };
  }
}

export type StatsLabMediaArchiveStats = {
  cachedBadges: number;
  cachedPhotos: number;
  totalTargetPhotos: number;
  totalClubs: number;
};

export type StatsLabMediaSyncBatchResult = {
  ok: boolean;
  message: string;
  cachedBadges: number;
  cachedPhotos: number;
  totalTargetPhotos: number;
  remaining: number;
  isComplete: boolean;
};

/** Liczniki lokalnego archiwum zdjęć / herbów na dysku. */
export async function getStatsLabMediaArchiveStatsAction(
  seasonCode: string = DEFAULT_STATS_LAB_SEASON,
): Promise<StatsLabMediaArchiveStats> {
  const supabase = await requireAuth();
  const [clubsRes, playersRes, cachedBadges, cachedPhotos] = await Promise.all([
    supabase
      .from("fpl_lab_clubs")
      .select("pulse_code")
      .eq("season_code", seasonCode),
    supabase
      .from("fpl_lab_players")
      .select("player_code")
      .eq("season_code", seasonCode)
      .gt("minutes", 0),
    countCachedBadges(),
    countCachedPlayerPhotos(),
  ]);

  if (clubsRes.error) throw new Error(clubsRes.error.message);
  if (playersRes.error) throw new Error(playersRes.error.message);

  const photoCodes = new Set<number>();
  for (const p of playersRes.data ?? []) {
    const code = Number(p.player_code);
    if (code > 0) photoCodes.add(code);
  }

  return {
    cachedBadges,
    cachedPhotos,
    totalTargetPhotos: photoCodes.size,
    totalClubs: (clubsRes.data ?? []).length,
  };
}

/**
 * Paczka archiwizacji multimediów (Anti-Ban: concurrency 2, delay 300ms).
 * offset = indeks w liście brakujących / wszystkich (force) player_code.
 */
export async function syncStatsLabMediaBatchAction(
  seasonCode: string = DEFAULT_STATS_LAB_SEASON,
  offset = 0,
  batchSize = 15,
  forceRefresh = false,
): Promise<StatsLabMediaSyncBatchResult> {
  try {
    const supabase = await requireAuth();

    const [clubsRes, playersRes] = await Promise.all([
      supabase
        .from("fpl_lab_clubs")
        .select("pulse_code")
        .eq("season_code", seasonCode),
      supabase
        .from("fpl_lab_players")
        .select("player_code, minutes")
        .eq("season_code", seasonCode)
        .gt("minutes", 0),
    ]);

    if (clubsRes.error) throw new Error(clubsRes.error.message);
    if (playersRes.error) throw new Error(playersRes.error.message);

    const badgeCodes = [
      ...new Set(
        (clubsRes.data ?? [])
          .map((c) => Number(c.pulse_code))
          .filter((n) => n > 0),
      ),
    ];

    // Herby — pełny przebieg przy offset === 0 (lub force)
    if (offset === 0) {
      await mapPool(badgeCodes, 2, 200, async (code) => {
        const missing = !(await badgeExists(code));
        if (forceRefresh || missing) {
          await ensureBadgeCached(code, forceRefresh);
        }
        return true;
      });
    }

    const allPhotoCodes = [
      ...new Set(
        (playersRes.data ?? [])
          .map((p) => Number(p.player_code))
          .filter((n) => n > 0),
      ),
    ].sort((a, b) => a - b);

    const workList: number[] = [];
    for (const code of allPhotoCodes) {
      if (forceRefresh || !(await playerPhotoExists(code))) {
        workList.push(code);
      }
    }

    const slice = workList.slice(
      Math.max(0, offset),
      Math.max(0, offset) + Math.max(1, Math.min(40, batchSize)),
    );

    await mapPool(slice, 2, 300, async (code) => {
      await ensurePlayerPhotoCached(code, forceRefresh);
      return true;
    });

    const [cachedBadges, cachedPhotos] = await Promise.all([
      countCachedBadges(),
      countCachedPlayerPhotos(),
    ]);

    const remaining = Math.max(0, workList.length - (offset + slice.length));
    const isComplete = remaining === 0;

    return {
      ok: true,
      message: isComplete
        ? `Archiwum kompletne: ${cachedBadges} herbów, ${cachedPhotos} portretów.`
        : `Paczka mediów: +${slice.length} portretów. Pozostało ${remaining}.`,
      cachedBadges,
      cachedPhotos,
      totalTargetPhotos: allPhotoCodes.length,
      remaining,
      isComplete,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Błąd synchronizacji mediów.";
    console.error("[statsLab] media batch", e);
    return {
      ok: false,
      message: msg,
      cachedBadges: await countCachedBadges().catch(() => 0),
      cachedPhotos: await countCachedPlayerPhotos().catch(() => 0),
      totalTargetPhotos: 0,
      remaining: 0,
      isComplete: false,
    };
  }
}
