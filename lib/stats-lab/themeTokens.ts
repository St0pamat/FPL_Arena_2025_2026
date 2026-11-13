/**
 * Centralne tokeny UI Stats Lab — 3 motywy (Arena / Scout / Analyst).
 * Hex w `STATS_LAB_THEME_HEX` = źródło prawdy pod kontrast WCAG (test U4).
 * Klasy Tailwind w `STATS_LAB_THEME_TOKENS` / `getPlannerActionChrome`.
 */

import type { StatsLabChartThemeId } from "@/components/admin/stats-lab/chartTheme";
import type { StreakMetricKey } from "@/lib/stats-lab/i18n";

/** Hex palette — jeden accent na motyw; złoto opaski = C pressed. */
export type StatsLabThemeHex = {
  page: string;
  panel: string;
  card: string;
  text: string;
  textMuted: string;
  accent: string;
  /** Tekst na tle akcentu (nav/activeBtn) — ciemny gdy biały nie przechodzi WCAG */
  accentOnText: string;
  /** Opaska C/TC + przycisk C pressed */
  gold: string;
  goldText: string;
  /** Tylko Light: obramowanie C pressed (≥5:1 vs biała karta) */
  goldBorder: string;
  vcPressedBg: string;
  vcPressedText: string;
  actionIcon: string;
  actionSell: string;
};

export const STATS_LAB_THEME_HEX: Record<
  StatsLabChartThemeId,
  StatsLabThemeHex
> = {
  ARENA_DARK: {
    page: "#070b14",
    panel: "#0c1322",
    card: "#0f172a",
    text: "#f1f5f9",
    textMuted: "#94a3b8",
    accent: "#39FF14",
    accentOnText: "#020617",
    gold: "#f59e0b",
    goldText: "#1c1917",
    goldBorder: "#f59e0b",
    vcPressedBg: "#e2e8f0",
    vcPressedText: "#0f172a",
    actionIcon: "#cbd5e1",
    actionSell: "#fb7185",
  },
  SCOUT_DARK: {
    page: "#0b1c2e",
    panel: "#122a3a",
    card: "#0f313c",
    text: "#f0fdfa",
    textMuted: "#94a3b8",
    accent: "#2dd4bf",
    accentOnText: "#020617",
    gold: "#f59e0b",
    goldText: "#1c1917",
    goldBorder: "#f59e0b",
    vcPressedBg: "#e2e8f0",
    vcPressedText: "#0f172a",
    actionIcon: "#cbd5e1",
    actionSell: "#fb7185",
  },
  ANALYST_LIGHT: {
    page: "#f8fafc",
    panel: "#ffffff",
    card: "#ffffff",
    text: "#0f172a",
    textMuted: "#475569",
    accent: "#0f766e",
    accentOnText: "#ffffff",
    gold: "#f59e0b",
    goldText: "#1c1917",
    goldBorder: "#b45309",
    vcPressedBg: "#1e293b",
    vcPressedText: "#ffffff",
    actionIcon: "#334155",
    actionSell: "#be123c",
  },
};

export type StatsLabThemeTokens = {
  id: StatsLabChartThemeId;
  /** Tło sekcji / shell */
  page: string;
  pageBorder: string;
  /** Powierzchnia karty zawodnika / panelu */
  card: string;
  cardBorder: string;
  tile: string;
  tileBorder: string;
  panel: string;
  panelBorder: string;
  input: string;
  text: string;
  textStrong: string;
  textMuted: string;
  track: string;
  missDot: string;
  hitRing: string;
  accentText: string;
  accentSoft: string;
  tableBg: string;
  heroBadge: string;
  rankText: string;
  isLight: boolean;
};

export const STATS_LAB_THEME_TOKENS: Record<
  StatsLabChartThemeId,
  StatsLabThemeTokens
