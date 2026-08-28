/**
 * Discord Role ID per division tier (Na Minusie ™).
 * tier 1 = najwyższa dywizja (Premier League).
 */

export const NA_MINUSIE_DIVISION_ROLE_BY_TIER: Record<number, string> = {
  1: "1538514648486117449", // Premier League
  2: "1538515266886041680", // Championship
  3: "1538515896010670110", // League One
  4: "1538516518021890109", // League Two
  5: "1538517110987161600", // National League
};

/** Ping roli Discord: `<@&ROLE_ID>` lub pusty string dla nieznanego tieru. */
export function getDivisionRoleMention(tier: number): string {
  const roleId = NA_MINUSIE_DIVISION_ROLE_BY_TIER[tier];
  if (!roleId) return "";
  return `<@&${roleId}>`;
}
