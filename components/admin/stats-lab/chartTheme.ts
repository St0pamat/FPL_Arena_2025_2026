import type { FplStatKey } from "@/lib/stats-lab/types";
import { getFplStatDefinition } from "@/lib/stats-lab/types";
import type { StatsLabLang, StatsLabScaleMode } from "@/lib/stats-lab/i18n";

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
    gold: "#f59e0b",
    grid: "#1e293b",
    avgLine: "#64748b",
    tooltipBg: "rgba(2,6,23,0.96)",
  },
  SCOUT_DARK: {
    id: "SCOUT_DARK",
    labelPl: "Scout Dark",
    labelEn: "Scout Dark",
    canvasBg: "#0b1c2e",
    panelBg: "#122a3a",
    text: "#f0fdfa",
    muted: "#94a3b8",
    border: "#115e59",
    accent: "#2dd4bf",
    gold: "#f59e0b",
    grid: "#0f313c",
    avgLine: "#64748b",
    tooltipBg: "rgba(11,28,46,0.96)",
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
    accent: "#0f766e",
    gold: "#f59e0b",
    grid: "#e2e8f0",
    avgLine: "#94a3b8",
    tooltipBg: "rgba(255,255,255,0.98)",
  },
};

/**
 * Stała paleta kryteriów (kolejność = indeks w activeMetrics / osiach).
 * Jedno źródło prawdy: legenda Stacked, segmenty / RAW bars, stopka plakatu.
 */
