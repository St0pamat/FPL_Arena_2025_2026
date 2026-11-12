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

type PosKey = (typeof POS_KEYS)[number];
type NegKey = (typeof NEG_KEYS)[number];

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

/** AAA: w ANALYST_LIGHT WYS/60+ nie mogą być blade (#cbd5e1). */
function posSegmentColor(key: PosKey, isLight: boolean): string {
  if (isLight) {
    if (key === "appearanceBasePts") return "#64748b"; // slate-500
    if (key === "sixtyPlusPts") return "#334155"; // slate-700
  }
  return POINTS_POS_COLORS[key] ?? "#64748b";
}

function posSegmentText(bg: string, isLight: boolean): string {
  if (isLight && (bg === "#64748b" || bg === "#334155")) return "#ffffff";
  return pointsSegmentTextColor(bg);
}

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
  key: PosKey,
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
  key: NegKey,
  absPts: number,
  lang: StatsLabLang,
): string {
  const full = POINTS_NEG_LABELS[lang][key];
  const unit = lang === "pl" ? "pkt" : "pts";
  return `${full}: −${absPts} ${unit}`;
}

function posLegendLabel(key: PosKey, lang: StatsLabLang): string {
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

function negLegendLabel(key: NegKey, lang: StatsLabLang): string {
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
  key: PosKey,
): number {
  return Number(
    bd.positiveBreakdown[key as keyof typeof bd.positiveBreakdown] ?? 0,
  );
}

function readNegValue(
  bd: PlottedStatsLabPlayer["pointsBreakdown"],
  key: NegKey,
): number {
  return Number(
    bd.negativeBreakdown[key as keyof typeof bd.negativeBreakdown] ?? 0,
  );
}

function isPosCategoryKey(key: PointsSortKey): key is PosKey {
  return (POS_KEYS as readonly string[]).includes(key);
}

function isNegCategoryKey(key: PointsSortKey): key is NegKey {
  return (NEG_KEYS as readonly string[]).includes(key);
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
  const isLight = theme.id === "ANALYST_LIGHT";
  const posShort = POINTS_POS_SHORT[lang];
  const negShort = POINTS_NEG_SHORT[lang];
  const ptsUnit = lang === "pl" ? "pkt" : "pts";

  /** Tylko kategorie z ≥1 graczem ≠ 0 na aktualnym wykresie. */
  const visiblePosKeys = POS_KEYS.filter((key) =>
    players.some((p) => readPosValue(p.pointsBreakdown, key) !== 0),
  );

  const visibleNegKeys = showNegatives
    ? NEG_KEYS.filter((key) =>
        players.some((p) => Math.abs(readNegValue(p.pointsBreakdown, key)) > 0),
      )
    : [];

  // Bezpieczny fallback gdy sort wskazuje kategorię znikającą z legendy
  // (`"net"` w spec → `estimatedTotal` = oficjalne netto FPL)
  const effectiveSortKey: PointsSortKey =
    (isPosCategoryKey(sortKey) && !visiblePosKeys.includes(sortKey)) ||
    (isNegCategoryKey(sortKey) && !visibleNegKeys.includes(sortKey))
      ? "estimatedTotal"
      : sortKey;

  const sorted = [...players].sort((a, b) => {
    const av = readSortValue(a, effectiveSortKey);
    const bv = readSortValue(b, effectiveSortKey);
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
          className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[13px] font-bold ${
            isLight
              ? "border-slate-300 bg-slate-100 text-slate-800"
              : "border-white/10 bg-white/[0.04] text-slate-200"
          }`}
        >
          {inner}
        </span>
      );
    }

    const pillClass = active
      ? isLight
        ? "bg-emerald-50 border border-emerald-500 text-emerald-900 ring-1 ring-emerald-500/40"
        : "bg-white/[0.08] border border-[#39FF14]/40 text-slate-100 ring-1 ring-[#39FF14]/35"
      : isLight
        ? "bg-slate-100 border border-slate-300 text-slate-800 hover:bg-slate-200"
        : "bg-white/[0.04] border border-white/10 text-slate-200 hover:bg-white/[0.08]";

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSort(sortAs);
        }}
        className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[13px] font-bold transition ${pillClass}`}
      >
        {inner}
      </button>
    );
  }

  const sortNetActive = effectiveSortKey === "estimatedTotal";
  const sortNetBtnClass = sortNetActive
    ? isLight
      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
      : "border-[#39FF14]/50 bg-[#39FF14]/10 text-[#39FF14]"
    : isLight
      ? "border-slate-300 bg-slate-100 text-slate-700 hover:border-slate-400"
      : "border-slate-700 text-slate-300 hover:border-slate-500";

  const barTrackClass = isLight
    ? "bg-slate-100 border border-slate-200/90"
    : "bg-slate-950/60 border border-white/5";

  const subLegendClass = isLight
    ? "border border-slate-200/90 bg-slate-50 text-slate-800"
    : "border border-slate-800/80 bg-slate-900/75";

  const penLabelClass = isLight
    ? "text-rose-900 font-semibold"
    : "text-amber-300 font-medium";

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex flex-nowrap items-center gap-x-2 overflow-hidden">
          {visiblePosKeys.map((key) => (
            <LegendPill
              key={key}
              active={effectiveSortKey === key}
              color={posSegmentColor(key, isLight)}
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
              className={`ml-auto inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1 text-[12px] font-extrabold transition ${sortNetBtnClass}`}
            >
              {lang === "pl" ? "Sortuj: Suma FPL" : "Sort: FPL Net"}
              {sortNetActive ? (
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
          <div className="flex flex-nowrap items-center gap-x-2 overflow-hidden">
            <span
              className={`shrink-0 whitespace-nowrap text-[13px] font-extrabold ${
                isLight ? "text-slate-700" : ""
              }`}
              style={isLight ? undefined : { color: theme.muted }}
            >
              {lang === "pl" ? "Kary:" : "Penalties:"}
            </span>
            {visibleNegKeys.map((key) => (
              <LegendPill
                key={key}
                active={effectiveSortKey === key}
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
          const barWidthPct = (playerGross / maxGrossAmongPlotted) * 100;
          const playerPenAbs = Math.abs(bd.negativeTotal);
          const penWidthPct =
            playerPenAbs > 0 ? (playerPenAbs / maxAbsPenalty) * 100 : 0;

          const posSegments = POS_KEYS.map((key) => ({
            key,
            value: readPosValue(bd, key),
          })).filter((s) => s.value > 0);

          const negSegments = NEG_KEYS.map((key) => {
            const raw = readNegValue(bd, key);
            return { key, value: raw, abs: Math.abs(raw) };
          }).filter((s) => s.value < 0);

          const grossPillClass = isLight
            ? "bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold"
            : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold";

          const pensPillClass =
            bd.negativeTotal < 0
              ? isLight
                ? "bg-rose-100 text-rose-900 border border-rose-300 font-bold"
                : "bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold"
              : isLight
                ? "bg-slate-100 text-slate-700 border border-slate-300 font-medium"
                : "bg-white/5 text-slate-400 border border-white/10";

          return (
            <button
              key={p.fpl_element_id}
              type="button"
              onClick={() => onSelectPlayer(p.fpl_element_id)}
              className={
                isSpot
                  ? isLight
                    ? "w-full rounded-xl border border-amber-400 bg-amber-50/40 text-left ring-2 ring-amber-500"
                    : "w-full rounded-xl border border-amber-400/50 bg-amber-500/[0.06] text-left ring-2 ring-amber-400/80"
                  : "w-full rounded-xl border text-left"
              }
              style={
                isSpot
                  ? undefined
                  : {
                      borderColor: theme.border,
                      background: "transparent",
                    }
              }
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
                    isLight={isLight}
                  />
                </div>

                <div className="min-w-0 w-full space-y-1.5">
                  <div
                    className={`flex h-10 w-full overflow-hidden rounded-lg ${barTrackClass}`}
                  >
                    <div
                      className="flex h-full overflow-hidden"
                      style={{ width: `${Math.max(barWidthPct, 8)}%` }}
                    >
                      {posSegments.map((seg) => {
                        const bg = posSegmentColor(seg.key, isLight);
                        return (
                          <div
                            key={seg.key}
                            title={positiveTooltip(
                              seg.key,
                              seg.value,
                              p.element_type,
                              lang,
                            )}
                            className="flex items-center justify-center border-r border-black/10 px-0.5 text-[15px] font-black leading-none tracking-tight last:border-r-0"
                            style={{
                              flexGrow: seg.value,
                              flexShrink: 1,
                              flexBasis: 0,
                              minWidth: 32,
                              background: bg,
                              color: posSegmentText(bg, isLight),
                            }}
                          >
                            +{seg.value}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {showNegatives && playerPenAbs > 0 ? (
                    <div
                      className={`flex h-7 w-full items-center overflow-hidden rounded-md ${barTrackClass}`}
                    >
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
                  <div
                    className={`flex w-full items-center justify-between gap-2 overflow-hidden whitespace-nowrap rounded px-2.5 py-1 text-[11px] font-bold ${subLegendClass}`}
                  >
                    <div className="flex min-w-0 flex-nowrap items-center gap-x-2.5 overflow-hidden whitespace-nowrap">
                      {posSegments.map((seg) => (
                        <span
                          key={`leg-${seg.key}`}
                          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap"
                          style={{ color: theme.text }}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              background: posSegmentColor(seg.key, isLight),
                            }}
                          />
                          {posShort[seg.key]} +{seg.value}
                        </span>
                      ))}
                    </div>
                    {showNegatives && negSegments.length > 0 ? (
                      <div
                        className={`flex shrink-0 flex-nowrap items-center gap-x-2 whitespace-nowrap border-l pl-2 ${
                          isLight ? "border-slate-300" : "border-slate-700/70"
                        }`}
                      >
                        <span className={penLabelClass}>
                          {lang === "pl" ? "Kary:" : "Pens:"}
                        </span>
                        {negSegments.map((seg) => (
                          <span
                            key={`nleg-${seg.key}`}
                            className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-bold ${
                              isLight ? "text-rose-950" : ""
                            }`}
                            style={
                              isLight
                                ? undefined
                                : { color: POINTS_NEG_COLORS[seg.key] }
                            }
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                isLight ? "ring-1 ring-black/15" : ""
                              }`}
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
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-xs ${grossPillClass}`}
                  >
                    {lang === "pl" ? "Brutto" : "Gross"}: +{bd.positiveTotal}
                  </span>
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-xs ${pensPillClass}`}
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
