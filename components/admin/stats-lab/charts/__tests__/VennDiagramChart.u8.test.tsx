/** @vitest-environment jsdom */
import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { VennDiagramChart, type VennChartPlayer } from "@/components/admin/stats-lab/charts/VennDiagramChart";
import { STATS_LAB_CHART_THEMES } from "@/components/admin/stats-lab/chartTheme";
import type { StatsLabChartThemeId } from "@/components/admin/stats-lab/chartTheme";
import {
  computeWcagContrastRatio,
  parseCssColorToRgba,
} from "@/lib/stats-lab/auditExport";
import { buildVennSummary } from "@/lib/stats-lab/i18n";
import { getVennPreset, type VennCondition } from "@/lib/stats-lab/vennEngine";

const CONDITIONS = getVennPreset("COMPLETE_DEFENDER").conditions;

function ratio(fg: string, bg: string): number {
  const a = parseCssColorToRgba(fg);
  const b = parseCssColorToRgba(bg);
  if (!a || !b) throw new Error(`color ${fg} / ${bg}`);
  return computeWcagContrastRatio(a, b);
}

function person(
  id: number,
  name: string,
  totals: Partial<Record<string, number>>,
): VennChartPlayer {
  return {
    id,
    name,
    fullName: `${name} Full`,
    clubShort: "ARS",
    clubName: "Arsenal",
    minutes: 900,
    points: 40 + id,
    badgeCode: 0,
    totals,
  };
}

function renderChart(
  extra: Partial<React.ComponentProps<typeof VennDiagramChart>> = {},
) {
  const players = [
    person(1, "OnlyA", { clean_sheets: 6, goals_assists: 0, dc_bonus_matches: 0 }),
    person(2, "Centre", { clean_sheets: 7, goals_assists: 4, dc_bonus_matches: 5 }),
  ];
  return render(
    <VennDiagramChart
      players={players}
      conditions={CONDITIONS}
      theme={STATS_LAB_CHART_THEMES.ARENA_DARK}
      lang="pl"
      positions={[2]}
      gwLabel="GW 1–10"
      minMinutes={270}
      density="full"
      {...extra}
    />,
  );
}

