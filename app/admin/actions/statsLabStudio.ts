"use server";

import { createClient } from "@/lib/supabase/server";
import {
  buildStatsLabComparison,
  type StatsLabBootstrapData,
  type StatsLabBootstrapPlayer,
  type StatsLabClubInfo,
  type StatsLabComparisonResult,
} from "@/lib/stats-lab/analyticsEngine";
import type { StatsLabQueryFilter } from "@/lib/stats-lab/presets";
import { createDefaultStatsLabFilter } from "@/lib/stats-lab/presets";
import { DEFAULT_STATS_LAB_SEASON } from "@/lib/stats-lab/syncEngine";
import type {
  FplLabClub,
  FplLabPlayer,
  FplLabPlayerGwHistory,
  FplLabSyncMeta,
  FplPositionType,
} from "@/lib/stats-lab/types";

async function requireAuth() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji — zaloguj się w panelu admina.");
  return supabase;
}

const GW_HISTORY_PAGE = 1000;

type SupabaseClient = Awaited<ReturnType<typeof requireAuth>>;

/**
 * PostgREST domyślnie ucina wynik do 1000 wierszy — sezon FPL ma 4k–15k wierszy
 * historii. Pobieramy wszystko stronicowaniem `.range()`.
 */
async function fetchAllGwHistoryForSeason(
  supabase: SupabaseClient,
  seasonCode: string,
  gwFrom: number,
  gwTo: number,
): Promise<FplLabPlayerGwHistory[]> {
  const all: FplLabPlayerGwHistory[] = [];
  let from = 0;

  for (;;) {
    const to = from + GW_HISTORY_PAGE - 1;
    const { data, error } = await supabase
      .from("fpl_lab_player_gw_history")
      .select("*")
      .eq("season_code", seasonCode)
      .gte("gameweek", gwFrom)
      .lte("gameweek", gwTo)
      .order("fixture_id", { ascending: true })
      .order("fpl_element_id", { ascending: true })
      .range(from, to);

    if (error) throw new Error(error.message);

    const chunk = (data ?? []) as FplLabPlayerGwHistory[];
    all.push(...chunk);

    if (chunk.length < GW_HISTORY_PAGE) break;
    from += GW_HISTORY_PAGE;
  }

  return all;
}

function mapClub(row: FplLabClub): StatsLabClubInfo {
  return {
    fpl_team_id: Number(row.fpl_team_id),
    name: String(row.name),
    short_name: String(row.short_name),
    primary_color: row.primary_color ?? null,
    pulse_code: Number(row.pulse_code ?? 0),
  };
}

/**
 * Słownik klubów + graczy do wyszukiwarki Studio.
 */
export async function loadStatsLabBootstrapDataAction(
  seasonCode: string = DEFAULT_STATS_LAB_SEASON,
): Promise<StatsLabBootstrapData> {
  const supabase = await requireAuth();

  const [metaRes, clubsRes, playersRes] = await Promise.all([
    supabase
      .from("fpl_lab_sync_meta")
      .select("*")
      .eq("season_code", seasonCode)
      .maybeSingle(),
    supabase
      .from("fpl_lab_clubs")
      .select("season_code, fpl_team_id, pulse_code, name, short_name, strength, primary_color, updated_at")
      .eq("season_code", seasonCode)
      .order("name", { ascending: true }),
    supabase
      .from("fpl_lab_players")
      .select(
        "fpl_element_id, web_name, first_name, second_name, element_type, fpl_team_id, now_cost, selected_by_percent, total_points, minutes, status",
      )
      .eq("season_code", seasonCode)
      .order("web_name", { ascending: true }),
  ]);

  if (metaRes.error) throw new Error(metaRes.error.message);
  if (clubsRes.error) throw new Error(clubsRes.error.message);
  if (playersRes.error) throw new Error(playersRes.error.message);

  const meta = (metaRes.data as FplLabSyncMeta | null) ?? null;
  const maxGw = Number(meta?.last_finished_gw ?? 0);

  const clubs = ((clubsRes.data ?? []) as FplLabClub[]).map(mapClub);
  const players: StatsLabBootstrapPlayer[] = (playersRes.data ?? []).map(
    (p) => ({
      fpl_element_id: Number(p.fpl_element_id),
      web_name: String(p.web_name),
      first_name: String(p.first_name ?? ""),
      second_name: String(p.second_name ?? ""),
      element_type: Number(p.element_type) as FplPositionType,
      fpl_team_id: Number(p.fpl_team_id),
      now_cost: Number(p.now_cost ?? 0),
      selected_by_percent: Number(p.selected_by_percent ?? 0),
      total_points: Number(p.total_points ?? 0),
      minutes: Number(p.minutes ?? 0),
      status: String(p.status ?? "a"),
    }),
  );

  return { seasonCode, meta, clubs, players, maxGw };
}

