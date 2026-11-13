import { describe, expect, it } from "vitest";
import {
  assignCaptain,
  assignViceCaptain,
  clearRolesForElement,
  shouldAutoFillCaptain,
  shouldAutoFillVice,
} from "@/lib/stats-lab/plannerCaptainRoles";
import {
  arePlannerVariantsIdentical,
  computeTeamGwXPts,
  evaluateRollingPlan,
  type GwPlanDecision,
  type PlayerGwProjection,
  type SquadPlayerState,
} from "@/lib/stats-lab/plannerEngine";
import {
  PLANNER_LABELS,
  PLANNER_TOOLTIPS,
  resolvePlannerWarning,
} from "@/lib/stats-lab/plannerI18n";
import {
  FIXTURE_ENTRY,
  FIXTURE_PLAYERS_BY_ID,
} from "@/lib/stats-lab/__tests__/fixtures/minimal-rolling-plan";

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

function projMap(
  entries: Array<{ id: number; xPts: number; blank?: boolean; dgw?: boolean }>,
): Map<number, PlayerGwProjection> {
  const m = new Map<number, PlayerGwProjection>();
  for (const e of entries) {
    m.set(e.id, {
      elementId: e.id,
      gameweek: 10,
      xPts: e.xPts,
      expectedMinutes: e.blank ? 0 : e.dgw ? 160 : 80,
      p0: e.blank ? 1 : 0,
      p60: e.blank ? 0 : 0.9,
      p1: e.blank ? 0 : 0.95,
      isBlank: !!e.blank,
      isDouble: !!e.dgw,
      fixtures: e.blank
        ? []
        : e.dgw
          ? [
              {
                fixtureId: 1,
                matchXPts: e.xPts / 2,
                expectedMinutes: 80,
                p0: 0,
                p60: 0.9,
                p1: 0.95,
                opponentShortName: "ARS",
                tickerLabel: "ARS (H)",
                isHome: true,
                fdrLevel: 3,
              },
              {
                fixtureId: 2,
                matchXPts: e.xPts / 2,
                expectedMinutes: 80,
                p0: 0,
                p60: 0.9,
                p1: 0.95,
                opponentShortName: "NEW",
                tickerLabel: "NEW (A)",
                isHome: false,
                fdrLevel: 3,
              },
            ]
          : [
              {
                fixtureId: 1,
                matchXPts: e.xPts,
                expectedMinutes: 80,
                p0: 0,
                p60: 0.9,
                p1: 0.95,
                opponentShortName: "NFO",
                tickerLabel: "NFO (H)",
                isHome: true,
                fdrLevel: 3,
              },
            ],
    });
  }
  return m;
}

function xiSquad(cap: number, vice: number): SquadPlayerState[] {
  const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  return ids.map((id, idx) => ({
    elementId: id,
    slot: idx + 1,
    purchasePriceTenths: 50,
    nowCostTenths: 50,
    sellingPriceTenths: 50,
    isCaptain: id === cap,
    isViceCaptain: id === vice,
  }));
}

