"use server";

/**
 * MODUŁ 4 — Symulator Sezonu (pełna logika).
 * Kolumny DB: home_fpl_points / away_fpl_points / home_median_bonus (nie team_h_score).
 */

import { revalidatePath } from "next/cache";
import { generateGlobalPlayoffs } from "@/app/admin/actions/fixtures";
import { createClient } from "@/lib/supabase/server";
import type { TiebreakerMethod } from "@/lib/admin/constants";
import {
  computeMedianBonusSet,
  resolveH2h,
} from "@/lib/admin/medianEngine";
import { DIVISION_CAPACITY } from "@/lib/admin/divisionCapacity";
import { resolvePlayoffWinner } from "@/lib/admin/playoffTiebreak";
import {
  randInt,
  rollFplPair,
  rollFplSolo,
  scenarioLabel,
  type SimulatorScenarioId,
} from "@/lib/admin/simulatorScenarios";
import {
  clearTeamGameweekScores,
  publishTeamGameweekScores,
  unpublishTeamGameweekScores,
  upsertTeamGameweekScores,
} from "@/lib/admin/teamGameweekScores";
import type { ActionState } from "@/lib/admin/types";
import {
  isPlayoffGameweek,
  resolveSeasonPhase,
} from "@/lib/public/season";

async function assertDivisionsFull(
  supabase: Awaited<ReturnType<typeof requireAuth>>,
  divisionIds: string[],
): Promise<string | null> {
  if (!divisionIds.length) return null;
  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, division_id, is_active")
    .in("division_id", divisionIds);
  if (error) return error.message;

  const counts = new Map<string, number>();
  for (const id of divisionIds) counts.set(id, 0);
  for (const t of teams ?? []) {
    if (t.is_active === false || !t.division_id) continue;
    counts.set(t.division_id, (counts.get(t.division_id) ?? 0) + 1);
  }

  for (const id of divisionIds) {
    const n = counts.get(id) ?? 0;
    if (n !== DIVISION_CAPACITY) {
      return `Dywizja niepełna (${n}/${DIVISION_CAPACITY}). Symulacja i publikacja wymagają pełnych 10 zespołów. Użyj „Uporządkuj Dywizje” lub uzupełnij rekrutację.`;
    }
  }
  return null;
}

export type SimRangeInput = {
  seasonId: string;
  divisionIds: string[];
  gwFrom: number;
  gwTo: number;
};

type FixtureSimRow = {
  id: string;
  season_id: string;
  division_id: string;
  gameweek: number;
  home_team_id: string;
  away_team_id: string;
  is_playoff: boolean | null;
};

type FixtureUpdate = {
  id: string;
  home_fpl_points: number;
  away_fpl_points: number;
  home_h2h_points: number;
  away_h2h_points: number;
  home_median_bonus: number;
  away_median_bonus: number;
  is_finished: boolean;
  is_published: boolean;
  tiebreaker_home_goals: number | null;
  tiebreaker_away_goals: number | null;
  tiebreaker_home_goals_conceded: number | null;
  tiebreaker_away_goals_conceded: number | null;
  tiebreaker_home_bench: number | null;
  tiebreaker_away_bench: number | null;
  tiebreaker_winner_id: string | null;
  tiebreaker_method: TiebreakerMethod | null;
  tiebreaker_reason: string | null;
};

const CLEAR_PAYLOAD = {
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
} as const;

const UPDATE_CHUNK = 25;

async function requireAuth() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji. Zaloguj się ponownie.");
  return supabase;
}

function revalidateSim() {
  revalidatePath("/admin/simulator");
  revalidatePath("/admin/workspace");
  revalidatePath("/admin/gw-results");
  revalidatePath("/strefa-gracza");
  revalidatePath("/na-minusie/hub");
  revalidatePath("/admin", "layout");
}

