/**
 * FPL Arena: Stats Centre — czysty silnik tabelaryczny (bez I/O).
 * Tryby: PLAYERS | PER_GW | TEAMS · 8 zakresów meczowych · colour scale.
 */

import type {
  FplLabClub,
  FplLabPlayer,
  FplLabPlayerGwHistory,
  FplPositionType,
} from "@/lib/stats-lab/types";
import {
  FPL_DC_BONUS_POINTS,
  FPL_POSITION_LABELS_EN,
} from "@/lib/stats-lab/types";
import {
  matchHasDcBonus,
  matchDcTotal,
} from "@/lib/stats-lab/analyticsEngine";

/* ─────────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────────── */

export type StatsCentreMode = "PLAYERS" | "PER_GW" | "TEAMS";

export type StatsCentreRangeMode =
  | "ALL_MATCHES"
  | "GW_RANGE"
  | "ALL_HOME"
  | "ALL_AWAY"
  | "LAST_6_GW"
  | "LAST_4_GW"
  | "LAST_6_MATCHES"
  | "LAST_4_MATCHES";

export type StatsCentrePlayerTab =
  | "OVERVIEW"
  | "GOAL_THREAT"
  | "CREATIVITY"
  | "DEFENDING"
  | "SET_PIECES"
  | "DISCIPLINE"
  | "EXPECTED"
  | "VALUE_MARKET";

export type StatsCentreTeamTab =
  | "TEAM_OVERVIEW"
  | "TEAM_ATTACKING"
  | "TEAM_DEFENDING"
  | "TEAM_EXPECTED";

export type StatsCentreColumnFormat =
  | "number"
  | "price"
  | "percent"
  | "order"
  | "delta"
  | "text";

export type StatsCentreColumnDef = {
  key: string;
  invertScale: boolean;
  isDelta: boolean;
  decimals: number;
  format: StatsCentreColumnFormat;
  /** Per 90 only when true and filter.per90 */
  supportsPer90: boolean;
};

export type StatsCentreFilter = {
  seasonCode: string;
  centreMode: StatsCentreMode;
  rangeMode: StatsCentreRangeMode;
  gwFrom: number | null;
  gwTo: number | null;
  positions: FplPositionType[];
  clubIds: number[];
  per90: boolean;
  playerTab: StatsCentrePlayerTab;
  teamTab: StatsCentreTeamTab;
  search: string;
  minMinutes: number;
  maxPrice: number | null;
  maxOwnershipPct: number | null;
  sortKey: string;
  sortDir: "ASC" | "DESC";
};

export type StatsCentreCellValue = number | string | null;

export type StatsCentreRow = {
  id: string;
  /** Player / team identity */
  fpl_element_id: number | null;
  fpl_team_id: number;
  web_name: string;
  club_short: string;
  club_name: string;
  /** `player.player_code` — portret `/api/uploads/fpl-lab/player/{code}` */
  player_code: number | null;
  /** `club.pulse_code` — herb `/api/uploads/fpl-lab/badge/{code}` */
  club_pulse_code: number | null;
  element_type: FplPositionType | null;
  position_label: string;
  values: Record<string, StatsCentreCellValue>;
  /** 0..1 colour intensity (higher = greener / better after invert) */
  colorNorm: Record<string, number>;
};

export type StatsCentreResult = {
  mode: StatsCentreMode;
  columns: StatsCentreColumnDef[];
  rows: StatsCentreRow[];
  totalRows: number;
  maxGw: number;
  effectiveLabel: string;
};

export function createDefaultStatsCentreFilter(
  seasonCode: string,
): StatsCentreFilter {
  return {
    seasonCode,
    centreMode: "PLAYERS",
    rangeMode: "ALL_MATCHES",
    gwFrom: null,
    gwTo: null,
    positions: [],
    clubIds: [],
    per90: false,
    playerTab: "OVERVIEW",
    teamTab: "TEAM_OVERVIEW",
    search: "",
    minMinutes: 1,
    maxPrice: null,
    maxOwnershipPct: null,
    sortKey: "total_points",
    sortDir: "DESC",
  };
}

/* ─────────────────────────────────────────────────
 * Column catalogs
 * ───────────────────────────────────────────────── */

const col = (
  key: string,
  opts: Partial<StatsCentreColumnDef> = {},
): StatsCentreColumnDef => ({
  key,
  invertScale: false,
  isDelta: false,
  decimals: 0,
  format: "number",
  supportsPer90: false,
  ...opts,
});

export const PLAYER_TAB_COLUMNS: Record<
  StatsCentrePlayerTab,
  StatsCentreColumnDef[]
