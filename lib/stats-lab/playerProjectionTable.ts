/**
 * Tabela predykcji piłkarzy: filtr, sort i TOP N.
 * Liczby przychodzą z istniejącego silnika. Tu nie ma nowego wzoru xPts.
 */

import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import { playerProjectionCopy } from "@/lib/stats-lab/playerProjectionI18n";
import { sumXPtsOverHorizon } from "@/lib/stats-lab/plannerEngine";
import type { FplPositionType } from "@/lib/stats-lab/types";

export type PlayerProjectionHorizon = 1 | 3 | 5 | 6;

export const PLAYER_PROJECTION_HORIZONS: readonly PlayerProjectionHorizon[] = [
  1, 3, 5, 6,
];

export type PlayerProjectionColumnId =
  | "price"
  | "own"
  | "status"
  | "p60"
  | "minutes"
  | "xpts"
  | "goal"
  | "assist"
  | "cs"
  | "fdr";

export const PLAYER_PROJECTION_COLUMNS: readonly PlayerProjectionColumnId[] = [
  "price",
  "own",
  "status",
  "p60",
  "minutes",
  "xpts",
  "goal",
  "assist",
  "cs",
  "fdr",
];

export type PlayerGwSlice = {
  gw: number;
  isBlank: boolean;
  /** null przy BGW. Liczba przy meczu — już policzona przez projectPlayerGw. */
  xPts: number | null;
  /** 0–1. null przy BGW. */
  p60: number | null;
  expectedMinutes: number;
  fdrLevels: number[];
  opponents: string[];
  /** Procent 0–100 z csPct predykcji meczu. Puste dla MID/FWD i BGW. */
  teamCsPcts: number[];
};

export type PlayerProjectionInput = {
  elementId: number;
  webName: string;
  position: FplPositionType;
  clubId: number;
  clubShort: string;
  clubPulseCode: number | null;
  priceTenths: number;
  ownership: number;
  status: string;
  chanceNext: number | null;
  chanceThis: number | null | undefined;
  news: string;
  newsAdded: string | null | undefined;
  gameweeks: PlayerGwSlice[];
};

export type PlayerTableSortKey =
  | "name"
  | "price"
  | "own"
  | "p60"
  | "minutes"
  | "xptsSum"
  | "cs"
  | "fdr"
  | "status"
  | `xpts:${number}`;

export type PlayerProjectionQuery = {
  rows: readonly PlayerProjectionInput[];
  horizon: PlayerProjectionHorizon;
  search: string;
  positions: readonly number[];
  clubIds: readonly number[];
  minPriceTenths: number | null;
  maxPriceTenths: number | null;
  /** 0–100. null = bez progu. */
  minPlayChancePct: number | null;
  hideInjured: boolean;
  sortKey: PlayerTableSortKey;
  sortDir: "asc" | "desc";
  /** null = bez ucinania. */
  topN: number | null;
};

export type PlayerProjectionViewRow = {
  row: PlayerProjectionInput;
  horizonGws: PlayerGwSlice[];
  xptsSum: number;
  /** Procent 0–100 albo null, gdy najbliższe kolejki są puste. */
  playChancePct: number | null;
  minutes: number;
  csPct: number | null;
  fdr: number | null;
};

const INJURED_STATUS = new Set(["i", "s", "u", "n"]);

export function isPlayerProjectionHorizon(
  value: number,
): value is PlayerProjectionHorizon {
  return value === 1 || value === 3 || value === 5 || value === 6;
}

export function upcomingGameweeks(
  lastFinishedGw: number,
  count: number,
): number[] {
  const start = Math.min(38, Math.max(1, Math.round(lastFinishedGw) + 1));
  const span = Math.max(0, Math.round(count));
  const out: number[] = [];
  for (let gw = start; gw <= 38 && out.length < span; gw += 1) {
    out.push(gw);
  }
  return out;
}

export function sliceHorizon(
  gameweeks: readonly PlayerGwSlice[],
  horizon: PlayerProjectionHorizon,
): PlayerGwSlice[] {
  return gameweeks.slice(0, horizon);
}

export function horizonXptsSum(gameweeks: readonly PlayerGwSlice[]): number {
  return sumXPtsOverHorizon(
    gameweeks.map((gw) => (gw.isBlank ? null : gw.xPts)),
  );
}

export function horizonPlayChancePct(
  gameweeks: readonly PlayerGwSlice[],
): number | null {
  const next = gameweeks.find((gw) => !gw.isBlank && gw.p60 != null);
  if (!next || next.p60 == null) return null;
  return Math.round(next.p60 * 1000) / 10;
}

