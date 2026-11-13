import { describe, expect, it } from "vitest";
import {
  computeTeamGwXPts,
  meanXPtsOverHorizon,
  projectPlayerGw,
  sumXPtsOverHorizon,
  teamXPts,
  xPtsGw,
  type PlayerGwProjection,
  type PlannerXPtsContext,
  type SquadPlayerState,
} from "@/lib/stats-lab/plannerEngine";
import type { ProjectionsFixturePrediction } from "@/lib/stats-lab/projectionsEngine";
import { FIXTURE_PLAYERS_BY_ID } from "@/lib/stats-lab/__tests__/fixtures/minimal-rolling-plan";

function emptyFdrBundle() {
  return {
    overall: 50,
    attack: 50,
    defence: 50,
    levelOverall: 3 as const,
    levelAttack: 3 as const,
    levelDefence: 3 as const,
  };
}

function makePred(
  partial: Pick<
    ProjectionsFixturePrediction,
    | "fixtureId"
    | "gameweek"
    | "homeTeamId"
    | "awayTeamId"
    | "lambdaHome"
    | "lambdaAway"
  >,
): ProjectionsFixturePrediction {
  const csProbHome = Math.exp(-partial.lambdaAway);
  const csProbAway = Math.exp(-partial.lambdaHome);
  return {
    fixtureId: partial.fixtureId,
    gameweek: partial.gameweek,
    kickoffTime: "2025-08-15T14:00:00Z",
    deadlineTime: "2025-08-15T10:00:00Z",
    finished: false,
    started: false,
    homeTeamId: partial.homeTeamId,
    homeShortName: "HOM",
    homeName: "Home",
    homePulseCode: 1,
    awayTeamId: partial.awayTeamId,
    awayShortName: "AWY",
    awayName: "Away",
    awayPulseCode: 2,
    lambdaHome: partial.lambdaHome,
    lambdaAway: partial.lambdaAway,
    csProbHome,
    csProbAway,
    csPctHome: Math.round(csProbHome * 1000) / 10,
    csPctAway: Math.round(csProbAway * 1000) / 10,
    pWinHome: 0.4,
    pDraw: 0.25,
    pWinAway: 0.35,
    winPctHome: 40,
    drawPct: 25,
    winPctAway: 35,
    twoPlusGoalsProbHome: 0.5,
    twoPlusGoalsProbAway: 0.4,
    twoPlusGoalsPctHome: 50,
    twoPlusGoalsPctAway: 40,
    topExactScores: [
      { homeGoals: 1, awayGoals: 1, scoreLabel: "1-1", probability: 0.12, pct: 12 },
      { homeGoals: 2, awayGoals: 1, scoreLabel: "2-1", probability: 0.1, pct: 10 },
      { homeGoals: 1, awayGoals: 0, scoreLabel: "1-0", probability: 0.09, pct: 9 },
    ],
    fdrHome: emptyFdrBundle(),
    fdrAway: emptyFdrBundle(),
    verification: null,
  };
}

function baseCtx(
  predictions: ProjectionsFixturePrediction[],
): PlannerXPtsContext {
  return {
    playersById: FIXTURE_PLAYERS_BY_ID,
    historyByPlayerId: new Map(),
    fixturePredictions: new Map(predictions.map((p) => [p.fixtureId, p])),
    finishedFixturesByTeamId: new Map(),
    teamXg90ByTeamId: new Map([[1, 1.4]]),
    lang: "pl",
  };
}

function stubProj(
  elementId: number,
  xPts: number,
  p0 = 0.1,
): PlayerGwProjection {
  return {
    elementId,
    gameweek: 1,
    xPts,
    expectedMinutes: 80,
    p0,
    p60: 0.85,
    p1: 0.05,
    isBlank: false,
    isDouble: false,
    fixtures: [],
  };
}

function makeSquad(ids: number[]): SquadPlayerState[] {
  return ids.map((elementId, i) => ({
    elementId,
    slot: i + 1,
    isCaptain: i === 0,
    isViceCaptain: i === 1,
    purchasePriceTenths: 50,
    nowCostTenths: 50,
    sellingPriceTenths: 50,
  }));
}

describe("xPtsGw BGW / DGW", () => {
  it("BGW → null (projectPlayerGw nadal xPts: 0 + isBlank)", () => {
    const ctx = baseCtx([]);
    const raw = projectPlayerGw(1, 1, ctx);
    expect(raw.isBlank).toBe(true);
    expect(raw.xPts).toBe(0);
    expect(xPtsGw(1, 1, ctx)).toBeNull();
  });

  it("DGW → suma dwóch meczów", () => {
    const ctx = baseCtx([
      makePred({
        fixtureId: 101,
        gameweek: 2,
        homeTeamId: 1,
        awayTeamId: 10,
        lambdaHome: 1.6,
        lambdaAway: 1.0,
      }),
      makePred({
        fixtureId: 102,
        gameweek: 2,
        homeTeamId: 11,
        awayTeamId: 1,
        lambdaHome: 1.2,
        lambdaAway: 1.4,
      }),
    ]);
    const proj = projectPlayerGw(1, 2, ctx);
    expect(proj.isBlank).toBe(false);
    expect(proj.isDouble).toBe(true);
    expect(proj.fixtures).toHaveLength(2);
    const sumFixtures = proj.fixtures.reduce((s, f) => s + f.matchXPts, 0);
    expect(proj.xPts).toBe(Number(sumFixtures.toFixed(2)));
    expect(xPtsGw(1, 2, ctx)).toBe(proj.xPts);
  });
});

