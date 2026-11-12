"use client";

import { useMemo, useState } from "react";
import type { PlottedStatsLabPlayer } from "@/lib/stats-lab/analyticsEngine";
import type { FplStatKey } from "@/lib/stats-lab/types";
import { getFplStatDefinition } from "@/lib/stats-lab/types";
import type { StatsLabLang, StatsLabScaleMode } from "@/lib/stats-lab/i18n";
import { statLabel } from "@/lib/stats-lab/i18n";
import {
  formatStatDisplay,
  metricColor,
  type StatsLabChartTheme,
} from "@/components/admin/stats-lab/chartTheme";
import {
  fplLabBadgeUrl,
  fplLabPlayerPhotoUrl,
} from "@/lib/stats-lab/mediaUrls";

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
  per90?: boolean;
  poolSize?: number;
  showPlayerMeta?: boolean;
  showBarValues?: boolean;
};

type PlayerSlot = {
  stroke: string;
  fill: string;
  pillBg: string;
  pillBorder: string;
  pillText: string;
  cardBg: string;
};

const MAX_RADAR_PLAYERS = 4;

const PLAYER_SLOTS_DARK: PlayerSlot[] = [
  {
    stroke: "#4ade80",
    fill: "#4ade80",
    pillBg: "#052e16",
    pillBorder: "#4ade80",
    pillText: "#bbf7d0",
    cardBg: "rgba(20, 83, 45, 0.22)",
  },
  {
    stroke: "#38bdf8",
    fill: "#38bdf8",
    pillBg: "#082f49",
    pillBorder: "#38bdf8",
    pillText: "#bae6fd",
    cardBg: "rgba(12, 74, 110, 0.22)",
  },
  {
    stroke: "#fbbf24",
    fill: "#fbbf24",
    pillBg: "#451a03",
    pillBorder: "#fbbf24",
    pillText: "#fde68a",
    cardBg: "rgba(120, 53, 15, 0.22)",
  },
  {
    stroke: "#fb7185",
    fill: "#fb7185",
    pillBg: "#4c0519",
    pillBorder: "#fb7185",
    pillText: "#fecdd3",
    cardBg: "rgba(136, 19, 55, 0.22)",
  },
];

const PLAYER_SLOTS_LIGHT: PlayerSlot[] = [
  {
    stroke: "#059669",
    fill: "#10b981",
    pillBg: "#ecfdf5",
    pillBorder: "#059669",
    pillText: "#065f46",
    cardBg: "rgba(236, 253, 245, 0.9)",
  },
  {
    stroke: "#0284c7",
    fill: "#0ea5e9",
    pillBg: "#f0f9ff",
    pillBorder: "#0284c7",
    pillText: "#075985",
    cardBg: "rgba(240, 249, 255, 0.9)",
  },
  {
    stroke: "#d97706",
    fill: "#f59e0b",
    pillBg: "#fffbeb",
    pillBorder: "#d97706",
    pillText: "#92400e",
    cardBg: "rgba(255, 251, 235, 0.9)",
  },
  {
    stroke: "#e11d48",
    fill: "#f43f5e",
    pillBg: "#fff1f2",
    pillBorder: "#e11d48",
    pillText: "#9f1239",
    cardBg: "rgba(255, 241, 242, 0.9)",
  },
];

