"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { PlottedStatsLabPlayer } from "@/lib/stats-lab/analyticsEngine";
import type { FplStatKey } from "@/lib/stats-lab/types";
import type { StatsLabLang, StatsLabScaleMode } from "@/lib/stats-lab/i18n";
import { statShort } from "@/lib/stats-lab/i18n";
import {
  formatMetricDisplayValue,
  getMetricColor,
  metricSegmentTextColor,
  type StatsLabChartTheme,
} from "@/components/admin/stats-lab/chartTheme";
import { StatsLabPlayerIdentity } from "@/components/admin/stats-lab/StatsLabPlayerIdentity";

type ChartSortKey = FplStatKey | "composite";
/** `null` = zachowaj kolejność z analyticsEngine (brak lokalnego nadpisania). */
type LocalSortKey = ChartSortKey | null;

type Props = {
  players: PlottedStatsLabPlayer[];
  metrics: FplStatKey[];
  theme: StatsLabChartTheme;
  lang: StatsLabLang;
  scaleMode: StatsLabScaleMode;
  spotlightId: number | null;
  showValues: boolean;
  showMeta: boolean;
  /** Zachowane w API Canvas — sortowanie lokalne jest niezależne (domyślnie null). */
  sortKey: ChartSortKey;
  sortDir: "DESC" | "ASC";
  onSort: (key: ChartSortKey) => void;
  onSelectPlayer: (id: number) => void;
  variant?: "studio" | "export";
  per90?: boolean;
};

