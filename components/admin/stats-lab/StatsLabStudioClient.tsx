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
  BookOpen,
  ChartScatter,
  Database,
  Flame,
  Grid3X3,
  Layers,
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
import { VIZ_MODE_LABELS, t } from "@/lib/stats-lab/i18n";
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
import { StatsLabKnowledgeBaseModal } from "@/components/admin/stats-lab/StatsLabKnowledgeBaseModal";
import type { PointsSortKey } from "@/components/admin/stats-lab/charts/PointsBreakdownChart";
import type { KnowledgeHelpAnchor } from "@/lib/stats-lab/knowledgeBaseContent";

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
  showPoolAverage: true,
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
  const [activeStreakKeys, setActiveStreakKeys] = useState<StreakMetricKey[]>([
    "returnConsistencyPct",
    "maxReturnStreak",
    "currentReturnStreak",
    "maxGoalStreak",
    "maxAssistStreak",
    "maxCleanSheetStreak",
    "maxDcPointsStreak",
  ]);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [knowledgeAnchor, setKnowledgeAnchor] =
    useState<KnowledgeHelpAnchor | null>(null);
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const emptyDb = bootstrap.players.length === 0;
  const copy = t(ui.lang);

  function openKnowledge(anchor: KnowledgeHelpAnchor = "general") {
    setKnowledgeAnchor(anchor);
    setKnowledgeOpen(true);
  }

  const runQuery = useCallback(
    (nextFilter: StatsLabQueryFilter) => {
      startTransition(async () => {
        try {
          setError(null);
          const payload: StatsLabQueryFilter = {
            ...nextFilter,
            selectedPlayerIds:
              ui.pickMode === "MANUAL" ? nextFilter.selectedPlayerIds : [],
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
    [ui.pickMode],
  );

  useEffect(() => {
    if (emptyDb) return;
    const tmr = window.setTimeout(() => runQuery(filter), 280);
    return () => window.clearTimeout(tmr);
  }, [filter, emptyDb, runQuery]);

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

  const displayResult = useMemo(() => {
    if (!result) return null;
    if (!ui.sortByComposite) return result;
    const plottedPlayers = [...result.plottedPlayers].sort(
      (a, b) => b.compositeScore - a.compositeScore,
    );
    return { ...result, plottedPlayers };
  }, [result, ui.sortByComposite]);

  function onFilterChange(next: StatsLabQueryFilter) {
    setActivePreset(null);
    setFilter(next);
  }

  useEffect(() => {
    if (seedLang) setUi((prev) => ({ ...prev, lang: seedLang }));
  }, [seedLang]);

  useEffect(() => {
    if (seedChartTheme) {
      setUi((prev) => ({ ...prev, chartTheme: seedChartTheme }));
    }
  }, [seedChartTheme]);

  function onUiChange(patch: Partial<StudioUiState>) {
    setUi((prev) => ({ ...prev, ...patch }));
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
    setUi((prev) => ({ ...prev, pickMode: "AUTO" }));
    setFilter({ ...next, selectedPlayerIds: [] });
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

  return (
    <div className="space-y-5">
      {/* Top bar: lang + scale + presets + viz */}
      <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => onUiChange({ lang: "pl" })}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase ${
                ui.lang === "pl" ? "bg-[#39FF14] text-black" : "text-slate-400"
              }`}
              title={copy.langPl}
            >
              🇵🇱 PL
            </button>
            <button
              type="button"
              onClick={() => onUiChange({ lang: "en" })}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase ${
                ui.lang === "en" ? "bg-[#39FF14] text-black" : "text-slate-400"
              }`}
              title={copy.langEn}
            >
              🇬🇧 EN
            </button>
          </div>

          <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950 p-1">
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
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase ${
                    ui.chartTheme === id
                      ? "bg-[#39FF14] text-black"
                      : "text-slate-400"
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

          <div className="inline-flex items-center gap-1">
            <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950 p-1">
              {(
                [
                  ["PERCENTILE", copy.scalePercentile],
                  ["RAW", copy.scaleRaw],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  title={label}
                  onClick={() =>
                    onUiChange({ scaleMode: mode as StatsLabScaleMode })
                  }
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase ${
                    ui.scaleMode === mode
                      ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                      : "text-slate-400"
                  }`}
                >
                  {mode === "PERCENTILE"
                    ? ui.lang === "pl"
                      ? "Percentyle"
                      : "Percentile"
                    : ui.lang === "pl"
                      ? "Surowe"
                      : "Raw"}
                </button>
              ))}
            </div>
            <button
              type="button"
              title={
                ui.lang === "pl"
                  ? "Co oznacza skala percentylowa?"
                  : "What does the percentile scale mean?"
              }
              onClick={() => openKnowledge("scale")}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 text-[10px] font-black text-slate-400 hover:border-[#39FF14] hover:text-[#39FF14]"
            >
              ?
            </button>
          </div>

          <button
            type="button"
            onClick={() => openKnowledge("general")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-200 hover:bg-emerald-500/20"
          >
            <BookOpen className="h-3.5 w-3.5" />
            {ui.lang === "pl"
              ? "📚 Baza Wiedzy i Zasady FPL"
              : "📚 FPL Knowledge Base & Guide"}
          </button>

          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white"
          >
            <RefreshCw className="h-3 w-3" />
            {copy.resetFilters}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            {copy.presets}
          </span>
          {STATS_LAB_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              title={ui.lang === "en" ? p.descriptionEn : p.descriptionPl}
              onClick={() => applyPreset(p.id)}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider ${
                activePreset === p.id
                  ? "bg-[#39FF14] text-black"
                  : "border border-slate-700 text-slate-300 hover:border-slate-500"
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
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-wider ${
                  on
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                    : "border border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {VIZ_MODE_LABELS[ui.lang][tab.id]}
              </button>
            );
          })}

          {ui.vizMode === "POINTS_BREAKDOWN" ? (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-[11px] font-bold text-slate-300">
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
            className={`ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-wider ${
              isControlPanelCollapsed
                ? "bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/40"
                : "border border-slate-700 text-slate-400 hover:text-slate-200"
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
              onFilterChange={onFilterChange}
              onUiChange={onUiChange}
              onOpenKnowledge={openKnowledge}
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
          />

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
              pending={pending}
              chartSortKey={chartSortKey}
              chartSortDir={chartSortDir}
              pointsSortKey={pointsSortKey}
              streakSortKey={streakSortKey}
              activeStreakKeys={activeStreakKeys}
              onChartSort={toggleChartSort}
              onPointsSort={togglePointsSort}
              onStreakSort={toggleStreakSort}
              onToggleStreakKey={toggleStreakKey}
              onShowNegativesChange={(v) =>
                onUiChange({ showNegativeBreakdown: v })
              }
              onSelectPlayer={(id) => onUiChange({ spotlightPlayerId: id })}
            />
          </StatsLabPosterFrame>
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

      <StatsLabKnowledgeBaseModal
        open={knowledgeOpen}
        lang={ui.lang}
        themeId={ui.chartTheme}
        helpAnchor={knowledgeAnchor}
        onLangChange={(lang) => onUiChange({ lang })}
        onClose={() => {
          setKnowledgeOpen(false);
          setKnowledgeAnchor(null);
        }}
      />
    </div>
  );
}
