import { medianThreshold } from "@/lib/admin/medianEngine";
import { isPlayoffGameweek } from "@/lib/public/season";
import type {
  FormPill,
  FormResult,
  PublicFixture,
  PublicStandingRow,
  PublicTeam,
  TableZone,
} from "@/lib/public/types";

/** Faza zasadnicza: wszystkie GW poza barażami (GW19 / GW38). */
function isRegularSeasonFixture(f: PublicFixture): boolean {
  return !f.is_playoff && !isPlayoffGameweek(f.gameweek);
}

function emptyStats(teamId: string) {
  return {
    teamId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    h2hPoints: 0,
    medianPoints: 0,
    totalPoints: 0,
    fplPoints: 0,
    formRaw: [] as FormPill[],
  };
}

function resultFromH2h(h2h: number): FormResult {
  if (h2h === 2) return "W";
  if (h2h === 1) return "D";
  return "L";
}

/**
 * Strefy tabeli wg piramidy:
 * - Tier 1: 1 złoto, 2 srebro, 3 brąz (podium) · 3. od końca baraż · bottom 2 spadek
 * - Tier 2+: top 2 awans · 3. baraż w górę · 3. od końca baraż · bottom 2 spadek
 * - Najniższa dywizja: brak barażu o utrzymanie i spadków (nie ma dokąd spaść)
 */
export function zoneFor(
  position: number,
  total: number,
  tier: number,
  opts?: { isLowestDivision?: boolean; maxTier?: number },
): TableZone {
  if (total <= 0) return "mid";

  const isLowest =
    opts?.isLowestDivision ??
    (opts?.maxTier != null ? tier >= opts.maxTier : false);

  const fromBottom = total - position + 1; // 1 = last

  if (!isLowest) {
    if (fromBottom <= 2 && total >= 3) return "relegation";
    if (fromBottom === 3 && total >= 4) return "playoff_down";
  }

  if (tier === 1) {
    if (position === 1) return "gold";
    if (position === 2) return "silver";
    if (position === 3) return "bronze";
    return "mid";
  }

  // Tier 2+
  if (position <= 2) return "promotion";
  if (position === 3) return "playoff_up";
  return "mid";
}

/**
 * Sort: (H2H+Med) → FPL → H2H — zgodnie z regulaminem publicznym.
 */
export function buildPublicStandings(
  fixtures: PublicFixture[],
  teams: PublicTeam[],
  tier = 2,
  opts?: { isLowestDivision?: boolean; maxTier?: number },
): PublicStandingRow[] {
  const byId = new Map(teams.map((t) => [t.id, t]));
  const stats = new Map(teams.map((t) => [t.id, emptyStats(t.id)]));

  const finished = fixtures
    .filter((f) => f.is_finished && isRegularSeasonFixture(f))
    .sort((a, b) => a.gameweek - b.gameweek);

  for (const f of finished) {
    const home = stats.get(f.home_team_id) ?? emptyStats(f.home_team_id);
    const away = stats.get(f.away_team_id) ?? emptyStats(f.away_team_id);
    stats.set(f.home_team_id, home);
    stats.set(f.away_team_id, away);

    const homeFpl = f.home_fpl_points ?? 0;
    const awayFpl = f.away_fpl_points ?? 0;

    home.played += 1;
    away.played += 1;
    home.fplPoints += homeFpl;
    away.fplPoints += awayFpl;
    home.h2hPoints += f.home_h2h_points;
    away.h2hPoints += f.away_h2h_points;
    home.medianPoints += f.home_median_bonus;
    away.medianPoints += f.away_median_bonus;
    home.totalPoints = home.h2hPoints + home.medianPoints;
    away.totalPoints = away.h2hPoints + away.medianPoints;

    if (f.home_h2h_points === 2) home.won += 1;
    else if (f.home_h2h_points === 1) home.drawn += 1;
    else home.lost += 1;

    if (f.away_h2h_points === 2) away.won += 1;
    else if (f.away_h2h_points === 1) away.drawn += 1;
    else away.lost += 1;

    home.formRaw.push({
      gameweek: f.gameweek,
      result: resultFromH2h(f.home_h2h_points),
      median: f.home_median_bonus === 1,
    });
    away.formRaw.push({
      gameweek: f.gameweek,
      result: resultFromH2h(f.away_h2h_points),
      median: f.away_median_bonus === 1,
    });
  }

  const ranked = [...stats.values()].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.fplPoints !== a.fplPoints) return b.fplPoints - a.fplPoints;
    if (b.h2hPoints !== a.h2hPoints) return b.h2hPoints - a.h2hPoints;
    return a.teamId.localeCompare(b.teamId);
  });

  const n = ranked.length;
  return ranked.map((row, i) => {
    const position = i + 1;
    const team = byId.get(row.teamId);
    const fallback: PublicTeam = {
      id: row.teamId,
      manager_name: "—",
      discord_nick: "—",
      fpl_id: null,
      fpl_team_name: null,
      chosen_club: "—",
    };
    return {
      teamId: row.teamId,
      position,
      zone: zoneFor(position, n, tier, opts),
      played: row.played,
      won: row.won,
      drawn: row.drawn,
      lost: row.lost,
      h2hPoints: row.h2hPoints,
      medianPoints: row.medianPoints,
      totalPoints: row.totalPoints,
      fplPoints: row.fplPoints,
      form: row.formRaw.slice(-5),
      team: team ?? fallback,
    };
  });
}

export function finishedGameweeksFrom(fixtures: PublicFixture[]): number[] {
  const set = new Set<number>();
  for (const f of fixtures) {
    if (f.is_finished && isRegularSeasonFixture(f)) set.add(f.gameweek);
  }
  return [...set].sort((a, b) => a - b);
}

/** Próg mediany z wyników FPL w kolejce (5. najwyższy). */
export function gameweekMedianThreshold(fixtures: PublicFixture[]): number | null {
  const scores: number[] = [];
  for (const f of fixtures) {
    if (!f.is_finished) continue;
    if (f.home_fpl_points != null) scores.push(f.home_fpl_points);
    if (f.away_fpl_points != null) scores.push(f.away_fpl_points);
  }
  if (scores.length === 0) return null;
  const sorted = [...scores].sort((a, b) => b - a);
  return medianThreshold(sorted, 5);
}

export function averageFplFromFinished(fixtures: PublicFixture[]): number | null {
  const vals: number[] = [];
  for (const f of fixtures) {
    if (!f.is_finished) continue;
    if (f.home_fpl_points != null) vals.push(f.home_fpl_points);
    if (f.away_fpl_points != null) vals.push(f.away_fpl_points);
  }
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}
