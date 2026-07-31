/**
 * Algorytm Tabel Bergera (circle method) — każdy z każdym + rewanże.
 * Dla N drużyn (parzyste): (N-1) kolejek pierwszej rundy + (N-1) rewanży = 2*(N-1) GW.
 * Dla 10 drużyn → 18 kolejek.
 */
export interface BergerMatch {
  gameweek: number;
  home_team_id: string;
  away_team_id: string;
}

export function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateBergerFixtures(teamIds: string[]): BergerMatch[] {
  if (teamIds.length < 2) {
    throw new Error("Potrzeba co najmniej 2 drużyn do wygenerowania terminarza.");
  }

  const BYE = "__BYE__";
  const teams = [...teamIds];
  if (teams.length % 2 === 1) {
    teams.push(BYE);
  }

  const total = teams.length;
  const roundsFirst = total - 1;
  const half = total / 2;

  let rotation = [...teams];
  const firstHalf: Array<{ gw: number; home: string; away: string }> = [];

  for (let r = 0; r < roundsFirst; r++) {
    for (let i = 0; i < half; i++) {
      const a = rotation[i];
      const b = rotation[total - 1 - i];
      if (a === BYE || b === BYE) continue;

      const homeFirst = (r + i) % 2 === 0;
      firstHalf.push({
        gw: r + 1,
        home: homeFirst ? a : b,
        away: homeFirst ? b : a,
      });
    }

    // Rotacja: indeks 0 stały, ostatni → pozycja 1
    const fixed = rotation[0];
    const last = rotation[rotation.length - 1];
    rotation = [fixed, last, ...rotation.slice(1, -1)];
  }

  const secondHalf = firstHalf.map((m) => ({
    gw: m.gw + roundsFirst,
    home: m.away,
    away: m.home,
  }));

  return [...firstHalf, ...secondHalf].map((m) => ({
    gameweek: m.gw,
    home_team_id: m.home,
    away_team_id: m.away,
  }));
}