> = {
  ARENA_DARK: {
    id: "ARENA_DARK",
    page: "bg-[#070b14]",
    pageBorder: "border-slate-800",
    card: "bg-slate-900/90",
    cardBorder: "border-slate-800/90",
    tile: "bg-slate-950/85",
    tileBorder: "border-slate-800/90",
    panel: "bg-slate-900/60",
    panelBorder: "border-slate-800",
    input: "border-slate-700 bg-slate-950 text-slate-100",
    text: "text-slate-100",
    textStrong: "text-slate-50",
    textMuted: "text-slate-400",
    track: "bg-slate-800/90",
    missDot: "bg-slate-800 border-2 border-slate-600",
    hitRing: "ring-1 ring-white/50 shadow-sm",
    accentText: "text-[#39FF14]",
    accentSoft: "bg-[#39FF14]/15 text-[#39FF14]",
    tableBg: "bg-[#070b14]",
    heroBadge:
      "border border-[#39FF14]/45 bg-[#39FF14]/10 text-[#39FF14] font-black",
    rankText: "text-[#39FF14] font-black",
    isLight: false,
  },
  SCOUT_DARK: {
    id: "SCOUT_DARK",
    page: "bg-[#0b1c2e]",
    pageBorder: "border-teal-900/70",
    card: "bg-[#0f313c]/95",
    cardBorder: "border-teal-800/70",
    tile: "bg-[#0b1c2e]/90",
    tileBorder: "border-teal-900/80",
    panel: "bg-[#122a3a]/90",
    panelBorder: "border-teal-800/70",
    input: "border-teal-800/70 bg-[#0b1c2e] text-[#f0fdfa]",
    text: "text-[#f0fdfa]",
    textStrong: "text-[#f0fdfa]",
    textMuted: "text-[#94a3b8]",
    track: "bg-slate-800/80",
    missDot: "bg-slate-800 border-2 border-slate-600",
    hitRing: "ring-1 ring-white/50 shadow-sm",
    accentText: "text-[#2dd4bf]",
    accentSoft: "bg-[#2dd4bf]/15 text-[#2dd4bf]",
    tableBg: "bg-[#0b1c2e]",
    heroBadge:
      "border border-[#2dd4bf]/45 bg-[#2dd4bf]/10 text-[#2dd4bf] font-black",
    rankText: "text-[#2dd4bf] font-black",
    isLight: false,
  },
  ANALYST_LIGHT: {
    id: "ANALYST_LIGHT",
    page: "bg-[#f8fafc]",
    pageBorder: "border-slate-200",
    card: "bg-white border-2 border-slate-300 shadow-sm",
    cardBorder: "border-slate-300",
    tile: "bg-white border border-slate-300 shadow-sm",
    tileBorder: "border-slate-300",
    panel: "bg-white",
    panelBorder: "border-slate-200",
    input: "border-slate-300 bg-white text-slate-900",
    text: "text-slate-900",
    textStrong: "text-slate-950",
    textMuted: "text-slate-600",
    track: "bg-slate-200 border border-slate-300/80",
    missDot: "bg-slate-300 border border-slate-400",
    hitRing: "ring-1 ring-slate-900/20 shadow-sm",
    accentText: "text-[#0f766e]",
    accentSoft: "bg-[#0f766e]/10 text-[#0f766e]",
    tableBg: "bg-white",
    heroBadge:
      "bg-[#0f766e] text-white border border-[#0f766e] font-black shadow-sm",
    rankText: "text-[#0f766e] font-black",
    isLight: true,
  },
};

export function getThemeTokens(
  id: StatsLabChartThemeId,
): StatsLabThemeTokens {
  return STATS_LAB_THEME_TOKENS[id] ?? STATS_LAB_THEME_TOKENS.ARENA_DARK;
}

export function getThemeHex(id: StatsLabChartThemeId): StatsLabThemeHex {
  return STATS_LAB_THEME_HEX[id] ?? STATS_LAB_THEME_HEX.ARENA_DARK;
}

/** Klasy przycisków akcji karty zawodnika (C/VC/✕/⇄/☆/ⓘ) + opaska. */
export type PlannerActionChrome = {
  sell: string;
  swap: string;
  swapSelected: string;
  captainIdle: string;
  captainPressed: string;
  viceIdle: string;
  vicePressed: string;
  watchIdle: string;
  watchActive: string;
  info: string;
  armband: string;
};

