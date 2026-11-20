"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Star, X } from "lucide-react";
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
  formatBenchSlotChipLabel,
  formatBenchSlotLabel,
  groupPitchSlots,
  plannerDisplayFullName,
} from "@/lib/stats-lab/plannerUiFormat";
import { captainArmbandKind } from "@/lib/stats-lab/plannerFixtureUi";
import { getStatsLabMenuChrome } from "@/lib/stats-lab/menuChrome";
import { fplLabPlayerPhotoUrl } from "@/lib/stats-lab/mediaUrls";
import type { FplLabPlayer } from "@/lib/stats-lab/types";
import { PlannerFixturePills } from "@/components/admin/stats-lab/planner/PlannerFixturePills";
import { fdrPillClass } from "@/components/admin/stats-lab/planner/plannerCardPalette";
import {
  PlannerEmptySlot,
  PlannerPlayerCard,
} from "@/components/admin/stats-lab/planner/PlannerPlayerCard";

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
  /** Bank albo bank + SP gracza do zejścia. Pusty slot dopisuje „do £X.Xm”. */
  emptySlotBudgetTenths?: number;
  /** Info z Rynku — to samo okno co nazwisko na boisku. */
  requestedInfoElementId?: number | null;
  onRequestedInfoHandled?: () => void;
};

