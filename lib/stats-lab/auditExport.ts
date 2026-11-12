/**
 * FPL Arena: Stats Lab — uniwersalny eksport diagnostyczno-audytowy dla AI.
 * Chart Studio + Stats Centre (+ przyszłe moduły).
 */

import type {
  PlottedStatsLabPlayer,
  StatsLabComparisonResult,
} from "@/lib/stats-lab/analyticsEngine";
import type { StatsLabQueryFilter } from "@/lib/stats-lab/presets";
import type { StatsLabLang, StatsLabScaleMode } from "@/lib/stats-lab/i18n";
import type { StreakMetricKey } from "@/lib/stats-lab/i18n";
import type {
  FplPointsBreakdown,
  FplStatKey,
  MatchByMatchTraceEntry,
  PlayerStreaks,
} from "@/lib/stats-lab/types";
import type {
  StatsLabChartThemeId,
  StatsLabVizMode,
} from "@/components/admin/stats-lab/chartTheme";
import type {
  StatsCentreFilter,
  StatsCentreResult,
  StatsCentreRow,
} from "@/lib/stats-lab/statsCentreEngine";
import {
  centreColFullLabel,
  centreColShort,
} from "@/lib/stats-lab/statsCentreI18n";

export type StatsLabAuditModule = "CHART_STUDIO" | "STATS_CENTRE";

export type StatsLabAuditSubView =
  | StatsLabVizMode
  | "PLAYERS"
  | "PER_GW"
  | "TEAMS"
  | string;

export type LayoutDiagnostics = {
  canvasBoundingBox: { width: number; height: number };
  truncatedOrOverflowingElements: Array<{
    tag: string;
    text: string;
    scrollWidth: number;
    clientWidth: number;
    scrollHeight: number;
    clientHeight: number;
  }>;
  overlappingLabels: Array<{
    a: { tag: string; text: string };
    b: { tag: string; text: string };
    overlapPx: number;
  }>;
  zeroWidthSegments: Array<{
    tag: string;
    className: string;
    width: number;
    text: string;
  }>;
};

export type PointsBreakdownAudit = {
  appearanceBasePts: number;
  sixtyPlusPts: number;
  goalPts: number;
  assistPts: number;
  cleanSheetPts: number;
  dcPts: number;
  savePts: number;
  penaltySavePts: number;
  bonusPts: number;
  gcPenalty: number;
  ycPenalty: number;
  rcPenalty: number;
  penMissPenalty: number;
  ogPenalty: number;
  grossPositivePoints: number;
  totalNegativePoints: number;
  netTotalPoints: number;
  isBalancedWithOfficialTotal: boolean;
};

export type DisplayedEntityAudit = {
  rankOnView: number;
  identity: {
    fplElementId: number;
    playerCode: number;
    webName: string;
    clubShortName: string;
    position: number;
    priceMillion: number;
    ownershipPct: number;
    minutes: number;
    starts: number;
    officialTotalPoints: number;
  };
  renderedMetrics: {
    rawValues: Record<string, number>;
    displayValues: Record<string, number>;
    percentiles: Record<string, number>;
    compositeScore: number;
  };
  pointsBreakdownAudit: PointsBreakdownAudit;
  streaksAudit: PlayerStreaks;
  matchByMatchTrace: MatchByMatchTraceEntry[];
};

export type StatsLabAiAuditReport = {
  meta: {
    exportedAt: string;
    module: StatsLabAuditModule;
    subView: StatsLabAuditSubView;
    lang: StatsLabLang;
    chartTheme: StatsLabChartThemeId | "N/A";
    seasonCode: string;
    effectiveGwRange: [number, number];
  };
  activeCriteriaAndFilters: Record<string, unknown>;
  algorithmSpecification: Record<string, string>;
  poolContext: {
    comparisonPoolSize: number;
    poolAverages: Record<string, number>;
  };
  displayedEntities: DisplayedEntityAudit[] | StatsCentreRow[];
  layoutDiagnostics: LayoutDiagnostics;
  /** Dodatkowy kontekst dla Stats Centre (kolumny / strona). */
  centreTableContext?: {
    columns: Array<{
      key: string;
      label?: string;
      fullLabel?: string;
      format?: string;
    }>;
    page: number;
    pageSize: number;
    totalRows: number;
    visibleRowCount: number;
  };
};

