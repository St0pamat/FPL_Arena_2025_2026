"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  ChartScatter,
  Database,
  Flame,
  Grid3X3,
  Layers,
  Loader2,
  PieChart,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { queryStatsLabComparisonAction } from "@/app/admin/actions/statsLabStudio";
import type {
  StatsLabBootstrapData,
  StatsLabComparisonResult,
} from "@/lib/stats-lab/analyticsEngine";
import {
  STATS_LAB_PRESETS,
  applyStatsLabPreset,
  createDefaultStatsLabFilter,
  defaultActiveMetricsForPositions,
  isSortByStatAlignedWithPositions,
  type StatsLabPresetId,
  type StatsLabQueryFilter,
} from "@/lib/stats-lab/presets";
import { DEFAULT_STATS_LAB_SEASON } from "@/lib/stats-lab/syncEngine";
import type { FplStatKey } from "@/lib/stats-lab/types";
import type {
  StatsLabLang,
  StatsLabScaleMode,
  StreakMetricKey,
} from "@/lib/stats-lab/i18n";
import {
  STREAK_METRIC_KEYS,
  VIZ_MODE_LABELS,
  defaultStreakKeysForPositions,
  t,
} from "@/lib/stats-lab/i18n";
import {
  STATS_LAB_CHART_THEMES,
  type StatsLabChartThemeId,
  type StatsLabVizMode,
} from "@/components/admin/stats-lab/chartTheme";
import {
  StatsLabControlPanel,
  type StudioUiState,
} from "@/components/admin/stats-lab/StatsLabControlPanel";
import { StatsLabChartCanvas } from "@/components/admin/stats-lab/StatsLabChartCanvas";
import { StatsLabExportBar } from "@/components/admin/stats-lab/StatsLabExportBar";
import { StatsLabPosterFrame } from "@/components/admin/stats-lab/StatsLabPosterFrame";
import { StatsLabExportNode } from "@/components/admin/stats-lab/StatsLabExportNode";
import { RadarQuickSlotsBar } from "@/components/admin/stats-lab/RadarQuickSlotsBar";
import type { PointsSortKey } from "@/components/admin/stats-lab/charts/PointsBreakdownChart";
import type { KnowledgeHelpAnchor } from "@/lib/stats-lab/knowledgeBaseContent";
import {
  getStatsLabMenuChrome,
  STATS_LAB_THEME_SYNC_EVENT,
} from "@/lib/stats-lab/menuChrome";

type Props = {
  bootstrap: StatsLabBootstrapData;
  initialResult: StatsLabComparisonResult | null;
  initialFilter: StatsLabQueryFilter;
  /** Watchlist / deep-link z Stats Centre → Tryb Ręczny */
  seedSelectedPlayerIds?: number[];
  seedLang?: StatsLabLang;
  seedChartTheme?: StatsLabChartThemeId;
  onLangChange?: (lang: StatsLabLang) => void;
  onChartThemeChange?: (theme: StatsLabChartThemeId) => void;
  onOpenKnowledge?: (anchor?: KnowledgeHelpAnchor) => void;
};

const VIZ_TABS: {
  id: StatsLabVizMode;
  icon: typeof BarChart3;
}[] = [
  { id: "STACKED_COMPOSITE", icon: Layers },
  { id: "POINTS_BREAKDOWN", icon: Activity },
  { id: "STREAKS_EXPLORER", icon: Flame },
  { id: "RADAR_PIZZA", icon: PieChart },
  { id: "SCATTER_2D", icon: ChartScatter },
  { id: "HEATMAP_MATRIX", icon: Grid3X3 },
];

const DEFAULT_UI: StudioUiState = {
  vizMode: "STACKED_COMPOSITE",
  pickMode: "AUTO",
  chartTheme: "ARENA_DARK",
  lang: "pl",
  scaleMode: "PERCENTILE",
  customTitle: "",
  customSubtitle: "",
  showPoolAverage: false,
  showBarValues: true,
  showPlayerMeta: true,
  showNegativeBreakdown: false,
  spotlightPlayerId: null,
  axisX: "expected_goal_involvements",
  axisY: "total_points",
  sortByComposite: false,
};

