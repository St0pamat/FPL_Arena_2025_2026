"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarRange,
  Download,
  Loader2,
} from "lucide-react";
import { toJpeg } from "html-to-image";
import {
  queryStatsLabProjectionsAction,
  type StatsLabProjectionsActionResult,
} from "@/app/admin/actions/statsLabProjections";
import { ARENA_PORTAL_ALT, ARENA_PORTAL_LOGO } from "@/lib/arena";
import { downloadDataUrl } from "@/lib/stats-lab/exportCapture";
import {
  buildProjectionsAiAuditReport,
  downloadJsonFile,
} from "@/lib/stats-lab/auditExport";
import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import { fplLabBadgeUrl } from "@/lib/stats-lab/mediaUrls";
import {
  fdrLevel,
  type ProjectionsCellLayout,
  type ProjectionsCellMetric,
  type ProjectionsDgwCsDisplayMode,
  type ProjectionsFdrLevel,
  type ProjectionsFdrMode,
  type ProjectionsFixturePrediction,
  type ProjectionsSortKey,
  type ProjectionsSubView,
  type ProjectionsTeamFixtureItem,
  type ProjectionsTeamRow,
  type ProjectionsVenueFilter,
} from "@/lib/stats-lab/projectionsEngine";
import {
  PROJECTIONS_CELL_LAYOUT_LABELS,
  PROJECTIONS_CELL_METRIC_LABELS,
  PROJECTIONS_CS_BAND_LABELS,
  PROJECTIONS_DGW_CS_MODE_LABELS,
  PROJECTIONS_FDR_LEVEL_LABELS,
  PROJECTIONS_FDR_MODE_LABELS,
  PROJECTIONS_FDR_NUMBER_FORMAT_LABELS,
  PROJECTIONS_GOALS_BAND_LABELS,
  PROJECTIONS_MATCHUP_MODE_LABELS,
  PROJECTIONS_MATCHUP_SORT_LABELS,
  PROJECTIONS_RANGE_PRESETS,
  PROJECTIONS_SUBVIEW_LABELS,
  PROJECTIONS_VENUE_FILTER_LABELS,
  formatProjectionsGwRangeLabel,
  projectionsUi,
  type ProjectionsFdrNumberFormat,
  type ProjectionsMatchupDisplayMode,
  type ProjectionsMatchupSortKey,
} from "@/lib/stats-lab/projectionsI18n";
import type { StatsLabChartThemeId } from "@/components/admin/stats-lab/chartTheme";
import { getThemeTokens } from "@/lib/stats-lab/themeTokens";

type Props = {
  lang: StatsLabLang;
  themeId: StatsLabChartThemeId;
};

type LocalSortKey =
  | ProjectionsSortKey
  | "avgProjectedGoalsPerMatch"
  | "avgCleanSheetPctPerMatch"
  | `gw:${number}`;

type GwSortContext = {
  subView: ProjectionsSubView;
  cellMetric: ProjectionsCellMetric;
  fdrMode: ProjectionsFdrMode;
  dgwCsDisplayMode: ProjectionsDgwCsDisplayMode;
};

type Surface = {
  canvasBg: string;
  rowOdd: string;
  rowEven: string;
  headBg: string;
  borderClass: string;
  textClass: string;
  mutedClass: string;
  accentTextClass: string;
  stickyBorderClass: string;
  strongTextClass: string;
};

function getSurface(themeId: StatsLabChartThemeId): Surface {
  if (themeId === "ANALYST_LIGHT") {
    return {
      canvasBg: "#F8FAFC",
      rowOdd: "#FFFFFF",
      rowEven: "#F1F5F9",
      headBg: "#E2E8F0",
      borderClass: "border-slate-200",
      textClass: "text-slate-900",
      mutedClass: "text-slate-600",
      accentTextClass: "text-emerald-700",
      stickyBorderClass: "border-slate-200",
      strongTextClass: "text-slate-900 font-extrabold",
    };
  }
  if (themeId === "SCOUT_DARK") {
    return {
      canvasBg: "#07120F",
      rowOdd: "#07120F",
      rowEven: "#0B1B16",
      headBg: "#0F241D",
      borderClass: "border-emerald-900/60",
      textClass: "text-emerald-50",
      mutedClass: "text-emerald-300/70",
      accentTextClass: "text-emerald-300",
      stickyBorderClass: "border-emerald-900/60",
      strongTextClass: "text-white font-extrabold",
    };
  }
  return {
    canvasBg: "#070B14",
    rowOdd: "#070B14",
    rowEven: "#0B1120",
    headBg: "#0F172A",
    borderClass: "border-slate-800/80",
    textClass: "text-slate-100",
    mutedClass: "text-slate-400",
    accentTextClass: "text-emerald-400",
    stickyBorderClass: "border-slate-800/80",
    strongTextClass: "text-white font-extrabold",
  };
}

function fdrSortKeyForMode(mode: ProjectionsFdrMode): ProjectionsSortKey {
  if (mode === "ATTACK") return "avgFdrAttack";
  if (mode === "DEFENCE") return "avgFdrDefence";
  return "avgFdrOverall";
}

function isFdrSortKey(key: LocalSortKey): boolean {
  return (
    key === "avgFdrOverall" ||
    key === "avgFdrAttack" ||
    key === "avgFdrDefence"
  );
}

function isGwSortKey(key: LocalSortKey): key is `gw:${number}` {
  return typeof key === "string" && key.startsWith("gw:");
}

