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

export interface NoBigSixStandingRow {
  entry_id: number;
  team_name: string;
  player_name: string;
  raw_fpl_points: number;
  penalty_points: number;
  official_points: number;
  played_gws: number;
  is_banned: boolean;
}
