/**
 * Trwałe webhooki Discord — scope GLOBAL / DIVISION (po tierze).
 * Niezależne od seasons/divisions → Hard Reset ich nie kasuje.
 */

export type DiscordWebhookScope = "GLOBAL" | "DIVISION";
export type DiscordGlobalType = "FA_RANKING" | "FA_CUP";

export type DiscordWebhookRow = {
  id: string;
  scope: DiscordWebhookScope;
  global_type: DiscordGlobalType | null;
  division_level: number | null;
  url: string;
  updated_at?: string;
};

export const GLOBAL_WEBHOOK_LABELS: Record<DiscordGlobalType, string> = {
  FA_RANKING: "The FA Ranking",
  FA_CUP: "FA Cup",
};

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
