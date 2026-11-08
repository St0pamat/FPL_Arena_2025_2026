"use client";

import {
  ArrowDown,
  Crosshair,
  Flame,
  Footprints,
  Percent,
  Shield,
  Sparkles,
  Target,
} from "lucide-react";
import type { PlottedStatsLabPlayer } from "@/lib/stats-lab/analyticsEngine";
import type {
  StatsLabLang,
  StreakMetricKey,
  StreakSortKey,
} from "@/lib/stats-lab/i18n";
import {
  STREAK_LABELS,
  STREAK_METRIC_KEYS,
  STREAK_SORT_KEYS,
  STREAK_SORT_SHORT_LABELS,
} from "@/lib/stats-lab/i18n";
import {
  metricColor,
  type StatsLabChartTheme,
} from "@/components/admin/stats-lab/chartTheme";
import {
  fplLabBadgeUrl,
  fplLabPlayerPhotoUrl,
} from "@/lib/stats-lab/mediaUrls";
import type { PlayerStreaks } from "@/lib/stats-lab/types";

type Props = {
  players: PlottedStatsLabPlayer[];
  theme: StatsLabChartTheme;
  lang: StatsLabLang;
  spotlightId: number | null;
  showMeta: boolean;
  activeStreakKeys: StreakMetricKey[];
  onToggleStreakKey: (key: StreakMetricKey) => void;
  sortKey: StreakMetricKey;
  sortDir: "DESC" | "ASC";
  onSort: (key: StreakMetricKey) => void;
  onSelectPlayer: (id: number) => void;
  variant?: "studio" | "export";
};

const SORT_ICONS: Record<StreakSortKey, typeof Flame> = {
  maxReturnStreak: Flame,
  currentReturnStreak: Sparkles,
  maxGoalStreak: Target,
  maxAssistStreak: Crosshair,
  maxCleanSheetStreak: Shield,
  maxDcPointsStreak: Footprints,
  returnConsistencyPct: Percent,
};

function recentFlagsForKey(
  streaks: PlayerStreaks,
  key: StreakMetricKey,
): boolean[] {
  const f = streaks.recentFlags;
  switch (key) {
    case "maxReturnStreak":
    case "currentReturnStreak":
      return f.returnHit;
    case "maxGoalStreak":
      return f.goalHit;
    case "maxAssistStreak":
      return f.assistHit;
    case "maxGoalOrAssistStreak":
      return f.goalOrAssistHit;
    case "maxCleanSheetStreak":
      return f.cleanSheetHit;
    case "maxDcPointsStreak":
      return f.dcHit;
    case "max60MinStreak":
      return f.sixtyMinHit;
    case "returnConsistencyPct":
      return f.returnHit;
    default:
      return f.returnHit;
  }
}

function formatStreakValue(
  key: StreakMetricKey,
  val: number,
  lang: StatsLabLang,
): string {
  if (key === "returnConsistencyPct") return `${val.toFixed(0)}%`;
  return lang === "pl" ? `${val} GW` : `${val} GW`;
}

function isLightMetricBg(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // relative luminance threshold
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
}

