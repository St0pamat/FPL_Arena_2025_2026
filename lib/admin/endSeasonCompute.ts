/**
 * Wspólna kalkulacja statusów EoS (admin + public).
 * Przyjmuje dowolny klient Supabase (auth lub anon).
 */

import {
  evaluateDivisionEndStatuses,
  type PlayoffResultInput,
  type TeamEndSeasonAssignment,
} from "@/lib/admin/endSeasonStatuses";
import { DIVISION_CAPACITY } from "@/lib/admin/divisionCapacity";
import { buildStandings } from "@/lib/admin/standings";
import { sortStandingsDesc } from "@/lib/admin/playoffPairs";
import {
  isPlayoffGameweek,
  PLAYOFF_GAMEWEEK,
  regularSeasonRangeForPlayoff,
  resolveSeasonPhase,
  SPRING_PLAYOFF_GAMEWEEK,
} from "@/lib/public/season";

export type CalculateEndSeasonStatusesResult = {
  error: string | null;
  seasonId?: string;
  seasonName?: string;
  is_completed?: boolean;
  is_archived?: boolean;
  playoffGameweek?: number;
  regularFrom?: number;
  regularTo?: number;
  byTeamId?: Record<string, TeamEndSeasonAssignment & { totalPoints?: number; fplPoints?: number }>;
  /** Nazwy dywizji per id */
  divisionNameById?: Record<string, string>;
  /** ACTUAL_MAX_TIER per pyramid_id (tylko aktywne 10/10). */
  activeMaxTierByPyramid?: Record<string, number>;
  warnings?: string[];
};

