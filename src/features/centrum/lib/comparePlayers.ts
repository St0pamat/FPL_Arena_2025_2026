import type { Player } from "@arena/types/player";
import type { PlayerHighlightsMap } from "@arena/types/highlights";
import type { PlayerSeasonHistoryMap } from "@arena/types/seasonHistory";
import type { GwMatchesBlock } from "@arena/types/match";
import { getPlayerOrBundle } from "@arena/features/profiles/lib/or";
import type { GladiatorOrMap } from "@arena/types/or";

export type CompareResult = {
  playerA: Player;
  playerB: Player;
  directMatches: {
    gw: number;
    scoreA: number;
    scoreB: number;
    outcome: "A" | "B" | "D";
  }[];
  record: { winsA: number; winsB: number; draws: number };
  fplWinsInDirect: { a: number; b: number; draws: number };
  totalFplA: number;
  totalFplB: number;
  orA: { historical: number | null; season: number | null };
  orB: { historical: number | null; season: number | null };
  avgVsTop10kA: number | null;
  avgVsTop10kB: number | null;
};

export function comparePlayers(
  idA: number,
  idB: number,
  players: Player[],
  matchesByGw: GwMatchesBlock[],
  highlights: PlayerHighlightsMap,
  seasonHistory: PlayerSeasonHistoryMap,
  gladiatorOr: GladiatorOrMap
): CompareResult | null {
  const playerA = players.find((p) => p.id === idA);
  const playerB = players.find((p) => p.id === idB);
  if (!playerA || !playerB || idA === idB) return null;

  const directMatches: CompareResult["directMatches"] = [];
  for (const block of matchesByGw) {
    for (const m of block.matches || []) {
      const isAB = m.teamA === playerA.team && m.teamB === playerB.team;
      const isBA = m.teamA === playerB.team && m.teamB === playerA.team;
      if (!isAB && !isBA) continue;
      const scoreA = isAB ? Number(m.pointsA) : Number(m.pointsB);
      const scoreB = isAB ? Number(m.pointsB) : Number(m.pointsA);
      const outcome = scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : "D";
      directMatches.push({ gw: Number(block.gw), scoreA, scoreB, outcome });
    }
  }
  directMatches.sort((a, b) => a.gw - b.gw);

  let winsA = 0;
  let winsB = 0;
  let draws = 0;
  let fplA = 0;
  let fplB = 0;
  let fplDraws = 0;
  directMatches.forEach((m) => {
    if (m.outcome === "A") {
      winsA++;
      fplA++;
    } else if (m.outcome === "B") {
      winsB++;
      fplB++;
    } else {
      draws++;
      fplDraws++;
    }
  });

  const orA = getPlayerOrBundle(playerA.id, gladiatorOr, highlights[String(playerA.id)]);
  const orB = getPlayerOrBundle(playerB.id, gladiatorOr, highlights[String(playerB.id)]);

  return {
    playerA,
    playerB,
    directMatches,
    record: { winsA, winsB, draws },
    fplWinsInDirect: { a: fplA, b: fplB, draws: fplDraws },
    totalFplA: playerA.score,
    totalFplB: playerB.score,
    orA: { historical: orA.historicalOr, season: orA.seasonOr },
    orB: { historical: orB.historicalOr, season: orB.seasonOr },
    avgVsTop10kA: seasonHistory[String(playerA.id)]?.avgVsTop10k ?? null,
    avgVsTop10kB: seasonHistory[String(playerB.id)]?.avgVsTop10k ?? null,
  };
}