> = {
  OVERVIEW: [
    col("price", { format: "price", decimals: 1 }),
    col("starts"),
    col("minutes", { supportsPer90: false }),
    col("selected_by_percent", { format: "percent", decimals: 1 }),
    col("total_points", { supportsPer90: true }),
    col("goals_scored", { supportsPer90: true }),
    col("assists", { supportsPer90: true }),
    col("goals_assists", { supportsPer90: true }),
    col("dd_hauls"),
    col("bonus", { supportsPer90: true }),
    col("bps", { supportsPer90: true }),
    col("form", { decimals: 1 }),
    col("points_per_game", { decimals: 1 }),
  ],
  GOAL_THREAT: [
    col("price", { format: "price", decimals: 1 }),
    col("starts"),
    col("minutes"),
    col("goals_scored", { supportsPer90: true }),
    col("expected_goals", { decimals: 2, supportsPer90: true }),
    col("xg_delta", { decimals: 2, isDelta: true }),
    col("threat", { decimals: 1, supportsPer90: true }),
    col("mins_per_goal", { decimals: 0, invertScale: true }),
    col("mins_per_xg", { decimals: 0, invertScale: true }),
    col("expected_goal_involvements", { decimals: 2, supportsPer90: true }),
    col("penalties_order", { format: "order" }),
  ],
  CREATIVITY: [
    col("price", { format: "price", decimals: 1 }),
    col("starts"),
    col("minutes"),
    col("assists", { supportsPer90: true }),
    col("expected_assists", { decimals: 2, supportsPer90: true }),
    col("xa_delta", { decimals: 2, isDelta: true }),
    col("creativity", { decimals: 1, supportsPer90: true }),
    col("influence", { decimals: 1, supportsPer90: true }),
    col("ict_index", { decimals: 1, supportsPer90: true }),
    col("mins_per_assist", { decimals: 0, invertScale: true }),
    col("expected_goal_involvements", { decimals: 2, supportsPer90: true }),
    col("corners_order", { format: "order" }),
  ],
  DEFENDING: [
    col("price", { format: "price", decimals: 1 }),
    col("starts"),
    col("clean_sheets", { supportsPer90: true }),
    col("goals_conceded", { invertScale: true, supportsPer90: true }),
    col("defensive_contributions_total", { supportsPer90: true }),
    col("dc_bonus_points"),
    col("dc_hit_rate_pct", { format: "percent", decimals: 1 }),
    col("recoveries", { supportsPer90: true }),
    col("tackles", { supportsPer90: true }),
    col("clearances_blocks_interceptions", { supportsPer90: true }),
    col("saves", { supportsPer90: true }),
    col("expected_goals_conceded", {
      decimals: 2,
      invertScale: true,
      supportsPer90: true,
    }),
  ],
  SET_PIECES: [
    col("price", { format: "price", decimals: 1 }),
    col("starts"),
    col("penalties_order", { format: "order" }),
    col("corners_and_indirect_freekicks_order", { format: "order" }),
    col("direct_freekicks_order", { format: "order" }),
    col("penalties_saved"),
    col("penalties_missed", { invertScale: true }),
    col("goals_scored", { supportsPer90: true }),
    col("assists", { supportsPer90: true }),
    col("creativity", { decimals: 1, supportsPer90: true }),
    col("threat", { decimals: 1, supportsPer90: true }),
  ],
  DISCIPLINE: [
    col("price", { format: "price", decimals: 1 }),
    col("starts"),
    col("minutes"),
    col("yellow_cards", { invertScale: true }),
    col("red_cards", { invertScale: true }),
    col("own_goals", { invertScale: true }),
    col("penalties_missed", { invertScale: true }),
    col("negative_points_total", { invertScale: true }),
    col("bonus", { supportsPer90: true }),
    col("bps", { supportsPer90: true }),
  ],
  EXPECTED: [
    col("price", { format: "price", decimals: 1 }),
    col("starts"),
    col("assists", { supportsPer90: true }),
    col("expected_assists", { decimals: 2, supportsPer90: true }),
    col("xa_delta", { decimals: 2, isDelta: true }),
    col("goals_scored", { supportsPer90: true }),
    col("expected_goals", { decimals: 2, supportsPer90: true }),
    col("xg_delta", { decimals: 2, isDelta: true }),
    col("goals_assists", { supportsPer90: true }),
    col("expected_goal_involvements", { decimals: 2, supportsPer90: true }),
    col("xgi_delta", { decimals: 2, isDelta: true }),
    col("goals_conceded", { invertScale: true, supportsPer90: true }),
    col("expected_goals_conceded", {
      decimals: 2,
      invertScale: true,
      supportsPer90: true,
    }),
    col("xgc_delta", { decimals: 2, isDelta: true, invertScale: true }),
  ],
  VALUE_MARKET: [
    col("price", { format: "price", decimals: 1 }),
    col("starts"),
    col("total_points", { supportsPer90: true }),
    col("value_season", { decimals: 1 }),
    col("value_form", { decimals: 1 }),
    col("cost_change_start", { decimals: 1, isDelta: true, format: "delta" }),
    col("cost_change_event", { decimals: 1, isDelta: true, format: "delta" }),
    col("transfers_in_event"),
    col("transfers_out_event"),
    col("net_transfers_gw", { isDelta: true, format: "delta" }),
    col("dreamteam_count"),
  ],
};

export const PER_GW_COLUMNS: StatsCentreColumnDef[] = [
  col("gameweek"),
  col("opponent_label", { format: "text" }),
  col("price", { format: "price", decimals: 1 }),
  col("minutes"),
  col("total_points"),
  col("goals_scored"),
  col("assists"),
  col("goals_assists"),
  col("clean_sheets"),
  col("defensive_contributions_total"),
  col("dc_bonus_points"),
  col("expected_goals", { decimals: 2 }),
  col("expected_assists", { decimals: 2 }),
  col("expected_goal_involvements", { decimals: 2 }),
  col("xgi_delta", { decimals: 2, isDelta: true }),
  col("bps"),
  col("bonus"),
];

export const TEAM_TAB_COLUMNS: Record<
  StatsCentreTeamTab,
  StatsCentreColumnDef[]