function polar(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function radiusFromAxisScore(axisScore01to100: number, maxR: number) {
  const pct = clamp(axisScore01to100, 0, 100);
  return ((6 + (pct / 100) * 94) / 100) * maxR;
}

function axisScoreRaw(
  key: FplStatKey,
  val: number,
  allVals: number[],
): number {
  const def = getFplStatDefinition(key);
  const invert = Boolean(def?.invertScale);

  if (invert) {
    const maxBad = Math.max(...allVals, 0.0001) * 1.18;
    return clamp(((maxBad - val) / maxBad) * 100, 12, 100);
  }

  if (Math.min(...allVals) < 0) {
    const lo = Math.min(...allVals, 0);
    const hi = Math.max(...allVals, 0);
    if (hi - lo < 0.0001) return 50;
    return 15 + ((val - lo) / (hi - lo)) * 85;
  }

  const rawMax = Math.max(...allVals, 0.0001);
  return clamp((val / rawMax) * 100, 0, 100);
}

function positionShort(elementType: number, lang: StatsLabLang): string {
  const mapPl: Record<number, string> = {
    1: "BR",
    2: "OBR",
    3: "POM",
    4: "NAP",
  };
  const mapEn: Record<number, string> = {
    1: "GK",
    2: "DEF",
    3: "MID",
    4: "FWD",
  };
  return (lang === "pl" ? mapPl : mapEn)[elementType] ?? "—";
}

function PlayerPortrait({
  playerCode,
  webName,
  stroke,
}: {
  playerCode: number;
  webName: string;
  stroke: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = webName
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="h-[82px] w-[82px] shrink-0 overflow-hidden rounded-full border-[3px] bg-slate-900/60"
      style={{ borderColor: stroke }}
    >
      {failed || playerCode <= 0 ? (
        <div
          className="flex h-full w-full items-center justify-center text-sm font-black"
          style={{ color: stroke }}
        >
          {initials || "?"}
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fplLabPlayerPhotoUrl(playerCode)}
          alt={webName}
          crossOrigin="anonymous"
          className="h-full w-full scale-105 object-cover object-top"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

/** Duży medalion herbu — niezależny od portretu (nie zasłania koszulki). */
function ClubBadgeMedallion({
  pulseCode,
  clubLabel,
  stroke,
}: {
  pulseCode: number;
  clubLabel: string;
  stroke: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 bg-white p-1.5 shadow-md"
      style={{ borderColor: stroke }}
    >
      {failed || pulseCode <= 0 ? (
        <span className="text-[10px] font-black text-slate-600">
          {clubLabel.slice(0, 3)}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fplLabBadgeUrl(pulseCode)}
          alt={clubLabel}
          crossOrigin="anonymous"
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

function HeroPlayerCard({
  player,
  idx,
  slot,
  theme,
  lang,
  per90,
  scaleMode,
  isSpot,
  isPizzaOwner,
  showPlayerMeta,
  onSelect,
}: {
  player: PlottedStatsLabPlayer;
  idx: number;
  slot: PlayerSlot;
  theme: StatsLabChartTheme;
  lang: StatsLabLang;
  per90: boolean;
  scaleMode: StatsLabScaleMode;
  isSpot: boolean;
  isPizzaOwner: boolean;
  showPlayerMeta: boolean;
  onSelect: () => void;
}) {
  const clubShort = player.club?.short_name ?? "—";
  const price = Number(player.rawValues.now_cost ?? 0) / 10;
  const ownership = Number(player.rawValues.selected_by_percent ?? 0);
  const minutes = Number(player.minutes ?? 0);
  const starts = Number(player.rawValues.starts ?? 0);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="relative w-full max-w-[246px] overflow-hidden rounded-2xl p-3.5 text-left transition-all"
      style={{
        border: `2px solid ${isSpot ? theme.gold : slot.stroke}`,
        background: slot.cardBg,
        boxShadow: isSpot ? `0 0 0 1px ${theme.gold}66` : undefined,
        color: theme.text,
      }}
    >
      <div className="flex items-start gap-3">
        <PlayerPortrait
          playerCode={player.playerCode}
          webName={player.web_name}
          stroke={slot.stroke}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-black"
              style={{
                background: slot.pillBg,
                color: slot.pillText,
                border: `1px solid ${slot.pillBorder}`,
              }}
            >
              #{idx + 1}
            </span>
            <span
              className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
              style={{
                background: isSpot
                  ? `${theme.gold}22`
                  : "rgba(148,163,184,0.2)",
                color: theme.muted,
              }}
            >
              {positionShort(player.element_type, lang)}
            </span>
            <ClubBadgeMedallion
              pulseCode={player.clubPulseCode}
              clubLabel={clubShort}
              stroke={slot.stroke}
            />
          </div>
          <div className="break-words text-[17px] font-black leading-tight">
            {player.web_name}
          </div>
          {showPlayerMeta ? (
            <div className="text-[11.5px] font-bold opacity-90">
              {clubShort} · £{price.toFixed(1)}m · {ownership.toFixed(1)}%
            </div>
          ) : null}
          <div className="text-[10.5px] opacity-75">
            {minutes} min · {starts}× {lang === "pl" ? "wyj." : "st."}
          </div>
        </div>
      </div>

      {isPizzaOwner ? (
        <div className="mt-2">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide"
            style={{
              background: slot.pillBg,
              color: slot.pillText,
              border: `1px solid ${slot.pillBorder}`,
            }}
          >
            {lang === "pl" ? "🍕 Aktywna Pizza" : "🍕 Active Pizza"}
          </span>
        </div>
      ) : null}

      <div
        className="mt-3 grid grid-cols-2 gap-2 border-t pt-2.5"
        style={{ borderColor: theme.grid }}
      >
        <div>
          <p className="text-[9.5px] font-bold uppercase tracking-wider opacity-75">
            {lang === "pl"
              ? per90
                ? "Pkt / 90"
                : "Pkt FPL"
              : per90
                ? "Pts / 90"
                : "FPL Pts"}
          </p>
          <p className="text-[17px] font-black leading-tight tabular-nums">
            {formatStatDisplay(
              "total_points",
              Number(player.displayValues.total_points) || 0,
              per90,
            )}
          </p>
        </div>
        <div>
          <p className="text-[9.5px] font-bold uppercase tracking-wider opacity-75">
            {lang === "pl" ? "OCENA" : "RATING"}
          </p>
          <p
            className="text-[17px] font-black leading-tight tabular-nums"
            style={{ color: slot.stroke }}
          >
            {player.compositeScore.toFixed(1)}
          </p>
        </div>
      </div>
    </button>
  );
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
  per90 = false,
  poolSize = 0,
  showPlayerMeta = true,
  showBarValues = true,
}: Props) {
  const [hover, setHover] = useState<{
    id: number;
    key: FplStatKey;
    x: number;
    y: number;
  } | null>(null);

  const isLight = theme.id === "ANALYST_LIGHT";
  const slots = isLight ? PLAYER_SLOTS_LIGHT : PLAYER_SLOTS_DARK;

  const sizeW = 610;
  const sizeH = 560;
  const cx = 305;
  const cy = 280;
  const maxR = 188;
  const n = Math.max(3, metrics.length);
  const rings = [0.25, 0.5, 0.75, 1];

  const plotted = useMemo(
    () => players.slice(0, MAX_RADAR_PLAYERS),
    [players],
  );

  const effectiveSpotlightId = plotted.some(
    (p) => p.fpl_element_id === spotlightId,
  )
    ? spotlightId
    : (plotted[0]?.fpl_element_id ?? null);

  const pizzaPlayer =
    plotted.find((p) => p.fpl_element_id === effectiveSpotlightId) ?? null;

  const axisAngles = useMemo(
    () => metrics.map((_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / n),
    [metrics, n],
  );

  const rawValsByMetric = useMemo(() => {
    const m = {} as Record<FplStatKey, number[]>;
    for (const key of metrics) {
      const vals = plotted.map((p) => Number(p.displayValues[key]) || 0);
      if (showAvg) vals.push(Number(poolAverages[key]) || 0);
      m[key] = vals;
    }
    return m;
  }, [metrics, plotted, poolAverages, showAvg]);

  function valueOnAxis(player: PlottedStatsLabPlayer, key: FplStatKey): number {
    if (scaleMode === "PERCENTILE") {
      return clamp(Number(player.percentiles[key]) || 0, 0, 100);
    }
    const val = Number(player.displayValues[key]) || 0;
    return axisScoreRaw(key, val, rawValsByMetric[key] ?? [val]);
  }

  function avgAxisScore(key: FplStatKey): number {
    if (scaleMode === "PERCENTILE") return 50;
    const avg = Number(poolAverages[key]) || 0;
    return axisScoreRaw(key, avg, rawValsByMetric[key] ?? [avg]);
  }

  function polygonPointsFromScores(scores: number[]): string {
    return scores
      .map((v, i) => {
        const r = radiusFromAxisScore(v, maxR);
        const { x, y } = polar(cx, cy, r, axisAngles[i] ?? 0);
        return `${x},${y}`;
      })
      .join(" ");
  }

  function renderCard(idx: number) {
    const p = plotted[idx];
    if (!p) return null;
    const slot = slots[idx % slots.length]!;
    return (
      <HeroPlayerCard
        key={p.fpl_element_id}
        player={p}
        idx={idx}
        slot={slot}
        theme={theme}
        lang={lang}
        per90={per90}
        scaleMode={scaleMode}
        isSpot={p.fpl_element_id === effectiveSpotlightId}
        isPizzaOwner={p.fpl_element_id === effectiveSpotlightId}
        showPlayerMeta={showPlayerMeta !== false}
        onSelect={() => onSelectPlayer(p.fpl_element_id)}
      />
    );
  }

  const leftColClass =
    plotted.length >= 3
      ? "flex h-full flex-col justify-between gap-4 py-1"
      : "flex h-full flex-col justify-center";

  const rightColClass =
    plotted.length === 4
      ? "flex h-full flex-col justify-between gap-4 py-1"
      : plotted.length === 3
        ? "flex h-full flex-col justify-center"
        : "flex h-full flex-col justify-center";

  /** 1 gracz: radar zajmuje środek + prawą kolumnę */
  const gridClass =
    plotted.length === 1
      ? "grid w-full grid-cols-1 items-center gap-2 lg:grid-cols-[246px_1fr]"
      : "grid w-full grid-cols-1 items-center gap-2 lg:grid-cols-[246px_1fr_246px]";

  return (
    <div className={gridClass}>
      {/* LEWA */}
      <div className={leftColClass}>
        {plotted.length === 1 || plotted.length === 2
          ? renderCard(0)
          : null}
        {plotted.length >= 3 ? (
          <>
            {renderCard(0)}
            {renderCard(2)}
          </>
        ) : null}
      </div>

      {/* ŚRODEK — wielka tarcza */}
      <div className="flex min-w-0 flex-col items-center justify-center">
        <div className="relative w-full max-w-[610px]">
          <svg
            viewBox={`0 0 ${sizeW} ${sizeH}`}
            className="h-auto w-full max-w-[610px] select-none overflow-visible"
            role="img"
            aria-label="Radar / Pizza chart"
          >
            <circle
              cx={cx}
              cy={cy}
              r={maxR}
              fill={
                isLight
                  ? "rgba(15,23,42,0.025)"
                  : "rgba(255,255,255,0.02)"
              }
            />

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

            {[0.25, 0.5, 0.75].map((t) => (
              <text
                key={`ring-${t}`}
                x={cx + 4}
                y={cy - maxR * t}
                fill={theme.muted}
                opacity={0.65}
                fontSize={8.5}
                fontWeight={600}
              >
                {Math.round(t * 100)}%
              </text>
            ))}

            {metrics.map((key, i) => {
              const θ = axisAngles[i] ?? 0;
              const tip = polar(cx, cy, maxR + 4, θ);
              const ux = Math.cos(θ);
              const uy = Math.sin(θ);
              const blockX = cx + ux * (maxR + 46) + ux * 18;
              const blockY = cy + uy * (maxR + 40) + uy * 10;
              const clampedBlockX = Math.max(62, Math.min(610 - 62, blockX));
              const clampedBlockY = Math.max(32, Math.min(560 - 28, blockY));
              const showPills = showBarValues !== false;
              const labelY = showPills
                ? clampedBlockY - (plotted.length > 2 ? 25 : 14)
                : clampedBlockY;
              const short = statLabel(key, lang, true);

              const pillW = 54;
              const pillH = 21;
              const gapX = 5;
              const gapY = 4;
              const gridW =
                plotted.length <= 1 ? pillW : pillW * 2 + gapX;
              const startX = clampedBlockX - gridW / 2;

              return (
                <g key={key}>
                  <line
                    x1={cx}
                    y1={cy}
                    x2={tip.x}
                    y2={tip.y}
                    stroke={theme.grid}
                    strokeWidth={1}
                  />
                  <text
                    x={clampedBlockX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={theme.text}
                    fontSize={15.5}
                    fontWeight={900}
                  >
                    {short}
                  </text>
                  {showPills
                    ? plotted.map((p, pi) => {
                        const slot = slots[pi % slots.length]!;
                        let col = 0;
                        let row = 0;
                        if (plotted.length === 1) {
                          col = 0;
                          row = 0;
                        } else if (plotted.length === 2) {
                          col = pi;
                          row = 0;
                        } else {
                          col = pi % 2;
                          row = Math.floor(pi / 2);
                        }
                        const px = startX + col * (pillW + gapX);
                        const py = labelY + 12 + row * (pillH + gapY);
                        const text = formatStatDisplay(
                          key,
                          Number(p.displayValues[key]) || 0,
                          per90,
                        );
                        return (
                          <g key={`pill-${p.fpl_element_id}-${key}`}>
                            <rect
                              x={px}
                              y={py}
                              width={pillW}
                              height={pillH}
                              rx={5.5}
                              fill={slot.pillBg}
                              stroke={slot.pillBorder}
                              strokeWidth={1.25}
                            />
                            <text
                              x={px + pillW / 2}
                              y={py + pillH / 2 + 0.5}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill={slot.pillText}
                              fontSize={12.5}
                              fontWeight={900}
                            >
                              {text}
                            </text>
                          </g>
                        );
                      })
                    : null}
                </g>
              );
            })}

            {pizzaPlayer
              ? metrics.map((key, i) => {
                  // Ten sam promień osi co wierzchołek wielokąta (PERCENTILE lub RAW)
                  const axisScore = valueOnAxis(pizzaPlayer, key);
                  const a0 = (axisAngles[i] ?? 0) - Math.PI / n;
                  const a1 = (axisAngles[i] ?? 0) + Math.PI / n;
                  const r = radiusFromAxisScore(axisScore, maxR);
                  const p0 = polar(cx, cy, r, a0);
                  const p1 = polar(cx, cy, r, a1);
                  const fill = metricColor(i, theme.id);
                  const d = `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${p1.x} ${p1.y} Z`;
                  return (
                    <path
                      key={`pizza-${key}`}
                      d={d}
                      fill={fill}
                      fillOpacity={isLight ? 0.24 : 0.22}
                      stroke={fill}
                      strokeWidth={2}
                      strokeOpacity={0.65}
                      onClick={() =>
                        onSelectPlayer(pizzaPlayer.fpl_element_id)
                      }
                      style={{ cursor: "pointer" }}
                    />
                  );
                })
              : null}

            {showAvg ? (
              <polygon
                points={polygonPointsFromScores(
                  metrics.map((k) => avgAxisScore(k)),
                )}
                fill="none"
                stroke={theme.avgLine}
                strokeWidth={1.5}
                strokeDasharray="5 4"
              />
            ) : null}

            {plotted.map((p, pi) => {
              const slot = slots[pi % slots.length]!;
              const vals = metrics.map((k) => valueOnAxis(p, k));
              const pts = polygonPointsFromScores(vals);
              const isSpot = p.fpl_element_id === effectiveSpotlightId;
              return (
                <g key={p.fpl_element_id}>
                  <polygon
                    points={pts}
                    fill={slot.fill}
                    fillOpacity={isSpot ? 0.18 : 0.08}
                    stroke={slot.stroke}
                    strokeWidth={isSpot ? 3.5 : 2.25}
                    onClick={() => onSelectPlayer(p.fpl_element_id)}
                    style={{ cursor: "pointer" }}
                  />
                  {metrics.map((key, i) => {
                    const score = vals[i] ?? 0;
                    const { x, y } = polar(
                      cx,
                      cy,
                      radiusFromAxisScore(score, maxR),
                      axisAngles[i] ?? 0,
                    );
                    return (
                      <circle
                        key={`${p.fpl_element_id}-${key}`}
                        cx={x}
                        cy={y}
                        r={isSpot ? 5.5 : 4}
                        fill={slot.stroke}
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
                left: Math.min(hover.x + 8, sizeW - 180),
                top: Math.min(hover.y + 8, sizeH - 80),
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
                        Number(p.displayValues[hover.key]) || 0,
                        per90,
                      )}
                      {scaleMode === "PERCENTILE"
                        ? ` · P${Math.round(Number(p.percentiles[hover.key]) || 0)}`
                        : ""}
                    </p>
                  </>
                );
              })()}
            </div>
          ) : null}
        </div>

        {/* Kompaktowy pasek — Pizza + opcjonalna średnia ligowa */}
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2 px-2">
          {pizzaPlayer ? (
            <span
              className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold"
              style={{
                borderColor: theme.border,
                background: isLight ? "#f1f5f9" : "rgba(15,23,42,0.75)",
                color: theme.text,
              }}
            >
              🍕 Pizza: {pizzaPlayer.web_name}
            </span>
          ) : null}
          {showAvg ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
              style={{ borderColor: theme.border, color: theme.muted }}
            >
              {lang === "pl"
                ? `--- Linia przerywana: Średni poziom ligowy na tej pozycji (${poolSize} graczy)`
                : `--- Dashed line: League average for this position (${poolSize} players)`}
            </span>
          ) : null}
        </div>
      </div>

      {/* PRAWA — tylko kartoteki graczy (bez karty tła puli) */}
      {plotted.length >= 2 ? (
        <div className={rightColClass}>
          {plotted.length === 2 ? renderCard(1) : null}
          {plotted.length === 3 ? renderCard(1) : null}
          {plotted.length === 4 ? (
            <>
              {renderCard(1)}
              {renderCard(3)}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
