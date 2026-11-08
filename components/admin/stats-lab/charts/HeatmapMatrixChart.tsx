"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { PlottedStatsLabPlayer } from "@/lib/stats-lab/analyticsEngine";
import type { FplStatKey } from "@/lib/stats-lab/types";
import type { StatsLabLang, StatsLabScaleMode } from "@/lib/stats-lab/i18n";
import { statShort, t } from "@/lib/stats-lab/i18n";
import {
  formatStatDisplay,
  percentileHeatColor,
  type StatsLabChartTheme,
  type StatsLabChartThemeId,
} from "@/components/admin/stats-lab/chartTheme";
import { StatsLabPlayerIdentity } from "@/components/admin/stats-lab/StatsLabPlayerIdentity";

type Props = {
  players: PlottedStatsLabPlayer[];
  metrics: FplStatKey[];
  theme: StatsLabChartTheme;
  themeId: StatsLabChartThemeId;
  lang: StatsLabLang;
  scaleMode: StatsLabScaleMode;
  spotlightId: number | null;
  showMeta: boolean;
  sortKey: FplStatKey | "composite";
  sortDir: "DESC" | "ASC";
  onSort: (key: FplStatKey | "composite") => void;
  onSelectPlayer: (id: number) => void;
  variant?: "studio" | "export";
};

export function HeatmapMatrixChart({
  players,
  metrics,
  theme,
  themeId,
  lang,
  scaleMode,
  spotlightId,
  showMeta,
  sortKey,
  sortDir,
  onSort,
  onSelectPlayer,
  variant = "studio",
}: Props) {
  const isExport = variant === "export";
  const copy = t(lang);

  const sorted = [...players].sort((a, b) => {
    const av =
      sortKey === "composite"
        ? a.compositeScore
        : scaleMode === "PERCENTILE"
          ? (a.percentiles[sortKey] ?? 0)
          : (a.displayValues[sortKey] ?? 0);
    const bv =
      sortKey === "composite"
        ? b.compositeScore
        : scaleMode === "PERCENTILE"
          ? (b.percentiles[sortKey] ?? 0)
          : (b.displayValues[sortKey] ?? 0);
    return sortDir === "DESC" ? bv - av : av - bv;
  });

  const leaders = new Map<FplStatKey, number>();
  for (const key of metrics) {
    let bestId = -1;
    let best = -Infinity;
    for (const p of sorted) {
      const v =
        scaleMode === "PERCENTILE"
          ? (p.percentiles[key] ?? 0)
          : (p.displayValues[key] ?? 0);
      if (v > best) {
        best = v;
        bestId = p.fpl_element_id;
      }
    }
    leaders.set(key, bestId);
  }

  function SortTh({
    label,
    active,
    onClick,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
  }) {
    if (isExport) {
      return (
        <th
          className="px-3 py-3 text-center text-base font-black uppercase tracking-wider"
          style={{ color: active ? theme.accent : theme.muted }}
        >
          {label}
        </th>
      );
    }
    return (
      <th className="px-2 py-2.5 text-center">
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1 text-base font-black uppercase tracking-wider"
          style={{ color: active ? theme.accent : theme.muted }}
        >
          {label}
          {active ? (
            sortDir === "DESC" ? (
              <ArrowDown className="h-3.5 w-3.5" />
            ) : (
              <ArrowUp className="h-3.5 w-3.5" />
            )
          ) : null}
        </button>
      </th>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-xl border"
      style={{ borderColor: theme.border }}
    >
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr style={{ background: theme.panelBg }}>
            <th
              className={`sticky left-0 z-10 font-black uppercase tracking-wider ${
                isExport ? "px-4 py-3 text-base" : "px-3 py-2.5 text-base"
              }`}
              style={{ color: theme.muted, background: theme.panelBg }}
            >
              {copy.player}
            </th>
            <SortTh
              label="Comp"
              active={sortKey === "composite"}
              onClick={() => onSort("composite")}
            />
            {metrics.map((key) => (
              <SortTh
                key={key}
                label={statShort(key, lang)}
                active={sortKey === key}
                onClick={() => onSort(key)}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const isSpot = spotlightId === p.fpl_element_id;
            return (
              <tr
                key={p.fpl_element_id}
                onClick={() => onSelectPlayer(p.fpl_element_id)}
                className="cursor-pointer transition"
                style={{
                  background: isSpot ? `${theme.gold}18` : undefined,
                  boxShadow: isSpot ? `inset 3px 0 0 ${theme.gold}` : undefined,
                }}
              >
                <td
                  className={`sticky left-0 z-10 whitespace-nowrap border-t ${
                    isExport ? "px-4 py-3" : "px-3 py-2.5"
                  }`}
                  style={{
                    borderColor: theme.border,
                    background: isSpot ? theme.panelBg : theme.canvasBg,
                    color: theme.text,
                  }}
                >
                  <StatsLabPlayerIdentity
                    webName={p.web_name}
                    clubShort={p.club?.short_name ?? "—"}
                    playerCode={p.playerCode}
                    clubPulseCode={p.clubPulseCode}
                    showMeta={showMeta}
                    priceLabel={`£${(p.rawValues.now_cost / 10).toFixed(1)}m`}
                    dense
                    isLight={themeId === "ANALYST_LIGHT"}
                  />
                </td>
                <td
                  className={`border-t text-center font-black tabular-nums ${
                    isExport ? "px-3 py-3 text-xl" : "px-2 py-2.5 text-xl"
                  }`}
                  style={{ borderColor: theme.border, color: theme.accent }}
                >
                  {p.compositeScore.toFixed(0)}
                </td>
                {metrics.map((key) => {
                  const pct = p.percentiles[key] ?? 0;
                  const raw = p.displayValues[key] ?? 0;
                  const isLeader = leaders.get(key) === p.fpl_element_id;
                  return (
                    <td
                      key={key}
                      className={`border-t text-center tabular-nums ${
                        isExport ? "px-2 py-3" : "px-2 py-2.5"
                      }`}
                      style={{
                        borderColor: theme.border,
                        background:
                          scaleMode === "PERCENTILE"
                            ? percentileHeatColor(pct, themeId)
                            : isLeader
                              ? `${theme.accent}22`
                              : undefined,
                        color: theme.text,
                        fontWeight: 900,
                        fontSize: 20,
                        boxShadow: isLeader
                          ? `inset 0 -2px 0 ${theme.gold}`
                          : undefined,
                      }}
                      title={`P${pct.toFixed(0)}`}
                    >
                      {formatStatDisplay(key, raw)}
                      {scaleMode === "PERCENTILE" ? (
                        <span
                          className="ml-1 text-sm font-bold"
                          style={{ color: theme.muted }}
                        >
                          P{pct.toFixed(0)}
                        </span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
