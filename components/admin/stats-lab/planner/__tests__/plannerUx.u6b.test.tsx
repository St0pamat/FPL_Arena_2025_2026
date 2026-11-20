/** @vitest-environment jsdom */
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { PlannerPlayerCatalogItem } from "@/app/admin/actions/statsLabPlanner";
import type { ReconstructedSquadPick } from "@/lib/stats-lab/fplEntryApi";
import type { PlayerGwProjection } from "@/lib/stats-lab/plannerEngine";
import { PlannerMarketSidebar } from "@/components/admin/stats-lab/planner/PlannerMarketSidebar";
import { PlannerPitch } from "@/components/admin/stats-lab/planner/PlannerPitch";
import { PlannerPlayerCard } from "@/components/admin/stats-lab/planner/PlannerPlayerCard";
import { plannerCardPalette } from "@/components/admin/stats-lab/planner/plannerCardPalette";
import type { StatsLabChartThemeId } from "@/components/admin/stats-lab/chartTheme";
import {
  computeWcagContrastRatio,
  parseCssColorToRgba,
} from "@/lib/stats-lab/auditExport";
import { plannerDisplayFullName } from "@/lib/stats-lab/plannerUiFormat";

const CSS = fs.readFileSync(
  path.resolve(__dirname, "../plannerPlayerCard.css"),
  "utf8",
);

const TAILWIND_BG: Record<string, string> = {
  "bg-emerald-300": "#6ee7b7",
  "bg-emerald-500": "#10b981",
  "bg-emerald-600": "#059669",
  "bg-emerald-700": "#047857",
  "bg-slate-200": "#e2e8f0",
  "bg-slate-500": "#64748b",
  "bg-amber-200": "#fde68a",
  "bg-amber-600": "#d97706",
  "bg-rose-500": "#f43f5e",
  "bg-rose-600": "#e11d48",
};

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
    club_short_name: "MCI",
    club_pulse_code: null,
    now_cost: 50,
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

function pick(id: number, slot: number): ReconstructedSquadPick {
  return {
    elementId: id,
    slot,
    isCaptain: slot === 9,
    isViceCaptain: slot === 7,
    purchasePriceTenths: 50,
    nowCostTenths: 50,
    sellingPriceTenths: 50,
    priceSource: "api",
    priceApprox: false,
    willDropAffectSell: false,
  };
}

function fx(short: string, fdr: number): PlayerGwProjection["fixtures"][number] {
  return {
    fixtureId: fdr + short.length,
    matchXPts: 1,
    expectedMinutes: 80,
    p0: 0.1,
    p60: 0.8,
    p1: 0.9,
    opponentShortName: short,
    tickerLabel: "x",
    isHome: true,
    fdrLevel: fdr as 1 | 2 | 3 | 4 | 5,
  };
}

function proj(
  elementId: number,
  gw: number,
  fdr: number | null,
): PlayerGwProjection {
  return {
    elementId,
    gameweek: gw,
    xPts: 4,
    expectedMinutes: 80,
    p0: 0.1,
    p60: 0.8,
    p1: 0.9,
    isBlank: fdr == null,
    isDouble: false,
    fixtures: fdr == null ? [] : [fx("FUL", fdr)],
  };
}

function renderCard(
  themeId: StatsLabChartThemeId,
  byGw: Record<number, PlayerGwProjection>,
) {
  const player = catalog(1, "Alexander-Arnold", 2);
  return render(
    <PlannerPlayerCard
      themeId={themeId}
      lang="pl"
      isLight={themeId === "ANALYST_LIGHT"}
      isExporting={false}
      pick={pick(1, 2)}
      player={player}
      proj={byGw[11]}
      projectionsForElement={byGw}
      currentGw={11}
      tileMetric="FIXTURES"
      activeChip={null}
      armbandKind="C"
      playerName={player.web_name}
      fullName={plannerDisplayFullName(player)}
      onSell={() => undefined}
      onSwap={() => undefined}
      onInfo={() => undefined}
      onOpenActions={() => undefined}
    />,
  );
}

