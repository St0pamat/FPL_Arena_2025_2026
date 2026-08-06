"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidFplPoints } from "@/lib/admin/constants";
import {
  computeMedianBonusSet,
  fplNamesMatch,
  normalizeMatchKey,
  parseFplClassicLeaguePaste,
  parseGwBatchText,
  parseMultiGameweekPaste,
  resolveH2h,
} from "@/lib/admin/medianEngine";
import { resolvePlayoffWinner } from "@/lib/admin/playoffTiebreak";
import { DIVISION_CAPACITY } from "@/lib/admin/divisionCapacity";
import type { ActionState, Division, TiebreakerMethod } from "@/lib/admin/types";
import { isPlayoffGameweek } from "@/lib/public/season";

async function assertDivisionRosterFull(
  supabase: Awaited<ReturnType<typeof requireAuth>>,
  divisionId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("teams")
    .select("id, is_active")
    .eq("division_id", divisionId);
  if (error) return error.message;
  const n = (data ?? []).filter((t) => t.is_active !== false).length;
  if (n !== DIVISION_CAPACITY) {
    return `Dywizja Niepełna (${n}/${DIVISION_CAPACITY}). Rekrutacja w toku — nie można publikować wyników.`;
  }
  return null;
}

type RecalcFixtureUpdate = ReturnType<typeof applyRecalcToFixtures>[number];

function fixtureScoreUpdatePayload(row: RecalcFixtureUpdate) {
  const base = {
    home_fpl_points: row.home_fpl_points,
    away_fpl_points: row.away_fpl_points,
    home_h2h_points: row.home_h2h_points,
    away_h2h_points: row.away_h2h_points,
    home_median_bonus: row.home_median_bonus,
    away_median_bonus: row.away_median_bonus,
    is_finished: row.is_finished,
    is_published: false,
  };

  // Remis FPL barażu: nie nadpisuj pól TB (admin uzupełnia je osobno)
  if (row.is_playoff && !row.is_finished) {
    return base;
  }

  return {
    ...base,
    tiebreaker_home_goals: row.tiebreaker_home_goals,
    tiebreaker_away_goals: row.tiebreaker_away_goals,
    tiebreaker_home_goals_conceded: row.tiebreaker_home_goals_conceded,
    tiebreaker_away_goals_conceded: row.tiebreaker_away_goals_conceded,
    tiebreaker_home_bench: row.tiebreaker_home_bench,
    tiebreaker_away_bench: row.tiebreaker_away_bench,
    tiebreaker_winner_id: row.tiebreaker_winner_id,
    tiebreaker_method: row.tiebreaker_method,
    tiebreaker_reason: row.tiebreaker_reason,
  };
}

async function requireAuth() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji. Zaloguj się ponownie.");
  return supabase;
}

function revalidateWorkspace() {
  revalidatePath("/admin/workspace");
  revalidatePath("/admin/gw-results");
  revalidatePath("/admin/data-ingestion");
  revalidatePath("/strefa-gracza");
  revalidatePath("/na-minusie/hub");
  revalidatePath("/admin", "layout");
}

export interface WorkspaceTeam {
  id: string;
  manager_name: string;
  discord_nick: string;
  fpl_id: string | null;
  fpl_team_name: string | null;
  chosen_club: string;
  division_id: string;
}

export interface WorkspaceFixtureRow {
  id: string;
  gameweek: number;
  division_id: string;
  division_name: string;
  division_tier: number;
  home_team_id: string;
  away_team_id: string;
  home_fpl_points: number | null;
  away_fpl_points: number | null;
  home_h2h_points: number;
  away_h2h_points: number;
  home_median_bonus: number;
  away_median_bonus: number;
  is_finished: boolean;
  is_published: boolean;
  is_playoff: boolean;
  tiebreaker_home_goals: number | null;
  tiebreaker_away_goals: number | null;
  tiebreaker_home_goals_conceded: number | null;
  tiebreaker_away_goals_conceded: number | null;
  tiebreaker_home_bench: number | null;
  tiebreaker_away_bench: number | null;
  tiebreaker_winner_id: string | null;
  tiebreaker_method: TiebreakerMethod | null;
  home_team: WorkspaceTeam | null;
  away_team: WorkspaceTeam | null;
}

const FIXTURE_SELECT =
  "id, gameweek, division_id, home_team_id, away_team_id, home_fpl_points, away_fpl_points, home_h2h_points, away_h2h_points, home_median_bonus, away_median_bonus, is_finished, is_published, is_playoff, tiebreaker_home_goals, tiebreaker_away_goals, tiebreaker_home_goals_conceded, tiebreaker_away_goals_conceded, tiebreaker_home_bench, tiebreaker_away_bench, tiebreaker_winner_id, tiebreaker_method, tiebreaker_reason";

function mapWorkspaceFixture(
  f: Record<string, unknown>,
  meta: { name: string; tier: number },
  byId: Map<string, WorkspaceTeam>,
): WorkspaceFixtureRow {
  return {
    id: String(f.id),
    gameweek: Number(f.gameweek),
    division_id: String(f.division_id),
    division_name: meta.name,
    division_tier: meta.tier,
    home_team_id: String(f.home_team_id),
    away_team_id: String(f.away_team_id),
    home_fpl_points: (f.home_fpl_points as number | null) ?? null,
    away_fpl_points: (f.away_fpl_points as number | null) ?? null,
    home_h2h_points: (f.home_h2h_points as number) ?? 0,
    away_h2h_points: (f.away_h2h_points as number) ?? 0,
    home_median_bonus: (f.home_median_bonus as number) ?? 0,
    away_median_bonus: (f.away_median_bonus as number) ?? 0,
    is_finished: Boolean(f.is_finished),
    is_published: Boolean(f.is_published),
    is_playoff: Boolean(f.is_playoff),
    tiebreaker_home_goals: (f.tiebreaker_home_goals as number | null) ?? null,
    tiebreaker_away_goals: (f.tiebreaker_away_goals as number | null) ?? null,
    tiebreaker_home_goals_conceded:
      (f.tiebreaker_home_goals_conceded as number | null) ?? null,
    tiebreaker_away_goals_conceded:
      (f.tiebreaker_away_goals_conceded as number | null) ?? null,
    tiebreaker_home_bench: (f.tiebreaker_home_bench as number | null) ?? null,
    tiebreaker_away_bench: (f.tiebreaker_away_bench as number | null) ?? null,
    tiebreaker_winner_id: (f.tiebreaker_winner_id as string | null) ?? null,
    tiebreaker_method: (f.tiebreaker_method as TiebreakerMethod | null) ?? null,
    home_team: byId.get(String(f.home_team_id)) ?? null,
    away_team: byId.get(String(f.away_team_id)) ?? null,
  };
}

export interface WorkspaceGameweekPayload {
  seasonId: string;
  pyramidId: string;
  gameweek: number;
  fixtures: WorkspaceFixtureRow[];
  publishedCount: number;
  draftCount: number;
  finishedCount: number;
  isFullyPublished: boolean;
  hasAnyPublished: boolean;
}

async function divisionIdsForScope(
  supabase: Awaited<ReturnType<typeof requireAuth>>,
  seasonId: string,
  pyramidId: string,
): Promise<{ ids: string[]; meta: Map<string, { name: string; tier: number }> }> {
  const { data, error } = await supabase
    .from("divisions")
    .select("id, name, tier")
    .eq("season_id", seasonId)
    .eq("pyramid_id", pyramidId)
    .order("tier", { ascending: true });

  if (error) throw new Error(error.message);
  const meta = new Map((data ?? []).map((d) => [d.id, { name: d.name, tier: d.tier }]));
  return { ids: (data ?? []).map((d) => d.id), meta };
}

