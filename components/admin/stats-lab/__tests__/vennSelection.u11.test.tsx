/** @vitest-environment jsdom */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  StatsLabControlPanel,
  type StudioUiState,
} from "@/components/admin/stats-lab/StatsLabControlPanel";
import type { StatsLabBootstrapData } from "@/lib/stats-lab/analyticsEngine";
import {
  TOP_N_OPTIONS,
  createDefaultStatsLabFilter,
} from "@/lib/stats-lab/presets";
import { cloneVennConditions, getVennPreset } from "@/lib/stats-lab/vennEngine";

function bootstrap(): StatsLabBootstrapData {
  return {
    seasonCode: "2025/26",
    meta: null,
    maxGw: 38,
    clubs: [
      {
        fpl_team_id: 1,
        name: "Arsenal",
        short_name: "ARS",
        primary_color: "#EF0107",
        pulse_code: 3,
      },
    ],
    players: [
      {
        fpl_element_id: 7,
        web_name: "Saka",
        first_name: "Bukayo",
        second_name: "Saka",
        element_type: 3,
        fpl_team_id: 1,
        now_cost: 100,
        selected_by_percent: 40,
        total_points: 80,
        minutes: 900,
        status: "a",
      },
    ],
  };
}

function ui(patch: Partial<StudioUiState> = {}): StudioUiState {
  return {
    vizMode: "VENN_3",
    pickMode: "AUTO",
    chartTheme: "ARENA_DARK",
    lang: "pl",
    scaleMode: "PERCENTILE",
    customTitle: "",
    customSubtitle: "",
    showPoolAverage: false,
    showBarValues: true,
    showPlayerMeta: true,
    showNegativeBreakdown: false,
    spotlightPlayerId: null,
    axisX: "expected_goal_involvements",
    axisY: "total_points",
    sortByComposite: false,
    vennPresetId: "COMPLETE_DEFENDER",
    vennConditions: cloneVennConditions(getVennPreset("COMPLETE_DEFENDER").conditions),
    ...patch,
  };
}

describe("U11 wybór zawodników Venna", () => {
  it("pokazuje ten sam TOP N co pozostałe wykresy i ustawia limit", () => {
    const onFilterChange = vi.fn();
    render(
      <StatsLabControlPanel
        bootstrap={bootstrap()}
        filter={createDefaultStatsLabFilter("2025/26")}
        ui={ui()}
        onFilterChange={onFilterChange}
        onUiChange={() => undefined}
      />,
    );
    expect(screen.getByText("Pokaż najlepszych (Top N)")).toBeTruthy();
    for (const n of TOP_N_OPTIONS) {
      expect(screen.getByRole("button", { name: `Top ${n}` })).toBeTruthy();
    }
    fireEvent.click(screen.getByRole("button", { name: "Top 15" }));
    expect(onFilterChange).toHaveBeenCalled();
    const next = onFilterChange.mock.calls.at(-1)?.[0];
    expect(next.limitPlayers).toBe(15);
  });

  it("Profil wielowymiarowy dalej ustawia ten sam limit TOP N", () => {
    const onFilterChange = vi.fn();
    render(
      <StatsLabControlPanel
        bootstrap={bootstrap()}
        filter={createDefaultStatsLabFilter("2025/26")}
        ui={ui({ vizMode: "STACKED_COMPOSITE" })}
        onFilterChange={onFilterChange}
        onUiChange={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Top 8" }));
    expect(onFilterChange.mock.calls.at(-1)?.[0].limitPlayers).toBe(8);
  });

  it("ręczny wybór dodaje zawodnika z wyszukiwarki i nie rusza TOP N innych trybów", () => {
    const onFilterChange = vi.fn();
    render(
      <StatsLabControlPanel
        bootstrap={bootstrap()}
        filter={createDefaultStatsLabFilter("2025/26")}
        ui={ui({ pickMode: "MANUAL" })}
        onFilterChange={onFilterChange}
        onUiChange={() => undefined}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Szukaj: Raya, Arsenal…"), {
      target: { value: "Saka" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Saka/ }));
    expect(onFilterChange.mock.calls.at(-1)?.[0].selectedPlayerIds).toEqual([7]);
  });

  it("nie dopisuje 21. zawodnika", () => {
    const onFilterChange = vi.fn();
    const data = bootstrap();
    data.players.push({
      ...data.players[0],
      fpl_element_id: 99,
      web_name: "Extra",
      second_name: "Extra",
    });
    render(
      <StatsLabControlPanel
        bootstrap={data}
        filter={{
          ...createDefaultStatsLabFilter("2025/26"),
          selectedPlayerIds: Array.from({ length: 20 }, (_, index) => index + 1),
        }}
        ui={ui({ pickMode: "MANUAL" })}
        onFilterChange={onFilterChange}
        onUiChange={() => undefined}
      />,
    );
    expect(screen.getByText("Maks. 20 zawodników.")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Szukaj: Raya, Arsenal…"), {
      target: { value: "Extra" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Extra/ }));
    expect(onFilterChange).not.toHaveBeenCalled();
  });

  it("przycisk pozycji na Vennie zmienia tylko filtr pozycji — kryteria ustawia klient", () => {
    const onFilterChange = vi.fn();
    const onUiChange = vi.fn();
    render(
      <StatsLabControlPanel
        bootstrap={bootstrap()}
        filter={{ ...createDefaultStatsLabFilter("2025/26"), positions: [2] }}
        ui={ui()}
        onFilterChange={onFilterChange}
        onUiChange={onUiChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "MID" }));
    const next = onFilterChange.mock.calls.at(-1)?.[0];
    expect(next.positions).toEqual([3]);
    expect(onUiChange).not.toHaveBeenCalled();
  });
});