/** Luźny typ — faktyczny klient Supabase JS. */
export async function runCalculateEndSeasonStatuses(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  seasonId: string,
): Promise<CalculateEndSeasonStatusesResult> {
  if (!seasonId) return { error: "Brak seasonId." };

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id, name, status, is_completed, is_archived")
    .eq("id", seasonId)
    .maybeSingle();
  if (seasonError) return { error: seasonError.message };
  if (!season) return { error: "Nie znaleziono sezonu." };

  const phase = resolveSeasonPhase(String(season.name ?? ""));
  const playoffGw =
    phase === "SPRING" ? SPRING_PLAYOFF_GAMEWEEK : PLAYOFF_GAMEWEEK;
  const range = regularSeasonRangeForPlayoff(playoffGw);
  if (!range) return { error: "Nie udało się ustalić zakresu fazy zasadniczej." };

  const { data: divisions, error: divError } = await supabase
    .from("divisions")
    .select("id, name, tier, pyramid_id, season_id")
    .eq("season_id", seasonId)
    .order("tier", { ascending: true });
  if (divError) return { error: divError.message };
  if (!divisions?.length) {
    return { error: "Brak dywizji w sezonie." };
  }

  const divisionIds = divisions.map((d: { id: string }) => d.id);
  const divisionNameById: Record<string, string> = {};
  for (const d of divisions as Array<{ id: string; name: string }>) {
    divisionNameById[d.id] = d.name;
  }

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, division_id, is_active")
    .in("division_id", divisionIds);
  if (teamsError) return { error: teamsError.message };

  const teamIdsByDivision = new Map<string, string[]>();
  for (const t of (teams ?? []) as Array<{
    id: string;
    division_id: string | null;
    is_active: boolean | null;
  }>) {
    if (!t.division_id || t.is_active === false) continue;
    const list = teamIdsByDivision.get(t.division_id) ?? [];
    list.push(t.id);
    teamIdsByDivision.set(t.division_id, list);
  }

  const { data: fixtures, error: fixError } = await supabase
    .from("fixtures")
    .select(
      "id, division_id, gameweek, home_team_id, away_team_id, home_fpl_points, away_fpl_points, home_h2h_points, away_h2h_points, home_median_bonus, away_median_bonus, is_finished, is_published, is_playoff, tiebreaker_winner_id",
    )
    .eq("season_id", seasonId)
    .eq("is_published", true);
  if (fixError) return { error: fixError.message };

  const regularFixtures = (
    (fixtures ?? []) as Array<{
      id: string;
      division_id: string;
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
      is_playoff: boolean | null;
      tiebreaker_winner_id: string | null;
    }>
  ).filter(
    (f) =>
      !f.is_playoff &&
      !isPlayoffGameweek(f.gameweek) &&
      f.gameweek >= range.from &&
      f.gameweek <= range.to &&
      f.is_finished &&
      f.home_fpl_points != null &&
      f.away_fpl_points != null,
  );

  const playoffFixtures: PlayoffResultInput[] = (
    (fixtures ?? []) as Array<{
      id: string;
      gameweek: number;
      home_team_id: string;
      away_team_id: string;
      home_fpl_points: number | null;
      away_fpl_points: number | null;
      home_h2h_points: number | null;
      away_h2h_points: number | null;
      is_finished: boolean;
      is_playoff: boolean | null;
      tiebreaker_winner_id: string | null;
    }>
  )
    .filter(
      (f) =>
        f.is_playoff &&
        (f.gameweek === playoffGw || isPlayoffGameweek(f.gameweek)),
    )
    .map((f) => ({
      id: f.id,
      home_team_id: f.home_team_id,
      away_team_id: f.away_team_id,
      home_fpl_points: f.home_fpl_points,
      away_fpl_points: f.away_fpl_points,
      home_h2h_points: f.home_h2h_points,
      away_h2h_points: f.away_h2h_points,
      is_finished: Boolean(f.is_finished),
      tiebreaker_winner_id: f.tiebreaker_winner_id,
    }));

  const warnings: string[] = [];
  const byTeamId: Record<
    string,
    TeamEndSeasonAssignment & { totalPoints?: number; fplPoints?: number }
  > = {};
  const activeMaxTierByPyramid: Record<string, number> = {};

  type DivRow = {
    id: string;
    name: string;
    tier: number;
    pyramid_id: string;
  };
  const byPyramid = new Map<string, DivRow[]>();
  for (const d of divisions as DivRow[]) {
    const list = byPyramid.get(d.pyramid_id) ?? [];
    list.push(d);
    byPyramid.set(d.pyramid_id, list);
  }

  for (const [pyramidId, pyramidDivs] of byPyramid) {
    const sorted = [...pyramidDivs].sort((a, b) => a.tier - b.tier);

    const activeDivs = sorted.filter(
      (d) => (teamIdsByDivision.get(d.id)?.length ?? 0) === DIVISION_CAPACITY,
    );
    const incompleteDivs = sorted.filter((d) => {
      const n = teamIdsByDivision.get(d.id)?.length ?? 0;
      return n > 0 && n < DIVISION_CAPACITY;
    });

    if (!activeDivs.length) {
      warnings.push(
        `Piramida ${pyramidId}: brak aktywnych dywizji (10/${DIVISION_CAPACITY}) — pominięto rozliczenie.`,
      );
      // Niepełne i tak → poczekalnia
      for (const div of incompleteDivs) {
        const teamIds = teamIdsByDivision.get(div.id) ?? [];
        for (const teamId of teamIds) {
          byTeamId[teamId] = {
            status: "WAITING_ROOM",
            next_tier: null,
            current_tier: div.tier,
            division_id: div.id,
            position: 0,
          };
        }
        warnings.push(
          `${div.name}: niepełna (${teamIds.length}/${DIVISION_CAPACITY}) → poczekalnia.`,
        );
      }
      continue;
    }

    const actualMaxTier = activeDivs[activeDivs.length - 1]!.tier;
    activeMaxTierByPyramid[pyramidId] = actualMaxTier;

    for (const div of incompleteDivs) {
      const teamIds = teamIdsByDivision.get(div.id) ?? [];
      for (const teamId of teamIds) {
        byTeamId[teamId] = {
          status: "WAITING_ROOM",
          next_tier: null,
          current_tier: div.tier,
          division_id: div.id,
          position: 0,
        };
      }
      warnings.push(
        `${div.name}: niepełna (${teamIds.length}/${DIVISION_CAPACITY}) — pominięta w rozliczeniu → poczekalnia.`,
      );
    }

    for (const div of activeDivs) {
      const teamIds = teamIdsByDivision.get(div.id) ?? [];

      const divFixtures = regularFixtures
        .filter((f) => f.division_id === div.id)
        .map((f) => ({
          gameweek: f.gameweek,
          home_team_id: f.home_team_id,
          away_team_id: f.away_team_id,
          home_fpl_points: f.home_fpl_points,
          away_fpl_points: f.away_fpl_points,
          home_h2h_points: f.home_h2h_points ?? 0,
          away_h2h_points: f.away_h2h_points ?? 0,
          home_median_bonus: f.home_median_bonus ?? 0,
          away_median_bonus: f.away_median_bonus ?? 0,
          is_finished: true,
        }));

      if (!divFixtures.length) {
        warnings.push(
          `${div.name}: brak opublikowanych wyników GW${range.from}–${range.to}.`,
        );
        continue;
      }

      const standings = sortStandingsDesc(buildStandings(divFixtures, teamIds));
      const rankedTeamIds = standings.map((r) => r.teamId);
      const pointsByTeam = new Map(
        standings.map((r) => [r.teamId, { totalPoints: r.totalPoints, fplPoints: r.fplPoints }]),
      );

      const assignments = evaluateDivisionEndStatuses({
        division: {
          id: div.id,
          name: div.name,
          tier: div.tier,
          pyramid_id: div.pyramid_id,
          rankedTeamIds,
        },
        maxTier: actualMaxTier,
        playoffs: playoffFixtures,
      });

      for (const [teamId, assignment] of assignments) {
        const pts = pointsByTeam.get(teamId);
        byTeamId[teamId] = {
          ...assignment,
          totalPoints: pts?.totalPoints,
          fplPoints: pts?.fplPoints,
        };
        if (assignment.playoffPending) {
          warnings.push(
            `${div.name} · poz. ${assignment.position}: baraż nierozstrzygnięty (tymczasowo SAFE).`,
          );
        }
      }
    }
  }

  if (!Object.keys(byTeamId).length) {
    return {
      error:
        warnings.slice(0, 3).join(" · ") ||
        "Nie udało się wyliczyć statusów — brak danych.",
      warnings,
      is_completed: Boolean(season.is_completed),
      is_archived: Boolean(season.is_archived),
    };
  }

  return {
    error: null,
    seasonId: String(season.id),
    seasonName: String(season.name),
    is_completed: Boolean(season.is_completed),
    is_archived: Boolean(season.is_archived),
    playoffGameweek: playoffGw,
    regularFrom: range.from,
    regularTo: range.to,
    byTeamId,
    divisionNameById,
    activeMaxTierByPyramid,
    warnings: warnings.length ? warnings : undefined,
  };
}
