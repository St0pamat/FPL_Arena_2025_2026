"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { PlottedStatsLabPlayer } from "@/lib/stats-lab/analyticsEngine";
import type { FplPositionType } from "@/lib/stats-lab/types";
import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import {
  POINTS_NEG_LABELS,
  POINTS_NEG_SHORT,
  POINTS_POS_LABELS,
  POINTS_POS_SHORT,
} from "@/lib/stats-lab/i18n";
import {
  POINTS_NEG_COLORS,
  POINTS_POS_COLORS,
  pointsSegmentTextColor,
  type StatsLabChartTheme,
} from "@/components/admin/stats-lab/chartTheme";
import { StatsLabPlayerIdentity } from "@/components/admin/stats-lab/StatsLabPlayerIdentity";

const POS_KEYS = [
  "appearanceBasePts",
  "sixtyPlusPts",
  "goalPts",
  "assistPts",
  "cleanSheetPts",
  "dcPts",
  "savePts",
  "penaltySavePts",
  "bonusPts",
] as const;

const NEG_KEYS = [
  "goalsConcededDeduction",
  "yellowCardDeduction",
  "redCardDeduction",
  "penaltyMissDeduction",
  "ownGoalDeduction",
] as const;

export type PointsSortKey =
  | "estimatedTotal"
  | "positiveTotal"
  | "negativeTotal"
  | "appearancePts"
  | (typeof POS_KEYS)[number]
  | (typeof NEG_KEYS)[number];

type Props = {
  players: PlottedStatsLabPlayer[];
  theme: StatsLabChartTheme;
  lang: StatsLabLang;
  spotlightId: number | null;
  showNegatives: boolean;
  showMeta: boolean;
  sortKey: PointsSortKey;
  sortDir: "DESC" | "ASC";
  onSort: (key: PointsSortKey) => void;
  onSelectPlayer: (id: number) => void;
  variant?: "studio" | "export";
};

function goalPtsPer(elementType: FplPositionType): number {
  if (elementType === 1) return 10;
  if (elementType === 2) return 6;
  if (elementType === 3) return 5;
  return 4;
}

function csPtsPer(elementType: FplPositionType): number {
  if (elementType === 1 || elementType === 2) return 4;
  if (elementType === 3) return 1;
  return 0;
}

function positiveTooltip(
  key: (typeof POS_KEYS)[number],
  pts: number,
  elementType: FplPositionType,
  lang: StatsLabLang,
): string {
  const full = POINTS_POS_LABELS[lang][key] ?? key;
  const unit = lang === "pl" ? "pkt" : "pts";
  if (key === "goalPts") {
    const per = goalPtsPer(elementType);
    const n = per > 0 ? pts / per : 0;
    return `${full}: ${n} × ${per} = +${pts} ${unit}`;
  }
  if (key === "assistPts") {
    return `${full}: ${pts / 3} × 3 = +${pts} ${unit}`;
  }
  if (key === "cleanSheetPts") {
    const per = csPtsPer(elementType);
    const n = per > 0 ? pts / per : 0;
    return `${full}: ${n} × ${per} = +${pts} ${unit}`;
  }
  if (key === "dcPts") {
    return `${full}: ${pts / 2} × 2 = +${pts} ${unit}`;
  }
  return `${full}: +${pts} ${unit}`;
}

function negativeTooltip(
  key: (typeof NEG_KEYS)[number],
  absPts: number,
  lang: StatsLabLang,
): string {
  const full = POINTS_NEG_LABELS[lang][key];
  const unit = lang === "pl" ? "pkt" : "pts";
  return `${full}: −${absPts} ${unit}`;
}

function posLegendLabel(
  key: (typeof POS_KEYS)[number],
  lang: StatsLabLang,
): string {
  if (lang === "pl") {
    if (key === "appearanceBasePts") return "Występ (WYS)";
    if (key === "sixtyPlusPts") return "60+ min";
    if (key === "goalPts") return "Gole (GOL)";
    if (key === "assistPts") return "Asysty (AST)";
    if (key === "cleanSheetPts") return "Czyste konta (CS)";
    if (key === "dcPts") return "Def. Contrib. (DC)";
    if (key === "savePts") return "Obrony (OBR)";
    if (key === "penaltySavePts") return "Karne (KAR)";
    return "Bonus (BON)";
  }
  if (key === "appearanceBasePts") return "Appearance (APP)";
  if (key === "sixtyPlusPts") return "60+ mins";
  if (key === "goalPts") return "Goals (GOL)";
  if (key === "assistPts") return "Assists (AST)";
  if (key === "cleanSheetPts") return "Clean sheets (CS)";
  if (key === "dcPts") return "Def. Contrib. (DC)";
  if (key === "savePts") return "Saves (SV)";
  if (key === "penaltySavePts") return "Pen. saved (PS)";
  return "Bonus (BON)";
}

