/**
 * FPL Arena: Stats Lab — czyste mapowania JSON FPL API → typy fpl_lab_*.
 * Bez I/O Supabase (to robi statsLabSync.ts).
 */

import type {
  FplLabClub,
  FplLabFixtureRow,
  FplLabPlayer,
  FplLabPlayerGwHistory,
  FplLabSyncMeta,
  FplPositionType,
} from "@/lib/stats-lab/types";
import { isFplPositionType } from "@/lib/stats-lab/types";

export const FPL_API_BASE = "https://fantasy.premierleague.com/api";
export const DEFAULT_STATS_LAB_SEASON = "2026/27";

/** Pusty rekord meta przed pierwszym sync (UI / bootstrap overview). */
export function getEmptyStatsLabMeta(
  seasonCode: string = DEFAULT_STATS_LAB_SEASON,
): FplLabSyncMeta {
  return {
    season_code: seasonCode,
    last_finished_gw: 0,
    last_bootstrap_sync_at: null,
    last_history_sync_at: null,
    total_players_synced: 0,
    sync_status: "IDLE",
    last_error: null,
    updated_at: new Date().toISOString(),
  };
}

/** Typy odpowiedzi Server Actions Stats Lab (trzymane poza `"use server"`). */
export type StatsLabTopPlayerRow = {
  fpl_element_id: number;
  web_name: string;
  element_type: FplPositionType;
  fpl_team_id: number;
  club_short: string | null;
  now_cost: number;
  total_points: number;
  expected_goal_involvements: number;
  minutes: number;
  last_synced_gw: number;
};

export type StatsLabOverview = {
  seasonCode: string;
  meta: FplLabSyncMeta | null;
  clubsCount: number;
  playersCount: number;
  activePlayersCount: number;
  historyRowsCount: number;
  playersNeedingHistory: number;
  targetGw: number;
  topPlayers: StatsLabTopPlayerRow[];
};

export type BootstrapSyncResult = {
  ok: boolean;
  message: string;
  seasonCode: string;
  targetGw: number;
  clubsUpserted: number;
  playersUpserted: number;
  fixturesUpserted: number;
};

export type HistoryBatchSyncResult = {
  ok: boolean;
  message: string;
  seasonCode: string;
  currentGw: number;
  processedInBatch: number;
  remainingPlayers: number;
  totalActivePlayers: number;
  isComplete: boolean;
  errors: string[];
  /** Paczka przerwana po wyczerpaniu retry 429/503 — odczekaj ~1 min. */
  rateLimited?: boolean;
};

/** Anti-ban: domyślna paczka element-summary. */
export const HISTORY_BATCH_SIZE_DEFAULT = 20;
/** Anti-ban: max równoległych zapytań element-summary. */
export const HISTORY_CONCURRENCY = 2;
/** Anti-ban: bazowe opóźnienie między pod-paczkami + jitter. */
export const HISTORY_JITTER_BASE_MS = 450;
export const HISTORY_JITTER_SPAN_MS = 350;
/** Anti-ban: czekanie przed retry 429/503. */
export const HISTORY_RATE_LIMIT_WAIT_MS = 3000;
export const HISTORY_RATE_LIMIT_MAX_RETRIES = 2;

export const FPL_LAB_HEADERS: HeadersInit = {
  Accept: "application/json",
  "User-Agent": "FPLArena-StatsLab/1.0 (+https://www.fpl-arena.com)",
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function historyBatchJitterMs(): number {
  return (
    HISTORY_JITTER_BASE_MS + Math.floor(Math.random() * HISTORY_JITTER_SPAN_MS)
  );
}

export class FplRateLimitError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(status: number, url: string) {
    super(`FPL API ${status} (rate limit / unavailable): ${url}`);
    this.name = "FplRateLimitError";
    this.status = status;
    this.url = url;
  }
}

export function isFplRateLimitStatus(status: number): boolean {
  return status === 429 || status === 503;
}

/**
 * Fetch JSON z FPL API z retry na 429/503 (max 2 ponowienia, 3s przerwy).
 */
