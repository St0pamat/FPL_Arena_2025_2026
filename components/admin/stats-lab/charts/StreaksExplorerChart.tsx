"use client";

import {
  ArrowDown,
  Award,
  Check,
  Crosshair,
  Flame,
  Footprints,
  Hand,
  Percent,
  Shield,
  Sparkles,
  Target,
} from "lucide-react";
import {
  comparePlayersByStreak,
  type PlottedStatsLabPlayer,
} from "@/lib/stats-lab/analyticsEngine";
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
  detectStreakPoolKind,
  filterValidStreakKeysForPosition,
  orderStreakKeysByHierarchy,
} from "@/lib/stats-lab/i18n";
import type { StatsLabChartTheme } from "@/components/admin/stats-lab/chartTheme";
import {
  fplLabBadgeUrl,
  fplLabPlayerPhotoUrl,
} from "@/lib/stats-lab/mediaUrls";
import type {
  PlayerStreaks,
  PlayingTimeGwEntry,
} from "@/lib/stats-lab/types";
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
  onSelectDefaultStreaks?: () => void;
  onSelectAllStreaks?: () => void;
  sortKey: StreakMetricKey;
  sortDir: "DESC" | "ASC";
  onSort: (key: StreakMetricKey) => void;
  onSelectPlayer: (id: number) => void;
  variant?: "studio" | "export";
};

const SORT_ICONS: Record<StreakSortKey, typeof Flame> = {
  returnConsistencyPct: Percent,
  maxReturnStreak: Flame,
  currentReturnStreak: Sparkles,
  maxGoalOrAssistStreak: Crosshair,
  maxGoalStreak: Target,
  maxAssistStreak: Crosshair,
  maxCleanSheetStreak: Shield,
  maxDcPointsStreak: Footprints,
  maxSavesPointStreak: Hand,
  maxBonusStreak: Award,
};

const HERO_KEY: StreakMetricKey = "returnConsistencyPct";

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

function formatStreakValue(
  key: StreakMetricKey,
  val: number,
  streaks: PlayerStreaks,
): string {
  if (key === "returnConsistencyPct") {
    const ret = streaks.returnsCount ?? 0;
    const apps = streaks.appearancesCount ?? 0;
    return `${val.toFixed(0)}% (${ret}/${apps})`;
  }
  return `${val} GW`;
}

function PlayingTimeDots({
  timeline,
  tokens,
}: {
  timeline: PlayingTimeGwEntry[];
  tokens: StatsLabThemeTokens;
}) {
  if (!timeline.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {timeline.map((entry) => {
        if (entry.status === "SIXTY_PLUS") {
          return (
            <span
              key={`pt-${entry.gw}`}
              title={`GW${entry.gw}: ${entry.minutes}' (60+)`}
              className={`h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-offset-2 ${
                tokens.isLight
                  ? "bg-sky-600 ring-sky-600 ring-offset-white"
                  : "bg-sky-400 ring-sky-400/90 ring-offset-slate-900"
              }`}
            />
          );
        }
        if (entry.status === "SUB_UNDER_60") {
          return (
            <span
              key={`pt-${entry.gw}`}
              title={`GW${entry.gw}: ${entry.minutes}' (<60)`}
              className="h-2 w-2 shrink-0 rounded-full bg-amber-400"
            />
          );
        }
        return (
          <span
            key={`pt-${entry.gw}`}
            title={`GW${entry.gw}: 0'`}
            className={`h-2 w-2 shrink-0 rounded-full ${
              tokens.isLight
                ? "border border-slate-400 bg-slate-200"
                : "border border-slate-600 bg-slate-800"
            }`}
          />
        );
      })}
      <span
        className={`ml-1 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-wider ${
          tokens.isLight ? "text-slate-600" : tokens.textMuted
        }`}
      >
        <span>⦿ 60+</span>
        <span>● &lt;60′</span>
        <span>○ 0′</span>
      </span>
    </div>
  );
}