function applyRecalcToFixtures(
  fixtures: Array<{
    id: string;
    division_id: string;
    home_team_id: string;
    away_team_id: string;
    home_fpl_points: number | null;
    away_fpl_points: number | null;
    is_playoff?: boolean | null;
    gameweek?: number | null;
  }>,
  pointsByTeam: Map<string, number>,
): Array<{
  id: string;
  home_fpl_points: number;
  away_fpl_points: number;
  home_h2h_points: number;
  away_h2h_points: number;
  home_median_bonus: number;
  away_median_bonus: number;
  is_finished: boolean;
  is_published: boolean;
  is_playoff: boolean;
  tiebreaker_home_goals: number | null;
  tiebreaker_away_goals: number | null;
  tiebreaker_home_goals_conceded: number | null;
  tiebreaker_away_goals_conceded: number | null;
  tiebreaker_home_bench: number | null;
  tiebreaker_away_bench: number | null;
  tiebreaker_winner_id: string | null;
  tiebreaker_method: string | null;
  tiebreaker_reason: string | null;
}> {
  const byDivision = new Map<string, Map<string, number>>();
  for (const f of fixtures) {
    const playoff =
      Boolean(f.is_playoff) ||
      (f.gameweek != null && isPlayoffGameweek(f.gameweek));
    if (playoff) continue; // baraże nie wchodzą do mediany ligowej
    let bucket = byDivision.get(f.division_id);
    if (!bucket) {
      bucket = new Map();
      byDivision.set(f.division_id, bucket);
    }
    const hp = pointsByTeam.get(f.home_team_id);
    const ap = pointsByTeam.get(f.away_team_id);
    if (hp != null) bucket.set(f.home_team_id, hp);
    if (ap != null) bucket.set(f.away_team_id, ap);
  }

  const bonusByTeam = new Map<string, 0 | 1>();
  for (const [, divPoints] of byDivision) {
    const winners = computeMedianBonusSet(divPoints, 5);
    for (const teamId of divPoints.keys()) {
      bonusByTeam.set(teamId, winners.has(teamId) ? 1 : 0);
    }
  }

  const out: ReturnType<typeof applyRecalcToFixtures> = [];
  for (const f of fixtures) {
    const homeFpl = pointsByTeam.get(f.home_team_id);
    const awayFpl = pointsByTeam.get(f.away_team_id);
    if (homeFpl == null || awayFpl == null) continue;
    const playoff =
      Boolean(f.is_playoff) ||
      (f.gameweek != null && isPlayoffGameweek(f.gameweek));

    if (playoff) {
      const resolved = resolvePlayoffWinner({
        homeTeamId: f.home_team_id,
        awayTeamId: f.away_team_id,
        homeFpl,
        awayFpl,
        homeGoals: null,
        awayGoals: null,
        homeGoalsConceded: null,
        awayGoalsConceded: null,
        homeBench: null,
        awayBench: null,
        manualWinnerId: null,
      });
      if (resolved.status === "decided") {
        out.push({
          id: f.id,
          home_fpl_points: homeFpl,
          away_fpl_points: awayFpl,
          home_h2h_points: resolved.home_h2h_points,
          away_h2h_points: resolved.away_h2h_points,
          home_median_bonus: 0,
          away_median_bonus: 0,
          is_finished: true,
          is_published: false,
          is_playoff: true,
          tiebreaker_home_goals: null,
          tiebreaker_away_goals: null,
          tiebreaker_home_goals_conceded: null,
          tiebreaker_away_goals_conceded: null,
          tiebreaker_home_bench: null,
          tiebreaker_away_bench: null,
          tiebreaker_winner_id: resolved.winnerId,
          tiebreaker_method: resolved.method,
          tiebreaker_reason: resolved.reason,
        });
      } else {
        out.push({
          id: f.id,
          home_fpl_points: homeFpl,
          away_fpl_points: awayFpl,
          home_h2h_points: 0,
          away_h2h_points: 0,
          home_median_bonus: 0,
          away_median_bonus: 0,
          is_finished: false,
          is_published: false,
          is_playoff: true,
          tiebreaker_home_goals: null,
          tiebreaker_away_goals: null,
          tiebreaker_home_goals_conceded: null,
          tiebreaker_away_goals_conceded: null,
          tiebreaker_home_bench: null,
          tiebreaker_away_bench: null,
          tiebreaker_winner_id: null,
          tiebreaker_method: null,
          tiebreaker_reason: null,
        });
      }
      continue;
    }

    const h2h = resolveH2h(homeFpl, awayFpl);
    out.push({
      id: f.id,
      home_fpl_points: homeFpl,
      away_fpl_points: awayFpl,
      home_h2h_points: h2h.home,
      away_h2h_points: h2h.away,
      home_median_bonus: bonusByTeam.get(f.home_team_id) ?? 0,
      away_median_bonus: bonusByTeam.get(f.away_team_id) ?? 0,
      is_finished: true,
      is_published: false,
      is_playoff: false,
      tiebreaker_home_goals: null,
      tiebreaker_away_goals: null,
      tiebreaker_home_goals_conceded: null,
      tiebreaker_away_goals_conceded: null,
      tiebreaker_home_bench: null,
      tiebreaker_away_bench: null,
      tiebreaker_winner_id: null,
      tiebreaker_method: null,
      tiebreaker_reason: null,
    });
  }
  return out;
}

export async function getWorkspaceGameweek(
  seasonId: string,
  pyramidId: string,
  gameweek: number,
): Promise<WorkspaceGameweekPayload> {
  const supabase = await requireAuth();
  if (!seasonId || !pyramidId || !gameweek) {
    return {
      seasonId,
      pyramidId,
      gameweek,
      fixtures: [],
      publishedCount: 0,
      draftCount: 0,
      finishedCount: 0,
      isFullyPublished: false,
      hasAnyPublished: false,
    };
  }

  const { ids, meta } = await divisionIdsForScope(supabase, seasonId, pyramidId);
  if (!ids.length) {
    return {
      seasonId,
      pyramidId,
      gameweek,
      fixtures: [],
      publishedCount: 0,
      draftCount: 0,
      finishedCount: 0,
      isFullyPublished: false,
      hasAnyPublished: false,
    };
  }

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select(
      "id, manager_name, discord_nick, fpl_id, fpl_team_name, chosen_club, division_id",
    )
    .in("division_id", ids);

  if (teamsError) throw new Error(teamsError.message);
  const byId = new Map((teams ?? []).map((t) => [t.id, t as WorkspaceTeam]));

  const { data: fixtures, error: fixError } = await supabase
    .from("fixtures")
    .select(FIXTURE_SELECT)
    .eq("season_id", seasonId)
    .eq("gameweek", gameweek)
    .in("division_id", ids)
    .order("division_id", { ascending: true });

  if (fixError) throw new Error(fixError.message);

  const mapped: WorkspaceFixtureRow[] = (fixtures ?? []).map((f) => {
    const div = meta.get(f.division_id);
    return mapWorkspaceFixture(f as Record<string, unknown>, {
      name: div?.name ?? "—",
      tier: div?.tier ?? 99,
    }, byId);
  });

  mapped.sort(
    (a, b) =>
      a.division_tier - b.division_tier ||
      a.division_name.localeCompare(b.division_name, "pl"),
  );

  const publishedCount = mapped.filter((f) => f.is_published).length;
  const draftCount = mapped.length - publishedCount;
  const finishedCount = mapped.filter((f) => f.is_finished).length;

  return {
    seasonId,
    pyramidId,
    gameweek,
    fixtures: mapped,
    publishedCount,
    draftCount,
    finishedCount,
    isFullyPublished: mapped.length > 0 && publishedCount === mapped.length,
    hasAnyPublished: publishedCount > 0,
  };
}