export const METRIC_SEGMENT_COLORS = [
  "#10b981", // emerald
  "#38bdf8", // sky
  "#a78bfa", // violet
  "#f59e0b", // amber
  "#f43f5e", // rose
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#f97316", // orange
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

/**
 * Kolor kryterium o indeksie `idx` (0-based) — legenda, wykres, stopka 1:1.
 * Opcjonalnie `theme` / `themeId` (ANALYST_LIGHT: idx 0 → ciemniejszy emerald AAA).
 */
export function getMetricColor(
  idx: number,
  theme?: StatsLabChartTheme | StatsLabChartThemeId,
): string {
  const themeId = typeof theme === "string" ? theme : theme?.id;
  // Analyst Light: idx 0 na białym tle → nasycony emerald-600 (AAA)
  if (themeId === "ANALYST_LIGHT" && idx % METRIC_SEGMENT_COLORS.length === 0) {
    return "#059669";
  }
  return METRIC_SEGMENT_COLORS[idx % METRIC_SEGMENT_COLORS.length];
}

/** Alias wsteczny (Radar / starsze call-site) → to samo źródło co `getMetricColor`. */
export function metricColor(
  index: number,
  themeId?: StatsLabChartThemeId,
): string {
  return getMetricColor(index, themeId);
}

/** Jasne segmenty metryk → slate-950; ciemne → white. */
const METRIC_LIGHT_SEGMENT_BG = new Set([
  "#10b981",
  "#38bdf8",
  "#a78bfa",
  "#f59e0b",
  "#f43f5e",
  "#14b8a6",
  "#6366f1",
  "#f97316",
  "#059669",
]);

export function metricSegmentTextColor(bg: string): string {
  return METRIC_LIGHT_SEGMENT_BG.has(bg) ? "#020617" : "#ffffff";
}

const TRANSFER_COMPACT_KEYS = new Set<FplStatKey>([
  "transfers_in",
  "transfers_out",
  "transfers_in_event",
  "transfers_out_event",
  "net_transfers_gw",
]);

/** Per 90 — wolumeny / indeksy Opta: zawsze 1 dp (DC 9.1 / 11.2, nie 9.10 vs 11.2). */
const PER90_OPTA_ONE_DP = new Set<FplStatKey>([
  "defensive_contributions_total",
  "clearances_blocks_interceptions",
  "tackles",
  "recoveries",
  "bps",
  "threat",
  "creativity",
  "influence",
  "ict_index",
]);

/** Per 90 — punkty FPL / expected / DC Mecz·Pkt: zawsze 2 dp. */
const PER90_POINTS_TWO_DP = new Set<FplStatKey>([
  "dc_bonus_matches",
  "dc_bonus_points",
  "total_points",
  "goals_scored",
  "assists",
  "goals_assists",
  "expected_goals",
  "expected_assists",
  "expected_goal_involvements",
  "expected_goals_conceded",
  "goals_conceded",
  "bonus",
  "saves",
  "goals_vs_xg",
]);

/** Transfery w pigułkach: +392.5k / -9.6k / +1.25M (nigdy Per 90). */
export function formatCompactTransferDisplay(
  key: FplStatKey,
  value: number,
): string {
  const abs = Math.abs(value);
  let sign = "";
  if (value < 0) sign = "-";
  else if (key === "net_transfers_gw" && value > 0) sign = "+";

  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${Math.round(abs)}`;
}

export function formatStatDisplay(
  key: FplStatKey,
  value: number,
  per90 = false,
): string {
  return formatMetricDisplayValue(key, value, per90);
}

/**
 * Formatowanie wartości na wykresie / w listwie.
 * Totals: DC / DC Mecz / DC Pkt i inne decimals:0 → int.
 * Per 90 Opta (DC, CBI, BPS, ICT…): zawsze 1 dp; punkty/xG/DC Pkt: zawsze 2 dp.
 * Transfery: kompaktowo (+392.5k) — ignoruje per90.
 */
export function formatMetricDisplayValue(
  key: FplStatKey,
  value: number,
  per90: boolean,
): string {
  const def = getFplStatDefinition(key);
  if (key === "now_cost") return `£${(value / 10).toFixed(1)}m`;
  if (key === "selected_by_percent") return `${value.toFixed(1)}%`;
  if (TRANSFER_COMPACT_KEYS.has(key)) {
    return formatCompactTransferDisplay(key, value);
  }

  if (per90 && def?.supportsPer90) {
    let formatted: string;
    if (PER90_OPTA_ONE_DP.has(key)) {
      formatted = value.toFixed(1);
    } else if (PER90_POINTS_TWO_DP.has(key)) {
      formatted = value.toFixed(2);
    } else {
      // Pozostałe supportsPer90 — 2 dp (bezpieczny default punktowy)
      formatted = value.toFixed(2);
    }
    if (key === "goals_vs_xg" && value > 0 && !formatted.startsWith("+")) {
      return `+${formatted}`;
    }
    return formatted;
  }

  // Totals: całkowite (DC, DC Mecz, DC Pkt, gole…) → Math.round
  const decimals = def?.decimals ?? 1;
  let formatted =
    decimals === 0 ? String(Math.round(value)) : value.toFixed(decimals);
  if (key === "goals_vs_xg" && value > 0 && !formatted.startsWith("+")) {
    formatted = `+${formatted}`;
  }
  return formatted;
}

export function formatStatChip(
  key: FplStatKey,
  value: number,
  lang: StatsLabLang = "pl",
  per90 = false,
): string {
  const def = getFplStatDefinition(key);
  const short = lang === "en" ? def?.shortLabelEn : def?.shortLabelPl;
  return `${formatMetricDisplayValue(key, value, per90)} ${short ?? key}`;
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

/* ───────────────────────────────────────────────────────────────────────────
 * SCATTER_2D — konfiguracja osi + smart AABB labels (Krok 2)
 * ─────────────────────────────────────────────────────────────────────────── */

/** Statystyki mogące przyjmować wartości ujemne na osi RAW. */
const SCATTER_SIGNED_KEYS = new Set<FplStatKey>([
  "goals_vs_xg",
  "net_transfers_gw",
  "price_change_gw",
]);

/**
 * W Totals (!per90) te klucze zostają ułamkowe na osi RAW.
 * Wszystkie pozostałe → skala całkowita (isIntegerScale).
 */
const SCATTER_FRACTIONAL_RAW_KEYS = new Set<FplStatKey>([
  "expected_goals",
  "expected_assists",
  "expected_goal_involvements",
  "expected_goals_conceded",
  "goals_vs_xg",
  "points_per_game",
  "form",
  "value_season",
  "value_form",
  "selected_by_percent",
  "now_cost",
  "ict_index",
  "influence",
  "creativity",
  "threat",
  "transfers_in",
  "transfers_out",
  "transfers_in_event",
  "transfers_out_event",
  "net_transfers_gw",
]);

export type ScatterAxisTick = {
  value: number;
  ratio: number;
  label: string;
};

export type ScatterAxisConfig = {
  min: number;
  max: number;
  avg: number;
  inverted: boolean;
  project: (v: number) => number;
  ticks: ScatterAxisTick[];
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function formatScatterTickFallback(tickVal: number, span: number): string {
  const precision = span < 0.8 ? 2 : 1;
  const raw = tickVal.toFixed(precision);
  if (Number(raw) === 0) return "0";
  return raw;
}

function scatterTicksHaveDuplicateLabels(ticks: ScatterAxisTick[]): boolean {
  for (let i = 1; i < ticks.length; i++) {
    if (ticks[i].label === ticks[i - 1].label) return true;
  }
  return false;
}

/**
 * Domeny / projekcja / ticki osi X lub Y wykresu SCATTER_2D.
 * Percentyle: zawsze 0–100 (invert już w silniku). RAW: padding 8%, floor 0 dla nieujemnych.
 */
export function computeScatterAxisConfig(params: {
  statKey: FplStatKey;
  values: number[];
  avgValue: number;
  showAvg: boolean;
  scaleMode: StatsLabScaleMode;
  per90: boolean;
}): ScatterAxisConfig {
  const { statKey, values, avgValue, showAvg, scaleMode, per90 } = params;
  const def = getFplStatDefinition(statKey);
  const nonNegative = !SCATTER_SIGNED_KEYS.has(statKey);

  if (scaleMode === "PERCENTILE") {
    const min = 0;
    const max = 100;
    const project = (v: number) => clamp01((v - 0) / 100);
    const ticks: ScatterAxisTick[] = [0, 25, 50, 75, 100].map((value) => ({
      value,
      ratio: value / 100,
      label: `P${value}`,
    }));
    return {
      min,
      max,
      avg: 50,
      inverted: false,
      project,
      ticks,
    };
  }

  // ── RAW ──────────────────────────────────────────────────────────────────
  const finiteVals = values.filter(Number.isFinite);
  if (showAvg && Number.isFinite(avgValue)) finiteVals.push(avgValue);
  if (finiteVals.length === 0) finiteVals.push(0, 1);

  let rawMin = Math.min(...finiteVals);
  let rawMax = Math.max(...finiteVals);
  let rawSpan = rawMax - rawMin;
  if (rawSpan <= 1e-9) {
    rawSpan = Math.abs(rawMax) > 0 ? Math.abs(rawMax) * 0.25 : 1;
  }

  let min: number;
  let max: number;
  const isIntegerScale =
    !per90 && !SCATTER_FRACTIONAL_RAW_KEYS.has(statKey);

  if (isIntegerScale) {
    min = nonNegative ? Math.max(0, Math.floor(rawMin)) : Math.floor(rawMin);
    max = Math.ceil(rawMax);
    if (max - min < 4) {
      let need = 4 - (max - min);
      if ((!nonNegative || min > 0) && need > 0) {
        min -= 1;
        need -= 1;
      }
      max += need;
    }
  } else {
    // Mniejszy pad domeny — ochronę narożników bierze DATA_INSET w Scatter2DChart
    const PAD_RATIO = 0.04;
    if (nonNegative && rawMin >= 0) {
      min = rawMin === 0 ? 0 : Math.max(0, rawMin - rawSpan * PAD_RATIO);
      max = rawMax > 0 ? rawMax + rawSpan * PAD_RATIO : 1;
    } else {
      min = rawMin - rawSpan * PAD_RATIO;
      max = rawMax + rawSpan * PAD_RATIO;
    }
  }

  const inverted = Boolean(def?.invertScale);
  const span = max - min || 1;
  const project = (v: number) =>
    inverted
      ? clamp01((max - v) / span)
      : clamp01((v - min) / span);

  const ratios = [0, 0.25, 0.5, 0.75, 1] as const;
  let ticks: ScatterAxisTick[] = ratios.map((r) => {
    let value = inverted ? max - r * (max - min) : min + r * (max - min);
    if (isIntegerScale) value = Math.round(value);
    return {
      value,
      ratio: r,
      label: isIntegerScale
        ? String(Math.round(value))
        : formatMetricDisplayValue(statKey, value, per90),
    };
  });

  if (!isIntegerScale && scatterTicksHaveDuplicateLabels(ticks)) {
    const dedupeSpan = max - min;
    ticks = ratios.map((r) => {
      const value = inverted ? max - r * (max - min) : min + r * (max - min);
      return {
        value,
        ratio: r,
        label: formatScatterTickFallback(value, dedupeSpan),
      };
    });
  }

  return {
    min,
    max,
    avg: avgValue,
    inverted,
    project,
    ticks,
  };
}

/** Wysokokontrastowe barwy klubowe (short_name → hex) dla Scatter Social. */
const SCATTER_CLUB_COLORS: Record<string, string> = {
  ARS: "#ef4444",
  AVL: "#a855f7",
  BOU: "#f43f5e",
  BRE: "#fb7185",
  BHA: "#0ea5e9",
  BUR: "#a855f7",
  CHE: "#3b82f6",
  COV: "#06b6d4",
  CRY: "#6366f1",
  DER: "#6366f1",
  EVE: "#2563eb",
  FUL: "#14b8a6",
  HUL: "#f59e0b",
  IPS: "#38bdf8",
  LEE: "#eab308",
  LEI: "#3b82f6",
  LIV: "#dc2626",
  LUT: "#f97316",
  MCI: "#38bdf8",
  MID: "#f43f5e",
  MUN: "#ef4444",
  NEW: "#10b981",
  NFO: "#f97316",
  NOR: "#22c55e",
  OXF: "#eab308",
  POR: "#2563eb",
  SHU: "#ef4444",
  SOU: "#f43f5e",
  SUN: "#ef4444",
  SWA: "#14b8a6",
  TOT: "#8b5cf6",
  WAT: "#facc15",
  WBA: "#3b82f6",
  WHU: "#d946ef",
  WOL: "#eab308",
};

/** 12 kontrastowych barw — deterministyczny fallback dla nieznanych short_name. */
const SCATTER_HASH_PALETTE = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#d946ef",
  "#f43f5e",
  "#fb7185",
] as const;

/**
 * Kolor kropki / akcentu pigułki gracza na Scatter — preferuj paletę short_name.
 * Nieznane kluby: stabilny hash z short_name (nigdy ten sam zielony fallback).
 */
export function getScatterClubColor(
  clubShortName?: string | null,
  primaryColor?: string | null,
  fallbackAccent = "#10b981",
): string {
  const key = (clubShortName ?? "").trim().toUpperCase();
  if (key && SCATTER_CLUB_COLORS[key]) return SCATTER_CLUB_COLORS[key];
  if (key) {
    let sum = 0;
    for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
    return SCATTER_HASH_PALETTE[sum % SCATTER_HASH_PALETTE.length];
  }
  return primaryColor || fallbackAccent;
}

export interface ScatterSmartLabelInput {
  id: number;
  x: number;
  y: number;
  name: string;
  metaText?: string;
  /** Wyższy = ważniejszy (Spotlight = 1000, outlier = 500, reszta wg ranku). */
  priority: number;
  dotRadius: number;
}

export interface ScatterSmartLabelPlacement {
  id: number;
  boxX: number;
  boxY: number;
  boxW: number;
  boxH: number;
  anchorX: number;
  anchorY: number;
  showLabel: boolean;
}

type ScatterAabb = { x: number; y: number; w: number; h: number };

/** Bazowi kandydaci: bliskie narożniki → kardynały → piętra 2/3/4. */
const SMART_LABEL_CANDIDATES_BASE: ReadonlyArray<{ dx: number; dy: number }> = [
  // piętro 1 — bliskie NE / NW / SE / SW
  { dx: 32, dy: -30 },
  { dx: -32, dy: -30 },
  { dx: 32, dy: 30 },
  { dx: -32, dy: 30 },
  // średnie N / S / E / W
  { dx: 0, dy: -42 },
  { dx: 0, dy: 42 },
  { dx: 48, dy: 0 },
  { dx: -48, dy: 0 },
  // piętro 2 — dy ±66
  { dx: 0, dy: -66 },
  { dx: 0, dy: 66 },
  { dx: -55, dy: -66 },
  // piętro 3 — dy ±108
  { dx: 0, dy: -108 },
  { dx: 0, dy: 108 },
  { dx: -55, dy: -108 },
  { dx: 55, dy: -108 },
  // piętro 4 — dy -150 z dx = -55 / 0 / +55
  { dx: -55, dy: -150 },
  { dx: 0, dy: -150 },
  { dx: 55, dy: -150 },
];

/**
 * Kandydaci AABB — baza + daleki zasięg L/R względem półszerokości pigułki (hw).
 * Punkty przy prawej ścianie (P85–P100) wypuszczają etykiety w lewo do środka plotu.
 */
function buildSmartLabelCandidates(
  boxW: number,
): Array<{ dx: number; dy: number }> {
  const hw = boxW / 2;
  const lateral: Array<{ dx: number; dy: number }> = [
    // silnie lewostronne
    { dx: -(hw + 24), dy: 0 },
    { dx: -(hw + 24), dy: -32 },
    { dx: -(hw + 24), dy: 32 },
    { dx: -(hw + 82), dy: -18 },
    { dx: -(hw + 82), dy: 24 },
    { dx: -(hw + 82), dy: -56 },
    { dx: -(hw + 82), dy: 56 },
    { dx: -(hw + 145), dy: 0 },
    { dx: -(hw + 145), dy: -42 },
    { dx: -(hw + 145), dy: 42 },
    // symetryczne prawostronne
    { dx: hw + 24, dy: 0 },
    { dx: hw + 24, dy: -32 },
    { dx: hw + 24, dy: 32 },
    { dx: hw + 82, dy: -18 },
    { dx: hw + 82, dy: 24 },
    { dx: hw + 82, dy: -56 },
    { dx: hw + 82, dy: 56 },
    { dx: hw + 145, dy: 0 },
    { dx: hw + 145, dy: -42 },
    { dx: hw + 145, dy: 42 },
  ];
  return [...SMART_LABEL_CANDIDATES_BASE, ...lateral];
}

function aabbOverlaps(a: ScatterAabb, b: ScatterAabb): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function inflateAabb(box: ScatterAabb, pad: number): ScatterAabb {
  return {
    x: box.x - pad,
    y: box.y - pad,
    w: box.w + pad * 2,
    h: box.h + pad * 2,
  };
}

function smartLabelBoxSize(item: ScatterSmartLabelInput): {
  boxW: number;
  boxH: number;
} {
  const textLen = Math.max(
    item.name.length,
    (item.metaText?.length ?? 0) * 0.78,
  );
  const boxW = Math.max(98, Math.min(182, Math.ceil(textLen * 9.2 + 26)));
  const boxH = item.metaText ? 48 : 30;
  return { boxW, boxH };
}

function nearerEdgeAnchor(
  px: number,
  py: number,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
): { anchorX: number; anchorY: number } {
  const cx = boxX + boxW / 2;
  const cy = boxY + boxH / 2;
  const dx = px - cx;
  const dy = py - cy;
  if (Math.abs(dx) * boxH > Math.abs(dy) * boxW) {
    return {
      anchorX: dx > 0 ? boxX + boxW : boxX,
      anchorY: Math.max(boxY, Math.min(py, boxY + boxH)),
    };
  }
  return {
    anchorX: Math.max(boxX, Math.min(px, boxX + boxW)),
    anchorY: dy > 0 ? boxY + boxH : boxY,
  };
}

function fitsInBounds(
  box: ScatterAabb,
  bounds: { left: number; top: number; right: number; bottom: number },
  margin: number,
): boolean {
  return (
    box.x >= bounds.left + margin &&
    box.y >= bounds.top + margin &&
    box.x + box.w <= bounds.right - margin &&
    box.y + box.h <= bounds.bottom - margin
  );
}

/**
 * Antykolizyjny solver 2D AABB dla pigułek etykiet Scatter.
 * Priority-first; zero wymuszonych nakładek (poza jedynym punktem na wykresie).
 */
export function resolveScatterSmartLabels(
  items: ScatterSmartLabelInput[],
  bounds: { left: number; top: number; right: number; bottom: number },
  reservedBoxes?: Array<{ x: number; y: number; w: number; h: number }>,
): Map<number, ScatterSmartLabelPlacement> {
  const result = new Map<number, ScatterSmartLabelPlacement>();
  const occupied: ScatterAabb[] = [];

  if (reservedBoxes) {
    for (const r of reservedBoxes) {
      occupied.push({ x: r.x, y: r.y, w: r.w, h: r.h });
    }
  }

  for (const pt of items) {
    const padR = pt.dotRadius + 3;
    occupied.push({
      x: pt.x - padR,
      y: pt.y - padR,
      w: padR * 2,
      h: padR * 2,
    });
  }

  const ordered = [...items].sort((a, b) => b.priority - a.priority);
  const solePoint = items.length === 1;
  const SAFETY_PAD = 5;
  const BOUNDS_MARGIN = 4;

  for (const item of ordered) {
    const { boxW, boxH } = smartLabelBoxSize(item);
    const candidates = buildSmartLabelCandidates(boxW);
    let placed: ScatterSmartLabelPlacement | null = null;

    for (const { dx, dy } of candidates) {
      const boxX = item.x + dx - boxW / 2;
      const boxY = item.y + dy - boxH / 2;
      const box: ScatterAabb = { x: boxX, y: boxY, w: boxW, h: boxH };
      if (!fitsInBounds(box, bounds, BOUNDS_MARGIN)) continue;

      const padded = inflateAabb(box, SAFETY_PAD);
      const clash = occupied.some((o) => aabbOverlaps(padded, o));
      if (clash && !solePoint) continue;
      if (clash && solePoint) {
        // jedyny punkt: preferuj wolnego kandydata, ale nie blokuj całkowicie
        if (placed == null) {
          const anchor = nearerEdgeAnchor(
            item.x,
            item.y,
            boxX,
            boxY,
            boxW,
            boxH,
          );
          placed = {
            id: item.id,
            boxX,
            boxY,
            boxW,
            boxH,
            anchorX: anchor.anchorX,
            anchorY: anchor.anchorY,
            showLabel: true,
          };
        }
        continue;
      }

      const anchor = nearerEdgeAnchor(item.x, item.y, boxX, boxY, boxW, boxH);
      placed = {
        id: item.id,
        boxX,
        boxY,
        boxW,
        boxH,
        anchorX: anchor.anchorX,
        anchorY: anchor.anchorY,
        showLabel: true,
      };
      break;
    }

    if (!placed && solePoint) {
      // Wymuś etykietę: pierwszy kandydat wpasowany w bounds (bez testu kolizji)
      for (const { dx, dy } of candidates) {
        let boxX = item.x + dx - boxW / 2;
        let boxY = item.y + dy - boxH / 2;
        boxX = Math.max(
          bounds.left + BOUNDS_MARGIN,
          Math.min(boxX, bounds.right - BOUNDS_MARGIN - boxW),
        );
        boxY = Math.max(
          bounds.top + BOUNDS_MARGIN,
          Math.min(boxY, bounds.bottom - BOUNDS_MARGIN - boxH),
        );
        const anchor = nearerEdgeAnchor(item.x, item.y, boxX, boxY, boxW, boxH);
        placed = {
          id: item.id,
          boxX,
          boxY,
          boxW,
          boxH,
          anchorX: anchor.anchorX,
          anchorY: anchor.anchorY,
          showLabel: true,
        };
        break;
      }
    }

    if (placed) {
      occupied.push({
        x: placed.boxX,
        y: placed.boxY,
        w: placed.boxW,
        h: placed.boxH,
      });
      result.set(item.id, placed);
    } else {
      result.set(item.id, {
        id: item.id,
        boxX: item.x,
        boxY: item.y,
        boxW,
        boxH,
        anchorX: item.x,
        anchorY: item.y,
        showLabel: false,
      });
    }
  }

  return result;
}
