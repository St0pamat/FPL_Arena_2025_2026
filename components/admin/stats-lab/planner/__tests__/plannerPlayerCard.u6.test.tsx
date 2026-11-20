/** @vitest-environment jsdom */
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { PlannerPlayerCatalogItem } from "@/app/admin/actions/statsLabPlanner";
import type { ReconstructedSquadPick } from "@/lib/stats-lab/fplEntryApi";
import type { PlayerGwProjection } from "@/lib/stats-lab/plannerEngine";
import { PlannerPitch } from "@/components/admin/stats-lab/planner/PlannerPitch";
import { PlannerHeaderAndControls } from "@/components/admin/stats-lab/planner/PlannerHeaderAndControls";
import { PlannerPlayerCard } from "@/components/admin/stats-lab/planner/PlannerPlayerCard";
import { plannerCardPalette } from "@/components/admin/stats-lab/planner/plannerCardPalette";
import {
  getScatterClubColor,
  type StatsLabChartThemeId,
} from "@/components/admin/stats-lab/chartTheme";
import fs from "node:fs";
import path from "node:path";
import {
  computeWcagContrastRatio,
  parseCssColorToRgba,
} from "@/lib/stats-lab/auditExport";
import { formatTenthsAsPounds } from "@/lib/stats-lab/plannerI18n";
import {
  cardDisplayedXPts,
  formatPlayerTileAccessibleName,
  groupPitchSlots,
  plannerDisplayFullName,
} from "@/lib/stats-lab/plannerUiFormat";

function catalog(
  id: number,
  name: string,
  elementType: 1 | 2 | 3 | 4 = 3,
  extra: Partial<PlannerPlayerCatalogItem> = {},
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
    now_cost: 156,
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
    ...extra,
  };
}

function pick(
  id: number,
  slot: number,
  opts: {
    captain?: boolean;
    vice?: boolean;
    sell?: number;
    purchase?: number;
    now?: number;
  } = {},
): ReconstructedSquadPick {
  return {
    elementId: id,
    slot,
    isCaptain: !!opts.captain,
    isViceCaptain: !!opts.vice,
    purchasePriceTenths: opts.purchase ?? opts.sell ?? 156,
    nowCostTenths: opts.now ?? opts.sell ?? 156,
    sellingPriceTenths: opts.sell ?? 156,
    priceSource: "api",
    priceApprox: false,
    willDropAffectSell: false,
  };
}

function fx(
  short: string,
  isHome: boolean,
  fdr: number,
  matchXPts: number,
): PlayerGwProjection["fixtures"][number] {
  return {
    fixtureId: short.length + fdr,
    matchXPts,
    expectedMinutes: 80,
    p0: 0.1,
    p60: 0.8,
    p1: 0.9,
    opponentShortName: short,
    tickerLabel: "ignored",
    isHome,
    fdrLevel: fdr as 1 | 2 | 3 | 4 | 5,
  };
}

function proj(
  elementId: number,
  gw: number,
  fixtures: PlayerGwProjection["fixtures"],
  opts: { blank?: boolean; xPts?: number } = {},
): PlayerGwProjection {
  const sum = fixtures.reduce((s, row) => s + row.matchXPts, 0);
  return {
    elementId,
    gameweek: gw,
    xPts: opts.xPts ?? sum,
    expectedMinutes: 80,
    p0: 0.1,
    p60: 0.8,
    p1: 0.9,
    isBlank: !!opts.blank,
    isDouble: fixtures.length > 1,
    fixtures: opts.blank ? [] : fixtures,
  };
}

