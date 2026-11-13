/**
 * FPL Planner — silnik xPts v1 + krocząca walidacja R1–R12.
 * Pure / deterministyczny (bez I/O DB). Importy z projectionsEngine / fplEntryApi tylko do odczytu.
 */

import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import type {
  FplLabFixtureRow,
  FplLabPlayer,
  FplLabPlayerGwHistory,
  FplPositionType,
} from "@/lib/stats-lab/types";
import {
  computeSellingPriceTenths,
  willNextPriceDropAffectSellingPrice,
  type ReconstructedEntryState,
  type ReconstructedSquadPick,
  type UsedChipRecord,
} from "@/lib/stats-lab/fplEntryApi";
import {
  clamp,
  fdrLevel,
  type ProjectionsBuildResult,
  type ProjectionsFixturePrediction,
  type ProjectionsFdrLevel,
} from "@/lib/stats-lab/projectionsEngine";
import type { PlannerChipType } from "@/lib/stats-lab/plannerI18n";

/* ─────────────────────────────────────────────────
 * Constants — xPts v1
 * ───────────────────────────────────────────────── */

const MINUTES_WEIGHTS = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5] as const;
const MINUTES_WINDOW = 6;
const MINUTES_PRIOR_M0 = 900;
const DC_PRIOR_GAMES = 6;
const TEAM_XG90_FLOOR = 0.6;
const SHARE_CLAMP_HI = 0.65;
const DEFAULT_M60 = 87;
const DEFAULT_M1 = 25;
const DEFAULT_MAX_FT = 5;
const CLUB_LIMIT = 3;

type RateKey = "xG" | "xA" | "saves" | "bonus" | "yellow";

const POS_RATE_PRIORS: Record<
  FplPositionType,
  Record<RateKey, number>
> = {
  1: { xG: 0.01, xA: 0.01, saves: 3.0, bonus: 0.2, yellow: 0.05 },
  2: { xG: 0.08, xA: 0.06, saves: 0, bonus: 0.25, yellow: 0.12 },
  3: { xG: 0.18, xA: 0.15, saves: 0, bonus: 0.3, yellow: 0.1 },
  4: { xG: 0.35, xA: 0.12, saves: 0, bonus: 0.35, yellow: 0.08 },
};

const POS_DC_PRIOR: Record<FplPositionType, number> = {
  1: 0,
  2: 0.35,
  3: 0.25,
  4: 0.1,
};

/* ─────────────────────────────────────────────────
 * Public types — plan state
 * ───────────────────────────────────────────────── */

export type PlannedTransfer = {
  id: string;
  gw: number;
  outElementId: number;
  inElementId: number;
  outSellingPriceTenths: number;
  inPurchasePriceTenths: number;
  hasConflict?: boolean;
};

export type GwPlanDecision = {
  gw: number;
  transfers: PlannedTransfer[];
  activeChip: PlannerChipType | null;
  lineupOrder?: number[];
  captainElementId?: number | null;
  viceCaptainElementId?: number | null;
};

export type ManualOverridesState = {
  initialBankTenths?: number | null;
  initialFreeTransfers?: number | null;
  customSellingPricesTenths?: Record<number, number>;
  ftTopUps?: Record<number, number>;
};

export type SquadPlayerState = {
  elementId: number;
  slot: number;
  purchasePriceTenths: number;
  nowCostTenths: number;
  sellingPriceTenths: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
};

export type FormationErrorKey =
  | "formationErrorMinDef"
  | "formationErrorMinMid"
  | "formationErrorMinFwd"
  | "formationErrorGkOnly";

export type PlannerValidationErrorKey =
  | FormationErrorKey
  | "clubLimitExceeded"
  | "clubLimitPreExistingMustFix"
  | "negativeBankError"
  | "transferConflictError";

export type EvaluatedGwState = {
  gw: number;
  squad: SquadPlayerState[];
  bankTenths: number;
  ftAvailable: number;
  ftNext: number;
  activeChip: PlannerChipType | null;
  transfers: PlannedTransfer[];
  validTransfersCount: number;
  hitsCount: number;
  transferCostPts: number;
  captainElementId: number | null;
  viceCaptainElementId: number | null;
  isValid: boolean;
  errors: Array<{ key: PlannerValidationErrorKey; detail?: string }>;
  warnings: string[];
  grossXPts: number;
  netXPts: number;
  /** Stan przed Free Hitem (do rollbacku R8). */
  preFreeHitSnapshot?: {
    squad: SquadPlayerState[];
    bankTenths: number;
  } | null;
};

export type PlannerMatchContext = {
  fixtureId: number;
  gameweek: number;
  teamId: number;
  opponentTeamId: number;
  opponentShortName: string;
  tickerLabel: string;
  isHome: boolean;
  lambdaTeam: number;
  lambdaOpp: number;
  csProbTeam: number;
  fdrLevel: ProjectionsFdrLevel;
};

export type PlayerMatchXPtsBreakdown = {
  fixtureId: number;
  matchXPts: number;
  expectedMinutes: number;
  p0: number;
  p60: number;
  p1: number;
  opponentShortName: string;
  tickerLabel: string;
  isHome: boolean;
  fdrLevel: ProjectionsFdrLevel;
};

export type PlayerGwProjection = {
  elementId: number;
  gameweek: number;
  xPts: number;
  expectedMinutes: number;
  p0: number;
  p60: number;
  p1: number;
  isBlank: boolean;
  isDouble: boolean;
  fixtures: PlayerMatchXPtsBreakdown[];
};

export type ClubFinishedFixture = {
  fixtureId: number;
  gameweek: number;
  kickoffMs: number;
};

export type PlannerXPtsContext = {
  playersById: Map<number, FplLabPlayer>;
  historyByPlayerId: Map<number, FplLabPlayerGwHistory[]>;
  /** Predykcje Dixona-Colesa po fixtureId. */
  fixturePredictions: Map<number, ProjectionsFixturePrediction>;
  /** Zakończone mecze klubu (najnowsze pierwsze) — Zero-Data-Leakage. */
  finishedFixturesByTeamId: Map<number, ClubFinishedFixture[]>;
  teamXg90ByTeamId?: Map<number, number>;
  lang?: StatsLabLang;
};

/* ─────────────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────────────── */

function posOf(player: FplLabPlayer | undefined): FplPositionType {
  const t = Number(player?.element_type ?? 3);
  if (t === 1 || t === 2 || t === 3 || t === 4) return t;
  return 3;
}

function unavailableStatus(status: string | undefined): boolean {
  const s = String(status ?? "a").toLowerCase();
  return s === "i" || s === "s" || s === "u" || s === "n";
}

export function formatOpponentTicker(
  shortName: string,
  isHome: boolean,
  lang: StatsLabLang = "pl",
): string {
  const raw = String(shortName ?? "???").trim() || "???";
  const label = isHome ? raw.toUpperCase() : raw.toLowerCase();
  if (lang === "pl") return `${label} (${isHome ? "D" : "W"})`;
  return `${label} (${isHome ? "H" : "A"})`;
}

