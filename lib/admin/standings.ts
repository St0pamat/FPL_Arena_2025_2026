/**
 * Tabele ligowe H2H z rozliczonych fixtures (Mediana 2+1).
 */

export interface StandingFixtureInput {
  gameweek: number;
  home_team_id: string;
  away_team_id: string;
  home_fpl_points: number | null;
  away_fpl_points: number | null;
  home_h2h_points: number;
  away_h2h_points: number;
  home_median_bonus: number;
  away_median_bonus: number;
  is_finished: boolean;
}

export interface StandingRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  /** Suma małych punktów FPL */
  fplPoints: number;
  /** Suma punktów H2H (2/1/0) bez mediany */
  h2hPoints: number;
  /** Suma bonusów mediany (+1) */
  medianPoints: number;
  /** h2h + mediana — do sortowania tabeli */
  totalPoints: number;
  /** Różnica małych FPL (dla tie-break) */
  fplDiff: number;
  position: number;
}

function emptyRow(teamId: string): StandingRow {
  return {
    teamId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    fplPoints: 0,
    h2hPoints: 0,
    medianPoints: 0,
    totalPoints: 0,
    fplDiff: 0,
    position: 0,
  };
}

function applyResult(
  row: StandingRow,
  fplFor: number,
  fplAgainst: number,
  h2h: number,
  median: number,
) {
  row.played += 1;
  row.fplPoints += fplFor;
  row.fplDiff += fplFor - fplAgainst;
  row.h2hPoints += h2h;
  row.medianPoints += median;
  row.totalPoints = row.h2hPoints + row.medianPoints;
  if (h2h === 2) row.won += 1;
  else if (h2h === 1) row.drawn += 1;
  else row.lost += 1;
}

function rankRows(rows: StandingRow[]): StandingRow[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.h2hPoints !== a.h2hPoints) return b.h2hPoints - a.h2hPoints;
    if (b.medianPoints !== a.medianPoints) return b.medianPoints - a.medianPoints;
    if (b.fplPoints !== a.fplPoints) return b.fplPoints - a.fplPoints;
    if (b.fplDiff !== a.fplDiff) return b.fplDiff - a.fplDiff;
    return a.teamId.localeCompare(b.teamId);
  });
  return sorted.map((r, i) => ({ ...r, position: i + 1 }));
}

/** Tabela z podzbioru meczów (np. jeden GW lub całość). */
export function buildStandings(
  fixtures: StandingFixtureInput[],
  teamIds: string[],
): StandingRow[] {
  const map = new Map<string, StandingRow>();
  for (const id of teamIds) map.set(id, emptyRow(id));

  for (const f of fixtures) {
    if (!f.is_finished) continue;
    const homeFpl = f.home_fpl_points ?? 0;
    const awayFpl = f.away_fpl_points ?? 0;

    const home = map.get(f.home_team_id) ?? emptyRow(f.home_team_id);
    const away = map.get(f.away_team_id) ?? emptyRow(f.away_team_id);
    map.set(f.home_team_id, home);
    map.set(f.away_team_id, away);

    applyResult(home, homeFpl, awayFpl, f.home_h2h_points, f.home_median_bonus);
    applyResult(away, awayFpl, homeFpl, f.away_h2h_points, f.away_median_bonus);
  }

  return rankRows([...map.values()]);
}

export function finishedGameweeks(fixtures: StandingFixtureInput[]): number[] {
  const set = new Set<number>();
  for (const f of fixtures) {
    if (f.is_finished) set.add(f.gameweek);
  }
  return [...set].sort((a, b) => a - b);
}