function validateRange(input: SimRangeInput): string | null {
  if (!input.seasonId) return "Wybierz sezon.";
  if (!input.divisionIds.length) return "Zaznacz co najmniej jedną dywizję.";
  if (!Number.isFinite(input.gwFrom) || !Number.isFinite(input.gwTo)) {
    return "Nieprawidłowy zakres kolejek.";
  }
  if (input.gwFrom < 1 || input.gwTo > 38) {
    return "Kolejki muszą być w zakresie 1–38.";
  }
  return null;
}

function normalizeRange(input: SimRangeInput): SimRangeInput {
  return {
    seasonId: input.seasonId,
    divisionIds: [...new Set(input.divisionIds.filter(Boolean))],
    gwFrom: Math.min(input.gwFrom, input.gwTo),
    gwTo: Math.max(input.gwFrom, input.gwTo),
  };
}

async function fetchRangeFixtures(
  supabase: Awaited<ReturnType<typeof requireAuth>>,
  range: SimRangeInput,
): Promise<{ rows: FixtureSimRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("fixtures")
    .select(
      "id, season_id, division_id, gameweek, home_team_id, away_team_id, is_playoff",
    )
    .eq("season_id", range.seasonId)
    .in("division_id", range.divisionIds)
    .gte("gameweek", range.gwFrom)
    .lte("gameweek", range.gwTo)
    .order("gameweek", { ascending: true });

  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as FixtureSimRow[], error: null };
}

async function applyUpdatesInChunks(
  supabase: Awaited<ReturnType<typeof requireAuth>>,
  updates: FixtureUpdate[],
): Promise<string | null> {
  for (let i = 0; i < updates.length; i += UPDATE_CHUNK) {
    const chunk = updates.slice(i, i + UPDATE_CHUNK);
    const results = await Promise.all(
      chunk.map((row) => {
        const { id, ...payload } = row;
        return supabase.from("fixtures").update(payload).eq("id", id);
      }),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) return failed.error.message;
  }
  return null;
}

/**
 * Remis barażowy → symulacja „ręcznej” decyzji admina (gole XI).
 * Zawsze kończy się decided (winner + reason).
 */
function simulatePlayoffDrawBreak(
  homeTeamId: string,
  awayTeamId: string,
  homeFpl: number,
  awayFpl: number,
): Pick<
  FixtureUpdate,
  | "home_h2h_points"
  | "away_h2h_points"
  | "tiebreaker_home_goals"
  | "tiebreaker_away_goals"
  | "tiebreaker_home_goals_conceded"
  | "tiebreaker_away_goals_conceded"
  | "tiebreaker_home_bench"
  | "tiebreaker_away_bench"
  | "tiebreaker_winner_id"
  | "tiebreaker_method"
  | "tiebreaker_reason"
  | "is_finished"
