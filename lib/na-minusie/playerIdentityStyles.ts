/**
 * Design System — tożsamość gracza (Na Minusie / Strefa Gracza).
 * Single Source of Truth: kolory i wagi są nienaruszalne.
 * Rozmiary (text-xs / text-sm / …) dobieraj lokalnie do kontekstu.
 *
 * Hierarchia: Discord Club → FPL Manager → FPL Team → Discord Name
 */

/** Wymuszone style pól — bez rozmiaru (doklej lokalnie). */
export const PLAYER_IDENTITY = {
  /** Discord Club — biały, uppercase, mocna waga */
  club: "font-sans uppercase tracking-wide text-white font-black",
  /** Discord Club w ciasnej tabeli — dopuszczalny font-bold zamiast font-black */
  clubTable: "font-sans uppercase tracking-wide text-white font-bold",
  /** FPL Manager — neon #39FF14 */
  manager: "font-sans tracking-wide text-[#39FF14] font-black",
  /** FPL Manager w tabeli — dopuszczalny font-semibold */
  managerTable: "font-sans tracking-wide text-[#39FF14] font-semibold",
  /** FPL Team — błękit sky-300 */
  fplTeam: "font-sans tracking-wide text-sky-300 font-bold",
  /** FPL Team w tabeli — lekko przygaszony */
  fplTeamTable: "font-sans tracking-wide text-sky-300/90 font-medium",
  /** Discord Name — szary, opcjonalny */
  discord: "font-sans font-normal text-slate-500",
} as const;

export type PlayerIdentitySize = "xs" | "sm" | "md" | "lg";

/** Rozmiary typografii — elastyczne, nie zmieniają kolorów/wag. */
export const PLAYER_IDENTITY_SIZE: Record<
  PlayerIdentitySize,
  { club: string; manager: string; fplTeam: string; discord: string }
> = {
  xs: {
    club: "text-[11px] sm:text-xs",
    manager: "text-[10px] sm:text-[11px]",
    fplTeam: "text-[10px] sm:text-[11px]",
    discord: "text-[10px]",
  },
  sm: {
    club: "text-xs sm:text-sm",
    manager: "text-[11px] sm:text-xs",
    fplTeam: "text-[11px] sm:text-xs",
    discord: "text-[10px] sm:text-[11px]",
  },
  md: {
    club: "text-sm sm:text-base",
    manager: "text-xs sm:text-sm",
    fplTeam: "text-xs",
    discord: "text-[11px]",
  },
  lg: {
    club: "text-base sm:text-lg",
    manager: "text-sm sm:text-base",
    fplTeam: "text-xs sm:text-sm",
    discord: "text-xs",
  },
};

export function identityClubClass(
  size: PlayerIdentitySize = "md",
  variant: "default" | "table" = "default",
  extra = "",
) {
  const base = variant === "table" ? PLAYER_IDENTITY.clubTable : PLAYER_IDENTITY.club;
  return `${base} ${PLAYER_IDENTITY_SIZE[size].club} ${extra}`.trim();
}

export function identityManagerClass(
  size: PlayerIdentitySize = "md",
  variant: "default" | "table" = "default",
  extra = "",
) {
  const base = variant === "table" ? PLAYER_IDENTITY.managerTable : PLAYER_IDENTITY.manager;
  return `${base} ${PLAYER_IDENTITY_SIZE[size].manager} ${extra}`.trim();
}

export function identityFplTeamClass(
  size: PlayerIdentitySize = "md",
  variant: "default" | "table" = "default",
  extra = "",
) {
  const base = variant === "table" ? PLAYER_IDENTITY.fplTeamTable : PLAYER_IDENTITY.fplTeam;
  return `${base} ${PLAYER_IDENTITY_SIZE[size].fplTeam} ${extra}`.trim();
}

export function identityDiscordClass(size: PlayerIdentitySize = "md", extra = "") {
  return `${PLAYER_IDENTITY.discord} ${PLAYER_IDENTITY_SIZE[size].discord} ${extra}`.trim();
}
