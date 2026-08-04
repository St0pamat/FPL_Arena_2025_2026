/**
 * Cross-division baraże (GW19 / GW38).
 * Gospodarz: 8. miejsce wyższej dywizji (indeks 7 po sortowaniu DESC).
 * Gość: 3. miejsce niższej dywizji (indeks 2).
 */

/** Indeks 0-based: 8. miejsce w tabeli (po sortowaniu malejącym). */
export const PLAYOFF_HIGHER_SEED_INDEX = 7;
/** Indeks 0-based: 3. miejsce w tabeli (po sortowaniu malejącym). */
export const PLAYOFF_LOWER_SEED_INDEX = 2;

/** 1-based pozycje (dla komunikatów UI). */
export const PLAYOFF_HIGHER_POS = PLAYOFF_HIGHER_SEED_INDEX + 1; // 8
export const PLAYOFF_LOWER_POS = PLAYOFF_LOWER_SEED_INDEX + 1; // 3

export type CrossPlayoffBoundary = {
  higherDivisionId: string;
  higherDivisionName: string;
  higherTier: number;
  lowerDivisionId: string;
  lowerDivisionName: string;
  lowerTier: number;
  homeTeamId: string;
  awayTeamId: string;
  homeSeed: number;
  awaySeed: number;
};

/**
 * Sortowanie regulaminowe malejące:
 * 1) Duże punkty (H2H + Mediana)
 * 2) Małe punkty FPL
 * → indeks [0] = 1. miejsce (lider).
 */
export function sortStandingsDesc<
  T extends { totalPoints: number; fplPoints: number; teamId: string },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.fplPoints !== a.fplPoints) return b.fplPoints - a.fplPoints;
    return a.teamId.localeCompare(b.teamId);
  });
}

export function teamIdAtZeroBasedIndex(
  rankedTeamIds: string[],
  index: number,
): string | null {
  if (index < 0 || index >= rankedTeamIds.length) return null;
  return rankedTeamIds[index] ?? null;
}

/** @deprecated Użyj teamIdAtZeroBasedIndex — zostawione dla kompatybilności 1-based. */
export function teamIdAtPosition(
  rankedTeamIds: string[],
  position: number,
): string | null {
  return teamIdAtZeroBasedIndex(rankedTeamIds, position - 1);
}

/**
 * Sąsiadujące pary dywizji po tier (1|2, 2|3, …) w obrębie tej samej piramidy.
 * higher = niższy numer tier (lepsza liga), lower = kolejny tier w dół.
 */
export function consecutiveTierBoundaries<
  T extends { id: string; name: string; tier: number; pyramid_id: string },
>(divisions: T[]): Array<{ higher: T; lower: T }> {
  const byPyramid = new Map<string, T[]>();
  for (const d of divisions) {
    const list = byPyramid.get(d.pyramid_id) ?? [];
    list.push(d);
    byPyramid.set(d.pyramid_id, list);
  }

  const out: Array<{ higher: T; lower: T }> = [];
  for (const list of byPyramid.values()) {
    const sorted = [...list].sort((a, b) => a.tier - b.tier);
    for (let i = 0; i + 1 < sorted.length; i++) {
      out.push({ higher: sorted[i]!, lower: sorted[i + 1]! });
    }
  }
  return out;
}
