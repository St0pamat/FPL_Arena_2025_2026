/**
 * FPL Arena: Stats Lab — czysty silnik analityczny
 * (agregacja, Per90, percentyle, rozbicie punktów FPL, serie/passy).
 * Bez I/O — Server Actions dostarczają dane i wołają te funkcje.
 */

import type {
  FplLabPlayer,
  FplLabPlayerGwHistory,
  FplLabSyncMeta,
  FplPointsBreakdown,
  FplPointsNegativeBreakdown,
  FplPointsPositiveBreakdown,
  FplPositionType,
  FplStatDefinition,
  FplStatKey,
  PlayerStreaks,
} from "@/lib/stats-lab/types";
import {
  FPL_DC_BONUS_POINTS,
  FPL_DC_THRESHOLD_DEF,
  FPL_DC_THRESHOLD_MID_FWD,
  FPL_STAT_DEFINITIONS,
  getFplStatDefinition,
} from "@/lib/stats-lab/types";
import type {
  StatsLabPeriodFilter,
  StatsLabQueryFilter,
  StatsLabSortDirection,
} from "@/lib/stats-lab/presets";
import { hasActivePositionFilter } from "@/lib/stats-lab/presets";

/** Metryki sumowane bezpośrednio z historii GW. */
const HISTORY_SUM_KEYS: readonly FplStatKey[] = [
  "total_points",
  "minutes",
  "starts",
  "goals_scored",
  "assists",
  "clean_sheets",
  "goals_conceded",
  "own_goals",
  "penalties_saved",
  "penalties_missed",
  "yellow_cards",
  "red_cards",
  "saves",
  "bonus",
  "bps",
  "influence",
  "creativity",
  "threat",
  "ict_index",
  "expected_goals",
  "expected_assists",
  "expected_goal_involvements",
  "expected_goals_conceded",
  "recoveries",
  "tackles",
  "clearances_blocks_interceptions",
];

/** Snapshot-only (nie sumujemy z historii GW). */
const SNAPSHOT_ONLY_KEYS: readonly FplStatKey[] = [
  "event_points",
  "form",
  "points_per_game",
  "value_form",
  "value_season",
  "dreamteam_count",
  "transfers_in",
  "transfers_out",
  "transfers_in_event",
  "transfers_out_event",
  "now_cost",
  "selected_by_percent",
];

export type StatsLabGwRange = [number, number];

export type AggregatedPlayerPeriodStats = {
  fpl_element_id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  element_type: FplLabPlayer["element_type"];
  fpl_team_id: number;
  /** Oficjalny kod zdjęcia PL (`player_code`). */
  player_code: number;
  status: string;
  /** Surowe sumy / snapshot w okresie (przed Per90). */
  rawValues: Record<FplStatKey, number>;
  minutes: number;
};

export type AnalyzedPlayerStats = AggregatedPlayerPeriodStats & {
  displayValues: Record<FplStatKey, number>;
  percentiles: Record<FplStatKey, number>;
  /** Średnia percentyli z activeMetrics (0–100). */
  compositeScore: number;
  pointsBreakdown: FplPointsBreakdown;
  streaks: PlayerStreaks;
};

export type StatsLabClubInfo = {
  fpl_team_id: number;
  name: string;
  short_name: string;
  primary_color: string | null;
  /** Oficjalny kod herbu PL (`pulse_code`). */
  pulse_code: number;
};

export type PlottedStatsLabPlayer = AnalyzedPlayerStats & {
  club: StatsLabClubInfo | null;
  /** Alias: `player.player_code` → URL `/api/uploads/fpl-lab/player/{code}` */
  playerCode: number;
  /** Alias: `club.pulse_code` → URL `/api/uploads/fpl-lab/badge/{code}` */
  clubPulseCode: number;
};

export type StatsLabComparisonResult = {
  plottedPlayers: PlottedStatsLabPlayer[];
  poolAverages: Record<FplStatKey, number>;
  poolSize: number;
  effectiveGwRange: StatsLabGwRange;
  activeMetrics: FplStatKey[];
};

export type StatsLabBootstrapPlayer = {
  fpl_element_id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  element_type: FplLabPlayer["element_type"];
  fpl_team_id: number;
  now_cost: number;
  selected_by_percent: number;
  total_points: number;
  minutes: number;
  status: string;
};

export type StatsLabBootstrapData = {
  seasonCode: string;
  meta: FplLabSyncMeta | null;
  clubs: StatsLabClubInfo[];
  players: StatsLabBootstrapPlayer[];
  maxGw: number;
};

function emptyRawValues(): Record<FplStatKey, number> {
  const out = {} as Record<FplStatKey, number>;
  for (const def of FPL_STAT_DEFINITIONS) out[def.key] = 0;
  return out;
}