function parseGwSortKey(key: LocalSortKey): number | null {
  if (!isGwSortKey(key)) return null;
  const n = Number(key.slice(3));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function gwSortKey(gw: number): `gw:${number}` {
  return `gw:${gw}`;
}

function serverSortKey(key: LocalSortKey): ProjectionsSortKey {
  if (isGwSortKey(key)) return "avgFdrOverall";
  if (key === "avgProjectedGoalsPerMatch") return "totalProjectedGoals";
  if (key === "avgCleanSheetPctPerMatch") return "totalExpectedCleanSheets";
  return key;
}

function cellValueForGwSort(
  team: ProjectionsTeamRow,
  gw: number,
  ctx: GwSortContext,
): number | null {
  const cell = team.cellsByGw[gw];
  if (!cell || cell.isBlank || cell.fixtures.length === 0) return null;

  if (ctx.subView === "PROJECTED_GOALS") {
    return cell.totalProjectedGoals;
  }
  if (ctx.subView === "CLEAN_SHEETS") {
    return ctx.dgwCsDisplayMode === "COMBINED_AT_LEAST_ONE"
      ? cell.combinedAtLeastOneCsPct
      : cell.totalExpectedCs;
  }

  if (ctx.cellMetric === "GOALS") return cell.totalProjectedGoals;
  if (ctx.cellMetric === "CS_PCT") return cell.combinedAtLeastOneCsPct;
  if (ctx.cellMetric === "WIN_PCT") return cell.avgWinPct;
  if (ctx.fdrMode === "ATTACK") return cell.avgFdrAttack;
  if (ctx.fdrMode === "DEFENCE") return cell.avgFdrDefence;
  return cell.avgFdrOverall;
}

function fdrPillClass(
  level: ProjectionsFdrLevel | null | undefined,
  isLight: boolean,
  blank?: boolean,
): string {
  if (blank || level == null) {
    return isLight
      ? "bg-slate-200/50 text-slate-500 border-slate-300/50 opacity-50"
      : "bg-slate-500/10 text-slate-400 border-slate-500/20 opacity-50";
  }
  if (isLight) {
    switch (level) {
      case 1:
        return "bg-emerald-500 text-white border-emerald-600";
      case 2:
        return "bg-emerald-100 text-emerald-950 border-emerald-300";
      case 3:
        return "bg-slate-200 text-slate-900 border-slate-300";
      case 4:
        return "bg-amber-200 text-amber-950 border-amber-400";
      case 5:
        return "bg-rose-600 text-white border-rose-700";
    }
  }
  switch (level) {
    case 1:
      return "bg-emerald-500/30 text-emerald-100 border-emerald-400/50";
    case 2:
      return "bg-teal-500/20 text-teal-200 border-teal-400/30";
    case 3:
      return "bg-slate-500/20 text-slate-200 border-slate-400/30";
    case 4:
      return "bg-amber-500/25 text-amber-200 border-amber-400/40";
    case 5:
      return "bg-rose-500/30 text-rose-100 border-rose-400/50";
  }
}

/** Pigułka FDR w nagłówku karty meczu — zawsze jedna linia. */
function fdrMatchupBadgeClass(
  level: ProjectionsFdrLevel,
  isLight: boolean,
): string {
  return `inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-extrabold leading-none ${fdrPillClass(level, isLight)}`;
}

function menuPanelClass(themeId: StatsLabChartThemeId): string {
  if (themeId === "ANALYST_LIGHT") {
    return "rounded-2xl border border-slate-300 bg-white p-4 shadow-sm";
  }
  if (themeId === "SCOUT_DARK") {
    return "rounded-2xl border border-teal-800/80 bg-[#09222a] p-4";
  }
  return "rounded-2xl border border-slate-800 bg-[#0c1322] p-4";
}

function menuTabsBarClass(themeId: StatsLabChartThemeId): string {
  if (themeId === "ANALYST_LIGHT") {
    return "flex flex-wrap gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm";
  }
  if (themeId === "SCOUT_DARK") {
    return "flex flex-wrap gap-2 rounded-2xl border border-teal-800/80 bg-[#09222a] p-2";
  }
  return "flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-[#0c1322] p-2";
}

function segGroupClass(themeId: StatsLabChartThemeId): string {
  if (themeId === "ANALYST_LIGHT") {
    return "flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1";
  }
  if (themeId === "SCOUT_DARK") {
    return "flex flex-wrap gap-1 rounded-xl border border-teal-900 bg-[#06181e] p-1";
  }
  return "flex flex-wrap gap-1 rounded-xl border border-slate-700 bg-[#070b14] p-1";
}

function controlSelectClass(themeId: StatsLabChartThemeId): string {
  const base =
    "mt-1 block min-h-[28px] rounded-lg px-3 py-1.5 text-xs font-bold";
  if (themeId === "ANALYST_LIGHT") {
    return `${base} border border-slate-300 bg-white text-slate-900 focus:border-emerald-600`;
  }
  if (themeId === "SCOUT_DARK") {
    return `${base} border border-teal-700 bg-[#06181e] text-teal-50 focus:border-emerald-400`;
  }
  return `${base} border border-slate-600 bg-slate-900 text-white focus:border-emerald-400`;
}

function controlOptionClass(themeId: StatsLabChartThemeId): string {
  if (themeId === "ANALYST_LIGHT") {
    return "bg-white font-semibold text-slate-900";
  }
  if (themeId === "SCOUT_DARK") {
    return "bg-[#06181e] font-semibold text-teal-50";
  }
  return "bg-slate-900 font-semibold text-white";
}

function controlInputClass(themeId: StatsLabChartThemeId): string {
  const base =
    "mt-1 w-full min-h-[28px] rounded-lg px-3 py-2 text-xs font-semibold placeholder:text-slate-400";
  if (themeId === "ANALYST_LIGHT") {
    return `${base} border border-slate-300 bg-white text-slate-900`;
  }
  if (themeId === "SCOUT_DARK") {
    return `${base} border border-teal-700 bg-[#06181e] text-teal-50`;
  }
  return `${base} border border-slate-600 bg-slate-900 text-white`;
}

function controlTabClass(
  active: boolean,
  themeId: StatsLabChartThemeId,
): string {
  const base = "min-h-[28px] font-semibold";
  if (active) {
    return themeId === "ANALYST_LIGHT"
      ? `${base} border border-emerald-800 bg-emerald-700 font-extrabold text-white shadow-sm`
      : `${base} border border-emerald-300 bg-emerald-400 font-extrabold text-slate-950 shadow-sm`;
  }
  if (themeId === "ANALYST_LIGHT") {
    return `${base} border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-950`;
  }
  if (themeId === "SCOUT_DARK") {
    return `${base} border border-teal-700/70 bg-[#0d2d37] text-teal-100 hover:bg-teal-900/60 hover:text-white`;
  }
  return `${base} border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white`;
}

function exportButtonClass(themeId: StatsLabChartThemeId): string {
  const base =
    "inline-flex min-h-[28px] items-center gap-1.5 rounded-xl px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider shadow-md transition disabled:opacity-40";
  if (themeId === "ANALYST_LIGHT") {
    return `${base} border border-emerald-800 bg-emerald-700 text-white hover:bg-emerald-800`;
  }
  return `${base} border border-emerald-300 bg-emerald-400 text-slate-950 hover:bg-emerald-300`;
}

function accentActionButtonClass(themeId: StatsLabChartThemeId): string {
  const base =
    "min-h-[28px] rounded-xl px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider shadow-md transition";
  if (themeId === "ANALYST_LIGHT") {
    return `${base} border border-emerald-800 bg-emerald-700 text-white hover:bg-emerald-800`;
  }
  return `${base} border border-emerald-300 bg-emerald-400 text-slate-950 hover:bg-emerald-300`;
}

function goalsPillClass(goals: number, isLight: boolean): string {
  if (goals >= 2.2) {
    return isLight
      ? "bg-emerald-500 text-white border-emerald-600"
      : "bg-emerald-500/30 text-emerald-100 border-emerald-400/50";
  }
  if (goals >= 1.65) {
    return isLight
      ? "bg-emerald-100 text-emerald-950 border-emerald-300"
      : "bg-teal-500/20 text-teal-200 border-teal-400/30";
  }
  if (goals >= 1.15) {
    return isLight
      ? "bg-slate-200 text-slate-900 border-slate-300"
      : "bg-slate-500/20 text-slate-200 border-slate-400/30";
  }
  if (goals >= 0.8) {
    return isLight
      ? "bg-amber-200 text-amber-950 border-amber-400"
      : "bg-amber-500/25 text-amber-200 border-amber-400/40";
  }
  return isLight
    ? "bg-rose-600 text-white border-rose-700"
    : "bg-rose-500/30 text-rose-100 border-rose-400/50";
}

function csPillClass(csPct: number, isLight: boolean): string {
  if (csPct >= 42) {
    return isLight
      ? "bg-emerald-500 text-white border-emerald-600"
      : "bg-emerald-500/30 text-emerald-100 border-emerald-400/50";
  }
  if (csPct >= 32) {
    return isLight
      ? "bg-emerald-100 text-emerald-950 border-emerald-300"
      : "bg-teal-500/20 text-teal-200 border-teal-400/30";
  }
  if (csPct >= 22) {
    return isLight
      ? "bg-slate-200 text-slate-900 border-slate-300"
      : "bg-slate-500/20 text-slate-200 border-slate-400/30";
  }
  if (csPct >= 14) {
    return isLight
      ? "bg-amber-200 text-amber-950 border-amber-400"
      : "bg-amber-500/25 text-amber-200 border-amber-400/40";
  }
  return isLight
    ? "bg-rose-600 text-white border-rose-700"
    : "bg-rose-500/30 text-rose-100 border-rose-400/50";
}

function winPillClass(winPct: number, isLight: boolean): string {
  if (winPct >= 55) {
    return isLight
      ? "bg-emerald-500 text-white border-emerald-600"
      : "bg-emerald-500/30 text-emerald-100 border-emerald-400/50";
  }
  if (winPct >= 40) {
    return isLight
      ? "bg-emerald-100 text-emerald-950 border-emerald-300"
      : "bg-teal-500/20 text-teal-200 border-teal-400/30";
  }
  if (winPct >= 28) {
    return isLight
      ? "bg-slate-200 text-slate-900 border-slate-300"
      : "bg-slate-500/20 text-slate-200 border-slate-400/30";
  }
  if (winPct >= 18) {
    return isLight
      ? "bg-amber-200 text-amber-950 border-amber-400"
      : "bg-amber-500/25 text-amber-200 border-amber-400/40";
  }
  return isLight
    ? "bg-rose-600 text-white border-rose-700"
    : "bg-rose-500/30 text-rose-100 border-rose-400/50";
}

function sortMatchups(
  list: ProjectionsFixturePrediction[],
  sortKey: ProjectionsMatchupSortKey,
): ProjectionsFixturePrediction[] {
  const arr = [...list];
  if (sortKey === "TOTAL_GOALS_DESC") {
    return arr.sort(
      (a, b) =>
        b.lambdaHome + b.lambdaAway - (a.lambdaHome + a.lambdaAway) ||
        a.fixtureId - b.fixtureId,
    );
  }
  if (sortKey === "FAVOURITE_WIN_DESC") {
    return arr.sort((a, b) => {
      const fa = Math.max(a.winPctHome, a.winPctAway);
      const fb = Math.max(b.winPctHome, b.winPctAway);
      return fb - fa || a.fixtureId - b.fixtureId;
    });
  }
  return arr.sort((a, b) => {
    const ka = a.kickoffTime ? Date.parse(a.kickoffTime) : 0;
    const kb = b.kickoffTime ? Date.parse(b.kickoffTime) : 0;
    return ka - kb || a.fixtureId - b.fixtureId;
  });
}

type PosterTeamRow = {
  teamId: number;
  name: string;
  shortName: string;
  pulseCode: number;
  opponentLabel: string;
  goals: number;
  csPct: number;
  winPct: number;
};

function buildPosterRows(
  teams: ProjectionsTeamRow[],
  gw: number,
  lang: StatsLabLang,
): PosterTeamRow[] {
  const rows: PosterTeamRow[] = [];
  for (const team of teams) {
    const cell = team.cellsByGw[gw];
    if (!cell || cell.isBlank || !cell.fixtures.length) continue;
    const opponentLabel = cell.fixtures
      .map((fx) =>
        lang === "pl" ? fx.tickerLabelSingleGwPl : fx.tickerLabelSingleGwEn,
      )
      .join(" + ");
    rows.push({
      teamId: team.teamId,
      name: team.name,
      shortName: team.shortName,
      pulseCode: team.pulseCode,
      opponentLabel,
      goals: cell.totalProjectedGoals ?? 0,
      csPct:
        cell.isDgw
          ? Math.min(100, cell.combinedAtLeastOneCsPct ?? 0)
          : (cell.fixtures[0]?.csPct ?? 0),
      winPct: cell.avgWinPct ?? 0,
    });
  }
  return rows;
}

function fixtureFdrScore(
  fx: ProjectionsTeamFixtureItem,
  mode: ProjectionsFdrMode,
): number {
  if (mode === "ATTACK") return fx.fdrAttack;
  if (mode === "DEFENCE") return fx.fdrDefence;
  return fx.fdrOverall;
}

function fixtureFdrLevel(
  fx: ProjectionsTeamFixtureItem,
  mode: ProjectionsFdrMode,
): ProjectionsFdrLevel {
  if (mode === "ATTACK") return fx.fdrLevelAttack;
  if (mode === "DEFENCE") return fx.fdrLevelDefence;
  return fx.fdrLevelOverall;
}

function formatFdrMetric(
  fx: ProjectionsTeamFixtureItem,
  metric: ProjectionsCellMetric,
  fdrMode: ProjectionsFdrMode,
  numberFormat: ProjectionsFdrNumberFormat,
): string {
  if (metric === "GOALS") return fx.projectedGoals.toFixed(2);
  if (metric === "CS_PCT") return `${Math.round(fx.csPct)}%`;
  if (metric === "WIN_PCT") return `${Math.round(fx.winPct)}%`;
  const score = fixtureFdrScore(fx, fdrMode);
  const level = fixtureFdrLevel(fx, fdrMode);
  if (numberFormat === "LEVEL_1_5") return String(level);
  return score.toFixed(0);
}

function formatAvgFdr(
  score: number | null,
  numberFormat: ProjectionsFdrNumberFormat,
): string {
  if (score == null || !Number.isFinite(score)) return "—";
  if (numberFormat === "LEVEL_1_5") {
    return Math.min(5, Math.max(1, score / 20 + 1)).toFixed(2);
  }
  return score.toFixed(1);
}

function avgFdrLevelFromScore(score: number | null): ProjectionsFdrLevel | null {
  if (score == null || !Number.isFinite(score)) return null;
  return fdrLevel(score);
}

function tickerLabel(
  fx: ProjectionsTeamFixtureItem,
  singleGw: boolean,
  lang: StatsLabLang,
): string {
  if (!singleGw) return fx.tickerLabelMatrix;
  return lang === "pl" ? fx.tickerLabelSingleGwPl : fx.tickerLabelSingleGwEn;
}

function teamAvgFdr(
  team: ProjectionsTeamRow,
  mode: ProjectionsFdrMode,
): number | null {
  if (mode === "ATTACK") return team.avgFdrAttack;
  if (mode === "DEFENCE") return team.avgFdrDefence;
  return team.avgFdrOverall;
}

function sortTeamsLocal(
  teams: ProjectionsTeamRow[],
  sortBy: LocalSortKey,
  sortDir: "asc" | "desc",
  gwCtx: GwSortContext,
): ProjectionsTeamRow[] {
  const dir = sortDir === "asc" ? 1 : -1;
  const gwKey = parseGwSortKey(sortBy);
  return [...teams].sort((a, b) => {
    if (a.matchesCount === 0 && b.matchesCount !== 0) return 1;
    if (b.matchesCount === 0 && a.matchesCount !== 0) return -1;

    const num = (v: number | null | undefined) =>
      v == null || !Number.isFinite(v) ? null : v;

    let av: number | null = null;
    let bv: number | null = null;

    if (gwKey != null) {
      av = num(cellValueForGwSort(a, gwKey, gwCtx));
      bv = num(cellValueForGwSort(b, gwKey, gwCtx));
      // BGW / pusta komórka zawsze na końcu (asc i desc)
      if (av == null && bv == null) {
        return a.shortName.localeCompare(b.shortName);
      }
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av === bv) return a.shortName.localeCompare(b.shortName);
      return (av - bv) * dir;
    }

    switch (sortBy) {
      case "avgFdrOverall":
        av = num(a.avgFdrOverall);
        bv = num(b.avgFdrOverall);
        break;
      case "avgFdrAttack":
        av = num(a.avgFdrAttack);
        bv = num(b.avgFdrAttack);
        break;
      case "avgFdrDefence":
        av = num(a.avgFdrDefence);
        bv = num(b.avgFdrDefence);
        break;
      case "totalProjectedGoals":
        av = a.totalProjectedGoals;
        bv = b.totalProjectedGoals;
        break;
      case "totalExpectedCleanSheets":
        av = a.totalExpectedCleanSheets;
        bv = b.totalExpectedCleanSheets;
        break;
      case "avgProjectedGoalsPerMatch":
        av = num(a.avgProjectedGoalsPerMatch);
        bv = num(b.avgProjectedGoalsPerMatch);
        break;
      case "avgCleanSheetPctPerMatch":
        av = num(a.avgCleanSheetPctPerMatch);
        bv = num(b.avgCleanSheetPctPerMatch);
        break;
      case "easeOverall":
        av = num(a.easeScoreOverall);
        bv = num(b.easeScoreOverall);
        break;
      case "shortName":
      default:
        return a.shortName.localeCompare(b.shortName) * dir;
    }

    if (av == null && bv == null) return a.shortName.localeCompare(b.shortName);
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av === bv) return a.shortName.localeCompare(b.shortName);
    return (av - bv) * dir;
  });
}

