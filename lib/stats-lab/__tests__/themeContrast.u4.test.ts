import { describe, expect, it } from "vitest";
import {
  computeWcagContrastRatio,
  parseCssColorToRgba,
} from "@/lib/stats-lab/auditExport";
import {
  STATS_LAB_THEME_HEX,
  type StatsLabThemeHex,
} from "@/lib/stats-lab/themeTokens";
import { STATS_LAB_CHART_THEMES } from "@/components/admin/stats-lab/chartTheme";
import type { StatsLabChartThemeId } from "@/components/admin/stats-lab/chartTheme";

function hex(s: string): { r: number; g: number; b: number } {
  const p = parseCssColorToRgba(s);
  if (!p) throw new Error(`bad color ${s}`);
  return { r: p.r, g: p.g, b: p.b };
}

function ratio(fg: string, bg: string): number {
  return computeWcagContrastRatio(hex(fg), hex(bg));
}

type ContrastPair = {
  id: string;
  theme: StatsLabChartThemeId;
  fg: keyof StatsLabThemeHex | string;
  bg: keyof StatsLabThemeHex | string;
  min: number;
  /** jawnie wyliczony współczynnik (nie zaokrąglony w górę) */
  expected: number;
};

/**
 * Lista par tokenów — kontrast z STATS_LAB_THEME_HEX.
 * expected = computeWcagContrastRatio na tych hexach (zsynchronizowane w teście).
 */
const PAIRS: ContrastPair[] = [
  // ARENA
  { id: "arena text/page", theme: "ARENA_DARK", fg: "text", bg: "page", min: 4.5, expected: 17.97 },
  { id: "arena accent/page", theme: "ARENA_DARK", fg: "accent", bg: "page", min: 3, expected: 14.52 },
  { id: "arena muted/page", theme: "ARENA_DARK", fg: "textMuted", bg: "page", min: 4.5, expected: 7.68 },
  { id: "arena onAccent/accent", theme: "ARENA_DARK", fg: "accentOnText", bg: "accent", min: 4.5, expected: 14.88 },
  { id: "arena gold/page", theme: "ARENA_DARK", fg: "gold", bg: "page", min: 3, expected: 9.16 },
  { id: "arena C text/gold", theme: "ARENA_DARK", fg: "goldText", bg: "gold", min: 4.5, expected: 8.14 },
  { id: "arena VC text/bg", theme: "ARENA_DARK", fg: "vcPressedText", bg: "vcPressedBg", min: 4.5, expected: 14.48 },
  { id: "arena sell/page", theme: "ARENA_DARK", fg: "actionSell", bg: "page", min: 3, expected: 7.31 },
  { id: "arena icon/page", theme: "ARENA_DARK", fg: "actionIcon", bg: "page", min: 3, expected: 13.26 },
  // SCOUT
  { id: "scout text/page", theme: "SCOUT_DARK", fg: "text", bg: "page", min: 4.5, expected: 16.51 },
  { id: "scout text/panel", theme: "SCOUT_DARK", fg: "text", bg: "panel", min: 4.5, expected: 14.2 },
  { id: "scout muted/page", theme: "SCOUT_DARK", fg: "textMuted", bg: "page", min: 4.5, expected: 6.71 },
  { id: "scout muted/panel", theme: "SCOUT_DARK", fg: "textMuted", bg: "panel", min: 4.5, expected: 5.78 },
  { id: "scout accent/page", theme: "SCOUT_DARK", fg: "accent", bg: "page", min: 3, expected: 9.25 },
  { id: "scout accent/panel", theme: "SCOUT_DARK", fg: "accent", bg: "panel", min: 3, expected: 7.96 },
  { id: "scout onAccent/accent", theme: "SCOUT_DARK", fg: "accentOnText", bg: "accent", min: 4.5, expected: 10.84 },
  // Złoto Scout osobno vs page #0b1c2e i panel #122a3a (nie „jak Arena”)
  { id: "scout gold/page", theme: "SCOUT_DARK", fg: "gold", bg: "page", min: 3, expected: 8.02 },
  { id: "scout gold/panel", theme: "SCOUT_DARK", fg: "gold", bg: "panel", min: 3, expected: 6.9 },
  { id: "scout C text/gold", theme: "SCOUT_DARK", fg: "goldText", bg: "gold", min: 4.5, expected: 8.14 },
  { id: "scout VC text/bg", theme: "SCOUT_DARK", fg: "vcPressedText", bg: "vcPressedBg", min: 4.5, expected: 14.48 },
  // LIGHT
  { id: "light text/page", theme: "ANALYST_LIGHT", fg: "text", bg: "page", min: 4.5, expected: 17.06 },
  { id: "light text/white", theme: "ANALYST_LIGHT", fg: "text", bg: "card", min: 4.5, expected: 17.85 },
  { id: "light accent/page", theme: "ANALYST_LIGHT", fg: "accent", bg: "page", min: 3, expected: 5.23 },
  { id: "light accent/white", theme: "ANALYST_LIGHT", fg: "accent", bg: "card", min: 3, expected: 5.47 },
  { id: "light onAccent/accent", theme: "ANALYST_LIGHT", fg: "accentOnText", bg: "accent", min: 4.5, expected: 5.47 },
  { id: "light muted/page", theme: "ANALYST_LIGHT", fg: "textMuted", bg: "page", min: 4.5, expected: 7.24 },
  { id: "light C border/white", theme: "ANALYST_LIGHT", fg: "goldBorder", bg: "card", min: 3, expected: 5.02 },
  { id: "light C text/gold", theme: "ANALYST_LIGHT", fg: "goldText", bg: "gold", min: 4.5, expected: 8.14 },
  { id: "light VC text/bg", theme: "ANALYST_LIGHT", fg: "vcPressedText", bg: "vcPressedBg", min: 4.5, expected: 14.63 },
  { id: "light action/white", theme: "ANALYST_LIGHT", fg: "actionIcon", bg: "card", min: 4.5, expected: 10.35 },
  { id: "light sell/white", theme: "ANALYST_LIGHT", fg: "actionSell", bg: "card", min: 4.5, expected: 6.29 },
];

