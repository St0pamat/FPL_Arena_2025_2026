"use server";

import {
  getDivisionStandings,
  getPublicClubLogos,
  getPublicStructure,
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
    const [structure, logos] = await Promise.all([getPublicStructure(), getPublicClubLogos()]);
    const season = pickActiveSeason(structure.seasons);
    const seasonDivisions = structure.divisions.filter((d) =>
      season ? d.season_id === season.id : true,
    );

    for (const div of seasonDivisions) {
      const bundle = await getDivisionStandings(div.id);
      const team = bundle.teams.find((t) => t.id === teamId);
      if (!team) continue;

      const standing = bundle.standings.find((s) => s.teamId === teamId) ?? null;
      const teamFixtures = bundle.fixtures.filter(
        (f) => f.home_team_id === teamId || f.away_team_id === teamId,
      );

      return {
        team,
        divisionId: div.id,
        divisionName: div.name,
        tier: div.tier,
        seasonName: season?.name ?? "Sezon",
        standing,
        form: standing?.form ?? [],
        fixtures: teamFixtures,
        matchHistory: buildMatchHistory(teamId, teamFixtures),
        logos,
      };
    }

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
        },
        divisionId: block.divisionId,
        divisionName: block.name,
        tier: block.tier,
        seasonName: baza.seasonName || season?.name || "Sezon",
        standing: null,
        form: [],
        fixtures: [],
        matchHistory: [],
        logos,
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
