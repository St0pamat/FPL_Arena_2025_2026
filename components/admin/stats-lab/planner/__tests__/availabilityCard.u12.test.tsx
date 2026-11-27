/** @vitest-environment jsdom */
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { PlannerPlayerCatalogItem } from "@/app/admin/actions/statsLabPlanner";
import type { ReconstructedSquadPick } from "@/lib/stats-lab/fplEntryApi";
import type { PlayerGwProjection } from "@/lib/stats-lab/plannerEngine";
import { PlannerPlayerCard } from "@/components/admin/stats-lab/planner/PlannerPlayerCard";

function player(patch: Partial<PlannerPlayerCatalogItem>): PlannerPlayerCatalogItem {
  return {
    fpl_element_id: 1,
    player_code: 10,
    web_name: "Raya",
    first_name: "David",
    second_name: "Raya",
    element_type: 1,
    fpl_team_id: 1,
    club_short_name: "ARS",
    club_pulse_code: null,
    now_cost: 62,
    cost_change_start: 0,
    status: "d",
    chance_of_playing_next_round: 75,
    news: "Hamstring",
    selected_by_percent: 20,
    total_points: 40,
    event_points: 0,
    form: 4,
    points_per_game: 4,
    value_season: 8,
    minutes: 900,
    goals_scored: 0,
    assists: 0,
    clean_sheets: 5,
    expected_goals: 0,
    expected_assists: 0,
    expected_goal_involvements: 0,
    defensive_contribution: 0,
    dc_bonus_points: 0,
    transfers_in_event: 0,
    transfers_out_event: 0,
    ...patch,
  };
}

const pick: ReconstructedSquadPick = {
  elementId: 1,
  slot: 1,
  isCaptain: false,
  isViceCaptain: false,
  purchasePriceTenths: 62,
  nowCostTenths: 62,
  sellingPriceTenths: 62,
  priceSource: "api",
  priceApprox: false,
  willDropAffectSell: false,
};

const proj: PlayerGwProjection = {
  elementId: 1,
  gameweek: 12,
  xPts: 2,
  expectedMinutes: 60,
  p0: 0.2,
  p60: 0.75,
  p1: 0.8,
  isBlank: false,
  isDouble: false,
  fixtures: [],
};

function renderCard(catalog: PlannerPlayerCatalogItem, exporting = false) {
  return render(
    <PlannerPlayerCard
      themeId="ARENA_DARK"
      lang="pl"
      isLight={false}
      isExporting={exporting}
      pick={pick}
      player={catalog}
      proj={proj}
      projectionsForElement={{}}
      currentGw={12}
      tileMetric="FIXTURES"
      activeChip={null}
      armbandKind={null}
      playerName={catalog.web_name}
      fullName="David Raya"
      onSell={() => undefined}
      onSwap={() => undefined}
      onInfo={() => undefined}
      onOpenActions={() => undefined}
    />,
  );
}

describe("U12 znacznik na karcie Planera", () => {
  it("siedzi na tabliczce nazwiska, nie na koszulce, także w eksporcie", () => {
    const { unmount } = renderCard(player({}));
    const marker = screen.getByTestId("availability-marker");
    const plate = document.querySelector(".ppc-plate");
    const shirt = document.querySelector(".ppc-shirt");
    expect(plate?.contains(marker)).toBe(true);
    expect(shirt?.contains(marker)).toBe(false);
    expect(marker.getAttribute("data-availability-tone")).toBe("yellow");
    expect(marker.textContent).toContain("75");
    unmount();

    renderCard(player({}), true);
    expect(screen.getByTestId("availability-marker").textContent).toContain("75");
  });

  it("dostępny zawodnik nie dostaje plakietki", () => {
    renderCard(
      player({ status: "a", chance_of_playing_next_round: 100, news: "" }),
    );
    expect(screen.queryByTestId("availability-marker")).toBeNull();
  });
});
