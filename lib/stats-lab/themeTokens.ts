/**
 * Centralne tokeny UI Stats Lab — 3 motywy (Arena / Scout / Analyst).
 * Używaj klas Tailwind w kartach/stopkach; kolory hex z `chartTheme.ts`.
 */

import type { StatsLabChartThemeId } from "@/components/admin/stats-lab/chartTheme";
import type { StreakMetricKey } from "@/lib/stats-lab/i18n";

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
    input: "border-slate-700 bg-slate-950 text-white",
    text: "text-slate-100",
    textStrong: "text-white",
    textMuted: "text-slate-400",
    track: "bg-slate-800/90",
    missDot: "bg-slate-800 border-2 border-slate-600",
    hitRing: "ring-1 ring-white/50 shadow-sm",
    accentText: "text-[#39FF14]",
    accentSoft: "bg-[#39FF14]/15 text-[#39FF14]",
    tableBg: "bg-[#070B14]",
    heroBadge:
      "border border-[#39FF14]/45 bg-[#39FF14]/10 text-[#39FF14] font-black",
    rankText: "text-[#39FF14] font-black",
    isLight: false,
  },
  SCOUT_DARK: {
    id: "SCOUT_DARK",
    page: "bg-[#06181e]",
    pageBorder: "border-teal-900/70",
    card: "bg-[#0f313c]/95",
    cardBorder: "border-teal-800/70",
    tile: "bg-[#06181e]/90",
    tileBorder: "border-teal-900/80",
    panel: "bg-[#0b252e]/80",
    panelBorder: "border-teal-800/70",
    input: "border-teal-800/70 bg-[#06181e] text-white",
    text: "text-white",
    textStrong: "text-white",
    textMuted: "text-teal-100/80",
    track: "bg-teal-950/80",
    missDot: "bg-slate-800 border-2 border-slate-600",
    hitRing: "ring-1 ring-white/50 shadow-sm",
    accentText: "text-emerald-400",
    accentSoft: "bg-emerald-400/15 text-emerald-400",
    tableBg: "bg-[#06181e]",
    heroBadge:
      "border border-emerald-400/45 bg-emerald-400/10 text-emerald-300 font-black",
    rankText: "text-emerald-400 font-black",
    isLight: false,
  },
  ANALYST_LIGHT: {
    id: "ANALYST_LIGHT",
    page: "bg-slate-50",
    pageBorder: "border-slate-200",
    card: "bg-slate-100/90 border-2 border-slate-300 shadow-sm",
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
    accentText: "text-emerald-700",
    accentSoft: "bg-emerald-700/10 text-emerald-800",
    tableBg: "bg-white",
    heroBadge:
      "bg-emerald-700 text-white border border-emerald-800 font-black shadow-sm",
    rankText: "text-emerald-700 font-black",
    isLight: true,
  },
};

export function getThemeTokens(
  id: StatsLabChartThemeId,
): StatsLabThemeTokens {
  return STATS_LAB_THEME_TOKENS[id] ?? STATS_LAB_THEME_TOKENS.ARENA_DARK;
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
