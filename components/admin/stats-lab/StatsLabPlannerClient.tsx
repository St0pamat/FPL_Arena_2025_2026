"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toJpeg } from "html-to-image";
import {
  queryStatsLabPlannerAction,
  type PlannerPlayerCatalogItem,
  type StatsLabPlannerPayload,
} from "@/app/admin/actions/statsLabPlanner";
import type { StatsLabChartThemeId } from "@/components/admin/stats-lab/chartTheme";
import { PlannerHeaderAndControls } from "@/components/admin/stats-lab/planner/PlannerHeaderAndControls";
import { PlannerMarketSidebar } from "@/components/admin/stats-lab/planner/PlannerMarketSidebar";
import {
  PlannerMultiGwTable,
  type MultiGwTableMetric,
} from "@/components/admin/stats-lab/planner/PlannerMultiGwTable";
import { PlannerPitch } from "@/components/admin/stats-lab/planner/PlannerPitch";
import {
  buildPlannerAiAuditReport,
  downloadJsonFile,
} from "@/lib/stats-lab/auditExport";
import { downloadDataUrl } from "@/lib/stats-lab/exportCapture";
import type { ReconstructedSquadPick } from "@/lib/stats-lab/fplEntryApi";
import { willNextPriceDropAffectSellingPrice } from "@/lib/stats-lab/fplEntryApi";
import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import { getStatsLabMenuChrome } from "@/lib/stats-lab/menuChrome";
import {
  arePlannerVariantsIdentical,
  buildPlannerDraftSummary,
  computePosterTeamValueTenths,
  evaluateRollingPlan,
  optimiseStartingXiForGw,
  type EvaluatedGwState,
  type GwPlanDecision,
  type ManualOverridesState,
  type PlannedTransfer,
  type SquadPlayerState,
} from "@/lib/stats-lab/plannerEngine";
import {
  assignCaptain,
  assignViceCaptain,
  clearRolesForElement,
} from "@/lib/stats-lab/plannerCaptainRoles";
import { shellLabel } from "@/lib/stats-lab/i18n";
import {
  PLANNER_CHIP_LABEL_KEY,
  formatTenthsAsPounds,
  pt,
  resolvePlannerWarning,
  type PlannerChipType,
  type PlannerDraftVariant,
  type PlannerTileMetric,
  type PlannerWarning,
} from "@/lib/stats-lab/plannerI18n";
import { formatHitBar } from "@/lib/stats-lab/plannerUiFormat";
import type { FplLabPlayer } from "@/lib/stats-lab/types";

const TEAM_ID_KEY = "fpl-stats-lab-planner-team-id";
const WATCHLIST_KEY = "fpl-arena-stats-centre-watchlist";
const DRAFTS_KEY_PREFIX = "fpl-stats-lab-planner-drafts-v1-";

type LayoutMode = "pitch_market" | "pitch_poster" | "multi_gw";

type DraftVariantState = {
  decisionsByGw: Record<number, GwPlanDecision>;
  manualOverrides: ManualOverridesState;
  undoStack: Array<{
    decisionsByGw: Record<number, GwPlanDecision>;
    manualOverrides: ManualOverridesState;
  }>;
};

type DraftsBundle = Record<PlannerDraftVariant, DraftVariantState>;

type Props = {
  seasonCode: string;
  lang: StatsLabLang;
  themeId: StatsLabChartThemeId;
};

function emptyDraft(): DraftVariantState {
  return {
    decisionsByGw: {},
    manualOverrides: {},
    undoStack: [],
  };
}

function emptyBundle(): DraftsBundle {
  return { A: emptyDraft(), B: emptyDraft(), C: emptyDraft() };
}

function cloneDraft(d: DraftVariantState): DraftVariantState {
  return {
    decisionsByGw: structuredClone(d.decisionsByGw),
    manualOverrides: structuredClone(d.manualOverrides),
    undoStack: structuredClone(d.undoStack),
  };
}

function readWatchlist(): Set<number> {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(
      arr
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0),
    );
  } catch {
    return new Set();
  }
}