export type SaveGwScoresInput = {
  seasonId: string;
  pyramidId: string;
  gameweek: number;
  /** teamId → punkty FPL w GW */
  scores: Record<string, number>;
};

/** Zapis brudnopisu: przelicza H2H + medianę, is_published=false. */
export async function saveGameweekDraft(
  input: SaveGwScoresInput,
): Promise<ActionState & { updated?: number }> {
  try {
    const supabase = await requireAuth();
    const { seasonId, pyramidId, gameweek, scores } = input;
    if (!seasonId || !pyramidId) return { error: "Wybierz sezon i piramidę." };
    if (!gameweek) return { error: "Wybierz kolejkę." };

    const { ids } = await divisionIdsForScope(supabase, seasonId, pyramidId);
    if (!ids.length) return { error: "Brak dywizji." };

    const { data: fixtures, error: fixError } = await supabase
      .from("fixtures")
      .select(
        "id, division_id, home_team_id, away_team_id, home_fpl_points, away_fpl_points, is_published",
      )
      .eq("season_id", seasonId)
      .eq("gameweek", gameweek)
      .in("division_id", ids);

    if (fixError) return { error: fixError.message };
    if (!fixtures?.length) {
      return { error: `Brak meczów dla GW${gameweek} — najpierw wygeneruj terminarz.` };
    }

    const pointsByTeam = new Map<string, number>();
    for (const [teamId, pts] of Object.entries(scores)) {
      if (!Number.isFinite(pts) || !isValidFplPoints(pts)) continue;
      pointsByTeam.set(teamId, Math.round(pts));
    }

    const missing: string[] = [];
    for (const f of fixtures) {
      if (!pointsByTeam.has(f.home_team_id)) missing.push(f.home_team_id);
      if (!pointsByTeam.has(f.away_team_id)) missing.push(f.away_team_id);
    }
    if (missing.length) {
      return {
        error: `Brak punktów dla ${[...new Set(missing)].length} drużyn — uzupełnij wszystkie pola.`,
      };
    }

    const updates = applyRecalcToFixtures(fixtures, pointsByTeam);
    for (const row of updates) {
      const { error } = await supabase
        .from("fixtures")
        .update(fixtureScoreUpdatePayload(row))
        .eq("id", row.id);
      if (error) return { error: error.message };
    }

    revalidateWorkspace();
    return {
      error: null,
      success: `Zapisano brudnopis GW${gameweek}: ${updates.length} meczów (is_published=false).`,
      updated: updates.length,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Błąd zapisu." };
  }
}

/** Paste GW,FPL_ID,Punkty → brudnopis jednej kolejki. */
export async function importGameweekFromPaste(
  seasonId: string,
  pyramidId: string,
  gameweek: number,
  rawData: string,
): Promise<ActionState & { updated?: number }> {
  try {
    const { lines, errors } = parseGwBatchText(rawData);
    if (errors.length) {
      return { error: `Parsowanie: ${errors.slice(0, 8).join(" | ")}` };
    }
    if (!lines.length) {
      return { error: "Brak wierszy punktów w wklejce." };
    }

    // Jeśli wklejka ma inny GW — używamy wybranej kolejki (override).
    const effective = lines.map((l) => ({ ...l, gameweek }));

    const supabase = await requireAuth();
    const { ids } = await divisionIdsForScope(supabase, seasonId, pyramidId);
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, fpl_id")
      .in("division_id", ids);
    if (teamsError) return { error: teamsError.message };

    const byFpl = new Map(
      (teams ?? [])
        .filter((t) => t.fpl_id)
        .map((t) => [String(t.fpl_id).trim(), t.id]),
    );

    const scores: Record<string, number> = {};
    const unknown: string[] = [];
    for (const line of effective) {
      const teamId = byFpl.get(line.fpl_id);
      if (!teamId) {
        unknown.push(line.fpl_id);
        continue;
      }
      scores[teamId] = line.points;
    }
    if (unknown.length) {
      return {
        error: `Nieznane FPL ID: ${[...new Set(unknown)].slice(0, 12).join(", ")}`,
      };
    }

    return saveGameweekDraft({ seasonId, pyramidId, gameweek, scores });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Błąd paste." };
  }
}

export async function publishGameweek(
  seasonId: string,
  pyramidId: string,
  gameweek: number,
): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    const { ids } = await divisionIdsForScope(supabase, seasonId, pyramidId);
    if (!ids.length) return { error: "Brak dywizji." };

    const { data: fixtures, error: readError } = await supabase
      .from("fixtures")
      .select("id, is_finished, division_id")
      .eq("season_id", seasonId)
      .eq("gameweek", gameweek)
      .in("division_id", ids);

    if (readError) return { error: readError.message };
    if (!fixtures?.length) return { error: `Brak meczów GW${gameweek}.` };

    const involved = [
      ...new Set(
        fixtures.map((f) => f.division_id).filter((id): id is string => Boolean(id)),
      ),
    ];
    for (const id of involved) {
      const incomplete = await assertDivisionRosterFull(supabase, id);
      if (incomplete) return { error: incomplete };
    }
    if (fixtures.some((f) => !f.is_finished)) {
      return {
        error: "Nie wszystkie mecze mają rozliczone punkty — zapisz brudnopis przed publikacją.",
      };
    }

    const { error } = await supabase
      .from("fixtures")
      .update({ is_published: true })
      .eq("season_id", seasonId)
      .eq("gameweek", gameweek)
      .in("division_id", ids);

    if (error) return { error: error.message };

    revalidateWorkspace();
    return {
      error: null,
      success: `Opublikowano GW${gameweek} w Strefie Gracza (${fixtures.length} meczów).`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Błąd publikacji." };
  }
}

export async function unpublishGameweek(
  seasonId: string,
  pyramidId: string,
  gameweek: number,
): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    const { ids } = await divisionIdsForScope(supabase, seasonId, pyramidId);
    if (!ids.length) return { error: "Brak dywizji." };

    const { error, count } = await supabase
      .from("fixtures")
      .update({ is_published: false }, { count: "exact" })
      .eq("season_id", seasonId)
      .eq("gameweek", gameweek)
      .in("division_id", ids);

    if (error) return { error: error.message };

    revalidateWorkspace();
    return {
      error: null,
      success: `Wycofano publikację GW${gameweek} (${count ?? 0} meczów → brudnopis).`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Błąd unpublish." };
  }
}

/** Czyści punkty / H2H / medianę dla GW (zostawia terminarz). */
export async function clearGameweekDraft(
  seasonId: string,
  pyramidId: string,
  gameweek: number,
): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    const { ids } = await divisionIdsForScope(supabase, seasonId, pyramidId);
    if (!ids.length) return { error: "Brak dywizji." };

    const { count: published } = await supabase
      .from("fixtures")
      .select("id", { count: "exact", head: true })
      .eq("season_id", seasonId)
      .eq("gameweek", gameweek)
      .in("division_id", ids)
      .eq("is_published", true);

    if ((published ?? 0) > 0) {
      return {
        error: "GW jest opublikowane — najpierw Unpublish, potem wyczyść brudnopis.",
      };
    }

    const { error, count } = await supabase
      .from("fixtures")
      .update(
        {
          home_fpl_points: null,
          away_fpl_points: null,
          home_h2h_points: 0,
          away_h2h_points: 0,
          home_median_bonus: 0,
          away_median_bonus: 0,
          is_finished: false,
          is_published: false,
        },
        { count: "exact" },
      )
      .eq("season_id", seasonId)
      .eq("gameweek", gameweek)
      .in("division_id", ids);

    if (error) return { error: error.message };

    revalidateWorkspace();
    return {
      error: null,
      success: `Wyczyszczono dane GW${gameweek} (${count ?? 0} meczów). Terminarz bez zmian.`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Błąd czyszczenia." };
  }
}

