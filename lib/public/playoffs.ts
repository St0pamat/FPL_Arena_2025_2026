import {
  PLAYOFF_GAMEWEEK,
  SPRING_PLAYOFF_GAMEWEEK,
  isPlayoffGameweek,
} from "@/lib/public/season";
import {
  buildPlayoffDecisionPath,
  cupOutcomesForWinner,
} from "@/lib/admin/playoffTiebreak";
import type {
  PlayoffMatchMeta,
  PlayoffPreviewPayload,
  PublicDivision,
  PublicFixture,
  PublicStandingRow,
  PublicTeam,
} from "@/lib/public/types";

const PROVISIONAL_NOTE = "[Aktualny zestaw na podstawie tabeli]";
export const PLAYOFF_BADGE = "⚔️ MECZ BARAŻOWY O AWANS / UTRZYMANIE";

function playoffDownRow(standings: PublicStandingRow[]): PublicStandingRow | undefined {
  return (
    standings.find((r) => r.zone === "playoff_down") ??
    standings.find((r) => {
      const fromBottom = standings.length - r.position + 1;
      return fromBottom === 3;
    })
  );
}

function playoffUpRow(standings: PublicStandingRow[]): PublicStandingRow | undefined {
  return standings.find((r) => r.zone === "playoff_up") ?? standings.find((r) => r.position === 3);
}

function virtualFixture(
  id: string,
  home: PublicTeam,
  away: PublicTeam,
  gameweek: number,
): PublicFixture {
  return {
    id,
    gameweek,
    home_team_id: home.id,
    away_team_id: away.id,
    home_fpl_points: null,
    away_fpl_points: null,
    home_h2h_points: 0,
    away_h2h_points: 0,
    home_median_bonus: 0,
    away_median_bonus: 0,
    is_finished: false,
    is_playoff: true,
    home_team: home,
    away_team: away,
  };
}

function makeMatch(opts: {
  id: string;
  home: PublicStandingRow;
  away: PublicStandingRow;
  homeDivisionName: string;
  awayDivisionName: string;
  gameweek: number;
}): PlayoffMatchMeta {
  return {
    fixture: {
      ...virtualFixture(opts.id, opts.home.team, opts.away.team, opts.gameweek),
      home_division_name: opts.homeDivisionName,
      away_division_name: opts.awayDivisionName,
    },
    badge: PLAYOFF_BADGE,
    contextLine: `${opts.home.position}. miejsce (${opts.homeDivisionName}) vs ${opts.away.position}. miejsce (${opts.awayDivisionName})`,
    provisionalNote: PROVISIONAL_NOTE,
    isProvisional: true,
  };
}

/**
 * Baraże — podgląd z tabeli (gdy brak opublikowanych fixtures).
 * 8. wyższej vs 3. niższej.
 */
