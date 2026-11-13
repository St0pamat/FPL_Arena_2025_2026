"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  Zap,
} from "lucide-react";
import type { StatsLabChartThemeId } from "@/components/admin/stats-lab/chartTheme";
import {
  shellLabel,
  shellTooltip,
  type StatsLabLang,
} from "@/lib/stats-lab/i18n";
import type { PlannerValueSource } from "@/lib/stats-lab/fplEntryApi";
import type {
  EvaluatedGwState,
  PlannerValidationErrorKey,
} from "@/lib/stats-lab/plannerEngine";
import {
  formatTenthsAsPounds,
  PLANNER_CHIP_LABEL_KEY,
  plannerSourceLabel,
  plannerTileMetricLabel,
  pt,
  ptTip,
  resolvePlannerWarning,
  resolvePlannerValidationError,
  type PlannerChipType,
  type PlannerDraftVariant,
  type PlannerTileMetric,
  type PlannerWarning,
} from "@/lib/stats-lab/plannerI18n";
import type { PlannerDraftSummaryMetrics } from "@/lib/stats-lab/plannerEngine";
import {
  formatChipAccessibleName,
  formatGwPillAccessibleName,
  formatHitBar,
  formatTransfersBadgeTooltip,
} from "@/lib/stats-lab/plannerUiFormat";
import { getStatsLabMenuChrome } from "@/lib/stats-lab/menuChrome";

const TEAM_ID_STORAGE_KEY = "fpl-arena-planner-team-id";

export type PlannerDraftSummary = PlannerDraftSummaryMetrics;

export type PlannerGwStripMarker = {
  transferCount?: number;
  chip?: PlannerChipType | null;
  hasValidationIssue?: boolean;
};

export type PlannerHeaderAndControlsProps = {
  themeId: StatsLabChartThemeId;
  lang: StatsLabLang;
  teamIdInput: string;
  onTeamIdInputChange: (value: string) => void;
  onLoadTeam: () => void;
  onLoadDemo: () => void;
  isLoadingTeam?: boolean;
  teamName?: string | null;
  managerName?: string | null;
  rolledBackFromFreeHit?: boolean;

  activeVariant: PlannerDraftVariant;
  onSelectVariant: (v: PlannerDraftVariant) => void;
  onCopyVariantTo: (target: PlannerDraftVariant) => void;
  draftSummaries: PlannerDraftSummary[];
  variantsIdentical?: boolean;
  planningStartGw: number;
  planningEndGw: number;

  currentGw: number;
  availableGameweeks: number[];
  onSelectGw: (gw: number) => void;
  gwMarkers?: Record<number, PlannerGwStripMarker>;
  deadlineIso?: string | null;

  freeTransfers: number;
  freeTransfersSource: PlannerValueSource;
  hitsCostPts: number;
  bankTenths: number;
  bankSource: PlannerValueSource;
  grossXPts: number;
  netXPts: number;
  spendingPowerTenths: number;

  onManualSetFt?: (ft: number) => void;
  onManualAdjustBankTenths?: (deltaTenths: number) => void;
  onManualSetBankTenths?: (bankTenths: number) => void;

  activeChip: PlannerChipType | null;
  usedChipsByType: Partial<Record<PlannerChipType, number>>;
  onToggleChip: (chip: PlannerChipType) => void;

  tileMetric: PlannerTileMetric;
  onTileMetricChange: (m: PlannerTileMetric) => void;

  onOptimiseXi: () => void;
  onUndo: () => void;
  onResetGw: () => void;
  onResetPlan: () => void;
  canUndo?: boolean;

  validationErrors?: Array<{
    key: PlannerValidationErrorKey;
    detail?: string;
  }>;
  validationWarnings?: PlannerWarning[];
  evaluatedGw?: EvaluatedGwState | null;
};