// ─── MODUŁ 3: Workspace per dywizja (Excel SSOT) ─────────────────────────────

export interface DivisionWorkspacePayload {
  seasonId: string;
  divisionId: string;
  gameweek: number;
  divisionName: string;
  divisionTier: number;
  fixtures: WorkspaceFixtureRow[];
  publishedCount: number;
  draftCount: number;
  finishedCount: number;
  isFullyPublished: boolean;
  hasAnyPublished: boolean;
  medianThreshold: number | null;
}

export async function getDivisionGameweek(
  seasonId: string,
  divisionId: string,
  gameweek: number,
): Promise<DivisionWorkspacePayload> {
  const empty = (extra?: Partial<DivisionWorkspacePayload>): DivisionWorkspacePayload => ({
    seasonId,
    divisionId,
    gameweek,
    divisionName: "—",
    divisionTier: 0,
    fixtures: [],
    publishedCount: 0,
    draftCount: 0,
    finishedCount: 0,
    isFullyPublished: false,
    hasAnyPublished: false,
    medianThreshold: null,
    ...extra,
  });

  const supabase = await requireAuth();
  if (!seasonId || !divisionId || !gameweek) return empty();

  const { data: division, error: divError } = await supabase
    .from("divisions")
    .select("id, name, tier, season_id")
    .eq("id", divisionId)
    .maybeSingle();
  if (divError) throw new Error(divError.message);
  if (!division || division.season_id !== seasonId) {
    return empty({ divisionName: "Nie znaleziono dywizji" });
  }

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select(
      "id, manager_name, discord_nick, fpl_id, fpl_team_name, chosen_club, division_id",
    )
    .eq("division_id", divisionId);
  if (teamsError) throw new Error(teamsError.message);
  const byId = new Map((teams ?? []).map((t) => [t.id, t as WorkspaceTeam]));

  const { data: fixtures, error: fixError } = await supabase
    .from("fixtures")
    .select(FIXTURE_SELECT)
    .eq("season_id", seasonId)
    .eq("division_id", divisionId)
    .eq("gameweek", gameweek)
    .order("id", { ascending: true });

  if (fixError) throw new Error(fixError.message);

  const mapped: WorkspaceFixtureRow[] = (fixtures ?? []).map((f) =>
    mapWorkspaceFixture(f as Record<string, unknown>, {
      name: division.name,
      tier: division.tier,
    }, byId),
  );

  const pts = new Map<string, number>();
  for (const f of mapped) {
    if (f.home_fpl_points != null) pts.set(f.home_team_id, f.home_fpl_points);
    if (f.away_fpl_points != null) pts.set(f.away_team_id, f.away_fpl_points);
  }
  const sortedDesc = [...pts.values()].sort((a, b) => b - a);
  const threshold =
    sortedDesc.length === 0
      ? null
      : sortedDesc[Math.min(5, sortedDesc.length) - 1] ?? null;

  const publishedCount = mapped.filter((f) => f.is_published).length;

  return {
    seasonId,
    divisionId,
    gameweek,
    divisionName: division.name,
    divisionTier: division.tier,
    fixtures: mapped,
    publishedCount,
    draftCount: mapped.length - publishedCount,
    finishedCount: mapped.filter((f) => f.is_finished).length,
    isFullyPublished: mapped.length > 0 && publishedCount === mapped.length,
    hasAnyPublished: publishedCount > 0,
    medianThreshold: threshold,
  };
}

async function saveDivisionScores(
  seasonId: string,
  divisionId: string,
  gameweek: number,
  scores: Record<string, number>,
): Promise<ActionState & { updated?: number }> {
  const supabase = await requireAuth();
  if (!seasonId || !divisionId) return { error: "Wybierz sezon i dywizję." };
  if (!gameweek || gameweek < 1 || gameweek > 38) return { error: "Nieprawidłowa kolejka." };

  const { data: fixtures, error: fixError } = await supabase
    .from("fixtures")
    .select(
      "id, division_id, home_team_id, away_team_id, home_fpl_points, away_fpl_points, is_published, is_playoff",
    )
    .eq("season_id", seasonId)
    .eq("division_id", divisionId)
    .eq("gameweek", gameweek);

  if (fixError) return { error: fixError.message };
  if (!fixtures?.length) {
    return {
      error: `Brak meczów GW${gameweek} w tej dywizji — najpierw Generuj Terminarz (Berger).`,
    };
  }

  const pointsByTeam = new Map<string, number>();
  for (const [teamId, pts] of Object.entries(scores)) {
    if (!Number.isFinite(pts) || !isValidFplPoints(pts)) continue;
    pointsByTeam.set(teamId, Math.round(pts));
  }

  // Dopełnij brakujące z już zapisanych wartości (inline edit częściowy)
  for (const f of fixtures) {
    if (!pointsByTeam.has(f.home_team_id) && f.home_fpl_points != null) {
      pointsByTeam.set(f.home_team_id, f.home_fpl_points);
    }
    if (!pointsByTeam.has(f.away_team_id) && f.away_fpl_points != null) {
      pointsByTeam.set(f.away_team_id, f.away_fpl_points);
    }
  }

  const missing = new Set<string>();
  for (const f of fixtures) {
    if (!pointsByTeam.has(f.home_team_id)) missing.add(f.home_team_id);
    if (!pointsByTeam.has(f.away_team_id)) missing.add(f.away_team_id);
  }
  if (missing.size) {
    return {
      error: `Brak punktów dla ${missing.size} drużyn — uzupełnij wklejkę lub pola ręcznie.`,
    };
  }

  const updates = applyRecalcToFixtures(fixtures, pointsByTeam);
  for (const row of updates) {
    const { error } = await supabase
      .from("fixtures")
      .update(fixtureScoreUpdatePayload(row))
      .eq("id", row.id);
    if (error) return { error: error.message };
  }

  revalidateWorkspace();
  return {
    error: null,
    success: `Zapisano brudnopis GW${gameweek}: ${updates.length} meczów (H2H 2+1, is_published=false).`,
    updated: updates.length,
  };
}

/**
 * Wklejka FPL (legacy per-dywizja): wiersze GW | Team | Manager | Punkty.
 * Filtruje do wskazanej kolejki (lub wszystkich GW z wklejki dla tej dywizji).
 */