function rectsOverlap(
  a: DOMRect,
  b: DOMRect,
): { overlap: boolean; area: number } {
  const xOverlap = Math.max(
    0,
    Math.min(a.right, b.right) - Math.max(a.left, b.left),
  );
  const yOverlap = Math.max(
    0,
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
  );
  const area = xOverlap * yOverlap;
  return { overlap: area > 4, area };
}

/**
 * Skaner geometrii DOM — ucięte teksty, kolizje etykiet, wąskie segmenty.
 */
export function inspectCanvasLayoutDom(
  rootElement: HTMLElement | null,
): LayoutDiagnostics {
  if (!rootElement || typeof window === "undefined") {
    return {
      canvasBoundingBox: { width: 0, height: 0 },
      truncatedOrOverflowingElements: [],
      overlappingLabels: [],
      zeroWidthSegments: [],
    };
  }

  const box = rootElement.getBoundingClientRect();
  const truncatedOrOverflowingElements: LayoutDiagnostics["truncatedOrOverflowingElements"] =
    [];
  const textNodes = Array.from(
    rootElement.querySelectorAll<HTMLElement>(
      "p, span, h1, h2, h3, h4, label, td, th, div, text, tspan",
    ),
  );

  for (const el of textNodes) {
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!text || text.length < 2) continue;
    const sw = el.scrollWidth;
    const cw = el.clientWidth;
    const sh = el.scrollHeight;
    const ch = el.clientHeight;
    if (sw > cw + 2 || sh > ch + 2) {
      truncatedOrOverflowingElements.push({
        tag: el.tagName.toLowerCase(),
        text: text.slice(0, 120),
        scrollWidth: sw,
        clientWidth: cw,
        scrollHeight: sh,
        clientHeight: ch,
      });
    }
  }

  const labelEls = Array.from(
    rootElement.querySelectorAll<HTMLElement>(
      "text, [data-player-label], [data-axis-label], .recharts-label, .recharts-cartesian-axis-tick-value",
    ),
  );
  const overlappingLabels: LayoutDiagnostics["overlappingLabels"] = [];
  const rects = labelEls
    .map((el) => {
      const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (!text) return null;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return null;
      return { el, text, r };
    })
    .filter(Boolean) as Array<{ el: HTMLElement; text: string; r: DOMRect }>;

  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      const hit = rectsOverlap(rects[i].r, rects[j].r);
      if (hit.overlap) {
        overlappingLabels.push({
          a: {
            tag: rects[i].el.tagName.toLowerCase(),
            text: rects[i].text.slice(0, 80),
          },
          b: {
            tag: rects[j].el.tagName.toLowerCase(),
            text: rects[j].text.slice(0, 80),
          },
          overlapPx: Math.round(hit.area),
        });
      }
    }
  }

  const zeroWidthSegments: LayoutDiagnostics["zeroWidthSegments"] = [];
  const segmentCandidates = Array.from(
    rootElement.querySelectorAll<HTMLElement>(
      "[data-bar-segment], .recharts-bar-rectangle, [data-streak-bar], [data-points-segment]",
    ),
  );
  for (const el of segmentCandidates) {
    const w = el.getBoundingClientRect().width;
    const text = (el.getAttribute("data-value") ?? el.textContent ?? "")
      .toString()
      .trim();
    const numericHint = Number(text);
    const looksNonZero =
      (Number.isFinite(numericHint) && numericHint !== 0) ||
      el.getAttribute("data-nonzero") === "1";
    if (looksNonZero && w > 0 && w < 24) {
      zeroWidthSegments.push({
        tag: el.tagName.toLowerCase(),
        className: el.className?.toString?.().slice(0, 120) ?? "",
        width: Math.round(w * 10) / 10,
        text: text.slice(0, 40),
      });
    }
  }

  return {
    canvasBoundingBox: {
      width: Math.round(box.width),
      height: Math.round(box.height),
    },
    truncatedOrOverflowingElements: truncatedOrOverflowingElements.slice(0, 80),
    overlappingLabels: overlappingLabels.slice(0, 40),
    zeroWidthSegments: zeroWidthSegments.slice(0, 40),
  };
}