/** Tylko klasy `bg-*` z chrome.panel — sticky bez dodatkowego bordera/cienia. */
function chromePanelBg(panelClass: string): string {
  return panelClass
    .split(/\s+/)
    .filter((cls) => cls.startsWith("bg-"))
    .join(" ");
}

const TILE_METRIC_OPTIONS: PlannerTileMetric[] = [
  "FIXTURES",
  "XPTS",
  "PRICES",
  "FORM",
  "DC",
];

export function PlannerHeaderAndControls({
  themeId,
  lang,
  teamIdInput,
  onTeamIdInputChange,
  onLoadTeam,
  onLoadDemo,
  isLoadingTeam = false,
  teamName,
  managerName,
  rolledBackFromFreeHit = false,
  activeVariant,
  onSelectVariant,
  onCopyVariantTo,
  draftSummaries,
  variantsIdentical = false,
  planningStartGw,
  planningEndGw,
  currentGw,
  availableGameweeks,
  onSelectGw,
  gwMarkers,
  deadlineIso,
  freeTransfers,
  freeTransfersSource,
  hitsCostPts,
  bankTenths,
  bankSource,
  grossXPts,
  netXPts,
  spendingPowerTenths,
  onManualSetFt,
  onManualAdjustBankTenths,
  onManualSetBankTenths,
  activeChip,
  usedChipsByType,
  onToggleChip,
  tileMetric,
  onTileMetricChange,
  onOptimiseXi,
  onUndo,
  onResetGw,
  onResetPlan,
  canUndo = false,
  validationErrors,
  validationWarnings,
  evaluatedGw,
}: PlannerHeaderAndControlsProps) {
  const chrome = getStatsLabMenuChrome(themeId);
  const isLight = chrome.isLight;
  const emdash = shellLabel(lang, "common.emdash");
  const [showCompare, setShowCompare] = useState(false);
  const [deadlineCollapsed, setDeadlineCollapsed] = useState(false);
  const [editFtOpen, setEditFtOpen] = useState(false);
  const [editBankOpen, setEditBankOpen] = useState(false);
  const [bankDraft, setBankDraft] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(TEAM_ID_STORAGE_KEY);
      if (saved && !teamIdInput) onTeamIdInputChange(saved);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once
  }, []);

  useEffect(() => {
    try {
      if (teamIdInput.trim()) {
        window.localStorage.setItem(TEAM_ID_STORAGE_KEY, teamIdInput.trim());
      }
    } catch {
      /* ignore */
    }
  }, [teamIdInput]);

  useEffect(() => {
    if (!deadlineIso || deadlineCollapsed) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [deadlineIso, deadlineCollapsed]);

  const countdown = useMemo(() => {
    if (!deadlineIso) return null;
    const target = Date.parse(deadlineIso);
    if (!Number.isFinite(target)) return null;
    const diff = Math.max(0, target - nowMs);
    const sec = Math.floor(diff / 1000);
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return { days, hours, mins, secs };
  }, [deadlineIso, nowMs]);

  const errors =
    validationErrors ??
    evaluatedGw?.errors ??
    [];
  const warnings =
    validationWarnings ??
    evaluatedGw?.warnings ??
    [];

  const gwIdx = availableGameweeks.indexOf(currentGw);
  const prevGw =
    gwIdx > 0 ? availableGameweeks[gwIdx - 1] : null;
  const nextGw =
    gwIdx >= 0 && gwIdx < availableGameweeks.length - 1
      ? availableGameweeks[gwIdx + 1]
      : null;

  const optionClass = chrome.option;
  const panelBg = chromePanelBg(chrome.panel);

  return (
    <div className="space-y-3">
      {/* Team load + drafts */}
      <section className={`rounded-2xl border p-3 sm:p-4 ${chrome.panel}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
            <label className="block min-w-[160px] flex-1">
              <span className={`mb-1 block text-[10px] font-black uppercase tracking-wider ${chrome.mutedLabel}`}>
                {pt(lang, "planner.teamId")}
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={teamIdInput}
                onChange={(e) => onTeamIdInputChange(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-sm font-semibold outline-none ${chrome.input}`}
                placeholder="1234567"
              />
            </label>
            <button
              type="button"
              disabled={isLoadingTeam}
              onClick={onLoadTeam}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-black uppercase ${chrome.activeBtn}`}
            >
              {isLoadingTeam ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              {pt(lang, "planner.loadSquad")}
            </button>
            <button
              type="button"
              disabled={isLoadingTeam}
              onClick={onLoadDemo}
              className={`rounded-xl px-3 py-2 text-xs font-black uppercase ${chrome.inactiveBtn}`}
            >
              {shellLabel(lang, "common.demoSquad")}
            </button>
          </div>

          <div className="text-left lg:text-right">
            {teamName ? (
              <p className={`text-sm font-black ${chrome.text}`}>
                {teamName}
                {managerName ? (
                  <span className={`font-semibold ${chrome.mutedLabel}`}>
                    {" "}
                    · {managerName}
                  </span>
                ) : null}
              </p>
            ) : (
              <p className={`text-xs font-semibold ${chrome.mutedLabel}`}>
                {lang === "pl"
                  ? "Brak wczytanej drużyny"
                  : "No team loaded"}
              </p>
            )}
            {rolledBackFromFreeHit ? (
              <p
                className={`mt-1 text-[10px] font-bold ${
                  isLight ? "text-amber-800" : "text-amber-200"
                }`}
              >
                {pt(lang, "planner.rule.r8.freehitReturn")}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`text-[10px] font-black uppercase ${chrome.mutedLabel}`}>
            {pt(lang, "planner.variant.menu")}
          </span>
          {(["A", "B", "C"] as PlannerDraftVariant[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onSelectVariant(v)}
              className={`rounded-xl px-3 py-1.5 text-xs font-black ${
                activeVariant === v ? chrome.activeBtn : chrome.inactiveBtn
              }`}
            >
              {pt(lang, "planner.variant.label", { id: v })}
            </button>
          ))}
          <div className="flex flex-wrap gap-1.5">
            {(["B", "C"] as PlannerDraftVariant[])
              .filter((t) => t !== activeVariant)
              .map((t) => (
                <button
                  key={`copy-${t}`}
                  type="button"
                  onClick={() => onCopyVariantTo(t)}
                  className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] font-black uppercase ${chrome.secondaryBtn}`}
                >
                  <Copy className="h-3 w-3" />
                  {pt(lang, "planner.variant.copyTo", { id: t })}
                </button>
              ))}
            {activeVariant !== "A" ? (
              <button
                type="button"
                onClick={() => onCopyVariantTo("A")}
                className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] font-black uppercase ${chrome.secondaryBtn}`}
              >
                <Copy className="h-3 w-3" />
                {pt(lang, "planner.variant.copyTo", { id: "A" })}
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setShowCompare((s) => !s)}
            className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase ${
              showCompare ? chrome.activeBtn : chrome.inactiveBtn
            }`}
          >
            {pt(lang, "planner.variant.compare")}
          </button>
        </div>

        {showCompare ? (
          <div className="mt-3 space-y-2">
            {variantsIdentical ? (
              <p
                className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                  isLight
                    ? "border-amber-400 bg-amber-50 text-amber-950"
                    : "border-amber-400/50 bg-amber-500/15 text-amber-100"
                }`}
              >
                {pt(lang, "planner.compare.identical")}
              </p>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                <thead>
                  <tr className={chrome.mutedLabel}>
                    <th
                      className={`sticky left-0 z-10 px-2 py-1.5 font-black uppercase ${panelBg}`}
                    >
                      {pt(lang, "planner.draft.variant")}
                    </th>
                    <th className="px-2 py-1.5 font-black uppercase">
                      {pt(lang, "planner.xpts.nextGw", {
                        gw: planningStartGw,
                      })}
                    </th>
                    <th className="px-2 py-1.5 font-black uppercase">
                      {pt(lang, "planner.xpts.horizonSum", {
                        from: planningStartGw,
                        to: planningEndGw,
                      })}
                    </th>
                    <th className="px-2 py-1.5 font-black uppercase">
                      {pt(lang, "planner.compare.hits")}
                    </th>
                    <th className="px-2 py-1.5 font-black uppercase">
                      {pt(lang, "planner.kpi.bank")}
                    </th>
                    <th className="px-2 py-1.5 font-black uppercase">
                      {pt(lang, "planner.ft.nextGw", { gw: planningStartGw })}
                    </th>
                    <th className="px-2 py-1.5 font-black uppercase">
                      {pt(lang, "planner.ft.endOfPlan")}
                    </th>
                    <th className="px-2 py-1.5 font-black uppercase">
                      {pt(lang, "planner.compare.chips")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(["A", "B", "C"] as PlannerDraftVariant[]).map((v) => {
                    const s =
                      draftSummaries.find((d) => d.variant === v) ?? {
                        variant: v,
                        xPtsNextGw: null,
                        xPtsHorizonSum: 0,
                        xPtsHorizonNet: 0,
                        ftNextGw: null,
                        ftEndOfPlan: null,
                        totalHitPts: 0,
                        finalBankTenths: 0,
                        chipsByGw: {},
                      };
                    const chipEntries = Object.entries(s.chipsByGw);
                    const chips =
                      chipEntries.length === 0
                        ? pt(lang, "planner.compare.noChip")
                        : chipEntries
                            .map(
                              ([gw, chip]) =>
                                `${pt(lang, PLANNER_CHIP_LABEL_KEY[chip as PlannerChipType])} (GW${gw})`,
                            )
                            .join(", ");
                    const showNetAndGross =
                      s.xPtsHorizonNet !== s.xPtsHorizonSum;
                    const mainHorizon = showNetAndGross
                      ? s.xPtsHorizonNet
                      : s.xPtsHorizonSum;
                    const rowActive = activeVariant === v;
                    const sameAsA =
                      variantsIdentical && v !== "A"
                        ? pt(lang, "planner.compare.sameAs", { v: "A" })
                        : null;
                    const stickyBg = rowActive
                      ? isLight
                        ? "bg-[#0f766e]/10"
                        : chrome.isScout
                          ? "bg-[#2dd4bf]/10"
                          : "bg-[#39FF14]/10"
                      : panelBg;
                    return (
                      <tr
                        key={v}
                        className={`border-t ${
                          isLight ? "border-slate-200" : "border-slate-800"
                        } ${
                          rowActive
                            ? isLight
                              ? "bg-[#0f766e]/10"
                              : chrome.isScout
                                ? "bg-[#2dd4bf]/10"
                                : "bg-[#39FF14]/10"
                            : ""
                        }`}
                      >
                        <td
                          className={`sticky left-0 z-10 px-2 py-2 font-black ${chrome.text} ${stickyBg}`}
                        >
                          {v}
                          {sameAsA ? (
                            <span
                              className={`mt-0.5 block text-[10px] font-semibold ${chrome.mutedLabel}`}
                            >
                              {sameAsA}
                            </span>
                          ) : null}
                        </td>
                        <td
                          className={`px-2 py-2 font-normal tabular-nums ${chrome.text}`}
                        >
                          {sameAsA
                            ? emdash
                            : s.xPtsNextGw == null
                              ? emdash
                              : s.xPtsNextGw.toFixed(1)}
                        </td>
                        <td className={`px-2 py-2 tabular-nums ${chrome.text}`}>
                          {showNetAndGross ? (
                            <div>
                              <div>
                                <span className="font-bold">
                                  {mainHorizon.toFixed(1)}
                                </span>
                                <span
                                  className={`ml-1.5 font-normal ${chrome.mutedLabel}`}
                                >
                                  {pt(lang, "planner.hit.netto")}
                                </span>
                              </div>
                              <div
                                className={`text-[10px] font-normal ${chrome.mutedLabel}`}
                              >
                                {pt(lang, "planner.hit.brutto", {
                                  value: s.xPtsHorizonSum.toFixed(1),
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="font-bold">
                              {mainHorizon.toFixed(1)}
                            </span>
                          )}
                        </td>
                        <td
                          className={`px-2 py-2 font-bold tabular-nums ${
                            s.totalHitPts > 0
                              ? isLight
                                ? "text-rose-700"
                                : "text-rose-300"
                              : chrome.text
                          }`}
                        >
                          {s.totalHitPts > 0
                            ? `−${s.totalHitPts}`
                            : "0"}
                        </td>
                        <td
                          className={`px-2 py-2 font-bold tabular-nums ${chrome.text}`}
                        >
                          {formatTenthsAsPounds(s.finalBankTenths)}
                        </td>
                        <td
                          className={`px-2 py-2 font-normal tabular-nums ${chrome.text}`}
                        >
                          {s.ftNextGw == null ? emdash : s.ftNextGw}
                        </td>
                        <td
                          className={`px-2 py-2 font-normal tabular-nums ${chrome.text}`}
                        >
                          {s.ftEndOfPlan == null ? emdash : s.ftEndOfPlan}
                        </td>
                        <td
                          className={`px-2 py-2 font-semibold ${chrome.mutedLabel}`}
                        >
                          {sameAsA ? emdash : chips}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      {/* GW strip + deadline */}
      <section className={`rounded-2xl border p-3 sm:p-4 ${chrome.panel}`}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={prevGw == null}
            onClick={() => prevGw != null && onSelectGw(prevGw)}
            title={ptTip(lang, "planner.gw.prev")}
            aria-label={ptTip(lang, "planner.gw.prev")}
            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] font-black uppercase disabled:opacity-40 ${chrome.inactiveBtn}`}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {pt(lang, "planner.gw.prev")}
          </button>
          <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1">
            {availableGameweeks.map((gw) => {
              const marker = gwMarkers?.[gw];
              const active = gw === currentGw;
              const transferCount = marker?.transferCount ?? 0;
              return (
                <button
                  key={gw}
                  type="button"
                  onClick={() => onSelectGw(gw)}
                  aria-label={formatGwPillAccessibleName({
                    lang,
                    gw,
                    transferCount,
                  })}
                  className={`relative shrink-0 rounded-xl px-2.5 py-1.5 text-[11px] font-black ${
                    active ? chrome.activeBtn : chrome.inactiveBtn
                  }`}
                >
                  <span className="block">GW{gw}</span>
                  <span className="mt-0.5 flex justify-center gap-0.5 text-[8px] font-bold leading-none opacity-90">
                    {transferCount > 0 ? (
                      <span
                        title={formatTransfersBadgeTooltip(lang, transferCount)}
                        className="rounded bg-black/20 px-1"
                      >
                        {transferCount} ⇄
                      </span>
                    ) : null}
                    {marker?.chip ? (
                      <span>
                        {pt(lang, PLANNER_CHIP_LABEL_KEY[marker.chip])}
                      </span>
                    ) : null}
                    {marker?.hasValidationIssue ? (
                      <span aria-hidden>⚠️</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={nextGw == null}
            onClick={() => nextGw != null && onSelectGw(nextGw)}
            title={ptTip(lang, "planner.gw.next")}
            aria-label={ptTip(lang, "planner.gw.next")}
            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] font-black uppercase disabled:opacity-40 ${chrome.inactiveBtn}`}
          >
            {pt(lang, "planner.gw.next")}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {countdown ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setDeadlineCollapsed((c) => !c)}
              title={shellTooltip(lang, "common.deadline")}
              className={`mb-2 inline-flex min-h-[28px] items-center gap-1.5 rounded-xl px-3 py-1 text-[10px] font-black uppercase transition-colors ${chrome.inactiveBtn}`}
            >
              {shellLabel(lang, "common.deadline")} ·{" "}
              {shellLabel(lang, "common.gw", { gw: currentGw })}{" "}
              {deadlineCollapsed
                ? (lang === "pl" ? "(rozwiń)" : "(expand)")
                : (lang === "pl" ? "(zwiń)" : "(collapse)")}
            </button>
            {!deadlineCollapsed ? (
              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    [lang === "pl" ? "DNI" : "DAYS", countdown.days],
                    [lang === "pl" ? "GODZ" : "HRS", countdown.hours],
                    [lang === "pl" ? "MIN" : "MIN", countdown.mins],
                    [lang === "pl" ? "SEK" : "SEC", countdown.secs],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className={`rounded-xl border px-2 py-2 text-center ${chrome.group}`}
                  >
                    <p className={`text-[9px] font-black uppercase ${chrome.mutedLabel}`}>
                      {label}
                    </p>
                    <p className={`text-lg font-black tabular-nums ${chrome.text}`}>
                      {String(value).padStart(2, "0")}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* KPI tiles */}
      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <KpiTile
          chrome={chrome}
          isLight={isLight}
          label={pt(lang, "planner.ft.nextGw", { gw: planningStartGw })}
          value={`${freeTransfers} FT`}
          source={plannerSourceLabel(lang, freeTransfersSource)}
          editTitle={pt(lang, "planner.action.editFt")}
          onEdit={
            onManualSetFt
              ? () => setEditFtOpen((o) => !o)
              : undefined
          }
        >
          {editFtOpen && onManualSetFt ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    onManualSetFt(n);
                    setEditFtOpen(false);
                  }}
                  className={`rounded-lg px-2 py-1 text-[10px] font-black ${
                    freeTransfers === n
                      ? chrome.activeBtn
                      : chrome.inactiveBtn
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          ) : null}
        </KpiTile>

        <KpiTile
          chrome={chrome}
          isLight={isLight}
          label={pt(lang, "planner.kpi.cost")}
          value={
            hitsCostPts > 0 ? `−${hitsCostPts} pkt` : "0 pkt"
          }
          valueClass={
            hitsCostPts > 0
              ? isLight
                ? "text-rose-700"
                : "text-rose-300"
              : isLight
                ? "text-[#0f766e]"
                : chrome.isScout
                  ? "text-[#2dd4bf]"
                  : "text-[#39FF14]"
          }
        />

        <KpiTile
          chrome={chrome}
          isLight={isLight}
          label={pt(lang, "planner.kpi.bank")}
          value={formatTenthsAsPounds(bankTenths)}
          source={plannerSourceLabel(lang, bankSource)}
          editTitle={pt(lang, "planner.action.editBank")}
          valueClass={
            bankTenths < 0
              ? isLight
                ? "text-rose-700"
                : "text-rose-300"
              : isLight
                ? "text-[#0f766e]"
                : chrome.isScout
                  ? "text-[#2dd4bf]"
                  : "text-[#39FF14]"
          }
          onEdit={
            onManualAdjustBankTenths || onManualSetBankTenths
              ? () => setEditBankOpen((o) => !o)
              : undefined
          }
        >
          {editBankOpen ? (
            <div className="mt-2 space-y-2">
              {onManualAdjustBankTenths ? (
                <div className="flex gap-1">
                  <button
                    type="button"
                    className={`rounded-lg px-2 py-1 text-[10px] font-black ${chrome.inactiveBtn}`}
                    onClick={() => onManualAdjustBankTenths(-1)}
                  >
                    −0.1m
                  </button>
                  <button
                    type="button"
                    className={`rounded-lg px-2 py-1 text-[10px] font-black ${chrome.inactiveBtn}`}
                    onClick={() => onManualAdjustBankTenths(1)}
                  >
                    +0.1m
                  </button>
                </div>
              ) : null}
              {onManualSetBankTenths ? (
                <div className="flex gap-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.5"
                    value={bankDraft}
                    onChange={(e) => setBankDraft(e.target.value)}
                    className={`w-full rounded-lg px-2 py-1 text-[11px] font-semibold outline-none ${chrome.input}`}
                  />
                  <button
                    type="button"
                    className={`rounded-lg px-2 py-1 text-[10px] font-black ${chrome.activeBtn}`}
                    onClick={() => {
                      const n = Number.parseFloat(
                        bankDraft.replace(",", "."),
                      );
                      if (Number.isFinite(n)) {
                        onManualSetBankTenths(Math.round(n * 10));
                        setEditBankOpen(false);
                      }
                    }}
                  >
                    OK
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </KpiTile>

        <KpiTile
          chrome={chrome}
          isLight={isLight}
          label={pt(lang, "planner.xpts.nextGw", { gw: currentGw })}
          value={`${grossXPts.toFixed(1)} xPts`}
        >
          {hitsCostPts > 0 && netXPts !== grossXPts ? (
            <p className={`mt-1 text-[10px] font-bold ${chrome.mutedLabel}`}>
              {pt(lang, "planner.hit.netto")}: {netXPts.toFixed(1)} xPts
            </p>
          ) : null}
        </KpiTile>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-black ${
            isLight
              ? "border-[#0f766e] bg-[#0f766e]/10 text-slate-950"
              : chrome.isScout
                ? "border-[#2dd4bf]/50 bg-[#2dd4bf]/15 text-[#f0fdfa]"
                : "border-[#39FF14]/50 bg-[#39FF14]/15 text-slate-100"
          }`}
        >
          {pt(lang, "planner.kpi.spendingPower")}:{" "}
          {formatTenthsAsPounds(spendingPowerTenths)}
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-bold ${
            isLight
              ? "border-slate-300 bg-white text-slate-900"
              : "border-slate-600 bg-slate-900/60 text-slate-100"
          }`}
        >
          {formatHitBar({
            lang,
            used: evaluatedGw?.validTransfersCount ?? 0,
            ft: freeTransfers,
            cost: hitsCostPts,
            activeChip,
          })}
        </span>
      </div>

      {/* Chips + quick actions */}
      <section className={`rounded-2xl border p-3 sm:p-4 ${chrome.panel}`}>
        <div className="flex flex-wrap gap-2">
          {(
            [
              "wildcard",
              "freehit",
              "3xc",
              "bboost",
            ] as PlannerChipType[]
          ).map((chip) => {
            const usedGw = usedChipsByType[chip] ?? null;
            const isActive = activeChip === chip;
            const isSpent = usedGw != null && usedGw !== currentGw;
            const label = pt(lang, PLANNER_CHIP_LABEL_KEY[chip]);
            const statusLine = isSpent
              ? pt(lang, "chip.usedIn", { gw: usedGw! })
              : pt(lang, "chip.available");
            return (
              <button
                key={chip}
                type="button"
                disabled={isSpent}
                onClick={() => onToggleChip(chip)}
                aria-label={formatChipAccessibleName({
                  lang,
                  chip,
                  usedGw: isSpent ? usedGw : null,
                })}
                className={`rounded-xl px-3 py-2 text-left text-[11px] font-black uppercase disabled:cursor-not-allowed disabled:opacity-40 ${
                  isActive
                    ? chrome.activeBtn
                    : chrome.inactiveBtn
                }`}
                title={statusLine}
              >
                <span className="block leading-tight">{label}</span>
                <span className="mt-0.5 block text-[9px] font-semibold normal-case opacity-80">
                  {statusLine}
                </span>
              </button>
            );
          })}
        </div>
        <p className={`mt-2 text-[10px] font-semibold leading-snug ${chrome.mutedLabel}`}>
          {pt(lang, "planner.rule.r7r8.ftAfterChip")}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase ${chrome.mutedLabel}`}>
              {pt(lang, "planner.metric.select")}
            </span>
            <select
              value={tileMetric}
              onChange={(e) =>
                onTileMetricChange(e.target.value as PlannerTileMetric)
              }
              className={`rounded-xl px-2.5 py-1.5 text-[11px] font-bold outline-none ${chrome.input}`}
            >
              {TILE_METRIC_OPTIONS.map((m) => (
                <option key={m} value={m} className={optionClass}>
                  {plannerTileMetricLabel(lang, m)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={onOptimiseXi}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase ${chrome.activeBtn}`}
          >
            <Zap className="h-3.5 w-3.5" />
            {pt(lang, "planner.action.optimise")}
          </button>
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase disabled:opacity-40 ${chrome.inactiveBtn}`}
          >
            ↩ {pt(lang, "planner.action.undo")}
          </button>
          <button
            type="button"
            onClick={onResetGw}
            className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase ${chrome.inactiveBtn}`}
          >
            {pt(lang, "planner.action.resetGw")}
          </button>
          <button
            type="button"
            onClick={onResetPlan}
            className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase ${chrome.inactiveBtn}`}
          >
            {pt(lang, "planner.action.resetPlan")}
          </button>
        </div>
      </section>

      {/* Validation banner R1–R12 */}
      {errors.length > 0 || warnings.length > 0 ? (
        <section
          className={`rounded-2xl border px-3 py-3 ${
            errors.length
              ? isLight
                ? "border-rose-400 bg-rose-50 text-rose-950"
                : "border-rose-400/50 bg-rose-500/15 text-rose-100"
              : isLight
                ? "border-amber-400 bg-amber-50 text-amber-950"
                : "border-amber-400/50 bg-amber-500/15 text-amber-100"
          }`}
        >
          <p className="text-[10px] font-black uppercase tracking-wider">
            <span title={ptTip(lang, "planner.validation.title")}>
              {pt(lang, "planner.validation.title")}
            </span>
          </p>
          {errors.length ? (
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs font-semibold">
              {errors.map((e, i) => (
                <li key={`${e.key}-${i}`}>
                  {resolvePlannerValidationError(e.key, lang, e.detail)}
                </li>
              ))}
            </ul>
          ) : null}
          {warnings.length ? (
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs font-semibold opacity-90">
              {warnings.map((w, i) => (
                <li key={`w-${w.key}-${i}`}>
                  {resolvePlannerWarning(w, lang)}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function KpiTile({
  chrome,
  isLight,
  label,
  value,
  source,
  valueClass,
  editTitle,
  onEdit,
  children,
}: {
  chrome: ReturnType<typeof getStatsLabMenuChrome>;
  isLight: boolean;
  label: string;
  value: string;
  source?: string;
  valueClass?: string;
  editTitle?: string;
  onEdit?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border p-3 ${chrome.panel}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-[10px] font-black uppercase tracking-wider ${chrome.mutedLabel}`}>
          {label}
        </p>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className={`inline-flex min-h-[28px] min-w-[28px] items-center justify-center rounded-lg px-2 text-[12px] font-black leading-none ${chrome.inactiveBtn}`}
            title={editTitle}
            aria-label={editTitle}
          >
            ✎
          </button>
        ) : null}
      </div>
      <p
        className={`mt-1 text-lg font-black tabular-nums ${
          valueClass ?? chrome.text
        }`}
      >
        {value}
      </p>
      {source ? (
        <span
          className={`mt-1 inline-flex rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase ${
            isLight
              ? "border-slate-300 bg-slate-100 text-slate-700"
              : "border-slate-700 bg-slate-900 text-slate-300"
          }`}
        >
          {source}
        </span>
      ) : null}
      {children}
    </div>
  );
}