describe("teamXPts captain / vice / chip", () => {
  it("captain ×2; triple captain ×3; vice gets (mult−1)·P(C nie gra)·xPts(VC)", () => {
    const squad = makeSquad([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    const projectionsByElement = new Map<number, PlayerGwProjection>([
      [1, stubProj(1, 10, 0.2)],
      [2, stubProj(2, 8, 0.1)],
      ...[3, 4, 5, 6, 7, 8, 9, 10, 11].map(
        (id) => [id, stubProj(id, 4, 0.1)] as const,
      ),
      [12, stubProj(12, 3)],
      [13, stubProj(13, 2)],
      [14, stubProj(14, 1)],
      [15, stubProj(15, 1)],
    ]);

    const baseXi =
      10 + 8 + 4 * 9; /* C + VC + 9 others in XI slots 3..11 */
    // XI: slots 1..11 = ids 1..11 → 10+8+4*9 = 54
    expect(baseXi).toBe(54);

    const cPts = 10;
    const vcPts = 8;
    const p0C = 0.2;

    const normal = computeTeamGwXPts({
      squad,
      gw: 1,
      projectionsByElement,
      activeChip: null,
      transfersCostPts: 0,
    });
    const mult2 = 2;
    const expectedNormal =
      baseXi + (mult2 - 1) * cPts + (mult2 - 1) * p0C * vcPts;
    expect(normal.grossXPts).toBe(Number(expectedNormal.toFixed(2)));
    expect(
      teamXPts({
        squad,
        gw: 1,
        projectionsByElement,
        activeChip: null,
      }),
    ).toBe(normal.grossXPts);

    const tc = computeTeamGwXPts({
      squad,
      gw: 1,
      projectionsByElement,
      activeChip: "3xc",
      transfersCostPts: 0,
    });
    const mult3 = 3;
    const expectedTc =
      baseXi + (mult3 - 1) * cPts + (mult3 - 1) * p0C * vcPts;
    expect(tc.grossXPts).toBe(Number(expectedTc.toFixed(2)));
  });
});

describe("horizon sum / mean with BGW null", () => {
  it("sum treats null as 0; mean skips null", () => {
    const horizon: Array<number | null> = [5, null, 7, null, 3];
    expect(sumXPtsOverHorizon(horizon)).toBe(15);
    expect(meanXPtsOverHorizon(horizon)).toBe(5);
    expect(meanXPtsOverHorizon([null, null])).toBeNull();
  });

  it("A2: all-BGW horizon → mean null (not NaN), sum 0", () => {
    const allBlank: Array<number | null> = [null, null, null];
    const mean = meanXPtsOverHorizon(allBlank);
    const sum = sumXPtsOverHorizon(allBlank);
    expect(mean).toBeNull();
    expect(Number.isNaN(mean as number)).toBe(false);
    expect(sum).toBe(0);
  });

  it("teamXPts uses projection xPts (BGW stored as 0 in projectPlayerGw)", () => {
    const squad = makeSquad([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    const blank: PlayerGwProjection = {
      elementId: 1,
      gameweek: 1,
      xPts: 0,
      expectedMinutes: 0,
      p0: 1,
      p60: 0,
      p1: 0,
      isBlank: true,
      isDouble: false,
      fixtures: [],
    };
    const projectionsByElement = new Map<number, PlayerGwProjection>([
      [1, blank],
      ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(
        (id) => [id, stubProj(id, 2, 0)] as const,
      ),
    ]);
    // Captain blank: base XI = 0 + 2*10 = 20; captain bonus (2-1)*0 + (2-1)*1*2(VC) = 2
    const gross = teamXPts({
      squad,
      gw: 1,
      projectionsByElement,
      activeChip: null,
    });
    expect(gross).toBe(22);
  });

  it("A2: captain BGW (p0=1, xPts=0) → full multiplier on vice (VC=5)", () => {
    const squad = makeSquad([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    const projectionsByElement = new Map<number, PlayerGwProjection>([
      [1, stubProj(1, 0, 1)], // captain BGW: p0=1, xPts=0
      [2, stubProj(2, 5, 0)], // vice = 5
      ...[3, 4, 5, 6, 7, 8, 9, 10, 11].map(
        (id) => [id, stubProj(id, 2, 0)] as const,
      ),
    ]);
    // base XI = 0 + 5 + 2*9 = 23
    const baseXiSum = 0 + 5 + 2 * 9;
    expect(baseXiSum).toBe(23);

    const normal = teamXPts({
      squad,
      gw: 1,
      projectionsByElement,
      activeChip: null,
    });
    // bonus = (2-1)*0 + (2-1)*1*5 = 5 → total 28
    expect(normal).toBe(baseXiSum + 5);

    const tc = teamXPts({
      squad,
      gw: 1,
      projectionsByElement,
      activeChip: "3xc",
    });
    // bonus = (3-1)*0 + (3-1)*1*5 = 10 → total 33
    expect(tc).toBe(baseXiSum + 10);
  });
});