function roundTo(value: number, decimals: 0 | 1 | 2): number {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

function emptyPositiveBreakdown(): FplPointsPositiveBreakdown {
  return {
    appearancePts: 0,
    appearanceBasePts: 0,
    sixtyPlusPts: 0,
    goalPts: 0,
    assistPts: 0,
    cleanSheetPts: 0,
    dcPts: 0,
    savePts: 0,
    penaltySavePts: 0,
    bonusPts: 0,
  };
}

/** Utrzymuje `appearanceBasePts + sixtyPlusPts === appearancePts`. */
function syncAppearanceSplit(
  positive: FplPointsPositiveBreakdown,
  preferredBase?: number,
  preferredSixty?: number,
): void {
  const total = Math.max(0, positive.appearancePts);
  positive.appearancePts = total;

  if (
    preferredBase != null &&
    preferredSixty != null &&
    preferredBase + preferredSixty === total
  ) {
    positive.appearanceBasePts = preferredBase;
    positive.sixtyPlusPts = preferredSixty;
    return;
  }

  if (preferredBase != null && preferredSixty != null) {
    const histSum = preferredBase + preferredSixty;
    if (histSum <= total) {
      const gap = total - histSum;
      const extraFull = Math.floor(gap / 2);
      const extraBase = gap % 2;
      positive.appearanceBasePts = preferredBase + extraFull + extraBase;
      positive.sixtyPlusPts = preferredSixty + extraFull;
      return;
    }
    let need = histSum - total;
    let sixty = preferredSixty;
    let base = preferredBase;
    const takeSixty = Math.min(sixty, need);
    sixty -= takeSixty;
    need -= takeSixty;
    base = Math.max(0, base - need);
    positive.appearanceBasePts = base;
    positive.sixtyPlusPts = sixty;
    return;
  }

  // Bez historii: połowa/połowa (typowy pełny start = 2 pkt).
  positive.appearanceBasePts = Math.ceil(total / 2);
  positive.sixtyPlusPts = Math.floor(total / 2);
}

function emptyNegativeBreakdown(): FplPointsNegativeBreakdown {
  return {
    goalsConcededDeduction: 0,
    yellowCardDeduction: 0,
    redCardDeduction: 0,
    penaltyMissDeduction: 0,
    ownGoalDeduction: 0,
  };
}

function emptyRecentFlags(): PlayerStreaks["recentFlags"] {
  return {
    returnHit: [],
    goalHit: [],
    assistHit: [],
    goalOrAssistHit: [],
    cleanSheetHit: [],
    dcHit: [],
    sixtyMinHit: [],
  };
}

function emptyStreaks(): PlayerStreaks {
  return {
    maxReturnStreak: 0,
    currentReturnStreak: 0,
    maxGoalStreak: 0,
    currentGoalStreak: 0,
    maxAssistStreak: 0,
    currentAssistStreak: 0,
    maxGoalOrAssistStreak: 0,
    currentGoalOrAssistStreak: 0,
    maxCleanSheetStreak: 0,
    currentCleanSheetStreak: 0,
    maxDcPointsStreak: 0,
    currentDcPointsStreak: 0,
    max60MinStreak: 0,
    current60MinStreak: 0,
    returnConsistencyPct: 0,
    recentFlags: emptyRecentFlags(),
  };
}

function sumPositive(p: FplPointsPositiveBreakdown): number {
  return (
    p.appearancePts +
    p.goalPts +
    p.assistPts +
    p.cleanSheetPts +
    p.dcPts +
    p.savePts +
    p.penaltySavePts +
    p.bonusPts
  );
}

function sumNegative(n: FplPointsNegativeBreakdown): number {
  return (
    n.goalsConcededDeduction +
    n.yellowCardDeduction +
    n.redCardDeduction +
    n.penaltyMissDeduction +
    n.ownGoalDeduction
  );
}

function finalizeBreakdown(
  positive: FplPointsPositiveBreakdown,
  negative: FplPointsNegativeBreakdown,
  fromHistory: boolean,
  targetNet?: number,
): FplPointsBreakdown {
  if (targetNet != null && Number.isFinite(targetNet)) {
    return forceBreakdownBalance(positive, negative, targetNet, fromHistory);
  }
  const positiveTotal = sumPositive(positive);
  const negativeTotal = sumNegative(negative);
  return {
    positiveBreakdown: positive,
    negativeBreakdown: negative,
    positiveTotal,
    negativeTotal,
    estimatedTotal: positiveTotal + negativeTotal,
    fromHistory,
  };
}

/* ─────────────────────────────────────────────────
 * Defensive Contributions helpers
 * ───────────────────────────────────────────────── */

/** Suma składowych DC w meczu wg pozycji. */
export function computeMatchDcComponents(
  elementType: FplPositionType,
  cbi: number,
  tackles: number,
  recoveries: number,
): number {
  const c = Math.max(0, cbi) + Math.max(0, tackles);
  if (elementType === 2) return c;
  if (elementType === 3 || elementType === 4) {
    return c + Math.max(0, recoveries);
  }
  return 0;
}

export function hitsDcThreshold(
  elementType: FplPositionType,
  dcTotal: number,
): boolean {
  if (elementType === 2) return dcTotal >= FPL_DC_THRESHOLD_DEF;
  if (elementType === 3 || elementType === 4) {
    return dcTotal >= FPL_DC_THRESHOLD_MID_FWD;
  }
  return false;
}

/** Suma DC w meczu: preferuj `defensive_contribution`, inaczej CBI+TKL(+REC). */
export function matchDcTotal(
  elementType: FplPositionType,
  row: Pick<
    FplLabPlayerGwHistory,
    | "clearances_blocks_interceptions"
    | "tackles"
    | "recoveries"
    | "defensive_contribution"
  >,
): number {
  const apiDc = Number(row.defensive_contribution ?? 0);
  if (apiDc > 0) return apiDc;
  return computeMatchDcComponents(
    elementType,
    Number(row.clearances_blocks_interceptions ?? 0),
    Number(row.tackles ?? 0),
    Number(row.recoveries ?? 0),
  );
}

export function matchHasDcBonus(
  elementType: FplPositionType,
  row: Pick<
    FplLabPlayerGwHistory,
    | "clearances_blocks_interceptions"
    | "tackles"
    | "recoveries"
    | "defensive_contribution"
  >,
): boolean {
  return hitsDcThreshold(elementType, matchDcTotal(elementType, row));
}

function goalPointsPerGoal(elementType: FplPositionType): number {
  if (elementType === 1) return 10;
  if (elementType === 2) return 6;
  if (elementType === 3) return 5;
  return 4;
}

function cleanSheetPointsPerCs(elementType: FplPositionType): number {
  if (elementType === 1 || elementType === 2) return 4;
  if (elementType === 3) return 1;
  return 0;
}

function appearancePointsSplit(minutes: number): {
  base: number;
  sixty: number;
  total: number;
} {
  if (minutes >= 60) return { base: 1, sixty: 1, total: 2 };
  if (minutes > 0) return { base: 1, sixty: 0, total: 1 };
  return { base: 0, sixty: 0, total: 0 };
}

/** Składowe punktów jednego meczu — zgodne 1:1 z `row.total_points`. */
export type MatchPointsScore = {
  appearancePts: number;
  appearanceBasePts: number;
  sixtyPlusPts: number;
  goalPts: number;
  assistPts: number;
  cleanSheetPts: number;
  savePts: number;
  penaltySavePts: number;
  bonusPts: number;
  dcPts: number;
  goalsConcededDeduction: number;
  yellowCardDeduction: number;
  redCardDeduction: number;
  penaltyMissDeduction: number;
  ownGoalDeduction: number;
  /** Czy w tym meczu przyznano bonus DC (+2) wg bilansu FPL. */
  awardedDcBonus: boolean;
  officialTotal: number;
};

/**
 * Oficjalne składowe punktów FPL dla jednego wiersza historii GW.
 * DC wyliczane z różnicy względem `total_points` (nie z zgadywania Opta).
 */
export function scoreMatchPoints(
  elementType: FplPositionType,
  row: FplLabPlayerGwHistory,
): MatchPointsScore {
  const mins = Number(row.minutes ?? 0);
  const apps = appearancePointsSplit(mins);
  const appearancePts = apps.total;
  const appearanceBasePts = apps.base;
  const sixtyPlusPts = apps.sixty;
  const goalPts =
    Number(row.goals_scored ?? 0) * goalPointsPerGoal(elementType);
  const assistPts = Number(row.assists ?? 0) * 3;
  const cleanSheetPts =
    Number(row.clean_sheets ?? 0) > 0 && mins >= 60
      ? cleanSheetPointsPerCs(elementType)
      : 0;
  const savePts =
    elementType === 1 ? Math.floor(Number(row.saves ?? 0) / 3) : 0;
  const penaltySavePts = Number(row.penalties_saved ?? 0) * 5;
  let bonusPts = Number(row.bonus ?? 0);

  const goalsConcededDeduction =
    elementType === 1 || elementType === 2
      ? -Math.floor(Number(row.goals_conceded ?? 0) / 2)
      : 0;
  const yellowCardDeduction = -(Number(row.yellow_cards ?? 0) * 1);
  const redCardDeduction = -(Number(row.red_cards ?? 0) * 3);
  const penaltyMissDeduction = -(Number(row.penalties_missed ?? 0) * 2);
  let ownGoalDeduction = -(Number(row.own_goals ?? 0) * 2);

  const knownSubtotal =
    appearancePts +
    goalPts +
    assistPts +
    cleanSheetPts +
    savePts +
    penaltySavePts +
    bonusPts +
    goalsConcededDeduction +
    yellowCardDeduction +
    redCardDeduction +
    penaltyMissDeduction +
    ownGoalDeduction;

  const officialTotal = Number(row.total_points ?? 0);
  const diff = officialTotal - knownSubtotal;
  const thresholdHit = matchHasDcBonus(elementType, row);

  let dcPts = 0;
  let awardedDcBonus = false;

  // DC: +2 gdy bilans wskazuje klasyczny bonus albo próg Opta + dodatnia różnica
  if (diff === FPL_DC_BONUS_POINTS || (thresholdHit && diff > 0)) {
    dcPts = diff > 0 ? diff : 0;
    awardedDcBonus = dcPts > 0;
  } else if (diff !== 0) {
    // Korekta historyczna / Opta — wchłoń resztę, by suma = officialTotal
    if (diff > 0) bonusPts += diff;
    else ownGoalDeduction += diff;
  }

  return {
    appearancePts,
    appearanceBasePts,
    sixtyPlusPts,
    goalPts,
    assistPts,
    cleanSheetPts,
    savePts,
    penaltySavePts,
    bonusPts,
    dcPts,
    goalsConcededDeduction,
    yellowCardDeduction,
    redCardDeduction,
    penaltyMissDeduction,
    ownGoalDeduction,
    awardedDcBonus,
    officialTotal,
  };
}

/** Wymusza: positiveTotal + negativeTotal === targetNet (oficjalne punkty FPL). */
function forceBreakdownBalance(
  positive: FplPointsPositiveBreakdown,
  negative: FplPointsNegativeBreakdown,
  targetNet: number,
  fromHistory: boolean,
): FplPointsBreakdown {
  let positiveTotal = sumPositive(positive);
  let negativeTotal = sumNegative(negative);
  const gap = targetNet - (positiveTotal + negativeTotal);
  if (gap !== 0) {
    if (gap > 0) {
      positive.bonusPts += gap;
    } else {
      negative.ownGoalDeduction += gap;
    }
    positiveTotal = sumPositive(positive);
    negativeTotal = sumNegative(negative);
  }
  return {
    positiveBreakdown: positive,
    negativeBreakdown: negative,
    positiveTotal,
    negativeTotal,
    estimatedTotal: positiveTotal + negativeTotal,
    fromHistory,
  };
}

/**
 * Precyzyjny „Zwrot FPL” — nie liczy samego występu (2 pkt za 90 min).
 * GK/DEF: G / A / CS / DC actions / bonus ≥2
 * MID/FWD: G / A / bonus ≥2 / total_points ≥5
 */
function isReturnMatch(
  elementType: FplPositionType,
  row: FplLabPlayerGwHistory,
): boolean {
  const goals = Number(row.goals_scored) > 0;
  const assists = Number(row.assists) > 0;
  const bonus = Number(row.bonus) >= 2;

  if (elementType === 1 || elementType === 2) {
    return (
      goals ||
      assists ||
      Number(row.clean_sheets) > 0 ||
      matchDcTotal(elementType, row) > 0 ||
      bonus
    );
  }

  return goals || assists || bonus || Number(row.total_points) >= 5;
}

function sortHistoryChronologically(
  rows: FplLabPlayerGwHistory[],
): FplLabPlayerGwHistory[] {
  return [...rows].sort((a, b) => {
    if (a.gameweek !== b.gameweek) return a.gameweek - b.gameweek;
    const at = a.kickoff_time ? Date.parse(a.kickoff_time) : 0;
    const bt = b.kickoff_time ? Date.parse(b.kickoff_time) : 0;
    if (at !== bt) return at - bt;
    return a.fixture_id - b.fixture_id;
  });
}

/**
 * Rozbicie punktów FPL mecz-po-meczu (oficjalne zasady).
 * Suma składowych === suma `row.total_points` w okresie.
 */
export function computePointsBreakdownFromHistory(
  elementType: FplPositionType,
  historyRows: FplLabPlayerGwHistory[],
): FplPointsBreakdown {
  const positive = emptyPositiveBreakdown();
  const negative = emptyNegativeBreakdown();
  let officialNet = 0;

  for (const row of historyRows) {
    const scored = scoreMatchPoints(elementType, row);
    positive.appearancePts += scored.appearancePts;
    positive.appearanceBasePts += scored.appearanceBasePts;
    positive.sixtyPlusPts += scored.sixtyPlusPts;
    positive.goalPts += scored.goalPts;
    positive.assistPts += scored.assistPts;
    positive.cleanSheetPts += scored.cleanSheetPts;
    positive.dcPts += scored.dcPts;
    positive.savePts += scored.savePts;
    positive.penaltySavePts += scored.penaltySavePts;
    positive.bonusPts += scored.bonusPts;

    negative.goalsConcededDeduction += scored.goalsConcededDeduction;
    negative.yellowCardDeduction += scored.yellowCardDeduction;
    negative.redCardDeduction += scored.redCardDeduction;
    negative.penaltyMissDeduction += scored.penaltyMissDeduction;
    negative.ownGoalDeduction += scored.ownGoalDeduction;

    officialNet += scored.officialTotal;
  }

  syncAppearanceSplit(
    positive,
    positive.appearanceBasePts,
    positive.sixtyPlusPts,
  );
  return finalizeBreakdown(positive, negative, true, officialNet);
}

/**
 * FULL_SEASON: historia meczowa + twarde uzgodnienie ze snapshotem `fpl_lab_players`.
 * Gdy historia jest niekompletna (np. ucięty sync / limit 1000), składowe z kolumn
 * bootstrap gwarantują `net === player.total_points` (np. De Cuyper = 69).
 */
export function computeFullSeasonPointsBreakdown(
  player: FplLabPlayer,
  historyRows: FplLabPlayerGwHistory[],
): FplPointsBreakdown {
  const elementType = player.element_type;
  const snapshotNet = Number(player.total_points ?? 0);

  if (!historyRows.length) {
    return estimatePointsBreakdownFromSnapshot(player);
  }

  const fromHistory = computePointsBreakdownFromHistory(
    elementType,
    historyRows,
  );

  // Historia kompletna względem oficjalnego snapshotu — zostaw mecz-po-meczu.
  if (fromHistory.estimatedTotal === snapshotNet) {
    return fromHistory;
  }

  // ── Reconciliation ze snapshotem (autorytatywne sumy bootstrap-static) ──
  const positive = emptyPositiveBreakdown();
  const negative = emptyNegativeBreakdown();

  const starts = Number(player.starts ?? 0);
  const minutes = Number(player.minutes ?? 0);
  const histApps = fromHistory.positiveBreakdown.appearancePts;
  // Exact apps z historii; jeśli brakuje meczów → minimum starts*2 (+ suby)
  const subApps = Math.max(
    0,
    Math.round(minutes / 45) - starts,
  );
  const snapshotApps = starts > 0 ? starts * 2 + Math.max(0, subApps) : 0;
  // Max 2 pkt/mecz — nie pozwól snapshotApps przekroczyć absurdalnych wartości
  const cappedSnapshotApps = Math.min(
    snapshotApps,
    Math.max(starts * 2, histApps) + Math.max(0, starts),
  );
  positive.appearancePts = Math.max(histApps, Math.min(cappedSnapshotApps, starts * 2 + Math.max(0, subApps)));
  // Preferuj co najmniej starts*2 gdy starts znane
  if (starts > 0) {
    positive.appearancePts = Math.max(positive.appearancePts, starts * 2);
  }
  syncAppearanceSplit(
    positive,
    fromHistory.positiveBreakdown.appearanceBasePts,
    fromHistory.positiveBreakdown.sixtyPlusPts,
  );

  positive.goalPts =
    Number(player.goals_scored ?? 0) * goalPointsPerGoal(elementType);
  positive.assistPts = Number(player.assists ?? 0) * 3;
  positive.cleanSheetPts =
    Number(player.clean_sheets ?? 0) * cleanSheetPointsPerCs(elementType);
  positive.bonusPts = Number(player.bonus ?? 0);
  positive.penaltySavePts = Number(player.penalties_saved ?? 0) * 5;
  positive.savePts = Math.max(
    fromHistory.positiveBreakdown.savePts,
    elementType === 1 ? Math.floor(Number(player.saves ?? 0) / 3) : 0,
  );
  // DC wyłącznie z historii meczowej (próg / bilans per mecz)
  positive.dcPts = fromHistory.positiveBreakdown.dcPts;

  negative.yellowCardDeduction = -(Number(player.yellow_cards ?? 0) * 1);
  negative.redCardDeduction = -(Number(player.red_cards ?? 0) * 3);
  negative.penaltyMissDeduction = -(Number(player.penalties_missed ?? 0) * 2);
  negative.ownGoalDeduction = -(Number(player.own_goals ?? 0) * 2);

  if (elementType === 1 || elementType === 2) {
    const fromHistGc = fromHistory.negativeBreakdown.goalsConcededDeduction;
    const fromSnapGc = -Math.floor(Number(player.goals_conceded ?? 0) / 2);
    negative.goalsConcededDeduction =
      Math.abs(fromSnapGc) >= Math.abs(fromHistGc) ? fromSnapGc : fromHistGc;
  }

  // Brakująca reszta względem snapshotu — typowo DC z brakującego meczu (+2)
  const gap =
    snapshotNet - (sumPositive(positive) + sumNegative(negative));
  if (gap === FPL_DC_BONUS_POINTS) {
    positive.dcPts += FPL_DC_BONUS_POINTS;
  } else if (
    gap > FPL_DC_BONUS_POINTS &&
    gap % FPL_DC_BONUS_POINTS === 0
  ) {
    positive.dcPts += gap;
  }

  // Żelazny wymóg: net === player.total_points
  return finalizeBreakdown(positive, negative, true, snapshotNet);
}

/**
 * Estymacja rozbicia ze snapshotu (gdy brak historii GW).
 * Żelazny wymóg: netto === `player.total_points`.
 */
export function estimatePointsBreakdownFromSnapshot(
  player: FplLabPlayer,
): FplPointsBreakdown {
  const elementType = player.element_type;
  const positive = emptyPositiveBreakdown();
  const negative = emptyNegativeBreakdown();
  const officialNet = Number(player.total_points ?? 0);

  const starts = Number(player.starts ?? 0);
  // Max 2 pkt / mecz za minuty. Bez historii nie zgadujemy subów z minutes/45
  // (to dawało niemożliwe +25 pkt w 9 kolejkach) — resztę domyka forceBreakdownBalance.
  positive.appearancePts = starts > 0 ? starts * 2 : 0;
  if (starts > 0) {
    positive.appearanceBasePts = starts;
    positive.sixtyPlusPts = starts;
  } else {
    syncAppearanceSplit(positive);
  }

  positive.goalPts =
    Number(player.goals_scored ?? 0) * goalPointsPerGoal(elementType);
  positive.assistPts = Number(player.assists ?? 0) * 3;
  positive.cleanSheetPts =
    Number(player.clean_sheets ?? 0) * cleanSheetPointsPerCs(elementType);

  if (elementType === 1) {
    positive.savePts = Math.floor(Number(player.saves ?? 0) / 3);
  }
  positive.penaltySavePts = Number(player.penalties_saved ?? 0) * 5;
  positive.bonusPts = Number(player.bonus ?? 0);

  if (elementType === 1 || elementType === 2) {
    negative.goalsConcededDeduction =
      -Math.floor(Number(player.goals_conceded ?? 0) / 2);
  }
  negative.yellowCardDeduction = Number(player.yellow_cards ?? 0) * -1;
  negative.redCardDeduction = Number(player.red_cards ?? 0) * -3;
  negative.penaltyMissDeduction = Number(player.penalties_missed ?? 0) * -2;
  negative.ownGoalDeduction = Number(player.own_goals ?? 0) * -2;

  // DC ze snapshotu: reszta bilansu względem oficjalnego total_points
  // (nie dzielimy CBI przez próg — to zawyżało DC).
  const knownWithoutDc =
    sumPositive({ ...positive, dcPts: 0 }) + sumNegative(negative);
  const dcGap = officialNet - knownWithoutDc;
  if (dcGap >= FPL_DC_BONUS_POINTS && dcGap % FPL_DC_BONUS_POINTS === 0) {
    positive.dcPts = dcGap;
  }

  return finalizeBreakdown(positive, negative, false, officialNet);
}

const STREAK_RECENT_WINDOW = 10;

/**
 * Serie / passy na chronologicznej historii meczów.
 */
export function computePlayerStreaks(
  elementType: FplPositionType,
  historyRows: FplLabPlayerGwHistory[],
): PlayerStreaks {
  const sorted = sortHistoryChronologically(historyRows);
  if (!sorted.length) return emptyStreaks();

  let maxReturn = 0;
  let curReturn = 0;
  let maxGoal = 0;
  let curGoal = 0;
  let maxAssist = 0;
  let curAssist = 0;
  let maxGA = 0;
  let curGA = 0;
  let maxCs = 0;
  let curCs = 0;
  let maxDc = 0;
  let curDc = 0;
  let max60 = 0;
  let cur60 = 0;

  let startsCount = 0;
  let startsWithReturn = 0;

  const recentFlags = emptyRecentFlags();

  for (const row of sorted) {
    const ret = isReturnMatch(elementType, row);
    curReturn = ret ? curReturn + 1 : 0;
    maxReturn = Math.max(maxReturn, curReturn);

    const goal = Number(row.goals_scored) > 0;
    curGoal = goal ? curGoal + 1 : 0;
    maxGoal = Math.max(maxGoal, curGoal);

    const assist = Number(row.assists) > 0;
    curAssist = assist ? curAssist + 1 : 0;
    maxAssist = Math.max(maxAssist, curAssist);

    const ga = goal || assist;
    curGA = ga ? curGA + 1 : 0;
    maxGA = Math.max(maxGA, curGA);

    const cs = Number(row.clean_sheets) > 0;
    curCs = cs ? curCs + 1 : 0;
    maxCs = Math.max(maxCs, curCs);

    const dc = scoreMatchPoints(elementType, row).awardedDcBonus;
    curDc = dc ? curDc + 1 : 0;
    maxDc = Math.max(maxDc, curDc);

    const m60 = Number(row.minutes) >= 60;
    cur60 = m60 ? cur60 + 1 : 0;
    max60 = Math.max(max60, cur60);

    recentFlags.returnHit.push(ret);
    recentFlags.goalHit.push(goal);
    recentFlags.assistHit.push(assist);
    recentFlags.goalOrAssistHit.push(ga);
    recentFlags.cleanSheetHit.push(cs);
    recentFlags.dcHit.push(dc);
    recentFlags.sixtyMinHit.push(m60);

    if (Number(row.starts) > 0) {
      startsCount += 1;
      if (Number(row.total_points) > 2) startsWithReturn += 1;
    }
  }

  const trim = <T,>(arr: T[]): T[] => arr.slice(-STREAK_RECENT_WINDOW);

  return {
    maxReturnStreak: maxReturn,
    currentReturnStreak: curReturn,
    maxGoalStreak: maxGoal,
    currentGoalStreak: curGoal,
    maxAssistStreak: maxAssist,
    currentAssistStreak: curAssist,
    maxGoalOrAssistStreak: maxGA,
    currentGoalOrAssistStreak: curGA,
    maxCleanSheetStreak: maxCs,
    currentCleanSheetStreak: curCs,
    maxDcPointsStreak: maxDc,
    currentDcPointsStreak: curDc,
    max60MinStreak: max60,
    current60MinStreak: cur60,
    returnConsistencyPct:
      startsCount > 0
        ? roundTo((startsWithReturn / startsCount) * 100, 1)
        : 0,
    recentFlags: {
      returnHit: trim(recentFlags.returnHit),
      goalHit: trim(recentFlags.goalHit),
      assistHit: trim(recentFlags.assistHit),
      goalOrAssistHit: trim(recentFlags.goalOrAssistHit),
      cleanSheetHit: trim(recentFlags.cleanSheetHit),
      dcHit: trim(recentFlags.dcHit),
      sixtyMinHit: trim(recentFlags.sixtyMinHit),
    },
  };
}

function applyComputedRawValues(
  raw: Record<FplStatKey, number>,
  elementType: FplPositionType,
  player: FplLabPlayer,
  periodHistory: FplLabPlayerGwHistory[],
): void {
  const costChangeStart = Number(player.cost_change_start ?? 0);
  raw.price_rise = Math.max(0, costChangeStart);
  raw.price_fall = Math.max(0, -costChangeStart);
  raw.price_change_gw = Number(player.cost_change_event ?? 0);
  raw.net_transfers_gw =
    Number(player.transfers_in_event ?? 0) -
    Number(player.transfers_out_event ?? 0);

  raw.goals_assists = raw.goals_scored + raw.assists;
  raw.goals_vs_xg = roundTo(raw.goals_scored - raw.expected_goals, 2);

  const cbi = raw.clearances_blocks_interceptions;
  const tackles = raw.tackles;
  const recoveries = raw.recoveries;
  const fromParts = computeMatchDcComponents(elementType, cbi, tackles, recoveries);
  const apiDc = Number(player.defensive_contribution ?? 0);
  raw.defensive_contributions_total =
    periodHistory.length > 0
      ? fromParts
      : fromParts > 0
        ? fromParts
        : apiDc;

  if (periodHistory.length > 0) {
    let dcMatches = 0;
    for (const row of periodHistory) {
      if (scoreMatchPoints(elementType, row).awardedDcBonus) dcMatches += 1;
    }
    raw.dc_bonus_matches = dcMatches;
    raw.dc_bonus_points = dcMatches * FPL_DC_BONUS_POINTS;
  } else {
    // Bez historii — nie zgaduj DC z CBI/progu (zawyżało np. +16 pkt).
    raw.dc_bonus_matches = 0;
    raw.dc_bonus_points = 0;
  }

  // Snapshot-only fields always from player
  for (const key of SNAPSHOT_ONLY_KEYS) {
    if (key === "now_cost") {
      raw.now_cost = Number(player.now_cost ?? 0);
    } else if (key === "selected_by_percent") {
      raw.selected_by_percent = Number(player.selected_by_percent ?? 0);
    } else {
      const v = (player as unknown as Record<string, unknown>)[key];
      raw[key] = Number(v ?? 0) || 0;
    }
  }
}

function readPlayerField(player: FplLabPlayer, key: FplStatKey): number {
  if (key === "goals_assists") {
    return Number(player.goals_scored ?? 0) + Number(player.assists ?? 0);
  }
  if (key === "goals_vs_xg") {
    return (
      Number(player.goals_scored ?? 0) - Number(player.expected_goals ?? 0)
    );
  }
  if (key === "price_rise") {
    return Math.max(0, Number(player.cost_change_start ?? 0));
  }
  if (key === "price_fall") {
    return Math.max(0, -Number(player.cost_change_start ?? 0));
  }
  if (key === "price_change_gw") {
    return Number(player.cost_change_event ?? 0);
  }
  if (key === "net_transfers_gw") {
    return (
      Number(player.transfers_in_event ?? 0) -
      Number(player.transfers_out_event ?? 0)
    );
  }
  if (key === "defensive_contributions_total") {
    const parts = computeMatchDcComponents(
      player.element_type,
      Number(player.clearances_blocks_interceptions ?? 0),
      Number(player.tackles ?? 0),
      Number(player.recoveries ?? 0),
    );
    return parts > 0 ? parts : Number(player.defensive_contribution ?? 0);
  }
  if (key === "dc_bonus_matches" || key === "dc_bonus_points") {
    return 0; // wymaga historii — uzupełniane w applyComputed
  }
  const raw = (player as unknown as Record<string, unknown>)[key];
  const n = Number(raw ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function readHistoryField(
  row: FplLabPlayerGwHistory,
  key: FplStatKey,
): number {
  if (
    key === "goals_assists" ||
    key === "now_cost" ||
    key === "selected_by_percent" ||
    SNAPSHOT_ONLY_KEYS.includes(key) ||
    key === "price_rise" ||
    key === "price_fall" ||
    key === "price_change_gw" ||
    key === "net_transfers_gw" ||
    key === "goals_vs_xg" ||
    key === "defensive_contributions_total" ||
    key === "dc_bonus_matches" ||
    key === "dc_bonus_points"
  ) {
    return 0;
  }
  const raw = (row as unknown as Record<string, unknown>)[key];
  const n = Number(raw ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Wyznacza zakres GW na podstawie trybu okresu i maksymalnej znanej kolejki.
 */
export function resolveEffectiveGwRange(
  period: StatsLabPeriodFilter,
  maxGw: number,
): StatsLabGwRange {
  const cappedMax = Math.max(0, Math.min(38, Math.round(maxGw) || 0));
  if (cappedMax < 1) return [0, 0];

  switch (period.mode) {
    case "FULL_SEASON":
      return [1, cappedMax];
    case "LAST_4_GW":
      return [Math.max(1, cappedMax - 3), cappedMax];
    case "LAST_6_GW":
      return [Math.max(1, cappedMax - 5), cappedMax];
    case "HOME_ONLY":
    case "AWAY_ONLY":
      return [1, cappedMax];
    case "CUSTOM_RANGE": {
      const from = Math.max(1, Math.min(38, Number(period.gwFrom ?? 1)));
      const to = Math.max(1, Math.min(38, Number(period.gwTo ?? cappedMax)));
      return from <= to ? [from, to] : [to, from];
    }
    default:
      return [1, cappedMax];
  }
}

function historyRowMatchesPeriod(
  row: FplLabPlayerGwHistory,
  period: StatsLabPeriodFilter,
  gwRange: StatsLabGwRange,
): boolean {
  const gw = Number(row.gameweek);
  if (gw < gwRange[0] || gw > gwRange[1]) return false;
  if (period.mode === "HOME_ONLY" && !row.was_home) return false;
  if (period.mode === "AWAY_ONLY" && row.was_home) return false;
  return true;
}

function filterPeriodHistory(
  playerId: number,
  historyRows: FplLabPlayerGwHistory[],
  period: StatsLabPeriodFilter,
  gwRange: StatsLabGwRange,
): FplLabPlayerGwHistory[] {
  return historyRows.filter(
    (row) =>
      row.fpl_element_id === playerId &&
      historyRowMatchesPeriod(row, period, gwRange),
  );
}

/** Snapshot sezonowy → rawValues (FULL_SEASON). */
export function aggregateFromPlayerSnapshot(
  player: FplLabPlayer,
  periodHistory: FplLabPlayerGwHistory[] = [],
): AggregatedPlayerPeriodStats {
  const rawValues = emptyRawValues();
  for (const def of FPL_STAT_DEFINITIONS) {
    rawValues[def.key] = readPlayerField(player, def.key);
  }
  applyComputedRawValues(
    rawValues,
    player.element_type,
    player,
    periodHistory,
  );
  return {
    fpl_element_id: player.fpl_element_id,
    web_name: player.web_name,
    first_name: player.first_name,
    second_name: player.second_name,
    element_type: player.element_type,
    fpl_team_id: player.fpl_team_id,
    player_code: Number(player.player_code ?? 0),
    status: player.status,
    rawValues,
    minutes: Number(player.minutes ?? 0),
  };
}

/**
 * Agregacja z historii GW + snapshot (cena / Sel% / forma / value zawsze z snapshotu).
 */
export function aggregatePlayerStatsForPeriod(
  player: FplLabPlayer,
  historyRows: FplLabPlayerGwHistory[],
  period: StatsLabPeriodFilter,
  gwRange: StatsLabGwRange,
): AggregatedPlayerPeriodStats {
  const periodHistory = filterPeriodHistory(
    player.fpl_element_id,
    historyRows,
    period,
    gwRange,
  );

  if (period.mode === "FULL_SEASON") {
    return aggregateFromPlayerSnapshot(player, periodHistory);
  }

  const rawValues = emptyRawValues();
  let minutes = 0;

  for (const row of periodHistory) {
    for (const key of HISTORY_SUM_KEYS) {
      rawValues[key] += readHistoryField(row, key);
    }
    minutes += Number(row.minutes ?? 0);
  }

  rawValues.minutes = minutes;
  applyComputedRawValues(
    rawValues,
    player.element_type,
    player,
    periodHistory,
  );

  return {
    fpl_element_id: player.fpl_element_id,
    web_name: player.web_name,
    first_name: player.first_name,
    second_name: player.second_name,
    element_type: player.element_type,
    fpl_team_id: player.fpl_team_id,
    player_code: Number(player.player_code ?? 0),
    status: player.status,
    rawValues,
    minutes,
  };
}

export function applyPer90ToDisplayValues(
  rawValues: Record<FplStatKey, number>,
  minutes: number,
  per90: boolean,
): Record<FplStatKey, number> {
  const display = emptyRawValues();
  for (const def of FPL_STAT_DEFINITIONS) {
    const raw = rawValues[def.key] ?? 0;
    if (per90 && def.supportsPer90) {
      display[def.key] =
        minutes > 0 ? roundTo((raw / minutes) * 90, 2) : 0;
    } else {
      display[def.key] = roundTo(raw, def.decimals);
    }
  }
  return display;
}

/**
 * Percentyl 0–100 na tle puli.
 * invertScale: mniejsza wartość = lepszy wynik (bliżej 100).
 */
export function computePercentileRank(
  poolValues: number[],
  value: number,
  invertScale: boolean,
): number {
  const n = poolValues.length;
  if (n === 0) return 0;
  if (n === 1) return 100;

  const scored = poolValues.map((v) => (invertScale ? -v : v));
  const target = invertScale ? -value : value;

  let worse = 0;
  let equal = 0;
  for (const s of scored) {
    if (s < target) worse += 1;
    else if (s === target) equal += 1;
  }
  const rank = worse + (equal > 0 ? (equal - 1) / 2 : 0);
  return roundTo((rank / (n - 1)) * 100, 1);
}

export function computePercentilesForPool(
  pool: AggregatedPlayerPeriodStats[],
  displayById: Map<number, Record<FplStatKey, number>>,
  metrics: FplStatKey[],
): {
  percentilesById: Map<number, Record<FplStatKey, number>>;
  poolAverages: Record<FplStatKey, number>;
  compositeById: Map<number, number>;
} {
  const uniqueMetrics = [...new Set(metrics)];
  const poolAverages = emptyRawValues();
  const percentilesById = new Map<number, Record<FplStatKey, number>>();
  const compositeById = new Map<number, number>();

  for (const player of pool) {
    percentilesById.set(player.fpl_element_id, emptyRawValues());
  }

  for (const key of uniqueMetrics) {
    const def = getFplStatDefinition(key);
    const invert = Boolean(def?.invertScale);
    const values: number[] = [];
    for (const player of pool) {
      const display = displayById.get(player.fpl_element_id);
      values.push(display?.[key] ?? 0);
    }

    const avg =
      values.length > 0
        ? values.reduce((a, b) => a + b, 0) / values.length
        : 0;
    poolAverages[key] = roundTo(avg, def?.decimals ?? 2);

    for (let i = 0; i < pool.length; i++) {
      const id = pool[i].fpl_element_id;
      const pct = computePercentileRank(values, values[i], invert);
      const row = percentilesById.get(id)!;
      row[key] = pct;
    }
  }

  for (const player of pool) {
    const pcts = percentilesById.get(player.fpl_element_id)!;
    if (!uniqueMetrics.length) {
      compositeById.set(player.fpl_element_id, 0);
      continue;
    }
    let sum = 0;
    for (const key of uniqueMetrics) sum += pcts[key] ?? 0;
    compositeById.set(
      player.fpl_element_id,
      roundTo(sum / uniqueMetrics.length, 1),
    );
  }

  return { percentilesById, poolAverages, compositeById };
}

function passesBaseFilters(
  player: FplLabPlayer,
  filter: StatsLabQueryFilter,
): boolean {
  if (hasActivePositionFilter(filter.positions)) {
    if (!filter.positions.includes(player.element_type)) return false;
  }
  if (filter.clubIds.length && !filter.clubIds.includes(player.fpl_team_id)) {
    return false;
  }
  if (
    filter.maxCostTenths != null &&
    Number(player.now_cost) > Number(filter.maxCostTenths)
  ) {
    return false;
  }
  if (
    filter.maxOwnershipPct != null &&
    Number(player.selected_by_percent) > Number(filter.maxOwnershipPct)
  ) {
    return false;
  }
  return true;
}

function sortPlayers(
  players: AnalyzedPlayerStats[],
  sortByStat: FplStatKey,
  direction: StatsLabSortDirection,
  def: FplStatDefinition | undefined,
): AnalyzedPlayerStats[] {
  const invert = Boolean(def?.invertScale);
  return [...players].sort((a, b) => {
    const av = a.displayValues[sortByStat] ?? 0;
    const bv = b.displayValues[sortByStat] ?? 0;
    if (av === bv) return b.compositeScore - a.compositeScore;

    if (invert && direction === "DESC") return av - bv;
    if (invert && direction === "ASC") return bv - av;
    if (direction === "DESC") return bv - av;
    return av - bv;
  });
}

/**
 * Pełny pipeline porównania na już pobranych danych.
 */
export function buildStatsLabComparison(args: {
  players: FplLabPlayer[];
  historyByPlayerId: Map<number, FplLabPlayerGwHistory[]>;
  clubsById: Map<number, StatsLabClubInfo>;
  filter: StatsLabQueryFilter;
  maxGw: number;
}): StatsLabComparisonResult {
  const { players, historyByPlayerId, clubsById, filter, maxGw } = args;
  const gwRange = resolveEffectiveGwRange(filter.period, maxGw);
  const activeMetrics =
    filter.activeMetrics.length > 0
      ? filter.activeMetrics.slice(0, 8)
      : (["total_points", "bps"] as FplStatKey[]);

  const metricsForPercentiles = [
    ...new Set([...activeMetrics, filter.sortByStat]),
  ];

  const aggregated: AggregatedPlayerPeriodStats[] = [];
  const periodHistoryById = new Map<number, FplLabPlayerGwHistory[]>();

  for (const player of players) {
    if (!passesBaseFilters(player, filter)) continue;
    const hist = historyByPlayerId.get(player.fpl_element_id) ?? [];
    const periodHist = filterPeriodHistory(
      player.fpl_element_id,
      hist,
      filter.period,
      gwRange,
    );
    periodHistoryById.set(player.fpl_element_id, periodHist);

    const agg = aggregatePlayerStatsForPeriod(
      player,
      hist,
      filter.period,
      gwRange,
    );
    if (agg.minutes < filter.minMinutes) continue;
    aggregated.push(agg);
  }

  const displayById = new Map<number, Record<FplStatKey, number>>();
  for (const agg of aggregated) {
    displayById.set(
      agg.fpl_element_id,
      applyPer90ToDisplayValues(agg.rawValues, agg.minutes, filter.per90),
    );
  }

  const { percentilesById, poolAverages, compositeById } =
    computePercentilesForPool(aggregated, displayById, metricsForPercentiles);

  const playerById = new Map(players.map((p) => [p.fpl_element_id, p]));

  const analyzed: AnalyzedPlayerStats[] = aggregated.map((agg) => {
    const periodHist = periodHistoryById.get(agg.fpl_element_id) ?? [];
    const player = playerById.get(agg.fpl_element_id)!;
    const pointsBreakdown =
      periodHist.length > 0
        ? filter.period.mode === "FULL_SEASON"
          ? computeFullSeasonPointsBreakdown(player, periodHist)
          : computePointsBreakdownFromHistory(agg.element_type, periodHist)
        : estimatePointsBreakdownFromSnapshot(player);
    const streaks = computePlayerStreaks(agg.element_type, periodHist);

    return {
      ...agg,
      displayValues: displayById.get(agg.fpl_element_id) ?? emptyRawValues(),
      percentiles: percentilesById.get(agg.fpl_element_id) ?? emptyRawValues(),
      compositeScore: compositeById.get(agg.fpl_element_id) ?? 0,
      pointsBreakdown,
      streaks,
    };
  });

  const sortDef = getFplStatDefinition(filter.sortByStat);
  let selected: AnalyzedPlayerStats[];

  if (filter.selectedPlayerIds.length > 0) {
    const wanted = new Set(filter.selectedPlayerIds);
    selected = analyzed.filter((p) => wanted.has(p.fpl_element_id));
    selected = sortPlayers(
      selected,
      filter.sortByStat,
      filter.sortDirection,
      sortDef,
    );
  } else {
    const sorted = sortPlayers(
      analyzed,
      filter.sortByStat,
      filter.sortDirection,
      sortDef,
    );
    const limit = Math.max(1, Math.min(50, filter.limitPlayers || 10));
    selected = sorted.slice(0, limit);
  }

  const plottedPlayers: PlottedStatsLabPlayer[] = selected.map((p) => {
    const club = clubsById.get(p.fpl_team_id) ?? null;
    return {
      ...p,
      club,
      playerCode: Number(p.player_code ?? 0),
      clubPulseCode: Number(club?.pulse_code ?? 0),
    };
  });

  return {
    plottedPlayers,
    poolAverages,
    poolSize: analyzed.length,
    effectiveGwRange: gwRange,
    activeMetrics,
  };
}