> = {
  TEAM_OVERVIEW: [
    col("matches_played"),
    col("total_points", { supportsPer90: true }),
    col("goals_scored", { supportsPer90: true }),
    col("assists", { supportsPer90: true }),
    col("clean_sheets"),
    col("goals_conceded", { invertScale: true }),
    col("goal_diff", { isDelta: true, format: "delta" }),
    col("defensive_contributions_total", { supportsPer90: true }),
    col("dc_bonus_points"),
    col("bonus", { supportsPer90: true }),
  ],
  TEAM_ATTACKING: [
    col("matches_played"),
    col("goals_scored", { supportsPer90: true }),
    col("expected_goals", { decimals: 2, supportsPer90: true }),
    col("xg_delta", { decimals: 2, isDelta: true }),
    col("assists", { supportsPer90: true }),
    col("expected_assists", { decimals: 2, supportsPer90: true }),
    col("xa_delta", { decimals: 2, isDelta: true }),
    col("expected_goal_involvements", { decimals: 2, supportsPer90: true }),
    col("threat", { decimals: 1, supportsPer90: true }),
    col("creativity", { decimals: 1, supportsPer90: true }),
    col("ict_index", { decimals: 1, supportsPer90: true }),
  ],
  TEAM_DEFENDING: [
    col("matches_played"),
    col("clean_sheets"),
    col("goals_conceded", { invertScale: true }),
    col("expected_goals_conceded", { decimals: 2, invertScale: true }),
    col("xgc_delta", { decimals: 2, isDelta: true, invertScale: true }),
    col("defensive_contributions_total", { supportsPer90: true }),
    col("dc_bonus_points"),
    col("recoveries", { supportsPer90: true }),
    col("tackles", { supportsPer90: true }),
    col("clearances_blocks_interceptions", { supportsPer90: true }),
    col("saves", { supportsPer90: true }),
  ],
  TEAM_EXPECTED: [
    col("matches_played"),
    col("goals_scored", { supportsPer90: true }),
    col("expected_goals", { decimals: 2, supportsPer90: true }),
    col("xg_delta", { decimals: 2, isDelta: true }),
    col("expected_goal_involvements", { decimals: 2, supportsPer90: true }),
    col("xgi_delta", { decimals: 2, isDelta: true }),
    col("goals_conceded", { invertScale: true }),
    col("expected_goals_conceded", { decimals: 2, invertScale: true }),
    col("xgc_delta", { decimals: 2, isDelta: true, invertScale: true }),
    col("net_xg_balance", { decimals: 2, isDelta: true }),
  ],
};

/* ─────────────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────────────── */

function n(v: unknown): number {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

function sortHistoryDesc(rows: FplLabPlayerGwHistory[]): FplLabPlayerGwHistory[] {
  return [...rows].sort((a, b) => {
    const at = a.kickoff_time ? Date.parse(a.kickoff_time) : 0;
    const bt = b.kickoff_time ? Date.parse(b.kickoff_time) : 0;
    if (bt !== at) return bt - at;
    if (b.gameweek !== a.gameweek) return b.gameweek - a.gameweek;
    return b.fixture_id - a.fixture_id;
  });
}

function resolveGwWindow(
  rangeMode: StatsCentreRangeMode,
  maxGw: number,
  gwFrom: number | null,
  gwTo: number | null,
): [number, number] | null {
  const capped = Math.max(0, Math.min(38, maxGw));
  if (capped < 1) return [0, 0];
  switch (rangeMode) {
    case "ALL_MATCHES":
    case "ALL_HOME":
    case "ALL_AWAY":
    case "LAST_6_MATCHES":
    case "LAST_4_MATCHES":
      return [1, capped];
    case "LAST_6_GW":
      return [Math.max(1, capped - 5), capped];
    case "LAST_4_GW":
      return [Math.max(1, capped - 3), capped];
    case "GW_RANGE": {
      const from = Math.max(1, Math.min(38, Number(gwFrom ?? 1)));
      const to = Math.max(1, Math.min(38, Number(gwTo ?? capped)));
      return from <= to ? [from, to] : [to, from];
    }
    default:
      return [1, capped];
  }
}

function filterHistoryByRange(
  rows: FplLabPlayerGwHistory[],
  rangeMode: StatsCentreRangeMode,
  gwWindow: [number, number],
): FplLabPlayerGwHistory[] {
  let out = rows.filter(
    (r) => r.gameweek >= gwWindow[0] && r.gameweek <= gwWindow[1],
  );
  if (rangeMode === "ALL_HOME") out = out.filter((r) => r.was_home);
  if (rangeMode === "ALL_AWAY") out = out.filter((r) => !r.was_home);
  return out;
}

/** LAST_N_MATCHES: per entity, last N with minutes > 0. */
function takeLastMatches(
  rows: FplLabPlayerGwHistory[],
  nMatches: number,
): FplLabPlayerGwHistory[] {
  return sortHistoryDesc(rows.filter((r) => n(r.minutes) > 0)).slice(
    0,
    nMatches,
  );
}

function applyPer90(value: number, minutes: number, enabled: boolean): number {
  if (!enabled || minutes <= 0) return value;
  return (value * 90) / minutes;
}

function formatOrder(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v)) || Number(v) <= 0) return "—";
  return `#${Math.round(Number(v))}`;
}

function negativePtsFromRow(row: FplLabPlayerGwHistory, et: FplPositionType): number {
  let neg = 0;
  if (et === 1 || et === 2) {
    neg += -Math.floor(n(row.goals_conceded) / 2);
  }
  neg += -n(row.yellow_cards);
  neg += -n(row.red_cards) * 3;
  neg += -n(row.penalties_missed) * 2;
  neg += -n(row.own_goals) * 2;
  return neg;
}

