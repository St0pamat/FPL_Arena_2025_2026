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
import {
  runProjectionsEngineQaSelfCheck,
  type ProjectionsBuildResult,
  type ProjectionsCellLayout,
  type ProjectionsCellMetric,
  type ProjectionsDgwCsDisplayMode,
  type ProjectionsFdrMode,
  type ProjectionsFixturePrediction,
  type ProjectionsSortKey,
  type ProjectionsSubView,
  type ProjectionsTeamRow,
  type ProjectionsVenueFilter,
} from "@/lib/stats-lab/projectionsEngine";
import type {
  ProjectionsFdrNumberFormat,
  ProjectionsMatchupDisplayMode,
} from "@/lib/stats-lab/projectionsI18n";

export type StatsLabAuditModule =
  | "CHART_STUDIO"
  | "STATS_CENTRE"
  | "PROJECTIONS_CENTRE"
  | "FPL_PLANNER";

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

export type StatsLabPageRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type StatsLabPageAndMenuDiagnostics = {
  pageSummary: {
    viewportWidth: number;
    viewportHeight: number;
    pageScrollWidth: number;
    pageScrollHeight: number;
    hasUnintendedHorizontalPageScroll: boolean;
    shellRect: StatsLabPageRect;
    shellBackground: {
      css: string;
      r: number;
      g: number;
      b: number;
      luminance: number;
    };
    counts: {
      totalControls: number;
      buttonsCount: number;
      selectsCount: number;
      inputsCount: number;
      labelsAndHeadingsCount: number;
      menuContainersCount: number;
      totalIssuesCount: number;
    };
    issueBreakdown: {
      lowContrastCount: number;
      themeMismatchCount: number;
      unstyledSelectOptionsCount: number;
      truncatedOrOverflowingMenuCount: number;
      overlappingControlsCount: number;
      crampedOrMisalignedCount: number;
    };
  };
  shellNavigationInventory: Array<{
    tag: string;
    text: string;
    roleOrType: string;
    rect: StatsLabPageRect;
    color: string;
    backgroundColor: string;
    borderColor: string;
    contrastRatio: number;
    fontSize: string;
    fontWeight: string;
    isActiveGuess: boolean;
    issues: string[];
  }>;
  activeModuleMenusInventory: Array<{
    index: number;
    tag: string;
    text: string;
    sectionLabel: string;
    rect: StatsLabPageRect;
    styles: {
      color: string;
      effectiveBackgroundColor: string;
      borderColor: string;
      fontSize: string;
      fontWeight: string;
      opacity: string;
      borderRadius: string;
    };
    contrastRatio: number;
    selectOptionsAudit?: {
      optionsCount: number;
      selectedValue: string;
      selectedText: string;
      firstOptionColor: string;
      firstOptionBg: string;
      firstOptionContrastRatio: number;
      hasExplicitOptionStyling: boolean;
    };
    issues: string[];
  }>;
  menuContainersInventory: Array<{
    index: number;
    tag: string;
    labelSample: string;
    rect: StatsLabPageRect;
    backgroundColor: string;
    borderColor: string;
    bgLuminance: number;
    isThemeConsistent: boolean;
    issues: string[];
  }>;
  detectedMenuAndPageIssues: Array<{
    kind: string;
    summary: string;
    details?: Record<string, unknown>;
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
  pageAndMenuDiagnostics?: StatsLabPageAndMenuDiagnostics;
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
    pageAndMenuDiagnostics: inspectFullStatsLabPageDom({
      themeId: chartTheme,
      exportRootElement: rootElement,
    }),
  };
}

/** Alias zgodny z nazewnictwem KROK 7 (CHART_STUDIO). */
export const buildStatsLabAiAuditReport = buildChartStudioAiAuditReport;

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
    pageAndMenuDiagnostics: inspectFullStatsLabPageDom({
      themeId: chartTheme,
      exportRootElement: rootElement,
    }),
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
  const mod =
    input.module === "CHART_STUDIO"
      ? "studio"
      : input.module === "PROJECTIONS_CENTRE"
        ? "projections"
        : input.module === "FPL_PLANNER"
          ? "planner"
          : "centre";
  return `fpl-arena-stats-lab-audit-${mod}-${pos}-${view}-${gw}.json`;
}

export type PlannerDiagnostics = {
  teamId: number;
  isDemoSquad: boolean;
  activeVariant: "A" | "B" | "C";
  currentGw: number;
  bankTenths: number;
  freeTransfers: number;
  transferCostPts: number;
  grossXPts: number;
  netXPts: number;
  activeChip: string | null;
  isValidGw: boolean;
  errors: Array<{ key: string; detail?: string }>;
  warnings: string[];
  picksSummary: Array<{
    slot: number;
    elementId: number;
    webName: string;
    isCaptain: boolean;
    isViceCaptain: boolean;
    sellingPriceTenths: number;
  }>;
};

export type PlannerAiAuditReport = {
  meta: {
    exportedAt: string;
    module: "FPL_PLANNER";
    subView: string;
    lang: StatsLabLang;
    themeId: StatsLabChartThemeId;
    seasonCode: string;
  };
  plannerDiagnostics: PlannerDiagnostics;
  layoutDiagnostics: LayoutDiagnostics;
  pageAndMenuDiagnostics?: StatsLabPageAndMenuDiagnostics;
};

