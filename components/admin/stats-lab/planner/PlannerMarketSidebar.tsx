"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, Plus, Star, X } from "lucide-react";
import type { StatsLabChartThemeId } from "@/components/admin/stats-lab/chartTheme";
import type {
  PlannerClubMeta,
  PlannerPlayerCatalogItem,
} from "@/app/admin/actions/statsLabPlanner";
import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import type { ReconstructedSquadPick } from "@/lib/stats-lab/fplEntryApi";
import type {
  EvaluatedGwState,
  PlannedTransfer,
  PlayerGwProjection,
} from "@/lib/stats-lab/plannerEngine";
import {
  plannerUi,
  type PlannerChipType,
} from "@/lib/stats-lab/plannerI18n";
import { getStatsLabMenuChrome } from "@/lib/stats-lab/menuChrome";
import {
  fplLabBadgeUrl,
  fplLabPlayerPhotoUrl,
} from "@/lib/stats-lab/mediaUrls";
import type { FplPositionType } from "@/lib/stats-lab/types";

export type PlannerMarketTab = "PLAYERS" | "WATCHLIST" | "SUMMARY";

export type PendingTransferOut = {
  slot: number;
  elementId: number;
  sellingPriceTenths: number;
};

export type MarketSortBy =
  | "xpts_gw"
  | "xpts_3gw"
  | "total_points"
  | "now_cost"
  | "selected_by_percent"
  | "form"
  | "dc_bonus_points";

export type PlannerMarketSidebarProps = {
  themeId: StatsLabChartThemeId;
  lang: StatsLabLang;
  currentGw: number;
  availableGameweeks: number[];
  clubs: PlannerClubMeta[];
  players: PlannerPlayerCatalogItem[];
  playersById: Map<number, PlannerPlayerCatalogItem>;
  projectionsByElement: Record<number, Record<number, PlayerGwProjection>>;
  squadPicks: ReconstructedSquadPick[];
  watchlistIds: Set<number>;
  onToggleWatchlist: (elementId: number) => void;
  pendingTransferOut: PendingTransferOut | null;
  onClearPendingTransferOut: () => void;
  availableBudgetTenths: number;
  bankTenths: number;
  overLimitClubIds?: number[];
  onExecuteTransfer: (args: {
    outElementId: number;
    inElementId: number;
    outSlot?: number;
  }) => void;
  onOpenPlayerInfo: (elementId: number) => void;
  evaluatedGws: EvaluatedGwState[];
  squadMarketValueTenths: number;
  squadSellingValueTenths: number;
  spendingPowerTenths: number;
  plannedTransferCount: number;
  onRemoveTransfer?: (transferId: string, gw: number) => void;
};

const PAGE_SIZE = 20;

const MAX_PRICE_OPTIONS = [
  { value: 0, labelPl: "Bez limitu", labelEn: "No limit" },
  { value: 100, labelPl: "≤ £10.0m", labelEn: "≤ £10.0m" },
  { value: 80, labelPl: "≤ £8.0m", labelEn: "≤ £8.0m" },
  { value: 65, labelPl: "≤ £6.5m", labelEn: "≤ £6.5m" },
  { value: 55, labelPl: "≤ £5.5m", labelEn: "≤ £5.5m" },
  { value: 45, labelPl: "≤ £4.5m", labelEn: "≤ £4.5m" },
] as const;

const MAX_TSB_OPTIONS = [100, 50, 25, 10] as const;

function tenthsToPounds(tenths: number): string {
  const sign = tenths < 0 ? "-" : "";
  return `${sign}£${(Math.abs(Math.round(tenths)) / 10).toFixed(1)}m`;
}

function posLabel(t: FplPositionType): string {
  if (t === 1) return "GKP";
  if (t === 2) return "DEF";
  if (t === 3) return "MID";
  return "FWD";
}

function chipShort(chip: PlannerChipType | null | undefined): string | null {
  if (!chip) return null;
  if (chip === "wildcard") return "WC";
  if (chip === "freehit") return "FH";
  if (chip === "bboost") return "BB";
  return "TC";
}

