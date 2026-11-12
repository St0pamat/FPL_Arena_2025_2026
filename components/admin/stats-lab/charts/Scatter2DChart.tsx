"use client";

import { useMemo, useState } from "react";
import type { PlottedStatsLabPlayer } from "@/lib/stats-lab/analyticsEngine";
import type { FplStatKey } from "@/lib/stats-lab/types";
import { getFplStatDefinition as getStatDefinition } from "@/lib/stats-lab/types";
import type { StatsLabLang, StatsLabScaleMode } from "@/lib/stats-lab/i18n";
import { statLabel, statShort } from "@/lib/stats-lab/i18n";
import { fplLabBadgeUrl, fplLabPlayerPhotoUrl } from "@/lib/stats-lab/mediaUrls";
import {
  computeScatterAxisConfig,
  formatMetricDisplayValue,
  getScatterClubColor,
  resolveScatterSmartLabels,
  type ScatterSmartLabelInput,
  type StatsLabChartTheme,
} from "@/components/admin/stats-lab/chartTheme";

type Props = {
  players: PlottedStatsLabPlayer[];
  axisX: FplStatKey;
  axisY: FplStatKey;
  poolAverages: Record<FplStatKey, number>;
  theme: StatsLabChartTheme;
  lang: StatsLabLang;
  spotlightId: number | null;
  showAvg: boolean;
  showMeta: boolean;
  onSelectPlayer: (id: number) => void;
  scaleMode?: StatsLabScaleMode;
  per90?: boolean;
  poolSize?: number;
};

const W = 1000;
const H = 560;
/** Tytuły osi są w HTML nad/pod SVG — mniejszy PAD pionowy. */
const PAD = { t: 20, r: 54, b: 36, l: 78 } as const;
/** Bufor między ramką / odznakami ćwiartek a kropkami + siatką. */
const DATA_INSET_X = 44;
const DATA_INSET_Y = 44;
const MICRO_SEP_PX = 6;
const MICRO_RADIUS = 6.5;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function shortDisplayName(name: string): string {
  if (name.length <= 14) return name;
  return `${name.slice(0, 13)}…`;
}

type PlotPoint = {
  player: PlottedStatsLabPlayer;
  valX: number;
  valY: number;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  rankIndex: number;
  isSpot: boolean;
  isExtremeLeader: boolean;
  priority: number;
  fill: string;
  metaText: string | undefined;
};

