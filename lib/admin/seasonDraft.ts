/**
 * Draft Board — stan przejścia sezonu + kaskady rezygnacji.
 * Kolumny = next_tier (gdzie zagrają w nowym sezonie) — tylko aktywne dywizje.
 * Poczekalnia = WAITING_ROOM + świeżacy; przy 10/10 → nowy tier.
 */

import type { TeamSeasonStatus } from "@/lib/admin/endSeasonStatuses";
import { DIVISION_CAPACITY } from "@/lib/admin/divisionCapacity";

export const DRAFT_TARGET_SIZE = DIVISION_CAPACITY;

export type DraftPlayer = {
  /** null = świeżak jeszcze nie w DB */
  teamId: string | null;
  tempId: string;
  isNew: boolean;
  cascadePromotion: boolean;
  originalStatus: TeamSeasonStatus | "NEW";
  /** Tier w kończącym się sezonie (dla świeżaka = max) */
  oldTier: number;
  /** Kolumna draftu = docelowy tier; 0 = poczekalnia */
  nextTier: number;
  pyramidId: string;
  oldDivisionId: string | null;
  oldDivisionName: string;
  totalPoints: number;
  fplPoints: number;
  position: number;
  manager_name: string;
  discord_nick: string;
  fpl_id: string | null;
  fpl_team_name: string | null;
  chosen_club: string;
};

export type DraftColumn = {
  tier: number;
  label: string;
  players: DraftPlayer[];
};

export type DraftBoardState = {
  seasonId: string;
  seasonName: string;
  pyramidId: string;
  pyramidName: string;
  maxTier: number;
  columns: DraftColumn[];
  /** Niepełne dywizje + świeżacy — poza kolumnami ligowymi. */
  waitingRoom: DraftPlayer[];
  resigned: DraftPlayer[];
  suggestedNextSeasonName: string;
  nextPhase: "AUTUMN" | "SPRING";
  bergerGwOffset: number;
};

export type NewPlayerInput = {
  manager_name: string;
  discord_nick: string;
  chosen_club: string;
  fpl_id?: string | null;
  fpl_team_name?: string | null;
};

function sortDraftPlayers(a: DraftPlayer, b: DraftPlayer): number {
  if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
  if (b.fplPoints !== a.fplPoints) return b.fplPoints - a.fplPoints;
  return a.manager_name.localeCompare(b.manager_name, "pl");
}

export function columnCount(col: DraftColumn): number {
  return col.players.length;
}

export function isColumnFull(col: DraftColumn): boolean {
  return col.players.length === DRAFT_TARGET_SIZE;
}

export function isBoardBalanced(state: DraftBoardState): boolean {
  return (
    state.columns.length > 0 &&
    state.columns.every((c) => c.players.length === DRAFT_TARGET_SIZE)
  );
}

/** Kandydat do awansu kaskadowego z niższej kolumny. */
export function isCascadeCandidate(p: DraftPlayer): boolean {
  if (p.cascadePromotion) return true;
  if (p.originalStatus === "NEW") return true;
  if (p.originalStatus === "WAITING_ROOM") return false;
  if (
    p.originalStatus === "PROMOTED_DIRECTLY" ||
    p.originalStatus === "PROMOTED_PLAYOFF"
  ) {
    return false;
  }
  if (
    p.originalStatus === "RELEGATED_DIRECTLY" ||
    p.originalStatus === "RELEGATED_PLAYOFF"
  ) {
    return false;
  }
  return true;
}

/**
 * Usuwa gracza z draftu (kolumna lub poczekalnia) i uruchamia kaskadę w dół.
 */