function hasRoleMissingBanner(
  missingCaptain: boolean | undefined,
  missingVice: boolean | undefined,
): boolean {
  return !!missingCaptain || !!missingVice;
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
  emptySlotBudgetTenths,
  requestedInfoElementId = null,
  onRequestedInfoHandled,
}: PlannerPitchProps) {
  const chromeHidden = hideActionChrome || isExporting;
  const chrome = getStatsLabMenuChrome(themeId);
  const isLight = chrome.isLight;
  const [formationBanner, setFormationBanner] = useState<string | null>(null);
  const [infoElementId, setInfoElementId] = useState<number | null>(null);
  useEffect(() => {
    if (requestedInfoElementId != null) setInfoElementId(requestedInfoElementId);
  }, [requestedInfoElementId]);
  const [actionSlot, setActionSlot] = useState<number | null>(null);
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

  const pitchLines = groupPitchSlots(
    xiSlots.map((slot) => {
      const pick = bySlot.get(slot);
      if (!pick) return { slot, elementType: null };
      const elementType = playersById.get(pick.elementId)?.element_type;
      if (
        elementType === 1 ||
        elementType === 2 ||
        elementType === 3 ||
        elementType === 4
      ) {
        return { slot, elementType };
      }
      return { slot, elementType: null };
    }),
  );
  const lineGk = pitchLines.gk;
  const lineDef = pitchLines.def;
  const lineMid = pitchLines.mid;
  const lineFwd = pitchLines.fwd;

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
        className={`relative w-full overflow-hidden rounded-2xl border ${pitchBorder} ${pitchBg} px-1 py-3 sm:px-4 sm:py-4`}
        data-planner-pitch="true"
      >
        <div className="pointer-events-none absolute inset-1 rounded-xl border border-white/20 sm:inset-4" />

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
              emptySlotBudgetTenths,
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
              setActionSlot,
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
              emptySlotBudgetTenths,
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
              setActionSlot,
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
              emptySlotBudgetTenths,
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
              setActionSlot,
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
              emptySlotBudgetTenths,
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
              setActionSlot,
              setDragSlot,
              trySwap,
            })
          }
        />
        <p className={`relative z-[1] px-2 text-center text-[11px] font-semibold leading-snug ${chrome.mutedLabel}`}>
          {pt(lang, "planner.fdr.legend")}
          {" · "}
          {pt(lang, "planner.pitch.venueLegend")}
        </p>
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
        <div
          className="grid w-full min-w-0 justify-evenly gap-x-1"
          style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
          data-testid="bench-row"
        >
          {benchSlots.map((slot) => (
            <div key={slot} className="mx-auto flex w-full min-w-0 max-w-[6.5rem] flex-col items-stretch">
              <span
                className={`mb-1 self-center rounded-full border px-2 text-[10px] font-extrabold leading-4 ${
                  isLight
                    ? "border-slate-300 bg-white text-slate-600"
                    : "border-slate-700 bg-slate-950/80 text-slate-300"
                }`}
                aria-hidden="true"
              >
                {formatBenchSlotChipLabel(lang, slot)}
              </span>
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
                emptySlotBudgetTenths,
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
                setActionSlot,
                setDragSlot,
                trySwap,
                benchAccessibleLabel: formatBenchSlotLabel(lang, slot),
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
          onClose={() => {
            setInfoElementId(null);
            onRequestedInfoHandled?.();
          }}
          onUpdateCustomSellingPrice={onUpdateCustomSellingPrice}
          onSetCaptain={onSetCaptain}
          onSetViceCaptain={onSetViceCaptain}
          onToggleWatchlist={onToggleWatchlist}
          starred={watchlistIds.has(infoElementId)}
        />
      ) : null}

      {actionSlot != null && !chromeHidden ? (
        <CardActionSheet
          slot={actionSlot}
          lang={lang}
          themeId={themeId}
          bySlot={bySlot}
          playersById={playersById}
          onClose={() => setActionSlot(null)}
          onSell={(slot, elementId) => {
            setActionSlot(null);
            onMarkPlayerForTransferOut(slot, elementId);
          }}
          onSwap={(slot) => {
            setActionSlot(null);
            onTileClickSwap(slot);
          }}
          onInfo={(elementId) => {
            setActionSlot(null);
            setInfoElementId(elementId);
          }}
          onSetCaptain={(elementId) => {
            setActionSlot(null);
            onSetCaptain(elementId);
          }}
          onSetViceCaptain={(elementId) => {
            setActionSlot(null);
            onSetViceCaptain(elementId);
          }}
          onToggleWatchlist={(elementId) => {
            onToggleWatchlist(elementId);
          }}
          watchlistIds={watchlistIds}
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
    <div
      className="relative z-[1] mb-2 grid w-full min-w-0 justify-evenly gap-x-1"
      style={{
        gridTemplateColumns: `repeat(${slots.length}, minmax(0, 1fr))`,
      }}
      data-testid="pitch-line"
    >
      {slots.map((slot) => (
        <div key={slot} className="mx-auto w-full min-w-0 max-w-[6.5rem]">
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
  setActionSlot: (slot: number) => void;
  setDragSlot: (slot: number | null) => void;
  trySwap: (from: number, to: number) => void;
  benchAccessibleLabel?: string;
  emptySlotBudgetTenths?: number;
};

function renderTile(slot: number, ctx: TileCtx): ReactNode {
  const pick = ctx.bySlot.get(slot);
  if (!pick) {
    return (
      <PlannerEmptySlot
        themeId={ctx.themeId}
        lang={ctx.lang}
        slot={slot}
        budgetTenths={ctx.emptySlotBudgetTenths}
      />
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

  if (removed) {
    return (
      <div
        className={`flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-2 py-3 text-center ${
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
  const fullName = plannerDisplayFullName(player) || playerName;

  return (
    <PlannerPlayerCard
      themeId={ctx.themeId}
      lang={ctx.lang}
      isLight={ctx.isLight}
      isExporting={ctx.isExporting}
      pick={pick}
      player={player}
      proj={proj}
      projectionsForElement={ctx.projectionsByElement[pick.elementId]}
      currentGw={ctx.currentGw}
      tileMetric={ctx.tileMetric}
      activeChip={ctx.activeChip}
      armbandKind={isXi ? armbandKind : null}
      playerName={playerName}
      fullName={fullName}
      benchAccessibleLabel={ctx.benchAccessibleLabel}
      ringClass={ringClass}
      onSell={() => ctx.onMarkPlayerForTransferOut(slot, pick.elementId)}
      onSwap={() => ctx.onTileClickSwap(slot)}
      onInfo={() => ctx.setInfoElementId(pick.elementId)}
      onOpenActions={() => ctx.setActionSlot(slot)}
      draggable={!ctx.isExporting}
      onDragStart={() => ctx.setDragSlot(slot)}
      onDragEnd={() => ctx.setDragSlot(null)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        if (ctx.dragSlot != null) ctx.trySwap(ctx.dragSlot, slot);
        ctx.setDragSlot(null);
      }}
    />
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
  onSetCaptain,
  onSetViceCaptain,
  onToggleWatchlist,
  starred,
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
  onSetCaptain: (elementId: number) => void;
  onSetViceCaptain: (elementId: number) => void;
  onToggleWatchlist: (elementId: number) => void;
  starred: boolean;
}) {
  const chrome = getStatsLabMenuChrome(themeId);
  const isLight = chrome.isLight;
  const proj = projectionsByElement[elementId]?.[currentGw];
  const sell = pick?.sellingPriceTenths ?? player?.now_cost ?? 50;
  const source = pick?.priceSource ?? "derived";
  const webName = player?.web_name ?? `#${elementId}`;
  const fullName = plannerDisplayFullName(player) || webName;
  const isXi = (pick?.slot ?? 0) >= 1 && (pick?.slot ?? 0) <= 11;

  const upcoming = availableGameweeks
    .filter((g) => g >= currentGw)
    .slice(0, 6);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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
        <div className="flex items-start gap-2" data-testid="info-role-actions">
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            {isXi ? (
              <>
                <button
                  type="button"
                  aria-pressed={!!pick?.isCaptain}
                  className={`min-h-11 rounded-xl px-3 text-[11px] font-black ${
                    pick?.isCaptain ? chrome.activeBtn : chrome.inactiveBtn
                  }`}
                  aria-label={actionAria(lang, "planner.action.captain", webName)}
                  onClick={() => onSetCaptain(elementId)}
                >
                  {pt(lang, "planner.role.badgeC")}
                </button>
                <button
                  type="button"
                  aria-pressed={!!pick?.isViceCaptain}
                  className={`min-h-11 rounded-xl px-3 text-[11px] font-black ${
                    pick?.isViceCaptain ? chrome.activeBtn : chrome.inactiveBtn
                  }`}
                  aria-label={actionAria(lang, "planner.action.vice", webName)}
                  onClick={() => onSetViceCaptain(elementId)}
                >
                  {pt(lang, "planner.role.badgeVC")}
                </button>
              </>
            ) : null}
            <button
              type="button"
              className={`inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-[11px] font-black ${chrome.inactiveBtn}`}
              aria-label={actionAria(
                lang,
                starred ? "planner.action.unwatch" : "planner.action.watch",
                webName,
              )}
              onClick={() => onToggleWatchlist(elementId)}
            >
              <Star className={`h-3.5 w-3.5 ${starred ? "fill-[#f59e0b]" : ""}`} />
              <span>{lang === "pl" ? "Obserwuj" : "Watch"}</span>
            </button>
          </div>
          <button
            type="button"
            className={`rounded-lg border p-2 ${chrome.inactiveBtn}`}
            aria-label={pt(lang, "planner.action.close")}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fplLabPlayerPhotoUrl(player?.player_code ?? 0)}
            alt=""
            crossOrigin="anonymous"
            className="h-16 w-16 rounded-xl object-cover object-top"
          />
          <div className="min-w-0 flex-1">
            <h3 className={`text-lg font-black ${chrome.text}`}>{fullName}</h3>
            {fullName !== webName ? (
              <p className={`text-sm font-semibold ${chrome.text}`}>{webName}</p>
            ) : null}
            <p className={`text-sm ${chrome.mutedLabel}`}>
              {player?.club_short_name} ·{" "}
              {player?.element_type === 1
                ? pt(lang, "planner.pos.gk")
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
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {(
            [
              ["planner.price.purchase.label", pick?.purchasePriceTenths ?? player?.now_cost ?? 0],
              ["planner.price.current.label", pick?.nowCostTenths ?? player?.now_cost ?? 0],
              ["planner.price.selling.label", sell],
            ] as const
          ).map(([labelKey, value]) => (
            <div
              key={labelKey}
              className={`rounded-xl border p-2 text-center ${chrome.group}`}
            >
              <p className={`text-[11px] font-bold leading-tight ${chrome.mutedLabel}`}>
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
              {pt(lang, "planner.price.simulate")}: −£0.1m
            </button>
            <button
              type="button"
              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black ${chrome.inactiveBtn}`}
              onClick={() =>
                onUpdateCustomSellingPrice(elementId, sell + 1)
              }
            >
              +£0.1m
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
          <p className={`text-xs font-black ${chrome.text}`}>
            {pt(lang, "planner.info.xptsLine", {
              gw: currentGw,
              value: (proj?.xPts ?? 0).toFixed(1),
            })}
          </p>
            <p className={`mt-1 text-xs ${chrome.mutedLabel}`}>
            {pt(lang, "planner.info.minutesLine", {
              min: (proj?.expectedMinutes ?? 0).toFixed(0),
              p60: ((proj?.p60 ?? 0) * 100).toFixed(0),
              p1: ((proj?.p1 ?? 0) * 100).toFixed(0),
            })}
            {proj?.isDouble ? " · DGW" : proj?.isBlank ? " · BGW" : ""}
          </p>
          <p className={`mt-1 text-[11px] ${chrome.mutedLabel}`}>
            {pt(lang, "planner.info.xptsHint")}
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

function CardActionSheet({
  slot,
  lang,
  themeId,
  bySlot,
  playersById,
  watchlistIds,
  onClose,
  onSell,
  onSwap,
  onInfo,
  onSetCaptain,
  onSetViceCaptain,
  onToggleWatchlist,
}: {
  slot: number;
  lang: StatsLabLang;
  themeId: StatsLabChartThemeId;
  bySlot: Map<number, ReconstructedSquadPick>;
  playersById: Map<number, PlannerPlayerCatalogItem>;
  watchlistIds: Set<number>;
  onClose: () => void;
  onSell: (slot: number, elementId: number) => void;
  onSwap: (slot: number) => void;
  onInfo: (elementId: number) => void;
  onSetCaptain: (elementId: number) => void;
  onSetViceCaptain: (elementId: number) => void;
  onToggleWatchlist: (elementId: number) => void;
}) {
  const pick = bySlot.get(slot);
  if (!pick) return null;
  const player = playersById.get(pick.elementId);
  const webName = player?.web_name ?? `#${pick.elementId}`;
  const fullName = plannerDisplayFullName(player) || webName;
  const chrome = getStatsLabMenuChrome(themeId);
  const isXi = slot >= 1 && slot <= 11;
  const starred = watchlistIds.has(pick.elementId);
  const row = `flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-bold ${chrome.inactiveBtn}`;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-3"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        data-testid="card-action-sheet"
        aria-label={pt(lang, "planner.card.actions", { player: fullName })}
        className={`w-full max-w-sm space-y-2 rounded-2xl border p-3 ${chrome.panel}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className={row} onClick={() => onSell(slot, pick.elementId)}>
          {actionAria(lang, "planner.action.sell", webName)}
        </button>
        <button type="button" className={row} onClick={() => onSwap(slot)}>
          {actionAria(lang, "planner.action.swap", webName)}
        </button>
        <button type="button" className={row} onClick={() => onInfo(pick.elementId)}>
          {actionAria(lang, "planner.action.info", webName)}
        </button>
        {isXi ? (
          <>
            <button
              type="button"
              className={row}
              aria-pressed={pick.isCaptain}
              aria-label={actionAria(lang, "planner.action.captain", webName)}
              onClick={() => onSetCaptain(pick.elementId)}
            >
              {actionAria(lang, "planner.action.captain", webName)}
            </button>
            <button
              type="button"
              className={row}
              aria-pressed={pick.isViceCaptain}
              aria-label={actionAria(lang, "planner.action.vice", webName)}
              onClick={() => onSetViceCaptain(pick.elementId)}
            >
              {actionAria(lang, "planner.action.vice", webName)}
            </button>
          </>
        ) : null}
        <button
          type="button"
          className={row}
          aria-label={actionAria(
            lang,
            starred ? "planner.action.unwatch" : "planner.action.watch",
            webName,
          )}
          onClick={() => onToggleWatchlist(pick.elementId)}
        >
          {actionAria(
            lang,
            starred ? "planner.action.unwatch" : "planner.action.watch",
            webName,
          )}
        </button>
        <button type="button" className={row} onClick={onClose}>
          {pt(lang, "planner.action.close")}
        </button>
      </div>
    </div>
  );
}
