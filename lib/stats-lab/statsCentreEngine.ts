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
  /** Średnie grupy (cała pula przed paginacją) — null dla kolumn tekstowych/porządkowych. */
  poolAverages: Record<string, number | null>;
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
    col("dc_bonus_points", { supportsPer90: true }),
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
  col("dc_bonus_points", { supportsPer90: true }),
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
    col("dc_bonus_points", { supportsPer90: true }),
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
    col("dc_bonus_points", { supportsPer90: true }),
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

/** Per 90 zawsze z 2 dp — bez surowych floatów w row.values / audit.json. */
function applyPer90(value: number, minutes: number, enabled: boolean): number {
  if (!enabled) return value;
  if (minutes <= 0) return 0;
  return Number(((value / minutes) * 90).toFixed(2));
}

/** Alias — ta sama precyzja 2 dp. */
function applyPer90Rounded(
  value: number,
  minutes: number,
  enabled: boolean,
): number {
  return applyPer90(value, minutes, enabled);
}

/** ALL_MATCHES ≈ FULL_SEASON; pozostałe zakresy = okres filtrowany. */
function isFilteredCentreRange(rangeMode: StatsCentreRangeMode): boolean {
  return rangeMode !== "ALL_MATCHES";
}

/**
 * GWP / PPM / Form / V(S) / V(F) / transfery GW —
 * ta sama matematyka co `applyPeriodDerivedOverviewMetrics` w analyticsEngine.
 */
function derivePeriodOverviewFromHistory(
  player: FplLabPlayer,
  periodRows: FplLabPlayerGwHistory[],
  periodTotalPoints: number,
  isFilteredPeriod: boolean,
): {
  event_points: number;
  points_per_game: number;
  form: number;
  value_season: number;
  value_form: number;
  transfers_in_event: number;
  transfers_out_event: number;
  net_transfers_gw: number;
  dreamteam_count: number;
} {
  const priceM = Math.max(0.1, n(player.now_cost) / 10);
  const playerGwRows = [...periodRows].sort(
    (a, b) => Number(a.gameweek) - Number(b.gameweek),
  );
  const appearancesInPeriod = playerGwRows.filter(
    (r) => n(r.minutes) > 0,
  ).length;

  const snap = {
    event_points: n(player.event_points),
    points_per_game: Number(n(player.points_per_game).toFixed(1)),
    form: Number(n(player.form).toFixed(1)),
    value_season: Number(
      (n(player.value_season) || periodTotalPoints / priceM).toFixed(1),
    ),
    value_form: Number(n(player.value_form).toFixed(1)),
    transfers_in_event: n(player.transfers_in_event),
    transfers_out_event: n(player.transfers_out_event),
    net_transfers_gw:
      n(player.transfers_in_event) - n(player.transfers_out_event),
    dreamteam_count: n(player.dreamteam_count),
  };

  if (!isFilteredPeriod) {
    if (appearancesInPeriod > 0) {
      snap.points_per_game = Number(
        (periodTotalPoints / appearancesInPeriod).toFixed(1),
      );
    }
    return snap;
  }

  if (playerGwRows.length === 0) {
    return {
      event_points: 0,
      points_per_game: 0,
      form: 0,
      value_season: 0,
      value_form: 0,
      transfers_in_event: 0,
      transfers_out_event: 0,
      net_transfers_gw: 0,
      dreamteam_count: snap.dreamteam_count,
    };
  }

  const maxGw = Number(playerGwRows[playerGwRows.length - 1]!.gameweek);
  let eventPoints = 0;
  for (const row of playerGwRows) {
    if (Number(row.gameweek) === maxGw) {
      eventPoints += n(row.total_points);
    }
  }

  const points_per_game =
    appearancesInPeriod > 0
      ? Number((periodTotalPoints / appearancesInPeriod).toFixed(1))
      : 0;
  const value_season = Number((periodTotalPoints / priceM).toFixed(1));

  const uniqueGwsDesc: number[] = [];
  for (let i = playerGwRows.length - 1; i >= 0; i -= 1) {
    const gw = Number(playerGwRows[i]!.gameweek);
    if (!uniqueGwsDesc.includes(gw)) uniqueGwsDesc.push(gw);
    if (uniqueGwsDesc.length >= 4) break;
  }
  const formGwSet = new Set(uniqueGwsDesc);
  const formRows = playerGwRows.filter((r) =>
    formGwSet.has(Number(r.gameweek)),
  );
  const sumPts = formRows.reduce((acc, row) => acc + n(row.total_points), 0);
  const countGws = uniqueGwsDesc.length;
  const form =
    countGws > 0 ? Number((sumPts / countGws).toFixed(1)) : 0;
  const value_form = Number((form / priceM).toFixed(1));

  // Transfery: 1 wpis / GW (bez podwójnego DGW)
  const byGw = new Map<number, { ti: number; to: number; bal: number }>();
  for (const row of playerGwRows) {
    const gw = Number(row.gameweek);
    if (byGw.has(gw)) continue;
    byGw.set(gw, {
      ti: n(row.transfers_in),
      to: n(row.transfers_out),
      bal: n(row.transfers_balance),
    });
  }
  const last = byGw.get(maxGw);
  const transfers_in_event = last?.ti ?? 0;
  const transfers_out_event = last?.to ?? 0;
  const net_transfers_gw = last
    ? last.bal !== 0
      ? last.bal
      : last.ti - last.to
    : 0;

  return {
    event_points: eventPoints,
    points_per_game,
    form,
    value_season,
    value_form,
    transfers_in_event,
    transfers_out_event,
    net_transfers_gw,
    dreamteam_count: snap.dreamteam_count,
  };
}

