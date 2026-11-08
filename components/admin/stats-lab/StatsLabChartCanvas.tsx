"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { StatsLabComparisonResult } from "@/lib/stats-lab/analyticsEngine";
import type { StatsLabQueryFilter } from "@/lib/stats-lab/presets";
import type { FplStatKey } from "@/lib/stats-lab/types";
import { getFplStatDefinition } from "@/lib/stats-lab/types";
import type {
  StatsLabLang,
  StatsLabScaleMode,
  StreakMetricKey,
} from "@/lib/stats-lab/i18n";
import {
  PERIOD_LABELS,
  VIZ_MODE_LABELS,
  metricGlossaryLine,
  positionLabel,
  t,
} from "@/lib/stats-lab/i18n";
import { ARENA_PORTAL_ALT, ARENA_PORTAL_LOGO } from "@/lib/arena";
import {
  STATS_LAB_CHART_THEMES,
  type StatsLabChartThemeId,
  type StatsLabVizMode,
} from "@/components/admin/stats-lab/chartTheme";
import { StackedCompositeChart } from "@/components/admin/stats-lab/charts/StackedCompositeChart";
import { RadarPizzaChart } from "@/components/admin/stats-lab/charts/RadarPizzaChart";
import { Scatter2DChart } from "@/components/admin/stats-lab/charts/Scatter2DChart";
import { HeatmapMatrixChart } from "@/components/admin/stats-lab/charts/HeatmapMatrixChart";
import {
  PointsBreakdownChart,
  type PointsSortKey,
} from "@/components/admin/stats-lab/charts/PointsBreakdownChart";
import { StreaksExplorerChart } from "@/components/admin/stats-lab/charts/StreaksExplorerChart";

export type StatsLabChartCanvasVariant = "studio" | "export";

type Props = {
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
  showBarValues: boolean;
  showPlayerMeta: boolean;
  showNegativeBreakdown: boolean;
  axisX: FplStatKey;
  axisY: FplStatKey;
  pending: boolean;
  chartSortKey: FplStatKey | "composite";
  chartSortDir: "DESC" | "ASC";
  pointsSortKey: PointsSortKey;
  streakSortKey: StreakMetricKey;
  activeStreakKeys: StreakMetricKey[];
  onChartSort: (key: FplStatKey | "composite") => void;
  onPointsSort: (key: PointsSortKey) => void;
  onStreakSort: (key: StreakMetricKey) => void;
  onToggleStreakKey: (key: StreakMetricKey) => void;
  onShowNegativesChange: (v: boolean) => void;
  onSelectPlayer: (id: number) => void;
  /** studio = interaktywny podgląd; export = branding social / bez kontrolek UI */
  variant?: StatsLabChartCanvasVariant;
};

/** Logo z fallbackiem SVG — html-to-image nie może paść na CORS/404. */
function ArenaBrandMark({ size = 56 }: { size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        aria-label={ARENA_PORTAL_ALT}
        role="img"
      >
        <rect width="64" height="64" rx="14" fill="#0B1220" />
        <rect
          x="3"
          y="3"
          width="58"
          height="58"
          rx="12"
          fill="none"
          stroke="#39FF14"
          strokeWidth="2.5"
        />
        <text
          x="32"
          y="28"
          textAnchor="middle"
          fill="#39FF14"
          fontFamily="Oswald, sans-serif"
          fontSize="11"
          fontWeight="700"
        >
          FPL
        </text>
        <text
          x="32"
          y="44"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="Oswald, sans-serif"
          fontSize="10"
          fontWeight="700"
        >
          ARENA
        </text>
      </svg>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- html-to-image wymaga <img>
    <img
      src={ARENA_PORTAL_LOGO}
      alt={ARENA_PORTAL_ALT}
      width={size}
      height={size}
      crossOrigin="anonymous"
      decoding="async"
      onError={() => setFailed(true)}
      className="object-contain"
      style={{ width: size, height: size }}
    />
  );
}

function positionBit(
  filter: StatsLabQueryFilter,
  lang: StatsLabLang,
): string {
  if (filter.positions.length === 1) {
    return positionLabel(filter.positions[0], lang);
  }
  if (filter.maxOwnershipPct != null) {
    return lang === "pl" ? "Ukryte perełki" : "Differentials";
  }
  return lang === "pl" ? "Porównanie zawodników" : "Player comparison";
}

