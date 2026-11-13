"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  Info,
  Star,
  X,
} from "lucide-react";
import type { StatsLabChartThemeId } from "@/components/admin/stats-lab/chartTheme";
import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import type { ReconstructedSquadPick } from "@/lib/stats-lab/fplEntryApi";
import type { PlannerPlayerCatalogItem } from "@/app/admin/actions/statsLabPlanner";
import {
  canSwapSquadSlots,
  type FormationErrorKey,
  type PlayerGwProjection,
  type SquadPlayerState,
} from "@/lib/stats-lab/plannerEngine";
import {
  formatTenthsAsPounds,
  plannerSourceLabel,
  pt,
  resolvePlannerValidationError,
  type PlannerChipType,
  type PlannerTileMetric,
} from "@/lib/stats-lab/plannerI18n";
import {
  actionAria,
  formatBenchSlotLabel,
  formatPlayerTileAccessibleName,
} from "@/lib/stats-lab/plannerUiFormat";
import {
  PLANNER_ACTION_HIT_CLASS,
  captainArmbandAria,
  captainArmbandKind,
  captainArmbandLabel,
  formatFixturePills,
} from "@/lib/stats-lab/plannerFixtureUi";
import { getStatsLabMenuChrome } from "@/lib/stats-lab/menuChrome";
import { getPlannerActionChrome } from "@/lib/stats-lab/themeTokens";
import {
  fplLabBadgeUrl,
  fplLabPlayerPhotoUrl,
} from "@/lib/stats-lab/mediaUrls";
import type { FplLabPlayer } from "@/lib/stats-lab/types";
import { PlannerFixturePills } from "@/components/admin/stats-lab/planner/PlannerFixturePills";

export type PlannerPitchProps = {
  themeId: StatsLabChartThemeId;
  lang: StatsLabLang;
  currentGw: number;
  availableGameweeks: number[];
  squadPicks: ReconstructedSquadPick[];
  removedElementIdsInGw?: Set<number>;
  selectedSlotForSwap: number | null;
  playersById: Map<number, PlannerPlayerCatalogItem>;
  projectionsByElement: Record<number, Record<number, PlayerGwProjection>>;
  tileMetric: PlannerTileMetric;
  onSelectSlotForSwap: (slot: number | null) => void;
  onSwapSlots: (slotA: number, slotB: number) => void;
  onMarkPlayerForTransferOut: (slot: number, elementId: number) => void;
  onUndoTransferOut?: (elementId: number) => void;
  onSetCaptain: (elementId: number) => void;
  onSetViceCaptain: (elementId: number) => void;
  onUpdateCustomSellingPrice?: (
    elementId: number,
    sellingPriceTenths: number,
  ) => void;
  watchlistIds: Set<number>;
  onToggleWatchlist: (elementId: number) => void;
  activeChip: PlannerChipType | null;
  /** true tylko podczas zapisu JPEG — ukrywa też banner missing. */
  isExporting?: boolean;
  /** Plakat / podgląd eksportu: bez przycisków akcji, ale banner missing zostaje. */
  hideActionChrome?: boolean;
  /** Ostrzeżenia C/VC missing dla bieżącej GW — banner przy boisku. */
  missingCaptain?: boolean;
  missingVice?: boolean;
};

function hasRoleMissingBanner(
  missingCaptain: boolean | undefined,
  missingVice: boolean | undefined,
): boolean {
  return !!missingCaptain || !!missingVice;
}

function tenthsToPounds(tenths: number): string {
  return `£${(Math.round(tenths) / 10).toFixed(1)}m`;
}

function fdrPillClass(level: number, isLight: boolean): string {
  if (isLight) {
    if (level <= 1) return "bg-emerald-600 text-white border-emerald-700";
    if (level === 2) return "bg-emerald-100 text-emerald-950 border-emerald-300";
    if (level === 3) return "bg-slate-200 text-slate-900 border-slate-300";
    if (level === 4) return "bg-amber-200 text-amber-950 border-amber-400";
    return "bg-rose-600 text-white border-rose-700";
  }
  if (level <= 1) return "bg-emerald-500/30 text-emerald-100 border-emerald-400/50";
  if (level === 2) return "bg-emerald-500/20 text-emerald-100 border-emerald-400/40";
  if (level === 3) return "bg-slate-500/30 text-slate-100 border-slate-400/40";
  if (level === 4) return "bg-amber-500/25 text-amber-100 border-amber-400/40";
  return "bg-rose-500/30 text-rose-100 border-rose-400/50";
}

function chanceBadge(
  chance: number | null | undefined,
): string | null {
  if (chance == null) return null;
  if (chance >= 100) return null;
  if (chance <= 0) return "0%";
  if (chance <= 25) return "25%";
  if (chance <= 50) return "50%";
  if (chance <= 75) return "75%";
  return `${chance}%`;
}

