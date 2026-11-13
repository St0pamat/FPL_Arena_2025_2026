/**
 * FPL Planner — rekonstrukcja stanu drużyny menedżera z publicznego API FPL (v0.2).
 * Kwoty w dziesiątych częściach £ (*Tenths): £100.0m = 1000, £7.5m = 75.
 */

import type { FplLabPlayer } from "@/lib/stats-lab/types";
import {
  FPL_API_BASE,
  FPL_LAB_HEADERS,
  type FplElementSummaryHistoryRow,
} from "@/lib/stats-lab/syncEngine";

const FETCH_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_FT = 5;
const DEFAULT_NOW_COST_TENTHS = 50;
const MIN_PLAYER_COST_TENTHS = 35;

export type PlannerValueSource = "api" | "derived" | "manual";

export type ReconstructedSquadPick = {
  elementId: number;
  /** 1..11 = XI; 12 = GK rezerwowy; 13..15 = ławka (priorytet 1..3). */
  slot: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  purchasePriceTenths: number;
  nowCostTenths: number;
  sellingPriceTenths: number;
  priceSource: PlannerValueSource;
  /** true gdy started_event > 1 i brak transferu (cena przybliżona). */
  priceApprox: boolean;
  willDropAffectSell: boolean;
};

export type UsedChipRecord = {
  name: "wildcard" | "freehit" | "bboost" | "3xc";
  event: number;
  time: string;
};

export type ReconstructedEntryState = {
  teamId: number;
  teamName: string;
  managerName: string;
  startedEvent: number;
  /** Ostatni minięty deadline (curGw). */
  currentGw: number;
  /** nextGw = currentGw + 1 (1..38). */
  planningStartGw: number;
  isPreseason: boolean;
  activeChipInCurrentGw: string | null;
  rolledBackFromFreeHit: boolean;
  bankTenths: number;
  bankSource: PlannerValueSource;
  freeTransfers: number;
  freeTransfersSource: PlannerValueSource;
  ftMismatchWarning: boolean;
  squadSellingValueTenths: number;
  squadMarketValueTenths: number;
  spendingPowerTenths: number;
  valueConsistencyDeltaTenths: number;
  picks: ReconstructedSquadPick[];
  usedChips: UsedChipRecord[];
  overLimitClubIds: number[];
  warnings: string[];
};

export type ReconstructFplEntryParams = {
  teamId: number;
  playersById: Map<number, FplLabPlayer>;
  currentGwHint?: number | null;
  ftTopUps?: Array<{ gw: number; setTo: number }>;
  maxFreeTransfers?: number;
};

type FplEntryPayload = {
  id?: number;
  name?: string | null;
  player_first_name?: string | null;
  player_last_name?: string | null;
  started_event?: number | null;
  current_event?: number | null;
  last_deadline_bank?: number | null;
};

type FplHistoryCurrentRow = {
  event: number;
  event_transfers?: number | null;
  event_transfers_cost?: number | null;
  bank?: number | null;
  value?: number | null;
};

type FplHistoryChipRow = {
  name?: string | null;
  event?: number | null;
  time?: string | null;
};

type FplHistoryPayload = {
  current?: FplHistoryCurrentRow[];
  chips?: FplHistoryChipRow[];
};

type FplTransferRow = {
  element_in?: number | null;
  element_out?: number | null;
  element_in_cost?: number | null;
  element_out_cost?: number | null;
  event?: number | null;
  time?: string | null;
};

type FplPicksPayload = {
  active_chip?: string | null;
  entry_history?: {
    bank?: number | null;
    event_transfers?: number | null;
    event_transfers_cost?: number | null;
    value?: number | null;
  } | null;
  picks?: Array<{
    element?: number | null;
    position?: number | null;
    is_captain?: boolean | null;
    is_vice_captain?: boolean | null;
  }>;
};

type FplElementSummaryPayload = {
  history?: FplElementSummaryHistoryRow[];
};

export class FplEntryApiError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = "FplEntryApiError";
    this.code = code;
    this.status = status;
  }
}

/** Cena sprzedaży FPL: zyski dzielone na pół w dół; spadki 1:1. */
export function computeSellingPriceTenths(
  purchasePriceTenths: number,
  nowCostTenths: number,
): number {
  const pur = Math.round(purchasePriceTenths);
  const now = Math.round(nowCostTenths);
  if (now > pur) {
    return pur + Math.floor((now - pur) / 2);
  }
  return now;
}

