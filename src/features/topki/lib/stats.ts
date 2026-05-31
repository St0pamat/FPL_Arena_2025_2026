import type { Player } from "@/types/player";
import type { PlayerHighlightsMap } from "@/types/highlights";
import type { GwMatchesBlock } from "@/types/match";
import { buildStandingsHistory } from "@/features/standings/lib/standings";

export interface H2HRow {
  gw: number;
  fplPoints: number;
  oppPoints: number;
  opponent: string;
  outcome: string;
  margin: number;
}

export interface ManagerCtx {
  player: Player;
  highlights: Record<string, unknown> | null;
  h2h: H2HRow[];
  gwPoints: Array<{
    gw: number;
    points: number;
    bench?: number;
    transfers?: number;
    hitCost?: number;
    h2hOutcome?: string;
    opponent?: string;
    h2hScore?: string;
  }>;
}

export const stdDev = (values: number[]) => {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

export const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const leaguePointsByGw = (matchesByGw: GwMatchesBlock[]) => {
  const byGw: Record<number, number[]> = {};
  for (const block of matchesByGw) {
    const gw = Number(block.gw);
    byGw[gw] = [];
    for (const m of block.matches || []) {
      byGw[gw].push(Number(m.pointsA), Number(m.pointsB));
    }
  }
  return byGw;
};

export const leagueAvgByGw = (matchesByGw: GwMatchesBlock[]) => {
  const raw = leaguePointsByGw(matchesByGw);
  const out: Record<number, number> = {};
  Object.entries(raw).forEach(([gw, pts]) => {
    out[Number(gw)] = pts.length ? pts.reduce((a, b) => a + b, 0) / pts.length : 0;
  });
  return out;
};

export const leagueMedianByGw = (matchesByGw: GwMatchesBlock[]) => {
  const raw = leaguePointsByGw(matchesByGw);
  const out: Record<number, number> = {};
  Object.entries(raw).forEach(([gw, pts]) => {
    out[Number(gw)] = median(pts);
  });
  return out;
};

export const buildManagerContexts = (
  players: Player[],
  highlights: PlayerHighlightsMap
): ManagerCtx[] =>
  players.map((player) => {
    const h = highlights[String(player.id)] || null;
    const h2h = (h?.h2h as H2HRow[] | undefined) || [];
    const gwPoints = (h?.gwPoints as ManagerCtx["gwPoints"]) || [];
    return { player, highlights: h, h2h, gwPoints };
  });

export interface StreakInfo {
  length: number;
  startGw: number;
  endGw: number;
  record: string;
}

export const longestStreak = (
  h2h: H2HRow[],
  predicate: (o: string) => boolean
): StreakInfo => {
  let best: StreakInfo = { length: 0, startGw: 0, endGw: 0, record: "" };
  let cur = 0;
  let start = 0;
  let w = 0;
  let d = 0;
  let l = 0;

  const flush = (endIdx: number) => {
    if (cur > best.length) {
      const endGw = h2h[endIdx]?.gw ?? h2h[h2h.length - 1]?.gw ?? 0;
      best = {
        length: cur,
        startGw: h2h[start]?.gw ?? 0,
        endGw,
        record: `W${w}-R${d}-P${l}`,
      };
    }
  };

  h2h.forEach((row, i) => {
    if (predicate(row.outcome)) {
      if (cur === 0) start = i;
      cur += 1;
      if (row.outcome === "W") w += 1;
      else if (row.outcome === "D") d += 1;
      else l += 1;
    } else {
      if (cur > 0) flush(i - 1);
      cur = 0;
      w = 0;
      d = 0;
      l = 0;
    }
  });
  if (cur > 0) flush(h2h.length - 1);
  return best;
};

export const rankTrajectory = (matchesByGw: GwMatchesBlock[], team: string) => {
  const { byGw, gwList } = buildStandingsHistory(matchesByGw);
  const ranks: { gw: number; rank: number }[] = [];
  for (const gw of gwList) {
    const row = byGw[gw]?.find((r) => r.team === team);
    if (row?.rank) ranks.push({ gw, rank: row.rank });
  }
  if (!ranks.length) return { minRank: 20, maxRank: 20, finalRank: 20, minGw: 0, maxGw: 0 };
  const minRank = Math.min(...ranks.map((r) => r.rank));
  const maxRank = Math.max(...ranks.map((r) => r.rank));
  const minGw = ranks.find((r) => r.rank === minRank)?.gw ?? 0;
  const maxGw = ranks.find((r) => r.rank === maxRank)?.gw ?? 0;
  const finalRank = ranks[ranks.length - 1].rank;
  return { minRank, maxRank, finalRank, minGw, maxGw };
};

export const sumLastN = (gwPoints: ManagerCtx["gwPoints"], n: number) => {
  const sorted = [...gwPoints].sort((a, b) => b.gw - a.gw);
  const slice = sorted.slice(0, n);
  const pts = slice.reduce((s, g) => s + g.points, 0);
  const gws = slice.map((g) => g.gw).sort((a, b) => a - b);
  const range = gws.length ? `GW${gws[0]}–GW${gws[gws.length - 1]}` : "";
  return { pts, range, gws };
};

export const sumFirstN = (gwPoints: ManagerCtx["gwPoints"], n: number) => {
  const sorted = [...gwPoints].sort((a, b) => a.gw - b.gw);
  const slice = sorted.slice(0, n);
  const pts = slice.reduce((s, g) => s + g.points, 0);
  const gws = slice.map((g) => g.gw);
  const range = gws.length ? `GW${gws[0]}–GW${gws[gws.length - 1]}` : "";
  return { pts, range };
};

export const h2hWinsInRange = (h2h: H2HRow[], fromGw: number, toGw: number) => {
  const slice = h2h.filter((r) => r.gw >= fromGw && r.gw <= toGw);
  const w = slice.filter((r) => r.outcome === "W").length;
  const d = slice.filter((r) => r.outcome === "D").length;
  const l = slice.filter((r) => r.outcome === "L").length;
  return { w, d, l, total: slice.length };
};