export function horizonMinutes(gameweeks: readonly PlayerGwSlice[]): number {
  let sum = 0;
  for (const gw of gameweeks) {
    if (gw.isBlank) continue;
    sum += Number(gw.expectedMinutes) || 0;
  }
  return Math.round(sum);
}

export function horizonCsPct(
  position: number,
  gameweeks: readonly PlayerGwSlice[],
): number | null {
  if (position !== 1 && position !== 2) return null;
  for (const gw of gameweeks) {
    if (gw.teamCsPcts.length) return gw.teamCsPcts[0] ?? null;
  }
  return null;
}

export function horizonFdr(
  gameweeks: readonly PlayerGwSlice[],
): number | null {
  const levels = gameweeks.flatMap((gw) => gw.fdrLevels);
  if (!levels.length) return null;
  return levels.reduce((sum, level) => sum + level, 0) / levels.length;
}

function viewOf(
  row: PlayerProjectionInput,
  horizon: PlayerProjectionHorizon,
): PlayerProjectionViewRow {
  const horizonGws = sliceHorizon(row.gameweeks, horizon);
  return {
    row,
    horizonGws,
    xptsSum: horizonXptsSum(horizonGws),
    playChancePct: horizonPlayChancePct(horizonGws),
    minutes: horizonMinutes(horizonGws),
    csPct: horizonCsPct(row.position, horizonGws),
    fdr: horizonFdr(horizonGws),
  };
}

function isInjuredStatus(status: string): boolean {
  return INJURED_STATUS.has(String(status ?? "").trim().toLowerCase());
}

function matchesSearch(row: PlayerProjectionInput, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    row.webName.toLowerCase().includes(q) ||
    row.clubShort.toLowerCase().includes(q)
  );
}

function xptsForGw(
  view: PlayerProjectionViewRow,
  gw: number,
): number | null {
  const cell = view.horizonGws.find((item) => item.gw === gw);
  if (!cell || cell.isBlank) return null;
  return cell.xPts;
}

function sortValue(
  view: PlayerProjectionViewRow,
  key: PlayerTableSortKey,
): number | string | null {
  if (key === "name") return view.row.webName.toLowerCase();
  if (key === "price") return view.row.priceTenths;
  if (key === "own") return view.row.ownership;
  if (key === "p60") return view.playChancePct;
  if (key === "minutes") return view.minutes;
  if (key === "xptsSum") return view.xptsSum;
  if (key === "cs") return view.csPct;
  if (key === "fdr") return view.fdr;
  if (key === "status") {
    return view.row.chanceNext ?? (isInjuredStatus(view.row.status) ? 0 : 100);
  }
  if (key.startsWith("xpts:")) {
    return xptsForGw(view, Number(key.slice(5)));
  }
  return null;
}

function compareViews(
  a: PlayerProjectionViewRow,
  b: PlayerProjectionViewRow,
  key: PlayerTableSortKey,
  dir: "asc" | "desc",
): number {
  const av = sortValue(a, key);
  const bv = sortValue(b, key);
  const sign = dir === "asc" ? 1 : -1;
  const aMissing = av == null || av === "";
  const bMissing = bv == null || bv === "";
  if (aMissing && bMissing) {
    return a.row.webName.localeCompare(b.row.webName) || a.row.elementId - b.row.elementId;
  }
  if (aMissing) return 1;
  if (bMissing) return -1;
  if (typeof av === "string" || typeof bv === "string") {
    const cmp = String(av).localeCompare(String(bv));
    if (cmp !== 0) return cmp * sign;
  } else if (av !== bv) {
    return (Number(av) - Number(bv)) * sign;
  }
  return a.row.webName.localeCompare(b.row.webName) || a.row.elementId - b.row.elementId;
}

export function queryPlayerProjectionTable(
  query: PlayerProjectionQuery,
): PlayerProjectionViewRow[] {
  const positions = new Set(query.positions);
  const clubs = new Set(query.clubIds);
  const views = query.rows
    .filter((row) => {
      if (positions.size && !positions.has(row.position)) return false;
      if (clubs.size && !clubs.has(row.clubId)) return false;
      if (
        query.minPriceTenths != null &&
        row.priceTenths < query.minPriceTenths
      ) {
        return false;
      }
      if (
        query.maxPriceTenths != null &&
        row.priceTenths > query.maxPriceTenths
      ) {
        return false;
      }
      if (query.hideInjured && isInjuredStatus(row.status)) return false;
      if (!matchesSearch(row, query.search)) return false;
      if (query.minPlayChancePct != null) {
        const chance = horizonPlayChancePct(
          sliceHorizon(row.gameweeks, query.horizon),
        );
        if (chance == null || chance < query.minPlayChancePct) return false;
      }
      return true;
    })
    .map((row) => viewOf(row, query.horizon));

  views.sort((a, b) => compareViews(a, b, query.sortKey, query.sortDir));
  if (query.topN != null && query.topN > 0) {
    return views.slice(0, query.topN);
  }
  return views;
}

