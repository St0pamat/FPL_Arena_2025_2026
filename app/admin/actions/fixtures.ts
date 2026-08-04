"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateBergerFixtures, shuffleInPlace } from "@/lib/admin/berger";
import {
  computeMedianBonusSet,
  groupScoresByGameweek,
  parseGwBatchText,
  resolveH2h,
} from "@/lib/admin/medianEngine";
import {
  consecutiveTierBoundaries,
  PLAYOFF_HIGHER_POS,
  PLAYOFF_HIGHER_SEED_INDEX,
  PLAYOFF_LOWER_POS,
  PLAYOFF_LOWER_SEED_INDEX,
  sortStandingsDesc,
  teamIdAtZeroBasedIndex,
} from "@/lib/admin/playoffPairs";
import { buildStandings } from "@/lib/admin/standings";
import { DIVISION_CAPACITY } from "@/lib/admin/divisionCapacity";
import type { ActionState, Team } from "@/lib/admin/types";
import {
  gameweekLabel,
  isPlayoffGameweek,
  PLAYOFF_GAMEWEEK,
  regularSeasonRangeForPlayoff,
  SPRING_PLAYOFF_GAMEWEEK,
} from "@/lib/public/season";

export interface FixtureRow {
  id: string;
  season_id: string;
  division_id: string;
  gameweek: number;
  home_team_id: string;
  away_team_id: string;
  is_finished: boolean;
  home_fpl_points?: number | null;
  away_fpl_points?: number | null;
  home_h2h_points?: number;
  away_h2h_points?: number;
  home_median_bonus?: number;
  away_median_bonus?: number;
  home_team?: Pick<
    Team,
    "id" | "manager_name" | "discord_nick" | "chosen_club" | "fpl_team_name"
  > | null;
  away_team?: Pick<
    Team,
    "id" | "manager_name" | "discord_nick" | "chosen_club" | "fpl_team_name"
  > | null;
}

export interface BatchCalculateResult extends ActionState {
  fixturesUpdated?: number;
  gameweeks?: number[];
  warnings?: string[];
}

async function requireAuth() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji. Zaloguj się ponownie.");
  return supabase;
}

export async function getTeamsByDivision(divisionId: string): Promise<Team[]> {
  const supabase = await requireAuth();
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("division_id", divisionId)
    .order("manager_name", { ascending: true });

  if (error) {
    console.error("[getTeamsByDivision]", error);
    throw new Error(error.message);
  }

  return (data ?? []) as Team[];
}

