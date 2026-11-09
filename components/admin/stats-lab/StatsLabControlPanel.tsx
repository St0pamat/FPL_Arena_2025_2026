"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Check, Search, X } from "lucide-react";
import type {
  StatsLabBootstrapData,
  StatsLabBootstrapPlayer,
} from "@/lib/stats-lab/analyticsEngine";
import type {
  StatsLabPeriodMode,
  StatsLabQueryFilter,
} from "@/lib/stats-lab/presets";
import { TOP_N_OPTIONS } from "@/lib/stats-lab/presets";
import type { FplStatCategory, FplStatKey } from "@/lib/stats-lab/types";
import {
  FPL_STAT_DEFINITIONS,
  getFplPositionLabelEn,
  getFplStatDefinition,
} from "@/lib/stats-lab/types";
import type {
  StatsLabLang,
  StatsLabScaleMode,
  StreakMetricKey,
} from "@/lib/stats-lab/i18n";
import {
  PERIOD_LABELS,
  STREAK_LABELS,
  STREAK_METRIC_KEYS,
  categoryLabel,
  statLabel,
  statShort,
  t,
} from "@/lib/stats-lab/i18n";
import type {
  StatsLabChartThemeId,
  StatsLabVizMode,
} from "@/components/admin/stats-lab/chartTheme";
import { STATS_LAB_CHART_THEMES } from "@/components/admin/stats-lab/chartTheme";
import { KnowledgeHelpButton } from "@/components/admin/stats-lab/StatsLabKnowledgeBaseModal";
import type { KnowledgeHelpAnchor } from "@/lib/stats-lab/knowledgeBaseContent";
import { getStreakMetricStyle } from "@/lib/stats-lab/themeTokens";

export type PlayerPickMode = "MANUAL" | "AUTO";

export type StudioUiState = {
  vizMode: StatsLabVizMode;
  pickMode: PlayerPickMode;
  chartTheme: StatsLabChartThemeId;
  lang: StatsLabLang;
  scaleMode: StatsLabScaleMode;
  customTitle: string;
  customSubtitle: string;
  showPoolAverage: boolean;
  showBarValues: boolean;
  showPlayerMeta: boolean;
  showNegativeBreakdown: boolean;
  spotlightPlayerId: number | null;
  axisX: FplStatKey;
  axisY: FplStatKey;
  sortByComposite: boolean;
};

type Props = {
  bootstrap: StatsLabBootstrapData;
  filter: StatsLabQueryFilter;
  ui: StudioUiState;
  onFilterChange: (next: StatsLabQueryFilter) => void;
  onUiChange: (patch: Partial<StudioUiState>) => void;
  onOpenKnowledge?: (anchor?: KnowledgeHelpAnchor) => void;
  activeStreakKeys?: StreakMetricKey[];
  onToggleStreakKey?: (key: StreakMetricKey) => void;
  onSelectDefaultStreaks?: () => void;
  onSelectAllStreaks?: () => void;
};

const CATEGORIES: FplStatCategory[] = [
  "OVERVIEW",
  "VALUE_TRANSFERS",
  "GOAL_THREAT",
  "CREATIVITY",
  "DEFENDING_DC",
  "DISCIPLINE",
];

const PERIOD_MODES: StatsLabPeriodMode[] = [
  "FULL_SEASON",
  "LAST_4_GW",
  "LAST_6_GW",
  "HOME_ONLY",
  "AWAY_ONLY",
  "CUSTOM_RANGE",
];

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-xl border border-slate-800 bg-slate-950/50"
    >
      <summary className="cursor-pointer list-none px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400 [&::-webkit-details-marker]:hidden">
        {title}
      </summary>
      <div className="space-y-3 border-t border-slate-800 px-3 pb-3 pt-3">
        {children}
      </div>
    </details>
  );
}

