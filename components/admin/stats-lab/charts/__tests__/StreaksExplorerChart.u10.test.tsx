/** @vitest-environment jsdom */
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatsLabChartCanvas } from "@/components/admin/stats-lab/StatsLabChartCanvas";
import { StreaksExplorerChart } from "@/components/admin/stats-lab/charts/StreaksExplorerChart";
import {
  STATS_LAB_CHART_THEMES,
  type StatsLabChartThemeId,
} from "@/components/admin/stats-lab/chartTheme";
import type { PlottedStatsLabPlayer } from "@/lib/stats-lab/analyticsEngine";
import {
  DEFAULT_STREAK_KEYS_BY_POSITION,
  type StatsLabLang,
  type StreakMetricKey,
} from "@/lib/stats-lab/i18n";
import { createDefaultStatsLabFilter } from "@/lib/stats-lab/presets";
import type {
  FplStatKey,
  PlayerStreaks,
  PlayingTimeGwEntry,
  StreakDotState,
} from "@/lib/stats-lab/types";

const THEMES: StatsLabChartThemeId[] = [
  "ARENA_DARK",
  "SCOUT_DARK",
  "ANALYST_LIGHT",
];

const DEF_KEYS = DEFAULT_STREAK_KEYS_BY_POSITION.DEF;

function dots(spec: string): StreakDotState[] {
  return [...spec].map((ch) =>
    ch === "H" ? "HIT" : ch === "D" ? "DNP" : "MISS",
  );
}

function buildStreaks(
  overrides: Partial<PlayerStreaks> & { spec?: string; gws?: number[] } = {},
): PlayerStreaks {
  const spec = overrides.spec ?? "HHHHHHHHHH";
  const flags = dots(spec);
  const gws = overrides.gws ?? flags.map((_, index) => index + 1);
  const playing: PlayingTimeGwEntry[] =
    overrides.playingTimeTimeline ??
    gws.map((gw) => ({ gw, status: "SIXTY_PLUS", minutes: 90 }));
  const recent = {
    returnHit: flags,
    goalHit: flags,
    assistHit: flags,
    goalOrAssistHit: flags,
    cleanSheetHit: flags,
    dcHit: flags,
    sixtyMinHit: flags,
    savesHit: flags,
    bonusHit: flags,
  };
  return {
    maxReturnStreak: 4,
    currentReturnStreak: 2,
    maxGoalStreak: 1,
    currentGoalStreak: 0,
    maxAssistStreak: 1,
    currentAssistStreak: 0,
    maxGoalOrAssistStreak: 1,
    currentGoalOrAssistStreak: 0,
    maxCleanSheetStreak: 2,
    currentCleanSheetStreak: 1,
    maxDcPointsStreak: 3,
    currentDcPointsStreak: 1,
    max60MinStreak: 4,
    current60MinStreak: 2,
    maxSavesPointStreak: 0,
    currentSavesPointStreak: 0,
    maxBonusStreak: 1,
    currentBonusStreak: 0,
    returnConsistencyPct: overrides.returnConsistencyPct ?? 80,
    totalPeriodGws: overrides.totalPeriodGws ?? 10,
    appearancesCount: overrides.appearancesCount ?? 10,
    sixtyPlusCount: overrides.sixtyPlusCount ?? 10,
    returnsCount: overrides.returnsCount ?? 8,
    playingTimeTimeline: playing,
    timelineGameweeks: overrides.timelineGameweeks ?? gws,
    timelineDots: flags,
    returnTimelineDots: flags,
    goalTimelineDots: flags,
    assistTimelineDots: flags,
    gaTimelineDots: flags,
    csTimelineDots: flags,
    dcTimelineDots: flags,
    sixtyMinTimelineDots: flags,
    savesTimelineDots: flags,
    bonusTimelineDots: flags,
    recentFlags: recent,
  };
}