function fdrCellClass(level: number, isLight: boolean): string {
  if (isLight) {
    if (level <= 1) return "bg-emerald-600 text-white";
    if (level === 2) return "bg-emerald-100 text-emerald-950";
    if (level === 3) return "bg-slate-200 text-slate-900";
    if (level === 4) return "bg-amber-200 text-amber-950";
    return "bg-rose-600 text-white";
  }
  if (level <= 1) return "bg-emerald-500/30 text-emerald-100";
  if (level === 2) return "bg-emerald-500/20 text-emerald-100";
  if (level === 3) return "bg-slate-500/30 text-slate-100";
  if (level === 4) return "bg-amber-500/25 text-amber-100";
  return "bg-rose-500/30 text-rose-100";
}

function xPtsGw(
  projectionsByElement: Record<number, Record<number, PlayerGwProjection>>,
  elementId: number,
  gw: number,
): number {
  return projectionsByElement[elementId]?.[gw]?.xPts ?? 0;
}

function xPtsHorizon(
  projectionsByElement: Record<number, Record<number, PlayerGwProjection>>,
  elementId: number,
  startGw: number,
  count: number,
): number {
  let sum = 0;
  for (let i = 0; i < count; i++) {
    sum += xPtsGw(projectionsByElement, elementId, startGw + i);
  }
  return sum;
}