type AggBucket = {
  minutes: number;
  starts: number;
  total_points: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: number;
  creativity: number;
  threat: number;
  ict_index: number;
  expected_goals: number;
  expected_assists: number;
  expected_goal_involvements: number;
  expected_goals_conceded: number;
  recoveries: number;
  tackles: number;
  clearances_blocks_interceptions: number;
  defensive_contributions_total: number;
  dc_bonus_matches: number;
  dc_bonus_points: number;
  dd_hauls: number;
  matches_with_mins: number;
  negative_points_total: number;
};

function emptyAgg(): AggBucket {
  return {
    minutes: 0,
    starts: 0,
    total_points: 0,
    goals_scored: 0,
    assists: 0,
    clean_sheets: 0,
    goals_conceded: 0,
    own_goals: 0,
    penalties_saved: 0,
    penalties_missed: 0,
    yellow_cards: 0,
    red_cards: 0,
    saves: 0,
    bonus: 0,
    bps: 0,
    influence: 0,
    creativity: 0,
    threat: 0,
    ict_index: 0,
    expected_goals: 0,
    expected_assists: 0,
    expected_goal_involvements: 0,
    expected_goals_conceded: 0,
    recoveries: 0,
    tackles: 0,
    clearances_blocks_interceptions: 0,
    defensive_contributions_total: 0,
    dc_bonus_matches: 0,
    dc_bonus_points: 0,
    dd_hauls: 0,
    matches_with_mins: 0,
    negative_points_total: 0,
  };
}

function accumulatePlayerRows(
  et: FplPositionType,
  rows: FplLabPlayerGwHistory[],
): AggBucket {
  const a = emptyAgg();
  for (const row of rows) {
    const mins = n(row.minutes);
    a.minutes += mins;
    a.starts += n(row.starts) > 0 || mins >= 60 ? 1 : 0;
    if (mins > 0) a.matches_with_mins += 1;
    a.total_points += n(row.total_points);
    a.goals_scored += n(row.goals_scored);
    a.assists += n(row.assists);
    a.clean_sheets += n(row.clean_sheets);
    a.goals_conceded += n(row.goals_conceded);
    a.own_goals += n(row.own_goals);
    a.penalties_saved += n(row.penalties_saved);
    a.penalties_missed += n(row.penalties_missed);
    a.yellow_cards += n(row.yellow_cards);
    a.red_cards += n(row.red_cards);
    a.saves += n(row.saves);
    a.bonus += n(row.bonus);
    a.bps += n(row.bps);
    a.influence += n(row.influence);
    a.creativity += n(row.creativity);
    a.threat += n(row.threat);
    a.ict_index += n(row.ict_index);
    a.expected_goals += n(row.expected_goals);
    a.expected_assists += n(row.expected_assists);
    a.expected_goal_involvements += n(row.expected_goal_involvements);
    a.expected_goals_conceded += n(row.expected_goals_conceded);
    a.recoveries += n(row.recoveries);
    a.tackles += n(row.tackles);
    a.clearances_blocks_interceptions += n(row.clearances_blocks_interceptions);
    a.defensive_contributions_total += matchDcTotal(et, row);
    if (matchHasDcBonus(et, row)) {
      a.dc_bonus_matches += 1;
      a.dc_bonus_points += FPL_DC_BONUS_POINTS;
    }
    if (n(row.total_points) >= 10) a.dd_hauls += 1;
    a.negative_points_total += negativePtsFromRow(row, et);
  }
  return a;
}

function buildPlayerValues(
  player: FplLabPlayer,
  agg: AggBucket,
  per90: boolean,
): Record<string, StatsCentreCellValue> {
  const mins = agg.minutes;
  const p90 = (v: number) => applyPer90(v, mins, per90);
  const gls = agg.goals_scored;
  const ast = agg.assists;
  const xg = agg.expected_goals;
  const xa = agg.expected_assists;
  const xgi = agg.expected_goal_involvements;
  const gc = agg.goals_conceded;
  const xgc = agg.expected_goals_conceded;
  const price = n(player.now_cost) / 10;

  const dcHit =
    agg.matches_with_mins > 0
      ? (agg.dc_bonus_matches / agg.matches_with_mins) * 100
      : 0;

  return {
    price,
    starts: agg.starts,
    minutes: mins,
    selected_by_percent: n(player.selected_by_percent),
    total_points: p90(agg.total_points),
    goals_scored: p90(gls),
    assists: p90(ast),
    goals_assists: p90(gls + ast),
    dd_hauls: agg.dd_hauls,
    bonus: p90(agg.bonus),
    bps: p90(agg.bps),
    form: n(player.form),
    points_per_game: n(player.points_per_game),
    expected_goals: p90(xg),
    xg_delta: gls - xg,
    threat: p90(agg.threat),
    mins_per_goal: gls > 0 ? roundTo(mins / gls, 0) : null,
    mins_per_xg: xg > 0 ? roundTo(mins / xg, 0) : null,
    expected_goal_involvements: p90(xgi),
    penalties_order: formatOrder(player.penalties_order),
    expected_assists: p90(xa),
    xa_delta: ast - xa,
    creativity: p90(agg.creativity),
    influence: p90(agg.influence),
    ict_index: p90(agg.ict_index),
    mins_per_assist: ast > 0 ? roundTo(mins / ast, 0) : null,
    corners_order: formatOrder(player.corners_and_indirect_freekicks_order),
    clean_sheets: p90(agg.clean_sheets),
    goals_conceded: p90(gc),
    defensive_contributions_total: p90(agg.defensive_contributions_total),
    dc_bonus_points: agg.dc_bonus_points,
    dc_hit_rate_pct: roundTo(dcHit, 1),
    recoveries: p90(agg.recoveries),
    tackles: p90(agg.tackles),
    clearances_blocks_interceptions: p90(agg.clearances_blocks_interceptions),
    saves: p90(agg.saves),
    expected_goals_conceded: p90(xgc),
    corners_and_indirect_freekicks_order: formatOrder(
      player.corners_and_indirect_freekicks_order,
    ),
    direct_freekicks_order: formatOrder(player.direct_freekicks_order),
    penalties_saved: agg.penalties_saved,
    penalties_missed: agg.penalties_missed,
    yellow_cards: agg.yellow_cards,
    red_cards: agg.red_cards,
    own_goals: agg.own_goals,
    negative_points_total: agg.negative_points_total,
    xgi_delta: gls + ast - xgi,
    xgc_delta: gc - xgc,
    value_season: n(player.value_season),
    value_form: n(player.value_form),
    cost_change_start: n(player.cost_change_start) / 10,
    cost_change_event: n(player.cost_change_event) / 10,
    transfers_in_event: n(player.transfers_in_event),
    transfers_out_event: n(player.transfers_out_event),
    net_transfers_gw:
      n(player.transfers_in_event) - n(player.transfers_out_event),
    dreamteam_count: n(player.dreamteam_count),
  };
}