function player(args: {
  id: number;
  name: string;
  club: string;
  costTenths: number;
  tsb: number;
  consistency?: number;
  returns?: number;
  apps?: number;
  sixty?: number;
  period?: number;
  spec?: string;
  gws?: number[];
  playing?: PlayingTimeGwEntry[];
  code?: number;
  badge?: number;
}): PlottedStatsLabPlayer {
  const streaks = buildStreaks({
    spec: args.spec,
    gws: args.gws,
    playingTimeTimeline: args.playing,
    returnConsistencyPct: args.consistency ?? 80,
    returnsCount: args.returns ?? 8,
    appearancesCount: args.apps ?? 10,
    sixtyPlusCount: args.sixty ?? 10,
    totalPeriodGws: args.period ?? 10,
  });
  return {
    fpl_element_id: args.id,
    web_name: args.name,
    first_name: args.name,
    second_name: "",
    element_type: 2,
    playerCode: args.code ?? 0,
    player_code: args.code ?? 0,
    clubPulseCode: args.badge ?? 0,
    minutes: (args.apps ?? 10) * 90,
    fpl_team_id: args.id,
    status: "a",
    club: {
      fpl_team_id: args.id,
      name: args.club,
      short_name: args.club,
      primary_color: null,
      pulse_code: args.badge ?? 0,
    },
    rawValues: {
      now_cost: args.costTenths,
      selected_by_percent: args.tsb,
      total_points: args.consistency ?? 80,
    } as Record<FplStatKey, number>,
    displayValues: {} as Record<FplStatKey, number>,
    percentiles: {} as Record<FplStatKey, number>,
    compositeScore: args.consistency ?? 80,
    pointsBreakdown: {
      estimatedTotal: 0,
      attack: 0,
      creativity: 0,
      defensive: 0,
      playingTime: 0,
      penalties: 0,
    },
    streaks,
    matchTrace: [],
  } as unknown as PlottedStatsLabPlayer;
}

const SQUAD = [
  player({
    id: 1,
    name: "Muharemović",
    club: "LEE",
    costTenths: 51,
    tsb: 6.4,
    consistency: 100,
    returns: 10,
    code: 441,
    badge: 14,
  }),
  player({
    id: 2,
    name: "Van Hecke",
    club: "TOT",
    costTenths: 51,
    tsb: 14.4,
    consistency: 80,
    returns: 8,
  }),
  player({
    id: 3,
    name: "Vuskovic",
    club: "BHA",
    costTenths: 53,
    tsb: 8.9,
    consistency: 80,
    returns: 8,
  }),
  player({
    id: 4,
    name: "Silva",
    club: "BOU",
    costTenths: 51,
    tsb: 3.6,
    consistency: 80,
    returns: 8,
  }),
];

function renderChart(args: {
  players?: PlottedStatsLabPlayer[];
  themeId?: StatsLabChartThemeId;
  lang?: StatsLabLang;
  variant?: "studio" | "export";
  keys?: StreakMetricKey[];
  showMeta?: boolean;
}) {
  const theme = STATS_LAB_CHART_THEMES[args.themeId ?? "ARENA_DARK"];
  return render(
    <StreaksExplorerChart
      players={args.players ?? SQUAD}
      theme={theme}
      lang={args.lang ?? "pl"}
      spotlightId={null}
      showMeta={args.showMeta ?? true}
      activeStreakKeys={args.keys ?? DEF_KEYS}
      onToggleStreakKey={() => undefined}
      sortKey="returnConsistencyPct"
      sortDir="DESC"
      onSort={() => undefined}
      onSelectPlayer={() => undefined}
      variant={args.variant ?? "studio"}
    />,
  );
}

function cardGrid(container: HTMLElement): HTMLElement {
  const grid = container.querySelector(".md\\:grid-cols-2");
  if (!(grid instanceof HTMLElement)) {
    throw new Error("brak siatki kart");
  }
  return grid;
}

function cards(container: HTMLElement): HTMLButtonElement[] {
  return Array.from(cardGrid(container).querySelectorAll(":scope > button"));
}