/** W trybie Per 90 kolumny DC pokazują 2 dp (jak Studio). */
function withPer90DcDecimals(
  columns: StatsCentreColumnDef[],
  per90: boolean,
): StatsCentreColumnDef[] {
  if (!per90) return columns;
  return columns.map((c) =>
    c.key === "dc_bonus_points" || c.key === "dc_bonus_matches"
      ? { ...c, supportsPer90: true, decimals: 2 }
      : c,
  );
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
  periodRows: FplLabPlayerGwHistory[],
  per90: boolean,
  isFilteredPeriod: boolean,
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

  const overview = derivePeriodOverviewFromHistory(
    player,
    periodRows,
    agg.total_points,
    isFilteredPeriod,
  );

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
    form: overview.form,
    points_per_game: overview.points_per_game,
    event_points: overview.event_points,
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
    dc_bonus_matches: applyPer90Rounded(agg.dc_bonus_matches, mins, per90),
    dc_bonus_points: applyPer90Rounded(agg.dc_bonus_points, mins, per90),
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
    penalties_missed: p90(agg.penalties_missed),
    yellow_cards: p90(agg.yellow_cards),
    red_cards: p90(agg.red_cards),
    own_goals: p90(agg.own_goals),
    negative_points_total: p90(agg.negative_points_total),
    xgi_delta: gls + ast - xgi,
    xgc_delta: gc - xgc,
    value_season: overview.value_season,
    value_form: overview.value_form,
    cost_change_start: n(player.cost_change_start) / 10,
    cost_change_event: n(player.cost_change_event) / 10,
    transfers_in_event: overview.transfers_in_event,
    transfers_out_event: overview.transfers_out_event,
    net_transfers_gw: overview.net_transfers_gw,
    dreamteam_count: overview.dreamteam_count,
  };
}

/* ─────────────────────────────────────────────────
 * Colour scale
 * ───────────────────────────────────────────────── */

const SIGNED_DELTA_KEYS = new Set([
  "xg_delta",
  "xa_delta",
  "xgi_delta",
  "xgc_delta",
  "cost_change_start",
  "cost_change_event",
  "net_transfers_gw",
]);

/** Kartki / kary / wytransferowania — 0/niski poziom = neutralny (nigdy zielony lider). */
export const PENALTY_COLUMNS = new Set([
  "yellow_cards",
  "red_cards",
  "own_goals",
  "penalties_missed",
  "negative_points_total",
  "transfers_out_event",
  "transfers_out",
]);

const TRANSFER_OUT_PENALTY_KEYS = new Set([
  "transfers_out_event",
  "transfers_out",
]);

/** Kolumny kontekstowe — bez colorNorm (zawsze neutralna pigułka). */
const CONTEXT_NO_COLOR_KEYS = new Set(["matches_played", "gameweek"]);

/** Kolumny gdzie niska norma + niekorzystna wartość → różowy alert. */
export const INVERT_OR_SIGNED_COLUMN_KEYS = new Set([
  "goals_conceded",
  "expected_goals_conceded",
  "mins_per_goal",
  "mins_per_xg",
  "mins_per_assist",
  "yellow_cards",
  "red_cards",
  "own_goals",
  "penalties_missed",
  "transfers_out_event",
  "negative_points_total",
  "goal_diff",
  "net_xg_balance",
  ...SIGNED_DELTA_KEYS,
]);