const REQUIRED_HEX_KEYS: (keyof StatsLabThemeHex)[] = [
  "page",
  "panel",
  "card",
  "text",
  "textMuted",
  "accent",
  "accentOnText",
  "gold",
  "goldText",
  "goldBorder",
  "vcPressedBg",
  "vcPressedText",
  "actionIcon",
  "actionSell",
];

function resolve(
  theme: StatsLabChartThemeId,
  key: keyof StatsLabThemeHex | string,
): string {
  const h = STATS_LAB_THEME_HEX[theme];
  if (key in h) return h[key as keyof StatsLabThemeHex];
  return key;
}

describe("U4/U4b theme contrast (WCAG from token hex)", () => {
  it("chartTheme.accent matches STATS_LAB_THEME_HEX.accent per theme", () => {
    for (const id of Object.keys(STATS_LAB_THEME_HEX) as StatsLabChartThemeId[]) {
      expect(STATS_LAB_CHART_THEMES[id].accent.toLowerCase()).toBe(
        STATS_LAB_THEME_HEX[id].accent.toLowerCase(),
      );
    }
  });

  it("każdy motyw ma komplet tokenów z listy par / REQUIRED_HEX_KEYS", () => {
    const themes = Object.keys(STATS_LAB_THEME_HEX) as StatsLabChartThemeId[];
    expect(themes).toEqual(["ARENA_DARK", "SCOUT_DARK", "ANALYST_LIGHT"]);
    for (const theme of themes) {
      const h = STATS_LAB_THEME_HEX[theme];
      for (const key of REQUIRED_HEX_KEYS) {
        expect(h[key], `${theme}.${key}`).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
      const keysFromPairs = new Set(
        PAIRS.filter((p) => p.theme === theme).flatMap((p) => [p.fg, p.bg]),
      );
      for (const k of keysFromPairs) {
        if (typeof k === "string" && k.startsWith("#")) continue;
        expect(h[k as keyof StatsLabThemeHex], `${theme} pair key ${k}`).toBeTruthy();
      }
    }
  });

  it("each listed token pair meets min ratio and matches expected (real) contrast", () => {
    for (const pair of PAIRS) {
      const fg = resolve(pair.theme, pair.fg);
      const bg = resolve(pair.theme, pair.bg);
      const actual = ratio(fg, bg);
      expect(Number.isFinite(actual), `${pair.id} finite`).toBe(true);
      expect(actual, pair.id).toBeGreaterThanOrEqual(pair.min);
      expect(actual, `${pair.id} expected`).toBe(pair.expected);
    }
  });

  it("biały na Scout accent nie przechodzi; accentOnText przechodzi we wszystkich motywach", () => {
    const whiteOnScout = ratio("#ffffff", STATS_LAB_THEME_HEX.SCOUT_DARK.accent);
    expect(Number.isFinite(whiteOnScout)).toBe(true);
    expect(whiteOnScout).toBe(1.86);
    expect(whiteOnScout).toBeLessThan(3);

    for (const theme of Object.keys(STATS_LAB_THEME_HEX) as StatsLabChartThemeId[]) {
      const h = STATS_LAB_THEME_HEX[theme];
      const r = ratio(h.accentOnText, h.accent);
      expect(Number.isFinite(r), theme).toBe(true);
      expect(r, theme).toBeGreaterThanOrEqual(4.5);
    }
  });
});
