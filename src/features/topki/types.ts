export type LeaderboardBadge = "Pozytywna" | "Negatywna" | "Ciekawostka" | "Strategia";

export interface TopEntry {
  playerId: number;
  manager: string;
  team: string;
  value: string;
  details: string;
  sortValue: number;
  /** Przeciwnik H2H — wyświetlany z herbem obok menedżera. */
  opponentTeam?: string;
  /** Para drużyn (remis, rywalizacja) — dwa herby. */
  matchupTeams?: [string, string];
}

export interface LeaderboardResult {
  id: string;
  title: string;
  description: string;
  badge: LeaderboardBadge;
  entries: TopEntry[];
}

export interface TopkiSection {
  id: string;
  title: string;
  icon: string;
  description: string;
  leaderboards: LeaderboardResult[];
}
