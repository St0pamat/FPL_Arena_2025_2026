"use server";

import { createClient } from "@/lib/supabase/server";
import { listClubLogos } from "@/app/admin/actions/clubLogos";
import { listTierLogos } from "@/app/admin/actions/tierLogos";
import { DIVISION_CAPACITY } from "@/lib/admin/divisionCapacity";
import {
  averageFplFromFinished,
  buildPublicStandings,
  finishedGameweeksFrom,
  gameweekMedianThreshold,
} from "@/lib/public/standings";
import { buildPlayoffPreview, playoffMetaFromPublishedFixture } from "@/lib/public/playoffs";
import {
  isPlayoffGameweek,
  PLAYOFF_GAMEWEEK,
  SEASON_MAX_GAMEWEEK,
  SPRING_PLAYOFF_GAMEWEEK,
} from "@/lib/public/season";
import type {
  DivisionStandingsPayload,
  GameweekDetailsPayload,
  GwFplRankRow,
  GwMatchCard,
  PlayoffPreviewPayload,
  PublicDivision,
  PublicFixture,
  PublicPyramid,
  PublicSeason,
  PublicSeasonDivisionStructurePayload,
  PublicSeasonSummaryPayload,
  PublicStandingRow,
  PublicStructure,
  PublicTeam,
  SeasonSummaryPlayerRow,
  TeamSchedulePayload,
  DivisionRosterBlock,
  DivisionRosterRow,
} from "@/lib/public/types";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { TierLogoRecord } from "@/lib/admin/tierLogos";
import { runCalculateEndSeasonStatuses } from "@/lib/admin/endSeasonCompute";
import {
  teamSeasonStatusLabel,
  type TeamSeasonStatus,
} from "@/lib/admin/endSeasonStatuses";

type PublicSupabase = ReturnType<typeof createClient>;

/**
 * Strefa Gracza: tylko dywizje z dokładnie DIVISION_CAPACITY aktywnymi drużynami.
 * Niepełne (rekrutacja) zostają ukryte przed kibicami.
 */
async function filterCompleteDivisions(
  supabase: PublicSupabase,
  divisions: PublicDivision[],
): Promise<PublicDivision[]> {
  if (divisions.length === 0) return [];

  const ids = divisions.map((d) => d.id);
  let teamsRaw: { division_id: string | null; is_active?: boolean | null }[] | null =
    null;

  {
    const { data, error } = await supabase
      .from("teams")
      .select("division_id, is_active")
      .in("division_id", ids);

    if (error && /is_active/i.test(error.message)) {
      const retry = await supabase
        .from("teams")
        .select("division_id")
        .in("division_id", ids);
      if (retry.error) {
        console.error("[filterCompleteDivisions]", retry.error);
        throw new Error(retry.error.message);
      }
      teamsRaw = retry.data ?? [];
    } else if (error) {
      console.error("[filterCompleteDivisions]", error);
      throw new Error(error.message);
    } else {
      teamsRaw = data ?? [];
    }
  }

  const counts = new Map<string, number>();
  for (const t of teamsRaw ?? []) {
    if (!t.division_id || t.is_active === false) continue;
    counts.set(t.division_id, (counts.get(t.division_id) ?? 0) + 1);
  }

  return divisions.filter(
    (d) => (counts.get(d.id) ?? 0) === DIVISION_CAPACITY,
  );
}

async function isDivisionCompleteForPublic(
  supabase: PublicSupabase,
  divisionId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("teams")
    .select("id, is_active")
    .eq("division_id", divisionId);

  if (error && /is_active/i.test(error.message)) {
    const retry = await supabase
      .from("teams")
      .select("id")
      .eq("division_id", divisionId);
    if (retry.error) throw new Error(retry.error.message);
    return (retry.data ?? []).length === DIVISION_CAPACITY;
  }
  if (error) throw new Error(error.message);
  const n = (data ?? []).filter((t) => t.is_active !== false).length;
  return n === DIVISION_CAPACITY;
}