/** Buduje konteksty meczów dla drużyny z predykcji Dixona-Colesa. */
export function buildMatchContextsForTeam(
  teamId: number,
  predictions: Iterable<ProjectionsFixturePrediction>,
  lang: StatsLabLang = "pl",
): PlannerMatchContext[] {
  const out: PlannerMatchContext[] = [];
  for (const pred of predictions) {
    const isHome = pred.homeTeamId === teamId;
    const isAway = pred.awayTeamId === teamId;
    if (!isHome && !isAway) continue;
    const lambdaTeam = isHome ? pred.lambdaHome : pred.lambdaAway;
    const lambdaOpp = isHome ? pred.lambdaAway : pred.lambdaHome;
    const csProbTeam = isHome ? pred.csProbHome : pred.csProbAway;
    const opponentShortName = isHome
      ? pred.awayShortName
      : pred.homeShortName;
    const fdr =
      isHome ? pred.fdrHome.levelOverall : pred.fdrAway.levelOverall;
    out.push({
      fixtureId: pred.fixtureId,
      gameweek: pred.gameweek,
      teamId,
      opponentTeamId: isHome ? pred.awayTeamId : pred.homeTeamId,
      opponentShortName,
      tickerLabel: formatOpponentTicker(opponentShortName, isHome, lang),
      isHome,
      lambdaTeam,
      lambdaOpp,
      csProbTeam: csProbTeam > 1 ? csProbTeam / 100 : csProbTeam,
      fdrLevel: fdr,
    });
  }
  return out;
}

function shrinkRate(
  minutes: number,
  obsPer90: number,
  priorPer90: number,
  m0: number = MINUTES_PRIOR_M0,
): number {
  const m = Math.max(0, minutes);
  return (m * obsPer90 + m0 * priorPer90) / (m + m0);
}

function weightedMinutesModel(
  player: FplLabPlayer,
  history: FplLabPlayerGwHistory[],
  clubFixturesNewestFirst: ClubFinishedFixture[],
  beforeKickoffMs: number | null,
): {
  p60: number;
  p1: number;
  p0: number;
  expectedMinutes: number;
  minutesPrior: boolean;
  m60: number;
  m1: number;
} {
  const fixtures = clubFixturesNewestFirst
    .filter((f) =>
      beforeKickoffMs == null ? true : f.kickoffMs < beforeKickoffMs,
    )
    .slice(0, MINUTES_WINDOW);

  const histByFixture = new Map(
    history.map((h) => [h.fixture_id, h] as const),
  );

  let minutesPrior = false;
  let p60Hist = 0.5;
  let p1Hist = 0.2;
  let m60 = DEFAULT_M60;
  let m1 = DEFAULT_M1;

  const playedCount = history.filter((h) => Number(h.minutes) > 0).length;

  if (playedCount < 2 || fixtures.length === 0) {
    minutesPrior = true;
  } else {
    let wSum = 0;
    let w60 = 0;
    let w1 = 0;
    const mins60: number[] = [];
    const mins1: number[] = [];
    for (let i = 0; i < fixtures.length; i += 1) {
      const fx = fixtures[i]!;
      const w = MINUTES_WEIGHTS[i] ?? 0.5;
      const row = histByFixture.get(fx.fixtureId);
      const mins = row ? Math.max(0, Number(row.minutes) || 0) : 0;
      wSum += w;
      if (mins >= 60) {
        w60 += w;
        mins60.push(mins);
      } else if (mins >= 1) {
        w1 += w;
        mins1.push(mins);
      }
    }
    if (wSum > 0) {
      p60Hist = w60 / wSum;
      p1Hist = w1 / wSum;
    }
    if (mins60.length) {
      m60 = mins60.reduce((a, b) => a + b, 0) / mins60.length;
    }
    if (mins1.length) {
      m1 = mins1.reduce((a, b) => a + b, 0) / mins1.length;
    }
  }

  let avail = 1;
  if (unavailableStatus(player.status)) {
    avail = 0;
  } else {
    const chance = player.chance_of_playing_next_round;
    avail = clamp((chance ?? 100) / 100, 0, 1);
  }

  const p60 = avail * p60Hist;
  const p1 = avail * p1Hist;
  const p0 = Math.max(0, 1 - p60 - p1);
  const expectedMinutes = p60 * m60 + p1 * m1;

  return { p60, p1, p0, expectedMinutes, minutesPrior, m60, m1 };
}

function observeRatesPer90(
  history: FplLabPlayerGwHistory[],
): { minutes: number; rates: Record<RateKey, number> } {
  let minutes = 0;
  let xG = 0;
  let xA = 0;
  let saves = 0;
  let bonus = 0;
  let yellow = 0;
  for (const h of history) {
    const m = Math.max(0, Number(h.minutes) || 0);
    minutes += m;
    xG += Number(h.expected_goals) || 0;
    xA += Number(h.expected_assists) || 0;
    saves += Number(h.saves) || 0;
    bonus += Number(h.bonus) || 0;
    yellow += Number(h.yellow_cards) || 0;
  }
  const scale = minutes > 0 ? 90 / minutes : 0;
  return {
    minutes,
    rates: {
      xG: xG * scale,
      xA: xA * scale,
      saves: saves * scale,
      bonus: bonus * scale,
      yellow: yellow * scale,
    },
  };
}

function computeQDc(
  pos: FplPositionType,
  history: FplLabPlayerGwHistory[],
): number {
  if (pos === 1) return 0;
  const threshold = pos === 2 ? 10 : 12;
  const prior = POS_DC_PRIOR[pos];
  const eligible = history.filter((h) => Number(h.minutes) >= 60);
  const hits = eligible.filter((h) => {
    const dc = Number(h.defensive_contribution) || 0;
    return dc >= threshold;
  }).length;
  const n = eligible.length;
  return (n * (n > 0 ? hits / n : 0) + DC_PRIOR_GAMES * prior) / (n + DC_PRIOR_GAMES);
}

function goalPointsMultiplier(pos: FplPositionType): number {
  if (pos === 1) return 10;
  if (pos === 2) return 6;
  if (pos === 3) return 5;
  return 4;
}

function csPointsMultiplier(pos: FplPositionType): number {
  if (pos === 1 || pos === 2) return 4;
  if (pos === 3) return 1;
  return 0;
}

/** Pojedynczy mecz → xPts (składniki Adama). */
export function computeMatchXPts(args: {
  player: FplLabPlayer;
  history: FplLabPlayerGwHistory[];
  match: PlannerMatchContext;
  clubFixtures: ClubFinishedFixture[];
  teamXg90: number;
}): PlayerMatchXPtsBreakdown {
  const { player, history, match, clubFixtures, teamXg90 } = args;
  const pos = posOf(player);
  const minsModel = weightedMinutesModel(
    player,
    history,
    clubFixtures,
    null,
  );
  const { p60, p1, p0, expectedMinutes } = minsModel;
  const obs = observeRatesPer90(history);
  const priors = POS_RATE_PRIORS[pos];
  const xG90 = shrinkRate(obs.minutes, obs.rates.xG, priors.xG);
  const xA90 = shrinkRate(obs.minutes, obs.rates.xA, priors.xA);
  const saves90 = shrinkRate(obs.minutes, obs.rates.saves, priors.saves);
  const bonus90 = shrinkRate(obs.minutes, obs.rates.bonus, priors.bonus);
  const yellow90 = shrinkRate(obs.minutes, obs.rates.yellow, priors.yellow);

  const teamXG90 = Math.max(TEAM_XG90_FLOOR, teamXg90);
  const shareG = clamp(xG90 / teamXG90, 0, SHARE_CLAMP_HI);
  const shareA = clamp(xA90 / teamXG90, 0, SHARE_CLAMP_HI);
  const expectedGoals =
    match.lambdaTeam * shareG * (expectedMinutes / 90);
  const expectedAssists =
    match.lambdaTeam * shareA * (expectedMinutes / 90);
  const qDc = computeQDc(pos, history);

  const ptsApp = 2 * p60 + 1 * p1;
  const ptsGoals = expectedGoals * goalPointsMultiplier(pos);
  const ptsAssists = expectedAssists * 3;
  const ptsCs = p60 * match.csProbTeam * csPointsMultiplier(pos);
  const ptsGc =
    pos === 1 || pos === 2
      ? -p60 *
        ((match.lambdaOpp -
          (1 - Math.exp(-2 * match.lambdaOpp)) / 2) /
          2)
      : 0;
  const ptsSaves =
    pos === 1
      ? (saves90 * (match.lambdaOpp / 1.25) * (expectedMinutes / 90)) / 3
      : 0;
  const ptsDc = pos !== 1 ? 2 * p60 * qDc : 0;
  const ptsBonus = Math.min(3, bonus90 * (expectedMinutes / 90));
  const ptsCards = -yellow90 * (expectedMinutes / 90);

  const matchXPts = Math.max(
    0,
    ptsApp +
      ptsGoals +
      ptsAssists +
      ptsCs +
      ptsGc +
      ptsSaves +
      ptsDc +
      ptsBonus +
      ptsCards,
  );

  return {
    fixtureId: match.fixtureId,
    matchXPts,
    expectedMinutes,
    p0,
    p60,
    p1,
    opponentShortName: match.opponentShortName,
    tickerLabel: match.tickerLabel,
    isHome: match.isHome,
    fdrLevel: match.fdrLevel,
  };
}

