"use client";

import {
  ArrowDown,
  Award,
  Crosshair,
  Flame,
  Footprints,
  Hand,
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
  STREAK_SECONDARY_BY_POOL,
  STREAK_SORT_KEYS,
  STREAK_SORT_SHORT_LABELS,
} from "@/lib/stats-lab/i18n";
import type { StatsLabChartTheme } from "@/components/admin/stats-lab/chartTheme";
import {
  fplLabBadgeUrl,
  fplLabPlayerPhotoUrl,
} from "@/lib/stats-lab/mediaUrls";
import type { PlayerStreaks } from "@/lib/stats-lab/types";
import {
  getStreakMetricStyle,
  getThemeTokens,
  type StatsLabThemeTokens,
  type StreakMetricStyle,
} from "@/lib/stats-lab/themeTokens";

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

type PoolKind = keyof typeof STREAK_SECONDARY_BY_POOL;

const SORT_ICONS: Record<StreakSortKey, typeof Flame> = {
  returnConsistencyPct: Percent,
  maxReturnStreak: Flame,
  currentReturnStreak: Sparkles,
  maxGoalStreak: Target,
  maxAssistStreak: Crosshair,
  maxCleanSheetStreak: Shield,
  maxDcPointsStreak: Footprints,
  maxSavesPointStreak: Hand,
  maxBonusStreak: Award,
};

const HERO_KEY: StreakMetricKey = "returnConsistencyPct";

function detectPoolKind(players: PlottedStatsLabPlayer[]): PoolKind {
  if (!players.length) return "MIXED";
  const types = new Set(players.map((p) => p.element_type));
  if (types.size !== 1) return "MIXED";
  const only = [...types][0];
  if (only === 1) return "GKP";
  if (only === 2) return "DEF";
  if (only === 3) return "MID";
  if (only === 4) return "FWD";
  return "MIXED";
}

/** Martwe / bezsensowne serie dla danej puli pozycji. */
function isDeadForPool(key: StreakMetricKey, pool: PoolKind): boolean {
  if (pool === "GKP") {
    return (
      key === "maxGoalStreak" ||
      key === "maxAssistStreak" ||
      key === "maxGoalOrAssistStreak" ||
      key === "maxDcPointsStreak"
    );
  }
  if (pool === "FWD") {
    return key === "maxCleanSheetStreak" || key === "maxSavesPointStreak";
  }
  if (pool === "DEF" || pool === "MID") {
    return key === "maxSavesPointStreak";
  }
  return key === "maxSavesPointStreak";
}

function resolveSecondaryKeys(
  pool: PoolKind,
  activeStreakKeys: StreakMetricKey[],
): StreakMetricKey[] {
  const hierarchy = STREAK_SECONDARY_BY_POOL[pool];
  if (pool !== "MIXED") return hierarchy;

  const fromActive = activeStreakKeys.filter(
    (k) => k !== HERO_KEY && !isDeadForPool(k, pool),
  );
  if (fromActive.length === 0) return hierarchy;

  const rank = new Map(hierarchy.map((k, i) => [k, i]));
  const ordered = [...fromActive].sort(
    (a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99),
  );
  // Parzysta siatka — dopełnij hierarchią lub odetnij ostatni
  let out = ordered.slice(0, 8);
  if (out.length % 2 === 1) {
    const pad = hierarchy.find((k) => !out.includes(k));
    if (pad) out = [...out, pad];
    else out = out.slice(0, -1);
  }
  return out.length >= 2 ? out : hierarchy;
}

function timelineDotsForKey(
  streaks: PlayerStreaks,
  key: StreakMetricKey,
): boolean[] {
  switch (key) {
    case "maxReturnStreak":
    case "currentReturnStreak":
    case "returnConsistencyPct":
      return (
        streaks.returnTimelineDots ??
        streaks.timelineDots ??
        streaks.recentFlags.returnHit
      );
    case "maxGoalStreak":
      return streaks.goalTimelineDots ?? streaks.recentFlags.goalHit;
    case "maxAssistStreak":
      return streaks.assistTimelineDots ?? streaks.recentFlags.assistHit;
    case "maxGoalOrAssistStreak":
      return streaks.gaTimelineDots ?? streaks.recentFlags.goalOrAssistHit;
    case "maxCleanSheetStreak":
      return streaks.csTimelineDots ?? streaks.recentFlags.cleanSheetHit;
    case "maxDcPointsStreak":
      return streaks.dcTimelineDots ?? streaks.recentFlags.dcHit;
    case "max60MinStreak":
      return streaks.sixtyMinTimelineDots ?? streaks.recentFlags.sixtyMinHit;
    case "maxSavesPointStreak":
      return streaks.savesTimelineDots ?? streaks.recentFlags.savesHit;
    case "maxBonusStreak":
      return streaks.bonusTimelineDots ?? streaks.recentFlags.bonusHit;
    default:
      return streaks.returnTimelineDots ?? streaks.recentFlags.returnHit;
  }
}