export async function processGameweekPoints(
  gw: number,
  divisionId: string,
  pasteData: string,
  seasonId?: string,
): Promise<ActionState & { updated?: number; unmatched?: string[] }> {
  try {
    const supabase = await requireAuth();
    if (!divisionId) return { error: "Wybierz dywizję." };
    if (!pasteData.trim()) {
      return { error: "Wklej wyniki. Kolumny: GW | FPL Team | FPL Manager | Punkty." };
    }

    const { data: division, error: divError } = await supabase
      .from("divisions")
      .select("id, season_id, name")
      .eq("id", divisionId)
      .maybeSingle();
    if (divError) return { error: divError.message };
    if (!division) return { error: "Nie znaleziono dywizji." };

    const resolvedSeasonId = seasonId || division.season_id;
    if (seasonId && division.season_id !== seasonId) {
      return { error: "Dywizja nie należy do wybranego sezonu." };
    }

    const { lines, errors } = parseMultiGameweekPaste(pasteData);
    if (errors.length && !lines.length) {
      return { error: `Parsowanie:\n${errors.slice(0, 10).join("\n")}` };
    }

    const scoped = lines.filter((l) => l.gameweek === gw);
    const workLines = scoped.length ? scoped : lines;
    if (!workLines.length) return { error: "Brak wierszy punktów w wklejce." };

    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, fpl_team_name, manager_name, fpl_id, is_active")
      .eq("division_id", divisionId);
    if (teamsError) return { error: teamsError.message };

    const activePool = ((teams ?? []) as MatchPoolTeam[]).filter(
      (t) => t.is_active !== false,
    );

    const byGw = new Map<number, typeof workLines>();
    for (const line of workLines) {
      const list = byGw.get(line.gameweek) ?? [];
      list.push(line);
      byGw.set(line.gameweek, list);
    }

    const unmatched: string[] = [...errors.map((e) => `⚠ ${e}`)];
    let updated = 0;

    for (const [gameweek, gwLines] of byGw) {
      const used = new Set<string>();
      const scores: Record<string, number> = {};
      for (const line of gwLines) {
        const team = matchTeamInPool(activePool, used, line);
        if (!team) {
          unmatched.push(
            `Wiersz ${line.lineNumber} (GW${gameweek}): nie znaleziono „${line.label}”`,
          );
          continue;
        }
        used.add(team.id);
        scores[team.id] = line.points;
      }
      if (!Object.keys(scores).length) continue;
      const save = await saveDivisionScores(
        resolvedSeasonId,
        divisionId,
        gameweek,
        scores,
      );
      if (save.error) {
        return { ...save, unmatched: unmatched.slice(0, 25) };
      }
      updated += save.updated ?? 0;
    }

    if (!updated) {
      return {
        error: "Nie zmapowano żadnego gracza (dopasowanie: FPL Team / FPL Manager).",
        unmatched: unmatched.slice(0, 25),
      };
    }

    const warn =
      unmatched.length > 0 ? ` · Pominięto/ostrzeżenia: ${unmatched.length}` : "";
    return {
      error: null,
      success: `Zapisano brudnopis: ${updated} meczów (H2H 2+1).${warn}`,
      updated,
      unmatched: unmatched.slice(0, 25),
    };
  } catch (e) {
    console.error("[processGameweekPoints]", e);
    return { error: e instanceof Error ? e.message : "Błąd importu punktów." };
  }
}

type MatchPoolTeam = {
  id: string;
  fpl_team_name: string | null;
  manager_name: string;
  division_id?: string | null;
  is_active?: boolean | null;
};

function matchTeamInPool(
  pool: MatchPoolTeam[],
  used: Set<string>,
  line: { team: string | null; manager: string | null },
): MatchPoolTeam | undefined {
  const available = pool.filter((t) => !used.has(t.id) && t.is_active !== false);

  if (line.team && line.manager) {
    const both = available.find(
      (t) =>
        fplNamesMatch(t.fpl_team_name, line.team) &&
        fplNamesMatch(t.manager_name, line.manager),
    );
    if (both) return both;
  }

  if (line.team) {
    const byTeam = available.filter((t) => fplNamesMatch(t.fpl_team_name, line.team));
    if (byTeam.length === 1) return byTeam[0];
  }

  if (line.manager) {
    const byMgr = available.filter((t) => fplNamesMatch(t.manager_name, line.manager));
    if (byMgr.length === 1) return byMgr[0];
  }

  if (line.team) {
    const byMgrAsTeam = available.filter((t) => fplNamesMatch(t.manager_name, line.team));
    if (byMgrAsTeam.length === 1) return byMgrAsTeam[0];
  }
  if (line.manager) {
    const byTeamAsMgr = available.filter((t) =>
      fplNamesMatch(t.fpl_team_name, line.manager),
    );
    if (byTeamAsMgr.length === 1) return byTeamAsMgr[0];
  }

  const combined = normalizeMatchKey([line.team, line.manager].filter(Boolean).join(" "));
  if (combined) {
    const byCombined = available.filter((t) => {
      const db = normalizeMatchKey(`${t.fpl_team_name ?? ""} ${t.manager_name}`);
      return (
        db === combined ||
        (db.length >= 6 &&
          combined.length >= 6 &&
          (db.includes(combined) || combined.includes(db)))
      );
    });
    if (byCombined.length === 1) return byCombined[0];
  }

  return undefined;
}

export type SeasonWorkspacePayload = {
  seasonId: string;
  gameweek: number;
  fixtures: WorkspaceFixtureRow[];
  divisions: Array<{
    id: string;
    name: string;
    tier: number;
    fixtureCount: number;
    finishedCount: number;
    publishedCount: number;
  }>;
  publishedCount: number;
  draftCount: number;
  finishedCount: number;
  isFullyPublished: boolean;
  hasAnyPublished: boolean;
};

/** Wszystkie mecze GW w sezonie (wszystkie dywizje). */
export async function getSeasonGameweek(
  seasonId: string,
  gameweek: number,
): Promise<SeasonWorkspacePayload> {
  const empty = (): SeasonWorkspacePayload => ({
    seasonId,
    gameweek,
    fixtures: [],
    divisions: [],
    publishedCount: 0,
    draftCount: 0,
    finishedCount: 0,
    isFullyPublished: false,
    hasAnyPublished: false,
  });

  const supabase = await requireAuth();
  if (!seasonId || !gameweek) return empty();

  const { data: divisions, error: divError } = await supabase
    .from("divisions")
    .select("id, name, tier")
    .eq("season_id", seasonId)
    .order("tier", { ascending: true });
  if (divError) throw new Error(divError.message);
  if (!divisions?.length) return empty();

  const divIds = divisions.map((d) => d.id);
  const meta = new Map(divisions.map((d) => [d.id, d]));

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select(
      "id, manager_name, discord_nick, fpl_id, fpl_team_name, chosen_club, division_id",
    )
    .in("division_id", divIds);
  if (teamsError) throw new Error(teamsError.message);
  const byId = new Map((teams ?? []).map((t) => [t.id, t as WorkspaceTeam]));

  const { data: fixtures, error: fixError } = await supabase
    .from("fixtures")
    .select(FIXTURE_SELECT)
    .eq("season_id", seasonId)
    .eq("gameweek", gameweek)
    .in("division_id", divIds)
    .order("division_id", { ascending: true });

  if (fixError) throw new Error(fixError.message);

  const mapped: WorkspaceFixtureRow[] = (fixtures ?? []).map((f) => {
    const div = meta.get(f.division_id);
    return mapWorkspaceFixture(f as Record<string, unknown>, {
      name: div?.name ?? "—",
      tier: div?.tier ?? 99,
    }, byId);
  });

  mapped.sort(
    (a, b) =>
      a.division_tier - b.division_tier ||
      a.division_name.localeCompare(b.division_name, "pl"),
  );

  const isPlayoffGw = isPlayoffGameweek(gameweek);

  // GW barażowa: tylko mecze is_playoff (ukryj duchy / stare Berger na GW19)
  const viewFixtures = isPlayoffGw
    ? mapped.filter((f) => f.is_playoff)
    : mapped;

  const teamsByDiv = new Map<string, Set<string>>();
  for (const t of byId.values()) {
    const set = teamsByDiv.get(t.division_id) ?? new Set();
    set.add(t.id);
    teamsByDiv.set(t.division_id, set);
  }

  const divSummaries = divisions.map((d) => {
    const teamIds = teamsByDiv.get(d.id) ?? new Set();
    const rows = viewFixtures.filter((f) => {
      if (f.division_id === d.id) return true;
      if (!isPlayoffGw) return false;
      return teamIds.has(f.home_team_id) || teamIds.has(f.away_team_id);
    });
    return {
      id: d.id,
      name: d.name,
      tier: d.tier,
      fixtureCount: rows.length,
      finishedCount: rows.filter((f) => f.is_finished).length,
      publishedCount: rows.filter((f) => f.is_published).length,
    };
  });

  const publishedCount = viewFixtures.filter((f) => f.is_published).length;

  return {
    seasonId,
    gameweek,
    fixtures: viewFixtures,
    divisions: divSummaries,
    publishedCount,
    draftCount: viewFixtures.length - publishedCount,
    finishedCount: viewFixtures.filter((f) => f.is_finished).length,
    isFullyPublished:
      viewFixtures.length > 0 && publishedCount === viewFixtures.length,
    hasAnyPublished: publishedCount > 0,
  };
}

