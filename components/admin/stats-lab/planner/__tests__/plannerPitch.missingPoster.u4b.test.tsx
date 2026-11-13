/** @vitest-environment jsdom */
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { PlannerPlayerCatalogItem } from "@/app/admin/actions/statsLabPlanner";
import type { ReconstructedSquadPick } from "@/lib/stats-lab/fplEntryApi";
import type { PlayerGwProjection } from "@/lib/stats-lab/plannerEngine";
import { PlannerPitch } from "@/components/admin/stats-lab/planner/PlannerPitch";
import { pt } from "@/lib/stats-lab/plannerI18n";

function catalog(id: number, name: string, t: 1 | 2 | 3 | 4): PlannerPlayerCatalogItem {
  return {
    fpl_element_id: id,
    player_code: id * 10,
    web_name: name,
    first_name: name,
    second_name: name,
    element_type: t,
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

describe("U4b plakat: missing C widoczne mimo hideActionChrome", () => {
  it("pitch_poster: banner Wybierz kapitana widać; przy JPEG (isExporting) znika", () => {
    const picks: ReconstructedSquadPick[] = [];
    const playersById = new Map<number, PlannerPlayerCatalogItem>();
    for (let slot = 1; slot <= 15; slot++) {
      picks.push({
        elementId: slot,
        slot,
        isCaptain: false,
        isViceCaptain: slot === 9,
        purchasePriceTenths: 70,
        nowCostTenths: 70,
        sellingPriceTenths: 70,
        priceSource: "api",
        priceApprox: false,
        willDropAffectSell: false,
      });
      playersById.set(
        slot,
        catalog(slot, `P${slot}`, elementTypeForSlot(slot)),
      );
    }
    const projectionsByElement: Record<
      number,
      Record<number, PlayerGwProjection>
    > = {};
    for (const p of picks) {
      projectionsByElement[p.elementId] = {
        10: {
          elementId: p.elementId,
          gameweek: 10,
          xPts: 3,
          expectedMinutes: 80,
          p0: 0.1,
          p60: 0.8,
          p1: 0.9,
          isBlank: false,
          isDouble: false,
          fixtures: [],
        },
      };
    }

    const common = {
      themeId: "ARENA_DARK" as const,
      lang: "pl" as const,
      currentGw: 10,
      availableGameweeks: [10],
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
      activeChip: null,
      missingCaptain: true,
      missingVice: false,
    };

    const { rerender } = render(
      <PlannerPitch {...common} hideActionChrome isExporting={false} />,
    );
    expect(screen.getByTestId("pitch-captain-missing").textContent).toBe(
      pt("pl", "planner.captain.missing"),
    );

    rerender(<PlannerPitch {...common} hideActionChrome isExporting />);
    expect(screen.queryByTestId("pitch-captain-missing")).toBeNull();
  });
});