function formatStreakValue(key: StreakMetricKey, val: number): string {
  if (key === "returnConsistencyPct") return `${val.toFixed(0)}%`;
  return `${val} GW`;
}

function StreakTile({
  keyName,
  label,
  value,
  max,
  flags,
  style,
  tokens,
  lang,
  banner = false,
}: {
  keyName: StreakMetricKey;
  label: string;
  value: number;
  max: number;
  flags: boolean[];
  style: StreakMetricStyle;
  tokens: StatsLabThemeTokens;
  lang: StatsLabLang;
  banner?: boolean;
}) {
  const pct = Math.min(100, (value / Math.max(1, max)) * 100);
  return (
    <div
      className={`flex h-full flex-col justify-between rounded-lg border border-l-4 px-3 py-2.5 ${
        tokens.isLight ? tokens.tile : `${tokens.tile} ${tokens.tileBorder}`
      } ${banner ? "col-span-2" : ""}`}
      style={{ borderLeftColor: style.accent }}
    >
      <div className="flex min-h-[32px] items-center justify-between gap-2">
        <span
          className={`min-w-0 text-xs font-extrabold leading-tight ${
            tokens.isLight ? "text-slate-900" : tokens.text
          } ${banner ? "text-sm" : ""}`}
        >
          {label}
        </span>
        <span
          className={`shrink-0 whitespace-nowrap rounded px-2 py-0.5 font-black tabular-nums ${
            banner ? "text-base" : "text-sm"
          }`}
          style={{ background: style.pillBg, color: style.pillText }}
        >
          {formatStreakValue(keyName, value)}
        </span>
      </div>

      <div
        className={`my-1.5 h-2 w-full overflow-hidden rounded-full ${tokens.track}`}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: style.accent }}
        />
      </div>

      {flags.length > 0 ? (
        <div className="flex items-center gap-1.5 pt-0.5">
          {flags.map((hit, idx) => (
            <span
              key={`${keyName}-dot-${idx}`}
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                hit ? tokens.hitRing : tokens.missDot
              }`}
              style={hit ? { background: style.accent } : undefined}
              title={hit ? "hit" : "miss"}
            />
          ))}
          <span
            className={`ml-1 text-[9px] font-bold uppercase tracking-wider ${
              tokens.isLight ? "text-slate-600" : tokens.textMuted
            }`}
          >
            {lang === "pl" ? `${flags.length}M` : `last ${flags.length}`}
          </span>
        </div>
      ) : null}
    </div>
  );
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
  const tokens = getThemeTokens(theme.id);
  const labels = STREAK_LABELS[lang];
  const sortShort = STREAK_SORT_SHORT_LABELS[lang];
  const pool = detectPoolKind(players);
  const secondaryKeys = resolveSecondaryKeys(pool, activeStreakKeys);
  const displayKeys = [HERO_KEY, ...secondaryKeys];

  const sorted = [...players].sort((a, b) => {
    const av = Number(a.streaks[sortKey] ?? 0);
    const bv = Number(b.streaks[sortKey] ?? 0);
    return sortDir === "DESC" ? bv - av : av - bv;
  });

  const maxima = Object.fromEntries(
    displayKeys.map((k) => [
      k,
      Math.max(1, ...sorted.map((p) => Number(p.streaks[k] ?? 0))),
    ]),
  ) as Record<StreakMetricKey, number>;

  const nameClass = tokens.isLight
    ? "text-slate-950 font-black"
    : "text-white font-black";
  const clubClass = tokens.isLight
    ? "text-slate-800 font-extrabold"
    : "text-slate-100 font-extrabold";
  const metaClass = tokens.isLight
    ? "text-slate-600 font-semibold"
    : `${tokens.textMuted} font-semibold`;

  return (
    <div className={isExport ? "space-y-5" : "space-y-4"}>
      {isExport ? (
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="text-xs font-black uppercase tracking-wider"
            style={{ color: theme.muted }}
          >
            {lang === "pl" ? "Sort:" : "Sort:"} {labels[sortKey]}
            <ArrowDown className="ml-1 inline h-3.5 w-3.5" />
          </span>
          {displayKeys.map((key) => {
            const style = getStreakMetricStyle(key, tokens.isLight);
            return (
              <span
                key={key}
                className="inline-flex items-center gap-2 text-sm font-bold"
                style={{ color: theme.muted }}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ background: style.accent }}
                />
                {labels[key]}
              </span>
            );
          })}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="mr-1 text-[10px] font-black uppercase tracking-wider"
              style={{ color: theme.muted }}
            >
              {lang === "pl" ? "Sortuj po:" : "Sort by:"}
            </span>
            {STREAK_SORT_KEYS.map((key) => {
              const Icon = SORT_ICONS[key];
              const active = sortKey === key;
              if (isDeadForPool(key, pool)) return null;
              return (
                <button
                  key={`sort-${key}`}
                  type="button"
                  onClick={() => onSort(key)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-extrabold transition ${
                    active
                      ? tokens.isLight
                        ? "border-emerald-700/50 bg-emerald-700/10 text-emerald-800"
                        : "border-[#39FF14]/50 bg-[#39FF14]/15 text-[#39FF14]"
                      : tokens.isLight
                        ? "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
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
            {STREAK_METRIC_KEYS.map((key) => {
              if (isDeadForPool(key, pool)) return null;
              const on = displayKeys.includes(key);
              const style = getStreakMetricStyle(key, tokens.isLight);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onToggleStreakKey(key)}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold"
                  style={{
                    borderColor: on ? style.accent : theme.border,
                    background: on ? `${style.accent}22` : "transparent",
                    color: on ? theme.text : theme.muted,
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: style.accent }}
                  />
                  {labels[key]}
                </button>
              );
            })}
          </div>
        </>
      )}

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
          const isLastOdd =
            sorted.length % 2 === 1 && rank === sorted.length - 1;

          const consistencyVal = Number(
            p.streaks.returnConsistencyPct ?? 0,
          );
          const consistencyStyle = getStreakMetricStyle(
            HERO_KEY,
            tokens.isLight,
          );

          return (
            <button
              key={p.fpl_element_id}
              type="button"
              onClick={() => onSelectPlayer(p.fpl_element_id)}
              className={`relative overflow-hidden rounded-xl border p-4 text-left transition ${tokens.card} ${
                tokens.isLight ? "" : `${tokens.cardBorder} shadow-xl`
              } hover:brightness-110 ${
                isLastOdd
                  ? "w-full md:col-span-2 md:mx-auto md:w-[calc(50%-0.5rem)]"
                  : ""
              }`}
              style={
                isSpot
                  ? {
                      borderColor: theme.gold,
                      boxShadow: `0 0 0 1px ${theme.gold}55`,
                    }
                  : undefined
              }
            >
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
                      <span
                        className={`text-xs tabular-nums ${tokens.rankText}`}
                      >
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
                      <span className={`text-xs tracking-wide ${clubClass}`}>
                        {p.club?.short_name ?? "—"}
                      </span>
                    </div>
                    <p
                      className={`mt-0.5 truncate text-[17px] leading-tight ${nameClass}`}
                    >
                      {p.web_name}
                    </p>
                    {showMeta ? (
                      <p className={`mt-0.5 text-[11px] ${metaClass}`}>
                        {price} · {tsb}
                      </p>
                    ) : null}
                  </div>
                </div>

                <span
                  className={
                    tokens.isLight
                      ? "shrink-0 whitespace-nowrap rounded-full border border-emerald-800 bg-emerald-700 px-2.5 py-1 text-xs font-black text-white shadow-sm"
                      : "shrink-0 whitespace-nowrap rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-black text-[#39FF14]"
                  }
                  style={
                    tokens.isLight
                      ? {
                          backgroundColor: "#047857",
                          color: "#ffffff",
                          borderColor: "#065f46",
                        }
                      : undefined
                  }
                >
                  {heroLabel}
                </span>
              </div>

              <div className="space-y-2">
                <StreakTile
                  keyName={HERO_KEY}
                  label={labels[HERO_KEY]}
                  value={consistencyVal}
                  max={maxima[HERO_KEY] ?? 100}
                  flags={timelineDotsForKey(p.streaks, HERO_KEY)}
                  style={consistencyStyle}
                  tokens={tokens}
                  lang={lang}
                  banner
                />

                <div className="grid auto-rows-fr grid-cols-2 gap-2">
                  {secondaryKeys.map((key) => (
                    <StreakTile
                      key={key}
                      keyName={key}
                      label={labels[key]}
                      value={Number(p.streaks[key] ?? 0)}
                      max={maxima[key] ?? 1}
                      flags={timelineDotsForKey(p.streaks, key)}
                      style={getStreakMetricStyle(key, tokens.isLight)}
                      tokens={tokens}
                      lang={lang}
                    />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
