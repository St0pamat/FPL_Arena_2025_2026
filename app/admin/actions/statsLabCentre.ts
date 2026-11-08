"use server";

import { createClient } from "@/lib/supabase/server";
import { DEFAULT_STATS_LAB_SEASON } from "@/lib/stats-lab/syncEngine";
import type {
  FplLabClub,
  FplLabPlayer,
  FplLabPlayerGwHistory,
} from "@/lib/stats-lab/types";
import {
  buildStatsCentreResult,
  createDefaultStatsCentreFilter,
  type StatsCentreFilter,
  type StatsCentreResult,
} from "@/lib/stats-lab/statsCentreEngine";

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

/**
 * Stats Centre — pełna tabela (PLAYERS / PER_GW / TEAMS) dla filtra.
 */
export async function queryStatsCentreAction(
  filterInput: Partial<StatsCentreFilter> & { seasonCode?: string },
): Promise<StatsCentreResult> {
  const supabase = await requireAuth();
  const seasonCode = filterInput.seasonCode || DEFAULT_STATS_LAB_SEASON;
  const defaults = createDefaultStatsCentreFilter(seasonCode);
  const filter: StatsCentreFilter = {
    ...defaults,
    ...filterInput,
    seasonCode,
    positions: filterInput.positions ?? defaults.positions,
    clubIds: filterInput.clubIds ?? defaults.clubIds,
  };

  const [metaRes, clubsRes, playersRes] = await Promise.all([
    supabase
      .from("fpl_lab_sync_meta")
      .select("last_finished_gw")
      .eq("season_code", seasonCode)
      .maybeSingle(),
    supabase
      .from("fpl_lab_clubs")
      .select("fpl_team_id, name, short_name, pulse_code")
      .eq("season_code", seasonCode)
      .order("name", { ascending: true }),
    supabase.from("fpl_lab_players").select("*").eq("season_code", seasonCode),
  ]);

  if (metaRes.error) throw new Error(metaRes.error.message);
  if (clubsRes.error) throw new Error(clubsRes.error.message);
  if (playersRes.error) throw new Error(playersRes.error.message);

  const maxGw = Number(metaRes.data?.last_finished_gw ?? 0);
  const clubs = (clubsRes.data ?? []) as Pick<
    FplLabClub,
    "fpl_team_id" | "name" | "short_name" | "pulse_code"
  >[];
  const players = (playersRes.data ?? []) as FplLabPlayer[];

  let history: FplLabPlayerGwHistory[] = [];
  if (maxGw > 0) {
    history = await fetchAllGwHistoryForSeason(supabase, seasonCode, 1, maxGw);
  }

  return buildStatsCentreResult({
    players,
    history,
    clubs,
    filter,
    maxGw,
  });
}
