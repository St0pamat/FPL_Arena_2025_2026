import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  arePlannerVariantsIdentical,
  buildPlannerDraftSummary,
  evaluateRollingPlan,
  type GwPlanDecision,
  type PlannedTransfer,
  type PlayerGwProjection,
} from "@/lib/stats-lab/plannerEngine";
import {
  FIXTURE_ENTRY,
  FIXTURE_PLAYERS,
  FIXTURE_PLAYERS_BY_ID,
} from "@/lib/stats-lab/__tests__/fixtures/minimal-rolling-plan";
import type { FplLabPlayer } from "@/lib/stats-lab/types";

const ENGINE_SRC = readFileSync(
  join(process.cwd(), "lib/stats-lab/plannerEngine.ts"),
  "utf8",
);

function stubProj(
  elementId: number,
  xPts: number,
  opts?: { isBlank?: boolean; p0?: number },
): PlayerGwProjection {
  const isBlank = opts?.isBlank ?? false;
  return {
    elementId,
    gameweek: 1,
    xPts: isBlank ? 0 : xPts,
    expectedMinutes: isBlank ? 0 : 80,
    p0: opts?.p0 ?? (isBlank ? 1 : 0.1),
    p60: isBlank ? 0 : 0.85,
    p1: isBlank ? 0 : 0.05,
    isBlank,
    isDouble: false,
    fixtures: [],
  };
}

function clonePlayer(
  base: FplLabPlayer,
  id: number,
  teamId: number,
  webName: string,
): FplLabPlayer {
  return {
    ...base,
    fpl_element_id: id,
    player_code: 10_000 + id,
    fpl_team_id: teamId,
    web_name: webName,
    second_name: webName,
  };
}

const EXTRA_PLAYERS: FplLabPlayer[] = [
  clonePlayer(FIXTURE_PLAYERS[11]!, 16, 9, "MID6"),
  clonePlayer(FIXTURE_PLAYERS[11]!, 17, 10, "MID7"),
  clonePlayer(FIXTURE_PLAYERS[6]!, 18, 11, "DEF6"),
];

const PLAYERS_WITH_MARKET = new Map<number, FplLabPlayer>([
  ...FIXTURE_PLAYERS_BY_ID,
  ...EXTRA_PLAYERS.map((p) => [p.fpl_element_id, p] as const),
]);

function transfer(
  gw: number,
  outElementId: number,
  inElementId: number,
): PlannedTransfer {
  return {
    id: `t-${gw}-${outElementId}-${inElementId}`,
    gw,
    outElementId,
    inElementId,
    outSellingPriceTenths: 50,
    inPurchasePriceTenths: 50,
  };
}

function decision(
  gw: number,
  partial: Partial<GwPlanDecision> = {},
): GwPlanDecision {
  return {
    gw,
    transfers: [],
    activeChip: null,
    ...partial,
  };
}

function flatProj(xPts: number): (
  elementId: number,
  gw: number,
) => PlayerGwProjection {
  return (elementId, gw) => ({
    ...stubProj(elementId, xPts),
    gameweek: gw,
  });
}

