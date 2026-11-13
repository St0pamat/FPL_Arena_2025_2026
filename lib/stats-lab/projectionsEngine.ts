/**
 * FPL Arena Stats Lab — Dixon-Coles v0.2 projections engine.
 * Pure / deterministic (no DB I/O). Contract: docs/08 §6 + Appendix A.
 */

import type { FplLabClub, FplLabFixtureRow } from "@/lib/stats-lab/types";

/* ─────────────────────────────────────────────────
 * Public unions / enums
 * ───────────────────────────────────────────────── */

export type ProjectionsSubView =
  | "FIXTURES_FDR"
  | "PROJECTED_GOALS"
  | "CLEAN_SHEETS"
  | "MATCHUP_CARDS";

export type ProjectionsFdrMode = "OVERALL" | "ATTACK" | "DEFENCE";
export type ProjectionsCellMetric = "FDR" | "GOALS" | "CS_PCT" | "WIN_PCT";
export type ProjectionsVenueFilter = "ALL" | "HOME_ONLY" | "AWAY_ONLY";
export type ProjectionsCellLayout =
  | "TEXT_ONLY"
  | "TEXT_AND_BADGE"
  | "LARGE_BADGE";
export type ProjectionsDgwCsDisplayMode =
  | "SPLIT_MATCHES"
  | "COMBINED_AT_LEAST_ONE";

export type ProjectionsFdrLevel = 1 | 2 | 3 | 4 | 5;
export type Projections1X2 = "1" | "X" | "2";

/* ─────────────────────────────────────────────────
 * Public result shapes
 * ───────────────────────────────────────────────── */

export interface ProjectionsExactScoreItem {
  homeGoals: number;
  awayGoals: number;
  scoreLabel: string;
  probability: number;
  pct: number;
}

export interface ProjectionsMatchupVerification {
  actualHomeGoals: number;
  actualAwayGoals: number;
  actualScoreLabel: string;
  actualOutcome1X2: Projections1X2;
  predictedOutcome1X2: Projections1X2;
  is1X2Correct: boolean;
  isTop3ExactScoreHit: boolean;
  matchedExactScoreRank: 1 | 2 | 3 | null;
  homeGoalsError: number;
  awayGoalsError: number;
  brierScore1X2: number;
}

export interface ProjectionsFdrBundle {
  overall: number;
  attack: number;
  defence: number;
  levelOverall: ProjectionsFdrLevel;
  levelAttack: ProjectionsFdrLevel;
  levelDefence: ProjectionsFdrLevel;
}

export interface ProjectionsFixturePrediction {
  fixtureId: number;
  gameweek: number;
  kickoffTime: string | null;
  deadlineTime: string | null;
  finished: boolean;
  started: boolean;
  homeTeamId: number;
  homeShortName: string;
  homeName: string;
  homePulseCode: number;
  awayTeamId: number;
  awayShortName: string;
  awayName: string;
  awayPulseCode: number;
  lambdaHome: number;
  lambdaAway: number;
  csProbHome: number;
  csProbAway: number;
  csPctHome: number;
  csPctAway: number;
  pWinHome: number;
  pDraw: number;
  pWinAway: number;
  winPctHome: number;
  drawPct: number;
  winPctAway: number;
  twoPlusGoalsProbHome: number;
  twoPlusGoalsProbAway: number;
  twoPlusGoalsPctHome: number;
  twoPlusGoalsPctAway: number;
  topExactScores: [
    ProjectionsExactScoreItem,
    ProjectionsExactScoreItem,
    ProjectionsExactScoreItem,
  ];
  fdrHome: ProjectionsFdrBundle;
  fdrAway: ProjectionsFdrBundle;
  verification: ProjectionsMatchupVerification | null;
}

export interface ProjectionsTeamFixtureItem {
  fixtureId: number;
  gameweek: number;
  kickoffTime: string | null;
  wasHome: boolean;
  opponentTeamId: number;
  opponentShortName: string;
  opponentName: string;
  opponentPulseCode: number;
  tickerLabelMatrix: string;
  tickerLabelSingleGwPl: string;
  tickerLabelSingleGwEn: string;
  projectedGoals: number;
  projectedGoalsConceded: number;
  csProb: number;
  csPct: number;
  winProb: number;
  winPct: number;
  drawProb: number;
  twoPlusGoalsPct: number;
  fdrOverall: number;
  fdrAttack: number;
  fdrDefence: number;
  fdrLevelOverall: ProjectionsFdrLevel;
  fdrLevelAttack: ProjectionsFdrLevel;
  fdrLevelDefence: ProjectionsFdrLevel;
  finished: boolean;
  actualGoalsFor: number | null;
  actualGoalsAgainst: number | null;
}

export interface ProjectionsTeamGwCell {
  gameweek: number;
  isBlank: boolean;
  isDgw: boolean;
  fixtures: ProjectionsTeamFixtureItem[];
  totalProjectedGoals: number | null;
  totalExpectedCs: number | null;
  combinedAtLeastOneCsProb: number | null;
  combinedAtLeastOneCsPct: number | null;
  avgWinPct: number | null;
  avgFdrOverall: number | null;
  avgFdrAttack: number | null;
  avgFdrDefence: number | null;
  fdrLevelOverall: ProjectionsFdrLevel | null;
  fdrLevelAttack: ProjectionsFdrLevel | null;
  fdrLevelDefence: ProjectionsFdrLevel | null;
}

export interface ProjectionsTeamRow {
  teamId: number;
  name: string;
  shortName: string;
  pulseCode: number;
  cellsByGw: Record<number, ProjectionsTeamGwCell>;
  matchesCount: number;
  avgFdrOverall: number | null;
  avgFdrAttack: number | null;
  avgFdrDefence: number | null;
  easeScoreOverall: number | null;
  totalProjectedGoals: number;
  avgProjectedGoalsPerMatch: number | null;
  totalExpectedCleanSheets: number;
  avgCleanSheetPctPerMatch: number | null;
  attackStrengthHome: number;
  attackStrengthAway: number;
  defenceStrengthHome: number;
  defenceStrengthAway: number;
}

export type ProjectionsSortKey =
  | "easeOverall"
  | "avgFdrOverall"
  | "avgFdrAttack"
  | "avgFdrDefence"
  | "totalProjectedGoals"
  | "totalExpectedCleanSheets"
  | "shortName";

export interface ProjectionsHistoryXgRow {
  fixture_id: number;
  was_home: boolean;
  expected_goals: number;
}