export async function fetchFplJsonWithRetry<T>(
  url: string,
  maxRetries: number = HISTORY_RATE_LIMIT_MAX_RETRIES,
): Promise<T> {
  let attempt = 0;
  while (true) {
    const res = await fetch(url, {
      headers: FPL_LAB_HEADERS,
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (res.ok) {
      return res.json() as Promise<T>;
    }

    if (isFplRateLimitStatus(res.status) && attempt < maxRetries) {
      attempt += 1;
      await sleep(HISTORY_RATE_LIMIT_WAIT_MS);
      continue;
    }

    if (isFplRateLimitStatus(res.status)) {
      throw new FplRateLimitError(res.status, url);
    }

    throw new Error(`FPL API ${res.status}: ${url}`);
  }
}

/* ─────────────────────────────────────────────────
 * Surowy kształt bootstrap-static / element-summary
 * ───────────────────────────────────────────────── */

export type FplBootstrapEvent = {
  id: number;
  finished?: boolean;
  data_checked?: boolean;
  is_current?: boolean;
  deadline_time?: string | null;
};

export type FplBootstrapTeam = {
  id: number;
  code: number;
  name: string;
  short_name: string;
  strength?: number | null;
  strength_overall_home?: number | null;
  strength_overall_away?: number | null;
  strength_attack_home?: number | null;
  strength_attack_away?: number | null;
  strength_defence_home?: number | null;
  strength_defence_away?: number | null;
};

/** Surowy wiersz z GET /api/fixtures/ */
export type FplApiFixture = {
  id: number;
  code?: number | null;
  event?: number | null;
  kickoff_time?: string | null;
  team_h: number;
  team_a: number;
  team_h_score?: number | null;
  team_a_score?: number | null;
  team_h_difficulty?: number | null;
  team_a_difficulty?: number | null;
  started?: boolean | null;
  finished?: boolean | null;
  finished_provisional?: boolean | null;
  provisional_start_time?: boolean | null;
  minutes?: number | null;
};

export type FplBootstrapElement = {
  id: number;
  code: number;
  first_name?: string | null;
  second_name?: string | null;
  web_name?: string | null;
  team: number;
  element_type: number;
  status?: string | null;
  now_cost?: number | null;
  selected_by_percent?: string | number | null;
  total_points?: number | null;
  event_points?: number | null;
  form?: string | number | null;
  points_per_game?: string | number | null;
  value_form?: string | number | null;
  value_season?: string | number | null;
  dreamteam_count?: number | null;
  transfers_in?: number | null;
  transfers_out?: number | null;
  transfers_in_event?: number | null;
  transfers_out_event?: number | null;
  cost_change_start?: number | null;
  cost_change_event?: number | null;
  chance_of_playing_next_round?: number | null;
  news?: string | null;
  ep_next?: string | number | null;
  defensive_contribution?: number | null;
  minutes?: number | null;
  starts?: number | null;
  goals_scored?: number | null;
  assists?: number | null;
  clean_sheets?: number | null;
  goals_conceded?: number | null;
  own_goals?: number | null;
  penalties_saved?: number | null;
  penalties_missed?: number | null;
  yellow_cards?: number | null;
  red_cards?: number | null;
  saves?: number | null;
  bonus?: number | null;
  bps?: number | null;
  influence?: string | number | null;
  creativity?: string | number | null;
  threat?: string | number | null;
  ict_index?: string | number | null;
  expected_goals?: string | number | null;
  expected_assists?: string | number | null;
  expected_goal_involvements?: string | number | null;
  expected_goals_conceded?: string | number | null;
  recoveries?: number | null;
  tackles?: number | null;
  interceptions?: number | null;
  clearances_blocks_interceptions?: number | null;
  penalties_order?: number | null;
  corners_and_indirect_freekicks_order?: number | null;
  direct_freekicks_order?: number | null;
};

export type FplBootstrapStatic = {
  events?: FplBootstrapEvent[];
  teams?: FplBootstrapTeam[];
  elements?: FplBootstrapElement[];
};

export type FplElementSummaryHistoryRow = {
  element?: number;
  fixture: number;
  round: number;
  opponent_team: number;
  was_home?: boolean;
  kickoff_time?: string | null;
  total_points?: number | null;
  value?: number | null;
  selected?: number | null;
  minutes?: number | null;
  starts?: number | null;
  goals_scored?: number | null;
  assists?: number | null;
  clean_sheets?: number | null;
  goals_conceded?: number | null;
  own_goals?: number | null;
  penalties_saved?: number | null;
  penalties_missed?: number | null;
  yellow_cards?: number | null;
  red_cards?: number | null;
  saves?: number | null;
  bonus?: number | null;
  bps?: number | null;
  influence?: string | number | null;
  creativity?: string | number | null;
  threat?: string | number | null;
  ict_index?: string | number | null;
  expected_goals?: string | number | null;
  expected_assists?: string | number | null;
  expected_goal_involvements?: string | number | null;
  expected_goals_conceded?: string | number | null;
  recoveries?: number | null;
  tackles?: number | null;
  clearances_blocks_interceptions?: number | null;
  defensive_contribution?: number | null;
  transfers_balance?: number | null;
  transfers_in?: number | null;
  transfers_out?: number | null;
};

export type FplElementSummary = {
  history?: FplElementSummaryHistoryRow[];
};

/* ─────────────────────────────────────────────────
 * Parsery bezpieczne
 * ───────────────────────────────────────────────── */

export function parseFplNumber(value: unknown, fallback = 0): number {
  if (value == null || value === "") return fallback;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  const n = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

export function parseFplInt(value: unknown, fallback = 0): number {
  return Math.round(parseFplNumber(value, fallback));
}

export function parseOptionalInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = parseFplInt(value, Number.NaN);
  return Number.isFinite(n) ? n : null;
}

/** Najwyższa zakończona / bieżąca kolejka z bootstrap.events. */
export function resolveTargetGameweek(events: FplBootstrapEvent[] | undefined): number {
  const list = events ?? [];
  if (!list.length) return 0;

  const finishedIds = list
    .filter((e) => Boolean(e.finished) || Boolean(e.data_checked))
    .map((e) => Number(e.id))
    .filter((id) => Number.isFinite(id) && id >= 1);

  if (finishedIds.length) return Math.max(...finishedIds);

  const current = list.find((e) => Boolean(e.is_current));
  if (current && Number.isFinite(Number(current.id))) {
    return Math.max(0, Math.min(38, Number(current.id)));
  }

  const anyDone = list
    .filter((e) => Boolean(e.finished))
    .map((e) => Number(e.id));
  if (anyDone.length) return Math.max(...anyDone);

  return 0;
}

/** Bezpieczne mapowanie strength_* z bootstrap (tylko finite number → wartość). */
export function mapOptionalStrength(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Mapa event.id → deadline_time z bootstrap.events[] (Zero-Data-Leakage). */
export function buildEventDeadlineMap(
  events: FplBootstrapEvent[] | undefined,
): Map<number, string | null> {
  const map = new Map<number, string | null>();
  for (const event of events ?? []) {
    const id = Number(event.id);
    if (!Number.isFinite(id)) continue;
    map.set(
      id,
      typeof event.deadline_time === "string" ? event.deadline_time : null,
    );
  }
  return map;
}

export function mapBootstrapClub(
  seasonCode: string,
  team: FplBootstrapTeam,
  nowIso: string,
): Omit<FplLabClub, "updated_at"> & { updated_at: string } {
  return {
    season_code: seasonCode,
    fpl_team_id: parseFplInt(team.id),
    pulse_code: parseFplInt(team.code),
    name: String(team.name ?? "").trim() || `Team ${team.id}`,
    short_name: String(team.short_name ?? "").trim() || "???",
    strength: team.strength == null ? null : parseFplInt(team.strength),
    strength_overall_home: mapOptionalStrength(team.strength_overall_home),
    strength_overall_away: mapOptionalStrength(team.strength_overall_away),
    strength_attack_home: mapOptionalStrength(team.strength_attack_home),
    strength_attack_away: mapOptionalStrength(team.strength_attack_away),
    strength_defence_home: mapOptionalStrength(team.strength_defence_home),
    strength_defence_away: mapOptionalStrength(team.strength_defence_away),
    primary_color: null,
    updated_at: nowIso,
  };
}

/** GET /api/fixtures/ — pełny terminarz sezonu. */
export async function fetchFplFixtures(): Promise<FplApiFixture[]> {
  return fetchFplJsonWithRetry<FplApiFixture[]>(`${FPL_API_BASE}/fixtures/`);
}

export function mapApiFixture(
  seasonCode: string,
  f: FplApiFixture,
  eventDeadlineMap: Map<number, string | null>,
  nowIso: string,
): FplLabFixtureRow {
  const gameweek = typeof f.event === "number" ? f.event : null;
  return {
    season_code: seasonCode,
    fixture_id: Number(f.id),
    pulse_id: typeof f.code === "number" ? f.code : null,
    gameweek,
    kickoff_time: typeof f.kickoff_time === "string" ? f.kickoff_time : null,
    deadline_time:
      typeof f.event === "number"
        ? (eventDeadlineMap.get(f.event) ?? null)
        : null,
    team_h: Number(f.team_h),
    team_a: Number(f.team_a),
    team_h_score: typeof f.team_h_score === "number" ? f.team_h_score : null,
    team_a_score: typeof f.team_a_score === "number" ? f.team_a_score : null,
    team_h_difficulty:
      typeof f.team_h_difficulty === "number" ? f.team_h_difficulty : null,
    team_a_difficulty:
      typeof f.team_a_difficulty === "number" ? f.team_a_difficulty : null,
    started: Boolean(f.started),
    finished: Boolean(f.finished),
    finished_provisional: Boolean(f.finished_provisional),
    provisional_start_time: Boolean(f.provisional_start_time),
    minutes: typeof f.minutes === "number" ? f.minutes : 0,
    updated_at: nowIso,
  };
}

export function mapBootstrapPlayer(
  seasonCode: string,
  el: FplBootstrapElement,
  preservedLastSyncedGw: number,
  nowIso: string,
): Omit<FplLabPlayer, "updated_at" | "element_type"> & {
  element_type: FplPositionType;
  updated_at: string;
} | null {
  const elementTypeRaw = parseFplInt(el.element_type);
  if (!isFplPositionType(elementTypeRaw)) return null;

  return {
    season_code: seasonCode,
    fpl_element_id: parseFplInt(el.id),
    player_code: parseFplInt(el.code),
    first_name: String(el.first_name ?? "").trim(),
    second_name: String(el.second_name ?? "").trim(),
    web_name: String(el.web_name ?? "").trim() || `Player ${el.id}`,
    fpl_team_id: parseFplInt(el.team),
    element_type: elementTypeRaw,
    status: String(el.status ?? "a").trim() || "a",
    now_cost: parseFplInt(el.now_cost),
    selected_by_percent: parseFplNumber(el.selected_by_percent),
    total_points: parseFplInt(el.total_points),
    event_points: parseFplInt(el.event_points),
    form: parseFplNumber(el.form),
    points_per_game: parseFplNumber(el.points_per_game),
    value_form: parseFplNumber(el.value_form),
    value_season: parseFplNumber(el.value_season),
    dreamteam_count: parseFplInt(el.dreamteam_count),
    transfers_in: parseFplInt(el.transfers_in),
    transfers_out: parseFplInt(el.transfers_out),
    transfers_in_event: parseFplInt(el.transfers_in_event),
    transfers_out_event: parseFplInt(el.transfers_out_event),
    cost_change_start:
      typeof el.cost_change_start === "number" ? el.cost_change_start : 0,
    cost_change_event: parseFplInt(el.cost_change_event),
    chance_of_playing_next_round:
      typeof el.chance_of_playing_next_round === "number"
        ? el.chance_of_playing_next_round
        : null,
    news: typeof el.news === "string" ? el.news : "",
    ep_next:
      el.ep_next != null && !Number.isNaN(Number(el.ep_next))
        ? Number(el.ep_next)
        : null,
    defensive_contribution: parseFplInt(el.defensive_contribution),
    minutes: parseFplInt(el.minutes),
    starts: parseFplInt(el.starts),
    goals_scored: parseFplInt(el.goals_scored),
    assists: parseFplInt(el.assists),
    clean_sheets: parseFplInt(el.clean_sheets),
    goals_conceded: parseFplInt(el.goals_conceded),
    own_goals: parseFplInt(el.own_goals),
    penalties_saved: parseFplInt(el.penalties_saved),
    penalties_missed: parseFplInt(el.penalties_missed),
    yellow_cards: parseFplInt(el.yellow_cards),
    red_cards: parseFplInt(el.red_cards),
    saves: parseFplInt(el.saves),
    bonus: parseFplInt(el.bonus),
    bps: parseFplInt(el.bps),
    influence: parseFplNumber(el.influence),
    creativity: parseFplNumber(el.creativity),
    threat: parseFplNumber(el.threat),
    ict_index: parseFplNumber(el.ict_index),
    expected_goals: parseFplNumber(el.expected_goals),
    expected_assists: parseFplNumber(el.expected_assists),
    expected_goal_involvements: parseFplNumber(el.expected_goal_involvements),
    expected_goals_conceded: parseFplNumber(el.expected_goals_conceded),
    recoveries: parseFplInt(el.recoveries),
    tackles: parseFplInt(el.tackles),
    interceptions: parseFplInt(el.interceptions),
    clearances_blocks_interceptions: parseFplInt(el.clearances_blocks_interceptions),
    penalties_order: parseOptionalInt(el.penalties_order),
    corners_and_indirect_freekicks_order: parseOptionalInt(
      el.corners_and_indirect_freekicks_order,
    ),
    direct_freekicks_order: parseOptionalInt(el.direct_freekicks_order),
    last_synced_gw: Math.max(0, Math.min(38, Math.round(preservedLastSyncedGw))),
    updated_at: nowIso,
  };
}

export function mapElementHistoryRows(
  seasonCode: string,
  fplElementId: number,
  history: FplElementSummaryHistoryRow[] | undefined,
  nowIso: string,
): Array<Omit<FplLabPlayerGwHistory, "updated_at"> & { updated_at: string }> {
  const rows: Array<Omit<FplLabPlayerGwHistory, "updated_at"> & { updated_at: string }> =
    [];

  for (const h of history ?? []) {
    const fixtureId = parseFplInt(h.fixture);
    const gameweek = parseFplInt(h.round);
    if (!fixtureId || gameweek < 1 || gameweek > 38) continue;

    rows.push({
      season_code: seasonCode,
      fpl_element_id: fplElementId,
      fixture_id: fixtureId,
      gameweek,
      opponent_team_id: parseFplInt(h.opponent_team),
      was_home: Boolean(h.was_home ?? true),
      kickoff_time: h.kickoff_time ? String(h.kickoff_time) : null,
      total_points: parseFplInt(h.total_points),
      value: parseFplInt(h.value),
      selected: parseFplInt(h.selected),
      minutes: parseFplInt(h.minutes),
      starts: parseFplInt(h.starts),
      goals_scored: parseFplInt(h.goals_scored),
      assists: parseFplInt(h.assists),
      clean_sheets: parseFplInt(h.clean_sheets),
      goals_conceded: parseFplInt(h.goals_conceded),
      own_goals: parseFplInt(h.own_goals),
      penalties_saved: parseFplInt(h.penalties_saved),
      penalties_missed: parseFplInt(h.penalties_missed),
      yellow_cards: parseFplInt(h.yellow_cards),
      red_cards: parseFplInt(h.red_cards),
      saves: parseFplInt(h.saves),
      bonus: parseFplInt(h.bonus),
      bps: parseFplInt(h.bps),
      influence: parseFplNumber(h.influence),
      creativity: parseFplNumber(h.creativity),
      threat: parseFplNumber(h.threat),
      ict_index: parseFplNumber(h.ict_index),
      expected_goals: parseFplNumber(h.expected_goals),
      expected_assists: parseFplNumber(h.expected_assists),
      expected_goal_involvements: parseFplNumber(h.expected_goal_involvements),
      expected_goals_conceded: parseFplNumber(h.expected_goals_conceded),
      recoveries: parseFplInt(h.recoveries),
      tackles: parseFplInt(h.tackles),
      clearances_blocks_interceptions: parseFplInt(h.clearances_blocks_interceptions),
      defensive_contribution: parseFplInt(h.defensive_contribution),
      transfers_balance: parseFplInt(h.transfers_balance),
      transfers_in: parseFplInt(h.transfers_in),
      transfers_out: parseFplInt(h.transfers_out),
      updated_at: nowIso,
    });
  }

  return rows;
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  const n = Math.max(1, size);
  for (let i = 0; i < items.length; i += n) out.push(items.slice(i, i + n));
  return out;
}