export function applyResignation(
  state: DraftBoardState,
  tempId: string,
): DraftBoardState {
  const columns = state.columns.map((c) => ({
    ...c,
    players: [...c.players],
  }));
  let waitingRoom = [...state.waitingRoom];
  let removed: DraftPlayer | null = null;
  let removedTier = 0;

  const waitIdx = waitingRoom.findIndex((p) => p.tempId === tempId);
  if (waitIdx >= 0) {
    removed = waitingRoom[waitIdx]!;
    waitingRoom.splice(waitIdx, 1);
    return {
      ...state,
      waitingRoom,
      resigned: [...state.resigned, removed],
    };
  }

  for (const col of columns) {
    const idx = col.players.findIndex((p) => p.tempId === tempId);
    if (idx >= 0) {
      removed = col.players[idx]!;
      removedTier = col.tier;
      col.players.splice(idx, 1);
      break;
    }
  }
  if (!removed) return state;

  for (let tier = removedTier; tier < state.maxTier; tier++) {
    const upper = columns.find((c) => c.tier === tier);
    const lower = columns.find((c) => c.tier === tier + 1);
    if (!upper || !lower) break;
    if (upper.players.length >= DRAFT_TARGET_SIZE) break;

    const candidates = lower.players
      .filter(isCascadeCandidate)
      .sort(sortDraftPlayers);
    const pick = candidates[0];
    if (!pick) break;

    lower.players = lower.players.filter((p) => p.tempId !== pick.tempId);
    upper.players.push({
      ...pick,
      nextTier: tier,
      cascadePromotion: true,
    });
    upper.players.sort(sortDraftPlayers);
  }

  return {
    ...state,
    columns: columns.map((c) => ({
      ...c,
      players: [...c.players].sort(sortDraftPlayers),
    })),
    waitingRoom,
    resigned: [...state.resigned, removed],
  };
}

/** Świeżak → poczekalnia (nie do kolumn ligowych). */
export function addNewPlayerToDraft(
  state: DraftBoardState,
  input: NewPlayerInput,
): DraftBoardState {
  const player: DraftPlayer = {
    teamId: null,
    tempId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    isNew: true,
    cascadePromotion: false,
    originalStatus: "NEW",
    oldTier: state.maxTier,
    nextTier: 0,
    pyramidId: state.pyramidId,
    oldDivisionId: null,
    oldDivisionName: "Poczekalnia",
    totalPoints: 0,
    fplPoints: 0,
    position: 99,
    manager_name: input.manager_name.trim(),
    discord_nick: input.discord_nick.trim(),
    fpl_id: input.fpl_id?.trim() || null,
    fpl_team_name: input.fpl_team_name?.trim() || null,
    chosen_club: input.chosen_club.trim() || "TBD",
  };

  return {
    ...state,
    waitingRoom: [...state.waitingRoom, player],
  };
}

/**
 * Gdy poczekalnia ma dokładnie 10 osób → nowa kolumna (kolejny tier).
 */
export function promoteWaitingRoomToNewTier(
  state: DraftBoardState,
): DraftBoardState | { error: string } {
  if (state.waitingRoom.length !== DRAFT_TARGET_SIZE) {
    return {
      error: `Poczekalnia musi mieć dokładnie ${DRAFT_TARGET_SIZE} graczy (obecnie ${state.waitingRoom.length}).`,
    };
  }

  const newTier = state.maxTier + 1;
  const players = state.waitingRoom.map((p) => ({
    ...p,
    nextTier: newTier,
    originalStatus:
      p.originalStatus === "WAITING_ROOM" ? ("SAFE" as const) : p.originalStatus,
  }));

  const newCol: DraftColumn = {
    tier: newTier,
    label: `Dywizja ${newTier}`,
    players: [...players].sort(sortDraftPlayers),
  };

  return {
    ...state,
    maxTier: newTier,
    columns: [...state.columns, newCol].sort((a, b) => a.tier - b.tier),
    waitingRoom: [],
  };
}

export function suggestNextSeasonName(
  currentName: string,
  _nextPhase?: "AUTUMN" | "SPRING",
): string {
  const match = currentName.match(/Sezon\s+(\d+)/i);
  const n = match ? Number(match[1]) + 1 : 2;
  return `Sezon ${Math.max(1, n)}`;
}

