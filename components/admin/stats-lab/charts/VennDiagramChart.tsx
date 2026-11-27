"use client";

import { useId, useMemo, useState } from "react";
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
  vennConditionPhrase,
  vennMetricAria,
  vennShortStatLine,
} from "@/lib/stats-lab/i18n";
import { parseCssColorToRgba } from "@/lib/stats-lab/auditExport";
import { fplLabBadgeUrl } from "@/lib/stats-lab/mediaUrls";
import {
  VENN_CIRCLES,
  VENN_REGION_IDS,
  VENN_SELECTION_CAP,
  VENN_VIEW,
  assignPlayersToVennRegions,
  layoutVennRegion,
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
  /** counts = w kołach same liczby; nazwiska zostają w legendzie. */
  density?: "auto" | "full" | "counts";
  /** auto = TOP N, manual = ręczna lista. */
  selectionMode?: "auto" | "manual";
  /** Szkielet zamiast liczb, dopóki pula Venna nie jest policzona. */
  loading?: boolean;
};

const CIRCLE_IDS: VennConditionId[] = ["A", "B", "C"];

const TITLE_ANCHOR: Record<VennConditionId, { x: number; y: number }> = {
  A: { x: 0.18, y: 0.06 },
  B: { x: 0.58, y: 0.06 },
  C: { x: 0.3, y: 0.92 },
};

type LegendGroupId = VennRegionId | "none" | "minutes";

function circleColors(theme: StatsLabChartTheme): Record<VennConditionId, string> {
  return {
    A: theme.id === "SCOUT_DARK" ? "#2dd4bf" : theme.accent,
    B: theme.gold,
    C: METRIC_SEGMENT_COLORS[1],
  };
}