describe("U10 Passy i regularność — siatka kart sprzed U9", () => {
  it.each(THEMES)(
    "%s pokazuje karty w PL i EN, bez tabeli U9",
    (themeId) => {
      const { unmount, container } = renderChart({ themeId, lang: "pl" });
      expect(screen.getByText("Muharemović")).toBeTruthy();
      expect(screen.getByText("Van Hecke")).toBeTruthy();
      expect(screen.getByText("Vuskovic")).toBeTruthy();
      expect(screen.getByText("Silva")).toBeTruthy();
      expect(screen.getAllByText("Regularność: 100% (10/10)").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Regularność zwrotów %").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Seria G/A").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Seria DC (+2)").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Najdłuższa seria zwrotów").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Aktualna seria zwrotów").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Seria czystych kont").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Seria z bonusem (BPS)").length).toBeGreaterThan(0);
      expect(screen.getByText("£5.1m · 6.4% TSB")).toBeTruthy();
      expect(screen.getAllByText("Występy: 10/10").length).toBe(4);
      expect(screen.queryByText("Mecze z golem lub asystą z rzędu")).toBeNull();
      expect(screen.queryByText("Mecze z premią DC z rzędu")).toBeNull();
      expect(screen.queryByRole("button", { name: "Pokaż więcej" })).toBeNull();
      expect(container.querySelector("table")).toBeNull();
      expect(container.innerHTML).not.toContain("min-w-[640px]");
      const grid = cardGrid(container);
      expect(grid.className).toContain("grid-cols-1");
      expect(grid.className).toContain("md:grid-cols-2");
      expect(cards(container)).toHaveLength(4);

      const dc = Array.from(container.querySelectorAll(".border-l-4")).find(
        (node) => node.textContent?.includes("Seria DC (+2)"),
      );
      expect(dc).toBeTruthy();
      const dcColor = (dc as HTMLElement).style.borderLeftColor;
      if (themeId === "ANALYST_LIGHT") {
        expect(dcColor).toBe("rgb(13, 148, 136)");
      } else {
        expect(dcColor).toBe("rgb(45, 212, 191)");
      }
      const bonus = Array.from(container.querySelectorAll(".border-l-4")).find(
        (node) => node.textContent?.includes("Seria z bonusem (BPS)"),
      );
      expect((bonus as HTMLElement).style.borderLeftColor).not.toBe(dcColor);

      const photo = container.querySelector("img");
      expect(photo?.getAttribute("src")).toBe("/api/uploads/fpl-lab/player/441");
      expect(photo?.getAttribute("crossorigin")).toBe("anonymous");
      const badge = container.querySelector(
        'img[src="/api/uploads/fpl-lab/badge/14"]',
      );
      expect(badge?.getAttribute("crossorigin")).toBe("anonymous");
      unmount();

      renderChart({ themeId, lang: "en", variant: "export" });
      expect(screen.getByText("Consistency: 100% (10/10)")).toBeTruthy();
      expect(screen.getAllByText("G/A streak").length).toBeGreaterThan(0);
      expect(screen.getAllByText("DC (+2) streak").length).toBeGreaterThan(0);
      expect(screen.getByText(/Sort:/)).toBeTruthy();
      expect(screen.getByText("£5.1m · 6.4% TSB")).toBeTruthy();
      expect(screen.queryByText("Matches in a row with G/A")).toBeNull();
      expect(screen.queryByText("Matches in a row with DC bonus")).toBeNull();
      expect(screen.queryByText("Show more")).toBeNull();
      expect(screen.queryByRole("table")).toBeNull();
    },
  );

  it.each([1, 2, 3, 4])(
    "renderuje %i kart bez błędu",
    (count) => {
      const { container } = renderChart({
        players: SQUAD.slice(0, count),
        themeId: count % 2 === 0 ? "SCOUT_DARK" : "ANALYST_LIGHT",
        lang: count > 2 ? "en" : "pl",
      });
      expect(cards(container)).toHaveLength(count);
      const oddSpan = cards(container).filter((card) =>
        card.className.includes("md:col-span-2"),
      );
      expect(oddSpan).toHaveLength(count % 2 === 1 ? 1 : 0);
    },
  );

  it("zawodnik 6/10 (jak Pedro Porro) pokazuje niepełną oś i 33% (2/6)", () => {
    const porro = player({
      id: 9,
      name: "Pedro Porro",
      club: "TOT",
      costTenths: 53,
      tsb: 4.9,
      consistency: 33,
      returns: 2,
      apps: 6,
      sixty: 3,
      period: 10,
      spec: "HHMMDM",
      gws: [5, 6, 7, 8, 9, 10],
      playing: [
        { gw: 5, status: "SIXTY_PLUS", minutes: 90 },
        { gw: 6, status: "SIXTY_PLUS", minutes: 77 },
        { gw: 7, status: "SUB_UNDER_60", minutes: 28 },
        { gw: 8, status: "DNP_0", minutes: 0 },
        { gw: 9, status: "SIXTY_PLUS", minutes: 90 },
        { gw: 10, status: "SUB_UNDER_60", minutes: 12 },
      ],
    });
    const { container } = renderChart({
      players: [porro],
      themeId: "ARENA_DARK",
      lang: "pl",
      variant: "export",
    });
    expect(screen.getByText("Pedro Porro")).toBeTruthy();
    expect(screen.getByText("Regularność: 33% (2/6)")).toBeTruthy();
    expect(screen.getAllByText("33% (2/6)").length).toBeGreaterThan(0);
    expect(screen.getByText("Występy: 6/10")).toBeTruthy();
    expect(screen.getByText("60+ min: 3/10")).toBeTruthy();
    expect(screen.getAllByText("GW 5–10").length).toBeGreaterThan(0);
    const hitDots = container.querySelectorAll('[title="GW5: hit"]');
    const missDots = container.querySelectorAll('[title="GW7: miss"]');
    const dnpDots = container.querySelectorAll('[title="GW9: 0 min (DNP)"]');
    const benchDots = container.querySelectorAll("[title=\"GW8: 0'\"]");
    expect(hitDots.length).toBeGreaterThan(0);
    expect(missDots.length).toBeGreaterThan(0);
    expect(dnpDots.length).toBeGreaterThan(0);
    expect(benchDots.length).toBeGreaterThan(0);
    expect(container.querySelector("table")).toBeNull();
  });

  it("klik karty oddaje id zawodnika", async () => {
    const user = userEvent.setup();
    const onSelect = viSelect();
    const theme = STATS_LAB_CHART_THEMES.ARENA_DARK;
    render(
      <StreaksExplorerChart
        players={SQUAD.slice(0, 1)}
        theme={theme}
        lang="pl"
        spotlightId={1}
        showMeta
        activeStreakKeys={DEF_KEYS}
        onToggleStreakKey={() => undefined}
        sortKey="returnConsistencyPct"
        sortDir="DESC"
        onSort={() => undefined}
        onSelectPlayer={onSelect.fn}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Muharemović/ }));
    expect(onSelect.calls).toEqual([1]);
  });
});

