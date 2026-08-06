import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { FormPill, PublicFixture, PublicStandingRow, PublicTeam } from "@/lib/public/types";
import type { SeasonStatsPayload } from "@/lib/public/seasonStats";

export interface PlayerSearchEntry {
  teamId: string;
  discord_nick: string;
  fpl_team_name: string | null;
  manager_name: string;
  chosen_club: string;
  divisionId: string;
  divisionName: string;
  tier: number;
}

export type HighlightKind = "top_scorer" | "median_king" | "red_lantern" | "unlucky";

export interface HighlightCard {
  kind: HighlightKind;
  title: string;
  value: string;
  subtitle: string;
  team: PublicTeam;
  meta: string;
}

export interface PlayerZoneOverview {
  seasonId: string;
  seasonName: string;
  isCompleted: boolean;
  players: PlayerSearchEntry[];
  seasonStats: SeasonStatsPayload;
  logos: ClubLogoRecord[];
  hasPlayedFixtures: boolean;
  error?: string | null;
}

export interface PlayerMatchRow {
  fixtureId: string;
  gameweek: number;
  isHome: boolean;
  opponent: PublicTeam;
  myFpl: number;
  oppFpl: number;
  myH2h: number;
  oppH2h: number;
  medianBonus: boolean;
  result: "W" | "D" | "L";
  isPlayoff: boolean;
}

export interface PlayerZoneProfile {
  team: PublicTeam;
  divisionId: string;
  divisionName: string;
  tier: number;
  seasonName: string;
  standing: PublicStandingRow | null;
  form: FormPill[];
  fixtures: PublicFixture[];
  matchHistory: PlayerMatchRow[];
  logos: ClubLogoRecord[];
  error?: string | null;
}
