/** @vitest-environment jsdom */
/**
 * U5c: motyw Light. Test U4 liczył tylko pary tokenów STATS_LAB_THEME_HEX.
 * Aktywny przycisk Light ma text-white + bg-[#0f766e], a ta para tokenów
 * przechodzi 4.5:1 — ale klasa tła żyje w lib/, którego Tailwind nie skanował,
 * więc w CSS zostawał sam text-white na białym panelu.
 */
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import tailwindConfig from "../../../tailwind.config.js";
import {
  computeWcagContrastRatio,
  parseCssColorToRgba,
} from "@/lib/stats-lab/auditExport";
import { StatsLabModuleShell } from "@/components/admin/stats-lab/StatsLabModuleShell";
import { PlannerHeaderAndControls } from "@/components/admin/stats-lab/planner/PlannerHeaderAndControls";
import { createDefaultStatsLabFilter } from "@/lib/stats-lab/presets";
import { pt } from "@/lib/stats-lab/plannerI18n";
import type { StatsLabBootstrapData } from "@/lib/stats-lab/analyticsEngine";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/stats-lab",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("tab=planner"),
}));

vi.mock("@/app/admin/actions/statsLabPlanner", () => ({
  queryStatsLabPlannerAction: vi.fn(() => new Promise(() => {})),
}));

const ROOT = path.resolve(__dirname, "../../..");
const MIN_RATIO = 4.5;

const TW_COLOR: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  "slate-50": "#f8fafc",
  "slate-100": "#f1f5f9",
  "slate-200": "#e2e8f0",
  "slate-300": "#cbd5e1",
  "slate-400": "#94a3b8",
  "slate-500": "#64748b",
  "slate-600": "#475569",
  "slate-700": "#334155",
  "slate-800": "#1e293b",
  "slate-900": "#0f172a",
  "slate-950": "#020617",
  "teal-300": "#5eead4",
  "teal-700": "#0f766e",
  "teal-800": "#115e59",
  "teal-900": "#134e4a",
};