function writeWatchlist(ids: Set<number>) {
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

function draftsKey(teamId: number) {
  return `${DRAFTS_KEY_PREFIX}${teamId}`;
}

function readDrafts(teamId: number): DraftsBundle | null {
  try {
    const raw = localStorage.getItem(draftsKey(teamId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftsBundle;
    if (!parsed?.A || !parsed?.B || !parsed?.C) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDrafts(teamId: number, bundle: DraftsBundle) {
  try {
    localStorage.setItem(draftsKey(teamId), JSON.stringify(bundle));
  } catch {
    /* ignore */
  }
}

function catalogToPlayersMap(
  players: PlannerPlayerCatalogItem[],
): Map<number, FplLabPlayer> {
  return new Map(
    players.map((p) => [p.fpl_element_id, p as unknown as FplLabPlayer]),
  );
}

function catalogById(
  players: PlannerPlayerCatalogItem[],
): Map<number, PlannerPlayerCatalogItem> {
  return new Map(players.map((p) => [p.fpl_element_id, p]));
}

function decisionsList(
  byGw: Record<number, GwPlanDecision>,
): GwPlanDecision[] {
  return Object.values(byGw).sort((a, b) => a.gw - b.gw);
}

function ensureDecision(
  byGw: Record<number, GwPlanDecision>,
  gw: number,
): GwPlanDecision {
  return (
    byGw[gw] ?? {
      gw,
      transfers: [],
      activeChip: null,
    }
  );
}

function squadToPicks(
  squad: SquadPlayerState[],
  basePicks: ReconstructedSquadPick[],
): ReconstructedSquadPick[] {
  const baseByEl = new Map(basePicks.map((p) => [p.elementId, p]));
  return squad
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((s) => {
      const base = baseByEl.get(s.elementId);
      return {
        elementId: s.elementId,
        slot: s.slot,
        isCaptain: s.isCaptain,
        isViceCaptain: s.isViceCaptain,
        purchasePriceTenths: s.purchasePriceTenths,
        nowCostTenths: s.nowCostTenths,
        sellingPriceTenths: s.sellingPriceTenths,
        priceSource: base?.priceSource ?? "derived",
        priceApprox: base?.priceApprox ?? false,
        willDropAffectSell: willNextPriceDropAffectSellingPrice(
          s.purchasePriceTenths,
          s.nowCostTenths,
        ),
      };
    });
}

function lineupFromSquad(squad: SquadPlayerState[]): number[] {
  return squad
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((p) => p.elementId);
}

function newTransferId(): string {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function StatsLabPlannerClient({
  seasonCode,
  lang,
  themeId,
}: Props) {
  const chrome = getStatsLabMenuChrome(themeId);
  const isLight = chrome.isLight;
  const exportRef = useRef<HTMLDivElement | null>(null);
  const [pending, startTransition] = useTransition();

  const [payload, setPayload] = useState<StatsLabPlannerPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [teamIdInput, setTeamIdInput] = useState("");
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);

  const [activeVariant, setActiveVariant] =
    useState<PlannerDraftVariant>("A");
  const [drafts, setDrafts] = useState<DraftsBundle>(() => emptyBundle());
  const [currentGw, setCurrentGw] = useState(1);
  const [tileMetric, setTileMetric] =
    useState<PlannerTileMetric>("FIXTURES");
  const [multiMetric, setMultiMetric] =
    useState<MultiGwTableMetric>("FIXTURE_XPTS");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("pitch_market");
  const [selectedSlotForSwap, setSelectedSlotForSwap] = useState<
    number | null
  >(null);
  const [pendingTransferOut, setPendingTransferOut] = useState<{
    slot: number;
    elementId: number;
    sellingPriceTenths: number;
  } | null>(null);
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [isExporting, setIsExporting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const entry = payload?.entryState ?? null;

  useEffect(() => {
    setWatchlistIds(readWatchlist());
    try {
      const saved = localStorage.getItem(TEAM_ID_KEY);
      if (saved) setTeamIdInput(saved);
    } catch {
      /* ignore */
    }

    let cancelled = false;
    setIsLoadingTeam(true);
    (async () => {
      try {
        let teamId: number | null = null;
        try {
          const saved = localStorage.getItem(TEAM_ID_KEY);
          const n = saved ? Number(saved) : NaN;
          if (Number.isFinite(n) && n > 0) teamId = n;
        } catch {
          /* ignore */
        }
        const data = await queryStatsLabPlannerAction({
          seasonCode,
          teamId,
        });
        if (cancelled) return;
        setPayload(data);
        setLoadError(data.loadError);
        setCurrentGw(data.entryState.planningStartGw);
        const stored = readDrafts(data.entryState.teamId);
        setDrafts(stored ?? emptyBundle());
        if (teamId) setTeamIdInput(String(teamId));
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "Planner load failed",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingTeam(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seasonCode]);

  useEffect(() => {
    if (!entry) return;
    writeDrafts(entry.teamId, drafts);
  }, [drafts, entry]);

  useEffect(() => {
    try {
      if (teamIdInput.trim()) {
        localStorage.setItem(TEAM_ID_KEY, teamIdInput.trim());
      }
    } catch {
      /* ignore */
    }
  }, [teamIdInput]);

  const playersMap = useMemo(
    () => catalogToPlayersMap(payload?.players ?? []),
    [payload?.players],
  );
  const playersById = useMemo(
    () => catalogById(payload?.players ?? []),
    [payload?.players],
  );
  const clubNamesById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of payload?.clubs ?? []) {
      m.set(c.fpl_team_id, c.short_name);
    }
    return m;
  }, [payload?.clubs]);

  const projectGw = useCallback(
    (elementId: number, gw: number) => {
      const hit = payload?.projectionsByElement?.[elementId]?.[gw];
      if (hit) return hit;
      return {
        elementId,
        gameweek: gw,
        xPts: 0,
        expectedMinutes: 0,
        p0: 1,
        p60: 0,
        p1: 0,
        isBlank: true,
        isDouble: false,
        fixtures: [],
      };
    },
    [payload?.projectionsByElement],
  );

  const evaluatedByVariant = useMemo(() => {
    const out: Record<PlannerDraftVariant, EvaluatedGwState[]> = {
      A: [],
      B: [],
      C: [],
    };
    if (!entry || !payload) return out;
    for (const v of ["A", "B", "C"] as PlannerDraftVariant[]) {
      out[v] = evaluateRollingPlan({
        entry,
        playersById: playersMap,
        decisions: decisionsList(drafts[v].decisionsByGw),
        startGw: payload.planningStartGw,
        endGw: payload.planningEndGw,
        overrides: drafts[v].manualOverrides,
        projectGw,
        clubNamesById,
      });
    }
    return out;
  }, [
    entry,
    payload,
    drafts,
    playersMap,
    projectGw,
    clubNamesById,
  ]);

  const evaluated = evaluatedByVariant[activeVariant];
  const activeGwState =
    evaluated.find((g) => g.gw === currentGw) ?? evaluated[0] ?? null;

  const squadPicks = useMemo(() => {
    if (!entry || !activeGwState) return entry?.picks ?? [];
    return squadToPicks(activeGwState.squad, entry.picks);
  }, [entry, activeGwState]);

  const draftSummaries = useMemo(() => {
    if (!payload) return [];
    return (["A", "B", "C"] as PlannerDraftVariant[]).map((v) =>
      buildPlannerDraftSummary({
        variant: v,
        gws: evaluatedByVariant[v],
        planningStartGw: payload.planningStartGw,
        fallbackBankTenths: entry?.bankTenths ?? 0,
      }),
    );
  }, [evaluatedByVariant, entry, payload]);

  const variantsIdentical = useMemo(() => {
    return arePlannerVariantsIdentical(
      decisionsList(drafts.A.decisionsByGw),
      decisionsList(drafts.B.decisionsByGw),
      decisionsList(drafts.C.decisionsByGw),
    );
  }, [drafts]);

  const gwMarkers = useMemo(() => {
    const m: Record<
      number,
      {
        transferCount?: number;
        chip?: PlannerChipType | null;
        hasValidationIssue?: boolean;
      }
    > = {};
    for (const g of evaluated) {
      m[g.gw] = {
        transferCount: g.validTransfersCount || undefined,
        chip: g.activeChip,
        hasValidationIssue: !g.isValid || g.errors.length > 0,
      };
    }
    return m;
  }, [evaluated]);

  const usedChipsByType = useMemo(() => {
    const used: Partial<Record<PlannerChipType, number>> = {};
    for (const g of evaluated) {
      if (g.activeChip && used[g.activeChip] == null) {
        used[g.activeChip] = g.gw;
      }
    }
    for (const c of entry?.usedChips ?? []) {
      if (used[c.name] == null) used[c.name] = c.event;
    }
    return used;
  }, [evaluated, entry?.usedChips]);

  const spendingPowerTenths = useMemo(() => {
    if (!activeGwState) return entry?.spendingPowerTenths ?? 0;
    const sellSum = activeGwState.squad.reduce(
      (s, p) => s + p.sellingPriceTenths,
      0,
    );
    return activeGwState.bankTenths + sellSum;
  }, [activeGwState, entry]);

  const squadMarketValueTenths = useMemo(() => {
    if (!activeGwState) return entry?.squadMarketValueTenths ?? 0;
    return activeGwState.squad.reduce((s, p) => s + p.nowCostTenths, 0);
  }, [activeGwState, entry]);

  /** Plakat: CP składu + bank (nie SP / nie samo „Do wydania”). */
  const posterTeamValueTenths = useMemo(() => {
    if (activeGwState) {
      return computePosterTeamValueTenths({
        playerNowCostTenths: activeGwState.squad.map((p) => p.nowCostTenths),
        bankTenths: activeGwState.bankTenths,
      });
    }
    return computePosterTeamValueTenths({
      playerNowCostTenths: entry?.picks.map((p) => p.nowCostTenths) ?? [],
      bankTenths: entry?.bankTenths ?? 0,
    });
  }, [activeGwState, entry]);

  const squadSellingValueTenths = useMemo(() => {
    if (!activeGwState) return entry?.squadSellingValueTenths ?? 0;
    return activeGwState.squad.reduce((s, p) => s + p.sellingPriceTenths, 0);
  }, [activeGwState, entry]);

  const plannedTransferCount = useMemo(
    () =>
      evaluated.reduce(
        (n, g) => n + g.transfers.filter((t) => !t.hasConflict).length,
        0,
      ),
    [evaluated],
  );

  const availableBudgetTenths = useMemo(() => {
    if (!pendingTransferOut || !activeGwState) {
      return activeGwState?.bankTenths ?? entry?.bankTenths ?? 0;
    }
    return (
      activeGwState.bankTenths + pendingTransferOut.sellingPriceTenths
    );
  }, [pendingTransferOut, activeGwState, entry]);

  function pushUndoAndUpdate(
    mutator: (draft: DraftVariantState) => DraftVariantState,
  ) {
    setDrafts((prev) => {
      const cur = prev[activeVariant];
      const snapshot = {
        decisionsByGw: structuredClone(cur.decisionsByGw),
        manualOverrides: structuredClone(cur.manualOverrides),
      };
      const nextDraft: DraftVariantState = {
        ...mutator(cloneDraft(cur)),
        undoStack: [...cur.undoStack, snapshot].slice(-40),
      };
      return { ...prev, [activeVariant]: nextDraft };
    });
  }

  async function onLoadTeam() {
    const teamId = Math.round(Number(teamIdInput));
    if (!Number.isFinite(teamId) || teamId < 1) {
      setLoadError(
        lang === "pl"
          ? "Podaj poprawne ID drużyny FPL."
          : "Enter a valid FPL Team ID.",
      );
      return;
    }
    setIsLoadingTeam(true);
    setLoadError(null);
    try {
      const data = await queryStatsLabPlannerAction({
        seasonCode,
        teamId,
      });
      setPayload(data);
      setLoadError(data.loadError);
      setCurrentGw(data.entryState.planningStartGw);
      const stored = readDrafts(data.entryState.teamId);
      setDrafts(stored ?? emptyBundle());
      setPendingTransferOut(null);
      setSelectedSlotForSwap(null);
      try {
        localStorage.setItem(TEAM_ID_KEY, String(teamId));
      } catch {
        /* ignore */
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setIsLoadingTeam(false);
    }
  }

  async function onLoadDemo() {
    setIsLoadingTeam(true);
    setLoadError(null);
    try {
      const data = await queryStatsLabPlannerAction({
        seasonCode,
        teamId: null,
      });
      setPayload(data);
      setLoadError(data.loadError);
      setCurrentGw(data.entryState.planningStartGw);
      const stored = readDrafts(data.entryState.teamId);
      setDrafts(stored ?? emptyBundle());
      setPendingTransferOut(null);
      setSelectedSlotForSwap(null);
      setTeamIdInput("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setIsLoadingTeam(false);
    }
  }

  function onSwapSlots(slotA: number, slotB: number) {
    if (!activeGwState) return;
    pushUndoAndUpdate((draft) => {
      const squad = cloneSquadLocal(activeGwState.squad);
      const a = squad.find((p) => p.slot === slotA);
      const b = squad.find((p) => p.slot === slotB);
      if (!a || !b) return draft;
      const tmpEl = a.elementId;
      const tmpPur = a.purchasePriceTenths;
      const tmpNow = a.nowCostTenths;
      const tmpSell = a.sellingPriceTenths;
      a.elementId = b.elementId;
      a.purchasePriceTenths = b.purchasePriceTenths;
      a.nowCostTenths = b.nowCostTenths;
      a.sellingPriceTenths = b.sellingPriceTenths;
      b.elementId = tmpEl;
      b.purchasePriceTenths = tmpPur;
      b.nowCostTenths = tmpNow;
      b.sellingPriceTenths = tmpSell;
      const dec = ensureDecision(draft.decisionsByGw, currentGw);
      const effectiveRoles = {
        captainElementId: activeGwState.captainElementId,
        viceCaptainElementId: activeGwState.viceCaptainElementId,
      };
      let roles = {
        captainElementId: dec.captainElementId ?? null,
        viceCaptainElementId: dec.viceCaptainElementId ?? null,
        captainClearedByUser: dec.captainClearedByUser,
        viceClearedByUser: dec.viceClearedByUser,
      };
      // Zejście na ławkę (slot > 11) czyści rolę jak sprzedaż — flaga clearedByUser.
      // effectiveRoles obejmuje auto-C/VC (decyzja bez zapisanego id).
      for (const p of squad) {
        if (p.slot >= 12) {
          roles = clearRolesForElement(roles, p.elementId, effectiveRoles);
        }
      }
      draft.decisionsByGw[currentGw] = {
        ...dec,
        lineupOrder: lineupFromSquad(squad),
        ...roles,
      };
      return draft;
    });
    setSelectedSlotForSwap(null);
  }

  function onMarkPlayerForTransferOut(slot: number, elementId: number) {
    if (!activeGwState) return;
    const boughtHere = activeGwState.transfers.find(
      (t) => !t.hasConflict && t.inElementId === elementId,
    );
    if (boughtHere) {
      pushUndoAndUpdate((draft) => {
        const dec = ensureDecision(draft.decisionsByGw, currentGw);
        draft.decisionsByGw[currentGw] = {
          ...dec,
          transfers: dec.transfers.filter((t) => t.id !== boughtHere.id),
        };
        return draft;
      });
      setPendingTransferOut(null);
      return;
    }
    const pick = activeGwState.squad.find((p) => p.elementId === elementId);
    setPendingTransferOut({
      slot,
      elementId,
      sellingPriceTenths:
        pick?.sellingPriceTenths ??
        drafts[activeVariant].manualOverrides.customSellingPricesTenths?.[
          elementId
        ] ??
        0,
    });
  }

  function onExecuteTransfer(args: {
    outElementId: number;
    inElementId: number;
    outSlot?: number;
  }) {
    if (!activeGwState) return;
    const out =
      activeGwState.squad.find((p) => p.elementId === args.outElementId) ??
      null;
    const inPlayer = playersById.get(args.inElementId);
    if (!out || !inPlayer) return;

    pushUndoAndUpdate((draft) => {
      const dec = ensureDecision(draft.decisionsByGw, currentGw);
      const transfer: PlannedTransfer = {
        id: newTransferId(),
        gw: currentGw,
        outElementId: args.outElementId,
        inElementId: args.inElementId,
        outSellingPriceTenths: out.sellingPriceTenths,
        inPurchasePriceTenths: inPlayer.now_cost,
      };
      const order =
        dec.lineupOrder ?? lineupFromSquad(activeGwState.squad);
      const nextOrder = order.map((id) =>
        id === args.outElementId ? args.inElementId : id,
      );
      const roles = clearRolesForElement(
        {
          captainElementId: dec.captainElementId ?? null,
          viceCaptainElementId: dec.viceCaptainElementId ?? null,
          captainClearedByUser: dec.captainClearedByUser,
          viceClearedByUser: dec.viceClearedByUser,
        },
        args.outElementId,
        {
          captainElementId: activeGwState.captainElementId,
          viceCaptainElementId: activeGwState.viceCaptainElementId,
        },
      );
      draft.decisionsByGw[currentGw] = {
        ...dec,
        transfers: [...dec.transfers, transfer],
        lineupOrder: nextOrder,
        ...roles,
      };
      return draft;
    });
    setPendingTransferOut(null);
  }

  function onSetCaptain(elementId: number) {
    if (!activeGwState) return;
    const pick = activeGwState.squad.find((p) => p.elementId === elementId);
    if (!pick || pick.slot < 1 || pick.slot > 11) return;
    pushUndoAndUpdate((draft) => {
      const dec = ensureDecision(draft.decisionsByGw, currentGw);
      const patch = assignCaptain(
        {
          captainElementId: dec.captainElementId ?? null,
          viceCaptainElementId: dec.viceCaptainElementId ?? null,
          captainClearedByUser: dec.captainClearedByUser,
          viceClearedByUser: dec.viceClearedByUser,
        },
        elementId,
      );
      draft.decisionsByGw[currentGw] = { ...dec, ...patch };
      return draft;
    });
  }

  function onSetViceCaptain(elementId: number) {
    if (!activeGwState) return;
    const pick = activeGwState.squad.find((p) => p.elementId === elementId);
    if (!pick || pick.slot < 1 || pick.slot > 11) return;
    pushUndoAndUpdate((draft) => {
      const dec = ensureDecision(draft.decisionsByGw, currentGw);
      const patch = assignViceCaptain(
        {
          captainElementId: dec.captainElementId ?? null,
          viceCaptainElementId: dec.viceCaptainElementId ?? null,
          captainClearedByUser: dec.captainClearedByUser,
          viceClearedByUser: dec.viceClearedByUser,
        },
        elementId,
      );
      draft.decisionsByGw[currentGw] = { ...dec, ...patch };
      return draft;
    });
  }

  function onToggleChip(chip: PlannerChipType) {
    pushUndoAndUpdate((draft) => {
      const dec = ensureDecision(draft.decisionsByGw, currentGw);
      draft.decisionsByGw[currentGw] = {
        ...dec,
        activeChip: dec.activeChip === chip ? null : chip,
      };
      return draft;
    });
  }

  function onOptimiseXi() {
    if (!activeGwState) return;
    const gwProj = new Map(
      activeGwState.squad.map((p) => [
        p.elementId,
        projectGw(p.elementId, currentGw),
      ]),
    );
    const opt = optimiseStartingXiForGw(
      activeGwState.squad,
      playersMap,
      gwProj,
    );
    pushUndoAndUpdate((draft) => {
      const dec = ensureDecision(draft.decisionsByGw, currentGw);
      draft.decisionsByGw[currentGw] = {
        ...dec,
        lineupOrder: opt.lineupOrder,
        captainElementId: opt.captainElementId,
        viceCaptainElementId: opt.viceCaptainElementId,
      };
      return draft;
    });
  }

  function onUndo() {
    setDrafts((prev) => {
      const cur = prev[activeVariant];
      const last = cur.undoStack[cur.undoStack.length - 1];
      if (!last) return prev;
      return {
        ...prev,
        [activeVariant]: {
          decisionsByGw: last.decisionsByGw,
          manualOverrides: last.manualOverrides,
          undoStack: cur.undoStack.slice(0, -1),
        },
      };
    });
    setPendingTransferOut(null);
  }

  function onResetGw() {
    pushUndoAndUpdate((draft) => {
      const next = { ...draft.decisionsByGw };
      delete next[currentGw];
      draft.decisionsByGw = next;
      return draft;
    });
    setPendingTransferOut(null);
  }

  function onResetPlan() {
    pushUndoAndUpdate((draft) => {
      draft.decisionsByGw = {};
      draft.manualOverrides = {};
      return draft;
    });
    setPendingTransferOut(null);
  }

  function onCopyVariantTo(target: PlannerDraftVariant) {
    setDrafts((prev) => {
      const src = cloneDraft(prev[activeVariant]);
      src.undoStack = [];
      return { ...prev, [target]: src };
    });
  }

  function onToggleWatchlist(elementId: number) {
    setWatchlistIds((prev) => {
      const next = new Set(prev);
      if (next.has(elementId)) next.delete(elementId);
      else next.add(elementId);
      writeWatchlist(next);
      return next;
    });
  }

  function onUpdateCustomSellingPrice(
    elementId: number,
    sellingPriceTenths: number,
  ) {
    pushUndoAndUpdate((draft) => {
      draft.manualOverrides = {
        ...draft.manualOverrides,
        customSellingPricesTenths: {
          ...(draft.manualOverrides.customSellingPricesTenths ?? {}),
          [elementId]: sellingPriceTenths,
        },
      };
      return draft;
    });
  }

  function onRemoveTransfer(transferId: string, gw: number) {
    pushUndoAndUpdate((draft) => {
      const dec = ensureDecision(draft.decisionsByGw, gw);
      draft.decisionsByGw[gw] = {
        ...dec,
        transfers: dec.transfers.filter((t) => t.id !== transferId),
      };
      return draft;
    });
  }

  async function exportPair() {
    const node = exportRef.current;
    if (!node || !entry || !activeGwState || !payload) return;
    setIsExporting(true);
    setFlash(null);
    try {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await new Promise((r) => setTimeout(r, 120));
      const bg = isLight
        ? "#f8fafc"
        : themeId === "SCOUT_DARK"
          ? "#06181e"
          : "#070b14";
      const opts = {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: bg,
        cacheBust: true,
      };
      await toJpeg(node, opts);
      const url = await toJpeg(node, opts);
      const base = `fpl-arena-planner-gw${currentGw}-variant-${activeVariant}-${themeId.toLowerCase()}`;
      downloadDataUrl(url, `${base}.jpg`);
      const report = buildPlannerAiAuditReport({
        lang,
        themeId,
        seasonCode,
        subView: layoutMode,
        rootElement: node,
        diagnostics: {
          teamId: entry.teamId,
          isDemoSquad: payload.isDemoSquad,
          activeVariant,
          currentGw,
          bankTenths: activeGwState.bankTenths,
          freeTransfers: activeGwState.ftAvailable,
          transferCostPts: activeGwState.transferCostPts,
          grossXPts: activeGwState.grossXPts,
          netXPts: activeGwState.netXPts,
          activeChip: activeGwState.activeChip,
          isValidGw: activeGwState.isValid,
          errors: activeGwState.errors,
          warnings: activeGwState.warnings.map((w: PlannerWarning) =>
            resolvePlannerWarning(w, lang),
          ),
          picksSummary: activeGwState.squad.map((p) => ({
            slot: p.slot,
            elementId: p.elementId,
            webName: playersById.get(p.elementId)?.web_name ?? `#${p.elementId}`,
            isCaptain: p.isCaptain,
            isViceCaptain: p.isViceCaptain,
            sellingPriceTenths: p.sellingPriceTenths,
          })),
        },
      });
      downloadJsonFile(`${base}-audit.json`, report);
      setFlash("OK");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }

  const removedElementIdsInGw = useMemo(() => {
    if (!pendingTransferOut) return undefined;
    return new Set([pendingTransferOut.elementId]);
  }, [pendingTransferOut]);

  if (!payload || !entry) {
    return (
      <div className={`rounded-2xl border p-6 ${chrome.panel}`}>
        <p className={`text-sm font-bold ${chrome.text}`}>
          {isLoadingTeam || pending
            ? lang === "pl"
              ? "Ładowanie Planera FPL…"
              : "Loading FPL Planner…"
            : loadError ??
              (lang === "pl" ? "Brak danych." : "No data.")}
        </p>
      </div>
    );
  }

  const chipLabel = activeGwState?.activeChip
    ? pt(lang, PLANNER_CHIP_LABEL_KEY[activeGwState.activeChip])
    : null;

  return (
    <div className="space-y-3" data-stats-lab-planner-root="true">
      {/* Toolbar */}
      <div className={`flex flex-wrap items-center gap-2 rounded-2xl border p-2 ${chrome.panel}`}>
        <p className={`mr-auto text-xs font-black uppercase tracking-wider ${chrome.mutedLabel}`}>
          {pt(lang, "planner.brand.title")}
        </p>
        {(
          [
            ["pitch_market", pt(lang, "planner.view.pitchMarket")],
            ["pitch_poster", pt(lang, "planner.view.poster")],
            ["multi_gw", pt(lang, "planner.view.table")],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setLayoutMode(id)}
            className={`rounded-xl px-2.5 py-1.5 text-[10px] font-black uppercase ${
              layoutMode === id ? chrome.activeBtn : chrome.inactiveBtn
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          disabled={isExporting}
          onClick={() => startTransition(() => void exportPair())}
          className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase disabled:opacity-50 ${chrome.exportPrimary}`}
        >
          {isExporting
            ? "…"
            : lang === "pl"
              ? "📸 Pobierz Plakat (.jpg) + Audyt (.json)"
              : "📸 Download Poster (.jpg) + Audit (.json)"}
        </button>
        {flash === "OK" ? (
          <span className="text-[10px] font-black text-emerald-400">OK</span>
        ) : null}
      </div>

      {loadError ? (
        <div
          className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
            isLight
              ? "border-amber-400 bg-amber-50 text-amber-950"
              : "border-amber-400/50 bg-amber-500/15 text-amber-100"
          }`}
        >
          {loadError}
        </div>
      ) : null}

      <PlannerHeaderAndControls
        themeId={themeId}
        lang={lang}
        teamIdInput={teamIdInput}
        onTeamIdInputChange={setTeamIdInput}
        onLoadTeam={() => void onLoadTeam()}
        onLoadDemo={() => void onLoadDemo()}
        isLoadingTeam={isLoadingTeam}
        teamName={entry.teamName}
        managerName={entry.managerName}
        rolledBackFromFreeHit={entry.rolledBackFromFreeHit}
        activeVariant={activeVariant}
        onSelectVariant={setActiveVariant}
        onCopyVariantTo={onCopyVariantTo}
        draftSummaries={draftSummaries}
        variantsIdentical={variantsIdentical}
        planningStartGw={payload.planningStartGw}
        planningEndGw={payload.planningEndGw}
        currentGw={currentGw}
        availableGameweeks={payload.availableGameweeks}
        onSelectGw={setCurrentGw}
        gwMarkers={gwMarkers}
        deadlineIso={payload.deadlinesByGw[currentGw] ?? null}
        freeTransfers={activeGwState?.ftAvailable ?? entry.freeTransfers}
        freeTransfersSource={
          drafts[activeVariant].manualOverrides.initialFreeTransfers != null
            ? "manual"
            : entry.freeTransfersSource
        }
        hitsCostPts={activeGwState?.transferCostPts ?? 0}
        bankTenths={activeGwState?.bankTenths ?? entry.bankTenths}
        bankSource={
          drafts[activeVariant].manualOverrides.initialBankTenths != null
            ? "manual"
            : entry.bankSource
        }
        grossXPts={activeGwState?.grossXPts ?? 0}
        netXPts={activeGwState?.netXPts ?? 0}
        spendingPowerTenths={spendingPowerTenths}
        onManualSetFt={(ft) =>
          pushUndoAndUpdate((d) => {
            d.manualOverrides = {
              ...d.manualOverrides,
              initialFreeTransfers: ft,
            };
            return d;
          })
        }
        onManualAdjustBankTenths={(delta) =>
          pushUndoAndUpdate((d) => {
            const base =
              d.manualOverrides.initialBankTenths ?? entry.bankTenths;
            d.manualOverrides = {
              ...d.manualOverrides,
              initialBankTenths: base + delta,
            };
            return d;
          })
        }
        onManualSetBankTenths={(bank) =>
          pushUndoAndUpdate((d) => {
            d.manualOverrides = {
              ...d.manualOverrides,
              initialBankTenths: bank,
            };
            return d;
          })
        }
        activeChip={activeGwState?.activeChip ?? null}
        usedChipsByType={usedChipsByType}
        onToggleChip={onToggleChip}
        tileMetric={tileMetric}
        onTileMetricChange={setTileMetric}
        onOptimiseXi={onOptimiseXi}
        onUndo={onUndo}
        onResetGw={onResetGw}
        onResetPlan={onResetPlan}
        canUndo={drafts[activeVariant].undoStack.length > 0}
        validationErrors={activeGwState?.errors}
        validationWarnings={activeGwState?.warnings}
        evaluatedGw={activeGwState}
      />


      {/* Pitch+Market workspace: market lives OUTSIDE exportRef for symmetric posters */}
      <div
        className={
          layoutMode === "pitch_market" && !isExporting
            ? "grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]"
            : "w-full"
        }
      >
        <div
          ref={exportRef}
          className={`w-full rounded-2xl border p-3 sm:p-4 ${chrome.panel} ${
            layoutMode === "multi_gw" && !isExporting ? "hidden" : ""
          }`}
          data-planner-export-root="true"
        >
          <div className="mb-3 w-full space-y-1 border-b border-inherit pb-3">
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${chrome.mutedLabel}`}>
              {pt(lang, "planner.poster.brand")}
            </p>
            <h2 className={`text-lg font-black sm:text-xl ${chrome.text}`}>
              {entry.teamName} ·{" "}
              {pt(lang, "planner.variant.label", { id: activeVariant })} ·{" "}
              {shellLabel(lang, "common.gw", { gw: currentGw })}
              {activeGwState?.activeChip
                ? ` · ${pt(lang, PLANNER_CHIP_LABEL_KEY[activeGwState.activeChip])}`
                : ""}
            </h2>
            <p className={`text-[11px] font-semibold ${chrome.mutedLabel}`}>
              {pt(lang, "planner.kpi.xpts")}:{" "}
              {(activeGwState?.grossXPts ?? 0).toFixed(1)} xPts
              {(activeGwState?.transferCostPts ?? 0) > 0
                ? ` (${pt(lang, "planner.hit.netto").toLowerCase()} ${(activeGwState?.netXPts ?? 0).toFixed(1)})`
                : ""}{" "}
              •{" "}
              {formatHitBar({
                lang,
                used: activeGwState?.validTransfersCount ?? 0,
                ft: activeGwState?.ftAvailable ?? entry.freeTransfers,
                cost: activeGwState?.transferCostPts ?? 0,
                activeChip: activeGwState?.activeChip ?? null,
              })}{" "}
              • {pt(lang, "planner.kpi.bank")}:{" "}
              {formatTenthsAsPounds(
                activeGwState?.bankTenths ?? entry.bankTenths,
              )}{" "}
              • {pt(lang, "planner.poster.teamValue")}:{" "}
              {formatTenthsAsPounds(posterTeamValueTenths)}
              {chipLabel ? ` • ${chipLabel}` : ""}
            </p>
          </div>

          <div className="w-full">
            <PlannerPitch
              themeId={themeId}
              lang={lang}
              currentGw={currentGw}
              availableGameweeks={payload.availableGameweeks}
              squadPicks={squadPicks}
              removedElementIdsInGw={removedElementIdsInGw}
              selectedSlotForSwap={selectedSlotForSwap}
              playersById={playersById}
              projectionsByElement={payload.projectionsByElement}
              tileMetric={tileMetric}
              onSelectSlotForSwap={setSelectedSlotForSwap}
              onSwapSlots={onSwapSlots}
              onMarkPlayerForTransferOut={onMarkPlayerForTransferOut}
              onUndoTransferOut={() => setPendingTransferOut(null)}
              onSetCaptain={onSetCaptain}
              onSetViceCaptain={onSetViceCaptain}
              onUpdateCustomSellingPrice={onUpdateCustomSellingPrice}
              watchlistIds={watchlistIds}
              onToggleWatchlist={onToggleWatchlist}
              activeChip={activeGwState?.activeChip ?? null}
              isExporting={isExporting}
              hideActionChrome={
                isExporting || layoutMode === "pitch_poster"
              }
              missingCaptain={
                activeGwState?.warnings.some(
                  (w) => w.key === "planner.captain.missing",
                ) ?? false
              }
              missingVice={
                activeGwState?.warnings.some(
                  (w) => w.key === "planner.vice.missing",
                ) ?? false
              }
            />

            {activeGwState &&
            activeGwState.transfers.filter((t) => !t.hasConflict).length >
              0 ? (
              <div className={`mt-3 w-full rounded-xl border p-2 ${chrome.group}`}>
                <p className={`mb-1 text-[10px] font-black uppercase ${chrome.mutedLabel}`}>
                  {pt(lang, "planner.kpi.transfers")}{" "}
                  {shellLabel(lang, "common.gw", { gw: currentGw })}
                </p>
                <ul className="space-y-1">
                  {activeGwState.transfers
                    .filter((t) => !t.hasConflict)
                    .map((t) => {
                      const outP = playersById.get(t.outElementId);
                      const inP = playersById.get(t.inElementId);
                      return (
                        <li
                          key={t.id}
                          className={`text-[11px] font-bold ${chrome.text}`}
                        >
                          {outP?.web_name ?? `#${t.outElementId}`} (
                          {outP?.club_short_name ??
                            shellLabel(lang, "common.emdash")}{" "}
                          · {pt(lang, "planner.price.selling.short")}{" "}
                          {formatTenthsAsPounds(t.outSellingPriceTenths)}) ➔{" "}
                          {inP?.web_name ?? `#${t.inElementId}`} (
                          {inP?.club_short_name ??
                            shellLabel(lang, "common.emdash")}{" "}
                          · {pt(lang, "planner.price.current.short")}{" "}
                          {formatTenthsAsPounds(t.inPurchasePriceTenths)})
                        </li>
                      );
                    })}
                </ul>
              </div>
            ) : null}
          </div>

          <div className={`mt-4 w-full border-t border-inherit pt-3 text-center text-[10px] font-semibold ${chrome.mutedLabel}`}>
            <p>{pt(lang, "planner.poster.footer")}</p>
            <p className="mt-1">
              <a
                href="https://www.fpl-arena.com"
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                www.fpl-arena.com
              </a>{" "}
              • Powered by St0pa | FPL Arena •{" "}
              {pt(lang, "planner.poster.verified")}
            </p>
          </div>
        </div>

        {layoutMode === "pitch_market" && !isExporting ? (
          <PlannerMarketSidebar
            themeId={themeId}
            lang={lang}
            currentGw={currentGw}
            planningStartGw={payload.planningStartGw}
            availableGameweeks={payload.availableGameweeks}
            clubs={payload.clubs}
            players={payload.players}
            playersById={playersById}
            projectionsByElement={payload.projectionsByElement}
            squadPicks={squadPicks}
            watchlistIds={watchlistIds}
            onToggleWatchlist={onToggleWatchlist}
            pendingTransferOut={pendingTransferOut}
            onClearPendingTransferOut={() => setPendingTransferOut(null)}
            availableBudgetTenths={availableBudgetTenths}
            bankTenths={activeGwState?.bankTenths ?? entry.bankTenths}
            overLimitClubIds={entry.overLimitClubIds}
            onExecuteTransfer={onExecuteTransfer}
            onOpenPlayerInfo={() => {
              /* Pitch owns player info modal */
            }}
            evaluatedGws={evaluated}
            squadMarketValueTenths={squadMarketValueTenths}
            squadSellingValueTenths={squadSellingValueTenths}
            spendingPowerTenths={spendingPowerTenths}
            plannedTransferCount={plannedTransferCount}
            onRemoveTransfer={onRemoveTransfer}
          />
        ) : null}
      </div>

      {layoutMode === "multi_gw" || layoutMode === "pitch_market" ? (
        <div className={layoutMode === "multi_gw" ? undefined : "mt-1"}>
          <PlannerMultiGwTable
            themeId={themeId}
            lang={lang}
            availableGameweeks={payload.availableGameweeks}
            squadPicks={squadPicks}
            playersById={playersById}
            projectionsByElement={payload.projectionsByElement}
            activeChip={activeGwState?.activeChip ?? null}
            metric={multiMetric}
            onMetricChange={setMultiMetric}
            onOpenPlayerInfo={() => undefined}
          />
        </div>
      ) : null}
    </div>
  );
}

function cloneSquadLocal(squad: SquadPlayerState[]): SquadPlayerState[] {
  return squad.map((p) => ({ ...p }));
}