export function buildPlayoffPreview(opts: {
  division: Pick<PublicDivision, "id" | "name" | "tier" | "season_id" | "pyramid_id">;
  peers: PublicDivision[];
  standings: PublicStandingRow[];
  higherStandings: PublicStandingRow[] | null;
  higherDivision: PublicDivision | null;
  lowerStandings: PublicStandingRow[] | null;
  lowerDivision: PublicDivision | null;
  playoffGameweek?: number;
}): PlayoffPreviewPayload {
  const { division, peers, standings } = opts;
  const playoffGw = opts.playoffGameweek ?? PLAYOFF_GAMEWEEK;
  const peerTiers = peers
    .filter((d) => d.season_id === division.season_id && d.pyramid_id === division.pyramid_id)
    .map((d) => d.tier);
  const maxTier = peerTiers.length ? Math.max(...peerTiers) : division.tier;
  const isLowest = division.tier >= maxTier;

  const matches: PlayoffMatchMeta[] = [];
  const notices: string[] = [];

  if (division.tier > 1) {
    if (opts.higherDivision && opts.higherStandings && opts.higherStandings.length >= 3) {
      const up = playoffUpRow(standings);
      const down = playoffDownRow(opts.higherStandings);
      if (up && down) {
        matches.push(
          makeMatch({
            id: `playoff-up-${opts.higherDivision.id}-${division.id}`,
            home: down,
            away: up,
            homeDivisionName: opts.higherDivision.name,
            awayDivisionName: division.name,
            gameweek: playoffGw,
          }),
        );
      }
    }
  }

  if (isLowest || !opts.lowerDivision) {
    notices.push(
      "Najniższa dywizja w rozgrywkach — brak meczów barażowych o utrzymanie (zespoły zachowują byt).",
    );
  } else if (!opts.lowerStandings || opts.lowerStandings.length < 3) {
    notices.push(
      "Niższa dywizja nie ma jeszcze załadowanych danych — baraż o utrzymanie pojawi się po uzupełnieniu tabeli.",
    );
  } else {
    const down = playoffDownRow(standings);
    const up = playoffUpRow(opts.lowerStandings);
    if (down && up) {
      matches.push(
        makeMatch({
          id: `playoff-down-${division.id}-${opts.lowerDivision.id}`,
          home: down,
          away: up,
          homeDivisionName: division.name,
          awayDivisionName: opts.lowerDivision.name,
          gameweek: playoffGw,
        }),
      );
    }
  }

  return {
    gameweek: playoffGw,
    matches,
    notices,
  };
}

/** Meta z opublikowanego meczu barażowego (z wynikiem). */
export function playoffMetaFromPublishedFixture(
  fixture: PublicFixture,
): PlayoffMatchMeta {
  const homeDiv = fixture.home_division_name ?? "Wyższa dywizja";
  const awayDiv = fixture.away_division_name ?? "Niższa dywizja";

  const winnerId =
    fixture.tiebreaker_winner_id ??
    (fixture.is_finished && fixture.home_h2h_points === 2
      ? fixture.home_team_id
      : fixture.is_finished && fixture.away_h2h_points === 2
        ? fixture.away_team_id
        : null);

  const winnerName = winnerId
    ? winnerId === fixture.home_team_id
      ? fixture.home_team?.fpl_team_name?.trim() ||
        fixture.home_team?.manager_name
      : fixture.away_team?.fpl_team_name?.trim() ||
        fixture.away_team?.manager_name
    : null;

  const outcomes =
    winnerId && fixture.is_finished
      ? cupOutcomesForWinner(winnerId, fixture.home_team_id)
      : null;

  const decisionPath = fixture.is_finished
    ? buildPlayoffDecisionPath({
        homeFpl: fixture.home_fpl_points,
        awayFpl: fixture.away_fpl_points,
        homeGoals: fixture.tiebreaker_home_goals,
        awayGoals: fixture.tiebreaker_away_goals,
        homeGoalsConceded: fixture.tiebreaker_home_goals_conceded,
        awayGoalsConceded: fixture.tiebreaker_away_goals_conceded,
        homeBench: fixture.tiebreaker_home_bench,
        awayBench: fixture.tiebreaker_away_bench,
        method: fixture.tiebreaker_method,
        winnerName,
      })
    : [];

  const deciding = decisionPath.find((s) => s.isDeciding);
  const provisionalNote = !fixture.is_finished
    ? ""
    : deciding?.label ??
      (fixture.tiebreaker_reason?.trim() || "Wynik oficjalny (opublikowany)");

  return {
    fixture,
    badge: PLAYOFF_BADGE,
    contextLine: `8. miejsce (${homeDiv}) vs 3. miejsce (${awayDiv})`,
    provisionalNote,
    isProvisional: false,
    decisionPath,
    homeOutcome: outcomes?.homeOutcome ?? null,
    awayOutcome: outcomes?.awayOutcome ?? null,
  };
}

export function playoffFixturesFromPreview(
  preview: PlayoffPreviewPayload,
): PublicFixture[] {
  return preview.matches.map((m) => m.fixture);
}

export { isPlayoffGameweek, PLAYOFF_GAMEWEEK, SPRING_PLAYOFF_GAMEWEEK };
