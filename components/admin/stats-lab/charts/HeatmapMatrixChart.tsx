"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { PlottedStatsLabPlayer } from "@/lib/stats-lab/analyticsEngine";
import {
  FPL_POSITION_LABELS_EN,
  getFplStatDefinition,
  type FplStatKey,
} from "@/lib/stats-lab/types";
import type { StatsLabLang, StatsLabScaleMode } from "@/lib/stats-lab/i18n";
import { fplLabBadgeUrl, fplLabPlayerPhotoUrl } from "@/lib/stats-lab/mediaUrls";
import {
  formatStatDisplay,
  getMetricColor,
  type StatsLabChartTheme,
} from "@/components/admin/stats-lab/chartTheme";

type LocalSortKey = FplStatKey | "composite" | null;
type SortDir = "DESC" | "ASC";
type HeatmapVariant = "interactive" | "studio" | "export";

type Props = {
  players: PlottedStatsLabPlayer[];
  metrics: FplStatKey[];
  poolAverages?: Partial<Record<FplStatKey, number>>;
  poolSize?: number;
  scaleMode?: StatsLabScaleMode;
  per90?: boolean;
  showValues?: boolean;
  showMeta?: boolean;
  showAvg?: boolean;
  theme: StatsLabChartTheme;
  lang: StatsLabLang;
  spotlightId?: number | null;
  onSelectPlayer?: (id: number) => void;
  variant?: HeatmapVariant;
  /** @deprecated — sort lokalny; ignorowane (kompatybilność Canvas) */
  themeId?: string;
  sortKey?: FplStatKey | "composite";
  sortDir?: SortDir;
  onSort?: (key: FplStatKey | "composite") => void;
};

type CellTone = {
  cell: string;
  sub: string;
};

function getHeatmapCellTone(pct: number, isLight: boolean): CellTone {
  const p = Math.max(0, Math.min(100, pct));
  if (p >= 85) {
    return isLight
      ? {
          cell: "bg-emerald-100 border-emerald-400 text-emerald-950",
          sub: "text-emerald-800",
        }
      : {
          cell: "bg-emerald-500/25 border-emerald-400/50 text-emerald-50",
          sub: "text-emerald-200/90",
        };
  }
  if (p >= 65) {
    return isLight
      ? {
          cell: "bg-emerald-50 border-emerald-300 text-emerald-900",
          sub: "text-emerald-700",
        }
      : {
          cell: "bg-emerald-500/12 border-emerald-500/25 text-emerald-100",
          sub: "text-emerald-300/85",
        };
  }
  if (p >= 35) {
    return isLight
      ? {
          cell: "bg-slate-100/90 border-slate-300 text-slate-800",
          sub: "text-slate-600",
        }
      : {
          cell: "bg-white/[0.05] border-white/10 text-slate-100",
          sub: "text-slate-400",
        };
  }
  if (p >= 15) {
    return isLight
      ? {
          cell: "bg-amber-50 border-amber-300 text-amber-950",
          sub: "text-amber-800",
        }
      : {
          cell: "bg-amber-500/15 border-amber-500/30 text-amber-100",
          sub: "text-amber-300/85",
        };
  }
  return isLight
    ? {
        cell: "bg-rose-50 border-rose-300 text-rose-950",
        sub: "text-rose-800",
      }
    : {
        cell: "bg-rose-500/18 border-rose-500/35 text-rose-100",
        sub: "text-rose-300/85",
      };
}

function defaultSortDirForKey(
  key: FplStatKey | "composite",
  scaleMode: StatsLabScaleMode,
): SortDir {
  if (key === "composite") return "DESC";
  if (scaleMode === "RAW") {
    const invert = Boolean(getFplStatDefinition(key)?.invertScale);
    return invert ? "ASC" : "DESC";
  }
  return "DESC";
}

