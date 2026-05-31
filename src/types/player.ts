export interface Player {
  id: number;
  manager: string;
  discord: string;
  team: string;
  rank: number;
  gw19Rank: number;
  w: number;
  d: number;
  l: number;
  score: number;
  pts: number;
  seasons: number;
  bestOr: string;
  bestOrSeason: string;
  avgPosition: number;
  likes: string;
  dislikes: string;
  quote: string;
  videoScript: string;
  /** Link do filmiku prezentacyjnego na YouTube. */
  presentationVideoUrl?: string;
  transfers: number;
  hits: number;
  greenArrows: number;
  captainPts: number;
  mostCaptained: string;
  mostPointsPlayer: string;
  superStar: string;
  rankKiller: string;
  pointsBenched: number;
  winStreak: string;
  monthlyWins: string;
  bestGw: string;
  weeksTop: number;
  weeksBottom: number;
}