export async function getFixturesCount(divisionId: string): Promise<number> {
  const supabase = await requireAuth();
  const { count, error } = await supabase
    .from("fixtures")
    .select("id", { count: "exact", head: true })
    .eq("division_id", divisionId);

  if (error) {
    console.error("[getFixturesCount]", error);
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function getFixturesByDivision(divisionId: string): Promise<FixtureRow[]> {
  const supabase = await requireAuth();

  const { data: fixtures, error } = await supabase
    .from("fixtures")
    .select("id, season_id, division_id, gameweek, home_team_id, away_team_id, is_finished")
    .eq("division_id", divisionId)
    .order("gameweek", { ascending: true });

  if (error) {
    console.error("[getFixturesByDivision]", error);
    throw new Error(error.message);
  }

  if (!fixtures?.length) return [];

  const teamIds = [
    ...new Set(fixtures.flatMap((f) => [f.home_team_id, f.away_team_id])),
  ];

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, manager_name, discord_nick, chosen_club, fpl_team_name")
    .in("id", teamIds);

  if (teamsError) {
    console.error("[getFixturesByDivision] teams:", teamsError);
    throw new Error(teamsError.message);
  }

  const byId = new Map((teams ?? []).map((t) => [t.id, t]));

  return fixtures.map((f) => ({
    ...f,
    home_team: byId.get(f.home_team_id) ?? null,
    away_team: byId.get(f.away_team_id) ?? null,
  })) as FixtureRow[];
}

export async function deleteDivisionFixtures(divisionId: string): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    if (!divisionId) return { error: "Brak ID dywizji." };

    const { error } = await supabase.from("fixtures").delete().eq("division_id", divisionId);
    if (error) {
      console.error("[deleteDivisionFixtures]", error);
      return { error: error.message };
    }

    revalidatePath("/admin/fixture-draw");
    revalidatePath("/admin", "layout");
    return { error: null, success: "Terminarz dywizji został usunięty." };
  } catch (e) {
    console.error("[deleteDivisionFixtures]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}

/**
 * Losuje pozycje startowe (shuffle) i generuje terminarz Bergera GW1..2*(N-1).
 * force=true kasuje istniejące mecze dywizji przed zapisem.
 */
export async function generateDivisionFixtures(
  seasonId: string,
  divisionId: string,
  force = false,
): Promise<
  ActionState & {
    fixturesCreated?: number;
    drawOrder?: Team[];
    fixtures?: FixtureRow[];
  }
> {
  try {
    const supabase = await requireAuth();

    if (!seasonId || !divisionId) {
      return { error: "Wybierz sezon i dywizję." };
    }

    const { data: division, error: divError } = await supabase
      .from("divisions")
      .select("id, season_id, name")
      .eq("id", divisionId)
      .maybeSingle();

    if (divError) {
      console.error("[generateDivisionFixtures] division:", divError);
      return { error: divError.message };
    }

    if (!division) return { error: "Nie znaleziono dywizji." };
    if (division.season_id !== seasonId) {
      return { error: "Dywizja nie należy do wybranego sezonu." };
    }

    const { count: existingCount, error: countError } = await supabase
      .from("fixtures")
      .select("id", { count: "exact", head: true })
      .eq("division_id", divisionId);

    if (countError) {
      console.error("[generateDivisionFixtures] count:", countError);
      return { error: countError.message };
    }

    if ((existingCount ?? 0) > 0 && !force) {
      return {
        error: `Terminarz już istnieje (${existingCount} meczów). Potwierdź ponowne losowanie.`,
      };
    }

    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("*")
      .eq("division_id", divisionId);

    if (teamsError) {
      console.error("[generateDivisionFixtures] teams:", teamsError);
      return { error: teamsError.message };
    }

    if (!teams?.length || teams.length < 2) {
      return { error: "Za mało drużyn w dywizji (min. 2)." };
    }

    const activeCount = (teams as Team[]).filter((t) => t.is_active !== false).length;
    if (activeCount !== DIVISION_CAPACITY) {
      return {
        error: `Terminarz Bergera wymaga równe ${DIVISION_CAPACITY} zespołów (obecnie ${activeCount}/${DIVISION_CAPACITY}).`,
      };
    }

    const shuffledTeams = shuffleInPlace([...(teams as Team[])].filter((t) => t.is_active !== false));
    const shuffledIds = shuffledTeams.map((t) => t.id);
    const matches = generateBergerFixtures(shuffledIds);

    if (force && (existingCount ?? 0) > 0) {
      const { error: delError } = await supabase
        .from("fixtures")
        .delete()
        .eq("division_id", divisionId);

      if (delError) {
        console.error("[generateDivisionFixtures] delete:", delError);
        return { error: `Nie udało się usunąć starego terminarza: ${delError.message}` };
      }
    }

    const payload = matches.map((m) => ({
      season_id: seasonId,
      division_id: divisionId,
      gameweek: m.gameweek,
      home_team_id: m.home_team_id,
      away_team_id: m.away_team_id,
      home_fpl_points: null,
      away_fpl_points: null,
      home_h2h_points: 0,
      away_h2h_points: 0,
      home_median_bonus: 0,
      away_median_bonus: 0,
      is_finished: false,
      is_published: false,
    }));

    const { error: insertError } = await supabase.from("fixtures").insert(payload);

    if (insertError) {
      console.error("[generateDivisionFixtures] insert:", insertError);
      return { error: insertError.message };
    }

    const fixtures = await getFixturesByDivision(divisionId);

    revalidatePath("/admin/fixture-draw");
    revalidatePath("/admin", "layout");

    const maxGw = Math.max(...matches.map((m) => m.gameweek));
    return {
      error: null,
      success: `Wylosowano terminarz: ${matches.length} meczów w ${maxGw} kolejkach (${shuffledTeams.length} drużyn).`,
      fixturesCreated: matches.length,
      drawOrder: shuffledTeams,
      fixtures,
    };
  } catch (e) {
    console.error("[generateDivisionFixtures]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd losowania." };
  }
}

type FixtureDbRow = {
  id: string;
  season_id: string;
  division_id: string;
  gameweek: number;
  home_team_id: string;
  away_team_id: string;
  is_finished: boolean;
  is_published?: boolean;
  home_fpl_points: number | null;
  away_fpl_points: number | null;
  home_h2h_points: number;
  away_h2h_points: number;
  home_median_bonus: number;
  away_median_bonus: number;
};

/**
 * Batch Processor - rozlicza wiele GW naraz (Mediana 2+1).
 * Wejście: linie `GW, FPL_ID, Punkty`.
 * Zakres: sezon + piramida (dywizje tej piramidy w sezonie).
 */
export async function calculateGameweeksBatch(
  seasonId: string,
  pyramidId: string,
  rawData: string,
): Promise<BatchCalculateResult> {
  try {
    const supabase = await requireAuth();

    if (!seasonId) return { error: "Wybierz sezon." };
    if (!pyramidId) return { error: "Wybierz piramidę." };
    if (!rawData?.trim()) return { error: "Wklej dane (GW, FPL_ID, Punkty)." };

    const { lines, errors: parseErrors } = parseGwBatchText(rawData);
    if (parseErrors.length) {
      return {
        error: `Błędy parsowania (${parseErrors.length}):\n${parseErrors.slice(0, 12).join("\n")}${
          parseErrors.length > 12 ? `\n... +${parseErrors.length - 12} więcej` : ""
        }`,
      };
    }
    if (lines.length === 0) {
      return { error: "Brak poprawnych wierszy do rozliczenia." };
    }

    const byGw = groupScoresByGameweek(lines);
    const gameweeks = [...byGw.keys()].sort((a, b) => a - b);

    // Dywizje sezon x piramida
    const { data: divisions, error: divError } = await supabase
      .from("divisions")
      .select("id")
      .eq("season_id", seasonId)
      .eq("pyramid_id", pyramidId);

    if (divError) {
      console.error("[calculateGameweeksBatch] divisions:", divError);
      return { error: divError.message };
    }

    const divisionIds = (divisions ?? []).map((d) => d.id);
    if (divisionIds.length === 0) {
      return { error: "Brak dywizji dla wybranego sezonu i piramidy." };
    }

    // Drużyny w tych dywizjach
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, division_id, fpl_id, manager_name")
      .in("division_id", divisionIds);

    if (teamsError) {
      console.error("[calculateGameweeksBatch] teams:", teamsError);
      return { error: teamsError.message };
    }

    const fplToTeam = new Map<
      string,
      { id: string; division_id: string; manager_name: string }
    >();
    const teamIdToFpl = new Map<string, string>();

    for (const t of teams ?? []) {
      const fpl = (t.fpl_id ?? "").trim();
      if (!fpl) continue;
      fplToTeam.set(fpl, {
        id: t.id,
        division_id: t.division_id,
        manager_name: t.manager_name,
      });
      teamIdToFpl.set(t.id, fpl);
    }

    const unknownInPaste: string[] = [];
    for (const line of lines) {
      if (!fplToTeam.has(line.fpl_id)) {
        unknownInPaste.push(`FPL ID ${line.fpl_id} (wiersz ${line.lineNumber})`);
      }
    }

    if (unknownInPaste.length) {
      const unique = [...new Set(unknownInPaste)];
      return {
        error: `Nie znaleziono graczy w sezonie/piramidzie dla:\n${unique.slice(0, 15).join("\n")}${
          unique.length > 15 ? `\n... +${unique.length - 15} więcej` : ""
        }`,
      };
    }

    // Nierozliczone mecze sezonu w tych dywizjach, ograniczone do GW z paste
    const { data: fixtures, error: fixError } = await supabase
      .from("fixtures")
      .select(
        "id, season_id, division_id, gameweek, home_team_id, away_team_id, is_finished, is_published, home_fpl_points, away_fpl_points, home_h2h_points, away_h2h_points, home_median_bonus, away_median_bonus",
      )
      .eq("season_id", seasonId)
      .eq("is_finished", false)
      .in("division_id", divisionIds)
      .in("gameweek", gameweeks);

    if (fixError) {
      console.error("[calculateGameweeksBatch] fixtures:", fixError);
      return { error: fixError.message };
    }

    const openFixtures = (fixtures ?? []) as FixtureDbRow[];
    if (openFixtures.length === 0) {
      return {
        error:
          "Brak nierozliczonych meczów dla podanych kolejek w tej piramidzie (ju? rozliczone lub brak terminarza).",
      };
    }

    const warnings: string[] = [];
    const updated: FixtureDbRow[] = [];
    const processedGws: number[] = [];

    for (const gw of gameweeks) {
      const scoreByFpl = byGw.get(gw)!;
      const gwFixtures = openFixtures.filter((f) => f.gameweek === gw);

      if (gwFixtures.length === 0) {
        warnings.push(`GW${gw}: brak otwartych meczów — pominięto.`);
        continue;
      }

      // teamId -> FPL points (tylko grający w tej kolejce)
      const pointsByTeam = new Map<string, number>();
      const missingScores: string[] = [];

      for (const f of gwFixtures) {
        for (const teamId of [f.home_team_id, f.away_team_id]) {
          if (pointsByTeam.has(teamId)) continue;
          const fplId = teamIdToFpl.get(teamId);
          const meta = fplId ? fplToTeam.get(fplId) : undefined;
          if (!fplId || !meta) {
            missingScores.push(`GW${gw}: dru?yna ${teamId} bez FPL ID w bazie`);
            continue;
          }
          const pts = scoreByFpl.get(fplId);
          if (pts === undefined) {
            missingScores.push(
              `GW${gw}: brak punktów dla ${meta.manager_name} (FPL ID ${fplId})`,
            );
            continue;
          }
          pointsByTeam.set(teamId, pts);
        }
      }

      if (missingScores.length) {
        return {
          error: `Niekompletne dane dla GW${gw}:\n${missingScores.slice(0, 12).join("\n")}${
            missingScores.length > 12 ? `\n... +${missingScores.length - 12} więcej` : ""
          }`,
        };
      }

      // Mediana per dywizja
      const byDivision = new Map<string, Map<string, number>>();
      for (const f of gwFixtures) {
        let bucket = byDivision.get(f.division_id);
        if (!bucket) {
          bucket = new Map();
          byDivision.set(f.division_id, bucket);
        }
        bucket.set(f.home_team_id, pointsByTeam.get(f.home_team_id)!);
        bucket.set(f.away_team_id, pointsByTeam.get(f.away_team_id)!);
      }

      const bonusByTeam = new Map<string, 0 | 1>();
      for (const [, divPoints] of byDivision) {
        const winners = computeMedianBonusSet(divPoints, 5);
        for (const teamId of divPoints.keys()) {
          bonusByTeam.set(teamId, winners.has(teamId) ? 1 : 0);
        }
      }

      for (const f of gwFixtures) {
        const homeFpl = pointsByTeam.get(f.home_team_id)!;
        const awayFpl = pointsByTeam.get(f.away_team_id)!;
        const h2h = resolveH2h(homeFpl, awayFpl);
        const homeBonus = bonusByTeam.get(f.home_team_id) ?? 0;
        const awayBonus = bonusByTeam.get(f.away_team_id) ?? 0;

        updated.push({
          ...f,
          home_fpl_points: homeFpl,
          away_fpl_points: awayFpl,
          home_h2h_points: h2h.home,
          away_h2h_points: h2h.away,
          home_median_bonus: homeBonus,
          away_median_bonus: awayBonus,
          is_finished: true,
          is_published: false,
        });
      }

      processedGws.push(gw);
    }

    if (updated.length === 0) {
      return {
        error: "Żadna kolejka nie została rozliczona.",
        warnings,
      };
    }

    // Masowy upsert
    const { error: upsertError } = await supabase.from("fixtures").upsert(updated, {
      onConflict: "id",
    });

    if (upsertError) {
      console.error("[calculateGameweeksBatch] upsert:", upsertError);
      return { error: `Zapis nieudany: ${upsertError.message}` };
    }

    revalidatePath("/admin/gw-results");
    revalidatePath("/admin/fixture-draw");
    revalidatePath("/admin", "layout");

    const gwLabel = processedGws.join(", ");
    return {
      error: null,
      success: `Zakończono sukcesem! Zaktualizowano ${updated.length} meczów w kolejkach: ${gwLabel}.`,
      fixturesUpdated: updated.length,
      gameweeks: processedGws,
      warnings: warnings.length ? warnings : undefined,
    };
  } catch (e) {
    console.error("[calculateGameweeksBatch]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd batch processor." };
  }
}

export interface DivisionResultsTeam {
  id: string;
  manager_name: string;
  discord_nick: string;
  chosen_club: string;
  fpl_id: string | null;
}

export interface DivisionResultsFixture {
  id: string;
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
  home_team: DivisionResultsTeam | null;
  away_team: DivisionResultsTeam | null;
}

export interface DivisionResultsBundle {
  divisionId: string;
  teams: DivisionResultsTeam[];
  fixtures: DivisionResultsFixture[];
  finishedCount: number;
}

/** Wyniki + składy dywizji (do podglądu tabel i meczów). */
export async function getDivisionResultsBundle(
  divisionId: string,
): Promise<DivisionResultsBundle> {
  const supabase = await requireAuth();
  if (!divisionId) {
    return { divisionId: "", teams: [], fixtures: [], finishedCount: 0 };
  }

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, manager_name, discord_nick, chosen_club, fpl_id")
    .eq("division_id", divisionId)
    .order("manager_name", { ascending: true });

  if (teamsError) {
    console.error("[getDivisionResultsBundle] teams:", teamsError);
    throw new Error(teamsError.message);
  }

  const { data: fixtures, error: fixError } = await supabase
    .from("fixtures")
    .select(
      "id, gameweek, home_team_id, away_team_id, home_fpl_points, away_fpl_points, home_h2h_points, away_h2h_points, home_median_bonus, away_median_bonus, is_finished",
    )
    .eq("division_id", divisionId)
    .order("gameweek", { ascending: true });

  if (fixError) {
    console.error("[getDivisionResultsBundle] fixtures:", fixError);
    throw new Error(fixError.message);
  }

  const byId = new Map((teams ?? []).map((t) => [t.id, t as DivisionResultsTeam]));
  const mapped: DivisionResultsFixture[] = (fixtures ?? []).map((f) => ({
    ...f,
    home_h2h_points: f.home_h2h_points ?? 0,
    away_h2h_points: f.away_h2h_points ?? 0,
    home_median_bonus: f.home_median_bonus ?? 0,
    away_median_bonus: f.away_median_bonus ?? 0,
    home_team: byId.get(f.home_team_id) ?? null,
    away_team: byId.get(f.away_team_id) ?? null,
  }));

  return {
    divisionId,
    teams: (teams ?? []) as DivisionResultsTeam[],
    fixtures: mapped,
    finishedCount: mapped.filter((f) => f.is_finished).length,
  };
}

// ---------------------------------------------------------------------------
// Generator baraży GW19 / GW38 — Cross-Division (8. wyższej vs 3. niższej)
// ---------------------------------------------------------------------------

function revalidatePlayoffs() {
  revalidatePath("/admin/workspace");
  revalidatePath("/admin/simulator");
  revalidatePath("/admin/gw-results");
  revalidatePath("/na-minusie/hub");
  revalidatePath("/admin", "layout");
}

export type GlobalPlayoffPairSummary = {
  higherDivisionName: string;
  lowerDivisionName: string;
  homeSeed: number;
  awaySeed: number;
};

export type GenerateGlobalPlayoffsResult = ActionState & {
  created?: number;
  deleted?: number;
  pairs?: GlobalPlayoffPairSummary[];
};

type DivRow = {
  id: string;
  name: string;
  tier: number;
  pyramid_id: string;
  season_id: string;
};

async function standingsTeamIdsForDivision(
  supabase: Awaited<ReturnType<typeof requireAuth>>,
  seasonId: string,
  divisionId: string,
  gwFrom: number,
  gwTo: number,
): Promise<{ rankedIds: string[]; error: string | null }> {
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, is_active")
    .eq("division_id", divisionId);
  if (teamsError) return { rankedIds: [], error: teamsError.message };

  const teamIds = (teams ?? [])
    .filter((t) => t.is_active !== false)
    .map((t) => t.id);

  if (teamIds.length < 2) {
    return {
      rankedIds: [],
      error: `Za mało aktywnych drużyn (${teamIds.length}).`,
    };
  }

  const { data: fixtures, error: fixError } = await supabase
    .from("fixtures")
    .select(
      "gameweek, home_team_id, away_team_id, home_fpl_points, away_fpl_points, home_h2h_points, away_h2h_points, home_median_bonus, away_median_bonus, is_finished, is_published, is_playoff",
    )
    .eq("season_id", seasonId)
    .eq("division_id", divisionId)
    .gte("gameweek", gwFrom)
    .lte("gameweek", gwTo)
    .eq("is_published", true);
  if (fixError) return { rankedIds: [], error: fixError.message };

  const finishedPublished = (fixtures ?? []).filter(
    (f) =>
      !f.is_playoff &&
      f.is_finished &&
      f.home_fpl_points != null &&
      f.away_fpl_points != null,
  );

  if (!finishedPublished.length) {
    return {
      rankedIds: [],
      error: `Brak opublikowanych wyników GW${gwFrom}–${gwTo}.`,
    };
  }

  const standings = buildStandings(
    finishedPublished.map((f) => ({
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
    })),
    teamIds,
  );

  const ranked = sortStandingsDesc(standings);
  return { rankedIds: ranked.map((r) => r.teamId), error: null };
}

/**
 * Globalne baraże: 8. wyższej (gospodarz, indeks [7]) vs 3. niższej (gość, indeks [2]).
 * Na starcie czyści wszystkie mecze GW19 i GW38 w sezonie.
 */
export async function generateGlobalPlayoffs(
  seasonId: string,
  gameweek: number,
): Promise<GenerateGlobalPlayoffsResult> {
  try {
    const supabase = await requireAuth();
    if (!seasonId) return { error: "Brak sezonu." };
    if (!isPlayoffGameweek(gameweek)) {
      return {
        error: `GW${gameweek} nie jest kolejką barażową (dozwolone: 19 lub 38).`,
      };
    }

    const range = regularSeasonRangeForPlayoff(gameweek);
    if (!range) return { error: "Nieprawidłowa kolejka barażowa." };

    const { data: deletedRows, error: delError } = await supabase
      .from("fixtures")
      .delete()
      .eq("season_id", seasonId)
      .in("gameweek", [PLAYOFF_GAMEWEEK, SPRING_PLAYOFF_GAMEWEEK])
      .select("id");
    if (delError) return { error: delError.message };
    const deleted = deletedRows?.length ?? 0;

    const { data: divisions, error: divError } = await supabase
      .from("divisions")
      .select("id, name, tier, pyramid_id, season_id")
      .eq("season_id", seasonId)
      .order("tier", { ascending: true });
    if (divError) return { error: divError.message };

    const divs = (divisions ?? []) as DivRow[];
    if (divs.length < 2) {
      return {
        error: "Potrzebujesz co najmniej 2 dywizji, żeby utworzyć baraż między ligami.",
        deleted,
      };
    }

    // Tylko aktywne dywizje (dokładnie 10/10) — niepełne nie tworzą granic barażowych.
    const divIds = divs.map((d) => d.id);
    const { data: teamsForCount, error: tcErr } = await supabase
      .from("teams")
      .select("division_id, is_active")
      .in("division_id", divIds);
    if (tcErr) return { error: tcErr.message, deleted };

    const countByDiv = new Map<string, number>();
    for (const t of teamsForCount ?? []) {
      if (!t.division_id || t.is_active === false) continue;
      countByDiv.set(t.division_id, (countByDiv.get(t.division_id) ?? 0) + 1);
    }

    const activeDivs = divs.filter(
      (d) => (countByDiv.get(d.id) ?? 0) === DIVISION_CAPACITY,
    );
    const errors: string[] = [];
    const skippedIncomplete = divs.filter((d) => {
      const n = countByDiv.get(d.id) ?? 0;
      return n > 0 && n < DIVISION_CAPACITY;
    });
    for (const d of skippedIncomplete) {
      errors.push(
        `${d.name}: niepełna (${countByDiv.get(d.id) ?? 0}/${DIVISION_CAPACITY}) — pominięta w barażach.`,
      );
    }

    if (activeDivs.length < 2) {
      return {
        error:
          "Potrzebujesz co najmniej 2 aktywnych dywizji (10/10), żeby utworzyć baraż. Niepełne ligi są pomijane.",
        deleted,
      };
    }

    const boundaries = consecutiveTierBoundaries(activeDivs);
    if (!boundaries.length) {
      return {
        error: "Brak sąsiadujących aktywnych dywizji (granic tierów) w sezonie.",
        deleted,
      };
    }

    const pairPayloads: Array<{
      season_id: string;
      division_id: string;
      gameweek: number;
      home_team_id: string;
      away_team_id: string;
      home_fpl_points: null;
      away_fpl_points: null;
      home_h2h_points: number;
      away_h2h_points: number;
      home_median_bonus: number;
      away_median_bonus: number;
      is_finished: boolean;
      is_published: boolean;
      is_playoff: boolean;
    }> = [];
    const summaries: GlobalPlayoffPairSummary[] = [];
    // errors already seeded for incomplete divisions

    for (const { higher, lower } of boundaries) {
      const [hi, lo] = await Promise.all([
        standingsTeamIdsForDivision(
          supabase,
          seasonId,
          higher.id,
          range.from,
          range.to,
        ),
        standingsTeamIdsForDivision(
          supabase,
          seasonId,
          lower.id,
          range.from,
          range.to,
        ),
      ]);

      if (hi.error) {
        const msg = `${higher.name}: ${hi.error}`;
        console.warn("[generateGlobalPlayoffs]", msg);
        errors.push(msg);
        continue;
      }
      if (lo.error) {
        const msg = `${lower.name}: ${lo.error}`;
        console.warn("[generateGlobalPlayoffs]", msg);
        errors.push(msg);
        continue;
      }

      if (hi.rankedIds.length <= PLAYOFF_HIGHER_SEED_INDEX) {
        const msg = `${higher.name}: za mało drużyn (${hi.rankedIds.length}) — potrzeba min. ${PLAYOFF_HIGHER_POS} (indeks [${PLAYOFF_HIGHER_SEED_INDEX}]). Pomijam granicę z ${lower.name}.`;
        console.warn("[generateGlobalPlayoffs]", msg);
        errors.push(msg);
        continue;
      }
      if (lo.rankedIds.length <= PLAYOFF_LOWER_SEED_INDEX) {
        const msg = `${lower.name}: za mało drużyn (${lo.rankedIds.length}) — potrzeba min. ${PLAYOFF_LOWER_POS} (indeks [${PLAYOFF_LOWER_SEED_INDEX}]). Pomijam granicę z ${higher.name}.`;
        console.warn("[generateGlobalPlayoffs]", msg);
        errors.push(msg);
        continue;
      }

      const homeTeamId = teamIdAtZeroBasedIndex(
        hi.rankedIds,
        PLAYOFF_HIGHER_SEED_INDEX,
      );
      const awayTeamId = teamIdAtZeroBasedIndex(
        lo.rankedIds,
        PLAYOFF_LOWER_SEED_INDEX,
      );

      if (!homeTeamId || !awayTeamId) {
        const msg = `Nie udało się pobrać seedów ${PLAYOFF_HIGHER_POS}. ${higher.name} / ${PLAYOFF_LOWER_POS}. ${lower.name}.`;
        console.warn("[generateGlobalPlayoffs]", msg);
        errors.push(msg);
        continue;
      }

      pairPayloads.push({
        season_id: seasonId,
        division_id: higher.id,
        gameweek,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_fpl_points: null,
        away_fpl_points: null,
        home_h2h_points: 0,
        away_h2h_points: 0,
        home_median_bonus: 0,
        away_median_bonus: 0,
        is_finished: false,
        is_published: false,
        is_playoff: true,
      });
      summaries.push({
        higherDivisionName: higher.name,
        lowerDivisionName: lower.name,
        homeSeed: PLAYOFF_HIGHER_POS,
        awaySeed: PLAYOFF_LOWER_POS,
      });
    }

    if (!pairPayloads.length) {
      return {
        error:
          errors.slice(0, 4).join(" · ") ||
          "Nie udało się zbudować żadnej pary barażowej.",
        deleted,
      };
    }

    const { error: insertError } = await supabase
      .from("fixtures")
      .insert(pairPayloads);
    if (insertError) return { error: insertError.message, deleted };

    revalidatePlayoffs();
    const pairLines = summaries
      .map(
        (p) =>
          `${p.homeSeed}. ${p.higherDivisionName} vs ${p.awaySeed}. ${p.lowerDivisionName}`,
      )
      .join(" · ");

    return {
      error: null,
      success: `Baraże cross-division · ${gameweekLabel(gameweek)}: ${pairPayloads.length} mecz(e)${deleted ? ` (usunięto ${deleted} starych GW19/38)` : ""}. ${pairLines}${errors.length ? ` · Ostrzeżenia: ${errors.slice(0, 2).join("; ")}` : ""}`,
      created: pairPayloads.length,
      deleted,
      pairs: summaries,
    };
  } catch (e) {
    console.error("[generateGlobalPlayoffs]", e);
    return {
      error: e instanceof Error ? e.message : "Błąd generowania baraży.",
    };
  }
}

/** @deprecated Użyj generateGlobalPlayoffs — zostawione jako alias. */
export async function generateAllPlayoffFixtures(
  seasonId: string,
  gameweek: number,
): Promise<GenerateGlobalPlayoffsResult> {
  return generateGlobalPlayoffs(seasonId, gameweek);
}

/** @deprecated Baraże są globalne (cross-division), nie per dywizja. */
export async function generatePlayoffFixtures(
  seasonId: string,
  _divisionId: string,
  gameweek: number,
): Promise<GenerateGlobalPlayoffsResult> {
  return generateGlobalPlayoffs(seasonId, gameweek);
}