> {
  const homeWinsCoin = Math.random() < 0.5;
  const homeGoals = homeWinsCoin ? randInt(2, 4) : randInt(0, 1);
  const awayGoals = homeWinsCoin ? randInt(0, 1) : randInt(2, 4);
  const homeGoalsConceded = randInt(0, 3);
  const awayGoalsConceded = randInt(0, 3);
  const homeBench = randInt(1, 12);
  const awayBench = randInt(1, 12);

  let resolved = resolvePlayoffWinner({
    homeTeamId,
    awayTeamId,
    homeFpl,
    awayFpl,
    homeGoals,
    awayGoals,
    homeGoalsConceded,
    awayGoalsConceded,
    homeBench,
    awayBench,
  });

  if (resolved.status === "needs_manual") {
    const manualWinnerId = homeWinsCoin ? homeTeamId : awayTeamId;
    resolved = resolvePlayoffWinner({
      homeTeamId,
      awayTeamId,
      homeFpl,
      awayFpl,
      homeGoals,
      awayGoals,
      homeGoalsConceded,
      awayGoalsConceded,
      homeBench,
      awayBench,
      manualWinnerId,
    });
  }

  if (resolved.status !== "decided") {
    // teoretycznie nieosiągalne po manualWinnerId
    const winnerId = homeWinsCoin ? homeTeamId : awayTeamId;
    return {
      home_h2h_points: homeWinsCoin ? 2 : 0,
      away_h2h_points: homeWinsCoin ? 0 : 2,
      tiebreaker_home_goals: homeGoals,
      tiebreaker_away_goals: awayGoals,
      tiebreaker_home_goals_conceded: homeGoalsConceded,
      tiebreaker_away_goals_conceded: awayGoalsConceded,
      tiebreaker_home_bench: homeBench,
      tiebreaker_away_bench: awayBench,
      tiebreaker_winner_id: winnerId,
      tiebreaker_method: "MANUAL",
      tiebreaker_reason: "Rozstrzygnięcie symulacyjne (manual)",
      is_finished: true,
    };
  }

  const reasonByMethod: Record<string, string> = {
    FPL_POINTS: "Wyższa punktacja FPL",
    FPL: "Wyższa punktacja FPL",
    GOALS_XI: "Więcej goli zdobytych (Symulacja)",
    GOALS: "Więcej goli zdobytych (Symulacja)",
    GOALS_CONCEDED: "Mniej goli straconych (Symulacja)",
    CONCEDED: "Mniej goli straconych (Symulacja)",
    BENCH_POINTS: "Więcej punktów z ławki (Symulacja)",
    BENCH: "Więcej punktów z ławki (Symulacja)",
    MANUAL: "Coin toss / decyzja admina (Symulacja)",
    COIN_TOSS: "Coin toss (Symulacja)",
  };

  return {
    home_h2h_points: resolved.home_h2h_points,
    away_h2h_points: resolved.away_h2h_points,
    tiebreaker_home_goals: resolved.fields.homeGoals,
    tiebreaker_away_goals: resolved.fields.awayGoals,
    tiebreaker_home_goals_conceded: resolved.fields.homeGoalsConceded,
    tiebreaker_away_goals_conceded: resolved.fields.awayGoalsConceded,
    tiebreaker_home_bench: resolved.fields.homeBench,
    tiebreaker_away_bench: resolved.fields.awayBench,
    tiebreaker_winner_id: resolved.winnerId,
    tiebreaker_method: resolved.method,
    tiebreaker_reason: reasonByMethod[resolved.method] ?? resolved.reason,
    is_finished: true,
  };
}

function buildSimUpdates(
  fixtures: FixtureSimRow[],
  scenario: SimulatorScenarioId,
  /** Pre-rolled FPL per team×GW (wszyscy gracze, także bez meczu). */
  pointsByTeamGw: Map<string, number>,
): FixtureUpdate[] {
  const pointKey = (teamId: string, gw: number) => `${teamId}:${gw}`;

  // Mediana per (division × GW) — bez baraży
  const pointsByDivGw = new Map<string, Map<string, number>>();
  for (const f of fixtures) {
    if (f.is_playoff) continue;
    const home = pointsByTeamGw.get(pointKey(f.home_team_id, f.gameweek));
    const away = pointsByTeamGw.get(pointKey(f.away_team_id, f.gameweek));
    if (home == null || away == null) continue;
    const key = `${f.division_id}:${f.gameweek}`;
    let bucket = pointsByDivGw.get(key);
    if (!bucket) {
      bucket = new Map();
      pointsByDivGw.set(key, bucket);
    }
    bucket.set(f.home_team_id, home);
    bucket.set(f.away_team_id, away);
  }

  const bonusByTeamGw = new Map<string, 0 | 1>();
  for (const [key, divPoints] of pointsByDivGw) {
    const winners = computeMedianBonusSet(divPoints, 5);
    for (const teamId of divPoints.keys()) {
      bonusByTeamGw.set(
        `${key}:${teamId}`,
        winners.has(teamId) ? 1 : 0,
      );
    }
  }

  const updates: FixtureUpdate[] = [];
  for (const f of fixtures) {
    const home = pointsByTeamGw.get(pointKey(f.home_team_id, f.gameweek));
    const away = pointsByTeamGw.get(pointKey(f.away_team_id, f.gameweek));
    if (home == null || away == null) continue;

    const playoff = Boolean(f.is_playoff);
    const isDraw = home === away;

    if (playoff && isDraw) {
      const tb = simulatePlayoffDrawBreak(
        f.home_team_id,
        f.away_team_id,
        home,
        away,
      );
      updates.push({
        id: f.id,
        home_fpl_points: home,
        away_fpl_points: away,
        home_median_bonus: 0,
        away_median_bonus: 0,
        is_published: false,
        ...tb,
      });
      continue;
    }

    const h2h = resolveH2h(home, away);
    const gwKey = `${f.division_id}:${f.gameweek}`;
    updates.push({
      id: f.id,
      home_fpl_points: home,
      away_fpl_points: away,
      home_h2h_points: h2h.home,
      away_h2h_points: h2h.away,
      home_median_bonus: playoff
        ? 0
        : (bonusByTeamGw.get(`${gwKey}:${f.home_team_id}`) ?? 0),
      away_median_bonus: playoff
        ? 0
        : (bonusByTeamGw.get(`${gwKey}:${f.away_team_id}`) ?? 0),
      is_finished: true,
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
    });
  }

  return updates;
}

