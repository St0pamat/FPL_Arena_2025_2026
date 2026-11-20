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
  vennConditionPhrase,
  vennMetricAria,
  vennShortStatLine,
} from "@/lib/stats-lab/i18n";
import { parseCssColorToRgba } from "@/lib/stats-lab/auditExport";
import { fplLabBadgeUrl } from "@/lib/stats-lab/mediaUrls";
import {
  VENN_CIRCLES,
  VENN_PLAYERS_PER_AREA,
  VENN_REGION_IDS,
  VENN_VIEW,
  VENN_VISUAL_CAP,
  assignPlayersToVennRegions,
  layoutVennRegion,
  shortenPlayerLabel,
  vennChipBudget,
  type VennCondition,
  type VennConditionId,
  type VennPlaced,
  type VennPlayersPerArea,
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
  playersPerArea?: VennPlayersPerArea;
  onPlayersPerAreaChange?: (value: VennPlayersPerArea) => void;
  includePlayerList?: boolean;
  onIncludePlayerListChange?: (value: boolean) => void;
  /** Szkielet zamiast liczb, dopóki pula Venna nie jest policzona. */
  loading?: boolean;
};

const CIRCLE_IDS: VennConditionId[] = ["A", "B", "C"];

/** Środek stosu chipów w udziale widoku — w polu, z dala od obwodu. */
const STACK_ANCHOR: Record<VennRegionId, { x: number; y: number }> = {
  A: { x: 0.2, y: 0.32 },
  B: { x: 0.8, y: 0.32 },
  C: { x: 0.5, y: 0.7 },
  AB: { x: 0.5, y: 0.2 },
  AC: { x: 0.33, y: 0.48 },
  BC: { x: 0.67, y: 0.48 },
  ABC: { x: 0.5, y: 0.44 },
};

const TITLE_ANCHOR: Record<VennConditionId, { x: number; y: number }> = {
  A: { x: 0.18, y: 0.06 },
  B: { x: 0.58, y: 0.06 },
  C: { x: 0.3, y: 0.92 },
};

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

function regionCode(region: VennRegionId, lang: StatsLabLang): string {
  if (region === "ABC") return "A + B + C";
  if (region.length === 2) return region.split("").join(" + ");
  return lang === "pl" ? `Tylko ${region}` : `Only ${region}`;
}