/**
 * Import wyników ze schowka FPL Classic → wszystkie dywizje sezonu.
 * Numer kolejki (GW) wybierany w UI — nie w wklejce.
 * H2H = 2/1/0 (Mediana 2+1), zapis is_published=false.
 */
export async function importGlobalGameweekResults(
  pasteData: string,
  seasonId: string,
  gameweek: number,
): Promise<
  ActionState & {
    updated?: number;
    gameweek?: number;
    gameweeks?: number[];
    divisionsUpdated?: number;
    playersMatched?: number;
    unmatched?: string[];
    parseSkipped?: string[];
  }
> {
  try {
    const supabase = await requireAuth();
    if (!seasonId) return { error: "Wybierz sezon." };
    if (!gameweek || gameweek < 1 || gameweek > 38) {
      return { error: "Wybierz numer kolejki (GW1–GW38)." };
    }
    if (!pasteData.trim()) {
      return {
        error: "Wklej tekst skopiowany ze strony ligi Classic w FPL (Ctrl+V).",
      };
    }

    const { lines, errors, skipped } = parseFplClassicLeaguePaste(pasteData);
    if (errors.length && !lines.length) {
      return {
        error: errors.slice(0, 8).join("\n"),
        parseSkipped: skipped.slice(0, 20),
      };
    }
    if (!lines.length) {
      return {
        error:
          errors[0] ??
          "Nie znaleziono wyników w wklejce — zaznacz tabelę ligową na stronie FPL i skopiuj ponownie.",
        parseSkipped: skipped.slice(0, 20),
      };
    }

    const { data: divisions, error: divError } = await supabase
      .from("divisions")
      .select("id, name")
      .eq("season_id", seasonId);
    if (divError) return { error: divError.message };
    if (!divisions?.length) {
      return { error: "Brak dywizji w sezonie — najpierw Master Import." };
    }

    const divIds = divisions.map((d) => d.id);
    const divName = new Map(divisions.map((d) => [d.id, d.name]));

    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, fpl_team_name, manager_name, division_id, is_active")
      .in("division_id", divIds);
    if (teamsError) return { error: teamsError.message };

    const pool = (teams ?? []) as MatchPoolTeam[];
    const used = new Set<string>();
    const scoresByDiv = new Map<string, Record<string, number>>();
    const unmatched: string[] = [...errors.map((e) => `⚠ ${e}`)];
    let playersMatched = 0;

    for (const line of lines) {
      const team = matchTeamInPool(pool, used, line);
      if (!team || !team.division_id) {
        unmatched.push(`Nie rozpoznano: „${line.label}” (wiersz ${line.lineNumber})`);
        continue;
      }
      used.add(team.id);
      playersMatched += 1;

      const bucket = scoresByDiv.get(team.division_id) ?? {};
      bucket[team.id] = line.points;
      scoresByDiv.set(team.division_id, bucket);
    }

    if (!playersMatched) {
      return {
        error: "Nie dopasowano żadnego gracza z wklejki do bazy (sprawdź nazwy drużyn / menedżerów).",
        unmatched: unmatched.slice(0, 40),
        parseSkipped: skipped.slice(0, 20),
        gameweek,
      };
    }

    let fixturesUpdated = 0;
    let divisionsUpdated = 0;
    const divErrors: string[] = [];

    for (const [divisionId, scores] of scoresByDiv) {
      const result = await saveDivisionScoresLenient(
        seasonId,
        divisionId,
        gameweek,
        scores,
      );
      if (result.error) {
        divErrors.push(
          `${divName.get(divisionId) ?? divisionId}: ${result.error}`,
        );
        continue;
      }
      divisionsUpdated += 1;
      fixturesUpdated += result.updated ?? 0;
    }

    if (!fixturesUpdated && divErrors.length) {
      return {
        error: `Import nie zapisał meczów GW${gameweek}.\n${divErrors.slice(0, 8).join("\n")}`,
        unmatched: unmatched.slice(0, 40),
        parseSkipped: skipped.slice(0, 20),
        gameweek,
        playersMatched,
      };
    }

    revalidateWorkspace();
    const warnParts = [
      unmatched.length ? `${unmatched.length} nierozpoznanych` : null,
      divErrors.length ? `${divErrors.length} ostrzeżeń dywizji` : null,
    ].filter(Boolean);

    return {
      error: null,
      success: `GW${gameweek}: dopasowano ${playersMatched} graczy → ${fixturesUpdated} meczów (brudnopis).${
        warnParts.length ? ` · ${warnParts.join(" · ")}` : ""
      }`,
      updated: fixturesUpdated,
      gameweek,
      gameweeks: [gameweek],
      divisionsUpdated,
      playersMatched,
      unmatched: [...unmatched, ...divErrors.map((e) => `⚠ ${e}`)].slice(0, 40),
      parseSkipped: skipped.slice(0, 20),
    };
  } catch (e) {
    console.error("[importGlobalGameweekResults]", e);
    return { error: e instanceof Error ? e.message : "Błąd importu wyników." };
  }
}

/** Zapis punktów dywizji: dopełnia z DB, aktualizuje mecze gdzie obie strony mają wynik. */
async function saveDivisionScoresLenient(
  seasonId: string,
  divisionId: string,
  gameweek: number,
  scores: Record<string, number>,
): Promise<ActionState & { updated?: number }> {
  const supabase = await requireAuth();

  const { data: fixtures, error: fixError } = await supabase
    .from("fixtures")
    .select(
      "id, division_id, home_team_id, away_team_id, home_fpl_points, away_fpl_points, is_published, is_playoff",
    )
    .eq("season_id", seasonId)
    .eq("division_id", divisionId)
    .eq("gameweek", gameweek);

  if (fixError) return { error: fixError.message };
  if (!fixtures?.length) {
    return {
      error: `Brak meczów GW${gameweek} — wygeneruj terminarz Berger.`,
    };
  }

  const pointsByTeam = new Map<string, number>();
  for (const [teamId, pts] of Object.entries(scores)) {
    if (!Number.isFinite(pts) || !isValidFplPoints(pts)) continue;
    pointsByTeam.set(teamId, Math.round(pts));
  }
  for (const f of fixtures) {
    if (!pointsByTeam.has(f.home_team_id) && f.home_fpl_points != null) {
      pointsByTeam.set(f.home_team_id, f.home_fpl_points);
    }
    if (!pointsByTeam.has(f.away_team_id) && f.away_fpl_points != null) {
      pointsByTeam.set(f.away_team_id, f.away_fpl_points);
    }
  }

  const updates = applyRecalcToFixtures(fixtures, pointsByTeam);
  if (!updates.length) {
    return {
      error: "Za mało punktów, by rozliczyć jakikolwiek mecz w tej dywizji.",
    };
  }

  for (const row of updates) {
    const { error } = await supabase
      .from("fixtures")
      .update(fixtureScoreUpdatePayload(row))
      .eq("id", row.id);
    if (error) return { error: error.message };
  }

  return {
    error: null,
    success: `OK ${updates.length} meczów`,
    updated: updates.length,
  };
}