const EMPTY_PLAYOFFS: PlayoffPreviewPayload = {
  gameweek: PLAYOFF_GAMEWEEK,
  matches: [],
  notices: [],
};

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
    is_playoff?: boolean | null;
    tiebreaker_home_goals?: number | null;
    tiebreaker_away_goals?: number | null;
    tiebreaker_home_goals_conceded?: number | null;
    tiebreaker_away_goals_conceded?: number | null;
    tiebreaker_home_bench?: number | null;
    tiebreaker_away_bench?: number | null;
    tiebreaker_winner_id?: string | null;
    tiebreaker_reason?: string | null;
    tiebreaker_method?: string | null;
    home_division_name?: string | null;
    away_division_name?: string | null;
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
    is_playoff: Boolean(f.is_playoff),
    tiebreaker_home_goals: f.tiebreaker_home_goals ?? null,
    tiebreaker_away_goals: f.tiebreaker_away_goals ?? null,
    tiebreaker_home_goals_conceded: f.tiebreaker_home_goals_conceded ?? null,
    tiebreaker_away_goals_conceded: f.tiebreaker_away_goals_conceded ?? null,
    tiebreaker_home_bench: f.tiebreaker_home_bench ?? null,
    tiebreaker_away_bench: f.tiebreaker_away_bench ?? null,
    tiebreaker_winner_id: f.tiebreaker_winner_id ?? null,
    tiebreaker_reason: f.tiebreaker_reason ?? null,
    tiebreaker_method: f.tiebreaker_method ?? null,
    home_division_name: f.home_division_name ?? null,
    away_division_name: f.away_division_name ?? null,
    home_team: byId.get(f.home_team_id) ?? null,
    away_team: byId.get(f.away_team_id) ?? null,
  };
}

/** Piramidy, opublikowane sezony (w tym zarchiwizowane) i dywizje. */
export async function getPublicStructure(): Promise<PublicStructure> {
  const supabase = createClient();

  const { data: seasons, error: seasonsError } = await supabase
    .from("seasons")
    .select("id, name, status, is_completed, is_archived, created_at")
    .eq("status", "PUBLISHED")
    .order("created_at", { ascending: false });

  if (seasonsError) {
    console.error("[getPublicStructure] seasons:", seasonsError);
    throw new Error(seasonsError.message);
  }

  const published: PublicSeason[] = (seasons ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    status: "PUBLISHED",
    is_completed: Boolean(s.is_completed),
    is_archived: Boolean(s.is_archived),
    created_at: s.created_at,
  }));
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

  const allDivs = (divisions ?? []) as PublicDivision[];
  const divs = await filterCompleteDivisions(supabase, allDivs);
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

/**
 * Publiczny podgląd dywizji (menu „Dywizje”).
 * Pokazuje aktualny sezon (najnowszy niearchiwalny) — także DRAFT i niepełne ligi.
 * Sort drużyn: previous_season_or ASC, null na końcu.
 */