function useChartWidth(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!active) {
      setWidth(0);
      return;
    }
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [active]);
  return { ref, width };
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
  playersPerArea,
  onPlayersPerAreaChange,
  includePlayerList = false,
  onIncludePlayerListChange,
  loading = false,
}: Props) {
  const copy = t(lang);
  const tipId = useId();
  const [openTip, setOpenTip] = useState<string | null>(null);
  const [area, setArea] = useState<VennPlayersPerArea>(playersPerArea ?? 5);
  const measure = density === "auto" && variant !== "export";
  const { ref, width } = useChartWidth(measure);
  const narrow = measure && width > 0 && width < 640;
  const listLayout = narrow;
  const countsOnly = density === "counts" || listLayout;
  const perArea = playersPerArea ?? area;

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

  const summary = loading
    ? copy.vennCalculating
    : buildVennSummary({
        lang,
        cohort: vennCohortFromPositions(positions),
        atLeastOne: assignment.atLeastOne,
        allThree: assignment.allThree,
      });

  const metrics = conditions.map((condition) => condition.metric);
  const showList = variant !== "export" || includePlayerList;
  const densityAttr = listLayout ? "list" : countsOnly ? "counts" : "full";

  function chooseArea(next: VennPlayersPerArea) {
    setArea(next);
    onPlayersPerAreaChange?.(next);
  }

  return (
    <div
      ref={ref}
      data-venn-root="true"
      data-variant={variant}
      data-venn-density={densityAttr}
      data-venn-players-per-area={String(perArea)}
      data-venn-include-list={includePlayerList ? "true" : "false"}
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

      {variant !== "export" ? (
        <div
          data-venn-controls="true"
          className="mb-3 flex flex-wrap items-center gap-2"
        >
          <span className="text-sm font-semibold" style={{ color: theme.text }}>
            {copy.vennPlayersPerArea}:
          </span>
          {VENN_PLAYERS_PER_AREA.map((count) => (
            <button
              key={count}
              type="button"
              aria-pressed={perArea === count}
              onClick={() => chooseArea(count)}
              className="min-h-11 min-w-11 rounded-lg px-3 text-sm font-semibold"
              style={{
                background: perArea === count ? theme.accent : theme.panelBg,
                color:
                  perArea === count ? inkForFill(theme.accent) : theme.text,
              }}
            >
              {count}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={perArea === "all"}
            onClick={() => chooseArea("all")}
            className="min-h-11 rounded-lg px-3 text-sm font-semibold"
            style={{
              background: perArea === "all" ? theme.accent : theme.panelBg,
              color: perArea === "all" ? inkForFill(theme.accent) : theme.text,
            }}
          >
            {copy.vennPlayersAll}
          </button>
          <label className="ml-1 inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={includePlayerList}
              onChange={(event) =>
                onIncludePlayerListChange?.(event.target.checked)
              }
            />
            {copy.vennIncludeList}
          </label>
        </div>
      ) : null}

      <p className="mb-2 text-sm font-semibold" style={{ color: theme.muted }} data-venn-legend="true">
        {copy.vennLegend}
      </p>

      <div className={`relative w-full ${listLayout ? "mx-auto max-w-[220px]" : ""}`}>
        <svg
          viewBox={`0 0 ${VENN_VIEW.w} ${VENN_VIEW.h}`}
          className={`block h-auto w-full ${
            listLayout
              ? "max-h-40"
              : variant === "export"
                ? "min-h-[720px]"
                : "min-h-[520px]"
          }`}
          role="img"
          aria-label={summary}
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

        {!loading && !countsOnly
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

        {!loading && !countsOnly ? (
          <div className="pointer-events-none absolute inset-0">
            {VENN_REGION_IDS.map((region) => (
              <RegionStack
                key={region}
                region={region}
                players={assignment.regions[region]}
                perArea={perArea}
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
        ) : null}
      </div>

      {!loading ? (
        <section
          data-venn-center-card="true"
          className="mt-3 rounded-xl px-3 py-2"
          style={{ background: theme.panelBg, color: theme.text }}
        >
          <h3 className="text-sm font-bold" style={{ color: colors.A }}>
            <span
              aria-hidden
              className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle"
              style={{ background: theme.text }}
            />
            {copy.vennMeetsAll}
            <span className="ml-2 font-semibold" style={{ color: theme.muted }}>
              {assignment.regions.ABC.length === 0
                ? copy.vennNobody
                : assignment.regions.ABC.length}
            </span>
          </h3>
          {assignment.regions.ABC.length === 0 ? null : (
            <ul className="mt-1 space-y-1">
              {assignment.regions.ABC.slice(
                0,
                vennChipBudget(
                  assignment.regions.ABC.length,
                  perArea,
                  VENN_VISUAL_CAP.ABC,
                ).shown,
              ).map((player) => (
                <li
                  key={player.id}
                  className="text-sm font-semibold leading-none"
                  style={{ fontSize: 13, fontWeight: 600 }}
                  title={player.fullName}
                >
                  {player.name}
                  <span className="ml-2 font-semibold" style={{ color: theme.muted }}>
                    {vennShortStatLine(metrics, player.values, lang)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <p className="mt-3 text-sm font-semibold" style={{ color: theme.muted }}>
          {copy.vennCalculating}
        </p>
      )}

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

      {showList ? (
        <section className="mt-4 space-y-3" data-venn-list="true">
          <h3
            className="text-xs font-black uppercase tracking-wider"
            style={{ color: theme.text }}
          >
            {copy.vennListTitle}
          </h3>
          {VENN_REGION_IDS.map((region) => {
            const group = assignment.regions[region];
            const heading = listLayout
              ? `${regionCode(region, lang)} · ${group.length === 0 ? copy.vennNobody : group.length}`
              : regionHeading(region, phrases, copy.vennAllThree);
            const dot =
              region === "ABC" ? theme.text : colors[region[0] as VennConditionId];
            return (
              <div key={region} id={`venn-region-${region}`} data-venn-region={region}>
                <h4
                  className="mb-1 text-sm font-bold leading-snug"
                  style={{ color: titleInk(region[0] as VennConditionId, theme, dot) }}
                >
                  <span
                    className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle"
                    style={{ background: dot }}
                    aria-hidden
                  />
                  {heading}
                  {listLayout ? null : (
                    <span className="ml-2 font-semibold" style={{ color: theme.muted }}>
                      {group.length === 0 ? copy.vennNobody : group.length}
                    </span>
                  )}
                </h4>
                {group.length === 0 ? (
                  <p className="text-sm" style={{ color: theme.muted }}>
                    {copy.vennNobody}
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
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
      ) : null}
    </div>
  );
}

function RegionStack({
  region,
  players,
  perArea,
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
  perArea: VennPlayersPerArea;
  metrics: FplStatKey[];
  theme: StatsLabChartTheme;
  lang: StatsLabLang;
  tipId: string;
  openTip: string | null;
  onTip: (id: string | null) => void;
  interactive: boolean;
}) {
  const copy = t(lang);
  const budget = vennChipBudget(players.length, perArea, VENN_VISUAL_CAP[region]);
  const shown = players.slice(0, budget.shown);
  const anchor = STACK_ANCHOR[region];
  const tipKey = (id: number) => `${region}-${id}`;

  return (
    <>
      {shown.map((player, index) => {
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
            data-venn-chip="true"
            tabIndex={interactive ? 0 : -1}
            className="pointer-events-auto absolute flex -translate-x-1/2 items-center rounded-lg px-1.5"
            style={{
              left: `${anchor.x * 100}%`,
              top: `calc(${anchor.y * 100}% + ${index * 38}px)`,
              minHeight: 32,
              gap: 6,
              background: theme.panelBg,
              color: theme.text,
              fontSize: 14,
              fontWeight: 600,
              zIndex: 2,
            }}
            aria-label={aria}
            title={player.fullName}
            aria-describedby={open ? tipId : undefined}
            onMouseEnter={() => onTip(key)}
            onMouseLeave={() => onTip(null)}
            onFocus={() => onTip(key)}
            onBlur={() => onTip(null)}
          >
            <ClubMark code={player.badgeCode} short={player.clubShort} fill={clubFill} size={24} />
            <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.1 }}>
              {shortenPlayerLabel(player.name, 14)}
            </span>
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
      {budget.overflow > 0 ? (
        <button
          type="button"
          data-venn-plus={region}
          tabIndex={interactive ? 0 : -1}
          className="pointer-events-auto absolute flex -translate-x-1/2 items-center justify-center rounded-full px-2 text-xs font-black"
          style={{
            left: `${anchor.x * 100}%`,
            top: `calc(${anchor.y * 100}% + ${shown.length * 38}px)`,
            minHeight: 32,
            background: theme.panelBg,
            color: theme.muted,
          }}
          aria-label={copy.vennMorePlayers.replace("{n}", String(budget.overflow))}
          onClick={() => {
            document.getElementById(`venn-region-${region}`)?.scrollIntoView({
              block: "nearest",
            });
          }}
        >
          {copy.vennMorePlayers.replace("{n}", String(budget.overflow))}
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
      className="flex min-h-11 items-center gap-2 rounded-lg px-2 py-1.5"
      style={{ background: theme.panelBg }}
      title={player.fullName}
    >
      <ClubMark code={player.badgeCode} short={player.clubShort} fill={clubFill} size={24} />
      <span className="text-sm font-semibold" style={{ color: theme.text, fontWeight: 600 }}>
        {player.name}
      </span>
      <span className="text-xs font-semibold" style={{ color: theme.muted }}>
        {player.clubShort}
      </span>
      <span className="text-xs" style={{ color: theme.text }}>
        {metrics.map((metric, index) => {
          const detail = vennMetricAria(metric, player.values[index] ?? 0, lang);
          return (
            <span key={metric} title={detail} aria-label={detail} className="mr-2">
              {vennShortStatLine([metric], [player.values[index] ?? 0], lang)}
            </span>
          );
        })}
      </span>
    </div>
  );
}
