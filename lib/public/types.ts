/**
 * Publiczne typy Huba Gracza (tylko sezony PUBLISHED).
 */

export interface PublicSeason {
  id: string;
  name: string;
  status: "PUBLISHED";
  is_completed: boolean;
  is_archived: boolean;
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

/** Wiersz składu dywizji (zakładka Struktura). */
export interface DivisionRosterRow {
  lp: number;
  teamId: string;
  fpl_team_name: string | null;
  manager_name: string;
  discord_nick: string;
  chosen_club: string;
  previous_or: number | null;
}

export interface DivisionRosterBlock {
  divisionId: string;
  name: string;
  tier: number;
  pyramidId: string;
  pyramidName: string;
  teams: DivisionRosterRow[];
}

export interface PublicSeasonDivisionStructurePayload {
  seasonId: string;
  seasonName: string;
  divisions: DivisionRosterBlock[];
  /** ISO timestamp ostatniej zmiany składu (max created_at drużyn) */
  updatedAt?: string | null;
  /** true = podgląd rekrutacyjny (także niepełne dywizje) */
  isPreview?: boolean;
  error?: string | null;
}

/** Wiersz raportu EoS (podsumowanie). */
export interface SeasonSummaryPlayerRow {
  teamId: string;
  status: string;
  statusLabel: string;
  nextTier: number | null;
  currentTier: number;
  position: number;
  totalPoints: number | null;
  fplPoints: number | null;
  fromDivisionName: string;
  toDivisionHint: string;
  team: PublicTeam;
  divisionId: string;
}

/** Mecz barażowy GW19/38 w raporcie EoS. */
export interface SeasonSummaryPlayoffMatch {
  fixtureId: string;
  gameweek: number;
  higherDivisionName: string;
  lowerDivisionName: string;
  higherTier: number;
  lowerTier: number;
  higher: SeasonSummaryPlayerRow;
  lower: SeasonSummaryPlayerRow;
  higherFpl: number | null;
  lowerFpl: number | null;
  winnerTeamId: string | null;
  /** Status dla strony wyższej ligi */
  higherOutcomeLabel: string;
  /** Status dla strony niższej ligi */
  lowerOutcomeLabel: string;
}

/** Blok ruchów ligowych dla jednej dywizji. */
export interface SeasonSummaryDivisionBlock {
  divisionId: string;
  divisionName: string;
  tier: number;
  champion: SeasonSummaryPlayerRow | null;
  directPromotions: SeasonSummaryPlayerRow[];
  directRelegations: SeasonSummaryPlayerRow[];
  /** Baraż o utrzymanie w tej dywizji (8. vs 3. z niższej) */
  playoff: SeasonSummaryPlayoffMatch | null;
}

export interface PublicSeasonSummaryPayload {
  seasonId: string;
  seasonName: string;
  is_completed: boolean;
  is_archived: boolean;
  /** true = pokaż kłódkę, bez obliczeń */
  locked: boolean;
  /** Podium najwyższej ligi (PL): 1–2–3 */
  podium: SeasonSummaryPlayerRow[];
  /** Mistrzowie każdej dywizji (poz. 1) */
  divisionChampions: SeasonSummaryPlayerRow[];
  /** Ruchy ligowe pogrupowane per dywizja (sort tier ASC) */
  divisionBlocks: SeasonSummaryDivisionBlock[];
  /** @deprecated — używaj divisionBlocks; zostawione dla kompatybilności */
  promotions: SeasonSummaryPlayerRow[];
  /** @deprecated — używaj divisionBlocks */
  relegations: SeasonSummaryPlayerRow[];
  playoffGameweek: number | null;
  error?: string | null;
}

export interface PublicTeam {
  id: string;
  manager_name: string;
  discord_nick: string;
  fpl_id: string | null;
  fpl_team_name: string | null;
  chosen_club: string;
  previous_season_or?: number | null;
  /** Handle / URL X.com (opcjonalnie) */
  x_com?: string | null;
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
  /** false = brudnopis / jeszcze nie w Wynikach publicznych */
  is_published?: boolean;
  is_playoff?: boolean;
  tiebreaker_home_goals?: number | null;
  tiebreaker_away_goals?: number | null;
  tiebreaker_home_goals_conceded?: number | null;
  tiebreaker_away_goals_conceded?: number | null;
  tiebreaker_home_bench?: number | null;
  tiebreaker_away_bench?: number | null;
  tiebreaker_winner_id?: string | null;
  tiebreaker_reason?: string | null;
  tiebreaker_method?: string | null;
  home_division_name?: string | null;
  away_division_name?: string | null;
  home_team: PublicTeam | null;
  away_team: PublicTeam | null;
}

export type PublicGameweekSyncMeta = {
  gameweek: number;
  last_sync_at: string;
  gw_status: "PROVISIONAL" | "CONFIRMED" | "NOT_STARTED";
};

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
  /** Status syncu FPL API (jeśli był uruchamiany dla tej GW). */
  syncMeta?: PublicGameweekSyncMeta | null;
}

export interface DivisionStandingsPayload {
  divisionId: string;
  tier: number;
  /** Czy dywizja ma skonfigurowany webhook (bez ujawniania URL) */
  hasDiscordWebhook: boolean;
  teams: PublicTeam[];
  standings: PublicStandingRow[];
  /** Pełny terminarz (również nieopublikowane) — zakładka Terminarz */
  fixtures: PublicFixture[];
  /** Tylko opublikowane / rozliczone — Wyniki, Statystyki */
  publishedFixtures: PublicFixture[];
  finishedGameweeks: number[];
  /**
   * Wszystkie wygenerowane numery kolejek w fixtures (np. 1–19),
   * BEZ filtra is_published — mianownik licznika „Kolejka X / Y”.
   */
  availableGameweeks: number[];
  maxGameweek: number;
  /** Najwyższa opublikowana/ukończona kolejka (licznik X) */
  playedGwCount: number;
  averageFpl: number | null;
  leader: PublicStandingRow | null;
  playoffs: PlayoffPreviewPayload;
  /** Metadane syncu FPL per kolejka (klucz = gameweek). */
  syncMetaByGw?: Record<number, PublicGameweekSyncMeta>;
  /** Metadane syncu FPL dla najnowszej rozliczonej / zsynchronizowanej GW. */
  latestSyncMeta?: PublicGameweekSyncMeta | null;
}

export interface TeamSchedulePayload {
  team: PublicTeam;
  fixtures: PublicFixture[];
}

/** Wirtualny / podglądowy lub opublikowany mecz barażowy */
export interface PlayoffMatchMeta {
  fixture: PublicFixture;
  badge: string;
  contextLine: string;
  provisionalNote: string;
  /** true = jeszcze nie ma opublikowanego meczu w DB */
  isProvisional?: boolean;
  /** Ścieżka remisów + rozstrzygnięcie (TB1…TBn) */
  decisionPath?: Array<{ key: string; label: string; isDeciding: boolean }>;
  homeOutcome?: "UTRZYMANIE" | "SPADEK" | "AWANS" | "BRAK_AWANSU" | null;
  awayOutcome?: "UTRZYMANIE" | "SPADEK" | "AWANS" | "BRAK_AWANSU" | null;
}

export interface PlayoffPreviewPayload {
  gameweek: number;
  matches: PlayoffMatchMeta[];
  /** Komunikaty (najniższa liga / brak danych niższej) */
  notices: string[];
}
