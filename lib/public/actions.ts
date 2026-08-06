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
  resolvePlayoffMatchWinnerId,
  teamSeasonStatusLabel,
  type TeamSeasonStatus,
} from "@/lib/admin/endSeasonStatuses";
import { divisionLabel, divisionMoveHint } from "@/lib/na-minusie/divisionLabels";
import type {
  SeasonSummaryDivisionBlock,
  SeasonSummaryPlayoffMatch,
} from "@/lib/public/types";

type PublicSupabase = ReturnType<typeof createClient>;

/**
 * Strefa Gracza:
 * - sezon aktywny: tylko dywizje z dokladnie DIVISION_CAPACITY aktywnymi druzynami
 * - sezon zakonczony/archiwalny: dywizje z opublikowanymi fixtures (sklad mogl
 *   juz zostac przeniesiony do nowego sezonu — teams.division_id != stara dywizja)
 */
async function filterCompleteDivisions(
  supabase: PublicSupabase,
  divisions: PublicDivision[],
  seasons: PublicSeason[],
): Promise<PublicDivision[]> {
  if (divisions.length === 0) return [];

  const archivedSeasonIds = new Set(
    seasons
      .filter((s) => s.is_completed || s.is_archived)
      .map((s) => s.id),
  );
  const liveDivs = divisions.filter((d) => !archivedSeasonIds.has(d.season_id));
  const archiveDivs = divisions.filter((d) => archivedSeasonIds.has(d.season_id));

  const result: PublicDivision[] = [];

  if (liveDivs.length) {
    const ids = liveDivs.map((d) => d.id);
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

    for (const d of liveDivs) {
      if ((counts.get(d.id) ?? 0) === DIVISION_CAPACITY) result.push(d);
    }
  }

  if (archiveDivs.length) {
    const ids = archiveDivs.map((d) => d.id);
    const { data: fixRows, error: fixError } = await supabase
      .from("fixtures")
      .select("division_id")
      .in("division_id", ids)
      .eq("is_published", true);

    if (fixError) {
      console.error("[filterCompleteDivisions] fixtures:", fixError);
      throw new Error(fixError.message);
    }

    const withFixtures = new Set(
      (fixRows ?? []).map((f) => f.division_id as string),
    );
    for (const d of archiveDivs) {
      if (withFixtures.has(d.id)) result.push(d);
    }
  }

  return result;
}

