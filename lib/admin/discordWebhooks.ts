/**
 * Trwałe webhooki Discord — scope GLOBAL / DIVISION (po tierze).
 * Dwa serwery: NA_MINUSIE (live) i FPL_ARENA (backup / test).
 * Niezależne od seasons/divisions → Hard Reset ich nie kasuje.
 */

export type DiscordWebhookScope = "GLOBAL" | "DIVISION";
export type DiscordGlobalType = "FA_RANKING" | "FA_CUP";
export type DiscordServerTarget = "NA_MINUSIE" | "FPL_ARENA";

export const DISCORD_SERVER_TARGETS = [
  "NA_MINUSIE",
  "FPL_ARENA",
] as const satisfies readonly DiscordServerTarget[];

export const DEFAULT_DISCORD_SERVER: DiscordServerTarget = "NA_MINUSIE";

export const DISCORD_SERVER_LABELS: Record<DiscordServerTarget, string> = {
  NA_MINUSIE: "Na Minusie ™",
  FPL_ARENA: "FPL Arena (Backup)",
};

export type DiscordWebhookRow = {
  id: string;
  scope: DiscordWebhookScope;
  global_type: DiscordGlobalType | null;
  division_level: number | null;
  server_target: DiscordServerTarget;
  url: string;
  updated_at?: string;
};

export const GLOBAL_WEBHOOK_LABELS: Record<DiscordGlobalType, string> = {
  FA_RANKING: "The FA Ranking",
  FA_CUP: "FA Cup",
};

export function isDiscordServerTarget(
  value: string | null | undefined,
): value is DiscordServerTarget {
  return value === "NA_MINUSIE" || value === "FPL_ARENA";
}

export function parseDiscordServerTarget(
  value: string | null | undefined,
): DiscordServerTarget {
  return isDiscordServerTarget(value) ? value : DEFAULT_DISCORD_SERVER;
}

/** Deduplikuje i odrzuca nieznane cele. Kolejność: Na Minusie, potem FPL Arena. */
export function normalizeDiscordServerTargets(
  raw: readonly string[] | null | undefined,
): DiscordServerTarget[] {
  const set = new Set<DiscordServerTarget>();
  for (const item of raw ?? []) {
    if (isDiscordServerTarget(item)) set.add(item);
  }
  return DISCORD_SERVER_TARGETS.filter((t) => set.has(t));
}

export function isDiscordWebhookUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    const host = u.hostname === "discord.com" || u.hostname === "discordapp.com";
    return u.protocol === "https:" && host && u.pathname.startsWith("/api/webhooks/");
  } catch {
    return false;
  }
}

export function maskWebhookUrl(url: string): string {
  const t = url.trim();
  if (t.length < 28) return "•••";
  return `${t.slice(0, 40)}…${t.slice(-8)}`;
}
