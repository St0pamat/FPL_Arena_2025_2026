/** Stałe współdzielone klient ↔ serwer (nie wolno ich eksportować z plików `"use server"`). */

/** Sentinel UI (legacy): nie używać — Master Import wymaga jawnego season_id. */
export const MASTER_IMPORT_AUTO_SEASON = "__auto__";

/** Domyślna nazwa przy ręcznym tworzeniu sezonu (podpowiedź UI). */
export const DEFAULT_SEASON_NAME = "Sezon 1 (2026/27)";

/** Zakres punktów FPL (hit’y / symulator ujemnych). */
export const FPL_POINTS_MIN = -20;
export const FPL_POINTS_MAX = 300;

/** Metody TB w DB (kanoniczne + legacy aliasy). */
export type TiebreakerMethod =
  | "FPL_POINTS"
  | "GOALS_XI"
  | "GOALS_CONCEDED"
  | "BENCH_POINTS"
  | "COIN_TOSS"
  /** @deprecated legacy */
  | "GOALS"
  | "CONCEDED"
  | "BENCH"
  | "MANUAL"
  | "FPL";

export function clampFplPoints(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(FPL_POINTS_MIN, Math.min(FPL_POINTS_MAX, Math.round(n)));
}

export function isValidFplPoints(n: number): boolean {
  return Number.isFinite(n) && n >= FPL_POINTS_MIN && n <= FPL_POINTS_MAX;
}