export function StatsLabControlPanel({
  bootstrap,
  filter,
  ui,
  onFilterChange,
  onUiChange,
  onOpenKnowledge,
  activeStreakKeys,
  onToggleStreakKey,
  onSelectDefaultStreaks,
  onSelectAllStreaks,
}: Props) {
  const [query, setQuery] = useState("");
  const lang = ui.lang;
  const copy = t(lang);
  const streakLabels = STREAK_LABELS[lang];
  const isLight = ui.chartTheme === "ANALYST_LIGHT";

  const clubName = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of bootstrap.clubs) m.set(c.fpl_team_id, c.short_name);
    return m;
  }, [bootstrap.clubs]);

  const clubsSorted = useMemo(
    () =>
      [...bootstrap.clubs].sort((a, b) =>
        a.short_name.localeCompare(b.short_name),
      ),
    [bootstrap.clubs],
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [] as StatsLabBootstrapPlayer[];
    return bootstrap.players
      .filter((p) => {
        const club = (clubName.get(p.fpl_team_id) ?? "").toLowerCase();
        return (
          p.web_name.toLowerCase().includes(q) ||
          p.second_name.toLowerCase().includes(q) ||
          p.first_name.toLowerCase().includes(q) ||
          club.includes(q)
        );
      })
      .slice(0, 12);
  }, [bootstrap.players, clubName, query]);

  const selectedPlayers = useMemo(() => {
    const set = new Set(filter.selectedPlayerIds);
    return bootstrap.players.filter((p) => set.has(p.fpl_element_id));
  }, [bootstrap.players, filter.selectedPlayerIds]);

  function toggleMetric(key: FplStatKey) {
    const has = filter.activeMetrics.includes(key);
    let next = has
      ? filter.activeMetrics.filter((k) => k !== key)
      : [...filter.activeMetrics, key];
    if (next.length > 8) next = next.slice(0, 8);
    if (next.length < 2 && has) return;
    if (!has && filter.activeMetrics.length >= 8) return;
    onFilterChange({ ...filter, activeMetrics: next });
  }

  function toggleClub(id: number) {
    const has = filter.clubIds.includes(id);
    onFilterChange({
      ...filter,
      clubIds: has
        ? filter.clubIds.filter((x) => x !== id)
        : [...filter.clubIds, id],
    });
  }

  function addPlayer(id: number) {
    if (filter.selectedPlayerIds.includes(id)) return;
    onFilterChange({
      ...filter,
      selectedPlayerIds: [...filter.selectedPlayerIds, id],
    });
    setQuery("");
  }

  function removePlayer(id: number) {
    onFilterChange({
      ...filter,
      selectedPlayerIds: filter.selectedPlayerIds.filter((x) => x !== id),
    });
  }

  const multiMetric =
    ui.vizMode === "STACKED_COMPOSITE" ||
    ui.vizMode === "RADAR_PIZZA" ||
    ui.vizMode === "HEATMAP_MATRIX" ||
    ui.vizMode === "POINTS_BREAKDOWN" ||
    ui.vizMode === "STREAKS_EXPLORER";

  return (
    <aside className="space-y-3">
      <Section title={copy.sectionNumbers}>
        <div className="flex flex-wrap gap-1.5">
          {PERIOD_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() =>
                onFilterChange({
                  ...filter,
                  period: { ...filter.period, mode },
                  minMinutes:
                    mode === "LAST_4_GW" || mode === "LAST_6_GW"
                      ? Math.min(filter.minMinutes, 90)
                      : filter.minMinutes,
                })
              }
              className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                filter.period.mode === mode
                  ? "bg-[#39FF14] text-black"
                  : "border border-slate-700 text-slate-400 hover:border-slate-500"
              }`}
            >
              {PERIOD_LABELS[lang][mode]}
            </button>
          ))}
        </div>

        {filter.period.mode === "CUSTOM_RANGE" ? (
          <div className="flex gap-2">
            <label className="flex-1 text-[10px] text-slate-500">
              GW {lang === "pl" ? "od" : "from"}
              <input
                type="number"
                min={1}
                max={38}
                value={filter.period.gwFrom ?? 1}
                onChange={(e) =>
                  onFilterChange({
                    ...filter,
                    period: {
                      ...filter.period,
                      gwFrom: Number(e.target.value),
                    },
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="flex-1 text-[10px] text-slate-500">
              GW {lang === "pl" ? "do" : "to"}
              <input
                type="number"
                min={1}
                max={38}
                value={filter.period.gwTo ?? (bootstrap.maxGw || 38)}
                onChange={(e) =>
                  onFilterChange({
                    ...filter,
                    period: {
                      ...filter.period,
                      gwTo: Number(e.target.value),
                    },
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white"
              />
            </label>
          </div>
        ) : null}

        <div className="flex items-center gap-1">
          <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => onFilterChange({ ...filter, per90: false })}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase ${
                !filter.per90 ? "bg-slate-800 text-white" : "text-slate-500"
              }`}
            >
              Totals
            </button>
            <button
              type="button"
              onClick={() => onFilterChange({ ...filter, per90: true })}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase ${
                filter.per90 ? "bg-[#39FF14] text-black" : "text-slate-500"
              }`}
            >
              Per 90
            </button>
          </div>
          {onOpenKnowledge ? (
            <KnowledgeHelpButton
              label={
                lang === "pl"
                  ? "Totals vs Per 90 — otwórz Bazę Wiedzy"
                  : "Totals vs Per 90 — open Knowledge Base"
              }
              onClick={() => onOpenKnowledge("per90")}
            />
          ) : null}
        </div>

        {ui.vizMode === "STREAKS_EXPLORER" &&
        onToggleStreakKey &&
        activeStreakKeys ? (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {lang === "pl"
                ? "Widoczne serie na wykresie (Zaznacz / Odznacz)"
                : "Visible streaks on chart (Toggle)"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {onSelectDefaultStreaks ? (
                <button
                  type="button"
                  onClick={onSelectDefaultStreaks}
                  className="rounded-lg border border-slate-700 px-2 py-1 text-[10px] font-bold text-slate-300 hover:border-slate-500"
                >
                  {lang === "pl"
                    ? "Domyślne dla pozycji"
                    : "Position defaults"}
                </button>
              ) : null}
              {onSelectAllStreaks ? (
                <button
                  type="button"
                  onClick={onSelectAllStreaks}
                  className="rounded-lg border border-slate-700 px-2 py-1 text-[10px] font-bold text-slate-300 hover:border-slate-500"
                >
                  {lang === "pl" ? "Zaznacz wszystkie" : "Select all"}
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1">
              {STREAK_METRIC_KEYS.filter((key) => key !== "max60MinStreak").map(
                (key) => {
                  const on = activeStreakKeys.includes(key);
                  const style = getStreakMetricStyle(key, isLight);
                  return (
                    <button
                      key={key}
                      type="button"
                      title={streakLabels[key]}
                      onClick={() => onToggleStreakKey(key)}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition ${
                        on ? "" : "opacity-45 hover:opacity-80"
                      }`}
                      style={{
                        border: `1px solid ${on ? style.accent : "#334155"}`,
                        background: on ? `${style.accent}22` : "transparent",
                        color: on ? "#e2e8f0" : "#64748b",
                      }}
                    >
                      {on ? (
                        <Check
                          className="h-3 w-3"
                          style={{ color: style.accent }}
                        />
                      ) : null}
                      {streakLabels[key]}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        ) : null}

        {multiMetric && ui.vizMode !== "POINTS_BREAKDOWN" && ui.vizMode !== "STREAKS_EXPLORER" ? (
          <div className="space-y-3">
            <p className="text-[10px] text-slate-500">
              {copy.metricsCount}: {filter.activeMetrics.length}/8 (min. 2)
            </p>
            {CATEGORIES.map((cat) => (
              <div key={cat}>
                <p className="mb-1 flex items-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {categoryLabel(cat, lang)}
                  {cat === "DEFENDING_DC" && onOpenKnowledge ? (
                    <KnowledgeHelpButton
                      label={
                        lang === "pl"
                          ? "Defensive Contributions — otwórz Bazę Wiedzy"
                          : "Defensive Contributions — open Knowledge Base"
                      }
                      onClick={() => onOpenKnowledge("dc")}
                    />
                  ) : null}
                </p>
                <div className="flex flex-wrap gap-1">
                  {FPL_STAT_DEFINITIONS.filter((d) => d.category === cat).map(
                    (d) => {
                      const on = filter.activeMetrics.includes(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          title={lang === "en" ? d.descriptionEn : d.descriptionPl}
                          onClick={() => toggleMetric(d.key)}
                          className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
                            on
                              ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                              : "bg-slate-900 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {statShort(d.key, lang)}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : ui.vizMode === "SCATTER_2D" ? (
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase text-slate-500">
              {copy.axisX}
              <select
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white"
                value={ui.axisX}
                onChange={(e) =>
                  onUiChange({ axisX: e.target.value as FplStatKey })
                }
              >
                {FPL_STAT_DEFINITIONS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {statLabel(d.key, lang)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[10px] font-bold uppercase text-slate-500">
              {copy.axisY}
              <select
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white"
                value={ui.axisY}
                onChange={(e) =>
                  onUiChange({ axisY: e.target.value as FplStatKey })
                }
              >
                {FPL_STAT_DEFINITIONS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {statLabel(d.key, lang)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => onUiChange({ axisX: ui.axisY, axisY: ui.axisX })}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-300"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              {copy.swapAxes}
            </button>
          </div>
        ) : null}
      </Section>

      <Section title={copy.sectionPlayers}>
        <div className="inline-flex w-full rounded-xl border border-slate-700 bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => onUiChange({ pickMode: "MANUAL" })}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-black uppercase ${
              ui.pickMode === "MANUAL"
                ? "bg-[#39FF14] text-black"
                : "text-slate-500"
            }`}
          >
            {copy.manualPick}
          </button>
          <button
            type="button"
            onClick={() => {
              onUiChange({ pickMode: "AUTO" });
              onFilterChange({ ...filter, selectedPlayerIds: [] });
            }}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-black uppercase ${
              ui.pickMode === "AUTO"
                ? "bg-[#39FF14] text-black"
                : "text-slate-500"
            }`}
          >
            {copy.autoTop}
          </button>
        </div>

        {ui.pickMode === "MANUAL" ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={copy.searchPlaceholder}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-8 pr-3 text-sm text-white outline-none focus:border-[#39FF14]"
              />
              {suggestions.length > 0 ? (
                <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-950 shadow-xl">
                  {suggestions.map((p) => (
                    <li key={p.fpl_element_id}>
                      <button
                        type="button"
                        onClick={() => addPlayer(p.fpl_element_id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-900"
                      >
                        <span className="font-mono text-[10px] text-[#39FF14]">
                          {clubName.get(p.fpl_team_id)}
                        </span>
                        <span className="font-semibold text-white">
                          {p.web_name}
                        </span>
                        <span className="text-slate-500">
                          {getFplPositionLabelEn(p.element_type)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedPlayers.map((p) => (
                <span
                  key={p.fpl_element_id}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-200"
                >
                  {clubName.get(p.fpl_team_id)} {p.web_name}
                  <button
                    type="button"
                    onClick={() => removePlayer(p.fpl_element_id)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            {selectedPlayers.length > 0 ? (
              <button
                type="button"
                onClick={() =>
                  onFilterChange({ ...filter, selectedPlayerIds: [] })
                }
                className="text-[10px] font-bold uppercase text-slate-500 hover:text-rose-300"
              >
                {copy.clearSelection}
              </button>
            ) : (
              <p className="text-[11px] text-slate-500">{copy.addPlayersHint}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { label: lang === "pl" ? "Wszystkie" : "All", value: [] as number[] },
                  { label: "GK", value: [1] },
                  { label: "DEF", value: [2] },
                  { label: "MID", value: [3] },
                  { label: "FWD", value: [4] },
                ] as const
              ).map((opt) => {
                const active =
                  opt.value.length === 0
                    ? filter.positions.length === 0
                    : filter.positions.length === 1 &&
                      filter.positions[0] === opt.value[0];
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() =>
                      onFilterChange({
                        ...filter,
                        positions: opt.value as StatsLabQueryFilter["positions"],
                      })
                    }
                    className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase ${
                      active
                        ? "bg-[#39FF14] text-black"
                        : "border border-slate-700 text-slate-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Multi-club picker */}
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {copy.clubs}
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onFilterChange({ ...filter, clubIds: [] })}
                    className="rounded-md border border-slate-700 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-400"
                  >
                    {copy.allClubs}
                  </button>
                  <button
                    type="button"
                    onClick={() => onFilterChange({ ...filter, clubIds: [] })}
                    className="rounded-md border border-slate-700 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-400"
                  >
                    {copy.clearClubs}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {clubsSorted.map((c) => {
                  const on =
                    filter.clubIds.length === 0 ||
                    filter.clubIds.includes(c.fpl_team_id);
                  const selected = filter.clubIds.includes(c.fpl_team_id);
                  return (
                    <button
                      key={c.fpl_team_id}
                      type="button"
                      title={c.name}
                      onClick={() => toggleClub(c.fpl_team_id)}
                      className={`rounded-md px-1 py-1.5 text-[10px] font-black uppercase tracking-wide ${
                        selected
                          ? "bg-[#39FF14] text-black"
                          : filter.clubIds.length === 0
                            ? "border border-slate-700 text-slate-400"
                            : "border border-slate-800 text-slate-600"
                      }`}
                      style={
                        selected && c.primary_color
                          ? { boxShadow: `inset 0 -2px 0 ${c.primary_color}` }
                          : undefined
                      }
                    >
                      {c.short_name}
                      {!on && filter.clubIds.length > 0 ? null : null}
                    </button>
                  );
                })}
              </div>
              {filter.clubIds.length > 0 ? (
                <p className="mt-1 text-[10px] text-slate-500">
                  {filter.clubIds.length}{" "}
                  {lang === "pl" ? "klubów zaznaczonych" : "clubs selected"}
                </p>
              ) : null}
            </div>

            {/* Top N quick selector */}
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {copy.showTop}
              </p>
              <div className="flex flex-wrap gap-1">
                {TOP_N_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      onFilterChange({ ...filter, limitPlayers: n })
                    }
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase ${
                      filter.limitPlayers === n
                        ? "bg-[#39FF14] text-black"
                        : "border border-slate-700 text-slate-400"
                    }`}
                  >
                    Top {n}
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-[10px] font-bold uppercase text-slate-500">
              {copy.minMinutes}
              <input
                type="number"
                min={0}
                step={30}
                value={filter.minMinutes}
                onChange={(e) =>
                  onFilterChange({
                    ...filter,
                    minMinutes: Number(e.target.value) || 0,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[10px] font-bold uppercase text-slate-500">
                {copy.maxPrice}
                <input
                  type="number"
                  min={3}
                  max={15}
                  step={0.1}
                  value={
                    filter.maxCostTenths != null
                      ? filter.maxCostTenths / 10
                      : ""
                  }
                  placeholder="—"
                  onChange={(e) => {
                    const v = e.target.value;
                    onFilterChange({
                      ...filter,
                      maxCostTenths:
                        v === "" ? undefined : Math.round(Number(v) * 10),
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white"
                />
              </label>
              <label className="block text-[10px] font-bold uppercase text-slate-500">
                {copy.maxSel}
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={filter.maxOwnershipPct ?? ""}
                  placeholder="—"
                  onChange={(e) => {
                    const v = e.target.value;
                    onFilterChange({
                      ...filter,
                      maxOwnershipPct: v === "" ? undefined : Number(v),
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={ui.sortByComposite}
                onChange={(e) =>
                  onUiChange({ sortByComposite: e.target.checked })
                }
                className="accent-[#39FF14]"
              />
              {copy.sortComposite}
            </label>

            {!ui.sortByComposite ? (
              <label className="block text-[10px] font-bold uppercase text-slate-500">
                {copy.sortByStat}
                <select
                  value={filter.sortByStat}
                  onChange={(e) =>
                    onFilterChange({
                      ...filter,
                      sortByStat: e.target.value as FplStatKey,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white"
                >
                  {FPL_STAT_DEFINITIONS.map((d) => (
                    <option key={d.key} value={d.key}>
                      {statLabel(d.key, lang)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        )}

        <label className="block text-[10px] font-bold uppercase text-slate-500">
          {copy.spotlight}
          <select
            value={ui.spotlightPlayerId ?? ""}
            onChange={(e) =>
              onUiChange({
                spotlightPlayerId:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white"
          >
            <option value="">{copy.none}</option>
            {selectedPlayers.length
              ? selectedPlayers.map((p) => (
                  <option key={p.fpl_element_id} value={p.fpl_element_id}>
                    {p.web_name}
                  </option>
                ))
              : bootstrap.players.slice(0, 80).map((p) => (
                  <option key={p.fpl_element_id} value={p.fpl_element_id}>
                    {clubName.get(p.fpl_team_id)} {p.web_name}
                  </option>
                ))}
          </select>
        </label>
      </Section>

      <Section title={copy.sectionStyle} defaultOpen={false}>
        <label className="block text-[10px] font-bold uppercase text-slate-500">
          {copy.chartTitle}
          <input
            value={ui.customTitle}
            onChange={(e) => onUiChange({ customTitle: e.target.value })}
            placeholder="Auto"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-[10px] font-bold uppercase text-slate-500">
          {copy.chartSubtitle}
          <input
            value={ui.customSubtitle}
            onChange={(e) => onUiChange({ customSubtitle: e.target.value })}
            placeholder="—"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white"
          />
        </label>

        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(STATS_LAB_CHART_THEMES) as StatsLabChartThemeId[]).map(
            (id) => (
              <button
                key={id}
                type="button"
                onClick={() => onUiChange({ chartTheme: id })}
                className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${
                  ui.chartTheme === id
                    ? "bg-[#39FF14] text-black"
                    : "border border-slate-700 text-slate-400"
                }`}
              >
                {lang === "en"
                  ? STATS_LAB_CHART_THEMES[id].labelEn
                  : STATS_LAB_CHART_THEMES[id].labelPl}
              </button>
            ),
          )}
        </div>

        {(
          [
            ["showPoolAverage", copy.showAvg],
            ["showBarValues", copy.showBarValues],
            ["showPlayerMeta", copy.showMeta],
          ] as const
        ).map(([key, label]) => (
          <label
            key={key}
            className="flex items-center gap-2 text-xs text-slate-300"
          >
            <input
              type="checkbox"
              className="accent-[#39FF14]"
              checked={ui[key]}
              onChange={(e) => onUiChange({ [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </Section>

      <p className="px-1 text-[10px] text-slate-600">
        {copy.metricsCount}:{" "}
        {filter.activeMetrics
          .map((k) => getFplStatDefinition(k)?.[lang === "en" ? "shortLabelEn" : "shortLabelPl"] ?? k)
          .join(" · ")}
      </p>
    </aside>
  );
}
