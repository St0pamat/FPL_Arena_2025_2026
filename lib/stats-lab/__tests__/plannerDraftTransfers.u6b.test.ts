import { describe, expect, it } from "vitest";
import type { FplLabPlayer } from "@/lib/stats-lab/types";
import type { ReconstructedEntryState } from "@/lib/stats-lab/fplEntryApi";
import {
  FIXTURE_ENTRY,
  FIXTURE_PLAYERS,
  FIXTURE_PLAYERS_BY_ID,
} from "@/lib/stats-lab/__tests__/fixtures/minimal-rolling-plan";
import {
  computePosterTeamValueTenths,
  evaluateRollingPlan,
  type EvaluatedGwState,
  type GwPlanDecision,
  type PlannedTransfer,
} from "@/lib/stats-lab/plannerEngine";
import {
  appendPlannedTransfer,
  removePlannedTransfer,
  undoPurchaseOfElement,
} from "@/lib/stats-lab/plannerDraftTransfers";

function clonePlayer(
  base: FplLabPlayer,
  id: number,
  teamId: number,
  webName: string,
  nowCost: number,
): FplLabPlayer {
  return {
    ...base,
    fpl_element_id: id,
    player_code: 20_000 + id,
    fpl_team_id: teamId,
    web_name: webName,
    second_name: webName,
    now_cost: nowCost,
    element_type: 3,
  };
}

/** Rogers £7.8m w składzie, Hudson £5.7m i drugi pomocnik £4.0m na rynku. Bank £0.5m. */
function scenario() {
  const rogers = clonePlayer(FIXTURE_PLAYERS[7]!, 8, 3, "Rogers", 78);
  const hudson = clonePlayer(FIXTURE_PLAYERS[7]!, 80, 9, "Hudson", 57);
  const secondIn = clonePlayer(FIXTURE_PLAYERS[7]!, 81, 10, "Second", 40);
  const players = new Map<number, FplLabPlayer>(FIXTURE_PLAYERS_BY_ID);
  players.set(8, rogers);
  players.set(80, hudson);
  players.set(81, secondIn);
  const entry: ReconstructedEntryState = {
    ...FIXTURE_ENTRY,
    bankTenths: 5,
    picks: FIXTURE_ENTRY.picks.map((pick) =>
      pick.elementId === 8
        ? {
            ...pick,
            purchasePriceTenths: 78,
            nowCostTenths: 78,
            sellingPriceTenths: 78,
          }
        : pick,
    ),
  };
  const lineup = entry.picks
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((pick) => pick.elementId);
  return { players, entry, lineup };
}

function evaluate(
  entry: ReconstructedEntryState,
  players: Map<number, FplLabPlayer>,
  decision: GwPlanDecision,
): EvaluatedGwState {
  const [state] = evaluateRollingPlan({
    entry,
    playersById: players,
    decisions: [decision],
    startGw: 1,
    endGw: 1,
    projectGw: (elementId, gw) => ({
      elementId,
      gameweek: gw,
      xPts: 1.5,
      expectedMinutes: 80,
      p0: 0.1,
      p60: 0.8,
      p1: 0.9,
      isBlank: false,
      isDouble: false,
      fixtures: [],
    }),
  });
  if (!state) throw new Error("brak GW");
  return state;
}

function teamValue(state: EvaluatedGwState): number {
  return computePosterTeamValueTenths({
    playerNowCostTenths: state.squad.map((player) => player.nowCostTenths),
    bankTenths: state.bankTenths,
  });
}

function assertMoney(state: EvaluatedGwState, baseline: number) {
  expect(Number.isFinite(state.bankTenths)).toBe(true);
  expect(Number.isFinite(state.grossXPts)).toBe(true);
  expect(Number.isFinite(state.netXPts)).toBe(true);
  expect(state.squad).toHaveLength(15);
  for (const player of state.squad) {
    expect(Number.isFinite(player.nowCostTenths)).toBe(true);
    expect(Number.isFinite(player.sellingPriceTenths)).toBe(true);
    expect(Number.isFinite(player.purchasePriceTenths)).toBe(true);
  }
  expect(teamValue(state)).toBe(baseline);
  expect(JSON.stringify(state)).not.toMatch(/NaN/);
}

function emptyDecision(): GwPlanDecision {
  return { gw: 1, transfers: [], activeChip: null };
}

function transfer(
  id: string,
  outElementId: number,
  inElementId: number,
  sell: number,
  buy: number,
): PlannedTransfer {
  return {
    id,
    gw: 1,
    outElementId,
    inElementId,
    outSellingPriceTenths: sell,
    inPurchasePriceTenths: buy,
  };
}

