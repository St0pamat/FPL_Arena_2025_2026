export interface NoBigSixTeam {
  entry_id: number;
  team_name: string;
  player_name: string;
  custom_logo_url: string | null;
  is_banned: boolean;
}

export interface NoBigSixGwResult {
  id: number;
  entry_id: number;
  event: number;
  raw_fpl_points: number;
  penalty_points: number;
  official_points: number;
}

export interface NoBigSixPenalty {
  id: number;
  entry_id: number;
  event: number;
  element_id: number;
  player_name: string;
  fpl_team_id: number;
  deducted_points: number;
  reason: string;
  is_auto_sub: boolean;
}

export type NoBigSixTrend = "up" | "down" | "same";

export interface NoBigSixStandingRow {
  entry_id: number;
  team_name: string;
  player_name: string;
  raw_fpl_points: number;
  penalty_points: number;
  official_points: number;
  played_gws: number;
  is_banned: boolean;
  custom_logo_url: string | null;
  /** Celowe naruszenie (DO ZBANOWANIA) — nie mylić z is_banned */
  flag_for_ban: boolean;
  /** null dla zbanowanych (UI: —) */
  rank: number | null;
  previous_rank: number | null;
  trend: NoBigSixTrend;
}
