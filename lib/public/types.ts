/**
 * Publiczne typy Huba Gracza (tylko sezony PUBLISHED).
 */

export interface PublicSeason {
  id: string;
  name: string;
  status: "PUBLISHED";
  created_at: string;
}

export interface PublicPyramid {
  id: string;
  name: string;
}

export interface PublicDivision {
  id: string;
  name: string;
  tier: number;
  season_id: string;
  pyramid_id: string;
}

export interface PublicStructure {
  seasons: PublicSeason[];
  pyramids: PublicPyramid[];
  divisions: PublicDivision[];
}

export interface PublicTeam {
  id: string;
  manager_name: string;
  discord_nick: string;
  fpl_id: string | null;
  fpl_team_name: string | null;
  chosen_club: string;
}

export type FormResult = "W" | "D" | "L";

export interface FormPill {
  gameweek: number;
  result: FormResult;
  median: boolean;
}

export type TableZone =
  | "gold"
  | "silver"
  | "bronze"
  | "promotion"
  | "playoff_up"
  | "playoff_down"
  | "relegation"
  | "mid";

export interface PublicStandingRow {
  teamId: string;
  position: number;
  zone: TableZone;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  h2hPoints: number;
  medianPoints: number;
  totalPoints: number;
  fplPoints: number;
  form: FormPill[];
  team: PublicTeam;
}

export interface PublicFixture {
  id: string;
  gameweek: number;
  home_team_id: string;
  away_team_id: string;
  home_fpl_points: number | null;
  away_fpl_points: number | null;
  home_h2h_points: number;
  away_h2h_points: number;
  home_median_bonus: number;
  away_median_bonus: number;
  is_finished: boolean;
  home_team: PublicTeam | null;
  away_team: PublicTeam | null;
}

export interface DivisionStandingsPayload {
  divisionId: string;
  tier: number;
  /** Czy dywizja ma skonfigurowany webhook (bez ujawniania URL) */
  hasDiscordWebhook: boolean;
  teams: PublicTeam[];
  standings: PublicStandingRow[];
  fixtures: PublicFixture[];
  finishedGameweeks: number[];
  maxGameweek: number;
  playedGwCount: number;
  averageFpl: number | null;
  leader: PublicStandingRow | null;
}

export interface GwMatchCard {
  fixture: PublicFixture;
  homeWon: boolean;
  awayWon: boolean;
  draw: boolean;
}

export interface GwFplRankRow {
  position: number;
  team: PublicTeam;
  fplPoints: number;
  medianBonus: boolean;
  inMedianZone: boolean;
}

export interface GameweekDetailsPayload {
  divisionId: string;
  gameweek: number;
  isFinished: boolean;
  medianThreshold: number | null;
  matches: GwMatchCard[];
  fplRanking: GwFplRankRow[];
}

export interface TeamSchedulePayload {
  team: PublicTeam;
  fixtures: PublicFixture[];
}