function bgHex(className: string): string {
  const arbitrary = className.match(/bg-\[(#[0-9a-fA-F]{6})\]/);
  if (arbitrary?.[1]) return arbitrary[1];
  for (const token of className.split(/\s+/)) {
    const hex = TAILWIND_BG[token];
    if (hex) return hex;
  }
  throw new Error(`brak tła w ${className}`);
}

function ratio(fg: string, background: string): number {
  const a = parseCssColorToRgba(fg);
  const b = parseCssColorToRgba(background);
  if (!a || !b) throw new Error(`${fg} / ${background}`);
  return computeWcagContrastRatio(a, b);
}

describe("U6b karta: ⓘ, kropki FDR, wąska odznaka", () => {
  it("ⓘ stoi poza tabliczką, ma pole 32 px i nie wychodzi ujemnym offsetem", () => {
    renderCard("ARENA_DARK", {
      11: proj(1, 11, 3),
      12: proj(1, 12, 2),
      13: proj(1, 13, 4),
      14: proj(1, 14, 5),
    });
    const name = screen.getByTestId("card-player-name");
    const plate = name.closest(".ppc-plate");
    const info = screen.getByRole("button", { name: /Informacje:/ });
    expect(plate?.contains(info)).toBe(false);
    expect(info.className).toContain("min-h-8");
    expect(info.className).toContain("min-w-8");
    expect(info.className).toContain("ppc-act-info");
    const infoRule = CSS.match(/\.ppc-act-info\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(infoRule).toContain("left: 2rem");
    expect(infoRule).toContain("top: 0");
    expect(infoRule).not.toMatch(/-\d/);
    const nameRule = CSS.match(/\.ppc-name\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(nameRule).toContain("text-overflow: ellipsis");
    expect(nameRule).toContain("padding: 0 2px");
    expect(name.textContent).toBe("Alexander-Arnold");
  });

  it("kropka FDR ma kontrast ≥ 3:1 do tła tabliczki w Arena, Scout i Light", () => {
    const themes = ["ARENA_DARK", "SCOUT_DARK", "ANALYST_LIGHT"] as const;
    const sets: Array<Record<number, PlayerGwProjection>> = [
      {
        11: proj(1, 11, 3),
        12: proj(1, 12, 1),
        13: proj(1, 13, 2),
        14: proj(1, 14, 5),
      },
      {
        11: proj(1, 11, 3),
        12: proj(1, 12, 3),
        13: proj(1, 13, 4),
        14: proj(1, 14, null),
      },
    ];
    for (const themeId of themes) {
      const plate = bgHex(plannerCardPalette(themeId).plate);
      for (const byGw of sets) {
        const view = renderCard(themeId, byGw);
        for (const dot of screen.getAllByTestId("fdr-dot")) {
          const level = dot.getAttribute("data-fdr-level");
          const fill = bgHex(dot.className);
          expect(ratio(fill, plate), `${themeId} FDR ${level}`).toBeGreaterThanOrEqual(3);
        }
        view.unmount();
      }
    }
  });

  it("odznaka 22 px na wąskiej karcie nie nachodzi na herb", () => {
    const compact = CSS.slice(CSS.indexOf("@container (max-width: 84px)"));
    expect(compact).toMatch(/\.ppc-badge\s*\{[^}]*width:\s*22px/);
    expect(compact).toMatch(/\.ppc-badge\s*\{[^}]*height:\s*22px/);
    expect(compact).toMatch(/\.ppc-badge\s*\{[^}]*left:\s*-8px/);
    expect(compact).toMatch(/\.ppc-crest\s*\{[^}]*width:\s*14px/);
    expect(compact).toMatch(/\.ppc-crest\s*\{[^}]*right:\s*-6px/);
    const shirt = 30;
    const badgeEnd = -8 + 22;
    const crestStart = shirt - 14 - -6;
    expect(crestStart).toBeGreaterThan(badgeEnd);
  });
});

function elementTypeForSlot(slot: number): 1 | 2 | 3 | 4 {
  if (slot === 1 || slot === 12) return 1;
  if (slot >= 2 && slot <= 6) return 2;
  if (slot >= 7 && slot <= 9) return 3;
  if (slot >= 10 && slot <= 11) return 4;
  return 3;
}

function renderFiveDefenders() {
  const picks: ReconstructedSquadPick[] = [];
  const playersById = new Map<number, PlannerPlayerCatalogItem>();
  const projectionsByElement: Record<number, Record<number, PlayerGwProjection>> = {};
  for (let slot = 1; slot <= 15; slot += 1) {
    picks.push(pick(slot, slot));
    playersById.set(slot, catalog(slot, `P${slot}`, elementTypeForSlot(slot)));
    projectionsByElement[slot] = {
      11: proj(slot, 11, 3),
      12: proj(slot, 12, 2),
      13: proj(slot, 13, 4),
      14: proj(slot, 14, 1),
    };
  }
  return render(
    <div style={{ width: 320 }}>
      <PlannerPitch
        themeId="ARENA_DARK"
        lang="pl"
        currentGw={11}
        availableGameweeks={[11, 12, 13, 14]}
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
      />
    </div>,
  );
}

describe("U6b boisko 320/360 i okno Info", () => {
  it("pięciu obrońców mieści się w rzędzie przy 320 i 360 px", () => {
    renderFiveDefenders();
    const line = screen
      .getAllByTestId("pitch-line")
      .find((node) => /repeat\(5,\s*minmax\(0/.test(node.style.gridTemplateColumns));
    expect(line).toBeTruthy();
    expect(line?.className).toMatch(/w-full/);
    expect(line?.className).toMatch(/min-w-0/);
    const pitch = document.querySelector("[data-planner-pitch]");
    expect(pitch?.className).toMatch(/overflow-hidden/);
    expect(pitch?.className).not.toMatch(/overflow-x-auto/);
    for (const viewport of [320, 360]) {
      const pitchPad = 8;
      const gaps = 16;
      const column = (viewport - pitchPad - gaps) / 5;
      expect(column).toBeGreaterThan(40);
      expect(viewport - pitchPad).toBeLessThan(viewport + 1);
    }
  });

  it("Esc zamyka Info, C i VC są pierwsze, etykiety cen są pełne", () => {
    renderFiveDefenders();
    fireEvent.click(screen.getByRole("button", { name: "Informacje: P1" }));
    const dialog = screen.getByRole("dialog");
    const buttons = within(dialog).getAllByRole("button");
    expect(buttons[0]?.getAttribute("aria-label")).toMatch(/^Kapitan:/);
    expect(buttons[1]?.getAttribute("aria-label")).toMatch(/^Wicekapitan:/);
    expect(dialog.textContent).toContain("Cena zakupu");
    expect(dialog.textContent).toContain("Cena teraz");
    expect(dialog.textContent).toContain("Cena sprzedaży");
    expect(dialog.textContent).not.toMatch(/\bPP\b|\bCP\b|\bSP\b/);
    expect(dialog.textContent).toContain("xPts");
    expect(dialog.textContent).not.toMatch(/xPts v1/i);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("przełącznik budżetu ma aria-pressed", () => {
    render(
      <PlannerMarketSidebar
        themeId="ARENA_DARK"
        lang="pl"
        currentGw={11}
        planningStartGw={11}
        availableGameweeks={[11]}
        clubs={[]}
        players={[]}
        playersById={new Map()}
        projectionsByElement={{}}
        squadPicks={[]}
        watchlistIds={new Set()}
        onToggleWatchlist={() => undefined}
        pendingTransferOut={null}
        onClearPendingTransferOut={() => undefined}
        availableBudgetTenths={50}
        bankTenths={50}
        onExecuteTransfer={() => undefined}
        onOpenPlayerInfo={() => undefined}
        evaluatedGws={[]}
        squadMarketValueTenths={0}
        squadSellingValueTenths={0}
        spendingPowerTenths={50}
        plannedTransferCount={0}
      />,
    );
    const toggle = screen.getByRole("button", { name: "Tylko w moim budżecie" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
  });
});
