"use server";

import { createClient } from "@/lib/supabase/server";
import { listClubLogos } from "@/app/admin/actions/clubLogos";
import { listTierLogos } from "@/app/admin/actions/tierLogos";
import {
  averageFplFromFinished,
  buildPublicStandings,
  finishedGameweeksFrom,
  gameweekMedianThreshold,
} from "@/lib/public/standings";
import type {
  DivisionStandingsPayload,
  GameweekDetailsPayload,
  GwFplRankRow,
  GwMatchCard,
  PublicDivision,
  PublicFixture,
  PublicPyramid,
  PublicSeason,
  PublicStructure,
  PublicTeam,
  TeamSchedulePayload,
} from "@/lib/public/types";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { TierLogoRecord } from "@/lib/admin/tierLogos";

function mapTeam(row: {
  id: string;
  manager_name: string;
  discord_nick: string;
  fpl_id: string | null;
  fpl_team_name: string | null;
  chosen_club: string;
}): PublicTeam {
  return {
    id: row.id,
    manager_name: row.manager_name,
    discord_nick: row.discord_nick,
    fpl_id: row.fpl_id,
    fpl_team_name: row.fpl_team_name,
    chosen_club: row.chosen_club,
  };
}

function mapFixture(
  f: {
    id: string;
    gameweek: number;
    home_team_id: string;
    away_team_id: string;
    home_fpl_points: number | null;
    away_fpl_points: number | null;
    home_h2h_points: number | null;
    away_h2h_points: number | null;
    home_median_bonus: number | null;
    away_median_bonus: number | null;
    is_finished: boolean;
  },
  byId: Map<string, PublicTeam>,
): PublicFixture {
  return {
    id: f.id,
    gameweek: f.gameweek,
    home_team_id: f.home_team_id,
    away_team_id: f.away_team_id,
    home_fpl_points: f.home_fpl_points,
    away_fpl_points: f.away_fpl_points,
    home_h2h_points: f.home_h2h_points ?? 0,
    away_h2h_points: f.away_h2h_points ?? 0,
    home_median_bonus: f.home_median_bonus ?? 0,
    away_median_bonus: f.away_median_bonus ?? 0,
    is_finished: f.is_finished,
    home_team: byId.get(f.home_team_id) ?? null,
    away_team: byId.get(f.away_team_id) ?? null,
  };
}

/** Piramidy, opublikowane sezony i dywizje tylko dla PUBLISHED. */
export async function getPublicStructure(): Promise<PublicStructure> {
  const supabase = createClient();

  const { data: seasons, error: seasonsError } = await supabase
    .from("seasons")
    .select("id, name, status, created_at")
    .eq("status", "PUBLISHED")
    .order("created_at", { ascending: false });

  if (seasonsError) {
    console.error("[getPublicStructure] seasons:", seasonsError);
    throw new Error(seasonsError.message);
  }

  const published = (seasons ?? []) as PublicSeason[];
  const seasonIds = published.map((s) => s.id);

  if (seasonIds.length === 0) {
    return { seasons: [], pyramids: [], divisions: [] };
  }

  const { data: divisions, error: divError } = await supabase
    .from("divisions")
    .select("id, name, tier, season_id, pyramid_id")
    .in("season_id", seasonIds)
    .order("tier", { ascending: true });

  if (divError) {
    console.error("[getPublicStructure] divisions:", divError);
    throw new Error(divError.message);
  }

  const divs = (divisions ?? []) as PublicDivision[];
  const pyramidIds = [...new Set(divs.map((d) => d.pyramid_id))];

  let pyramids: PublicPyramid[] = [];
  if (pyramidIds.length) {
    const { data: pyData, error: pyError } = await supabase
      .from("pyramids")
      .select("id, name")
      .in("id", pyramidIds)
      .order("name", { ascending: true });

    if (pyError) {
      console.error("[getPublicStructure] pyramids:", pyError);
      throw new Error(pyError.message);
    }
    pyramids = (pyData ?? []) as PublicPyramid[];
  }

  return {
    seasons: published,
    pyramids,
    divisions: divs,
  };
}

export async function getPublicClubLogos(): Promise<ClubLogoRecord[]> {
  return listClubLogos();
}

export async function getPublicTierLogos(): Promise<TierLogoRecord[]> {
  return listTierLogos();
}