function renderCard(opts: {
  themeId?: StatsLabChartThemeId;
  lang?: "pl" | "en";
  captain?: boolean;
  vice?: boolean;
  chip?: "3xc" | null;
  exporting?: boolean;
  player?: PlannerPlayerCatalogItem;
  byGw?: Record<number, PlayerGwProjection>;
  sell?: number;
  purchase?: number;
  now?: number;
  tileMetric?: "FIXTURES" | "PRICES" | "XPTS" | "FORM" | "DC";
}) {
  const player = opts.player ?? catalog(1, "Haaland", 4);
  const byGw = opts.byGw ?? {
    11: proj(1, 11, [fx("FUL", true, 3, 7.3)]),
    12: proj(1, 12, [fx("ARS", false, 4, 2)]),
    13: proj(1, 13, [fx("BRE", true, 2, 2)]),
    14: proj(1, 14, [fx("NEW", false, 2, 2)]),
  };
  return render(
    <PlannerPlayerCard
      themeId={opts.themeId ?? "ARENA_DARK"}
      lang={opts.lang ?? "pl"}
      isLight={(opts.themeId ?? "ARENA_DARK") === "ANALYST_LIGHT"}
      isExporting={!!opts.exporting}
      pick={pick(player.fpl_element_id, 9, {
        captain: opts.captain,
        vice: opts.vice,
        sell: opts.sell ?? 156,
        purchase: opts.purchase,
        now: opts.now,
      })}
      player={player}
      proj={byGw[11]}
      projectionsForElement={byGw}
      currentGw={11}
      tileMetric={opts.tileMetric ?? "FIXTURES"}
      activeChip={opts.chip ?? null}
      armbandKind={
        opts.captain ? (opts.chip === "3xc" ? "TC" : "C") : opts.vice ? "VC" : null
      }
      playerName={player.web_name}
      fullName={plannerDisplayFullName(player)}
      onSell={() => undefined}
      onSwap={() => undefined}
      onInfo={() => undefined}
      onOpenActions={() => undefined}
    />,
  );
}

function hexOf(className: string, kind: "bg" | "text"): string {
  const match = className.match(
    new RegExp(`${kind}-\\[(#[0-9a-fA-F]{3,6})\\]`),
  );
  if (!match?.[1]) throw new Error(`brak ${kind} w ${className}`);
  return match[1];
}

function ratio(fg: string, bg: string): number {
  const a = parseCssColorToRgba(fg);
  const b = parseCssColorToRgba(bg);
  if (!a || !b) throw new Error(`${fg} / ${bg}`);
  return computeWcagContrastRatio(a, b);
}

