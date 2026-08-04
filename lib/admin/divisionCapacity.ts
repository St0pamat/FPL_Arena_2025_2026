/**
 * Pojemność dywizji Na Minusie — pełna liga = dokładnie 10 zespołów.
 * Niepełne dywizje mogą istnieć w rekrutacji (draft), ale nie wolno:
 * Berger / symulacja / publikacja / rozliczenie sezonu.
 */

export const DIVISION_CAPACITY = 10;

export const BERGER_REQUIRES_FULL =
  "Terminarz Bergera wymaga równe 10 zespołów.";

export const INCOMPLETE_DIVISION_BLOCK =
  "Dywizja Niepełna. Rekrutacja w toku. Nie można generować meczów ani publikować tej ligi.";

export function isDivisionFull(playerCount: number): boolean {
  return playerCount === DIVISION_CAPACITY;
}

export function isDivisionIncomplete(playerCount: number): boolean {
  return playerCount < DIVISION_CAPACITY;
}

/** Pierwsza niepełna dywizja od góry (najniższy tier z luką). */
export function findFirstIncompleteDivisionId<
  T extends { id: string; tier: number },
>(
  divisionsAsc: T[],
  countByDivisionId: Map<string, number>,
): string | null {
  const sorted = [...divisionsAsc].sort((a, b) => a.tier - b.tier);
  for (const d of sorted) {
    const n = countByDivisionId.get(d.id) ?? 0;
    if (n < DIVISION_CAPACITY) return d.id;
  }
  return null;
}

export function incompleteWarning(playerCount: number): string {
  return `Dywizja Niepełna (${playerCount}/${DIVISION_CAPACITY}). Rekrutacja w toku. Nie można generować meczów ani publikować tej ligi.`;
}
