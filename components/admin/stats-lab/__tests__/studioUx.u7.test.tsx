/** @vitest-environment jsdom */
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StudioPendingCue } from "@/components/admin/stats-lab/StudioPendingCue";
import { StackedCompositeChart } from "@/components/admin/stats-lab/charts/StackedCompositeChart";
import { HeatmapMatrixChart } from "@/components/admin/stats-lab/charts/HeatmapMatrixChart";
import { RadarPizzaChart } from "@/components/admin/stats-lab/charts/RadarPizzaChart";
import { Scatter2DChart } from "@/components/admin/stats-lab/charts/Scatter2DChart";
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
    expected_goals: id === 1 ? 8.2 : 3.1,
    now_cost: 50,
    selected_by_percent: 5,
  } as Record<FplStatKey, number>;
  return {
    fpl_element_id: id,
    web_name: name,
    first_name: name,
    second_name: "",
    element_type: 4,
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
    percentiles: { expected_goals: id === 1 ? 40 : 80 } as Record<
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

const theme = STATS_LAB_CHART_THEMES.ARENA_DARK;

describe("U7 Studio — wskaźnik przeliczania", () => {
  it("przy gotowym wyniku nie pokazuje napisu PRZELICZANIE", () => {
    const { rerender } = render(
      <StudioPendingCue pending hasResult lang="pl" isLight={false} />,
    );
    const cue = screen.getByTestId("studio-pending-cue");
    expect(cue.textContent ?? "").not.toMatch(/Przelicz|Updating|PRZELICZANIE/i);
    expect(cue.querySelector("svg")).toBeTruthy();
    expect(cue.querySelector("[aria-label]")?.getAttribute("aria-label")).toMatch(
      /Przeliczam/,
    );

    rerender(
      <StudioPendingCue pending hasResult={false} lang="pl" isLight={false} />,
    );
    expect(screen.queryByTestId("studio-pending-cue")).toBeNull();

    rerender(
      <StudioPendingCue pending={false} hasResult lang="en" isLight />,
    );
    expect(screen.queryByTestId("studio-pending-cue")).toBeNull();
  });
});

describe("U7 Studio — TOP10 punkty i Ocena", () => {
  const players = [player(1, "HighPts", 120, 61), player(2, "LowPts", 80, 93)];

  function renderStacked(
    lang: "pl" | "en",
    poolSortByComposite = false,
  ) {
    return render(
      <StackedCompositeChart
        players={players}
        metrics={["expected_goals"]}
        theme={theme}
        lang={lang}
        scaleMode="PERCENTILE"
        spotlightId={null}
        showValues={false}
        showMeta={false}
        sortKey="total_points"
        sortDir="DESC"
        onSort={() => undefined}
        onSelectPlayer={() => undefined}
        poolSortStat="total_points"
        poolSortByComposite={poolSortByComposite}
      />,
    );
  }

  it("duża liczba to punkty, Ocena osobno, podpis sortowania", () => {
    renderStacked("pl");
    const values = screen
      .getAllByTestId("rank-primary-value")
      .map((node) => node.textContent);
    expect(values).toEqual(["120", "80"]);
    const ratings = screen
      .getAllByTestId("rank-rating")
      .map((node) => node.textContent);
    expect(ratings[0]).toMatch(/Ocena 61/);
    expect(ratings[1]).toMatch(/Ocena 93/);
    expect(screen.getByTestId("studio-sort-caption").textContent).toMatch(
      /Posortowane po punktach/,
    );
    expect(
      screen.getByRole("button", { name: "Oczekiwane gole" }),
    ).toBeTruthy();
    expect(screen.getAllByText("HighPts")[0]).toBeTruthy();
    expect(screen.getAllByText("LowPts")[0]).toBeTruthy();
  });

  it("EN: Sorted by points, a przy sortowaniu po ocenie duża liczba to Rating", () => {
    const view = renderStacked("en");
    expect(screen.getByTestId("studio-sort-caption").textContent).toMatch(
      /Sorted by points/,
    );
    view.unmount();
    renderStacked("pl", true);
    expect(screen.queryByTestId("studio-sort-caption")).toBeNull();
    expect(
      screen.getAllByTestId("rank-primary-value").map((node) => node.textContent),
    ).toEqual(["61", "93"]);
    expect(screen.queryByTestId("rank-rating")).toBeNull();
  });
});

describe("U7 Studio — pełne nazwy skrótów", () => {
  it("nagłówek heatmapy ma pełną nazwę w aria-label", () => {
    render(
      <HeatmapMatrixChart
        players={[player(1, "A", 10, 50)]}
        metrics={["expected_goals"]}
        theme={theme}
        lang="pl"
        rankedByStat="total_points"
        showAvg={false}
      />,
    );
    const header = screen.getByRole("button", { name: "Oczekiwane gole" });
    expect(header.getAttribute("title")).toBe("Oczekiwane gole");
    expect(header.textContent).toMatch(/xG/);
  });

  it("radar i scatter niosą pełną nazwę", () => {
    const averages = { expected_goals: 4, total_points: 40 } as Record<
      FplStatKey,
      number
    >;
    const { unmount } = render(
      <RadarPizzaChart
        players={[player(1, "A", 10, 50)]}
        metrics={["expected_goals"]}
        poolAverages={averages}
        theme={theme}
        lang="en"
        scaleMode="PERCENTILE"
        spotlightId={null}
        showAvg={false}
        onSelectPlayer={() => undefined}
      />,
    );
    expect(document.querySelector("text title")?.textContent).toBe(
      "Expected goals",
    );
    unmount();

    render(
      <Scatter2DChart
        players={[player(1, "A", 10, 50)]}
        axisX="expected_goals"
        axisY="total_points"
        poolAverages={averages}
        theme={theme}
        lang="pl"
        spotlightId={null}
        showAvg={false}
        showMeta={false}
        onSelectPlayer={() => undefined}
      />,
    );
    expect(screen.getAllByLabelText("Oczekiwane gole").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Punkty FPL").length).toBeGreaterThan(0);
  });
});