describe("U6 karta zawodnika", () => {
  it("pojedyncza GW: 1 pigułka i 3 kropki, xPts i cena w jednej linii", () => {
    renderCard({});
    const tile = screen.getByTestId("player-tile");
    const rows = within(tile).getAllByTestId("fixture-pills-row");
    expect(rows).toHaveLength(1);
    expect(within(rows[0]!).getAllByText(/^[A-Z]{3} \((D|W)\)$/)).toHaveLength(1);
    expect(within(rows[0]!).getByText("FUL (D)")).toBeTruthy();
    expect(within(tile).getAllByTestId("fdr-dot")).toHaveLength(3);
    const line = within(tile).getByTestId("card-data-line");
    expect(line.className).toMatch(/ppc-data/);
    expect(line.textContent).toContain("7.3");
    expect(line.textContent).toContain("xPts");
    expect(line.textContent).toContain("£15.6m");
    expect(line.textContent).not.toMatch(/NaN|undefined/);
  });

  it("DGW: dwie pigułki w jednym rzędzie i suma xPts", () => {
    renderCard({
      byGw: {
        11: proj(1, 11, [fx("ARS", true, 4, 3.4), fx("CHE", false, 4, 3.6)]),
        12: proj(1, 12, [fx("BRE", true, 3, 1)]),
        13: proj(1, 13, [fx("NEW", false, 2, 1)]),
        14: proj(1, 14, [], { blank: true }),
      },
    });
    const tile = screen.getByTestId("player-tile");
    const row = within(tile).getByTestId("fixture-pills-row");
    expect(row.getAttribute("data-dgw")).toBe("1");
    expect(row.className).toMatch(/nowrap/);
    expect(within(row).getByText("ARS (D)")).toBeTruthy();
    expect(within(row).getByText("CHE (W)")).toBeTruthy();
    expect(within(row).getAllByText(/^[A-Z]{3} \((D|W)\)$/)).toHaveLength(2);
    expect(within(tile).getByTestId("card-data-line").textContent).toContain("7.0");
    expect(cardDisplayedXPts(proj(1, 11, [fx("ARS", true, 4, 3.4), fx("CHE", false, 4, 3.6)]))).toBeCloseTo(7);
  });

  it("BGW: szara pigułka i 0.0 xPts, bez NaN", () => {
    renderCard({
      byGw: {
        11: proj(1, 11, [], { blank: true, xPts: Number.NaN }),
        12: proj(1, 12, [], { blank: true }),
        13: proj(1, 13, [], { blank: true }),
        14: proj(1, 14, [], { blank: true }),
      },
    });
    const tile = screen.getByTestId("player-tile");
    const pill = within(tile).getByText("—");
    expect(pill.getAttribute("data-kind")).toBe("none");
    expect(pill.className).toMatch(/bg-\[#334155\]/);
    expect(within(tile).getByTestId("card-data-line").textContent).toContain("0.0");
    expect(tile.textContent).not.toMatch(/NaN|undefined/);
  });

  it("EN używa (H)/(A), PL zostaje (D)/(W)", () => {
    renderCard({ lang: "en" });
    expect(screen.getByText("FUL (H)")).toBeTruthy();
    expect(screen.queryByText("FUL (D)")).toBeNull();
  });

  it("C, VC i TC są widoczne; długie nazwisko w aria-label jest pełne", () => {
    const { unmount } = renderCard({ captain: true });
    expect(screen.getByTestId("captain-armband").textContent).toBe("C");
    unmount();
    const vc = renderCard({ vice: true });
    expect(screen.getByTestId("captain-armband").textContent).toBe("VC");
    vc.unmount();
    const tc = renderCard({ captain: true, chip: "3xc" });
    expect(screen.getByTestId("captain-armband").textContent).toBe("TC");
    tc.unmount();

    const player = catalog(2, "Alexander-Arnold", 2, {
      first_name: "Trent",
      second_name: "Alexander-Arnold",
    });
    renderCard({ player });
    const name = screen.getByTestId("card-player-name");
    expect(name.textContent).toBe("Alexander-Arnold");
    expect(name.getAttribute("data-allow-ellipsis")).toBe("1");
    expect(name.className).toMatch(/ppc-name/);
    const tile = name.closest('[data-testid="player-tile"]') as HTMLElement;
    expect(tile.getAttribute("aria-label")).toContain("Trent Alexander-Arnold");
    expect(
      formatPlayerTileAccessibleName({
        lang: "pl",
        webName: "Alexander-Arnold",
        fullName: "Trent Alexander-Arnold",
        clubShort: "LIV",
      }),
    ).toBe("Trent Alexander-Arnold, LIV");
  });

  it("kontrast odznaki i tekstu tabliczki w Arena, Scout i Light", () => {
    for (const themeId of [
      "ARENA_DARK",
      "SCOUT_DARK",
      "ANALYST_LIGHT",
    ] as const) {
      const palette = plannerCardPalette(themeId);
      const plateBg = hexOf(palette.plate, "bg");
      for (const kind of ["C", "VC", "TC"] as const) {
        const view = renderCard({
          themeId,
          captain: kind !== "VC",
          vice: kind === "VC",
          chip: kind === "TC" ? "3xc" : null,
        });
        const badge = screen.getByTestId("captain-armband");
        const badgeRatio = ratio(hexOf(badge.className, "text"), hexOf(badge.className, "bg"));
        expect(badgeRatio, `${themeId} ${kind}`).toBeGreaterThanOrEqual(4.5);
        const name = screen.getByTestId("card-player-name");
        expect(
          ratio(hexOf(name.className, "text"), plateBg),
          `${themeId} name`,
        ).toBeGreaterThanOrEqual(4.5);
        const line = screen.getByTestId("card-data-line");
        const xp = line.querySelector(".ppc-xp") as HTMLElement;
        const price = line.querySelector(".ppc-price") as HTMLElement;
        expect(ratio(hexOf(xp.className, "text"), plateBg), `${themeId} xPts`).toBeGreaterThanOrEqual(4.5);
        expect(ratio(hexOf(price.className, "text"), plateBg), `${themeId} price`).toBeGreaterThanOrEqual(4.5);
        view.unmount();
      }
    }
  });

  it("koszulka bierze kolor klubu, a przy null paletę short_name", () => {
    const mci = renderCard({ player: catalog(1, "Haaland", 4) });
    const mciFill = mci.container
      .querySelector('[data-testid="club-shirt"]')
      ?.getAttribute("data-shirt-fill");
    expect(mciFill).toBe(getScatterClubColor("MCI"));
    mci.unmount();

    const ars = renderCard({
      player: catalog(2, "Saka", 3, { club_short_name: "ARS" }),
    });
    const arsFill = ars.container
      .querySelector('[data-testid="club-shirt"]')
      ?.getAttribute("data-shirt-fill");
    expect(arsFill).toBe(getScatterClubColor("ARS"));
    expect(arsFill).not.toBe(mciFill);
    ars.unmount();

    const custom = renderCard({
      player: catalog(3, "Palmer", 3, {
        club_short_name: "CHE",
        club_primary_color: "#123456",
      }),
    });
    expect(
      custom.container.querySelector('[data-testid="club-shirt"]')?.getAttribute("data-shirt-fill"),
    ).toBe("#123456");
  });

  it("ceny na wąskiej karcie mają krótki zapis i nie wylewają się na sąsiada", () => {
    renderCard({
      tileMetric: "PRICES",
      purchase: 65,
      now: 71,
      sell: 70,
    });
    const price = screen.getByTestId("card-data-line").querySelector(".ppc-price") as HTMLElement;
    expect(price.getAttribute("aria-label")).toBe("£6.5m/£7.1m/£7.0m");
    expect(price.querySelector(".ppc-prices-full")?.textContent).toBe("£6.5m/£7.1m/£7.0m");
    expect(price.querySelector(".ppc-prices-short")?.textContent).toBe("6.5/7.1/7.0");

    const css = fs.readFileSync(
      path.resolve(__dirname, "../plannerPlayerCard.css"),
      "utf8",
    );
    expect(css).toMatch(/\.ppc-data\s*\{[^}]*overflow:\s*hidden/);
    const compact = css.slice(css.indexOf("@container (max-width: 84px)"));
    expect(compact).toMatch(/\.ppc-act-sell,\s*\n\s*\.ppc-act-swap\s*\{[^}]*display:\s*none/);
    expect(compact).toMatch(/\.ppc-prices-full\s*\{[^}]*display:\s*none/);
    expect(compact).toMatch(/\.ppc-prices-short\s*\{[^}]*display:\s*inline/);
  });
});

function elementTypeForSlot(slot: number): 1 | 2 | 3 | 4 {
  if (slot === 1 || slot === 12) return 1;
  if (slot >= 2 && slot <= 5) return 2;
  if (slot >= 6 && slot <= 8) return 3;
  if (slot >= 9 && slot <= 11) return 4;
  return 3;
}

function renderPitch(opts: {
  omitSlot?: number;
  hideActions?: boolean;
  lang?: "pl" | "en";
} = {}) {
  const picks: ReconstructedSquadPick[] = [];
  const playersById = new Map<number, PlannerPlayerCatalogItem>();
  const projectionsByElement: Record<number, Record<number, PlayerGwProjection>> = {};
  for (let slot = 1; slot <= 15; slot++) {
    if (slot === opts.omitSlot) continue;
    picks.push(
      pick(slot, slot, { captain: slot === 9, vice: slot === 7, sell: 50 }),
    );
    const name =
      slot === 9
        ? "Haaland"
        : slot === 5
          ? "Alexander-Arnold"
          : `P${slot}`;
    playersById.set(
      slot,
      catalog(slot, name, elementTypeForSlot(slot), {
        first_name: slot === 5 ? "Trent" : name,
        second_name: slot === 5 ? "Alexander-Arnold" : name,
        club_short_name: "ARS",
      }),
    );
    projectionsByElement[slot] = {
      11: proj(slot, 11, [fx("FUL", true, 3, 4)]),
      12: proj(slot, 12, [fx("ARS", false, 4, 1)]),
      13: proj(slot, 13, [fx("BRE", true, 2, 1)]),
      14: proj(slot, 14, [fx("NEW", false, 2, 1)]),
    };
  }
  return render(
    <PlannerPitch
      themeId="ARENA_DARK"
      lang={opts.lang ?? "pl"}
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
      hideActionChrome={!!opts.hideActions}
    />,
  );
}

describe("U6 boisko, ławka, plakat, pusty slot, bank", () => {
  it("ławka i plakat używają tej samej karty; na plakacie nie ma akcji ani 3 pigułek obok siebie", () => {
    const live = renderPitch();
    const pitchTile = screen.getAllByTestId("player-tile")[0]!;
    const benchTile = screen.getByRole("group", { name: /P12/i });
    expect(pitchTile.getAttribute("data-card")).toBe("u6");
    expect(benchTile.getAttribute("data-card")).toBe("u6");
    expect(screen.getByText("BR")).toBeTruthy();
    expect(within(benchTile).getAllByTestId("fixture-pills-row")).toHaveLength(1);
    expect(within(benchTile).getAllByText(/^[A-Z]{3} \((D|W)\)$/)).toHaveLength(1);
    const line = document.querySelector('[data-testid="pitch-line"]') as HTMLElement;
    expect(line.style.gridTemplateColumns).toContain("minmax");
    live.unmount();

    renderPitch({ hideActions: true });
    expect(screen.queryAllByRole("button", { name: /Sprzedaj:/ })).toHaveLength(0);
    expect(screen.queryAllByRole("button", { name: /Zamień:/ })).toHaveLength(0);
    expect(screen.queryAllByRole("button", { name: /Informacje:/ })).toHaveLength(0);
    for (const tile of screen.getAllByTestId("player-tile")) {
      expect(tile.getAttribute("data-card")).toBe("u6");
      const rows = within(tile).getAllByTestId("fixture-pills-row");
      expect(rows).toHaveLength(1);
      expect(within(rows[0]!).getAllByText(/^[A-Z]{3} \((D|W)\)$/).length).toBeLessThan(3);
    }
  });

  it("pusty slot przy 14 zawodnikach nie pokazuje NaN ani undefined", () => {
    renderPitch({ omitSlot: 15 });
    const empty = screen.getByTestId("empty-slot");
    expect(empty.textContent).toContain("Wolne miejsce");
    expect(empty.textContent).not.toMatch(/NaN|undefined/);
    expect(empty.getAttribute("aria-label")).toMatch(/Dodaj zawodnika/);
  });

  it("ujemny bank: -£0.4m i brakuje, bez NaN", () => {
    expect(formatTenthsAsPounds(-4)).toBe("-£0.4m");
    expect(formatTenthsAsPounds(Number.NaN)).toBe("£0.0m");
    render(
      <PlannerHeaderAndControls
        themeId="ARENA_DARK"
        lang="pl"
        teamIdInput=""
        onTeamIdInputChange={() => undefined}
        onLoadTeam={() => undefined}
        onLoadDemo={() => undefined}
        activeVariant="A"
        onSelectVariant={() => undefined}
        onCopyVariantTo={() => undefined}
        draftSummaries={[]}
        planningStartGw={11}
        planningEndGw={12}
        currentGw={11}
        availableGameweeks={[11]}
        onSelectGw={() => undefined}
        freeTransfers={1}
        freeTransfersSource="api"
        hitsCostPts={0}
        bankTenths={-4}
        bankSource="api"
        grossXPts={70.4}
        netXPts={70.4}
        spendingPowerTenths={100}
        activeChip={null}
        usedChipsByType={{}}
        onToggleChip={() => undefined}
        tileMetric="FIXTURES"
        onTileMetricChange={() => undefined}
        onOptimiseXi={() => undefined}
        onUndo={() => undefined}
        onResetGw={() => undefined}
        onResetPlan={() => undefined}
      />,
    );
    expect(screen.getAllByText("-£0.4m").length).toBeGreaterThan(0);
    expect(screen.getByTestId("bank-shortfall").textContent).toBe("brakuje £0.4m");
    expect(document.body.textContent).not.toMatch(/NaN|undefined/);
  });

  it("groupPitchSlots zostawia pełną jedenastkę i dokłada pusty slot", () => {
    const full = groupPitchSlots(
      Array.from({ length: 11 }, (_, i) => ({
        slot: i + 1,
        elementType: elementTypeForSlot(i + 1),
      })),
    );
    expect([...full.gk, ...full.def, ...full.mid, ...full.fwd].sort((a, b) => a - b)).toEqual(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    );
    const missingFwd = groupPitchSlots([
      { slot: 1, elementType: 1 },
      { slot: 2, elementType: 2 },
      { slot: 9, elementType: 4 },
      { slot: 11, elementType: null },
    ]);
    expect(missingFwd.fwd).toContain(11);
  });
});
