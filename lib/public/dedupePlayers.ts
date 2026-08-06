import type { PlayerSearchEntry } from "@/lib/public/playerZoneTypes";

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function pickPreferred(
  a: PlayerSearchEntry,
  b: PlayerSearchEntry,
): PlayerSearchEntry {
  if (a.tier !== b.tier) return a.tier < b.tier ? a : b;
  return a;
}

/**
 * Usuwa duplikaty z listy wyszukiwania — po teamId, potem po Discord / FPL / menedżerze.
 */
export function dedupePlayerSearchEntries(
  players: PlayerSearchEntry[],
): PlayerSearchEntry[] {
  const byTeamId = new Map<string, PlayerSearchEntry>();
  for (const player of players) {
    const existing = byTeamId.get(player.teamId);
    byTeamId.set(
      player.teamId,
      existing ? pickPreferred(existing, player) : player,
    );
  }

  const byIdentity = new Map<string, PlayerSearchEntry>();
  for (const player of byTeamId.values()) {
    const identityKey =
      (player.discord_nick && normalizeKey(player.discord_nick)) ||
      (player.fpl_team_name && normalizeKey(player.fpl_team_name)) ||
      (player.manager_name && normalizeKey(player.manager_name)) ||
      player.teamId;

    const existing = byIdentity.get(identityKey);
    byIdentity.set(
      identityKey,
      existing ? pickPreferred(existing, player) : player,
    );
  }

  return [...byIdentity.values()];
}