export function StreaksExplorerChart({
  players,
  theme,
  lang,
  spotlightId,
  showMeta,
  activeStreakKeys,
  onToggleStreakKey,
  sortKey,
  sortDir,
  onSort,
  onSelectPlayer,
  variant = "studio",
}: Props) {
  const isExport = variant === "export";
  const labels = STREAK_LABELS[lang];
  const sortShort = STREAK_SORT_SHORT_LABELS[lang];
  const keys =
    activeStreakKeys.length > 0
      ? activeStreakKeys
      : (["maxReturnStreak", "currentReturnStreak"] as StreakMetricKey[]);

  const sorted = [...players].sort((a, b) => {
    const av = Number(a.streaks[sortKey] ?? 0);
    const bv = Number(b.streaks[sortKey] ?? 0);
    return sortDir === "DESC" ? bv - av : av - bv;
  });

  const maxima = Object.fromEntries(
    keys.map((k) => [
      k,
      Math.max(1, ...sorted.map((p) => Number(p.streaks[k] ?? 0))),
    ]),
  ) as Record<StreakMetricKey, number>;

  return (
    <div className={isExport ? "space-y-5" : "space-y-4"}>
      {/* Pasek sortowania + pigułki metryk */}
      {isExport ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400">
            {lang === "pl" ? "Sort:" : "Sort:"} {labels[sortKey]}
            <ArrowDown className="ml-1 inline h-3.5 w-3.5" />
          </span>
          {keys.map((key, i) => (
            <span
              key={key}
              className="inline-flex items-center gap-2 text-sm font-bold"
              style={{ color: theme.muted }}
            >
              <span
                className="h-3.5 w-3.5 rounded-full"
                style={{ background: metricColor(i) }}
              />
              {labels[key]}
            </span>
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
              {lang === "pl" ? "Sortuj po:" : "Sort by:"}
            </span>
            {STREAK_SORT_KEYS.map((key) => {
              const Icon = SORT_ICONS[key];
              const active = sortKey === key;
              return (
                <button
                  key={`sort-${key}`}
                  type="button"
                  onClick={() => onSort(key)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-extrabold transition ${
                    active
                      ? "border-[#39FF14]/50 bg-[#39FF14]/15 text-[#39FF14]"
                      : "border-slate-700/80 bg-slate-900/60 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {sortShort[key]}
                  {active ? <ArrowDown className="h-3 w-3 shrink-0" /> : null}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {STREAK_METRIC_KEYS.map((key, i) => {
              const on = keys.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onToggleStreakKey(key)}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold"
                  style={{
                    borderColor: on ? metricColor(i) : theme.border,
                    background: on ? `${metricColor(i)}22` : "transparent",
                    color: on ? theme.text : theme.muted,
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: metricColor(i) }}
                  />
                  {labels[key]}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Siatka kart */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sorted.map((p, rank) => {
          const isSpot = spotlightId === p.fpl_element_id;
          const photo =
            p.playerCode > 0 ? fplLabPlayerPhotoUrl(p.playerCode) : null;
          const badge =
            p.clubPulseCode > 0 ? fplLabBadgeUrl(p.clubPulseCode) : null;
          const heroVal = Number(p.streaks[sortKey] ?? 0);
          const heroLabel =
            sortKey === "returnConsistencyPct"
              ? lang === "pl"
                ? `Regularność: ${heroVal.toFixed(0)}%`
                : `Consistency: ${heroVal.toFixed(0)}%`
              : sortKey === "currentReturnStreak"
                ? lang === "pl"
                  ? `Aktualna: ${heroVal} GW`
                  : `Current: ${heroVal} GW`
                : lang === "pl"
                  ? `Max seria: ${heroVal} GW`
                  : `Max streak: ${heroVal} GW`;
          const price = `£${(p.rawValues.now_cost / 10).toFixed(1)}m`;
          const tsb = `${p.rawValues.selected_by_percent.toFixed(1)}% TSB`;

          return (
            <button
              key={p.fpl_element_id}
              type="button"
              onClick={() => onSelectPlayer(p.fpl_element_id)}
              className="relative overflow-hidden rounded-xl border border-slate-800/90 bg-slate-900/90 p-4 text-left shadow-xl transition hover:border-slate-600"
              style={
                isSpot
                  ? {
                      borderColor: theme.gold,
                      boxShadow: `0 0 0 1px ${theme.gold}55`,
                    }
                  : undefined
              }
            >
              {/* Nagłówek karty */}
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt={p.web_name}
                      width={48}
                      height={48}
                      crossOrigin="anonymous"
                      className="h-12 w-12 shrink-0 rounded-full border border-slate-700 object-cover object-top"
                    />
                  ) : (
                    <span className="h-12 w-12 shrink-0 rounded-full border border-slate-700 bg-slate-800" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black tabular-nums text-[#39FF14]">
                        #{rank + 1}
                      </span>
                      {badge ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 p-0.5 ring-1 ring-white/15">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={badge}
                            alt={p.club?.short_name ?? ""}
                            width={16}
                            height={16}
                            crossOrigin="anonymous"
                            className="h-full w-full object-contain drop-shadow-[0_0_2px_rgba(255,255,255,0.5)]"
                          />
                        </span>
                      ) : null}
                      <span className="text-xs font-extrabold tracking-wide text-slate-100">
                        {p.club?.short_name ?? "—"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[17px] font-black leading-tight text-white">
                      {p.web_name}
                    </p>
                    {showMeta ? (
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                        {price} · {tsb}
                      </p>
                    ) : null}
                  </div>
                </div>

                <span className="shrink-0 rounded-full border border-[#39FF14]/45 bg-[#39FF14]/10 px-2.5 py-1 text-[11px] font-black tabular-nums text-[#39FF14] shadow-[0_0_12px_rgba(57,255,20,0.15)]">
                  {heroLabel}
                </span>
              </div>

              {/* Kafelki pass */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {keys.map((key, i) => {
                  const val = Number(p.streaks[key] ?? 0);
                  const max = maxima[key] || 1;
                  const pct = Math.min(100, (val / max) * 100);
                  const color = metricColor(i);
                  const light = isLightMetricBg(color);
                  const flags = recentFlagsForKey(p.streaks, key);
                  const valueClass = light
                    ? "text-slate-950 font-black"
                    : "text-white font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]";
                  const labelClass = light
                    ? "text-slate-900 font-extrabold"
                    : "text-white/95 font-extrabold drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]";

                  return (
                    <div
                      key={key}
                      className="overflow-hidden rounded-lg border border-slate-800/80 bg-slate-950/50"
                    >
                      <div
                        className="relative px-3 py-2.5"
                        style={{
                          background: `linear-gradient(90deg, ${color}${light ? "cc" : "99"} ${pct}%, rgba(15,23,42,0.92) ${pct}%)`,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[10px] leading-tight ${labelClass}`}>
                            {labels[key]}
                          </span>
                          <span
                            className={`shrink-0 text-lg leading-none tabular-nums ${valueClass}`}
                          >
                            {formatStreakValue(key, val, lang)}
                          </span>
                        </div>
                        {flags.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {flags.map((hit, idx) => (
                              <span
                                key={`${key}-dot-${idx}`}
                                className={`h-2 w-2 rounded-full ${
                                  hit
                                    ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]"
                                    : "bg-slate-600/80"
                                }`}
                                title={hit ? "hit" : "miss"}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