function clubShortsFromPlotted(
  filter: StatsLabQueryFilter,
  plotted: { fpl_team_id: number; club: { short_name: string; fpl_team_id: number } | null }[],
): string[] {
  if (!filter.clubIds.length) return [];
  const wanted = new Set(filter.clubIds);
  const seen = new Map<number, string>();
  for (const p of plotted) {
    if (!wanted.has(p.fpl_team_id)) continue;
    const short = p.club?.short_name;
    if (short) seen.set(p.fpl_team_id, short);
  }
  return [...seen.values()];
}

function autoTitle(
  filter: StatsLabQueryFilter,
  vizMode: StatsLabVizMode,
  lang: StatsLabLang,
  plottedPlayers: {
    web_name: string;
    fpl_team_id: number;
    club: { short_name: string; fpl_team_id: number } | null;
  }[],
): string {
  const chartMode = VIZ_MODE_LABELS[lang][vizMode] ?? vizMode;
  const pos = positionBit(filter, lang);
  const n = plottedPlayers.length;

  if (filter.selectedPlayerIds.length > 0) {
    if (n >= 2 && n <= 4) {
      const names = plottedPlayers.map((p) => p.web_name).join(" vs ");
      return lang === "pl"
        ? `PORÓWNANIE • ${names} · ${chartMode}`
        : `HEAD-TO-HEAD • ${names} · ${chartMode}`;
    }
    return lang === "pl"
      ? `WYBRANI GRACZE (${n}) • ${pos} · ${chartMode}`
      : `SELECTED PLAYERS (${n}) • ${pos} · ${chartMode}`;
  }

  const clubs = clubShortsFromPlotted(filter, plottedPlayers);
  const clubBit = clubs.length ? ` (${clubs.join(", ")})` : "";
  return `TOP ${Math.max(n, 1)}${clubBit} • ${pos} · ${chartMode}`;
}

function autoSubtitle(
  filter: StatsLabQueryFilter,
  poolSize: number,
  gw: [number, number],
  lang: StatsLabLang,
  scaleMode: StatsLabScaleMode,
  vizMode: StatsLabVizMode,
) {
  const isMatchTotals =
    vizMode === "POINTS_BREAKDOWN" || vizMode === "STREAKS_EXPLORER";

  const bits: string[] = [];
  const periodLabel =
    PERIOD_LABELS[lang][filter.period.mode] ?? filter.period.mode;

  // Jedna etykieta okresu — bez „Cały sezon · Cały sezon (GW …)”
  if (gw[0] > 0) {
    if (filter.period.mode === "FULL_SEASON") {
      bits.push(
        lang === "pl"
          ? `Cały sezon (GW ${gw[0]}–${gw[1]})`
          : `Full season (GW ${gw[0]}–${gw[1]})`,
      );
    } else {
      bits.push(`${periodLabel} (GW ${gw[0]}–${gw[1]})`);
    }
  } else {
    bits.push(periodLabel);
  }

  bits.push(
    lang === "pl"
      ? `Min. ${filter.minMinutes} min`
      : `Min. ${filter.minMinutes} mins`,
  );

  if (isMatchTotals) {
    bits.push(
      lang === "pl" ? "Oficjalne punkty FPL" : "Official FPL points",
    );
  } else {
    bits.push(filter.per90 ? "Per 90" : lang === "pl" ? "Sumy" : "Totals");
    bits.push(
      scaleMode === "PERCENTILE"
        ? lang === "pl"
          ? "Percentyle"
          : "Percentiles"
        : lang === "pl"
          ? "Surowe"
          : "Raw",
    );
  }

  if (poolSize > 0 && !isMatchTotals) {
    bits.push(
      lang === "pl"
        ? `Tło porównawcze: ${poolSize} graczy`
        : `Comparison pool: ${poolSize} players`,
    );
  }

  return bits.join(" · ");
}

function pointsNetFooterExplain(lang: StatsLabLang): string {
  return lang === "pl"
    ? "Punkty Netto = oficjalny wynik w FPL (Punkty Brutto zdobyte na boisku pomniejszone o kary za stracone gole i kartki)."
    : "Net Points = official FPL total (Gross points earned minus deductions for goals conceded and cards).";
}