export async function getPublicDivisionsPreview(
  seasonId?: string,
): Promise<PublicSeasonDivisionStructurePayload> {
  const supabase = createClient();

  let season: { id: string; name: string } | null = null;

  if (seasonId) {
    const { data, error } = await supabase
      .from("seasons")
      .select("id, name, is_archived")
      .eq("id", seasonId)
      .maybeSingle();
    if (error) {
      return {
        seasonId,
        seasonName: "",
        divisions: [],
        updatedAt: null,
        isPreview: true,
        error: error.message,
      };
    }
    season = data ? { id: data.id, name: data.name } : null;
  } else {
    const { data, error } = await supabase
      .from("seasons")
      .select("id, name, is_archived, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      // fallback bez is_archived
      if (/is_archived/i.test(error.message)) {
        const retry = await supabase
          .from("seasons")
          .select("id, name, created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (retry.error) {
          return {
            seasonId: "",
            seasonName: "",
            divisions: [],
            updatedAt: null,
            isPreview: true,
            error: retry.error.message,
          };
        }
        season = retry.data
          ? { id: retry.data.id, name: retry.data.name }
          : null;
      } else {
        return {
          seasonId: "",
          seasonName: "",
          divisions: [],
          updatedAt: null,
          isPreview: true,
          error: error.message,
        };
      }
    } else {
      const active = (data ?? []).find((s) => !s.is_archived) ?? data?.[0] ?? null;
      season = active ? { id: active.id, name: active.name } : null;
    }
  }

  if (!season) {
    return {
      seasonId: "",
      seasonName: "",
      divisions: [],
      updatedAt: null,
      isPreview: true,
      error: "Brak sezonu do wyświetlenia.",
    };
  }

  const { data: divisionsRaw, error: divError } = await supabase
    .from("divisions")
    .select("id, name, tier, season_id, pyramid_id")
    .eq("season_id", season.id)
    .order("tier", { ascending: true });
  if (divError) {
    return {
      seasonId: season.id,
      seasonName: season.name,
      divisions: [],
      updatedAt: null,
      isPreview: true,
      error: divError.message,
    };
  }

  const allDivs = (divisionsRaw ?? []) as PublicDivision[];
  if (!allDivs.length) {
    return {
      seasonId: season.id,
      seasonName: season.name,
      divisions: [],
      updatedAt: null,
      isPreview: true,
    };
  }

  const pyramidIds = [...new Set(allDivs.map((d) => d.pyramid_id))];
  const { data: pyData } = await supabase
    .from("pyramids")
    .select("id, name")
    .in("id", pyramidIds);
  const pyramidNameById = new Map(
    (pyData ?? []).map((p) => [p.id as string, p.name as string]),
  );

  const divIds = allDivs.map((d) => d.id);
  const { data: teamsRaw, error: teamsError } = await supabase
    .from("teams")
    .select(
      "id, division_id, manager_name, discord_nick, fpl_team_name, chosen_club, previous_season_or, is_active, created_at",
    )
    .in("division_id", divIds);

  type TeamRow = {
    id: string;
    division_id: string | null;
    manager_name: string;
    discord_nick: string;
    fpl_team_name: string | null;
    chosen_club: string;
    previous_season_or?: number | null;
    is_active?: boolean | null;
    created_at?: string | null;
  };

  let teams: TeamRow[] = [];
  if (teamsError) {
    if (/previous_season_or|is_active|created_at/i.test(teamsError.message)) {
      const retry = await supabase
        .from("teams")
        .select(
          "id, division_id, manager_name, discord_nick, fpl_team_name, chosen_club, created_at",
        )
        .in("division_id", divIds);
      if (retry.error) {
        const bare = await supabase
          .from("teams")
          .select(
            "id, division_id, manager_name, discord_nick, fpl_team_name, chosen_club",
          )
          .in("division_id", divIds);
        if (bare.error) {
          return {
            seasonId: season.id,
            seasonName: season.name,
            divisions: [],
            updatedAt: null,
            isPreview: true,
            error: bare.error.message,
          };
        }
        teams = (bare.data ?? []) as TeamRow[];
      } else {
        teams = (retry.data ?? []) as TeamRow[];
      }
    } else {
      return {
        seasonId: season.id,
        seasonName: season.name,
        divisions: [],
        updatedAt: null,
        isPreview: true,
        error: teamsError.message,
      };
    }
  } else {
    teams = (teamsRaw ?? []) as TeamRow[];
  }

  let updatedAt: string | null = null;
  for (const t of teams) {
    if (!t.created_at) continue;
    if (!updatedAt || t.created_at > updatedAt) updatedAt = t.created_at;
  }

  const byDiv = new Map<string, DivisionRosterRow[]>();
  for (const t of teams) {
    if (!t.division_id || t.is_active === false) continue;
    const list = byDiv.get(t.division_id) ?? [];
    list.push({
      lp: 0,
      teamId: t.id,
      fpl_team_name: t.fpl_team_name,
      manager_name: t.manager_name,
      discord_nick: t.discord_nick,
      chosen_club: t.chosen_club,
      previous_or:
        typeof t.previous_season_or === "number" ? t.previous_season_or : null,
    });
    byDiv.set(t.division_id, list);
  }

  const blocks: DivisionRosterBlock[] = allDivs.map((d) => {
    const roster = (byDiv.get(d.id) ?? [])
      .sort((a, b) => {
        const ao = a.previous_or;
        const bo = b.previous_or;
        if (ao == null && bo == null) {
          return a.manager_name.localeCompare(b.manager_name, "pl");
        }
        if (ao == null) return 1;
        if (bo == null) return -1;
        if (ao !== bo) return ao - bo;
        return a.manager_name.localeCompare(b.manager_name, "pl");
      })
      .map((row, i) => ({ ...row, lp: i + 1 }));
    return {
      divisionId: d.id,
      name: d.name,
      tier: d.tier,
      pyramidId: d.pyramid_id,
      pyramidName: pyramidNameById.get(d.pyramid_id) ?? "—",
      teams: roster,
    };
  });

  return {
    seasonId: season.id,
    seasonName: season.name,
    divisions: blocks,
    updatedAt: updatedAt ?? new Date().toISOString(),
    isPreview: true,
  };
}

