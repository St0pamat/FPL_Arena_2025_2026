import { PLAYERS_DATA } from "@/data/players";
import type { Player } from "@/types/player";

export const TEAM_BY_NAME: Record<string, Player> = Object.fromEntries(
  PLAYERS_DATA.map((p) => [p.team, p])
);

export const PLAYER_BY_ID: Record<number, Player> = Object.fromEntries(
  PLAYERS_DATA.map((p) => [p.id, p])
);
