import type { DreamTeamPlayer, SquadPlayer } from "@/types/highlights";

export const mapDreamTeamPlayer = (player: DreamTeamPlayer | SquadPlayer) => ({
  ...player,
  elementId: player.elementId ?? null,
  displayName: player.name || "Zawodnik",
  position: player.position ?? 0,
});

export const inferFormation = (players: Array<{ position?: number }>) => {
  let def = 0;
  let mid = 0;
  let fwd = 0;
  players.forEach((p) => {
    if (p.position === 2) def += 1;
    else if (p.position === 3) mid += 1;
    else if (p.position === 4) fwd += 1;
  });
  return `${def}-${mid}-${fwd}`;
};