describe("U6b spójność banku po transferze", () => {
  it("transfer Rogers → Hudson podnosi bank o różnicę cen i trzyma wartość drużyny", () => {
    const { players, entry, lineup } = scenario();
    const base = evaluate(entry, players, emptyDecision());
    const baseline = teamValue(base);
    expect(base.bankTenths).toBe(5);
    expect(base.squad.some((player) => player.elementId === 8)).toBe(true);

    const bought = appendPlannedTransfer(
      emptyDecision(),
      transfer("t-hudson", 8, 80, 78, 57),
      lineup,
    );
    const after = evaluate(entry, players, bought);
    expect(after.bankTenths).toBe(26);
    expect(after.squad.some((player) => player.elementId === 80)).toBe(true);
    expect(after.squad.some((player) => player.elementId === 8)).toBe(false);
    assertMoney(after, baseline);
  });

  it("✕ na kupionym cofa transfer: wraca sprzedany, bank i wartość jak przed transferem", () => {
    const { players, entry, lineup } = scenario();
    const base = evaluate(entry, players, emptyDecision());
    const baseline = teamValue(base);
    const bought = appendPlannedTransfer(
      { ...emptyDecision(), captainElementId: 8, viceCaptainElementId: 13 },
      {
        ...transfer("t-hudson", 8, 80, 78, 57),
        captainBefore: {
          captainElementId: 8,
          viceCaptainElementId: 13,
          captainClearedByUser: false,
          viceClearedByUser: false,
        },
      },
      lineup,
    );
    const soldCaptain = {
      ...bought,
      captainElementId: null,
      captainClearedByUser: true,
    };
    const undone = undoPurchaseOfElement(soldCaptain, 80);
    expect(undone.undone).toBe(true);
    expect(undone.decision.transfers).toHaveLength(0);
    expect(undone.decision.lineupOrder).toContain(8);
    expect(undone.decision.lineupOrder).not.toContain(80);
    expect(undone.decision.captainElementId).toBe(8);
    expect(undone.decision.viceCaptainElementId).toBe(13);
    expect(undone.decision.captainClearedByUser).toBe(false);

    const after = evaluate(entry, players, undone.decision);
    expect(after.bankTenths).toBe(5);
    const rogers = after.squad.find((player) => player.elementId === 8);
    expect(rogers?.nowCostTenths).toBe(78);
    expect(rogers?.sellingPriceTenths).toBe(78);
    expect(after.squad.some((player) => player.elementId === 80)).toBe(false);
    expect(after.squad.some((player) => player.nowCostTenths === 50 && player.elementId === 80)).toBe(
      false,
    );
    assertMoney(after, baseline);
  });

  it("stary lineupOrder bez kupionego transferu nie wstawia gracza za £5.0m", () => {
    const { players, entry, lineup } = scenario();
    const base = evaluate(entry, players, emptyDecision());
    const baseline = teamValue(base);
    const bought = appendPlannedTransfer(
      emptyDecision(),
      transfer("t-hudson", 8, 80, 78, 57),
      lineup,
    );
    const stale: GwPlanDecision = { ...bought, transfers: [] };
    expect(stale.lineupOrder).toContain(80);
    const healed = evaluate(entry, players, stale);
    expect(healed.squad.some((player) => player.elementId === 80)).toBe(false);
    expect(healed.squad.find((player) => player.elementId === 8)?.nowCostTenths).toBe(78);
    expect(healed.bankTenths).toBe(5);
    assertMoney(healed, baseline);
  });

  it("cofnięcie ostatniego z kilku transferów zostawia wcześniejszy i tę samą sumę", () => {
    const { players, entry, lineup } = scenario();
    const base = evaluate(entry, players, emptyDecision());
    const baseline = teamValue(base);
    const mid9 = entry.picks.find((pick) => pick.elementId === 9);
    expect(mid9?.sellingPriceTenths).toBe(65);

    let decision = appendPlannedTransfer(
      emptyDecision(),
      transfer("t-hudson", 8, 80, 78, 57),
      lineup,
    );
    decision = appendPlannedTransfer(
      decision,
      transfer("t-second", 9, 81, 65, 40),
      lineup,
    );
    const both = evaluate(entry, players, decision);
    expect(both.squad.some((player) => player.elementId === 80)).toBe(true);
    expect(both.squad.some((player) => player.elementId === 81)).toBe(true);
    assertMoney(both, baseline);

    const undoSecond = undoPurchaseOfElement(decision, 81);
    expect(undoSecond.undone).toBe(true);
    const afterSecond = evaluate(entry, players, undoSecond.decision);
    expect(afterSecond.squad.some((player) => player.elementId === 81)).toBe(false);
    expect(afterSecond.squad.some((player) => player.elementId === 9)).toBe(true);
    expect(afterSecond.squad.some((player) => player.elementId === 80)).toBe(true);
    expect(afterSecond.bankTenths).toBe(5 + 78 - 57);
    assertMoney(afterSecond, baseline);

    const undoFirst = undoPurchaseOfElement(undoSecond.decision, 80);
    expect(undoFirst.undone).toBe(true);
    const restored = evaluate(entry, players, undoFirst.decision);
    expect(restored.bankTenths).toBe(5);
    expect(restored.squad.some((player) => player.elementId === 8)).toBe(true);
    expect(restored.squad.some((player) => player.elementId === 9)).toBe(true);
    assertMoney(restored, baseline);
  });

  it("przycisk cofnij przywraca decyzję sprzed transferu, a usunięcie z listy robi to samo co ✕", () => {
    const { players, entry, lineup } = scenario();
    const before = emptyDecision();
    const base = evaluate(entry, players, before);
    const baseline = teamValue(base);
    const bought = appendPlannedTransfer(
      before,
      transfer("t-hudson", 8, 80, 78, 57),
      lineup,
    );
    const snapshot = structuredClone(before);
    const viaUndoButton = evaluate(entry, players, snapshot);
    expect(viaUndoButton.bankTenths).toBe(base.bankTenths);
    expect(teamValue(viaUndoButton)).toBe(baseline);
    expect(viaUndoButton.squad.map((player) => player.elementId).sort()).toEqual(
      base.squad.map((player) => player.elementId).sort(),
    );

    const viaList = removePlannedTransfer(bought, "t-hudson");
    const viaCross = undoPurchaseOfElement(bought, 80).decision;
    expect(viaList.lineupOrder).toEqual(viaCross.lineupOrder);
    expect(viaList.transfers).toEqual([]);
    const afterList = evaluate(entry, players, viaList);
    expect(afterList.bankTenths).toBe(5);
    assertMoney(afterList, baseline);
  });

  it("✕ na graczu, którego nie kupiono w tej kolejce, nie udaje cofnięcia", () => {
    const result = undoPurchaseOfElement(emptyDecision(), 8);
    expect(result.undone).toBe(false);
  });
});