/** Agregacja BGW / SGW / DGW → PlayerGwProjection. */
export function projectPlayerGw(
  elementId: number,
  gameweek: number,
  ctx: PlannerXPtsContext,
): PlayerGwProjection {
  const player = ctx.playersById.get(elementId);
  const empty: PlayerGwProjection = {
    elementId,
    gameweek,
    xPts: 0,
    expectedMinutes: 0,
    p0: 1,
    p60: 0,
    p1: 0,
    isBlank: true,
    isDouble: false,
    fixtures: [],
  };
  if (!player) return empty;

  const lang = ctx.lang ?? "pl";
  const teamId = player.fpl_team_id;
  const matches = buildMatchContextsForTeam(
    teamId,
    [...ctx.fixturePredictions.values()].filter((p) => p.gameweek === gameweek),
    lang,
  );

  if (!matches.length) return empty;

  const history = ctx.historyByPlayerId.get(elementId) ?? [];
  const clubFixtures = ctx.finishedFixturesByTeamId.get(teamId) ?? [];
  const teamXg90 =
    ctx.teamXg90ByTeamId?.get(teamId) ?? TEAM_XG90_FLOOR;

  const fixtures = matches.map((m) =>
    computeMatchXPts({
      player,
      history,
      match: m,
      clubFixtures,
      teamXg90,
    }),
  );

  const xPts = Number(
    fixtures.reduce((s, f) => s + f.matchXPts, 0).toFixed(2),
  );
  const expectedMinutes = fixtures.reduce(
    (s, f) => s + f.expectedMinutes,
    0,
  );
  // DGW: łączne p0 ≈ iloczyn p0 meczów; SGW: z pierwszego
  const p0 =
    fixtures.length > 1
      ? fixtures.reduce((p, f) => p * f.p0, 1)
      : (fixtures[0]?.p0 ?? 1);
  const p60 =
    fixtures.length > 1
      ? 1 -
        fixtures.reduce((p, f) => p * (1 - f.p60), 1)
      : (fixtures[0]?.p60 ?? 0);
  const p1 = Math.max(0, 1 - p0 - p60);

  return {
    elementId,
    gameweek,
    xPts,
    expectedMinutes,
    p0,
    p60,
    p1,
    isBlank: false,
    isDouble: fixtures.length >= 2,
    fixtures,
  };
}

/* ─────────────────────────────────────────────────
 * Team GW xPts (Adam §2.4)
 * ───────────────────────────────────────────────── */

export function computeTeamGwXPts(args: {
  squad: SquadPlayerState[];
  gw: number;
  projectionsByElement: Map<number, PlayerGwProjection>;
  activeChip: PlannerChipType | null;
  transfersCostPts: number;
}): { grossXPts: number; netXPts: number } {
  const {
    squad,
    projectionsByElement,
    activeChip,
    transfersCostPts,
  } = args;

  const xi = squad.filter((p) => p.slot >= 1 && p.slot <= 11);
  const bench = squad.filter((p) => p.slot >= 12 && p.slot <= 15);

  const xPtsOf = (id: number) =>
    projectionsByElement.get(id)?.xPts ?? 0;
  const p0Of = (id: number) => projectionsByElement.get(id)?.p0 ?? 1;

  let baseXiSum = 0;
  for (const p of xi) baseXiSum += xPtsOf(p.elementId);

  const captain = xi.find((p) => p.isCaptain) ?? null;
  const vice = xi.find((p) => p.isViceCaptain) ?? null;
  const mult = activeChip === "3xc" ? 3 : 2;
  const p0Captain = captain ? p0Of(captain.elementId) : 0;
  const cPts = captain ? xPtsOf(captain.elementId) : 0;
  const vcPts = vice ? xPtsOf(vice.elementId) : 0;
  const captainBonus =
    (mult - 1) * cPts + (mult - 1) * p0Captain * vcPts;

  let benchPts = 0;
  if (activeChip === "bboost") {
    for (const p of bench) benchPts += xPtsOf(p.elementId);
  }

  const hitCost =
    activeChip === "wildcard" || activeChip === "freehit"
      ? 0
      : Math.max(0, transfersCostPts);

  const grossXPts = Number((baseXiSum + captainBonus + benchPts).toFixed(2));
  const netXPts = Number((grossXPts - hitCost).toFixed(2));
  return { grossXPts, netXPts };
}

/* ─────────────────────────────────────────────────
 * R1 — formacja / swap
 * ───────────────────────────────────────────────── */

export function countXiByPosition(
  squad: SquadPlayerState[],
  playersById: Map<number, FplLabPlayer>,
): { gkp: number; def: number; mid: number; fwd: number } {
  const counts = { gkp: 0, def: 0, mid: 0, fwd: 0 };
  for (const p of squad) {
    if (p.slot < 1 || p.slot > 11) continue;
    const pos = posOf(playersById.get(p.elementId));
    if (pos === 1) counts.gkp += 1;
    else if (pos === 2) counts.def += 1;
    else if (pos === 3) counts.mid += 1;
    else counts.fwd += 1;
  }
  return counts;
}

export function validateXiFormation(
  squad: SquadPlayerState[],
  playersById: Map<number, FplLabPlayer>,
): { ok: true } | { ok: false; errorKey: FormationErrorKey } {
  const c = countXiByPosition(squad, playersById);
  if (c.gkp !== 1) return { ok: false, errorKey: "formationErrorGkOnly" };
  if (c.def < 3) return { ok: false, errorKey: "formationErrorMinDef" };
  if (c.mid < 2) return { ok: false, errorKey: "formationErrorMinMid" };
  if (c.fwd < 1) return { ok: false, errorKey: "formationErrorMinFwd" };
  if (c.def > 5 || c.mid > 5 || c.fwd > 3) {
    return { ok: false, errorKey: "formationErrorMinDef" };
  }
  return { ok: true };
}