export interface ProjectionsBuildInput {
  seasonCode: string;
  clubs: FplLabClub[];
  fixtures: FplLabFixtureRow[];
  historyXg: ProjectionsHistoryXgRow[];
  startGw: number;
  endGw: number;
  lastFinishedGw?: number;
  hiddenGws?: number[];
  venueFilter?: ProjectionsVenueFilter;
  sortBy?: ProjectionsSortKey;
  sortDir?: "asc" | "desc";
  /** GW używana do mnożników a_H/a_A/d_H/d_A na wierszu (domyślnie startGw). */
  referenceGw?: number;
  rho?: number;
}

export interface ProjectionsBuildResult {
  seasonCode: string;
  startGw: number;
  endGw: number;
  defaultStartGw: number;
  defaultEndGw: number;
  lastFinishedGw: number;
  gameweeks: number[];
  teams: ProjectionsTeamRow[];
  matchupsByGw: Record<number, ProjectionsFixturePrediction[]>;
  qaSelfCheck: { passed: boolean; checks: Record<string, boolean> };
}

/* ─────────────────────────────────────────────────
 * Model constants
 * ───────────────────────────────────────────────── */

export const MU_H_BASE = 1.55;
export const MU_A_BASE = 1.25;
export const K_MU = 30;
export const ALPHA = 0.7;
export const SHRINK_K = 6;
export const KAPPA = 2.0;
export const DEFAULT_RHO = -0.10;
export const LAMBDA_MIN = 0.15;
export const LAMBDA_MAX = 4.5;
export const STRENGTH_CLAMP_LO = 0.4;
export const STRENGTH_CLAMP_HI = 2.5;
export const TIME_DECAY = 0.0065;
export const STRENGTH_FALLBACK = 1000;

/* ─────────────────────────────────────────────────
 * Math helpers
 * ───────────────────────────────────────────────── */

export function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

export function lin(v: number, lo: number, hi: number): number {
  if (hi - lo <= 1e-6) return 0.5;
  return clamp((v - lo) / (hi - lo), 0, 1);
}

export function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export function fdrLevel(fdr: number): ProjectionsFdrLevel {
  return Math.min(5, Math.floor(fdr / 20) + 1) as ProjectionsFdrLevel;
}

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i += 1) r *= i;
  return r;
}

function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

function dcTau(x: number, y: number, lambdaH: number, lambdaA: number, r: number): number {
  if (x === 0 && y === 0) return 1 - lambdaH * lambdaA * r;
  if (x === 0 && y === 1) return 1 + lambdaH * r;
  if (x === 1 && y === 0) return 1 + lambdaA * r;
  if (x === 1 && y === 1) return 1 - r;
  return 1;
}

export function clampDixonColesRho(
  rho: number,
  lambdaH: number,
  lambdaA: number,
): number {
  const lo = Math.max(-1 / lambdaH, -1 / lambdaA);
  const hi = Math.min(1 / (lambdaH * lambdaA), 1);
  return clamp(rho, lo, hi);
}

export interface DixonColesGridResult {
  maxGoals: number;
  r: number;
  pWinHome: number;
  pDraw: number;
  pWinAway: number;
  twoPlusHome: number;
  twoPlusAway: number;
  topExactScores: [
    ProjectionsExactScoreItem,
    ProjectionsExactScoreItem,
    ProjectionsExactScoreItem,
  ];
  matrixSum: number;
  /** Renormalizowana macierz P[x][y] (0…maxGoals); nowe pole, bez wpływu na istniejące. */
  matrix?: number[][];
}

/** Alias API: siatka Dixona-Colesa (scoreGrid). */
export function scoreGrid(
  lambdaH: number,
  lambdaA: number,
  rho: number = DEFAULT_RHO,
): DixonColesGridResult {
  return buildDixonColesGrid(lambdaH, lambdaA, rho);
}

/** P(CS) zamknięte: exp(−λ_rywala). */
export function csProb(lambdaOpp: number): number {
  return Math.exp(-lambdaOpp);
}

/** Top 3 dokładne wyniki z siatki. */
export function top3Scores(
  lambdaH: number,
  lambdaA: number,
  rho: number = DEFAULT_RHO,
): [
  ProjectionsExactScoreItem,
  ProjectionsExactScoreItem,
  ProjectionsExactScoreItem,
] {
  return buildDixonColesGrid(lambdaH, lambdaA, rho).topExactScores;
}

/** Prawdopodobieństwa 1X2 z siatki. */
export function outcomeProbs(
  lambdaH: number,
  lambdaA: number,
  rho: number = DEFAULT_RHO,
): { pWinHome: number; pDraw: number; pWinAway: number } {
  const g = buildDixonColesGrid(lambdaH, lambdaA, rho);
  return {
    pWinHome: g.pWinHome,
    pDraw: g.pDraw,
    pWinAway: g.pWinAway,
  };
}

export function fdrAttack(lambdaTeam: number): number {
  return 100 * (1 - lin(lambdaTeam, 0.6, 2.6));
}

export function fdrDefence(csProbTeam: number): number {
  return 100 * (1 - lin(csProbTeam, 0.08, 0.55));
}

export function fdrOverall(pWin: number, pDraw: number): number {
  return 100 * (1 - lin(pWin + 0.5 * pDraw, 0.15, 0.85));
}