function picksToSquadState(
  picks: ReconstructedSquadPick[],
): SquadPlayerState[] {
  return picks.map((p) => ({
    elementId: p.elementId,
    slot: p.slot,
    purchasePriceTenths: p.purchasePriceTenths,
    nowCostTenths: p.nowCostTenths,
    sellingPriceTenths: p.sellingPriceTenths,
    isCaptain: p.isCaptain,
    isViceCaptain: p.isViceCaptain,
  }));
}

function catalogAsPlayersMap(
  playersById: Map<number, PlannerPlayerCatalogItem>,
): Map<number, FplLabPlayer> {
  return playersById as unknown as Map<number, FplLabPlayer>;
}

function formationMessage(key: FormationErrorKey, lang: StatsLabLang): string {
  return resolvePlannerValidationError(key, lang);
}

export function PlannerPitch({
  themeId,
  lang,
  currentGw,
  availableGameweeks,
  squadPicks,
  removedElementIdsInGw,
  selectedSlotForSwap,
  playersById,
  projectionsByElement,
  tileMetric,
  onSelectSlotForSwap,
  onSwapSlots,
  onMarkPlayerForTransferOut,
  onUndoTransferOut,
  onSetCaptain,
  onSetViceCaptain,
  onUpdateCustomSellingPrice,
  watchlistIds,
  onToggleWatchlist,
  activeChip,
  isExporting = false,
  hideActionChrome = false,
  missingCaptain = false,
  missingVice = false,
}: PlannerPitchProps) {
  const chromeHidden = hideActionChrome || isExporting;
  const chrome = getStatsLabMenuChrome(themeId);
  const isLight = chrome.isLight;
  const [formationBanner, setFormationBanner] = useState<string | null>(null);
  const [infoElementId, setInfoElementId] = useState<number | null>(null);
  const [dragSlot, setDragSlot] = useState<number | null>(null);

  const squadState = useMemo(
    () => picksToSquadState(squadPicks),
    [squadPicks],
  );
  const playersMap = useMemo(
    () => catalogAsPlayersMap(playersById),
    [playersById],
  );

  const bySlot = useMemo(() => {
    const m = new Map<number, ReconstructedSquadPick>();
    for (const p of squadPicks) m.set(p.slot, p);
    return m;
  }, [squadPicks]);

  const xiSlots = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
  const benchSlots = [12, 13, 14, 15] as const;

  const lineGk = xiSlots.filter((s) => {
    const p = bySlot.get(s);
    if (!p) return false;
    return playersById.get(p.elementId)?.element_type === 1;
  });
  const lineDef = xiSlots.filter((s) => {
    const p = bySlot.get(s);
    if (!p) return false;
    return playersById.get(p.elementId)?.element_type === 2;
  });
  const lineMid = xiSlots.filter((s) => {
    const p = bySlot.get(s);
    if (!p) return false;
    return playersById.get(p.elementId)?.element_type === 3;
  });
  const lineFwd = xiSlots.filter((s) => {
    const p = bySlot.get(s);
    if (!p) return false;
    return playersById.get(p.elementId)?.element_type === 4;
  });

  function swapAllowed(from: number, to: number): {
    ok: boolean;
    errorKey?: FormationErrorKey;
  } {
    const res = canSwapSquadSlots(squadState, from, to, playersMap);
    if (res.allowed) return { ok: true };
    return { ok: false, errorKey: res.errorKey };
  }

  function trySwap(from: number, to: number) {
    if (from === to) {
      onSelectSlotForSwap(null);
      return;
    }
    const check = swapAllowed(from, to);
    if (!check.ok) {
      setFormationBanner(
        formationMessage(check.errorKey ?? "formationErrorGkOnly", lang),
      );
      return;
    }
    setFormationBanner(null);
    onSwapSlots(from, to);
    onSelectSlotForSwap(null);
  }

  function onTileClickSwap(slot: number) {
    if (chromeHidden) return;
    if (selectedSlotForSwap == null) {
      onSelectSlotForSwap(slot);
      return;
    }
    trySwap(selectedSlotForSwap, slot);
  }

  const pitchBg = isLight
    ? "bg-gradient-to-b from-slate-100 via-white to-slate-100"
    : themeId === "SCOUT_DARK"
      ? "bg-gradient-to-b from-[#122a3a] via-[#0b1c2e] to-[#122a3a]"
      : "bg-gradient-to-b from-emerald-950 via-slate-950 to-emerald-950";

  const pitchBorder = isLight
    ? "border-slate-300"
    : themeId === "SCOUT_DARK"
      ? "border-teal-700/80"
      : "border-emerald-800/80";

  return (
    <div className="w-full space-y-3">
      {formationBanner ? (
        <div
          className={`flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
            isLight
              ? "border-amber-400 bg-amber-50 text-amber-950"
              : "border-amber-400/50 bg-amber-500/15 text-amber-100"
          }`}
        >
          <p>{formationBanner}</p>
          <button
            type="button"
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-black uppercase"
            onClick={() => setFormationBanner(null)}
          >
            OK
          </button>
        </div>
      ) : null}

      {hasRoleMissingBanner(missingCaptain, missingVice) && !isExporting ? (
        <div
          data-testid="pitch-role-missing"
          className={`w-full space-y-0.5 rounded-xl border px-3 py-2 text-sm font-semibold ${
            isLight
              ? "border-amber-400 bg-amber-50 text-amber-950"
              : "border-amber-400/50 bg-amber-500/15 text-amber-100"
          }`}
        >
          {missingCaptain ? (
            <p data-testid="pitch-captain-missing">
              {pt(lang, "planner.captain.missing")}
            </p>
          ) : null}
          {missingVice ? (
            <p data-testid="pitch-vice-missing">
              {pt(lang, "planner.vice.missing")}
            </p>
          ) : null}
        </div>
      ) : null}

      <div
        className={`relative w-full overflow-hidden rounded-2xl border ${pitchBorder} ${pitchBg} p-3 sm:p-4`}
        data-planner-pitch="true"
      >
        <div className="pointer-events-none absolute inset-3 rounded-xl border border-white/20 sm:inset-4" />

        <PitchLine
          slots={lineGk.length ? lineGk : [1]}
          renderTile={(slot) =>
            renderTile(slot, {
              bySlot,
              removedElementIdsInGw,
              selectedSlotForSwap,
              playersById,
              projectionsByElement,
              tileMetric,
              currentGw,
              availableGameweeks,
              lang,
              themeId,
              isLight,
              isExporting: chromeHidden,
              activeChip,
              watchlistIds,
              dragSlot,
              swapAllowed,
              onTileClickSwap,
              onSelectSlotForSwap,
              onMarkPlayerForTransferOut,
              onUndoTransferOut,
              onSetCaptain,
              onSetViceCaptain,
              onToggleWatchlist,
              setInfoElementId,
              setDragSlot,
              trySwap,
            })
          }
        />
        <PitchLine
          slots={lineDef}
          renderTile={(slot) =>
            renderTile(slot, {
              bySlot,
              removedElementIdsInGw,
              selectedSlotForSwap,
              playersById,
              projectionsByElement,
              tileMetric,
              currentGw,
              availableGameweeks,
              lang,
              themeId,
              isLight,
              isExporting: chromeHidden,
              activeChip,
              watchlistIds,
              dragSlot,
              swapAllowed,
              onTileClickSwap,
              onSelectSlotForSwap,
              onMarkPlayerForTransferOut,
              onUndoTransferOut,
              onSetCaptain,
              onSetViceCaptain,
              onToggleWatchlist,
              setInfoElementId,
              setDragSlot,
              trySwap,
            })
          }
        />
        <PitchLine
          slots={lineMid}
          renderTile={(slot) =>
            renderTile(slot, {
              bySlot,
              removedElementIdsInGw,
              selectedSlotForSwap,
              playersById,
              projectionsByElement,
              tileMetric,
              currentGw,
              availableGameweeks,
              lang,
              themeId,
              isLight,
              isExporting: chromeHidden,
              activeChip,
              watchlistIds,
              dragSlot,
              swapAllowed,
              onTileClickSwap,
              onSelectSlotForSwap,
              onMarkPlayerForTransferOut,
              onUndoTransferOut,
              onSetCaptain,
              onSetViceCaptain,
              onToggleWatchlist,
              setInfoElementId,
              setDragSlot,
              trySwap,
            })
          }
        />
        <PitchLine
          slots={lineFwd}
          renderTile={(slot) =>
            renderTile(slot, {
              bySlot,
              removedElementIdsInGw,
              selectedSlotForSwap,
              playersById,
              projectionsByElement,
              tileMetric,
              currentGw,
              availableGameweeks,
              lang,
              themeId,
              isLight,
              isExporting: chromeHidden,
              activeChip,
              watchlistIds,
              dragSlot,
              swapAllowed,
              onTileClickSwap,
              onSelectSlotForSwap,
              onMarkPlayerForTransferOut,
              onUndoTransferOut,
              onSetCaptain,
              onSetViceCaptain,
              onToggleWatchlist,
              setInfoElementId,
              setDragSlot,
              trySwap,
            })
          }
        />
      </div>

      {/* Ławka */}
      <div
        className={`w-full rounded-2xl border p-3 ${chrome.panel} ${
          activeChip === "bboost"
            ? isLight
              ? "ring-2 ring-amber-400"
              : "ring-2 ring-amber-400/80"
            : ""
        }`}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className={`text-[10px] font-black uppercase tracking-wider ${chrome.mutedLabel}`}>
            {pt(lang, "planner.horizon.bench")}
          </p>
          {activeChip === "bboost" ? (
            <span
              className={`rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase ${
                isLight
                  ? "border-amber-500 bg-amber-100 text-amber-950"
                  : "border-amber-400/50 bg-amber-500/20 text-amber-100"
              }`}
            >
              {pt(lang, "planner.pitch.benchBoostActive")}
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {benchSlots.map((slot) => (
            <div key={slot}>
              {renderTile(slot, {
                bySlot,
                removedElementIdsInGw,
                selectedSlotForSwap,
                playersById,
                projectionsByElement,
                tileMetric,
                currentGw,
                availableGameweeks,
                lang,
                themeId,
                isLight,
                isExporting: chromeHidden,
                activeChip,
                watchlistIds,
                dragSlot,
                swapAllowed,
                onTileClickSwap,
                onSelectSlotForSwap,
                onMarkPlayerForTransferOut,
                onUndoTransferOut,
                onSetCaptain,
                onSetViceCaptain,
                onToggleWatchlist,
                setInfoElementId,
                setDragSlot,
                trySwap,
                benchLabel: formatBenchSlotLabel(lang, slot),
              })}
            </div>
          ))}
        </div>
      </div>

      {infoElementId != null ? (
        <PlayerInfoModal
          elementId={infoElementId}
          themeId={themeId}
          lang={lang}
          currentGw={currentGw}
          availableGameweeks={availableGameweeks}
          pick={squadPicks.find((p) => p.elementId === infoElementId) ?? null}
          player={playersById.get(infoElementId) ?? null}
          projectionsByElement={projectionsByElement}
          onClose={() => setInfoElementId(null)}
          onUpdateCustomSellingPrice={onUpdateCustomSellingPrice}
        />
      ) : null}
    </div>
  );
}

function PitchLine({
  slots,
  renderTile,
}: {
  slots: number[];
  renderTile: (slot: number) => ReactNode;
}) {
  if (!slots.length) return null;
  return (
    <div className="relative z-[1] mb-3 flex w-full flex-wrap items-start justify-center gap-3 md:gap-5">
      {slots.map((slot) => (
        <div key={slot} className="w-[104px] sm:w-[112px]">
          {renderTile(slot)}
        </div>
      ))}
    </div>
  );
}

type TileCtx = {
  bySlot: Map<number, ReconstructedSquadPick>;
  removedElementIdsInGw?: Set<number>;
  selectedSlotForSwap: number | null;
  playersById: Map<number, PlannerPlayerCatalogItem>;
  projectionsByElement: Record<number, Record<number, PlayerGwProjection>>;
  tileMetric: PlannerTileMetric;
  currentGw: number;
  availableGameweeks: number[];
  lang: StatsLabLang;
  themeId: StatsLabChartThemeId;
  isLight: boolean;
  isExporting: boolean;
  activeChip: PlannerChipType | null;
  watchlistIds: Set<number>;
  dragSlot: number | null;
  swapAllowed: (
    from: number,
    to: number,
  ) => { ok: boolean; errorKey?: FormationErrorKey };
  onTileClickSwap: (slot: number) => void;
  onSelectSlotForSwap: (slot: number | null) => void;
  onMarkPlayerForTransferOut: (slot: number, elementId: number) => void;
  onUndoTransferOut?: (elementId: number) => void;
  onSetCaptain: (elementId: number) => void;
  onSetViceCaptain: (elementId: number) => void;
  onToggleWatchlist: (elementId: number) => void;
  setInfoElementId: (id: number) => void;
  setDragSlot: (slot: number | null) => void;
  trySwap: (from: number, to: number) => void;
  benchLabel?: string;
};

function renderTile(slot: number, ctx: TileCtx): ReactNode {
  const pick = ctx.bySlot.get(slot);
  if (!pick) {
    return (
      <div
        className={`flex min-h-[132px] items-center justify-center rounded-xl border border-dashed px-2 text-center text-[10px] font-bold ${
          ctx.isLight
            ? "border-slate-300 bg-white/80 text-slate-500"
            : "border-slate-600 bg-slate-950/50 text-slate-400"
        }`}
      >
        {pt(ctx.lang, "planner.pitch.emptySlot")}
      </div>
    );
  }

  const player = ctx.playersById.get(pick.elementId);
  const removed = ctx.removedElementIdsInGw?.has(pick.elementId) ?? false;
  const selected = ctx.selectedSlotForSwap === slot;
  const from = ctx.selectedSlotForSwap ?? ctx.dragSlot;
  let ringClass = "";
  if (from != null && from !== slot) {
    const check = ctx.swapAllowed(from, slot);
    ringClass = check.ok
      ? "ring-2 ring-emerald-400"
      : ctx.isLight
        ? "ring-1 ring-amber-400/70"
        : "ring-1 ring-amber-400/50";
  } else if (selected) {
    ringClass = "ring-2 ring-sky-400";
  }

  const proj = ctx.projectionsByElement[pick.elementId]?.[ctx.currentGw];
  const isXi = slot >= 1 && slot <= 11;
  const armbandKind = captainArmbandKind({
    isCaptain: pick.isCaptain,
    isViceCaptain: pick.isViceCaptain,
    activeChip: ctx.activeChip,
  });
  const armbandText = captainArmbandLabel(ctx.lang, armbandKind) || null;
  const chance = chanceBadge(player?.chance_of_playing_next_round);
  const starred = ctx.watchlistIds.has(pick.elementId);

  if (removed) {
    return (
      <div
        className={`flex min-h-[132px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-2 py-3 text-center ${
          ctx.isLight
            ? "border-rose-400 bg-rose-50 text-rose-900"
            : "border-rose-400/50 bg-rose-500/10 text-rose-100"
        }`}
      >
        <p className="text-[10px] font-black uppercase">
          {pt(ctx.lang, "planner.action.forSale")}
        </p>
        <p className="text-xs font-bold leading-tight">
          {pt(ctx.lang, "planner.pitch.pickFromList")}
        </p>
        {ctx.onUndoTransferOut && !ctx.isExporting ? (
          <button
            type="button"
            className="rounded-lg border border-current px-2 py-1 text-[10px] font-black uppercase"
            onClick={() => ctx.onUndoTransferOut?.(pick.elementId)}
          >
            {pt(ctx.lang, "planner.action.undo")}
          </button>
        ) : null}
      </div>
    );
  }

  const playerName = player?.web_name ?? `#${pick.elementId}`;
  const tileAria = formatPlayerTileAccessibleName({
    lang: ctx.lang,
    webName: playerName,
    clubShort: player?.club_short_name ?? "",
    isCaptain: pick.isCaptain,
    isViceCaptain: pick.isViceCaptain,
  });
  const actions = getPlannerActionChrome(ctx.themeId);

  return (
    <div
      role="group"
      aria-label={tileAria}
      draggable={!ctx.isExporting}
      onDragStart={() => ctx.setDragSlot(slot)}
      onDragEnd={() => ctx.setDragSlot(null)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (ctx.dragSlot != null) ctx.trySwap(ctx.dragSlot, slot);
        ctx.setDragSlot(null);
      }}
      data-testid="player-tile"
      className={`relative flex max-w-full min-h-[132px] flex-col rounded-xl border px-1.5 pb-2 pt-1 shadow-sm ${
        ctx.isLight
          ? "border-slate-300 bg-white text-slate-900"
          : "border-slate-700 bg-slate-950/80 text-slate-100"
      } ${ringClass}`}
    >
      {/* Akcje: ✕ ⇄ C VC w jednym rzędzie (C/VC tylko XI); ☆ ⓘ na zdjęciu */}
      <div className="mb-0.5 flex max-w-full items-center justify-between gap-0.5">
        <div className="flex min-w-0 items-center gap-0.5">
          {!ctx.isExporting ? (
            <>
              <button
                type="button"
                title={actionAria(ctx.lang, "planner.action.sell", playerName)}
                aria-label={actionAria(
                  ctx.lang,
                  "planner.action.sell",
                  playerName,
                )}
                className={`${PLANNER_ACTION_HIT_CLASS} ${actions.sell}`}
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.onMarkPlayerForTransferOut(slot, pick.elementId);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title={actionAria(ctx.lang, "planner.action.swap", playerName)}
                aria-label={actionAria(
                  ctx.lang,
                  "planner.action.swap",
                  playerName,
                )}
                className={`${PLANNER_ACTION_HIT_CLASS} ${
                  selected ? actions.swapSelected : actions.swap
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.onTileClickSwap(slot);
                }}
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
              </button>
            </>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {chance ? (
            <span
              className={`inline-flex h-5 items-center rounded px-1 text-[9px] font-black ${
                ctx.isLight
                  ? "bg-rose-100 text-rose-800"
                  : "bg-rose-500/25 text-rose-100"
              }`}
            >
              {chance}
            </span>
          ) : null}
          {!ctx.isExporting && isXi ? (
            <>
              <button
                type="button"
                aria-pressed={pick.isCaptain}
                className={`${PLANNER_ACTION_HIT_CLASS} text-[10px] font-black ${
                  pick.isCaptain ? actions.captainPressed : actions.captainIdle
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.onSetCaptain(pick.elementId);
                }}
                title={actionAria(
                  ctx.lang,
                  "planner.action.captain",
                  playerName,
                )}
                aria-label={actionAria(
                  ctx.lang,
                  "planner.action.captain",
                  playerName,
                )}
              >
                C
              </button>
              <button
                type="button"
                aria-pressed={pick.isViceCaptain}
                className={`${PLANNER_ACTION_HIT_CLASS} text-[10px] font-black ${
                  pick.isViceCaptain ? actions.vicePressed : actions.viceIdle
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.onSetViceCaptain(pick.elementId);
                }}
                title={actionAria(ctx.lang, "planner.action.vice", playerName)}
                aria-label={actionAria(
                  ctx.lang,
                  "planner.action.vice",
                  playerName,
                )}
              >
                VC
              </button>
            </>
          ) : null}
        </div>
      </div>

      {ctx.benchLabel ? (
        <p className="mb-0.5 text-center text-[9px] font-black uppercase tracking-wider opacity-70">
          {ctx.benchLabel}
        </p>
      ) : null}

      {/* Foto + opaska C/VC/TC; ☆ ⓘ w prawym górnym rogu zdjęcia (w obrębie karty) */}
      <div className="relative mx-auto mb-1 w-full max-w-[5.75rem] sm:max-w-[6.75rem]">
        <div className="relative mx-auto h-11 w-11 sm:h-14 sm:w-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fplLabPlayerPhotoUrl(player?.player_code ?? 0)}
            alt={player?.web_name ?? ""}
            crossOrigin="anonymous"
            className="h-11 w-11 rounded-full object-cover object-top sm:h-14 sm:w-14"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          {armbandText && armbandKind ? (
            <span
              data-testid="captain-armband"
              role="img"
              aria-label={captainArmbandAria(ctx.lang, armbandKind)}
              className={`absolute -left-0.5 -top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black ${actions.armband}`}
            >
              {armbandText}
            </span>
          ) : null}
          {player?.club_pulse_code ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fplLabBadgeUrl(player.club_pulse_code)}
              alt=""
              crossOrigin="anonymous"
              className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-black/40 object-contain p-0.5"
            />
          ) : null}
        </div>
        {!ctx.isExporting ? (
          <div className="absolute right-0 top-0 z-10 flex flex-col items-center gap-0.5">
            <button
              type="button"
              className={`${PLANNER_ACTION_HIT_CLASS} ${
                starred ? actions.watchActive : actions.watchIdle
              }`}
              onClick={(e) => {
                e.stopPropagation();
                ctx.onToggleWatchlist(pick.elementId);
              }}
              aria-label={actionAria(
                ctx.lang,
                starred
                  ? "planner.action.unwatch"
                  : "planner.action.watch",
                playerName,
              )}
            >
              <Star
                className={`h-3.5 w-3.5 ${starred ? "fill-[#f59e0b]" : ""}`}
              />
            </button>
            <button
              type="button"
              className={`${PLANNER_ACTION_HIT_CLASS} ${actions.info}`}
              onClick={(e) => {
                e.stopPropagation();
                ctx.setInfoElementId(pick.elementId);
              }}
              aria-label={actionAria(
                ctx.lang,
                "planner.action.info",
                playerName,
              )}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>

      <p className="px-0.5 text-center text-[13px] font-semibold leading-tight sm:text-[14px]">
        {playerName}
      </p>
      {player?.club_short_name ? (
        <p className="px-0.5 text-center text-[9px] font-semibold opacity-70">
          {player.club_short_name}
        </p>
      ) : null}

      <div className="mt-1 px-0.5">
        <TileMetricBlock
          pick={pick}
          player={player}
          proj={proj}
          tileMetric={ctx.tileMetric}
          currentGw={ctx.currentGw}
          projectionsByElement={ctx.projectionsByElement}
          elementId={pick.elementId}
          isLight={ctx.isLight}
          activeChip={ctx.activeChip}
          lang={ctx.lang}
        />
      </div>
    </div>
  );
}

function TileMetricBlock({
  pick,
  player,
  proj,
  tileMetric,
  currentGw,
  projectionsByElement,
  elementId,
  isLight,
  activeChip,
  lang,
}: {
  pick: ReconstructedSquadPick;
  player: PlannerPlayerCatalogItem | undefined;
  proj: PlayerGwProjection | undefined;
  tileMetric: PlannerTileMetric;
  currentGw: number;
  projectionsByElement: Record<number, Record<number, PlayerGwProjection>>;
  elementId: number;
  isLight: boolean;
  activeChip: PlannerChipType | null;
  lang: StatsLabLang;
}) {
  if (tileMetric === "XPTS") {
    const base = proj?.xPts ?? 0;
    const mult =
      pick.isCaptain ? (activeChip === "3xc" ? 3 : 2) : 1;
    const shown = base * mult;
    const pills = formatFixturePills(lang, proj);
    return (
      <div className="text-center">
        <p
          className={`text-[12px] font-semibold tabular-nums ${
            isLight
              ? "text-[#0f766e]"
              : "text-emerald-400"
          }`}
        >
          {pick.isCaptain && mult > 1
            ? `${base.toFixed(1)} ×${mult} = ${shown.toFixed(1)}`
            : `${base.toFixed(1)} xPts`}
        </p>
        <p className="text-[11px] font-semibold opacity-80">
          {pills.map((p) => p.label).join(" · ")}
        </p>
      </div>
    );
  }

  if (tileMetric === "PRICES") {
    return (
      <div className="text-center">
        <p className="text-[10px] font-black tabular-nums leading-tight">
          {(pick.purchasePriceTenths / 10).toFixed(1)} /{" "}
          {(pick.nowCostTenths / 10).toFixed(1)} /{" "}
          {(pick.sellingPriceTenths / 10).toFixed(1)}
        </p>
        <p className="mt-0.5 text-[9px] font-bold">
          {pick.willDropAffectSell ? (
            <span className="text-amber-500">⚠️ SP</span>
          ) : (
            <span className="text-emerald-500">● SP OK</span>
          )}
        </p>
      </div>
    );
  }

  if (tileMetric === "FORM") {
    return (
      <div className="text-center text-[10px] font-bold leading-tight">
        <p>
          {lang === "pl" ? "Forma" : "Form"}:{" "}
          {(player?.form ?? 0).toFixed(1)}
        </p>
        <p className="opacity-80">
          TSB: {(player?.selected_by_percent ?? 0).toFixed(1)}%
        </p>
      </div>
    );
  }

  if (tileMetric === "DC") {
    return (
      <div className="text-center text-[10px] font-bold leading-tight">
        <p>
          DC Pkt: {player?.dc_bonus_points ?? 0}
        </p>
        <p className="opacity-80">
          DC: {player?.defensive_contribution ?? 0} ·{" "}
          {(proj?.xPts ?? 0).toFixed(1)} xPts
        </p>
      </div>
    );
  }

  // FIXTURES (default) — 1 GW = 1 wiersz (DGW = 2 pigułki w nowrap)
  const gws = [currentGw, currentGw + 1, currentGw + 2];
  const main = projectionsByElement[elementId]?.[gws[0]!];
  return (
    <div className="space-y-1 text-center" data-testid="fixture-pills-stack">
      {gws.map((gw) => {
        const p = projectionsByElement[elementId]?.[gw];
        return (
          <PlannerFixturePills
            key={gw}
            lang={lang}
            proj={p}
            isLight={isLight}
            fdrClass={fdrPillClass}
          />
        );
      })}
      <p className="text-[12px] font-semibold tabular-nums opacity-90">
        <span
          className={`font-semibold ${
            isLight ? "text-[#0f766e]" : "text-emerald-400"
          }`}
        >
          {(main?.xPts ?? 0).toFixed(1)} xPts
        </span>
        {" · "}
        {tenthsToPounds(pick.sellingPriceTenths)}
      </p>
    </div>
  );
}

function PlayerInfoModal({
  elementId,
  themeId,
  lang,
  currentGw,
  availableGameweeks,
  pick,
  player,
  projectionsByElement,
  onClose,
  onUpdateCustomSellingPrice,
}: {
  elementId: number;
  themeId: StatsLabChartThemeId;
  lang: StatsLabLang;
  currentGw: number;
  availableGameweeks: number[];
  pick: ReconstructedSquadPick | null;
  player: PlannerPlayerCatalogItem | null;
  projectionsByElement: Record<number, Record<number, PlayerGwProjection>>;
  onClose: () => void;
  onUpdateCustomSellingPrice?: (
    elementId: number,
    sellingPriceTenths: number,
  ) => void;
}) {
  const chrome = getStatsLabMenuChrome(themeId);
  const isLight = chrome.isLight;
  const proj = projectionsByElement[elementId]?.[currentGw];
  const sell = pick?.sellingPriceTenths ?? player?.now_cost ?? 50;
  const source = pick?.priceSource ?? "derived";

  const upcoming = availableGameweeks
    .filter((g) => g >= currentGw)
    .slice(0, 6);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-3 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-4 shadow-2xl ${chrome.panel}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fplLabPlayerPhotoUrl(player?.player_code ?? 0)}
            alt=""
            crossOrigin="anonymous"
            className="h-16 w-16 rounded-xl object-cover object-top"
          />
          <div className="min-w-0 flex-1">
            <h3 className={`text-lg font-black ${chrome.text}`}>
              {player?.web_name ?? `#${elementId}`}
            </h3>
            <p className={`text-sm ${chrome.mutedLabel}`}>
              {player?.club_short_name} ·{" "}
              {player?.element_type === 1
                ? "GKP"
                : player?.element_type === 2
                  ? "DEF"
                  : player?.element_type === 3
                    ? "MID"
                    : "FWD"}
            </p>
            {player?.news ? (
              <p
                className={`mt-1 text-xs font-semibold ${
                  isLight ? "text-amber-800" : "text-amber-200"
                }`}
              >
                {player.news}
                {player.chance_of_playing_next_round != null
                  ? ` · ${player.chance_of_playing_next_round}%`
                  : ""}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className={`rounded-lg border p-2 ${chrome.inactiveBtn}`}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {(
            [
              ["planner.price.purchase.short", pick?.purchasePriceTenths ?? player?.now_cost ?? 0],
              ["planner.price.current.short", pick?.nowCostTenths ?? player?.now_cost ?? 0],
              ["planner.price.selling.short", sell],
            ] as const
          ).map(([labelKey, value]) => (
            <div
              key={labelKey}
              className={`rounded-xl border p-2 text-center ${chrome.group}`}
            >
              <p className={`text-[9px] font-black uppercase ${chrome.mutedLabel}`}>
                {pt(lang, labelKey)}
              </p>
              <p className={`mt-1 text-sm font-black tabular-nums ${chrome.text}`}>
                {formatTenthsAsPounds(Number(value))}
              </p>
            </div>
          ))}
        </div>
        <p className={`mt-2 text-center text-[10px] font-bold ${chrome.mutedLabel}`}>
          {plannerSourceLabel(lang, source)}
        </p>

        {pick && onUpdateCustomSellingPrice ? (
          <div className="mt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black ${chrome.inactiveBtn}`}
              onClick={() =>
                onUpdateCustomSellingPrice(
                  elementId,
                  Math.max(35, sell - 1),
                )
              }
            >
              −0.1m
            </button>
            <button
              type="button"
              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black ${chrome.inactiveBtn}`}
              onClick={() =>
                onUpdateCustomSellingPrice(elementId, sell + 1)
              }
            >
              +0.1m
            </button>
          </div>
        ) : null}

        <p
          className={`mt-3 rounded-xl border px-3 py-2 text-xs font-semibold ${
            pick?.willDropAffectSell
              ? isLight
                ? "border-amber-400 bg-amber-50 text-amber-950"
                : "border-amber-400/40 bg-amber-500/15 text-amber-100"
              : isLight
                ? "border-emerald-400 bg-emerald-50 text-emerald-950"
                : "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
          }`}
        >
          {pick?.willDropAffectSell
            ? pt(lang, "planner.price.dropAffects")
            : pt(lang, "planner.price.dropSafe")}
        </p>

        <div className={`mt-4 rounded-xl border p-3 ${chrome.group}`}>
          <p className={`text-[10px] font-black uppercase ${chrome.mutedLabel}`}>
            xPts v1 · GW{currentGw}
          </p>
          <p className={`mt-1 text-2xl font-black tabular-nums ${chrome.text}`}>
            {(proj?.xPts ?? 0).toFixed(2)}
          </p>
          <p className={`mt-1 text-xs ${chrome.mutedLabel}`}>
            E[min] {(proj?.expectedMinutes ?? 0).toFixed(0)} · p60{" "}
            {((proj?.p60 ?? 0) * 100).toFixed(0)}% · p1{" "}
            {((proj?.p1 ?? 0) * 100).toFixed(0)}%
            {proj?.isDouble ? " · DGW" : proj?.isBlank ? " · BGW" : ""}
          </p>
        </div>

        <div className="mt-4">
          <p className={`mb-2 text-[10px] font-black uppercase ${chrome.mutedLabel}`}>
            {lang === "pl" ? "Nadchodzące kolejki" : "Upcoming fixtures"}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {upcoming.map((gw) => {
              const p = projectionsByElement[elementId]?.[gw];
              return (
                <div
                  key={gw}
                  className={`rounded-xl border p-2 ${chrome.group}`}
                >
                  <p className={`text-[9px] font-black ${chrome.mutedLabel}`}>
                    GW{gw}
                  </p>
                  <div className="mt-1">
                    <PlannerFixturePills
                      lang={lang}
                      proj={p}
                      isLight={isLight}
                      fdrClass={fdrPillClass}
                    />
                  </div>
                  <p className={`mt-1 text-xs font-black tabular-nums ${chrome.text}`}>
                    {(p?.xPts ?? 0).toFixed(1)} xPts
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