/** Nazwa kolejnego sezonu na podstawie liczby istniejących rekordów (Sezon N). */
export function nextSeasonNameFromCount(existingSeasonCount: number): string {
  return `Sezon ${Math.max(1, existingSeasonCount + 1)}`;
}

/**
 * Przenieś gracza z poczekalni do niepełnej kolumny draftu (np. 8/10 → 9/10).
 */
export function assignWaitingPlayerToTier(
  state: DraftBoardState,
  tempId: string,
  tier: number,
): DraftBoardState | { error: string } {
  const col = state.columns.find((c) => c.tier === tier);
  if (!col) return { error: `Brak kolumny Tier ${tier} w drafcie.` };
  if (col.players.length >= DRAFT_TARGET_SIZE) {
    return {
      error: `Tier ${tier} jest już pełny (${DRAFT_TARGET_SIZE}/${DRAFT_TARGET_SIZE}).`,
    };
  }

  const idx = state.waitingRoom.findIndex((p) => p.tempId === tempId);
  if (idx < 0) return { error: "Nie znaleziono gracza w poczekalni." };

  const player = state.waitingRoom[idx]!;
  const waitingRoom = state.waitingRoom.filter((p) => p.tempId !== tempId);
  const columns = state.columns.map((c) => {
    if (c.tier !== tier) return c;
    return {
      ...c,
      players: [
        ...c.players,
        {
          ...player,
          nextTier: tier,
          cascadePromotion: false,
        },
      ].sort(sortDraftPlayers),
    };
  });

  return { ...state, waitingRoom, columns };
}

export type SerializableDraftPayload = {
  seasonId: string;
  pyramidId: string;
  suggestedNextSeasonName: string;
  nextPhase: "AUTUMN" | "SPRING";
  bergerGwOffset: number;
  resignedTeamIds: string[];
  /** Gracze z poczekalni → w nowym sezonie bez dywizji (division_id null). */
  waitingRoomTeamIds: string[];
  waitingRoomNewPlayers: Array<{
    manager_name: string;
    discord_nick: string;
    chosen_club: string;
    fpl_id: string | null;
    fpl_team_name: string | null;
  }>;
  columns: Array<{
    tier: number;
    label: string;
    players: Array<{
      teamId: string | null;
      isNew: boolean;
      manager_name: string;
      discord_nick: string;
      chosen_club: string;
      fpl_id: string | null;
      fpl_team_name: string | null;
    }>;
  }>;
};

export function toSerializableDraft(state: DraftBoardState): SerializableDraftPayload {
  return {
    seasonId: state.seasonId,
    pyramidId: state.pyramidId,
    suggestedNextSeasonName: state.suggestedNextSeasonName,
    nextPhase: state.nextPhase,
    bergerGwOffset: state.bergerGwOffset,
    resignedTeamIds: state.resigned
      .map((p) => p.teamId)
      .filter((id): id is string => Boolean(id)),
    waitingRoomTeamIds: state.waitingRoom
      .map((p) => p.teamId)
      .filter((id): id is string => Boolean(id)),
    waitingRoomNewPlayers: state.waitingRoom
      .filter((p) => p.isNew || !p.teamId)
      .map((p) => ({
        manager_name: p.manager_name,
        discord_nick: p.discord_nick,
        chosen_club: p.chosen_club,
        fpl_id: p.fpl_id,
        fpl_team_name: p.fpl_team_name,
      })),
    columns: state.columns.map((c) => ({
      tier: c.tier,
      label: c.label,
      players: c.players.map((p) => ({
        teamId: p.teamId,
        isNew: p.isNew,
        manager_name: p.manager_name,
        discord_nick: p.discord_nick,
        chosen_club: p.chosen_club,
        fpl_id: p.fpl_id,
        fpl_team_name: p.fpl_team_name,
      })),
    })),
  };
}