export function mapPointsBreakdownAudit(
  bd: FplPointsBreakdown,
  officialTotalPoints: number,
): PointsBreakdownAudit {
  const pos = bd.positiveBreakdown;
  const neg = bd.negativeBreakdown;
  const net = Number(bd.estimatedTotal ?? 0);
  const official = Number(officialTotalPoints ?? 0);
  return {
    appearanceBasePts: Number(pos.appearanceBasePts ?? 0),
    sixtyPlusPts: Number(pos.sixtyPlusPts ?? 0),
    goalPts: Number(pos.goalPts ?? 0),
    assistPts: Number(pos.assistPts ?? 0),
    cleanSheetPts: Number(pos.cleanSheetPts ?? 0),
    dcPts: Number(pos.dcPts ?? 0),
    savePts: Number(pos.savePts ?? 0),
    penaltySavePts: Number(pos.penaltySavePts ?? 0),
    bonusPts: Number(pos.bonusPts ?? 0),
    gcPenalty: Number(neg.goalsConcededDeduction ?? 0),
    ycPenalty: Number(neg.yellowCardDeduction ?? 0),
    rcPenalty: Number(neg.redCardDeduction ?? 0),
    penMissPenalty: Number(neg.penaltyMissDeduction ?? 0),
    ogPenalty: Number(neg.ownGoalDeduction ?? 0),
    grossPositivePoints: Number(bd.positiveTotal ?? 0),
    totalNegativePoints: Number(bd.negativeTotal ?? 0),
    netTotalPoints: net,
    isBalancedWithOfficialTotal: Math.abs(net - official) < 0.01,
  };
}

function chartStudioAlgorithmSpec(input: {
  vizMode: StatsLabVizMode;
  filter: StatsLabQueryFilter;
  scaleMode: StatsLabScaleMode;
  streakSortKey?: StreakMetricKey;
}): Record<string, string> {
  const { vizMode, filter, scaleMode, streakSortKey } = input;
  const useComposite = filter.sortByComposite === true;
  const useRaw =
    filter.sortByRawValues === true ||
    vizMode === "POINTS_BREAKDOWN" ||
    filter.per90 !== true;
  const valueLane = useRaw ? "rawValues" : "displayValues";

  const sortingCascade =
    vizMode === "STREAKS_EXPLORER" && streakSortKey
      ? `1) ${streakSortKey} ${filter.sortDirection} → 2) returnConsistencyPct DESC → 3) returnsCount DESC → 4) maxReturnStreak DESC → 5) currentReturnStreak DESC → 6) total_points DESC; TOP N requires minAppearances = max(4, ceil(periodGws*0.65)) when auto Top N`
      : vizMode === "POINTS_BREAKDOWN"
        ? `1) official FPL match totals (pointsBreakdown.estimatedTotal / rawValues.total_points) ${filter.sortDirection} on FULL comparisonPool — Per90 NEVER affects order → 2) compositeScore tie-break only → 3) slice Top N; chart + audit.json share identical order`
        : useComposite
          ? `1) compositeScore ${filter.sortDirection} on FULL comparisonPool → 2) total_points tie-break → 3) slice Top N; NO post-slice reshuffle; RADAR_PIZZA displays max 4; scaleMode=${scaleMode}; sortByComposite=true`
          : `1) ${valueLane}[${filter.sortByStat}] ${filter.sortDirection} on FULL comparisonPool → 2) compositeScore tie-break only → 3) slice Top N; preserve sortByStat order (sortByComposite=false; no composite reshuffle); RADAR_PIZZA displays max 4; scaleMode=${scaleMode}`;

  return {
    fplReturnFormula:
      "hasReturn = goalHit || assistHit || csReturnHit || dcBonusHit || gkSaveHit || penSaveHit || bonusHit; csReturnHit ONLY for GK/DEF (CS + minutes>=60); appearance/60+ mins NEVER count; MID +1 CS is NOT a return",
    dcThresholdRule:
      "DEF: CBI + Tackles >= 10 (+2 pts); MID/FWD: CBI + Tackles + Recoveries >= 12 (+2 pts); GK: N/A (never DC)",
    compositeScoreFormula:
      "Arithmetic mean of position-peer percentiles (0-100) across activeMetrics (with invertScale for GC, xGC, YC, RC, PM)",
    pointsBreakdownReconciliation:
      "Exact match-by-match scoring reconciled 1:1 with official total_points (estimatedTotal vs sum of GW total_points)",
    sortingCascade,
    scaleMode,
    vizMode,
  };
}