export function canSwapSquadSlots(
  squad: SquadPlayerState[],
  slotA: number,
  slotB: number,
  playersById: Map<number, FplLabPlayer>,
): { allowed: true } | { allowed: false; errorKey: FormationErrorKey } {
  const a = squad.find((p) => p.slot === slotA);
  const b = squad.find((p) => p.slot === slotB);
  if (!a || !b) {
    return { allowed: false, errorKey: "formationErrorGkOnly" };
  }

  const posA = posOf(playersById.get(a.elementId));
  const posB = posOf(playersById.get(b.elementId));
  const involvesGkSlot =
    slotA === 1 || slotA === 12 || slotB === 1 || slotB === 12;
  if (involvesGkSlot) {
    if (!(posA === 1 && posB === 1)) {
      return { allowed: false, errorKey: "formationErrorGkOnly" };
    }
  }

  const next = squad.map((p) => ({ ...p }));
  const na = next.find((p) => p.slot === slotA)!;
  const nb = next.find((p) => p.slot === slotB)!;
  const tmp = na.elementId;
  na.elementId = nb.elementId;
  nb.elementId = tmp;
  // swap prices with players
  const tmpPur = na.purchasePriceTenths;
  const tmpNow = na.nowCostTenths;
  const tmpSell = na.sellingPriceTenths;
  na.purchasePriceTenths = nb.purchasePriceTenths;
  na.nowCostTenths = nb.nowCostTenths;
  na.sellingPriceTenths = nb.sellingPriceTenths;
  nb.purchasePriceTenths = tmpPur;
  nb.nowCostTenths = tmpNow;
  nb.sellingPriceTenths = tmpSell;

  const formation = validateXiFormation(next, playersById);
  if (!formation.ok) return { allowed: false, errorKey: formation.errorKey };
  return { allowed: true };
}

/* ─────────────────────────────────────────────────
 * R11 — Optimise XI
 * ───────────────────────────────────────────────── */

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [head, ...tail] = arr;
  const withHead = combinations(tail, k - 1).map((c) => [head!, ...c]);
  const withoutHead = combinations(tail, k);
  return [...withHead, ...withoutHead];
}

export function optimiseStartingXiForGw(
  squad: SquadPlayerState[],
  playersById: Map<number, FplLabPlayer>,
  gwProjectionsByElement: Map<number, PlayerGwProjection>,
): {
  lineupOrder: number[];
  captainElementId: number;
  viceCaptainElementId: number;
  xiXPts: number;
} {
  const byId = new Map(squad.map((p) => [p.elementId, p] as const));
  const gkp = squad.filter(
    (p) => posOf(playersById.get(p.elementId)) === 1,
  );
  const defs = squad.filter(
    (p) => posOf(playersById.get(p.elementId)) === 2,
  );
  const mids = squad.filter(
    (p) => posOf(playersById.get(p.elementId)) === 3,
  );
  const fwds = squad.filter(
    (p) => posOf(playersById.get(p.elementId)) === 4,
  );

  const xPts = (id: number) => gwProjectionsByElement.get(id)?.xPts ?? 0;

  let best:
    | {
        xi: number[];
        xiXPts: number;
      }
    | null = null;

  const gkPick = gkp.slice().sort((a, b) => xPts(b.elementId) - xPts(a.elementId))[0];
  if (!gkPick) {
    const order = squad
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((p) => p.elementId);
    return {
      lineupOrder: order,
      captainElementId: order[0] ?? 0,
      viceCaptainElementId: order[1] ?? order[0] ?? 0,
      xiXPts: 0,
    };
  }

  for (let nDef = 3; nDef <= Math.min(5, defs.length); nDef += 1) {
    for (let nMid = 2; nMid <= Math.min(5, mids.length); nMid += 1) {
      const nFwd = 10 - nDef - nMid;
      if (nFwd < 1 || nFwd > 3 || nFwd > fwds.length) continue;
      for (const dPick of combinations(defs, nDef)) {
        for (const mPick of combinations(mids, nMid)) {
          for (const fPick of combinations(fwds, nFwd)) {
            const xiPlayers = [gkPick, ...dPick, ...mPick, ...fPick];
            const sum = xiPlayers.reduce(
              (s, p) => s + xPts(p.elementId),
              0,
            );
            if (!best || sum > best.xiXPts) {
              best = {
                xi: xiPlayers.map((p) => p.elementId),
                xiXPts: sum,
              };
            }
          }
        }
      }
    }
  }

  if (!best) {
    const order = squad
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((p) => p.elementId);
    return {
      lineupOrder: order,
      captainElementId: order[0] ?? 0,
      viceCaptainElementId: order[1] ?? order[0] ?? 0,
      xiXPts: 0,
    };
  }

  const xiSorted = best.xi
    .slice()
    .sort((a, b) => xPts(b) - xPts(a));
  const captainElementId = xiSorted[0]!;
  const viceCaptainElementId = xiSorted[1] ?? captainElementId;
  const xiSet = new Set(best.xi);
  const benchOutfield = squad
    .filter(
      (p) =>
        !xiSet.has(p.elementId) &&
        posOf(playersById.get(p.elementId)) !== 1,
    )
    .sort((a, b) => xPts(b.elementId) - xPts(a.elementId));
  const benchGk = squad.find(
    (p) =>
      !xiSet.has(p.elementId) &&
      posOf(playersById.get(p.elementId)) === 1,
  );

  const lineupOrder: number[] = [];
  // slot 1 GKP
  lineupOrder.push(gkPick.elementId);
  // slots 2..11 — field XI sorted by position groups as picked
  const xiField = best.xi.filter((id) => id !== gkPick.elementId);
  for (const id of xiField) lineupOrder.push(id);
  // slot 12 bench GK
  if (benchGk) lineupOrder.push(benchGk.elementId);
  // slots 13..15
  for (const p of benchOutfield.slice(0, 3)) {
    lineupOrder.push(p.elementId);
  }
  // pad if needed
  for (const p of squad) {
    if (!lineupOrder.includes(p.elementId)) lineupOrder.push(p.elementId);
  }

  // ensure prices preserved via byId
  void byId;

  return {
    lineupOrder: lineupOrder.slice(0, 15),
    captainElementId,
    viceCaptainElementId,
    xiXPts: best.xiXPts,
  };
}

/* ─────────────────────────────────────────────────
 * Rolling plan R1–R12
 * ───────────────────────────────────────────────── */

function cloneSquad(squad: SquadPlayerState[]): SquadPlayerState[] {
  return squad.map((p) => ({ ...p }));
}

function picksToSquad(
  picks: ReconstructedSquadPick[],
  overrides?: ManualOverridesState,
): SquadPlayerState[] {
  return picks
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((p) => {
      const custom = overrides?.customSellingPricesTenths?.[p.elementId];
      return {
        elementId: p.elementId,
        slot: p.slot,
        purchasePriceTenths: p.purchasePriceTenths,
        nowCostTenths: p.nowCostTenths,
        sellingPriceTenths:
          custom != null ? Math.round(custom) : p.sellingPriceTenths,
        isCaptain: p.isCaptain,
        isViceCaptain: p.isViceCaptain,
      };
    });
}

