/**
 * End of Season — statusy awansów / spadków (Etap 1).
 * Czysta logika (bez UI). Boundary: Tier 1 nie awansuje, ostatni AKTYWNY tier nie spada.
 * Aktywna dywizja = dokładnie 10 graczy. Niepełne → WAITING_ROOM (poza piramidą).
 */

import {
  PLAYOFF_HIGHER_SEED_INDEX,
  PLAYOFF_LOWER_SEED_INDEX,
  sortStandingsDesc,
} from "@/lib/admin/playoffPairs";
import { buildStandings, type StandingFixtureInput } from "@/lib/admin/standings";

/** Status wywalczony przez drużynę na koniec fazy + baraży. */
export type TeamSeasonStatus =
  | "CHAMPION"
  | "RUNNER_UP"
  | "THIRD_PLACE"
  | "PROMOTED_DIRECTLY"
  | "PROMOTED_PLAYOFF"
  | "SAFE"
  | "RELEGATED_PLAYOFF"
  | "RELEGATED_DIRECTLY"
  /** Niepełna dywizja (< 10) — poza rozliczeniem, trafia do poczekalni draftu. */
  | "WAITING_ROOM";

export type TeamEndSeasonAssignment = {
  status: TeamSeasonStatus;
  /**
   * Tier docelowy w kolejnym sezonie (w tej samej piramidzie).
   * null = poczekalnia / rekrutacja (WAITING_ROOM).
   */
  next_tier: number | null;
  current_tier: number;
  division_id: string;
  /** Pozycja 1-based w tabeli fazy zasadniczej (0 = n/d). */
  position: number;
  /** true gdy status zależy od barażu, a mecz nie ma jeszcze zwycięzcy. */
  playoffPending?: boolean;
};

export type PlayoffResultInput = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_fpl_points: number | null;
  away_fpl_points: number | null;
  home_h2h_points: number | null;
  away_h2h_points: number | null;
  is_finished: boolean;
  tiebreaker_winner_id: string | null;
};

export type DivisionStandingsInput = {
  id: string;
  name: string;
  tier: number;
  pyramid_id: string;
  /** Posortowana DESC (indeks 0 = lider). */
  rankedTeamIds: string[];
};

/**
 * Zwycięzca barażu: tiebreaker_winner_id → FPL → marker H2H 2:0.
 * null = brak rozstrzygnięcia.
 */
export function resolvePlayoffMatchWinnerId(
  f: PlayoffResultInput,
): string | null {
  if (
    f.tiebreaker_winner_id &&
    (f.tiebreaker_winner_id === f.home_team_id ||
      f.tiebreaker_winner_id === f.away_team_id)
  ) {
    return f.tiebreaker_winner_id;
  }
  if (
    f.home_fpl_points != null &&
    f.away_fpl_points != null &&
    f.home_fpl_points !== f.away_fpl_points
  ) {
    return f.home_fpl_points > f.away_fpl_points
      ? f.home_team_id
      : f.away_team_id;
  }
  if (f.is_finished && f.home_h2h_points === 2) return f.home_team_id;
  if (f.is_finished && f.away_h2h_points === 2) return f.away_team_id;
  return null;
}

function findPlayoffForTeam(
  teamId: string,
  playoffs: PlayoffResultInput[],
): PlayoffResultInput | null {
  return (
    playoffs.find(
      (p) => p.home_team_id === teamId || p.away_team_id === teamId,
    ) ?? null
  );
}

function didTeamWinPlayoff(
  teamId: string,
  playoffs: PlayoffResultInput[],
): { won: boolean; pending: boolean } {
  const match = findPlayoffForTeam(teamId, playoffs);
  if (!match) return { won: false, pending: true };
  const winnerId = resolvePlayoffMatchWinnerId(match);
  if (!winnerId) return { won: false, pending: true };
  return { won: winnerId === teamId, pending: false };
}

/**
 * Ewaluacja jednej AKTYWNEJ dywizji (10/10) w ramach piramidy.
 * `maxTier` = ACTUAL_MAX_TIER (najwyższy tier spośród aktywnych dywizji).
 */