describe("buildPlannerDraftSummary metrics", () => {
  it("maps xPtsNextGw / horizon / FT from planningStartGw and last GW", () => {
    const gws = evaluateRollingPlan({
      entry: { ...FIXTURE_ENTRY, freeTransfers: 2 },
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions: [decision(13), decision(14), decision(15)],
      startGw: 13,
      endGw: 15,
      projectGw: flatProj(2),
    });
    expect(gws).toHaveLength(3);

    const summary = buildPlannerDraftSummary({
      variant: "A",
      gws,
      planningStartGw: 13,
      fallbackBankTenths: 0,
    });

    const first = gws[0]!;
    const last = gws[2]!;
    expect(summary.xPtsNextGw).toBe(first.grossXPts);
    expect(summary.ftNextGw).toBe(first.ftAvailable);
    expect(summary.ftEndOfPlan).toBe(last.ftAvailable);
    expect(summary.xPtsHorizonSum).toBe(
      gws.reduce((s, g) => s + g.grossXPts, 0),
    );
    expect(summary.xPtsHorizonNet).toBe(
      summary.xPtsHorizonSum - summary.totalHitPts,
    );
  });

  it("xPtsNextGw/ftNextGw return null when planningStartGw is outside horizon", () => {
    const gws = evaluateRollingPlan({
      entry: FIXTURE_ENTRY,
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions: [decision(14), decision(15)],
      startGw: 14,
      endGw: 15,
      projectGw: flatProj(1),
    });
    const summary = buildPlannerDraftSummary({
      variant: "B",
      gws,
      planningStartGw: 13,
      fallbackBankTenths: 0,
    });
    expect(summary.xPtsNextGw).toBeNull();
    expect(summary.ftNextGw).toBeNull();
    expect(summary.ftEndOfPlan).toBe(gws[gws.length - 1]!.ftAvailable);
    expect(summary.xPtsNextGw).not.toBeUndefined();
    expect(Number.isNaN(summary.xPtsNextGw as number)).toBe(false);
  });

  it("xPtsNextGw/ftNextGw ignore selected GW (PREV/NEXT) and stay on planningStartGw", () => {
    const gws = evaluateRollingPlan({
      entry: { ...FIXTURE_ENTRY, freeTransfers: 2 },
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions: [decision(13), decision(14), decision(15)],
      startGw: 13,
      endGw: 15,
      // Różne xPts per GW — żeby KPI wybranej GW ≠ pierwszej GW planu.
      projectGw: (elementId, gw) => ({
        ...stubProj(elementId, gw === 13 ? 2 : gw === 14 ? 4 : 6),
        gameweek: gw,
      }),
    });
    const first = gws.find((g) => g.gw === 13)!;
    const last = gws.find((g) => g.gw === 15)!;
    expect(first.grossXPts).not.toBe(last.grossXPts);
    expect(first.ftAvailable).not.toBe(last.ftAvailable);

    // Simulate UI selecting GW14 then GW15 — summary input does not take selectedGw.
    const selectedCandidates = [13, 14, 15] as const;
    const summaries = selectedCandidates.map(() =>
      buildPlannerDraftSummary({
        variant: "A",
        gws,
        planningStartGw: 13,
        fallbackBankTenths: 0,
      }),
    );
    for (const summary of summaries) {
      expect(summary.xPtsNextGw).toBe(first.grossXPts);
      expect(summary.ftNextGw).toBe(first.ftAvailable);
      expect(summary.xPtsNextGw).not.toBe(last.grossXPts);
      expect(summary.ftNextGw).not.toBe(last.ftAvailable);
    }
    expect(summaries[0]!.xPtsNextGw).toBe(summaries[1]!.xPtsNextGw);
    expect(summaries[1]!.ftNextGw).toBe(summaries[2]!.ftNextGw);
  });

  it("xPtsNextGw equals first-GW KPI gross when selected GW is planningStartGw", () => {
    const gws = evaluateRollingPlan({
      entry: FIXTURE_ENTRY,
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions: [decision(10), decision(11)],
      startGw: 10,
      endGw: 11,
      projectGw: flatProj(3),
    });
    const summary = buildPlannerDraftSummary({
      variant: "A",
      gws,
      planningStartGw: 10,
      fallbackBankTenths: 0,
    });
    const kpi = gws.find((g) => g.gw === 10)!;
    expect(summary.xPtsNextGw).toBe(kpi.grossXPts);
    expect(summary.ftNextGw).toBe(kpi.ftAvailable);
  });
});

describe("hits / wildcard FT cascade", () => {
  it("1 transfer over FT → −4 in totalHitPts; net ≠ gross", () => {
    // FT=1, two valid transfers → 1 hit (−4)
    const gws = evaluateRollingPlan({
      entry: { ...FIXTURE_ENTRY, freeTransfers: 1, bankTenths: 50 },
      playersById: PLAYERS_WITH_MARKET,
      decisions: [
        decision(13, {
          transfers: [transfer(13, 12, 16), transfer(13, 7, 18)],
        }),
      ],
      startGw: 13,
      endGw: 13,
      projectGw: flatProj(2),
    });
    const gw = gws[0]!;
    expect(gw.validTransfersCount).toBe(2);
    expect(gw.hitsCount).toBe(1);
    expect(gw.transferCostPts).toBe(4);
    expect(gw.netXPts).toBe(Number((gw.grossXPts - 4).toFixed(2)));
    expect(gw.netXPts).not.toBe(gw.grossXPts);

    const summary = buildPlannerDraftSummary({
      variant: "A",
      gws,
      planningStartGw: 13,
      fallbackBankTenths: 0,
    });
    expect(summary.totalHitPts).toBe(4);
    expect(summary.xPtsHorizonNet).toBe(summary.xPtsHorizonSum - 4);
    expect(summary.xPtsHorizonNet).not.toBe(summary.xPtsHorizonSum);
  });

  it("Wildcard in GW13 → 0 hits; FT in GW14 equals FT from GW13 (no +1)", () => {
    const gws = evaluateRollingPlan({
      entry: { ...FIXTURE_ENTRY, freeTransfers: 2, bankTenths: 50 },
      playersById: PLAYERS_WITH_MARKET,
      decisions: [
        decision(13, {
          activeChip: "wildcard",
          transfers: [
            transfer(13, 12, 16),
            transfer(13, 7, 18),
            transfer(13, 6, 17),
          ],
        }),
        decision(14),
      ],
      startGw: 13,
      endGw: 14,
      projectGw: flatProj(2),
    });
    const gw13 = gws.find((g) => g.gw === 13)!;
    const gw14 = gws.find((g) => g.gw === 14)!;
    expect(gw13.activeChip).toBe("wildcard");
    expect(gw13.hitsCount).toBe(0);
    expect(gw13.transferCostPts).toBe(0);
    expect(gw13.ftAvailable).toBe(2);
    expect(gw14.ftAvailable).toBe(gw13.ftAvailable);
  });
});