async function withFitExportWidth<T>(
  node: HTMLElement,
  run: () => Promise<T>,
): Promise<T> {
  const prev = {
    width: node.style.width,
    minWidth: node.style.minWidth,
    maxWidth: node.style.maxWidth,
  };
  const wrappers: Array<{
    el: HTMLElement;
    overflow: string;
    overflowX: string;
    overflowY: string;
  }> = [];
  try {
    const tableEl = node.querySelector("table");
    if (tableEl) {
      const fullTableWidth = Math.max(1200, tableEl.scrollWidth + 64);
      node.style.width = `${fullTableWidth}px`;
      node.style.minWidth = `${fullTableWidth}px`;
      node.style.maxWidth = "none";
      for (const el of Array.from(
        node.querySelectorAll<HTMLElement>(
          "[data-projections-table-wrap], .overflow-x-auto",
        ),
      )) {
        wrappers.push({
          el,
          overflow: el.style.overflow,
          overflowX: el.style.overflowX,
          overflowY: el.style.overflowY,
        });
        el.style.overflow = "visible";
        el.style.overflowX = "visible";
        el.style.overflowY = "visible";
      }
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
    }
    return await run();
  } finally {
    node.style.width = prev.width;
    node.style.minWidth = prev.minWidth;
    node.style.maxWidth = prev.maxWidth;
    for (const w of wrappers) {
      w.el.style.overflow = w.overflow;
      w.el.style.overflowX = w.overflowX;
      w.el.style.overflowY = w.overflowY;
    }
  }
}

async function captureProjectionsJpeg(
  node: HTMLElement,
  backgroundColor: string,
): Promise<string> {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }),
    ),
  );
  const opts = {
    quality: 0.95,
    pixelRatio: 2,
    backgroundColor,
    cacheBust: true,
    width: node.offsetWidth,
    height: node.offsetHeight,
    style: {
      transform: "none",
      overflow: "hidden",
      overflowX: "hidden",
      overflowY: "hidden",
    },
  };
  await toJpeg(node, opts);
  return await toJpeg(node, opts);
}

