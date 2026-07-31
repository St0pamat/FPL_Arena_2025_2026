import type { GwMatchesBlock } from "@arena/types/match";
import type { PlayerHighlightsMap } from "@arena/types/highlights";
import { buildStandingsHistory } from "@arena/features/standings/lib/standings";
import { PLAYER_BY_ID, TEAM_BY_NAME } from "@arena/config/playersIndex";
import { playerDisplayName } from "@arena/lib/playerDisplay";

export type TimelinePerson = {
  playerId: number | null;
  team: string;
  manager: string;
};

export type GwTimelineEntry = {
  gw: number;
  tableLeader: TimelinePerson;
  topScorer: TimelinePerson & { points: number };
  maxHit: (TimelinePerson & { hit: number }) | null;
  chips: (TimelinePerson & { label: string; points: number })[];
};

function personFromTeam(team: string): TimelinePerson {
  const p = TEAM_BY_NAME[team];
  return {
    playerId: p?.id ?? null,
    team,
    manager: p ? playerDisplayName(p) : "",
  };
}

function personFromId(playerId: number, team: string): TimelinePerson {
  const p = PLAYER_BY_ID[playerId];
  return {
    playerId,
    team: p?.team ?? team,
    manager: p ? playerDisplayName(p) : "",
  };
}

export function buildSeasonTimeline(
  matchesByGw: GwMatchesBlock[],
  highlights: PlayerHighlightsMap
): GwTimelineEntry[] {
  const { byGw } = buildStandingsHistory(matchesByGw);
  const maxGw = matchesByGw.length
    ? Math.max(...matchesByGw.map((b) => Number(b.gw)))
    : 38;

  const hitsByGw: Record<number, { playerId: number; team: string; hit: number }[]> = {};
  const chipsByGw: Record<number, { playerId: number; team: string; label: string; points: number }[]> = {};

  Object.entries(highlights).forEach(([idStr, h]) => {
    const playerId = Number(idStr);
    const team = PLAYER_BY_ID[playerId]?.team;
    if (!team) return;
    (h.gwPoints || []).forEach((g) => {
      const gw = g.gw;
      const hit = g.hitCost ?? 0;
      if (hit > 0) {
        if (!hitsByGw[gw]) hitsByGw[gw] = [];
        hitsByGw[gw].push({ playerId, team, hit });
      }
    });
    (h.chips || []).forEach((c) => {
      const gw = c.gw;
      if (!chipsByGw[gw]) chipsByGw[gw] = [];
      chipsByGw[gw].push({
        playerId,
        team,
        label: c.chipLabel || c.chip || "Chip",
        points: c.points,
      });
    });
  });

  const entries: GwTimelineEntry[] = [];
  for (let gw = 1; gw <= maxGw; gw++) {
    const block = matchesByGw.find((b) => Number(b.gw) === gw);
    let topScorer = { team: "—", points: 0 };
    if (block?.matches?.length) {
      for (const m of block.matches) {
        const pa = Number(m.pointsA);
        const pb = Number(m.pointsB);
        if (pa >= topScorer.points) topScorer = { team: m.teamA, points: pa };
        if (pb >= topScorer.points) topScorer = { team: m.teamB, points: pb };
      }
    }

    const leaderRow = byGw[gw]?.find((r) => r.rank === 1);
    const leaderTeam = leaderRow?.team ?? "—";
    const hitList = hitsByGw[gw] || [];
    const maxHit = hitList.length
      ? hitList.reduce((best, cur) => (cur.hit > best.hit ? cur : best))
      : null;

    entries.push({
      gw,
      tableLeader: leaderTeam === "—" ? { playerId: null, team: "—", manager: "" } : personFromTeam(leaderTeam),
      topScorer: {
        ...personFromTeam(topScorer.team),
        points: topScorer.points,
      },
      maxHit: maxHit ? { ...personFromId(maxHit.playerId, maxHit.team), hit: maxHit.hit } : null,
      chips: (chipsByGw[gw] || []).map((c) => ({
        ...personFromId(c.playerId, c.team),
        label: c.label,
        points: c.points,
      })),
    });
  }
  return entries;
}