/**
 * Losuje punkty FPL dla WSZYSTKICH drużyn w zakresie GW
 * (także graczy bez meczu H2H w GW19/38).
 */
function rollScoresForAllTeams(
  teamIds: string[],
  fixtures: FixtureSimRow[],
  gwFrom: number,
  gwTo: number,
  scenario: SimulatorScenarioId,
): Map<string, number> {
  const pointKey = (teamId: string, gw: number) => `${teamId}:${gw}`;
  const map = new Map<string, number>();

  // Najpierw z meczów (pary H2H / baraże)
  for (const f of fixtures) {
    const pair = rollFplPair(scenario);
    map.set(pointKey(f.home_team_id, f.gameweek), pair.home);
    map.set(pointKey(f.away_team_id, f.gameweek), pair.away);
  }

  // Uzupełnij brakujące (gracze bez fixture w danym GW)
  for (let gw = gwFrom; gw <= gwTo; gw++) {
    for (const teamId of teamIds) {
      const key = pointKey(teamId, gw);
      if (!map.has(key)) {
        map.set(key, rollFplSolo(scenario));
      }
    }
  }

  return map;
}

/** Generuj wyniki wg scenariusza → is_published = false (brudnopis). */
export async function generateSimulatedResults(
  input: SimRangeInput & { scenario: SimulatorScenarioId },
): Promise<ActionState & { updated?: number }> {
  try {
    const range = normalizeRange(input);
    const bad = validateRange(range);
    if (bad) return { error: bad };

    if (!input.scenario) return { error: "Wybierz scenariusz." };

    const supabase = await requireAuth();
    const incomplete = await assertDivisionsFull(supabase, range.divisionIds);
    if (incomplete) return { error: incomplete };

    const { data: teamsRaw, error: teamsError } = await supabase
      .from("teams")
      .select("id, is_active")
      .in("division_id", range.divisionIds);
    if (teamsError) return { error: teamsError.message };
    const teamIds = (teamsRaw ?? [])
      .filter((t) => t.is_active !== false)
      .map((t) => t.id as string);

    const { rows, error } = await fetchRangeFixtures(supabase, range);
    if (error) return { error };
    if (!teamIds.length) {
      return { error: "Brak aktywnych drużyn w zaznaczonych dywizjach." };
    }

    const pointsByTeamGw = rollScoresForAllTeams(
      teamIds,
      rows,
      range.gwFrom,
      range.gwTo,
      input.scenario,
    );

    const scoreRows = [...pointsByTeamGw.entries()].map(([key, fpl_points]) => {
      const [team_id, gwStr] = key.split(":");
      return {
        season_id: range.seasonId,
        team_id,
        gameweek: Number(gwStr),
        fpl_points,
        is_published: false,
      };
    });
    const scoreErr = await upsertTeamGameweekScores(supabase, scoreRows);
    if (scoreErr) return { error: scoreErr };

    let updates: ReturnType<typeof buildSimUpdates> = [];
    if (rows.length) {
      updates = buildSimUpdates(rows, input.scenario, pointsByTeamGw);
      const writeError = await applyUpdatesInChunks(supabase, updates);
      if (writeError) return { error: writeError };
    }

    revalidateSim();
    const fixtureNote = rows.length
      ? `${updates.length} meczów H2H`
      : "brak meczów H2H (tylko FA Ranking)";
    return {
      error: null,
      success: `Wygenerowano brudnopis: ${fixtureNote} + ${scoreRows.length} wyników FPL · ${scenarioLabel(input.scenario)} · GW${range.gwFrom}–${range.gwTo}.`,
      updated: updates.length,
    };
  } catch (e) {
    console.error("[generateSimulatedResults]", e);
    return {
      error: e instanceof Error ? e.message : "Błąd generowania symulacji.",
    };
  }
}

