"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { StatsLabChartTheme } from "@/components/admin/stats-lab/chartTheme";
import {
  METRIC_SEGMENT_COLORS,
  STATS_LAB_CHART_THEMES,
  getScatterClubColor,
} from "@/components/admin/stats-lab/chartTheme";
import type { FplStatKey } from "@/lib/stats-lab/types";
import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import {
  buildVennSummary,
  t,
  vennCohortFromPositions,
  vennChipStatLine,
  vennConditionPhrase,
  vennMetricAria,
  vennShortStatLine,
} from "@/lib/stats-lab/i18n";
import { parseCssColorToRgba } from "@/lib/stats-lab/auditExport";
import { fplLabBadgeUrl } from "@/lib/stats-lab/mediaUrls";
import {
  VENN_CIRCLES,
  VENN_REGION_IDS,
  VENN_TOKEN_SIZE,
  VENN_VIEW,
  assignPlayersToVennRegions,
  layoutVennRegion,
  planVennTokens,
  shortenPlayerLabel,
  type VennCondition,
  type VennConditionId,
  type VennPlaced,
  type VennRegionId,
} from "@/lib/stats-lab/vennEngine";

export type VennChartPlayer = {
  id: number;
  name: string;
  fullName: string;
  clubShort: string;
  clubName: string;
  minutes: number;
  points: number;
  badgeCode: number;
  totals: Partial<Record<string, number | null | undefined>>;
};

type Props = {
  players: VennChartPlayer[];
  conditions: readonly [VennCondition, VennCondition, VennCondition];
  theme: StatsLabChartTheme;
  lang: StatsLabLang;
  positions: readonly number[];
  gwLabel: string;
  minMinutes: number;
  variant?: "studio" | "export";
  /** counts = w kołach same liczby (wąski ekran). */
  density?: "auto" | "full" | "counts";
};

const CIRCLE_IDS: VennConditionId[] = ["A", "B", "C"];

function circleColors(theme: StatsLabChartTheme): Record<VennConditionId, string> {
  return {
    A: theme.accent,
    B: theme.gold,
    C: METRIC_SEGMENT_COLORS[1],
  };
}

function inkForFill(fill: string): string {
  const parsed = parseCssColorToRgba(fill);
  if (!parsed) return STATS_LAB_CHART_THEMES.ARENA_DARK.text;
  const luminance =
    (0.2126 * parsed.r + 0.7152 * parsed.g + 0.0722 * parsed.b) / 255;
  return luminance > 0.64
    ? STATS_LAB_CHART_THEMES.ANALYST_LIGHT.text
    : STATS_LAB_CHART_THEMES.ARENA_DARK.text;
}

function regionHeading(
  region: VennRegionId,
  phrases: readonly [string, string, string],
  allThree: string,
): string {
  const [a, b, c] = phrases;
  if (region === "ABC") return allThree;
  if (region === "AB") return `${a} + ${b}`;
  if (region === "AC") return `${a} + ${c}`;
  if (region === "BC") return `${b} + ${c}`;
  if (region === "A") return a;
  if (region === "B") return b;
  return c;
}

function splitLabel(text: string): [string, string | null] {
  if (text.length <= 32) return [text, null];
  const mid = text.lastIndexOf(" ", 32);
  const cut = mid > 12 ? mid : 32;
  return [text.slice(0, cut), text.slice(cut).trim() || null];
}

function useNarrowChart(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    if (!active) {
      setNarrow(false);
      return;
    }
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setNarrow(width > 0 && width < 768);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [active]);
  return { ref, narrow };
}

function ClubMark({
  code,
  short,
  fill,
}: {
  code: number;
  short: string;
  fill: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = code > 0 && !failed;
  return (
    <span
      className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ background: fill, boxShadow: `0 0 0 1.5px ${fill}` }}
    >
      {showImg ? (
        <img
          src={fplLabBadgeUrl(code)}
          alt=""
          crossOrigin="anonymous"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="text-[9px] font-black leading-none"
          style={{ color: inkForFill(fill) }}
        >
          {(short || "?").slice(0, 1)}
        </span>
      )}
    </span>
  );
}

