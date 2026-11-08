"use client";

import { useMemo, useState } from "react";
import type { PlottedStatsLabPlayer } from "@/lib/stats-lab/analyticsEngine";
import type { FplStatKey } from "@/lib/stats-lab/types";
import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import { statLabel } from "@/lib/stats-lab/i18n";
import {
  formatStatDisplay,
  resolveScatterLabelPositions,
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
};

const W = 720;
const H = 520;
const PAD = { t: 52, r: 96, b: 80, l: 96 };

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
}: Props) {
  const [hoverId, setHoverId] = useState<number | null>(null);

  const { minX, maxX, minY, maxY } = useMemo(() => {
    const xs = players.map((p) => p.displayValues[axisX] ?? 0);
    const ys = players.map((p) => p.displayValues[axisY] ?? 0);
    if (showAvg) {
      xs.push(poolAverages[axisX] ?? 0);
      ys.push(poolAverages[axisY] ?? 0);
    }
    const pad = (arr: number[]) => {
      const lo = Math.min(...arr, 0);
      const hi = Math.max(...arr, 1);
      const span = hi - lo || 1;
      return { min: lo - span * 0.08, max: hi + span * 0.08 };
    };
    const xp = pad(xs);
    const yp = pad(ys);
    return { minX: xp.min, maxX: xp.max, minY: yp.min, maxY: yp.max };
  }, [players, axisX, axisY, poolAverages, showAvg]);

  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  const sx = (v: number) => PAD.l + ((v - minX) / (maxX - minX || 1)) * plotW;
  const sy = (v: number) =>
    PAD.t + (1 - (v - minY) / (maxY - minY || 1)) * plotH;

  const avgX = poolAverages[axisX] ?? 0;
  const avgY = poolAverages[axisY] ?? 0;
  const hover = players.find((p) => p.fpl_element_id === hoverId) ?? null;

  const labelPlacements = useMemo(() => {
    const pts = players.map((p) => ({
      id: p.fpl_element_id,
      x: sx(p.displayValues[axisX] ?? 0),
      y: sy(p.displayValues[axisY] ?? 0),
    }));
    return resolveScatterLabelPositions(pts, 30);
    // sx/sy depend on domain — players/axes change covers it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, axisX, axisY, minX, maxX, minY, maxY]);

  const placementById = useMemo(() => {
    const m = new Map<number, (typeof labelPlacements)[number]>();
    for (const pl of labelPlacements) m.set(pl.id, pl);
    return m;
  }, [labelPlacements]);

  const tickX = [minX, (minX + maxX) / 2, maxX];
  const tickY = [minY, (minY + maxY) / 2, maxY];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        <rect
          x={PAD.l}
          y={PAD.t}
          width={plotW}
          height={plotH}
          fill="transparent"
          stroke={theme.grid}
        />

        {/* Axis ticks */}
        {tickX.map((v, i) => (
          <text
            key={`tx-${i}`}
            x={sx(v)}
            y={PAD.t + plotH + 22}
            textAnchor="middle"
            fill={theme.muted}
            fontSize={12}
            fontWeight={700}
          >
            {formatStatDisplay(axisX, v)}
          </text>
        ))}
        {tickY.map((v, i) => (
          <text
            key={`ty-${i}`}
            x={PAD.l - 14}
            y={sy(v) + 4}
            textAnchor="end"
            fill={theme.muted}
            fontSize={12}
            fontWeight={700}
          >
            {formatStatDisplay(axisY, v)}
          </text>
        ))}

        {/* Quadrant hints */}
        <text
          x={PAD.l + 10}
          y={PAD.t + 20}
          fill={theme.muted}
          fontSize={12}
          fontWeight={800}
          opacity={0.7}
        >
          {lang === "pl" ? "WYSOKI Y" : "HIGH Y"}
        </text>
        <text
          x={PAD.l + plotW - 10}
          y={PAD.t + plotH - 12}
          fill={theme.muted}
          fontSize={12}
          fontWeight={800}
          textAnchor="end"
          opacity={0.7}
        >
          {lang === "pl" ? "WYSOKI X" : "HIGH X"}
        </text>

        {showAvg ? (
          <>
            <line
              x1={sx(avgX)}
              y1={PAD.t}
              x2={sx(avgX)}
              y2={PAD.t + plotH}
              stroke={theme.avgLine}
              strokeDasharray="5 4"
              strokeWidth={1.25}
            />
            <line
              x1={PAD.l}
              y1={sy(avgY)}
              x2={PAD.l + plotW}
              y2={sy(avgY)}
              stroke={theme.avgLine}
              strokeDasharray="5 4"
              strokeWidth={1.25}
            />
          </>
        ) : null}

        {players.map((p) => {
          const x = sx(p.displayValues[axisX] ?? 0);
          const y = sy(p.displayValues[axisY] ?? 0);
          const isSpot = p.fpl_element_id === spotlightId;
          const fill = p.club?.primary_color || theme.accent;
          const place = placementById.get(p.fpl_element_id);
          const label = p.web_name;
          const labelW = Math.max(48, label.length * 9.2 + 16);
          const labelH = showMeta ? 36 : 24;

          return (
            <g
              key={p.fpl_element_id}
              onMouseEnter={() => setHoverId(p.fpl_element_id)}
              onMouseLeave={() => setHoverId(null)}
              onClick={() => onSelectPlayer(p.fpl_element_id)}
              style={{ cursor: "pointer" }}
            >
              {place ? (
                <>
                  <line
                    x1={x}
                    y1={y}
                    x2={place.labelX}
                    y2={place.labelY}
                    stroke={theme.muted}
                    strokeWidth={1}
                    opacity={0.55}
                  />
                  <rect
                    x={
                      place.anchor === "end"
                        ? place.labelX - labelW
                        : place.labelX
                    }
                    y={place.labelY - (showMeta ? 14 : 12)}
                    width={labelW}
                    height={labelH}
                    rx={6}
                    fill={theme.canvasBg}
                    fillOpacity={0.92}
                    stroke={fill}
                    strokeWidth={1.5}
                  />
                  <text
                    x={
                      place.anchor === "end"
                        ? place.labelX - 8
                        : place.labelX + 8
                    }
                    y={place.labelY + 2}
                    textAnchor={place.anchor}
                    fill={theme.text}
                    fontSize={15}
                    fontWeight={800}
                  >
                    {label}
                  </text>
                  {showMeta ? (
                    <text
                      x={
                        place.anchor === "end"
                          ? place.labelX - 8
                          : place.labelX + 8
                      }
                      y={place.labelY + 16}
                      textAnchor={place.anchor}
                      fill={theme.muted}
                      fontSize={11}
                      fontWeight={600}
                    >
                      £{(p.rawValues.now_cost / 10).toFixed(1)}m ·{" "}
                      {p.rawValues.selected_by_percent.toFixed(0)}%
                    </text>
                  ) : null}
                </>
              ) : null}
              <circle
                cx={x}
                cy={y}
                r={isSpot ? 13 : 9}
                fill={fill}
                fillOpacity={0.92}
                stroke={isSpot ? theme.gold : theme.canvasBg}
                strokeWidth={isSpot ? 3 : 1.5}
              />
            </g>
          );
        })}

        {/* Axis titles — far from tick labels */}
        <text
          x={PAD.l + plotW / 2}
          y={H - 16}
          textAnchor="middle"
          fill={theme.muted}
          fontSize={17}
          fontWeight={700}
        >
          {statLabel(axisX, lang)}
        </text>
        <text
          x={26}
          y={PAD.t + plotH / 2}
          textAnchor="middle"
          fill={theme.muted}
          fontSize={17}
          fontWeight={700}
          transform={`rotate(-90 26 ${PAD.t + plotH / 2})`}
        >
          {statLabel(axisY, lang)}
        </text>
      </svg>

      {hover ? (
        <div
          className="pointer-events-none absolute right-3 top-3 rounded-xl border px-3 py-2 text-[11px] shadow-xl"
          style={{
            background: theme.tooltipBg,
            borderColor: theme.border,
            color: theme.text,
          }}
        >
          <p className="font-bold">
            {hover.club?.short_name} · {hover.web_name}
          </p>
          <p>
            X: {formatStatDisplay(axisX, hover.displayValues[axisX] ?? 0)}
          </p>
          <p>
            Y: {formatStatDisplay(axisY, hover.displayValues[axisY] ?? 0)}
          </p>
          <p style={{ color: theme.muted }}>
            Composite {hover.compositeScore.toFixed(0)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
