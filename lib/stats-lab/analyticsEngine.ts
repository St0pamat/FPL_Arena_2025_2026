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
  MatchByMatchTraceEntry,
  PlayerStreaks,
  PlayingTimeGwEntry,
  StreakDotState,
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
import type { StreakMetricKey } from "@/lib/stats-lab/i18n";

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
  /** Ślad mecz-po-meczu (audyt AI / reconcile). */
  matchTrace: MatchByMatchTraceEntry[];
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
    savesHit: [],
    bonusHit: [],
  };
}

function emptyStreaks(totalPeriodGws = 0): PlayerStreaks {
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
    maxSavesPointStreak: 0,
    currentSavesPointStreak: 0,
    maxBonusStreak: 0,
    currentBonusStreak: 0,
    returnConsistencyPct: 0,
    totalPeriodGws,
    appearancesCount: 0,
    sixtyPlusCount: 0,
    returnsCount: 0,
    playingTimeTimeline: [],
    timelineGameweeks: [],
    timelineDots: [],
    returnTimelineDots: [],
    goalTimelineDots: [],
    assistTimelineDots: [],
    gaTimelineDots: [],
    csTimelineDots: [],
    dcTimelineDots: [],
    sixtyMinTimelineDots: [],
    savesTimelineDots: [],
    bonusTimelineDots: [],
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
 * Próg DC (+2) wyłącznie z komponentów TEGO meczu (`row`):
 * DEF → CBI+TKL ≥ 10; MID/FWD → CBI+TKL+REC ≥ 12.
 * Bramkarze NIGDY nie dostają DC. Zakaz `defensive_contribution > 0`.
 */
export function matchDcThresholdHitInRow(
  elementType: FplPositionType,
  row: Pick<
    FplLabPlayerGwHistory,
    "clearances_blocks_interceptions" | "tackles" | "recoveries"
  >,
): boolean {
  if (elementType === 1) return false;
  const rowCbi = Number(row.clearances_blocks_interceptions) || 0;
  const rowTackles = Number(row.tackles) || 0;
  const rowRecoveries = Number(row.recoveries) || 0;
  return hitsDcThreshold(
    elementType,
    computeMatchDcComponents(elementType, rowCbi, rowTackles, rowRecoveries),
  );
}

/**
 * Flagi zwrotu FPL dla pojedynczego meczu (+ powody audytowe).
 * ZERO punktów za minuty / 60+. CS jako zwrot TYLKO GK/DEF (+4).
 */
export function computeMatchReturnFlags(
  elementType: FplPositionType,
  row: FplLabPlayerGwHistory,
): {
  goalHit: boolean;
  assistHit: boolean;
  csReturnHit: boolean;
  dcBonusHit: boolean;
  gkSaveHit: boolean;
  penSaveHit: boolean;
  bonusHit: boolean;
  hasReturn: boolean;
  returnReasons: string[];
  playingTimeStatus: PlayingTimeGwEntry["status"];
} {
  const mins = Number(row.minutes ?? 0);
  const playingTimeStatus: PlayingTimeGwEntry["status"] =
    mins >= 60 ? "SIXTY_PLUS" : mins >= 1 ? "SUB_UNDER_60" : "DNP_0";

  if (mins <= 0) {
    return {
      goalHit: false,
      assistHit: false,
      csReturnHit: false,
      dcBonusHit: false,
      gkSaveHit: false,
      penSaveHit: false,
      bonusHit: false,
      hasReturn: false,
      returnReasons: [],
      playingTimeStatus,
    };
  }

  const goalHit = (Number(row.goals_scored) || 0) > 0;
  const assistHit = (Number(row.assists) || 0) > 0;
  const csReturnHit =
    (elementType === 1 || elementType === 2) &&
    Number(row.clean_sheets) > 0 &&
    mins >= 60;
  const dcBonusHit = matchDcThresholdHitInRow(elementType, row);
  const gkSaveHit = elementType === 1 && (Number(row.saves) || 0) >= 3;
  const penSaveHit = (Number(row.penalties_saved) || 0) > 0;
  const bonusPts = Number(row.bonus) || 0;
  const bonusHit = bonusPts > 0;

  const returnReasons: string[] = [];
  if (goalHit) {
    const pts = elementType <= 2 ? 6 : elementType === 3 ? 5 : 4;
    returnReasons.push(`GOAL(+${pts})`);
  }
  if (assistHit) returnReasons.push("ASSIST(+3)");
  if (csReturnHit) returnReasons.push("CLEAN_SHEET(+4)");
  if (dcBonusHit) returnReasons.push("DC_THRESHOLD(+2)");
  if (gkSaveHit) returnReasons.push("GK_SAVES_3PLUS(+1)");
  if (penSaveHit) returnReasons.push("PENALTY_SAVE(+5)");
  if (bonusHit) returnReasons.push(`BONUS(+${bonusPts})`);

  const hasReturn =
    goalHit ||
    assistHit ||
    csReturnHit ||
    dcBonusHit ||
    gkSaveHit ||
    penSaveHit ||
    bonusHit;

  return {
    goalHit,
    assistHit,
    csReturnHit,
    dcBonusHit,
    gkSaveHit,
    penSaveHit,
    bonusHit,
    hasReturn,
    returnReasons,
    playingTimeStatus,
  };
}

/**
 * Zwrot FPL (`FPL Return`) — ZERO punktów za minuty / 60+.
 * CS jako zwrot TYLKO dla GK/DEF (+4 pkt). MID +1 CS = blank, nie zwrot.
 */
export function isFplReturnInMatch(
  elementType: FplPositionType,
  row: FplLabPlayerGwHistory,
): boolean {
  return computeMatchReturnFlags(elementType, row).hasReturn;
}

/** Buduje `matchByMatchTrace` z historii GW w okresie (ASC). */
export function buildMatchByMatchTrace(
  elementType: FplPositionType,
  historyRows: FplLabPlayerGwHistory[],
): MatchByMatchTraceEntry[] {
  return sortHistoryChronologically(historyRows).map((row) => {
    const mins = Number(row.minutes ?? 0);
    const cbi = Number(row.clearances_blocks_interceptions) || 0;
    const tackles = Number(row.tackles) || 0;
    const recoveries = Number(row.recoveries) || 0;
    const flags = computeMatchReturnFlags(elementType, row);
    const dcSum =
      elementType === 2
        ? cbi + tackles
        : elementType === 3 || elementType === 4
          ? cbi + tackles + recoveries
          : 0;

    return {
      gw: Number(row.gameweek),
      fixtureId: Number(row.fixture_id),
      wasHome: Boolean(row.was_home),
      minutes: mins,
      officialMatchPts: Number(row.total_points) || 0,
      rawStats: {
        goals: Number(row.goals_scored) || 0,
        assists: Number(row.assists) || 0,
        cs: Number(row.clean_sheets) || 0,
        gc: Number(row.goals_conceded) || 0,
        saves: Number(row.saves) || 0,
        cbi,
        tackles,
        recoveries,
        dcSum,
        bonus: Number(row.bonus) || 0,
        bps: Number(row.bps) || 0,
        yc: Number(row.yellow_cards) || 0,
        rc: Number(row.red_cards) || 0,
        xg: Number(row.expected_goals) || 0,
        xa: Number(row.expected_assists) || 0,
        xgi: Number(row.expected_goal_involvements) || 0,
        xgc: Number(row.expected_goals_conceded) || 0,
      },
      computedFlags: {
        playingTimeStatus: flags.playingTimeStatus,
        goalHit: flags.goalHit,
        assistHit: flags.assistHit,
        csReturnHit: flags.csReturnHit,
        dcBonusHit: flags.dcBonusHit,
        gkSaveHit: flags.gkSaveHit,
        penSaveHit: flags.penSaveHit,
        bonusHit: flags.bonusHit,
        hasReturn: flags.hasReturn,
        returnReasons: flags.returnReasons,
      },
    };
  });
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

const PLAYING_TIME_WINDOW = 12;

type GwHitBag = {
  minutes: number;
  returnHit: boolean;
  goalHit: boolean;
  assistHit: boolean;
  gaHit: boolean;
  csHit: boolean;
  dcHit: boolean;
  sixtyHit: boolean;
  savesHit: boolean;
  bonusHit: boolean;
};

function emptyGwHitBag(): GwHitBag {
  return {
    minutes: 0,
    returnHit: false,
    goalHit: false,
    assistHit: false,
    gaHit: false,
    csHit: false,
    dcHit: false,
    sixtyHit: false,
    savesHit: false,
    bonusHit: false,
  };
}

function hitOrMiss(played: boolean, hit: boolean): StreakDotState {
  if (!played) return "DNP";
  return hit ? "HIT" : "MISS";
}

/**
 * Serie / passy — max/current liczona po występach (`minutes > 0`).
 * Kropki UI: pełna oś GW badanego okresu (`HIT` | `MISS` | `DNP`).
 */
export function computePlayerStreaks(
  elementType: FplPositionType,
  historyRows: FplLabPlayerGwHistory[],
  gwRange?: StatsLabGwRange,
): PlayerStreaks {
  const sortedAll = sortHistoryChronologically(historyRows);
  const played = sortedAll.filter((row) => Number(row.minutes ?? 0) > 0);

  const [gwFrom, gwTo] = gwRange ?? [0, 0];
  const totalPeriodGws =
    gwFrom > 0 && gwTo >= gwFrom ? gwTo - gwFrom + 1 : 0;

  const byGw = new Map<number, GwHitBag>();
  for (const row of sortedAll) {
    const gw = Number(row.gameweek);
    const bag = byGw.get(gw) ?? emptyGwHitBag();
    const mins = Number(row.minutes ?? 0);
    bag.minutes += mins;
    if (mins > 0) {
      const goalHit = (Number(row.goals_scored) || 0) > 0;
      const assistHit = (Number(row.assists) || 0) > 0;
      const csHit =
        Number(row.clean_sheets) > 0 &&
        mins >= 60 &&
        (elementType === 1 || elementType === 2 || elementType === 3);
      const dcBonusHit = matchDcThresholdHitInRow(elementType, row);
      const gkSaveHit = elementType === 1 && (Number(row.saves) || 0) >= 3;
      const bonusHit = (Number(row.bonus) || 0) > 0;
      const ret = isFplReturnInMatch(elementType, row);
      bag.goalHit = bag.goalHit || goalHit;
      bag.assistHit = bag.assistHit || assistHit;
      bag.gaHit = bag.gaHit || goalHit || assistHit;
      bag.csHit = bag.csHit || csHit;
      bag.dcHit = bag.dcHit || dcBonusHit;
      bag.sixtyHit = bag.sixtyHit || mins >= 60;
      bag.savesHit = bag.savesHit || gkSaveHit;
      bag.bonusHit = bag.bonusHit || bonusHit;
      bag.returnHit = bag.returnHit || ret;
    }
    byGw.set(gw, bag);
  }

  const playingTimeTimeline: PlayingTimeGwEntry[] = [];
  const timelineGameweeks: number[] = [];
  if (totalPeriodGws > 0) {
    const startGw = Math.max(gwFrom, gwTo - PLAYING_TIME_WINDOW + 1);
    for (let gw = startGw; gw <= gwTo; gw += 1) {
      timelineGameweeks.push(gw);
      const minutes = byGw.get(gw)?.minutes ?? 0;
      const status =
        minutes >= 60
          ? "SIXTY_PLUS"
          : minutes >= 1
            ? "SUB_UNDER_60"
            : "DNP_0";
      playingTimeTimeline.push({ gw, status, minutes });
    }
  }

  const dnpAxis = (state: StreakDotState): StreakDotState[] =>
    timelineGameweeks.map(() => state);

  const appearancesCount = played.length;
  const sixtyPlusCount = played.filter(
    (r) => Number(r.minutes) >= 60,
  ).length;

  if (!timelineGameweeks.length) {
    return emptyStreaks(totalPeriodGws);
  }

  if (!played.length) {
    const dnp = dnpAxis("DNP");
    return {
      ...emptyStreaks(totalPeriodGws),
      playingTimeTimeline,
      timelineGameweeks,
      timelineDots: dnp,
      returnTimelineDots: dnp,
      goalTimelineDots: dnp,
      assistTimelineDots: dnp,
      gaTimelineDots: dnp,
      csTimelineDots: dnp,
      dcTimelineDots: dnp,
      sixtyMinTimelineDots: dnp,
      savesTimelineDots: dnp,
      bonusTimelineDots: dnp,
      recentFlags: {
        returnHit: dnp,
        goalHit: dnp,
        assistHit: dnp,
        goalOrAssistHit: dnp,
        cleanSheetHit: dnp,
        dcHit: dnp,
        sixtyMinHit: dnp,
        savesHit: dnp,
        bonusHit: dnp,
      },
    };
  }

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
  let maxSaves = 0;
  let curSaves = 0;
  let maxBonus = 0;
  let curBonus = 0;
  let returnsCount = 0;

  // Serie max/current — wyłącznie po kolejnych występach (DNP nie przerywa osi UI,
  // ale nie wchodzi do liczenia serii występów).
  for (const row of played) {
    const mins = Number(row.minutes ?? 0);
    const goalHit = (Number(row.goals_scored) || 0) > 0;
    const assistHit = (Number(row.assists) || 0) > 0;
    const gaHit = goalHit || assistHit;
    const csHit =
      Number(row.clean_sheets) > 0 &&
      mins >= 60 &&
      (elementType === 1 || elementType === 2 || elementType === 3);
    const dcBonusHit = matchDcThresholdHitInRow(elementType, row);
    const m60 = mins >= 60;
    const gkSaveHit = elementType === 1 && (Number(row.saves) || 0) >= 3;
    const bonusHit = (Number(row.bonus) || 0) > 0;
    const ret = isFplReturnInMatch(elementType, row);

    curReturn = ret ? curReturn + 1 : 0;
    maxReturn = Math.max(maxReturn, curReturn);
    if (ret) returnsCount += 1;

    curGoal = goalHit ? curGoal + 1 : 0;
    maxGoal = Math.max(maxGoal, curGoal);

    curAssist = assistHit ? curAssist + 1 : 0;
    maxAssist = Math.max(maxAssist, curAssist);

    curGA = gaHit ? curGA + 1 : 0;
    maxGA = Math.max(maxGA, curGA);

    curCs = csHit ? curCs + 1 : 0;
    maxCs = Math.max(maxCs, curCs);

    curDc = dcBonusHit ? curDc + 1 : 0;
    maxDc = Math.max(maxDc, curDc);

    cur60 = m60 ? cur60 + 1 : 0;
    max60 = Math.max(max60, cur60);

    curSaves = gkSaveHit ? curSaves + 1 : 0;
    maxSaves = Math.max(maxSaves, curSaves);

    curBonus = bonusHit ? curBonus + 1 : 0;
    maxBonus = Math.max(maxBonus, curBonus);
  }

  const returnTimelineDots: StreakDotState[] = [];
  const goalTimelineDots: StreakDotState[] = [];
  const assistTimelineDots: StreakDotState[] = [];
  const gaTimelineDots: StreakDotState[] = [];
  const csTimelineDots: StreakDotState[] = [];
  const dcTimelineDots: StreakDotState[] = [];
  const sixtyMinTimelineDots: StreakDotState[] = [];
  const savesTimelineDots: StreakDotState[] = [];
  const bonusTimelineDots: StreakDotState[] = [];

  for (const gw of timelineGameweeks) {
    const bag = byGw.get(gw);
    const playedGw = Boolean(bag && bag.minutes > 0);
    returnTimelineDots.push(hitOrMiss(playedGw, Boolean(bag?.returnHit)));
    goalTimelineDots.push(hitOrMiss(playedGw, Boolean(bag?.goalHit)));
    assistTimelineDots.push(hitOrMiss(playedGw, Boolean(bag?.assistHit)));
    gaTimelineDots.push(hitOrMiss(playedGw, Boolean(bag?.gaHit)));
    csTimelineDots.push(hitOrMiss(playedGw, Boolean(bag?.csHit)));
    dcTimelineDots.push(hitOrMiss(playedGw, Boolean(bag?.dcHit)));
    sixtyMinTimelineDots.push(hitOrMiss(playedGw, Boolean(bag?.sixtyHit)));
    savesTimelineDots.push(hitOrMiss(playedGw, Boolean(bag?.savesHit)));
    bonusTimelineDots.push(hitOrMiss(playedGw, Boolean(bag?.bonusHit)));
  }

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
    maxSavesPointStreak: maxSaves,
    currentSavesPointStreak: curSaves,
    maxBonusStreak: maxBonus,
    currentBonusStreak: curBonus,
    returnConsistencyPct: Math.round((returnsCount / played.length) * 100),
    totalPeriodGws,
    appearancesCount,
    sixtyPlusCount,
    returnsCount,
    playingTimeTimeline,
    timelineGameweeks,
    timelineDots: returnTimelineDots,
    returnTimelineDots,
    goalTimelineDots,
    assistTimelineDots,
    gaTimelineDots,
    csTimelineDots,
    dcTimelineDots,
    sixtyMinTimelineDots,
    savesTimelineDots,
    bonusTimelineDots,
    recentFlags: {
      returnHit: returnTimelineDots,
      goalHit: goalTimelineDots,
      assistHit: assistTimelineDots,
      goalOrAssistHit: gaTimelineDots,
      cleanSheetHit: csTimelineDots,
      dcHit: dcTimelineDots,
      sixtyMinHit: sixtyMinTimelineDots,
      savesHit: savesTimelineDots,
      bonusHit: bonusTimelineDots,
    },
  };
}

/** Min. liczba występów do TOP N w widoku pass (rezerwowi 3/3 nie fałszują podium). */
export function minAppearancesForStreakTopN(totalPeriodGws: number): number {
  if (totalPeriodGws <= 0) return 1;
  if (totalPeriodGws < 4) return Math.min(3, totalPeriodGws);
  return Math.max(4, Math.ceil(totalPeriodGws * 0.65));
}

/**
 * GWP / PPM / Form / V(S) / V(F) z przefiltrowanej historii GW
 * (nie ze snapshotu sezonowego), gdy period ≠ FULL_SEASON.
 */
function applyPeriodDerivedOverviewMetrics(
  raw: Record<FplStatKey, number>,
  player: FplLabPlayer,
  periodHistory: FplLabPlayerGwHistory[],
  isFilteredPeriod: boolean,
): void {
  const priceM = Math.max(0.1, Number(player.now_cost ?? 0) / 10);
  const periodTotalPoints = Number(raw.total_points ?? 0);
  const playerGwRows = [...periodHistory].sort(
    (a, b) => Number(a.gameweek) - Number(b.gameweek),
  );
  const appearancesInPeriod = playerGwRows.filter(
    (r) => Number(r.minutes ?? 0) > 0,
  ).length;

  if (!isFilteredPeriod) {
    // FULL_SEASON: zachowaj event_points / form / value_* ze snapshotu;
    // PPM / V(S) — snapshot z fallbackiem z historii / ceny.
    if (appearancesInPeriod > 0) {
      raw.points_per_game = Number(
        (periodTotalPoints / appearancesInPeriod).toFixed(1),
      );
    } else {
      raw.points_per_game = Number(
        Number(player.points_per_game ?? 0).toFixed(1),
      );
    }
    const snapVs = Number(player.value_season ?? 0);
    raw.value_season = Number(
      (snapVs || periodTotalPoints / priceM).toFixed(1),
    );
    return;
  }

  // ── Filtrowany okres (HOME/AWAY/LAST_N/CUSTOM) ──
  if (playerGwRows.length === 0) {
    raw.event_points = 0;
    raw.points_per_game = 0;
    raw.form = 0;
    raw.value_season = 0;
    raw.value_form = 0;
    raw.transfers_in = 0;
    raw.transfers_out = 0;
    raw.transfers_in_event = 0;
    raw.transfers_out_event = 0;
    raw.net_transfers_gw = 0;
    // dreamteam_count — brak flagi DT w historii GW → zostaje ze snapshotu
    return;
  }

  // GWP = suma punktów z ostatniej kolejki obecnej w filtrze
  const maxGw = Number(playerGwRows[playerGwRows.length - 1]!.gameweek);
  let eventPoints = 0;
  for (const row of playerGwRows) {
    if (Number(row.gameweek) === maxGw) {
      eventPoints += Number(row.total_points ?? 0);
    }
  }
  raw.event_points = eventPoints;

  // PPM = pkt / występy (minutes > 0) w okresie
  raw.points_per_game =
    appearancesInPeriod > 0
      ? Number((periodTotalPoints / appearancesInPeriod).toFixed(1))
      : 0;

  // V(S) = pkt okresu / £m
  raw.value_season = Number((periodTotalPoints / priceM).toFixed(1));

  // Form = średnia pkt z ostatnich ≤4 kolejek w filtrze; V(F) = form / £m
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
  const sumPts = formRows.reduce(
    (acc, row) => acc + Number(row.total_points ?? 0),
    0,
  );
  const countGws = uniqueGwsDesc.length;
  const computedForm =
    countGws > 0 ? Number((sumPts / countGws).toFixed(1)) : 0;
  raw.form = computedForm;
  raw.value_form = Number((computedForm / priceM).toFixed(1));

  // Transfery z historii GW (1 wpis na kolejkę — bez podwójnego liczenia DGW)
  applyPeriodDerivedTransferMetrics(raw, playerGwRows, maxGw);
}

/**
 * TI/TO sezonowe w okresie = suma po unikalnych GW;
 * TI/TO/NT GW = wartości z ostatniej kolejki badanego okresu.
 * (Historia GW ma `transfers_in` / `transfers_out` / `transfers_balance`.)
 */
function applyPeriodDerivedTransferMetrics(
  raw: Record<FplStatKey, number>,
  playerGwRows: FplLabPlayerGwHistory[],
  maxGw: number,
): void {
  const byGw = new Map<
    number,
    { ti: number; to: number; bal: number }
  >();
  for (const row of playerGwRows) {
    const gw = Number(row.gameweek);
    if (byGw.has(gw)) continue;
    const ti = Number(row.transfers_in ?? 0) || 0;
    const to = Number(row.transfers_out ?? 0) || 0;
    const bal = Number(row.transfers_balance ?? 0) || 0;
    byGw.set(gw, { ti, to, bal });
  }

  let sumIn = 0;
  let sumOut = 0;
  for (const t of byGw.values()) {
    sumIn += t.ti;
    sumOut += t.to;
  }
  raw.transfers_in = sumIn;
  raw.transfers_out = sumOut;

  const last = byGw.get(maxGw);
  if (last) {
    raw.transfers_in_event = last.ti;
    raw.transfers_out_event = last.to;
    raw.net_transfers_gw =
      last.bal !== 0 ? last.bal : last.ti - last.to;
  } else {
    raw.transfers_in_event = 0;
    raw.transfers_out_event = 0;
    raw.net_transfers_gw = 0;
  }
}

function applyComputedRawValues(
  raw: Record<FplStatKey, number>,
  elementType: FplPositionType,
  player: FplLabPlayer,
  periodHistory: FplLabPlayerGwHistory[],
  isFilteredPeriod = false,
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

  applyPeriodDerivedOverviewMetrics(
    raw,
    player,
    periodHistory,
    isFilteredPeriod,
  );
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
    false,
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
 * Agregacja z historii GW + snapshot (cena / Sel% / transfery z snapshotu;
 * GWP/PPM/form/V(S)/V(F) liczone z okresu gdy period ≠ FULL_SEASON).
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
    true,
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

/** Metryki zawsze z 1 miejscem po przecinku (nigdy Per 90, nigdy int). */
const ALWAYS_ONE_DECIMAL_KEYS = new Set<FplStatKey>([
  "points_per_game",
  "form",
  "value_season",
  "value_form",
]);

/** Transfery — kompaktowy zapis k / M na pigułkach i w eksporcie. */
const TRANSFER_COMPACT_KEYS = new Set<FplStatKey>([
  "transfers_in",
  "transfers_out",
  "transfers_in_event",
  "transfers_out_event",
  "net_transfers_gw",
]);

/** Per 90 — wolumeny / indeksy Opta: zawsze 1 dp (spójne z chartTheme). */
const PER90_OPTA_ONE_DP = new Set<FplStatKey>([
  "defensive_contributions_total",
  "clearances_blocks_interceptions",
  "tackles",
  "recoveries",
  "bps",
  "threat",
  "creativity",
  "influence",
  "ict_index",
]);

/** Per 90 — punkty FPL / expected / DC Mecz·Pkt: zawsze 2 dp. */
const PER90_POINTS_TWO_DP = new Set<FplStatKey>([
  "dc_bonus_matches",
  "dc_bonus_points",
  "total_points",
  "goals_scored",
  "assists",
  "goals_assists",
  "expected_goals",
  "expected_assists",
  "expected_goal_involvements",
  "expected_goals_conceded",
  "goals_conceded",
  "bonus",
  "saves",
  "goals_vs_xg",
]);

function formatCompactTransfer(key: FplStatKey, value: number): string {
  const abs = Math.abs(value);
  let sign = "";
  if (value < 0) sign = "-";
  else if (key === "net_transfers_gw" && value > 0) sign = "+";

  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${Math.round(abs)}`;
}

/**
 * Formatowanie wartości statystyki (1:1 z chartTheme.formatMetricDisplayValue).
 * Totals: decimals:0 → int (DC 91, DC Mecz 5, DC Pkt 10).
 * Per 90 Opta → zawsze 1 dp; punkty/xG/DC Pkt → zawsze 2 dp.
 * Transfery: kompaktowo (+141.6k / -21.5k / 1.20M).
 */
export function formatStatDisplay(
  key: FplStatKey,
  value: number,
  per90 = false,
): string {
  if (key === "now_cost") return `£${(value / 10).toFixed(1)}m`;
  if (key === "selected_by_percent") return `${value.toFixed(1)}%`;
  if (TRANSFER_COMPACT_KEYS.has(key)) {
    return formatCompactTransfer(key, value);
  }
  if (ALWAYS_ONE_DECIMAL_KEYS.has(key)) {
    return value.toFixed(1);
  }
  const def = getFplStatDefinition(key);
  if (per90 && def?.supportsPer90) {
    let formatted: string;
    if (PER90_OPTA_ONE_DP.has(key)) {
      formatted = value.toFixed(1);
    } else if (PER90_POINTS_TWO_DP.has(key)) {
      formatted = value.toFixed(2);
    } else {
      formatted = value.toFixed(2);
    }
    if (key === "goals_vs_xg" && value > 0 && !formatted.startsWith("+")) {
      return `+${formatted}`;
    }
    return formatted;
  }
  const decimals = def?.decimals ?? 1;
  let formatted =
    decimals === 0 ? String(Math.round(value)) : value.toFixed(decimals);
  if (key === "goals_vs_xg" && value > 0 && !formatted.startsWith("+")) {
    formatted = `+${formatted}`;
  }
  return formatted;
}

function roundPoolAverage(
  meanVal: number,
  key: FplStatKey,
  per90: boolean,
): number {
  const def = getFplStatDefinition(key);
  if (ALWAYS_ONE_DECIMAL_KEYS.has(key)) {
    return Number(meanVal.toFixed(1));
  }
  if (per90 && def?.supportsPer90) {
    if (PER90_OPTA_ONE_DP.has(key)) {
      return Number(meanVal.toFixed(1));
    }
    return Number(meanVal.toFixed(2));
  }
  const decimals = def?.decimals ?? 2;
  return Number(meanVal.toFixed(decimals));
}

export function applyPer90ToDisplayValues(
  rawValues: Record<FplStatKey, number>,
  minutes: number,
  per90: boolean,
): Record<FplStatKey, number> {
  const display = emptyRawValues();
  for (const def of FPL_STAT_DEFINITIONS) {
    const raw = rawValues[def.key] ?? 0;
    // PPG / form / value_* — zawsze 1 dp; nigdy (val/minutes)*90
    if (ALWAYS_ONE_DECIMAL_KEYS.has(def.key)) {
      display[def.key] = roundTo(raw, 1);
      continue;
    }
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

  // Lider puli (najlepsza wartość w skali) → zawsze P100
  if (target === Math.max(...scored)) {
    return 100;
  }

  let worse = 0;
  let equal = 0;
  for (const s of scored) {
    if (s < target) worse += 1;
    else if (s === target) equal += 1;
  }
  const rank = worse + (equal > 0 ? (equal - 1) / 2 : 0);
  return roundTo((rank / (n - 1)) * 100, 1);
}

/** Metryki signed / invert — flat pool → P50 (nie P100 za same zera). */
function allowsSignedOrInvertMetric(
  key: FplStatKey,
  invert: boolean,
): boolean {
  return (
    invert ||
    key === "goals_vs_xg" ||
    key === "net_transfers_gw" ||
    key === "price_change_gw"
  );
}

/**
 * Percentyl dla cechy bez wariancji w puli (poolMin === poolMax, n > 1):
 * - dodatnia, max === 0 → 0
 * - invertScale / signed → 50
 * - dodatnia flat ≠ 0 → 50 (nikt się nie wyróżnił)
 */
function flatPoolPercentileValue(
  key: FplStatKey,
  invert: boolean,
  poolMax: number,
): number {
  if (allowsSignedOrInvertMetric(key, invert)) return 50;
  if (poolMax === 0) return 0;
  return 50;
}

/**
 * Percentyle + średnie puli dla WSZYSTKICH metryk z katalogu.
 * `compositeScore` = średnia percentyli wyłącznie z `compositeMetrics` (activeMetrics),
 * z pominięciem cech o zerowej wariancji w comparisonPool (poolMin === poolMax).
 */
export function computePercentilesForPool(
  pool: AggregatedPlayerPeriodStats[],
  displayById: Map<number, Record<FplStatKey, number>>,
  metricsForPool: FplStatKey[],
  compositeMetrics?: FplStatKey[],
  /** Gdy true — poolAverages dla supportsPer90 zaokrąglaj jak Per 90 (2/1 dp), nie def.decimals. */
  per90 = false,
): {
  percentilesById: Map<number, Record<FplStatKey, number>>;
  poolAverages: Record<FplStatKey, number>;
  compositeById: Map<number, number>;
} {
  const uniqueMetrics = [...new Set(metricsForPool)];
  const compositeKeys = [
    ...new Set(compositeMetrics?.length ? compositeMetrics : uniqueMetrics),
  ];
  const poolAverages = emptyRawValues();
  const percentilesById = new Map<number, Record<FplStatKey, number>>();
  const compositeById = new Map<number, number>();
  /** Cechy bez różnic w puli — nie wchodzą do średniej OCENY. */
  const zeroVarianceKeys = new Set<FplStatKey>();

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
    // Per 90: nie używaj def.decimals=0 (gole/asysty → 0.00 zamiast 0.24)
    poolAverages[key] = roundPoolAverage(avg, key, per90);

    const minV = values.length ? Math.min(...values) : 0;
    const maxV = values.length ? Math.max(...values) : 0;
    const zeroVariance = values.length > 0 && minV === maxV;
    if (zeroVariance) zeroVarianceKeys.add(key);

    const allowsNegative = allowsSignedOrInvertMetric(key, invert);

    for (let i = 0; i < pool.length; i++) {
      const id = pool[i].fpl_element_id;
      const val = values[i];
      const row = percentilesById.get(id)!;
      // Pula > 1 i brak wariancji → bez sztucznych P100 (OG=0, PR/PF=0, …)
      if (zeroVariance && pool.length > 1) {
        row[key] = flatPoolPercentileValue(key, invert, maxV);
        continue;
      }
      // Dodatnie metryki z val<=0 → P0 (bez fałszywego P15 za „równe zera”)
      if (!allowsNegative && val <= 0) {
        row[key] = 0;
        continue;
      }
      row[key] = computePercentileRank(values, val, invert);
    }
  }

  // OCENA: tylko cechy różnicujące (poolMin !== poolMax)
  const liveCompositeKeys = compositeKeys.filter(
    (k) => !zeroVarianceKeys.has(k),
  );

  for (const player of pool) {
    const pcts = percentilesById.get(player.fpl_element_id)!;
    if (!compositeKeys.length) {
      compositeById.set(player.fpl_element_id, 0);
      continue;
    }
    // Wszystkie activeMetrics flat → neutralne 50 (unikaj /0 i sztucznego P100)
    if (!liveCompositeKeys.length) {
      compositeById.set(player.fpl_element_id, 50);
      continue;
    }
    let sum = 0;
    for (const key of liveCompositeKeys) sum += pcts[key] ?? 0;
    compositeById.set(
      player.fpl_element_id,
      roundTo(sum / liveCompositeKeys.length, 1),
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

/**
 * Sort całej puli po sortByStat — naturalny porządek liczbowy.
 * - per90 / display: `displayValues[sortByStat]`
 * - !per90 lub forceRaw: `rawValues[sortByStat]`
 * DESC = największa wartość pierwsza (2 OG przed 0); ASC = odwrotnie.
 * `invertScale` NIE odwraca sortu (tylko percentyle / OCENA).
 * Tie-break: compositeScore DESC → rawValues.total_points DESC.
 * Po .slice(Top N) kolejności już nie zmieniać.
 */
function sortPlayers(
  players: AnalyzedPlayerStats[],
  sortByStat: FplStatKey,
  direction: StatsLabSortDirection,
  _def: FplStatDefinition | undefined,
  valueSource: "display" | "raw",
): AnalyzedPlayerStats[] {
  return [...players].sort((a, b) => {
    const av =
      valueSource === "raw"
        ? (a.rawValues[sortByStat] ?? 0)
        : (a.displayValues[sortByStat] ?? 0);
    const bv =
      valueSource === "raw"
        ? (b.rawValues[sortByStat] ?? 0)
        : (b.displayValues[sortByStat] ?? 0);

    if (av !== bv) {
      return direction === "DESC" ? bv - av : av - bv;
    }

    const compositeDiff = b.compositeScore - a.compositeScore;
    if (compositeDiff !== 0) return compositeDiff;

    return (
      (Number(b.rawValues.total_points ?? 0) -
        Number(a.rawValues.total_points ?? 0))
    );
  });
}

/**
 * Sortowanie po serii + kaskada tie-breaker:
 * 1) streakSortKey → 2) returnConsistencyPct → 3) returnsCount
 * → 4) maxReturnStreak → 5) currentReturnStreak → 6) total_points
 */
export function comparePlayersByStreak(
  a: Pick<AnalyzedPlayerStats, "streaks" | "rawValues">,
  b: Pick<AnalyzedPlayerStats, "streaks" | "rawValues">,
  streakSortKey: StreakMetricKey,
  direction: StatsLabSortDirection = "DESC",
): number {
  const mul = direction === "DESC" ? 1 : -1;
  const primary =
    (Number(b.streaks[streakSortKey] ?? 0) -
      Number(a.streaks[streakSortKey] ?? 0)) *
    mul;
  if (primary !== 0) return primary;

  if (streakSortKey !== "returnConsistencyPct") {
    const consistency =
      (Number(b.streaks.returnConsistencyPct ?? 0) -
        Number(a.streaks.returnConsistencyPct ?? 0)) *
      mul;
    if (consistency !== 0) return consistency;
  }

  const returns =
    (Number(b.streaks.returnsCount ?? 0) -
      Number(a.streaks.returnsCount ?? 0)) *
    mul;
  if (returns !== 0) return returns;

  const maxRet =
    (Number(b.streaks.maxReturnStreak ?? 0) -
      Number(a.streaks.maxReturnStreak ?? 0)) *
    mul;
  if (maxRet !== 0) return maxRet;

  const curRet =
    (Number(b.streaks.currentReturnStreak ?? 0) -
      Number(a.streaks.currentReturnStreak ?? 0)) *
    mul;
  if (curRet !== 0) return curRet;

  return (
    (Number(b.rawValues.total_points ?? 0) -
      Number(a.rawValues.total_points ?? 0)) *
    mul
  );
}

export function sortPlayersByStreak(
  players: AnalyzedPlayerStats[],
  streakSortKey: StreakMetricKey,
  direction: StatsLabSortDirection = "DESC",
): AnalyzedPlayerStats[] {
  return [...players].sort((a, b) =>
    comparePlayersByStreak(a, b, streakSortKey, direction),
  );
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

  /** Percentyle / średnie puli — cały katalog metryk; composite tylko z activeMetrics. */
  const metricsForPercentiles = FPL_STAT_DEFINITIONS.map((d) => d.key);
  const selectedWanted = new Set(filter.selectedPlayerIds);

  /** Wszyscy po filtrach bazowych (pozycja/klub/cena) — bez progu minut. */
  const allEligible: AggregatedPlayerPeriodStats[] = [];
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
    allEligible.push(agg);
  }

  /**
   * Pula odniesienia percentyli / Composite — ZAWSZE z minMinutes,
   * także gdy selectedPlayerIds.length > 0 (ręczny wybór).
   */
  const comparisonPool = allEligible.filter(
    (a) => a.minutes >= filter.minMinutes,
  );
  const comparisonIds = new Set(comparisonPool.map((a) => a.fpl_element_id));

  /** Do analizy: cała comparisonPool + ręcznie wybrani spoza progu minut. */
  const analysisAggs: AggregatedPlayerPeriodStats[] = [...comparisonPool];
  for (const agg of allEligible) {
    if (
      selectedWanted.has(agg.fpl_element_id) &&
      !comparisonIds.has(agg.fpl_element_id)
    ) {
      analysisAggs.push(agg);
    }
  }

  const displayById = new Map<number, Record<FplStatKey, number>>();
  for (const agg of analysisAggs) {
    displayById.set(
      agg.fpl_element_id,
      applyPer90ToDisplayValues(agg.rawValues, agg.minutes, filter.per90),
    );
  }

  const { percentilesById, poolAverages, compositeById } =
    computePercentilesForPool(
      comparisonPool,
      displayById,
      metricsForPercentiles,
      activeMetrics,
      filter.per90,
    );

  // Ręcznie wybrani poniżej minMinutes — percentyle względem comparisonPool
  for (const agg of analysisAggs) {
    if (comparisonIds.has(agg.fpl_element_id)) continue;
    const display = displayById.get(agg.fpl_element_id)!;
    const pctRow = emptyRawValues();
    const zeroVarianceKeys = new Set<FplStatKey>();
    for (const key of metricsForPercentiles) {
      const def = getFplStatDefinition(key);
      const invert = Boolean(def?.invertScale);
      const allowsNegative = allowsSignedOrInvertMetric(key, invert);
      const poolVals = comparisonPool.map(
        (p) => displayById.get(p.fpl_element_id)?.[key] ?? 0,
      );
      const minV = poolVals.length ? Math.min(...poolVals) : 0;
      const maxV = poolVals.length ? Math.max(...poolVals) : 0;
      const zeroVariance = poolVals.length > 0 && minV === maxV;
      if (zeroVariance) zeroVarianceKeys.add(key);
      const val = display[key] ?? 0;
      if (zeroVariance && comparisonPool.length > 1) {
        pctRow[key] = flatPoolPercentileValue(key, invert, maxV);
        continue;
      }
      if (!allowsNegative && val <= 0) {
        pctRow[key] = 0;
        continue;
      }
      pctRow[key] = computePercentileRank(poolVals, val, invert);
    }
    percentilesById.set(agg.fpl_element_id, pctRow);
    const liveCompositeKeys = activeMetrics.filter(
      (k) => !zeroVarianceKeys.has(k),
    );
    if (!activeMetrics.length) {
      compositeById.set(agg.fpl_element_id, 0);
    } else if (!liveCompositeKeys.length) {
      compositeById.set(agg.fpl_element_id, 50);
    } else {
      let sum = 0;
      for (const key of liveCompositeKeys) sum += pctRow[key] ?? 0;
      compositeById.set(
        agg.fpl_element_id,
        roundTo(sum / liveCompositeKeys.length, 1),
      );
    }
  }

  const playerById = new Map(players.map((p) => [p.fpl_element_id, p]));

  const analyzed: AnalyzedPlayerStats[] = analysisAggs.map((agg) => {
    const periodHist = periodHistoryById.get(agg.fpl_element_id) ?? [];
    const player = playerById.get(agg.fpl_element_id)!;
    const pointsBreakdown =
      periodHist.length > 0
        ? filter.period.mode === "FULL_SEASON"
          ? computeFullSeasonPointsBreakdown(player, periodHist)
          : computePointsBreakdownFromHistory(agg.element_type, periodHist)
        : estimatePointsBreakdownFromSnapshot(player);
    const streaks = computePlayerStreaks(
      agg.element_type,
      periodHist,
      gwRange,
    );
    const matchTrace = buildMatchByMatchTrace(agg.element_type, periodHist);

    return {
      ...agg,
      displayValues: displayById.get(agg.fpl_element_id) ?? emptyRawValues(),
      percentiles: percentilesById.get(agg.fpl_element_id) ?? emptyRawValues(),
      compositeScore: compositeById.get(agg.fpl_element_id) ?? 0,
      pointsBreakdown,
      streaks,
      matchTrace,
    };
  });

  const sortDef = getFplStatDefinition(filter.sortByStat);
  let selected: AnalyzedPlayerStats[];
  const streakSortKey = filter.streakSortKey;
  const useStreakSort = Boolean(streakSortKey);
  // Wyłącznie jawne `=== true` — undefined/false NIGDY nie sortuje po composite.
  const useCompositeSort = filter.sortByComposite === true && !useStreakSort;
  // POINTS_BREAKDOWN / force: raw; inaczej per90→display, !per90→raw
  const sortValueSource: "display" | "raw" =
    filter.sortByRawValues === true || filter.per90 !== true
      ? "raw"
      : "display";
  const totalPeriodGws =
    gwRange[0] > 0 && gwRange[1] >= gwRange[0]
      ? gwRange[1] - gwRange[0] + 1
      : 0;
  const minApps = minAppearancesForStreakTopN(totalPeriodGws);

  function sortByCompositeScore(
    list: AnalyzedPlayerStats[],
  ): AnalyzedPlayerStats[] {
    const mul = filter.sortDirection === "DESC" ? 1 : -1;
    return [...list].sort((a, b) => {
      const primary =
        (b.compositeScore - a.compositeScore) * mul;
      if (primary !== 0) return primary;
      return (
        (Number(b.rawValues.total_points ?? 0) -
          Number(a.rawValues.total_points ?? 0)) *
        mul
      );
    });
  }

  if (filter.selectedPlayerIds.length > 0) {
    const wanted = new Set(filter.selectedPlayerIds);
    selected = analyzed.filter((p) => wanted.has(p.fpl_element_id));
    selected = useStreakSort
      ? sortPlayersByStreak(
          selected,
          streakSortKey!,
          filter.sortDirection,
        )
      : useCompositeSort
        ? sortByCompositeScore(selected)
        : sortPlayers(
            selected,
            filter.sortByStat,
            filter.sortDirection,
            sortDef,
            sortValueSource,
          );
  } else {
    // AUTO Top N: sort całej comparisonPool → dopiero potem slice.
    const pool = useStreakSort
      ? analyzed.filter((p) => p.streaks.appearancesCount >= minApps)
      : analyzed;
    const sorted = useStreakSort
      ? sortPlayersByStreak(pool, streakSortKey!, filter.sortDirection)
      : useCompositeSort
        ? sortByCompositeScore(pool)
        : sortPlayers(
            pool,
            filter.sortByStat,
            filter.sortDirection,
            sortDef,
            sortValueSource,
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
    poolSize: comparisonPool.length,
    effectiveGwRange: gwRange,
    activeMetrics,
  };
}