function orderPlayers(
  players: PlottedStatsLabPlayer[],
  localSortKey: LocalSortKey,
  localSortDir: SortDir,
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

function computeColumnLeaders(
  players: PlottedStatsLabPlayer[],
  metrics: FplStatKey[],
): {
  metricLeaders: Map<FplStatKey, Set<number>>;
  compositeLeaderIds: Set<number>;
} {
  const metricLeaders = new Map<FplStatKey, Set<number>>();
  const compositeLeaderIds = new Set<number>();
  if (players.length < 2) {
    return { metricLeaders, compositeLeaderIds };
  }

  for (const key of metrics) {
    const def = getFplStatDefinition(key);
    const invert = Boolean(def?.invertScale);
    const vals = players.map((p) => p.displayValues[key] ?? 0);
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    if (Math.abs(maxVal - minVal) <= 1e-9) continue;

    let bestVal: number | null;
    if (invert) {
      bestVal = minVal;
    } else {
      const nonNegative = vals.every((v) => v >= 0);
      if (nonNegative && !(maxVal > 0)) {
        bestVal = null;
      } else {
        bestVal = maxVal;
      }
    }
    if (bestVal == null) continue;

    const ids = new Set<number>();
    for (const p of players) {
      if (Math.abs((p.displayValues[key] ?? 0) - bestVal) <= 1e-6) {
        ids.add(p.fpl_element_id);
      }
    }
    if (ids.size > 0) metricLeaders.set(key, ids);
  }

  const rounded = players.map((p) => Math.round(p.compositeScore));
  const minComp = Math.min(...rounded);
  const maxComp = Math.max(...rounded);
  if (maxComp > minComp) {
    for (const p of players) {
      if (Math.round(p.compositeScore) === maxComp) {
        compositeLeaderIds.add(p.fpl_element_id);
      }
    }
  }

  return { metricLeaders, compositeLeaderIds };
}

function posShort(elementType: number): string {
  if (elementType === 1 || elementType === 2 || elementType === 3 || elementType === 4) {
    return FPL_POSITION_LABELS_EN[elementType];
  }
  return "—";
}

function formatHeatmapStatValue(
  key: FplStatKey,
  val: number,
  per90: boolean,
): string {
  if (!per90 && key === "threat" && Number.isInteger(val)) {
    return String(Math.round(val));
  }
  return formatStatDisplay(key, val, Boolean(per90));
}

function compositeAccentColor(comp: number): string {
  if (comp >= 85) return "#10b981";
  if (comp >= 65) return "#14b8a6";
  if (comp >= 35) return "#64748b";
  return "#f59e0b";
}

export function HeatmapMatrixChart({
  players,
  metrics,
  poolAverages,
  poolSize,
  scaleMode = "PERCENTILE",
  per90 = false,
  showValues = true,
  showMeta = true,
  showAvg = true,
  theme,
  lang,
  spotlightId = null,
  onSelectPlayer,
  variant = "interactive",
}: Props) {
  const isExport = variant === "export";
  const isLight = theme.id === "ANALYST_LIGHT";
  const showGroupAvgRow = Boolean(showAvg) && Boolean(poolAverages);
  const [localSortKey, setLocalSortKey] = useState<LocalSortKey>(null);
  const [localSortDir, setLocalSortDir] = useState<SortDir>("DESC");

  const playersIdentityKey = players.map((p) => p.fpl_element_id).join(",");
  const metricsKey = metrics.join(",");

  useEffect(() => {
    setLocalSortKey(null);
    setLocalSortDir("DESC");
  }, [playersIdentityKey, metricsKey]);

  function handleLocalSort(key: FplStatKey | "composite") {
    if (isExport) return;
    if (localSortKey === key) {
      setLocalSortDir((d) => (d === "DESC" ? "ASC" : "DESC"));
    } else {
      setLocalSortKey(key);
      setLocalSortDir(defaultSortDirForKey(key, scaleMode));
    }
  }

  const ordered = useMemo(
    () => orderPlayers(players, localSortKey, localSortDir, scaleMode),
    [players, localSortKey, localSortDir, scaleMode],
  );

  const { metricLeaders, compositeLeaderIds } = useMemo(
    () => computeColumnLeaders(players, metrics),
    [players, metrics],
  );

  const hasInvertMetric = metrics.some(
    (k) => getFplStatDefinition(k)?.invertScale,
  );

  void showValues; // wartości zawsze widoczne jako rawFormatted (bez kodów Pxx)

  const matrixGridTemplate = `280px repeat(${Math.max(metrics.length, 1)}, minmax(0, 1fr)) 112px`;
  const matrixRowClass =
    "grid items-stretch gap-2 rounded-xl border px-2.5 py-1.5";
  const ocenaSep = `flex items-stretch border-l-2 pl-2 ${
    isLight ? "border-slate-300" : "border-amber-400/25"
  }`;

  const scalePills =
    lang === "pl"
      ? [
          { label: "Elita", tone: getHeatmapCellTone(90, isLight) },
          { label: "Wysoki", tone: getHeatmapCellTone(70, isLight) },
          { label: "Środek", tone: getHeatmapCellTone(50, isLight) },
          { label: "Niski", tone: getHeatmapCellTone(25, isLight) },
          { label: "Słaby", tone: getHeatmapCellTone(8, isLight) },
        ]
      : [
          { label: "Elite", tone: getHeatmapCellTone(90, isLight) },
          { label: "High", tone: getHeatmapCellTone(70, isLight) },
          { label: "Mid", tone: getHeatmapCellTone(50, isLight) },
          { label: "Low", tone: getHeatmapCellTone(25, isLight) },
          { label: "Poor", tone: getHeatmapCellTone(8, isLight) },
        ];

  function renderMetricCell(
    p: PlottedStatsLabPlayer,
    key: FplStatKey,
  ): ReactNode {
    const val = p.displayValues[key] ?? 0;
    const rawFormatted = formatHeatmapStatValue(key, val, Boolean(per90));
    const pct = Math.round(
      Math.max(0, Math.min(100, p.percentiles[key] ?? 0)),
    );
    const tone = getHeatmapCellTone(pct, isLight);
    const isLeader =
      metricLeaders.get(key)?.has(p.fpl_element_id) === true;
    const starClass = isLight ? "text-amber-600" : "text-amber-300";
    const leaderRing = isLeader
      ? isLight
        ? "border-amber-500 ring-2 ring-amber-500/80 shadow-sm"
        : "ring-1 ring-amber-400/90"
      : "";

    return (
      <div
        className={`flex h-full min-h-[64px] min-w-0 flex-col items-center justify-center rounded-xl border px-2 py-2.5 text-center ${tone.cell} ${leaderRing}`}
      >
        <span className="whitespace-nowrap text-[18px] font-black leading-none tracking-tight tabular-nums sm:text-[19px]">
          {rawFormatted}
          {isLeader ? (
            <span className={`ml-0.5 text-[15px] ${starClass}`}>★</span>
          ) : null}
        </span>
      </div>
    );
  }

  function renderCompositeCell(
    score: number,
    isLeader: boolean,
  ): ReactNode {
    const accent = compositeAccentColor(score);
    const topAccent = isLeader ? "#f59e0b" : accent;

    if (isLight) {
      return (
        <div
          className={`flex w-full min-h-[64px] flex-col items-center justify-center rounded-xl border-2 bg-slate-900 px-2 py-2 text-white shadow-sm ${
            isLeader
              ? "border-amber-400 ring-2 ring-amber-400/70"
              : "border-slate-800"
          }`}
          style={{
            borderTopWidth: "4px",
            borderTopColor: topAccent,
          }}
        >
          <span className="whitespace-nowrap text-[20px] font-black leading-none tabular-nums text-white sm:text-[22px]">
            {score}
            {isLeader ? (
              <span className="ml-0.5 text-[15px] text-amber-400">★</span>
            ) : null}
          </span>
          <span className="mt-1 text-[9.5px] font-extrabold uppercase tracking-wider text-slate-300">
            {lang === "pl" ? "Z CECH" : "SEL. STATS"}
          </span>
        </div>
      );
    }

    return (
      <div
        className={`flex w-full min-h-[64px] flex-col items-center justify-center rounded-xl border-2 px-2 py-2 shadow-sm ${
          isLeader ? "ring-2 ring-amber-400/60" : ""
        }`}
        style={{
          background: isLeader
            ? "linear-gradient(180deg, rgba(245, 158, 11, 0.30) 0%, rgba(15, 23, 42, 0.96) 100%)"
            : "linear-gradient(180deg, rgba(245, 158, 11, 0.14) 0%, rgba(15, 23, 42, 0.94) 100%)",
          borderColor: isLeader ? "#fbbf24" : "rgba(251, 191, 36, 0.40)",
          borderTopWidth: "4px",
          borderTopColor: isLeader ? "#fbbf24" : accent,
        }}
      >
        <span
          className={`whitespace-nowrap text-[20px] font-black leading-none tabular-nums sm:text-[22px] ${
            isLeader ? "text-amber-200" : "text-white"
          }`}
        >
          {score}
          {isLeader ? (
            <span className="ml-0.5 text-[15px] text-amber-300">★</span>
          ) : null}
        </span>
        <span className="mt-1 text-[9.5px] font-extrabold uppercase tracking-wider text-amber-200/80">
          {lang === "pl" ? "Z CECH" : "SEL. STATS"}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Legend scale bar */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2"
        style={{ borderColor: theme.border, background: theme.panelBg }}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {scalePills.map((pill) => (
            <span
              key={pill.label}
              className={`rounded-lg border px-3 py-1 text-[12px] font-extrabold ${pill.tone.cell}`}
            >
              {pill.label}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-lg border px-3 py-1 text-[12px] font-extrabold ${
              isLight
                ? "border-amber-400 bg-amber-50 text-amber-900"
                : "border-amber-400/50 bg-amber-500/15 text-amber-200"
            }`}
          >
            {lang === "pl" ? "★ Lider kolumny" : "★ Column leader"}
          </span>
          {hasInvertMetric ? (
            <span
              className={`rounded-lg border px-3 py-1 text-[12px] font-extrabold ${
                isLight
                  ? "border-rose-300 bg-rose-50 text-rose-900"
                  : "border-rose-400/40 bg-rose-500/15 text-rose-200"
              }`}
            >
              {lang === "pl" ? "↓ mniej = lepiej" : "↓ lower is better"}
            </span>
          ) : null}
          {!isExport && localSortKey != null ? (
            <button
              type="button"
              onClick={() => {
                setLocalSortKey(null);
                setLocalSortDir("DESC");
              }}
              className="rounded-lg border px-3 py-1 text-[12px] font-extrabold uppercase tracking-wide"
              style={{
                borderColor: theme.border,
                color: theme.muted,
                background: theme.canvasBg,
              }}
            >
              {lang === "pl" ? "Reset sortu" : "Reset sort"}
            </button>
          ) : null}
        </div>
      </div>

      {/* Header — ta sama siatka / padding co wiersze graczy */}
      <div
        className={matrixRowClass}
        style={{
          gridTemplateColumns: matrixGridTemplate,
          borderColor: "transparent",
          background: "transparent",
        }}
      >
        <div
          className="flex min-h-[50px] items-center rounded-xl border px-3 py-2 text-[13px] font-black uppercase tracking-wider sm:text-[14px]"
          style={{
            borderColor: theme.border,
            background: theme.panelBg,
            color: theme.muted,
          }}
        >
          {lang === "pl" ? "Zawodnik" : "Player"}
        </div>
        {metrics.map((key, idx) => {
          const def = getFplStatDefinition(key);
          const short =
            lang === "en" ? def?.shortLabelEn : def?.shortLabelPl;
          const full = lang === "en" ? def?.labelEn : def?.labelPl;
          const invert = Boolean(def?.invertScale);
          const isSorted = localSortKey === key;
          const metricColor =
            getMetricColor(idx, theme) || theme.accent;
          const HeaderTag = isExport ? "div" : "button";
          return (
            <HeaderTag
              key={key}
              type={isExport ? undefined : "button"}
              title={full ?? key}
              onClick={
                isExport ? undefined : () => handleLocalSort(key)
              }
              className="flex min-h-[50px] items-center justify-center gap-1.5 rounded-xl border px-2 py-2 transition-colors"
              style={{
                borderColor: isSorted ? theme.accent : `${metricColor}66`,
                backgroundColor: isLight
                  ? `${metricColor}14`
                  : `${metricColor}22`,
                borderTopWidth: "4px",
                borderTopColor: metricColor,
              }}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: metricColor }}
              />
              <span
                className={`whitespace-nowrap text-[14px] font-black leading-none tracking-tight sm:text-[15px] ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
              >
                {short ?? key}
              </span>
              {invert ? (
                <span className="text-[13px] font-black text-amber-500">
                  ↓
                </span>
              ) : null}
              {isSorted ? (
                <span className="text-[11px] font-black">
                  {localSortDir === "DESC" ? "▼" : "▲"}
                </span>
              ) : null}
            </HeaderTag>
          );
        })}
        {(() => {
          const isSorted = localSortKey === "composite";
          const HeaderTag = isExport ? "div" : "button";
          return (
            <div className={ocenaSep}>
              <HeaderTag
                type={isExport ? undefined : "button"}
                onClick={
                  isExport
                    ? undefined
                    : () => handleLocalSort("composite")
                }
                className={`flex w-full min-h-[50px] flex-col items-center justify-center rounded-xl border-2 px-2 py-2 shadow-sm transition-colors ${
                  isLight
                    ? `bg-slate-900 text-white ${
                        isSorted
                          ? "border-amber-500"
                          : "border-slate-800"
                      }`
                    : "border-amber-400/60 bg-amber-500/20 text-amber-100"
                }`}
                style={{
                  borderTopWidth: "4px",
                  borderTopColor: "#f59e0b",
                }}
              >
                <div className="text-[13px] font-black uppercase leading-none tracking-wider sm:text-[14px]">
                  {lang === "pl" ? "OCENA" : "RATING"}
                  {isSorted ? (
                    <span className="ml-0.5 text-[11px]">
                      {localSortDir === "DESC" ? "▼" : "▲"}
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 text-[10px] font-extrabold opacity-80">
                  0–100
                </div>
              </HeaderTag>
            </div>
          );
        })()}
      </div>

      {/* Rows */}
      <div className="space-y-1.5">
        {ordered.map((p, idx) => {
          const isSpot = spotlightId === p.fpl_element_id;
          const rankBadge = isSpot
            ? isLight
              ? "bg-amber-200 text-amber-950 border-amber-400"
              : "bg-amber-500/25 text-amber-100 border-amber-400/50"
            : isLight
              ? "bg-slate-200 text-slate-900 border-slate-300"
              : "bg-white/10 text-slate-200 border-white/15";
          const clubShort = p.club?.short_name ?? "—";
          const initials = (p.web_name || "?")
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          const photoCode = p.playerCode || p.player_code;

          const metaLine =
            showMeta !== false
              ? `${clubShort} · ${posShort(p.element_type)} · £${(p.rawValues.now_cost / 10).toFixed(1)}m · ${Number(p.rawValues.selected_by_percent).toFixed(1)}%`
              : `${clubShort} · ${posShort(p.element_type)}`;

          return (
            <div
              key={p.fpl_element_id}
              role={onSelectPlayer ? "button" : undefined}
              tabIndex={onSelectPlayer ? 0 : undefined}
              onClick={() => onSelectPlayer?.(p.fpl_element_id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onSelectPlayer?.(p.fpl_element_id);
                }
              }}
              className={`${matrixRowClass} cursor-pointer transition ${
                isSpot
                  ? isLight
                    ? "border-amber-400 ring-1 ring-amber-400/80"
                    : "border-amber-400/70 ring-1 ring-amber-400/50"
                  : ""
              }`}
              style={{
                gridTemplateColumns: matrixGridTemplate,
                borderColor: isSpot ? undefined : theme.border,
                background: isSpot
                  ? isLight
                    ? "rgba(251,191,36,0.08)"
                    : "rgba(251,191,36,0.06)"
                  : theme.canvasBg,
              }}
            >
              <div className="flex h-full min-h-[64px] items-center gap-2 rounded-xl py-1">
                <span
                  className={`flex h-7 min-w-[30px] shrink-0 items-center justify-center rounded-lg border px-1.5 text-[12px] font-black tabular-nums ${rankBadge}`}
                >
                  #{idx + 1}
                </span>
                <div className="relative h-[52px] w-[52px] shrink-0">
                  {photoCode > 0 ? (
                    <img
                      src={fplLabPlayerPhotoUrl(photoCode)}
                      alt=""
                      className="h-[52px] w-[52px] rounded-full border-2 object-cover object-top"
                      style={{ borderColor: theme.border }}
                      crossOrigin="anonymous"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback instanceof HTMLElement) {
                          fallback.style.display = "flex";
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className={`h-[52px] w-[52px] items-center justify-center rounded-full border-2 text-[13px] font-black ${
                      photoCode > 0 ? "hidden" : "flex"
                    }`}
                    style={{
                      borderColor: theme.border,
                      background: theme.panelBg,
                      color: theme.muted,
                    }}
                  >
                    {initials}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 bg-white p-0.5 shadow-md">
                    <img
                      src={fplLabBadgeUrl(
                        p.clubPulseCode || p.club?.pulse_code || 0,
                      )}
                      alt=""
                      className="h-full w-full object-contain"
                      crossOrigin="anonymous"
                    />
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <p
                    className="break-words text-[15px] font-black leading-tight"
                    style={{ color: theme.text }}
                  >
                    {p.web_name}
                  </p>
                  <p
                    className="mt-0.5 whitespace-nowrap text-[11px] font-bold leading-tight"
                    style={{ color: theme.muted }}
                  >
                    {metaLine}
                  </p>
                </div>
              </div>

              {metrics.map((key) => (
                <div key={key} className="min-h-[64px]">
                  {renderMetricCell(p, key)}
                </div>
              ))}
              <div className={`${ocenaSep} min-h-[64px]`}>
                {renderCompositeCell(
                  Math.round(p.compositeScore),
                  compositeLeaderIds.has(p.fpl_element_id),
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Group average reference row — tylko gdy showAvg + poolAverages */}
      {showGroupAvgRow ? (
        <div
          className={`${matrixRowClass} mt-0 border-t pt-2`}
          style={{
            gridTemplateColumns: matrixGridTemplate,
            borderColor: theme.border,
            background: theme.canvasBg,
          }}
        >
          <div
            className="flex h-full min-h-[64px] items-center gap-2 rounded-xl py-1"
            style={{ color: theme.text }}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-black ${
                isLight
                  ? "bg-slate-200 text-slate-800"
                  : "bg-white/10 text-slate-200"
              }`}
            >
              Ø
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-extrabold leading-tight">
                {lang === "pl" ? "Średnia grupy" : "Group average"}
              </p>
              {typeof poolSize === "number" && poolSize > 0 ? (
                <p
                  className="mt-0.5 text-[10px] font-medium"
                  style={{ color: theme.muted }}
                >
                  {lang === "pl"
                    ? `Grupa: ${poolSize} graczy`
                    : `Pool: ${poolSize} players`}
                </p>
              ) : null}
            </div>
          </div>

          {metrics.map((key) => {
            const avgVal = poolAverages?.[key] ?? 0;
            const avgFormatted = formatHeatmapStatValue(
              key,
              avgVal,
              Boolean(per90),
            );
            const tone = getHeatmapCellTone(50, isLight);
            return (
              <div
                key={`avg-${key}`}
                className={`flex h-full min-h-[64px] min-w-0 flex-col items-center justify-center rounded-xl border px-2 py-2.5 text-center ${tone.cell}`}
              >
                <span className="whitespace-nowrap text-[18px] font-bold tabular-nums sm:text-[19px]">
                  {avgFormatted}
                </span>
              </div>
            );
          })}

          <div className={`${ocenaSep} min-h-[64px]`}>
            {renderCompositeCell(50, false)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
