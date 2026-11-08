"use client";

import type { MutableRefObject, Ref, RefObject } from "react";
import type { StatsLabComparisonResult } from "@/lib/stats-lab/analyticsEngine";
import type { StatsLabQueryFilter } from "@/lib/stats-lab/presets";
import type { FplStatKey } from "@/lib/stats-lab/types";
import type {
  StatsLabLang,
  StatsLabScaleMode,
  StreakMetricKey,
} from "@/lib/stats-lab/i18n";
import {
  STATS_LAB_EXPORT_BG,
  STATS_LAB_EXPORT_WIDTH,
} from "@/lib/stats-lab/exportCapture";
import type { StatsLabChartThemeId, StatsLabVizMode } from "@/components/admin/stats-lab/chartTheme";
import { StatsLabChartCanvas } from "@/components/admin/stats-lab/StatsLabChartCanvas";
import type { PointsSortKey } from "@/components/admin/stats-lab/charts/PointsBreakdownChart";

type Props = {
  exportRef:
    | RefObject<HTMLDivElement | null>
    | MutableRefObject<HTMLDivElement | null>;
  result: StatsLabComparisonResult | null;
  filter: StatsLabQueryFilter;
  vizMode: StatsLabVizMode;
  themeId: StatsLabChartThemeId;
  lang: StatsLabLang;
  scaleMode: StatsLabScaleMode;
  customTitle: string;
  customSubtitle: string;
  seasonCode: string;
  spotlightPlayerId: number | null;
  showPoolAverage: boolean;
  showPlayerMeta: boolean;
  showNegativeBreakdown: boolean;
  axisX: FplStatKey;
  axisY: FplStatKey;
  chartSortKey: FplStatKey | "composite";
  chartSortDir: "DESC" | "ASC";
  pointsSortKey: PointsSortKey;
  streakSortKey: StreakMetricKey;
  activeStreakKeys: StreakMetricKey[];
};

/**
 * Off-screen węzeł plakatowy 1120px (PNG ≈2800px @ pixelRatio 2.5).
 */
export function StatsLabExportNode({
  exportRef,
  result,
  filter,
  vizMode,
  themeId,
  lang,
  scaleMode,
  customTitle,
  customSubtitle,
  seasonCode,
  spotlightPlayerId,
  showPoolAverage,
  showPlayerMeta,
  showNegativeBreakdown,
  axisX,
  axisY,
  chartSortKey,
  chartSortDir,
  pointsSortKey,
  streakSortKey,
  activeStreakKeys,
}: Props) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-[-10000px] top-0 z-[-1] overflow-hidden"
      style={{ width: STATS_LAB_EXPORT_WIDTH }}
    >
      <div
        ref={exportRef as Ref<HTMLDivElement>}
        data-stats-lab-export="true"
        style={{
          width: STATS_LAB_EXPORT_WIDTH,
          minWidth: STATS_LAB_EXPORT_WIDTH,
          background: STATS_LAB_EXPORT_BG,
          color: "#F8FAFC",
          padding: 0,
        }}
      >
        <StatsLabChartCanvas
          result={result}
          filter={filter}
          vizMode={vizMode}
          themeId={themeId}
          lang={lang}
          scaleMode={scaleMode}
          customTitle={customTitle}
          customSubtitle={customSubtitle}
          seasonCode={seasonCode}
          spotlightPlayerId={spotlightPlayerId}
          showPoolAverage={showPoolAverage}
          showBarValues
          showPlayerMeta={showPlayerMeta}
          showNegativeBreakdown={showNegativeBreakdown}
          axisX={axisX}
          axisY={axisY}
          pending={false}
          chartSortKey={chartSortKey}
          chartSortDir={chartSortDir}
          pointsSortKey={pointsSortKey}
          streakSortKey={streakSortKey}
          activeStreakKeys={activeStreakKeys}
          onChartSort={() => undefined}
          onPointsSort={() => undefined}
          onStreakSort={() => undefined}
          onToggleStreakKey={() => undefined}
          onShowNegativesChange={() => undefined}
          onSelectPlayer={() => undefined}
          variant="export"
        />
      </div>
    </div>
  );
}