export function buildChartStudioAiAuditReport(input: {
  result: StatsLabComparisonResult;
  filter: StatsLabQueryFilter;
  vizMode: StatsLabVizMode;
  lang: StatsLabLang;
  chartTheme: StatsLabChartThemeId;
  scaleMode: StatsLabScaleMode;
  seasonCode: string;
  activeStreakKeys?: StreakMetricKey[];
  showNegativeBreakdown?: boolean;
  streakSortKey?: StreakMetricKey;
  /** Osie Scatter 2D (UI state — nie są częścią StatsLabQueryFilter). */
  scatterAxisX?: FplStatKey | null;
  scatterAxisY?: FplStatKey | null;
  rootElement?: HTMLElement | null;
}): StatsLabAiAuditReport {
  const {
    result,
    filter,
    vizMode,
    lang,
    chartTheme,
    scaleMode,
    seasonCode,
    activeStreakKeys = [],
    showNegativeBreakdown = true,
    streakSortKey,
    scatterAxisX = null,
    scatterAxisY = null,
    rootElement = null,
  } = input;

  // RADAR_PIZZA: audyt = dokładnie gracze narysowani (MAX 4) — 100% WYSIWYG
  const entitiesSource =
    vizMode === "RADAR_PIZZA"
      ? result.plottedPlayers.slice(0, 4)
      : result.plottedPlayers;
  const displayedEntities: DisplayedEntityAudit[] = entitiesSource.map(
    (p, idx) => playerToDisplayedEntity(p, idx + 1),
  );

  return {
    meta: {
      exportedAt: new Date().toISOString(),
      module: "CHART_STUDIO",
      subView: vizMode,
      lang,
      chartTheme,
      seasonCode,
      effectiveGwRange: result.effectiveGwRange,
    },
    activeCriteriaAndFilters: {
      period: filter.period,
      positions: filter.positions,
      clubIds: filter.clubIds,
      per90: filter.per90,
      scaleMode,
      minMinutes: filter.minMinutes,
      maxCostTenths: filter.maxCostTenths ?? null,
      maxOwnershipPct: filter.maxOwnershipPct ?? null,
      selectedPlayerIds: filter.selectedPlayerIds,
      limitPlayers: filter.limitPlayers,
      sortByStat:
        vizMode === "POINTS_BREAKDOWN" ? "total_points" : filter.sortByStat,
      sortDirection: filter.sortDirection,
      sortByComposite:
        vizMode === "POINTS_BREAKDOWN" || vizMode === "STREAKS_EXPLORER"
          ? false
          : filter.sortByComposite === true,
      sortByRawValues:
        vizMode === "POINTS_BREAKDOWN" ? true : filter.sortByRawValues === true,
      streakSortKey: streakSortKey ?? filter.streakSortKey ?? null,
      breakdownSortKey: filter.breakdownSortKey ?? null,
      activeMetrics: result.activeMetrics?.length
        ? result.activeMetrics
        : filter.activeMetrics,
      selectedStreakKeys: activeStreakKeys,
      showNegativeBreakdown,
      scatterAxisX:
        vizMode === "SCATTER_2D" ? (scatterAxisX ?? null) : null,
      scatterAxisY:
        vizMode === "SCATTER_2D" ? (scatterAxisY ?? null) : null,
    },
    algorithmSpecification: chartStudioAlgorithmSpec({
      vizMode,
      filter,
      scaleMode,
      streakSortKey: streakSortKey ?? filter.streakSortKey,
    }),
    poolContext: {
      comparisonPoolSize: result.poolSize,
      poolAverages: result.poolAverages as Record<string, number>,
    },
    displayedEntities,
    layoutDiagnostics: inspectCanvasLayoutDom(rootElement),
  };
}

function playerToDisplayedEntity(
  p: PlottedStatsLabPlayer,
  rankOnView: number,
): DisplayedEntityAudit {
  const official = Number(p.rawValues.total_points ?? 0);
  return {
    rankOnView,
    identity: {
      fplElementId: p.fpl_element_id,
      playerCode: Number(p.playerCode ?? p.player_code ?? 0),
      webName: p.web_name,
      clubShortName: p.club?.short_name ?? "—",
      position: p.element_type,
      priceMillion: Number(p.rawValues.now_cost ?? 0) / 10,
      ownershipPct: Number(p.rawValues.selected_by_percent ?? 0),
      minutes: Number(p.minutes ?? p.rawValues.minutes ?? 0),
      starts: Number(p.rawValues.starts ?? 0),
      officialTotalPoints: official,
    },
    renderedMetrics: {
      rawValues: p.rawValues as Record<string, number>,
      displayValues: p.displayValues as Record<string, number>,
      percentiles: p.percentiles as Record<string, number>,
      compositeScore: p.compositeScore,
    },
    pointsBreakdownAudit: mapPointsBreakdownAudit(p.pointsBreakdown, official),
    streaksAudit: p.streaks,
    matchByMatchTrace: p.matchTrace ?? [],
  };
}

