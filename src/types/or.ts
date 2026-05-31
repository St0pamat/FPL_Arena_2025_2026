export interface GladiatorOrRow {
  historicalOr?: number | null;
  historicalOrSeason?: string | null;
  seasonOr?: number | null;
}

export type GladiatorOrMap = Record<string, GladiatorOrRow>;
