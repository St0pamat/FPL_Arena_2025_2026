export type MatchOutcome = "W" | "D" | "L";

export interface H2HMatch {
  teamA: string;
  teamB: string;
  pointsA: number;
  pointsB: number;
}

export interface GwMatchesBlock {
  gw: number;
  matches: H2HMatch[];
}

export interface StandingRow {
  team: string;
  w: number;
  d: number;
  l: number;
  pts: number;
  score: number;
  rank?: number;
  rankChange?: number | null;
}