export function StatsLabStudioClient({
  bootstrap,
  initialResult,
  initialFilter,
  seedSelectedPlayerIds,
  seedLang,
  seedChartTheme,
  onLangChange,
  onChartThemeChange,
  onOpenKnowledge,
}: Props) {
  const seededFilter = useMemo((): StatsLabQueryFilter => {
    const ids = seedSelectedPlayerIds?.filter((n) => n > 0) ?? [];
    if (!ids.length) return initialFilter;
    return {
      ...initialFilter,
      selectedPlayerIds: ids,
    };
  }, [initialFilter, seedSelectedPlayerIds]);

  const [filter, setFilter] = useState<StatsLabQueryFilter>(seededFilter);
  const [ui, setUi] = useState<StudioUiState>(() => ({
    ...DEFAULT_UI,
    lang: seedLang ?? DEFAULT_UI.lang,
    chartTheme: seedChartTheme ?? DEFAULT_UI.chartTheme,
    pickMode:
      seedSelectedPlayerIds && seedSelectedPlayerIds.length > 0
        ? "MANUAL"
        : DEFAULT_UI.pickMode,
  }));
  const [result, setResult] = useState<StatsLabComparisonResult | null>(
    initialResult,
  );
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<StatsLabPresetId | null>(
    "DEF_COMPLETE",
  );
  const [pending, startTransition] = useTransition();

  const [chartSortKey, setChartSortKey] = useState<FplStatKey | "composite">(
    "composite",
  );
  const [chartSortDir, setChartSortDir] = useState<"DESC" | "ASC">("DESC");
  const [pointsSortKey, setPointsSortKey] =
    useState<PointsSortKey>("estimatedTotal");
  const [streakSortKey, setStreakSortKey] =
    useState<StreakMetricKey>("returnConsistencyPct");
  const [activeStreakKeys, setActiveStreakKeys] = useState<StreakMetricKey[]>(
    () => defaultStreakKeysForPositions(seededFilter.positions),
  );
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const emptyDb = bootstrap.players.length === 0;
  const copy = t(ui.lang);

  function openKnowledge(anchor: KnowledgeHelpAnchor = "general") {
    onOpenKnowledge?.(anchor);
  }

  const runQuery = useCallback(
    (nextFilter: StatsLabQueryFilter) => {
      startTransition(async () => {
        try {
          setError(null);
          const isPointsBreakdown = ui.vizMode === "POINTS_BREAKDOWN";
          const isStreaks = ui.vizMode === "STREAKS_EXPLORER";
          // Composite TYLKO przy jawnym przełączniku i TYLKO na widokach wielometrycznych.
          // Zmiana vizMode / okresu / per90 NIGDY nie włącza composite po cichu.
          const allowComposite =
            !isPointsBreakdown &&
            !isStreaks &&
            ui.sortByComposite === true;
          const payload: StatsLabQueryFilter = {
            ...nextFilter,
            selectedPlayerIds:
              ui.pickMode === "MANUAL" ? nextFilter.selectedPlayerIds : [],
            // STREAKS: sortuj całą pulę po serii przed Top N
            streakSortKey: isStreaks ? streakSortKey : undefined,
            sortByComposite: allowComposite,
            // POINTS_BREAKDOWN: Top N + kolejność = oficjalne sumy FPL (nie Per 90)
            sortByRawValues: isPointsBreakdown ? true : false,
            ...(isPointsBreakdown
              ? {
                  sortByStat: "total_points" as FplStatKey,
                  sortDirection: "DESC" as const,
                }
              : {}),
          };
          const data = await queryStatsLabComparisonAction(payload);
          setResult(data);
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Błąd zapytania Stats Lab.",
          );
        }
      });
    },
    [ui.pickMode, ui.vizMode, ui.scaleMode, ui.sortByComposite, streakSortKey],
  );

  useEffect(() => {
    if (emptyDb) return;
    // Każda zmiana filter (w tym minMinutes w trybie MANUAL) → odświeżenie puli odniesienia
    const tmr = window.setTimeout(() => runQuery(filter), 80);
    return () => window.clearTimeout(tmr);
  }, [
    filter,
    filter.minMinutes,
    filter.selectedPlayerIds,
    emptyDb,
    runQuery,
    ui.vizMode,
    ui.scaleMode,
    ui.sortByComposite,
    streakSortKey,
  ]);

  // Deep-link z Stats Centre: ustaw Watchlistę jako wybór ręczny
  useEffect(() => {
    const ids = seedSelectedPlayerIds?.filter((n) => n > 0) ?? [];
    if (!ids.length) return;
    setUi((prev) => ({ ...prev, pickMode: "MANUAL" }));
    setFilter((prev) => ({
      ...prev,
      selectedPlayerIds: ids,
    }));
  }, [seedSelectedPlayerIds]);

  /**
   * Kolejność plottedPlayers pochodzi WYŁĄCZNIE z silnika
   * (sort całej comparisonPool → dopiero slice Top N).
   * Zakaz post-slice re-sortu po composite — psuje TOP N po sortByStat
   * (lider TP wypada poza MAX 4 na radarze).
   *
   * POINTS_BREAKDOWN: silnik sortuje po raw total_points; tutaj dodatkowo
   * synchronizujemy kolejność 1:1 z lokalnym sortem wykresu (estimatedTotal /
   * kategoria), żeby audit.json === canvas.
   */
  const displayResult = useMemo((): StatsLabComparisonResult | null => {
    if (!result) return null;
    if (ui.vizMode !== "POINTS_BREAKDOWN") return result;

    // 1:1 z PointsBreakdownChart.readSortValue — audit.json === canvas
    const read = (
      p: StatsLabComparisonResult["plottedPlayers"][number],
    ): number => {
      const bd = p.pointsBreakdown;
      if (pointsSortKey === "estimatedTotal") return bd.estimatedTotal;
      if (pointsSortKey === "positiveTotal") return bd.positiveTotal;
      if (pointsSortKey === "negativeTotal") return bd.negativeTotal;
      if (pointsSortKey === "appearancePts") {
        return bd.positiveBreakdown.appearancePts;
      }
      if (pointsSortKey in bd.positiveBreakdown) {
        return Number(
          bd.positiveBreakdown[
            pointsSortKey as keyof typeof bd.positiveBreakdown
          ] ?? 0,
        );
      }
      return Number(
        bd.negativeBreakdown[
          pointsSortKey as keyof typeof bd.negativeBreakdown
        ] ?? 0,
      );
    };

    const mul = chartSortDir === "DESC" ? 1 : -1;
    const sorted = [...result.plottedPlayers].sort((a, b) => {
      const primary = (read(b) - read(a)) * mul;
      if (primary !== 0) return primary;
      return (b.pointsBreakdown.estimatedTotal - a.pointsBreakdown.estimatedTotal) * mul;
    });
    return { ...result, plottedPlayers: sorted };
  }, [result, ui.vizMode, pointsSortKey, chartSortDir]);

  /** Kandydaci Spotlight = gracze na wykresie (Radar: max 4). */
  const spotlightPlottedPlayers = useMemo(() => {
    const all = displayResult?.plottedPlayers ?? [];
    return ui.vizMode === "RADAR_PIZZA" ? all.slice(0, 4) : all;
  }, [displayResult?.plottedPlayers, ui.vizMode]);

  // Spotlight poza aktualnym wykresem → natychmiastowy reset
  useEffect(() => {
    const id = ui.spotlightPlayerId;
    if (id == null) return;
    const onChart = spotlightPlottedPlayers.some(
      (p) => p.fpl_element_id === id,
    );
    if (!onChart) {
      setUi((prev) =>
        prev.spotlightPlayerId == null
          ? prev
          : { ...prev, spotlightPlayerId: null },
      );
    }
  }, [ui.spotlightPlayerId, spotlightPlottedPlayers]);

  function onFilterChange(next: StatsLabQueryFilter) {
    setActivePreset(null);
    const prevPos = filter.positions.join(",");
    const nextPos = next.positions.join(",");
    let resolved = next;
    if (prevPos !== nextPos) {
      setActiveStreakKeys(defaultStreakKeysForPositions(next.positions));
      // Auto-metryki pozycji, jeśli użytkownik nie zmieniał ich w tym samym kroku.
      const metricsUnchanged =
        next.activeMetrics.join(",") === filter.activeMetrics.join(",");
      if (metricsUnchanged) {
        resolved = {
          ...next,
          activeMetrics: defaultActiveMetricsForPositions(next.positions),
        };
      }
      // Po zmianie formacji: sortByStat musi pasować do pozycji / nowych metryk
      // (np. FWD preset sort=goals_scored → klik GK → TP DESC, nie gole).
      if (
        !isSortByStatAlignedWithPositions(
          resolved.sortByStat,
          resolved.positions,
          resolved.activeMetrics,
        )
      ) {
        resolved = {
          ...resolved,
          sortByStat: "total_points",
          sortDirection: "DESC",
          sortByComposite: false,
        };
        setUi((prev) => ({ ...prev, sortByComposite: false }));
      }
    }
    // Zmiana sortByStat → wyłącz Composite (kolejność = silnik wg sortByStat)
    if (resolved.sortByStat !== filter.sortByStat) {
      resolved = { ...resolved, sortByComposite: false };
      setUi((prev) => ({ ...prev, sortByComposite: false }));
    }
    // Zmiana okresu / klubów / per90 / pozycji NIGDY nie włącza composite
    if (resolved.sortByComposite !== true) {
      resolved = { ...resolved, sortByComposite: false };
    }
    setFilter(resolved);
  }

  useEffect(() => {
    if (seedLang) setUi((prev) => ({ ...prev, lang: seedLang }));
  }, [seedLang]);

  useEffect(() => {
    if (seedChartTheme) {
      setUi((prev) => ({ ...prev, chartTheme: seedChartTheme }));
    }
  }, [seedChartTheme]);

  useEffect(() => {
    function onThemeSync(ev: Event) {
      const detail = (ev as CustomEvent<{ themeId?: string; lang?: string }>)
        .detail;
      if (!detail) return;
      setUi((prev) => {
        const next = { ...prev };
        if (
          detail.themeId === "ARENA_DARK" ||
          detail.themeId === "SCOUT_DARK" ||
          detail.themeId === "ANALYST_LIGHT"
        ) {
          next.chartTheme = detail.themeId;
        }
        if (detail.lang === "pl" || detail.lang === "en") {
          next.lang = detail.lang;
        }
        return next;
      });
      if (
        detail.themeId === "ARENA_DARK" ||
        detail.themeId === "SCOUT_DARK" ||
        detail.themeId === "ANALYST_LIGHT"
      ) {
        onChartThemeChange?.(detail.themeId);
      }
      if (detail.lang === "pl" || detail.lang === "en") {
        onLangChange?.(detail.lang);
      }
    }
    window.addEventListener(STATS_LAB_THEME_SYNC_EVENT, onThemeSync);
    return () =>
      window.removeEventListener(STATS_LAB_THEME_SYNC_EVENT, onThemeSync);
  }, [onChartThemeChange, onLangChange]);

  function onUiChange(patch: Partial<StudioUiState>) {
    setUi((prev) => {
      const next = { ...prev, ...patch };
      // Czysty plakat Radar: bez przerywanej średniej przy wejściu na zakładkę
      if (
        patch.vizMode === "RADAR_PIZZA" &&
        prev.vizMode !== "RADAR_PIZZA"
      ) {
        next.showPoolAverage = false;
      }
      // Wejście na POINTS_BREAKDOWN / STREAKS: composite zawsze OFF (brak sensu UX)
      if (
        patch.vizMode === "POINTS_BREAKDOWN" ||
        patch.vizMode === "STREAKS_EXPLORER"
      ) {
        next.sortByComposite = false;
      }
      return next;
    });
    // Źródło prawdy audytu = filter.sortByComposite (1:1 z payloadem silnika)
    if (patch.sortByComposite !== undefined) {
      setFilter((prev) => ({
        ...prev,
        sortByComposite: patch.sortByComposite === true,
      }));
    }
    if (
      patch.vizMode === "POINTS_BREAKDOWN" ||
      patch.vizMode === "STREAKS_EXPLORER"
    ) {
      setFilter((prev) => ({ ...prev, sortByComposite: false }));
    }
    if (patch.lang != null) onLangChange?.(patch.lang);
    if (patch.chartTheme != null) onChartThemeChange?.(patch.chartTheme);
  }

  function applyPreset(id: StatsLabPresetId) {
    const next = applyStatsLabPreset(
      id,
      createDefaultStatsLabFilter(
        bootstrap.seasonCode || DEFAULT_STATS_LAB_SEASON,
      ),
    );
    setActivePreset(id);
    // Preset zawsze wraca do sortByStat z presetu — Composite OFF
    setUi((prev) => ({ ...prev, pickMode: "AUTO", sortByComposite: false }));
    setFilter({ ...next, selectedPlayerIds: [], sortByComposite: false });
    setActiveStreakKeys(defaultStreakKeysForPositions(next.positions));
  }

  function resetFilters() {
    setActivePreset(null);
    setUi(DEFAULT_UI);
    setFilter(
      createDefaultStatsLabFilter(
        bootstrap.seasonCode || DEFAULT_STATS_LAB_SEASON,
      ),
    );
  }

  function toggleChartSort(key: FplStatKey | "composite") {
    if (chartSortKey === key) {
      setChartSortDir((d) => (d === "DESC" ? "ASC" : "DESC"));
    } else {
      setChartSortKey(key);
      setChartSortDir("DESC");
    }
  }

  function togglePointsSort(key: PointsSortKey) {
    if (pointsSortKey === key) {
      setChartSortDir((d) => (d === "DESC" ? "ASC" : "DESC"));
    } else {
      setPointsSortKey(key);
      setChartSortDir("DESC");
    }
  }

  function toggleStreakSort(key: StreakMetricKey) {
    setStreakSortKey(key);
    setChartSortDir("DESC");
  }

  function toggleStreakKey(key: StreakMetricKey) {
    setActiveStreakKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev;
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  }

  function selectDefaultStreaks() {
    setActiveStreakKeys(defaultStreakKeysForPositions(filter.positions));
  }

  function selectAllStreaks() {
    setActiveStreakKeys(
      STREAK_METRIC_KEYS.filter((k) => k !== "max60MinStreak"),
    );
  }

  if (emptyDb) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-12 text-center">
        <p className="text-sm font-semibold text-amber-200">
          {ui.lang === "pl"
            ? "Baza Stats Lab jest pusta — najpierw uruchom Incremental Sync."
            : "Stats Lab database is empty — run Incremental Sync first."}
        </p>
        <Link
          href="/admin/stats-lab/sync"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#39FF14] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-black"
        >
          <Database className="h-3.5 w-3.5" />
          {ui.lang === "pl" ? "Przejdź do synchronizacji" : "Go to sync"}
        </Link>
      </div>
    );
  }

  const chrome = getStatsLabMenuChrome(ui.chartTheme);
  const hideShellDupes = typeof onChartThemeChange === "function";

  return (
    <div className="space-y-5">
      {/* Top bar: scale + presets + viz (theme/lang w shellu) */}
      <div className={`space-y-3 rounded-2xl p-4 ${chrome.panel}`}>
        <div className="flex flex-wrap items-center gap-2">
          {!hideShellDupes ? (
            <>
              <div className={`inline-flex rounded-xl p-1 ${chrome.group}`}>
                <button
                  type="button"
                  onClick={() => onUiChange({ lang: "pl" })}
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] uppercase ${
                    ui.lang === "pl" ? chrome.activeBtn : chrome.inactiveBtn
                  }`}
                  title={copy.langPl}
                >
                  🇵🇱 PL
                </button>
                <button
                  type="button"
                  onClick={() => onUiChange({ lang: "en" })}
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] uppercase ${
                    ui.lang === "en" ? chrome.activeBtn : chrome.inactiveBtn
                  }`}
                  title={copy.langEn}
                >
                  🇬🇧 EN
                </button>
              </div>

              <div className={`inline-flex rounded-xl p-1 ${chrome.group}`}>
                {(
                  Object.keys(STATS_LAB_CHART_THEMES) as StatsLabChartThemeId[]
                ).map((id) => {
                  const th = STATS_LAB_CHART_THEMES[id];
                  const label = ui.lang === "en" ? th.labelEn : th.labelPl;
                  return (
                    <button
                      key={id}
                      type="button"
                      title={label}
                      onClick={() => onUiChange({ chartTheme: id })}
                      className={`rounded-lg px-2.5 py-1.5 text-[10px] uppercase ${
                        ui.chartTheme === id
                          ? chrome.activeBtn
                          : chrome.inactiveBtn
                      }`}
                    >
                      {id === "ARENA_DARK"
                        ? "Arena"
                        : id === "SCOUT_DARK"
                          ? "Scout"
                          : "Light"}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          <div className="inline-flex items-center gap-1">
            <div className={`inline-flex rounded-xl p-1 ${chrome.group}`}>
              {(
                [
                  ["PERCENTILE", copy.scalePercentile],
                  ["RAW", copy.scaleRaw],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  title={
                    mode === "PERCENTILE"
                      ? copy.percentileExplain
                      : copy.rawExplain
                  }
                  onClick={() =>
                    onUiChange({ scaleMode: mode as StatsLabScaleMode })
                  }
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] uppercase ${
                    ui.scaleMode === mode
                      ? chrome.activeBtn
                      : chrome.inactiveBtn
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className={`ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] uppercase tracking-wider ${chrome.inactiveBtn}`}
          >
            <RefreshCw className="h-3 w-3" />
            {copy.resetFilters}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[10px] font-black uppercase tracking-wider ${chrome.mutedLabel}`}>
            {copy.presets}
          </span>
          {STATS_LAB_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              title={ui.lang === "en" ? p.descriptionEn : p.descriptionPl}
              onClick={() => applyPreset(p.id)}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] uppercase tracking-wider ${
                activePreset === p.id ? chrome.activeBtn : chrome.inactiveBtn
              }`}
            >
              {ui.lang === "en" ? p.labelEn : p.labelPl}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {VIZ_TABS.map((tab) => {
            const Icon = tab.icon;
            const on = ui.vizMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onUiChange({ vizMode: tab.id })}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] uppercase tracking-wider ${
                  on ? chrome.activeBtn : chrome.inactiveBtn
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {VIZ_MODE_LABELS[ui.lang][tab.id]}
              </button>
            );
          })}

          {ui.vizMode === "POINTS_BREAKDOWN" ? (
            <label
              className={`inline-flex min-h-[28px] cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold ${chrome.inactiveBtn}`}
            >
              <input
                type="checkbox"
                className="accent-[#39FF14]"
                checked={ui.showNegativeBreakdown}
                onChange={(e) =>
                  onUiChange({ showNegativeBreakdown: e.target.checked })
                }
              />
              {copy.showNegatives}
            </label>
          ) : null}

          <button
            type="button"
            onClick={() => setIsControlPanelCollapsed((v) => !v)}
            className={`ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] uppercase tracking-wider ${
              isControlPanelCollapsed ? chrome.activeBtn : chrome.inactiveBtn
            }`}
            title={
              isControlPanelCollapsed
                ? "Pokaż panel filtrów"
                : "Ukryj panel filtrów / pełna szerokość wykresu"
            }
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {isControlPanelCollapsed
              ? ui.lang === "pl"
                ? "Pokaż filtry"
                : "Show filters"
              : ui.lang === "pl"
                ? "Ukryj filtry / pełna szerokość"
                : "Hide filters / full width"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <div
        className={`grid gap-5 ${
          isControlPanelCollapsed
            ? "grid-cols-1"
            : "2xl:grid-cols-[340px_minmax(0,1fr)]"
        }`}
      >
        {!isControlPanelCollapsed ? (
          <div className="min-w-0 2xl:block">
            <StatsLabControlPanel
              bootstrap={bootstrap}
              filter={filter}
              ui={ui}
              plottedPlayers={spotlightPlottedPlayers}
              onFilterChange={onFilterChange}
              onUiChange={onUiChange}
              onOpenKnowledge={openKnowledge}
              activeStreakKeys={activeStreakKeys}
              onToggleStreakKey={toggleStreakKey}
              onSelectDefaultStreaks={selectDefaultStreaks}
              onSelectAllStreaks={selectAllStreaks}
            />
          </div>
        ) : null}

        <div className="min-w-0 space-y-4">
          <StatsLabExportBar
            exportRef={exportRef}
            result={displayResult}
            filter={filter}
            vizMode={ui.vizMode}
            lang={ui.lang}
            scaleMode={ui.scaleMode}
            seasonCode={bootstrap.seasonCode}
            customTitle={ui.customTitle}
            chartTheme={ui.chartTheme}
            activeStreakKeys={activeStreakKeys}
            showNegativeBreakdown={ui.showNegativeBreakdown}
            streakSortKey={streakSortKey}
            scatterAxisX={ui.axisX}
            scatterAxisY={ui.axisY}
          />

          {/* Poza exportRef / PosterFrame — nigdy nie trafia na PNG */}
          {ui.vizMode === "RADAR_PIZZA" ? (
            <RadarQuickSlotsBar
              bootstrap={bootstrap}
              plottedPlayers={displayResult?.plottedPlayers ?? []}
              spotlightId={ui.spotlightPlayerId}
              lang={ui.lang}
              themeId={ui.chartTheme}
              positionFilter={filter.positions}
              onAssignIds={(ids) => {
                setUi((prev) => ({ ...prev, pickMode: "MANUAL" }));
                setActivePreset(null);
                setFilter((prev) => ({
                  ...prev,
                  selectedPlayerIds: ids,
                }));
              }}
              onSpotlight={(id) =>
                onUiChange({ spotlightPlayerId: id })
              }
              onResetAutoTop4={() => {
                setUi((prev) => ({ ...prev, pickMode: "AUTO" }));
                setActivePreset(null);
                setFilter((prev) => ({
                  ...prev,
                  selectedPlayerIds: [],
                  limitPlayers: Math.min(
                    Math.max(prev.limitPlayers || 4, 4),
                    4,
                  ),
                }));
              }}
            />
          ) : null}

          <div data-stats-lab-canvas-preview="true" className="relative">
            {pending && displayResult ? (
              <div className="pointer-events-none absolute right-3 top-3 z-30">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm ${
                    chrome.isLight
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-emerald-300 bg-emerald-400 text-slate-950"
                  }`}
                >
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {ui.lang === "pl" ? "Przeliczanie…" : "Updating…"}
                </span>
              </div>
            ) : null}
            <StatsLabPosterFrame>
              <StatsLabChartCanvas
                result={displayResult}
                filter={filter}
                vizMode={ui.vizMode}
                themeId={ui.chartTheme}
                lang={ui.lang}
                scaleMode={ui.scaleMode}
                customTitle={ui.customTitle}
                customSubtitle={ui.customSubtitle}
                seasonCode={bootstrap.seasonCode}
                spotlightPlayerId={ui.spotlightPlayerId}
                showPoolAverage={ui.showPoolAverage}
                showBarValues={ui.showBarValues}
                showPlayerMeta={ui.showPlayerMeta}
                showNegativeBreakdown={ui.showNegativeBreakdown}
                axisX={ui.axisX}
                axisY={ui.axisY}
                pending={pending && !displayResult}
                chartSortKey={chartSortKey}
                chartSortDir={chartSortDir}
                pointsSortKey={pointsSortKey}
                streakSortKey={streakSortKey}
                activeStreakKeys={activeStreakKeys}
                onChartSort={toggleChartSort}
                onPointsSort={togglePointsSort}
                onStreakSort={toggleStreakSort}
                onToggleStreakKey={toggleStreakKey}
                onSelectDefaultStreaks={selectDefaultStreaks}
                onSelectAllStreaks={selectAllStreaks}
                onShowNegativesChange={(v) =>
                  onUiChange({ showNegativeBreakdown: v })
                }
                onSelectPlayer={(id) => onUiChange({ spotlightPlayerId: id })}
              />
            </StatsLabPosterFrame>
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-slate-600">
        <BarChart3 className="mr-1 inline h-3 w-3" />
        {copy.pool}: {displayResult?.poolSize ?? 0} · {copy.onChart}:{" "}
        {displayResult?.plottedPlayers.length ?? 0} · PNG plakat 1120px ·
        Discord / X.com
      </p>

      <StatsLabExportNode
        exportRef={exportRef}
        result={displayResult}
        filter={filter}
        vizMode={ui.vizMode}
        themeId={ui.chartTheme}
        lang={ui.lang}
        scaleMode={ui.scaleMode}
        customTitle={ui.customTitle}
        customSubtitle={ui.customSubtitle}
        seasonCode={bootstrap.seasonCode}
        spotlightPlayerId={ui.spotlightPlayerId}
        showPoolAverage={ui.showPoolAverage}
        showPlayerMeta={ui.showPlayerMeta}
        showNegativeBreakdown={ui.showNegativeBreakdown}
        axisX={ui.axisX}
        axisY={ui.axisY}
        chartSortKey={chartSortKey}
        chartSortDir={chartSortDir}
        pointsSortKey={pointsSortKey}
        streakSortKey={streakSortKey}
        activeStreakKeys={activeStreakKeys}
      />

    </div>
  );
}
