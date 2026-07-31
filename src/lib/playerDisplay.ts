import type { Player } from "@arena/types/player";

function normalizeNameKey(name: string): string {
  return name.trim().toLocaleLowerCase("pl");
}

/** Pseudonim (discord) jest praktycznie tym samym co nazwa klubu — nie duplikuj w UI. */
export function isPlayerNameSameAsTeam(player: Player): boolean {
  const discord = player.discord?.trim();
  const team = player.team?.trim();
  if (!discord || !team) return false;
  return normalizeNameKey(discord) === normalizeNameKey(team);
}

/**
 * Nazwa gracza w UI (zawsze WIELKIE LITERY): pseudonim (discord),
 * chyba że pseudonim = nazwa klubu — wtedy menedżer (np. Pusan → SERGIUSZ KACZMAREK).
 */
export function playerDisplayName(player: Player | null | undefined): string {
  if (!player) return "—";
  const discord = player.discord?.trim();
  const manager = player.manager?.trim();

  let name: string;
  if (discord && !isPlayerNameSameAsTeam(player)) {
    name = discord;
  } else {
    name = manager || discord || "—";
  }
  return name === "—" ? name : name.toLocaleUpperCase("pl");
}

/** Czy pod nazwą klubu pokazać linię z graczem (nie duplikować tej samej etykiety). */
export function shouldShowPlayerName(player: Player | null | undefined): boolean {
  const name = playerDisplayName(player);
  if (name === "—") return false;
  const team = player?.team?.trim();
  if (!team) return true;
  return normalizeNameKey(name) !== normalizeNameKey(team);
}
