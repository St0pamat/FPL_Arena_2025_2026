/** @vitest-environment jsdom */
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PlannerPlayerCatalogItem } from "@/app/admin/actions/statsLabPlanner";
import type { ReconstructedSquadPick } from "@/lib/stats-lab/fplEntryApi";
import type { PlayerGwProjection } from "@/lib/stats-lab/plannerEngine";
import {
  PlannerEmptySlot,
  PlannerPlayerCard,
} from "@/components/admin/stats-lab/planner/PlannerPlayerCard";
import { PlannerPitch } from "@/components/admin/stats-lab/planner/PlannerPitch";
import {
  cornerActionsOverlapShirt,
  cornerHitWouldOverlapShirt,
} from "@/lib/stats-lab/plannerCardChrome";
import { plannerDisplayFullName } from "@/lib/stats-lab/plannerUiFormat";

const CSS = fs.readFileSync(
  path.resolve(__dirname, "../plannerPlayerCard.css"),
  "utf8",
);

function catalog(): PlannerPlayerCatalogItem {
  return {
    fpl_element_id: 1,
    player_code: 10,
    web_name: "Alexander-Arnold",
    first_name: "Trent",
    second_name: "Alexander-Arnold",
    element_type: 2,
    fpl_team_id: 1,
    club_short_name: "LIV",
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

function pick(): ReconstructedSquadPick {
  return {
    elementId: 1,
    slot: 2,
    isCaptain: true,
    isViceCaptain: false,
    purchasePriceTenths: 70,
    nowCostTenths: 70,
    sellingPriceTenths: 70,
    priceSource: "api",
    priceApprox: false,
    willDropAffectSell: false,
  };
}

function proj(): PlayerGwProjection {
  return {
    elementId: 1,
    gameweek: 11,
    xPts: 4,
    expectedMinutes: 80,
    p0: 0.1,
    p60: 0.8,
    p1: 0.9,
    isBlank: false,
    isDouble: false,
    fixtures: [
      {
        fixtureId: 1,
        matchXPts: 4,
        expectedMinutes: 80,
        p0: 0.1,
        p60: 0.8,
        p1: 0.9,
        opponentShortName: "FUL",
        tickerLabel: "FUL (W)",
        isHome: true,
        fdrLevel: 2,
      },
    ],
  };
}

function renderCard(opts: { exporting?: boolean; onInfo?: () => void } = {}) {
  const player = catalog();
  return render(
    <PlannerPlayerCard
      themeId="ARENA_DARK"
      lang="pl"
      isLight={false}
      isExporting={!!opts.exporting}
      pick={pick()}
      player={player}
      proj={proj()}
      projectionsForElement={{ 11: proj() }}
      currentGw={11}
      tileMetric="FIXTURES"
      activeChip={null}
      armbandKind="C"
      playerName={player.web_name}
      fullName={plannerDisplayFullName(player)}
      onSell={() => undefined}
      onSwap={() => undefined}
      onInfo={opts.onInfo ?? (() => undefined)}
      onOpenActions={() => undefined}
    />,
  );
}

describe("U7 ikony karty", () => {
  it("pole dotyku nie nachodzi na koszulkę przy szerokości boiska", () => {
    expect(cornerActionsOverlapShirt(102)).toBe(false);
    expect(cornerActionsOverlapShirt(104)).toBe(false);
    expect(cornerActionsOverlapShirt(140)).toBe(false);
    expect(cornerHitWouldOverlapShirt(80)).toBe(true);
    expect(cornerActionsOverlapShirt(80)).toBe(false);
    expect(CSS).toContain("width: clamp(28px, 44cqw, 46px)");
    expect(CSS).toMatch(/\.ppc-act\s*\{[^}]*width:\s*20px/);
    expect(CSS).toMatch(/\.ppc-act::before\s*\{[^}]*width:\s*32px/);
    expect(CSS).toContain("left: -4px");
    expect(CSS).toContain("top: -8px");
    expect(CSS).toContain("right: -4px");
    expect(CSS).toContain("@container (max-width: 101px)");
    expect(CSS).not.toContain(".ppc-act-info");
  });

  it("✕ i ⇄ są poza koszulką, mają aria-label i dyskretną tarczę", () => {
    renderCard();
    const shirt = document.querySelector(".ppc-shirt") as HTMLElement;
    const sell = screen.getByRole("button", {
      name: "Sprzedaj: Alexander-Arnold",
    });
    const swap = screen.getByRole("button", {
      name: "Zamień: Alexander-Arnold",
    });
    expect(shirt.contains(sell)).toBe(false);
    expect(shirt.contains(swap)).toBe(false);
    expect(sell.className).toContain("ppc-act-sell");
    expect(swap.className).toContain("ppc-act-swap");
    expect(sell.className).toContain("border-0");
    expect(sell.className).not.toContain("h-8");
    expect(sell.className).not.toContain("min-h-11");
    expect(document.querySelector(".ppc-act-info")).toBeNull();
    expect(shirt.querySelector("[data-testid='club-shirt']")).toBeTruthy();
  });

  it("Info otwiera się z koszulki i nazwiska klawiaturą", async () => {
    const user = userEvent.setup();
    const onInfo = vi.fn();
    renderCard({ onInfo });
    const hits = screen.getAllByRole("button", {
      name: "Info: Trent Alexander-Arnold",
    });
    expect(hits).toHaveLength(2);
    const shirt = screen.getByTestId("card-shirt-info");
    const name = screen.getByTestId("card-player-name");
    expect(shirt.className).toContain("ppc-info-hit");
    expect(name.className).toContain("ppc-info-hit");
    expect(name.textContent).toBe("Alexander-Arnold");
    shirt.focus();
    await user.keyboard("{Enter}");
    name.focus();
    await user.keyboard(" ");
    expect(onInfo).toHaveBeenCalledTimes(2);
  });

  it("plakat nie ma przycisków", () => {
    renderCard({ exporting: true });
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByTestId("card-player-name").tagName).toBe("B");
  });
});

describe("U7 budżet pustego slotu", () => {
  it("dopisuje do £X.Xm, a przy minusie brak budżetu, bez NaN", () => {
    const { rerender } = render(
      <PlannerEmptySlot themeId="ARENA_DARK" lang="pl" slot={11} budgetTenths={70} />,
    );
    expect(screen.getByTestId("empty-slot").textContent).toContain("do £7.0m");
    expect(screen.getByTestId("empty-slot").textContent).not.toMatch(/NaN/);

    rerender(
      <PlannerEmptySlot themeId="ARENA_DARK" lang="en" slot={11} budgetTenths={70} />,
    );
    expect(screen.getByTestId("empty-slot").textContent).toContain("up to £7.0m");

    rerender(
      <PlannerEmptySlot themeId="ARENA_DARK" lang="pl" slot={11} budgetTenths={-4} />,
    );
    expect(screen.getByTestId("empty-slot").textContent).toContain("brak budżetu");
    expect(screen.getByTestId("empty-slot").textContent).not.toMatch(/NaN/);

    rerender(
      <PlannerEmptySlot
        themeId="ARENA_DARK"
        lang="en"
        slot={11}
        budgetTenths={Number.NaN}
      />,
    );
    expect(screen.getByTestId("empty-slot").textContent).toContain("no budget");

    rerender(
      <PlannerEmptySlot themeId="ARENA_DARK" lang="pl" slot={11} budgetTenths={0} />,
    );
    expect(screen.getByTestId("empty-slot").textContent).toContain("do £0.0m");

    rerender(<PlannerEmptySlot themeId="ARENA_DARK" lang="pl" slot={11} />);
    expect(screen.getByTestId("empty-slot").textContent).not.toContain("brak budżetu");
    expect(screen.getByTestId("empty-slot").textContent).not.toContain("do £");
  });

  it("boisko pokazuje budżet na pustym slocie", () => {
    render(
      <PlannerPitch
        themeId="SCOUT_DARK"
        lang="pl"
        currentGw={11}
        availableGameweeks={[11]}
        squadPicks={[]}
        selectedSlotForSwap={null}
        playersById={new Map()}
        projectionsByElement={{}}
        tileMetric="FIXTURES"
        onSelectSlotForSwap={() => undefined}
        onSwapSlots={() => undefined}
        onMarkPlayerForTransferOut={() => undefined}
        onSetCaptain={() => undefined}
        onSetViceCaptain={() => undefined}
        watchlistIds={new Set()}
        onToggleWatchlist={() => undefined}
        activeChip={null}
        emptySlotBudgetTenths={156}
      />,
    );
    const empty = screen.getAllByTestId("empty-slot")[0]!;
    expect(empty.textContent).toContain("do £15.6m");
    expect(empty.textContent).not.toMatch(/NaN/);
  });
});