/* ─────────────────────────────────────────────────
 * Colour scale
 * ───────────────────────────────────────────────── */

function computeColorNorms(
  rows: StatsCentreRow[],
  columns: StatsCentreColumnDef[],
): void {
  for (const c of columns) {
    if (c.format === "text" || c.format === "order") continue;
    const nums: number[] = [];
    for (const r of rows) {
      const v = r.values[c.key];
      if (typeof v === "number" && Number.isFinite(v)) nums.push(v);
    }
    if (!nums.length) continue;
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const span = max - min || 1;
    for (const r of rows) {
      const v = r.values[c.key];
      if (typeof v !== "number" || !Number.isFinite(v)) {
        r.colorNorm[c.key] = 0.5;
        continue;
      }
      if (c.isDelta) {
        // Deltas: positive → green side, negative → rose (handled in UI via sign)
        // Still provide 0..1 magnitude relative to max abs
        const absMax = Math.max(...nums.map((x) => Math.abs(x)), 1e-9);
        r.colorNorm[c.key] = Math.min(1, Math.abs(v) / absMax);
        continue;
      }
      let t = (v - min) / span;
      if (c.invertScale) t = 1 - t;
      r.colorNorm[c.key] = Math.max(0, Math.min(1, t));
    }
  }
}

function sortRows(
  rows: StatsCentreRow[],
  sortKey: string,
  sortDir: "ASC" | "DESC",
): StatsCentreRow[] {
  const dir = sortDir === "ASC" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a.values[sortKey];
    const bv = b.values[sortKey];
    const an = typeof av === "number" ? av : av == null || av === "—" ? -Infinity : 0;
    const bn = typeof bv === "number" ? bv : bv == null || bv === "—" ? -Infinity : 0;
    if (typeof av === "string" && typeof bv === "string") {
      return av.localeCompare(bv, "en") * dir;
    }
    if (an !== bn) return (an - bn) * dir;
    return a.web_name.localeCompare(b.web_name, "en");
  });
}

/* ─────────────────────────────────────────────────
 * Team aggregation (fixture-aware GC/CS/xGC)
 * ───────────────────────────────────────────────── */

type TeamAgg = AggBucket & {
  matches_played: number;
  team_cs: number;
  team_gc: number;
  team_xgc: number;
};

function emptyTeamAgg(): TeamAgg {
  return { ...emptyAgg(), matches_played: 0, team_cs: 0, team_gc: 0, team_xgc: 0 };
}

function aggregateTeamFromRows(rows: FplLabPlayerGwHistory[]): TeamAgg {
  const byFixture = new Map<number, FplLabPlayerGwHistory[]>();
  for (const r of rows) {
    if (n(r.minutes) <= 0) continue;
    const list = byFixture.get(r.fixture_id);
    if (list) list.push(r);
    else byFixture.set(r.fixture_id, [r]);
  }

  const a = emptyTeamAgg();
  a.matches_played = byFixture.size;

  for (const fixtureRows of byFixture.values()) {
    const starters = fixtureRows.filter((r) => n(r.minutes) >= 60);
    const gcPool = starters.length ? starters : fixtureRows;
    const matchTeamGC = Math.max(0, ...gcPool.map((r) => n(r.goals_conceded)));
    const matchTeamXGC = Math.max(
      0,
      ...fixtureRows.map((r) => n(r.expected_goals_conceded)),
    );
    a.team_gc += matchTeamGC;
    a.team_xgc += matchTeamXGC;
    if (matchTeamGC === 0) a.team_cs += 1;

    for (const row of fixtureRows) {
      // Use DEF (2) for DC threshold mix — count per player position via element from row? 
      // History rows don't store element_type; sum DC components raw + award via matchHasDcBonus needs type.
      // We'll sum defensive_contribution / parts without per-position threshold for team totals,
      // and count DC pts only when row.total_points suggests +2 gap OR defensive_contribution high.
      a.minutes += n(row.minutes);
      a.total_points += n(row.total_points);
      a.goals_scored += n(row.goals_scored);
      a.assists += n(row.assists);
      a.bonus += n(row.bonus);
      a.bps += n(row.bps);
      a.influence += n(row.influence);
      a.creativity += n(row.creativity);
      a.threat += n(row.threat);
      a.ict_index += n(row.ict_index);
      a.expected_goals += n(row.expected_goals);
      a.expected_assists += n(row.expected_assists);
      a.expected_goal_involvements += n(row.expected_goal_involvements);
      a.recoveries += n(row.recoveries);
      a.tackles += n(row.tackles);
      a.clearances_blocks_interceptions += n(
        row.clearances_blocks_interceptions,
      );
      a.saves += n(row.saves);
      a.yellow_cards += n(row.yellow_cards);
      a.red_cards += n(row.red_cards);
      const dc =
        n(row.defensive_contribution) ||
        n(row.clearances_blocks_interceptions) +
          n(row.tackles) +
          n(row.recoveries);
      a.defensive_contributions_total += dc;
      // Heuristic DC pts: knownSubtotal vs total — use matchHasDcBonus with MID threshold if recoveries matter
      // Prefer: if defensive_contribution field or parts hit DEF threshold (>=10 CBI+TKL) or MID (>=12)
      const cbiTkl =
        n(row.clearances_blocks_interceptions) + n(row.tackles);
      const withRec = cbiTkl + n(row.recoveries);
      const api = n(row.defensive_contribution);
      // Jednorazowy +2: próg DEF (>=10) lub MID/FWD (>=12) — bez podwójnego liczenia
      if (api >= 12 || withRec >= 12 || api >= 10 || cbiTkl >= 10) {
        a.dc_bonus_points += FPL_DC_BONUS_POINTS;
        a.dc_bonus_matches += 1;
      }
    }
  }

  a.goals_conceded = a.team_gc;
  a.clean_sheets = a.team_cs;
  a.expected_goals_conceded = a.team_xgc;
  return a;
}