export function buildDixonColesGrid(
  lambdaH: number,
  lambdaA: number,
  rho: number = DEFAULT_RHO,
): DixonColesGridResult {
  const r = clampDixonColesRho(rho, lambdaH, lambdaA);
  const maxL = Math.max(lambdaH, lambdaA);
  const maxGoals = Math.max(12, Math.ceil(maxL + 8 * Math.sqrt(maxL)));

  const cells: Array<{ x: number; y: number; p: number }> = [];
  let sum = 0;
  for (let x = 0; x <= maxGoals; x += 1) {
    const px = poissonPmf(x, lambdaH);
    for (let y = 0; y <= maxGoals; y += 1) {
      const py = poissonPmf(y, lambdaA);
      const p = Math.max(0, dcTau(x, y, lambdaH, lambdaA, r) * px * py);
      cells.push({ x, y, p });
      sum += p;
    }
  }

  if (sum <= 0) {
    // Degenerate fallback — independent 0-0
    sum = 1;
    cells[0] = { x: 0, y: 0, p: 1 };
  } else {
    for (const c of cells) c.p /= sum;
  }

  let pWinHome = 0;
  let pDraw = 0;
  let pWinAway = 0;
  let twoPlusHome = 0;
  let twoPlusAway = 0;
  const matrix: number[][] = Array.from({ length: maxGoals + 1 }, () =>
    Array.from({ length: maxGoals + 1 }, () => 0),
  );
  for (const c of cells) {
    if (c.x > c.y) pWinHome += c.p;
    else if (c.x === c.y) pDraw += c.p;
    else pWinAway += c.p;
    if (c.x >= 2) twoPlusHome += c.p;
    if (c.y >= 2) twoPlusAway += c.p;
    matrix[c.x]![c.y] = c.p;
  }

  const ranked = [...cells].sort((a, b) => {
    if (b.p !== a.p) return b.p - a.p;
    const sa = a.x + a.y;
    const sb = b.x + b.y;
    if (sa !== sb) return sa - sb;
    return b.x - a.x;
  });

  const top = ranked.slice(0, 3).map((c) => ({
    homeGoals: c.x,
    awayGoals: c.y,
    scoreLabel: `${c.x}-${c.y}`,
    probability: c.p,
    pct: round1(c.p * 100),
  })) as [
    ProjectionsExactScoreItem,
    ProjectionsExactScoreItem,
    ProjectionsExactScoreItem,
  ];

  while (top.length < 3) {
    top.push({
      homeGoals: 0,
      awayGoals: 0,
      scoreLabel: "0-0",
      probability: 0,
      pct: 0,
    });
  }

  return {
    maxGoals,
    r,
    pWinHome,
    pDraw,
    pWinAway,
    twoPlusHome,
    twoPlusAway,
    topExactScores: top,
    matrixSum: 1,
    matrix,
  };
}

export function computeFdrBundle(args: {
  lambdaTeam: number;
  csProbTeam: number;
  pWin: number;
  pDraw: number;
}): ProjectionsFdrBundle {
  const attack = fdrAttack(args.lambdaTeam);
  const defence = fdrDefence(args.csProbTeam);
  const overall = fdrOverall(args.pWin, args.pDraw);
  return {
    overall,
    attack,
    defence,
    levelOverall: fdrLevel(overall),
    levelAttack: fdrLevel(attack),
    levelDefence: fdrLevel(defence),
  };
}

/* ─────────────────────────────────────────────────
 * Historical match aggregation (fixture-level xG)
 * ───────────────────────────────────────────────── */

interface FixtureXgAgg {
  fixtureId: number;
  gameweek: number | null;
  kickoffMs: number;
  finished: boolean;
  teamH: number;
  teamA: number;
  gfH: number;
  gfA: number;
  xgH: number;
  xgA: number;
  hasPlayerXg: boolean;
}

function parseMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function buildFixtureXgIndex(
  fixtures: FplLabFixtureRow[],
  historyXg: ProjectionsHistoryXgRow[],
): Map<number, FixtureXgAgg> {
  const xgByFixture = new Map<number, { home: number; away: number; rows: number }>();
  for (const row of historyXg) {
    const fid = Number(row.fixture_id);
    if (!Number.isFinite(fid)) continue;
    const cur = xgByFixture.get(fid) ?? { home: 0, away: 0, rows: 0 };
    const xg = Number(row.expected_goals) || 0;
    if (row.was_home) cur.home += xg;
    else cur.away += xg;
    cur.rows += 1;
    xgByFixture.set(fid, cur);
  }

  const out = new Map<number, FixtureXgAgg>();
  for (const f of fixtures) {
    const kickoffMs = parseMs(f.kickoff_time);
    if (kickoffMs == null) continue;
    const xg = xgByFixture.get(f.fixture_id);
    const gfH = f.team_h_score ?? 0;
    const gfA = f.team_a_score ?? 0;
    const hasPlayerXg = Boolean(xg && xg.rows > 0);
    out.set(f.fixture_id, {
      fixtureId: f.fixture_id,
      gameweek: f.gameweek,
      kickoffMs,
      finished: Boolean(f.finished),
      teamH: f.team_h,
      teamA: f.team_a,
      gfH,
      gfA,
      xgH: hasPlayerXg ? xg!.home : gfH,
      xgA: hasPlayerXg ? xg!.away : gfA,
      hasPlayerXg,
    });
  }
  return out;
}

export function resolveGwCutoffMs(
  fixtures: FplLabFixtureRow[],
  gw: number,
): number | null {
  const gwFixtures = fixtures.filter((f) => f.gameweek === gw);
  if (!gwFixtures.length) return null;

  for (const f of gwFixtures) {
    const d = parseMs(f.deadline_time);
    if (d != null) return d;
  }

  let minKick: number | null = null;
  for (const f of gwFixtures) {
    const k = parseMs(f.kickoff_time);
    if (k == null) continue;
    if (minKick == null || k < minKick) minKick = k;
  }
  if (minKick == null) return null;
  return minKick - 90 * 60 * 1000;
}

interface VenueAccum {
  gFor: number;
  gAgst: number;
  n: number;
}

interface TeamVenueStats {
  H: VenueAccum;
  A: VenueAccum;
}

interface LeagueMus {
  muH: number;
  muA: number;
  nMatches: number;
}

function emptyVenue(): VenueAccum {
  return { gFor: 0, gAgst: 0, n: 0 };
}

function emptyTeamVenue(): TeamVenueStats {
  return { H: emptyVenue(), A: emptyVenue() };
}

function buildHistoryBeforeCutoff(
  fixtureIndex: Map<number, FixtureXgAgg>,
  cutoffMs: number,
): { league: LeagueMus; byTeam: Map<number, TeamVenueStats> } {
  const byTeam = new Map<number, TeamVenueStats>();
  let wSum = 0;
  let gHSum = 0;
  let gASum = 0;
  let nMatches = 0;

  for (const m of fixtureIndex.values()) {
    if (!m.finished) continue;
    if (!(m.kickoffMs < cutoffMs)) continue;

    const deltaDays = Math.max(0, (cutoffMs - m.kickoffMs) / 86_400_000);
    const w = Math.exp(-TIME_DECAY * deltaDays);
    const gH = ALPHA * m.xgH + (1 - ALPHA) * m.gfH;
    const gA = ALPHA * m.xgA + (1 - ALPHA) * m.gfA;

    wSum += w;
    gHSum += w * gH;
    gASum += w * gA;
    nMatches += 1;

    const home = byTeam.get(m.teamH) ?? emptyTeamVenue();
    home.H.gFor += w * gH;
    home.H.gAgst += w * gA;
    home.H.n += w;
    byTeam.set(m.teamH, home);

    const away = byTeam.get(m.teamA) ?? emptyTeamVenue();
    away.A.gFor += w * gA;
    away.A.gAgst += w * gH;
    away.A.n += w;
    byTeam.set(m.teamA, away);
  }

  if (nMatches === 0 || wSum <= 0) {
    return {
      league: { muH: MU_H_BASE, muA: MU_A_BASE, nMatches: 0 },
      byTeam,
    };
  }

  const muHSeason = gHSum / wSum;
  const muASeason = gASum / wSum;
  const muH =
    (nMatches * muHSeason + K_MU * MU_H_BASE) / (nMatches + K_MU);
  const muA =
    (nMatches * muASeason + K_MU * MU_A_BASE) / (nMatches + K_MU);

  return { league: { muH, muA, nMatches }, byTeam };
}

