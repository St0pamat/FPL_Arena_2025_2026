"use server";

import { createClient } from "@/lib/supabase/server";
import { DEFAULT_STATS_LAB_SEASON } from "@/lib/stats-lab/syncEngine";
import { getCachedStatsLabDataset } from "@/lib/stats-lab/serverDataCache";
import {
  buildStatsLabProjections,
  type ProjectionsHistoryXgRow,
} from "@/lib/stats-lab/projectionsEngine";
import {
  FplEntryApiError,
  reconstructFplEntryState,
  type ReconstructedEntryState,
} from "@/lib/stats-lab/fplEntryApi";
import {
  buildAllPlayerGwProjections,
  buildDeadlinesByGw,
  buildDemoEntryState,
  buildPlannerXPtsContext,
  type PlayerGwProjection,
} from "@/lib/stats-lab/plannerEngine";
import {
  FPL_DC_BONUS_POINTS,
  type FplLabPlayer,
  type FplLabPlayerGwHistory,
  type FplPositionType,
} from "@/lib/stats-lab/types";

async function requireAuth() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji — zaloguj się w panelu admina.");
  return supabase;
}

export type PlannerClubMeta = {
  fpl_team_id: number;
  name: string;
  short_name: string;
  pulse_code: number | null;
};

export type PlannerPlayerCatalogItem = {
  fpl_element_id: number;
  player_code: number;
  web_name: string;
  first_name: string;
  second_name: string;
  element_type: FplPositionType;
  fpl_team_id: number;
  club_short_name: string;
  club_pulse_code: number | null;
  now_cost: number;
  cost_change_start: number;
  status: string;
  chance_of_playing_next_round: number | null;
  news: string;
  selected_by_percent: number;
  total_points: number;
  event_points: number;
  form: number;
  points_per_game: number;
  value_season: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  expected_goals: number;
  expected_assists: number;
  expected_goal_involvements: number;
  defensive_contribution: number;
  dc_bonus_points: number;
  transfers_in_event: number;
  transfers_out_event: number;
};

export type StatsLabPlannerPayload = {
  seasonCode: string;
  syncedAt: string | null;
  lastFinishedGw: number;
  planningStartGw: number;
  planningEndGw: number;
  availableGameweeks: number[];
  deadlinesByGw: Record<number, string | null>;
  clubs: PlannerClubMeta[];
  players: PlannerPlayerCatalogItem[];
  projectionsByElement: Record<number, Record<number, PlayerGwProjection>>;
  entryState: ReconstructedEntryState;
  isDemoSquad: boolean;
  loadError: string | null;
};

function dcThreshold(elementType: FplPositionType): number {
  if (elementType === 2) return 10;
  if (elementType === 3 || elementType === 4) return 12;
  return Infinity;
}

function computeDcBonusPoints(
  player: FplLabPlayer,
  history: FplLabPlayerGwHistory[],
): number {
  const threshold = dcThreshold(player.element_type);
  if (!Number.isFinite(threshold)) return 0;
  let hits = 0;
  for (const h of history) {
    if (h.fpl_element_id !== player.fpl_element_id) continue;
    if (Number(h.minutes) < 60) continue;
    if (Number(h.defensive_contribution) >= threshold) hits += 1;
  }
  return hits * FPL_DC_BONUS_POINTS;
}