function buildTeamValues(
  agg: TeamAgg,
  per90: boolean,
): Record<string, StatsCentreCellValue> {
  const mins = agg.minutes;
  const p90 = (v: number) => applyPer90(v, mins, per90);
  const gls = agg.goals_scored;
  const ast = agg.assists;
  const xg = agg.expected_goals;
  const xa = agg.expected_assists;
  const xgi = agg.expected_goal_involvements;
  const gc = agg.team_gc;
  const xgc = agg.team_xgc;

  return {
    matches_played: agg.matches_played,
    total_points: p90(agg.total_points),
    goals_scored: p90(gls),
    assists: p90(ast),
    clean_sheets: agg.team_cs,
    goals_conceded: gc,
    goal_diff: gls - gc,
    defensive_contributions_total: p90(agg.defensive_contributions_total),
    dc_bonus_points: agg.dc_bonus_points,
    bonus: p90(agg.bonus),
    expected_goals: p90(xg),
    xg_delta: gls - xg,
    expected_assists: p90(xa),
    xa_delta: ast - xa,
    expected_goal_involvements: p90(xgi),
    threat: p90(agg.threat),
    creativity: p90(agg.creativity),
    ict_index: p90(agg.ict_index),
    expected_goals_conceded: xgc,
    xgc_delta: gc - xgc,
    recoveries: p90(agg.recoveries),
    tackles: p90(agg.tackles),
    clearances_blocks_interceptions: p90(agg.clearances_blocks_interceptions),
    saves: p90(agg.saves),
    xgi_delta: gls + ast - xgi,
    net_xg_balance: xg - xgc,
  };
}

/* ─────────────────────────────────────────────────
 * Main builder
 * ───────────────────────────────────────────────── */

export function buildStatsCentreResult(input: {
  players: FplLabPlayer[];
  history: FplLabPlayerGwHistory[];
  clubs: Array<
    Pick<FplLabClub, "fpl_team_id" | "name" | "short_name" | "pulse_code">
  >;
  filter: StatsCentreFilter;
  maxGw: number;
}): StatsCentreResult {
  const { players, history, clubs, filter, maxGw } = input;
  const clubsById = new Map(clubs.map((c) => [c.fpl_team_id, c]));
  const gwWindow =
    resolveGwWindow(filter.rangeMode, maxGw, filter.gwFrom, filter.gwTo) ?? [
      1, maxGw,
    ];

  const historyByPlayer = new Map<number, FplLabPlayerGwHistory[]>();
  for (const row of history) {
    const id = Number(row.fpl_element_id);
    const list = historyByPlayer.get(id);
    if (list) list.push(row);
    else historyByPlayer.set(id, [row]);
  }

  const lastN =
    filter.rangeMode === "LAST_6_MATCHES"
      ? 6
      : filter.rangeMode === "LAST_4_MATCHES"
        ? 4
        : 0;

  if (filter.centreMode === "PER_GW") {
    return buildPerGwResult({
      players,
      historyByPlayer,
      clubsById,
      filter,
      gwWindow,
      lastN,
      maxGw,
    });
  }

  if (filter.centreMode === "TEAMS") {
    return buildTeamsResult({
      players,
      historyByPlayer,
      clubs,
      filter,
      gwWindow,
      lastN,
      maxGw,
    });
  }

  return buildPlayersResult({
    players,
    historyByPlayer,
    clubsById,
    filter,
    gwWindow,
    lastN,
    maxGw,
  });
}