function applyLineupOrder(
  squad: SquadPlayerState[],
  lineupOrder: number[] | undefined,
  captainElementId: number | null | undefined,
  viceCaptainElementId: number | null | undefined,
): SquadPlayerState[] {
  const byId = new Map(squad.map((p) => [p.elementId, { ...p }] as const));
  let next: SquadPlayerState[];
  if (lineupOrder && lineupOrder.length === 15) {
    next = lineupOrder.map((id, idx) => {
      const base = byId.get(id) ?? {
        elementId: id,
        slot: idx + 1,
        purchasePriceTenths: 50,
        nowCostTenths: 50,
        sellingPriceTenths: 50,
        isCaptain: false,
        isViceCaptain: false,
      };
      return { ...base, slot: idx + 1, isCaptain: false, isViceCaptain: false };
    });
  } else {
    next = cloneSquad(squad).map((p) => ({
      ...p,
      isCaptain: false,
      isViceCaptain: false,
    }));
  }

  const xiIds = new Set(
    next.filter((p) => p.slot >= 1 && p.slot <= 11).map((p) => p.elementId),
  );
  let cap = captainElementId ?? null;
  let vice = viceCaptainElementId ?? null;
  if (cap != null && !xiIds.has(cap)) cap = null;
  if (vice != null && !xiIds.has(vice)) vice = null;
  if (cap != null && vice === cap) vice = null;

  if (cap != null) {
    const c = next.find((p) => p.elementId === cap);
    if (c) c.isCaptain = true;
  }
  if (vice != null) {
    const v = next.find((p) => p.elementId === vice);
    if (v) v.isViceCaptain = true;
  }
  return next;
}

function ensureCaptainVice(
  squad: SquadPlayerState[],
  projectionsByElement: Map<number, PlayerGwProjection>,
): SquadPlayerState[] {
  const next = cloneSquad(squad);
  const xi = next.filter((p) => p.slot >= 1 && p.slot <= 11);
  const xPts = (id: number) => projectionsByElement.get(id)?.xPts ?? 0;
  let cap = xi.find((p) => p.isCaptain) ?? null;
  let vice = xi.find((p) => p.isViceCaptain) ?? null;

  if (!cap || !xi.some((p) => p.elementId === cap!.elementId)) {
    const best = xi.slice().sort((a, b) => xPts(b.elementId) - xPts(a.elementId));
    cap = best[0] ?? null;
  }
  if (
    !vice ||
    !xi.some((p) => p.elementId === vice!.elementId) ||
    (cap && vice.elementId === cap.elementId)
  ) {
    const best = xi
      .filter((p) => !cap || p.elementId !== cap.elementId)
      .sort((a, b) => xPts(b.elementId) - xPts(a.elementId));
    vice = best[0] ?? null;
  }

  for (const p of next) {
    p.isCaptain = cap != null && p.elementId === cap.elementId;
    p.isViceCaptain = vice != null && p.elementId === vice.elementId;
  }
  return next;
}

function clubCounts(
  squad: SquadPlayerState[],
  playersById: Map<number, FplLabPlayer>,
): Map<number, number> {
  const m = new Map<number, number>();
  for (const p of squad) {
    const team = playersById.get(p.elementId)?.fpl_team_id;
    if (team == null) continue;
    m.set(team, (m.get(team) ?? 0) + 1);
  }
  return m;
}

function chipHalf(gw: number): "first" | "second" {
  return gw <= 19 ? "first" : "second";
}

function isChipAvailable(args: {
  chip: PlannerChipType;
  gw: number;
  usedChips: UsedChipRecord[];
  planChipsSoFar: Array<{ gw: number; chip: PlannerChipType }>;
}): { ok: true } | { ok: false; reason: string } {
  const { chip, gw, usedChips, planChipsSoFar } = args;
  const half = chipHalf(gw);

  for (const u of usedChips) {
    if (u.name !== chip) continue;
    if (chipHalf(u.event) === half) {
      return { ok: false, reason: `Chip ${chip} already used in this half (GW${u.event}).` };
    }
  }
  for (const p of planChipsSoFar) {
    if (p.chip !== chip) continue;
    if (chipHalf(p.gw) === half) {
      return { ok: false, reason: `Chip ${chip} already planned in GW${p.gw}.` };
    }
  }
  if (chip === "freehit") {
    const prevFh = [...usedChips, ...planChipsSoFar.map((p) => ({ name: p.chip, event: p.gw }))]
      .filter((c) => c.name === "freehit")
      .some((c) => c.event === gw - 1);
    if (prevFh) {
      return {
        ok: false,
        reason: `Free Hit cannot be played in consecutive GWs (blocked after GW${gw - 1}).`,
      };
    }
  }
  return { ok: true };
}

export type EvaluateRollingPlanInput = {
  entry: ReconstructedEntryState;
  playersById: Map<number, FplLabPlayer>;
  decisions: GwPlanDecision[];
  startGw: number;
  endGw: number;
  overrides?: ManualOverridesState;
  /** Opcjonalne projekcje xPts per (elementId, gw). */
  projectGw?: (
    elementId: number,
    gw: number,
  ) => PlayerGwProjection;
  maxFreeTransfers?: number;
  clubNamesById?: Map<number, string>;
};

/**
 * Kaskadowe przeliczenie planu `startGw..endGw` z regułami R1–R12.
 */
