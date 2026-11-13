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
  plannerUi,
  type PlannerChipType,
  type PlannerTileMetric,
} from "@/lib/stats-lab/plannerI18n";
import { getStatsLabMenuChrome } from "@/lib/stats-lab/menuChrome";
import {
  fplLabBadgeUrl,
  fplLabPlayerPhotoUrl,
} from "@/lib/stats-lab/mediaUrls";
import type { FplLabPlayer } from "@/lib/stats-lab/types";

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
  isExporting?: boolean;
};

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

function formationMessage(
  key: FormationErrorKey,
  ui: ReturnType<typeof plannerUi>,
): string {
  return ui[key];
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
}: PlannerPitchProps) {
  const chrome = getStatsLabMenuChrome(themeId);
  const ui = plannerUi(lang);
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
        formationMessage(check.errorKey ?? "formationErrorGkOnly", ui),
      );
      return;
    }
    setFormationBanner(null);
    onSwapSlots(from, to);
    onSelectSlotForSwap(null);
  }

  function onTileClickSwap(slot: number) {
    if (isExporting) return;
    if (selectedSlotForSwap == null) {
      onSelectSlotForSwap(slot);
      return;
    }
    trySwap(selectedSlotForSwap, slot);
  }

  const pitchBg = isLight
    ? "bg-gradient-to-b from-emerald-100 via-emerald-50 to-emerald-100"
    : themeId === "SCOUT_DARK"
      ? "bg-gradient-to-b from-[#0a2a22] via-[#071c17] to-[#0a2a22]"
      : "bg-gradient-to-b from-emerald-950 via-slate-950 to-emerald-950";

  const pitchBorder = isLight
    ? "border-emerald-300"
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
              ui,
              isLight,
              isExporting,
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
              ui,
              isLight,
              isExporting,
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
              ui,
              isLight,
              isExporting,
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
              ui,
              isLight,
              isExporting,
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
            {lang === "pl" ? "Ławka rezerwowych" : "Bench"}
          </p>
          {activeChip === "bboost" ? (
            <span
              className={`rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase ${
                isLight
                  ? "border-amber-500 bg-amber-100 text-amber-950"
                  : "border-amber-400/50 bg-amber-500/20 text-amber-100"
              }`}
            >
              Bench Boost {lang === "pl" ? "aktywny" : "active"}
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {benchSlots.map((slot) =>
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
              ui,
              isLight,
              isExporting,
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
              benchLabel:
                slot === 12
                  ? "GKP"
                  : slot === 13
                    ? "1. REZ"
                    : slot === 14
                      ? "2. REZ"
                      : "3. REZ",
            }),
          )}
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
  ui: ReturnType<typeof plannerUi>;
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
        {ctx.lang === "pl" ? "Pusty slot" : "Empty slot"}
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
  const capLabel =
    pick.isCaptain && ctx.activeChip === "3xc"
      ? "3×C"
      : pick.isCaptain
        ? "C"
        : pick.isViceCaptain
          ? "V"
          : null;
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
          {ctx.lang === "pl" ? "Do wymiany" : "To replace"}
        </p>
        <p className="text-xs font-bold leading-tight">
          {ctx.lang === "pl" ? "Wybierz z listy" : "Pick from list"}
        </p>
        {ctx.onUndoTransferOut && !ctx.isExporting ? (
          <button
            type="button"
            className="rounded-lg border border-current px-2 py-1 text-[10px] font-black uppercase"
            onClick={() => ctx.onUndoTransferOut?.(pick.elementId)}
          >
            Undo
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      draggable={!ctx.isExporting}
      onDragStart={() => ctx.setDragSlot(slot)}
      onDragEnd={() => ctx.setDragSlot(null)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (ctx.dragSlot != null) ctx.trySwap(ctx.dragSlot, slot);
        ctx.setDragSlot(null);
      }}
      className={`relative flex min-h-[132px] flex-col rounded-xl border px-1.5 pb-2 pt-1 shadow-sm ${
        ctx.isLight
          ? "border-slate-300 bg-white text-slate-900"
          : "border-slate-700 bg-slate-950/80 text-slate-100"
      } ${ringClass}`}
    >
      {/* Akcje */}
      <div className="mb-0.5 flex items-start justify-between gap-0.5">
        <div className="flex items-center gap-0.5">
          {!ctx.isExporting ? (
            <>
              <button
                type="button"
                title="Transfer out"
                className="inline-flex h-5 w-5 items-center justify-center rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.onMarkPlayerForTransferOut(slot, pick.elementId);
                }}
              >
                <X className="h-3 w-3" />
              </button>
              <button
                type="button"
                title="Swap"
                className={`inline-flex h-5 w-5 items-center justify-center rounded ${
                  selected
                    ? "bg-sky-500/30 text-sky-200"
                    : "bg-slate-500/20 text-slate-200 hover:bg-slate-500/30"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.onTileClickSwap(slot);
                }}
              >
                <ArrowLeftRight className="h-3 w-3" />
              </button>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-0.5">
          {capLabel ? (
            <span
              className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded px-1 text-[9px] font-black ${
                ctx.isLight
                  ? "bg-amber-200 text-amber-950"
                  : "bg-amber-400 text-slate-950"
              }`}
            >
              {capLabel}
            </span>
          ) : null}
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
                className="inline-flex h-5 w-5 items-center justify-center rounded bg-amber-500/20 text-[9px] font-black text-amber-200"
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.onSetCaptain(pick.elementId);
                }}
                title="Captain"
              >
                C
              </button>
              <button
                type="button"
                className="inline-flex h-5 w-5 items-center justify-center rounded bg-slate-500/20 text-[9px] font-black text-slate-200"
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.onSetViceCaptain(pick.elementId);
                }}
                title="Vice"
              >
                V
              </button>
            </>
          ) : null}
          {!ctx.isExporting ? (
            <>
              <button
                type="button"
                className={`inline-flex h-5 w-5 items-center justify-center rounded ${
                  starred ? "text-amber-400" : "text-slate-400"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.onToggleWatchlist(pick.elementId);
                }}
              >
                <Star
                  className={`h-3 w-3 ${starred ? "fill-amber-400" : ""}`}
                />
              </button>
              <button
                type="button"
                className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-300 hover:bg-slate-500/20"
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.setInfoElementId(pick.elementId);
                }}
              >
                <Info className="h-3 w-3" />
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

      {/* Foto */}
      <div className="relative mx-auto mb-1 h-12 w-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fplLabPlayerPhotoUrl(player?.player_code ?? 0)}
          alt={player?.web_name ?? ""}
          crossOrigin="anonymous"
          className="h-12 w-12 rounded-full object-cover object-top"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
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

      <p className="px-0.5 text-center text-[11px] font-bold leading-tight sm:text-xs">
        {player?.web_name ?? `#${pick.elementId}`}
      </p>

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
    const fx = proj?.fixtures?.[0];
    return (
      <div className="text-center">
        <p className="text-[12px] font-black tabular-nums text-emerald-500">
          {pick.isCaptain && mult > 1
            ? `${base.toFixed(1)} ×${mult} = ${shown.toFixed(1)}`
            : `${base.toFixed(1)} xPts`}
        </p>
        <p className="text-[9px] font-semibold opacity-80">
          {proj?.isBlank
            ? "BGW —"
            : fx?.tickerLabel ?? (lang === "pl" ? "brak" : "n/a")}
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

  // FIXTURES (default) — 3 GW strip
  const gws = [currentGw, currentGw + 1, currentGw + 2];
  const main = projectionsByElement[elementId]?.[gws[0]!];
  const mainFx = main?.fixtures?.[0];
  return (
    <div className="space-y-1 text-center">
      <div
        className={`mx-auto inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-black ${
          main?.isBlank
            ? isLight
              ? "border-slate-300 bg-slate-100 text-slate-600"
              : "border-slate-600 bg-slate-800 text-slate-300"
            : fdrPillClass(mainFx?.fdrLevel ?? 3, isLight)
        }`}
      >
        {main?.isBlank
          ? "BGW —"
          : main?.isDouble
            ? `DGW ${mainFx?.tickerLabel ?? ""}`
            : mainFx?.tickerLabel ?? "—"}
      </div>
      <div className="flex justify-center gap-0.5">
        {gws.slice(1).map((gw) => {
          const p = projectionsByElement[elementId]?.[gw];
          const fx = p?.fixtures?.[0];
          return (
            <span
              key={gw}
              className={`rounded border px-1 py-0.5 text-[8px] font-bold ${
                p?.isBlank
                  ? isLight
                    ? "border-slate-200 bg-slate-50 text-slate-500"
                    : "border-slate-700 bg-slate-900 text-slate-400"
                  : fdrPillClass(fx?.fdrLevel ?? 3, isLight)
              }`}
              title={`GW${gw}`}
            >
              {p?.isBlank ? "—" : fx?.opponentShortName?.slice(0, 3) ?? "·"}
            </span>
          );
        })}
      </div>
      <p className="text-[9px] font-bold tabular-nums opacity-90">
        {(main?.xPts ?? 0).toFixed(1)} xPts ·{" "}
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
  const ui = plannerUi(lang);
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
              [
                lang === "pl" ? "Cena zakupu (PP)" : "Purchase (PP)",
                pick?.purchasePriceTenths ?? player?.now_cost ?? 0,
              ],
              [
                lang === "pl" ? "Cena rynkowa (CP)" : "Current (CP)",
                pick?.nowCostTenths ?? player?.now_cost ?? 0,
              ],
              [
                lang === "pl" ? "Cena sprzedaży (SP)" : "Selling (SP)",
                sell,
              ],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className={`rounded-xl border p-2 text-center ${chrome.group}`}
            >
              <p className={`text-[9px] font-black uppercase ${chrome.mutedLabel}`}>
                {label}
              </p>
              <p className={`mt-1 text-sm font-black tabular-nums ${chrome.text}`}>
                {tenthsToPounds(Number(value))}
              </p>
            </div>
          ))}
        </div>
        <p className={`mt-2 text-center text-[10px] font-bold ${chrome.mutedLabel}`}>
          {ui.valueSource[source]}
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
          {pick?.willDropAffectSell ? ui.priceDropRisk : ui.priceDropSafe}
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
              const fx = p?.fixtures?.[0];
              return (
                <div
                  key={gw}
                  className={`rounded-xl border p-2 ${chrome.group}`}
                >
                  <p className={`text-[9px] font-black ${chrome.mutedLabel}`}>
                    GW{gw}
                  </p>
                  <p
                    className={`mt-1 inline-flex rounded border px-1.5 py-0.5 text-[10px] font-black ${
                      p?.isBlank
                        ? isLight
                          ? "border-slate-300 bg-slate-100 text-slate-600"
                          : "border-slate-600 bg-slate-800 text-slate-300"
                        : fdrPillClass(fx?.fdrLevel ?? 3, isLight)
                    }`}
                  >
                    {p?.isBlank
                      ? "BGW"
                      : p?.isDouble
                        ? `DGW ${fx?.tickerLabel ?? ""}`
                        : fx?.tickerLabel ?? "—"}
                  </p>
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