export async function saveSeasonGameweekDraft(
  seasonId: string,
  gameweek: number,
  scores: Record<string, number>,
): Promise<ActionState & { updated?: number }> {
  try {
    const supabase = await requireAuth();
    if (!seasonId) return { error: "Wybierz sezon." };

    const { data: divisions, error: divError } = await supabase
      .from("divisions")
      .select("id")
      .eq("season_id", seasonId);
    if (divError) return { error: divError.message };
    if (!divisions?.length) return { error: "Brak dywizji." };

    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, division_id")
      .in(
        "division_id",
        divisions.map((d) => d.id),
      );
    if (teamsError) return { error: teamsError.message };

    const byDiv = new Map<string, Record<string, number>>();
    for (const t of teams ?? []) {
      if (!Object.prototype.hasOwnProperty.call(scores, t.id)) continue;
      const bucket = byDiv.get(t.division_id) ?? {};
      bucket[t.id] = scores[t.id]!;
      byDiv.set(t.division_id, bucket);
    }

    let updated = 0;
    for (const [divisionId, divScores] of byDiv) {
      const r = await saveDivisionScores(seasonId, divisionId, gameweek, divScores);
      if (r.error) return r;
      updated += r.updated ?? 0;
    }

    revalidateWorkspace();
    return {
      error: null,
      success: `Zapisano brudnopis GW${gameweek}: ${updated} meczów (is_published=false).`,
      updated,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Błąd zapisu." };
  }
}

export async function publishSeasonGameweek(
  seasonId: string,
  gameweek: number,
): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    if (!seasonId) return { error: "Wybierz sezon." };

    const { data: fixtures, error: readError } = await supabase
      .from("fixtures")
      .select("id, is_finished, division_id")
      .eq("season_id", seasonId)
      .eq("gameweek", gameweek);

    if (readError) return { error: readError.message };
    if (!fixtures?.length) return { error: `Brak meczów GW${gameweek} w sezonie.` };

    const divIds = [
      ...new Set(
        fixtures.map((f) => f.division_id).filter((id): id is string => Boolean(id)),
      ),
    ];
    for (const id of divIds) {
      const incomplete = await assertDivisionRosterFull(supabase, id);
      if (incomplete) return { error: incomplete };
    }

    if (fixtures.some((f) => !f.is_finished)) {
      return {
        error:
          "Nie wszystkie mecze mają punkty — uzupełnij import / zapisz brudnopis przed publikacją.",
      };
    }

    const { error } = await supabase
      .from("fixtures")
      .update({ is_published: true })
      .eq("season_id", seasonId)
      .eq("gameweek", gameweek);

    if (error) return { error: error.message };
    revalidateWorkspace();
    return {
      error: null,
      success: `Opublikowano całą kolejkę GW${gameweek} (${fixtures.length} meczów) do Strefy Gracza.`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Błąd publikacji." };
  }
}

export async function unpublishSeasonGameweek(
  seasonId: string,
  gameweek: number,
): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    if (!seasonId) return { error: "Wybierz sezon." };

    const { error, count } = await supabase
      .from("fixtures")
      .update({ is_published: false }, { count: "exact" })
      .eq("season_id", seasonId)
      .eq("gameweek", gameweek);

    if (error) return { error: error.message };
    revalidateWorkspace();
    return {
      error: null,
      success: `Wycofano publikację GW${gameweek} (${count ?? 0} meczów → brudnopis).`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Błąd unpublish." };
  }
}

export async function clearSeasonGameweekDraft(
  seasonId: string,
  gameweek: number,
): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    const { count: published } = await supabase
      .from("fixtures")
      .select("id", { count: "exact", head: true })
      .eq("season_id", seasonId)
      .eq("gameweek", gameweek)
      .eq("is_published", true);

    if ((published ?? 0) > 0) {
      return { error: "GW jest opublikowane — najpierw Cofnij Publikację." };
    }

    const { error, count } = await supabase
      .from("fixtures")
      .update(
        {
          home_fpl_points: null,
          away_fpl_points: null,
          home_h2h_points: 0,
          away_h2h_points: 0,
          home_median_bonus: 0,
          away_median_bonus: 0,
          is_finished: false,
          is_published: false,
          tiebreaker_home_goals: null,
          tiebreaker_away_goals: null,
          tiebreaker_home_goals_conceded: null,
          tiebreaker_away_goals_conceded: null,
          tiebreaker_home_bench: null,
          tiebreaker_away_bench: null,
          tiebreaker_winner_id: null,
          tiebreaker_method: null,
          tiebreaker_reason: null,
        },
        { count: "exact" },
      )
      .eq("season_id", seasonId)
      .eq("gameweek", gameweek);

    if (error) return { error: error.message };
    revalidateWorkspace();
    return {
      error: null,
      success: `Wyczyszczono GW${gameweek} w całym sezonie (${count ?? 0} meczów).`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Błąd czyszczenia." };
  }
}

/** Zapis brudnopisu jednej dywizji (po ręcznej korekcie). */
export async function saveDivisionGameweekDraft(
  seasonId: string,
  divisionId: string,
  gameweek: number,
  scores: Record<string, number>,
): Promise<ActionState & { updated?: number }> {
  try {
    return await saveDivisionScores(seasonId, divisionId, gameweek, scores);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Błąd zapisu." };
  }
}

export async function publishDivisionGameweek(
  seasonId: string,
  divisionId: string,
  gameweek: number,
): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    if (!seasonId || !divisionId) return { error: "Wybierz sezon i dywizję." };

    const incomplete = await assertDivisionRosterFull(supabase, divisionId);
    if (incomplete) return { error: incomplete };

    const { data: fixtures, error: readError } = await supabase
      .from("fixtures")
      .select("id, is_finished")
      .eq("season_id", seasonId)
      .eq("division_id", divisionId)
      .eq("gameweek", gameweek);

    if (readError) return { error: readError.message };
    if (!fixtures?.length) return { error: `Brak meczów GW${gameweek}.` };
    if (fixtures.some((f) => !f.is_finished)) {
      return {
        error: "Nie wszystkie mecze mają punkty — zapisz brudnopis przed publikacją.",
      };
    }

    const { error } = await supabase
      .from("fixtures")
      .update({ is_published: true })
      .eq("season_id", seasonId)
      .eq("division_id", divisionId)
      .eq("gameweek", gameweek);

    if (error) return { error: error.message };
    revalidateWorkspace();
    return {
      error: null,
      success: `Opublikowano GW${gameweek} w Strefie Gracza (${fixtures.length} meczów).`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Błąd publikacji." };
  }
}

export async function unpublishDivisionGameweek(
  seasonId: string,
  divisionId: string,
  gameweek: number,
): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    if (!seasonId || !divisionId) return { error: "Wybierz sezon i dywizję." };

    const { error, count } = await supabase
      .from("fixtures")
      .update({ is_published: false }, { count: "exact" })
      .eq("season_id", seasonId)
      .eq("division_id", divisionId)
      .eq("gameweek", gameweek);

    if (error) return { error: error.message };
    revalidateWorkspace();
    return {
      error: null,
      success: `Wycofano publikację GW${gameweek} (${count ?? 0} meczów → brudnopis).`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Błąd unpublish." };
  }
}