export function evaluateDivisionEndStatuses(opts: {
  division: DivisionStandingsInput;
  maxTier: number;
  playoffs: PlayoffResultInput[];
}): Map<string, TeamEndSeasonAssignment> {
  const { division, maxTier, playoffs } = opts;
  const tier = division.tier;
  const ranked = division.rankedTeamIds;
  const out = new Map<string, TeamEndSeasonAssignment>();

  const isTop = tier === 1;
  const isBottom = tier === maxTier;
  const isOnlyDivision = isTop && isBottom;

  const assign = (
    index: number,
    status: TeamSeasonStatus,
    next_tier: number,
    playoffPending?: boolean,
  ) => {
    const teamId = ranked[index];
    if (!teamId) return;
    out.set(teamId, {
      status,
      next_tier,
      current_tier: tier,
      division_id: division.id,
      position: index + 1,
      playoffPending,
    });
  };

  // --- Jedyna dywizja w piramidzie: podium + SAFE, bez awansów/spadków ---
  if (isOnlyDivision) {
    for (let i = 0; i < ranked.length; i++) {
      if (i === 0) assign(i, "CHAMPION", 1);
      else if (i === 1) assign(i, "RUNNER_UP", 1);
      else if (i === 2) assign(i, "THIRD_PLACE", 1);
      else assign(i, "SAFE", 1);
    }
    return out;
  }

  // --- SCENARIUSZ A: Tier 1 ---
  if (isTop) {
    for (let i = 0; i < ranked.length; i++) {
      if (i === 0) {
        assign(i, "CHAMPION", 1);
      } else if (i === 1) {
        assign(i, "RUNNER_UP", 1);
      } else if (i === 2) {
        assign(i, "THIRD_PLACE", 1);
      } else if (i >= 3 && i <= 6) {
        assign(i, "SAFE", 1);
      } else if (i === PLAYOFF_HIGHER_SEED_INDEX) {
        const teamId = ranked[i]!;
        const { won, pending } = didTeamWinPlayoff(teamId, playoffs);
        if (pending) {
          assign(i, "SAFE", 1, true);
        } else if (won) {
          assign(i, "SAFE", 1);
        } else {
          assign(i, "RELEGATED_PLAYOFF", 2);
        }
      } else if (i >= 8) {
        assign(i, "RELEGATED_DIRECTLY", Math.min(2, maxTier));
      } else {
        assign(i, "SAFE", 1);
      }
    }
    return out;
  }

  // --- SCENARIUSZ B: Najniższa dywizja ---
  if (isBottom) {
    const upTier = Math.max(1, maxTier - 1);
    for (let i = 0; i < ranked.length; i++) {
      if (i === 0 || i === 1) {
        assign(i, "PROMOTED_DIRECTLY", upTier);
      } else if (i === PLAYOFF_LOWER_SEED_INDEX) {
        const teamId = ranked[i]!;
        const { won, pending } = didTeamWinPlayoff(teamId, playoffs);
        if (pending) {
          assign(i, "SAFE", maxTier, true);
        } else if (won) {
          assign(i, "PROMOTED_PLAYOFF", upTier);
        } else {
          assign(i, "SAFE", maxTier);
        }
      } else {
        // [3]…[9] — z najniższej nikt nie spada
        assign(i, "SAFE", maxTier);
      }
    }
    return out;
  }

  // --- SCENARIUSZ C: Środkowe ---
  {
    const upTier = tier - 1;
    const downTier = tier + 1;
    for (let i = 0; i < ranked.length; i++) {
      if (i === 0 || i === 1) {
        assign(i, "PROMOTED_DIRECTLY", upTier);
      } else if (i === PLAYOFF_LOWER_SEED_INDEX) {
        const teamId = ranked[i]!;
        const { won, pending } = didTeamWinPlayoff(teamId, playoffs);
        if (pending) {
          assign(i, "SAFE", tier, true);
        } else if (won) {
          assign(i, "PROMOTED_PLAYOFF", upTier);
        } else {
          assign(i, "SAFE", tier);
        }
      } else if (i >= 3 && i <= 6) {
        assign(i, "SAFE", tier);
      } else if (i === PLAYOFF_HIGHER_SEED_INDEX) {
        const teamId = ranked[i]!;
        const { won, pending } = didTeamWinPlayoff(teamId, playoffs);
        if (pending) {
          assign(i, "SAFE", tier, true);
        } else if (won) {
          assign(i, "SAFE", tier);
        } else {
          assign(i, "RELEGATED_PLAYOFF", downTier);
        }
      } else if (i >= 8) {
        assign(i, "RELEGATED_DIRECTLY", Math.min(downTier, maxTier));
      } else {
        assign(i, "SAFE", tier);
      }
    }
  }

  return out;
}

/** Ranking ID z fixtures fazy zasadniczej (bez baraży). */
export function rankedTeamIdsFromFixtures(
  fixtures: StandingFixtureInput[],
  teamIds: string[],
): string[] {
  const standings = buildStandings(fixtures, teamIds);
  return sortStandingsDesc(standings).map((r) => r.teamId);
}

/** Etykieta PL statusu (UI / raport). */
export function teamSeasonStatusLabel(status: TeamSeasonStatus): string {
  switch (status) {
    case "CHAMPION":
      return "Mistrz";
    case "RUNNER_UP":
      return "Wicemistrz";
    case "THIRD_PLACE":
      return "3. miejsce";
    case "PROMOTED_DIRECTLY":
      return "Awans bezpośredni";
    case "PROMOTED_PLAYOFF":
      return "Awans (baraż)";
    case "SAFE":
      return "Utrzymanie";
    case "RELEGATED_PLAYOFF":
      return "Spadek (baraż)";
    case "RELEGATED_DIRECTLY":
      return "Spadek bezpośredni";
    case "WAITING_ROOM":
      return "Poczekalnia / rekrutacja";
  }
}
