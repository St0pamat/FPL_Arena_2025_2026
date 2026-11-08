import type { FplStatKey } from "@/lib/stats-lab/types";
import { getFplStatDefinition } from "@/lib/stats-lab/types";
import type { StatsLabLang } from "@/lib/stats-lab/i18n";

export type StatsLabChartThemeId = "ARENA_DARK" | "SCOUT_DARK" | "ANALYST_LIGHT";

export type StatsLabVizMode =
  | "STACKED_COMPOSITE"
  | "POINTS_BREAKDOWN"
  | "STREAKS_EXPLORER"
  | "RADAR_PIZZA"
  | "SCATTER_2D"
  | "HEATMAP_MATRIX";

export type StatsLabChartTheme = {
  id: StatsLabChartThemeId;
  labelPl: string;
  labelEn: string;
  canvasBg: string;
  panelBg: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  gold: string;
  grid: string;
  avgLine: string;
  tooltipBg: string;
};

export const STATS_LAB_CHART_THEMES: Record<
  StatsLabChartThemeId,
  StatsLabChartTheme
> = {
  ARENA_DARK: {
    id: "ARENA_DARK",
    labelPl: "Arena Dark",
    labelEn: "Arena Dark",
    canvasBg: "#070b14",
    panelBg: "#0f172a",
    text: "#ffffff",
    muted: "#cbd5e1",
    border: "#1e293b",
    accent: "#39FF14",
    gold: "#fbbf24",
    grid: "#1e293b",
    avgLine: "#64748b",
    tooltipBg: "rgba(2,6,23,0.96)",
  },
  SCOUT_DARK: {
    id: "SCOUT_DARK",
    labelPl: "Scout Dark",
    labelEn: "Scout Dark",
    canvasBg: "#06181e",
    panelBg: "#0b252e",
    text: "#ffffff",
    muted: "#99f6e4",
    border: "#115e59",
    accent: "#00ff87",
    gold: "#f59e0b",
    grid: "#0f313c",
    avgLine: "#2dd4bf",
    tooltipBg: "rgba(6,24,30,0.96)",
  },
  ANALYST_LIGHT: {
    id: "ANALYST_LIGHT",
    labelPl: "Analyst Light",
    labelEn: "Analyst Light",
    canvasBg: "#f8fafc",
    panelBg: "#ffffff",
    text: "#0f172a",
    muted: "#475569",
    border: "#e2e8f0",
    accent: "#047857",
    gold: "#b45309",
    grid: "#e2e8f0",
    avgLine: "#94a3b8",
    tooltipBg: "rgba(255,255,255,0.98)",
  },
};

/** Stała paleta segmentów metryk (kolejność = activeMetrics). */
export const METRIC_SEGMENT_COLORS = [
  "#39FF14",
  "#38bdf8",
  "#a78bfa",
  "#fbbf24",
  "#fb7185",
  "#2dd4bf",
  "#60a5fa",
  "#f97316",
] as const;

export const POINTS_POS_COLORS: Record<string, string> = {
  appearancePts: "#cbd5e1",
  /** slate-300 — 1+ min (ciemny tekst) */
  appearanceBasePts: "#cbd5e1",
  /** slate-600 — 60+ min (biały tekst) */
  sixtyPlusPts: "#475569",
  /** lime-400 */
  goalPts: "#a3e635",
  /** sky-400 */
  assistPts: "#38bdf8",
  /** violet-500 */
  cleanSheetPts: "#8b5cf6",
  /** teal-400 */
  dcPts: "#2dd4bf",
  /** blue-500 */
  savePts: "#3b82f6",
  /** amber-400 */
  penaltySavePts: "#fbbf24",
  /** orange-500 */
  bonusPts: "#f97316",
};

export const POINTS_NEG_COLORS: Record<string, string> = {
  /** rose-500 — biały tekst */
  goalsConcededDeduction: "#f43f5e",
  /** amber-400 — ciemny tekst */
  yellowCardDeduction: "#fbbf24",
  redCardDeduction: "#ef4444",
  penaltyMissDeduction: "#e11d48",
  ownGoalDeduction: "#be123c",
};