/** @deprecated — użyj getPublicDivisionsPreview */
export async function getPublicSeasonDivisionStructure(
  seasonId: string,
): Promise<PublicSeasonDivisionStructurePayload> {
  return getPublicDivisionsPreview(seasonId);
}

/** Pełna tabela ligowa + fixtures dywizji + podgląd baraży GW19. */
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
      maxGameweek: SEASON_MAX_GAMEWEEK,
      playedGwCount: 0,
      averageFpl: null,
      leader: null,
      playoffs: EMPTY_PLAYOFFS,
    };
  }

  let division: {
    id: string;
    name: string;
    season_id: string;
    pyramid_id: string;
    tier: number;
    discord_webhook_url?: string | null;
  } | null = null;

  {
    const { data, error: divError } = await supabase
      .from("divisions")
      .select("id, name, season_id, pyramid_id, tier, discord_webhook_url")
      .eq("id", divisionId)
      .maybeSingle();

    if (divError && /discord_webhook_url/i.test(divError.message)) {
      const { data: data2, error: err2 } = await supabase
        .from("divisions")
        .select("id, name, season_id, pyramid_id, tier")
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

  // Niepełne dywizje (rekrutacja) niewidoczne w Strefie Gracza
  if (!(await isDivisionCompleteForPublic(supabase, divisionId))) {
    return {
      divisionId,
      tier: division.tier ?? 1,
      hasDiscordWebhook: false,
      teams: [],
      standings: [],
      fixtures: [],
      finishedGameweeks: [],
      maxGameweek: SEASON_MAX_GAMEWEEK,
      playedGwCount: 0,
      averageFpl: null,
      leader: null,
      playoffs: EMPTY_PLAYOFFS,
    };
  }

  const tier = division.tier ?? 1;
  const hasDiscordWebhook = Boolean((division.discord_webhook_url ?? "").trim());

  const { data: peersRaw, error: peersError } = await supabase
    .from("divisions")
    .select("id, name, tier, season_id, pyramid_id")
    .eq("season_id", division.season_id)
    .eq("pyramid_id", division.pyramid_id)
    .order("tier", { ascending: true });

  if (peersError) throw new Error(peersError.message);
  const peers = await filterCompleteDivisions(
    supabase,
    (peersRaw ?? []) as PublicDivision[],
  );

  const higherDivision = peers.find((d) => d.tier === tier - 1) ?? null;
  const lowerDivision = peers.find((d) => d.tier === tier + 1) ?? null;

  async function loadDivisionBundle(divId: string, divTier: number): Promise<{
    teams: PublicTeam[];
    fixtures: PublicFixture[];
    standings: PublicStandingRow[];
  }> {
    const { data: teamsRaw, error: teamsError } = await supabase
      .from("teams")
      .select("id, manager_name, discord_nick, fpl_id, fpl_team_name, chosen_club")
      .eq("division_id", divId)
      .order("manager_name", { ascending: true });

    if (teamsError) throw new Error(teamsError.message);

    const teams = (teamsRaw ?? []).map(mapTeam);
    const byId = new Map(teams.map((t) => [t.id, t]));

    const { data: fixturesRaw, error: fixError } = await supabase
      .from("fixtures")
      .select(
        "id, gameweek, home_team_id, away_team_id, home_fpl_points, away_fpl_points, home_h2h_points, away_h2h_points, home_median_bonus, away_median_bonus, is_finished, is_playoff",
      )
      .eq("division_id", divId)
      .eq("is_published", true)
      .order("gameweek", { ascending: true });

    if (fixError) throw new Error(fixError.message);

    const fixtures = (fixturesRaw ?? [])
      .filter((f) => !f.is_playoff)
      .map((f) => mapFixture(f, byId));
    const standings = buildPublicStandings(fixtures, teams, divTier);
    return { teams, fixtures, standings };
  }

  const current = await loadDivisionBundle(divisionId, tier);

  let higherStandings: PublicStandingRow[] | null = null;
  if (higherDivision) {
    const higher = await loadDivisionBundle(higherDivision.id, higherDivision.tier);
    higherStandings = higher.standings.length ? higher.standings : null;
  }

  let lowerStandings: PublicStandingRow[] | null = null;
  if (lowerDivision) {
    const lower = await loadDivisionBundle(lowerDivision.id, lowerDivision.tier);
    lowerStandings = lower.standings.length ? lower.standings : null;
  }

  // Opublikowane baraże cross-division (widoczne dla OBIEGU dywizji na granicy)
  const teamIds = current.teams.map((t) => t.id);
  const { data: playoffRaw, error: playoffError } = await supabase
    .from("fixtures")
    .select(
      "id, gameweek, division_id, home_team_id, away_team_id, home_fpl_points, away_fpl_points, home_h2h_points, away_h2h_points, home_median_bonus, away_median_bonus, is_finished, is_playoff, tiebreaker_home_goals, tiebreaker_away_goals, tiebreaker_home_goals_conceded, tiebreaker_away_goals_conceded, tiebreaker_home_bench, tiebreaker_away_bench, tiebreaker_winner_id, tiebreaker_reason, tiebreaker_method",
    )
    .eq("season_id", division.season_id)
    .eq("is_published", true)
    .eq("is_playoff", true)
    .in("gameweek", [PLAYOFF_GAMEWEEK, SPRING_PLAYOFF_GAMEWEEK]);

  if (playoffError) throw new Error(playoffError.message);

  const relevantPlayoffs = (playoffRaw ?? []).filter(
    (f) =>
      f.division_id === divisionId ||
      teamIds.includes(f.home_team_id) ||
      teamIds.includes(f.away_team_id),
  );

  const playoffTeamIds = [
    ...new Set(
      relevantPlayoffs.flatMap((f) => [f.home_team_id, f.away_team_id]),
    ),
  ];

  const playoffTeamById = new Map<string, PublicTeam & { division_id: string }>();
  if (playoffTeamIds.length) {
    const { data: poTeams, error: poTeamsError } = await supabase
      .from("teams")
      .select(
        "id, manager_name, discord_nick, fpl_id, fpl_team_name, chosen_club, division_id",
      )
      .in("id", playoffTeamIds);
    if (poTeamsError) throw new Error(poTeamsError.message);
    for (const t of poTeams ?? []) {
      playoffTeamById.set(t.id, { ...mapTeam(t), division_id: t.division_id });
    }
  }

  const divNameById = new Map(peers.map((d) => [d.id, d.name]));
  divNameById.set(division.id, division.name);

  const publishedPlayoffFixtures: PublicFixture[] = relevantPlayoffs.map((f) => {
    const homeMeta = playoffTeamById.get(f.home_team_id);
    const awayMeta = playoffTeamById.get(f.away_team_id);
    const byId = new Map<string, PublicTeam>();
    if (homeMeta) byId.set(homeMeta.id, homeMeta);
    if (awayMeta) byId.set(awayMeta.id, awayMeta);
    return mapFixture(
      {
        ...f,
        home_division_name: homeMeta
          ? (divNameById.get(homeMeta.division_id) ?? null)
          : null,
        away_division_name: awayMeta
          ? (divNameById.get(awayMeta.division_id) ?? null)
          : null,
      },
      byId,
    );
  });

  const publishedPlayoffMetas = publishedPlayoffFixtures.map(
    playoffMetaFromPublishedFixture,
  );

  const playoffGw =
    publishedPlayoffFixtures[0]?.gameweek ??
    (current.fixtures.some((f) => f.gameweek >= 20)
      ? SPRING_PLAYOFF_GAMEWEEK
      : PLAYOFF_GAMEWEEK);

  const playoffs: PlayoffPreviewPayload =
    publishedPlayoffMetas.length > 0
      ? {
          gameweek: playoffGw,
          matches: publishedPlayoffMetas,
          notices: [],
        }
      : buildPlayoffPreview({
          division: {
            id: division.id,
            name: division.name,
            tier,
            season_id: division.season_id,
            pyramid_id: division.pyramid_id,
          },
          peers,
          standings: current.standings,
          higherStandings,
          higherDivision,
          lowerStandings,
          lowerDivision,
          playoffGameweek: playoffGw,
        });

  const finishedGameweeks = finishedGameweeksFrom(current.fixtures);
  for (const f of publishedPlayoffFixtures) {
    if (f.is_finished && !finishedGameweeks.includes(f.gameweek)) {
      finishedGameweeks.push(f.gameweek);
    }
  }
  finishedGameweeks.sort((a, b) => a - b);

  const maxFromFixtures = Math.max(
    0,
    ...current.fixtures.map((f) => f.gameweek),
    ...publishedPlayoffFixtures.map((f) => f.gameweek),
  );
  const maxGameweek = Math.max(maxFromFixtures, SEASON_MAX_GAMEWEEK, playoffGw);

  // Terminarz: faza zasadnicza + opublikowane baraże (tabela ich nie liczy)
  const fixtures = [...current.fixtures, ...publishedPlayoffFixtures];

  return {
    divisionId,
    tier,
    hasDiscordWebhook,
    teams: current.teams,
    standings: current.standings,
    fixtures,
    finishedGameweeks,
    maxGameweek,
    playedGwCount: finishedGameweeksFrom(current.fixtures).length,
    averageFpl: averageFplFromFinished(current.fixtures),
    leader: current.standings[0] ?? null,
    playoffs,
  };
}

/** Mecze, próg mediany i ranking FPL dla jednej kolejki. */
export async function getGameweekDetails(
  divisionId: string,
  gameweek: number,
): Promise<GameweekDetailsPayload> {
  const bundle = await getDivisionStandings(divisionId);

  if (isPlayoffGameweek(gameweek)) {
    const playoffMatches = bundle.playoffs.matches.filter(
      (m) => m.fixture.gameweek === gameweek || isPlayoffGameweek(m.fixture.gameweek),
    );
    const matches: GwMatchCard[] = playoffMatches.map((m) => {
      const fixture = m.fixture;
      const homeWon = fixture.is_finished && fixture.home_h2h_points === 2;
      const awayWon = fixture.is_finished && fixture.away_h2h_points === 2;
      const draw =
        fixture.is_finished &&
        fixture.home_h2h_points === 1 &&
        !fixture.tiebreaker_winner_id;
      return { fixture, homeWon, awayWon, draw };
    });
    const isFinished =
      matches.length > 0 && matches.every((m) => m.fixture.is_finished);
    return {
      divisionId,
      gameweek,
      isFinished,
      medianThreshold: null,
      matches,
      fplRanking: [],
    };
  }

  const gwFixtures = bundle.fixtures.filter(
    (f) => f.gameweek === gameweek && !f.is_playoff,
  );
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

function tierHint(fromTier: number, toTier: number, kind: "up" | "down"): string {
  if (kind === "up") {
    return toTier < fromTier
      ? `Awans do Tier ${toTier}`
      : `Tier ${fromTier} → Tier ${toTier}`;
  }
  return toTier > fromTier
    ? `Spadek do Tier ${toTier}`
    : `Tier ${fromTier} → Tier ${toTier}`;
}

/**
 * Publiczne Podsumowanie Sezonu.
 * Stan A (is_completed=false): locked, bez kalkulacji.
 * Stan B: podium + awanse + spadki.
 */
export async function getPublicSeasonSummary(
  seasonId: string,
): Promise<PublicSeasonSummaryPayload> {
  const supabase = createClient();
  if (!seasonId) {
    return {
      seasonId: "",
      seasonName: "",
      is_completed: false,
      is_archived: false,
      locked: true,
      podium: [],
      promotions: [],
      relegations: [],
      error: "Brak sezonu.",
    };
  }

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id, name, is_completed, is_archived, status")
    .eq("id", seasonId)
    .maybeSingle();

  if (seasonError) {
    return {
      seasonId,
      seasonName: "",
      is_completed: false,
      is_archived: false,
      locked: true,
      podium: [],
      promotions: [],
      relegations: [],
      error: seasonError.message,
    };
  }
  if (!season) {
    return {
      seasonId,
      seasonName: "",
      is_completed: false,
      is_archived: false,
      locked: true,
      podium: [],
      promotions: [],
      relegations: [],
      error: "Nie znaleziono sezonu.",
    };
  }

  const isCompleted = Boolean(season.is_completed);
  const isArchived = Boolean(season.is_archived);

  if (!isCompleted) {
    return {
      seasonId: season.id,
      seasonName: season.name,
      is_completed: false,
      is_archived: isArchived,
      locked: true,
      podium: [],
      promotions: [],
      relegations: [],
    };
  }

  const calc = await runCalculateEndSeasonStatuses(supabase, seasonId);
  if (calc.error || !calc.byTeamId) {
    return {
      seasonId: season.id,
      seasonName: season.name,
      is_completed: true,
      is_archived: isArchived,
      locked: false,
      podium: [],
      promotions: [],
      relegations: [],
      error: calc.error ?? "Brak danych do podsumowania.",
    };
  }

  const teamIds = Object.keys(calc.byTeamId);
  const { data: teamsRaw, error: teamsError } = await supabase
    .from("teams")
    .select("id, manager_name, discord_nick, fpl_id, fpl_team_name, chosen_club")
    .in("id", teamIds);
  if (teamsError) {
    return {
      seasonId: season.id,
      seasonName: season.name,
      is_completed: true,
      is_archived: isArchived,
      locked: false,
      podium: [],
      promotions: [],
      relegations: [],
      error: teamsError.message,
    };
  }

  const teamById = new Map(
    (teamsRaw ?? []).map((t) => [t.id, mapTeam(t)]),
  );
  const divNames = calc.divisionNameById ?? {};

  const toRow = (
    teamId: string,
    assignment: (typeof calc.byTeamId)[string],
    kind: "up" | "down" | "podium",
  ): SeasonSummaryPlayerRow | null => {
    const team = teamById.get(teamId);
    if (!team) return null;
    const status = assignment.status as TeamSeasonStatus;
    return {
      teamId,
      status,
      statusLabel: teamSeasonStatusLabel(status),
      nextTier: assignment.next_tier,
      currentTier: assignment.current_tier,
      position: assignment.position,
      totalPoints: assignment.totalPoints ?? null,
      fplPoints: assignment.fplPoints ?? null,
      fromDivisionName: divNames[assignment.division_id] ?? `Tier ${assignment.current_tier}`,
      toDivisionHint:
        kind === "podium"
          ? `Tier ${assignment.current_tier}`
          : assignment.next_tier == null
            ? "Poczekalnia"
            : tierHint(
                assignment.current_tier,
                assignment.next_tier,
                kind === "up" ? "up" : "down",
              ),
      team,
    };
  };

  const podium: SeasonSummaryPlayerRow[] = [];
  const promotions: SeasonSummaryPlayerRow[] = [];
  const relegations: SeasonSummaryPlayerRow[] = [];

  for (const [teamId, a] of Object.entries(calc.byTeamId)) {
    if (a.status === "CHAMPION" || a.status === "RUNNER_UP" || a.status === "THIRD_PLACE") {
      const row = toRow(teamId, a, "podium");
      if (row) podium.push(row);
    }
    if (a.status === "PROMOTED_DIRECTLY" || a.status === "PROMOTED_PLAYOFF") {
      const row = toRow(teamId, a, "up");
      if (row) promotions.push(row);
    }
    if (a.status === "RELEGATED_DIRECTLY" || a.status === "RELEGATED_PLAYOFF") {
      const row = toRow(teamId, a, "down");
      if (row) relegations.push(row);
    }
  }

  podium.sort((a, b) => a.position - b.position);
  promotions.sort(
    (a, b) =>
      a.nextTier - b.nextTier ||
      a.currentTier - b.currentTier ||
      a.position - b.position,
  );
  relegations.sort(
    (a, b) =>
      a.currentTier - b.currentTier ||
      a.position - b.position,
  );

  return {
    seasonId: season.id,
    seasonName: season.name,
    is_completed: true,
    is_archived: isArchived,
    locked: false,
    podium,
    promotions,
    relegations,
    error: null,
  };
}