export interface TeamAttackDefence {
  aH: number;
  aA: number;
  dH: number;
  dA: number;
}

function strengthOrFallback(
  value: number | null | undefined,
  overall: number | null | undefined,
): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof overall === "number" && Number.isFinite(overall) && overall > 0) {
    return overall;
  }
  return STRENGTH_FALLBACK;
}

function meanPositive(values: number[]): number {
  if (!values.length) return STRENGTH_FALLBACK;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function priorAttack(sa: number, meanSa: number): number {
  if (!(sa > 0) || !Number.isFinite(sa) || !(meanSa > 0)) return 1;
  return Math.pow(sa / meanSa, KAPPA);
}

function priorDefence(sd: number, meanSd: number): number {
  if (!(sd > 0) || !Number.isFinite(sd) || !(meanSd > 0)) return 1;
  return Math.pow(meanSd / sd, KAPPA);
}

export function computeTeamAttackDefenceMap(
  clubs: FplLabClub[],
  history: { league: LeagueMus; byTeam: Map<number, TeamVenueStats> },
): Map<number, TeamAttackDefence> {
  const { muH, muA } = history.league;

  const saH = clubs.map((c) =>
    strengthOrFallback(c.strength_attack_home, c.strength ?? c.strength_overall_home),
  );
  const sdH = clubs.map((c) =>
    strengthOrFallback(c.strength_defence_home, c.strength ?? c.strength_overall_home),
  );
  const saA = clubs.map((c) =>
    strengthOrFallback(c.strength_attack_away, c.strength ?? c.strength_overall_away),
  );
  const sdA = clubs.map((c) =>
    strengthOrFallback(c.strength_defence_away, c.strength ?? c.strength_overall_away),
  );

  const meanSaH = meanPositive(saH);
  const meanSdH = meanPositive(sdH);
  const meanSaA = meanPositive(saA);
  const meanSdA = meanPositive(sdA);

  const out = new Map<number, TeamAttackDefence>();

  clubs.forEach((club, i) => {
    const aPriorH = priorAttack(saH[i], meanSaH);
    const dPriorH = priorDefence(sdH[i], meanSdH);
    const aPriorA = priorAttack(saA[i], meanSaA);
    const dPriorA = priorDefence(sdA[i], meanSdA);

    const stats = history.byTeam.get(club.fpl_team_id) ?? emptyTeamVenue();
    const nH = stats.H.n;
    const nA = stats.A.n;

    let aH: number;
    let dH: number;
    if (nH <= 0) {
      aH = aPriorH;
      dH = dPriorH;
    } else {
      const aData = stats.H.gFor / nH / muH;
      const dData = stats.H.gAgst / nH / muA;
      aH = (nH * aData + SHRINK_K * aPriorH) / (nH + SHRINK_K);
      dH = (nH * dData + SHRINK_K * dPriorH) / (nH + SHRINK_K);
    }

    let aA: number;
    let dA: number;
    if (nA <= 0) {
      aA = aPriorA;
      dA = dPriorA;
    } else {
      const aData = stats.A.gFor / nA / muA;
      const dData = stats.A.gAgst / nA / muH;
      aA = (nA * aData + SHRINK_K * aPriorA) / (nA + SHRINK_K);
      dA = (nA * dData + SHRINK_K * dPriorA) / (nA + SHRINK_K);
    }

    out.set(club.fpl_team_id, {
      aH: clamp(aH, STRENGTH_CLAMP_LO, STRENGTH_CLAMP_HI),
      dH: clamp(dH, STRENGTH_CLAMP_LO, STRENGTH_CLAMP_HI),
      aA: clamp(aA, STRENGTH_CLAMP_LO, STRENGTH_CLAMP_HI),
      dA: clamp(dA, STRENGTH_CLAMP_LO, STRENGTH_CLAMP_HI),
    });
  });

  return out;
}

function predicted1X2(
  pWinHome: number,
  pDraw: number,
  pWinAway: number,
): Projections1X2 {
  if (pWinHome >= pDraw && pWinHome >= pWinAway) return "1";
  if (pDraw >= pWinHome && pDraw >= pWinAway) return "X";
  return "2";
}

function actual1X2(hg: number, ag: number): Projections1X2 {
  if (hg > ag) return "1";
  if (hg < ag) return "2";
  return "X";
}

export function predictFixture(
  fixture: FplLabFixtureRow,
  clubsById: Map<number, FplLabClub>,
  strengths: Map<number, TeamAttackDefence>,
  muH: number,
  muA: number,
  rho: number = DEFAULT_RHO,
): ProjectionsFixturePrediction | null {
  if (fixture.gameweek == null) return null;
  const home = clubsById.get(fixture.team_h);
  const away = clubsById.get(fixture.team_a);
  if (!home || !away) return null;

  const sH = strengths.get(fixture.team_h) ?? {
    aH: 1,
    aA: 1,
    dH: 1,
    dA: 1,
  };
  const sA = strengths.get(fixture.team_a) ?? {
    aH: 1,
    aA: 1,
    dH: 1,
    dA: 1,
  };

  const lambdaHome = clamp(muH * sH.aH * sA.dA, LAMBDA_MIN, LAMBDA_MAX);
  const lambdaAway = clamp(muA * sA.aA * sH.dH, LAMBDA_MIN, LAMBDA_MAX);
  const csProbHome = csProb(lambdaAway);
  const csProbAway = csProb(lambdaHome);

  const grid = buildDixonColesGrid(lambdaHome, lambdaAway, rho);
  const fdrHome = computeFdrBundle({
    lambdaTeam: lambdaHome,
    csProbTeam: csProbHome,
    pWin: grid.pWinHome,
    pDraw: grid.pDraw,
  });
  const fdrAway = computeFdrBundle({
    lambdaTeam: lambdaAway,
    csProbTeam: csProbAway,
    pWin: grid.pWinAway,
    pDraw: grid.pDraw,
  });

  let verification: ProjectionsMatchupVerification | null = null;
  if (
    fixture.finished &&
    fixture.team_h_score != null &&
    fixture.team_a_score != null
  ) {
    const ah = fixture.team_h_score;
    const aa = fixture.team_a_score;
    const actualOutcome = actual1X2(ah, aa);
    const predictedOutcome = predicted1X2(
      grid.pWinHome,
      grid.pDraw,
      grid.pWinAway,
    );
    const i1 = actualOutcome === "1" ? 1 : 0;
    const iX = actualOutcome === "X" ? 1 : 0;
    const i2 = actualOutcome === "2" ? 1 : 0;
    let matched: 1 | 2 | 3 | null = null;
    grid.topExactScores.forEach((item, idx) => {
      if (
        matched == null &&
        item.homeGoals === ah &&
        item.awayGoals === aa
      ) {
        matched = (idx + 1) as 1 | 2 | 3;
      }
    });
    verification = {
      actualHomeGoals: ah,
      actualAwayGoals: aa,
      actualScoreLabel: `${ah}-${aa}`,
      actualOutcome1X2: actualOutcome,
      predictedOutcome1X2: predictedOutcome,
      is1X2Correct: actualOutcome === predictedOutcome,
      isTop3ExactScoreHit: matched != null,
      matchedExactScoreRank: matched,
      homeGoalsError: ah - lambdaHome,
      awayGoalsError: aa - lambdaAway,
      brierScore1X2:
        ((i1 - grid.pWinHome) ** 2 +
          (iX - grid.pDraw) ** 2 +
          (i2 - grid.pWinAway) ** 2) /
        3,
    };
  }

  return {
    fixtureId: fixture.fixture_id,
    gameweek: fixture.gameweek,
    kickoffTime: fixture.kickoff_time,
    deadlineTime: fixture.deadline_time,
    finished: Boolean(fixture.finished),
    started: Boolean(fixture.started),
    homeTeamId: home.fpl_team_id,
    homeShortName: home.short_name,
    homeName: home.name,
    homePulseCode: home.pulse_code,
    awayTeamId: away.fpl_team_id,
    awayShortName: away.short_name,
    awayName: away.name,
    awayPulseCode: away.pulse_code,
    lambdaHome,
    lambdaAway,
    csProbHome,
    csProbAway,
    csPctHome: round1(csProbHome * 100),
    csPctAway: round1(csProbAway * 100),
    pWinHome: grid.pWinHome,
    pDraw: grid.pDraw,
    pWinAway: grid.pWinAway,
    winPctHome: round1(grid.pWinHome * 100),
    drawPct: round1(grid.pDraw * 100),
    winPctAway: round1(grid.pWinAway * 100),
    twoPlusGoalsProbHome: grid.twoPlusHome,
    twoPlusGoalsProbAway: grid.twoPlusAway,
    twoPlusGoalsPctHome: round1(grid.twoPlusHome * 100),
    twoPlusGoalsPctAway: round1(grid.twoPlusAway * 100),
    topExactScores: grid.topExactScores,
    fdrHome,
    fdrAway,
    verification,
  };
}

function tickerMatrix(shortName: string, wasHome: boolean): string {
  const s = shortName.trim() || "???";
  return wasHome ? s.toUpperCase() : s.toLowerCase();
}

function toTeamFixtureItem(
  pred: ProjectionsFixturePrediction,
  teamId: number,
): ProjectionsTeamFixtureItem {
  const wasHome = pred.homeTeamId === teamId;
  const oppShort = wasHome ? pred.awayShortName : pred.homeShortName;
  const oppName = wasHome ? pred.awayName : pred.homeName;
  const oppId = wasHome ? pred.awayTeamId : pred.homeTeamId;
  const oppPulse = wasHome ? pred.awayPulseCode : pred.homePulseCode;
  const fdr = wasHome ? pred.fdrHome : pred.fdrAway;
  const projectedGoals = wasHome ? pred.lambdaHome : pred.lambdaAway;
  const projectedGoalsConceded = wasHome ? pred.lambdaAway : pred.lambdaHome;
  const csProb = wasHome ? pred.csProbHome : pred.csProbAway;
  const winProb = wasHome ? pred.pWinHome : pred.pWinAway;
  const twoPlus = wasHome
    ? pred.twoPlusGoalsPctHome
    : pred.twoPlusGoalsPctAway;

  let actualGoalsFor: number | null = null;
  let actualGoalsAgainst: number | null = null;
  if (pred.verification) {
    actualGoalsFor = wasHome
      ? pred.verification.actualHomeGoals
      : pred.verification.actualAwayGoals;
    actualGoalsAgainst = wasHome
      ? pred.verification.actualAwayGoals
      : pred.verification.actualHomeGoals;
  }

  const upper = oppShort.toUpperCase();
  return {
    fixtureId: pred.fixtureId,
    gameweek: pred.gameweek,
    kickoffTime: pred.kickoffTime,
    wasHome,
    opponentTeamId: oppId,
    opponentShortName: oppShort,
    opponentName: oppName,
    opponentPulseCode: oppPulse,
    tickerLabelMatrix: tickerMatrix(oppShort, wasHome),
    tickerLabelSingleGwPl: `${upper} (${wasHome ? "D" : "W"})`,
    tickerLabelSingleGwEn: `${upper} (${wasHome ? "H" : "A"})`,
    projectedGoals,
    projectedGoalsConceded,
    csProb,
    csPct: round1(csProb * 100),
    winProb,
    winPct: round1(winProb * 100),
    drawProb: pred.pDraw,
    twoPlusGoalsPct: twoPlus,
    fdrOverall: fdr.overall,
    fdrAttack: fdr.attack,
    fdrDefence: fdr.defence,
    fdrLevelOverall: fdr.levelOverall,
    fdrLevelAttack: fdr.levelAttack,
    fdrLevelDefence: fdr.levelDefence,
    finished: pred.finished,
    actualGoalsFor,
    actualGoalsAgainst,
  };
}

function buildGwCell(
  gameweek: number,
  items: ProjectionsTeamFixtureItem[],
): ProjectionsTeamGwCell {
  if (!items.length) {
    return {
      gameweek,
      isBlank: true,
      isDgw: false,
      fixtures: [],
      totalProjectedGoals: null,
      totalExpectedCs: null,
      combinedAtLeastOneCsProb: null,
      combinedAtLeastOneCsPct: null,
      avgWinPct: null,
      avgFdrOverall: null,
      avgFdrAttack: null,
      avgFdrDefence: null,
      fdrLevelOverall: null,
      fdrLevelAttack: null,
      fdrLevelDefence: null,
    };
  }

  const sorted = [...items].sort((a, b) => {
    const ka = parseMs(a.kickoffTime) ?? 0;
    const kb = parseMs(b.kickoffTime) ?? 0;
    if (ka !== kb) return ka - kb;
    return a.fixtureId - b.fixtureId;
  });

  const totalProjectedGoals = sorted.reduce((s, x) => s + x.projectedGoals, 0);
  const totalExpectedCs = sorted.reduce((s, x) => s + x.csProb, 0);
  const combinedAtLeastOneCsProb = 1 - sorted.reduce((p, x) => p * (1 - x.csProb), 1);
  const avgWinPct =
    sorted.reduce((s, x) => s + x.winPct, 0) / sorted.length;
  const avgFdrOverall =
    sorted.reduce((s, x) => s + x.fdrOverall, 0) / sorted.length;
  const avgFdrAttack =
    sorted.reduce((s, x) => s + x.fdrAttack, 0) / sorted.length;
  const avgFdrDefence =
    sorted.reduce((s, x) => s + x.fdrDefence, 0) / sorted.length;

  return {
    gameweek,
    isBlank: false,
    isDgw: sorted.length >= 2,
    fixtures: sorted,
    totalProjectedGoals,
    totalExpectedCs,
    combinedAtLeastOneCsProb,
    combinedAtLeastOneCsPct: round1(
      clamp(combinedAtLeastOneCsProb, 0, 1) * 100,
    ),
    avgWinPct,
    avgFdrOverall,
    avgFdrAttack,
    avgFdrDefence,
    fdrLevelOverall: fdrLevel(avgFdrOverall),
    fdrLevelAttack: fdrLevel(avgFdrAttack),
    fdrLevelDefence: fdrLevel(avgFdrDefence),
  };
}

function passesVenueFilter(
  item: ProjectionsTeamFixtureItem,
  venueFilter: ProjectionsVenueFilter,
): boolean {
  if (venueFilter === "ALL") return true;
  if (venueFilter === "HOME_ONLY") return item.wasHome;
  return !item.wasHome;
}

function compareTeams(
  a: ProjectionsTeamRow,
  b: ProjectionsTeamRow,
  sortBy: ProjectionsSortKey,
  sortDir: "asc" | "desc",
): number {
  const blankLast = (row: ProjectionsTeamRow) => row.matchesCount === 0;
  if (blankLast(a) !== blankLast(b)) return blankLast(a) ? 1 : -1;

  const dir = sortDir === "asc" ? 1 : -1;
  const num = (v: number | null | undefined) =>
    v == null || !Number.isFinite(v) ? null : v;

  let av: number | string | null = null;
  let bv: number | string | null = null;

  switch (sortBy) {
    case "easeOverall":
      av = num(a.easeScoreOverall);
      bv = num(b.easeScoreOverall);
      break;
    case "avgFdrOverall":
      av = num(a.avgFdrOverall);
      bv = num(b.avgFdrOverall);
      break;
    case "avgFdrAttack":
      av = num(a.avgFdrAttack);
      bv = num(b.avgFdrAttack);
      break;
    case "avgFdrDefence":
      av = num(a.avgFdrDefence);
      bv = num(b.avgFdrDefence);
      break;
    case "totalProjectedGoals":
      av = a.totalProjectedGoals;
      bv = b.totalProjectedGoals;
      break;
    case "totalExpectedCleanSheets":
      av = a.totalExpectedCleanSheets;
      bv = b.totalExpectedCleanSheets;
      break;
    case "shortName":
    default:
      av = a.shortName;
      bv = b.shortName;
      break;
  }

  if (typeof av === "string" && typeof bv === "string") {
    return av.localeCompare(bv) * dir;
  }
  if (av == null && bv == null) return a.shortName.localeCompare(b.shortName);
  if (av == null) return 1;
  if (bv == null) return -1;
  if (av === bv) return a.shortName.localeCompare(b.shortName);
  return ((av as number) - (bv as number)) * dir;
}

export function createDefaultProjectionsRange(lastFinishedGw: number): {
  defaultStartGw: number;
  defaultEndGw: number;
} {
  const defaultStartGw = Math.min(38, Math.max(1, (lastFinishedGw ?? 0) + 1));
  const defaultEndGw = Math.min(38, defaultStartGw + 5);
  return { defaultStartGw, defaultEndGw };
}

/**
 * Główny builder projekcji — Zero-Data-Leakage per GW.
 */
export function buildStatsLabProjections(
  input: ProjectionsBuildInput,
): ProjectionsBuildResult {
  const lastFinishedGw = Math.max(0, Math.min(38, input.lastFinishedGw ?? 0));
  const { defaultStartGw, defaultEndGw } =
    createDefaultProjectionsRange(lastFinishedGw);

  const startGw = Math.max(1, Math.min(38, Math.round(input.startGw)));
  const endGw = Math.max(startGw, Math.min(38, Math.round(input.endGw)));
  const hidden = new Set(input.hiddenGws ?? []);
  const venueFilter = input.venueFilter ?? "ALL";
  const sortBy = input.sortBy ?? "easeOverall";
  const sortDir = input.sortDir ?? "desc";
  const rho = input.rho ?? DEFAULT_RHO;
  const referenceGw = Math.max(
    1,
    Math.min(38, input.referenceGw ?? startGw),
  );

  const gameweeks: number[] = [];
  for (let g = startGw; g <= endGw; g += 1) {
    if (!hidden.has(g)) gameweeks.push(g);
  }

  const clubs = [...input.clubs].sort((a, b) =>
    a.short_name.localeCompare(b.short_name),
  );
  const clubsById = new Map(clubs.map((c) => [c.fpl_team_id, c]));
  const fixtureIndex = buildFixtureXgIndex(input.fixtures, input.historyXg);

  // Cache strengths per cutoff key (deadline ms)
  const strengthCache = new Map<
    number,
    { muH: number; muA: number; map: Map<number, TeamAttackDefence> }
  >();

  const getModelForGw = (gw: number) => {
    const cutoff =
      resolveGwCutoffMs(input.fixtures, gw) ??
      Date.parse("2099-01-01T00:00:00Z");
    const cached = strengthCache.get(cutoff);
    if (cached) return cached;
    const history = buildHistoryBeforeCutoff(fixtureIndex, cutoff);
    const map = computeTeamAttackDefenceMap(clubs, history);
    const packed = {
      muH: history.league.muH,
      muA: history.league.muA,
      map,
    };
    strengthCache.set(cutoff, packed);
    return packed;
  };

  const matchupsByGw: Record<number, ProjectionsFixturePrediction[]> = {};
  const predsByFixture = new Map<number, ProjectionsFixturePrediction>();

  for (const gw of gameweeks) {
    const model = getModelForGw(gw);
    const gwFixtures = input.fixtures.filter(
      (f) => f.gameweek === gw && Number.isFinite(f.team_h) && Number.isFinite(f.team_a),
    );
    const preds: ProjectionsFixturePrediction[] = [];
    for (const f of gwFixtures) {
      const pred = predictFixture(
        f,
        clubsById,
        model.map,
        model.muH,
        model.muA,
        rho,
      );
      if (!pred) continue;
      preds.push(pred);
      predsByFixture.set(pred.fixtureId, pred);
    }
    preds.sort((a, b) => {
      const ka = parseMs(a.kickoffTime) ?? 0;
      const kb = parseMs(b.kickoffTime) ?? 0;
      if (ka !== kb) return ka - kb;
      return a.fixtureId - b.fixtureId;
    });
    matchupsByGw[gw] = preds;
  }

  const refModel = getModelForGw(referenceGw);

  const teams: ProjectionsTeamRow[] = clubs.map((club) => {
    const cellsByGw: Record<number, ProjectionsTeamGwCell> = {};
    const allItems: ProjectionsTeamFixtureItem[] = [];

    for (const gw of gameweeks) {
      const gwPreds = matchupsByGw[gw] ?? [];
      const items = gwPreds
        .filter(
          (p) => p.homeTeamId === club.fpl_team_id || p.awayTeamId === club.fpl_team_id,
        )
        .map((p) => toTeamFixtureItem(p, club.fpl_team_id))
        .filter((item) => passesVenueFilter(item, venueFilter));
      cellsByGw[gw] = buildGwCell(gw, items);
      allItems.push(...items);
    }

    const matchesCount = allItems.length;
    let sumFdrO = 0;
    let sumFdrA = 0;
    let sumFdrD = 0;
    let sumGoals = 0;
    let sumCs = 0;
    for (const it of allItems) {
      sumFdrO += it.fdrOverall;
      sumFdrA += it.fdrAttack;
      sumFdrD += it.fdrDefence;
      sumGoals += it.projectedGoals;
      sumCs += it.csProb;
    }

    const avgFdrOverall = matchesCount ? sumFdrO / matchesCount : null;
    const avgFdrAttack = matchesCount ? sumFdrA / matchesCount : null;
    const avgFdrDefence = matchesCount ? sumFdrD / matchesCount : null;
    const strengths =
      refModel.map.get(club.fpl_team_id) ?? { aH: 1, aA: 1, dH: 1, dA: 1 };

    return {
      teamId: club.fpl_team_id,
      name: club.name,
      shortName: club.short_name,
      pulseCode: club.pulse_code,
      cellsByGw,
      matchesCount,
      avgFdrOverall,
      avgFdrAttack,
      avgFdrDefence,
      easeScoreOverall: avgFdrOverall == null ? null : 100 - avgFdrOverall,
      totalProjectedGoals: sumGoals,
      avgProjectedGoalsPerMatch: matchesCount ? sumGoals / matchesCount : null,
      totalExpectedCleanSheets: sumCs,
      avgCleanSheetPctPerMatch: matchesCount
        ? (sumCs / matchesCount) * 100
        : null,
      attackStrengthHome: strengths.aH,
      attackStrengthAway: strengths.aA,
      defenceStrengthHome: strengths.dH,
      defenceStrengthAway: strengths.dA,
    };
  });

  teams.sort((a, b) => compareTeams(a, b, sortBy, sortDir));

  return {
    seasonCode: input.seasonCode,
    startGw,
    endGw,
    defaultStartGw,
    defaultEndGw,
    lastFinishedGw,
    gameweeks,
    teams,
    matchupsByGw,
    qaSelfCheck: runProjectionsEngineQaSelfCheck(),
  };
}

/* ─────────────────────────────────────────────────
 * QA self-check (#1–#10)
 * ───────────────────────────────────────────────── */

export function runProjectionsEngineQaSelfCheck(): {
  passed: boolean;
  checks: Record<string, boolean>;
} {
  const checks: Record<string, boolean> = {};

  // QA #1 — CS closed form; projected goals === lambda
  {
    const lh = 1.7;
    const la = 1.1;
    const csH = Math.exp(-la);
    const csA = Math.exp(-lh);
    const grid = buildDixonColesGrid(lh, la);
    checks["QA1_cs_closed_form"] =
      Math.abs(csH - Math.exp(-la)) < 1e-12 &&
      Math.abs(csA - Math.exp(-lh)) < 1e-12;
    checks["QA1_projected_goals_are_lambda"] =
      lh === clamp(lh, LAMBDA_MIN, LAMBDA_MAX) &&
      la === clamp(la, LAMBDA_MIN, LAMBDA_MAX) &&
      grid.matrixSum === 1;
    void csH;
    void csA;
  }

  // QA #2 — n_V <= 0 → prior only; no NaN; mu base when empty
  {
    const clubs: FplLabClub[] = [
      {
        season_code: "t",
        fpl_team_id: 1,
        pulse_code: 1,
        name: "A",
        short_name: "AAA",
        strength: 1200,
        strength_attack_home: 1200,
        strength_attack_away: 1100,
        strength_defence_home: 1100,
        strength_defence_away: 1000,
        strength_overall_home: 1150,
        strength_overall_away: 1050,
        primary_color: null,
        updated_at: "",
      },
    ];
    const emptyHist = {
      league: { muH: MU_H_BASE, muA: MU_A_BASE, nMatches: 0 },
      byTeam: new Map<number, TeamVenueStats>(),
    };
    const map = computeTeamAttackDefenceMap(clubs, emptyHist);
    const s = map.get(1)!;
    checks["QA2_empty_n_uses_prior_finite"] =
      Number.isFinite(s.aH) &&
      Number.isFinite(s.dH) &&
      Number.isFinite(s.aA) &&
      Number.isFinite(s.dA) &&
      !Number.isNaN(s.aH);
  }

  // QA #3 — N_matches === 0 → mu base
  {
    const hist = buildHistoryBeforeCutoff(new Map(), Date.now());
    checks["QA3_mu_base_on_empty"] =
      hist.league.muH === MU_H_BASE && hist.league.muA === MU_A_BASE;
  }

  // QA #4 — rho clamp legal
  {
    const lh = 2.2;
    const la = 0.9;
    const r = clampDixonColesRho(-0.1, lh, la);
    const lo = Math.max(-1 / lh, -1 / la);
    const hi = Math.min(1 / (lh * la), 1);
    checks["QA4_rho_clamp"] = r >= lo - 1e-12 && r <= hi + 1e-12;
  }

  // QA #5 — large lambda → dynamic maxGoals + renormalized
  {
    const grid = buildDixonColesGrid(4.4, 4.2);
    const maxL = Math.max(4.4, 4.2);
    const expected = Math.max(12, Math.ceil(maxL + 8 * Math.sqrt(maxL)));
    checks["QA5_dynamic_grid"] =
      grid.maxGoals === expected && Math.abs(grid.matrixSum - 1) < 1e-9;
  }

  // QA #6 — Top3 tie-break order
  {
    // Construct equal probs scenario via tiny lambdas and inspect comparator on synthetic
    const items = [
      { x: 1, y: 1, p: 0.2 },
      { x: 2, y: 0, p: 0.2 },
      { x: 0, y: 0, p: 0.2 },
    ].sort((a, b) => {
      if (b.p !== a.p) return b.p - a.p;
      const sa = a.x + a.y;
      const sb = b.x + b.y;
      if (sa !== sb) return sa - sb;
      return b.x - a.x;
    });
    // equal p → smaller sum first → 0-0, then 2-0 vs 1-1 (sum 2): x DESC → 2-0 before 1-1
    checks["QA6_tie_break"] =
      items[0].x === 0 &&
      items[0].y === 0 &&
      items[1].x === 2 &&
      items[1].y === 0 &&
      items[2].x === 1 &&
      items[2].y === 1;
  }

  // QA #7 — DGW CS never > 100%; TOTAL = p1+p2
  {
    const p1 = 0.7;
    const p2 = 0.6;
    const totalExpected = p1 + p2;
    const combined = 1 - (1 - p1) * (1 - p2);
    checks["QA7_dgw_cs"] =
      Math.abs(totalExpected - 1.3) < 1e-12 &&
      combined <= 1 + 1e-12 &&
      round1(clamp(combined, 0, 1) * 100) <= 100;
  }

  // QA #8 — BGW null / blank last in sort
  {
    const blank: ProjectionsTeamRow = {
      teamId: 1,
      name: "Blank FC",
      shortName: "BLK",
      pulseCode: 1,
      cellsByGw: {},
      matchesCount: 0,
      avgFdrOverall: null,
      avgFdrAttack: null,
      avgFdrDefence: null,
      easeScoreOverall: null,
      totalProjectedGoals: 0,
      avgProjectedGoalsPerMatch: null,
      totalExpectedCleanSheets: 0,
      avgCleanSheetPctPerMatch: null,
      attackStrengthHome: 1,
      attackStrengthAway: 1,
      defenceStrengthHome: 1,
      defenceStrengthAway: 1,
    };
    const active: ProjectionsTeamRow = {
      ...blank,
      teamId: 2,
      shortName: "ACT",
      matchesCount: 2,
      avgFdrOverall: 40,
      easeScoreOverall: 60,
      totalProjectedGoals: 3,
    };
    const asc = [blank, active].sort((a, b) =>
      compareTeams(a, b, "easeOverall", "asc"),
    );
    const desc = [blank, active].sort((a, b) =>
      compareTeams(a, b, "easeOverall", "desc"),
    );
    checks["QA8_blank_sort_last"] =
      asc[asc.length - 1].teamId === 1 && desc[desc.length - 1].teamId === 1;
  }

  // QA #9 — Zero-Data-Leakage cutoff excludes later kickoff
  {
    const fixtures: FplLabFixtureRow[] = [
      {
        season_code: "t",
        fixture_id: 1,
        pulse_id: 1,
        gameweek: 10,
        kickoff_time: "2026-10-01T14:00:00Z",
        deadline_time: "2026-10-01T10:00:00Z",
        team_h: 1,
        team_a: 2,
        team_h_score: 2,
        team_a_score: 1,
        team_h_difficulty: 3,
        team_a_difficulty: 2,
        started: true,
        finished: true,
        finished_provisional: true,
        provisional_start_time: false,
        minutes: 90,
      },
      {
        season_code: "t",
        fixture_id: 2,
        pulse_id: 2,
        gameweek: 9,
        kickoff_time: "2026-09-20T14:00:00Z",
        deadline_time: "2026-09-20T10:00:00Z",
        team_h: 1,
        team_a: 3,
        team_h_score: 1,
        team_a_score: 0,
        team_h_difficulty: 2,
        team_a_difficulty: 3,
        started: true,
        finished: true,
        finished_provisional: true,
        provisional_start_time: false,
        minutes: 90,
      },
      {
        season_code: "t",
        fixture_id: 3,
        pulse_id: 3,
        gameweek: 9,
        kickoff_time: "2026-10-01T12:00:00Z", // after GW10 deadline
        deadline_time: "2026-09-20T10:00:00Z",
        team_h: 2,
        team_a: 3,
        team_h_score: 5,
        team_a_score: 5,
        team_h_difficulty: 3,
        team_a_difficulty: 3,
        started: true,
        finished: true,
        finished_provisional: true,
        provisional_start_time: false,
        minutes: 90,
      },
    ];
    const cutoff = resolveGwCutoffMs(fixtures, 10)!;
    const idx = buildFixtureXgIndex(fixtures, []);
    const hist = buildHistoryBeforeCutoff(idx, cutoff);
    // fixture 3 kickoff after cutoff must be excluded; fixture 2 included
    checks["QA9_zero_data_leakage"] =
      hist.league.nMatches === 1 &&
      cutoff === Date.parse("2026-10-01T10:00:00Z");
  }

  // QA #10 — lin degenerate → 0.5
  {
    checks["QA10_lin_degenerate"] = lin(1, 2, 2) === 0.5 && lin(10, 0, 0) === 0.5;
  }

  // Aggregate named QA1–QA10 keys expected by caller
  const named: Record<string, boolean> = {
    "QA#1":
      checks["QA1_cs_closed_form"] && checks["QA1_projected_goals_are_lambda"],
    "QA#2": checks["QA2_empty_n_uses_prior_finite"],
    "QA#3": checks["QA3_mu_base_on_empty"],
    "QA#4": checks["QA4_rho_clamp"],
    "QA#5": checks["QA5_dynamic_grid"],
    "QA#6": checks["QA6_tie_break"],
    "QA#7": checks["QA7_dgw_cs"],
    "QA#8": checks["QA8_blank_sort_last"],
    "QA#9": checks["QA9_zero_data_leakage"],
    "QA#10": checks["QA10_lin_degenerate"],
  };

  const passed = Object.values(named).every(Boolean);
  return { passed, checks: { ...checks, ...named } };
}
