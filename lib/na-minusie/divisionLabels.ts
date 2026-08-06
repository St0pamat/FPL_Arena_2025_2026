/** Oficjalne nazwy szczebli Na Minusie (bez „Dywizja N”). */
const OFFICIAL_LEAGUE_BY_TIER: Record<number, string> = {
  1: "Premier League",
  2: "Championship",
  3: "League One",
  4: "League Two",
};

/** Skrót poziomu dywizji w UI (np. D1). */
export function divisionCode(tier: number): string {
  return `D${tier}`;
}

/** Pełna oficjalna nazwa ligi (Premier League, Championship, …). */
export function divisionLabel(tier: number): string {
  if (tier >= 5) return "National League";
  return OFFICIAL_LEAGUE_BY_TIER[tier] ?? `League ${tier}`;
}

/** Etykieta awansu / spadku między poziomami — tylko nazwy własne lig. */
export function divisionMoveHint(
  fromTier: number,
  toTier: number,
  kind: "up" | "down",
): string {
  if (kind === "up") {
    return toTier < fromTier
      ? `Awans do ${divisionLabel(toTier)}`
      : `${divisionLabel(fromTier)} → ${divisionLabel(toTier)}`;
  }
  return toTier > fromTier
    ? `Spadek do ${divisionLabel(toTier)}`
    : `${divisionLabel(fromTier)} → ${divisionLabel(toTier)}`;
}