export function Scatter2DChart({
  players,
  axisX,
  axisY,
  poolAverages,
  theme,
  lang,
  spotlightId,
  showAvg,
  showMeta,
  onSelectPlayer,
  scaleMode = "RAW",
  per90 = false,
  poolSize = 0,
}: Props) {
  void poolSize;
  const [hoverId, setHoverId] = useState<number | null>(null);

  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  const shortX = statShort(axisX, lang);
  const shortY = statShort(axisY, lang);
  const labelX = statLabel(axisX, lang);
  const labelY = statLabel(axisY, lang);

  const chartValues = useMemo(() => {
    return players.map((p) => {
      if (scaleMode === "PERCENTILE") {
        return {
          player: p,
          valX: p.percentiles[axisX] ?? 0,
          valY: p.percentiles[axisY] ?? 0,
        };
      }
      return {
        player: p,
        valX: p.displayValues[axisX] ?? 0,
        valY: p.displayValues[axisY] ?? 0,
      };
    });
  }, [players, axisX, axisY, scaleMode]);

  const axisConfigX = useMemo(
    () =>
      computeScatterAxisConfig({
        statKey: axisX,
        values: chartValues.map((c) => c.valX),
        avgValue: poolAverages[axisX] ?? 0,
        showAvg,
        scaleMode,
        per90,
      }),
    [axisX, chartValues, poolAverages, showAvg, scaleMode, per90],
  );

  const axisConfigY = useMemo(
    () =>
      computeScatterAxisConfig({
        statKey: axisY,
        values: chartValues.map((c) => c.valY),
        avgValue: poolAverages[axisY] ?? 0,
        showAvg,
        scaleMode,
        per90,
      }),
    [axisY, chartValues, poolAverages, showAvg, scaleMode, per90],
  );

  const innerLeft = PAD.l + DATA_INSET_X;
  const innerRight = PAD.l + plotW - DATA_INSET_X;
  const innerTop = PAD.t + DATA_INSET_Y;
  const innerBottom = PAD.t + plotH - DATA_INSET_Y;
  const innerW = innerRight - innerLeft;
  const innerH = innerBottom - innerTop;

  const sx = (v: number) => innerLeft + axisConfigX.project(v) * innerW;
  const sy = (v: number) =>
    innerTop + (1 - axisConfigY.project(v)) * innerH;

  // Dopisek kierunku: RAW + invertScale (z definicji / axisConfig)
  const showInvertX =
    scaleMode === "RAW" &&
    (axisConfigX.inverted || Boolean(getStatDefinition(axisX)?.invertScale));
  const showInvertY =
    scaleMode === "RAW" &&
    (axisConfigY.inverted || Boolean(getStatDefinition(axisY)?.invertScale));

  const splitX = showAvg
    ? sx(axisConfigX.avg)
    : PAD.l + plotW / 2;
  const splitY = showAvg
    ? sy(axisConfigY.avg)
    : PAD.t + plotH / 2;

  const quadrantBadges = useMemo(() => {
    const bh = 24;
    const inset = 8;
    const make = (key: string, text: string, corner: "ne" | "nw" | "se" | "sw") => {
      const w = Math.max(118, text.length * 7.2 + 20);
      const x =
        corner === "ne" || corner === "se"
          ? PAD.l + plotW - inset - w
          : PAD.l + inset;
      const y =
        corner === "ne" || corner === "nw"
          ? PAD.t + inset
          : PAD.t + plotH - inset - bh;
      return { key, x, y, w, h: bh, text };
    };
    return [
      make(
        "ne",
        lang === "pl"
          ? `↗ CZOŁÓWKA: ${shortX} + ${shortY}`
          : `↗ ELITE: ${shortX} + ${shortY}`,
        "ne",
      ),
      make(
        "nw",
        lang === "pl" ? `↖ DOBRY: ${shortY}` : `↖ STRONG: ${shortY}`,
        "nw",
      ),
      make(
        "se",
        lang === "pl" ? `↘ DOBRY: ${shortX}` : `↘ STRONG: ${shortX}`,
        "se",
      ),
      make(
        "sw",
        lang === "pl" ? "↙ PONIŻEJ ŚR." : "↙ BELOW AVG",
        "sw",
      ),
    ];
  }, [lang, shortX, shortY, plotW, plotH]);

  const reservedBoxes = useMemo(
    () =>
      quadrantBadges.map((b) => ({
        x: b.x,
        y: b.y,
        w: b.w,
        h: b.h,
      })),
    [quadrantBadges],
  );

  const plotPoints = useMemo(() => {
    const xLo = innerLeft + 4;
    const xHi = innerRight - 4;
    const yLo = innerTop + 4;
    const yHi = innerBottom - 4;

    const bases = chartValues.map((c, rankIndex) => {
      const baseX = sx(c.valX);
      const baseY = sy(c.valY);
      return {
        player: c.player,
        valX: c.valX,
        valY: c.valY,
        baseX,
        baseY,
        rankIndex,
        isSpot: c.player.fpl_element_id === spotlightId,
        fill: getScatterClubColor(
          c.player.club?.short_name,
          c.player.club?.primary_color,
          theme.accent,
        ),
        metaText: showMeta
          ? `£${(c.player.rawValues.now_cost / 10).toFixed(1)}m · ${c.player.rawValues.selected_by_percent.toFixed(0)}%`
          : undefined,
      };
    });

    // Mikro-separacja niemal identycznych punktów
    const adjusted = bases.map((b) => ({ x: b.baseX, y: b.baseY }));
    const used = new Set<number>();
    for (let i = 0; i < bases.length; i++) {
      if (used.has(i)) continue;
      const cluster = [i];
      for (let j = i + 1; j < bases.length; j++) {
        if (used.has(j)) continue;
        const dx = bases[j].baseX - bases[i].baseX;
        const dy = bases[j].baseY - bases[i].baseY;
        if (Math.hypot(dx, dy) < MICRO_SEP_PX) cluster.push(j);
      }
      if (cluster.length < 2) {
        used.add(i);
        continue;
      }
      cluster.sort((a, b) => bases[a].player.fpl_element_id - bases[b].player.fpl_element_id);
      const cx =
        cluster.reduce((s, idx) => s + bases[idx].baseX, 0) / cluster.length;
      const cy =
        cluster.reduce((s, idx) => s + bases[idx].baseY, 0) / cluster.length;
      cluster.forEach((idx, k) => {
        used.add(idx);
        const angle = (2 * Math.PI * k) / cluster.length - Math.PI / 2;
        adjusted[idx] = {
          x: clamp(cx + MICRO_RADIUS * Math.cos(angle), xLo, xHi),
          y: clamp(cy + MICRO_RADIUS * Math.sin(angle), yLo, yHi),
        };
      });
    }

    let bestXId = bases[0]?.player.fpl_element_id ?? -1;
    let bestYId = bases[0]?.player.fpl_element_id ?? -1;
    let bestCId = bases[0]?.player.fpl_element_id ?? -1;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxC = -Infinity;
    for (let i = 0; i < bases.length; i++) {
      const { x, y } = adjusted[i];
      const c = bases[i].player.compositeScore;
      if (x > maxX) {
        maxX = x;
        bestXId = bases[i].player.fpl_element_id;
      }
      if (y < minY) {
        minY = y;
        bestYId = bases[i].player.fpl_element_id;
      }
      if (c > maxC) {
        maxC = c;
        bestCId = bases[i].player.fpl_element_id;
      }
    }

    const points: PlotPoint[] = bases.map((b, i) => {
      const isExtremeLeader =
        b.player.fpl_element_id === bestXId ||
        b.player.fpl_element_id === bestYId ||
        b.player.fpl_element_id === bestCId;
      let priority: number;
      if (b.isSpot) priority = 10000;
      else if (isExtremeLeader) priority = 600 - b.rankIndex * 10;
      else priority = 300 - b.rankIndex * 10;

      return {
        ...b,
        x: adjusted[i].x,
        y: adjusted[i].y,
        isExtremeLeader,
        priority,
      };
    });

    return points;
    // sx/sy close over axis configs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    chartValues,
    axisConfigX,
    axisConfigY,
    spotlightId,
    theme.accent,
    showMeta,
    plotW,
    plotH,
    innerLeft,
    innerRight,
    innerTop,
    innerBottom,
  ]);

  const placements = useMemo(() => {
    const inputs: ScatterSmartLabelInput[] = plotPoints.map((pt) => ({
      id: pt.player.fpl_element_id,
      x: pt.x,
      y: pt.y,
      name: shortDisplayName(pt.player.web_name),
      metaText: pt.metaText,
      priority: pt.priority,
      dotRadius: pt.isSpot ? 13 : 9.5,
    }));
    return resolveScatterSmartLabels(
      inputs,
      {
        left: PAD.l + 6,
        top: PAD.t + 6,
        right: PAD.l + plotW - 6,
        bottom: PAD.t + plotH - 6,
      },
      reservedBoxes,
    );
  }, [plotPoints, reservedBoxes, plotW, plotH]);

  const renderOrder = useMemo(() => {
    return [...plotPoints].sort((a, b) => {
      if (a.isSpot === b.isSpot) return a.rankIndex - b.rankIndex;
      return a.isSpot ? 1 : -1;
    });
  }, [plotPoints]);

  const hovered =
    players.find((p) => p.fpl_element_id === hoverId) ?? null;

  const avgLabelX =
    scaleMode === "PERCENTILE"
      ? "P50"
      : formatMetricDisplayValue(axisX, poolAverages[axisX] ?? 0, per90);
  const avgLabelY =
    scaleMode === "PERCENTILE"
      ? "P50"
      : formatMetricDisplayValue(axisY, poolAverages[axisY] ?? 0, per90);

  const axisTitleX = `(${shortX}) ${labelX}${
    showInvertX
      ? lang === "pl"
        ? " — mniej = lepiej →"
        : " — lower = better →"
      : " →"
  }`;
  const axisTitleY = `↑ (${shortY}) ${labelY}${
    showInvertY
      ? lang === "pl"
        ? " — mniej = lepiej"
        : " — lower = better"
      : ""
  }`;

  const lightTheme = theme.id === "ANALYST_LIGHT";

  return (
    <div className="relative">
      {/* Tytuł osi Y + legenda średniej — HTML (zero SVG ↑ overflow) */}
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 px-2">
        <p
          className="text-[13.5px] font-extrabold"
          style={{ color: theme.text }}
        >
          {axisTitleY}
        </p>
        {showAvg ? (
          <span
            className="text-[11.5px] font-semibold"
            style={{ color: theme.muted }}
          >
            {lang === "pl"
              ? `Linie przerywane = Średnia grupy (${shortX}: ${avgLabelX} · ${shortY}: ${avgLabelY})`
              : `Dashed lines = Group average (${shortX}: ${avgLabelX} · ${shortY}: ${avgLabelY})`}
          </span>
        ) : null}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        {/* Tło ćwiartek */}
        <rect
          x={splitX}
          y={PAD.t}
          width={Math.max(0, PAD.l + plotW - splitX)}
          height={Math.max(0, splitY - PAD.t)}
          fill="#10b981"
          fillOpacity={lightTheme ? 0.05 : 0.04}
        />
        <rect
          x={PAD.l}
          y={splitY}
          width={Math.max(0, splitX - PAD.l)}
          height={Math.max(0, PAD.t + plotH - splitY)}
          fill="#f43f5e"
          fillOpacity={0.025}
        />

        {/* Siatka — pozycje = sx/sy(tick.value), zgodne z kropkami */}
        {axisConfigX.ticks.map((t, i) => {
          const x = sx(t.value);
          return (
            <line
              key={`gx-${i}`}
              x1={x}
              y1={PAD.t}
              x2={x}
              y2={PAD.t + plotH}
              stroke={theme.grid}
              strokeOpacity={0.55}
            />
          );
        })}
        {axisConfigY.ticks.map((t, i) => {
          const y = sy(t.value);
          return (
            <line
              key={`gy-${i}`}
              x1={PAD.l}
              y1={y}
              x2={PAD.l + plotW}
              y2={y}
              stroke={theme.grid}
              strokeOpacity={0.55}
            />
          );
        })}

        <rect
          x={PAD.l}
          y={PAD.t}
          width={plotW}
          height={plotH}
          fill="transparent"
          stroke={theme.grid}
          strokeWidth={1.25}
        />

        {showAvg ? (
          <>
            <line
              x1={splitX}
              y1={PAD.t}
              x2={splitX}
              y2={PAD.t + plotH}
              stroke={theme.avgLine}
              strokeDasharray="5 4"
              strokeWidth={1.35}
            />
            <line
              x1={PAD.l}
              y1={splitY}
              x2={PAD.l + plotW}
              y2={splitY}
              stroke={theme.avgLine}
              strokeDasharray="5 4"
              strokeWidth={1.35}
            />
          </>
        ) : null}

        {/* Ticki X */}
        {axisConfigX.ticks.map((t, i) => (
          <text
            key={`tx-${i}`}
            x={sx(t.value)}
            y={PAD.t + plotH + 22}
            textAnchor="middle"
            fill={theme.muted}
            fontSize={12.5}
            fontWeight={700}
          >
            {t.label}
          </text>
        ))}

        {/* Ticki Y */}
        {axisConfigY.ticks.map((t, i) => (
          <text
            key={`ty-${i}`}
            x={PAD.l - 10}
            y={sy(t.value) + 4}
            textAnchor="end"
            fill={theme.muted}
            fontSize={12.5}
            fontWeight={700}
          >
            {t.label}
          </text>
        ))}

        {/* Narożne odznaki ćwiartek */}
        {quadrantBadges.map((b) => (
          <g key={b.key}>
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx={5}
              fill={theme.canvasBg}
              fillOpacity={0.82}
              stroke={theme.border}
              strokeWidth={1}
            />
            <text
              x={b.x + 8}
              y={b.y + 16}
              fill={theme.muted}
              fontSize={10.5}
              fontWeight={800}
            >
              {b.text}
            </text>
          </g>
        ))}

        {/* Punkty + etykiety (Spotlight na wierzchu) */}
        {renderOrder.map((pt) => {
          const id = pt.player.fpl_element_id;
          const place = placements.get(id);
          const showLabel = place?.showLabel === true;
          const boxH = showMeta ? 48 : 30;
          const displayName = shortDisplayName(pt.player.web_name);
          const clubColor = pt.fill;

          return (
            <g
              key={id}
              onMouseEnter={() => setHoverId(id)}
              onMouseLeave={() => setHoverId(null)}
              onClick={() => onSelectPlayer(id)}
              style={{ cursor: "pointer" }}
            >
              {showLabel && place ? (
                <>
                  <line
                    x1={pt.x}
                    y1={pt.y}
                    x2={place.anchorX}
                    y2={place.anchorY}
                    stroke={theme.muted}
                    strokeWidth={1}
                    opacity={0.55}
                  />
                  <rect
                    x={place.boxX}
                    y={place.boxY}
                    width={place.boxW}
                    height={boxH}
                    rx={6}
                    fill={theme.canvasBg}
                    fillOpacity={0.94}
                    stroke={pt.isSpot ? theme.gold : clubColor}
                    strokeWidth={pt.isSpot ? 2 : 1.5}
                  />
                  <rect
                    x={place.boxX + 3}
                    y={place.boxY + 4}
                    width={4}
                    height={boxH - 8}
                    rx={2}
                    fill={clubColor}
                  />
                  {showMeta ? (
                    <>
                      <text
                        x={place.boxX + 12}
                        y={place.boxY + 18}
                        fill={theme.text}
                        fontSize={13.5}
                        fontWeight={800}
                      >
                        {displayName}
                      </text>
                      <text
                        x={place.boxX + 12}
                        y={place.boxY + 40}
                        fill={theme.muted}
                        fontSize={10.8}
                        fontWeight={700}
                      >
                        {pt.metaText}
                      </text>
                    </>
                  ) : (
                    <text
                      x={place.boxX + 12}
                      y={place.boxY + 20}
                      fill={theme.text}
                      fontSize={13.5}
                      fontWeight={800}
                    >
                      {displayName}
                    </text>
                  )}
                </>
              ) : null}

              {pt.isSpot ? (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={18}
                  fill="none"
                  stroke={theme.gold}
                  strokeWidth={2}
                  strokeOpacity={0.55}
                />
              ) : null}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={pt.isSpot ? 13 : 9.5}
                fill={clubColor}
                fillOpacity={0.94}
                stroke={pt.isSpot ? theme.gold : theme.canvasBg}
                strokeWidth={pt.isSpot ? 3 : 1.75}
              />
            </g>
          );
        })}
      </svg>

      {/* Tytuł osi X — HTML (zero SVG → overflow) */}
      <p
        className="mb-2 mt-1 text-center text-[13.5px] font-extrabold"
        style={{ color: theme.text }}
      >
        {axisTitleX}
      </p>

      {/* Kartoteka roster — Social-First */}
      <div
        className="mt-3.5 grid grid-cols-2 gap-2.5 border-t pt-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        style={{ borderColor: theme.border }}
      >
        {players.map((p, idx) => {
          const isSpot = p.fpl_element_id === spotlightId;
          const clubColor = getScatterClubColor(
            p.club?.short_name,
            p.club?.primary_color,
            theme.accent,
          );
          const rankBadgeClass = lightTheme
            ? "rounded border border-slate-300 bg-slate-200/90 px-1.5 py-0.5 text-[10px] font-black text-slate-900"
            : "rounded border border-white/15 bg-white/10 px-1.5 py-0.5 text-[10px] font-black text-slate-100";
          return (
            <button
              key={p.fpl_element_id}
              type="button"
              onClick={() => onSelectPlayer(p.fpl_element_id)}
              className={`flex items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left transition hover:opacity-95 ${
                isSpot ? "ring-2 ring-amber-400 border-amber-400" : ""
              }`}
              style={{
                borderColor: isSpot ? undefined : theme.border,
                background: theme.panelBg,
                color: theme.text,
              }}
            >
              <div className="relative shrink-0">
                <img
                  src={fplLabPlayerPhotoUrl(p.playerCode || p.player_code)}
                  alt=""
                  className="h-11 w-11 rounded-full border-2 object-cover object-top"
                  style={{ borderColor: clubColor }}
                  crossOrigin="anonymous"
                />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white p-0.5 shadow-sm">
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
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={rankBadgeClass}>#{idx + 1}</span>
                  <p className="text-[13px] font-black leading-tight">
                    {p.web_name}
                  </p>
                </div>
                <div
                  className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-bold"
                  style={{ color: theme.muted }}
                >
                  <span className="whitespace-nowrap">
                    {shortX}:{" "}
                    {formatMetricDisplayValue(
                      axisX,
                      p.displayValues[axisX] ?? 0,
                      per90,
                    )}
                  </span>
                  <span className="whitespace-nowrap">
                    {shortY}:{" "}
                    {formatMetricDisplayValue(
                      axisY,
                      p.displayValues[axisY] ?? 0,
                      per90,
                    )}
                  </span>
                </div>
                <span
                  className="mt-1.5 inline-block rounded-md px-2 py-0.5 text-[10.5px] font-extrabold"
                  style={{
                    background: `${clubColor}22`,
                    color: clubColor,
                  }}
                >
                  {lang === "pl" ? "OCENA" : "RATING"}{" "}
                  {p.compositeScore.toFixed(0)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {hovered ? (
        <div
          className="pointer-events-none absolute right-3 top-12 rounded-xl border px-3 py-2 text-[11px] shadow-xl"
          style={{
            background: theme.tooltipBg,
            borderColor: theme.border,
            color: theme.text,
          }}
        >
          <p className="font-bold">
            {hovered.club?.short_name} · {hovered.web_name}
          </p>
          <p>
            {shortX}:{" "}
            {formatMetricDisplayValue(
              axisX,
              scaleMode === "PERCENTILE"
                ? (hovered.percentiles[axisX] ?? 0)
                : (hovered.displayValues[axisX] ?? 0),
              scaleMode === "PERCENTILE" ? false : per90,
            )}
            {scaleMode === "PERCENTILE" ? " (P)" : ""}
          </p>
          <p>
            {shortY}:{" "}
            {formatMetricDisplayValue(
              axisY,
              scaleMode === "PERCENTILE"
                ? (hovered.percentiles[axisY] ?? 0)
                : (hovered.displayValues[axisY] ?? 0),
              scaleMode === "PERCENTILE" ? false : per90,
            )}
            {scaleMode === "PERCENTILE" ? " (P)" : ""}
          </p>
          <p style={{ color: theme.muted }}>
            {lang === "pl" ? "OCENA (0–100)" : "RATING (0–100)"}:{" "}
            {hovered.compositeScore.toFixed(1)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