/** Publikuj wybrane mecze w zakresie → is_published = true. */
export async function publishSimulatedRange(
  input: SimRangeInput,
): Promise<ActionState & { updated?: number }> {
  try {
    const range = normalizeRange(input);
    const bad = validateRange(range);
    if (bad) return { error: bad };

    const supabase = await requireAuth();
    const incomplete = await assertDivisionsFull(supabase, range.divisionIds);
    if (incomplete) return { error: incomplete };

    const { data, error } = await supabase
      .from("fixtures")
      .update({ is_published: true }, { count: "exact" })
      .eq("season_id", range.seasonId)
      .in("division_id", range.divisionIds)
      .gte("gameweek", range.gwFrom)
      .lte("gameweek", range.gwTo)
      .select("id");

    if (error) return { error: error.message };
    const updated = data?.length ?? 0;
    if (!updated) {
      return {
        error: `Brak meczów do publikacji w GW${range.gwFrom}–${range.gwTo}.`,
      };
    }

    for (let gw = range.gwFrom; gw <= range.gwTo; gw++) {
      const scorePubErr = await publishTeamGameweekScores(
        supabase,
        range.seasonId,
        gw,
      );
      if (scorePubErr) return { error: scorePubErr };
    }

    revalidateSim();
    return {
      error: null,
      success: `Opublikowano ${updated} meczów (GW${range.gwFrom}–${range.gwTo}) → Strefa Gracza + FA Ranking.`,
      updated,
    };
  } catch (e) {
    console.error("[publishSimulatedRange]", e);
    return {
      error: e instanceof Error ? e.message : "Błąd publikacji.",
    };
  }
}

/** Alias API z masterplanu. */
export async function publishSimulation(
  input: SimRangeInput,
): Promise<ActionState & { updated?: number }> {
  return publishSimulatedRange(input);
}

/** Cofnij publikację w zakresie → is_published = false. */
export async function unpublishSimulatedRange(
  input: SimRangeInput,
): Promise<ActionState & { updated?: number }> {
  try {
    const range = normalizeRange(input);
    const bad = validateRange(range);
    if (bad) return { error: bad };

    const supabase = await requireAuth();
    const { data, error } = await supabase
      .from("fixtures")
      .update({ is_published: false }, { count: "exact" })
      .eq("season_id", range.seasonId)
      .in("division_id", range.divisionIds)
      .gte("gameweek", range.gwFrom)
      .lte("gameweek", range.gwTo)
      .select("id");

    if (error) return { error: error.message };
    const updated = data?.length ?? 0;

    const { data: teamsRaw } = await supabase
      .from("teams")
      .select("id")
      .in("division_id", range.divisionIds);
    const teamIds = (teamsRaw ?? []).map((t) => t.id as string);

    for (let gw = range.gwFrom; gw <= range.gwTo; gw++) {
      const scoreUnpubErr = await unpublishTeamGameweekScores(
        supabase,
        range.seasonId,
        gw,
        teamIds,
      );
      if (scoreUnpubErr) return { error: scoreUnpubErr };
    }

    revalidateSim();
    return {
      error: null,
      success: `Cofnięto publikację: ${updated} meczów → brudnopis (+ FA Ranking).`,
      updated,
    };
  } catch (e) {
    console.error("[unpublishSimulatedRange]", e);
    return {
      error: e instanceof Error ? e.message : "Błąd cofania publikacji.",
    };
  }
}