describe("arePlannerVariantsIdentical", () => {
  it("identical A/B/C decisions → true and equal summary metrics", () => {
    const decisions = [decision(13), decision(14)];
    expect(
      arePlannerVariantsIdentical(decisions, decisions, decisions),
    ).toBe(true);

    const gws = evaluateRollingPlan({
      entry: FIXTURE_ENTRY,
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions,
      startGw: 13,
      endGw: 14,
      projectGw: flatProj(2),
    });
    const a = buildPlannerDraftSummary({
      variant: "A",
      gws,
      planningStartGw: 13,
      fallbackBankTenths: 0,
    });
    const b = buildPlannerDraftSummary({
      variant: "B",
      gws,
      planningStartGw: 13,
      fallbackBankTenths: 0,
    });
    const c = buildPlannerDraftSummary({
      variant: "C",
      gws,
      planningStartGw: 13,
      fallbackBankTenths: 0,
    });
    expect(a.xPtsNextGw).toBe(b.xPtsNextGw);
    expect(b.xPtsNextGw).toBe(c.xPtsNextGw);
    expect(a.xPtsHorizonSum).toBe(c.xPtsHorizonSum);
    expect(a.ftNextGw).toBe(c.ftNextGw);
    expect(a.ftEndOfPlan).toBe(c.ftEndOfPlan);
  });

  it("same squad/transfers but different captain → false", () => {
    const baseTransfers = [transfer(13, 12, 16)];
    const base = decision(13, {
      transfers: baseTransfers,
      captainElementId: 1,
      viceCaptainElementId: 13,
      activeChip: null,
    });
    const otherCap = decision(13, {
      transfers: baseTransfers,
      captainElementId: 8,
      viceCaptainElementId: 13,
      activeChip: null,
    });
    expect(
      arePlannerVariantsIdentical([base], [base], [otherCap]),
    ).toBe(false);
  });

  it("same squad/transfers but different vice-captain → false", () => {
    const baseTransfers = [transfer(13, 12, 16)];
    const base = decision(13, {
      transfers: baseTransfers,
      captainElementId: 1,
      viceCaptainElementId: 13,
      activeChip: null,
    });
    const otherVice = decision(13, {
      transfers: baseTransfers,
      captainElementId: 1,
      viceCaptainElementId: 8,
      activeChip: null,
    });
    expect(
      arePlannerVariantsIdentical([base], [base], [otherVice]),
    ).toBe(false);
  });

  it("same squad/transfers but different chip → false", () => {
    const baseTransfers = [transfer(13, 12, 16)];
    const base = decision(13, {
      transfers: baseTransfers,
      captainElementId: 1,
      viceCaptainElementId: 13,
      activeChip: null,
    });
    const withChip = decision(13, {
      transfers: baseTransfers,
      captainElementId: 1,
      viceCaptainElementId: 13,
      activeChip: "wildcard",
    });
    expect(
      arePlannerVariantsIdentical([base], [base], [withChip]),
    ).toBe(false);
  });
});

describe("engine warning keys (A2)", () => {
  it("does not contain hardcoded Captain/Vice BGW English strings", () => {
    expect(ENGINE_SRC).not.toContain("Captain has BGW.");
    expect(ENGINE_SRC).not.toContain("Vice-captain has BGW.");
  });

  it("emits planner.captain.noFixture when captain has BGW", () => {
    const gws = evaluateRollingPlan({
      entry: FIXTURE_ENTRY,
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions: [
        decision(1, {
          captainElementId: 1,
          viceCaptainElementId: 13,
        }),
      ],
      startGw: 1,
      endGw: 1,
      projectGw: (elementId, gw) => {
        const isCap = elementId === 1;
        return {
          ...stubProj(elementId, isCap ? 0 : 2, {
            isBlank: isCap,
            p0: isCap ? 1 : 0.1,
          }),
          gameweek: gw,
        };
      },
    });
    expect(gws[0]!.captainElementId).toBe(1);
    const keys = gws[0]!.warnings.map((w) => w.key);
    expect(keys).toContain("planner.captain.noFixture");
  });
});