export function evaluateRollingPlan(
  input: EvaluateRollingPlanInput,
): EvaluatedGwState[] {
  const {
    entry,
    playersById,
    decisions,
    startGw,
    endGw,
    overrides,
    projectGw,
    maxFreeTransfers = DEFAULT_MAX_FT,
    clubNamesById,
  } = input;

  const decisionByGw = new Map(decisions.map((d) => [d.gw, d] as const));
  let squad = picksToSquad(entry.picks, overrides);
  let bankTenths = Math.round(
    overrides?.initialBankTenths ?? entry.bankTenths,
  );
  let ftAvailable = clamp(
    Math.round(overrides?.initialFreeTransfers ?? entry.freeTransfers),
    1,
    maxFreeTransfers,
  );

  const overLimitBase = new Set(entry.overLimitClubIds);
  const planChipsSoFar: Array<{ gw: number; chip: PlannerChipType }> = [];
  const results: EvaluatedGwState[] = [];

  /** Snapshot przed FH — do przywrócenia w kolejnej GW. */
  let pendingFhRestore: {
    squad: SquadPlayerState[];
    bankTenths: number;
  } | null = null;

  for (let gw = startGw; gw <= endGw; gw += 1) {
    const errors: EvaluatedGwState["errors"] = [];
    const warnings: string[] = [];

    // R8 — przywróć stan po Free Hicie z poprzedniej kolejki
    if (pendingFhRestore) {
      squad = cloneSquad(pendingFhRestore.squad);
      bankTenths = pendingFhRestore.bankTenths;
      pendingFhRestore = null;
      warnings.push(
        `Free Hit rollback: skład i bank przywrócone ze stanu przed FH (GW${gw}).`,
      );
    }

    const decision = decisionByGw.get(gw) ?? {
      gw,
      transfers: [],
      activeChip: null,
    };

    let activeChip = decision.activeChip;
    if (activeChip) {
      const chipOk = isChipAvailable({
        chip: activeChip,
        gw,
        usedChips: entry.usedChips,
        planChipsSoFar,
      });
      if (!chipOk.ok) {
        warnings.push(chipOk.reason);
        activeChip = null;
      } else {
        planChipsSoFar.push({ gw, chip: activeChip });
      }
    }

    const preFhSnapshot =
      activeChip === "freehit"
        ? { squad: cloneSquad(squad), bankTenths }
        : null;

    // R2 / R5 / R6 — transfery
    const incomingIds = new Set(squad.map((p) => p.elementId));
    const appliedTransfers: PlannedTransfer[] = [];
    let working = cloneSquad(squad);
    let workingBank = bankTenths;

    for (const raw of decision.transfers) {
      const t: PlannedTransfer = { ...raw, hasConflict: false };
      const outIdx = working.findIndex((p) => p.elementId === t.outElementId);
      const alreadyIn = working.some((p) => p.elementId === t.inElementId);

      // Konflikt: out nie ma w kadrze LUB in już jest (i to nie Undo tej samej pary)
      if (outIdx < 0 || alreadyIn) {
        // Undo w tej samej GW: sprzedaż X + ponowny zakup X
        const undoIdx = appliedTransfers.findIndex(
          (a) =>
            a.outElementId === t.inElementId &&
            a.inElementId === t.outElementId,
        );
        if (outIdx < 0 && alreadyIn && undoIdx >= 0) {
          // traktuj jako konflikt — UI powinno użyć dedykowanego Undo; tu flagujemy
          t.hasConflict = true;
          errors.push({ key: "transferConflictError" });
          appliedTransfers.push(t);
          continue;
        }
        if (outIdx < 0 || alreadyIn) {
          t.hasConflict = true;
          errors.push({ key: "transferConflictError" });
          appliedTransfers.push(t);
          continue;
        }
      }

      // Same-GW re-buy of sold player → Undo (R2/R6)
      const soldEarlier = appliedTransfers.find(
        (a) =>
          !a.hasConflict &&
          a.outElementId === t.inElementId &&
          a.inElementId === t.outElementId,
      );
      if (soldEarlier) {
        // Undo: remove pair, restore original player object from soldEarlier prices
        const idxIn = working.findIndex(
          (p) => p.elementId === soldEarlier.inElementId,
        );
        if (idxIn >= 0) {
          const slot = working[idxIn]!.slot;
          workingBank += soldEarlier.inPurchasePriceTenths;
          workingBank -= soldEarlier.outSellingPriceTenths;
          working[idxIn] = {
            elementId: soldEarlier.outElementId,
            slot,
            purchasePriceTenths: soldEarlier.outSellingPriceTenths, // placeholder — restored below
            nowCostTenths:
              playersById.get(soldEarlier.outElementId)?.now_cost ??
              soldEarlier.outSellingPriceTenths,
            sellingPriceTenths: soldEarlier.outSellingPriceTenths,
            isCaptain: false,
            isViceCaptain: false,
          };
          // Restore PP/SP from original squad snapshot before this GW's transfers
          const original = squad.find(
            (p) => p.elementId === soldEarlier.outElementId,
          );
          if (original) {
            working[idxIn] = {
              ...original,
              slot,
              isCaptain: false,
              isViceCaptain: false,
            };
            // bank: reverse sell+buy
            workingBank =
              bankTenths +
              appliedTransfers
                .filter((a) => !a.hasConflict && a.id !== soldEarlier.id)
                .reduce(
                  (s, a) =>
                    s + a.outSellingPriceTenths - a.inPurchasePriceTenths,
                  0,
                );
            // rebuild working without soldEarlier by replaying
            working = cloneSquad(squad);
            workingBank = bankTenths;
            const kept = appliedTransfers.filter(
              (a) => a.id !== soldEarlier.id && !a.hasConflict,
            );
            appliedTransfers.length = 0;
            for (const a of kept) {
              const oi = working.findIndex((p) => p.elementId === a.outElementId);
              if (oi < 0) continue;
              const outP = working[oi]!;
              workingBank += a.outSellingPriceTenths;
              workingBank -= a.inPurchasePriceTenths;
              working[oi] = {
                elementId: a.inElementId,
                slot: outP.slot,
                purchasePriceTenths: a.inPurchasePriceTenths,
                nowCostTenths: a.inPurchasePriceTenths,
                sellingPriceTenths: a.inPurchasePriceTenths,
                isCaptain: false,
                isViceCaptain: false,
              };
              appliedTransfers.push(a);
            }
          }
        }
        continue;
      }

      const outPlayer = working[outIdx]!;
      const sell =
        overrides?.customSellingPricesTenths?.[outPlayer.elementId] ??
        outPlayer.sellingPriceTenths;
      const buy = Math.round(
        Number(
          playersById.get(t.inElementId)?.now_cost ??
            t.inPurchasePriceTenths,
        ),
      );

      workingBank += sell;
      workingBank -= buy;
      working[outIdx] = {
        elementId: t.inElementId,
        slot: outPlayer.slot,
        purchasePriceTenths: buy,
        nowCostTenths: buy,
        sellingPriceTenths: buy,
        isCaptain: false,
        isViceCaptain: false,
      };
      appliedTransfers.push({
        ...t,
        outSellingPriceTenths: sell,
        inPurchasePriceTenths: buy,
        hasConflict: false,
      });
      void incomingIds;
    }

    // R3 — limit klubu
    const counts = clubCounts(working, playersById);
    const overClubs = [...counts.entries()].filter(([, n]) => n > CLUB_LIMIT);
    if (appliedTransfers.filter((t) => !t.hasConflict).length === 0) {
      for (const [clubId, n] of overClubs) {
        const name = clubNamesById?.get(clubId) ?? String(clubId);
        warnings.push(`4/3 pre-existing (${n}/3): ${name}`);
      }
    } else {
      for (const [clubId] of overClubs) {
        const name = clubNamesById?.get(clubId) ?? String(clubId);
        if (overLimitBase.has(clubId)) {
          errors.push({
            key: "clubLimitPreExistingMustFix",
            detail: name,
          });
        } else {
          errors.push({ key: "clubLimitExceeded", detail: name });
        }
      }
    }

    // R4 — bank
    if (workingBank < 0) {
      errors.push({ key: "negativeBankError" });
    }

    // Lineup / C / VC
    working = applyLineupOrder(
      working,
      decision.lineupOrder,
      decision.captainElementId,
      decision.viceCaptainElementId,
    );

    const formation = validateXiFormation(working, playersById);
    if (!formation.ok) {
      errors.push({ key: formation.errorKey });
    }

    // Projekcje
    const projectionsByElement = new Map<number, PlayerGwProjection>();
    for (const p of working) {
      const proj = projectGw
        ? projectGw(p.elementId, gw)
        : {
            elementId: p.elementId,
            gameweek: gw,
            xPts: 0,
            expectedMinutes: 0,
            p0: 1,
            p60: 0,
            p1: 0,
            isBlank: true,
            isDouble: false,
            fixtures: [],
          };
      projectionsByElement.set(p.elementId, proj);
    }

    working = ensureCaptainVice(working, projectionsByElement);

    const cap = working.find((p) => p.isCaptain);
    const vice = working.find((p) => p.isViceCaptain);
    if (cap && projectionsByElement.get(cap.elementId)?.isBlank) {
      warnings.push("Captain has BGW.");
    }
    if (vice && projectionsByElement.get(vice.elementId)?.isBlank) {
      warnings.push("Vice-captain has BGW.");
    }

    // R7/R8/R9 FT + hits
    const validTransfersCount = appliedTransfers.filter(
      (t) => !t.hasConflict,
    ).length;
    let hitsCount = 0;
    let transferCostPts = 0;
    let ftNext: number;

    if (activeChip === "wildcard" || activeChip === "freehit") {
      hitsCount = 0;
      transferCostPts = 0;
      ftNext = ftAvailable; // zachowane bez +1
    } else {
      hitsCount = Math.max(0, validTransfersCount - ftAvailable);
      transferCostPts = hitsCount * 4;
      ftNext = Math.min(
        maxFreeTransfers,
        Math.max(0, ftAvailable - validTransfersCount) + 1,
      );
    }

    const topUp = overrides?.ftTopUps?.[gw + 1];
    if (topUp != null) {
      ftNext = Math.max(ftNext, topUp);
    }
    ftNext = clamp(ftNext, 1, maxFreeTransfers);

    const { grossXPts, netXPts } = computeTeamGwXPts({
      squad: working,
      gw,
      projectionsByElement,
      activeChip,
      transfersCostPts: transferCostPts,
    });

    const isValid = errors.length === 0;

    results.push({
      gw,
      squad: working,
      bankTenths: workingBank,
      ftAvailable,
      ftNext,
      activeChip,
      transfers: appliedTransfers,
      validTransfersCount,
      hitsCount,
      transferCostPts,
      captainElementId: cap?.elementId ?? null,
      viceCaptainElementId: vice?.elementId ?? null,
      isValid,
      errors,
      warnings,
      grossXPts,
      netXPts,
      preFreeHitSnapshot: preFhSnapshot,
    });

    // Persist to next GW (R8/R9)
    if (activeChip === "freehit") {
      pendingFhRestore = preFhSnapshot;
      // stan „widoczny” w FH GW to working, ale następna GW wraca
      squad = working;
      bankTenths = workingBank;
    } else {
      squad = working;
      bankTenths = workingBank;
    }
    ftAvailable = ftNext;
  }

  return results;
}

