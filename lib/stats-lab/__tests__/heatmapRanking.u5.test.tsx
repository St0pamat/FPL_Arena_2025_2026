/** @vitest-environment jsdom */
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { HeatmapMatrixChart } from "@/components/admin/stats-lab/charts/HeatmapMatrixChart";
import { STATS_LAB_CHART_THEMES } from "@/components/admin/stats-lab/chartTheme";
import type { PlottedStatsLabPlayer } from "@/lib/stats-lab/analyticsEngine";
import type { FplStatKey } from "@/lib/stats-lab/types";

function player(
  id: number,
  name: string,
  points: number,
  rating: number,
): PlottedStatsLabPlayer {
  const raw = {
    total_points: points,
    now_cost: 50,
    selected_by_percent: 5,
    goals_scored: 0,
    clean_sheets: 0,
  } as Record<FplStatKey, number>;
  return {
    fpl_element_id: id,
    web_name: name,
    first_name: name,
    second_name: "",
    element_type: 2,
    playerCode: 0,
    player_code: 0,
    clubPulseCode: 0,
    minutes: 900,
    fpl_team_id: 1,
    status: "a",
    club: {
      fpl_team_id: 1,
      name: "Test",
      short_name: "TST",
      primary_color: null,
      pulse_code: 0,
    },
    rawValues: raw,
    displayValues: { ...raw },
    percentiles: { goals_scored: 50, clean_sheets: 50 } as Record<
      FplStatKey,
      number
    >,
    compositeScore: rating,
    pointsBreakdown: {
      estimatedTotal: points,
      attack: 0,
      creativity: 0,
      defensive: 0,
      playingTime: 0,
      penalties: 0,
    },
    streaks: {} as PlottedStatsLabPlayer["streaks"],
    matchTrace: [],
  } as unknown as PlottedStatsLabPlayer;
}

describe("U5 Studio heatmap TOP — ranking wg punktów", () => {
  it("nagłówek pokazuje metrykę sortowania; punkty główne; Ocena z tooltipem; kolejność wg punktów", () => {
    const players = [
      player(1, "HighPts", 120, 40),
      player(2, "LowPts", 80, 90),
    ];
    render(
      <HeatmapMatrixChart
        players={players}
        metrics={["goals_scored", "clean_sheets"]}
        theme={STATS_LAB_CHART_THEMES.ARENA_DARK}
        lang="pl"
        rankedByStat="total_points"
        showAvg={false}
      />,
    );

    const header = document.querySelector(
      '[data-heatmap-ranking-header="true"]',
    );
    expect(header?.textContent).toMatch(/Ranking wg punktów/);

    const rows = document.querySelectorAll("[data-heatmap-rank-primary]");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.textContent).toMatch(/120/);
    expect(rows[1]?.textContent).toMatch(/80/);

    const names = screen.getAllByText(/HighPts|LowPts/);
    expect(names[0]?.textContent).toBe("HighPts");
    expect(names[1]?.textContent).toBe("LowPts");

    const rating = document.querySelector(
      '[data-heatmap-rating-cell="true"]',
    ) as HTMLElement | null;
    expect(rating).toBeTruthy();
    expect(rating!.getAttribute("title")).toMatch(/percentyli/);
    expect(within(rating!).getByText(/Ocena/i)).toBeTruthy();
  });

  it("EN: Ranked by points + rating tooltip", () => {
    render(
      <HeatmapMatrixChart
        players={[player(1, "A", 10, 50)]}
        metrics={["goals_scored"]}
        theme={STATS_LAB_CHART_THEMES.ARENA_DARK}
        lang="en"
        rankedByStat="total_points"
        showAvg={false}
      />,
    );
    expect(
      document.querySelector('[data-heatmap-ranking-header="true"]')
        ?.textContent,
    ).toMatch(/Ranked by points/);
    expect(
      document
        .querySelector('[data-heatmap-rating-cell="true"]')
        ?.getAttribute("title"),
    ).toMatch(/percentiles/i);
  });
});