function playerPassesFilters(
  player: FplLabPlayer,
  filter: StatsCentreFilter,
): boolean {
  if (filter.positions.length && !filter.positions.includes(player.element_type)) {
    return false;
  }
  if (filter.clubIds.length && !filter.clubIds.includes(player.fpl_team_id)) {
    return false;
  }
  if (filter.maxPrice != null && n(player.now_cost) / 10 > filter.maxPrice) {
    return false;
  }
  if (
    filter.maxOwnershipPct != null &&
    n(player.selected_by_percent) > filter.maxOwnershipPct
  ) {
    return false;
  }
  const q = filter.search.trim().toLowerCase();
  if (q) {
    const hay = `${player.web_name} ${player.first_name} ${player.second_name}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function selectPlayerHistory(
  all: FplLabPlayerGwHistory[],
  rangeMode: StatsCentreRangeMode,
  gwWindow: [number, number],
  lastN: number,
): FplLabPlayerGwHistory[] {
  const scoped = filterHistoryByRange(all, rangeMode, gwWindow);
  if (lastN > 0) return takeLastMatches(scoped, lastN);
  return scoped;
}

function buildPlayersResult(args: {
  players: FplLabPlayer[];
  historyByPlayer: Map<number, FplLabPlayerGwHistory[]>;
  clubsById: Map<
    number,
    { name: string; short_name: string; pulse_code?: number }
  >;
  filter: StatsCentreFilter;
  gwWindow: [number, number];
  lastN: number;
  maxGw: number;
}): StatsCentreResult {
  const { players, historyByPlayer, clubsById, filter, gwWindow, lastN, maxGw } =
    args;
  const columns = PLAYER_TAB_COLUMNS[filter.playerTab];
  const rows: StatsCentreRow[] = [];

  for (const player of players) {
    if (!playerPassesFilters(player, filter)) continue;
    const hist = selectPlayerHistory(
      historyByPlayer.get(player.fpl_element_id) ?? [],
      filter.rangeMode,
      gwWindow,
      lastN,
    );
    const agg = accumulatePlayerRows(player.element_type, hist);
    if (agg.minutes < filter.minMinutes) continue;

    const club = clubsById.get(player.fpl_team_id);
    rows.push({
      id: `p-${player.fpl_element_id}`,
      fpl_element_id: player.fpl_element_id,
      fpl_team_id: player.fpl_team_id,
      web_name: player.web_name,
      club_short: club?.short_name ?? "—",
      club_name: club?.name ?? "—",
      player_code: Number(player.player_code ?? 0) || null,
      club_pulse_code: Number(club?.pulse_code ?? 0) || null,
      element_type: player.element_type,
      position_label: FPL_POSITION_LABELS_EN[player.element_type],
      values: buildPlayerValues(player, agg, filter.per90),
      colorNorm: {},
    });
  }

  const sorted = sortRows(rows, filter.sortKey, filter.sortDir);
  computeColorNorms(sorted, columns);

  return {
    mode: "PLAYERS",
    columns,
    rows: sorted,
    totalRows: sorted.length,
    maxGw,
    effectiveLabel: `${gwWindow[0]}–${gwWindow[1]}`,
  };
}

function buildPerGwResult(args: {
  players: FplLabPlayer[];
  historyByPlayer: Map<number, FplLabPlayerGwHistory[]>;
  clubsById: Map<
    number,
    { name: string; short_name: string; pulse_code?: number }
  >;
  filter: StatsCentreFilter;
  gwWindow: [number, number];
  lastN: number;
  maxGw: number;
}): StatsCentreResult {
  const { players, historyByPlayer, clubsById, filter, gwWindow, lastN, maxGw } =
    args;
  const rows: StatsCentreRow[] = [];

  for (const player of players) {
    if (!playerPassesFilters(player, filter)) continue;
    const hist = selectPlayerHistory(
      historyByPlayer.get(player.fpl_element_id) ?? [],
      filter.rangeMode,
      gwWindow,
      lastN,
    );
    for (const row of hist) {
      if (n(row.minutes) <= 0) continue;
      const opp = clubsById.get(row.opponent_team_id);
      const oppLabel = `${opp?.short_name ?? "?"} (${row.was_home ? "H" : "A"})`;
      const gls = n(row.goals_scored);
      const ast = n(row.assists);
      const xgi = n(row.expected_goal_involvements);
      const et = player.element_type;
      const dcPts = matchHasDcBonus(et, row) ? FPL_DC_BONUS_POINTS : 0;

      const club = clubsById.get(player.fpl_team_id);
      rows.push({
        id: `gw-${player.fpl_element_id}-${row.fixture_id}`,
        fpl_element_id: player.fpl_element_id,
        fpl_team_id: player.fpl_team_id,
        web_name: player.web_name,
        club_short: club?.short_name ?? "—",
        club_name: club?.name ?? "—",
        player_code: Number(player.player_code ?? 0) || null,
        club_pulse_code: Number(club?.pulse_code ?? 0) || null,
        element_type: et,
        position_label: FPL_POSITION_LABELS_EN[et],
        values: {
          gameweek: row.gameweek,
          opponent_label: oppLabel,
          price: n(row.value) / 10 || n(player.now_cost) / 10,
          minutes: n(row.minutes),
          total_points: n(row.total_points),
          goals_scored: gls,
          assists: ast,
          goals_assists: gls + ast,
          clean_sheets: n(row.clean_sheets),
          defensive_contributions_total: matchDcTotal(et, row),
          dc_bonus_points: dcPts,
          expected_goals: n(row.expected_goals),
          expected_assists: n(row.expected_assists),
          expected_goal_involvements: xgi,
          xgi_delta: gls + ast - xgi,
          bps: n(row.bps),
          bonus: n(row.bonus),
        },
        colorNorm: {},
      });
    }
  }

  // Filter by minutes on row
  const filtered = rows.filter(
    (r) => n(r.values.minutes) >= filter.minMinutes,
  );
  const sorted = sortRows(filtered, filter.sortKey || "total_points", filter.sortDir);
  computeColorNorms(sorted, PER_GW_COLUMNS);

  return {
    mode: "PER_GW",
    columns: PER_GW_COLUMNS,
    rows: sorted,
    totalRows: sorted.length,
    maxGw,
    effectiveLabel: `${gwWindow[0]}–${gwWindow[1]}`,
  };
}

function buildTeamsResult(args: {
  players: FplLabPlayer[];
  historyByPlayer: Map<number, FplLabPlayerGwHistory[]>;
  clubs: Array<
    Pick<FplLabClub, "fpl_team_id" | "name" | "short_name" | "pulse_code">
  >;
  filter: StatsCentreFilter;
  gwWindow: [number, number];
  lastN: number;
  maxGw: number;
}): StatsCentreResult {
  const { players, historyByPlayer, clubs, filter, gwWindow, lastN, maxGw } =
    args;
  const columns = TEAM_TAB_COLUMNS[filter.teamTab];
  const playersByTeam = new Map<number, FplLabPlayer[]>();
  for (const p of players) {
    const list = playersByTeam.get(p.fpl_team_id);
    if (list) list.push(p);
    else playersByTeam.set(p.fpl_team_id, [p]);
  }

  const rows: StatsCentreRow[] = [];
  const q = filter.search.trim().toLowerCase();

  for (const club of clubs) {
    if (filter.clubIds.length && !filter.clubIds.includes(club.fpl_team_id)) {
      continue;
    }
    if (q) {
      const hay = `${club.name} ${club.short_name}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }

    const teamPlayers = playersByTeam.get(club.fpl_team_id) ?? [];
    let teamRows: FplLabPlayerGwHistory[] = [];
    for (const p of teamPlayers) {
      const hist = selectPlayerHistory(
        historyByPlayer.get(p.fpl_element_id) ?? [],
        filter.rangeMode,
        gwWindow,
        lastN,
      );
      teamRows = teamRows.concat(hist);
    }

    // For LAST_N_MATCHES on teams: take last N unique fixtures for the club
    if (lastN > 0) {
      const byFix = new Map<number, FplLabPlayerGwHistory[]>();
      for (const r of teamRows) {
        if (n(r.minutes) <= 0) continue;
        const list = byFix.get(r.fixture_id);
        if (list) list.push(r);
        else byFix.set(r.fixture_id, [r]);
      }
      const fixtureMeta = [...byFix.entries()].map(([fid, rs]) => {
        const sample = rs[0];
        const ko = sample.kickoff_time ? Date.parse(sample.kickoff_time) : 0;
        return { fid, gw: sample.gameweek, ko, rows: rs };
      });
      fixtureMeta.sort((a, b) => b.ko - a.ko || b.gw - a.gw || b.fid - a.fid);
      teamRows = fixtureMeta.slice(0, lastN).flatMap((f) => f.rows);
    }

    const agg = aggregateTeamFromRows(teamRows);
    if (agg.matches_played <= 0) continue;

    rows.push({
      id: `t-${club.fpl_team_id}`,
      fpl_element_id: null,
      fpl_team_id: club.fpl_team_id,
      web_name: club.name,
      club_short: club.short_name,
      club_name: club.name,
      player_code: null,
      club_pulse_code: Number(club.pulse_code ?? 0) || null,
      element_type: null,
      position_label: "TEAM",
      values: buildTeamValues(agg, filter.per90),
      colorNorm: {},
    });
  }

  const sorted = sortRows(
    rows,
    filter.sortKey || "total_points",
    filter.sortDir,
  );
  computeColorNorms(sorted, columns);

  return {
    mode: "TEAMS",
    columns,
    rows: sorted,
    totalRows: sorted.length,
    maxGw,
    effectiveLabel: `${gwWindow[0]}–${gwWindow[1]}`,
  };
}

