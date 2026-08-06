import { medianThreshold } from "@/lib/admin/medianEngine";
import type { PublicFixture, PublicStandingRow, PublicTeam } from "@/lib/public/types";

export type SeasonStatKind =
  | "top_scorer_gw"
  | "median_king"
  | "win_streak"
  | "unlucky_loser"
  | "lucky_winner"
  | "red_lantern"
  | "gw_top"
  | "gw_low";

export interface SeasonStatMatchContext {
  gameweek: number;
  myFpl: number;
  opponent: PublicTeam | null;
  oppFpl: number | null;
}

export interface SeasonStatCard {
  kind: SeasonStatKind;
  label: string;
  value: string;
  valueUnit?: string;
  team: PublicTeam;
  match?: SeasonStatMatchContext;
  footnote?: string;
}

export interface GwMatchHighlight {
  gameweek: number;
  homeTeam: PublicTeam;
  awayTeam: PublicTeam;
  homePts: number;
  awayPts: number;
  margin: number;
}

export interface GameweekDivisionStats {
  gameweek: number;
  topScorer: SeasonStatCard | null;
  redLantern: SeasonStatCard | null;
  blowout: GwMatchHighlight | null;
  nailBiter: GwMatchHighlight | null;
  medianThreshold: number | null;
}

export interface TeamFplTotal {
  teamId: string;
  team: PublicTeam;
  totalFpl: number;
  playedMatches: number;
}

export interface SeasonStatsPayload {
  pantheon: SeasonStatCard[];
  finishedGameweeks: number[];
  gameweekArchive: GameweekDivisionStats[];
  teamFplTotals: TeamFplTotal[];
  fixtures: PublicFixture[];
  playedGameweekCount: number;
  hasPlayedFixtures: boolean;
}

interface MatchSide {
  team: PublicTeam;
  opponent: PublicTeam | null;
  pts: number;
  oppPts: number | null;
  h2h: number;
  gw: number;
}

function finishedLeagueFixtures(fixtures: PublicFixture[]): PublicFixture[] {
  return fixtures.filter((f) => f.is_finished && !f.is_playoff);
}

function matchSides(f: PublicFixture): MatchSide[] {
  const sides: MatchSide[] = [];
  if (f.home_team && f.home_fpl_points != null) {
    sides.push({
      team: f.home_team,
      opponent: f.away_team ?? null,
      pts: f.home_fpl_points,
      oppPts: f.away_fpl_points,
      h2h: f.home_h2h_points,
      gw: f.gameweek,
    });
  }
  if (f.away_team && f.away_fpl_points != null) {
    sides.push({
      team: f.away_team,
      opponent: f.home_team ?? null,
      pts: f.away_fpl_points,
      oppPts: f.home_fpl_points,
      h2h: f.away_h2h_points,
      gw: f.gameweek,
    });
  }
  return sides;
}

function allSides(fixtures: PublicFixture[]): MatchSide[] {
  return finishedLeagueFixtures(fixtures).flatMap(matchSides);
}

function opponentClub(team: PublicTeam | null | undefined): string {
  return (team?.chosen_club || "—").trim();
}

function pickExtreme(sides: MatchSide[], mode: "max" | "min"): MatchSide | null {
  let best: MatchSide | null = null;
  for (const s of sides) {
    if (!best) {
      best = s;
      continue;
    }
    if (mode === "max" ? s.pts > best.pts : s.pts < best.pts) best = s;
  }
  return best;
}

function sideToPlayerCard(
  side: MatchSide,
  kind: SeasonStatKind,
  label: string,
  footnote?: string,
): SeasonStatCard {
  return {
    kind,
    label,
    value: String(side.pts),
    valueUnit: "pkt FPL",
    team: side.team,
    match: {
      gameweek: side.gw,
      myFpl: side.pts,
      opponent: side.opponent,
      oppFpl: side.oppPts,
    },
    footnote:
      footnote ??
      (side.opponent
        ? `vs ${opponentClub(side.opponent)} (${side.oppPts ?? "—"} pkt)`
        : undefined),
  };
}

function computeGwMedianThreshold(fixtures: PublicFixture[], gw: number): number | null {
  const gwFixtures = finishedLeagueFixtures(fixtures).filter((f) => f.gameweek === gw);
  const scores: number[] = [];

  for (const f of gwFixtures) {
    if (f.home_fpl_points != null) scores.push(f.home_fpl_points);
    if (f.away_fpl_points != null) scores.push(f.away_fpl_points);
  }

  if (scores.length === 0) return null;
  const sorted = [...scores].sort((a, b) => b - a);
  const k = Math.min(5, sorted.length);
  return medianThreshold(sorted, k);
}