export function StatsLabChartCanvas({
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
  showBarValues,
  showPlayerMeta,
  showNegativeBreakdown,
  axisX,
  axisY,
  pending,
  chartSortKey,
  chartSortDir,
  pointsSortKey,
  streakSortKey,
  activeStreakKeys,
  onChartSort,
  onPointsSort,
  onStreakSort,
  onToggleStreakKey,
  onShowNegativesChange,
  onSelectPlayer,
  variant = "studio",
}: Props) {
  const isExport = variant === "export";
  const theme = STATS_LAB_CHART_THEMES[themeId];
  const copy = t(lang);
  const players = result?.plottedPlayers ?? [];
  const metrics = result?.activeMetrics?.length
    ? result.activeMetrics
    : filter.activeMetrics;

  const title =
    customTitle.trim() || autoTitle(filter, vizMode, lang, players);
  const subtitle =
    customSubtitle.trim() ||
    `${lang === "pl" ? "Sezon" : "Season"} ${seasonCode} · ${autoSubtitle(
      filter,
      result?.poolSize ?? 0,
      result?.effectiveGwRange ?? [0, 0],
      lang,
      scaleMode,
      vizMode,
    )}`;

  const isMatchTotalsViz =
    vizMode === "POINTS_BREAKDOWN" || vizMode === "STREAKS_EXPLORER";

  const glossaryMetrics =
    vizMode === "POINTS_BREAKDOWN"
      ? []
      : vizMode === "SCATTER_2D"
        ? [axisX, axisY]
        : metrics.slice(0, 8);

  const forceShowValues = isExport ? true : showBarValues;
  const forceShowNegatives = isExport
    ? showNegativeBreakdown
    : showNegativeBreakdown;

  return (
    <div
      id={isExport ? "stats-lab-chart-export" : "stats-lab-chart-canvas"}
      className={
        isExport
          ? "relative overflow-hidden"
          : "relative overflow-hidden rounded-2xl border"
      }
      style={{
        background: theme.canvasBg,
        borderColor: isExport ? "transparent" : theme.border,
        color: theme.text,
      }}
    >
      {!isExport && pending ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/90 px-4 py-2 text-xs font-bold text-slate-200">
            <Loader2 className="h-4 w-4 animate-spin text-[#39FF14]" />
            {copy.recalculating}
          </div>
        </div>
      ) : null}

      <header
        className={
          isExport
            ? "flex items-stretch gap-5 border-b px-7 py-6"
            : "flex items-stretch gap-5 border-b px-5 py-4 sm:px-6"
        }
        style={{ borderColor: theme.border }}
      >
        <div className="flex h-[86px] w-[86px] shrink-0 items-center justify-center sm:h-[92px] sm:w-[92px]">
          <ArenaBrandMark size={isExport ? 92 : 86} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 py-0.5">
          <p
            className="text-[10px] font-black uppercase tracking-[0.32em] sm:text-xs"
            style={{ color: theme.accent }}
          >
            FPL ARENA • STATS LAB
          </p>
          <h2
            className={
              isExport
                ? "text-[34px] font-black leading-tight tracking-tight sm:text-[38px]"
                : "text-2xl font-black leading-tight tracking-tight sm:text-[32px]"
            }
            style={{ fontFamily: "var(--font-oswald), Oswald, sans-serif" }}
          >
            {title}
          </h2>
          <p
            className={
              isExport
                ? "text-base font-medium text-slate-300 sm:text-lg"
                : "text-sm font-medium text-slate-300"
            }
          >
            {subtitle}
          </p>
        </div>
      </header>

      <div className={isExport ? "px-7 py-6" : "px-4 py-5 sm:px-5"}>
        {!result || players.length === 0 ? (
          <div
            className="rounded-xl border border-dashed px-6 py-16 text-center text-sm"
            style={{ borderColor: theme.border, color: theme.muted }}
          >
            {copy.emptyChart}
          </div>
        ) : vizMode === "STACKED_COMPOSITE" ? (
          <StackedCompositeChart
            players={players}
            metrics={metrics}
            theme={theme}
            lang={lang}
            scaleMode={scaleMode}
            spotlightId={spotlightPlayerId}
            showValues={forceShowValues}
            showMeta={showPlayerMeta}
            sortKey={chartSortKey}
            sortDir={chartSortDir}
            onSort={onChartSort}
            onSelectPlayer={onSelectPlayer}
            variant={variant}
          />
        ) : vizMode === "POINTS_BREAKDOWN" ? (
          <PointsBreakdownChart
            players={players}
            theme={theme}
            lang={lang}
            spotlightId={spotlightPlayerId}
            showNegatives={forceShowNegatives}
            showMeta={showPlayerMeta}
            sortKey={pointsSortKey}
            sortDir={chartSortDir}
            onSort={onPointsSort}
            onSelectPlayer={onSelectPlayer}
            variant={variant}
          />
        ) : vizMode === "STREAKS_EXPLORER" ? (
          <StreaksExplorerChart
            players={players}
            theme={theme}
            lang={lang}
            spotlightId={spotlightPlayerId}
            showMeta={showPlayerMeta}
            activeStreakKeys={activeStreakKeys}
            onToggleStreakKey={onToggleStreakKey}
            sortKey={streakSortKey}
            sortDir={chartSortDir}
            onSort={onStreakSort}
            onSelectPlayer={onSelectPlayer}
            variant={variant}
          />
        ) : vizMode === "RADAR_PIZZA" ? (
          <RadarPizzaChart
            players={players}
            metrics={metrics}
            poolAverages={result.poolAverages}
            theme={theme}
            lang={lang}
            scaleMode={scaleMode}
            spotlightId={spotlightPlayerId}
            showAvg={showPoolAverage}
            onSelectPlayer={onSelectPlayer}
          />
        ) : vizMode === "SCATTER_2D" ? (
          <Scatter2DChart
            players={players}
            axisX={axisX}
            axisY={axisY}
            poolAverages={result.poolAverages}
            theme={theme}
            lang={lang}
            spotlightId={spotlightPlayerId}
            showAvg={showPoolAverage}
            showMeta={showPlayerMeta}
            onSelectPlayer={onSelectPlayer}
          />
        ) : (
          <HeatmapMatrixChart
            players={players}
            metrics={metrics}
            theme={theme}
            themeId={themeId}
            lang={lang}
            scaleMode={scaleMode}
            spotlightId={spotlightPlayerId}
            showMeta={showPlayerMeta}
            sortKey={chartSortKey}
            sortDir={chartSortDir}
            onSort={onChartSort}
            onSelectPlayer={onSelectPlayer}
            variant={variant}
          />
        )}
      </div>

      {/* Cinematic footer / legenda edukacyjna */}
      <div
        className={
          isExport
            ? "space-y-3 border-t px-7 py-5"
            : "space-y-2 border-t px-5 py-4 sm:px-6"
        }
        style={{ borderColor: theme.border }}
      >
        {glossaryMetrics.length > 0 ? (
          <div
            className={`flex flex-wrap gap-x-5 gap-y-1.5 ${
              isExport ? "text-[15px]" : "text-[10px]"
            }`}
            style={{ color: theme.muted }}
          >
            {glossaryMetrics.map((key) => {
              const def = getFplStatDefinition(key);
              if (!def) return null;
              const short =
                lang === "en" ? def.shortLabelEn : def.shortLabelPl;
              return (
                <span key={key} className="max-w-xl">
                  <strong style={{ color: theme.text }}>{short}:</strong>{" "}
                  {metricGlossaryLine(def, lang)}
                </span>
              );
            })}
          </div>
        ) : null}

        {vizMode === "POINTS_BREAKDOWN" ? (
          <p
            className={
              isExport
                ? "text-[15px] leading-relaxed"
                : "text-[11px] leading-relaxed"
            }
            style={{ color: theme.muted }}
          >
            {pointsNetFooterExplain(lang)}
          </p>
        ) : !isMatchTotalsViz ? (
          <p
            className={
              isExport
                ? "text-[15px] leading-relaxed"
                : "text-[11px] leading-relaxed"
            }
            style={{ color: theme.muted }}
          >
            {scaleMode === "PERCENTILE"
              ? copy.percentileExplain
              : copy.rawExplain}
          </p>
        ) : null}

        <div
          className={`flex flex-wrap items-center justify-between gap-3 pt-1 ${
            isExport ? "text-base" : "text-[10px]"
          }`}
          style={{ color: theme.muted }}
        >
          <span>
            {isMatchTotalsViz
              ? lang === "pl"
                ? "Sumy meczowe · bez skali percentylowej"
                : "Match totals · no percentile scale"
              : scaleMode === "PERCENTILE"
                ? lang === "pl"
                  ? "Skala percentylowa 0–100 względem puli porównawczej"
                  : "Percentile scale 0–100 vs comparison pool"
                : lang === "pl"
                  ? "Wartości rzeczywiste — osobna skala na metrykę"
                  : "Raw values — per-metric scale"}
          </span>
          <span
            className={
              isExport
                ? "text-base font-extrabold tracking-wide"
                : "font-semibold tracking-wide"
            }
            style={{ color: isExport ? "#39FF14" : theme.muted }}
          >
            www.fpl-arena.com • Powered by St0pa | FPL Arena
          </span>
        </div>
      </div>
    </div>
  );
}
