"use server";

import {
  getDivisionStandings,
  getPublicClubLogos,
  getPublicStructure,
  getPublicTierLogos,
} from "@/lib/public/actions";
import { getPublicDivisionsFromBaza } from "@/lib/public/getAvailableClubs";
import { dedupePlayerSearchEntries } from "@/lib/public/dedupePlayers";
import { computeSeasonStats } from "@/lib/public/seasonStats";
import type {
  PlayerMatchRow,
  PlayerSearchEntry,
  PlayerZoneOverview,
  PlayerZoneProfile,
} from "@/lib/public/playerZoneTypes";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { PublicFixture, PublicStandingRow, PublicTeam } from "@/lib/public/types";

function pickActiveSeason(
  seasons: { id: string; name: string; is_completed: boolean; is_archived: boolean }[],
) {
  return (
    seasons.find((s) => !s.is_completed && !s.is_archived) ??
    seasons.find((s) => !s.is_archived) ??
    seasons[0] ??
    null
  );
}

function resultFromH2h(h2h: number): "W" | "D" | "L" {
  if (h2h === 2) return "W";
  if (h2h === 1) return "D";
  return "L";
}

function buildMatchHistory(teamId: string, fixtures: PublicFixture[]): PlayerMatchRow[] {
  return fixtures
    .filter((f) => f.is_finished)
    .sort((a, b) => b.gameweek - a.gameweek || b.id.localeCompare(a.id))
    .map((f) => {
      const isHome = f.home_team_id === teamId;
      const opponent = isHome ? f.away_team : f.home_team;
      const myFpl = isHome ? (f.home_fpl_points ?? 0) : (f.away_fpl_points ?? 0);
      const oppFpl = isHome ? (f.away_fpl_points ?? 0) : (f.home_fpl_points ?? 0);
      const myH2h = isHome ? f.home_h2h_points : f.away_h2h_points;
      const oppH2h = isHome ? f.away_h2h_points : f.home_h2h_points;
      const medianBonus = isHome ? f.home_median_bonus === 1 : f.away_median_bonus === 1;

      return {
        fixtureId: f.id,
        gameweek: f.gameweek,
        isHome,
        opponent: opponent ?? {
          id: isHome ? f.away_team_id : f.home_team_id,
          manager_name: "—",
          discord_nick: "—",
          fpl_id: null,
          fpl_team_name: null,
          chosen_club: "—",
        },
        myFpl,
        oppFpl,
        myH2h,
        oppH2h,
        medianBonus,
        result: resultFromH2h(myH2h),
        isPlayoff: Boolean(f.is_playoff),
      };
    });
}

/** Widok ogólny Strefy Gracza — aktywny sezon, statystyki, wyszukiwarka. */
export async function getPlayerZoneOverview(): Promise<PlayerZoneOverview> {
  const emptyStats = {
    pantheon: [],
    finishedGameweeks: [],
    gameweekArchive: [],
    teamFplTotals: [],
    fixtures: [],
    playedGameweekCount: 0,
    hasPlayedFixtures: false,
  };
  const empty: PlayerZoneOverview = {
    seasonId: "",
    seasonName: "",
    isCompleted: false,
    players: [],
    seasonStats: emptyStats,
    logos: [],
    hasPlayedFixtures: false,
  };

  try {
    const [structure, logos] = await Promise.all([getPublicStructure(), getPublicClubLogos()]);
    const season = pickActiveSeason(structure.seasons);

    if (!season) {
      return { ...empty, logos, error: "Brak opublikowanego sezonu." };
    }

    const seasonDivisions = structure.divisions.filter((d) => d.season_id === season.id);
    if (seasonDivisions.length === 0) {
      return {
        ...empty,
        seasonId: season.id,
        seasonName: season.name,
        isCompleted: season.is_completed,
        logos,
        error: "Brak kompletnych dywizji w sezonie.",
      };
    }

    const bundles = await Promise.all(
      seasonDivisions.map(async (div) => {
        const bundle = await getDivisionStandings(div.id);
        return { div, bundle };
      }),
    );

    const players: PlayerSearchEntry[] = [];
    const allFixtures: PublicFixture[] = [];
    const allStandings: PublicStandingRow[] = [];

    for (const { div, bundle } of bundles) {
    for (const t of bundle.teams) {
      if (players.some((p) => p.teamId === t.id)) continue;
      players.push({
          teamId: t.id,
          discord_nick: t.discord_nick,
          fpl_team_name: t.fpl_team_name,
          manager_name: t.manager_name,
          chosen_club: t.chosen_club,
          divisionId: div.id,
          divisionName: div.name,
          tier: div.tier,
        });
      }
      allFixtures.push(...bundle.fixtures);
      allStandings.push(...bundle.standings);
    }

    players.sort((a, b) => {
      const aLabel = a.fpl_team_name ?? a.manager_name;
      const bLabel = b.fpl_team_name ?? b.manager_name;
      return aLabel.localeCompare(bLabel, "pl");
    });

    const hasPlayedFixtures = allFixtures.some((f) => f.is_finished && !f.is_playoff);
    const seasonStats = computeSeasonStats(allFixtures, allStandings);

    return {
      seasonId: season.id,
      seasonName: season.name,
      isCompleted: season.is_completed,
      players,
      seasonStats,
      logos,
      hasPlayedFixtures,
    };
  } catch (e) {
    return {
      ...empty,
      error: e instanceof Error ? e.message : "Nie udało się wczytać Strefy Gracza.",
    };
  }
}