export function VennDiagramChart({
  players,
  conditions,
  theme,
  lang,
  positions,
  gwLabel,
  minMinutes,
  variant = "studio",
  density = "auto",
}: Props) {
  const copy = t(lang);
  const tipId = useId();
  const [openTip, setOpenTip] = useState<string | null>(null);
  const measure = density === "auto" && variant !== "export";
  const { ref, narrow } = useNarrowChart(measure);
  const countsOnly =
    density === "counts" || (density !== "full" && variant !== "export" && narrow);

  const colors = circleColors(theme);
  const phrases = conditions.map((condition) =>
    vennConditionPhrase(condition.metric, condition.threshold, lang),
  ) as [string, string, string];

  const assignment = useMemo(
    () =>
      assignPlayersToVennRegions({
        players: players.map((player) => ({
          ...player,
          minutes: player.minutes,
          points: player.points,
          totals: player.totals,
        })),
        conditions,
        minMinutes,
      }),
    [players, conditions, minMinutes],
  );

  const summary = buildVennSummary({
    lang,
    cohort: vennCohortFromPositions(positions),
    atLeastOne: assignment.atLeastOne,
    allThree: assignment.allThree,
  });

  const metrics = conditions.map((condition) => condition.metric);

  return (
    <div
      ref={ref}
      data-venn-root="true"
      data-variant={variant}
      data-venn-density={countsOnly ? "counts" : "full"}
      className="w-full max-w-full"
      style={{ background: theme.canvasBg, color: theme.text }}
    >
      <p
        data-venn-summary="true"
        className="mb-3 text-sm font-semibold leading-snug"
        style={{ color: theme.text }}
      >
        {summary}
      </p>

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${VENN_VIEW.w} ${VENN_VIEW.h}`}
          className="block h-auto w-full"
          role="img"
          aria-label={summary}
        >
          {CIRCLE_IDS.map((id) => {
            const circle = VENN_CIRCLES[id];
            return (
              <circle
                key={id}
                cx={circle.cx}
                cy={circle.cy}
                r={circle.r}
                fill={colors[id]}
                fillOpacity={0.22}
                stroke={colors[id]}
                strokeWidth={2.5}
              />
            );
          })}

          {CIRCLE_IDS.map((id, index) => {
            const [line, extra] = splitLabel(phrases[index] ?? "");
            const anchor =
              id === "A" ? "start" : id === "B" ? "end" : "middle";
            const x = id === "A" ? 28 : id === "B" ? 932 : 480;
            const y = id === "C" ? 828 : 34;
            return (
              <text
                key={`label-${id}`}
                data-venn-label={id}
                x={x}
                y={y}
                textAnchor={anchor}
                fill={theme.text}
                fontSize={15}
                fontWeight={700}
              >
                <tspan
                  x={x}
                  dy={0}
                >
                  {line}
                </tspan>
                {extra ? (
                  <tspan x={x} dy={18}>
                    {extra}
                  </tspan>
                ) : null}
                <title>{`${phrases[index]}. ${conditions[index] ? vennMetricAria(conditions[index].metric, conditions[index].threshold, lang) : ""}`}</title>
              </text>
            );
          })}

          {VENN_REGION_IDS.map((region) => {
            const layout = layoutVennRegion(region);
            const group = assignment.regions[region];
            const empty = group.length === 0;
            const label = empty ? copy.vennNobody : String(group.length);
            return (
              <g key={`count-${region}`} data-venn-count={region}>
                <rect
                  x={layout.count.x - VENN_TOKEN_SIZE.count.w / 2}
                  y={layout.count.y - VENN_TOKEN_SIZE.count.h / 2}
                  width={VENN_TOKEN_SIZE.count.w}
                  height={VENN_TOKEN_SIZE.count.h}
                  rx={8}
                  fill={theme.panelBg}
                />
                <text
                  data-venn-empty={empty ? region : undefined}
                  x={layout.count.x}
                  y={layout.count.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={empty ? theme.muted : theme.text}
                  fontSize={empty ? 11 : 13}
                  fontWeight={700}
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>

        {countsOnly ? null : (
          <div className="pointer-events-none absolute inset-0">
            {VENN_REGION_IDS.map((region) => (
              <RegionTokens
                key={region}
                region={region}
                players={assignment.regions[region]}
                metrics={metrics}
                theme={theme}
                lang={lang}
                tipId={tipId}
                openTip={openTip}
                onTip={setOpenTip}
                interactive={variant !== "export"}
              />
            ))}
          </div>
        )}
      </div>

      <p
        data-venn-source="true"
        className="mt-2 text-[11px] font-medium"
        style={{ color: theme.muted }}
      >
        {copy.vennSourceData}
        {gwLabel ? ` · ${gwLabel}` : ""}
        {minMinutes > 0
          ? lang === "pl"
            ? ` · min. ${minMinutes} min`
            : ` · min. ${minMinutes} mins`
          : ""}
      </p>

      <section className="mt-4 space-y-3" data-venn-list="true">
        <h3
          className="text-xs font-black uppercase tracking-wider"
          style={{ color: theme.text }}
        >
          {copy.vennListTitle}
        </h3>
        {VENN_REGION_IDS.map((region) => {
          const group = assignment.regions[region];
          const heading = regionHeading(region, phrases, copy.vennAllThree);
          return (
            <div key={region} id={`venn-region-${region}`} data-venn-region={region}>
              <h4
                className="mb-1 text-[13px] font-bold leading-snug"
                style={{ color: theme.text }}
              >
                <span
                  className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                  style={{
                    background:
                      region === "ABC"
                        ? theme.text
                        : colors[region[0] as VennConditionId],
                  }}
                  aria-hidden
                />
                {heading}
                <span className="ml-2 font-semibold" style={{ color: theme.muted }}>
                  {group.length === 0 ? copy.vennNobody : group.length}
                </span>
              </h4>
              {group.length === 0 ? (
                <p className="text-xs" style={{ color: theme.muted }}>
                  {copy.vennNobody}
                </p>
              ) : (
                <ul className="space-y-1">
                  {group.map((player) => (
                    <li key={player.id}>
                      <PlayerRow
                        player={player}
                        metrics={metrics}
                        theme={theme}
                        lang={lang}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

function RegionTokens({
  region,
  players,
  metrics,
  theme,
  lang,
  tipId,
  openTip,
  onTip,
  interactive,
}: {
  region: VennRegionId;
  players: VennPlaced<VennChartPlayer>[];
  metrics: FplStatKey[];
  theme: StatsLabChartTheme;
  lang: StatsLabLang;
  tipId: string;
  openTip: string | null;
  onTip: (id: string | null) => void;
  interactive: boolean;
}) {
  const copy = t(lang);
  const plan = planVennTokens(region, players.length);
  const size = region === "ABC" ? VENN_TOKEN_SIZE.center : VENN_TOKEN_SIZE.normal;
  const shown = players.slice(0, plan.shown);
  const tipKey = (id: number) => `${region}-${id}`;

  return (
    <>
      {shown.map((player, index) => {
        const slot = plan.slots[index];
        if (!slot) return null;
        const clubFill = getScatterClubColor(player.clubShort, null, theme.accent);
        const aria = [
          player.fullName,
          player.clubName || player.clubShort,
          ...metrics.map((metric, metricIndex) =>
            vennMetricAria(metric, player.values[metricIndex] ?? 0, lang),
          ),
        ]
          .filter(Boolean)
          .join(". ");
        const key = tipKey(player.id);
        const open = openTip === key;
        return (
          <button
            key={player.id}
            type="button"
            data-venn-token={region}
            tabIndex={interactive ? 0 : -1}
            className="pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5"
            style={{
              left: `${(slot.x / VENN_VIEW.w) * 100}%`,
              top: `${(slot.y / VENN_VIEW.h) * 100}%`,
              width: `${(size.w / VENN_VIEW.w) * 100}%`,
              height: `${(size.h / VENN_VIEW.h) * 100}%`,
              background: theme.panelBg,
              color: theme.text,
            }}
            aria-label={aria}
            aria-describedby={open ? tipId : undefined}
            onMouseEnter={() => onTip(key)}
            onMouseLeave={() => onTip(null)}
            onFocus={() => onTip(key)}
            onBlur={() => onTip(null)}
          >
            <ClubMark
              code={player.badgeCode}
              short={player.clubShort}
              fill={clubFill}
            />
            <span className="text-center text-[9px] font-bold leading-none">
              {shortenPlayerLabel(player.name, 8)}
            </span>
            {region === "ABC" ? (
              <span
                className="text-center text-[8px] font-semibold leading-none"
                style={{ color: theme.muted }}
              >
                {vennChipStatLine(metrics, player.values, lang)}
              </span>
            ) : null}
            {open ? (
              <span
                role="tooltip"
                id={tipId}
                className="absolute left-1/2 top-full z-30 mt-1 w-52 -translate-x-1/2 rounded-lg px-2 py-1.5 text-left text-[11px] font-medium leading-snug"
                style={{ background: theme.tooltipBg, color: theme.text }}
              >
                {aria}
              </span>
            ) : null}
          </button>
        );
      })}
      {plan.overflow > 0 && plan.slots[plan.shown] ? (
        <button
          type="button"
          data-venn-plus={region}
          tabIndex={interactive ? 0 : -1}
          className="pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[11px] font-black"
          style={{
            left: `${(plan.slots[plan.shown].x / VENN_VIEW.w) * 100}%`,
            top: `${(plan.slots[plan.shown].y / VENN_VIEW.h) * 100}%`,
            width: `${(size.w / VENN_VIEW.w) * 100}%`,
            height: `${(size.h / VENN_VIEW.h) * 100}%`,
            background: theme.panelBg,
            color: theme.text,
          }}
          aria-label={copy.vennMorePlayers.replace("{n}", String(plan.overflow))}
          onClick={() => {
            document.getElementById(`venn-region-${region}`)?.scrollIntoView({
              block: "nearest",
            });
          }}
        >
          +{plan.overflow}
        </button>
      ) : null}
    </>
  );
}

function PlayerRow({
  player,
  metrics,
  theme,
  lang,
}: {
  player: VennPlaced<VennChartPlayer>;
  metrics: FplStatKey[];
  theme: StatsLabChartTheme;
  lang: StatsLabLang;
}) {
  const clubFill = getScatterClubColor(player.clubShort, null, theme.accent);
  return (
    <div
      className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-1.5"
      style={{ background: theme.panelBg }}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        <ClubMark code={player.badgeCode} short={player.clubShort} fill={clubFill} />
        <span className="text-sm font-bold" style={{ color: theme.text }}>
          {player.fullName}
        </span>
        <span className="text-xs font-semibold" style={{ color: theme.muted }}>
          {player.clubName || player.clubShort}
        </span>
      </span>
      <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        {metrics.map((metric, index) => {
          const detail = vennMetricAria(metric, player.values[index] ?? 0, lang);
          return (
            <span key={metric} title={detail} aria-label={detail} style={{ color: theme.text }}>
              {vennShortStatLine([metric], [player.values[index] ?? 0], lang)}
            </span>
          );
        })}
      </span>
    </div>
  );
}
