"use server";

import { createClient } from "@/lib/supabase/server";
import type { PlayerProjectionInput } from "@/lib/stats-lab/playerProjectionTable";
import { upcomingGameweeks } from "@/lib/stats-lab/playerProjectionTable";
import {
  buildAllPlayerGwProjections,
  buildPlannerXPtsContext,
} from "@/lib/stats-lab/plannerEngine";
import {
  buildStatsLabProjections,
  type ProjectionsFixturePrediction,
  type ProjectionsHistoryXgRow,
} from "@/lib/stats-lab/projectionsEngine";
import { getCachedStatsLabDataset } from "@/lib/stats-lab/serverDataCache";
import { DEFAULT_STATS_LAB_SEASON } from "@/lib/stats-lab/syncEngine";
import type { FplLabPlayer } from "@/lib/stats-lab/types";
import {
  readFiniteChance,
  readNewsAdded,
} from "@/lib/stats-lab/availabilityMarker";

async function requireAuth() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji — zaloguj się w panelu admina.");
  return supabase;
}

export type PlayerProjectionsClub = {
  id: number;
  shortName: string;
  name: string;
};

export type PlayerProjectionsPayload = {
  seasonCode: string;
  startGw: number;
  gameweeks: number[];
  clubs: PlayerProjectionsClub[];
  rows: PlayerProjectionInput[];
};

function lastFinishedGwOf(datasetLast: number, fixtures: { gameweek: number | null; finished: boolean }[]): number {
  let maxFinished = Math.max(0, Math.round(datasetLast) || 0);
  for (const fixture of fixtures) {
    if (!fixture.finished) continue;
    const gw = Number(fixture.gameweek);
    if (Number.isFinite(gw) && gw > maxFinished) maxFinished = gw;
  }
  return Math.max(0, Math.min(38, maxFinished));
}

function teamCsPcts(
  player: FplLabPlayer,
  fixtureIds: number[],
  byFixture: Map<number, ProjectionsFixturePrediction>,
): number[] {
  if (player.element_type !== 1 && player.element_type !== 2) return [];
  const out: number[] = [];
  for (const fixtureId of fixtureIds) {
    const pred = byFixture.get(fixtureId);
    if (!pred) continue;
    if (pred.homeTeamId === player.fpl_team_id) out.push(pred.csPctHome);
    else if (pred.awayTeamId === player.fpl_team_id) out.push(pred.csPctAway);
  }
  return out;
}

/**
 * Odczyt predykcji piłkarzy. Składa istniejące xPts i FDR.
 * Nie zapisuje, nie synchronizuje i nie zmienia wzorów.
 */
export async function queryStatsLabPlayerProjectionsAction(input?: {
  seasonCode?: string;
}): Promise<PlayerProjectionsPayload> {
  await requireAuth();
  const seasonCode = input?.seasonCode || DEFAULT_STATS_LAB_SEASON;
  const dataset = await getCachedStatsLabDataset(seasonCode);
  const lastFinishedGw = lastFinishedGwOf(
    dataset.lastFinishedGw,
    dataset.fixtures,
  );
  const gameweeks = upcomingGameweeks(lastFinishedGw, 6);
  const startGw = gameweeks[0] ?? Math.min(38, lastFinishedGw + 1);
  const endGw = gameweeks[gameweeks.length - 1] ?? startGw;

  const historyXg: ProjectionsHistoryXgRow[] = dataset.playerGwHistory.map(
    (row) => ({
      fixture_id: Number(row.fixture_id),
      was_home: Boolean(row.was_home),
      expected_goals: Number(row.expected_goals ?? 0),
    }),
  );

  const projections = buildStatsLabProjections({
    seasonCode,
    clubs: dataset.clubs,
    fixtures: dataset.fixtures,
    historyXg,
    startGw,
    endGw,
    lastFinishedGw,
  });

  const ctx = buildPlannerXPtsContext({
    players: dataset.players,
    history: dataset.playerGwHistory,
    fixtures: dataset.fixtures,
    projections,
  });
  const byElement = buildAllPlayerGwProjections(ctx, startGw, endGw);
  const byFixture = new Map<number, ProjectionsFixturePrediction>();
  for (const list of Object.values(projections.matchupsByGw)) {
    for (const pred of list) byFixture.set(pred.fixtureId, pred);
  }

  const clubById = new Map(
    dataset.clubs.map((club) => [club.fpl_team_id, club] as const),
  );

  const rows: PlayerProjectionInput[] = dataset.players.map((player) => {
    const club = clubById.get(player.fpl_team_id);
    const raw = player as FplLabPlayer & {
      chance_of_playing_this_round?: unknown;
      news_added?: unknown;
    };
    const hasThis =
      Object.prototype.hasOwnProperty.call(raw, "chance_of_playing_this_round");
    const hasNewsAdded = Object.prototype.hasOwnProperty.call(raw, "news_added");
    const byGw = byElement[player.fpl_element_id] ?? {};
    return {
      elementId: player.fpl_element_id,
      webName: player.web_name,
      position: player.element_type,
      clubId: player.fpl_team_id,
      clubShort: club?.short_name ?? "—",
      clubPulseCode: club?.pulse_code ?? null,
      priceTenths: Math.round(Number(player.now_cost) || 0),
      ownership: Number(player.selected_by_percent) || 0,
      status: String(player.status ?? "a"),
      chanceNext: readFiniteChance(player.chance_of_playing_next_round),
      chanceThis: hasThis
        ? readFiniteChance(raw.chance_of_playing_this_round)
        : undefined,
      news: typeof player.news === "string" ? player.news : "",
      newsAdded: hasNewsAdded ? readNewsAdded(raw.news_added) : undefined,
      gameweeks: gameweeks.map((gw) => {
        const proj = byGw[gw];
        const blank = !proj || proj.isBlank;
        return {
          gw,
          isBlank: blank,
          xPts: blank ? null : proj.xPts,
          p60: blank ? null : proj.p60,
          expectedMinutes: blank ? 0 : proj.expectedMinutes,
          fdrLevels: blank ? [] : proj.fixtures.map((fixture) => fixture.fdrLevel),
          opponents: blank
            ? []
            : proj.fixtures.map((fixture) => fixture.tickerLabel),
          teamCsPcts: blank
            ? []
            : teamCsPcts(
                player,
                proj.fixtures.map((fixture) => fixture.fixtureId),
                byFixture,
              ),
        };
      }),
    };
  });

  const clubs: PlayerProjectionsClub[] = dataset.clubs
    .slice()
    .sort((a, b) => a.short_name.localeCompare(b.short_name))
    .map((club) => ({
      id: club.fpl_team_id,
      shortName: club.short_name,
      name: club.name,
    }));

  return { seasonCode, startGw, gameweeks, clubs, rows };
}
