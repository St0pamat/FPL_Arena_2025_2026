/**
 * Silnik Mediana 2+1 — czysta logika (bez I/O).
 *
 * H2H: wygrana 2–0, remis 1–1.
 * Bonus mediany: w dywizji próg = 5. najwyższy wynik FPL (lub ostatni, gdy <5 graczy).
 * Wszyscy z FPL >= próg dostają +1 (obsługa remisów na progu).
 */

export interface GwScoreLine {
  gameweek: number;
  fpl_id: string;
  points: number;
  lineNumber: number;
}

export interface ParseBatchResult {
  lines: GwScoreLine[];
  errors: string[];
}

/** Parsuje tekst: GW, FPL_ID, Punkty (przecinek / średnik / tab). */
export function parseGwBatchText(raw: string): ParseBatchResult {
  const errors: string[] = [];
  const lines: GwScoreLine[] = [];

  const rows = raw.split(/\r?\n/);
  rows.forEach((row, idx) => {
    const lineNumber = idx + 1;
    const trimmed = row.trim();
    if (!trimmed) return;
    if (/^(gw|gameweek|#)/i.test(trimmed) && /fpl/i.test(trimmed)) return; // nagłówek

    const parts = trimmed.split(/[,;\t]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 3) {
      errors.push(`Wiersz ${lineNumber}: oczekiwano 3 wartości (GW, FPL_ID, Punkty), jest ${parts.length}.`);
      return;
    }

    const gw = Number.parseInt(parts[0], 10);
    const fpl_id = parts[1].replace(/\s+/g, "");
    const points = Number.parseFloat(parts[2].replace(",", "."));

    if (!Number.isFinite(gw) || gw < 1 || gw > 38) {
      errors.push(`Wiersz ${lineNumber}: nieprawidłowy GW „${parts[0]}”.`);
      return;
    }
    if (!/^\d+$/.test(fpl_id)) {
      errors.push(`Wiersz ${lineNumber}: FPL ID musi być liczbą („${parts[1]}”).`);
      return;
    }
    if (!Number.isFinite(points) || points < 0) {
      errors.push(`Wiersz ${lineNumber}: nieprawidłowe punkty „${parts[2]}”.`);
      return;
    }

    lines.push({
      gameweek: gw,
      fpl_id,
      points: Math.round(points),
      lineNumber,
    });
  });

  return { lines, errors };
}

export function groupScoresByGameweek(
  lines: GwScoreLine[],
): Map<number, Map<string, number>> {
  const byGw = new Map<number, Map<string, number>>();
  for (const line of lines) {
    let map = byGw.get(line.gameweek);
    if (!map) {
      map = new Map();
      byGw.set(line.gameweek, map);
    }
    map.set(line.fpl_id, line.points); // ostatni wygrywa przy duplikacie
  }
  return byGw;
}

export function resolveH2h(
  homeFpl: number,
  awayFpl: number,
): { home: 0 | 1 | 2; away: 0 | 1 | 2 } {
  if (homeFpl > awayFpl) return { home: 2, away: 0 };
  if (awayFpl > homeFpl) return { home: 0, away: 2 };
  return { home: 1, away: 1 };
}

/**
 * Próg mediany: K-ty najwyższy wynik (domyślnie K=5 dla dywizji 10-osobowej).
 * Remisy na progu: wszyscy z wynikiem >= próg dostają bonus.
 */
export function medianThreshold(sortedDesc: number[], k = 5): number | null {
  if (sortedDesc.length === 0) return null;
  const rank = Math.min(k, sortedDesc.length);
  return sortedDesc[rank - 1]!;
}

export function computeMedianBonusSet(
  /** teamId → FPL points w tej kolejce */
  pointsByTeam: Map<string, number>,
  k = 5,
): Set<string> {
  const entries = [...pointsByTeam.entries()];
  if (entries.length === 0) return new Set();

  const sortedDesc = entries.map(([, pts]) => pts).sort((a, b) => b - a);
  const threshold = medianThreshold(sortedDesc, k);
  if (threshold === null) return new Set();

  const winners = new Set<string>();
  for (const [teamId, pts] of entries) {
    if (pts >= threshold) winners.add(teamId);
  }
  return winners;
}

export function h2hTotal(h2h: number, medianBonus: number): number {
  return h2h + medianBonus;
}