/** Czy najbliższy spadek ceny o 0.1m obniży cenę sprzedaży. */
export function willNextPriceDropAffectSellingPrice(
  purchasePriceTenths: number,
  nowCostTenths: number,
): boolean {
  const currentSell = computeSellingPriceTenths(
    purchasePriceTenths,
    nowCostTenths,
  );
  const sellAfterDrop = computeSellingPriceTenths(
    purchasePriceTenths,
    Math.max(MIN_PLAYER_COST_TENTHS, nowCostTenths - 1),
  );
  return sellAfterDrop < currentSell;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function isChipName(
  name: string,
): name is UsedChipRecord["name"] {
  return (
    name === "wildcard" ||
    name === "freehit" ||
    name === "bboost" ||
    name === "3xc"
  );
}

async function fetchFplJsonTimed<T>(url: string): Promise<{
  ok: true;
  data: T;
} | {
  ok: false;
  status: number;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: FPL_LAB_HEADERS,
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false, status: res.status };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new FplEntryApiError(
        "TIMEOUT",
        `FPL API timeout (${FETCH_TIMEOUT_MS}ms): ${url}`,
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchEntryOrThrow(teamId: number): Promise<FplEntryPayload> {
  const url = `${FPL_API_BASE}/entry/${teamId}/`;
  const res = await fetchFplJsonTimed<FplEntryPayload>(url);
  if (!res.ok) {
    if (res.status === 404) {
      throw new FplEntryApiError(
        "ENTRY_NOT_FOUND",
        `Nie znaleziono drużyny FPL o ID ${teamId}.`,
        404,
      );
    }
    throw new FplEntryApiError(
      "ENTRY_FETCH_FAILED",
      `FPL API ${res.status}: ${url}`,
      res.status,
    );
  }
  return res.data;
}

async function fetchHistory(teamId: number): Promise<FplHistoryPayload> {
  const url = `${FPL_API_BASE}/entry/${teamId}/history/`;
  const res = await fetchFplJsonTimed<FplHistoryPayload>(url);
  if (!res.ok) {
    throw new FplEntryApiError(
      "HISTORY_FETCH_FAILED",
      `FPL API ${res.status}: ${url}`,
      res.status,
    );
  }
  return res.data;
}

async function fetchTransfers(teamId: number): Promise<FplTransferRow[]> {
  const url = `${FPL_API_BASE}/entry/${teamId}/transfers/`;
  const res = await fetchFplJsonTimed<FplTransferRow[]>(url);
  if (!res.ok) {
    throw new FplEntryApiError(
      "TRANSFERS_FETCH_FAILED",
      `FPL API ${res.status}: ${url}`,
      res.status,
    );
  }
  return Array.isArray(res.data) ? res.data : [];
}

async function fetchPicks(
  teamId: number,
  gw: number,
): Promise<FplPicksPayload> {
  const url = `${FPL_API_BASE}/entry/${teamId}/event/${gw}/picks/`;
  const res = await fetchFplJsonTimed<FplPicksPayload>(url);
  if (!res.ok) {
    throw new FplEntryApiError(
      "PICKS_FETCH_FAILED",
      `FPL API ${res.status}: ${url}`,
      res.status,
    );
  }
  return res.data;
}

async function fetchStartedEventPurchaseTenths(
  elementId: number,
  startedEvent: number,
): Promise<number | null> {
  const url = `${FPL_API_BASE}/element-summary/${elementId}/`;
  try {
    const res = await fetchFplJsonTimed<FplElementSummaryPayload>(url);
    if (!res.ok) return null;
    const row = (res.data.history ?? []).find(
      (h) => Number(h.round) === startedEvent,
    );
    const value = row?.value;
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.round(value);
    }
    return null;
  } catch {
    return null;
  }
}

function emptyPreseasonState(
  teamId: number,
  entry: FplEntryPayload,
  warnings: string[],
): ReconstructedEntryState {
  const teamName = String(entry.name ?? `Team ${teamId}`).trim();
  const managerName = [
    entry.player_first_name,
    entry.player_last_name,
  ]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean)
    .join(" ");
  return {
    teamId,
    teamName,
    managerName: managerName || teamName,
    startedEvent: Math.max(1, Number(entry.started_event ?? 1) || 1),
    currentGw: 0,
    planningStartGw: 1,
    isPreseason: true,
    activeChipInCurrentGw: null,
    rolledBackFromFreeHit: false,
    bankTenths: 1000,
    bankSource: "derived",
    freeTransfers: 1,
    freeTransfersSource: "derived",
    ftMismatchWarning: false,
    squadSellingValueTenths: 0,
    squadMarketValueTenths: 0,
    spendingPowerTenths: 1000,
    valueConsistencyDeltaTenths: 0,
    picks: [],
    usedChips: [],
    overLimitClubIds: [],
    warnings: [
      ...warnings,
      "Stan preseason: brak zakończonej kolejki — skład zostanie pobrany po pierwszym deadlinie.",
    ],
  };
}