describe("A4 assignCaptain / assignViceCaptain (FPL swap)", () => {
  it("C on VC: A=C, B=VC → set C on B → B=C, A=VC", () => {
    const next = assignCaptain(
      { captainElementId: 1, viceCaptainElementId: 2 },
      2,
    );
    expect(next.captainElementId).toBe(2);
    expect(next.viceCaptainElementId).toBe(1);
    expect(next.captainClearedByUser).toBe(false);
    expect(next.viceClearedByUser).toBe(false);
  });

  it("VC on C: A=C, B=VC → set VC on A → A=VC, B=C (symmetric)", () => {
    const next = assignViceCaptain(
      { captainElementId: 1, viceCaptainElementId: 2 },
      1,
    );
    expect(next.viceCaptainElementId).toBe(1);
    expect(next.captainElementId).toBe(2);
  });

  it("C on player without role: VC unchanged", () => {
    const next = assignCaptain(
      { captainElementId: 1, viceCaptainElementId: 2 },
      3,
    );
    expect(next.captainElementId).toBe(3);
    expect(next.viceCaptainElementId).toBe(2);
  });

  it("C ≠ VC always (separate assertion)", () => {
    const cases = [
      assignCaptain({ captainElementId: 1, viceCaptainElementId: 2 }, 2),
      assignViceCaptain({ captainElementId: 1, viceCaptainElementId: 2 }, 1),
      assignCaptain({ captainElementId: 1, viceCaptainElementId: 2 }, 5),
      assignViceCaptain({ captainElementId: 1, viceCaptainElementId: 2 }, 5),
    ];
    for (const c of cases) {
      if (c.captainElementId != null && c.viceCaptainElementId != null) {
        expect(c.captainElementId).not.toBe(c.viceCaptainElementId);
      }
    }
  });

  it("VC never null after swap if both roles were set before", () => {
    const afterC = assignCaptain(
      { captainElementId: 1, viceCaptainElementId: 2 },
      2,
    );
    expect(afterC.viceCaptainElementId).not.toBeNull();
    const afterV = assignViceCaptain(
      { captainElementId: 1, viceCaptainElementId: 2 },
      1,
    );
    expect(afterV.captainElementId).not.toBeNull();
  });

  it("swap przy pustym C: assignCaptain(null, X) gdy X=VC → C=X, VC=null, viceClearedByUser", () => {
    const next = assignCaptain(
      { captainElementId: null, viceCaptainElementId: 5 },
      5,
    );
    expect(next.captainElementId).toBe(5);
    expect(next.viceCaptainElementId).toBeNull();
    expect(next.viceClearedByUser).toBe(true);
    expect(next.captainClearedByUser).toBe(false);
  });

  it("swap gdy obie role ustawione: VC nie jest null po assignCaptain na VC", () => {
    const next = assignCaptain(
      { captainElementId: 1, viceCaptainElementId: 5 },
      5,
    );
    expect(next.captainElementId).toBe(5);
    expect(next.viceCaptainElementId).toBe(1);
    expect(next.viceClearedByUser).toBe(false);
  });
});

describe("A4 clearRolesForElement + auto-fill gates", () => {
  it("sell C → captain null + captainClearedByUser; re-assign clears flag", () => {
    const cleared = clearRolesForElement(
      { captainElementId: 1, viceCaptainElementId: 2 },
      1,
    );
    expect(cleared.captainElementId).toBeNull();
    expect(cleared.viceCaptainElementId).toBe(2);
    expect(cleared.captainClearedByUser).toBe(true);
    expect(shouldAutoFillCaptain(cleared)).toBe(false);

    const restored = assignCaptain(cleared, 3);
    expect(restored.captainElementId).toBe(3);
    expect(restored.captainClearedByUser).toBe(false);
    expect(shouldAutoFillCaptain(restored)).toBe(false);
  });

  it("fresh GW without roles still auto-fills (no regression)", () => {
    expect(shouldAutoFillCaptain({})).toBe(true);
    expect(shouldAutoFillVice({})).toBe(true);
    expect(
      shouldAutoFillCaptain({ captainElementId: null }),
    ).toBe(true);
    expect(
      shouldAutoFillCaptain({
        captainElementId: null,
        captainClearedByUser: true,
      }),
    ).toBe(false);

    const gws = evaluateRollingPlan({
      entry: FIXTURE_ENTRY,
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions: [decision(13)],
      startGw: 13,
      endGw: 13,
      projectGw: (elementId, gw) => ({
        elementId,
        gameweek: gw,
        xPts: elementId === 1 ? 9 : 3,
        expectedMinutes: 80,
        p0: 0.05,
        p60: 0.9,
        p1: 0.95,
        isBlank: false,
        isDouble: false,
        fixtures: [],
      }),
    });
    expect(gws[0]!.captainElementId).not.toBeNull();
    expect(gws[0]!.viceCaptainElementId).not.toBeNull();
    expect(gws[0]!.captainElementId).not.toBe(gws[0]!.viceCaptainElementId);
    expect(gws[0]!.warnings.map((w) => w.key)).not.toContain(
      "planner.captain.missing",
    );
  });
});