export async function clearDivisionGameweekDraft(
  seasonId: string,
  divisionId: string,
  gameweek: number,
): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    const { count: published } = await supabase
      .from("fixtures")
      .select("id", { count: "exact", head: true })
      .eq("season_id", seasonId)
      .eq("division_id", divisionId)
      .eq("gameweek", gameweek)
      .eq("is_published", true);

    if ((published ?? 0) > 0) {
      return {
        error: "GW jest opublikowane — najpierw Cofnij Publikację.",
      };
    }

    const { error, count } = await supabase
      .from("fixtures")
      .update(
        {
          home_fpl_points: null,
          away_fpl_points: null,
          home_h2h_points: 0,
          away_h2h_points: 0,
          home_median_bonus: 0,
          away_median_bonus: 0,
          is_finished: false,
          is_published: false,
          tiebreaker_home_goals: null,
          tiebreaker_away_goals: null,
          tiebreaker_home_goals_conceded: null,
          tiebreaker_away_goals_conceded: null,
          tiebreaker_home_bench: null,
          tiebreaker_away_bench: null,
          tiebreaker_winner_id: null,
          tiebreaker_method: null,
        },
        { count: "exact" },
      )
      .eq("season_id", seasonId)
      .eq("division_id", divisionId)
      .eq("gameweek", gameweek);

    if (error) return { error: error.message };
    revalidateWorkspace();
    return {
      error: null,
      success: `Wyczyszczono GW${gameweek} (${count ?? 0} meczów).`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Błąd czyszczenia." };
  }
}

/** Lista dywizji sezonu (do selecta Workspace). */
export async function listSeasonDivisions(seasonId: string): Promise<Division[]> {
  if (!seasonId) return [];
  const supabase = await requireAuth();
  const { data, error } = await supabase
    .from("divisions")
    .select("*, pyramids(id, name)")
    .eq("season_id", seasonId)
    .order("tier", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Division[];
}

/** Mecze barażowe całego sezonu dla danej GW (cross-division). */
export async function getSeasonPlayoffFixtures(
  seasonId: string,
  gameweek: number,
): Promise<WorkspaceFixtureRow[]> {
  const supabase = await requireAuth();
  if (!seasonId || !gameweek) return [];

  const { data: divisions, error: divError } = await supabase
    .from("divisions")
    .select("id, name, tier")
    .eq("season_id", seasonId);
  if (divError) throw new Error(divError.message);
  const meta = new Map((divisions ?? []).map((d) => [d.id, d]));
  const divIds = (divisions ?? []).map((d) => d.id);
  if (!divIds.length) return [];

  const { data: fixtures, error: fixError } = await supabase
    .from("fixtures")
    .select(FIXTURE_SELECT)
    .eq("season_id", seasonId)
    .eq("gameweek", gameweek)
    .eq("is_playoff", true)
    .in("division_id", divIds);

  if (fixError) throw new Error(fixError.message);

  const teamIds = new Set<string>();
  for (const f of fixtures ?? []) {
    teamIds.add(f.home_team_id);
    teamIds.add(f.away_team_id);
  }

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select(
      "id, manager_name, discord_nick, fpl_id, fpl_team_name, chosen_club, division_id",
    )
    .in("id", [...teamIds]);
  if (teamsError) throw new Error(teamsError.message);
  const byId = new Map((teams ?? []).map((t) => [t.id, t as WorkspaceTeam]));

  return (fixtures ?? []).map((f) => {
    const div = meta.get(f.division_id);
    return mapWorkspaceFixture(f as Record<string, unknown>, {
      name: div?.name ?? "—",
      tier: div?.tier ?? 99,
    }, byId);
  });
}

export type SavePlayoffTiebreakInput = {
  fixtureId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  homeGoalsConceded: number | null;
  awayGoalsConceded: number | null;
  homeBench: number | null;
  awayBench: number | null;
  manualWinnerId: string | null;
};

export async function savePlayoffTiebreak(
  input: SavePlayoffTiebreakInput,
): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    if (!input.fixtureId) return { error: "Brak ID meczu." };

    const { data: f, error: readError } = await supabase
      .from("fixtures")
      .select(
        "id, home_team_id, away_team_id, home_fpl_points, away_fpl_points, is_playoff, is_published",
      )
      .eq("id", input.fixtureId)
      .maybeSingle();
    if (readError) return { error: readError.message };
    if (!f) return { error: "Nie znaleziono meczu." };
    if (!f.is_playoff) return { error: "To nie jest mecz barażowy." };
    if (f.home_fpl_points == null || f.away_fpl_points == null) {
      return { error: "Najpierw wpisz punkty FPL obu stron." };
    }

    const resolved = resolvePlayoffWinner({
      homeTeamId: f.home_team_id,
      awayTeamId: f.away_team_id,
      homeFpl: f.home_fpl_points,
      awayFpl: f.away_fpl_points,
      homeGoals: input.homeGoals,
      awayGoals: input.awayGoals,
      homeGoalsConceded: input.homeGoalsConceded,
      awayGoalsConceded: input.awayGoalsConceded,
      homeBench: input.homeBench,
      awayBench: input.awayBench,
      manualWinnerId: input.manualWinnerId,
    });

    const fields = resolved.fields;

    if (resolved.status === "needs_manual") {
      const { error } = await supabase
        .from("fixtures")
        .update({
          tiebreaker_home_goals: fields.homeGoals,
          tiebreaker_away_goals: fields.awayGoals,
          tiebreaker_home_goals_conceded: fields.homeGoalsConceded,
          tiebreaker_away_goals_conceded: fields.awayGoalsConceded,
          tiebreaker_home_bench: fields.homeBench,
          tiebreaker_away_bench: fields.awayBench,
          tiebreaker_winner_id: null,
          tiebreaker_method: null,
          tiebreaker_reason: null,
          // Baraż ≠ punkty ligowe H2H — 0:0 dopóki brak zwycięzcy
          home_h2h_points: 0,
          away_h2h_points: 0,
          home_median_bonus: 0,
          away_median_bonus: 0,
          is_finished: false,
        })
        .eq("id", input.fixtureId);
      if (error) return { error: error.message };
      return { error: resolved.reason };
    }

    const { error } = await supabase
      .from("fixtures")
      .update({
        tiebreaker_home_goals: fields.homeGoals,
        tiebreaker_away_goals: fields.awayGoals,
        tiebreaker_home_goals_conceded: fields.homeGoalsConceded,
        tiebreaker_away_goals_conceded: fields.awayGoalsConceded,
        tiebreaker_home_bench: fields.homeBench,
        tiebreaker_away_bench: fields.awayBench,
        tiebreaker_winner_id: resolved.winnerId,
        tiebreaker_method: resolved.method,
        tiebreaker_reason: resolved.reason,
        // Marker zwycięzcy (nie wyświetlać jako „H2H 2:0” w UI barażu)
        home_h2h_points: resolved.home_h2h_points,
        away_h2h_points: resolved.away_h2h_points,
        home_median_bonus: 0,
        away_median_bonus: 0,
        is_finished: true,
      })
      .eq("id", input.fixtureId);

    if (error) return { error: error.message };
    revalidateWorkspace();
    return {
      error: null,
      success: `Baraż rozstrzygnięty (${resolved.method}): ${resolved.reason}`,
    };
  } catch (e) {
    console.error("[savePlayoffTiebreak]", e);
    return { error: e instanceof Error ? e.message : "Błąd zapisu tie-break." };
  }
}
