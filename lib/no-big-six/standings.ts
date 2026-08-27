import type {
  NoBigSixGwResult,
  NoBigSixPenalty,
  NoBigSixStandingRow,
  NoBigSixTeam,
  NoBigSixTrend,
} from "@/lib/no-big-six/types";
import { hasIntentionalViolation } from "@/lib/no-big-six/penalties";

type StandingDraft = Omit<NoBigSixStandingRow, "rank" | "previous_rank" | "trend">;

/** Warstwa sortowania: 0 = czyści, 1 = DO ZBANOWANIA, 2 = zbanowani */
function sortLayer(row: { is_banned: boolean; flag_for_ban: boolean }): number {
  if (row.is_banned) return 2;
  if (row.flag_for_ban) return 1;
  return 0;
}

function compareStandings(
  a: { is_banned: boolean; flag_for_ban: boolean; official_points: number; raw_fpl_points: number; team_name: string; entry_id: number },
  b: { is_banned: boolean; flag_for_ban: boolean; official_points: number; raw_fpl_points: number; team_name: string; entry_id: number },
): number {
  const layerDiff = sortLayer(a) - sortLayer(b);
  if (layerDiff !== 0) return layerDiff;

  if (b.official_points !== a.official_points) {
    return b.official_points - a.official_points;
  }
  if (b.raw_fpl_points !== a.raw_fpl_points) {
    return b.raw_fpl_points - a.raw_fpl_points;
  }
  const nameCmp = a.team_name.localeCompare(b.team_name, "pl");
  if (nameCmp !== 0) return nameCmp;
  return a.entry_id - b.entry_id;
}

function buildStandingDrafts(
  teams: NoBigSixTeam[],
  results: NoBigSixGwResult[],
  penalties: NoBigSixPenalty[],
): StandingDraft[] {
  const maxEvent = results.reduce((max, r) => Math.max(max, r.event), 0);
  const relevantPenalties =
    maxEvent > 0 ? penalties.filter((p) => p.event <= maxEvent) : penalties;

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

  const rows: StandingDraft[] = [];

  for (const [entry_id, t] of totals) {
    const team = teamByEntry.get(entry_id);
    const isBanned = Boolean(team?.is_banned);
    const flagForBan =
      !isBanned && hasIntentionalViolation(relevantPenalties, entry_id);

    rows.push({
      entry_id,
      team_name: team?.team_name ?? `Entry ${entry_id}`,
      player_name: team?.player_name ?? "—",
      raw_fpl_points: t.raw,
      penalty_points: t.penalty,
      official_points: t.official,
      played_gws: t.gws,
      is_banned: isBanned,
      custom_logo_url: team?.custom_logo_url ?? null,
      flag_for_ban: flagForBan,
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
      custom_logo_url: team.custom_logo_url,
      flag_for_ban: false,
    });
  }

  rows.sort(compareStandings);
  return rows;
}

/** Przypisz rank tylko aktywnym (warstwa 0 i 1); zbanowani → null */
function assignRanks(rows: StandingDraft[]): Map<number, number | null> {
  const ranks = new Map<number, number | null>();
  let activeRank = 0;
  for (const row of rows) {
    if (row.is_banned) {
      ranks.set(row.entry_id, null);
    } else {
      activeRank += 1;
      ranks.set(row.entry_id, activeRank);
    }
  }
  return ranks;
}

function trendFromRanks(
  previous: number | null | undefined,
  current: number | null,
): NoBigSixTrend {
  if (current == null || previous == null) return "same";
  if (previous > current) return "up";
  if (previous < current) return "down";
  return "same";
}

export function buildOverallStandings(
  teams: NoBigSixTeam[],
  results: NoBigSixGwResult[],
  penalties: NoBigSixPenalty[] = [],
): NoBigSixStandingRow[] {
  const currentDrafts = buildStandingDrafts(teams, results, penalties);
  const currentRanks = assignRanks(currentDrafts);

  const maxGw = results.reduce((max, r) => Math.max(max, r.event), 0);

  let previousRankByEntry = new Map<number, number | null>();

  if (maxGw > 1) {
    const prevResults = results.filter((r) => r.event <= maxGw - 1);
    const prevDrafts = buildStandingDrafts(teams, prevResults, penalties);
    previousRankByEntry = assignRanks(prevDrafts);
  } else {
    previousRankByEntry = new Map(currentRanks);
  }

  return currentDrafts.map((row) => {
    const rank = currentRanks.get(row.entry_id) ?? null;
    const previous_rank = previousRankByEntry.has(row.entry_id)
      ? (previousRankByEntry.get(row.entry_id) ?? null)
      : null;

    return {
      ...row,
      rank,
      previous_rank,
      trend: trendFromRanks(previous_rank, rank),
    };
  });
}

export function availableGameweeks(results: NoBigSixGwResult[]): number[] {
  const set = new Set(results.map((r) => r.event));
  return [...set].sort((a, b) => a - b);
}