/** Jasne tła → ciemny tekst `slate-950`. */
export const POINTS_LIGHT_BG = new Set([
  "#cbd5e1",
  "#94a3b8",
  "#a3e635",
  "#39FF14",
  "#38bdf8",
  "#2dd4bf",
  "#fbbf24",
]);

export function pointsSegmentTextColor(bg: string): string {
  return POINTS_LIGHT_BG.has(bg) ? "#020617" : "#ffffff";
}

export function metricColor(index: number): string {
  return METRIC_SEGMENT_COLORS[index % METRIC_SEGMENT_COLORS.length];
}

export function formatStatDisplay(key: FplStatKey, value: number): string {
  const def = getFplStatDefinition(key);
  const decimals = def?.decimals ?? 1;
  if (key === "now_cost") return `£${(value / 10).toFixed(1)}m`;
  if (key === "selected_by_percent") return `${value.toFixed(1)}%`;
  if (decimals === 0) return String(Math.round(value));
  return value.toFixed(decimals);
}

export function formatStatChip(
  key: FplStatKey,
  value: number,
  lang: StatsLabLang = "pl",
): string {
  const def = getFplStatDefinition(key);
  const short = lang === "en" ? def?.shortLabelEn : def?.shortLabelPl;
  return `${formatStatDisplay(key, value)} ${short ?? key}`;
}

/** Tło komórki heatmapy wg percentyla 0–100. */
export function percentileHeatColor(
  pct: number,
  theme: StatsLabChartThemeId,
): string {
  const p = Math.max(0, Math.min(100, pct));
  if (theme === "ANALYST_LIGHT") {
    if (p >= 85) return "rgba(5,150,105,0.35)";
    if (p >= 65) return "rgba(16,185,129,0.22)";
    if (p >= 40) return "rgba(148,163,184,0.18)";
    if (p >= 20) return "rgba(251,113,133,0.16)";
    return "rgba(244,63,94,0.22)";
  }
  if (p >= 85) return "rgba(57,255,20,0.28)";
  if (p >= 65) return "rgba(52,211,153,0.22)";
  if (p >= 40) return "rgba(100,116,139,0.25)";
  if (p >= 20) return "rgba(251,113,133,0.18)";
  return "rgba(244,63,94,0.22)";
}

/** @deprecated use PERIOD_LABELS from i18n */
export const PERIOD_LABELS_PL: Record<string, string> = {
  FULL_SEASON: "Cały sezon",
  LAST_4_GW: "Ostatnie 4 GW",
  LAST_6_GW: "Ostatnie 6 GW",
  HOME_ONLY: "Tylko Dom",
  AWAY_ONLY: "Tylko Wyjazd",
  CUSTOM_RANGE: "Własny zakres GW",
};

/** Detekcja kolizji etykiet scatter — naprzemienne offsety + leader line. */
export type ScatterLabelPlacement = {
  id: number;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  anchor: "start" | "end";
};

const LABEL_OFFSETS: Array<{ dx: number; dy: number; anchor: "start" | "end" }> =
  [
    { dx: 12, dy: -14, anchor: "start" },
    { dx: 12, dy: 16, anchor: "start" },
    { dx: -12, dy: -14, anchor: "end" },
    { dx: -12, dy: 16, anchor: "end" },
  ];

export function resolveScatterLabelPositions(
  points: Array<{ id: number; x: number; y: number }>,
  minDist = 22,
): ScatterLabelPlacement[] {
  const placed: ScatterLabelPlacement[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    let best = LABEL_OFFSETS[i % LABEL_OFFSETS.length];
    for (const candidate of LABEL_OFFSETS) {
      const lx = p.x + candidate.dx;
      const ly = p.y + candidate.dy;
      const clash = placed.some((prev) => {
        const dx = prev.labelX - lx;
        const dy = prev.labelY - ly;
        return Math.hypot(dx, dy) < minDist;
      });
      if (!clash) {
        best = candidate;
        break;
      }
    }
    placed.push({
      id: p.id,
      x: p.x,
      y: p.y,
      labelX: p.x + best.dx,
      labelY: p.y + best.dy,
      anchor: best.anchor,
    });
  }
  return placed;
}