const TEXT_COLOR =
  /^(?:hover:)?text-(?:white|black|slate-\d{2,3}|teal-\d{3}|\[#[0-9a-fA-F]{6}\])$/;
const BG_COLOR =
  /^(?:hover:)?bg-(?:white|black|slate-\d{2,3}|teal-\d{3}|\[#[0-9a-fA-F]{6}\])$/;

let scannedCorpus = "";

function walkProductionFiles(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      ent.name === "node_modules" ||
      ent.name === ".next" ||
      ent.name === "dist" ||
      ent.name === "coverage" ||
      ent.name === "__tests__"
    ) {
      continue;
    }
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkProductionFiles(abs, out);
      continue;
    }
    if (/\.(test|spec)\.[jt]sx?$/.test(ent.name)) continue;
    if (/\.(js|ts|jsx|tsx|mdx|html)$/.test(ent.name)) out.push(abs);
  }
}

function productionFilesFromTailwind(): string[] {
  const patterns = (tailwindConfig as { content: string[] }).content;
  const files: string[] = [];
  for (const pattern of patterns) {
    const rootRel = pattern.split("/**")[0].replace(/^\.\//, "");
    const abs = path.join(ROOT, rootRel);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      files.push(abs);
      continue;
    }
    walkProductionFiles(abs, files);
  }
  return files;
}

function hasExactClass(corpus: string, cls: string): boolean {
  const esc = cls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?:^|[^A-Za-z0-9_-])${esc}(?![A-Za-z0-9_\\-/])`);
  return re.test(corpus);
}

function colorOf(token: string): string {
  const bare = token.replace(/^(?:hover:)?(?:text|bg)-/, "");
  const arb = bare.match(/^\[(#[0-9a-fA-F]{6})\]$/);
  if (arb) return arb[1]!.toLowerCase();
  const hex = TW_COLOR[bare];
  if (!hex) throw new Error(`nieznany kolor klasy ${token}`);
  return hex;
}

function pickColor(className: string, kind: "text" | "bg", hover: boolean): string | null {
  const re = kind === "text" ? TEXT_COLOR : BG_COLOR;
  let found: string | null = null;
  for (const token of className.split(/\s+/)) {
    if (!token) continue;
    const isHover = token.startsWith("hover:");
    if (isHover !== hover) continue;
    if (re.test(token)) found = token;
  }
  return found;
}

function classNameOf(el: Element): string {
  return el.getAttribute("class") ?? "";
}

function resolvePair(
  el: HTMLElement,
  hover: boolean,
): { fgToken: string; bgToken: string; fg: string; bg: string } {
  let fg = pickColor(classNameOf(el), "text", false);
  let bg = pickColor(classNameOf(el), "bg", false);
  const hoverFg = pickColor(classNameOf(el), "text", true);
  const hoverBg = pickColor(classNameOf(el), "bg", true);
  let node: HTMLElement | null = el.parentElement;
  while (node && (!fg || !bg)) {
    if (!fg) fg = pickColor(classNameOf(node), "text", false);
    if (!bg) bg = pickColor(classNameOf(node), "bg", false);
    node = node.parentElement;
  }
  const fgToken = hover ? hoverFg ?? fg : fg;
  const bgToken = hover ? hoverBg ?? bg : bg;
  if (!fgToken || !bgToken) {
    throw new Error(
      `brak koloru (${hover ? "hover" : "base"}) na „${el.textContent?.trim().slice(0, 40)}” class=${classNameOf(el)}`,
    );
  }
  return {
    fgToken,
    bgToken,
    fg: colorOf(fgToken),
    bg: colorOf(bgToken),
  };
}

function ratio(fg: string, bg: string): number {
  const a = parseCssColorToRgba(fg);
  const b = parseCssColorToRgba(bg);
  if (!a || !b) throw new Error(`zły kolor ${fg} / ${bg}`);
  return computeWcagContrastRatio(a, b);
}

function assertControl(el: HTMLElement, name: string): void {
  for (const hover of [false, true]) {
    const pair = resolvePair(el, hover);
    const value = ratio(pair.fg, pair.bg);
    expect(
      value,
      `${name} ${hover ? "hover" : "zwykły/aktywny"} ${pair.fgToken} na ${pair.bgToken} = ${value}`,
    ).toBeGreaterThanOrEqual(MIN_RATIO);
    for (const token of [pair.fgToken, pair.bgToken]) {
      expect(
        hasExactClass(scannedCorpus, token),
        `${name}: klasa ${token} nie występuje w plikach skanowanych przez Tailwind (content)`,
      ).toBe(true);
    }
    const ownHoverBg = pickColor(classNameOf(el), "bg", true);
    const ownHoverFg = pickColor(classNameOf(el), "text", true);
    if (ownHoverBg) {
      expect(hasExactClass(scannedCorpus, ownHoverBg), ownHoverBg).toBe(true);
    }
    if (ownHoverFg) {
      expect(hasExactClass(scannedCorpus, ownHoverFg), ownHoverFg).toBe(true);
    }
  }
}

const bootstrap: StatsLabBootstrapData = {
  seasonCode: "2026/27",
  meta: null,
  clubs: [],
  players: [],
  maxGw: 1,
};

function renderHeader() {
  render(
    <PlannerHeaderAndControls
      themeId="ANALYST_LIGHT"
      lang="pl"
      teamIdInput=""
      onTeamIdInputChange={() => undefined}
      onLoadTeam={() => undefined}
      onLoadDemo={() => undefined}
      activeVariant="A"
      onSelectVariant={() => undefined}
      onCopyVariantTo={() => undefined}
      draftSummaries={["A", "B", "C"].map((variant) => ({
        variant: variant as "A" | "B" | "C",
        xPtsNextGw: 10,
        xPtsHorizonSum: 10,
        xPtsHorizonNet: 10,
        ftNextGw: 1,
        ftEndOfPlan: 1,
        totalHitPts: 0,
        finalBankTenths: 10,
        chipsByGw: {},
      }))}
      planningStartGw={11}
      planningEndGw={12}
      currentGw={11}
      availableGameweeks={[10, 11]}
      onSelectGw={() => undefined}
      freeTransfers={1}
      freeTransfersSource="api"
      hitsCostPts={0}
      bankTenths={10}
      bankSource="api"
      grossXPts={10}
      netXPts={10}
      spendingPowerTenths={10}
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
}

describe("U5c Light: kontrast prawdziwych kontrolek", () => {
  beforeAll(() => {
    const files = productionFilesFromTailwind();
    expect(files.length).toBeGreaterThan(20);
    scannedCorpus = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("tailwind content obejmuje lib/ — inaczej tło aktywnego Light nie wchodzi do CSS", () => {
    const content = (tailwindConfig as { content: string[] }).content.join("\n");
    expect(content).toMatch(/\.\/lib\//);
  });

  it("zakładki, język, motyw i tytuł w Light: zwykły, hover i aktywny ≥ 4.5", async () => {
    localStorage.setItem("fpl-arena-stats-lab-theme", "ANALYST_LIGHT");
    localStorage.setItem("fpl-arena-stats-lab-lang", "pl");
    render(
      <StatsLabModuleShell
        bootstrap={bootstrap}
        initialResult={null}
        initialFilter={createDefaultStatsLabFilter("2026/27")}
        initialTab="planner"
      />,
    );

    await waitFor(() => {
      expect(
        document.querySelector("[data-stats-lab-shell-root]")?.getAttribute(
          "data-stats-lab-theme",
        ),
      ).toBe("ANALYST_LIGHT");
    });

    const root = document.querySelector("[data-stats-lab-shell-root]") as HTMLElement;
    const title = root.querySelector("h1") as HTMLElement;
    expect(title.textContent).toMatch(/Planer/);
    assertControl(title, "tytuł Planer FPL");

    const eyebrow = root.querySelector("header p") as HTMLElement;
    assertControl(eyebrow, "nagłówek FPL Arena · Stats Lab");

    const activeTab = root.querySelector(
      '[data-stats-lab-nav-tab="planner"]',
    ) as HTMLElement;
    const idleTab = root.querySelector(
      '[data-stats-lab-nav-tab="centre"]',
    ) as HTMLElement;
    expect(activeTab.getAttribute("data-active")).toBe("true");
    expect(idleTab.getAttribute("data-active")).toBe("false");
    assertControl(activeTab, "zakładka Planer (aktywna)");
    assertControl(idleTab, "zakładka Statystyki (zwykła)");

    const langGroup = root.querySelector('[aria-label="Zmień język"]') as HTMLElement;
    assertControl(
      within(langGroup).getByRole("button", { name: /PL/ }),
      "język PL (aktywny)",
    );
    assertControl(
      within(langGroup).getByRole("button", { name: /EN/ }),
      "język EN (zwykły)",
    );

    const themeGroup = root.querySelector(
      '[aria-label="Zmień motyw"]',
    ) as HTMLElement;
    assertControl(
      within(themeGroup).getByRole("button", { name: "Light" }),
      "motyw Light (aktywny)",
    );
    assertControl(
      within(themeGroup).getByRole("button", { name: "Arena" }),
      "motyw Arena (zwykły)",
    );
  });

  it("Wczytaj, wariant A i chip GW w Light: zwykły, hover i aktywny ≥ 4.5", () => {
    renderHeader();
    assertControl(
      screen.getByRole("button", { name: pt("pl", "planner.loadSquad") }),
      "Wczytaj",
    );
    assertControl(
      screen.getByRole("button", { name: "Wariant A" }),
      "wariant A (aktywny)",
    );
    assertControl(
      screen.getByRole("button", { name: "Wariant B" }),
      "wariant B (zwykły)",
    );
    assertControl(screen.getByRole("button", { name: "GW11" }), "chip GW11 (aktywny)");
    assertControl(screen.getByRole("button", { name: "GW10" }), "chip GW10 (zwykły)");
  });
});