function findMarginFixture(
  gwFixtures: PublicFixture[],
  mode: "max" | "min",
): GwMatchHighlight | null {
  let best: { fixture: PublicFixture; margin: number } | null = null;

  for (const f of gwFixtures) {
    if (f.home_fpl_points == null || f.away_fpl_points == null) continue;
    if (!f.home_team || !f.away_team) continue;

    const margin = Math.abs(f.home_fpl_points - f.away_fpl_points);
    if (mode === "min" && margin === 0) continue;

    if (
      !best ||
      (mode === "max" ? margin > best.margin : margin < best.margin)
    ) {
      best = { fixture: f, margin };
    }
  }

  if (!best) return null;
  const f = best.fixture;

  return {
    gameweek: f.gameweek,
    homeTeam: f.home_team!,
    awayTeam: f.away_team!,
    homePts: f.home_fpl_points!,
    awayPts: f.away_fpl_points!,
    margin: best.margin,
  };
}

function computeMedianKing(fixtures: PublicFixture[]): SeasonStatCard | null {
  const counts = new Map<string, { team: PublicTeam; count: number }>();

  for (const f of finishedLeagueFixtures(fixtures)) {
    if (f.home_median_bonus === 1 && f.home_team) {
      const cur = counts.get(f.home_team.id);
      counts.set(f.home_team.id, {
        team: f.home_team,
        count: (cur?.count ?? 0) + 1,
      });
    }
    if (f.away_median_bonus === 1 && f.away_team) {
      const cur = counts.get(f.away_team.id);
      counts.set(f.away_team.id, {
        team: f.away_team,
        count: (cur?.count ?? 0) + 1,
      });
    }
  }

  let leader: { team: PublicTeam; count: number } | null = null;
  for (const entry of counts.values()) {
    if (!leader || entry.count > leader.count) leader = entry;
  }

  if (!leader || leader.count <= 0) return null;

  return {
    kind: "median_king",
    label: "Władca Mediany",
    value: String(leader.count),
    valueUnit: "× bonus +1",
    team: leader.team,
    footnote: "Najwięcej bonusów Mediana 2+1 w dywizji",
  };
}

function computeWinStreakLeader(fixtures: PublicFixture[]): SeasonStatCard | null {
  const finished = finishedLeagueFixtures(fixtures);
  const byTeam = new Map<string, PublicTeam>();

  for (const f of finished) {
    if (f.home_team) byTeam.set(f.home_team.id, f.home_team);
    if (f.away_team) byTeam.set(f.away_team.id, f.away_team);
  }

  let bestTeam: PublicTeam | null = null;
  let bestStreak = 0;

  for (const [teamId, team] of byTeam) {
    const outcomes = finished
      .filter((f) => f.home_team_id === teamId || f.away_team_id === teamId)
      .sort((a, b) => a.gameweek - b.gameweek)
      .map((f) => {
        const isHome = f.home_team_id === teamId;
        const h2h = isHome ? f.home_h2h_points : f.away_h2h_points;
        return h2h === 2;
      });

    let streak = 0;
    let max = 0;
    for (const won of outcomes) {
      if (won) {
        streak += 1;
        max = Math.max(max, streak);
      } else {
        streak = 0;
      }
    }

    if (max > bestStreak) {
      bestStreak = max;
      bestTeam = team;
    }
  }

  if (!bestTeam || bestStreak < 2) return null;

  return {
    kind: "win_streak",
    label: "Najdłuższa Seria Wygranych",
    value: String(bestStreak),
    valueUnit: "meczów H2H",
    team: bestTeam,
    footnote: "Passa zwycięstw w tej dywizji",
  };
}

function buildGameweekArchive(fixtures: PublicFixture[]): GameweekDivisionStats[] {
  const gws = [
    ...new Set(finishedLeagueFixtures(fixtures).map((f) => f.gameweek)),
  ].sort((a, b) => a - b);

  return gws.map((gw) => {
    const gwFixtures = finishedLeagueFixtures(fixtures).filter((f) => f.gameweek === gw);
    const gwSides = allSides(fixtures).filter((s) => s.gw === gw);
    const top = pickExtreme(gwSides, "max");
    const low = pickExtreme(gwSides, "min");

    return {
      gameweek: gw,
      topScorer: top
        ? sideToPlayerCard(top, "gw_top", `Menedżer Kolejki · GW${gw}`)
        : null,
      redLantern: low
        ? sideToPlayerCard(low, "gw_low", `Czerwona Latarnia · GW${gw}`)
        : null,
      blowout: findMarginFixture(gwFixtures, "max"),
      nailBiter: findMarginFixture(gwFixtures, "min"),
      medianThreshold: computeGwMedianThreshold(fixtures, gw),
    };
  });
}

function buildTeamFplTotals(fixtures: PublicFixture[]): TeamFplTotal[] {
  const map = new Map<string, TeamFplTotal>();

  for (const s of allSides(fixtures)) {
    const cur = map.get(s.team.id);
    if (cur) {
      cur.totalFpl += s.pts;
      cur.playedMatches += 1;
    } else {
      map.set(s.team.id, {
        teamId: s.team.id,
        team: s.team,
        totalFpl: s.pts,
        playedMatches: 1,
      });
    }
  }

  return [...map.values()].sort((a, b) => b.totalFpl - a.totalFpl);
}