export function PlannerMarketSidebar({
  themeId,
  lang,
  currentGw,
  availableGameweeks,
  clubs,
  players,
  playersById,
  projectionsByElement,
  squadPicks,
  watchlistIds,
  onToggleWatchlist,
  pendingTransferOut,
  onClearPendingTransferOut,
  availableBudgetTenths,
  bankTenths,
  overLimitClubIds,
  onExecuteTransfer,
  onOpenPlayerInfo,
  evaluatedGws,
  squadMarketValueTenths,
  squadSellingValueTenths,
  spendingPowerTenths,
  plannedTransferCount,
  onRemoveTransfer,
}: PlannerMarketSidebarProps) {
  const chrome = getStatsLabMenuChrome(themeId);
  const ui = plannerUi(lang);
  const isLight = chrome.isLight;
  const isPl = lang === "pl";

  const [tab, setTab] = useState<PlannerMarketTab>("PLAYERS");
  const [searchQuery, setSearchQuery] = useState("");
  const [posFilter, setPosFilter] = useState<FplPositionType | 0>(0);
  const [clubFilter, setClubFilter] = useState<number>(0);
  const [maxPriceTenths, setMaxPriceTenths] = useState(0);
  const [onlyInBudget, setOnlyInBudget] = useState(false);
  const [maxTsb, setMaxTsb] = useState(100);
  const [sortBy, setSortBy] = useState<MarketSortBy>("xpts_gw");
  const [page, setPage] = useState(1);
  const [quickPickIn, setQuickPickIn] = useState<number | null>(null);

  const pendingPlayer = pendingTransferOut
    ? playersById.get(pendingTransferOut.elementId)
    : null;

  useEffect(() => {
    if (pendingTransferOut && pendingPlayer) {
      setPosFilter(pendingPlayer.element_type);
      setTab("PLAYERS");
      setPage(1);
    }
  }, [pendingTransferOut, pendingPlayer]);

  const squadElementIds = useMemo(() => {
    const s = new Set<number>();
    for (const p of squadPicks) s.add(p.elementId);
    return s;
  }, [squadPicks]);

  const clubCounts = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of squadPicks) {
      const pl = playersById.get(p.elementId);
      if (!pl) continue;
      m.set(pl.fpl_team_id, (m.get(pl.fpl_team_id) ?? 0) + 1);
    }
    return m;
  }, [squadPicks, playersById]);

  const overLimit = useMemo(
    () => new Set(overLimitClubIds ?? []),
    [overLimitClubIds],
  );

  const sortedClubs = useMemo(
    () => [...clubs].sort((a, b) => a.short_name.localeCompare(b.short_name)),
    [clubs],
  );

  const catalog =
    tab === "WATCHLIST"
      ? players.filter((p) => watchlistIds.has(p.fpl_element_id))
      : players;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const budgetCap =
      onlyInBudget || pendingTransferOut
        ? availableBudgetTenths
        : Number.POSITIVE_INFINITY;

    const rows = catalog.filter((p) => {
      if (posFilter && p.element_type !== posFilter) return false;
      if (clubFilter && p.fpl_team_id !== clubFilter) return false;
      if (maxPriceTenths > 0 && p.now_cost > maxPriceTenths) return false;
      if (p.selected_by_percent > maxTsb) return false;
      if (onlyInBudget && p.now_cost > budgetCap) return false;
      if (pendingTransferOut && p.now_cost > availableBudgetTenths) {
        /* still show but mark unaffordable */
      }
      if (q) {
        const hay = `${p.web_name} ${p.first_name} ${p.second_name} ${p.club_short_name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const score = (p: PlannerPlayerCatalogItem): number => {
      if (sortBy === "xpts_gw")
        return xPtsGw(projectionsByElement, p.fpl_element_id, currentGw);
      if (sortBy === "xpts_3gw")
        return xPtsHorizon(
          projectionsByElement,
          p.fpl_element_id,
          currentGw,
          3,
        );
      if (sortBy === "total_points") return p.total_points;
      if (sortBy === "now_cost") return p.now_cost;
      if (sortBy === "selected_by_percent") return p.selected_by_percent;
      if (sortBy === "form") return p.form;
      return p.dc_bonus_points;
    };

    rows.sort((a, b) => {
      if (sortBy === "now_cost" || sortBy === "selected_by_percent") {
        return score(a) - score(b);
      }
      return score(b) - score(a);
    });
    return rows;
  }, [
    catalog,
    searchQuery,
    posFilter,
    clubFilter,
    maxPriceTenths,
    maxTsb,
    onlyInBudget,
    pendingTransferOut,
    availableBudgetTenths,
    sortBy,
    projectionsByElement,
    currentGw,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (pageSafe - 1) * PAGE_SIZE,
    pageSafe * PAGE_SIZE,
  );

  function rowFlags(p: PlannerPlayerCatalogItem) {
    const alreadyInSquad = squadElementIds.has(p.fpl_element_id);
    const outClubId = pendingPlayer?.fpl_team_id;
    let clubCountAfter = clubCounts.get(p.fpl_team_id) ?? 0;
    if (
      pendingTransferOut &&
      outClubId != null &&
      outClubId === p.fpl_team_id
    ) {
      clubCountAfter = Math.max(0, clubCountAfter - 1);
    }
    if (!alreadyInSquad) clubCountAfter += 1;

    const r3Blocked =
      overLimit.size > 0 &&
      pendingTransferOut != null &&
      pendingPlayer != null &&
      !overLimit.has(pendingPlayer.fpl_team_id) &&
      !overLimit.has(p.fpl_team_id);

    const clubBlocked =
      (!alreadyInSquad && clubCountAfter > 3) || r3Blocked;
    const affordable =
      !pendingTransferOut || p.now_cost <= availableBudgetTenths;
    const samePos =
      !pendingPlayer || pendingPlayer.element_type === p.element_type;

    return {
      alreadyInSquad,
      clubBlocked,
      affordable,
      samePos,
      canPlus:
        !alreadyInSquad &&
        affordable &&
        !clubBlocked &&
        (pendingTransferOut ? samePos : true),
    };
  }

  function onPlusClick(p: PlannerPlayerCatalogItem) {
    const flags = rowFlags(p);
    if (!flags.canPlus) return;
    if (pendingTransferOut) {
      onExecuteTransfer({
        outElementId: pendingTransferOut.elementId,
        inElementId: p.fpl_element_id,
        outSlot: pendingTransferOut.slot,
      });
      return;
    }
    setQuickPickIn(p.fpl_element_id);
  }

  const samePosOutCandidates = useMemo(() => {
    if (quickPickIn == null) return [];
    const target = playersById.get(quickPickIn);
    if (!target) return [];
    return squadPicks
      .map((pick) => {
        const pl = playersById.get(pick.elementId);
        if (!pl || pl.element_type !== target.element_type) return null;
        const bankAfter =
          bankTenths + pick.sellingPriceTenths - target.now_cost;
        return { pick, pl, bankAfter };
      })
      .filter(Boolean) as Array<{
      pick: ReconstructedSquadPick;
      pl: PlannerPlayerCatalogItem;
      bankAfter: number;
    }>;
  }, [quickPickIn, playersById, squadPicks, bankTenths]);

  return (
    <aside className={`flex h-full min-h-[420px] flex-col rounded-2xl border ${chrome.panel}`}>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-inherit p-2">
        {(
          [
            ["PLAYERS", ui.playersTab],
            ["WATCHLIST", `${ui.watchlistTab} (${watchlistIds.size})`],
            ["SUMMARY", `${ui.summaryTab} (${plannedTransferCount})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setPage(1);
            }}
            className={`flex-1 rounded-xl px-2 py-2 text-[10px] font-black uppercase sm:text-[11px] ${
              tab === id ? chrome.activeBtn : chrome.inactiveBtn
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2 sm:p-3">
        {pendingTransferOut && pendingPlayer ? (
          <div
            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
              isLight
                ? "border-sky-400 bg-sky-50 text-sky-950"
                : "border-sky-400/50 bg-sky-500/15 text-sky-100"
            }`}
          >
            <p>
              {isPl
                ? `Wybierasz zastępcę za: ${pendingPlayer.web_name} (${posLabel(pendingPlayer.element_type)}, sprzedaż SP: ${tenthsToPounds(pendingTransferOut.sellingPriceTenths)}) • Maks. cena zakupu: ${tenthsToPounds(availableBudgetTenths)}`
                : `Selecting replacement for: ${pendingPlayer.web_name} (${posLabel(pendingPlayer.element_type)}, sell SP: ${tenthsToPounds(pendingTransferOut.sellingPriceTenths)}) • Max buy price: ${tenthsToPounds(availableBudgetTenths)}`}
            </p>
            <button
              type="button"
              onClick={onClearPendingTransferOut}
              className={`mt-2 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase ${chrome.inactiveBtn}`}
            >
              {isPl ? "Anuluj wybór (Przywróć)" : "Cancel selection (Restore)"}
            </button>
          </div>
        ) : null}

        {tab === "SUMMARY" ? (
          <SummaryTab
            chrome={chrome}
            isLight={isLight}
            lang={lang}
            ui={ui}
            squadMarketValueTenths={squadMarketValueTenths}
            squadSellingValueTenths={squadSellingValueTenths}
            bankTenths={bankTenths}
            spendingPowerTenths={spendingPowerTenths}
            evaluatedGws={evaluatedGws}
            playersById={playersById}
            onRemoveTransfer={onRemoveTransfer}
          />
        ) : (
          <>
            {/* Filters */}
            <div className="space-y-2">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={
                  isPl ? "Szukaj zawodnika / klubu…" : "Search player / club…"
                }
                className={`w-full rounded-xl px-3 py-2 text-xs font-semibold outline-none ${chrome.input}`}
              />

              <div className="flex flex-wrap gap-1">
                {(
                  [
                    [0, isPl ? "Wszyscy" : "All"],
                    [1, "GKP"],
                    [2, "DEF"],
                    [3, "MID"],
                    [4, "FWD"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => {
                      setPosFilter(v as FplPositionType | 0);
                      setPage(1);
                    }}
                    className={`rounded-lg px-2 py-1 text-[10px] font-black ${
                      posFilter === v ? chrome.activeBtn : chrome.inactiveBtn
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  value={clubFilter}
                  onChange={(e) => {
                    setClubFilter(Number(e.target.value));
                    setPage(1);
                  }}
                  className={`rounded-xl px-2 py-1.5 text-[11px] font-bold outline-none ${chrome.input}`}
                >
                  <option value={0} className={chrome.option}>
                    {isPl ? "Wszystkie kluby" : "All clubs"}
                  </option>
                  {sortedClubs.map((c) => (
                    <option
                      key={c.fpl_team_id}
                      value={c.fpl_team_id}
                      className={chrome.option}
                    >
                      {c.short_name}
                    </option>
                  ))}
                </select>

                <select
                  value={maxPriceTenths}
                  onChange={(e) => {
                    setMaxPriceTenths(Number(e.target.value));
                    setPage(1);
                  }}
                  className={`rounded-xl px-2 py-1.5 text-[11px] font-bold outline-none ${chrome.input}`}
                >
                  {MAX_PRICE_OPTIONS.map((o) => (
                    <option
                      key={o.value}
                      value={o.value}
                      className={chrome.option}
                    >
                      {isPl ? o.labelPl : o.labelEn}
                    </option>
                  ))}
                </select>

                <select
                  value={maxTsb}
                  onChange={(e) => {
                    setMaxTsb(Number(e.target.value));
                    setPage(1);
                  }}
                  className={`rounded-xl px-2 py-1.5 text-[11px] font-bold outline-none ${chrome.input}`}
                >
                  {MAX_TSB_OPTIONS.map((n) => (
                    <option key={n} value={n} className={chrome.option}>
                      {n >= 100
                        ? "Max TSB 100%"
                        : `Max TSB ≤ ${n}%`}
                    </option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as MarketSortBy);
                    setPage(1);
                  }}
                  className={`rounded-xl px-2 py-1.5 text-[11px] font-bold outline-none ${chrome.input}`}
                >
                  {(
                    [
                      ["xpts_gw", isPl ? "xPts (bieżąca GW)" : "xPts (current GW)"],
                      ["xpts_3gw", isPl ? "Suma xPts (3 GW)" : "xPts sum (3 GW)"],
                      ["total_points", isPl ? "Punkty ogółem" : "Total points"],
                      ["now_cost", isPl ? "Cena £" : "Price £"],
                      ["selected_by_percent", "TSB%"],
                      ["form", isPl ? "Forma" : "Form"],
                      ["dc_bonus_points", isPl ? "Punkty DC" : "DC points"],
                    ] as const
                  ).map(([v, label]) => (
                    <option key={v} value={v} className={chrome.option}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setOnlyInBudget((v) => !v);
                  setPage(1);
                }}
                className={`rounded-xl px-2.5 py-1.5 text-[10px] font-black uppercase ${
                  onlyInBudget ? chrome.activeBtn : chrome.inactiveBtn
                }`}
              >
                {isPl ? "Tylko w moim budżecie" : "Only in my budget"}
              </button>
            </div>

            {/* Quick pick overlay */}
            {quickPickIn != null ? (
              <div
                className={`rounded-xl border p-2 ${
                  isLight
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-emerald-400/40 bg-emerald-500/10"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className={`text-[10px] font-black uppercase ${chrome.text}`}>
                    {isPl
                      ? "Kogo wymieniasz?"
                      : "Who do you transfer out?"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setQuickPickIn(null)}
                    className={`rounded-lg p-1 ${chrome.inactiveBtn}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {samePosOutCandidates.map(({ pick, pl, bankAfter }) => (
                    <button
                      key={pick.elementId}
                      type="button"
                      onClick={() => {
                        onExecuteTransfer({
                          outElementId: pick.elementId,
                          inElementId: quickPickIn,
                          outSlot: pick.slot,
                        });
                        setQuickPickIn(null);
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-left text-[11px] font-bold ${chrome.group}`}
                    >
                      <span className={chrome.text}>
                        {pl.web_name} · SP {tenthsToPounds(pick.sellingPriceTenths)}
                      </span>
                      <span
                        className={
                          bankAfter < 0
                            ? isLight
                              ? "text-rose-700"
                              : "text-rose-300"
                            : isLight
                              ? "text-emerald-700"
                              : "text-emerald-300"
                        }
                      >
                        Bank {tenthsToPounds(bankAfter)}
                      </span>
                    </button>
                  ))}
                  {!samePosOutCandidates.length ? (
                    <p className={`text-[11px] font-semibold ${chrome.mutedLabel}`}>
                      {isPl
                        ? "Brak gracza tej pozycji w kadrze."
                        : "No same-position player in squad."}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Table */}
            <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-inherit">
              <table className="w-full min-w-[420px] border-collapse text-left text-[11px]">
                <thead className="sticky top-0 z-[1]">
                  <tr className={`${chrome.group} ${chrome.mutedLabel}`}>
                    <th className="px-1.5 py-2 font-black">+</th>
                    <th className="px-1.5 py-2 font-black">★</th>
                    <th className="px-1.5 py-2 font-black">
                      {isPl ? "Zawodnik" : "Player"}
                    </th>
                    <th className="px-1.5 py-2 font-black">£</th>
                    <th className="px-1.5 py-2 font-black">TSB</th>
                    <th className="px-1.5 py-2 font-black">xPts</th>
                    <th className="px-1.5 py-2 font-black">3GW</th>
                    <th className="px-1.5 py-2 font-black">i</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((p) => {
                    const flags = rowFlags(p);
                    const proj =
                      projectionsByElement[p.fpl_element_id]?.[currentGw];
                    const fx = proj?.fixtures?.[0];
                    const starred = watchlistIds.has(p.fpl_element_id);
                    const x3 = xPtsHorizon(
                      projectionsByElement,
                      p.fpl_element_id,
                      currentGw,
                      3,
                    );
                    return (
                      <tr
                        key={p.fpl_element_id}
                        className={`border-t ${
                          isLight ? "border-slate-200" : "border-slate-800"
                        } ${
                          flags.alreadyInSquad
                            ? isLight
                              ? "bg-slate-100/80"
                              : "bg-slate-900/50"
                            : ""
                        }`}
                      >
                        <td className="px-1.5 py-1.5">
                          <button
                            type="button"
                            disabled={!flags.canPlus}
                            onClick={() => onPlusClick(p)}
                            title={
                              flags.alreadyInSquad
                                ? isPl
                                  ? "Już w kadrze"
                                  : "Already in squad"
                                : !flags.affordable
                                  ? isPl
                                    ? "Za drogi"
                                    : "Too expensive"
                                  : flags.clubBlocked
                                    ? isPl
                                      ? "Limit klubu"
                                      : "Club limit"
                                    : "+"
                            }
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-lg disabled:opacity-30 ${
                              flags.canPlus
                                ? chrome.activeBtn
                                : chrome.inactiveBtn
                            }`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </td>
                        <td className="px-1.5 py-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onToggleWatchlist(p.fpl_element_id)
                            }
                            className={
                              starred
                                ? "text-amber-400"
                                : chrome.mutedLabel
                            }
                          >
                            <Star
                              className={`h-3.5 w-3.5 ${
                                starred ? "fill-amber-400" : ""
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-1.5 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="relative h-7 w-7 shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={fplLabPlayerPhotoUrl(p.player_code)}
                                alt=""
                                crossOrigin="anonymous"
                                className="h-7 w-7 rounded-full object-cover object-top"
                              />
                              {p.club_pulse_code ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={fplLabBadgeUrl(p.club_pulse_code)}
                                  alt=""
                                  crossOrigin="anonymous"
                                  className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-black/40 object-contain"
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-[11px] font-bold leading-tight ${chrome.text}`}>
                                {p.web_name}
                                {p.chance_of_playing_next_round != null &&
                                p.chance_of_playing_next_round < 100 ? (
                                  <span
                                    className={`ml-1 text-[9px] font-black ${
                                      isLight
                                        ? "text-rose-700"
                                        : "text-rose-300"
                                    }`}
                                  >
                                    {p.chance_of_playing_next_round}%
                                  </span>
                                ) : null}
                              </p>
                              <p className={`text-[9px] font-semibold ${chrome.mutedLabel}`}>
                                {posLabel(p.element_type)} · {p.club_short_name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className={`px-1.5 py-1.5 font-bold tabular-nums ${chrome.text}`}>
                          {(p.now_cost / 10).toFixed(1)}
                        </td>
                        <td className={`px-1.5 py-1.5 font-semibold tabular-nums ${chrome.mutedLabel}`}>
                          {p.selected_by_percent.toFixed(1)}%
                        </td>
                        <td className="px-1.5 py-1.5">
                          <p className={`font-black tabular-nums ${chrome.text}`}>
                            {xPtsGw(
                              projectionsByElement,
                              p.fpl_element_id,
                              currentGw,
                            ).toFixed(1)}
                          </p>
                          <span
                            className={`mt-0.5 inline-flex rounded px-1 py-0.5 text-[8px] font-black ${
                              proj?.isBlank
                                ? isLight
                                  ? "bg-slate-200 text-slate-600"
                                  : "bg-slate-800 text-slate-300"
                                : fdrCellClass(fx?.fdrLevel ?? 3, isLight)
                            }`}
                          >
                            {proj?.isBlank
                              ? "BGW"
                              : fx?.tickerLabel ?? "—"}
                          </span>
                        </td>
                        <td className={`px-1.5 py-1.5 font-bold tabular-nums ${chrome.text}`}>
                          {x3.toFixed(1)}
                        </td>
                        <td className="px-1.5 py-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onOpenPlayerInfo(p.fpl_element_id)
                            }
                            className={`rounded-lg p-1 ${chrome.inactiveBtn}`}
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!pageRows.length ? (
                    <tr>
                      <td
                        colSpan={8}
                        className={`px-3 py-6 text-center text-xs font-semibold ${chrome.mutedLabel}`}
                      >
                        {isPl ? "Brak wyników." : "No results."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={pageSafe <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={`rounded-xl px-2.5 py-1.5 text-[10px] font-black uppercase disabled:opacity-40 ${chrome.inactiveBtn}`}
              >
                {isPl ? "Poprzednia" : "Previous"}
              </button>
              <p className={`text-[10px] font-bold ${chrome.mutedLabel}`}>
                {isPl ? "Strona" : "Page"} {pageSafe}{" "}
                {isPl ? "z" : "of"} {totalPages}
              </p>
              <button
                type="button"
                disabled={pageSafe >= totalPages}
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
                className={`rounded-xl px-2.5 py-1.5 text-[10px] font-black uppercase disabled:opacity-40 ${chrome.inactiveBtn}`}
              >
                {isPl ? "Następna" : "Next"}
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

function SummaryTab({
  chrome,
  isLight,
  lang,
  ui,
  squadMarketValueTenths,
  squadSellingValueTenths,
  bankTenths,
  spendingPowerTenths,
  evaluatedGws,
  playersById,
  onRemoveTransfer,
}: {
  chrome: ReturnType<typeof getStatsLabMenuChrome>;
  isLight: boolean;
  lang: StatsLabLang;
  ui: ReturnType<typeof plannerUi>;
  squadMarketValueTenths: number;
  squadSellingValueTenths: number;
  bankTenths: number;
  spendingPowerTenths: number;
  evaluatedGws: EvaluatedGwState[];
  playersById: Map<number, PlannerPlayerCatalogItem>;
  onRemoveTransfer?: (transferId: string, gw: number) => void;
}) {
  const isPl = lang === "pl";
  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
      <div className={`rounded-xl border p-3 ${chrome.group}`}>
        <p className={`text-[10px] font-black uppercase ${chrome.mutedLabel}`}>
          {ui.spendingPower}
        </p>
        <ul className={`mt-2 space-y-1 text-xs font-semibold ${chrome.text}`}>
          <li>
            {isPl ? "Wartość rynkowa kadry (CP)" : "Squad market value (CP)"}:{" "}
            {tenthsToPounds(squadMarketValueTenths)}
          </li>
          <li>
            {isPl ? "Wartość sprzedaży kadry (SP)" : "Squad selling value (SP)"}:{" "}
            {tenthsToPounds(squadSellingValueTenths)}
          </li>
          <li>
            {ui.bank}: {tenthsToPounds(bankTenths)}
          </li>
          <li className="pt-1 text-sm font-black">
            {isPl
              ? "Łączna Siła Nabywcza (Budżet po sprzedaży wszystkich)"
              : "Total Spending Power (sell-all budget)"}
            : {tenthsToPounds(spendingPowerTenths)}
          </li>
        </ul>
      </div>

      <div className="space-y-2">
        <p className={`text-[10px] font-black uppercase ${chrome.mutedLabel}`}>
          {isPl
            ? "Dziennik transferów i chipów"
            : "Transfers & chips log"}
        </p>
        {evaluatedGws.map((gwState) => {
          const chip = chipShort(gwState.activeChip);
          const hasR3 = gwState.errors.some(
            (e) =>
              e.key === "clubLimitExceeded" ||
              e.key === "clubLimitPreExistingMustFix",
          );
          const hasR4 = gwState.errors.some(
            (e) => e.key === "negativeBankError",
          );
          const rowAlert = hasR3 || hasR4 || !gwState.isValid;
          return (
            <div
              key={gwState.gw}
              className={`rounded-xl border p-2.5 ${
                rowAlert
                  ? isLight
                    ? "border-rose-400 bg-rose-50"
                    : "border-rose-400/50 bg-rose-500/10"
                  : chrome.group
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={`text-xs font-black ${chrome.text}`}>
                  GW{gwState.gw}
                  {chip ? (
                    <span className="ml-1.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black text-amber-300">
                      {chip}
                    </span>
                  ) : null}
                </p>
                <p className={`text-[10px] font-bold ${chrome.mutedLabel}`}>
                  {gwState.ftAvailable} FT ·{" "}
                  {gwState.transferCostPts > 0
                    ? `−${gwState.transferCostPts} pkt`
                    : "0 pkt"}{" "}
                  · {tenthsToPounds(gwState.bankTenths)} ·{" "}
                  {gwState.grossXPts.toFixed(1)} xPts
                </p>
              </div>
              {rowAlert ? (
                <ul className="mt-1 list-disc pl-4 text-[10px] font-semibold text-rose-300">
                  {gwState.errors.map((e, i) => (
                    <li key={`${e.key}-${i}`}>
                      {ui[e.key]}
                      {e.detail ? ` ${e.detail}` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-2 space-y-1">
                {gwState.transfers.map((t) => (
                  <TransferLogRow
                    key={t.id}
                    t={t}
                    playersById={playersById}
                    chrome={chrome}
                    isLight={isLight}
                    onRemoveTransfer={onRemoveTransfer}
                  />
                ))}
                {!gwState.transfers.length ? (
                  <p className={`text-[10px] font-semibold ${chrome.mutedLabel}`}>
                    {isPl ? "Brak transferów" : "No transfers"}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
        {!evaluatedGws.length ? (
          <p className={`text-xs font-semibold ${chrome.mutedLabel}`}>
            {isPl ? "Brak danych planu." : "No plan data."}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function TransferLogRow({
  t,
  playersById,
  chrome,
  isLight,
  onRemoveTransfer,
}: {
  t: PlannedTransfer;
  playersById: Map<number, PlannerPlayerCatalogItem>;
  chrome: ReturnType<typeof getStatsLabMenuChrome>;
  isLight: boolean;
  onRemoveTransfer?: (transferId: string, gw: number) => void;
}) {
  const outP = playersById.get(t.outElementId);
  const inP = playersById.get(t.inElementId);
  return (
    <div
      className={`flex items-start justify-between gap-2 rounded-lg border px-2 py-1.5 text-[10px] font-semibold ${
        t.hasConflict
          ? isLight
            ? "border-rose-400 bg-rose-100 text-rose-950"
            : "border-rose-400/50 bg-rose-500/20 text-rose-100"
          : isLight
            ? "border-slate-200 bg-white text-slate-800"
            : "border-slate-700 bg-slate-950/60 text-slate-200"
      }`}
    >
      <p>
        {outP?.web_name ?? `#${t.outElementId}`} (SP{" "}
        {tenthsToPounds(t.outSellingPriceTenths)}) ➔{" "}
        {inP?.web_name ?? `#${t.inElementId}`} (CP{" "}
        {tenthsToPounds(t.inPurchasePriceTenths)})
        {t.hasConflict ? " · R5" : ""}
      </p>
      {onRemoveTransfer ? (
        <button
          type="button"
          onClick={() => onRemoveTransfer(t.id, t.gw)}
          className={`shrink-0 rounded p-0.5 ${chrome.inactiveBtn}`}
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}
