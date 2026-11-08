"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { PlottedStatsLabPlayer } from "@/lib/stats-lab/analyticsEngine";
import type { FplStatKey } from "@/lib/stats-lab/types";
import type { StatsLabLang, StatsLabScaleMode } from "@/lib/stats-lab/i18n";
import { statShort } from "@/lib/stats-lab/i18n";
import {
  formatStatChip,
  formatStatDisplay,
  metricColor,
  type StatsLabChartTheme,
} from "@/components/admin/stats-lab/chartTheme";
import { StatsLabPlayerIdentity } from "@/components/admin/stats-lab/StatsLabPlayerIdentity";

type Props = {
  players: PlottedStatsLabPlayer[];
  metrics: FplStatKey[];
  theme: StatsLabChartTheme;
  lang: StatsLabLang;
  scaleMode: StatsLabScaleMode;
  spotlightId: number | null;
  showValues: boolean;
  showMeta: boolean;
  sortKey: FplStatKey | "composite";
  sortDir: "DESC" | "ASC";
  onSort: (key: FplStatKey | "composite") => void;
  onSelectPlayer: (id: number) => void;
  variant?: "studio" | "export";
};

export function StackedCompositeChart({
  players,
  metrics,
  theme,
  lang,
  scaleMode,
  spotlightId,
  showValues,
  showMeta,
  sortKey,
  sortDir,
  onSort,
  onSelectPlayer,
  variant = "studio",
}: Props) {
  const isExport = variant === "export";
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

  if (scaleMode === "RAW") {
    return (
      <GroupedRawBars
        players={sorted}
        metrics={metrics}
        theme={theme}
        lang={lang}
        scaleMode={scaleMode}
        spotlightId={spotlightId}
        showValues={showValues}
        showMeta={showMeta}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        onSelectPlayer={onSelectPlayer}
        variant={variant}
      />
    );
  }

  return (
    <div className={isExport ? "space-y-5" : "space-y-3"}>
      {isExport ? (
        <div className="flex flex-wrap gap-4">
          {metrics.map((key, i) => (
            <span
              key={key}
              className="inline-flex items-center gap-2 text-base font-bold"
              style={{ color: theme.muted }}
            >
              <span
                className="h-4 w-4 rounded-full"
                style={{ background: metricColor(i) }}
              />
              {statShort(key, lang)}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {metrics.map((key, i) => (
            <button
              key={key}
              type="button"
              onClick={() => onSort(key)}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{
                borderColor: sortKey === key ? metricColor(i) : theme.border,
                color: sortKey === key ? theme.accent : theme.muted,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: metricColor(i) }}
              />
              {statShort(key, lang)}
              {sortKey === key ? (
                sortDir === "DESC" ? (
                  <ArrowDown className="h-3 w-3" />
                ) : (
                  <ArrowUp className="h-3 w-3" />
                )
              ) : null}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onSort("composite")}
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase"
            style={{
              borderColor: theme.border,
              color: sortKey === "composite" ? theme.accent : theme.muted,
            }}
          >
            Comp
            {sortKey === "composite" ? (
              sortDir === "DESC" ? (
                <ArrowDown className="h-3 w-3" />
              ) : (
                <ArrowUp className="h-3 w-3" />
              )
            ) : null}
          </button>
        </div>
      )}

      <div className={isExport ? "space-y-4" : "space-y-3"}>
        {sorted.map((p, rank) => {
          const isSpot = spotlightId === p.fpl_element_id;
          const segments = metrics.map((key, i) => {
            const pct = Math.max(0, Math.min(100, p.percentiles[key] ?? 0));
            return {
              key,
              pct,
              color: metricColor(i),
              value: p.displayValues[key] ?? 0,
            };
          });
          const sumPct = segments.reduce((a, s) => a + s.pct, 0) || 1;

          return (
            <button
              key={p.fpl_element_id}
              type="button"
              onClick={() => onSelectPlayer(p.fpl_element_id)}
              className="group w-full rounded-xl border text-left transition"
              style={{
                borderColor: isSpot ? theme.gold : theme.border,
                background: isSpot ? `${theme.gold}14` : "transparent",
                boxShadow: isSpot ? `0 0 0 1px ${theme.gold}55` : undefined,
              }}
            >
              <div className="grid grid-cols-[210px_minmax(0,1fr)_125px] items-center gap-3 px-3.5 py-2.5">
                <div className="w-[210px] min-w-0 shrink-0">
                  <StatsLabPlayerIdentity
                    rank={rank + 1}
                    webName={p.web_name}
                    clubShort={p.club?.short_name ?? "—"}
                    playerCode={p.playerCode}
                    clubPulseCode={p.clubPulseCode}
                    showMeta={showMeta}
                    priceLabel={`£${(p.rawValues.now_cost / 10).toFixed(1)}m`}
                    ownershipLabel={`${p.rawValues.selected_by_percent.toFixed(1)}%`}
                  />
                </div>

                <div className="min-w-0 w-full space-y-2">
                  <div
                    className="flex h-10 w-full overflow-hidden rounded-lg"
                    style={{ background: theme.grid }}
                  >
                    {segments.map((seg) => {
                      const width = (seg.pct / sumPct) * 100;
                      return (
                        <div
                          key={seg.key}
                          title={`${statShort(seg.key, lang)}: ${formatStatChip(seg.key, seg.value, lang)} · P${seg.pct.toFixed(0)}`}
                          className="relative flex min-w-[2px] items-center justify-center overflow-hidden transition-all"
                          style={{
                            width: `${width}%`,
                            background: seg.color,
                            opacity: 0.95,
                          }}
                        >
                          {showValues && width > 9 ? (
                            <span className="truncate px-0.5 text-[15px] font-black text-slate-950">
                              {formatStatDisplay(seg.key, seg.value)}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {showValues ? (
                    <div className="flex w-full flex-wrap gap-1.5">
                      {segments.map((seg) => (
                        <span
                          key={`${p.fpl_element_id}-${seg.key}`}
                          className="rounded-md px-2 py-0.5 text-xs font-bold"
                          style={{
                            background: `${seg.color}22`,
                            color: theme.text,
                            border: `1px solid ${seg.color}55`,
                          }}
                        >
                          {formatStatChip(seg.key, seg.value, lang)}
                          <span style={{ color: theme.muted }}>
                            {" "}
                            (P{seg.pct.toFixed(0)})
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="min-w-0 text-right">
                  <div
                    className="inline-flex flex-col items-end rounded-xl border-2 px-2.5 py-1.5"
                    style={{ borderColor: "#39FF14" }}
                  >
                    <p
                      className="text-[10px] font-black uppercase tracking-wider"
                      style={{ color: "#39FF14" }}
                    >
                      Composite
                    </p>
                    <p
                      className="text-2xl font-black leading-none tabular-nums sm:text-3xl"
                      style={{ color: "#39FF14" }}
                    >
                      {p.compositeScore.toFixed(0)}
                    </p>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Small multiples — osobna skala na metrykę w trybie RAW. */
function GroupedRawBars({
  players,
  metrics,
  theme,
  lang,
  spotlightId,
  showValues,
  showMeta,
  sortKey,
  sortDir,
  onSort,
  onSelectPlayer,
  variant = "studio",
}: Props & { players: PlottedStatsLabPlayer[] }) {
  const isExport = variant === "export";
  const maxima = Object.fromEntries(
    metrics.map((k) => [
      k,
      Math.max(0.0001, ...players.map((p) => Math.abs(p.displayValues[k] ?? 0))),
    ]),
  ) as Record<FplStatKey, number>;

  return (
    <div className={isExport ? "space-y-5" : "space-y-3"}>
      {isExport ? (
        <div className="flex flex-wrap gap-4">
          {metrics.map((key, i) => (
            <span
              key={key}
              className="inline-flex items-center gap-2 text-base font-bold"
              style={{ color: theme.muted }}
            >
              <span
                className="h-4 w-4 rounded-full"
                style={{ background: metricColor(i) }}
              />
              {statShort(key, lang)}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {metrics.map((key, i) => (
            <button
              key={key}
              type="button"
              onClick={() => onSort(key)}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{
                borderColor: sortKey === key ? metricColor(i) : theme.border,
                color: sortKey === key ? theme.accent : theme.muted,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: metricColor(i) }}
              />
              {statShort(key, lang)}
              {sortKey === key ? (
                sortDir === "DESC" ? (
                  <ArrowDown className="h-3 w-3" />
                ) : (
                  <ArrowUp className="h-3 w-3" />
                )
              ) : null}
            </button>
          ))}
        </div>
      )}

      <div className={isExport ? "space-y-4" : "space-y-4"}>
        {players.map((p, rank) => {
          const isSpot = spotlightId === p.fpl_element_id;
          return (
            <button
              key={p.fpl_element_id}
              type="button"
              onClick={() => onSelectPlayer(p.fpl_element_id)}
              className="w-full rounded-xl border px-3.5 py-2.5 text-left"
              style={{
                borderColor: isSpot ? theme.gold : theme.border,
                background: isSpot ? `${theme.gold}14` : "transparent",
              }}
            >
              <div className="mb-3 w-[210px] max-w-full">
                <StatsLabPlayerIdentity
                  rank={rank + 1}
                  webName={p.web_name}
                  clubShort={p.club?.short_name ?? "—"}
                  playerCode={p.playerCode}
                  clubPulseCode={p.clubPulseCode}
                  showMeta={showMeta}
                  priceLabel={`£${(p.rawValues.now_cost / 10).toFixed(1)}m`}
                  ownershipLabel={`${p.rawValues.selected_by_percent.toFixed(1)}%`}
                />
              </div>

              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(metrics.length, 4)}, minmax(0, 1fr))`,
                }}
              >
                {metrics.map((key, i) => {
                  const val = p.displayValues[key] ?? 0;
                  const max = maxima[key];
                  const pct = Math.min(100, (Math.abs(val) / max) * 100);
                  return (
                    <div key={key} className="min-w-0">
                      <div
                        className={`mb-1 truncate font-bold uppercase ${
                          isExport ? "text-sm" : "text-[9px]"
                        }`}
                        style={{ color: theme.muted }}
                      >
                        {statShort(key, lang)}
                      </div>
                      <div
                        className={`flex items-end rounded-md px-1 pb-1 ${
                          isExport ? "h-20" : "h-16"
                        }`}
                        style={{ background: theme.grid }}
                      >
                        <div
                          className="w-full rounded-t-sm transition-all"
                          style={{
                            height: `${Math.max(4, pct)}%`,
                            background: metricColor(i),
                          }}
                          title={formatStatChip(key, val, lang)}
                        />
                      </div>
                      {showValues ? (
                        <p
                          className={`mt-1 text-center font-black tabular-nums ${
                            isExport ? "text-base" : "text-[10px]"
                          }`}
                          style={{ color: theme.text }}
                        >
                          {formatStatDisplay(key, val)}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