/** Profil pojedynczego gracza po teamId. */
export async function getPlayerZoneProfile(teamId: string): Promise<PlayerZoneProfile | null> {
  if (!teamId) return null;

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const [structure, logos, tierLogos] = await Promise.all([
      getPublicStructure(),
      getPublicClubLogos(),
      getPublicTierLogos(),
    ]);

    // Bezpośrednio po id — działa dla dowolnego (opublikowanego) sezonu
    let teamRow: {
      id: string;
      manager_name: string;
      discord_nick: string;
      fpl_id: string | null;
      fpl_team_name: string | null;
      chosen_club: string;
      previous_season_or: number | null;
      x_com: string | null;
      division_id: string;
    } | null = null;

    {
      const { data, error } = await supabase
        .from("teams")
        .select(
          "id, manager_name, discord_nick, fpl_id, fpl_team_name, chosen_club, previous_season_or, x_com, division_id",
        )
        .eq("id", teamId)
        .maybeSingle();

      if (error && /x_com/i.test(error.message)) {
        const { data: fb, error: err2 } = await supabase
          .from("teams")
          .select(
            "id, manager_name, discord_nick, fpl_id, fpl_team_name, chosen_club, previous_season_or, division_id",
          )
          .eq("id", teamId)
          .maybeSingle();
        if (err2) throw new Error(err2.message);
        if (fb) {
          teamRow = { ...fb, x_com: null };
        }
      } else if (error) {
        throw new Error(error.message);
      } else if (data) {
        teamRow = {
          ...data,
          previous_season_or:
            data.previous_season_or != null ? Number(data.previous_season_or) : null,
          x_com: (data.x_com as string | null) ?? null,
        };
      }
    }

    const { getFARankingData } = await import("@/lib/public/actions");
    const { faPlayerKey } = await import("@/lib/public/faRanking");

    if (teamRow) {
      const division = structure.divisions.find((d) => d.id === teamRow.division_id);
      const seasonId =
        division?.season_id ??
        structure.seasons.find((s) => !s.is_archived)?.id ??
        structure.seasons[0]?.id ??
        "";
      const seasonName =
        structure.seasons.find((s) => s.id === seasonId)?.name ?? "Sezon";

      let standing: PublicStandingRow | null = null;
      let teamFixtures: PublicFixture[] = [];
      let divisionName = division?.name ?? "—";
      let tier = division?.tier ?? 1;
      let team: PublicTeam = {
        id: teamRow.id,
        manager_name: teamRow.manager_name,
        discord_nick: teamRow.discord_nick,
        fpl_id: teamRow.fpl_id,
        fpl_team_name: teamRow.fpl_team_name,
        chosen_club: teamRow.chosen_club,
        previous_season_or: teamRow.previous_season_or,
        x_com: teamRow.x_com,
      };

      try {
        const bundle = await getDivisionStandings(teamRow.division_id);
        const found = bundle.teams.find((t) => t.id === teamId);
        if (found) team = { ...found, x_com: found.x_com ?? teamRow.x_com };
        standing = bundle.standings.find((s) => s.teamId === teamId) ?? null;
        teamFixtures = bundle.fixtures.filter(
          (f) => f.home_team_id === teamId || f.away_team_id === teamId,
        );
        divisionName = division?.name ?? divisionName;
        tier = bundle.tier ?? tier;
      } catch {
        // Dywizja niedostępna publicznie — zostaw podstawowe dane teamu
      }

      const matchHistory = buildMatchHistory(teamId, teamFixtures);
      const playedFromMatches = new Set(matchHistory.map((m) => m.gameweek)).size;
      const overallFplPoints = matchHistory.reduce((s, m) => s + m.myFpl, 0);
      const fplPointsDiff = matchHistory.reduce((s, m) => s + (m.myFpl - m.oppFpl), 0);
      const ppg =
        matchHistory.length > 0
          ? Math.round((overallFplPoints / matchHistory.length) * 10) / 10
          : null;

      let highScore: { points: number; gameweek: number } | null = null;
      let lowScore: { points: number; gameweek: number } | null = null;
      for (const m of matchHistory) {
        if (!highScore || m.myFpl > highScore.points) {
          highScore = { points: m.myFpl, gameweek: m.gameweek };
        }
        if (!lowScore || m.myFpl < lowScore.points) {
          lowScore = { points: m.myFpl, gameweek: m.gameweek };
        }
      }

      let faRankingPosition: number | null = null;
      let faRankingPlayers = 0;
      let faTrendDelta: number | null = null;
      let faTotalPoints = overallFplPoints;
      let playedGameweeks = playedFromMatches;
      const targetGameweeks = 38;

      if (seasonId) {
        try {
          const fa = await getFARankingData(seasonId);
          faRankingPlayers = fa.rows.length;
          const key = faPlayerKey(team);
          const row = key
            ? fa.rows.find((r) => r.playerKey === key)
            : fa.rows.find((r) => r.team.id === teamId);
          if (row) {
            faRankingPosition = row.position;
            faTrendDelta = row.trendDelta;
            faTotalPoints = row.totalPoints;
            if (row.formHistory.length > 0) {
              playedGameweeks = row.formHistory.length;
              let faHigh = row.formHistory[0];
              let faLow = row.formHistory[0];
              for (const e of row.formHistory) {
                if (e.points > faHigh.points) faHigh = e;
                if (e.points < faLow.points) faLow = e;
              }
              highScore = { points: faHigh.points, gameweek: faHigh.gw };
              lowScore = { points: faLow.points, gameweek: faLow.gw };
            }
          }
        } catch {
          /* ignore */
        }
      }

      // PPG: prefer FA total / played when FA history exists
      const faPpg =
        playedGameweeks > 0 && faTotalPoints > 0
          ? Math.round((faTotalPoints / playedGameweeks) * 10) / 10
          : ppg;

      return {
        team,
        divisionId: teamRow.division_id,
        divisionName,
        tier,
        seasonId,
        seasonName,
        standing,
        form: standing?.form ?? [],
        fixtures: teamFixtures,
        matchHistory,
        logos,
        tierLogos,
        faRankingPosition,
        faRankingPlayers,
        faTrendDelta,
        faTotalPoints,
        ppg: faPpg,
        highScore,
        lowScore,
        playedGameweeks,
        targetGameweeks,
        fplPointsDiff,
        overallFplPoints,
      };
    }

    // Fallback: baza rekrutacyjna (bez fixtures)
    const season = pickActiveSeason(structure.seasons);
    const baza = await getPublicDivisionsFromBaza();
    for (const block of baza.divisions) {
      const row = block.teams.find((t) => t.teamId === teamId);
      if (!row) continue;

      return {
        team: {
          id: row.teamId,
          manager_name: row.manager_name,
          discord_nick: row.discord_nick,
          fpl_id: null,
          fpl_team_name: row.fpl_team_name,
          chosen_club: row.chosen_club,
          previous_season_or: row.previous_or,
          x_com: null,
        },
        divisionId: block.divisionId,
        divisionName: block.name,
        tier: block.tier,
        seasonId: season?.id ?? "",
        seasonName: baza.seasonName || season?.name || "Sezon",
        standing: null,
        form: [],
        fixtures: [],
        matchHistory: [],
        logos,
        tierLogos,
        faRankingPosition: null,
        faRankingPlayers: 0,
        faTrendDelta: null,
        faTotalPoints: 0,
        ppg: null,
        highScore: null,
        lowScore: null,
        playedGameweeks: 0,
        targetGameweeks: 38,
        fplPointsDiff: 0,
        overallFplPoints: 0,
      };
    }

    return null;
  } catch (e) {
    console.error("[getPlayerZoneProfile]", e);
    return null;
  }
}

/** Lista graczy do wyszukiwarki w navbarze (liga + zapisy rekrutacyjne). */
export async function getPlayerSearchList(): Promise<{
  players: PlayerSearchEntry[];
  logos: ClubLogoRecord[];
}> {
  const [overview, baza] = await Promise.all([
    getPlayerZoneOverview(),
    getPublicDivisionsFromBaza(),
  ]);

  const byId = new Map(overview.players.map((p) => [p.teamId, p]));

  for (const block of baza.divisions) {
    for (const row of block.teams) {
      if (byId.has(row.teamId)) continue;
      byId.set(row.teamId, {
        teamId: row.teamId,
        discord_nick: row.discord_nick,
        fpl_team_name: row.fpl_team_name,
        manager_name: row.manager_name,
        chosen_club: row.chosen_club,
        divisionId: block.divisionId,
        divisionName: block.name,
        tier: block.tier,
      });
    }
  }

  const players = dedupePlayerSearchEntries([...byId.values()]).sort((a, b) => {
    const aLabel = a.fpl_team_name ?? a.manager_name;
    const bLabel = b.fpl_team_name ?? b.manager_name;
    return aLabel.localeCompare(bLabel, "pl");
  });

  return {
    players,
    logos: overview.logos,
  };
}
