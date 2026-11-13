/** @vitest-environment jsdom */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PlannerPlayerCatalogItem } from "@/app/admin/actions/statsLabPlanner";
import type { ReconstructedSquadPick } from "@/lib/stats-lab/fplEntryApi";
import type { PlayerGwProjection } from "@/lib/stats-lab/plannerEngine";
import { PlannerPitch } from "@/components/admin/stats-lab/planner/PlannerPitch";
import { pt } from "@/lib/stats-lab/plannerI18n";

function catalog(
  id: number,
  name: string,
  elementType: 1 | 2 | 3 | 4,
): PlannerPlayerCatalogItem {
  return {
    fpl_element_id: id,
    player_code: id * 10,
    web_name: name,
    first_name: name,
    second_name: name,
    element_type: elementType,
    fpl_team_id: 1,
    club_short_name: "ARS",
    club_pulse_code: null,
    now_cost: 70,
    cost_change_start: 0,
    status: "a",
    chance_of_playing_next_round: 100,
    news: "",
    selected_by_percent: 10,
    total_points: 40,
    event_points: 0,
    form: 5,
    points_per_game: 5,
    value_season: 10,
    minutes: 900,
    goals_scored: 0,
    assists: 0,
    clean_sheets: 0,
    expected_goals: 0,
    expected_assists: 0,
    expected_goal_involvements: 0,
    defensive_contribution: 0,
    dc_bonus_points: 0,
    transfers_in_event: 0,
    transfers_out_event: 0,
  };
}

function elementTypeForSlot(slot: number): 1 | 2 | 3 | 4 {
  if (slot === 1 || slot === 12) return 1;
  if (slot >= 2 && slot <= 5) return 2;
  if (slot >= 6 && slot <= 8) return 3;
  if (slot >= 9 && slot <= 11) return 4;
  return 3;
}

function pick(
  id: number,
  slot: number,
  opts: { captain?: boolean; vice?: boolean } = {},
): ReconstructedSquadPick {
  return {
    elementId: id,
    slot,
    isCaptain: !!opts.captain,
    isViceCaptain: !!opts.vice,
    purchasePriceTenths: 70,
    nowCostTenths: 70,
    sellingPriceTenths: 70,
    priceSource: "api",
    priceApprox: false,
    willDropAffectSell: false,
  };
}

function buildSquad(): {
  picks: ReconstructedSquadPick[];
  playersById: Map<number, PlannerPlayerCatalogItem>;
  projectionsByElement: Record<number, Record<number, PlayerGwProjection>>;
} {
  const picks: ReconstructedSquadPick[] = [];
  const playersById = new Map<number, PlannerPlayerCatalogItem>();
  for (let slot = 1; slot <= 15; slot++) {
    picks.push(
      pick(slot, slot, {
        captain: slot === 7,
        vice: slot === 9,
      }),
    );
    playersById.set(
      slot,
      catalog(
        slot,
        slot === 12 ? "BenchGk" : `P${slot}`,
        elementTypeForSlot(slot),
      ),
    );
  }
  const projectionsByElement: Record<
    number,
    Record<number, PlayerGwProjection>
  > = {};
  for (const p of picks) {
    projectionsByElement[p.elementId] = {};
    for (const gw of [10, 11, 12]) {
      projectionsByElement[p.elementId]![gw] = {
        elementId: p.elementId,
        gameweek: gw,
        xPts: 3,
        expectedMinutes: 80,
        p0: 0.1,
        p60: 0.8,
        p1: 0.9,
        isBlank: false,
        isDouble: false,
        fixtures: [
          {
            fixtureId: gw,
            matchXPts: 3,
            expectedMinutes: 80,
            p0: 0.1,
            p60: 0.8,
            p1: 0.9,
            opponentShortName: gw === 10 ? "BRE" : gw === 11 ? "TOT" : "NFO",
            tickerLabel:
              gw === 10 ? "BRE (A)" : gw === 11 ? "TOT (A)" : "NFO (H)",
            isHome: gw === 12,
            fdrLevel: 3,
          },
        ],
      };
    }
  }
  return { picks, playersById, projectionsByElement };
}

function renderPitch(
  overrides: Partial<React.ComponentProps<typeof PlannerPitch>> = {},
) {
  const base = buildSquad();
  return render(
    <PlannerPitch
      themeId="ARENA_DARK"
      lang="pl"
      currentGw={10}
      availableGameweeks={[10, 11, 12]}
      squadPicks={base.picks}
      selectedSlotForSwap={null}
      playersById={base.playersById}
      projectionsByElement={base.projectionsByElement}
      tileMetric="FIXTURES"
      onSelectSlotForSwap={() => undefined}
      onSwapSlots={() => undefined}
      onMarkPlayerForTransferOut={() => undefined}
      onSetCaptain={() => undefined}
      onSetViceCaptain={() => undefined}
      watchlistIds={new Set()}
      onToggleWatchlist={() => undefined}
      activeChip={null}
      {...overrides}
    />,
  );
}

describe("A4+U3 PlannerPitch — ławka bez C/VC", () => {
  it("ławka: brak przycisku C/VC", () => {
    renderPitch();
    const benchTile = screen.getByRole("group", { name: /BenchGk/i });
    expect(
      within(benchTile).queryByRole("button", { name: /Kapitan:/i }),
    ).toBeNull();
    expect(
      within(benchTile).queryByRole("button", { name: /Wicekapitan:/i }),
    ).toBeNull();
    expect(within(benchTile).queryByText("C")).toBeNull();
    expect(within(benchTile).queryByText("VC")).toBeNull();

    expect(
      screen.getByRole("button", { name: /Kapitan: P7/ }),
    ).toBeTruthy();
  });

  it("Bench Boost: brak przycisku C/VC na ławce", () => {
    renderPitch({ activeChip: "bboost" });
    const benchTile = screen.getByRole("group", { name: /BenchGk/i });
    expect(
      within(benchTile).queryByRole("button", { name: /Kapitan:/i }),
    ).toBeNull();
    expect(
      within(benchTile).queryByRole("button", { name: /Wicekapitan:/i }),
    ).toBeNull();
  });
});

