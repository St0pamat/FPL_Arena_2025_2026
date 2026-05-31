export interface DreamTeamPlayer {
  name?: string;
  elementId?: number;
  position?: number;
  pitchX?: number;
  pitchY?: number;
  points?: number;
  pointsBase?: number;
  captainBonus?: number;
  tcBonus?: number;
  captaincies?: number;
  cap_count?: number;
  lineup?: boolean;
}

export interface SquadPlayer {
  name?: string;
  elementId?: number;
  position?: number;
  points?: number;
  pointsBase?: number;
  captainBonus?: number;
  tcBonus?: number;
}

export interface PlayerHighlights {
  seasonOr?: number | null;
  seasonSplit?: { trend?: number };
  expSummary?: { overperform?: number; underperform?: number };
  topGains?: Array<{ name: string; net: number }>;
  topLosses?: Array<{ name: string; net: number }>;
  dreamTeam?: DreamTeamPlayer[];
  squadPlayers?: SquadPlayer[];
  pointSources?: unknown[];
  pointsByPosition?: unknown;
  [key: string]: unknown;
}

export type PlayerHighlightsMap = Record<string, PlayerHighlights>;