describe("A4 xPts multipliers after role swap / BGW / TC / DGW", () => {
  it("after swap captain ×2 (×3 with TC); VC ×1 in base", () => {
    const squad = xiSquad(2, 1); // B=C after swap; XI ids 1–11
    const projections = projMap([
      { id: 1, xPts: 4 },
      { id: 2, xPts: 6 },
      ...Array.from({ length: 13 }, (_, i) => ({
        id: i + 3,
        xPts: 2,
      })),
    ]);
    const normal = computeTeamGwXPts({
      squad,
      gw: 10,
      projectionsByElement: projections,
      activeChip: null,
      transfersCostPts: 0,
    });
    const withTc = computeTeamGwXPts({
      squad,
      gw: 10,
      projectionsByElement: projections,
      activeChip: "3xc",
      transfersCostPts: 0,
    });
    // XI base: 6+4+2*9 = 28; bonus (2-1)*6 = 6 → 34
    expect(normal.grossXPts).toBe(34);
    // TC bonus (3-1)*6 = 12 → 40
    expect(withTc.grossXPts).toBe(40);
  });

  it("captain BGW → VC ×2 (×3 with TC)", () => {
    const squad = xiSquad(1, 2);
    const projections = projMap([
      { id: 1, xPts: 0, blank: true },
      { id: 2, xPts: 5 },
      ...Array.from({ length: 13 }, (_, i) => ({
        id: i + 3,
        xPts: 2,
      })),
    ]);
    const normal = computeTeamGwXPts({
      squad,
      gw: 10,
      projectionsByElement: projections,
      activeChip: null,
      transfersCostPts: 0,
    });
    const withTc = computeTeamGwXPts({
      squad,
      gw: 10,
      projectionsByElement: projections,
      activeChip: "3xc",
      transfersCostPts: 0,
    });
    // XI base: 0+5+2*9=23; bonus (2-1)*1*5 = 5 → 28
    expect(normal.grossXPts).toBe(28);
    // TC: (3-1)*1*5 = 10 → 33
    expect(withTc.grossXPts).toBe(33);
  });

  it("TC + captain blank: VC gets ×3 not ×2", () => {
    const squad = xiSquad(1, 2);
    const projections = projMap([
      { id: 1, xPts: 0, blank: true },
      { id: 2, xPts: 4 },
      ...Array.from({ length: 13 }, (_, i) => ({ id: i + 3, xPts: 1 })),
    ]);
    const withTc = computeTeamGwXPts({
      squad,
      gw: 10,
      projectionsByElement: projections,
      activeChip: "3xc",
      transfersCostPts: 0,
    });
    const without = computeTeamGwXPts({
      squad,
      gw: 10,
      projectionsByElement: projections,
      activeChip: null,
      transfersCostPts: 0,
    });
    // XI base: 0+4+1*9=13; without bonus +4 → 17; TC bonus +8 → 21
    expect(without.grossXPts).toBe(17);
    expect(withTc.grossXPts).toBe(21);
    expect(withTc.grossXPts - without.grossXPts).toBe(4);
  });

  it("both captain and VC blank: no multiplier crash; sum ok", () => {
    const squad = xiSquad(1, 2);
    const projections = projMap([
      { id: 1, xPts: 0, blank: true },
      { id: 2, xPts: 0, blank: true },
      ...Array.from({ length: 13 }, (_, i) => ({ id: i + 3, xPts: 2 })),
    ]);
    const r = computeTeamGwXPts({
      squad,
      gw: 10,
      projectionsByElement: projections,
      activeChip: "3xc",
      transfersCostPts: 0,
    });
    expect(r.grossXPts).toBe(18); // 9*2 in XI
    expect(Number.isFinite(r.grossXPts)).toBe(true);
  });

  it("DGW: captain multiplier covers both matches (also after C⇄VC swap)", () => {
    const squad = xiSquad(2, 1);
    const projections = projMap([
      { id: 2, xPts: 10, dgw: true },
      { id: 1, xPts: 3 },
      ...Array.from({ length: 13 }, (_, i) => ({ id: i + 3, xPts: 1 })),
    ]);
    const r = computeTeamGwXPts({
      squad,
      gw: 10,
      projectionsByElement: projections,
      activeChip: null,
      transfersCostPts: 0,
    });
    // XI base: 10+3+9=22; bonus +10 = 32 (pełne xPts DGW kapitana)
    expect(r.grossXPts).toBe(32);
  });
});

