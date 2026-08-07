export type SeasonStatus = "DRAFT" | "PUBLISHED";

export type { TiebreakerMethod } from "@/lib/admin/constants";

export interface Pyramid {
  id: string;
  name: string;
  created_at: string;
}

export interface Season {
  id: string;
  name: string;
  status: SeasonStatus;
  /** Baraże zakończone → można pokazać publiczne Podsumowanie */
  is_completed?: boolean;
  /** Sezon spakowany po wygenerowaniu nowego */
  is_archived?: boolean;
  /** Content Hub — The FA Ranking (globalny) */
  fa_ranking_webhook_url?: string | null;
  /** Content Hub — FA Cup (globalny) */
  fa_cup_webhook_url?: string | null;
  created_at: string;
}

/**
 * Dywizja — Excel SSOT: kolumny „Dywizja” (tier) + „Nazwa dywizji”.
 * Przykład: tier=1, name="Premier League".
 */
export interface Division {
  id: string;
  pyramid_id: string;
  season_id: string;
  /** Excel: Nazwa dywizji (np. "Premier League") */
  name: string;
  /** Excel: Dywizja / tier (1, 2, 3, …) */
  tier: number;
  discord_webhook_url?: string | null;
  created_at: string;
  pyramids?: Pick<Pyramid, "id" | "name"> | null;
  seasons?: Pick<Season, "id" | "name" | "status"> | null;
}

/**
 * Uczestnik / drużyna — mapowanie kolumn Excel SSOT → DB:
 * - Discord Name   → discord_nick (alias: discord_name)
 * - Discord Club   → chosen_club  (alias: discord_club)
 * - Discord ID     → discord_id
 * - FPL Team       → fpl_team_name
 * - FPL Manager    → manager_name (alias: fpl_manager_name)
 * - FPL ID         → fpl_id (TEXT w DB; wartość numeryczna z Excela)
 * - OR             → previous_season_or
 * - Status         → status (+ is_active)
 * - x.com          → x_com
 * - email          → email
 */
export interface Team {
  id: string;
  /** null = nieprzypisany do dywizji (przed Master Importem / Bergerem) */
  division_id: string | null;
  /** Excel: FPL Manager */
  manager_name: string;
  /** Excel: Discord Name */
  discord_nick: string;
  /** Excel: Discord ID (snowflake) */
  discord_id?: string | null;
  /**
   * Excel: FPL ID — w Postgres TEXT; w Excelu liczba.
   * Trzymamy string, żeby nie tracić precyzji dużych ID.
   */
  fpl_id: string | null;
  /** Excel: FPL Team */
  fpl_team_name: string | null;
  /** Excel: Discord Club (np. Arsenal, Derby County) */
  chosen_club: string;
  fee_paid: boolean;
  /** Excel: Status → aktywny uczestnik (boolean) */
  is_active?: boolean;
  /** Excel: Status (np. Aktywny) */
  status?: string;
  /** Excel: x.com */
  x_com?: string | null;
  /** Excel: e-mail */
  email?: string | null;
  /** Excel: OR (Overall Rank poprzedniego sezonu) */
  previous_season_or?: number | null;
  created_at: string;
  divisions?: (Pick<Division, "id" | "name" | "tier" | "season_id" | "pyramid_id"> & {
    seasons?: Pick<Season, "id" | "name" | "status"> | null;
    pyramids?: Pick<Pyramid, "id" | "name"> | null;
  }) | null;
}

/** Aliasy nazw z Excela (używane przez Master Import). */
export type ExcelTeamFieldAliases = {
  discord_name: Team["discord_nick"];
  discord_club: Team["chosen_club"];
  fpl_manager_name: Team["manager_name"];
};

export interface ActionState {
  error: string | null;
  success?: string | null;
}

export const INITIAL_ACTION_STATE: ActionState = { error: null, success: null };