function titleInk(
  id: VennConditionId,
  theme: StatsLabChartTheme,
  fill: string,
): string {
  if (theme.id === "ANALYST_LIGHT") {
    if (id === "A") return "#0f766e";
    if (id === "B") return "#b45309";
    return "#0369a1";
  }
  return fill;
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

function regionMark(id: LegendGroupId, outside: string, minutes: string): string {
  if (id === "none") return outside;
  if (id === "minutes") return minutes;
  if (id === "ABC") return "A+B+C";
  if (id.length === 2) return `${id[0]}+${id[1]}`;
  return id;
}

function regionAccent(
  id: LegendGroupId,
  colors: Record<VennConditionId, string>,
  theme: StatsLabChartTheme,
): string {
  if (id === "none" || id === "minutes") return theme.muted;
  if (id === "ABC") return theme.text;
  if (id === "A" || id === "B" || id === "C") return colors[id];
  return theme.text;
}

/** Pasek każdego koła, które tworzy pole — A, A+B i A+C nie dzielą jednego koloru. */
function regionEdge(
  id: LegendGroupId,
  colors: Record<VennConditionId, string>,
  theme: StatsLabChartTheme,
): string {
  const bar = (ids: VennConditionId[]) =>
    ids
      .map((circleId, index) => `inset ${3 + index * 4}px 0 0 ${colors[circleId]}`)
      .join(", ");
  if (id === "A" || id === "B" || id === "C") return bar([id]);
  if (id === "AB") return bar(["A", "B"]);
  if (id === "AC") return bar(["A", "C"]);
  if (id === "BC") return bar(["B", "C"]);
  if (id === "ABC") return bar(["A", "B", "C"]);
  return `inset 3px 0 0 ${theme.muted}`;
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

function ClubMark({
  code,
  short,
  fill,
  size = 24,
}: {
  code: number;
  short: string;
  fill: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = code > 0 && !failed;
  return (
    <span
      data-venn-badge="true"
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        minWidth: size,
        background: fill,
        boxShadow: `0 0 0 1.5px ${fill}`,
      }}
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
          className="text-[11px] font-black leading-none"
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
  selectionMode = "auto",
  loading = false,
}: Props) {
  const copy = t(lang);
  const tipId = useId();
  const [openTip, setOpenTip] = useState<string | null>(null);
  const roster = useMemo(
    () => players.slice(0, VENN_SELECTION_CAP),
    [players],
  );
  const showChips = !loading && density !== "counts";
  const showLegend = !loading && variant !== "export";
  const isExport = variant === "export";

  const colors = circleColors(theme);
  const phrases = conditions.map((condition) =>
    vennConditionPhrase(condition.metric, condition.threshold, lang),
  ) as [string, string, string];

  const assignment = useMemo(
    () =>
      assignPlayersToVennRegions({
        players: roster.map((player) => ({
          ...player,
          minutes: player.minutes,
          points: player.points,
          totals: player.totals,
        })),
        conditions,
        minMinutes,
      }),
    [roster, conditions, minMinutes],
  );

  const summary = loading
    ? copy.vennCalculating
    : buildVennSummary({
        lang,
        cohort: vennCohortFromPositions(positions),
        atLeastOne: assignment.atLeastOne,
        allThree: assignment.allThree,
      });

  const metrics = conditions.map((condition) => condition.metric);
  const sortCaption =
    selectionMode === "manual" ? copy.vennSelectedPlayers : copy.vennSortedBy;
  const densityAttr = density === "counts" ? "counts" : "full";

  const groups: { id: LegendGroupId; heading: string; players: VennPlaced<VennChartPlayer>[] }[] =
    [];
  for (const region of VENN_REGION_IDS) {
    const group = assignment.regions[region];
    if (!group.length) continue;
    groups.push({
      id: region,
      heading: regionHeading(region, phrases, copy.vennAllThree),
      players: group,
    });
  }
  if (assignment.none.length) {
    groups.push({
      id: "none",
      heading: copy.vennOutside,
      players: assignment.none,
    });
  }
  if (assignment.belowMinutes.length) {
    groups.push({
      id: "minutes",
      heading: copy.vennBelowMinutes,
      players: assignment.belowMinutes,
    });
  }

  return (
    <div
      data-venn-root="true"
      data-variant={variant}
      data-venn-density={densityAttr}
      data-venn-selection={selectionMode}
      data-venn-roster={String(roster.length)}
      className="w-full max-w-full"
      style={{ background: theme.canvasBg, color: theme.text }}
    >
      <p
        data-venn-summary="true"
        className="mb-2 text-sm font-semibold leading-snug"
        style={{ color: theme.text }}
      >
        {summary}
      </p>
      {!loading ? (
        <p
          data-venn-sort="true"
          className="mb-2 text-sm font-semibold leading-snug"
          style={{ color: theme.muted }}
        >
          {sortCaption}
        </p>
      ) : null}

      <p className="mb-2 text-sm font-semibold leading-snug" style={{ color: theme.muted }} data-venn-legend="true">
        {phrases.join(" · ")}
      </p>

      <div className={isExport ? "mx-auto w-full max-w-[360px]" : "w-full"}>
        <div
          className="relative w-full"
          style={{ aspectRatio: `${VENN_VIEW.w} / ${VENN_VIEW.h}` }}
        >
          <svg
            viewBox={`0 0 ${VENN_VIEW.w} ${VENN_VIEW.h}`}
            className="absolute inset-0 h-full w-full"
            role="img"
            aria-label={summary}
            preserveAspectRatio="xMidYMid meet"
          >
            {loading
              ? CIRCLE_IDS.map((id) => {
                  const circle = VENN_CIRCLES[id];
                  return (
                    <circle
                      key={id}
                      cx={circle.cx}
                      cy={circle.cy}
                      r={circle.r}
                      fill={theme.panelBg}
                      stroke={theme.border}
                      strokeWidth={2.5}
                    />
                  );
                })
              : null}
            {!loading
              ? CIRCLE_IDS.map((id) => {
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
                      strokeWidth={3}
                    />
                  );
                })
              : null}

            {!loading
              ? VENN_REGION_IDS.map((region) => {
                  const layout = layoutVennRegion(region);
                  const group = assignment.regions[region];
                  const empty = group.length === 0;
                  const label = empty ? copy.vennNobody : String(group.length);
                  return (
                    <g key={`count-${region}`} data-venn-count={region}>
                      <rect
                        x={layout.count.x - 34}
                        y={layout.count.y - 14}
                        width={68}
                        height={28}
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
                        fontSize={empty ? 12 : 16}
                        fontWeight={700}
                      >
                        {label}
                      </text>
                    </g>
                  );
                })
              : null}
          </svg>

          {!loading
            ? CIRCLE_IDS.map((id, index) => {
                const ink = titleInk(id, theme, colors[id]);
                const anchor = TITLE_ANCHOR[id];
                return (
                  <p
                    key={`label-${id}`}
                    data-venn-label={id}
                    data-near-circle={id}
                    className="absolute m-0 max-w-[42%] text-sm font-bold leading-snug"
                    style={{
                      left: `${anchor.x * 100}%`,
                      top: `${anchor.y * 100}%`,
                      color: ink,
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    <span
                      aria-hidden
                      className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle"
                      style={{ background: ink }}
                    />
                    {phrases[index]}
                  </p>
                );
              })
            : null}
        </div>
      </div>

      {showChips ? (
        <div className="mt-3 space-y-2" data-venn-chips="true">
          {groups.map((group) => {
            const mark = regionMark(group.id, copy.vennRegionOut, copy.vennRegionMins);
            const accent = regionAccent(group.id, colors, theme);
            return (
              <div key={group.id} data-venn-chip-region={group.id}>
                <h4
                  data-venn-region-heading={group.id}
                  className="mb-1 text-sm font-bold leading-snug"
                  style={{ color: accent }}
                >
                  {mark}
                  <span className="font-semibold" style={{ color: theme.muted }}>
                    {" "}
                    · {group.heading}
                  </span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {group.players.map((player) => (
                    <PlayerChip
                      key={`${group.id}-${player.id}`}
                      player={player}
                      region={group.id}
                      mark={mark}
                      metrics={metrics}
                      theme={theme}
                      lang={lang}
                      edge={regionEdge(group.id, colors, theme)}
                      tipId={tipId}
                      open={openTip === `${group.id}-${player.id}`}
                      onTip={setOpenTip}
                      interactive={!isExport}
                      compact={isExport}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {showLegend ? (
        <section className="mt-3 space-y-2" data-venn-legend-list="true">
          <h3 className="text-sm font-bold" style={{ color: theme.text }}>
            {copy.vennLegendTitle}
          </h3>
          {groups.length === 0 ? (
            <p className="text-sm" style={{ color: theme.muted }}>
              {copy.vennNobody}
            </p>
          ) : (
            groups.map((group) => {
              const dot = regionAccent(group.id, colors, theme);
              const mark = regionMark(group.id, copy.vennRegionOut, copy.vennRegionMins);
              return (
                <div key={group.id} data-venn-legend-region={group.id}>
                  <h4
                    className="mb-1 text-sm font-bold leading-snug"
                    style={{ color: dot }}
                  >
                    <span
                      className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle"
                      style={{ background: dot }}
                      aria-hidden
                    />
                    {mark}
                    <span className="font-semibold" style={{ color: theme.muted }}>
                      {" "}
                      · {group.heading}
                    </span>
                  </h4>
                  <ul className="flex flex-col gap-1">
                    {group.players.map((player) => (
                      <PlayerLegendRow
                        key={player.id}
                        player={player}
                        metrics={metrics}
                        theme={theme}
                        lang={lang}
                      />
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </section>
      ) : null}

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
    </div>
  );
}

function PlayerChip({
  player,
  region,
  mark,
  metrics,
  theme,
  lang,
  edge,
  tipId,
  open,
  onTip,
  interactive,
  compact,
}: {
  player: VennPlaced<VennChartPlayer>;
  region: LegendGroupId;
  mark: string;
  metrics: FplStatKey[];
  theme: StatsLabChartTheme;
  lang: StatsLabLang;
  edge: string;
  tipId: string;
  open: boolean;
  onTip: (id: string | null) => void;
  interactive: boolean;
  compact: boolean;
}) {
  const clubFill = getScatterClubColor(player.clubShort, null, theme.accent);
  const values = vennShortStatLine(metrics, player.values, lang);
  const aria = [
    player.fullName || player.name,
    player.clubName || player.clubShort,
    mark,
    ...metrics.map((metric, metricIndex) =>
      vennMetricAria(metric, player.values[metricIndex] ?? 0, lang),
    ),
  ]
    .filter(Boolean)
    .join(". ");
  const key = `${region}-${player.id}`;
  return (
    <button
      type="button"
      data-venn-token={region}
      data-venn-chip="true"
      tabIndex={interactive ? 0 : -1}
      className="relative inline-flex max-w-full items-center rounded-lg px-1.5 text-left"
      style={{
        minHeight: compact ? 36 : 44,
        gap: 6,
        background: theme.panelBg,
        color: theme.text,
        fontSize: 14,
        fontWeight: 600,
        boxShadow: edge,
      }}
      aria-label={aria}
      title={player.fullName || player.name}
      aria-describedby={open ? tipId : undefined}
      onMouseEnter={() => onTip(key)}
      onMouseLeave={() => onTip(null)}
      onFocus={() => onTip(key)}
      onBlur={() => onTip(null)}
    >
      <ClubMark code={player.badgeCode} short={player.clubShort} fill={clubFill} size={24} />
      <span
        data-venn-region-code={region}
        className="shrink-0 text-[11px] font-black leading-none"
        style={{ color: theme.text }}
      >
        {mark}
      </span>
      <span className="min-w-0 whitespace-normal break-words" style={{ fontWeight: 600, lineHeight: 1.15 }}>
        {compact ? (
          <span style={{ fontSize: 13 }}>
            {player.name}
            <span style={{ color: theme.muted, fontWeight: 600 }}> · {values}</span>
          </span>
        ) : (
          <>
            <span className="block" style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.15 }}>
              {player.name}
            </span>
            <span
              className="block"
              style={{ color: theme.muted, fontSize: 11, fontWeight: 600, lineHeight: 1.2 }}
            >
              {values}
            </span>
          </>
        )}
      </span>
      {open ? (
        <span
          role="tooltip"
          id={tipId}
          className="absolute z-30 mt-1 w-52 rounded-lg px-2 py-1.5 text-left text-[11px] font-medium leading-snug"
          style={{ background: theme.tooltipBg, color: theme.text }}
        >
          {aria}
        </span>
      ) : null}
    </button>
  );
}

function PlayerLegendRow({
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
    <li
      className="flex max-w-full flex-wrap items-center gap-2 rounded-lg px-2 py-1"
      style={{ background: theme.panelBg, minHeight: 44 }}
      title={player.fullName || player.name}
      data-venn-legend-player="true"
    >
      <ClubMark code={player.badgeCode} short={player.clubShort} fill={clubFill} size={24} />
      <span
        className="whitespace-normal break-words text-sm font-semibold"
        style={{ color: theme.text, fontWeight: 600 }}
      >
        {player.name}
      </span>
      <span className="text-xs font-semibold" style={{ color: theme.muted }}>
        {player.clubShort}
      </span>
      <span className="whitespace-normal break-words text-xs" style={{ color: theme.text }}>
        {vennShortStatLine(metrics, player.values, lang)}
      </span>
    </li>
  );
}