describe("Free Hit R8 rollback (02c)", () => {
  it("restores pre-FH squad and bank even when previous GW was blank (BGW)", () => {
    const bankBefore = 40;
    const gws = evaluateRollingPlan({
      entry: {
        ...FIXTURE_ENTRY,
        freeTransfers: 1,
        bankTenths: bankBefore,
      },
      playersById: PLAYERS_WITH_MARKET,
      decisions: [
        decision(13),
        decision(14, {
          activeChip: "freehit",
          transfers: [transfer(14, 12, 16)],
        }),
        decision(15),
      ],
      startGw: 13,
      endGw: 15,
      projectGw: (elementId, gw) => ({
        ...stubProj(elementId, gw === 13 ? 0 : 2, {
          isBlank: gw === 13,
          p0: gw === 13 ? 1 : 0.1,
        }),
        gameweek: gw,
      }),
    });
    const fh = gws.find((g) => g.gw === 14)!;
    const after = gws.find((g) => g.gw === 15)!;
    expect(fh.activeChip).toBe("freehit");
    expect(fh.squad.some((p) => p.elementId === 16)).toBe(true);
    expect(fh.squad.some((p) => p.elementId === 12)).toBe(false);
    expect(after.squad.map((p) => p.elementId).sort()).toEqual(
      fh.preFreeHitSnapshot!.squad.map((p) => p.elementId).sort(),
    );
    expect(after.bankTenths).toBe(fh.preFreeHitSnapshot!.bankTenths);
    expect(after.bankTenths).toBe(bankBefore);
    const rollback = after.warnings.find((w) => w.key === "planner.fh.rollback");
    expect(rollback?.params?.gw).toBe(14);
  });

  it("Free Hit on first horizon GW restores next GW from pre-chip state", () => {
    const gws = evaluateRollingPlan({
      entry: {
        ...FIXTURE_ENTRY,
        freeTransfers: 2,
        bankTenths: 55,
      },
      playersById: PLAYERS_WITH_MARKET,
      decisions: [
        decision(13, {
          activeChip: "freehit",
          transfers: [transfer(13, 12, 16)],
        }),
        decision(14),
      ],
      startGw: 13,
      endGw: 14,
      projectGw: flatProj(2),
    });
    const fh = gws.find((g) => g.gw === 13)!;
    const after = gws.find((g) => g.gw === 14)!;
    expect(fh.activeChip).toBe("freehit");
    expect(after.squad.map((p) => p.elementId).sort()).toEqual(
      fh.preFreeHitSnapshot!.squad.map((p) => p.elementId).sort(),
    );
    expect(after.bankTenths).toBe(fh.preFreeHitSnapshot!.bankTenths);
    expect(after.warnings.some((w) => w.key === "planner.fh.rollback")).toBe(
      true,
    );
  });

  it("Free Hit in a double gameweek (DGW) still rolls squad/bank back next GW", () => {
    const gws = evaluateRollingPlan({
      entry: {
        ...FIXTURE_ENTRY,
        freeTransfers: 1,
        bankTenths: 30,
      },
      playersById: PLAYERS_WITH_MARKET,
      decisions: [
        decision(20, {
          activeChip: "freehit",
          transfers: [transfer(20, 12, 16)],
        }),
        decision(21),
      ],
      startGw: 20,
      endGw: 21,
      projectGw: (elementId, gw) => {
        const base = stubProj(elementId, gw === 20 ? 6 : 2);
        if (gw !== 20) return { ...base, gameweek: gw };
        const match = {
          fixtureId: 1,
          matchXPts: 3,
          expectedMinutes: 80,
          p0: 0.1,
          p60: 0.85,
          p1: 0.05,
          opponentShortName: "OPP",
          tickerLabel: "OPP (H)",
          isHome: true,
          fdrLevel: 3 as const,
        };
        return {
          ...base,
          gameweek: gw,
          isDouble: true,
          xPts: 6,
          fixtures: [
            match,
            {
              ...match,
              fixtureId: 2,
              opponentShortName: "OP2",
              tickerLabel: "OP2 (A)",
              isHome: false,
              fdrLevel: 2 as const,
            },
          ],
        };
      },
    });
    const fh = gws.find((g) => g.gw === 20)!;
    const after = gws.find((g) => g.gw === 21)!;
    expect(fh.activeChip).toBe("freehit");
    expect(fh.squad.some((p) => p.elementId === 16)).toBe(true);
    expect(after.squad.map((p) => p.elementId).sort()).toEqual(
      fh.preFreeHitSnapshot!.squad.map((p) => p.elementId).sort(),
    );
    expect(after.bankTenths).toBe(fh.preFreeHitSnapshot!.bankTenths);
  });
});