async function divisionHasPublishedFixtures(
  supabase: PublicSupabase,
  divisionId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("fixtures")
    .select("id")
    .eq("division_id", divisionId)
    .eq("is_published", true)
    .limit(1);
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
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

/** Widocznosc dywizji: pelny sklad LUB archiwum z fixtures. */
async function isDivisionVisibleForPublic(
  supabase: PublicSupabase,
  divisionId: string,
  seasonFlags: { is_completed: boolean; is_archived: boolean },
): Promise<boolean> {
  if (seasonFlags.is_completed || seasonFlags.is_archived) {
    return divisionHasPublishedFixtures(supabase, divisionId);
  }
  return isDivisionCompleteForPublic(supabase, divisionId);
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
  previous_season_or?: number | null;
}): PublicTeam {
  return {
    id: row.id,
    manager_name: row.manager_name,
    discord_nick: row.discord_nick,
    fpl_id: row.fpl_id,
    fpl_team_name: row.fpl_team_name,
    chosen_club: row.chosen_club,
    previous_season_or: row.previous_season_or ?? null,
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
    is_published?: boolean | null;
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
    is_published: f.is_published !== false,
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
  const divs = await filterCompleteDivisions(supabase, allDivs, published);
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
 * Publiczny podglÄ…d dywizji (menu â€žDywizjeâ€ť).
 * Pokazuje aktualny sezon (najnowszy niearchiwalny) â€” takĹĽe DRAFT i niepeĹ‚ne ligi.
 * Sort druĹĽyn: previous_season_or ASC, null na koĹ„cu.
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
      error: "Brak sezonu do wyĹ›wietlenia.",
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
      pyramidName: pyramidNameById.get(d.pyramid_id) ?? "â€”",
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

/** @deprecated â€” uĹĽyj getPublicDivisionsPreview */
export async function getPublicSeasonDivisionStructure(
  seasonId: string,
): Promise<PublicSeasonDivisionStructurePayload> {
  return getPublicDivisionsPreview(seasonId);
}

/** PeĹ‚na tabela ligowa + fixtures dywizji + podglÄ…d baraĹĽy GW19. */
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
      publishedFixtures: [],
      finishedGameweeks: [],
      availableGameweeks: [],
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
    .select("id, name, status, is_completed, is_archived")
    .eq("id", division.season_id)
    .maybeSingle();

  if (seasonError) throw new Error(seasonError.message);
  if (!season || season.status !== "PUBLISHED") {
    throw new Error("Dywizja należy do nieopublikowanego sezonu.");
  }

  const seasonFlags = {
    is_completed: Boolean(season.is_completed),
    is_archived: Boolean(season.is_archived),
  };
  const seasonMeta: PublicSeason = {
    id: String(season.id),
    name: String(season.name ?? ""),
    status: "PUBLISHED",
    is_completed: seasonFlags.is_completed,
    is_archived: seasonFlags.is_archived,
    created_at: "",
  };

  // Niepełne dywizje (rekrutacja) niewidoczne; archiwum OK jeśli ma fixtures
  if (!(await isDivisionVisibleForPublic(supabase, divisionId, seasonFlags))) {
    return {
      divisionId,
      tier: division.tier ?? 1,
      hasDiscordWebhook: false,
      teams: [],
      standings: [],
      fixtures: [],
      publishedFixtures: [],
      finishedGameweeks: [],
      availableGameweeks: [],
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
    [seasonMeta],
  );

  const higherDivision = peers.find((d) => d.tier === tier - 1) ?? null;
  const lowerDivision = peers.find((d) => d.tier === tier + 1) ?? null;

  async function loadDivisionBundle(divId: string, divTier: number): Promise<{
    teams: PublicTeam[];
    /** Pełny terminarz (draft + published) */
    fixtures: PublicFixture[];
    /** Tylko opublikowane — tabela / wyniki / statystyki */
    publishedFixtures: PublicFixture[];
    standings: PublicStandingRow[];
  }> {
    const { data: fixturesRaw, error: fixError } = await supabase
      .from("fixtures")
      .select(
        "id, gameweek, home_team_id, away_team_id, home_fpl_points, away_fpl_points, home_h2h_points, away_h2h_points, home_median_bonus, away_median_bonus, is_finished, is_published, is_playoff",
      )
      .eq("division_id", divId)
      .order("gameweek", { ascending: true });

    if (fixError) throw new Error(fixError.message);

    const regularRaw = (fixturesRaw ?? []).filter((f) => !f.is_playoff);

    const { data: teamsRaw, error: teamsError } = await supabase
      .from("teams")
      .select("id, manager_name, discord_nick, fpl_id, fpl_team_name, chosen_club")
      .eq("division_id", divId)
      .order("manager_name", { ascending: true });

    if (teamsError) throw new Error(teamsError.message);

    let teams = (teamsRaw ?? []).map(mapTeam);
    const byId = new Map(teams.map((t) => [t.id, t]));

    // Po przejściu sezonu drużyny mają nowy division_id — odtwórz skład z fixtures
    const fixtureTeamIds = [
      ...new Set(
        regularRaw.flatMap((f) => [f.home_team_id as string, f.away_team_id as string]),
      ),
    ];
    const missingIds = fixtureTeamIds.filter((id) => !byId.has(id));
    if (missingIds.length) {
      const { data: histTeams, error: histErr } = await supabase
        .from("teams")
        .select("id, manager_name, discord_nick, fpl_id, fpl_team_name, chosen_club")
        .in("id", missingIds);
      if (histErr) throw new Error(histErr.message);
      for (const t of histTeams ?? []) {
        const mapped = mapTeam(t);
        byId.set(mapped.id, mapped);
        teams.push(mapped);
      }
      teams = [...byId.values()].sort((a, b) =>
        a.manager_name.localeCompare(b.manager_name, "pl"),
      );
    }

    const fixtures = regularRaw.map((f) => mapFixture(f, byId));
    const publishedFixtures = fixtures.filter((f) => f.is_published !== false);
    const standings = buildPublicStandings(publishedFixtures, teams, divTier);
    return { teams, fixtures, publishedFixtures, standings };
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

  // Baraże: pobierz wszystkie (Terminarz), a w Wynikach tylko opublikowane
  const teamIds = current.teams.map((t) => t.id);
  const { data: playoffRaw, error: playoffError } = await supabase
    .from("fixtures")
    .select(
      "id, gameweek, division_id, home_team_id, away_team_id, home_fpl_points, away_fpl_points, home_h2h_points, away_h2h_points, home_median_bonus, away_median_bonus, is_finished, is_published, is_playoff, tiebreaker_home_goals, tiebreaker_away_goals, tiebreaker_home_goals_conceded, tiebreaker_away_goals_conceded, tiebreaker_home_bench, tiebreaker_away_bench, tiebreaker_winner_id, tiebreaker_reason, tiebreaker_method",
    )
    .eq("season_id", division.season_id)
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

  const allPlayoffFixtures: PublicFixture[] = relevantPlayoffs.map((f) => {
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
  const publishedPlayoffFixtures = allPlayoffFixtures.filter(
    (f) => f.is_published !== false,
  );

  const publishedPlayoffMetas = publishedPlayoffFixtures.map(
    playoffMetaFromPublishedFixture,
  );

  const playoffGw =
    allPlayoffFixtures[0]?.gameweek ??
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

  // Wyniki: tylko opublikowane kolejki
  const finishedGameweeks = finishedGameweeksFrom(current.publishedFixtures);
  for (const f of publishedPlayoffFixtures) {
    if (f.is_finished && !finishedGameweeks.includes(f.gameweek)) {
      finishedGameweeks.push(f.gameweek);
    }
  }
  finishedGameweeks.sort((a, b) => a - b);

  // Y = wszystkie wygenerowane GW (Berger) + slot barażowy (nawet gdy jeszcze nie wygenerowano par)
  const availableGameweeks = [
    ...new Set([
      ...current.fixtures.map((f) => f.gameweek),
      ...allPlayoffFixtures.map((f) => f.gameweek),
      playoffGw,
    ]),
  ].sort((a, b) => a - b);

  const maxFromFixtures =
    availableGameweeks.length > 0
      ? availableGameweeks[availableGameweeks.length - 1]!
      : 0;
  const maxGameweek = maxFromFixtures || playoffGw;

  // X = najwyższa opublikowana/ukończona kolejka
  const playedGwCount =
    finishedGameweeks.length > 0
      ? finishedGameweeks[finishedGameweeks.length - 1]!
      : 0;

  // Terminarz: pełna rozpiska; publishedFixtures: tylko publiczne wyniki
  const fixtures = [...current.fixtures, ...allPlayoffFixtures];
  const publishedFixtures = [
    ...current.publishedFixtures,
    ...publishedPlayoffFixtures,
  ];

  return {
    divisionId,
    tier,
    hasDiscordWebhook,
    teams: current.teams,
    standings: current.standings,
    fixtures,
    publishedFixtures,
    finishedGameweeks,
    availableGameweeks,
    maxGameweek,
    playedGwCount,
    averageFpl: averageFplFromFinished(current.publishedFixtures),
    leader: current.standings[0] ?? null,
    playoffs,
  };
}


/** Mecze, prĂłg mediany i ranking FPL dla jednej kolejki. */
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

  const gwRaw = bundle.fixtures.filter(
    (f) => f.gameweek === gameweek && !f.is_playoff,
  );
  // Publicznie: nieopublikowane = puste wyniki (nawet jeśli w DB jest brudnopis)
  const gwFixtures = gwRaw.map((f) => {
    if (f.is_published !== false) return f;
    return {
      ...f,
      home_fpl_points: null,
      away_fpl_points: null,
      home_h2h_points: 0,
      away_h2h_points: 0,
      home_median_bonus: 0,
      away_median_bonus: 0,
      is_finished: false,
    };
  });
  const isPublished =
    gwRaw.length > 0 && gwRaw.every((f) => f.is_published !== false);
  const isFinished =
    isPublished &&
    gwFixtures.length > 0 &&
    gwFixtures.every((f) => f.is_finished);
  const threshold = isFinished ? gameweekMedianThreshold(gwFixtures) : null;

  const matches: GwMatchCard[] = gwFixtures.map((fixture) => {
    const homeWon = fixture.is_finished && fixture.home_h2h_points === 2;
    const awayWon = fixture.is_finished && fixture.away_h2h_points === 2;
    const draw = fixture.is_finished && fixture.home_h2h_points === 1;
    return { fixture, homeWon, awayWon, draw };
  });

  type ScoreEntry = { team: PublicTeam; fpl: number; median: boolean };
  const scores: ScoreEntry[] = [];
  if (isFinished) {
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

/** CaĹ‚y terminarz jednej druĹĽyny. */
export async function getTeamSchedule(teamId: string): Promise<TeamSchedulePayload> {
  const supabase = createClient();
  if (!teamId) throw new Error("Brak ID druĹĽyny.");

  const { data: teamRaw, error: teamError } = await supabase
    .from("teams")
    .select("id, manager_name, discord_nick, fpl_id, fpl_team_name, chosen_club, division_id")
    .eq("id", teamId)
    .maybeSingle();

  if (teamError) throw new Error(teamError.message);
  if (!teamRaw) throw new Error("Nie znaleziono druĹĽyny.");

  const team = mapTeam(teamRaw);
  const bundle = await getDivisionStandings(teamRaw.division_id);
  const fixtures = bundle.fixtures.filter(
    (f) => f.home_team_id === teamId || f.away_team_id === teamId,
  );

  return { team, fixtures };
}


/**
 * Publiczne Podsumowanie Sezonu.
 * Stan A (is_completed=false): locked, bez kalkulacji.
 * Stan B: podium + mistrzowie dywizji + ruchy ligowe + baraże.
 */
export async function getPublicSeasonSummary(
  seasonId: string,
): Promise<PublicSeasonSummaryPayload> {
  const empty = (
    partial: Partial<PublicSeasonSummaryPayload> &
      Pick<PublicSeasonSummaryPayload, "seasonId" | "seasonName" | "locked">,
  ): PublicSeasonSummaryPayload => ({
    is_completed: false,
    is_archived: false,
    podium: [],
    divisionChampions: [],
    divisionBlocks: [],
    promotions: [],
    relegations: [],
    playoffGameweek: null,
    error: null,
    ...partial,
  });

  const supabase = createClient();
  if (!seasonId) {
    return empty({
      seasonId: "",
      seasonName: "",
      locked: true,
      error: "Brak sezonu.",
    });
  }

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id, name, is_completed, is_archived, status")
    .eq("id", seasonId)
    .maybeSingle();

  if (seasonError) {
    return empty({
      seasonId,
      seasonName: "",
      locked: true,
      error: seasonError.message,
    });
  }
  if (!season) {
    return empty({
      seasonId,
      seasonName: "",
      locked: true,
      error: "Nie znaleziono sezonu.",
    });
  }

  const isCompleted = Boolean(season.is_completed);
  const isArchived = Boolean(season.is_archived);

  if (!isCompleted) {
    return empty({
      seasonId: season.id,
      seasonName: season.name,
      is_completed: false,
      is_archived: isArchived,
      locked: true,
    });
  }

  const calc = await runCalculateEndSeasonStatuses(supabase, seasonId);
  if (calc.error || !calc.byTeamId) {
    return empty({
      seasonId: season.id,
      seasonName: season.name,
      is_completed: true,
      is_archived: isArchived,
      locked: false,
      error: calc.error ?? "Brak danych do podsumowania.",
    });
  }

  const teamIds = Object.keys(calc.byTeamId);
  const { data: teamsRaw, error: teamsError } = await supabase
    .from("teams")
    .select("id, manager_name, discord_nick, fpl_id, fpl_team_name, chosen_club")
    .in("id", teamIds);
  if (teamsError) {
    return empty({
      seasonId: season.id,
      seasonName: season.name,
      is_completed: true,
      is_archived: isArchived,
      locked: false,
      error: teamsError.message,
    });
  }

  const teamById = new Map((teamsRaw ?? []).map((t) => [t.id, mapTeam(t)]));
  const divNames = calc.divisionNameById ?? {};

  const officialName = (divisionId: string, tier: number) =>
    divNames[divisionId]?.trim() || divisionLabel(tier);

  const toRow = (
    teamId: string,
    assignment: (typeof calc.byTeamId)[string],
    kind: "up" | "down" | "podium" | "champion",
  ): SeasonSummaryPlayerRow | null => {
    const team = teamById.get(teamId);
    if (!team) return null;
    const status = assignment.status as TeamSeasonStatus;
    const fromName = officialName(assignment.division_id, assignment.current_tier);
    let toHint = fromName;
    if (kind === "up" || kind === "down") {
      toHint =
        assignment.next_tier == null
          ? "Poczekalnia"
          : divisionMoveHint(
              assignment.current_tier,
              assignment.next_tier,
              kind === "up" ? "up" : "down",
            );
    } else if (kind === "champion") {
      toHint = `Mistrz ${fromName}`;
    }
    return {
      teamId,
      status,
      statusLabel: teamSeasonStatusLabel(status),
      nextTier: assignment.next_tier,
      currentTier: assignment.current_tier,
      position: assignment.position,
      totalPoints: assignment.totalPoints ?? null,
      fplPoints: assignment.fplPoints ?? null,
      fromDivisionName: fromName,
      toDivisionHint: toHint,
      team,
      divisionId: assignment.division_id,
    };
  };

  const podium: SeasonSummaryPlayerRow[] = [];
  const promotions: SeasonSummaryPlayerRow[] = [];
  const relegations: SeasonSummaryPlayerRow[] = [];
  const allRows = new Map<string, SeasonSummaryPlayerRow>();

  for (const [teamId, a] of Object.entries(calc.byTeamId)) {
    const base = toRow(teamId, a, "podium");
    if (base) allRows.set(teamId, base);

    if (a.status === "CHAMPION" || a.status === "RUNNER_UP" || a.status === "THIRD_PLACE") {
      const row = toRow(teamId, a, "podium");
      if (row) podium.push(row);
    }
    if (a.status === "PROMOTED_DIRECTLY" || a.status === "PROMOTED_PLAYOFF") {
      const row = toRow(teamId, a, "up");
      if (row) {
        promotions.push(row);
        allRows.set(teamId, row);
      }
    }
    if (a.status === "RELEGATED_DIRECTLY" || a.status === "RELEGATED_PLAYOFF") {
      const row = toRow(teamId, a, "down");
      if (row) {
        relegations.push(row);
        allRows.set(teamId, row);
      }
    }
  }

  podium.sort((a, b) => a.position - b.position);
  promotions.sort(
    (a, b) =>
      (a.nextTier ?? 99) - (b.nextTier ?? 99) ||
      a.currentTier - b.currentTier ||
      a.position - b.position,
  );
  relegations.sort(
    (a, b) => a.currentTier - b.currentTier || a.position - b.position,
  );

  const divisionChampions: SeasonSummaryPlayerRow[] = [];
  const byDivision = new Map<
    string,
    { tier: number; name: string; rows: SeasonSummaryPlayerRow[] }
  >();

  for (const [teamId, a] of Object.entries(calc.byTeamId)) {
    const row =
      allRows.get(teamId) ??
      toRow(teamId, a, a.position === 1 ? "champion" : "podium");
    if (!row) continue;
    const name = officialName(a.division_id, a.current_tier);
    const block = byDivision.get(a.division_id) ?? {
      tier: a.current_tier,
      name,
      rows: [],
    };
    block.rows.push(
      a.position === 1
        ? {
            ...row,
            statusLabel: `Mistrz ${name}`,
            toDivisionHint: `Mistrz ${name}`,
          }
        : row,
    );
    byDivision.set(a.division_id, block);
  }

  for (const block of byDivision.values()) {
    const champ = block.rows.find((r) => r.position === 1);
    if (champ) divisionChampions.push(champ);
  }
  divisionChampions.sort((a, b) => a.currentTier - b.currentTier);

  const playoffGw = calc.playoffGameweek ?? PLAYOFF_GAMEWEEK;
  const { data: playoffRaw } = await supabase
    .from("fixtures")
    .select(
      "id, gameweek, home_team_id, away_team_id, home_fpl_points, away_fpl_points, home_h2h_points, away_h2h_points, is_finished, tiebreaker_winner_id",
    )
    .eq("season_id", seasonId)
    .eq("is_published", true)
    .eq("is_playoff", true)
    .in("gameweek", [PLAYOFF_GAMEWEEK, SPRING_PLAYOFF_GAMEWEEK]);

  const playoffByHigherDiv = new Map<string, SeasonSummaryPlayoffMatch>();

  for (const f of playoffRaw ?? []) {
    const homeA = calc.byTeamId[f.home_team_id];
    const awayA = calc.byTeamId[f.away_team_id];
    if (!homeA || !awayA) continue;

    const homeHigher = homeA.current_tier < awayA.current_tier;
    const higherId = homeHigher ? f.home_team_id : f.away_team_id;
    const lowerId = homeHigher ? f.away_team_id : f.home_team_id;
    const higherA = homeHigher ? homeA : awayA;
    const lowerA = homeHigher ? awayA : homeA;
    const higherFpl = homeHigher ? f.home_fpl_points : f.away_fpl_points;
    const lowerFpl = homeHigher ? f.away_fpl_points : f.home_fpl_points;

    const higherRow =
      allRows.get(higherId) ?? toRow(higherId, higherA, "podium");
    const lowerRow = allRows.get(lowerId) ?? toRow(lowerId, lowerA, "podium");
    if (!higherRow || !lowerRow) continue;

    const winnerId = resolvePlayoffMatchWinnerId({
      id: f.id,
      home_team_id: f.home_team_id,
      away_team_id: f.away_team_id,
      home_fpl_points: f.home_fpl_points,
      away_fpl_points: f.away_fpl_points,
      home_h2h_points: f.home_h2h_points,
      away_h2h_points: f.away_h2h_points,
      is_finished: Boolean(f.is_finished),
      tiebreaker_winner_id: f.tiebreaker_winner_id,
    });

    const higherName = officialName(higherA.division_id, higherA.current_tier);
    const lowerName = officialName(lowerA.division_id, lowerA.current_tier);

    let higherOutcomeLabel = "⏳ Baraż nierozstrzygnięty";
    let lowerOutcomeLabel = "⏳ Baraż nierozstrzygnięty";
    if (winnerId === higherId) {
      higherOutcomeLabel = `🛡️ Utrzymanie w ${higherName} po barażu`;
      lowerOutcomeLabel = `⚪ Pozostaje w ${lowerName}`;
    } else if (winnerId === lowerId) {
      higherOutcomeLabel = `🔴 Spadek do ${lowerName} po barażu`;
      lowerOutcomeLabel = `🟢 Awans do ${higherName} po barażu`;
    }

    playoffByHigherDiv.set(higherA.division_id, {
      fixtureId: f.id,
      gameweek: f.gameweek,
      higherDivisionName: higherName,
      lowerDivisionName: lowerName,
      higherTier: higherA.current_tier,
      lowerTier: lowerA.current_tier,
      higher: higherRow,
      lower: lowerRow,
      higherFpl,
      lowerFpl,
      winnerTeamId: winnerId,
      higherOutcomeLabel,
      lowerOutcomeLabel,
    });
  }

  const divisionBlocks: SeasonSummaryDivisionBlock[] = [...byDivision.entries()]
    .map(([divisionId, block]) => {
      const rows = block.rows;
      const champion = rows.find((r) => r.position === 1) ?? null;
      const isTop = block.tier === 1;
      const directPromotions = isTop
        ? []
        : rows
            .filter((r) => r.status === "PROMOTED_DIRECTLY")
            .sort((a, b) => a.position - b.position);
      const directRelegations = rows
        .filter((r) => r.status === "RELEGATED_DIRECTLY")
        .sort((a, b) => a.position - b.position);

      return {
        divisionId,
        divisionName: block.name,
        tier: block.tier,
        champion,
        directPromotions,
        directRelegations,
        playoff: playoffByHigherDiv.get(divisionId) ?? null,
      };
    })
    .sort((a, b) => a.tier - b.tier);

  return {
    seasonId: season.id,
    seasonName: season.name,
    is_completed: true,
    is_archived: isArchived,
    locked: false,
    podium,
    divisionChampions,
    divisionBlocks,
    promotions,
    relegations,
    playoffGameweek: playoffGw,
    error: null,
  };
}