function MetricLegendBar({
  metrics,
  theme,
  lang,
  sortKey,
  sortDir,
  onSort,
  isExport,
  showComposite = false,
}: {
  metrics: FplStatKey[];
  theme: StatsLabChartTheme;
  lang: StatsLabLang;
  sortKey: LocalSortKey;
  sortDir: "DESC" | "ASC";
  onSort: (key: ChartSortKey) => void;
  isExport: boolean;
  showComposite?: boolean;
}) {
  const isLight = theme.id === "ANALYST_LIGHT";
  const compositeLabel =
    lang === "pl"
      ? "OCENA (0–100) · Wybrane cechy"
      : "RATING (0–100) · Selected stats";

  if (isExport) {
    return (
      <div className="flex flex-wrap gap-4">
        {metrics.map((key, i) => (
          <span
            key={key}
            className={`inline-flex items-center gap-2 text-base font-bold ${
              isLight ? "text-slate-800" : ""
            }`}
            style={isLight ? undefined : { color: theme.muted }}
          >
            <span
              className="h-4 w-4 rounded-full"
              style={{ background: getMetricColor(i, theme.id) }}
            />
            {statShort(key, lang)}
          </span>
        ))}
        {showComposite ? (
          <span
            className={`inline-flex items-center gap-2 text-base font-bold ${
              isLight ? "text-slate-800" : ""
            }`}
            style={isLight ? undefined : { color: theme.muted }}
          >
            {compositeLabel}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {metrics.map((key, i) => {
        const active = sortKey === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSort(key)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
              isLight
                ? active
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                  : "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200"
                : ""
            }`}
            style={
              isLight
                ? undefined
                : {
                    borderColor: active
                      ? getMetricColor(i, theme.id)
                      : theme.border,
                    color: active ? theme.accent : theme.muted,
                  }
            }
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: getMetricColor(i, theme.id) }}
            />
            {statShort(key, lang)}
            {active ? (
              sortDir === "DESC" ? (
                <ArrowDown className="h-3 w-3" />
              ) : (
                <ArrowUp className="h-3 w-3" />
              )
            ) : null}
          </button>
        );
      })}
      {showComposite ? (
        <button
          type="button"
          onClick={() => onSort("composite")}
          title={compositeLabel}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
            isLight
              ? sortKey === "composite"
                ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                : "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200"
              : ""
          }`}
          style={
            isLight
              ? undefined
              : {
                  borderColor:
                    sortKey === "composite" ? theme.accent : theme.border,
                  color: sortKey === "composite" ? theme.accent : theme.muted,
                }
          }
        >
          {compositeLabel}
          {sortKey === "composite" ? (
            sortDir === "DESC" ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUp className="h-3 w-3" />
            )
          ) : null}
        </button>
      ) : null}
    </div>
  );
}

function orderPlayers(
  players: PlottedStatsLabPlayer[],
  localSortKey: LocalSortKey,
  localSortDir: "DESC" | "ASC",
  scaleMode: StatsLabScaleMode,
): PlottedStatsLabPlayer[] {
  if (localSortKey == null) return players;
  return [...players].sort((a, b) => {
    const av =
      localSortKey === "composite"
        ? a.compositeScore
        : scaleMode === "PERCENTILE"
          ? (a.percentiles[localSortKey] ?? 0)
          : (a.displayValues[localSortKey] ?? 0);
    const bv =
      localSortKey === "composite"
        ? b.compositeScore
        : scaleMode === "PERCENTILE"
          ? (b.percentiles[localSortKey] ?? 0)
          : (b.displayValues[localSortKey] ?? 0);
    return localSortDir === "DESC" ? bv - av : av - bv;
  });
}

export function StackedCompositeChart({
  players,
  metrics,
  theme,
  lang,
  scaleMode,
  spotlightId,
  showValues,
  showMeta,
  sortKey: _parentSortKey,
  sortDir: _parentSortDir,
  onSort: _parentOnSort,
  onSelectPlayer,
  variant = "studio",
  per90 = false,
}: Props) {
  // Lokalny sort: null = kolejność 1:1 z analyticsEngine (sortByStat / Top N)
  const [localSortKey, setLocalSortKey] = useState<LocalSortKey>(null);
  const [localSortDir, setLocalSortDir] = useState<"DESC" | "ASC">("DESC");

  const playersIdentityKey = players.map((p) => p.fpl_element_id).join(",");
  const metricsKey = metrics.join(",");

  useEffect(() => {
    setLocalSortKey(null);
    setLocalSortDir("DESC");
  }, [playersIdentityKey, metricsKey]);

  function handleLocalSort(key: ChartSortKey) {
    if (localSortKey === key) {
      setLocalSortDir((d) => (d === "DESC" ? "ASC" : "DESC"));
    } else {
      setLocalSortKey(key);
      setLocalSortDir("DESC");
    }
  }

  const ordered = useMemo(
    () => orderPlayers(players, localSortKey, localSortDir, scaleMode),
    [players, localSortKey, localSortDir, scaleMode],
  );

  if (scaleMode === "RAW") {
    return (
      <GroupedRawBars
        players={ordered}
        metrics={metrics}
        theme={theme}
        lang={lang}
        scaleMode={scaleMode}
        spotlightId={spotlightId}
        showValues={showValues}
        showMeta={showMeta}
        localSortKey={localSortKey}
        localSortDir={localSortDir}
        onLocalSort={handleLocalSort}
        onSelectPlayer={onSelectPlayer}
        variant={variant}
        per90={per90}
      />
    );
  }

  const isExport = variant === "export";
  const isLight = theme.id === "ANALYST_LIGHT";
  const maxCompositeInView = Math.max(
    ...ordered.map((p) => p.compositeScore),
    1,
  );
  const compositeMicro =
    lang === "pl" ? "z wybranych cech" : "selected stats";
  const compositeBoxLabel = lang === "pl" ? "OCENA" : "RATING";

  return (
    <div className={isExport ? "space-y-5" : "space-y-3"}>
      <MetricLegendBar
        metrics={metrics}
        theme={theme}
        lang={lang}
        sortKey={localSortKey}
        sortDir={localSortDir}
        onSort={handleLocalSort}
        isExport={isExport}
        showComposite
      />

      <div className={isExport ? "space-y-4" : "space-y-3"}>
        {ordered.map((p, rank) => {
          const isSpot = spotlightId === p.fpl_element_id;
          const barWidthPct = Math.max(
            42,
            Math.round((p.compositeScore / maxCompositeInView) * 100),
          );
          const barSegments = metrics
            .map((key, i) => {
              const pct = Math.max(0, Math.min(100, p.percentiles[key] ?? 0));
              return {
                key,
                pct,
                color: getMetricColor(i, theme.id),
                value: p.displayValues[key] ?? 0,
                index: i,
              };
            })
            .filter((seg) => seg.pct > 0);
          const sumPct = barSegments.reduce((a, s) => a + s.pct, 0) || 1;

          return (
            <button
              key={p.fpl_element_id}
              type="button"
              onClick={() => onSelectPlayer(p.fpl_element_id)}
              className={
                isSpot
                  ? isLight
                    ? "group w-full rounded-xl border border-amber-400 bg-amber-50/40 text-left ring-2 ring-amber-500 transition"
                    : "group w-full rounded-xl border border-amber-400/50 bg-amber-500/[0.06] text-left ring-2 ring-amber-400/80 transition"
                  : "group w-full rounded-xl border text-left transition"
              }
              style={
                isSpot
                  ? undefined
                  : {
                      borderColor: theme.border,
                      background: "transparent",
                    }
              }
            >
              <div className="grid grid-cols-[205px_minmax(0,1fr)_120px] items-center gap-3 px-3.5 py-3">
                <div className="w-[205px] min-w-0 shrink-0">
                  <StatsLabPlayerIdentity
                    rank={rank + 1}
                    webName={p.web_name}
                    clubShort={p.club?.short_name ?? "—"}
                    playerCode={p.playerCode}
                    clubPulseCode={p.clubPulseCode}
                    showMeta={showMeta}
                    priceLabel={`£${(p.rawValues.now_cost / 10).toFixed(1)}m`}
                    ownershipLabel={`${p.rawValues.selected_by_percent.toFixed(1)}%`}
                    isLight={isLight}
                  />
                </div>

                <div className="min-w-0 w-full">
                  <div
                    className={`flex h-10 overflow-hidden rounded-lg ${
                      isLight
                        ? "border border-slate-200/90 bg-slate-100"
                        : "border border-slate-800 bg-slate-900"
                    }`}
                  >
                    <div
                      className="flex h-full min-w-0 overflow-hidden"
                      style={{ width: `${barWidthPct}%` }}
                    >
                      {barSegments.map((seg) => {
                        const textColor = metricSegmentTextColor(seg.color);
                        return (
                          <div
                            key={seg.key}
                            title={`${statShort(seg.key, lang)}: ${formatMetricDisplayValue(seg.key, seg.value, per90)} · P${Math.round(seg.pct)}`}
                            className="relative flex min-w-[44px] items-center justify-center overflow-hidden"
                            style={{
                              flex: `${seg.pct / sumPct} 1 44px`,
                              minWidth: "44px",
                              background: seg.color,
                            }}
                          >
                            {showValues ? (
                              <span
                                className="relative z-10 truncate px-1 text-[13px] font-black tabular-nums"
                                style={{ color: textColor }}
                              >
                                {formatMetricDisplayValue(
                                  seg.key,
                                  seg.value,
                                  per90,
                                )}
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {showValues ? (
                    <div
                      className={`mt-1.5 w-full rounded py-1 font-bold ${
                        metrics.length >= 7
                          ? "px-2 text-[10.5px]"
                          : "px-2.5 text-[11px]"
                      } ${
                        isLight
                          ? "border border-slate-300 bg-slate-100 text-slate-800"
                          : "border border-slate-800/80 bg-slate-900/75"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {metrics.map((key, i) => {
                          const val = Number(p.displayValues[key]) || 0;
                          return (
                            <span
                              key={`${p.fpl_element_id}-leg-${key}`}
                              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap"
                              style={{
                                color: isLight ? undefined : theme.text,
                              }}
                            >
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{
                                  background: getMetricColor(i, theme.id),
                                }}
                              />
                              {statShort(key, lang)}{" "}
                              {formatMetricDisplayValue(key, val, per90)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex min-w-0 items-center justify-center">
                  <div
                    className="inline-flex flex-col items-center justify-center rounded-xl border-2 px-2.5 py-1.5 text-center"
                    style={{
                      borderColor: isLight ? "#059669" : "#39FF14",
                    }}
                  >
                    <p
                      className="text-[10px] font-black uppercase tracking-wider"
                      style={{ color: isLight ? "#059669" : "#39FF14" }}
                    >
                      {compositeBoxLabel}
                    </p>
                    <p
                      className="text-2xl font-black leading-none tabular-nums sm:text-3xl"
                      style={{ color: isLight ? "#059669" : "#39FF14" }}
                    >
                      {p.compositeScore.toFixed(0)}
                    </p>
                    <p
                      className="mt-0.5 text-[9.5px] font-medium leading-tight opacity-80"
                      style={{ color: isLight ? "#047857" : "#86efac" }}
                    >
                      {compositeMicro}
                    </p>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type RawBarsProps = {
  players: PlottedStatsLabPlayer[];
  metrics: FplStatKey[];
  theme: StatsLabChartTheme;
  lang: StatsLabLang;
  scaleMode: StatsLabScaleMode;
  spotlightId: number | null;
  showValues: boolean;
  showMeta: boolean;
  localSortKey: LocalSortKey;
  localSortDir: "DESC" | "ASC";
  onLocalSort: (key: ChartSortKey) => void;
  onSelectPlayer: (id: number) => void;
  variant?: "studio" | "export";
  per90?: boolean;
};

/** Jednorzędowe paski porównawcze — osobna skala na metrykę w trybie RAW. */
function GroupedRawBars({
  players,
  metrics,
  theme,
  lang,
  spotlightId,
  showValues,
  showMeta,
  localSortKey,
  localSortDir,
  onLocalSort,
  onSelectPlayer,
  variant = "studio",
  per90 = false,
}: RawBarsProps) {
  const isExport = variant === "export";
  const isLight = theme.id === "ANALYST_LIGHT";
  // Skala absolutna — ujemne metryki (price_change_gw, goals_vs_xg, …)
  // skalowane względem max |value|, nie surowego max (który bywa 0).
  const maxima = Object.fromEntries(
    metrics.map((k) => [
      k,
      Math.max(
        0.01,
        ...players.map((p) => Math.abs(Number(p.displayValues[k]) || 0)),
      ),
    ]),
  ) as Record<FplStatKey, number>;

  const showCompositeBox =
    localSortKey == null || localSortKey === "composite";
  const primarySortKey =
    localSortKey != null && localSortKey !== "composite"
      ? localSortKey
      : null;
  const compositeMicro =
    lang === "pl" ? "z wybranych cech" : "selected stats";

  return (
    <div className={isExport ? "space-y-5" : "space-y-3"}>
      <MetricLegendBar
        metrics={metrics}
        theme={theme}
        lang={lang}
        sortKey={localSortKey}
        sortDir={localSortDir}
        onSort={onLocalSort}
        isExport={isExport}
        showComposite
      />

      <div className={isExport ? "space-y-4" : "space-y-3"}>
        {players.map((p, rank) => {
          const isSpot = spotlightId === p.fpl_element_id;
          const rightLabel = showCompositeBox
            ? lang === "pl"
              ? "OCENA"
              : "RATING"
            : statShort(primarySortKey!, lang);
          const rightValue = showCompositeBox
            ? p.compositeScore.toFixed(0)
            : formatMetricDisplayValue(
                primarySortKey!,
                p.displayValues[primarySortKey!] ?? 0,
                per90,
              );
          const rightAccent = isLight ? "#059669" : "#39FF14";

          return (
            <button
              key={p.fpl_element_id}
              type="button"
              onClick={() => onSelectPlayer(p.fpl_element_id)}
              className={
                isSpot
                  ? isLight
                    ? "w-full rounded-xl border border-amber-400 bg-amber-50/40 text-left ring-2 ring-amber-500 transition"
                    : "w-full rounded-xl border border-amber-400/50 bg-amber-500/[0.06] text-left ring-2 ring-amber-400/80 transition"
                  : "w-full rounded-xl border text-left transition"
              }
              style={
                isSpot
                  ? undefined
                  : {
                      borderColor: theme.border,
                      background: "transparent",
                    }
              }
            >
              <div className="grid grid-cols-[205px_minmax(0,1fr)_120px] items-center gap-3 px-3.5 py-3">
                <div className="w-[205px] min-w-0 shrink-0">
                  <StatsLabPlayerIdentity
                    rank={rank + 1}
                    webName={p.web_name}
                    clubShort={p.club?.short_name ?? "—"}
                    playerCode={p.playerCode}
                    clubPulseCode={p.clubPulseCode}
                    showMeta={showMeta}
                    priceLabel={`£${(p.rawValues.now_cost / 10).toFixed(1)}m`}
                    ownershipLabel={`${p.rawValues.selected_by_percent.toFixed(1)}%`}
                    isLight={isLight}
                  />
                </div>

                <div
                  className="min-w-0"
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${metrics.length}, minmax(0, 1fr))`,
                    gap: "8px",
                  }}
                >
                  {metrics.map((key, i) => {
                    const raw = Number(p.displayValues[key]);
                    const val = Number.isFinite(raw) ? raw : 0;
                    const maxMetricVal = maxima[key];
                    // val === 0 → pasek 0% (bez sztucznego min 8%/10%)
                    // val !== 0 → skala |val|/max|·|, min 10% tylko dla niezerowych
                    const pct =
                      val === 0
                        ? 0
                        : Math.min(
                            100,
                            Math.max(10, (Math.abs(val) / maxMetricVal) * 100),
                          );
                    const color = getMetricColor(i, theme.id);
                    return (
                      <div key={key} className="min-w-0">
                        <div
                          className={`mb-1 flex items-center gap-1 truncate text-[11px] font-extrabold uppercase tracking-wider ${
                            isLight ? "text-slate-700" : "text-slate-300"
                          }`}
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: color }}
                          />
                          {statShort(key, lang)}
                        </div>
                        <div
                          className={`relative flex h-8 items-center overflow-hidden rounded-md ${
                            isLight
                              ? "border border-slate-200/90 bg-slate-100"
                              : "border border-slate-800 bg-slate-900"
                          }`}
                        >
                          {pct > 0 ? (
                            <div
                              className="absolute inset-y-0 left-0 rounded-md"
                              style={{
                                width: `${pct}%`,
                                background: color,
                              }}
                            />
                          ) : null}
                          {showValues ? (
                            <span
                              className={
                                isLight
                                  ? "relative z-10 mx-1.5 rounded border border-slate-200/80 bg-white/90 px-1.5 py-0.5 text-sm font-extrabold tabular-nums text-slate-900 shadow-sm"
                                  : "relative z-10 mx-1.5 rounded border border-white/10 bg-slate-950/80 px-1.5 py-0.5 text-sm font-extrabold tabular-nums text-white shadow-sm"
                              }
                            >
                              {formatMetricDisplayValue(key, val, per90)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex min-w-0 items-center justify-center">
                  <div
                    className="inline-flex flex-col items-center justify-center rounded-xl border-2 px-2.5 py-1.5 text-center"
                    style={{ borderColor: rightAccent }}
                  >
                    <p
                      className="text-[10px] font-black uppercase tracking-wider"
                      style={{ color: rightAccent }}
                    >
                      {rightLabel}
                    </p>
                    <p
                      className="text-2xl font-black leading-none tabular-nums sm:text-3xl"
                      style={{ color: rightAccent }}
                    >
                      {rightValue}
                    </p>
                    {showCompositeBox ? (
                      <p
                        className="mt-0.5 text-[9.5px] font-medium leading-tight opacity-80"
                        style={{ color: isLight ? "#047857" : "#86efac" }}
                      >
                        {compositeMicro}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