/** Colour helper for UI pills */
export function colourPillClass(
  norm: number,
  isDelta: boolean,
  value: number | null,
  dark = true,
): string {
  if (value == null || !Number.isFinite(value)) {
    return dark
      ? "bg-slate-800/60 text-slate-400"
      : "bg-slate-100 text-slate-500";
  }
  if (isDelta) {
    if (value > 0) {
      return dark
        ? "bg-emerald-500/25 text-emerald-200"
        : "bg-emerald-200/80 text-emerald-900";
    }
    if (value < 0) {
      return dark
        ? "bg-rose-500/25 text-rose-200"
        : "bg-rose-200/80 text-rose-900";
    }
    return dark
      ? "bg-slate-800/60 text-slate-300"
      : "bg-slate-100 text-slate-600";
  }
  // greener = better
  if (norm >= 0.75) {
    return dark
      ? "bg-emerald-500/35 text-emerald-100"
      : "bg-emerald-300/90 text-emerald-950";
  }
  if (norm >= 0.5) {
    return dark
      ? "bg-emerald-500/20 text-emerald-200"
      : "bg-emerald-200/70 text-emerald-900";
  }
  if (norm >= 0.25) {
    return dark
      ? "bg-slate-700/50 text-slate-200"
      : "bg-slate-100 text-slate-700";
  }
  return dark
    ? "bg-slate-800/40 text-slate-400"
    : "bg-slate-50 text-slate-500";
}

export function formatCentreCell(
  colDef: StatsCentreColumnDef,
  value: StatsCentreCellValue,
): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (colDef.format === "price") return `£${value.toFixed(colDef.decimals)}`;
  if (colDef.format === "percent") return `${value.toFixed(colDef.decimals)}%`;
  if (colDef.isDelta || colDef.format === "delta") {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(colDef.decimals)}`;
  }
  return colDef.decimals > 0
    ? value.toFixed(colDef.decimals)
    : String(Math.round(value));
}