export function buildPlannerAiAuditReport(input: {
  lang: StatsLabLang;
  themeId: StatsLabChartThemeId;
  seasonCode: string;
  subView: string;
  diagnostics: PlannerDiagnostics;
  rootElement: HTMLElement;
}): PlannerAiAuditReport {
  return {
    meta: {
      exportedAt: new Date().toISOString(),
      module: "FPL_PLANNER",
      subView: input.subView,
      lang: input.lang,
      themeId: input.themeId,
      seasonCode: input.seasonCode,
    },
    plannerDiagnostics: input.diagnostics,
    layoutDiagnostics: inspectCanvasLayoutDom(input.rootElement),
    pageAndMenuDiagnostics: inspectFullStatsLabPageDom({
      themeId: input.themeId,
      exportRootElement: input.rootElement,
    }),
  };
}

export type ProjectionsDisplayedEntityAudit = {
  rank: number;
  teamId: number;
  shortName: string;
  name: string;
  matchesCount: number;
  avgFdrOverall: number | null;
  avgFdrAttack: number | null;
  avgFdrDefence: number | null;
  totalProjectedGoals: number;
  totalExpectedCleanSheets: number;
  gwCells: Record<
    number,
    {
      isBlank: boolean;
      isDgw: boolean;
      tickerLabels: string[];
      fdrScore: number | null;
      fdrLevel: number | null;
      projectedGoals: number | null;
      csPct: number | null;
      winPct: number | null;
    }
  >;
};

export type ProjectionsAiAuditReport = {
  meta: {
    exportedAt: string;
    module: "PROJECTIONS_CENTRE";
    subView: ProjectionsSubView;
    lang: StatsLabLang;
    themeId: StatsLabChartThemeId;
    seasonCode: string;
    lastFinishedGw: number;
    lastSyncedAt: string | null;
    gwRange: [number, number];
    visibleGameweeks: number[];
    hiddenGameweeks: number[];
    fdrMode: ProjectionsFdrMode;
    cellMetric: ProjectionsCellMetric;
    venueFilter: ProjectionsVenueFilter;
    cellLayout: ProjectionsCellLayout;
    fdrNumberFormat: ProjectionsFdrNumberFormat;
    dgwCsDisplayMode?: ProjectionsDgwCsDisplayMode;
    selectedMatchupGw?: number;
    matchupDisplayMode?: ProjectionsMatchupDisplayMode;
    sortBy: string;
    sortDirection: "asc" | "desc";
  };
  qaSelfCheck: { passed: boolean; checks: Record<string, boolean> };
  displayedEntities: ProjectionsDisplayedEntityAudit[];
  displayedMatchups?: ProjectionsDisplayedMatchupAudit[];
  layoutDiagnostics: LayoutDiagnostics;
  controlPanelDiagnostics?: ControlPanelDiagnostics;
  pageAndMenuDiagnostics?: StatsLabPageAndMenuDiagnostics;
};

export type ControlPanelDiagnostics = {
  truncatedOrOverflowingControls: LayoutDiagnostics["truncatedOrOverflowingElements"];
  overlappingControlLabels: LayoutDiagnostics["overlappingLabels"];
  lowContrastOrInvisibleControls: Array<{
    tag: string;
    text: string;
    color: string;
    backgroundColor: string;
  }>;
};

export function parseCssColorToRgba(
  cssColor: string,
): { r: number; g: number; b: number; a: number } | null {
  const raw = (cssColor || "").trim();
  if (!raw || raw === "transparent") return null;

  const rgb = raw.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i,
  );
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: rgb[4] == null ? 1 : Number(rgb[4]),
    };
  }

  const hex = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) {
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    }
    const hasAlpha = h.length === 8;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = hasAlpha ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  return null;
}

export function getRelativeLuminance(rgb: {
  r: number;
  g: number;
  b: number;
}): number {
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLin(rgb.r) + 0.7152 * toLin(rgb.g) + 0.0722 * toLin(rgb.b);
}