/** Pełna tabela ligowa + fixtures dywizji. */
export async function getDivisionStandings(
  divisionId: string,
): Promise<DivisionStandingsPayload> {
  const supabase = createClient();
  if (!divisionId) {
    return {
      divisionId: "",
      tier: 1,
      hasDiscordWebhook: false,
      teams: [],
      standings: [],
      fixtures: [],
      finishedGameweeks: [],
      maxGameweek: 18,
      playedGwCount: 0,
      averageFpl: null,
      leader: null,
    };
  }

  let division: {
    id: string;
    season_id: string;
    tier: number;
    discord_webhook_url?: string | null;
  } | null = null;

  {
    const { data, error: divError } = await supabase
      .from("divisions")
      .select("id, season_id, tier, discord_webhook_url")
      .eq("id", divisionId)
      .maybeSingle();

    if (divError && /discord_webhook_url/i.test(divError.message)) {
      const { data: data2, error: err2 } = await supabase
        .from("divisions")
        .select("id, season_id, tier")
        .eq("id", divisionId)
        .maybeSingle();
      if (err2) throw new Error(err2.message);
      division = data2;
    } else if (divError) {
      throw new Error(divError.message);
    } else {
      division = data;
    }
  }

  if (!division) throw new Error("Nie znaleziono dywizji.");

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id, status")
    .eq("id", division.season_id)
    .maybeSingle();

  if (seasonError) throw new Error(seasonError.message);
  if (!season || season.status !== "PUBLISHED") {
    throw new Error("Dywizja należy do nieopublikowanego sezonu.");
  }

  const tier = division.tier ?? 1;
  const hasDiscordWebhook = Boolean((division.discord_webhook_url ?? "").trim());

  const { data: teamsRaw, error: teamsError } = await supabase
    .from("teams")
    .select("id, manager_name, discord_nick, fpl_id, fpl_team_name, chosen_club")
    .eq("division_id", divisionId)
    .order("manager_name", { ascending: true });

  if (teamsError) throw new Error(teamsError.message);

  const teams = (teamsRaw ?? []).map(mapTeam);
  const byId = new Map(teams.map((t) => [t.id, t]));

  const { data: fixturesRaw, error: fixError } = await supabase
    .from("fixtures")
    .select(
      "id, gameweek, home_team_id, away_team_id, home_fpl_points, away_fpl_points, home_h2h_points, away_h2h_points, home_median_bonus, away_median_bonus, is_finished",
    )
    .eq("division_id", divisionId)
    .order("gameweek", { ascending: true });

  if (fixError) throw new Error(fixError.message);

  const fixtures = (fixturesRaw ?? []).map((f) => mapFixture(f, byId));
  const standings = buildPublicStandings(fixtures, teams, tier);
  const finishedGameweeks = finishedGameweeksFrom(fixtures);
  const maxGameweek = fixtures.reduce((m, f) => Math.max(m, f.gameweek), 0) || 18;

  return {
    divisionId,
    tier,
    hasDiscordWebhook,
    teams,
    standings,
    fixtures,
    finishedGameweeks,
    maxGameweek,
    playedGwCount: finishedGameweeks.length,
    averageFpl: averageFplFromFinished(fixtures),
    leader: standings[0] ?? null,
  };
}

/** Mecze, próg mediany i ranking FPL dla jednej kolejki. */
export async function getGameweekDetails(
  divisionId: string,
  gameweek: number,
): Promise<GameweekDetailsPayload> {
  const bundle = await getDivisionStandings(divisionId);
  const gwFixtures = bundle.fixtures.filter((f) => f.gameweek === gameweek);
  const isFinished = gwFixtures.length > 0 && gwFixtures.every((f) => f.is_finished);
  const threshold = isFinished ? gameweekMedianThreshold(gwFixtures) : null;

  const matches: GwMatchCard[] = gwFixtures.map((fixture) => {
    const homeWon = fixture.is_finished && fixture.home_h2h_points === 2;
    const awayWon = fixture.is_finished && fixture.away_h2h_points === 2;
    const draw = fixture.is_finished && fixture.home_h2h_points === 1;
    return { fixture, homeWon, awayWon, draw };
  });

  type ScoreEntry = { team: PublicTeam; fpl: number; median: boolean };
  const scores: ScoreEntry[] = [];
  for (const f of gwFixtures) {
    if (f.home_team) {
      scores.push({
        team: f.home_team,
        fpl: f.home_fpl_points ?? 0,
        median: f.home_median_bonus === 1,
      });
    }
    if (f.away_team) {
      scores.push({
        team: f.away_team,
        fpl: f.away_fpl_points ?? 0,
        median: f.away_median_bonus === 1,
      });
    }
  }

  scores.sort((a, b) => b.fpl - a.fpl || a.team.manager_name.localeCompare(b.team.manager_name));

  const fplRanking: GwFplRankRow[] = scores.map((s, i) => ({
    position: i + 1,
    team: s.team,
    fplPoints: s.fpl,
    medianBonus: s.median,
    inMedianZone: i < 5,
  }));

  return {
    divisionId,
    gameweek,
    isFinished,
    medianThreshold: threshold,
    matches,
    fplRanking,
  };
}

/** Cały terminarz jednej drużyny. */
export async function getTeamSchedule(teamId: string): Promise<TeamSchedulePayload> {
  const supabase = createClient();
  if (!teamId) throw new Error("Brak ID drużyny.");

  const { data: teamRaw, error: teamError } = await supabase
    .from("teams")
    .select("id, manager_name, discord_nick, fpl_id, fpl_team_name, chosen_club, division_id")
    .eq("id", teamId)
    .maybeSingle();

  if (teamError) throw new Error(teamError.message);
  if (!teamRaw) throw new Error("Nie znaleziono drużyny.");

  const team = mapTeam(teamRaw);
  const bundle = await getDivisionStandings(teamRaw.division_id);
  const fixtures = bundle.fixtures.filter(
    (f) => f.home_team_id === teamId || f.away_team_id === teamId,
  );

  return { team, fixtures };
}