function ClubBadge({ pulseCode, size }: { pulseCode: number; size: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-white"
      style={{ width: size + 6, height: size + 6 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fplLabBadgeUrl(pulseCode)}
        alt=""
        width={size}
        height={size}
        className="object-contain"
        style={{ width: size, height: size }}
        crossOrigin="anonymous"
      />
    </span>
  );
}

function BlankPill({ isLight, label }: { isLight: boolean; label: string }) {
  return (
    <div
      className={`inline-flex min-w-[3.5rem] items-center justify-center rounded-lg border px-2 py-2 text-sm font-bold ${fdrPillClass(null, isLight, true)}`}
    >
      {label}
    </div>
  );
}

function MetricTile({
  fx,
  singleGw,
  lang,
  pillClass,
  metricText,
  cellLayout,
}: {
  fx: ProjectionsTeamFixtureItem;
  singleGw: boolean;
  lang: StatsLabLang;
  pillClass: string;
  metricText: string;
  cellLayout: ProjectionsCellLayout;
}) {
  const label = tickerLabel(fx, singleGw, lang);
  const badgeSize = cellLayout === "LARGE_BADGE" ? 28 : 20;
  return (
    <div
      className={`flex min-w-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 py-1 ${pillClass}`}
    >
      {cellLayout !== "TEXT_ONLY" ? (
        <ClubBadge pulseCode={fx.opponentPulseCode} size={badgeSize} />
      ) : null}
      <span className="whitespace-nowrap text-[11px] font-black leading-tight">
        {label}
      </span>
      <span className="whitespace-nowrap font-mono text-[10px] font-bold tabular-nums opacity-90">
        {metricText}
      </span>
    </div>
  );
}

const SUBVIEWS: ProjectionsSubView[] = [
  "FIXTURES_FDR",
  "PROJECTED_GOALS",
  "CLEAN_SHEETS",
  "MATCHUP_CARDS",
];
const RANGE_PRESET_LENS = [5, 6, 8, 10] as const;

export function StatsLabProjectionsClient({ lang, themeId }: Props) {
  const ui = projectionsUi(lang);
  const tokens = getThemeTokens(themeId);
  const surface = getSurface(themeId);
  const isLight = themeId === "ANALYST_LIGHT";
  const exportRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

  const [subView, setSubView] = useState<ProjectionsSubView>("FIXTURES_FDR");
  const [data, setData] = useState<StatsLabProjectionsActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [exportBusy, setExportBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const [startGw, setStartGw] = useState(1);
  const [endGw, setEndGw] = useState(6);
  const [hiddenGws, setHiddenGws] = useState<number[]>([]);
  const [fdrMode, setFdrMode] = useState<ProjectionsFdrMode>("OVERALL");
  const [cellMetric, setCellMetric] = useState<ProjectionsCellMetric>("FDR");
  const [venueFilter, setVenueFilter] =
    useState<ProjectionsVenueFilter>("ALL");
  const [cellLayout, setCellLayout] =
    useState<ProjectionsCellLayout>("TEXT_AND_BADGE");
  const [fdrNumberFormat, setFdrNumberFormat] =
    useState<ProjectionsFdrNumberFormat>("LEVEL_1_5");
  const [dgwCsDisplayMode, setDgwCsDisplayMode] =
    useState<ProjectionsDgwCsDisplayMode>("SPLIT_MATCHES");
  const [sortBy, setSortBy] = useState<LocalSortKey>("avgFdrOverall");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [customSubtitle, setCustomSubtitle] = useState("");
  const [rangeSeeded, setRangeSeeded] = useState(false);
  const [selectedMatchupGw, setSelectedMatchupGw] = useState(1);
  const [matchupDisplayMode, setMatchupDisplayMode] =
    useState<ProjectionsMatchupDisplayMode>("CARDS_GRID");
  const [matchupSort, setMatchupSort] =
    useState<ProjectionsMatchupSortKey>("KICKOFF");

  const reload = useCallback(
    (opts?: {
      startGw?: number;
      endGw?: number;
      hiddenGws?: number[];
      venueFilter?: ProjectionsVenueFilter;
      sortBy?: LocalSortKey;
      sortDir?: "asc" | "desc";
      forMatchupGw?: number;
    }) => {
      startTransition(async () => {
        try {
          setError(null);
          const sBy = opts?.sortBy ?? sortBy;
          const sDir = opts?.sortDir ?? sortDir;
          const matchupGw = opts?.forMatchupGw ?? selectedMatchupGw;
          const qStart =
            subView === "MATCHUP_CARDS"
              ? matchupGw
              : (opts?.startGw ?? startGw);
          const qEnd =
            subView === "MATCHUP_CARDS" ? matchupGw : (opts?.endGw ?? endGw);
          const next = await queryStatsLabProjectionsAction({
            startGw: qStart,
            endGw: qEnd,
            hiddenGws:
              subView === "MATCHUP_CARDS"
                ? []
                : (opts?.hiddenGws ?? hiddenGws),
            venueFilter:
              subView === "MATCHUP_CARDS"
                ? "ALL"
                : (opts?.venueFilter ?? venueFilter),
            sortBy: serverSortKey(sBy),
            sortDir: sDir,
          });
          setData(next);
          if (!rangeSeeded) {
            setStartGw(next.defaultStartGw);
            setEndGw(next.defaultEndGw);
            setSelectedMatchupGw(next.defaultStartGw);
            setRangeSeeded(true);
            if (subView !== "MATCHUP_CARDS") {
              if (
                next.defaultStartGw !== (opts?.startGw ?? startGw) ||
                next.defaultEndGw !== (opts?.endGw ?? endGw)
              ) {
                const seeded = await queryStatsLabProjectionsAction({
                  startGw: next.defaultStartGw,
                  endGw: next.defaultEndGw,
                  hiddenGws: opts?.hiddenGws ?? hiddenGws,
                  venueFilter: opts?.venueFilter ?? venueFilter,
                  sortBy: serverSortKey(sBy),
                  sortDir: sDir,
                });
                setData(seeded);
              }
            } else if (matchupGw !== next.defaultStartGw) {
              const seeded = await queryStatsLabProjectionsAction({
                startGw: next.defaultStartGw,
                endGw: next.defaultStartGw,
                hiddenGws: [],
                venueFilter: "ALL",
                sortBy: serverSortKey(sBy),
                sortDir: sDir,
              });
              setData(seeded);
            }
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : ui.error);
        }
      });
    },
    [
      endGw,
      hiddenGws,
      rangeSeeded,
      selectedMatchupGw,
      sortBy,
      sortDir,
      startGw,
      subView,
      ui.error,
      venueFilter,
    ],
  );

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!rangeSeeded) return;
    if (subView === "MATCHUP_CARDS") {
      reload({ forMatchupGw: selectedMatchupGw });
      return;
    }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    startGw,
    endGw,
    hiddenGws,
    venueFilter,
    sortBy,
    sortDir,
    subView,
    selectedMatchupGw,
  ]);

  // Sort by active FDR scale when fdrMode changes
  useEffect(() => {
    if (subView !== "FIXTURES_FDR") return;
    if (!isFdrSortKey(sortBy)) return;
    const nextKey = fdrSortKeyForMode(fdrMode);
    if (nextKey !== sortBy) {
      setSortBy(nextKey);
      setSortDir("asc");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fdrMode]);

  const teamsRaw = data?.teams ?? [];
  const gwSortCtx = useMemo<GwSortContext>(
    () => ({
      subView,
      cellMetric,
      fdrMode,
      dgwCsDisplayMode,
    }),
    [subView, cellMetric, fdrMode, dgwCsDisplayMode],
  );
  const teams = useMemo(
    () => sortTeamsLocal(teamsRaw, sortBy, sortDir, gwSortCtx),
    [teamsRaw, sortBy, sortDir, gwSortCtx],
  );
  const gameweeks = data?.gameweeks ?? [];
  const singleGw = gameweeks.length === 1;
  const gwRangeLabel = formatProjectionsGwRangeLabel(
    data?.startGw ?? startGw,
    data?.endGw ?? endGw,
  );

  const leagueAvg = useMemo(() => {
    const active = teams.filter((t) => t.matchesCount > 0);
    if (!active.length) {
      return {
        m: 0,
        fdr: null as number | null,
        goals: 0,
        cs: 0,
        avgGoals: null as number | null,
        avgCsPct: null as number | null,
        gwGoals: {} as Record<number, number | null>,
        gwCs: {} as Record<number, number | null>,
      };
    }
    const m = active.reduce((s, t) => s + t.matchesCount, 0) / active.length;
    const fdr =
      active.reduce((s, t) => s + (teamAvgFdr(t, fdrMode) ?? 0), 0) /
      active.length;
    const goals =
      active.reduce((s, t) => s + t.totalProjectedGoals, 0) / active.length;
    const cs =
      active.reduce((s, t) => s + t.totalExpectedCleanSheets, 0) /
      active.length;
    const avgGoals =
      active.reduce((s, t) => s + (t.avgProjectedGoalsPerMatch ?? 0), 0) /
      active.length;
    const avgCsPct =
      active.reduce((s, t) => s + (t.avgCleanSheetPctPerMatch ?? 0), 0) /
      active.length;

    const gwGoals: Record<number, number | null> = {};
    const gwCs: Record<number, number | null> = {};
    for (const gw of gameweeks) {
      let gSum = 0;
      let cSum = 0;
      let n = 0;
      for (const t of active) {
        const cell = t.cellsByGw[gw];
        if (!cell || cell.isBlank) continue;
        gSum += cell.totalProjectedGoals ?? 0;
        cSum +=
          dgwCsDisplayMode === "COMBINED_AT_LEAST_ONE" && cell.isDgw
            ? (cell.combinedAtLeastOneCsPct ?? 0)
            : (cell.totalExpectedCs ?? 0) * 100;
        n += 1;
      }
      gwGoals[gw] = n ? gSum / n : null;
      gwCs[gw] = n ? cSum / n : null;
    }

    return { m, fdr, goals, cs, avgGoals, avgCsPct, gwGoals, gwCs };
  }, [teams, fdrMode, gameweeks, dgwCsDisplayMode]);

  function applyPreset(len: 5 | 6 | 8 | 10) {
    const base = data?.defaultStartGw ?? startGw;
    setStartGw(base);
    setEndGw(Math.min(38, base + len - 1));
    setHiddenGws([]);
  }

  function applyTopAttacksPreset() {
    const base = data?.defaultStartGw ?? startGw;
    setStartGw(base);
    setEndGw(Math.min(38, base + 5));
    setHiddenGws([]);
    setVenueFilter("ALL");
    setSortBy("totalProjectedGoals");
    setSortDir("desc");
  }

  function applyTopDefencesPreset() {
    const base = data?.defaultStartGw ?? startGw;
    setStartGw(base);
    setEndGw(Math.min(38, base + 5));
    setHiddenGws([]);
    setVenueFilter("ALL");
    setSortBy("totalExpectedCleanSheets");
    setSortDir("desc");
  }

  function switchSubView(next: ProjectionsSubView) {
    setSubView(next);
    if (next === "PROJECTED_GOALS") {
      setSortBy("totalProjectedGoals");
      setSortDir("desc");
    } else if (next === "CLEAN_SHEETS") {
      setSortBy("totalExpectedCleanSheets");
      setSortDir("desc");
    } else if (next === "FIXTURES_FDR") {
      setSortBy(fdrSortKeyForMode(fdrMode));
      setSortDir("asc");
    } else if (next === "MATCHUP_CARDS") {
      setSelectedMatchupGw((gw) =>
        data?.defaultStartGw ? data.defaultStartGw : gw,
      );
      setMatchupDisplayMode("CARDS_GRID");
    }
  }

  function applyMatchupDisplayMode(mode: ProjectionsMatchupDisplayMode) {
    setMatchupDisplayMode(mode);
    if (mode !== "VERIFICATION") return;
    const preds = data?.matchupsByGw[selectedMatchupGw] ?? [];
    const hasFinished = preds.some(
      (p) => p.finished && p.verification != null,
    );
    const lastFin = data?.lastFinishedGw ?? 0;
    if (!hasFinished && lastFin >= 1) {
      setSelectedMatchupGw(lastFin);
    }
  }

  function toggleSort(key: LocalSortKey) {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      if (isFdrSortKey(key)) setSortDir("asc");
      else setSortDir("desc");
    }
  }

  function toggleGwSort(gw: number) {
    const key = gwSortKey(gw);
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(key);
    const defaultAsc = subView === "FIXTURES_FDR" && cellMetric === "FDR";
    setSortDir(defaultAsc ? "asc" : "desc");
  }

  function toggleHideGw(gw: number) {
    setHiddenGws((prev) => {
      const next = prev.includes(gw)
        ? prev.filter((x) => x !== gw)
        : [...prev, gw].sort((a, b) => a - b);
      return next;
    });
    if (sortBy === gwSortKey(gw)) {
      if (subView === "PROJECTED_GOALS") {
        setSortBy("totalProjectedGoals");
        setSortDir("desc");
      } else if (subView === "CLEAN_SHEETS") {
        setSortBy("totalExpectedCleanSheets");
        setSortDir("desc");
      } else {
        setSortBy(fdrSortKeyForMode(fdrMode));
        setSortDir("asc");
      }
    }
  }

  const matchupsRaw = data?.matchupsByGw[selectedMatchupGw] ?? [];
  const matchupsSorted = useMemo(
    () => sortMatchups(matchupsRaw, matchupSort),
    [matchupsRaw, matchupSort],
  );
  const posterRows = useMemo(
    () => buildPosterRows(teams, selectedMatchupGw, lang),
    [teams, selectedMatchupGw, lang],
  );

  const verificationKpi = useMemo(() => {
    const finished = matchupsRaw.filter((m) => m.verification != null);
    const total = matchupsRaw.length;
    const finishedCount = finished.length;
    const correct1X2 = finished.filter((m) => m.verification!.is1X2Correct)
      .length;
    const top3Hits = finished.filter((m) => m.verification!.isTop3ExactScoreHit)
      .length;
    let maeSum = 0;
    let brierSum = 0;
    for (const m of finished) {
      const v = m.verification!;
      maeSum +=
        (Math.abs(v.homeGoalsError) + Math.abs(v.awayGoalsError)) / 2;
      brierSum += v.brierScore1X2;
    }
    return {
      total,
      finishedCount,
      correct1X2,
      top3Hits,
      accuracyPct: finishedCount
        ? (correct1X2 / finishedCount) * 100
        : 0,
      top3Pct: finishedCount ? (top3Hits / finishedCount) * 100 : 0,
      mae: finishedCount ? maeSum / finishedCount : 0,
      brier: finishedCount ? brierSum / finishedCount : 0,
    };
  }, [matchupsRaw]);

  const autoSubtitle = useMemo(() => {
    if (subView === "MATCHUP_CARDS") {
      return `${PROJECTIONS_MATCHUP_MODE_LABELS[lang][matchupDisplayMode]} · GW${selectedMatchupGw}`;
    }
    if (subView === "PROJECTED_GOALS") {
      return `${PROJECTIONS_SUBVIEW_LABELS[lang].PROJECTED_GOALS} · ${gwRangeLabel}`;
    }
    if (subView === "CLEAN_SHEETS") {
      return `${PROJECTIONS_SUBVIEW_LABELS[lang].CLEAN_SHEETS} · ${gwRangeLabel}`;
    }
    const mode = PROJECTIONS_FDR_MODE_LABELS[lang][fdrMode];
    const metric = PROJECTIONS_CELL_METRIC_LABELS[lang][cellMetric];
    return `${ui.scaleLabel}: ${mode} · ${metric} · ${gwRangeLabel}`;
  }, [
    cellMetric,
    fdrMode,
    gwRangeLabel,
    lang,
    matchupDisplayMode,
    selectedMatchupGw,
    subView,
    ui.scaleLabel,
  ]);

  const posterTitle = useMemo(() => {
    if (subView === "MATCHUP_CARDS") {
      return `${PROJECTIONS_SUBVIEW_LABELS[lang].MATCHUP_CARDS} — GW${selectedMatchupGw}`;
    }
    if (subView === "PROJECTED_GOALS") {
      return `${PROJECTIONS_SUBVIEW_LABELS[lang].PROJECTED_GOALS} (${gwRangeLabel})`;
    }
    if (subView === "CLEAN_SHEETS") {
      return `${PROJECTIONS_SUBVIEW_LABELS[lang].CLEAN_SHEETS} (${gwRangeLabel})`;
    }
    return `${PROJECTIONS_SUBVIEW_LABELS[lang].FIXTURES_FDR} — ${ui.scaleLabel}: ${PROJECTIONS_FDR_MODE_LABELS[lang][fdrMode]} (${gwRangeLabel})`;
  }, [fdrMode, gwRangeLabel, lang, selectedMatchupGw, subView, ui.scaleLabel]);

  async function exportPair() {
    const node = exportRef.current;
    if (!node || !data) return;
    setExportBusy(true);
    setFlash(null);
    try {
      await withFitExportWidth(node, async () => {
        const report = buildProjectionsAiAuditReport({
          result: data,
          teamsOrdered: teams,
          subView,
          lang,
          themeId,
          seasonCode: data.seasonCode,
          lastSyncedAt: data.syncedAt,
          hiddenGameweeks: subView === "MATCHUP_CARDS" ? [] : hiddenGws,
          fdrMode,
          cellMetric,
          venueFilter,
          cellLayout,
          fdrNumberFormat,
          dgwCsDisplayMode,
          selectedMatchupGw:
            subView === "MATCHUP_CARDS" ? selectedMatchupGw : undefined,
          matchupDisplayMode:
            subView === "MATCHUP_CARDS" ? matchupDisplayMode : undefined,
          matchupsForAudit:
            subView === "MATCHUP_CARDS" ? matchupsSorted : undefined,
          sortBy:
            subView === "MATCHUP_CARDS" ? matchupSort : sortBy,
          sortDirection: sortDir,
          rootElement: node,
          controlsRootElement: controlsRef.current,
        });
        const base =
          subView === "MATCHUP_CARDS"
            ? `fpl-arena-projections-matchups-gw${selectedMatchupGw}-${matchupDisplayMode.toLowerCase()}-${lang}`
            : subView === "PROJECTED_GOALS"
              ? `fpl-arena-projections-goals-${lang}`
              : subView === "CLEAN_SHEETS"
                ? `fpl-arena-projections-cs-${lang}`
                : `fpl-arena-projections-fdr-${fdrMode.toLowerCase()}-${lang}`;
        const url = await captureProjectionsJpeg(node, surface.canvasBg);
        downloadDataUrl(url, `${base}.jpg`);
        downloadJsonFile(`${base}.json`, report);
      });
      setFlash("OK");
    } catch (e) {
      setError(e instanceof Error ? e.message : ui.error);
    } finally {
      setExportBusy(false);
    }
  }

  function SortBtn({
    label,
    title,
    activeKey,
  }: {
    label: string;
    title: string;
    activeKey: LocalSortKey;
  }) {
    const active = sortBy === activeKey;
    return (
      <button
        type="button"
        title={title}
        onClick={() => toggleSort(activeKey)}
        className={`inline-flex items-center gap-0.5 whitespace-nowrap rounded px-2 py-1 text-[12px] font-extrabold uppercase tracking-wider ${
          active ? `${surface.accentTextClass} font-black` : surface.mutedClass
        }`}
      >
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : null}
      </button>
    );
  }

  function renderFdrGwCell(team: ProjectionsTeamRow, gw: number) {
    const cell = team.cellsByGw[gw];
    if (!cell || cell.isBlank) {
      return <BlankPill isLight={isLight} label={ui.blankCell} />;
    }
    const tiles = cell.fixtures.map((fx) => (
      <MetricTile
        key={fx.fixtureId}
        fx={fx}
        singleGw={singleGw}
        lang={lang}
        cellLayout={cellLayout}
        pillClass={fdrPillClass(fixtureFdrLevel(fx, fdrMode), isLight)}
        metricText={formatFdrMetric(fx, cellMetric, fdrMode, fdrNumberFormat)}
      />
    ));
    if (cell.isDgw) {
      return (
        <div className="flex flex-col items-stretch gap-1">
          <span
            className={`self-center rounded px-1 text-[9px] font-black uppercase tracking-wider ${surface.accentTextClass}`}
          >
            {ui.dgwBadge}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-1">
            {tiles}
          </div>
        </div>
      );
    }
    return tiles[0] ?? <BlankPill isLight={isLight} label={ui.blankCell} />;
  }

  function renderGoalsGwCell(team: ProjectionsTeamRow, gw: number) {
    const cell = team.cellsByGw[gw];
    if (!cell || cell.isBlank) {
      return <BlankPill isLight={isLight} label={ui.blankCell} />;
    }
    if (cell.isDgw && cell.fixtures.length >= 2) {
      const parts = cell.fixtures
        .map(
          (fx) =>
            `${tickerLabel(fx, false, lang)} ${fx.projectedGoals.toFixed(2)}`,
        )
        .join(" + ");
      const total = cell.totalProjectedGoals ?? 0;
      return (
        <div
          className={`flex min-w-[7rem] flex-col items-center gap-0.5 rounded-lg border px-1.5 py-1 ${goalsPillClass(total / cell.fixtures.length, isLight)}`}
        >
          <span className={`text-[9px] font-black uppercase ${surface.accentTextClass}`}>
            {ui.dgwBadge}
          </span>
          <span className="whitespace-nowrap text-center text-[10px] font-bold leading-tight">
            {parts}
          </span>
          <span className="font-mono text-[11px] font-black tabular-nums">
            Σ {total.toFixed(2)}
          </span>
        </div>
      );
    }
    const fx = cell.fixtures[0];
    if (!fx) return <BlankPill isLight={isLight} label={ui.blankCell} />;
    return (
      <MetricTile
        fx={fx}
        singleGw={singleGw}
        lang={lang}
        cellLayout={cellLayout}
        pillClass={goalsPillClass(fx.projectedGoals, isLight)}
        metricText={fx.projectedGoals.toFixed(2)}
      />
    );
  }

  function renderCsGwCell(team: ProjectionsTeamRow, gw: number) {
    const cell = team.cellsByGw[gw];
    if (!cell || cell.isBlank) {
      return <BlankPill isLight={isLight} label={ui.blankCell} />;
    }
    if (cell.isDgw && cell.fixtures.length >= 2) {
      if (dgwCsDisplayMode === "COMBINED_AT_LEAST_ONE") {
        const pct = Math.min(100, cell.combinedAtLeastOneCsPct ?? 0);
        return (
          <div
            className={`flex min-w-[5rem] flex-col items-center gap-0.5 rounded-lg border px-1.5 py-1 ${csPillClass(pct, isLight)}`}
          >
            <span className={`text-[9px] font-black uppercase ${surface.accentTextClass}`}>
              {ui.dgwBadge}
            </span>
            <span className="whitespace-nowrap text-[10px] font-bold">≥1 CS</span>
            <span className="font-mono text-[11px] font-black tabular-nums">
              {pct.toFixed(1)}%
            </span>
          </div>
        );
      }
      return (
        <div className="flex flex-col items-stretch gap-1">
          <span
            className={`self-center rounded px-1 text-[9px] font-black uppercase tracking-wider ${surface.accentTextClass}`}
          >
            {ui.dgwBadge}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-1">
            {cell.fixtures.map((fx) => (
              <MetricTile
                key={fx.fixtureId}
                fx={fx}
                singleGw={singleGw}
                lang={lang}
                cellLayout={cellLayout}
                pillClass={csPillClass(fx.csPct, isLight)}
                metricText={`${fx.csPct.toFixed(1)}%`}
              />
            ))}
          </div>
        </div>
      );
    }
    const fx = cell.fixtures[0];
    if (!fx) return <BlankPill isLight={isLight} label={ui.blankCell} />;
    return (
      <MetricTile
        fx={fx}
        singleGw={singleGw}
        lang={lang}
        cellLayout={cellLayout}
        pillClass={csPillClass(fx.csPct, isLight)}
        metricText={`${fx.csPct.toFixed(1)}%`}
      />
    );
  }

  const formattedSync =
    data?.syncedAt &&
    data.syncedAt.trim() !== "" &&
    data.syncedAt !== "—"
      ? new Date(data.syncedAt).toLocaleString(
          lang === "pl" ? "pl-PL" : "en-GB",
        )
      : null;
  const isExporting = exportBusy;

  const showTable =
    subView === "FIXTURES_FDR" ||
    subView === "PROJECTED_GOALS" ||
    subView === "CLEAN_SHEETS";

  const lastFinishedGw = data?.lastFinishedGw ?? 0;
  const upcomingGw = data?.defaultStartGw ?? selectedMatchupGw;

  function venueTag(shortName: string, home: boolean): string {
    const s = shortName.toUpperCase();
    if (lang === "pl") return `${s} (${home ? "D" : "W"})`;
    return `${s} (${home ? "H" : "A"})`;
  }

  function renderMatchupCard(m: ProjectionsFixturePrediction, verifyMode: boolean) {
    const homeTag = venueTag(m.homeShortName, true);
    const awayTag = venueTag(m.awayShortName, false);
    const predicted1X2 =
      m.verification?.predictedOutcome1X2 ??
      (m.winPctHome >= m.drawPct && m.winPctHome >= m.winPctAway
        ? "1"
        : m.drawPct >= m.winPctAway
          ? "X"
          : "2");
    const wH = Math.max(0, m.winPctHome);
    const wD = Math.max(0, m.drawPct);
    const wA = Math.max(0, m.winPctAway);
    const sum = wH + wD + wA || 1;

    return (
      <div
        key={m.fixtureId}
        className={`rounded-2xl border p-4 ${surface.borderClass}`}
        style={{ background: isLight ? "#FFFFFF" : surface.rowEven }}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex items-center gap-2">
            <ClubBadge pulseCode={m.homePulseCode} size={40} />
            <div>
              <p className={`whitespace-nowrap text-[14px] font-bold ${surface.textClass}`}>
                {m.homeName}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className={`text-[11px] font-black ${surface.mutedClass}`}>
                  {homeTag}
                </span>
                <span
                  className={fdrMatchupBadgeClass(
                    m.fdrHome.levelOverall,
                    isLight,
                  )}
                >
                  FDR {m.fdrHome.levelOverall}
                </span>
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className={`text-[10px] font-black uppercase tracking-wider ${surface.mutedClass}`}>
              {ui.projectedGoalsLabel}
            </p>
            <p className={`mt-1 whitespace-nowrap text-[22px] font-black tabular-nums ${surface.textClass}`}>
              {m.lambdaHome.toFixed(2)}
              <span className={`mx-1 ${surface.mutedClass}`}>:</span>
              {m.lambdaAway.toFixed(2)}
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <div className="text-right">
              <p className={`whitespace-nowrap text-[14px] font-bold ${surface.textClass}`}>
                {m.awayName}
              </p>
              <div className="mt-1 flex flex-wrap items-center justify-end gap-1.5">
                <span
                  className={fdrMatchupBadgeClass(
                    m.fdrAway.levelOverall,
                    isLight,
                  )}
                >
                  FDR {m.fdrAway.levelOverall}
                </span>
                <span className={`text-[11px] font-black ${surface.mutedClass}`}>
                  {awayTag}
                </span>
              </div>
            </div>
            <ClubBadge pulseCode={m.awayPulseCode} size={40} />
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="flex flex-wrap justify-between gap-2 text-[10px] font-bold">
            <span className="text-emerald-500">
              1 ({m.homeShortName}): {m.winPctHome.toFixed(1)}%
            </span>
            <span className={surface.mutedClass}>
              X ({ui.drawLabel}): {m.drawPct.toFixed(1)}%
            </span>
            <span className="text-sky-500">
              2 ({m.awayShortName}): {m.winPctAway.toFixed(1)}%
            </span>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-500/20">
            <div
              className="h-full bg-emerald-500"
              style={{
                width: `${(wH / sum) * 100}%`,
                minWidth: wH > 0 ? 8 : 0,
              }}
            />
            <div
              className="h-full bg-slate-400"
              style={{
                width: `${(wD / sum) * 100}%`,
                minWidth: wD > 0 ? 8 : 0,
              }}
            />
            <div
              className="h-full bg-sky-500"
              style={{
                width: `${(wA / sum) * 100}%`,
                minWidth: wA > 0 ? 8 : 0,
              }}
            />
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`text-[10px] font-bold uppercase ${surface.mutedClass}`}>
              {ui.csPctLabel}
            </span>
            <div className="flex gap-1.5">
              <span className={`rounded border px-2 py-0.5 font-mono text-[11px] font-bold ${csPillClass(m.csPctHome, isLight)}`}>
                {m.csPctHome.toFixed(1)}%
              </span>
              <span className={`rounded border px-2 py-0.5 font-mono text-[11px] font-bold ${csPillClass(m.csPctAway, isLight)}`}>
                {m.csPctAway.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`text-[10px] font-bold uppercase ${surface.mutedClass}`}>
              {ui.twoPlusLabel}
            </span>
            <div className="flex gap-1.5">
              <span className={`rounded border px-2 py-0.5 font-mono text-[11px] font-bold ${winPillClass(m.twoPlusGoalsPctHome, isLight)}`}>
                {m.twoPlusGoalsPctHome.toFixed(1)}%
              </span>
              <span className={`rounded border px-2 py-0.5 font-mono text-[11px] font-bold ${winPillClass(m.twoPlusGoalsPctAway, isLight)}`}>
                {m.twoPlusGoalsPctAway.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <p className={`mb-1.5 text-[10px] font-black uppercase tracking-wider ${surface.accentTextClass}`}>
            {ui.topExactScores}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {m.topExactScores.map((t, i) => {
              const hit =
                verifyMode &&
                m.verification?.isTop3ExactScoreHit &&
                m.verification.matchedExactScoreRank === i + 1;
              return (
                <span
                  key={`${t.scoreLabel}-${i}`}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-black tabular-nums ${
                    hit
                      ? isLight
                        ? "border-amber-500 bg-amber-200 text-amber-950"
                        : "border-amber-400/50 bg-amber-500/30 text-amber-100"
                      : isLight
                        ? "border-slate-300 bg-slate-100 text-slate-900"
                        : "border-slate-500/30 bg-slate-500/20 text-slate-100"
                  }`}
                >
                  #{i + 1} {t.scoreLabel} ({t.pct.toFixed(1)}%)
                </span>
              );
            })}
          </div>
        </div>

        {!verifyMode && m.finished && m.verification ? (
          <p className={`mt-2 text-[11px] font-bold ${surface.mutedClass}`}>
            {ui.ftBadge}: {m.verification.actualScoreLabel}
          </p>
        ) : null}

        {verifyMode ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div
              className={`rounded-xl border p-3 ${
                isLight ? "border-emerald-300 bg-emerald-50" : "border-emerald-500/30 bg-emerald-500/10"
              }`}
            >
              <p className={`text-[10px] font-black uppercase ${surface.accentTextClass}`}>
                {ui.predBeforeDeadline}
              </p>
              <p className={`mt-1 text-[18px] font-black tabular-nums ${surface.textClass}`}>
                {m.lambdaHome.toFixed(2)} : {m.lambdaAway.toFixed(2)}
              </p>
              <p className={`mt-1 text-[11px] font-bold ${surface.mutedClass}`}>
                {ui.favourite}: {predicted1X2}
              </p>
            </div>
            <div
              className={`rounded-xl border p-3 ${
                isLight ? "border-slate-300 bg-white" : "border-slate-500/30 bg-slate-500/10"
              }`}
            >
              <p className={`text-[10px] font-black uppercase ${surface.mutedClass}`}>
                {ui.actualFt}
              </p>
              {m.verification ? (
                <>
                  <p className={`mt-1 text-[22px] font-black tabular-nums ${surface.textClass}`}>
                    {m.verification.actualHomeGoals} : {m.verification.actualAwayGoals}
                  </p>
                  <p className={`mt-1 text-[11px] font-bold ${surface.mutedClass}`}>
                    1X2: {m.verification.actualOutcome1X2}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${
                        m.verification.is1X2Correct
                          ? isLight
                            ? "border-emerald-600 bg-emerald-500 text-white"
                            : "border-emerald-400/50 bg-emerald-500/30 text-emerald-100"
                          : isLight
                            ? "border-amber-500 bg-amber-200 text-amber-950"
                            : "border-amber-400/40 bg-amber-500/25 text-amber-200"
                      }`}
                    >
                      {m.verification.is1X2Correct ? ui.hit1x2 : ui.miss1x2}
                    </span>
                    {m.verification.isTop3ExactScoreHit &&
                    m.verification.matchedExactScoreRank ? (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${
                          isLight
                            ? "border-amber-500 bg-amber-300 text-amber-950"
                            : "border-amber-400/50 bg-amber-500/30 text-amber-100"
                        }`}
                      >
                        {ui.hitExact(m.verification.matchedExactScoreRank)}
                      </span>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className={`mt-2 text-[12px] font-semibold ${surface.mutedClass}`}>
                  {ui.pendingMatch}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  function renderPosterColumn(
    title: string,
    rows: PosterTeamRow[],
    metric: "goals" | "cs" | "win",
  ) {
    const sorted = [...rows].sort((a, b) => {
      const av = metric === "goals" ? a.goals : metric === "cs" ? a.csPct : a.winPct;
      const bv = metric === "goals" ? b.goals : metric === "cs" ? b.csPct : b.winPct;
      return bv - av || a.shortName.localeCompare(b.shortName);
    });
    return (
      <div className={`rounded-2xl border p-3 ${surface.borderClass}`} style={{ background: surface.rowOdd }}>
        <p className={`mb-3 text-center text-[12px] font-black uppercase tracking-wider ${surface.accentTextClass}`}>
          {title}
        </p>
        <div className="space-y-1.5">
          {sorted.map((row, idx) => {
            const pill =
              metric === "goals"
                ? goalsPillClass(row.goals, isLight)
                : metric === "cs"
                  ? csPillClass(row.csPct, isLight)
                  : winPillClass(row.winPct, isLight);
            const value =
              metric === "goals"
                ? row.goals.toFixed(2)
                : `${(metric === "cs" ? row.csPct : row.winPct).toFixed(1)}%`;
            return (
              <div
                key={`${metric}-${row.teamId}`}
                className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 ${surface.borderClass}`}
                style={{ background: isLight ? "#FFFFFF" : surface.rowEven }}
              >
                <span className={`w-5 text-center text-[11px] font-black tabular-nums ${surface.accentTextClass}`}>
                  {idx + 1}
                </span>
                <ClubBadge pulseCode={row.pulseCode} size={28} />
                <div className="min-w-0 flex-1">
                  <p
                    className={`whitespace-nowrap text-[13px] font-bold leading-tight ${surface.textClass}`}
                  >
                    {row.name}
                  </p>
                  <p
                    className={`whitespace-nowrap text-[10px] font-semibold ${surface.mutedClass}`}
                  >
                    vs {row.opponentLabel}
                  </p>
                </div>
                <span className={`rounded border px-2 py-0.5 font-mono text-[11px] font-black tabular-nums ${pill}`}>
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderMatchupPosterBody() {
    if (!matchupsSorted.length && matchupDisplayMode !== "POSTER_3COL") {
      return (
        <p className={`px-6 py-16 text-center text-sm ${surface.mutedClass}`}>
          {pending ? ui.loading : ui.noMatchups}
        </p>
      );
    }
    if (matchupDisplayMode === "POSTER_3COL") {
      return (
        <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-3">
          {renderPosterColumn(ui.posterColGoals(selectedMatchupGw), posterRows, "goals")}
          {renderPosterColumn(ui.posterColCs(selectedMatchupGw), posterRows, "cs")}
          {renderPosterColumn(ui.posterColWin(selectedMatchupGw), posterRows, "win")}
        </div>
      );
    }
    if (matchupDisplayMode === "VERIFICATION") {
      return (
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: ui.kpiFinished,
                value: `${verificationKpi.finishedCount} / ${verificationKpi.total}`,
              },
              {
                label: ui.kpi1x2,
                value: `${verificationKpi.correct1X2}/${verificationKpi.finishedCount} (${verificationKpi.accuracyPct.toFixed(1)}%)`,
              },
              {
                label: ui.kpiTop3,
                value: `${verificationKpi.top3Hits}/${verificationKpi.finishedCount} (${verificationKpi.top3Pct.toFixed(1)}%)`,
              },
              {
                label: ui.kpiMae,
                value: `${verificationKpi.mae.toFixed(2)} · ${ui.kpiBrier} ${verificationKpi.brier.toFixed(3)}`,
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className={`rounded-xl border px-3 py-2 ${surface.borderClass}`}
                style={{ background: isLight ? "#FFFFFF" : surface.rowEven }}
              >
                <p className={`text-[10px] font-black uppercase tracking-wider ${surface.mutedClass}`}>
                  {kpi.label}
                </p>
                <p className={`mt-1 whitespace-nowrap text-[14px] font-black tabular-nums ${surface.strongTextClass}`}>
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {matchupsSorted.map((m) => renderMatchupCard(m, true))}
          </div>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2">
        {matchupsSorted.map((m) => renderMatchupCard(m, false))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div ref={controlsRef} className="space-y-4">
      <div
        className={menuTabsBarClass(themeId)}
      >
        {SUBVIEWS.map((sv) => (
          <button
            key={sv}
            type="button"
            onClick={() => switchSubView(sv)}
            className={`rounded-xl px-3 py-2 text-[10px] uppercase tracking-wider ${controlTabClass(subView === sv, themeId)}`}
          >
            {PROJECTIONS_SUBVIEW_LABELS[lang][sv]}
          </button>
        ))}
      </div>

      {!showTable ? (
          <div className={`space-y-3 ${menuPanelClass(themeId)}`}>
            <div className="flex flex-wrap items-end gap-3">
              <label className={`text-[10px] font-black uppercase ${tokens.textMuted}`}>
                {ui.matchupGw}
                <select
                  value={selectedMatchupGw}
                  onChange={(e) => setSelectedMatchupGw(Number(e.target.value))}
                  className={controlSelectClass(themeId)}
                >
                  {Array.from({ length: 38 }, (_, i) => i + 1).map((g) => (
                    <option
                      key={g}
                      value={g}
                      className={controlOptionClass(themeId)}
                    >
                      GW{g}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={lastFinishedGw < 1}
                  onClick={() => setSelectedMatchupGw(lastFinishedGw)}
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] uppercase tracking-wider disabled:opacity-40 ${controlTabClass(false, themeId)}`}
                >
                  {ui.matchupPrevFinished(lastFinishedGw || 1)}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMatchupGw(upcomingGw)}
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] uppercase tracking-wider ${controlTabClass(false, themeId)}`}
                >
                  {ui.matchupUpcoming(upcomingGw)}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedMatchupGw((g) => Math.min(38, g + 1))
                  }
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] uppercase tracking-wider ${controlTabClass(false, themeId)}`}
                >
                  {ui.matchupNext}
                </button>
              </div>
            </div>

            <SegControl
              label={ui.matchupMode}
              value={matchupDisplayMode}
              options={(
                ["CARDS_GRID", "POSTER_3COL", "VERIFICATION"] as const
              ).map((k) => ({
                value: k,
                label: PROJECTIONS_MATCHUP_MODE_LABELS[lang][k],
              }))}
              onChange={applyMatchupDisplayMode}
              tokens={tokens}
                isLight={isLight}
                themeId={themeId}
            />

            {(matchupDisplayMode === "CARDS_GRID" ||
              matchupDisplayMode === "VERIFICATION") && (
              <SegControl
                label={ui.matchupSort}
                value={matchupSort}
                options={(
                  ["KICKOFF", "TOTAL_GOALS_DESC", "FAVOURITE_WIN_DESC"] as const
                ).map((k) => ({
                  value: k,
                  label: PROJECTIONS_MATCHUP_SORT_LABELS[lang][k],
                }))}
                onChange={setMatchupSort}
                tokens={tokens}
                isLight={isLight}
                themeId={themeId}
              />
            )}

            <label className={`text-[10px] font-black uppercase ${tokens.textMuted}`}>
              {ui.customSubtitle}
              <input
                value={customSubtitle}
                onChange={(e) => setCustomSubtitle(e.target.value)}
                placeholder={ui.customSubtitlePh}
                className={controlInputClass(themeId)}
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={exportBusy || (!matchupsSorted.length && matchupDisplayMode !== "POSTER_3COL")}
                onClick={() => void exportPair()}
                className={exportButtonClass(themeId)}
              >
                {exportBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {ui.exportPair}
              </button>
              {pending ? (
                <span className={`inline-flex items-center gap-1 text-[10px] ${tokens.textMuted}`}>
                  <Loader2 className="h-3 w-3 animate-spin" /> {ui.loading}
                </span>
              ) : null}
              {flash ? (
                <span className="text-[10px] font-semibold text-emerald-600">OK</span>
              ) : null}
            </div>
          </div>
      ) : (
          <div className={`space-y-3 ${menuPanelClass(themeId)}`}>
            {(subView === "PROJECTED_GOALS" || subView === "CLEAN_SHEETS") && (
              <div className="flex flex-wrap gap-2">
                {subView === "PROJECTED_GOALS" ? (
                  <button
                    type="button"
                    onClick={applyTopAttacksPreset}
                    className={accentActionButtonClass(themeId)}
                  >
                    {ui.topAttacksPreset}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={applyTopDefencesPreset}
                    className={accentActionButtonClass(themeId)}
                  >
                    {ui.topDefencesPreset}
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-end gap-3">
              <label
                className={`text-[10px] font-black uppercase ${tokens.textMuted}`}
              >
                {ui.fromGw}
                <select
                  value={startGw}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setStartGw(v);
                    if (endGw < v) setEndGw(v);
                  }}
                  className={controlSelectClass(themeId)}
                >
                  {Array.from({ length: 38 }, (_, i) => i + 1).map((g) => (
                    <option
                      key={g}
                      value={g}
                      className={controlOptionClass(themeId)}
                    >
                      GW{g}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className={`text-[10px] font-black uppercase ${tokens.textMuted}`}
              >
                {ui.toGw}
                <select
                  value={endGw}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setEndGw(Math.max(startGw, v));
                  }}
                  className={controlSelectClass(themeId)}
                >
                  {Array.from({ length: 38 }, (_, i) => i + 1).map((g) => (
                    <option
                      key={g}
                      value={g}
                      disabled={g < startGw}
                      className={controlOptionClass(themeId)}
                    >
                      GW{g}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {RANGE_PRESET_LENS.map((len) => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => applyPreset(len)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] uppercase tracking-wider ${controlTabClass(false, themeId)}`}
                  >
                    <CalendarRange className="h-3 w-3" />
                    {PROJECTIONS_RANGE_PRESETS[lang][len]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {subView === "FIXTURES_FDR" ? (
                <>
                  <SegControl
                    label={ui.fdrMode}
                    value={fdrMode}
                    options={(["OVERALL", "ATTACK", "DEFENCE"] as const).map(
                      (k) => ({
                        value: k,
                        label: PROJECTIONS_FDR_MODE_LABELS[lang][k],
                      }),
                    )}
                    onChange={setFdrMode}
                    tokens={tokens}
                isLight={isLight}
                themeId={themeId}
                  />
                  <SegControl
                    label={ui.cellMetric}
                    value={cellMetric}
                    options={(
                      ["FDR", "GOALS", "CS_PCT", "WIN_PCT"] as const
                    ).map((k) => ({
                      value: k,
                      label: PROJECTIONS_CELL_METRIC_LABELS[lang][k],
                    }))}
                    onChange={setCellMetric}
                    tokens={tokens}
                isLight={isLight}
                themeId={themeId}
                  />
                  <SegControl
                    label={ui.fdrNumberFormat}
                    value={fdrNumberFormat}
                    options={(["LEVEL_1_5", "SCORE_0_100"] as const).map(
                      (k) => ({
                        value: k,
                        label: PROJECTIONS_FDR_NUMBER_FORMAT_LABELS[lang][k],
                      }),
                    )}
                    onChange={setFdrNumberFormat}
                    tokens={tokens}
                isLight={isLight}
                themeId={themeId}
                  />
                </>
              ) : null}

              {subView === "CLEAN_SHEETS" ? (
                <SegControl
                  label={ui.dgwCsMode}
                  value={dgwCsDisplayMode}
                  options={(
                    ["SPLIT_MATCHES", "COMBINED_AT_LEAST_ONE"] as const
                  ).map((k) => ({
                    value: k,
                    label: PROJECTIONS_DGW_CS_MODE_LABELS[lang][k],
                  }))}
                  onChange={setDgwCsDisplayMode}
                  tokens={tokens}
                isLight={isLight}
                themeId={themeId}
                />
              ) : null}

              <SegControl
                label={ui.venueFilter}
                value={venueFilter}
                options={(["ALL", "HOME_ONLY", "AWAY_ONLY"] as const).map(
                  (k) => ({
                    value: k,
                    label: PROJECTIONS_VENUE_FILTER_LABELS[lang][k],
                  }),
                )}
                onChange={setVenueFilter}
                tokens={tokens}
                isLight={isLight}
                themeId={themeId}
              />
              <SegControl
                label={ui.cellLayout}
                value={cellLayout}
                options={(
                  ["TEXT_ONLY", "TEXT_AND_BADGE", "LARGE_BADGE"] as const
                ).map((k) => ({
                  value: k,
                  label: PROJECTIONS_CELL_LAYOUT_LABELS[lang][k],
                }))}
                onChange={setCellLayout}
                tokens={tokens}
                isLight={isLight}
                themeId={themeId}
              />
              <label
                className={`text-[10px] font-black uppercase ${tokens.textMuted}`}
              >
                {ui.customSubtitle}
                <input
                  value={customSubtitle}
                  onChange={(e) => setCustomSubtitle(e.target.value)}
                  placeholder={ui.customSubtitlePh}
                  className={controlInputClass(themeId)}
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={exportBusy || !teams.length}
                onClick={() => void exportPair()}
                className={exportButtonClass(themeId)}
              >
                {exportBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {ui.exportPair}
              </button>
              {pending ? (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] ${tokens.textMuted}`}
                >
                  <Loader2 className="h-3 w-3 animate-spin" /> {ui.loading}
                </span>
              ) : null}
              {flash ? (
                <span className="text-[10px] font-semibold text-emerald-600">
                  {flash}
                </span>
              ) : null}
              {data ? (
                <span
                  className={`text-[10px] font-bold ${
                    data.qaSelfCheck.passed
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}
                >
                  {data.qaSelfCheck.passed ? ui.qaPass : ui.qaFail}
                </span>
              ) : null}
            </div>
          </div>
      )}
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {showTable && hiddenGws.length > 0 ? (
        <div
          className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 ${
            isLight
              ? "border-slate-300 bg-slate-100"
              : themeId === "SCOUT_DARK"
                ? "border-teal-800 bg-[#0d2d37]"
                : "border-slate-700 bg-slate-900"
          }`}
        >
          <span
            className={`text-[10px] font-black uppercase ${tokens.textMuted}`}
          >
            {ui.hiddenGws}:
          </span>
          {hiddenGws.map((gw) => (
            <button
              key={gw}
              type="button"
              onClick={() => toggleHideGw(gw)}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${
                isLight
                  ? "border-amber-500 bg-amber-100 text-amber-950"
                  : "border-amber-500/40 bg-amber-500/15 text-amber-200"
              }`}
            >
              GW{gw} ×
            </button>
          ))}
          <button
            type="button"
            onClick={() => setHiddenGws([])}
            className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase ${tokens.accentText}`}
          >
            {ui.restoreAllGws}
          </button>
        </div>
      ) : null}

      {!showTable ? (
          <div
            ref={exportRef}
            className={`overflow-hidden rounded-2xl border ${surface.borderClass}`}
            style={{ background: surface.canvasBg }}
          >
            <div className={`flex items-center gap-3 border-b px-5 py-4 ${surface.borderClass}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ARENA_PORTAL_LOGO}
                alt={ARENA_PORTAL_ALT}
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
                crossOrigin="anonymous"
              />
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${surface.accentTextClass}`}>
                  {ui.posterEyebrow}
                </p>
                <p className={`text-[22px] font-black tracking-tight ${surface.textClass}`}>
                  {posterTitle}
                </p>
                {customSubtitle.trim() ? (
                  <p className={`mt-0.5 text-[14px] font-semibold ${surface.textClass}`}>
                    {customSubtitle.trim()}
                  </p>
                ) : null}
                <p className={`mt-0.5 text-[13px] font-medium ${surface.mutedClass}`}>
                  {autoSubtitle}
                </p>
              </div>
            </div>

            {renderMatchupPosterBody()}

            <div className={`space-y-3 border-t px-5 py-4 ${surface.borderClass}`}>
              <div
                className={`rounded-xl border px-3 py-2.5 ${
                  isLight
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-emerald-500/30 bg-emerald-500/10"
                }`}
              >
                <p className={`text-[12px] font-black ${isLight ? "text-emerald-900" : "text-emerald-200"}`}>
                  {ui.credibilityLine1}
                </p>
                <p className={`mt-1 text-[11px] font-semibold ${isLight ? "text-emerald-800" : "text-emerald-100/80"}`}>
                  {ui.credibilityLine2({
                    syncedAt: formattedSync,
                    season: data?.seasonCode ?? "—",
                    gwRangeLabel: `GW${selectedMatchupGw}`,
                  })}
                </p>
              </div>
              <p className={`text-center text-[11px] font-bold tracking-wide ${surface.mutedClass}`}>
                {ui.brandFooter}
              </p>
            </div>
          </div>
      ) : (
          <div
            ref={exportRef}
            className={`overflow-hidden rounded-2xl border ${surface.borderClass}`}
            style={{ background: surface.canvasBg }}
          >
            <div
              className={`flex items-center gap-3 border-b px-5 py-4 ${surface.borderClass}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ARENA_PORTAL_LOGO}
                alt={ARENA_PORTAL_ALT}
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
                crossOrigin="anonymous"
              />
              <div>
                <p
                  className={`text-[11px] font-bold uppercase tracking-[0.2em] ${surface.accentTextClass}`}
                >
                  {ui.posterEyebrow}
                </p>
                <p
                  className={`text-[22px] font-black tracking-tight ${surface.textClass}`}
                >
                  {posterTitle}
                </p>
                {customSubtitle.trim() ? (
                  <p
                    className={`mt-0.5 text-[14px] font-semibold ${surface.textClass}`}
                  >
                    {customSubtitle.trim()}
                  </p>
                ) : null}
                <p
                  className={`mt-0.5 text-[13px] font-medium ${surface.mutedClass}`}
                >
                  {autoSubtitle}
                </p>
              </div>
            </div>

            <div
              className="overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              data-projections-table-wrap
            >
              {!data || teams.length === 0 ? (
                <p
                  className={`px-6 py-16 text-center text-sm ${surface.mutedClass}`}
                >
                  {pending ? ui.loading : ui.empty}
                </p>
              ) : (
                <table className="min-w-full border-collapse text-left">
                  <thead>
                    <tr
                      className={`border-b ${surface.borderClass}`}
                      style={{ background: surface.headBg }}
                    >
                      <th
                        className={`sticky left-0 z-20 w-9 whitespace-nowrap border-r px-2.5 py-3 text-[12px] font-extrabold uppercase tracking-wider ${surface.stickyBorderClass} ${surface.mutedClass}`}
                        style={{ background: surface.headBg }}
                      >
                        #
                      </th>
                      <th
                        className={`sticky z-20 whitespace-nowrap border-r px-3 py-3 text-[12px] font-extrabold uppercase tracking-wider ${surface.stickyBorderClass} ${surface.textClass}`}
                        style={{ background: surface.headBg, left: 36 }}
                      >
                        {ui.colClub}
                      </th>
                      <th className="px-2 py-3">
                        <span
                          className={`whitespace-nowrap text-[12px] font-extrabold uppercase ${surface.mutedClass}`}
                          title={ui.colMFull}
                        >
                          {ui.colM}
                        </span>
                      </th>

                      {subView === "FIXTURES_FDR" ? (
                        <>
                          <th className="px-1.5 py-3">
                            <SortBtn
                              label={ui.colAvgFdr}
                              title={ui.colAvgFdrFull}
                              activeKey={fdrSortKeyForMode(fdrMode)}
                            />
                          </th>
                          <th className="px-1.5 py-3">
                            <SortBtn
                              label={ui.colGoals}
                              title={ui.colGoalsFull}
                              activeKey="totalProjectedGoals"
                            />
                          </th>
                          <th className="px-1.5 py-3">
                            <SortBtn
                              label={ui.colCs}
                              title={ui.colCsFull}
                              activeKey="totalExpectedCleanSheets"
                            />
                          </th>
                        </>
                      ) : null}

                      {subView === "PROJECTED_GOALS" ? (
                        <th className="px-1.5 py-3">
                          <SortBtn
                            label={ui.colAvgPerMatch}
                            title={ui.colAvgPerMatchFull}
                            activeKey="avgProjectedGoalsPerMatch"
                          />
                        </th>
                      ) : null}

                      {subView === "CLEAN_SHEETS" ? (
                        <th className="px-1.5 py-3">
                          <SortBtn
                            label={ui.colAvgCsPct}
                            title={ui.colAvgCsPctFull}
                            activeKey="avgCleanSheetPctPerMatch"
                          />
                        </th>
                      ) : null}

                      {gameweeks.map((gw) => {
                        const gwKey = gwSortKey(gw);
                        const active = sortBy === gwKey;
                        return (
                          <th
                            key={gw}
                            className="min-h-[28px] px-1.5 py-3 text-center"
                          >
                            <div className="inline-flex min-h-[28px] items-center justify-center gap-1">
                              <button
                                type="button"
                                title={
                                  lang === "pl"
                                    ? `Sortuj po GW${gw}`
                                    : `Sort by GW${gw}`
                                }
                                onClick={() => toggleGwSort(gw)}
                                className={`inline-flex items-center gap-0.5 whitespace-nowrap rounded px-1.5 py-1 text-[12px] font-extrabold uppercase tracking-wider ${
                                  active
                                    ? `${surface.accentTextClass} font-black`
                                    : surface.mutedClass
                                } hover:brightness-125`}
                              >
                                GW{gw}
                                {active ? (
                                  sortDir === "asc" ? (
                                    <ArrowUp className="h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="h-3 w-3" />
                                  )
                                ) : null}
                              </button>
                              {gameweeks.length > 1 && !isExporting ? (
                                <button
                                  type="button"
                                  title={
                                    lang === "pl"
                                      ? `Ukryj GW${gw}`
                                      : `Hide GW${gw}`
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleHideGw(gw);
                                  }}
                                  className={`inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-black leading-none ${
                                    isLight
                                      ? "text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                  }`}
                                >
                                  ×
                                </button>
                              ) : null}
                            </div>
                          </th>
                        );
                      })}

                      {subView === "PROJECTED_GOALS" ? (
                        <th className="px-1.5 py-3">
                          <SortBtn
                            label={ui.colTotal}
                            title={ui.colTotalFull}
                            activeKey="totalProjectedGoals"
                          />
                        </th>
                      ) : null}
                      {subView === "CLEAN_SHEETS" ? (
                        <th className="px-1.5 py-3">
                          <SortBtn
                            label={ui.colTotalCs}
                            title={ui.colTotalCsFull}
                            activeKey="totalExpectedCleanSheets"
                          />
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team, idx) => {
                      const rowBg =
                        idx % 2 === 0 ? surface.rowOdd : surface.rowEven;
                      const avgScore = teamAvgFdr(team, fdrMode);
                      const avgLvl = avgFdrLevelFromScore(avgScore);
                      return (
                        <tr
                          key={team.teamId}
                          className={`border-b ${surface.borderClass}`}
                          style={{ background: rowBg }}
                        >
                          <td
                            className={`sticky left-0 z-10 border-r px-2.5 py-2.5 text-center text-[13px] font-black tabular-nums ${surface.stickyBorderClass} ${surface.accentTextClass}`}
                            style={{ background: rowBg }}
                          >
                            {idx + 1}
                          </td>
                          <td
                            className={`sticky z-10 border-r px-3 py-2.5 ${surface.stickyBorderClass}`}
                            style={{ background: rowBg, left: 36 }}
                          >
                            <div className="flex items-center gap-2.5">
                              <ClubBadge pulseCode={team.pulseCode} size={40} />
                              <div>
                                <p
                                  className={`whitespace-nowrap text-[15px] font-bold leading-tight ${surface.textClass}`}
                                >
                                  {team.name}
                                </p>
                                <p
                                  className={`whitespace-nowrap text-[11px] font-bold uppercase ${surface.mutedClass}`}
                                >
                                  {team.shortName}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <span
                              className={`font-mono text-[13px] font-bold tabular-nums ${surface.textClass}`}
                            >
                              {team.matchesCount}
                            </span>
                          </td>

                          {subView === "FIXTURES_FDR" ? (
                            <>
                              <td className="px-1.5 py-2.5 text-center">
                                <span
                                  className={`inline-flex min-w-[3.25rem] items-center justify-center rounded-md border px-2 py-1 font-mono text-[12px] font-bold tabular-nums ${fdrPillClass(avgLvl, isLight, team.matchesCount === 0)}`}
                                >
                                  {formatAvgFdr(avgScore, fdrNumberFormat)}
                                </span>
                              </td>
                              <td className="px-1.5 py-2.5 text-center">
                                <span
                                  className={`font-mono text-[13px] font-bold tabular-nums ${surface.textClass}`}
                                >
                                  {team.totalProjectedGoals.toFixed(2)}
                                </span>
                              </td>
                              <td className="px-1.5 py-2.5 text-center">
                                <span
                                  className={`font-mono text-[13px] font-bold tabular-nums ${surface.textClass}`}
                                >
                                  {team.totalExpectedCleanSheets.toFixed(2)}
                                </span>
                              </td>
                            </>
                          ) : null}

                          {subView === "PROJECTED_GOALS" ? (
                            <td className="px-1.5 py-2.5 text-center">
                              <span
                                className={`font-mono text-[13px] font-bold tabular-nums ${surface.textClass}`}
                              >
                                {(team.avgProjectedGoalsPerMatch ?? 0).toFixed(
                                  2,
                                )}
                              </span>
                            </td>
                          ) : null}

                          {subView === "CLEAN_SHEETS" ? (
                            <td className="px-1.5 py-2.5 text-center">
                              <span
                                className={`font-mono text-[13px] font-bold tabular-nums ${surface.textClass}`}
                              >
                                {(team.avgCleanSheetPctPerMatch ?? 0).toFixed(1)}
                                %
                              </span>
                            </td>
                          ) : null}

                          {gameweeks.map((gw) => (
                            <td
                              key={gw}
                              className="px-1 py-2 text-center align-middle"
                            >
                              {subView === "FIXTURES_FDR"
                                ? renderFdrGwCell(team, gw)
                                : subView === "PROJECTED_GOALS"
                                  ? renderGoalsGwCell(team, gw)
                                  : renderCsGwCell(team, gw)}
                            </td>
                          ))}

                          {subView === "PROJECTED_GOALS" ? (
                            <td className="px-1.5 py-2.5 text-center">
                              <span
                                className={`inline-flex min-w-[3.5rem] items-center justify-center rounded-md border px-2 py-1 font-mono text-[13px] font-black tabular-nums ${
                                  isLight
                                    ? "border-emerald-600 bg-emerald-500 text-white"
                                    : "border-emerald-400/50 bg-emerald-500/30 text-emerald-100"
                                }`}
                              >
                                {team.totalProjectedGoals.toFixed(2)}
                              </span>
                            </td>
                          ) : null}
                          {subView === "CLEAN_SHEETS" ? (
                            <td className="px-1.5 py-2.5 text-center">
                              <span
                                className={`inline-flex min-w-[3.5rem] items-center justify-center rounded-md border px-2 py-1 font-mono text-[13px] font-black tabular-nums ${
                                  isLight
                                    ? "border-emerald-600 bg-emerald-500 text-white"
                                    : "border-emerald-400/50 bg-emerald-500/30 text-emerald-100"
                                }`}
                              >
                                {team.totalExpectedCleanSheets.toFixed(2)}
                              </span>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}

                    <tr
                      className={`border-t-2 ${surface.borderClass}`}
                      style={{ background: surface.headBg }}
                    >
                      <td
                        colSpan={2}
                        className={`sticky left-0 z-10 border-r px-3 py-3 text-[12px] font-black uppercase tracking-wider ${surface.stickyBorderClass} ${surface.accentTextClass}`}
                        style={{ background: surface.headBg }}
                      >
                        {ui.leagueAvg}
                      </td>
                      <td
                        className={`px-2 py-3 text-center font-mono text-[12px] tabular-nums ${surface.strongTextClass}`}
                      >
                        {leagueAvg.m.toFixed(1)}
                      </td>

                      {subView === "FIXTURES_FDR" ? (
                        <>
                          <td className="px-1.5 py-3 text-center">
                            <span
                              className={`inline-flex min-w-[3.25rem] items-center justify-center rounded-md border px-2 py-1 font-mono text-[12px] font-bold tabular-nums ${fdrPillClass(avgFdrLevelFromScore(leagueAvg.fdr), isLight, leagueAvg.fdr == null)}`}
                            >
                              {formatAvgFdr(leagueAvg.fdr, fdrNumberFormat)}
                            </span>
                          </td>
                          <td
                            className={`px-1.5 py-3 text-center font-mono text-[12px] tabular-nums ${surface.strongTextClass}`}
                          >
                            {leagueAvg.goals.toFixed(2)}
                          </td>
                          <td
                            className={`px-1.5 py-3 text-center font-mono text-[12px] tabular-nums ${surface.strongTextClass}`}
                          >
                            {leagueAvg.cs.toFixed(2)}
                          </td>
                        </>
                      ) : null}

                      {subView === "PROJECTED_GOALS" ? (
                        <td
                          className={`px-1.5 py-3 text-center font-mono text-[12px] tabular-nums ${surface.strongTextClass}`}
                        >
                          {(leagueAvg.avgGoals ?? 0).toFixed(2)}
                        </td>
                      ) : null}
                      {subView === "CLEAN_SHEETS" ? (
                        <td
                          className={`px-1.5 py-3 text-center font-mono text-[12px] tabular-nums ${surface.strongTextClass}`}
                        >
                          {(leagueAvg.avgCsPct ?? 0).toFixed(1)}%
                        </td>
                      ) : null}

                      {gameweeks.map((gw) => (
                        <td
                          key={gw}
                          className={`px-1 py-3 text-center font-mono text-[11px] tabular-nums ${surface.strongTextClass}`}
                        >
                          {subView === "PROJECTED_GOALS"
                            ? leagueAvg.gwGoals[gw] != null
                              ? leagueAvg.gwGoals[gw]!.toFixed(2)
                              : "—"
                            : subView === "CLEAN_SHEETS"
                              ? leagueAvg.gwCs[gw] != null
                                ? `${leagueAvg.gwCs[gw]!.toFixed(1)}%`
                                : "—"
                              : null}
                        </td>
                      ))}

                      {subView === "PROJECTED_GOALS" ? (
                        <td
                          className={`px-1.5 py-3 text-center font-mono text-[12px] tabular-nums ${surface.strongTextClass}`}
                        >
                          {leagueAvg.goals.toFixed(2)}
                        </td>
                      ) : null}
                      {subView === "CLEAN_SHEETS" ? (
                        <td
                          className={`px-1.5 py-3 text-center font-mono text-[12px] tabular-nums ${surface.strongTextClass}`}
                        >
                          {leagueAvg.cs.toFixed(2)}
                        </td>
                      ) : null}
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            <div
              className={`space-y-3 border-t px-5 py-4 ${surface.borderClass}`}
            >
              <div className="flex flex-wrap gap-2">
                {(
                  subView === "FIXTURES_FDR"
                    ? [
                        { k: ui.colM, v: ui.colMFull },
                        { k: ui.colAvgFdr, v: ui.colAvgFdrFull },
                        { k: ui.colGoals, v: ui.colGoalsFull },
                        { k: ui.colCs, v: ui.colCsFull },
                      ]
                    : subView === "PROJECTED_GOALS"
                      ? [
                          { k: ui.colM, v: ui.colMFull },
                          { k: ui.colAvgPerMatch, v: ui.colAvgPerMatchFull },
                          { k: ui.colTotal, v: ui.colTotalFull },
                        ]
                      : [
                          { k: ui.colM, v: ui.colMFull },
                          { k: ui.colAvgCsPct, v: ui.colAvgCsPctFull },
                          { k: ui.colTotalCs, v: ui.colTotalCsFull },
                        ]
                ).map((p) => (
                  <span
                    key={p.k}
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${surface.borderClass} ${surface.mutedClass}`}
                  >
                    <span className={surface.accentTextClass}>{p.k}</span>
                    {" · "}
                    {p.v}
                  </span>
                ))}
              </div>

              {subView === "FIXTURES_FDR" ? (
                <div className="flex flex-wrap gap-1.5">
                  {([1, 2, 3, 4, 5] as const).map((lvl) => (
                    <span
                      key={lvl}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold ${fdrPillClass(lvl, isLight)}`}
                    >
                      {lvl} = {PROJECTIONS_FDR_LEVEL_LABELS[lang][lvl]}
                    </span>
                  ))}
                </div>
              ) : null}

              {subView === "PROJECTED_GOALS" ? (
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["elite", 2.5],
                      ["good", 1.8],
                      ["avg", 1.4],
                      ["low", 1.0],
                      ["vlow", 0.5],
                    ] as const
                  ).map(([key, sample]) => (
                    <span
                      key={key}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold ${goalsPillClass(sample, isLight)}`}
                    >
                      {PROJECTIONS_GOALS_BAND_LABELS[lang][key]}
                    </span>
                  ))}
                </div>
              ) : null}

              {subView === "CLEAN_SHEETS" ? (
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["elite", 45],
                      ["good", 35],
                      ["avg", 25],
                      ["low", 18],
                      ["vlow", 10],
                    ] as const
                  ).map(([key, sample]) => (
                    <span
                      key={key}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold ${csPillClass(sample, isLight)}`}
                    >
                      {PROJECTIONS_CS_BAND_LABELS[lang][key]}
                    </span>
                  ))}
                </div>
              ) : null}

              <p className={`text-[11px] font-semibold ${surface.mutedClass}`}>
                {ui.venueLegend}
              </p>

              <div
                className={`rounded-xl border px-3 py-2.5 ${
                  isLight
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-emerald-500/30 bg-emerald-500/10"
                }`}
              >
                <p
                  className={`text-[12px] font-black ${
                    isLight ? "text-emerald-900" : "text-emerald-200"
                  }`}
                >
                  {ui.credibilityLine1}
                </p>
                <p
                  className={`mt-1 text-[11px] font-semibold ${
                    isLight ? "text-emerald-800" : "text-emerald-100/80"
                  }`}
                >
                  {ui.credibilityLine2({
                    syncedAt: formattedSync,
                    season: data?.seasonCode ?? "—",
                    gwRangeLabel,
                  })}
                </p>
              </div>

              <p
                className={`text-center text-[11px] font-bold tracking-wide ${surface.mutedClass}`}
              >
                {ui.brandFooter}
              </p>
            </div>
          </div>
      )}
    </div>
  );
}

function SegControl<T extends string>({
  label,
  value,
  options,
  onChange,
  tokens,
  themeId,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
  tokens: ReturnType<typeof getThemeTokens>;
  isLight?: boolean;
  themeId: StatsLabChartThemeId;
}) {
  return (
    <div>
      <p className={`mb-1 text-[10px] font-black uppercase ${tokens.textMuted}`}>
        {label}
      </p>
      <div className={segGroupClass(themeId)}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-lg px-2.5 py-1.5 text-[10px] uppercase tracking-wider ${controlTabClass(value === opt.value, themeId)}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
