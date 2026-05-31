export interface SeasonSquadStat {
  name: string | null;
  count: number | null;
}

export interface SeasonGwDetail {
  gw: number;
  points: number;
  top10kAvg: number;
  overallAvg: number;
  vsTop10k: number;
  bench?: number;
  gwRank?: number | null;
  captain?: string | null;
  mainGain?: string | null;
  mainDamage?: string | null;
  teamValue?: number | null;
  chip?: string | null;
}

export interface PlayerSeasonHistory {
  fplId: number;
  seasonOr?: number | null;
  fplTotalPoints?: number;
  avgVsTop10k?: number | null;
  avgVsOverall?: number | null;
  weeksAboveTop10k?: number;
  weeksBelowTop10k?: number;
  weeksEqualTop10k?: number;
  bestGwRank?: number | null;
  worstGwRank?: number | null;
  peakTeamValue?: number | null;
  mostStarted?: SeasonSquadStat;
  mostBenchedPlayer?: SeasonSquadStat;
  gwDetails?: SeasonGwDetail[];
}

export type PlayerSeasonHistoryMap = Record<string, PlayerSeasonHistory>;