function negLegendLabel(key: (typeof NEG_KEYS)[number], lang: StatsLabLang): string {
  if (lang === "pl") {
    if (key === "goalsConcededDeduction") return "Stracone gole (GC)";
    if (key === "yellowCardDeduction") return "Żółte kartki (ŻK)";
    if (key === "redCardDeduction") return "Czerwone kartki (CK)";
    if (key === "penaltyMissDeduction") return "Zmarnowane karne (PK-)";
    return "Samobóje (OG)";
  }
  if (key === "goalsConcededDeduction") return "Goals conceded (GC)";
  if (key === "yellowCardDeduction") return "Yellow cards (YC)";
  if (key === "redCardDeduction") return "Red cards (RC)";
  if (key === "penaltyMissDeduction") return "Penalties missed (PK-)";
  return "Own goals (OG)";
}

function readPosValue(
  bd: PlottedStatsLabPlayer["pointsBreakdown"],
  key: (typeof POS_KEYS)[number],
): number {
  return Number(
    bd.positiveBreakdown[key as keyof typeof bd.positiveBreakdown] ?? 0,
  );
}

export function PointsBreakdownChart({
  players,
  theme,
  lang,
  spotlightId,
  showNegatives,
  showMeta,
  sortKey,
  sortDir,
  onSort,
  onSelectPlayer,
  variant = "studio",
}: Props) {
  const isExport = variant === "export";
  const posShort = POINTS_POS_SHORT[lang];
  const negShort = POINTS_NEG_SHORT[lang];
  const ptsUnit = lang === "pl" ? "pkt" : "pts";

  const sorted = [...players].sort((a, b) => {
    const av = readSortValue(a, sortKey);
    const bv = readSortValue(b, sortKey);
    return sortDir === "DESC" ? bv - av : av - bv;
  });

  const maxGrossAmongPlotted = Math.max(
    1,
    ...sorted.map((p) => p.pointsBreakdown.positiveTotal),
  );
  const maxAbsPenalty = Math.max(
    6,
    ...sorted.map((p) => Math.abs(p.pointsBreakdown.negativeTotal)),
  );

  const hasGkOnChart = sorted.some((p) => p.element_type === 1);
  const sumSavePts = sorted.reduce(
    (a, p) => a + Number(p.pointsBreakdown.positiveBreakdown.savePts ?? 0),
    0,
  );
  const sumPenSavePts = sorted.reduce(
    (a, p) =>
      a + Number(p.pointsBreakdown.positiveBreakdown.penaltySavePts ?? 0),
    0,
  );

  const visiblePosKeys = POS_KEYS.filter((key) => {
    if (key === "savePts") return hasGkOnChart || sumSavePts > 0;
    if (key === "penaltySavePts") return sumPenSavePts > 0;
    return true;
  });

  const negTotals = Object.fromEntries(
    NEG_KEYS.map((key) => [
      key,
      sorted.reduce(
        (a, p) =>
          a +
          Math.abs(
            Number(
              p.pointsBreakdown.negativeBreakdown[
                key as keyof typeof p.pointsBreakdown.negativeBreakdown
              ] ?? 0,
            ),
          ),
        0,
      ),
    ]),
  ) as Record<(typeof NEG_KEYS)[number], number>;

  const anyNegOnChart = NEG_KEYS.some((k) => negTotals[k] > 0);
  const visibleNegKeys = showNegatives
    ? NEG_KEYS.filter((key) => {
        if (negTotals[key] > 0) return true;
        // Podstawowe GC / kartki gdy brak jakichkolwiek kar na wykresie
        if (!anyNegOnChart) {
          return (
            key === "goalsConcededDeduction" ||
            key === "yellowCardDeduction" ||
            key === "redCardDeduction"
          );
        }
        return false;
      })
    : [];

  function LegendPill({
    active,
    color,
    label,
    sortAs,
  }: {
    active: boolean;
    color: string;
    label: string;
    sortAs: PointsSortKey;
  }) {
    const inner = (
      <>
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ background: color }}
        />
        <span>{label}</span>
        {active && !isExport ? (
          sortDir === "DESC" ? (
            <ArrowDown className="h-3 w-3 shrink-0" />
          ) : (
            <ArrowUp className="h-3 w-3 shrink-0" />
          )
        ) : null}
      </>
    );

    if (isExport) {
      return (
        <span
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] font-bold"
          style={{ color: theme.muted }}
        >
          {inner}
        </span>
      );
    }

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSort(sortAs);
        }}
        className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[13px] font-bold transition ${
          active ? "bg-white/5 ring-1 ring-[#39FF14]/35" : "hover:opacity-90"
        }`}
        style={{
          color: active ? theme.text : theme.muted,
        }}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex flex-nowrap items-center gap-x-3 overflow-hidden">
          {visiblePosKeys.map((key) => (
            <LegendPill
              key={key}
              active={sortKey === key}
              color={POINTS_POS_COLORS[key]}
              label={posLegendLabel(key, lang)}
              sortAs={key}
            />
          ))}
          {!isExport ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSort("estimatedTotal");
              }}
              className={`ml-auto inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1 text-[12px] font-extrabold transition ${
                sortKey === "estimatedTotal"
                  ? "border-[#39FF14]/50 bg-[#39FF14]/10 text-[#39FF14]"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              {lang === "pl" ? "Sortuj: Suma FPL" : "Sort: FPL Net"}
              {sortKey === "estimatedTotal" ? (
                sortDir === "DESC" ? (
                  <ArrowDown className="h-3.5 w-3.5" />
                ) : (
                  <ArrowUp className="h-3.5 w-3.5" />
                )
              ) : (
                <ArrowDown className="h-3.5 w-3.5 opacity-40" />
              )}
            </button>
          ) : null}
        </div>
        {showNegatives && visibleNegKeys.length > 0 ? (
          <div className="flex flex-nowrap items-center gap-x-3 overflow-hidden">
            <span
              className="shrink-0 whitespace-nowrap text-[13px] font-extrabold"
              style={{ color: theme.muted }}
            >
              {lang === "pl" ? "Kary:" : "Penalties:"}
            </span>
            {visibleNegKeys.map((key) => (
              <LegendPill
                key={key}
                active={sortKey === key}
                color={POINTS_NEG_COLORS[key]}
                label={negLegendLabel(key, lang)}
                sortAs={key}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        {sorted.map((p, rank) => {
          const bd = p.pointsBreakdown;
          const isSpot = spotlightId === p.fpl_element_id;
          const playerGross = Math.max(0, bd.positiveTotal);
          const barWidthPct =
            (playerGross / maxGrossAmongPlotted) * 100;
          const playerPenAbs = Math.abs(bd.negativeTotal);
          const penWidthPct =
            playerPenAbs > 0
              ? (playerPenAbs / maxAbsPenalty) * 100
              : 0;

          const posSegments = POS_KEYS.map((key) => ({
            key,
            value: readPosValue(bd, key),
          })).filter((s) => s.value > 0);

          const negSegments = NEG_KEYS.map((key) => {
            const raw = Number(
              bd.negativeBreakdown[
                key as keyof typeof bd.negativeBreakdown
              ] ?? 0,
            );
            return { key, value: raw, abs: Math.abs(raw) };
          }).filter((s) => s.value < 0);

          return (
            <button
              key={p.fpl_element_id}
              type="button"
              onClick={() => onSelectPlayer(p.fpl_element_id)}
              className="w-full rounded-xl border text-left"
              style={{
                borderColor: isSpot ? theme.gold : theme.border,
                background: isSpot ? `${theme.gold}14` : "transparent",
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
                    isLight={theme.id === "ANALYST_LIGHT"}
                  />
                </div>

                <div className="min-w-0 w-full space-y-1.5">
                  <div className="flex h-10 w-full overflow-hidden rounded-lg bg-slate-900/90">
                    <div
                      className="flex h-full overflow-hidden"
                      style={{ width: `${Math.max(barWidthPct, 8)}%` }}
                    >
                      {posSegments.map((seg) => {
                        const bg = POINTS_POS_COLORS[seg.key];
                        return (
                          <div
                            key={seg.key}
                            title={positiveTooltip(
                              seg.key,
                              seg.value,
                              p.element_type,
                              lang,
                            )}
                            className="flex items-center justify-center border-r border-slate-950/40 px-0.5 text-[15px] font-black leading-none tracking-tight last:border-r-0"
                            style={{
                              flexGrow: seg.value,
                              flexShrink: 1,
                              flexBasis: 0,
                              minWidth: 32,
                              background: bg,
                              color: pointsSegmentTextColor(bg),
                            }}
                          >
                            +{seg.value}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {showNegatives && playerPenAbs > 0 ? (
                    <div className="flex h-7 w-full items-center overflow-hidden rounded-md border border-rose-500/20 bg-slate-900/85">
                      <div
                        className="flex h-full"
                        style={{
                          width: `${penWidthPct}%`,
                          minWidth: negSegments.length * 88,
                        }}
                      >
                        {negSegments.map((seg) => {
                          const bg = POINTS_NEG_COLORS[seg.key];
                          return (
                            <div
                              key={seg.key}
                              title={negativeTooltip(seg.key, seg.abs, lang)}
                              className="flex h-full items-center justify-center whitespace-nowrap px-2 text-xs font-black"
                              style={{
                                flexGrow: seg.abs,
                                flexShrink: 1,
                                flexBasis: 0,
                                minWidth: 88,
                                background: bg,
                                color: pointsSegmentTextColor(bg),
                              }}
                            >
                              {negShort[seg.key]}: −{seg.abs} {ptsUnit}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {/* Jednoliniowa pod-legenda — stała wysokość u każdego gracza */}
                  <div className="flex w-full items-center justify-between gap-2 overflow-hidden whitespace-nowrap rounded border border-slate-800/80 bg-slate-900/75 px-2.5 py-1 text-[11px] font-bold">
                    <div className="flex min-w-0 flex-nowrap items-center gap-x-2.5 overflow-hidden whitespace-nowrap">
                      {posSegments.map((seg) => (
                        <span
                          key={`leg-${seg.key}`}
                          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap"
                          style={{ color: theme.text }}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: POINTS_POS_COLORS[seg.key] }}
                          />
                          {posShort[seg.key]} +{seg.value}
                        </span>
                      ))}
                    </div>
                    {showNegatives && negSegments.length > 0 ? (
                      <div className="flex shrink-0 flex-nowrap items-center gap-x-2 whitespace-nowrap border-l border-slate-700/70 pl-2">
                        <span className="text-rose-300">
                          {lang === "pl" ? "Kary:" : "Pens:"}
                        </span>
                        {negSegments.map((seg) => (
                          <span
                            key={`nleg-${seg.key}`}
                            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap"
                            style={{ color: POINTS_NEG_COLORS[seg.key] }}
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{
                                background: POINTS_NEG_COLORS[seg.key],
                              }}
                            />
                            {negShort[seg.key]} −{seg.abs}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex w-[125px] shrink-0 flex-col items-end gap-1 text-right">
                  <p
                    className="whitespace-nowrap text-2xl font-black leading-none tabular-nums"
                    style={{ color: theme.text }}
                  >
                    {bd.estimatedTotal}{" "}
                    <span
                      className="text-sm font-bold"
                      style={{ color: theme.muted }}
                    >
                      {ptsUnit}
                    </span>
                  </p>
                  <span className="shrink-0 whitespace-nowrap rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-extrabold text-emerald-300">
                    {lang === "pl" ? "Brutto" : "Gross"}: +{bd.positiveTotal}
                  </span>
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-extrabold ${
                      bd.negativeTotal < 0
                        ? "bg-rose-500/25 text-rose-300"
                        : "bg-slate-800/80 text-slate-400"
                    }`}
                  >
                    {lang === "pl" ? "Kary" : "Pens"}:{" "}
                    {bd.negativeTotal < 0 ? bd.negativeTotal : 0}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function readSortValue(
  p: PlottedStatsLabPlayer,
  key: PointsSortKey,
): number {
  const bd = p.pointsBreakdown;
  if (key === "estimatedTotal") return bd.estimatedTotal;
  if (key === "positiveTotal") return bd.positiveTotal;
  if (key === "negativeTotal") return bd.negativeTotal;
  if (key === "appearancePts") return bd.positiveBreakdown.appearancePts;
  if (key in bd.positiveBreakdown) {
    return Number(
      bd.positiveBreakdown[key as keyof typeof bd.positiveBreakdown] ?? 0,
    );
  }
  return Number(
    bd.negativeBreakdown[key as keyof typeof bd.negativeBreakdown] ?? 0,
  );
}