/**
 * Wyczyść wyniki (Undo): FPL/H2H/mediana/TB → null/0, is_finished=false, is_published=false.
 */
export async function clearSimulatedRange(
  input: SimRangeInput,
): Promise<ActionState & { updated?: number }> {
  try {
    const range = normalizeRange(input);
    const bad = validateRange(range);
    if (bad) return { error: bad };

    const supabase = await requireAuth();
    const { data, error } = await supabase
      .from("fixtures")
      .update({ ...CLEAR_PAYLOAD }, { count: "exact" })
      .eq("season_id", range.seasonId)
      .in("division_id", range.divisionIds)
      .gte("gameweek", range.gwFrom)
      .lte("gameweek", range.gwTo)
      .select("id");

    if (error) return { error: error.message };
    const updated = data?.length ?? 0;

    const { data: teamsRaw } = await supabase
      .from("teams")
      .select("id")
      .in("division_id", range.divisionIds);
    const teamIds = (teamsRaw ?? []).map((t) => t.id as string);

    for (let gw = range.gwFrom; gw <= range.gwTo; gw++) {
      const scoreClearErr = await clearTeamGameweekScores(
        supabase,
        range.seasonId,
        gw,
        teamIds,
      );
      if (scoreClearErr) return { error: scoreClearErr };
    }

    if (!updated && !teamIds.length) {
      return {
        error: `Brak meczów do wyczyszczenia w GW${range.gwFrom}–${range.gwTo}.`,
      };
    }

    revalidateSim();
    return {
      error: null,
      success: `Wyczyszczono ${updated} meczów + wyniki FPL (GW${range.gwFrom}–${range.gwTo}) → surowy terminarz.`,
      updated,
    };
  } catch (e) {
    console.error("[clearSimulatedRange]", e);
    return {
      error: e instanceof Error ? e.message : "Błąd czyszczenia wyników.",
    };
  }
}

/** Alias API z masterplanu. */
export async function clearSimulation(
  input: SimRangeInput,
): Promise<ActionState & { updated?: number }> {
  return clearSimulatedRange(input);
}

/** Utwórz pary barażowe dla wszystkich dywizji (GW19 lub GW38). */
export async function ensurePlayoffFixtures(
  seasonId: string,
  playoffGw?: number | null,
): Promise<ActionState & { created?: number; playoffGw?: number }> {
  try {
    if (!seasonId) return { error: "Wybierz sezon." };

    const supabase = await requireAuth();
    const { data: season } = await supabase
      .from("seasons")
      .select("id, name")
      .eq("id", seasonId)
      .maybeSingle();

    const phase = resolveSeasonPhase(season?.name);
    const gw =
      playoffGw && isPlayoffGameweek(playoffGw)
        ? playoffGw
        : phase === "SPRING"
          ? 38
          : 19;

    const result = await generateGlobalPlayoffs(seasonId, gw);
    return {
      error: result.error,
      success: result.success,
      created: result.created,
      playoffGw: gw,
    };
  } catch (e) {
    console.error("[ensurePlayoffFixtures]", e);
    return {
      error: e instanceof Error ? e.message : "Błąd tworzenia par barażowych.",
    };
  }
}