/** Buduje mapę historii per zawodnik. */
export function indexHistoryByPlayer(
  rows: FplLabPlayerGwHistory[],
): Map<number, FplLabPlayerGwHistory[]> {
  const m = new Map<number, FplLabPlayerGwHistory[]>();
  for (const row of rows) {
    const id = row.fpl_element_id;
    const list = m.get(id);
    if (list) list.push(row);
    else m.set(id, [row]);
  }
  for (const list of m.values()) {
    list.sort((a, b) => {
      const ta = a.kickoff_time ? Date.parse(a.kickoff_time) : a.gameweek;
      const tb = b.kickoff_time ? Date.parse(b.kickoff_time) : b.gameweek;
      return ta - tb;
    });
  }
  return m;
}

/** Indeks predykcji po fixtureId. */
export function indexPredictionsByFixture(
  preds: ProjectionsFixturePrediction[],
): Map<number, ProjectionsFixturePrediction> {
  return new Map(preds.map((p) => [p.fixtureId, p] as const));
}

/** Zakończone mecze klubów (najnowsze pierwsze) z terminarza. */
export function buildFinishedFixturesByTeamId(
  fixtures: FplLabFixtureRow[],
): Map<number, ClubFinishedFixture[]> {
  const m = new Map<number, ClubFinishedFixture[]>();
  for (const f of fixtures) {
    if (!f.finished) continue;
    const gw = Number(f.gameweek);
    if (!Number.isFinite(gw) || gw < 1) continue;
    const kickoffMs = f.kickoff_time
      ? Date.parse(f.kickoff_time)
      : Number.NaN;
    const row: ClubFinishedFixture = {
      fixtureId: f.fixture_id,
      gameweek: gw,
      kickoffMs: Number.isFinite(kickoffMs) ? kickoffMs : gw * 1e9,
    };
    for (const teamId of [f.team_h, f.team_a]) {
      const list = m.get(teamId);
      if (list) list.push(row);
      else m.set(teamId, [row]);
    }
  }
  for (const list of m.values()) {
    list.sort((a, b) => b.kickoffMs - a.kickoffMs);
  }
  return m;
}

/** Proste team xG/90 z historii zawodników (suma xG meczu / 2 stron ≈ xG drużyny). */
export function buildTeamXg90ByTeamId(
  history: FplLabPlayerGwHistory[],
  playersById: Map<number, FplLabPlayer>,
): Map<number, number> {
  const byFixtureTeam = new Map<string, number>();
  for (const h of history) {
    const player = playersById.get(h.fpl_element_id);
    if (!player) continue;
    const key = `${h.fixture_id}:${player.fpl_team_id}`;
    byFixtureTeam.set(
      key,
      (byFixtureTeam.get(key) ?? 0) + (Number(h.expected_goals) || 0),
    );
  }
  const sums = new Map<number, { xg: number; n: number }>();
  for (const [key, xg] of byFixtureTeam) {
    const teamId = Number(key.split(":")[1]);
    const cur = sums.get(teamId) ?? { xg: 0, n: 0 };
    cur.xg += xg;
    cur.n += 1;
    sums.set(teamId, cur);
  }
  const out = new Map<number, number>();
  for (const [teamId, s] of sums) {
    out.set(teamId, s.n > 0 ? s.xg / s.n : TEAM_XG90_FLOOR);
  }
  return out;
}

/** Buduje kontekst xPts v1 z datasetu + wyniku Dixona-Colesa. */
export function buildPlannerXPtsContext(args: {
  players: FplLabPlayer[];
  history: FplLabPlayerGwHistory[];
  fixtures: FplLabFixtureRow[];
  projections: ProjectionsBuildResult;
  lang?: StatsLabLang;
}): PlannerXPtsContext {
  const playersById = new Map(
    args.players.map((p) => [p.fpl_element_id, p] as const),
  );
  const fixturePredictions = new Map<number, ProjectionsFixturePrediction>();
  for (const list of Object.values(args.projections.matchupsByGw)) {
    for (const pred of list) {
      fixturePredictions.set(pred.fixtureId, pred);
    }
  }
  return {
    playersById,
    historyByPlayerId: indexHistoryByPlayer(args.history),
    fixturePredictions,
    finishedFixturesByTeamId: buildFinishedFixturesByTeamId(args.fixtures),
    teamXg90ByTeamId: buildTeamXg90ByTeamId(args.history, playersById),
    lang: args.lang ?? "pl",
  };
}

/**
 * Projekcje xPts v1 dla wszystkich zawodników w zakresie GW.
 * Serializowalny kształt: elementId -> gw -> PlayerGwProjection.
 */
export function buildAllPlayerGwProjections(
  ctx: PlannerXPtsContext,
  startGw: number,
  endGw: number,
): Record<number, Record<number, PlayerGwProjection>> {
  const lo = Math.max(1, Math.min(38, startGw));
  const hi = Math.max(lo, Math.min(38, endGw));
  const out: Record<number, Record<number, PlayerGwProjection>> = {};
  for (const [elementId] of ctx.playersById) {
    const byGw: Record<number, PlayerGwProjection> = {};
    for (let gw = lo; gw <= hi; gw += 1) {
      byGw[gw] = projectPlayerGw(elementId, gw, ctx);
    }
    out[elementId] = byGw;
  }
  return out;
}

function pickTopPlayers(
  players: FplLabPlayer[],
  elementType: FplPositionType,
  count: number,
  usedClubs: Map<number, number>,
): FplLabPlayer[] {
  const pool = players
    .filter(
      (p) =>
        p.element_type === elementType &&
        String(p.status ?? "a").toLowerCase() === "a",
    )
    .slice()
    .sort((a, b) => {
      const score = (p: FplLabPlayer) =>
        Number(p.total_points) * 2 +
        Number(p.minutes) / 90 +
        Number(p.selected_by_percent) * 3 +
        Number(p.form) * 5;
      return score(b) - score(a);
    });

  const picked: FplLabPlayer[] = [];
  for (const p of pool) {
    if (picked.length >= count) break;
    const clubN = usedClubs.get(p.fpl_team_id) ?? 0;
    if (clubN >= CLUB_LIMIT) continue;
    picked.push(p);
    usedClubs.set(p.fpl_team_id, clubN + 1);
  }
  return picked;
}