export function computeWcagContrastRatio(
  fg: { r: number; g: number; b: number },
  bg: { r: number; g: number; b: number },
): number {
  const L1 = getRelativeLuminance(fg);
  const L2 = getRelativeLuminance(bg);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

export function getEffectiveBackgroundColor(
  el: HTMLElement,
  themeId?: string,
): { css: string; r: number; g: number; b: number } {
  let cur: HTMLElement | null = el;
  while (cur) {
    const bg = window.getComputedStyle(cur).backgroundColor;
    const parsed = parseCssColorToRgba(bg);
    if (parsed && parsed.a > 0.05) {
      return { css: bg, r: parsed.r, g: parsed.g, b: parsed.b };
    }
    cur = cur.parentElement;
  }
  const isLight = themeId === "ANALYST_LIGHT";
  const fallback = isLight ? "#f8fafc" : "#090d16";
  const parsed = parseCssColorToRgba(fallback)!;
  return { css: fallback, r: parsed.r, g: parsed.g, b: parsed.b };
}

function parseCssRgb(
  color: string,
): { r: number; g: number; b: number; a: number } | null {
  return parseCssColorToRgba(color);
}

function relativeLuminance(r: number, g: number, b: number): number {
  return getRelativeLuminance({ r, g, b });
}

function contrastRatio(
  fg: { r: number; g: number; b: number },
  bg: { r: number; g: number; b: number },
): number {
  return computeWcagContrastRatio(fg, bg);
}

function effectiveBackgroundColor(el: HTMLElement): string {
  return getEffectiveBackgroundColor(el).css;
}

function roundPageRect(r: DOMRect): StatsLabPageRect {
  return {
    x: Math.round(r.left),
    y: Math.round(r.top),
    width: Math.round(r.width),
    height: Math.round(r.height),
  };
}

function isInsideExportRoot(
  el: Element | null,
  exportRoot: HTMLElement | null | undefined,
): boolean {
  if (!el || !exportRoot) return false;
  return exportRoot === el || exportRoot.contains(el);
}

function isInsideCanvasPreview(el: Element | null): boolean {
  if (!el || typeof el.closest !== "function") return false;
  return !!el.closest('[data-stats-lab-canvas-preview="true"]');
}

function isHelpQuestionMarkControl(el: HTMLElement, text: string): boolean {
  if (text !== "?") return false;
  const r = el.getBoundingClientRect();
  return r.width <= 24 && r.height <= 24;
}

function isUnsaturatedDarkBackground(bg: {
  r: number;
  g: number;
  b: number;
}): boolean {
  const span = Math.max(bg.r, bg.g, bg.b) - Math.min(bg.r, bg.g, bg.b);
  return span < 40;
}

function isElementVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (Number(style.opacity) < 0.05) return false;
  if (el.offsetParent === null && style.position !== "fixed") return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function visibleControlText(el: HTMLElement): string {
  if (el instanceof HTMLInputElement) {
    return (el.value || el.placeholder || el.getAttribute("aria-label") || "")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (el instanceof HTMLSelectElement) {
    const opt = el.selectedOptions[0];
    return (opt?.textContent || el.value || "")
      .replace(/\s+/g, " ")
      .trim();
  }
  return (el.textContent || el.getAttribute("aria-label") || "")
    .replace(/\s+/g, " ")
    .trim();
}

function findSectionLabel(el: HTMLElement): string {
  let cur: HTMLElement | null = el;
  for (let depth = 0; depth < 8 && cur; depth += 1) {
    const labeledBy = cur.getAttribute("aria-labelledby");
    if (labeledBy) {
      const ref = document.getElementById(labeledBy);
      const t = ref?.textContent?.replace(/\s+/g, " ").trim();
      if (t) return t.slice(0, 80);
    }
    const heading = cur.querySelector(
      ":scope > p, :scope > label, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > span",
    );
    if (heading && heading !== el) {
      const t = heading.textContent?.replace(/\s+/g, " ").trim() ?? "";
      if (t && t.length <= 60 && t !== visibleControlText(el)) return t;
    }
    const prev = cur.previousElementSibling as HTMLElement | null;
    if (prev) {
      const tag = prev.tagName.toLowerCase();
      if (
        tag === "p" ||
        tag === "label" ||
        tag === "h1" ||
        tag === "h2" ||
        tag === "h3" ||
        tag === "h4" ||
        tag === "span"
      ) {
        const t = prev.textContent?.replace(/\s+/g, " ").trim() ?? "";
        if (t && t.length <= 60) return t;
      }
    }
    cur = cur.parentElement;
  }
  return "";
}

function guessIsActiveControl(el: HTMLElement, style: CSSStyleDeclaration): boolean {
  if (el.getAttribute("aria-pressed") === "true") return true;
  if (el.getAttribute("aria-selected") === "true") return true;
  if (el.classList.contains("active")) return true;
  const bg = style.backgroundColor.toLowerCase();
  const cls = el.className?.toString?.() ?? "";
  return (
    /39ff14|emerald-500|emerald-600|bg-emerald|bg-\[#39ff14\]/i.test(cls) ||
    /rgb\(\s*57\s*,\s*255\s*,\s*20/.test(bg) ||
    /rgb\(\s*16\s*,\s*185\s*,\s*129/.test(bg) ||
    /rgb\(\s*5\s*,\s*150\s*,\s*105/.test(bg)
  );
}

function hasExplicitSelectOptionStyling(select: HTMLSelectElement): boolean {
  const opts = Array.from(select.options);
  if (!opts.length) return true;
  return opts.every((opt) => {
    const cls = opt.className || "";
    const inline = opt.getAttribute("style") || "";
    const blob = `${cls} ${inline}`;
    const hasBg = /\bbg-|background(-color)?:/i.test(blob);
    const hasText = /\btext-|color:/i.test(blob);
    return hasBg && hasText;
  });
}

function emptyPageAndMenuDiagnostics(
  themeId?: string,
): StatsLabPageAndMenuDiagnostics {
  const fallback = themeId === "ANALYST_LIGHT" ? "#f8fafc" : "#090d16";
  const parsed = parseCssColorToRgba(fallback) ?? { r: 9, g: 13, b: 22, a: 1 };
  return {
    pageSummary: {
      viewportWidth: 0,
      viewportHeight: 0,
      pageScrollWidth: 0,
      pageScrollHeight: 0,
      hasUnintendedHorizontalPageScroll: false,
      shellRect: { x: 0, y: 0, width: 0, height: 0 },
      shellBackground: {
        css: fallback,
        r: parsed.r,
        g: parsed.g,
        b: parsed.b,
        luminance: getRelativeLuminance(parsed),
      },
      counts: {
        totalControls: 0,
        buttonsCount: 0,
        selectsCount: 0,
        inputsCount: 0,
        labelsAndHeadingsCount: 0,
        menuContainersCount: 0,
        totalIssuesCount: 0,
      },
      issueBreakdown: {
        lowContrastCount: 0,
        themeMismatchCount: 0,
        unstyledSelectOptionsCount: 0,
        truncatedOrOverflowingMenuCount: 0,
        overlappingControlsCount: 0,
        crampedOrMisalignedCount: 0,
      },
    },
    shellNavigationInventory: [],
    activeModuleMenusInventory: [],
    menuContainersInventory: [],
    detectedMenuAndPageIssues: [],
  };
}

/**
 * Pełny rentgen strony Stats Lab + wszystkich menu (poza plakatem eksportu).
 */
export function inspectFullStatsLabPageDom(options?: {
  themeId?: string;
  exportRootElement?: HTMLElement | null;
}): StatsLabPageAndMenuDiagnostics {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return emptyPageAndMenuDiagnostics(options?.themeId);
  }

  const exportRoot = options?.exportRootElement ?? null;
  const shellRoot = (document.querySelector(
    '[data-stats-lab-shell-root="true"]',
  ) ??
    document.querySelector("main") ??
    document.body) as HTMLElement | null;

  if (!shellRoot) return emptyPageAndMenuDiagnostics(options?.themeId);

  const themeId =
    options?.themeId ||
    shellRoot.getAttribute("data-stats-lab-theme") ||
    "ARENA_DARK";
  const isLightTheme = themeId === "ANALYST_LIGHT";

  const shellOwnBgCss = window.getComputedStyle(shellRoot).backgroundColor;
  const shellOwnParsed = parseCssColorToRgba(shellOwnBgCss);
  const shellBg =
    shellOwnParsed && shellOwnParsed.a > 0.05
      ? {
          css: shellOwnBgCss,
          r: shellOwnParsed.r,
          g: shellOwnParsed.g,
          b: shellOwnParsed.b,
        }
      : getEffectiveBackgroundColor(shellRoot, themeId);
  const shellLum = getRelativeLuminance(shellBg);
  const shellRect = roundPageRect(shellRoot.getBoundingClientRect());

  const detectedMenuAndPageIssues: StatsLabPageAndMenuDiagnostics["detectedMenuAndPageIssues"] =
    [];
  let lowContrastCount = 0;
  let themeMismatchCount = 0;
  let unstyledSelectOptionsCount = 0;
  let truncatedOrOverflowingMenuCount = 0;
  let crampedOrMisalignedCount = 0;

  const shellBgMismatch =
    (isLightTheme && shellLum <= 0.7) || (!isLightTheme && shellLum >= 0.15);
  if (shellBgMismatch) {
    themeMismatchCount += 1;
    detectedMenuAndPageIssues.push({
      kind: "SHELL_BACKGROUND_THEME_MISMATCH",
      summary: `Shell background luminance ${Math.round(shellLum * 1000) / 1000} inconsistent with theme ${themeId}`,
      details: {
        themeId,
        shellBackground: shellBg.css,
        luminance: Math.round(shellLum * 1000) / 1000,
        expected: isLightTheme ? "> 0.70" : "< 0.15",
      },
    });
  }

  const navRoot = shellRoot.querySelector(
    '[data-stats-lab-region="SHELL_HEADER_NAV"]',
  ) as HTMLElement | null;

  const shellNavigationInventory: StatsLabPageAndMenuDiagnostics["shellNavigationInventory"] =
    [];
  if (navRoot) {
    const navEls = Array.from(
      navRoot.querySelectorAll<HTMLElement>(
        'button, a, select, input, [role="tab"], [role="button"], h1, h2, h3, h4',
      ),
    );
    for (const el of navEls) {
      if (!isElementVisible(el)) continue;
      const style = window.getComputedStyle(el);
      const text = visibleControlText(el).slice(0, 120);
      const bg = getEffectiveBackgroundColor(el, themeId);
      const fg = parseCssColorToRgba(style.color);
      const ratio =
        fg != null ? computeWcagContrastRatio(fg, bg) : 0;
      const issues: string[] = [];
      if (fg && ratio < 3) {
        issues.push(`LOW_CONTRAST: ${ratio} (< 3.0)`);
        lowContrastCount += 1;
      }
      if (el.scrollWidth > el.clientWidth + 2) {
        issues.push(
          `TEXT_OVERFLOW: scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`,
        );
        truncatedOrOverflowingMenuCount += 1;
      }
      const r = el.getBoundingClientRect();
      const isNativeTinyInput =
        el instanceof HTMLInputElement &&
        (el.type === "checkbox" || el.type === "radio");
      if (!isNativeTinyInput && r.height > 0 && r.height < 26) {
        issues.push(`CRAMPED_CONTROL_HEIGHT: ${Math.round(r.height)}px (< 26)`);
        crampedOrMisalignedCount += 1;
      }
      shellNavigationInventory.push({
        tag: el.tagName.toLowerCase(),
        text,
        roleOrType:
          el.getAttribute("role") ||
          (el instanceof HTMLInputElement || el instanceof HTMLButtonElement
            ? el.type || el.tagName.toLowerCase()
            : el.tagName.toLowerCase()),
        rect: roundPageRect(r),
        color: style.color,
        backgroundColor: bg.css,
        borderColor: style.borderColor,
        contrastRatio: ratio,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        isActiveGuess: guessIsActiveControl(el, style),
        issues,
      });
      for (const issue of issues) {
        detectedMenuAndPageIssues.push({
          kind: issue.split(":")[0] ?? "ISSUE",
          summary: `[SHELL_NAV] ${text || el.tagName}: ${issue}`,
          details: { tag: el.tagName.toLowerCase(), text },
        });
      }
    }
  }

  const menuSelector =
    'button, select, input, label, h1, h2, h3, h4, [role="tab"], [role="button"]';
  const activeWorkspace =
    (shellRoot.querySelector(
      '[data-stats-lab-active-workspace="true"]',
    ) as HTMLElement | null) ??
    (shellRoot.querySelector(
      '[data-stats-lab-region="MODULE_WORKSPACE"]',
    ) as HTMLElement | null) ??
    shellRoot;
  const workspaceRoot = activeWorkspace;

  const menuCandidates = Array.from(
    workspaceRoot.querySelectorAll<HTMLElement>(menuSelector),
  ).filter(
    (el) =>
      isElementVisible(el) &&
      !isInsideExportRoot(el, exportRoot) &&
      !isInsideCanvasPreview(el) &&
      !(navRoot && navRoot.contains(el)),
  );

  const activeModuleMenusInventory: StatsLabPageAndMenuDiagnostics["activeModuleMenusInventory"] =
    [];
  const interactiveForOverlap: HTMLElement[] = [];

  menuCandidates.forEach((el, index) => {
    const style = window.getComputedStyle(el);
    const tag = el.tagName.toLowerCase();
    const text = visibleControlText(el).slice(0, 120);
    const bg = getEffectiveBackgroundColor(el, themeId);
    const fg = parseCssColorToRgba(style.color);
    const ratio = fg != null ? computeWcagContrastRatio(fg, bg) : 0;
    const issues: string[] = [];
    const bgLum = getRelativeLuminance(bg);
    const fgLum = fg ? getRelativeLuminance(fg) : 0;

    if (fg && ratio < 3) {
      issues.push(`LOW_CONTRAST: ${ratio} (< 3.0)`);
      lowContrastCount += 1;
    }

    if (
      isLightTheme &&
      bgLum < 0.18 &&
      tag !== "option" &&
      isUnsaturatedDarkBackground(bg)
    ) {
      issues.push("THEME_MISMATCH_DARK_CONTROL_IN_LIGHT_THEME");
      themeMismatchCount += 1;
    }
    if (!isLightTheme && bgLum > 0.85 && fgLum > 0.7) {
      issues.push("THEME_MISMATCH_LIGHT_TEXT_ON_LIGHT_SURFACE_IN_DARK_THEME");
      themeMismatchCount += 1;
    }

    if (el.scrollWidth > el.clientWidth + 2) {
      issues.push(
        `TEXT_OVERFLOW: scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`,
      );
      truncatedOrOverflowingMenuCount += 1;
    }

    const r = el.getBoundingClientRect();
    const isNativeTinyInput =
      el instanceof HTMLInputElement &&
      (el.type === "checkbox" || el.type === "radio");
    const isHelpChip = isHelpQuestionMarkControl(el, text);
    if (isNativeTinyInput) {
      const hostLabel =
        el.closest("label") ??
        (el.id
          ? (document.querySelector(
              `label[for="${CSS.escape(el.id)}"]`,
            ) as HTMLElement | null)
          : null);
      if (hostLabel) {
        const lr = hostLabel.getBoundingClientRect();
        if (lr.height > 0 && lr.height < 26) {
          issues.push(
            `CRAMPED_CONTROL_HEIGHT: label ${Math.round(lr.height)}px (< 26)`,
          );
          crampedOrMisalignedCount += 1;
        }
      }
    } else if (
      !isHelpChip &&
      (tag === "button" || tag === "select" || tag === "input") &&
      r.height > 0 &&
      r.height < 26
    ) {
      issues.push(`CRAMPED_CONTROL_HEIGHT: ${Math.round(r.height)}px (< 26)`);
      crampedOrMisalignedCount += 1;
    }

    let selectOptionsAudit:
      | StatsLabPageAndMenuDiagnostics["activeModuleMenusInventory"][number]["selectOptionsAudit"]
      | undefined;
    if (el instanceof HTMLSelectElement) {
      const first = el.options[0];
      const firstStyle = first
        ? window.getComputedStyle(first)
        : null;
      const firstColor = firstStyle?.color ?? style.color;
      const firstBgParsed =
        (first &&
          parseCssColorToRgba(
            firstStyle?.backgroundColor || "rgba(0,0,0,0)",
          )) ||
        null;
      const firstBg =
        firstBgParsed && firstBgParsed.a > 0.05
          ? {
              css: firstStyle!.backgroundColor,
              r: firstBgParsed.r,
              g: firstBgParsed.g,
              b: firstBgParsed.b,
            }
          : bg;
      const firstFg = parseCssColorToRgba(firstColor);
      const firstRatio =
        firstFg != null ? computeWcagContrastRatio(firstFg, firstBg) : 0;
      const hasExplicit = hasExplicitSelectOptionStyling(el);
      if (!hasExplicit) {
        issues.push("UNSTYLED_SELECT_OPTIONS");
        unstyledSelectOptionsCount += 1;
      }
      selectOptionsAudit = {
        optionsCount: el.options.length,
        selectedValue: el.value,
        selectedText: el.selectedOptions[0]?.textContent?.trim() ?? "",
        firstOptionColor: firstColor,
        firstOptionBg: firstBg.css,
        firstOptionContrastRatio: firstRatio,
        hasExplicitOptionStyling: hasExplicit,
      };
    }

    if (tag === "button" || tag === "select" || tag === "input") {
      interactiveForOverlap.push(el);
      const parent = el.parentElement;
      if (parent) {
        const cs = window.getComputedStyle(parent);
        const gapRaw = cs.gap || cs.columnGap || "0px";
        const gap = Number.parseFloat(gapRaw);
        if (
          Number.isFinite(gap) &&
          gap < 2 &&
          parent.children.length > 1 &&
          (cs.display.includes("flex") || cs.display.includes("grid"))
        ) {
          issues.push(`CRAMPED_OR_MISALIGNED: parent gap ${gap}px (< 2)`);
          crampedOrMisalignedCount += 1;
        }
      }
    }

    activeModuleMenusInventory.push({
      index,
      tag,
      text,
      sectionLabel: findSectionLabel(el),
      rect: roundPageRect(r),
      styles: {
        color: style.color,
        effectiveBackgroundColor: bg.css,
        borderColor: style.borderColor,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        opacity: style.opacity,
        borderRadius: style.borderRadius,
      },
      contrastRatio: ratio,
      selectOptionsAudit,
      issues,
    });

    for (const issue of issues) {
      detectedMenuAndPageIssues.push({
        kind: issue.split(":")[0] ?? "ISSUE",
        summary: `[MODULE_MENU #${index}] ${text || tag}: ${issue}`,
        details: { index, tag, text, sectionLabel: findSectionLabel(el) },
      });
    }
  });

  let overlappingControlsCount = 0;
  for (let i = 0; i < interactiveForOverlap.length; i += 1) {
    const a = interactiveForOverlap[i];
    const ra = a.getBoundingClientRect();
    for (let j = i + 1; j < interactiveForOverlap.length; j += 1) {
      const b = interactiveForOverlap[j];
      if (a.contains(b) || b.contains(a)) continue;
      const rb = b.getBoundingClientRect();
      const hit = rectsOverlap(ra, rb);
      if (!hit.overlap) continue;
      overlappingControlsCount += 1;
      const aText = visibleControlText(a).slice(0, 60);
      const bText = visibleControlText(b).slice(0, 60);
      detectedMenuAndPageIssues.push({
        kind: "OVERLAPPING_CONTROLS",
        summary: `Overlapping controls: "${aText}" × "${bText}" (${Math.round(hit.area)}px)`,
        details: {
          a: { tag: a.tagName.toLowerCase(), text: aText, rect: roundPageRect(ra) },
          b: { tag: b.tagName.toLowerCase(), text: bText, rect: roundPageRect(rb) },
          overlapPx: Math.round(hit.area),
        },
      });
    }
  }

  const containerCandidates = Array.from(
    workspaceRoot.querySelectorAll<HTMLElement>("div, section, aside"),
  ).filter((el) => {
    if (!isElementVisible(el)) return false;
    if (isInsideExportRoot(el, exportRoot)) return false;
    if (isInsideCanvasPreview(el)) return false;
    if (navRoot && navRoot.contains(el)) return false;
    const style = window.getComputedStyle(el);
    const borderW =
      Number.parseFloat(style.borderTopWidth) +
      Number.parseFloat(style.borderRightWidth) +
      Number.parseFloat(style.borderBottomWidth) +
      Number.parseFloat(style.borderLeftWidth);
    const bg = parseCssColorToRgba(style.backgroundColor);
    const hasOwnBg = !!(bg && bg.a > 0.05);
    if (!(borderW > 0 || hasOwnBg)) return false;
    return !!el.querySelector(menuSelector);
  });

  // Prefer mid-level panels: drop containers that fully wrap another selected container
  const menuContainersInventory: StatsLabPageAndMenuDiagnostics["menuContainersInventory"] =
    [];
  containerCandidates.forEach((el, index) => {
    const style = window.getComputedStyle(el);
    const bg = getEffectiveBackgroundColor(el, themeId);
    const bgLum = getRelativeLuminance(bg);
    const issues: string[] = [];
    let isThemeConsistent = true;
    if (isLightTheme && bgLum < 0.25) {
      isThemeConsistent = false;
      issues.push("DARK_PANEL_CONTAINER_IN_ANALYST_LIGHT_THEME");
      themeMismatchCount += 1;
    }
    if (!isLightTheme && bgLum > 0.8) {
      isThemeConsistent = false;
      issues.push("LIGHT_PANEL_CONTAINER_IN_DARK_THEME");
      themeMismatchCount += 1;
    }
    const labelSample =
      (
        el.querySelector("p, label, h1, h2, h3, h4, span")?.textContent ||
        visibleControlText(el)
      )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80) || el.tagName.toLowerCase();

    menuContainersInventory.push({
      index,
      tag: el.tagName.toLowerCase(),
      labelSample,
      rect: roundPageRect(el.getBoundingClientRect()),
      backgroundColor: bg.css,
      borderColor: style.borderColor,
      bgLuminance: Math.round(bgLum * 1000) / 1000,
      isThemeConsistent,
      issues,
    });
    for (const issue of issues) {
      detectedMenuAndPageIssues.push({
        kind: issue,
        summary: `[MENU_CONTAINER #${index}] ${labelSample}: ${issue}`,
        details: { index, labelSample, bgLuminance: bgLum },
      });
    }
  });

  const buttonsCount = menuCandidates.filter(
    (el) => el.tagName.toLowerCase() === "button" || el.getAttribute("role") === "button",
  ).length;
  const selectsCount = menuCandidates.filter(
    (el) => el.tagName.toLowerCase() === "select",
  ).length;
  const inputsCount = menuCandidates.filter(
    (el) => el.tagName.toLowerCase() === "input",
  ).length;
  const labelsAndHeadingsCount = menuCandidates.filter((el) =>
    /^(label|h1|h2|h3|h4)$/i.test(el.tagName),
  ).length;

  const totalIssuesCount = detectedMenuAndPageIssues.length;

  return {
    pageSummary: {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      pageScrollWidth: document.documentElement.scrollWidth,
      pageScrollHeight: document.documentElement.scrollHeight,
      hasUnintendedHorizontalPageScroll:
        document.documentElement.scrollWidth > window.innerWidth + 4,
      shellRect,
      shellBackground: {
        css: shellBg.css,
        r: shellBg.r,
        g: shellBg.g,
        b: shellBg.b,
        luminance: Math.round(shellLum * 1000) / 1000,
      },
      counts: {
        totalControls: menuCandidates.length + shellNavigationInventory.length,
        buttonsCount: buttonsCount + shellNavigationInventory.filter((n) => n.tag === "button").length,
        selectsCount,
        inputsCount,
        labelsAndHeadingsCount,
        menuContainersCount: menuContainersInventory.length,
        totalIssuesCount,
      },
      issueBreakdown: {
        lowContrastCount,
        themeMismatchCount,
        unstyledSelectOptionsCount,
        truncatedOrOverflowingMenuCount,
        overlappingControlsCount,
        crampedOrMisalignedCount,
      },
    },
    shellNavigationInventory,
    activeModuleMenusInventory,
    menuContainersInventory,
    detectedMenuAndPageIssues,
  };
}

export function inspectControlPanelDiagnostics(
  controlsRootElement: HTMLElement | null,
): ControlPanelDiagnostics {
  if (!controlsRootElement || typeof window === "undefined") {
    return {
      truncatedOrOverflowingControls: [],
      overlappingControlLabels: [],
      lowContrastOrInvisibleControls: [],
    };
  }

  const layout = inspectCanvasLayoutDom(controlsRootElement);
  const lowContrastOrInvisibleControls: ControlPanelDiagnostics["lowContrastOrInvisibleControls"] =
    [];

  const controls = Array.from(
    controlsRootElement.querySelectorAll<HTMLElement>("button, select, input"),
  );

  for (const el of controls) {
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;
    if (Number(style.opacity) < 0.15) continue;
    const text = (el.textContent ?? (el as HTMLInputElement).value ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;

    const fg = parseCssRgb(style.color);
    const bgCss = effectiveBackgroundColor(el);
    const bg = parseCssRgb(bgCss);
    if (!fg || !bg) continue;
    const ratio = contrastRatio(fg, bg);
    if (ratio < 2.5) {
      lowContrastOrInvisibleControls.push({
        tag: el.tagName.toLowerCase(),
        text: text.slice(0, 120),
        color: style.color,
        backgroundColor: bgCss,
      });
    }
  }

  return {
    truncatedOrOverflowingControls: layout.truncatedOrOverflowingElements,
    overlappingControlLabels: layout.overlappingLabels,
    lowContrastOrInvisibleControls,
  };
}

export type ProjectionsDisplayedMatchupAudit = {
  fixtureId: number;
  gameweek: number;
  homeShortName: string;
  awayShortName: string;
  tickerHome: string;
  tickerAway: string;
  lambdaHome: number;
  lambdaAway: number;
  csPctHome: number;
  csPctAway: number;
  winPctHome: number;
  drawPct: number;
  winPctAway: number;
  topExactScores: Array<{ scoreLabel: string; pct: number }>;
  verification: {
    actualScoreLabel: string;
    is1X2Correct: boolean;
    isTop3ExactScoreHit: boolean;
    matchedExactScoreRank: 1 | 2 | 3 | null;
    brierScore1X2: number;
  } | null;
};

export function buildProjectionsAiAuditReport(input: {
  result: ProjectionsBuildResult;
  teamsOrdered: ProjectionsTeamRow[];
  subView: ProjectionsSubView;
  lang: StatsLabLang;
  themeId: StatsLabChartThemeId;
  seasonCode: string;
  lastSyncedAt: string | null;
  hiddenGameweeks: number[];
  fdrMode: ProjectionsFdrMode;
  cellMetric: ProjectionsCellMetric;
  venueFilter: ProjectionsVenueFilter;
  cellLayout: ProjectionsCellLayout;
  fdrNumberFormat: ProjectionsFdrNumberFormat;
  dgwCsDisplayMode?: ProjectionsDgwCsDisplayMode;
  selectedMatchupGw?: number;
  matchupDisplayMode?: ProjectionsMatchupDisplayMode;
  matchupsForAudit?: ProjectionsFixturePrediction[];
  sortBy: ProjectionsSortKey | string;
  sortDirection: "asc" | "desc";
  rootElement?: HTMLElement | null;
  controlsRootElement?: HTMLElement | null;
}): ProjectionsAiAuditReport {
  const {
    result,
    teamsOrdered,
    subView,
    lang,
    themeId,
    seasonCode,
    lastSyncedAt,
    hiddenGameweeks,
    fdrMode,
    cellMetric,
    venueFilter,
    cellLayout,
    fdrNumberFormat,
    dgwCsDisplayMode,
    selectedMatchupGw,
    matchupDisplayMode,
    matchupsForAudit,
    sortBy,
    sortDirection,
    rootElement = null,
    controlsRootElement = null,
  } = input;

  const displayedEntities: ProjectionsDisplayedEntityAudit[] =
    teamsOrdered.map((team, idx) => {
      const gwCells: ProjectionsDisplayedEntityAudit["gwCells"] = {};
      for (const gw of result.gameweeks) {
        const cell = team.cellsByGw[gw];
        if (!cell) continue;
        const score =
          fdrMode === "ATTACK"
            ? cell.avgFdrAttack
            : fdrMode === "DEFENCE"
              ? cell.avgFdrDefence
              : cell.avgFdrOverall;
        const level =
          fdrMode === "ATTACK"
            ? cell.fdrLevelAttack
            : fdrMode === "DEFENCE"
              ? cell.fdrLevelDefence
              : cell.fdrLevelOverall;
        gwCells[gw] = {
          isBlank: cell.isBlank,
          isDgw: cell.isDgw,
          tickerLabels: cell.fixtures.map((f) => f.tickerLabelMatrix),
          fdrScore: score,
          fdrLevel: level,
          projectedGoals: cell.totalProjectedGoals,
          csPct:
            cell.combinedAtLeastOneCsPct ??
            (cell.totalExpectedCs != null
              ? Math.round(cell.totalExpectedCs * 1000) / 10
              : null),
          winPct: cell.avgWinPct,
        };
      }
      return {
        rank: idx + 1,
        teamId: team.teamId,
        shortName: team.shortName,
        name: team.name,
        matchesCount: team.matchesCount,
        avgFdrOverall: team.avgFdrOverall,
        avgFdrAttack: team.avgFdrAttack,
        avgFdrDefence: team.avgFdrDefence,
        totalProjectedGoals: team.totalProjectedGoals,
        totalExpectedCleanSheets: team.totalExpectedCleanSheets,
        gwCells,
      };
    });

  const displayedMatchups: ProjectionsDisplayedMatchupAudit[] | undefined =
    subView === "MATCHUP_CARDS"
      ? (matchupsForAudit ?? []).map((m) => ({
          fixtureId: m.fixtureId,
          gameweek: m.gameweek,
          homeShortName: m.homeShortName,
          awayShortName: m.awayShortName,
          tickerHome: `${m.homeShortName.toUpperCase()} (${lang === "pl" ? "D" : "H"})`,
          tickerAway: `${m.awayShortName.toUpperCase()} (${lang === "pl" ? "W" : "A"})`,
          lambdaHome: m.lambdaHome,
          lambdaAway: m.lambdaAway,
          csPctHome: m.csPctHome,
          csPctAway: m.csPctAway,
          winPctHome: m.winPctHome,
          drawPct: m.drawPct,
          winPctAway: m.winPctAway,
          topExactScores: m.topExactScores.map((t) => ({
            scoreLabel: t.scoreLabel,
            pct: t.pct,
          })),
          verification: m.verification
            ? {
                actualScoreLabel: m.verification.actualScoreLabel,
                is1X2Correct: m.verification.is1X2Correct,
                isTop3ExactScoreHit: m.verification.isTop3ExactScoreHit,
                matchedExactScoreRank: m.verification.matchedExactScoreRank,
                brierScore1X2: m.verification.brierScore1X2,
              }
            : null,
        }))
      : undefined;

  return {
    meta: {
      exportedAt: new Date().toISOString(),
      module: "PROJECTIONS_CENTRE",
      subView,
      lang,
      themeId,
      seasonCode,
      lastFinishedGw: result.lastFinishedGw,
      lastSyncedAt,
      gwRange: [result.startGw, result.endGw],
      visibleGameweeks: result.gameweeks,
      hiddenGameweeks,
      fdrMode,
      cellMetric,
      venueFilter,
      cellLayout,
      fdrNumberFormat,
      dgwCsDisplayMode,
      selectedMatchupGw,
      matchupDisplayMode,
      sortBy: String(sortBy),
      sortDirection,
    },
    qaSelfCheck: runProjectionsEngineQaSelfCheck(),
    displayedEntities,
    displayedMatchups,
    layoutDiagnostics: inspectCanvasLayoutDom(rootElement),
    controlPanelDiagnostics: inspectControlPanelDiagnostics(controlsRootElement),
    pageAndMenuDiagnostics: inspectFullStatsLabPageDom({
      themeId,
      exportRootElement: rootElement,
    }),
  };
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
