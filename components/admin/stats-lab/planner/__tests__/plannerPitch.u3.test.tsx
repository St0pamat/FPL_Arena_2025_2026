/** @vitest-environment jsdom */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PlannerPlayerCatalogItem } from "@/app/admin/actions/statsLabPlanner";
import type { ReconstructedSquadPick } from "@/lib/stats-lab/fplEntryApi";
import type { PlayerGwProjection } from "@/lib/stats-lab/plannerEngine";
import { PlannerPitch } from "@/components/admin/stats-lab/planner/PlannerPitch";
import { PlannerFixturePills } from "@/components/admin/stats-lab/planner/PlannerFixturePills";
import { FIXTURE_PILL_CLASS } from "@/lib/stats-lab/plannerFixtureUi";
import { ptTip } from "@/lib/stats-lab/plannerI18n";
import { formatPlusButtonLabel } from "@/lib/stats-lab/plannerUiFormat";
import { PLANNER_ACTION_HIT_CLASS } from "@/lib/stats-lab/plannerFixtureUi";

function catalog(
  id: number,
  name: string,
  club: string,
  elementType: 1 | 2 | 3 | 4 = 3,
): PlannerPlayerCatalogItem {
  return {
    fpl_element_id: id,
    player_code: id * 10,
    web_name: name,
    first_name: name,
    second_name: name,
    element_type: elementType,
    fpl_team_id: 1,
    club_short_name: club,
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

function blankProj(elementId: number, gw: number): PlayerGwProjection {
  return {
    elementId,
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
}

function matchProj(
  elementId: number,
  gw: number,
  short: string,
  isHome: boolean,
): PlayerGwProjection {
  return {
    elementId,
    gameweek: gw,
    xPts: 5.1,
    expectedMinutes: 80,
    p0: 0.1,
    p60: 0.8,
    p1: 0.9,
    isBlank: false,
    isDouble: false,
    fixtures: [
      {
        fixtureId: 1,
        matchXPts: 5.1,
        expectedMinutes: 80,
        p0: 0.1,
        p60: 0.8,
        p1: 0.9,
        opponentShortName: short,
        tickerLabel: "should-not-appear",
        isHome,
        fdrLevel: 3,
      },
    ],
  };
}

/** Realistyczna formacja: slot→pozycja, żeby kafelek nie renderował się 2× (GK fallback). */
function elementTypeForSlot(slot: number): 1 | 2 | 3 | 4 {
  if (slot === 1 || slot === 12) return 1;
  if (slot >= 2 && slot <= 5) return 2;
  if (slot >= 6 && slot <= 8) return 3;
  if (slot >= 9 && slot <= 11) return 4;
  return 3;
}

function fillSquad(
  a: ReconstructedSquadPick,
  b: ReconstructedSquadPick,
): ReconstructedSquadPick[] {
  const rest: ReconstructedSquadPick[] = [];
  for (let slot = 1; slot <= 15; slot++) {
    if (slot === a.slot) rest.push(a);
    else if (slot === b.slot) rest.push(b);
    else {
      rest.push(pick(slot, slot));
    }
  }
  return rest;
}

function playersMapForSquad(
  named: Array<[number, string, string, (1 | 2 | 3 | 4) | undefined]>,
): Map<number, PlannerPlayerCatalogItem> {
  const m = new Map<number, PlannerPlayerCatalogItem>();
  for (let slot = 1; slot <= 15; slot++) {
    m.set(slot, catalog(slot, `P${slot}`, "ARS", elementTypeForSlot(slot)));
  }
  for (const [id, name, club, et] of named) {
    m.set(id, catalog(id, name, club, et ?? elementTypeForSlot(id)));
  }
  return m;
}

describe("U3 PlannerFixturePills render", () => {
  it("pill has whitespace-nowrap and venueTip title", () => {
    const { container } = render(
      <PlannerFixturePills
        lang="pl"
        isLight={false}
        fdrClass={() => "border-slate-500"}
        proj={matchProj(1, 10, "NFO", true)}
      />,
    );
    const pill = container.querySelector("span");
    expect(pill).toBeTruthy();
    expect(pill!.className).toContain("whitespace-nowrap");
    expect(pill!.className).toContain(
      FIXTURE_PILL_CLASS.split(" ").find((c) => c.includes("whitespace"))!,
    );
    expect(pill!.getAttribute("title")).toBe(
      ptTip("pl", "planner.fixture.venueTip"),
    );
    expect(pill!.textContent).toBe("NFO (D)");
  });

  it("DGW row container has whitespace-nowrap / flex-nowrap so pills stay on one line", () => {
    const dgw: PlayerGwProjection = {
      elementId: 1,
      gameweek: 10,
      xPts: 8,
      expectedMinutes: 160,
      p0: 0.05,
      p60: 0.9,
      p1: 0.95,
      isBlank: false,
      isDouble: true,
      fixtures: [
        {
          fixtureId: 1,
          matchXPts: 4,
          expectedMinutes: 80,
          p0: 0.1,
          p60: 0.8,
          p1: 0.9,
          opponentShortName: "ARS",
          tickerLabel: "ignored",
          isHome: true,
          fdrLevel: 2,
        },
        {
          fixtureId: 2,
          matchXPts: 4,
          expectedMinutes: 80,
          p0: 0.1,
          p60: 0.8,
          p1: 0.9,
          opponentShortName: "new",
          tickerLabel: "ignored",
          isHome: false,
          fdrLevel: 3,
        },
      ],
    };
    render(
      <PlannerFixturePills
        lang="pl"
        isLight={false}
        fdrClass={() => "border-slate-500"}
        proj={dgw}
      />,
    );
    const row = screen.getByTestId("fixture-pills-row");
    expect(row.className).toContain("whitespace-nowrap");
    expect(row.className).toMatch(/flex-nowrap|nowrap/);
    expect(row.querySelectorAll("span")).toHaveLength(2);
    expect(row.textContent).toContain("ARS (D)");
    expect(row.textContent).toContain("NEW (W)");
  });
});

describe("U3 PlannerPitch armband + BGW captain", () => {
  it("armband only on captain, not role=button; TC with 3xc; BGW captain does not throw", () => {
    const picks = fillSquad(
      pick(7, 7, { captain: true }),
      pick(9, 9, { vice: true }),
    );
    const playersById = playersMapForSquad([
      [7, "Salah", "LIV", 3],
      [9, "Haaland", "MCI", 4],
    ]);
    const projectionsByElement: Record<
      number,
      Record<number, PlayerGwProjection>
    > = {};
    for (const p of picks) {
      projectionsByElement[p.elementId] = {
        10: blankProj(p.elementId, 10),
        11: blankProj(p.elementId, 11),
        12: blankProj(p.elementId, 12),
      };
    }

    const { rerender } = render(
      <PlannerPitch
        themeId="ARENA_DARK"
        lang="pl"
        currentGw={10}
        availableGameweeks={[10, 11, 12]}
        squadPicks={picks}
        selectedSlotForSwap={null}
        playersById={playersById}
        projectionsByElement={projectionsByElement}
        tileMetric="FIXTURES"
        onSelectSlotForSwap={() => undefined}
        onSwapSlots={() => undefined}
        onMarkPlayerForTransferOut={() => undefined}
        onSetCaptain={() => undefined}
        onSetViceCaptain={() => undefined}
        watchlistIds={new Set()}
        onToggleWatchlist={() => undefined}
        activeChip={null}
      />,
    );

    const armbands = screen.getAllByTestId("captain-armband");
    expect(armbands).toHaveLength(2); // C + VC
    for (const el of armbands) {
      expect(el.getAttribute("role")).toBe("img");
      expect(el.getAttribute("role")).not.toBe("button");
    }
    expect(screen.getByLabelText("Kapitan").textContent).toBe("C");
    expect(screen.getByLabelText("Wicekapitan").textContent).toBe("VC");

    // Triple Captain → TC aria
    rerender(
      <PlannerPitch
        themeId="ARENA_DARK"
        lang="pl"
        currentGw={10}
        availableGameweeks={[10, 11, 12]}
        squadPicks={picks}
        selectedSlotForSwap={null}
        playersById={playersById}
        projectionsByElement={projectionsByElement}
        tileMetric="FIXTURES"
        onSelectSlotForSwap={() => undefined}
        onSwapSlots={() => undefined}
        onMarkPlayerForTransferOut={() => undefined}
        onSetCaptain={() => undefined}
        onSetViceCaptain={() => undefined}
        watchlistIds={new Set()}
        onToggleWatchlist={() => undefined}
        activeChip="3xc"
      />,
    );
    expect(screen.getByLabelText("Kapitan, Triple Captain").textContent).toBe(
      "TC",
    );
    expect(screen.queryByLabelText("Kapitan")).toBeNull();
  });

  it("TC armband only in GW with Triple Captain chip; neighbouring GW shows plain C", () => {
    const picks = fillSquad(
      pick(7, 7, { captain: true }),
      pick(9, 9, { vice: true }),
    );
    const playersById = playersMapForSquad([
      [7, "Salah", "LIV", 3],
      [9, "Haaland", "MCI", 4],
    ]);
    const projectionsByElement: Record<
      number,
      Record<number, PlayerGwProjection>
    > = {};
    for (const p of picks) {
      projectionsByElement[p.elementId] = {
        10: matchProj(p.elementId, 10, "NFO", true),
        11: matchProj(p.elementId, 11, "NEW", false),
      };
    }

    const pitchProps = {
      themeId: "ARENA_DARK" as const,
      lang: "en" as const,
      availableGameweeks: [10, 11],
      squadPicks: picks,
      selectedSlotForSwap: null,
      playersById,
      projectionsByElement,
      tileMetric: "FIXTURES" as const,
      onSelectSlotForSwap: () => undefined,
      onSwapSlots: () => undefined,
      onMarkPlayerForTransferOut: () => undefined,
      onSetCaptain: () => undefined,
      onSetViceCaptain: () => undefined,
      watchlistIds: new Set<number>(),
      onToggleWatchlist: () => undefined,
    };

    const { rerender } = render(
      <PlannerPitch {...pitchProps} currentGw={10} activeChip="3xc" />,
    );
    expect(screen.getByLabelText("Captain, Triple Captain").textContent).toBe(
      "TC",
    );
    expect(screen.queryByLabelText("Captain")).toBeNull();

    // Sąsiednia GW bez chipa 3xc — ta sama opaska kapitana to zwykłe „C”
    rerender(<PlannerPitch {...pitchProps} currentGw={11} activeChip={null} />);
    expect(screen.getByLabelText("Captain").textContent).toBe("C");
    expect(screen.queryByLabelText("Captain, Triple Captain")).toBeNull();
  });

  it("after captain moves A→B only B has C armband; C and VC never same person", async () => {
    const user = userEvent.setup();
    let picks = fillSquad(
      pick(7, 7, { captain: true }),
      pick(9, 9, { vice: true }),
    );
    const playersById = playersMapForSquad([
      [7, "Salah", "LIV", 3],
      [9, "Haaland", "MCI", 4],
    ]);
    const projectionsByElement: Record<
      number,
      Record<number, PlayerGwProjection>
    > = {};
    for (const p of picks) {
      projectionsByElement[p.elementId] = {
        10: matchProj(p.elementId, 10, "NFO", true),
        11: matchProj(p.elementId, 11, "NEW", false),
        12: matchProj(p.elementId, 12, "ARS", true),
      };
    }

    const onSetCaptain = vi.fn((elementId: number) => {
      picks = picks.map((p) => ({
        ...p,
        isCaptain: p.elementId === elementId,
        isViceCaptain:
          p.elementId === elementId ? false : p.isViceCaptain,
      }));
    });

    const { rerender } = render(
      <PlannerPitch
        themeId="ARENA_DARK"
        lang="en"
        currentGw={10}
        availableGameweeks={[10, 11, 12]}
        squadPicks={picks}
        selectedSlotForSwap={null}
        playersById={playersById}
        projectionsByElement={projectionsByElement}
        tileMetric="FIXTURES"
        onSelectSlotForSwap={() => undefined}
        onSwapSlots={() => undefined}
        onMarkPlayerForTransferOut={() => undefined}
        onSetCaptain={onSetCaptain}
        onSetViceCaptain={() => undefined}
        watchlistIds={new Set()}
        onToggleWatchlist={() => undefined}
        activeChip={null}
      />,
    );

    const setCap = screen.getByRole("button", {
      name: "Captain: Haaland",
    });
    await user.click(setCap);
    expect(onSetCaptain).toHaveBeenCalledWith(9);

    rerender(
      <PlannerPitch
        themeId="ARENA_DARK"
        lang="en"
        currentGw={10}
        availableGameweeks={[10, 11, 12]}
        squadPicks={picks}
        selectedSlotForSwap={null}
        playersById={playersById}
        projectionsByElement={projectionsByElement}
        tileMetric="FIXTURES"
        onSelectSlotForSwap={() => undefined}
        onSwapSlots={() => undefined}
        onMarkPlayerForTransferOut={() => undefined}
        onSetCaptain={onSetCaptain}
        onSetViceCaptain={() => undefined}
        watchlistIds={new Set()}
        onToggleWatchlist={() => undefined}
        activeChip={null}
      />,
    );

    const cBands = screen.getAllByTestId("captain-armband");
    const captainBands = cBands.filter((el) => el.textContent === "C");
    expect(captainBands).toHaveLength(1);
    expect(
      captainBands[0]!.closest('[role="group"]')?.getAttribute("aria-label"),
    ).toMatch(/Haaland/i);
    const samePerson = picks.filter((p) => p.isCaptain && p.isViceCaptain);
    expect(samePerson).toHaveLength(0);
  });

  it("action buttons include hit-area classes; poster hides action buttons", () => {
    const picks = fillSquad(
      pick(7, 7, { captain: true }),
      pick(9, 9, { vice: true }),
    );
    const playersById = playersMapForSquad([
      [7, "Salah", "LIV", 3],
      [9, "Haaland", "MCI", 4],
    ]);
    const projectionsByElement: Record<
      number,
      Record<number, PlayerGwProjection>
    > = {};
    for (const p of picks) {
      projectionsByElement[p.elementId] = {
        10: matchProj(p.elementId, 10, "NFO", true),
      };
    }

    const { rerender } = render(
      <PlannerPitch
        themeId="ARENA_DARK"
        lang="pl"
        currentGw={10}
        availableGameweeks={[10]}
        squadPicks={picks}
        selectedSlotForSwap={null}
        playersById={playersById}
        projectionsByElement={projectionsByElement}
        tileMetric="FIXTURES"
        onSelectSlotForSwap={() => undefined}
        onSwapSlots={() => undefined}
        onMarkPlayerForTransferOut={() => undefined}
        onSetCaptain={() => undefined}
        onSetViceCaptain={() => undefined}
        watchlistIds={new Set()}
        onToggleWatchlist={() => undefined}
        activeChip={null}
      />,
    );

    const sell = screen.getAllByRole("button", { name: /Sprzedaj:/ })[0]!;
    expect(sell.className).toContain("min-h-8");
    expect(sell.className).toContain(
      PLANNER_ACTION_HIT_CLASS.split(" ").find((c) =>
        c.includes("pointer:coarse"),
      )!,
    );

    rerender(
      <PlannerPitch
        themeId="ARENA_DARK"
        lang="pl"
        currentGw={10}
        availableGameweeks={[10]}
        squadPicks={picks}
        selectedSlotForSwap={null}
        playersById={playersById}
        projectionsByElement={projectionsByElement}
        tileMetric="FIXTURES"
        onSelectSlotForSwap={() => undefined}
        onSwapSlots={() => undefined}
        onMarkPlayerForTransferOut={() => undefined}
        onSetCaptain={() => undefined}
        onSetViceCaptain={() => undefined}
        watchlistIds={new Set()}
        onToggleWatchlist={() => undefined}
        activeChip={null}
        isExporting
      />,
    );
    expect(screen.queryAllByRole("button", { name: /Sprzedaj:/ })).toHaveLength(
      0,
    );
    expect(screen.getAllByTestId("captain-armband").length).toBeGreaterThan(0);
    expect(screen.getAllByText("NFO (D)").length).toBeGreaterThan(0);
  });
});

describe("U3 market + accessible label helpers", () => {
  it("+ enabled label is Dodaj/Add; disabled reasons non-empty", () => {
    expect(
      formatPlusButtonLabel({
        lang: "pl",
        playerName: "Saka",
        alreadyInSquad: false,
        affordable: true,
        shortfallTenths: 0,
        clubBlocked: false,
        clubShort: "ARS",
      }),
    ).toBe("Dodaj: Saka");
    expect(
      formatPlusButtonLabel({
        lang: "en",
        playerName: "Saka",
        alreadyInSquad: false,
        affordable: true,
        shortfallTenths: 0,
        clubBlocked: false,
        clubShort: "ARS",
      }),
    ).toBe("Add: Saka");
    expect(
      formatPlusButtonLabel({
        lang: "pl",
        playerName: "Saka",
        alreadyInSquad: true,
        affordable: true,
        shortfallTenths: 0,
        clubBlocked: false,
        clubShort: "ARS",
      }),
    ).toBe("Już w składzie");
  });
});
