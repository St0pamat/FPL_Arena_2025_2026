export type SeasonStatus = "DRAFT" | "PUBLISHED";

export interface Pyramid {
  id: string;
  name: string;
  created_at: string;
}

export interface Season {
  id: string;
  name: string;
  status: SeasonStatus;
  created_at: string;
}

export interface Division {
  id: string;
  pyramid_id: string;
  season_id: string;
  name: string;
  tier: number;
  discord_webhook_url?: string | null;
  created_at: string;
  pyramids?: Pick<Pyramid, "id" | "name"> | null;
  seasons?: Pick<Season, "id" | "name" | "status"> | null;
}

export interface Team {
  id: string;
  division_id: string;
  manager_name: string;
  discord_nick: string;
  fpl_id: string | null;
  fpl_team_name: string | null;
  chosen_club: string;
  fee_paid: boolean;
  created_at: string;
  divisions?: (Pick<Division, "id" | "name" | "tier" | "season_id" | "pyramid_id"> & {
    seasons?: Pick<Season, "id" | "name" | "status"> | null;
    pyramids?: Pick<Pyramid, "id" | "name"> | null;
  }) | null;
}

export interface ActionState {
  error: string | null;
  success?: string | null;
}

export const INITIAL_ACTION_STATE: ActionState = { error: null, success: null };