function buildPlayerCatalog(
  players: FplLabPlayer[],
  clubs: PlannerClubMeta[],
  historyByPlayer: Map<number, FplLabPlayerGwHistory[]>,
): PlannerPlayerCatalogItem[] {
  const clubById = new Map(clubs.map((c) => [c.fpl_team_id, c] as const));
  return players.map((p) => {
    const club = clubById.get(p.fpl_team_id);
    const hist = historyByPlayer.get(p.fpl_element_id) ?? [];
    return {
      fpl_element_id: p.fpl_element_id,
      player_code: p.player_code,
      web_name: p.web_name,
      first_name: p.first_name,
      second_name: p.second_name,
      element_type: p.element_type,
      fpl_team_id: p.fpl_team_id,
      club_short_name: club?.short_name ?? "—",
      club_pulse_code: club?.pulse_code ?? null,
      now_cost: Number(p.now_cost) || 0,
      cost_change_start: Number(p.cost_change_start) || 0,
      status: String(p.status ?? "a"),
      chance_of_playing_next_round:
        p.chance_of_playing_next_round ?? null,
      news: typeof p.news === "string" ? p.news : "",
      selected_by_percent: Number(p.selected_by_percent) || 0,
      total_points: Number(p.total_points) || 0,
      event_points: Number(p.event_points) || 0,
      form: Number(p.form) || 0,
      points_per_game: Number(p.points_per_game) || 0,
      value_season: Number(p.value_season) || 0,
      minutes: Number(p.minutes) || 0,
      goals_scored: Number(p.goals_scored) || 0,
      assists: Number(p.assists) || 0,
      clean_sheets: Number(p.clean_sheets) || 0,
      expected_goals: Number(p.expected_goals) || 0,
      expected_assists: Number(p.expected_assists) || 0,
      expected_goal_involvements: Number(p.expected_goal_involvements) || 0,
      defensive_contribution: Number(p.defensive_contribution) || 0,
      dc_bonus_points: computeDcBonusPoints(p, hist),
      transfers_in_event: Number(p.transfers_in_event) || 0,
      transfers_out_event: Number(p.transfers_out_event) || 0,
    };
  });
}

function resolveLastFinishedGw(
  datasetLastFinishedGw: number,
  fixtures: { gameweek: number | null; finished: boolean }[],
): number {
  let maxFinished = Math.max(0, Math.round(datasetLastFinishedGw) || 0);
  for (const f of fixtures) {
    if (!f.finished) continue;
    const gw = Number(f.gameweek);
    if (Number.isFinite(gw) && gw > maxFinished) maxFinished = gw;
  }
  return Math.max(0, Math.min(38, maxFinished));
}

function planningHorizon(
  lastFinishedGw: number,
  horizonLength?: number,
): { planningStartGw: number; planningEndGw: number; availableGameweeks: number[] } {
  const planningStartGw = Math.min(38, Math.max(1, lastFinishedGw + 1));
  const span = Math.max(8, Math.min(15, horizonLength ?? 11));
  const planningEndGw = Math.min(38, planningStartGw + span);
  const availableGameweeks: number[] = [];
  for (let g = planningStartGw; g <= planningEndGw; g += 1) {
    availableGameweeks.push(g);
  }
  return { planningStartGw, planningEndGw, availableGameweeks };
}

/**
 * Pełny payload Planera: katalog, xPts v1, deadlines + entry (Demo lub FPL ID).
 */