function buildUsedChips(chips: FplHistoryChipRow[]): UsedChipRecord[] {
  const out: UsedChipRecord[] = [];
  for (const c of chips) {
    const name = String(c.name ?? "").trim();
    const event = Number(c.event);
    if (!isChipName(name) || !Number.isFinite(event) || event < 1) continue;
    out.push({
      name,
      event,
      time: String(c.time ?? ""),
    });
  }
  return out.sort((a, b) => a.event - b.event);
}

function chipAt(
  chips: UsedChipRecord[],
  event: number,
): UsedChipRecord["name"] | null {
  const hit = chips.find((c) => c.event === event);
  return hit?.name ?? null;
}

function computeFreeTransfers(args: {
  historyCurrent: FplHistoryCurrentRow[];
  usedChips: UsedChipRecord[];
  startedEvent: number;
  ftTopUps: Array<{ gw: number; setTo: number }>;
  maxFreeTransfers: number;
}): { freeTransfers: number; ftMismatchWarning: boolean; source: PlannerValueSource } {
  const {
    historyCurrent,
    usedChips,
    startedEvent,
    ftTopUps,
    maxFreeTransfers,
  } = args;

  const rows = [...historyCurrent]
    .filter((r) => Number.isFinite(r.event) && r.event >= startedEvent)
    .sort((a, b) => a.event - b.event);

  let ft: number | null = null;
  let ftMismatchWarning = false;

  for (const row of rows) {
    let ftNext: number;
    if (row.event === startedEvent) {
      ftNext = 1;
    } else {
      const currentFt = ft ?? 1;
      const chip = chipAt(usedChips, row.event);
      if (chip === "wildcard" || chip === "freehit") {
        ftNext = currentFt;
      } else {
        const transfers = Math.max(0, Math.round(Number(row.event_transfers ?? 0)));
        const cost = Math.max(
          0,
          Math.round(Number(row.event_transfers_cost ?? 0)),
        );
        let ftEntering = currentFt;
        if (cost > 0) {
          const hits = Math.round(cost / 4);
          const impliedFt = transfers - hits;
          if (
            impliedFt >= 1 &&
            impliedFt <= maxFreeTransfers &&
            impliedFt !== ftEntering
          ) {
            ftMismatchWarning = true;
            ftEntering = impliedFt;
          }
        }
        ftNext = Math.min(
          maxFreeTransfers,
          Math.max(0, ftEntering - transfers) + 1,
        );
      }
    }

    const topUp = ftTopUps.find((t) => t.gw === row.event + 1);
    if (topUp) {
      ftNext = Math.max(ftNext, topUp.setTo);
    }
    ft = ftNext;
  }

  return {
    freeTransfers: clamp(ft ?? 1, 1, maxFreeTransfers),
    ftMismatchWarning,
    source: ftMismatchWarning ? "derived" : "api",
  };
}

/**
 * Rekonstrukcja stanu początkowego Planera (bez logowania) — QA #1–#4 Tadzia.
 */