describe("A4 isolation across horizon + variants + missing warnings", () => {
  it("role swap in one GW does not change roles in other GWs", () => {
    // XI fixture: C/VC muszą być w slotach 1–11 (np. 8 i 13)
    const gw10 = decision(10, {
      captainElementId: 8,
      viceCaptainElementId: 13,
    });
    const gw11 = decision(11, {
      captainElementId: 13,
      viceCaptainElementId: 8,
    });
    const gws = evaluateRollingPlan({
      entry: FIXTURE_ENTRY,
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions: [gw10, gw11],
      startGw: 10,
      endGw: 11,
      projectGw: (elementId, gw) => ({
        elementId,
        gameweek: gw,
        xPts: 3,
        expectedMinutes: 80,
        p0: 0,
        p60: 0.9,
        p1: 0.95,
        isBlank: false,
        isDouble: false,
        fixtures: [],
      }),
    });
    expect(gws[0]!.captainElementId).toBe(8);
    expect(gws[0]!.viceCaptainElementId).toBe(13);
    expect(gws[1]!.captainElementId).toBe(13);
    expect(gws[1]!.viceCaptainElementId).toBe(8);
  });

  it("arePlannerVariantsIdentical accounts for swapped roles", () => {
    const a = [
      decision(10, { captainElementId: 1, viceCaptainElementId: 2 }),
    ];
    const b = [
      decision(10, { captainElementId: 2, viceCaptainElementId: 1 }),
    ];
    expect(arePlannerVariantsIdentical(a, a, a)).toBe(true);
    expect(arePlannerVariantsIdentical(a, a, b)).toBe(false);
  });

  it("sell C → missing warning; re-set C → warning gone", () => {
    const sold = evaluateRollingPlan({
      entry: FIXTURE_ENTRY,
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions: [
        decision(13, {
          captainElementId: null,
          viceCaptainElementId: 2,
          captainClearedByUser: true,
        }),
      ],
      startGw: 13,
      endGw: 13,
      projectGw: (elementId, gw) => ({
        elementId,
        gameweek: gw,
        xPts: 3,
        expectedMinutes: 80,
        p0: 0.05,
        p60: 0.9,
        p1: 0.95,
        isBlank: false,
        isDouble: false,
        fixtures: [],
      }),
    });
    expect(sold[0]!.captainElementId).toBeNull();
    expect(sold[0]!.warnings.map((w) => w.key)).toContain(
      "planner.captain.missing",
    );
    expect(sold[0]!.grossXPts).toBeGreaterThan(0);

    const restored = evaluateRollingPlan({
      entry: FIXTURE_ENTRY,
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions: [
        decision(13, {
          captainElementId: 3,
          viceCaptainElementId: 2,
          captainClearedByUser: false,
        }),
      ],
      startGw: 13,
      endGw: 13,
      projectGw: (elementId, gw) => ({
        elementId,
        gameweek: gw,
        xPts: 3,
        expectedMinutes: 80,
        p0: 0.05,
        p60: 0.9,
        p1: 0.95,
        isBlank: false,
        isDouble: false,
        fixtures: [],
      }),
    });
    expect(restored[0]!.captainElementId).toBe(3);
    expect(restored[0]!.warnings.map((w) => w.key)).not.toContain(
      "planner.captain.missing",
    );
  });

  it("missing warning texts PL/EN short (bez {gw})", () => {
    expect(PLANNER_LABELS.pl["planner.captain.missing"]).toBe(
      "Wybierz kapitana",
    );
    expect(PLANNER_LABELS.en["planner.captain.missing"]).toBe(
      "Pick a captain",
    );
    expect(PLANNER_LABELS.pl["planner.vice.missing"]).toBe(
      "Wybierz wicekapitana",
    );
    expect(PLANNER_LABELS.en["planner.vice.missing"]).toBe(
      "Pick a vice-captain",
    );
    expect(
      resolvePlannerWarning(
        { key: "planner.captain.missing", params: { gw: 12 } },
        "pl",
      ),
    ).toBe("Wybierz kapitana");
    expect(
      resolvePlannerWarning(
        { key: "planner.vice.missing", params: { gw: 12 } },
        "en",
      ),
    ).toBe("Pick a vice-captain");
    expect(
      Object.prototype.hasOwnProperty.call(
        PLANNER_LABELS.pl,
        "planner.role.benchBlocked",
      ),
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(
        PLANNER_TOOLTIPS.pl,
        "planner.role.benchBlocked",
      ),
    ).toBe(false);
  });
});