describe("U8 diagram Venna — render", () => {
  it("zdanie z danych, PL/EN i pełna nazwa warunku", () => {
    expect(
      buildVennSummary({
        lang: "pl",
        cohort: "def",
        atLeastOne: 42,
        allThree: 1,
      }),
    ).toBe(
      "42 obrońców spełnia co najmniej jeden warunek, tylko 1 wszystkie trzy.",
    );
    expect(
      buildVennSummary({
        lang: "en",
        cohort: "def",
        atLeastOne: 42,
        allThree: 1,
      }),
    ).toBe("42 defenders meet at least one condition, only 1 meets all three.");

    const view = renderChart();
    expect(document.querySelector("[data-venn-summary]")?.textContent).toMatch(
      /2 obrońców spełnia co najmniej jeden warunek, tylko 1 wszystkie trzy/,
    );
    expect(document.body.textContent).toMatch(/czyste konta/);
    expect(document.body.textContent).toMatch(/nikt/);
    view.unmount();

    renderChart({ lang: "en" });
    expect(document.body.textContent).toMatch(/clean sheets/i);
    expect(document.body.textContent).toMatch(/nobody/);
  });

  it("trzy motywy: etykieta i „nikt” mają kontrast co najmniej 4.5:1", () => {
    const themes: StatsLabChartThemeId[] = [
      "ARENA_DARK",
      "SCOUT_DARK",
      "ANALYST_LIGHT",
    ];
    for (const id of themes) {
      const theme = STATS_LAB_CHART_THEMES[id];
      const view = renderChart({ theme });
      const root = document.querySelector("[data-venn-root]") as HTMLElement;
      const label = document.querySelector("[data-venn-label]") as SVGElement;
      expect(label.getAttribute("fill")).toBe(theme.text);
      expect(ratio(label.getAttribute("fill") || "", theme.canvasBg)).toBeGreaterThanOrEqual(4.5);
      const empty = document.querySelector("[data-venn-empty]") as SVGElement;
      expect(empty).toBeTruthy();
      expect(ratio(empty.getAttribute("fill") || "", theme.panelBg)).toBeGreaterThanOrEqual(4.5);
      expect(root.style.backgroundColor || root.style.background).toBeTruthy();
      view.unmount();
    }
  });

  it("pokazuje +N i pełną listę, a skrót ma pełną nazwę w aria", () => {
    const crowd = Array.from({ length: 12 }, (_, index) =>
      person(index + 1, `Defender${index + 1}`, {
        clean_sheets: 4 + index,
        goals_assists: 0,
        dc_bonus_matches: 0,
      }),
    );
    renderChart({ players: crowd });
    const plus = document.querySelector("[data-venn-plus='A']");
    expect(plus?.textContent).toMatch(/^\+\d+$/);
    const hidden = Number((plus?.textContent ?? "").replace("+", ""));
    const tokens = document.querySelectorAll("[data-venn-token='A']");
    expect(tokens.length + hidden).toBe(12);
    expect(screen.getByText("Defender1 Full")).toBeTruthy();
    expect(screen.getByText("Defender12 Full")).toBeTruthy();

    const centre = document.querySelector("[data-venn-token='ABC']");
    expect(centre).toBeNull();
    fireEvent.focus(tokens[0] as HTMLElement);
    const tip = screen.getByRole("tooltip");
    expect(tip.textContent).toMatch(/Defender/);
    expect(tip.textContent).toMatch(/Czyste konta \(CS\)/);
    expect(document.body.innerHTML).not.toMatch(/class="[^"]*\btruncate\b/);
    expect(document.body.innerHTML).not.toMatch(/text-ellipsis/);
  });

  it("eksport nie ma panelu sterowania, a wąski układ zostawia zawodników na liście", () => {
    const view = renderChart({ variant: "export", density: "full" });
    expect(document.querySelector("[data-variant='export']")).toBeTruthy();
    expect(document.querySelector("[data-venn-controls]")).toBeNull();
    expect(document.querySelector("select")).toBeNull();
    expect(document.querySelector("[data-venn-token]")).toBeTruthy();
    expect(document.querySelector("[data-venn-source]")?.textContent).toMatch(
      /fpl-arena.com · Dane: FPL · GW 1–10/,
    );
    view.unmount();

    renderChart({ density: "counts" });
    expect(document.querySelector("[data-venn-density='counts']")).toBeTruthy();
    expect(document.querySelector("[data-venn-token]")).toBeNull();
    expect(screen.getByText("OnlyA Full")).toBeTruthy();
    expect(document.querySelector("[data-venn-count='A']")?.textContent).toMatch(/1/);
  });
});

describe("U8 warunki własne", () => {
  it("próg z panelu zmienia pole, nie Per 90", () => {
    const custom: [VennCondition, VennCondition, VennCondition] = [
      { id: "A", metric: "goals_scored", threshold: 2 },
      { id: "B", metric: "assists", threshold: 2 },
      { id: "C", metric: "bonus", threshold: 1 },
    ];
    render(
      <VennDiagramChart
        players={[
          person(1, "Raw", {
            goals_scored: 2,
            assists: 0,
            bonus: 0,
          }),
        ]}
        conditions={custom}
        theme={STATS_LAB_CHART_THEMES.SCOUT_DARK}
        lang="en"
        positions={[4]}
        gwLabel="GW 3–8"
        minMinutes={0}
        density="full"
      />,
    );
    expect(document.querySelector("[data-venn-count='A']")?.textContent).toMatch(/1/);
    expect(document.querySelector("[data-venn-empty='B']")).toBeTruthy();
    expect(document.body.textContent).toMatch(/goals scored/i);
  });
});