export function getPlannerActionChrome(
  themeId: StatsLabChartThemeId,
): PlannerActionChrome {
  // Pełne literały klas — Tailwind JIT nie widzi `text-[${var}]`.
  if (themeId === "ANALYST_LIGHT") {
    return {
      sell: "bg-rose-500/15 text-[#be123c] hover:bg-rose-500/25",
      swap: "bg-slate-500/10 text-[#334155] hover:bg-slate-500/20",
      swapSelected: "bg-sky-500/20 text-sky-800",
      captainIdle: "border border-[#b45309]/60 bg-transparent text-[#b45309]",
      captainPressed:
        "border border-[#b45309] bg-[#f59e0b] text-[#1c1917]",
      viceIdle: "border border-slate-400 bg-transparent text-[#334155]",
      vicePressed: "border border-slate-700 bg-[#1e293b] text-white",
      watchIdle: "text-[#334155]",
      watchActive: "text-[#f59e0b]",
      info: "text-[#334155] hover:bg-slate-500/10",
      armband: "bg-[#f59e0b] text-[#1c1917]",
    };
  }
  // ARENA + SCOUT — wspólne C/VC pressed (złoto / jasny neutral)
  return {
    sell: "bg-rose-500/20 text-[#fb7185] hover:bg-rose-500/30",
    swap: "bg-slate-500/20 text-[#cbd5e1] hover:bg-slate-500/30",
    swapSelected: "bg-sky-500/30 text-sky-100",
    captainIdle: "border border-[#f59e0b]/50 bg-transparent text-[#f59e0b]",
    captainPressed: "border border-[#f59e0b] bg-[#f59e0b] text-[#1c1917]",
    viceIdle: "border border-slate-400/50 bg-transparent text-[#cbd5e1]",
    vicePressed: "border border-slate-300 bg-[#e2e8f0] text-[#0f172a]",
    watchIdle: "text-[#cbd5e1]",
    watchActive: "text-[#f59e0b]",
    info: "text-[#cbd5e1] hover:bg-slate-500/20",
    armband: "bg-[#f59e0b] text-[#1c1917]",
  };
}

/** Kolory przypięte do klucza serii — NIGDY po indeksie pętli. */
export type StreakMetricStyle = {
  /** Lewy border, pasek, kropka w legendzie, kropka hit */
  accent: string;
  pillBg: string;
  pillText: string;
};

export const STREAK_METRIC_STYLES: Record<
  StreakMetricKey,
  { dark: StreakMetricStyle; light: StreakMetricStyle }
> = {
  maxReturnStreak: {
    dark: { accent: "#a3e635", pillBg: "#a3e635", pillText: "#020617" },
    light: { accent: "#059669", pillBg: "#059669", pillText: "#ffffff" },
  },
  currentReturnStreak: {
    dark: { accent: "#22d3ee", pillBg: "#22d3ee", pillText: "#020617" },
    light: { accent: "#0284c7", pillBg: "#0284c7", pillText: "#ffffff" },
  },
  maxGoalOrAssistStreak: {
    dark: { accent: "#a78bfa", pillBg: "#a78bfa", pillText: "#020617" },
    light: { accent: "#7c3aed", pillBg: "#7c3aed", pillText: "#ffffff" },
  },
  maxGoalStreak: {
    dark: { accent: "#fbbf24", pillBg: "#fbbf24", pillText: "#020617" },
    light: { accent: "#f59e0b", pillBg: "#f59e0b", pillText: "#020617" },
  },
  maxAssistStreak: {
    dark: { accent: "#fb923c", pillBg: "#fb923c", pillText: "#020617" },
    light: { accent: "#ea580c", pillBg: "#ea580c", pillText: "#ffffff" },
  },
  maxCleanSheetStreak: {
    dark: { accent: "#fb7185", pillBg: "#fb7185", pillText: "#020617" },
    light: { accent: "#e11d48", pillBg: "#e11d48", pillText: "#ffffff" },
  },
  maxDcPointsStreak: {
    dark: { accent: "#2dd4bf", pillBg: "#2dd4bf", pillText: "#020617" },
    light: { accent: "#0d9488", pillBg: "#0d9488", pillText: "#ffffff" },
  },
  max60MinStreak: {
    dark: { accent: "#818cf8", pillBg: "#818cf8", pillText: "#020617" },
    light: { accent: "#2563eb", pillBg: "#2563eb", pillText: "#ffffff" },
  },
  maxSavesPointStreak: {
    dark: { accent: "#38bdf8", pillBg: "#38bdf8", pillText: "#020617" },
    light: { accent: "#0284c7", pillBg: "#0284c7", pillText: "#ffffff" },
  },
  maxBonusStreak: {
    dark: { accent: "#f59e0b", pillBg: "#f59e0b", pillText: "#020617" },
    light: { accent: "#d97706", pillBg: "#d97706", pillText: "#ffffff" },
  },
  returnConsistencyPct: {
    dark: { accent: "#84cc16", pillBg: "#84cc16", pillText: "#020617" },
    light: { accent: "#047857", pillBg: "#047857", pillText: "#ffffff" },
  },
};

export function getStreakMetricStyle(
  key: StreakMetricKey,
  isLight: boolean,
): StreakMetricStyle {
  const pair = STREAK_METRIC_STYLES[key];
  return isLight ? pair.light : pair.dark;
}