export async function queryStatsLabPlannerAction(input?: {
  seasonCode?: string;
  teamId?: number | null;
  horizonLength?: number;
}): Promise<StatsLabPlannerPayload> {
  await requireAuth();
  const seasonCode = input?.seasonCode || DEFAULT_STATS_LAB_SEASON;
  const dataset = await getCachedStatsLabDataset(seasonCode);

  const lastFinishedGw = resolveLastFinishedGw(
    dataset.lastFinishedGw,
    dataset.fixtures,
  );
  const { planningStartGw, planningEndGw, availableGameweeks } =
    planningHorizon(lastFinishedGw, input?.horizonLength);

  const historyXg: ProjectionsHistoryXgRow[] = dataset.playerGwHistory.map(
    (row) => ({
      fixture_id: Number(row.fixture_id),
      was_home: Boolean(row.was_home),
      expected_goals: Number(row.expected_goals ?? 0),
    }),
  );

  const projections = buildStatsLabProjections({
    seasonCode,
    clubs: dataset.clubs,
    fixtures: dataset.fixtures,
    historyXg,
    startGw: planningStartGw,
    endGw: planningEndGw,
    lastFinishedGw,
  });

  const xPtsCtx = buildPlannerXPtsContext({
    players: dataset.players,
    history: dataset.playerGwHistory,
    fixtures: dataset.fixtures,
    projections,
  });

  const projectionsByElement = buildAllPlayerGwProjections(
    xPtsCtx,
    planningStartGw,
    planningEndGw,
  );

  const clubs: PlannerClubMeta[] = dataset.clubs
    .slice()
    .sort((a, b) => a.short_name.localeCompare(b.short_name))
    .map((c) => ({
      fpl_team_id: c.fpl_team_id,
      name: c.name,
      short_name: c.short_name,
      pulse_code: c.pulse_code ?? null,
    }));

  const players = buildPlayerCatalog(
    dataset.players,
    clubs,
    xPtsCtx.historyByPlayerId,
  );

  const deadlinesByGw = buildDeadlinesByGw(
    dataset.fixtures,
    availableGameweeks,
  );

  const teamId =
    input?.teamId != null && Number.isFinite(Number(input.teamId))
      ? Math.round(Number(input.teamId))
      : null;

  let entryState: ReconstructedEntryState;
  let isDemoSquad = true;
  let loadError: string | null = null;

  if (teamId != null && teamId > 0) {
    try {
      entryState = await reconstructFplEntryState({
        teamId,
        playersById: xPtsCtx.playersById,
        clubShortByTeamId: new Map(
          clubs.map((c) => [c.fpl_team_id, c.short_name] as const),
        ),
        currentGwHint: lastFinishedGw,
      });
      isDemoSquad = false;
      loadError = null;
    } catch (e) {
      entryState = buildDemoEntryState({
        players: dataset.players,
        planningStartGw,
        projectionsByElement,
      });
      isDemoSquad = true;
      if (e instanceof FplEntryApiError && e.code === "ENTRY_NOT_FOUND") {
        loadError =
          "Nie znaleziono drużyny o podanym FPL ID lub API FPL jest chwilowo niedostępne.";
      } else {
        loadError =
          e instanceof Error
            ? e.message
            : "Nie znaleziono drużyny o podanym FPL ID lub API FPL jest chwilowo niedostępne.";
      }
    }
  } else {
    entryState = buildDemoEntryState({
      players: dataset.players,
      planningStartGw,
      projectionsByElement,
    });
  }

  return {
    seasonCode,
    syncedAt: dataset.updatedAt,
    lastFinishedGw,
    planningStartGw,
    planningEndGw,
    availableGameweeks,
    deadlinesByGw,
    clubs,
    players,
    projectionsByElement,
    entryState,
    isDemoSquad,
    loadError,
  };
}

/**
 * Lekkie przeładowanie samej drużyny po wpisaniu FPL Team ID
 * (bez ponownego przesyłania katalogu 700+ graczy).
 */
export async function loadPlannerTeamByIdAction(input: {
  seasonCode?: string;
  teamId: number;
}): Promise<{
  ok: boolean;
  entryState: ReconstructedEntryState | null;
  error: string | null;
}> {
  await requireAuth();
  const teamId = Math.round(Number(input.teamId));
  if (!Number.isFinite(teamId) || teamId < 1) {
    return {
      ok: false,
      entryState: null,
      error: "Podaj poprawne ID drużyny FPL (liczba > 0).",
    };
  }

  const seasonCode = input.seasonCode || DEFAULT_STATS_LAB_SEASON;
  const dataset = await getCachedStatsLabDataset(seasonCode);
  const playersById = new Map(
    dataset.players.map((p) => [p.fpl_element_id, p] as const),
  );

  try {
    const entryState = await reconstructFplEntryState({
      teamId,
      playersById,
      clubShortByTeamId: new Map(
        dataset.clubs.map((c) => [c.fpl_team_id, c.short_name] as const),
      ),
      currentGwHint: dataset.lastFinishedGw,
    });
    return { ok: true, entryState, error: null };
  } catch (e) {
    const error =
      e instanceof FplEntryApiError && e.code === "ENTRY_NOT_FOUND"
        ? "Nie znaleziono drużyny o podanym FPL ID lub API FPL jest chwilowo niedostępne."
        : e instanceof Error
          ? e.message
          : "Nie znaleziono drużyny o podanym FPL ID lub API FPL jest chwilowo niedostępne.";
    return { ok: false, entryState: null, error };
  }
}