function percentileSorted(sortedAsc: number[], p: number): number {
  if (!sortedAsc.length) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const idx = (sortedAsc.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo]!;
  const t = idx - lo;
  return sortedAsc[lo]! + (sortedAsc[hi]! - sortedAsc[lo]!) * t;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function rowMinutes(row: StatsCentreRow): number {
  const m = row.values.minutes;
  return typeof m === "number" && Number.isFinite(m) ? m : 0;
}

function computeSignedDeltaNorm(
  rows: StatsCentreRow[],
  key: string,
): void {
  const signedVals: number[] = [];
  for (const r of rows) {
    const raw = r.values[key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      delete r.colorNorm[key];
      continue;
    }
    signedVals.push(key === "xgc_delta" ? -raw : raw);
  }
  const positives = signedVals.filter((v) => v > 0).sort((a, b) => a - b);
  const negatives = signedVals.filter((v) => v < 0).sort((a, b) => a - b);
  const posMax =
    positives.length >= 5
      ? percentileSorted(positives, 0.95)
      : positives.length
        ? Math.max(...positives)
        : 0;
  const negMin =
    negatives.length >= 5
      ? percentileSorted(negatives, 0.05)
      : negatives.length
        ? Math.min(...negatives)
        : 0;

  for (const r of rows) {
    const raw = r.values[key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      delete r.colorNorm[key];
      continue;
    }
    const signedVal = key === "xgc_delta" ? -raw : raw;
    if (signedVal === 0) {
      r.colorNorm[key] = 0.5;
      continue;
    }
    if (signedVal > 0) {
      r.colorNorm[key] =
        posMax > 0 ? 0.5 + 0.5 * Math.min(1, signedVal / posMax) : 0.5;
      continue;
    }
    // signedVal < 0 → zakres 0..0.5
    r.colorNorm[key] =
      negMin < 0
        ? 0.5 * (1 - Math.min(1, signedVal / negMin))
        : 0.5;
  }
}

function penaltyBadness(key: string, rawVal: number): number {
  if (key === "negative_points_total") return Math.max(0, -rawVal);
  return Math.max(0, rawVal);
}

/**
 * TO / transfers_out:
 * ≤ P50 → 0.35 (neutral);
 * P50..P80 → 0.35..0.30;
 * P80..P95 → 0.24..0.00 (różowy ogon górnych 20%).
 */
function computeTransferOutNorm(rows: StatsCentreRow[], key: string): void {
  const vals: number[] = [];
  for (const r of rows) {
    const raw = r.values[key];
    if (typeof raw === "number" && Number.isFinite(raw)) vals.push(raw);
  }
  if (!vals.length) {
    for (const r of rows) delete r.colorNorm[key];
    return;
  }
  const sorted = [...vals].sort((a, b) => a - b);
  const p50 = percentileSorted(sorted, 0.5);
  const p80 = percentileSorted(sorted, 0.8);
  const p95 = percentileSorted(sorted, 0.95);

  for (const r of rows) {
    const raw = r.values[key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      delete r.colorNorm[key];
      continue;
    }
    if (raw <= p50) {
      r.colorNorm[key] = 0.35;
      continue;
    }
    if (raw <= p80) {
      const t = (raw - p50) / Math.max(p80 - p50, 1);
      r.colorNorm[key] = Number((0.35 - 0.05 * Math.min(1, t)).toFixed(4));
      continue;
    }
    const t = Math.min(1, (raw - p80) / Math.max(p95 - p80, 1));
    r.colorNorm[key] = Number((0.24 * (1 - t)).toFixed(4));
  }
}

/** Kartki/kary: 0 → neutral 0.35; >0 → rose 0.00..0.24 (nigdy zielony). */
function computePenaltyNorm(rows: StatsCentreRow[], key: string): void {
  if (TRANSFER_OUT_PENALTY_KEYS.has(key)) {
    computeTransferOutNorm(rows, key);
    return;
  }

  const positives: number[] = [];
  for (const r of rows) {
    const raw = r.values[key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      delete r.colorNorm[key];
      continue;
    }
    const bad = penaltyBadness(key, raw);
    if (bad > 0) positives.push(bad);
  }
  const sortedPos = [...positives].sort((a, b) => a - b);
  const maxBad = Math.max(
    1,
    sortedPos.length >= 5
      ? percentileSorted(sortedPos, 0.95)
      : sortedPos.length
        ? Math.max(...sortedPos)
        : 1,
  );

  for (const r of rows) {
    const raw = r.values[key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      delete r.colorNorm[key];
      continue;
    }
    const badness = penaltyBadness(key, raw);
    if (badness === 0) {
      r.colorNorm[key] = 0.35;
      continue;
    }
    const severity = Math.min(1, badness / maxBad);
    r.colorNorm[key] = Number((0.24 * (1 - severity)).toFixed(4));
  }
}

function computeGoalDiffNorm(rows: StatsCentreRow[]): void {
  for (const r of rows) {
    const v = r.values.goal_diff;
    if (typeof v !== "number" || !Number.isFinite(v)) {
      delete r.colorNorm.goal_diff;
      continue;
    }
    if (v >= 3) {
      r.colorNorm.goal_diff = Number(
        (0.85 + 0.15 * Math.min(1, (v - 3) / 5)).toFixed(4),
      );
    } else if (v <= -3) {
      r.colorNorm.goal_diff = Number(
        (0.24 * (1 - Math.min(1, (-v - 3) / 5))).toFixed(4),
      );
    } else {
      r.colorNorm.goal_diff = 0.35;
    }
  }
}

/** Pełny katalog kolumn Centre — do colorNorm / poolAverages na wszystkich kluczach. */
function allCentreColumnDefs(): StatsCentreColumnDef[] {
  const map = new Map<string, StatsCentreColumnDef>();
  for (const cols of Object.values(PLAYER_TAB_COLUMNS)) {
    for (const c of cols) map.set(c.key, c);
  }
  for (const c of PER_GW_COLUMNS) map.set(c.key, c);
  for (const cols of Object.values(TEAM_TAB_COLUMNS)) {
    for (const c of cols) map.set(c.key, c);
  }
  return [...map.values()];
}

/**
 * colorNorm + poolAverages dla WSZYSTKICH numerycznych kluczy w row.values
 * (niezależnie od aktywnej pod-zakładki).
 */
function finalizeRowColourAndAverages(
  rows: StatsCentreRow[],
  visibleColumns: StatsCentreColumnDef[],
  per90: boolean,
): Record<string, number | null> {
  const keysInData = new Set<string>();
  for (const r of rows) {
    for (const [k, v] of Object.entries(r.values)) {
      if (typeof v === "number" && Number.isFinite(v)) keysInData.add(k);
    }
  }

  const catalog = allCentreColumnDefs();
  const byKey = new Map(catalog.map((c) => [c.key, c]));
  const normColumns: StatsCentreColumnDef[] = [];
  for (const k of keysInData) {
    if (CONTEXT_NO_COLOR_KEYS.has(k)) continue;
    normColumns.push(byKey.get(k) ?? col(k));
  }

  computeColorNorms(rows, normColumns, per90);
  for (const r of rows) {
    for (const k of CONTEXT_NO_COLOR_KEYS) delete r.colorNorm[k];
  }

  const avgColumns = [
    ...visibleColumns,
    ...normColumns.filter((c) => !visibleColumns.some((v) => v.key === c.key)),
  ];
  return computePoolAverages(rows, avgColumns);
}

/**
 * colorNorm: wyżej = lepiej (zielony). Null/NaN → brak klucza.
 * Per 90: skala P5–P95 na podzbiorze minutes>=90 (gdy ≥10 takich wierszy).
 */
function computeColorNorms(
  rows: StatsCentreRow[],
  columns: StatsCentreColumnDef[],
  per90: boolean,
): void {
  for (const c of columns) {
    if (c.format === "text" || c.format === "order") continue;

    if (CONTEXT_NO_COLOR_KEYS.has(c.key)) {
      for (const r of rows) delete r.colorNorm[c.key];
      continue;
    }

    if (PENALTY_COLUMNS.has(c.key)) {
      computePenaltyNorm(rows, c.key);
      continue;
    }

    if (c.key === "goal_diff") {
      computeGoalDiffNorm(rows);
      continue;
    }

    if (SIGNED_DELTA_KEYS.has(c.key) || c.isDelta || c.format === "delta") {
      if (
        SIGNED_DELTA_KEYS.has(c.key) ||
        c.key === "net_xg_balance"
      ) {
        computeSignedDeltaNorm(rows, c.key);
        continue;
      }
    }

    let sampleRows = rows;
    if (per90) {
      const seasoned = rows.filter((r) => rowMinutes(r) >= 90);
      if (seasoned.length >= 10) sampleRows = seasoned;
    }

    const nums: number[] = [];
    for (const r of sampleRows) {
      const v = r.values[c.key];
      if (typeof v === "number" && Number.isFinite(v)) nums.push(v);
    }
    if (!nums.length) {
      for (const r of rows) delete r.colorNorm[c.key];
      continue;
    }

    const sorted = [...nums].sort((a, b) => a - b);
    const min = sorted[0]!;
    const max = sorted[sorted.length - 1]!;
    let lowBound = percentileSorted(sorted, 0.05);
    let highBound = percentileSorted(sorted, 0.95);
    if (highBound <= lowBound) {
      lowBound = min;
      highBound = max;
    }
    const span = highBound - lowBound || 1;

    for (const r of rows) {
      const v = r.values[c.key];
      if (typeof v !== "number" || !Number.isFinite(v)) {
        delete r.colorNorm[c.key];
        continue;
      }
      let t = clamp01((v - lowBound) / span);
      if (c.invertScale) t = 1 - t;
      r.colorNorm[c.key] = t;
    }
  }
}

function isPoolAverageSkipColumn(c: StatsCentreColumnDef): boolean {
  if (c.format === "text" || c.format === "order") return true;
  if (c.key === "gameweek" || c.key === "opponent_label") return true;
  if (c.key.endsWith("_order")) return true;
  return false;
}

function poolAverageDecimals(c: StatsCentreColumnDef): number {
  if (
    c.format === "price" ||
    c.key === "form" ||
    c.key === "points_per_game" ||
    c.key === "value_season" ||
    c.key === "value_form" ||
    c.key === "selected_by_percent" ||
    c.key === "dc_hit_rate_pct"
  ) {
    return Math.max(1, c.decimals);
  }
  if (
    c.decimals >= 2 ||
    c.key.includes("expected") ||
    c.key.startsWith("xg") ||
    c.key.startsWith("xa") ||
    c.key.includes("xgi") ||
    c.key.includes("xgc") ||
    c.key === "net_xg_balance"
  ) {
    return 2;
  }
  // Totals / counts → 1 dp średniej grupy
  return Math.max(1, c.decimals);
}

/** Średnie grupy z całej kwalifikowanej puli (przed paginacją). */
export function computePoolAverages(
  rows: StatsCentreRow[],
  columns: StatsCentreColumnDef[],
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const c of columns) {
    if (isPoolAverageSkipColumn(c)) {
      out[c.key] = null;
      continue;
    }
    let sum = 0;
    let count = 0;
    for (const r of rows) {
      const v = r.values[c.key];
      if (typeof v === "number" && Number.isFinite(v)) {
        sum += v;
        count += 1;
      }
    }
    if (!count) {
      out[c.key] = null;
      continue;
    }
    out[c.key] = roundTo(sum / count, poolAverageDecimals(c));
  }
  return out;
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

/**
 * Odrzuć mecze „obce” z historii transferów: prawdziwy mecz klubu =
 * ≥7 graczy z minutes>0 w fixture; inaczej per-GW najlepszy fixture (≥5).
 */
function filterGenuineClubFixtures(
  rows: FplLabPlayerGwHistory[],
): FplLabPlayerGwHistory[] {
  const byFixture = new Map<number, FplLabPlayerGwHistory[]>();
  for (const r of rows) {
    if (n(r.minutes) <= 0) continue;
    const list = byFixture.get(r.fixture_id);
    if (list) list.push(r);
    else byFixture.set(r.fixture_id, [r]);
  }

  const fixtures = [...byFixture.entries()].map(([fid, fr]) => ({
    fid,
    gw: fr[0]?.gameweek ?? 0,
    count: fr.length,
    rows: fr,
  }));

  const kept = new Set<number>();
  for (const f of fixtures) {
    if (f.count >= 7) kept.add(f.fid);
  }

  const byGw = new Map<number, typeof fixtures>();
  for (const f of fixtures) {
    const list = byGw.get(f.gw);
    if (list) list.push(f);
    else byGw.set(f.gw, [f]);
  }

  for (const [, gwFixtures] of byGw) {
    if (gwFixtures.some((f) => kept.has(f.fid))) continue;
    let best: (typeof fixtures)[number] | null = null;
    for (const f of gwFixtures) {
      if (f.count < 5) continue;
      if (!best || f.count > best.count) best = f;
    }
    if (best) kept.add(best.fid);
  }

  return fixtures.filter((f) => kept.has(f.fid)).flatMap((f) => f.rows);
}

function aggregateTeamFromRows(rows: FplLabPlayerGwHistory[]): TeamAgg {
  const genuine = filterGenuineClubFixtures(rows);
  const byFixture = new Map<number, FplLabPlayerGwHistory[]>();
  for (const r of genuine) {
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

/**
 * TEAMS „Per 90” = na mecz drużyny: val / matches_played (nie suma minut graczy).
 * Delty / bilanse pozostają sumami okresu.
 */
function applyTeamPerMatch(
  value: number,
  matchesPlayed: number,
  enabled: boolean,
): number {
  if (!enabled) return value;
  return Number((value / Math.max(1, matchesPlayed)).toFixed(2));
}

function buildTeamValues(
  agg: TeamAgg,
  per90: boolean,
): Record<string, StatsCentreCellValue> {
  const m = Math.max(1, agg.matches_played);
  const perMatch = (v: number) => applyTeamPerMatch(v, m, per90);
  const gls = agg.goals_scored;
  const ast = agg.assists;
  const xg = agg.expected_goals;
  const xa = agg.expected_assists;
  const xgi = agg.expected_goal_involvements;
  const gc = agg.team_gc;
  const xgc = agg.team_xgc;

  return {
    matches_played: agg.matches_played,
    total_points: perMatch(agg.total_points),
    goals_scored: perMatch(gls),
    assists: perMatch(ast),
    clean_sheets: perMatch(agg.team_cs),
    goals_conceded: perMatch(gc),
    goal_diff: gls - gc,
    defensive_contributions_total: perMatch(agg.defensive_contributions_total),
    dc_bonus_matches: perMatch(agg.dc_bonus_matches),
    dc_bonus_points: perMatch(agg.dc_bonus_points),
    bonus: perMatch(agg.bonus),
    expected_goals: perMatch(xg),
    xg_delta: gls - xg,
    expected_assists: perMatch(xa),
    xa_delta: ast - xa,
    expected_goal_involvements: perMatch(xgi),
    threat: perMatch(agg.threat),
    creativity: perMatch(agg.creativity),
    ict_index: perMatch(agg.ict_index),
    expected_goals_conceded: perMatch(xgc),
    xgc_delta: gc - xgc,
    recoveries: perMatch(agg.recoveries),
    tackles: perMatch(agg.tackles),
    clearances_blocks_interceptions: perMatch(
      agg.clearances_blocks_interceptions,
    ),
    saves: perMatch(agg.saves),
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
  const { players, history, clubs, maxGw } = input;
  // PER_GW = pojedyncze mecze — Per 90 zawsze wyłączone (audit + UI).
  const filter: StatsCentreFilter =
    input.filter.centreMode === "PER_GW"
      ? { ...input.filter, per90: false }
      : input.filter;
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
  const columns = withPer90DcDecimals(
    PLAYER_TAB_COLUMNS[filter.playerTab],
    filter.per90,
  );
  const isFilteredPeriod = isFilteredCentreRange(filter.rangeMode);
  const rows: StatsCentreRow[] = [];

  const effectiveMinMinutes = filter.per90
    ? Math.max(filter.minMinutes, 90)
    : filter.minMinutes;

  for (const player of players) {
    if (!playerPassesFilters(player, filter)) continue;
    const hist = selectPlayerHistory(
      historyByPlayer.get(player.fpl_element_id) ?? [],
      filter.rangeMode,
      gwWindow,
      lastN,
    );
    const agg = accumulatePlayerRows(player.element_type, hist);
    if (agg.minutes < effectiveMinMinutes) continue;

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
      values: buildPlayerValues(
        player,
        agg,
        hist,
        filter.per90,
        isFilteredPeriod,
      ),
      colorNorm: {},
    });
  }

  const sorted = sortRows(rows, filter.sortKey, filter.sortDir);
  const poolAverages = finalizeRowColourAndAverages(
    sorted,
    columns,
    filter.per90,
  );

  return {
    mode: "PLAYERS",
    columns,
    rows: sorted,
    totalRows: sorted.length,
    maxGw,
    effectiveLabel: `${gwWindow[0]}–${gwWindow[1]}`,
    poolAverages,
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
          dc_bonus_matches: dcPts > 0 ? 1 : 0,
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
  const poolAverages = finalizeRowColourAndAverages(
    sorted,
    PER_GW_COLUMNS,
    false,
  );

  return {
    mode: "PER_GW",
    columns: PER_GW_COLUMNS,
    rows: sorted,
    totalRows: sorted.length,
    maxGw,
    effectiveLabel: `${gwWindow[0]}–${gwWindow[1]}`,
    poolAverages,
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
  const columns = withPer90DcDecimals(
    TEAM_TAB_COLUMNS[filter.teamTab],
    filter.per90,
  );
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

    // LAST_N_MATCHES: tylko autentyczne mecze klubu, potem ostatnie N fixture'ów
    if (lastN > 0) {
      const genuine = filterGenuineClubFixtures(teamRows);
      const byFix = new Map<number, FplLabPlayerGwHistory[]>();
      for (const r of genuine) {
        const list = byFix.get(r.fixture_id);
        if (list) list.push(r);
        else byFix.set(r.fixture_id, [r]);
      }
      const fixtureMeta = [...byFix.entries()].map(([fid, rs]) => {
        const sample = rs[0]!;
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
  const poolAverages = finalizeRowColourAndAverages(
    sorted,
    columns,
    filter.per90,
  );

  return {
    mode: "TEAMS",
    columns,
    rows: sorted,
    totalRows: sorted.length,
    maxGw,
    effectiveLabel: `${gwWindow[0]}–${gwWindow[1]}`,
    poolAverages,
  };
}

const TRANSFER_COMPACT_KEYS = new Set([
  "transfers_in_event",
  "transfers_out_event",
  "net_transfers_gw",
  "transfers_in",
  "transfers_out",
]);

function formatCompactTransfer(key: string, value: number): string {
  const abs = Math.abs(value);
  let sign = "";
  if (value < 0) sign = "-";
  else if (key === "net_transfers_gw" && value > 0) sign = "+";

  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${Math.round(abs)}`;
}

/** Czy wartość jest niekorzystna dla różowego alertu (norm już = „wyżej lepiej”). */
export function isUnfavorableCentreValue(key: string, value: number): boolean {
  if (key === "xgc_delta") return value > 0;
  if (key === "negative_points_total") return value < 0;
  if (SIGNED_DELTA_KEYS.has(key) || key === "goal_diff" || key === "net_xg_balance") {
    return value < 0;
  }
  if (
    key === "goals_conceded" ||
    key === "expected_goals_conceded" ||
    key === "yellow_cards" ||
    key === "red_cards" ||
    key === "own_goals" ||
    key === "penalties_missed" ||
    key === "transfers_out_event" ||
    key === "transfers_out"
  ) {
    return value > 0;
  }
  if (
    key === "mins_per_goal" ||
    key === "mins_per_xg" ||
    key === "mins_per_assist"
  ) {
    return value > 0;
  }
  return false;
}

/**
 * Pigułki kolorystyczne — Social-First AAA.
 * `norm` już w orientacji „wyżej = lepiej” (silnik); nie odwracamy ponownie.
 * Ostrzeżenia (invert / signed / penalty): 0..0.10 mocny róż, 0.10..0.25 delikatny róż.
 * Zwykłe metryki dodatnie przy niskim norm → szare (nigdy róż).
 */
export function colourPillClass(
  norm: number | null | undefined,
  colKey: string,
  isDark: boolean,
  value: number | null = null,
): string {
  if (value == null || !Number.isFinite(value) || norm == null || !Number.isFinite(norm)) {
    return isDark
      ? "bg-slate-800/45 text-slate-300 border border-transparent"
      : "bg-slate-100 text-slate-500 border border-slate-200";
  }

  const effectiveNorm = Math.max(0, Math.min(1, norm));
  const isWarningCol =
    PENALTY_COLUMNS.has(colKey) || INVERT_OR_SIGNED_COLUMN_KEYS.has(colKey);
  const unfavorable = isUnfavorableCentreValue(colKey, value);

  // Najpierw różowe progi — włącznie z norm === 0 (najgorsze w puli)
  if (isWarningCol && unfavorable && effectiveNorm < 0.25) {
    if (effectiveNorm <= 0.1) {
      return isDark
        ? "bg-rose-500/30 text-rose-100 border border-rose-500/50 font-extrabold"
        : "bg-rose-600 text-white border border-rose-700 font-extrabold shadow-sm";
    }
    return isDark
      ? "bg-rose-500/15 text-rose-200 border border-rose-500/30 font-bold"
      : "bg-rose-100 text-rose-900 border border-rose-300 font-bold";
  }

  if (!isDark) {
    if (effectiveNorm >= 0.85) {
      return "bg-emerald-600 text-white font-extrabold shadow-sm";
    }
    if (effectiveNorm >= 0.65) {
      return "bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold";
    }
    if (effectiveNorm >= 0.45) {
      return "bg-emerald-50/90 text-emerald-900 border border-emerald-200/80";
    }
    if (effectiveNorm >= 0.25) {
      return "bg-slate-100 text-slate-700";
    }
    // Zwykłe dodatnie (0 goli itd.) — szare, nie różowe
    return "bg-slate-100/80 text-slate-500";
  }

  if (effectiveNorm >= 0.85) {
    return "bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 font-extrabold";
  }
  if (effectiveNorm >= 0.65) {
    return "bg-emerald-500/30 text-emerald-200 border border-emerald-500/40";
  }
  if (effectiveNorm >= 0.45) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25";
  }
  if (effectiveNorm >= 0.25) {
    return "bg-slate-800/45 text-slate-200 border border-transparent";
  }
  // Zwykłe dodatnie przy niskim norm — szare bez ramki
  return "bg-slate-800/30 text-slate-400 border border-transparent";
}

/** Neutralna pigułka dla kolumn tekstowych / porządkowych / null. */
export function colourPillNeutralClass(isDark: boolean): string {
  return isDark
    ? "bg-slate-800/45 text-slate-300 border border-transparent"
    : "bg-slate-100 text-slate-700 border border-slate-200";
}

/** Metryki skalowane Per 90 → zawsze 2 dp w UI. */
const PER90_TWO_DP_KEYS = new Set([
  "total_points",
  "goals_scored",
  "assists",
  "goals_assists",
  "clean_sheets",
  "goals_conceded",
  "defensive_contributions_total",
  "dc_bonus_points",
  "dc_bonus_matches",
  "recoveries",
  "tackles",
  "clearances_blocks_interceptions",
  "saves",
  "bonus",
  "bps",
  "yellow_cards",
  "red_cards",
  "own_goals",
  "negative_points_total",
  "expected_goals",
  "expected_assists",
  "expected_goal_involvements",
  "expected_goals_conceded",
  "threat",
  "creativity",
  "influence",
  "ict_index",
]);

/** Całkowite w Totals → w Ø średniej 1 dp. */
const POOL_AVG_ONE_DP_KEYS = new Set([
  "starts",
  "total_points",
  "goals_scored",
  "assists",
  "goals_assists",
  "dd_hauls",
  "bonus",
  "bps",
  "clean_sheets",
  "goals_conceded",
  "defensive_contributions_total",
  "dc_bonus_points",
  "dc_bonus_matches",
  "recoveries",
  "tackles",
  "clearances_blocks_interceptions",
  "saves",
  "yellow_cards",
  "red_cards",
  "own_goals",
  "negative_points_total",
  "dreamteam_count",
  "matches_played",
  "penalties_saved",
  "penalties_missed",
]);

const POOL_AVG_ROUND_INT_KEYS = new Set([
  "minutes",
  "mins_per_goal",
  "mins_per_xg",
  "mins_per_assist",
]);

export function formatCentreCell(
  colDef: StatsCentreColumnDef,
  value: StatsCentreCellValue,
  per90 = false,
  isPoolAverage = false,
): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (TRANSFER_COMPACT_KEYS.has(colDef.key)) {
    return formatCompactTransfer(colDef.key, value);
  }
  if (colDef.format === "price") return `£${value.toFixed(colDef.decimals)}`;
  if (colDef.format === "percent") return `${value.toFixed(colDef.decimals)}%`;

  // starts / dd_hauls / dreamteam_count / goal_diff w Ø — 1 dp
  if (
    isPoolAverage &&
    (colDef.key === "starts" ||
      colDef.key === "dd_hauls" ||
      colDef.key === "dreamteam_count" ||
      colDef.key === "matches_played" ||
      colDef.key === "goal_diff")
  ) {
    if (colDef.key === "goal_diff") {
      const sign = value > 0 ? "+" : "";
      return `${sign}${value.toFixed(1)}`;
    }
    return value.toFixed(1);
  }

  if (per90 && PER90_TWO_DP_KEYS.has(colDef.key)) {
    return value.toFixed(2);
  }

  if (isPoolAverage) {
    if (POOL_AVG_ROUND_INT_KEYS.has(colDef.key)) {
      return String(Math.round(value));
    }
    if (POOL_AVG_ONE_DP_KEYS.has(colDef.key)) {
      return value.toFixed(1);
    }
  }

  if (colDef.isDelta || colDef.format === "delta") {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(colDef.decimals)}`;
  }
  return colDef.decimals > 0
    ? value.toFixed(colDef.decimals)
    : String(Math.round(value));
}
