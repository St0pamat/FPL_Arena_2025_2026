import { describe, expect, it } from "vitest";
import { evaluateRollingPlan } from "@/lib/stats-lab/plannerEngine";
import {
  FIXTURE_END_GW,
  FIXTURE_ENTRY,
  FIXTURE_PLAYERS_BY_ID,
  FIXTURE_START_GW,
} from "@/lib/stats-lab/__tests__/fixtures/minimal-rolling-plan";

function assertFiniteNumber(value: number, label: string): void {
  expect(Number.isFinite(value), `${label} must be finite (got ${value})`).toBe(
    true,
  );
  expect(Number.isNaN(value), `${label} must not be NaN`).toBe(false);
}

describe("evaluateRollingPlan smoke", () => {
  it("returns finite state for 15 players, 1 GW, no transfers", () => {
    const states = evaluateRollingPlan({
      entry: FIXTURE_ENTRY,
      playersById: FIXTURE_PLAYERS_BY_ID,
      decisions: [
        {
          gw: FIXTURE_START_GW,
          transfers: [],
          activeChip: null,
        },
      ],
      startGw: FIXTURE_START_GW,
      endGw: FIXTURE_END_GW,
    });

    expect(states).toHaveLength(1);
    const gw = states[0]!;
    expect(gw.gw).toBe(FIXTURE_START_GW);
    expect(gw.transfers).toEqual([]);
    expect(gw.squad).toHaveLength(15);

    assertFiniteNumber(gw.bankTenths, "bankTenths");
    assertFiniteNumber(gw.ftAvailable, "ftAvailable");
    assertFiniteNumber(gw.ftNext, "ftNext");
    assertFiniteNumber(gw.hitsCount, "hitsCount");
    assertFiniteNumber(gw.transferCostPts, "transferCostPts");
    assertFiniteNumber(gw.grossXPts, "grossXPts");
    assertFiniteNumber(gw.netXPts, "netXPts");
    assertFiniteNumber(gw.validTransfersCount, "validTransfersCount");

    for (const p of gw.squad) {
      assertFiniteNumber(p.purchasePriceTenths, `purchasePriceTenths#${p.elementId}`);
      assertFiniteNumber(p.nowCostTenths, `nowCostTenths#${p.elementId}`);
      assertFiniteNumber(p.sellingPriceTenths, `sellingPriceTenths#${p.elementId}`);
    }
  });
});
