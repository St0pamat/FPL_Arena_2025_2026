/**
 * 3-stopniowy fallback nicku wyświetlanego (Discord Name → x.com → FPL Manager).
 * Używany przy imporcie CSV / Bazie uczestników.
 */

/** Puste / „brak danych” — traktuj jako brak wartości. */
export function isMissingDisplayValue(raw: unknown): boolean {
  const s = String(raw ?? "").trim();
  if (!s) return true;
  return s.toLowerCase() === "brak danych";
}

/**
 * Czyści handle X.com do wyświetlenia (bez @ i bez URL).
 * `@Kowalski` → `Kowalski`, `https://x.com/foo` → `foo`.
 */
export function normalizeXHandleForDisplay(raw: string): string {
  let handle = raw.trim();
  handle = handle.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "");
  handle = handle.replace(/^@+/, "").split(/[/?#]/)[0]?.trim() ?? "";
  return handle;
}

/**
 * Discord Name → (fallback) x.com bez @ → (fallback) FPL Manager → „Brak danych”.
 */
export function resolveDiscordDisplayNick(input: {
  discordName?: string | null;
  xCom?: string | null;
  fplManager?: string | null;
}): string {
  const discord = String(input.discordName ?? "").trim();
  if (!isMissingDisplayValue(discord)) {
    return discord;
  }

  const xRaw = String(input.xCom ?? "").trim();
  if (!isMissingDisplayValue(xRaw)) {
    const cleaned = normalizeXHandleForDisplay(xRaw);
    if (cleaned && !isMissingDisplayValue(cleaned)) {
      return cleaned;
    }
  }

  const manager = String(input.fplManager ?? "").trim();
  if (manager) return manager;
  return "Brak danych";
}