describe("A4+U3 edge cases C/VC (a–f)", () => {
  function xiNoCaptain(vice: number | null): SquadPlayerState[] {
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    return ids.map((id, idx) => ({
      elementId: id,
      slot: idx + 1,
      purchasePriceTenths: 50,
      nowCostTenths: 50,
      sellingPriceTenths: 50,
      isCaptain: false,
      isViceCaptain: vice != null && id === vice,
    }));
  }

  it("a) C wyczyszczony, VC ustawiony: VC bez ×2 (zwykła GW)", () => {
    const squad = xiNoCaptain(2);
    const projections = projMap(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((id) => ({
        id,
        xPts: id === 2 ? 5 : 2,
      })),
    );
    const r = computeTeamGwXPts({
      squad,
      gw: 10,
      projectionsByElement: projections,
      activeChip: null,
      transfersCostPts: 0,
    });
    // base XI 5+2*10=25; bez C → VC nie dostaje ×2
    expect(r.grossXPts).toBe(25);
  });

  it("a) C wyczyszczony, VC ustawiony + TC: VC bez ×3", () => {
    const squad = xiNoCaptain(2);
    const projections = projMap(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((id) => ({
        id,
        xPts: id === 2 ? 5 : 2,
      })),
    );
    const r = computeTeamGwXPts({
      squad,
      gw: 10,
      projectionsByElement: projections,
      activeChip: "3xc",
      transfersCostPts: 0,
    });
    expect(r.grossXPts).toBe(25);
  });

  it("b) assignCaptain przy pustym C na VC → vice.missing path (flags)", () => {
    const cleared = assignCaptain(
      {
        captainElementId: null,
        viceCaptainElementId: 8,
        captainClearedByUser: true,
      },
      8,
    );
    expect(cleared).toEqual({
      captainElementId: 8,
      viceCaptainElementId: null,
      captainClearedByUser: false,
      viceClearedByUser: true,
    });
    const gws = evaluateRollingPlan({
      entry: FIXTURE_ENTRY,
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions: [decision(13, { ...cleared })],
      startGw: 13,
      endGw: 13,
      projectGw: (elementId, gw) => ({
        elementId,
        gameweek: gw,
        xPts: 3,
        expectedMinutes: 80,
        p0: 0.05,
        p60: 0.9,
        p1: 0.95,
        isBlank: false,
        isDouble: false,
        fixtures: [],
      }),
    });
    expect(gws[0]!.captainElementId).toBe(8);
    expect(gws[0]!.viceCaptainElementId).toBeNull();
    expect(gws[0]!.warnings.map((w) => w.key)).toContain(
      "planner.vice.missing",
    );
    expect(gws[0]!.warnings.map((w) => w.key)).not.toContain(
      "planner.captain.missing",
    );
  });

  it("c) kolejne GW z zapisanym C spoza XI → rola pusta + missing", () => {
    // id 2 jest na ławce (slot 12) w FIXTURE_ENTRY — nie w XI
    const flatProj = (elementId: number, gw: number) => ({
      elementId,
      gameweek: gw,
      xPts: 3,
      expectedMinutes: 80,
      p0: 0.05,
      p60: 0.9,
      p1: 0.95,
      isBlank: false,
      isDouble: false,
      fixtures: [],
    });
    const gws = evaluateRollingPlan({
      entry: FIXTURE_ENTRY,
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions: [
        decision(13, {
          captainElementId: 1,
          viceCaptainElementId: 13,
        }),
        decision(14, {
          captainElementId: 2,
          viceCaptainElementId: 13,
        }),
      ],
      startGw: 13,
      endGw: 14,
      projectGw: flatProj,
    });
    expect(gws[0]!.captainElementId).toBe(1);
    expect(gws[1]!.captainElementId).toBeNull();
    expect(gws[1]!.warnings.map((w) => w.key)).toContain(
      "planner.captain.missing",
    );
    // XI 11×3 = 33; bez C nikt (także VC) nie dostaje ×2 / ×3
    expect(gws[1]!.grossXPts).toBe(33);
    const withTc = evaluateRollingPlan({
      entry: FIXTURE_ENTRY,
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions: [
        decision(14, {
          captainElementId: 2,
          viceCaptainElementId: 13,
          activeChip: "3xc",
        }),
      ],
      startGw: 14,
      endGw: 14,
      projectGw: flatProj,
    });
    expect(withTc[0]!.captainElementId).toBeNull();
    expect(withTc[0]!.grossXPts).toBe(33);
  });

  it("d) stary plan localStorage: C/VC spoza składu → bez crasha + missing", () => {
    const flatProj = (elementId: number, gw: number) => ({
      elementId,
      gameweek: gw,
      xPts: 3,
      expectedMinutes: 80,
      p0: 0.05,
      p60: 0.9,
      p1: 0.95,
      isBlank: false,
      isDouble: false,
      fixtures: [],
    });
    const gws = evaluateRollingPlan({
      entry: FIXTURE_ENTRY,
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions: [
        decision(13, {
          captainElementId: 99901,
          viceCaptainElementId: 99902,
        }),
      ],
      startGw: 13,
      endGw: 13,
      projectGw: flatProj,
    });
    expect(gws[0]!.captainElementId).toBeNull();
    expect(gws[0]!.viceCaptainElementId).toBeNull();
    expect(gws[0]!.warnings.map((w) => w.key)).toEqual(
      expect.arrayContaining([
        "planner.captain.missing",
        "planner.vice.missing",
      ]),
    );
    expect(Number.isFinite(gws[0]!.grossXPts)).toBe(true);
    // XI 11×3 = 33; bez ról brak ×2 / ×3
    expect(gws[0]!.grossXPts).toBe(33);
    const withTc = evaluateRollingPlan({
      entry: FIXTURE_ENTRY,
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions: [
        decision(13, {
          captainElementId: 99901,
          viceCaptainElementId: 99902,
          activeChip: "3xc",
        }),
      ],
      startGw: 13,
      endGw: 13,
      projectGw: flatProj,
    });
    expect(withTc[0]!.grossXPts).toBe(33);
  });

  it("e) powrót byłego C z ławki do XI: rola nie odtwarza się sama", () => {
    const cleared = clearRolesForElement(
      { captainElementId: 8, viceCaptainElementId: 13 },
      8,
    );
    expect(cleared.captainClearedByUser).toBe(true);
    // lineup: 8 wraca do XI (był i jest w składzie), ale decyzja ma null + flagę
    const gws = evaluateRollingPlan({
      entry: FIXTURE_ENTRY,
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions: [
        decision(13, {
          captainElementId: null,
          viceCaptainElementId: 13,
          captainClearedByUser: true,
        }),
      ],
      startGw: 13,
      endGw: 13,
      projectGw: (elementId, gw) => ({
        elementId,
        gameweek: gw,
        xPts: 3,
        expectedMinutes: 80,
        p0: 0.05,
        p60: 0.9,
        p1: 0.95,
        isBlank: false,
        isDouble: false,
        fixtures: [],
      }),
    });
    expect(gws[0]!.captainElementId).toBeNull();
    expect(gws[0]!.warnings.map((w) => w.key)).toContain(
      "planner.captain.missing",
    );
    expect(shouldAutoFillCaptain(cleared)).toBe(false);
  });

  it("e) cofnięcie transferu: flaga cleared zostaje do assign", () => {
    const afterSell = clearRolesForElement(
      { captainElementId: 8, viceCaptainElementId: 13 },
      8,
    );
    // „undo transfer” nie woła assign — flagi zostają
    expect(afterSell.captainElementId).toBeNull();
    expect(afterSell.captainClearedByUser).toBe(true);
    expect(shouldAutoFillCaptain(afterSell)).toBe(false);
    const afterAssign = assignCaptain(afterSell, 9);
    expect(afterAssign.captainElementId).toBe(9);
    expect(afterAssign.captainClearedByUser).toBe(false);
  });

  it("auto-C + sprzedaż: flaga cleared, missing, brak nowego auto-C", () => {
    const flatProj = (elementId: number, gw: number) => ({
      elementId,
      gameweek: gw,
      xPts: elementId === 1 ? 9 : 3,
      expectedMinutes: 80,
      p0: 0.05,
      p60: 0.9,
      p1: 0.95,
      isBlank: false,
      isDouble: false,
      fixtures: [],
    });
    const auto = evaluateRollingPlan({
      entry: FIXTURE_ENTRY,
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions: [decision(13)],
      startGw: 13,
      endGw: 13,
      projectGw: flatProj,
    });
    const autoCap = auto[0]!.captainElementId;
    expect(autoCap).toBe(1);
    // Decyzja bez zapisanego id — clear musi użyć effective
    const withoutEffective = clearRolesForElement(
      { captainElementId: null, viceCaptainElementId: null },
      autoCap!,
    );
    expect(withoutEffective.captainClearedByUser).toBe(false);

    const cleared = clearRolesForElement(
      { captainElementId: null, viceCaptainElementId: null },
      autoCap!,
      {
        captainElementId: auto[0]!.captainElementId,
        viceCaptainElementId: auto[0]!.viceCaptainElementId,
      },
    );
    expect(cleared.captainElementId).toBeNull();
    expect(cleared.captainClearedByUser).toBe(true);

    const after = evaluateRollingPlan({
      entry: FIXTURE_ENTRY,
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions: [decision(13, { ...cleared })],
      startGw: 13,
      endGw: 13,
      projectGw: flatProj,
    });
    expect(after[0]!.captainElementId).toBeNull();
    expect(after[0]!.warnings.map((w) => w.key)).toContain(
      "planner.captain.missing",
    );
  });

  it("auto-C + ławka: flaga cleared, missing, brak nowego auto-C", () => {
    const flatProj = (elementId: number, gw: number) => ({
      elementId,
      gameweek: gw,
      xPts: elementId === 1 ? 9 : 3,
      expectedMinutes: 80,
      p0: 0.05,
      p60: 0.9,
      p1: 0.95,
      isBlank: false,
      isDouble: false,
      fixtures: [],
    });
    const auto = evaluateRollingPlan({
      entry: FIXTURE_ENTRY,
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions: [decision(13)],
      startGw: 13,
      endGw: 13,
      projectGw: flatProj,
    });
    const autoCap = auto[0]!.captainElementId!;
    expect(autoCap).toBe(1);

    const cleared = clearRolesForElement(
      { captainElementId: null, viceCaptainElementId: null },
      autoCap,
      {
        captainElementId: auto[0]!.captainElementId,
        viceCaptainElementId: auto[0]!.viceCaptainElementId,
      },
    );
    expect(cleared.captainClearedByUser).toBe(true);

    // Swap C (slot 1) ↔ bench GK (slot 12): id 1 na ławce, id 2 w XI
    const lineup = FIXTURE_ENTRY.picks.map((p) => p.elementId);
    const i1 = lineup.indexOf(1);
    const i2 = lineup.indexOf(2);
    expect(i1).toBe(0);
    expect(i2).toBe(11);
    const swapped = [...lineup];
    swapped[i1] = 2;
    swapped[i2] = 1;

    const after = evaluateRollingPlan({
      entry: FIXTURE_ENTRY,
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions: [
        decision(13, {
          ...cleared,
          lineupOrder: swapped,
        }),
      ],
      startGw: 13,
      endGw: 13,
      projectGw: flatProj,
    });
    expect(after[0]!.captainElementId).toBeNull();
    expect(after[0]!.squad.find((p) => p.elementId === 1)?.slot).toBe(12);
    expect(after[0]!.warnings.map((w) => w.key)).toContain(
      "planner.captain.missing",
    );
  });

  it("auto-VC + sprzedaż: flaga cleared, missing, brak nowego auto-VC", () => {
    const flatProj = (elementId: number, gw: number) => ({
      elementId,
      gameweek: gw,
      xPts: elementId === 1 ? 9 : elementId === 13 ? 8 : 3,
      expectedMinutes: 80,
      p0: 0.05,
      p60: 0.9,
      p1: 0.95,
      isBlank: false,
      isDouble: false,
      fixtures: [],
    });
    const auto = evaluateRollingPlan({
      entry: FIXTURE_ENTRY,
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions: [decision(13)],
      startGw: 13,
      endGw: 13,
      projectGw: flatProj,
    });
    expect(auto[0]!.captainElementId).toBe(1);
    const autoVice = auto[0]!.viceCaptainElementId;
    expect(autoVice).toBe(13);

    const cleared = clearRolesForElement(
      { captainElementId: null, viceCaptainElementId: null },
      autoVice!,
      {
        captainElementId: auto[0]!.captainElementId,
        viceCaptainElementId: auto[0]!.viceCaptainElementId,
      },
    );
    expect(cleared.viceCaptainElementId).toBeNull();
    expect(cleared.viceClearedByUser).toBe(true);
    expect(cleared.captainClearedByUser).toBe(false);

    const after = evaluateRollingPlan({
      entry: FIXTURE_ENTRY,
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions: [decision(13, { ...cleared })],
      startGw: 13,
      endGw: 13,
      projectGw: flatProj,
    });
    // C nadal auto (decyzja bez id i bez captainCleared) → 1
    expect(after[0]!.captainElementId).toBe(1);
    expect(after[0]!.viceCaptainElementId).toBeNull();
    expect(after[0]!.warnings.map((w) => w.key)).toContain(
      "planner.vice.missing",
    );
  });

  it("f) arePlannerVariantsIdentical: null≡undefined C/VC oraz false≡undefined cleared flags", () => {
    const withNulls: GwPlanDecision[] = [
      {
        gw: 10,
        transfers: [],
        activeChip: null,
        captainElementId: null,
        viceCaptainElementId: null,
        captainClearedByUser: false,
        viceClearedByUser: false,
      },
    ];
    const withUndefined: GwPlanDecision[] = [
      {
        gw: 10,
        transfers: [],
        activeChip: null,
      },
    ];
    expect(
      arePlannerVariantsIdentical(withNulls, withNulls, withUndefined),
    ).toBe(true);
    expect(
      arePlannerVariantsIdentical(withUndefined, withUndefined, withNulls),
    ).toBe(true);
  });
});