describe("A4+U3 PlannerPitch — ostrzeżenia missing przy boisku", () => {
  it("po sprzedaży C w GW n ostrzeżenie widać przy boisku GW n, a po ponownym ustawieniu C znika", async () => {
    const user = userEvent.setup();
    const onSetCaptain = vi.fn();
    const { rerender } = renderPitch({
      missingCaptain: true,
      missingVice: false,
      onSetCaptain,
      squadPicks: buildSquad().picks.map((p) => ({
        ...p,
        isCaptain: false,
      })),
    });

    expect(screen.getByTestId("pitch-captain-missing").textContent).toBe(
      pt("pl", "planner.captain.missing"),
    );
    expect(screen.queryByTestId("pitch-vice-missing")).toBeNull();

    rerender(
      <PlannerPitch
        themeId="ARENA_DARK"
        lang="pl"
        currentGw={10}
        availableGameweeks={[10, 11, 12]}
        squadPicks={buildSquad().picks}
        selectedSlotForSwap={null}
        playersById={buildSquad().playersById}
        projectionsByElement={buildSquad().projectionsByElement}
        tileMetric="FIXTURES"
        onSelectSlotForSwap={() => undefined}
        onSwapSlots={() => undefined}
        onMarkPlayerForTransferOut={() => undefined}
        onSetCaptain={onSetCaptain}
        onSetViceCaptain={() => undefined}
        watchlistIds={new Set()}
        onToggleWatchlist={() => undefined}
        activeChip={null}
        missingCaptain={false}
        missingVice={false}
      />,
    );

    expect(screen.queryByTestId("pitch-role-missing")).toBeNull();
    await user.click(screen.getByRole("button", { name: /Kapitan: P7/ }));
    expect(onSetCaptain).toHaveBeenCalled();
  });
});

describe("A4+U3 PlannerPitch — pasek akcji karty", () => {
  it("pasek akcji: klasy max-w-full, brak w-max/min-w", () => {
    const { container } = renderPitch();
    const tile = container.querySelector(
      '[data-testid="player-tile"]',
    ) as HTMLElement;
    expect(tile).toBeTruthy();
    expect(tile.className).toMatch(/\bmax-w-full\b/);
    expect(tile.className).not.toMatch(/\bw-max\b/);
    expect(tile.className).not.toMatch(/\bmin-w-/);

    const actionRow = tile.querySelector(
      ":scope > div.mb-0\\.5",
    ) as HTMLElement | null;
    expect(actionRow).toBeTruthy();
    expect(actionRow!.className).toMatch(/\bmax-w-full\b/);
    expect(actionRow!.className).not.toMatch(/\bw-max\b/);
    expect(actionRow!.className).not.toMatch(/\bmin-w-/);
  });

  it("przycisk C/VC ma aria-pressed u zawodnika z opaską", () => {
    renderPitch();
    const capBtn = screen.getByRole("button", { name: /Kapitan: P7/ });
    const viceBtn = screen.getByRole("button", { name: /Wicekapitan: P9/ });
    expect(capBtn.getAttribute("aria-pressed")).toBe("true");
    expect(viceBtn.getAttribute("aria-pressed")).toBe("true");
    const otherCap = screen.getByRole("button", { name: /Kapitan: P8/ });
    expect(otherCap.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("A4+U3 PlannerPitch — pigułki GW na ławce/plakacie", () => {
  it("ławka z 3 GW renderuje 3 wiersze, a DGW renderuje 2 pigułki w jednym wierszu", () => {
    const base = buildSquad();
    // DGW w GW10 dla ławkowego GK
    base.projectionsByElement[12]![10] = {
      ...base.projectionsByElement[12]![10]!,
      isDouble: true,
      fixtures: [
        {
          fixtureId: 1,
          matchXPts: 2,
          expectedMinutes: 80,
          p0: 0.1,
          p60: 0.8,
          p1: 0.9,
          opponentShortName: "BRE",
          tickerLabel: "BRE (A)",
          isHome: false,
          fdrLevel: 3,
        },
        {
          fixtureId: 2,
          matchXPts: 2,
          expectedMinutes: 80,
          p0: 0.1,
          p60: 0.8,
          p1: 0.9,
          opponentShortName: "TOT",
          tickerLabel: "TOT (A)",
          isHome: false,
          fdrLevel: 3,
        },
      ],
    };

    renderPitch({
      squadPicks: base.picks,
      playersById: base.playersById,
      projectionsByElement: base.projectionsByElement,
    });

    const benchTile = screen.getByRole("group", { name: /BenchGk/i });
    const stack = within(benchTile).getByTestId("fixture-pills-stack");
    const rows = within(stack).getAllByTestId("fixture-pills-row");
    expect(rows).toHaveLength(3);

    const dgwRow = rows[0]!;
    const pills = within(dgwRow).getAllByText(/^[A-Z]{3} \((D|W)\)$/);
    expect(pills).toHaveLength(2);
    expect(dgwRow.className).toMatch(/flex-nowrap/);
  });
});