export async function reconstructFplEntryState(
  params: ReconstructFplEntryParams,
): Promise<ReconstructedEntryState> {
  const teamId = Math.round(Number(params.teamId));
  if (!Number.isFinite(teamId) || teamId < 1) {
    throw new FplEntryApiError(
      "INVALID_TEAM_ID",
      "Podaj poprawne ID drużyny FPL (liczba > 0).",
    );
  }

  const playersById = params.playersById;
  const maxFreeTransfers = params.maxFreeTransfers ?? DEFAULT_MAX_FT;
  const ftTopUps = params.ftTopUps ?? [];
  const warnings: string[] = [];

  const [entry, history, transfersRaw] = await Promise.all([
    fetchEntryOrThrow(teamId),
    fetchHistory(teamId),
    fetchTransfers(teamId),
  ]);

  const startedEvent = Math.max(
    1,
    Math.round(Number(entry.started_event ?? 1)) || 1,
  );
  const historyCurrent = Array.isArray(history.current) ? history.current : [];
  const usedChips = buildUsedChips(history.chips ?? []);

  const maxHistoryEvent = historyCurrent.reduce(
    (m, r) => Math.max(m, Number(r.event) || 0),
    0,
  );
  const hint = params.currentGwHint != null ? Number(params.currentGwHint) : null;
  let curGw =
    Number(entry.current_event) ||
    maxHistoryEvent ||
    (hint != null && Number.isFinite(hint) ? hint : 0);
  curGw = Math.round(curGw);

  // QA #4 — preseason: brak rozpoczętego event
  if (
    !curGw ||
    curGw < 1 ||
    historyCurrent.length === 0
  ) {
    return emptyPreseasonState(teamId, entry, warnings);
  }

  curGw = clamp(curGw, 1, 38);
  const planningStartGw = clamp(curGw + 1, 1, 38);

  // QA #1 — picks(curGw) + Free Hit rollback
  let picksPayload = await fetchPicks(teamId, curGw);
  let activeChipInCurrentGw =
    typeof picksPayload.active_chip === "string"
      ? picksPayload.active_chip
      : null;
  const chipInHistory = chipAt(usedChips, curGw);
  if (!activeChipInCurrentGw && chipInHistory === "freehit") {
    activeChipInCurrentGw = "freehit";
  }

  let rolledBackFromFreeHit = false;
  if (
    activeChipInCurrentGw === "freehit" &&
    curGw > startedEvent
  ) {
    picksPayload = await fetchPicks(teamId, curGw - 1);
    rolledBackFromFreeHit = true;
    warnings.push(
      `Free Hit w GW${curGw}: skład i bank przywrócone ze stanu GW${curGw - 1}.`,
    );
  }

  const bankFromPicks = picksPayload.entry_history?.bank;
  const bankTenths = Math.round(
    Number(
      bankFromPicks ??
        entry.last_deadline_bank ??
        0,
    ),
  );
  const bankSource: PlannerValueSource =
    bankFromPicks != null ? "api" : "derived";

  // Transfery: ignoruj ruchy z kolejek Free Hit
  const fhEvents = new Set(
    usedChips.filter((c) => c.name === "freehit").map((c) => c.event),
  );
  const transfers = transfersRaw
    .filter((t) => {
      const ev = Number(t.event);
      return Number.isFinite(ev) && !fhEvents.has(ev);
    })
    .slice()
    .sort((a, b) => {
      const ta = String(a.time ?? "");
      const tb = String(b.time ?? "");
      if (ta && tb && ta !== tb) return ta.localeCompare(tb);
      return Number(a.event ?? 0) - Number(b.event ?? 0);
    });

  const lastBuyCostByElement = new Map<number, number>();
  for (const t of transfers) {
    const elIn = Number(t.element_in);
    const cost = Number(t.element_in_cost);
    if (!Number.isFinite(elIn) || elIn < 1) continue;
    if (!Number.isFinite(cost)) continue;
    lastBuyCostByElement.set(elIn, Math.round(cost));
  }

  const rawPicks = Array.isArray(picksPayload.picks) ? picksPayload.picks : [];
  const picks: ReconstructedSquadPick[] = [];

  for (const p of rawPicks) {
    const elementId = Number(p.element);
    if (!Number.isFinite(elementId) || elementId < 1) continue;
    const slot = Math.round(Number(p.position ?? picks.length + 1));
    const player = playersById.get(elementId);
    const nowCostTenths = Math.round(
      Number(player?.now_cost ?? DEFAULT_NOW_COST_TENTHS),
    );

    let purchasePriceTenths: number;
    let priceSource: PlannerValueSource;
    let priceApprox = false;

    if (lastBuyCostByElement.has(elementId)) {
      // Przypadek A
      purchasePriceTenths = lastBuyCostByElement.get(elementId)!;
      priceSource = "api";
      priceApprox = false;
    } else if (startedEvent === 1) {
      // Przypadek B
      const costChangeStart = Number(player?.cost_change_start ?? 0) || 0;
      purchasePriceTenths = nowCostTenths - costChangeStart;
      priceSource = "derived";
      priceApprox = false;
    } else {
      // Przypadek C — QA #2: nigdy null
      const fromSummary = await fetchStartedEventPurchaseTenths(
        elementId,
        startedEvent,
      );
      if (fromSummary != null) {
        purchasePriceTenths = fromSummary;
      } else {
        const costChangeStart = Number(player?.cost_change_start ?? 0) || 0;
        purchasePriceTenths = nowCostTenths - costChangeStart;
        warnings.push(
          `Przybliżona cena zakupu dla element ${elementId} (started_event=${startedEvent}, brak transferu / summary).`,
        );
      }
      priceSource = "derived";
      priceApprox = true;
    }

    purchasePriceTenths = Math.round(purchasePriceTenths);
    const sellingPriceTenths = computeSellingPriceTenths(
      purchasePriceTenths,
      nowCostTenths,
    );

    picks.push({
      elementId,
      slot: clamp(slot, 1, 15),
      isCaptain: Boolean(p.is_captain),
      isViceCaptain: Boolean(p.is_vice_captain),
      purchasePriceTenths,
      nowCostTenths,
      sellingPriceTenths,
      priceSource,
      priceApprox,
      willDropAffectSell: willNextPriceDropAffectSellingPrice(
        purchasePriceTenths,
        nowCostTenths,
      ),
    });
  }

  picks.sort((a, b) => a.slot - b.slot);

  if (picks.length !== 15) {
    warnings.push(
      `Oczekiwano 15 zawodników w składzie, otrzymano ${picks.length}.`,
    );
  }

  // FT na planningStartGw — QA #3
  const ftResult = computeFreeTransfers({
    historyCurrent,
    usedChips,
    startedEvent,
    ftTopUps,
    maxFreeTransfers,
  });

  // Reguła R3 — >3 z jednego klubu
  const clubCounts = new Map<number, number>();
  for (const pick of picks) {
    const team = playersById.get(pick.elementId)?.fpl_team_id;
    if (team == null || !Number.isFinite(team)) continue;
    clubCounts.set(team, (clubCounts.get(team) ?? 0) + 1);
  }
  const overLimitClubIds = [...clubCounts.entries()]
    .filter(([, n]) => n > 3)
    .map(([id]) => id)
    .sort((a, b) => a - b);
  if (overLimitClubIds.length) {
    warnings.push(
      `Stan zastany narusza limit 3 graczy/klub (R3): kluby [${overLimitClubIds.join(", ")}].`,
    );
  }

  const squadSellingValueTenths = picks.reduce(
    (s, p) => s + p.sellingPriceTenths,
    0,
  );
  const squadMarketValueTenths = picks.reduce(
    (s, p) => s + p.nowCostTenths,
    0,
  );
  const spendingPowerTenths = bankTenths + squadSellingValueTenths;

  const valueGw = rolledBackFromFreeHit ? curGw - 1 : curGw;
  const historyValueRow = historyCurrent.find((r) => r.event === valueGw);
  const historyValue = Math.round(Number(historyValueRow?.value ?? NaN));
  const valueConsistencyDeltaTenths = Number.isFinite(historyValue)
    ? spendingPowerTenths - historyValue
    : 0;
  if (
    Number.isFinite(historyValue) &&
    Math.abs(valueConsistencyDeltaTenths) > 5
  ) {
    warnings.push(
      `Delta wartości vs history.current[GW${valueGw}].value = ${valueConsistencyDeltaTenths} tenths.`,
    );
  }

  const teamName = String(entry.name ?? `Team ${teamId}`).trim();
  const managerName =
    [
      entry.player_first_name,
      entry.player_last_name,
    ]
      .map((s) => String(s ?? "").trim())
      .filter(Boolean)
      .join(" ") || teamName;

  return {
    teamId,
    teamName,
    managerName,
    startedEvent,
    currentGw: curGw,
    planningStartGw,
    isPreseason: false,
    activeChipInCurrentGw,
    rolledBackFromFreeHit,
    bankTenths,
    bankSource,
    freeTransfers: ftResult.freeTransfers,
    freeTransfersSource: ftResult.source,
    ftMismatchWarning: ftResult.ftMismatchWarning,
    squadSellingValueTenths,
    squadMarketValueTenths,
    spendingPowerTenths,
    valueConsistencyDeltaTenths,
    picks,
    usedChips,
    overLimitClubIds,
    warnings,
  };
}