function viSelect() {
  const calls: number[] = [];
  return {
    calls,
    fn: (id: number) => {
      calls.push(id);
    },
  };
}

describe("U10 Passy — plakat i wspólna stopka", () => {
  it.each(THEMES)(
    "eksport %s zostawia nową stopkę i objaśnienie zwrotu",
    (themeId) => {
      for (const lang of ["pl", "en"] as const) {
        const filter = createDefaultStatsLabFilter("2026/27");
        filter.selectedPlayerIds = SQUAD.map((row) => row.fpl_element_id);
        filter.minMinutes = 180;
        const { unmount } = render(
          <StatsLabChartCanvas
            result={{
              plottedPlayers: SQUAD,
              poolAverages: {} as Record<FplStatKey, number>,
              poolSize: 120,
              effectiveGwRange: [1, 10],
              activeMetrics: filter.activeMetrics,
            }}
            filter={filter}
            vizMode="STREAKS_EXPLORER"
            themeId={themeId}
            lang={lang}
            scaleMode="RAW"
            customTitle=""
            customSubtitle=""
            seasonCode="2026/27"
            spotlightPlayerId={null}
            showPoolAverage={false}
            showBarValues={false}
            showPlayerMeta
            showNegativeBreakdown={false}
            axisX="total_points"
            axisY="goals_assists"
            pending={false}
            chartSortKey="total_points"
            chartSortDir="DESC"
            pointsSortKey="estimatedTotal"
            streakSortKey="returnConsistencyPct"
            activeStreakKeys={DEF_KEYS}
            onChartSort={() => undefined}
            onPointsSort={() => undefined}
            onStreakSort={() => undefined}
            onToggleStreakKey={() => undefined}
            onShowNegativesChange={() => undefined}
            onSelectPlayer={() => undefined}
            variant="export"
          />,
        );
        const title = screen.getByRole("heading", { level: 2 }).textContent ?? "";
        if (lang === "pl") {
          expect(
            screen.getByText(
              "fpl-arena.com · Dane: FPL · Predykcje: FPL Arena",
            ),
          ).toBeTruthy();
          expect(screen.getByText(/Zwrot FPL \(Return\)/)).toBeTruthy();
          expect(screen.getByText(/Sumy meczowe/)).toBeTruthy();
          expect(title).toContain("PORÓWNANIE • Muharemović vs Van Hecke");
          expect(title).toContain("Passy i regularność");
        } else {
          expect(
            screen.getByText(
              "fpl-arena.com · Data: FPL · Predictions: FPL Arena",
            ),
          ).toBeTruthy();
          expect(screen.getByText(/FPL Return =/)).toBeTruthy();
          expect(screen.getByText(/Match totals/)).toBeTruthy();
          expect(title).toContain("HEAD-TO-HEAD • Muharemović vs Van Hecke");
          expect(title).toContain("Streaks & consistency");
        }
        expect(screen.queryByText(/Powered by St0pa/)).toBeNull();
        expect(screen.queryByText("Pokaż więcej")).toBeNull();
        expect(screen.getByText("Muharemović")).toBeTruthy();
        unmount();
      }
    },
  );
});