export function poundsToTenths(pounds: number): number | null {
  if (!Number.isFinite(pounds)) return null;
  return Math.round(pounds * 10);
}

export function formatXptsCell(cell: PlayerGwSlice | undefined): string {
  if (!cell || cell.isBlank || cell.xPts == null) return "—";
  return cell.xPts.toFixed(1);
}

export function formatOpponentCell(cell: PlayerGwSlice | undefined): string {
  if (!cell || cell.isBlank || cell.opponents.length === 0) return "—";
  return cell.opponents.join(" · ");
}

/** Rywal razem z poziomem FDR. Puste poziomy nie dostają wymyślonej liczby. */
export function formatFdrCell(cell: PlayerGwSlice | undefined): string {
  if (!cell || cell.isBlank || cell.opponents.length === 0) return "—";
  return cell.opponents
    .map((name, index) => {
      const level = cell.fdrLevels[index];
      return level == null ? name : `${name} ${level}`;
    })
    .join(" · ");
}

export function formatFdrColumn(gameweeks: readonly PlayerGwSlice[]): string {
  if (!gameweeks.length) return "—";
  return gameweeks.map((gw) => formatFdrCell(gw)).join(" · ");
}

export function formatCsText(
  position: number,
  gameweeks: readonly PlayerGwSlice[],
): string {
  if (position !== 1 && position !== 2) return "—";
  const pcts = gameweeks.flatMap((gw) => gw.teamCsPcts);
  if (!pcts.length) return "—";
  return pcts.map((pct) => `${Math.round(pct)}%`).join(" · ");
}

function csvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

const POSITION_CODE: Record<number, string> = {
  1: "GK",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

export function playerProjectionsToCsv(args: {
  views: readonly PlayerProjectionViewRow[];
  lang: StatsLabLang;
  columns: readonly PlayerProjectionColumnId[];
}): string {
  const copy = playerProjectionCopy(args.lang);
  const on = new Set(args.columns);
  const gws = args.views[0]?.horizonGws.map((gw) => gw.gw) ?? [];
  const headers: string[] = [copy.player, copy.position, copy.club];
  if (on.has("price")) headers.push(copy.price);
  if (on.has("own")) headers.push(copy.own);
  if (on.has("status")) headers.push(copy.status);
  if (on.has("p60")) headers.push(copy.p60);
  if (on.has("minutes")) headers.push(copy.minutes);
  if (on.has("xpts")) {
    for (const gw of gws) headers.push(`${copy.xpts} GW${gw}`);
    headers.push(copy.sum);
  }
  if (on.has("goal")) headers.push(copy.goal);
  if (on.has("assist")) headers.push(copy.assist);
  if (on.has("cs")) headers.push(copy.cs);
  if (on.has("fdr")) headers.push(copy.fdr);

  const lines = [headers.map(csvCell).join(",")];
  for (const view of args.views) {
    const cells: Array<string | number> = [
      view.row.webName,
      POSITION_CODE[view.row.position] ?? "—",
      view.row.clubShort,
    ];
    if (on.has("price")) cells.push((view.row.priceTenths / 10).toFixed(1));
    if (on.has("own")) cells.push(view.row.ownership.toFixed(1));
    if (on.has("status")) {
      cells.push(
        view.row.chanceNext != null
          ? `${view.row.status} ${view.row.chanceNext}%`
          : view.row.status,
      );
    }
    if (on.has("p60")) {
      cells.push(view.playChancePct == null ? "—" : view.playChancePct);
    }
    if (on.has("minutes")) cells.push(view.minutes);
    if (on.has("xpts")) {
      for (const gw of view.horizonGws) cells.push(formatXptsCell(gw));
      cells.push(view.xptsSum.toFixed(1));
    }
    if (on.has("goal")) cells.push("—");
    if (on.has("assist")) cells.push("—");
    if (on.has("cs")) cells.push(formatCsText(view.row.position, view.horizonGws));
    if (on.has("fdr")) cells.push(formatFdrColumn(view.horizonGws));
    lines.push(cells.map(csvCell).join(","));
  }
  return lines.join("\n");
}