/** Statystyki sezonu dla jednej dywizji (fixtures + standings). */
export function computeSeasonStats(
  fixtures: PublicFixture[],
  _standings: PublicStandingRow[],
): SeasonStatsPayload {
  const sides = allSides(fixtures);
  const empty: SeasonStatsPayload = {
    pantheon: [],
    finishedGameweeks: [],
    gameweekArchive: [],
    teamFplTotals: [],
    fixtures: [],
    playedGameweekCount: 0,
    hasPlayedFixtures: false,
  };

  if (sides.length === 0) return empty;

  const finishedGws = [
    ...new Set(finishedLeagueFixtures(fixtures).map((f) => f.gameweek)),
  ].sort((a, b) => a - b);

  const pantheon: SeasonStatCard[] = [];

  const topSide = pickExtreme(sides, "max");
  if (topSide) {
    pantheon.push({
      kind: "top_scorer_gw",
      label: "Absolutny Rekord Kolejki",
      value: String(topSide.pts),
      valueUnit: "pkt FPL",
      team: topSide.team,
      match: {
        gameweek: topSide.gw,
        myFpl: topSide.pts,
        opponent: topSide.opponent,
        oppFpl: topSide.oppPts,
      },
      footnote: topSide.opponent
        ? `GW${topSide.gw} · vs ${opponentClub(topSide.opponent)} (${topSide.oppPts ?? "—"} pkt)`
        : `GW${topSide.gw}`,
    });
  }

  const lowSide = pickExtreme(sides, "min");
  if (lowSide) {
    pantheon.push({
      kind: "red_lantern",
      label: "Czerwona Latarnia",
      value: String(lowSide.pts),
      valueUnit: "pkt FPL",
      team: lowSide.team,
      match: {
        gameweek: lowSide.gw,
        myFpl: lowSide.pts,
        opponent: lowSide.opponent,
        oppFpl: lowSide.oppPts,
      },
      footnote: `Wpadka GW${lowSide.gw}${lowSide.opponent ? ` · vs ${opponentClub(lowSide.opponent)}` : ""}`,
    });
  }

  let unluckySide: MatchSide | null = null;
  for (const s of sides) {
    if (s.h2h !== 0) continue;
    if (!unluckySide || s.pts > unluckySide.pts) unluckySide = s;
  }
  if (unluckySide) {
    pantheon.push({
      kind: "unlucky_loser",
      label: "Największy Pechowiec",
      value: String(unluckySide.pts),
      valueUnit: "pkt FPL",
      team: unluckySide.team,
      match: {
        gameweek: unluckySide.gw,
        myFpl: unluckySide.pts,
        opponent: unluckySide.opponent,
        oppFpl: unluckySide.oppPts,
      },
      footnote: unluckySide.opponent
        ? `GW${unluckySide.gw} · przegrana z ${opponentClub(unluckySide.opponent)} (${unluckySide.oppPts ?? "—"} pkt)`
        : `GW${unluckySide.gw}`,
    });
  }

  let luckySide: MatchSide | null = null;
  for (const s of sides) {
    if (s.h2h !== 2) continue;
    if (!luckySide || s.pts < luckySide.pts) luckySide = s;
  }
  if (luckySide) {
    pantheon.push({
      kind: "lucky_winner",
      label: "Szczęśliwy Zwycięzca",
      value: String(luckySide.pts),
      valueUnit: "pkt FPL",
      team: luckySide.team,
      match: {
        gameweek: luckySide.gw,
        myFpl: luckySide.pts,
        opponent: luckySide.opponent,
        oppFpl: luckySide.oppPts,
      },
      footnote: luckySide.opponent
        ? `GW${luckySide.gw} · wygrana ${luckySide.pts}:${luckySide.oppPts ?? "—"} z ${opponentClub(luckySide.opponent)}`
        : `GW${luckySide.gw}`,
    });
  }

  const median = computeMedianKing(fixtures);
  if (median) pantheon.push(median);

  const streak = computeWinStreakLeader(fixtures);
  if (streak) pantheon.push(streak);

  return {
    pantheon,
    finishedGameweeks: finishedGws,
    gameweekArchive: buildGameweekArchive(fixtures),
    teamFplTotals: buildTeamFplTotals(fixtures),
    fixtures: finishedLeagueFixtures(fixtures),
    playedGameweekCount: finishedGws.length,
    hasPlayedFixtures: true,
  };
}

export function getHeadToHeadFixtures(
  fixtures: PublicFixture[],
  teamAId: string,
  teamBId: string,
): PublicFixture[] {
  return finishedLeagueFixtures(fixtures).filter(
    (f) =>
      (f.home_team_id === teamAId && f.away_team_id === teamBId) ||
      (f.home_team_id === teamBId && f.away_team_id === teamAId),
  );
}

export const EMPTY_SEASON_STATS: SeasonStatsPayload = {
  pantheon: [],
  finishedGameweeks: [],
  gameweekArchive: [],
  teamFplTotals: [],
  fixtures: [],
  playedGameweekCount: 0,
  hasPlayedFixtures: false,
};