/**
 * Porównanie graczy wg filtra Studio (agregacja + percentyle + Top N / wybór ręczny).
 */
export async function queryStatsLabComparisonAction(
  filterInput: StatsLabQueryFilter,
): Promise<StatsLabComparisonResult> {
  const supabase = await requireAuth();
  const defaults = createDefaultStatsLabFilter(
    filterInput.seasonCode || DEFAULT_STATS_LAB_SEASON,
  );
  const filter: StatsLabQueryFilter = {
    ...defaults,
    ...filterInput,
    period: filterInput.period ?? defaults.period,
    positions: filterInput.positions ?? defaults.positions,
    clubIds: filterInput.clubIds ?? defaults.clubIds,
    selectedPlayerIds: filterInput.selectedPlayerIds ?? defaults.selectedPlayerIds,
    activeMetrics: (filterInput.activeMetrics ?? defaults.activeMetrics).slice(
      0,
      8,
    ),
  };

  const seasonCode = filter.seasonCode || DEFAULT_STATS_LAB_SEASON;

  const [metaRes, clubsRes, playersRes] = await Promise.all([
    supabase
      .from("fpl_lab_sync_meta")
      .select("last_finished_gw")
      .eq("season_code", seasonCode)
      .maybeSingle(),
    supabase
      .from("fpl_lab_clubs")
      .select("fpl_team_id, name, short_name, primary_color, pulse_code")
      .eq("season_code", seasonCode),
    supabase.from("fpl_lab_players").select("*").eq("season_code", seasonCode),
  ]);

  if (metaRes.error) throw new Error(metaRes.error.message);
  if (clubsRes.error) throw new Error(clubsRes.error.message);
  if (playersRes.error) throw new Error(playersRes.error.message);

  const maxGw = Number(metaRes.data?.last_finished_gw ?? 0);
  const players = (playersRes.data ?? []) as FplLabPlayer[];

  const clubsById = new Map<number, StatsLabClubInfo>();
  for (const c of clubsRes.data ?? []) {
    clubsById.set(Number(c.fpl_team_id), {
      fpl_team_id: Number(c.fpl_team_id),
      name: String(c.name),
      short_name: String(c.short_name),
      primary_color: (c.primary_color as string | null) ?? null,
      pulse_code: Number((c as { pulse_code?: number }).pulse_code ?? 0),
    });
  }

  const historyByPlayerId = new Map<number, FplLabPlayerGwHistory[]>();

  // Zawsze ładuj historię GW (również FULL_SEASON) — bez niej breakdown/DC/streaks
  // wpadają w zepsutą estymację ze snapshotu (np. +25 pkt za występy).
  if (maxGw > 0) {
    let gwFrom = 1;
    let gwTo = maxGw;
    if (filter.period.mode === "LAST_4_GW") {
      gwFrom = Math.max(1, maxGw - 3);
    } else if (filter.period.mode === "LAST_6_GW") {
      gwFrom = Math.max(1, maxGw - 5);
    } else if (filter.period.mode === "CUSTOM_RANGE") {
      gwFrom = Math.max(1, Number(filter.period.gwFrom ?? 1));
      gwTo = Math.min(38, Number(filter.period.gwTo ?? maxGw));
    }
    // FULL_SEASON / HOME_ONLY / AWAY_ONLY → cały zakres 1…maxGw
    // (HOME/AWAY filtruje silnik po was_home)

    const historyRows = await fetchAllGwHistoryForSeason(
      supabase,
      seasonCode,
      gwFrom,
      gwTo,
    );

    for (const row of historyRows) {
      const id = Number(row.fpl_element_id);
      const list = historyByPlayerId.get(id);
      if (list) list.push(row);
      else historyByPlayerId.set(id, [row]);
    }
  }

  return buildStatsLabComparison({
    players,
    historyByPlayerId,
    clubsById,
    filter,
    maxGw,
  });
}
