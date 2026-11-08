"use client";

import { useMemo, useState } from "react";
import type { PlottedStatsLabPlayer } from "@/lib/stats-lab/analyticsEngine";
import type { FplStatKey } from "@/lib/stats-lab/types";
import type { StatsLabLang, StatsLabScaleMode } from "@/lib/stats-lab/i18n";
import { statLabel, statShort } from "@/lib/stats-lab/i18n";
import {
  formatStatDisplay,
  metricColor,
  type StatsLabChartTheme,
} from "@/components/admin/stats-lab/chartTheme";

type Props = {
  players: PlottedStatsLabPlayer[];
  metrics: FplStatKey[];
  poolAverages: Record<FplStatKey, number>;
  theme: StatsLabChartTheme;
  lang: StatsLabLang;
  scaleMode: StatsLabScaleMode;
  spotlightId: number | null;
  showAvg: boolean;
  onSelectPlayer: (id: number) => void;
};

const PLAYER_STROKES = ["#39FF14", "#38bdf8", "#fbbf24", "#fb7185"];

function polar(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function axisTextAnchor(angleRad: number): "start" | "end" | "middle" {
  const deg = ((angleRad * 180) / Math.PI + 360) % 360;
  // right side
  if (deg > 20 && deg < 160) return "start";
  // left side
  if (deg > 200 && deg < 340) return "end";
  return "middle";
}

export function RadarPizzaChart({
  players,
  metrics,
  poolAverages,
  theme,
  lang,
  scaleMode,
  spotlightId,
  showAvg,
  onSelectPlayer,
}: Props) {
  const [hover, setHover] = useState<{
    id: number;
    key: FplStatKey;
    x: number;
    y: number;
  } | null>(null);

  const size = 560;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 150;
  const labelR = maxR + 58;
  const n = Math.max(3, metrics.length);
  const plotted = players.slice(0, 4);

  const rings = [0.25, 0.5, 0.75, 1];

  const axisAngles = useMemo(
    () =>
      metrics.map((_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / n),
    [metrics, n],
  );

  const rawMaxByMetric = useMemo(() => {
    const m = {} as Record<FplStatKey, number>;
    for (const key of metrics) {
      const vals = plotted.map((p) => Math.abs(p.displayValues[key] ?? 0));
      if (showAvg) vals.push(Math.abs(poolAverages[key] ?? 0));
      m[key] = Math.max(0.0001, ...vals, 0.0001);
    }
    return m;
  }, [metrics, plotted, poolAverages, showAvg]);

  function valueOnAxis(player: PlottedStatsLabPlayer, key: FplStatKey): number {
    if (scaleMode === "PERCENTILE") {
      return Math.max(0, Math.min(100, player.percentiles[key] ?? 0));
    }
    const raw = Math.abs(player.displayValues[key] ?? 0);
    return (raw / rawMaxByMetric[key]) * 100;
  }

  function polygonPoints(values01to100: number[]): string {
    return values01to100
      .map((v, i) => {
        const r = (Math.max(0, Math.min(100, v)) / 100) * maxR;
        const { x, y } = polar(cx, cy, r, axisAngles[i] ?? 0);
        return `${x},${y}`;
      })
      .join(" ");
  }

  const pizzaPlayer =
    plotted.find((p) => p.fpl_element_id === spotlightId) ?? plotted[0] ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
      <div className="relative mx-auto w-full max-w-[540px]">
        <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full">
          {rings.map((t) => (
            <circle
              key={t}
              cx={cx}
              cy={cy}
              r={maxR * t}
              fill="none"
              stroke={theme.grid}
              strokeWidth={1}
            />
          ))}

          {metrics.map((key, i) => {
            const { x, y } = polar(cx, cy, maxR + 4, axisAngles[i]);
            const label = polar(cx, cy, labelR, axisAngles[i]);
            const anchor = axisTextAnchor(axisAngles[i]);
            const pillValues = plotted.slice(0, 2).map((p, pi) => ({
              text:
                scaleMode === "PERCENTILE"
                  ? `P${(p.percentiles[key] ?? 0).toFixed(0)}`
                  : formatStatDisplay(key, p.displayValues[key] ?? 0),
              color: PLAYER_STROKES[pi % PLAYER_STROKES.length],
            }));
            return (
              <g key={key}>
                <line
                  x1={cx}
                  y1={cy}
                  x2={x}
                  y2={y}
                  stroke={theme.grid}
                  strokeWidth={1}
                />
                <text
                  x={label.x}
                  y={label.y - (pillValues.length > 0 ? 10 : 0)}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  fill={theme.text}
                  fontSize={16}
                  fontWeight={800}
                >
                  {statShort(key, lang)}
                </text>
                {pillValues.map((pv, pvi) => {
                  const tw = Math.max(28, pv.text.length * 8 + 12);
                  const px =
                    anchor === "end"
                      ? label.x - tw
                      : anchor === "middle"
                        ? label.x - tw / 2
                        : label.x;
                  const py = label.y + 4 + pvi * 18;
                  return (
                    <g key={`pill-${key}-${pvi}`}>
                      <rect
                        x={px}
                        y={py}
                        width={tw}
                        height={16}
                        rx={4}
                        fill={`${pv.color}33`}
                        stroke={pv.color}
                        strokeWidth={1}
                      />
                      <text
                        x={px + tw / 2}
                        y={py + 12}
                        textAnchor="middle"
                        fill={pv.color}
                        fontSize={11}
                        fontWeight={800}
                      >
                        {pv.text}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {pizzaPlayer && scaleMode === "PERCENTILE"
            ? metrics.map((key, i) => {
                const pct = valueOnAxis(pizzaPlayer, key);
                const a0 = axisAngles[i] - Math.PI / n;
                const a1 = axisAngles[i] + Math.PI / n;
                const r = (pct / 100) * maxR;
                const p0 = polar(cx, cy, r, a0);
                const p1 = polar(cx, cy, r, a1);
                const d = `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${p1.x} ${p1.y} Z`;
                return (
                  <path
                    key={`pizza-${key}`}
                    d={d}
                    fill={metricColor(i)}
                    opacity={0.2}
                    onClick={() => onSelectPlayer(pizzaPlayer.fpl_element_id)}
                    style={{ cursor: "pointer" }}
                  />
                );
              })
            : null}

          {showAvg && scaleMode === "PERCENTILE" ? (
            <polygon
              points={polygonPoints(metrics.map(() => 50))}
              fill="none"
              stroke={theme.avgLine}
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
          ) : null}

          {showAvg && scaleMode === "RAW" ? (
            <polygon
              points={polygonPoints(
                metrics.map((k) => {
                  const avg = Math.abs(poolAverages[k] ?? 0);
                  return (avg / rawMaxByMetric[k]) * 100;
                }),
              )}
              fill="none"
              stroke={theme.avgLine}
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
          ) : null}

          {plotted.map((p, pi) => {
            const vals = metrics.map((k) => valueOnAxis(p, k));
            const pts = polygonPoints(vals);
            const stroke = PLAYER_STROKES[pi % PLAYER_STROKES.length];
            const isSpot = p.fpl_element_id === spotlightId;
            return (
              <g key={p.fpl_element_id}>
                <polygon
                  points={pts}
                  fill={stroke}
                  fillOpacity={isSpot ? 0.18 : 0.08}
                  stroke={stroke}
                  strokeWidth={isSpot ? 3 : 1.75}
                  onClick={() => onSelectPlayer(p.fpl_element_id)}
                  style={{ cursor: "pointer" }}
                />
                {metrics.map((key, i) => {
                  const pct = vals[i];
                  const { x, y } = polar(
                    cx,
                    cy,
                    (pct / 100) * maxR,
                    axisAngles[i],
                  );
                  return (
                    <circle
                      key={`${p.fpl_element_id}-${key}`}
                      cx={x}
                      cy={y}
                      r={isSpot ? 4 : 3}
                      fill={stroke}
                      stroke={theme.canvasBg}
                      strokeWidth={1}
                      onMouseEnter={() =>
                        setHover({ id: p.fpl_element_id, key, x, y })
                      }
                      onMouseLeave={() => setHover(null)}
                      onClick={() => onSelectPlayer(p.fpl_element_id)}
                      style={{ cursor: "pointer" }}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {hover ? (
          <div
            className="pointer-events-none absolute z-10 max-w-[220px] rounded-lg border px-2.5 py-2 text-[10px] shadow-xl"
            style={{
              left: Math.min(hover.x + 8, size - 180),
              top: Math.min(hover.y + 8, size - 80),
              background: theme.tooltipBg,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            {(() => {
              const p = plotted.find((x) => x.fpl_element_id === hover.id);
              if (!p) return null;
              return (
                <>
                  <p className="font-bold">{p.web_name}</p>
                  <p style={{ color: theme.muted }}>
                    {statLabel(hover.key, lang)}
                  </p>
                  <p>
                    {formatStatDisplay(
                      hover.key,
                      p.displayValues[hover.key] ?? 0,
                    )}
                    {scaleMode === "PERCENTILE"
                      ? ` · P${(p.percentiles[hover.key] ?? 0).toFixed(0)}`
                      : ""}
                  </p>
                </>
              );
            })()}
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <p
          className="text-[10px] font-black uppercase tracking-wider"
          style={{ color: theme.muted }}
        >
          {lang === "pl" ? "Nakładka (max 4)" : "Overlay (max 4)"}
        </p>
        {plotted.map((p, i) => (
          <button
            key={p.fpl_element_id}
            type="button"
            onClick={() => onSelectPlayer(p.fpl_element_id)}
            className="flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs"
            style={{
              borderColor:
                spotlightId === p.fpl_element_id ? theme.gold : theme.border,
              color: theme.text,
            }}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: PLAYER_STROKES[i % PLAYER_STROKES.length] }}
            />
            <span
              className="font-mono text-[10px]"
              style={{ color: theme.accent }}
            >
              {p.club?.short_name}
            </span>
            <span className="font-bold">{p.web_name}</span>
            <span
              className="ml-auto tabular-nums"
              style={{ color: theme.muted }}
            >
              {p.compositeScore.toFixed(0)}
            </span>
          </button>
        ))}
        {showAvg ? (
          <p className="pt-2 text-[10px]" style={{ color: theme.muted }}>
            {scaleMode === "PERCENTILE"
              ? lang === "pl"
                ? "Przerywana linia = baseline 50. percentyla grupy."
                : "Dashed line = group 50th percentile baseline."
              : lang === "pl"
                ? "Przerywana linia = średnia grupy (skala 0…max metryki)."
                : "Dashed line = pool average (0…metric max scale)."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
