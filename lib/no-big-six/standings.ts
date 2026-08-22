import type {
  NoBigSixGwResult,
  NoBigSixStandingRow,
  NoBigSixTeam,
} from "@/lib/no-big-six/types";

export function buildOverallStandings(
  teams: NoBigSixTeam[],
  results: NoBigSixGwResult[],
): NoBigSixStandingRow[] {
  const teamByEntry = new Map(teams.map((t) => [t.entry_id, t]));
  const totals = new Map<
    number,
    { raw: number; penalty: number; official: number; gws: number }
  >();

  for (const r of results) {
    const prev = totals.get(r.entry_id) ?? {
      raw: 0,
      penalty: 0,
      official: 0,
      gws: 0,
    };
    totals.set(r.entry_id, {
      raw: prev.raw + r.raw_fpl_points,
      penalty: prev.penalty + r.penalty_points,
      official: prev.official + r.official_points,
      gws: prev.gws + 1,
    });
  }

  const rows: NoBigSixStandingRow[] = [];

  for (const [entry_id, t] of totals) {
    const team = teamByEntry.get(entry_id);
    rows.push({
      entry_id,
      team_name: team?.team_name ?? `Entry ${entry_id}`,
      player_name: team?.player_name ?? "—",
      raw_fpl_points: t.raw,
      penalty_points: t.penalty,
      official_points: t.official,
      played_gws: t.gws,
      is_banned: Boolean(team?.is_banned),
    });
  }

  for (const team of teams) {
    if (totals.has(team.entry_id)) continue;
    if (!team.is_banned) continue;
    rows.push({
      entry_id: team.entry_id,
      team_name: team.team_name,
      player_name: team.player_name,
      raw_fpl_points: 0,
      penalty_points: 0,
      official_points: 0,
      played_gws: 0,
      is_banned: true,
    });
  }

  rows.sort((a, b) => {
    if (a.is_banned !== b.is_banned) {
      return a.is_banned ? 1 : -1;
    }
    if (b.official_points !== a.official_points) {
      return b.official_points - a.official_points;
    }
    return b.raw_fpl_points - a.raw_fpl_points;
  });

  return rows;
}

export function availableGameweeks(results: NoBigSixGwResult[]): number[] {
  const set = new Set(results.map((r) => r.event));
  return [...set].sort((a, b) => a - b);
}
