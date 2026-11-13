"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { StatsLabComparisonResult } from "@/lib/stats-lab/analyticsEngine";
import type { StatsLabQueryFilter } from "@/lib/stats-lab/presets";
import type { FplStatKey } from "@/lib/stats-lab/types";
import type {
  StatsLabLang,
  StatsLabScaleMode,
  StreakMetricKey,
} from "@/lib/stats-lab/i18n";
import {
  PERIOD_LABELS,
  VIZ_MODE_LABELS,
  positionLabel,
  statLabel,
  t,
} from "@/lib/stats-lab/i18n";
import { ARENA_PORTAL_ALT, ARENA_PORTAL_LOGO } from "@/lib/arena";
import {
  STATS_LAB_CHART_THEMES,
  getMetricColor,
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
  onSelectDefaultStreaks?: () => void;
  onSelectAllStreaks?: () => void;
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
          ? "Tło grupy (0–100)"
          : "Group rank (0–100)"
        : lang === "pl"
          ? "Wartości statystyk"
          : "Actual stats",
    );
  }

  if (poolSize > 0 && !isMatchTotals) {
    bits.push(
      lang === "pl"
        ? `Grupa porównawcza: ${poolSize} graczy`
        : `Comparison group: ${poolSize} players`,
    );
  }

  return bits.join(" · ");
}

/** 1-zdaniowa instrukcja czytania wykresu — dopasowana do vizMode / scaleMode. */
function chartReadingHint(
  vizMode: StatsLabVizMode,
  scaleMode: StatsLabScaleMode,
  lang: StatsLabLang,
): string | null {
  if (vizMode === "RADAR_PIZZA") {
    return lang === "pl"
      ? "Im dalej od środka tarczy, tym lepszy wynik w danej statystyce (w pigułkach podano rzeczywiste liczby). OCENA (0–100) podsumowuje wybrane kryteria na tle grupy."
      : "Further from the center means a stronger result in that stat (pills show actual numbers). RATING (0–100) summarizes the selected criteria against the group.";
  }
  if (vizMode === "STACKED_COMPOSITE") {
    if (scaleMode === "PERCENTILE") {
      return lang === "pl"
        ? "Całkowita długość paska odpowiada ogólnej OCENIE (0–100) wyliczonej z wybranych kryteriów na tle grupy, a liczby na paskach to rzeczywiste statystyki zawodnika."
        : "Total bar length reflects the overall RATING (0–100) calculated from the selected criteria against the group, while numbers inside bars show actual stats.";
    }
    return lang === "pl"
      ? "Każda kolumna prezentuje rzeczywistą statystykę zawodnika (pasek = proporcja względem lidera na wykresie). OCENA (0–100) to ogólna nota wyliczona z wybranych wyżej kryteriów na tle analizowanej grupy."
      : "Each column shows the player's actual stat (bar = proportion vs chart leader). RATING (0–100) is the overall score calculated from the selected criteria against the comparison group.";
  }
  if (vizMode === "SCATTER_2D") {
    if (scaleMode === "PERCENTILE") {
      return lang === "pl"
        ? "Osie X i Y pokazują pozycję na tle grupy (0–100) w dwóch wybranych cechach (prawy górny róg ↗ = czołówka w obu), a linie przerywane wyznaczają środek grupy (P50)."
        : "Axes X and Y show group rank (0–100) across the two selected stats (top-right ↗ = elite in both), while dashed lines mark the group midpoint (P50).";
    }
    return lang === "pl"
      ? "Osie X i Y pokazują rzeczywiste wartości dwóch wybranych statystyk (prawy górny róg ↗ = najlepszy profil), a linie przerywane wyznaczają średnią grupy odniesienia."
      : "Axes X and Y show actual values of the two selected stats (top-right ↗ = strongest profile), while dashed lines mark the comparison group average.";
  }
  if (vizMode === "HEATMAP_MATRIX") {
    return lang === "pl"
      ? "Liczby w kafelkach pokazują wartości statystyk, a kolor określa poziom gracza na tle grupy porównawczej (od Słabego do Elity); ★ oznacza lidera kolumny, a OCENA (0–100) podsumowuje wybrane cechy."
      : "Numbers in tiles show actual stats, while tile color reflects standing against the comparison group (from Poor to Elite); ★ marks the column leader, and RATING (0–100) summarizes selected stats.";
  }
  return null;
}

function pointsNetFooterExplain(lang: StatsLabLang): string {
  return lang === "pl"
    ? "Punkty Netto = oficjalny wynik w FPL (Punkty Brutto zdobyte na boisku pomniejszone o kary za stracone gole i kartki)."
    : "Net Points = official FPL total (Gross points earned minus deductions for goals conceded and cards).";
}