function StreakTile({
  keyName,
  label,
  valueLabel,
  max,
  value,
  flags,
  style,
  tokens,
  lang,
  banner = false,
  subtitle,
}: {
  keyName: StreakMetricKey;
  label: string;
  valueLabel: string;
  value: number;
  max: number;
  flags: boolean[];
  style: StreakMetricStyle;
  tokens: StatsLabThemeTokens;
  lang: StatsLabLang;
  banner?: boolean;
  subtitle?: string;
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
        <div className="min-w-0">
          <span
            className={`block text-xs font-extrabold leading-tight ${
              tokens.isLight ? "text-slate-900" : tokens.text
            } ${banner ? "text-sm" : ""}`}
          >
            {label}
          </span>
          {subtitle ? (
            <span
              className={`mt-0.5 block text-[9px] font-medium leading-snug ${
                tokens.isLight ? "text-slate-600" : tokens.textMuted
              }`}
            >
              {subtitle}
            </span>
          ) : null}
        </div>
        <span
          className={`shrink-0 whitespace-nowrap rounded px-2 py-0.5 font-black tabular-nums ${
            banner ? "text-base" : "text-sm"
          }`}
          style={{ background: style.pillBg, color: style.pillText }}
        >
          {valueLabel}
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
  onSelectDefaultStreaks,
  onSelectAllStreaks,
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
  const pool = detectStreakPoolKind(
    players.map((p) => p.element_type as 1 | 2 | 3 | 4),
  );

  const selectedRaw =
    activeStreakKeys.length > 0
      ? activeStreakKeys
      : (["returnConsistencyPct", "maxReturnStreak"] as StreakMetricKey[]);
  const showHero = selectedRaw.includes(HERO_KEY);
  const secondaryKeys = orderStreakKeysByHierarchy(
    filterValidStreakKeysForPosition(selectedRaw, pool),
  );
  // Max/Current zawsze pierwsze w secondary jeśli zaznaczone
  const displayKeys = showHero
    ? [HERO_KEY, ...secondaryKeys]
    : secondaryKeys;

  const sorted = [...players].sort((a, b) =>
    comparePlayersByStreak(a, b, sortKey, sortDir),
  );

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

  const toggleableKeys = STREAK_METRIC_KEYS.filter((k) => k !== "max60MinStreak");

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

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="mr-1 text-[10px] font-black uppercase tracking-wider"
                style={{ color: theme.muted }}
              >
                {lang === "pl"
                  ? "Widoczne serie (Zaznacz / Odznacz):"
                  : "Visible streaks (Toggle):"}
              </span>
              {onSelectDefaultStreaks ? (
                <button
                  type="button"
                  onClick={onSelectDefaultStreaks}
                  className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${
                    tokens.isLight
                      ? "border-slate-300 text-slate-700 hover:bg-slate-100"
                      : "border-slate-700 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {lang === "pl"
                    ? "Zaznacz domyślne dla pozycji"
                    : "Select position defaults"}
                </button>
              ) : null}
              {onSelectAllStreaks ? (
                <button
                  type="button"
                  onClick={onSelectAllStreaks}
                  className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${
                    tokens.isLight
                      ? "border-slate-300 text-slate-700 hover:bg-slate-100"
                      : "border-slate-700 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {lang === "pl" ? "Zaznacz wszystkie" : "Select all"}
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {toggleableKeys.map((key) => {
                const validAlone = filterValidStreakKeysForPosition(
                  [key],
                  pool,
                );
                const positionBlocked =
                  key !== HERO_KEY && validAlone.length === 0;
                const on = selectedRaw.includes(key) && !positionBlocked;
                const style = getStreakMetricStyle(key, tokens.isLight);
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={positionBlocked}
                    title={
                      positionBlocked
                        ? lang === "pl"
                          ? "Niedostępne dla tej pozycji"
                          : "Unavailable for this position"
                        : labels[key]
                    }
                    onClick={() => onToggleStreakKey(key)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${
                      positionBlocked
                        ? "cursor-not-allowed opacity-25"
                        : on
                          ? ""
                          : "opacity-45 hover:opacity-80"
                    }`}
                    style={{
                      borderColor: on ? style.accent : theme.border,
                      background: on ? `${style.accent}28` : "transparent",
                      color: on ? theme.text : theme.muted,
                      boxShadow: on ? `0 0 0 1px ${style.accent}55` : undefined,
                    }}
                  >
                    {on ? (
                      <Check
                        className="h-3 w-3 shrink-0"
                        style={{ color: style.accent }}
                      />
                    ) : (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: style.accent, opacity: 0.5 }}
                      />
                    )}
                    {labels[key]}
                  </button>
                );
              })}
            </div>
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
                ? `Regularność: ${heroVal.toFixed(0)}% (${p.streaks.returnsCount}/${p.streaks.appearancesCount})`
                : `Consistency: ${heroVal.toFixed(0)}% (${p.streaks.returnsCount}/${p.streaks.appearancesCount})`
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
          const totalGws = Math.max(
            1,
            p.streaks.totalPeriodGws || p.streaks.appearancesCount || 1,
          );
          const apps = p.streaks.appearancesCount ?? 0;
          const sixty = p.streaks.sixtyPlusCount ?? 0;

          // Secondary: Max + Current first row if present, then rest
          const maxKey = secondaryKeys.includes("maxReturnStreak")
            ? ("maxReturnStreak" as const)
            : null;
          const curKey = secondaryKeys.includes("currentReturnStreak")
            ? ("currentReturnStreak" as const)
            : null;
          const restKeys = secondaryKeys.filter(
            (k) => k !== "maxReturnStreak" && k !== "currentReturnStreak",
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
              {/* Kartoteka Piłkarza */}
              <div className="mb-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
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
                      {showMeta ? (
                        <p className={`mt-0.5 text-[11px] ${metaClass}`}>
                          {price} · {tsb}
                        </p>
                      ) : null}
                      <p
                        className={`mt-0.5 truncate text-[17px] leading-tight ${nameClass}`}
                      >
                        {p.web_name}
                      </p>
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

                {/* Moduł czasu gry */}
                <div
                  className={`rounded-lg px-3 py-1.5 ${
                    tokens.isLight
                      ? "border border-slate-300 bg-white"
                      : "border border-slate-700/80 bg-slate-950/60"
                  }`}
                >
                  <div
                    className={`mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-extrabold tabular-nums ${
                      tokens.isLight ? "text-slate-800" : "text-slate-200"
                    }`}
                  >
                    <span>
                      {lang === "pl" ? "Występy" : "Apps"}: {apps}/{totalGws}
                    </span>
                    <span className={tokens.textMuted}>·</span>
                    <span>
                      {lang === "pl" ? "60+ min" : "60+ mins"}: {sixty}/
                      {totalGws}
                    </span>
                  </div>
                  <PlayingTimeDots
                    timeline={p.streaks.playingTimeTimeline ?? []}
                    tokens={tokens}
                  />
                </div>
              </div>

              <div className="space-y-2">
                {showHero ? (
                  <StreakTile
                    keyName={HERO_KEY}
                    label={labels[HERO_KEY]}
                    subtitle={
                      lang === "pl"
                        ? "Mecze ze zwrotem (bez pkt za występ i 60+ min)"
                        : "Matches with return (excl. appearance & 60+ mins)"
                    }
                    value={Number(p.streaks.returnConsistencyPct ?? 0)}
                    valueLabel={formatStreakValue(
                      HERO_KEY,
                      Number(p.streaks.returnConsistencyPct ?? 0),
                      p.streaks,
                    )}
                    max={maxima[HERO_KEY] ?? 100}
                    flags={timelineDotsForKey(p.streaks, HERO_KEY)}
                    style={getStreakMetricStyle(HERO_KEY, tokens.isLight)}
                    tokens={tokens}
                    lang={lang}
                    banner
                  />
                ) : null}

                {(maxKey || curKey) && (
                  <div className="grid auto-rows-fr grid-cols-2 gap-2">
                    {maxKey ? (
                      <StreakTile
                        keyName={maxKey}
                        label={labels[maxKey]}
                        value={Number(p.streaks[maxKey] ?? 0)}
                        valueLabel={formatStreakValue(
                          maxKey,
                          Number(p.streaks[maxKey] ?? 0),
                          p.streaks,
                        )}
                        max={maxima[maxKey] ?? 1}
                        flags={timelineDotsForKey(p.streaks, maxKey)}
                        style={getStreakMetricStyle(maxKey, tokens.isLight)}
                        tokens={tokens}
                        lang={lang}
                      />
                    ) : (
                      <div />
                    )}
                    {curKey ? (
                      <StreakTile
                        keyName={curKey}
                        label={labels[curKey]}
                        value={Number(p.streaks[curKey] ?? 0)}
                        valueLabel={formatStreakValue(
                          curKey,
                          Number(p.streaks[curKey] ?? 0),
                          p.streaks,
                        )}
                        max={maxima[curKey] ?? 1}
                        flags={timelineDotsForKey(p.streaks, curKey)}
                        style={getStreakMetricStyle(curKey, tokens.isLight)}
                        tokens={tokens}
                        lang={lang}
                      />
                    ) : (
                      <div />
                    )}
                  </div>
                )}

                {restKeys.length > 0 ? (
                  <div className="grid auto-rows-fr grid-cols-2 gap-2">
                    {restKeys.map((key) => (
                      <StreakTile
                        key={key}
                        keyName={key}
                        label={labels[key]}
                        value={Number(p.streaks[key] ?? 0)}
                        valueLabel={formatStreakValue(
                          key,
                          Number(p.streaks[key] ?? 0),
                          p.streaks,
                        )}
                        max={maxima[key] ?? 1}
                        flags={timelineDotsForKey(p.streaks, key)}
                        style={getStreakMetricStyle(key, tokens.isLight)}
                        tokens={tokens}
                        lang={lang}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