export function buildStatsCentreAiAuditReport(input: {
  filter: StatsCentreFilter;
  result: StatsCentreResult;
  pageRows: StatsCentreRow[];
  page: number;
  pageSize: number;
  lang: StatsLabLang;
  chartTheme: StatsLabChartThemeId;
  seasonCode: string;
  rootElement?: HTMLElement | null;
}): StatsLabAiAuditReport {
  const {
    filter,
    result,
    pageRows,
    page,
    pageSize,
    lang,
    chartTheme,
    seasonCode,
    rootElement = null,
  } = input;

  const gwLo = Math.max(1, filter.gwFrom ?? 1);
  const gwHi = Math.max(gwLo, filter.gwTo ?? result.maxGw ?? gwLo);
  const poolAveragesNumeric: Record<string, number> = {};
  for (const [k, v] of Object.entries(result.poolAverages ?? {})) {
    if (typeof v === "number" && Number.isFinite(v)) poolAveragesNumeric[k] = v;
  }

  return {
    meta: {
      exportedAt: new Date().toISOString(),
      module: "STATS_CENTRE",
      subView: filter.centreMode,
      lang,
      chartTheme,
      seasonCode,
      effectiveGwRange: [gwLo, gwHi],
    },
    activeCriteriaAndFilters: {
      ...filter,
      activeTab:
        filter.centreMode === "TEAMS"
          ? filter.teamTab
          : filter.centreMode === "PLAYERS"
            ? filter.playerTab
            : "PER_GW",
      visibleColumns: result.columns.map((c) => c.key),
    },
    algorithmSpecification: {
      centreMode: filter.centreMode,
      rangeMode: filter.rangeMode,
      sortingCascade: `sortKey=${filter.sortKey} ${filter.sortDir}`,
      colourScale:
        "Per-column min-max colour norms (invertScale for GC/cards/penalties)",
      note: "Stats Centre rows are aggregated table cells; Chart Studio matchByMatchTrace lives in Studio exports",
    },
    poolContext: {
      comparisonPoolSize: result.totalRows,
      poolAverages: poolAveragesNumeric,
    },
    displayedEntities: pageRows,
    layoutDiagnostics: inspectCanvasLayoutDom(rootElement),
    centreTableContext: {
      columns: result.columns.map((c) => ({
        key: c.key,
        label: centreColShort(c.key, lang),
        fullLabel: centreColFullLabel(c.key, lang),
        format: c.format,
      })),
      page,
      pageSize,
      totalRows: result.totalRows,
      visibleRowCount: pageRows.length,
    },
  };
}

export function buildAuditJsonFileName(input: {
  module: StatsLabAuditModule;
  subView: string;
  positions?: number[];
  gwRange?: [number, number];
}): string {
  const pos =
    input.positions && input.positions.length === 1
      ? ["gkp", "def", "mid", "fwd"][input.positions[0] - 1]
      : "all";
  const view = input.subView.toLowerCase().replace(/_/g, "-");
  const gw =
    input.gwRange && input.gwRange[0] > 0
      ? `gw${input.gwRange[0]}-${input.gwRange[1]}`
      : "season";
  const mod = input.module === "CHART_STUDIO" ? "studio" : "centre";
  return `fpl-arena-stats-lab-audit-${mod}-${pos}-${view}-${gw}.json`;
}

export function downloadJsonFile(fileName: string, data: unknown): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyJsonToClipboard(data: unknown): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  await navigator.clipboard.writeText(json);
}

/** Pomocnicze — upewnia się, że FplStatKey map nie wybucha przy serializacji. */
export function sanitizeMetricsRecord(
  values: Record<FplStatKey, number> | Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(values)) {
    out[k] = Number(v) || 0;
  }
  return out;
}