/**
 * Deterministyczny skład Demo (1-3-4-3 / sloty 1..15) z lokalnego katalogu.
 */
export function buildDemoEntryState(args: {
  players: FplLabPlayer[];
  planningStartGw: number;
  projectionsByElement: Record<number, Record<number, PlayerGwProjection>>;
}): ReconstructedEntryState {
  const { players, planningStartGw, projectionsByElement } = args;
  const usedClubs = new Map<number, number>();

  const gkps = pickTopPlayers(players, 1, 2, usedClubs);
  const defs = pickTopPlayers(players, 2, 5, usedClubs);
  const mids = pickTopPlayers(players, 3, 5, usedClubs);
  const fwds = pickTopPlayers(players, 4, 3, usedClubs);

  // Formacja 1-3-4-3: XI = GKP + 3 DEF + 4 MID + 3 FWD; bench = GKP + 2 DEF + 1 MID
  const xiGk = gkps[0];
  const benchGk = gkps[1];
  const xiDef = defs.slice(0, 3);
  const benchDef = defs.slice(3, 5);
  const xiMid = mids.slice(0, 4);
  const benchMid = mids.slice(4, 5);
  const xiFwd = fwds.slice(0, 3);

  const ordered: FplLabPlayer[] = [
    xiGk,
    ...xiDef,
    ...xiMid,
    ...xiFwd,
    benchGk,
    ...benchDef,
    ...benchMid,
  ].filter((p): p is FplLabPlayer => p != null);

  // Uzupełnij do 15 jeśli brakuje (fallback bez limitu klubu)
  if (ordered.length < 15) {
    const have = new Set(ordered.map((p) => p.fpl_element_id));
    const fillers = players
      .filter((p) => !have.has(p.fpl_element_id))
      .sort((a, b) => Number(b.total_points) - Number(a.total_points));
    for (const p of fillers) {
      if (ordered.length >= 15) break;
      ordered.push(p);
    }
  }

  const picks: ReconstructedSquadPick[] = ordered.slice(0, 15).map((p, idx) => {
    const nowCostTenths = Math.round(Number(p.now_cost) || 50);
    const costChange = Math.max(0, Number(p.cost_change_start ?? 2) || 0);
    const purchasePriceTenths = Math.max(38, nowCostTenths - costChange);
    const sellingPriceTenths = computeSellingPriceTenths(
      purchasePriceTenths,
      nowCostTenths,
    );
    return {
      elementId: p.fpl_element_id,
      slot: idx + 1,
      isCaptain: false,
      isViceCaptain: false,
      purchasePriceTenths,
      nowCostTenths,
      sellingPriceTenths,
      priceSource: "derived",
      priceApprox: false,
      willDropAffectSell: willNextPriceDropAffectSellingPrice(
        purchasePriceTenths,
        nowCostTenths,
      ),
    };
  });

  const playersById = new Map(players.map((p) => [p.fpl_element_id, p]));
  const squad: SquadPlayerState[] = picks.map((p) => ({
    elementId: p.elementId,
    slot: p.slot,
    purchasePriceTenths: p.purchasePriceTenths,
    nowCostTenths: p.nowCostTenths,
    sellingPriceTenths: p.sellingPriceTenths,
    isCaptain: false,
    isViceCaptain: false,
  }));

  const gwProj = new Map<number, PlayerGwProjection>();
  for (const p of picks) {
    const proj =
      projectionsByElement[p.elementId]?.[planningStartGw] ??
      projectPlayerGw(p.elementId, planningStartGw, {
        playersById,
        historyByPlayerId: new Map(),
        fixturePredictions: new Map(),
        finishedFixturesByTeamId: new Map(),
      });
    gwProj.set(p.elementId, proj);
  }

  const opt = optimiseStartingXiForGw(squad, playersById, gwProj);
  const bySlot = new Map(
    opt.lineupOrder.map((id, i) => [i + 1, id] as const),
  );
  const pickById = new Map(picks.map((p) => [p.elementId, p] as const));
  const optimisedPicks: ReconstructedSquadPick[] = [];
  for (let slot = 1; slot <= 15; slot += 1) {
    const id = bySlot.get(slot) ?? picks[slot - 1]?.elementId;
    if (id == null) continue;
    const base = pickById.get(id);
    if (!base) continue;
    optimisedPicks.push({
      ...base,
      slot,
      isCaptain: id === opt.captainElementId,
      isViceCaptain: id === opt.viceCaptainElementId,
    });
  }

  const finalPicks =
    optimisedPicks.length === 15 ? optimisedPicks : picks.map((p, i) => ({
      ...p,
      slot: i + 1,
      isCaptain: i === 0,
      isViceCaptain: i === 1,
    }));

  const squadSellingValueTenths = finalPicks.reduce(
    (s, p) => s + p.sellingPriceTenths,
    0,
  );
  const squadMarketValueTenths = finalPicks.reduce(
    (s, p) => s + p.nowCostTenths,
    0,
  );
  const bankTenths = 5;

  return {
    teamId: 0,
    teamName: "FPL Arena Demo XI",
    managerName: "Demo Mode (Wpisz swoje FPL ID)",
    startedEvent: 1,
    currentGw: Math.max(0, planningStartGw - 1),
    planningStartGw,
    isPreseason: planningStartGw <= 1 && finalPicks.length === 0,
    activeChipInCurrentGw: null,
    rolledBackFromFreeHit: false,
    bankTenths,
    bankSource: "derived",
    freeTransfers: 2,
    freeTransfersSource: "derived",
    ftMismatchWarning: false,
    squadSellingValueTenths,
    squadMarketValueTenths,
    spendingPowerTenths: bankTenths + squadSellingValueTenths,
    valueConsistencyDeltaTenths: 0,
    picks: finalPicks,
    usedChips: [],
    overLimitClubIds: [],
    warnings: [],
  };
}

/** Deadline kolejki: najwcześniejszy kickoff − 90 min, lub fixture.deadline_time. */
export function buildDeadlinesByGw(
  fixtures: FplLabFixtureRow[],
  gameweeks: number[],
): Record<number, string | null> {
  const out: Record<number, string | null> = {};
  for (const gw of gameweeks) {
    const gwFx = fixtures.filter((f) => Number(f.gameweek) === gw);
    let best: string | null = null;
    let bestMs = Infinity;
    for (const f of gwFx) {
      if (f.deadline_time) {
        const ms = Date.parse(f.deadline_time);
        if (Number.isFinite(ms) && ms < bestMs) {
          bestMs = ms;
          best = f.deadline_time;
        }
      }
      if (f.kickoff_time) {
        const ms = Date.parse(f.kickoff_time) - 90 * 60 * 1000;
        if (Number.isFinite(ms) && ms < bestMs) {
          bestMs = ms;
          best = new Date(ms).toISOString();
        }
      }
    }
    out[gw] = best;
  }
  return out;
}

/** Re-export helpers for planner consumers. */
export {
  clamp,
  fdrLevel,
  computeSellingPriceTenths,
  willNextPriceDropAffectSellingPrice,
};