function streaksReturnFooterExplain(lang: StatsLabLang): string {
  return lang === "pl"
    ? "Zwrot FPL (Return) = Gol, Asysta, Czyste Konto (tylko GK/DEF +4 pkt), +2 pkt za próg DC (DEF ≥10, MID/FWD ≥12), 3+ obrony GK lub Bonus (BPS). Punkty za sam występ (1+ min / 60+ min) oraz +1 pkt CS pomocnika nie są liczone jako zwrot."
    : "FPL Return = Goal, Assist, Clean Sheet (GK/DEF +4 pts only), +2 pts DC threshold (DEF ≥10, MID/FWD ≥12), GK 3+ saves, or Bonus (BPS). Appearance points (1+ / 60+ mins) and MID +1 pt CS are excluded from returns.";
}

const METRIC_FOOTER_VIZ = new Set<StatsLabVizMode>([
  "STACKED_COMPOSITE",
  "RADAR_PIZZA",
  "SCATTER_2D",
  "HEATMAP_MATRIX",
]);

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
  onSelectDefaultStreaks,
  onSelectAllStreaks,
  onShowNegativesChange,
  onSelectPlayer,
  variant = "studio",
}: Props) {
  const isExport = variant === "export";
  const theme = STATS_LAB_CHART_THEMES[themeId];
  const isLightTheme = themeId === "ANALYST_LIGHT";
  const copy = t(lang);
  const allPlayers = result?.plottedPlayers ?? [];
  /** Radar rysuje max 4 — tytuł TOP X i props muszą być WYSIWYG. */
  const MAX_RADAR_PLAYERS = 4;
  const players =
    vizMode === "RADAR_PIZZA"
      ? allPlayers.slice(0, MAX_RADAR_PLAYERS)
      : allPlayers;
  const metrics = result?.activeMetrics?.length
    ? result.activeMetrics
    : filter.activeMetrics;

  const title =
    customTitle.trim() || autoTitle(filter, vizMode, lang, players);
  const technicalSubtitle = `${lang === "pl" ? "Sezon" : "Season"} ${seasonCode} · ${autoSubtitle(
    filter,
    result?.poolSize ?? 0,
    result?.effectiveGwRange ?? [0, 0],
    lang,
    scaleMode,
    vizMode,
  )}`;
  const authoredSubtitle = customSubtitle.trim();

  const isMatchTotalsViz =
    vizMode === "POINTS_BREAKDOWN" || vizMode === "STREAKS_EXPLORER";

  /** Pigułki skrót→nazwa w stopce (bez descriptionPl/En). */
  const footerMetricKeys: FplStatKey[] = METRIC_FOOTER_VIZ.has(vizMode)
    ? vizMode === "SCATTER_2D"
      ? [axisX, axisY]
      : metrics.slice(0, 8)
    : [];

  const readingHint = chartReadingHint(vizMode, scaleMode, lang);

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
            className={`text-[10px] font-black uppercase tracking-[0.32em] sm:text-xs ${
              isLightTheme ? "text-emerald-700" : ""
            }`}
            style={isLightTheme ? undefined : { color: theme.accent }}
          >
            FPL ARENA • STATS LAB
          </p>
          <h2
            className={
              isExport
                ? "text-[34px] font-black leading-tight tracking-tight sm:text-[38px]"
                : "text-2xl font-black leading-tight tracking-tight sm:text-[32px]"
            }
            style={{
              fontFamily: "var(--font-oswald), Oswald, sans-serif",
              color: theme.text,
            }}
          >
            {title}
          </h2>
          {authoredSubtitle ? (
            <>
              <p
                className={
                  isExport
                    ? isLightTheme
                      ? "text-base font-semibold text-slate-700 sm:text-lg"
                      : "text-base font-medium text-slate-300 sm:text-lg"
                    : isLightTheme
                      ? "text-sm font-semibold text-slate-700"
                      : "text-sm font-medium text-slate-300"
                }
              >
                {authoredSubtitle}
              </p>
              <p
                className="mt-0.5 text-[11px] font-medium opacity-75"
                style={{ color: isLightTheme ? "#475569" : theme.muted }}
              >
                {technicalSubtitle}
              </p>
            </>
          ) : (
            <p
              className={
                isExport
                  ? isLightTheme
                    ? "text-base font-semibold text-slate-700 sm:text-lg"
                    : "text-base font-medium text-slate-300 sm:text-lg"
                  : isLightTheme
                    ? "text-sm font-semibold text-slate-700"
                    : "text-sm font-medium text-slate-300"
              }
            >
              {technicalSubtitle}
            </p>
          )}
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
            per90={filter.per90}
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
            onSelectDefaultStreaks={onSelectDefaultStreaks}
            onSelectAllStreaks={onSelectAllStreaks}
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
            per90={filter.per90}
            poolSize={result.poolSize}
            showPlayerMeta={showPlayerMeta}
            showBarValues={forceShowValues}
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
            scaleMode={scaleMode}
            per90={filter.per90}
            poolSize={result.poolSize}
          />
        ) : (
          <HeatmapMatrixChart
            players={players}
            metrics={metrics}
            poolAverages={result.poolAverages}
            poolSize={result.poolSize}
            theme={theme}
            lang={lang}
            scaleMode={scaleMode}
            per90={filter.per90}
            showValues={forceShowValues}
            showMeta={showPlayerMeta}
            showAvg={showPoolAverage}
            spotlightId={spotlightPlayerId}
            onSelectPlayer={onSelectPlayer}
            variant={variant === "export" ? "export" : "interactive"}
            rankedByStat={filter.sortByStat}
          />
        )}
      </div>

      {/* Stopka plakatu: pigułki skrótów + 1-zdaniowa instrukcja */}
      <div
        className={
          isExport
            ? "space-y-3 border-t px-7 py-5"
            : "space-y-2 border-t px-5 py-4 sm:px-6"
        }
        style={{ borderColor: theme.border }}
      >
        {footerMetricKeys.length > 0 ? (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {footerMetricKeys.map((key, idx) => {
              const accentColor = getMetricColor(idx, theme);
              return (
                <span
                  key={`foot-metric-${key}`}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] ${
                    isLightTheme
                      ? "border-slate-200 bg-slate-50"
                      : "border-white/10 bg-slate-950/65"
                  }`}
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor: accentColor,
                  }}
                >
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                      isLightTheme ? "ring-1 ring-black/15" : ""
                    }`}
                    style={{ backgroundColor: accentColor }}
                    aria-hidden
                  />
                  <span
                    className={
                      isLightTheme
                        ? "font-bold text-slate-900"
                        : "font-bold text-white"
                    }
                  >
                    {statLabel(key, lang, true)}:
                  </span>
                  <span
                    className={
                      isLightTheme ? "text-slate-700" : "text-slate-300"
                    }
                  >
                    {statLabel(key, lang, false)}
                  </span>
                </span>
              );
            })}
          </div>
        ) : null}

        {vizMode === "POINTS_BREAKDOWN" ? (
          <p
            className={`mb-2 text-[11px] leading-relaxed opacity-80 ${
              isLightTheme ? "font-medium text-slate-700" : ""
            }`}
            style={isLightTheme ? undefined : { color: theme.muted }}
          >
            {pointsNetFooterExplain(lang)}
          </p>
        ) : vizMode === "STREAKS_EXPLORER" ? (
          <p
            className={`mb-2 text-[11px] leading-relaxed opacity-80 ${
              isLightTheme ? "font-medium text-slate-700" : ""
            }`}
            style={isLightTheme ? undefined : { color: theme.muted }}
          >
            {streaksReturnFooterExplain(lang)}
          </p>
        ) : readingHint ? (
          <p
            className={`mb-2 text-[11px] leading-relaxed opacity-80 ${
              isLightTheme ? "font-medium text-slate-700" : ""
            }`}
            style={isLightTheme ? undefined : { color: theme.muted }}
          >
            {readingHint}
          </p>
        ) : null}

        <div
          className={`flex flex-wrap items-center justify-between gap-3 pt-1 ${
            isExport ? "text-base" : "text-[10px]"
          } ${isLightTheme ? "font-medium text-slate-700" : ""}`}
          style={isLightTheme ? undefined : { color: theme.muted }}
        >
          {isMatchTotalsViz ? (
            <span>
              {lang === "pl"
                ? "Sumy meczowe · bez skali percentylowej"
                : "Match totals · no percentile scale"}
            </span>
          ) : (
            <span />
          )}
          <span
            className={
              isExport
                ? isLightTheme
                  ? "text-base font-black tracking-wide text-emerald-700"
                  : "text-base font-extrabold tracking-wide"
                : isLightTheme
                  ? "font-black tracking-wide text-emerald-700"
                  : "font-semibold tracking-wide"
            }
            style={
              isLightTheme
                ? undefined
                : { color: isExport ? "#39FF14" : theme.muted }
            }
          >
            www.fpl-arena.com • Powered by St0pa | FPL Arena
          </span>
        </div>
      </div>
    </div>
  );
}
