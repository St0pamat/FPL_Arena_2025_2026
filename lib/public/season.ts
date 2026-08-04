/** Sezon 1 (jesień): GW1–18 faza zasadnicza, GW19 baraże. */
export const REGULAR_MAX_GAMEWEEK = 18;
export const PLAYOFF_GAMEWEEK = 19;
export const SEASON_MAX_GAMEWEEK = 19;

/** Sezon 2 (wiosna): GW20–37 + GW38 baraże. */
export const SPRING_REGULAR_MAX_GAMEWEEK = 37;
export const SPRING_PLAYOFF_GAMEWEEK = 38;
export const SPRING_SEASON_MIN_GAMEWEEK = 20;

export type SeasonPhase = "AUTUMN" | "SPRING";

export function isPlayoffGameweek(gw: number): boolean {
  return gw === PLAYOFF_GAMEWEEK || gw === SPRING_PLAYOFF_GAMEWEEK;
}

/** Zakres fazy zasadniczej liczący tabelę przed barażami GW19 / GW38. */
export function regularSeasonRangeForPlayoff(
  playoffGw: number,
): { from: number; to: number } | null {
  if (playoffGw === PLAYOFF_GAMEWEEK) {
    return { from: 1, to: REGULAR_MAX_GAMEWEEK };
  }
  if (playoffGw === SPRING_PLAYOFF_GAMEWEEK) {
    return { from: SPRING_SEASON_MIN_GAMEWEEK, to: SPRING_REGULAR_MAX_GAMEWEEK };
  }
  return null;
}

export function gameweekLabel(gw: number): string {
  if (gw === PLAYOFF_GAMEWEEK) return `Kolejka ${gw} (Baraże)`;
  if (gw === SPRING_PLAYOFF_GAMEWEEK) return `Kolejka ${gw} (Baraże)`;
  return `Kolejka ${gw}`;
}

/** Wykrywa fazę sezonu z nazwy (Jesień / Wiosna). Domyślnie jesień. */
export function resolveSeasonPhase(seasonName: string | null | undefined): SeasonPhase {
  const n = String(seasonName ?? "").toLowerCase();
  if (/wiosna|wiosen|spring|gw\s*20|gw20|sezon\s*2/.test(n)) {
    return "SPRING";
  }
  return "AUTUMN";
}

/** Lista GW dla selecta w Workspace. */
export function gameweeksForSeasonPhase(phase: SeasonPhase): number[] {
  if (phase === "SPRING") {
    return Array.from({ length: 19 }, (_, i) => SPRING_SEASON_MIN_GAMEWEEK + i);
  }
  return Array.from({ length: SEASON_MAX_GAMEWEEK }, (_, i) => i + 1);
}

export function defaultGameweekForPhase(phase: SeasonPhase): number {
  return phase === "SPRING" ? SPRING_SEASON_MIN_GAMEWEEK : 1;
}
