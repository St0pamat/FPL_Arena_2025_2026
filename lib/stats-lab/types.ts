/**
 * FPL Arena: Stats Lab — typy domenowe (namespace fpl_lab_*).
 * Izolowany od Na Minusie / No Big Six. Źródło: oficjalne FPL API.
 */

/* ─────────────────────────────────────────────────
 * Pozycje FPL (element_type)
 * ───────────────────────────────────────────────── */

export type FplPositionType = 1 | 2 | 3 | 4;

export const FPL_POSITION_LABELS_EN: Record<FplPositionType, "GK" | "DEF" | "MID" | "FWD"> = {
  1: "GK",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

export const FPL_POSITION_LABELS_PL: Record<
  FplPositionType,
  "Bramkarze" | "Obrońcy" | "Pomocnicy" | "Napastnicy"
> = {
  1: "Bramkarze",
  2: "Obrońcy",
  3: "Pomocnicy",
  4: "Napastnicy",
};

export function getFplPositionLabelEn(type: number): string {
  if (type === 1 || type === 2 || type === 3 || type === 4) {
    return FPL_POSITION_LABELS_EN[type];
  }
  return "—";
}

export function getFplPositionLabelPl(type: number): string {
  if (type === 1 || type === 2 || type === 3 || type === 4) {
    return FPL_POSITION_LABELS_PL[type];
  }
  return "—";
}

export function isFplPositionType(value: number): value is FplPositionType {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

/* ─────────────────────────────────────────────────
 * Sync status
 * ───────────────────────────────────────────────── */

export type FplLabSyncStatus = "IDLE" | "RUNNING" | "COMPLETED" | "ERROR";

/* ─────────────────────────────────────────────────
 * Tabele DB → interfejsy
 * ───────────────────────────────────────────────── */

/** fpl_lab_sync_meta */
export interface FplLabSyncMeta {
  season_code: string;
  last_finished_gw: number;
  last_bootstrap_sync_at: string | null;
  last_history_sync_at: string | null;
  total_players_synced: number;
  sync_status: FplLabSyncStatus;
  last_error: string | null;
  updated_at: string;
}

/** fpl_lab_clubs */
export interface FplLabClub {
  season_code: string;
  fpl_team_id: number;
  pulse_code: number;
  name: string;
  short_name: string;
  strength: number | null;
  primary_color: string | null;
  updated_at: string;
}

/** fpl_lab_players */
export interface FplLabPlayer {
  season_code: string;
  fpl_element_id: number;
  player_code: number;
  first_name: string;
  second_name: string;
  web_name: string;
  fpl_team_id: number;
  element_type: FplPositionType;
  status: string;
  now_cost: number;
  selected_by_percent: number;
  total_points: number;
  event_points: number;
  form: number;
  points_per_game: number;
  value_form: number;
  value_season: number;
  dreamteam_count: number;
  transfers_in: number;
  transfers_out: number;
  transfers_in_event: number;
  transfers_out_event: number;
  cost_change_start: number;
  cost_change_event: number;
  defensive_contribution: number;
  minutes: number;
  starts: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: number;
  creativity: number;
  threat: number;
  ict_index: number;
  expected_goals: number;
  expected_assists: number;
  expected_goal_involvements: number;
  expected_goals_conceded: number;
  recoveries: number;
  tackles: number;
  interceptions: number;
  clearances_blocks_interceptions: number;
  penalties_order: number | null;
  corners_and_indirect_freekicks_order: number | null;
  direct_freekicks_order: number | null;
  /** Ostatnia zsynchronizowana kolejka historii (Incremental ETL). */
  last_synced_gw: number;
  updated_at: string;
}

/** fpl_lab_player_gw_history — PK: (season_code, fpl_element_id, fixture_id) */
export interface FplLabPlayerGwHistory {
  season_code: string;
  fpl_element_id: number;
  fixture_id: number;
  gameweek: number;
  opponent_team_id: number;
  was_home: boolean;
  kickoff_time: string | null;
  total_points: number;
  value: number;
  selected: number;
  minutes: number;
  starts: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: number;
  creativity: number;
  threat: number;
  ict_index: number;
  expected_goals: number;
  expected_assists: number;
  expected_goal_involvements: number;
  expected_goals_conceded: number;
  recoveries: number;
  tackles: number;
  clearances_blocks_interceptions: number;
  defensive_contribution: number;
  transfers_balance: number;
  transfers_in: number;
  transfers_out: number;
  updated_at: string;
}

/* ─────────────────────────────────────────────────
 * Katalog metryk analitycznych (Stats Studio)
 * ───────────────────────────────────────────────── */

export type FplStatCategory =
  | "OVERVIEW"
  | "VALUE_TRANSFERS"
  | "GOAL_THREAT"
  | "CREATIVITY"
  | "DEFENDING_DC"
  | "DISCIPLINE";

/**
 * Klucze metryk UI / agregacji.
 * Część jest wyliczana (computed) — nie istnieje jako kolumna DB.
 */
export type FplStatKey =
  // OVERVIEW
  | "total_points"
  | "event_points"
  | "points_per_game"
  | "form"
  | "now_cost"
  | "selected_by_percent"
  | "minutes"
  | "starts"
  | "dreamteam_count"
  // VALUE_TRANSFERS
  | "value_season"
  | "value_form"
  | "price_rise"
  | "price_fall"
  | "price_change_gw"
  | "transfers_in"
  | "transfers_out"
  | "transfers_in_event"
  | "transfers_out_event"
  | "net_transfers_gw"
  // GOAL_THREAT
  | "goals_scored"
  | "expected_goals"
  | "goals_vs_xg"
  | "threat"
  | "goals_assists"
  | "expected_goal_involvements"
  // CREATIVITY
  | "assists"
  | "expected_assists"
  | "creativity"
  | "influence"
  | "ict_index"
  | "bonus"
  | "bps"
  // DEFENDING_DC
  | "clean_sheets"
  | "defensive_contributions_total"
  | "dc_bonus_matches"
  | "dc_bonus_points"
  | "clearances_blocks_interceptions"
  | "tackles"
  | "recoveries"
  | "saves"
  | "goals_conceded"
  | "expected_goals_conceded"
  // DISCIPLINE
  | "yellow_cards"
  | "red_cards"
  | "own_goals"
  | "penalties_saved"
  | "penalties_missed";

export type FplStatDefinition = {
  key: FplStatKey;
  labelPl: string;
  shortLabelPl: string;
  descriptionPl: string;
  labelEn: string;
  shortLabelEn: string;
  descriptionEn: string;
  category: FplStatCategory;
  /** Czy metryka ma sens w trybie per 90 minut. */
  supportsPer90: boolean;
  /** true = niższa wartość jest lepsza (np. xGC, stracone gole). */
  invertScale?: boolean;
  decimals: 0 | 1 | 2;
  /** true = wartość nie pochodzi z pojedynczej kolumny DB. */
  computed?: boolean;
};

export const FPL_STAT_CATEGORY_LABELS_PL: Record<FplStatCategory, string> = {
  OVERVIEW: "Ogólne",
  VALUE_TRANSFERS: "Wartość i Rynek",
  GOAL_THREAT: "Zagrożenie bramkowe",
  CREATIVITY: "Kreacja i ICT",
  DEFENDING_DC: "Defensywa i DC",
  DISCIPLINE: "Dyscyplina",
};

export const FPL_STAT_CATEGORY_LABELS_EN: Record<FplStatCategory, string> = {
  OVERVIEW: "Overview",
  VALUE_TRANSFERS: "Value & Market",
  GOAL_THREAT: "Goal Threat",
  CREATIVITY: "Creativity & ICT",
  DEFENDING_DC: "Defending & DC",
  DISCIPLINE: "Discipline",
};

export const FPL_STAT_DEFINITIONS: readonly FplStatDefinition[] = [
  // ── OVERVIEW ──
  {
    key: "total_points",
    labelPl: "Punkty FPL (sezon)",
    shortLabelPl: "TP",
    descriptionPl: "Suma punktów Fantasy Premier League w sezonie.",
    labelEn: "Total points",
    shortLabelEn: "TP",
    descriptionEn: "Season total Fantasy Premier League points.",
    category: "OVERVIEW",
    supportsPer90: true,
    decimals: 0,
  },
  {
    key: "event_points",
    labelPl: "Punkty w kolejce",
    shortLabelPl: "GWP",
    descriptionPl: "Punkty zdobyte w ostatniej / bieżącej kolejce (Gameweek Points).",
    labelEn: "Gameweek points",
    shortLabelEn: "GWP",
    descriptionEn: "Points scored in the latest / current gameweek.",
    category: "OVERVIEW",
    supportsPer90: false,
    decimals: 0,
  },
  {
    key: "points_per_game",
    labelPl: "Średnia punktów na mecz",
    shortLabelPl: "PPM",
    descriptionPl: "Średnia punktów FPL na mecz w sezonie.",
    labelEn: "Points per game",
    shortLabelEn: "PPG",
    descriptionEn: "Average FPL points per game this season.",
    category: "OVERVIEW",
    supportsPer90: false,
    decimals: 1,
  },
  {
    key: "form",
    labelPl: "Forma",
    shortLabelPl: "Form",
    descriptionPl: "Forma FPL — średnia punktów z ostatnich ~30 dni.",
    labelEn: "Form",
    shortLabelEn: "Form",
    descriptionEn: "FPL form — average points over roughly the last 30 days.",
    category: "OVERVIEW",
    supportsPer90: false,
    decimals: 1,
  },
  {
    key: "now_cost",
    labelPl: "Cena",
    shortLabelPl: "£",
    descriptionPl: "Aktualna cena zawodnika w FPL (w dziesiątkach funta).",
    labelEn: "Price",
    shortLabelEn: "£",
    descriptionEn: "Current FPL price (stored in tenths of a million).",
    category: "OVERVIEW",
    supportsPer90: false,
    decimals: 1,
  },
  {
    key: "selected_by_percent",
    labelPl: "Posiadanie %",
    shortLabelPl: "TSB%",
    descriptionPl: "Odsetek menedżerów posiadających zawodnika (Team Selected By).",
    labelEn: "Selected by %",
    shortLabelEn: "TSB%",
    descriptionEn: "Percentage of managers currently owning the player.",
    category: "OVERVIEW",
    supportsPer90: false,
    decimals: 1,
  },
  {
    key: "minutes",
    labelPl: "Minuty",
    shortLabelPl: "MP",
    descriptionPl: "Łączny czas gry w minutach.",
    labelEn: "Minutes played",
    shortLabelEn: "MP",
    descriptionEn: "Total minutes played.",
    category: "OVERVIEW",
    supportsPer90: false,
    decimals: 0,
  },
  {
    key: "starts",
    labelPl: "Mecze w 1. składzie",
    shortLabelPl: "ST",
    descriptionPl: "Liczba meczów rozpoczętych w pierwszym składzie.",
    labelEn: "Starts",
    shortLabelEn: "ST",
    descriptionEn: "Number of matches started in the first XI.",
    category: "OVERVIEW",
    supportsPer90: false,
    decimals: 0,
  },
  {
    key: "dreamteam_count",
    labelPl: "Drużyna Kolejki",
    shortLabelPl: "DT",
    descriptionPl: "Ile razy zawodnik trafił do oficjalnej Drużyny Kolejki FPL.",
    labelEn: "Times in Dream Team",
    shortLabelEn: "DT",
    descriptionEn: "Number of times selected in the official FPL Dream Team.",
    category: "OVERVIEW",
    supportsPer90: false,
    decimals: 0,
  },

  // ── VALUE_TRANSFERS ──
  {
    key: "value_season",
    labelPl: "Value (sezon)",
    shortLabelPl: "V(S)",
    descriptionPl: "Wartość sezonowa: punkty / cena.",
    labelEn: "Value (season)",
    shortLabelEn: "V(S)",
    descriptionEn: "Season value: points divided by price.",
    category: "VALUE_TRANSFERS",
    supportsPer90: false,
    decimals: 1,
  },
  {
    key: "value_form",
    labelPl: "Value (forma)",
    shortLabelPl: "V(F)",
    descriptionPl: "Wartość formy: forma / cena.",
    labelEn: "Value (form)",
    shortLabelEn: "V(F)",
    descriptionEn: "Form value: form divided by price.",
    category: "VALUE_TRANSFERS",
    supportsPer90: false,
    decimals: 1,
  },
  {
    key: "price_rise",
    labelPl: "Wzrost ceny od startu",
    shortLabelPl: "PR",
    descriptionPl: "Dodatnia zmiana ceny od początku sezonu (w dziesiątkach).",
    labelEn: "Price rise (season)",
    shortLabelEn: "PR",
    descriptionEn: "Positive price change since the start of the season (tenths).",
    category: "VALUE_TRANSFERS",
    supportsPer90: false,
    decimals: 0,
    computed: true,
  },
  {
    key: "price_fall",
    labelPl: "Spadek ceny od startu",
    shortLabelPl: "PF",
    descriptionPl: "Ujemna zmiana ceny od początku sezonu jako wartość dodatnia (w dziesiątkach).",
    labelEn: "Price fall (season)",
    shortLabelEn: "PF",
    descriptionEn: "Negative price change since season start, shown as a positive value (tenths).",
    category: "VALUE_TRANSFERS",
    supportsPer90: false,
    invertScale: true,
    decimals: 0,
    computed: true,
  },
  {
    key: "price_change_gw",
    labelPl: "Zmiana ceny w kolejce",
    shortLabelPl: "PR/PF GW",
    descriptionPl: "Zmiana ceny w bieżącej kolejce (w dziesiątkach).",
    labelEn: "Price change (GW)",
    shortLabelEn: "Δ£ GW",
    descriptionEn: "Price change in the current gameweek (tenths).",
    category: "VALUE_TRANSFERS",
    supportsPer90: false,
    decimals: 0,
    computed: true,
  },
  {
    key: "transfers_in",
    labelPl: "Transfery DO (sezon)",
    shortLabelPl: "TI",
    descriptionPl: "Łączna liczba transferów do zespołu menedżerów w sezonie.",
    labelEn: "Transfers in (season)",
    shortLabelEn: "TI",
    descriptionEn: "Total transfers into managers' teams this season.",
    category: "VALUE_TRANSFERS",
    supportsPer90: false,
    decimals: 0,
  },
  {
    key: "transfers_out",
    labelPl: "Transfery Z (sezon)",
    shortLabelPl: "TO",
    descriptionPl: "Łączna liczba transferów z zespołów menedżerów w sezonie.",
    labelEn: "Transfers out (season)",
    shortLabelEn: "TO",
    descriptionEn: "Total transfers out of managers' teams this season.",
    category: "VALUE_TRANSFERS",
    supportsPer90: false,
    decimals: 0,
  },
  {
    key: "transfers_in_event",
    labelPl: "Transfery DO (GW)",
    shortLabelPl: "TI GW",
    descriptionPl: "Transfery DO w bieżącej kolejce.",
    labelEn: "Transfers in (GW)",
    shortLabelEn: "TI GW",
    descriptionEn: "Transfers in during the current gameweek.",
    category: "VALUE_TRANSFERS",
    supportsPer90: false,
    decimals: 0,
  },
  {
    key: "transfers_out_event",
    labelPl: "Transfery Z (GW)",
    shortLabelPl: "TO GW",
    descriptionPl: "Transfery Z w bieżącej kolejce.",
    labelEn: "Transfers out (GW)",
    shortLabelEn: "TO GW",
    descriptionEn: "Transfers out during the current gameweek.",
    category: "VALUE_TRANSFERS",
    supportsPer90: false,
    decimals: 0,
  },
  {
    key: "net_transfers_gw",
    labelPl: "Bilans transferów (GW)",
    shortLabelPl: "NT GW",
    descriptionPl: "Bilans transferów w kolejce: TI(GW) − TO(GW).",
    labelEn: "Net transfers (GW)",
    shortLabelEn: "NT GW",
    descriptionEn: "Gameweek net transfers: TI(GW) − TO(GW).",
    category: "VALUE_TRANSFERS",
    supportsPer90: false,
    decimals: 0,
    computed: true,
  },

  // ── GOAL_THREAT ──
  {
    key: "goals_scored",
    labelPl: "Gole",
    shortLabelPl: "GS",
    descriptionPl: "Liczba zdobytych goli.",
    labelEn: "Goals scored",
    shortLabelEn: "GS",
    descriptionEn: "Number of goals scored.",
    category: "GOAL_THREAT",
    supportsPer90: true,
    decimals: 0,
  },
  {
    key: "expected_goals",
    labelPl: "Expected Goals",
    shortLabelPl: "xG",
    descriptionPl: "Oczekiwane gole (jakość sytuacji strzeleckich).",
    labelEn: "Expected goals",
    shortLabelEn: "xG",
    descriptionEn: "Expected goals from shot quality.",
    category: "GOAL_THREAT",
    supportsPer90: true,
    decimals: 2,
  },
  {
    key: "goals_vs_xg",
    labelPl: "Gole vs xG",
    shortLabelPl: "G−xG",
    descriptionPl: "Over/underperformance: gole minus expected goals.",
    labelEn: "Goals vs xG",
    shortLabelEn: "G−xG",
    descriptionEn: "Over/underperformance: goals minus expected goals.",
    category: "GOAL_THREAT",
    supportsPer90: true,
    decimals: 2,
    computed: true,
  },
  {
    key: "threat",
    labelPl: "Threat",
    shortLabelPl: "Threat",
    descriptionPl: "Indeks ICT Threat — zagrożenie ofensywne.",
    labelEn: "Threat",
    shortLabelEn: "Threat",
    descriptionEn: "ICT Threat index — attacking threat.",
    category: "GOAL_THREAT",
    supportsPer90: true,
    decimals: 1,
  },
  {
    key: "goals_assists",
    labelPl: "Gole + Asysty",
    shortLabelPl: "G+A",
    descriptionPl: "Suma goli i asyst.",
    labelEn: "Goals + Assists",
    shortLabelEn: "G+A",
    descriptionEn: "Combined goals and assists.",
    category: "GOAL_THREAT",
    supportsPer90: true,
    decimals: 0,
    computed: true,
  },
  {
    key: "expected_goal_involvements",
    labelPl: "Expected Goal Involvements",
    shortLabelPl: "xGI",
    descriptionPl: "Oczekiwane udziałe w golach (xG + xA).",
    labelEn: "Expected goal involvements",
    shortLabelEn: "xGI",
    descriptionEn: "Expected goal involvements (xG + xA).",
    category: "GOAL_THREAT",
    supportsPer90: true,
    decimals: 2,
  },

  // ── CREATIVITY ──
  {
    key: "assists",
    labelPl: "Asysty",
    shortLabelPl: "A",
    descriptionPl: "Liczba asyst FPL.",
    labelEn: "Assists",
    shortLabelEn: "A",
    descriptionEn: "Number of FPL assists.",
    category: "CREATIVITY",
    supportsPer90: true,
    decimals: 0,
  },
  {
    key: "expected_assists",
    labelPl: "Expected Assists",
    shortLabelPl: "xA",
    descriptionPl: "Oczekiwane asysty.",
    labelEn: "Expected assists",
    shortLabelEn: "xA",
    descriptionEn: "Expected assists.",
    category: "CREATIVITY",
    supportsPer90: true,
    decimals: 2,
  },
  {
    key: "creativity",
    labelPl: "Creativity",
    shortLabelPl: "Crea",
    descriptionPl: "Indeks ICT Creativity — kreacja okazji.",
    labelEn: "Creativity",
    shortLabelEn: "Crea",
    descriptionEn: "ICT Creativity index — chance creation.",
    category: "CREATIVITY",
    supportsPer90: true,
    decimals: 1,
  },
  {
    key: "influence",
    labelPl: "Influence",
    shortLabelPl: "Inf",
    descriptionPl: "Indeks ICT Influence — wpływ na mecz.",
    labelEn: "Influence",
    shortLabelEn: "Inf",
    descriptionEn: "ICT Influence index — impact on the match.",
    category: "CREATIVITY",
    supportsPer90: true,
    decimals: 1,
  },
  {
    key: "ict_index",
    labelPl: "ICT Index",
    shortLabelPl: "ICT",
    descriptionPl: "Złożony indeks Influence + Creativity + Threat.",
    labelEn: "ICT Index",
    shortLabelEn: "ICT",
    descriptionEn: "Combined Influence + Creativity + Threat index.",
    category: "CREATIVITY",
    supportsPer90: true,
    decimals: 1,
  },
  {
    key: "bonus",
    labelPl: "Punkty bonusowe",
    shortLabelPl: "Bonus",
    descriptionPl: "Suma punktów bonusowych FPL (1–3 za mecz).",
    labelEn: "Bonus points",
    shortLabelEn: "Bonus",
    descriptionEn: "Total FPL bonus points (1–3 per match).",
    category: "CREATIVITY",
    supportsPer90: true,
    decimals: 0,
  },
  {
    key: "bps",
    labelPl: "Bonus Points System",
    shortLabelPl: "BPS",
    descriptionPl: "Suma punktów BPS decydujących o bonusie.",
    labelEn: "Bonus Points System",
    shortLabelEn: "BPS",
    descriptionEn: "Total BPS score used to award bonus points.",
    category: "CREATIVITY",
    supportsPer90: true,
    decimals: 0,
  },

  // ── DEFENDING_DC ──
  {
    key: "clean_sheets",
    labelPl: "Czyste konta",
    shortLabelPl: "CS",
    descriptionPl: "Mecze bez straconego gola (Clean Sheets).",
    labelEn: "Clean sheets",
    shortLabelEn: "CS",
    descriptionEn: "Matches without conceding a goal.",
    category: "DEFENDING_DC",
    supportsPer90: false,
    decimals: 0,
  },
  {
    key: "defensive_contributions_total",
    labelPl: "Defensive Contributions (suma)",
    shortLabelPl: "DC",
    descriptionPl:
      "Suma DC: DEF = CBI + Tackles; MID/FWD = CBI + Tackles + Recoveries.",
    labelEn: "Defensive contributions (total)",
    shortLabelEn: "DC",
    descriptionEn:
      "DC total: DEF = CBI + Tackles; MID/FWD = CBI + Tackles + Recoveries.",
    category: "DEFENDING_DC",
    supportsPer90: true,
    decimals: 0,
    computed: true,
  },
  {
    key: "dc_bonus_matches",
    labelPl: "Mecze z progiem DC (+2)",
    shortLabelPl: "DC Mecz",
    descriptionPl:
      "Liczba meczów z progiem DC: DEF ≥10 CBI+TKL, MID/FWD ≥12 CBI+TKL+REC.",
    labelEn: "DC threshold matches",
    shortLabelEn: "DC Hit",
    descriptionEn:
      "Matches hitting the DC threshold: DEF ≥10 CBI+TKL, MID/FWD ≥12 CBI+TKL+REC.",
    category: "DEFENDING_DC",
    supportsPer90: false,
    decimals: 0,
    computed: true,
  },
  {
    key: "dc_bonus_points",
    labelPl: "Punkty FPL z DC",
    shortLabelPl: "DC Pkt",
    descriptionPl: "Punkty FPL z Defensive Contributions: mecze z progiem × 2.",
    labelEn: "DC bonus points",
    shortLabelEn: "DC Pts",
    descriptionEn: "FPL points from Defensive Contributions: threshold matches × 2.",
    category: "DEFENDING_DC",
    supportsPer90: false,
    decimals: 0,
    computed: true,
  },
  {
    key: "clearances_blocks_interceptions",
    labelPl: "Wybicia, bloki i przechwyty",
    shortLabelPl: "CBI",
    descriptionPl: "Clearances + Blocks + Interceptions.",
    labelEn: "Clearances, blocks & interceptions",
    shortLabelEn: "CBI",
    descriptionEn: "Clearances + Blocks + Interceptions.",
    category: "DEFENDING_DC",
    supportsPer90: true,
    decimals: 0,
  },
  {
    key: "tackles",
    labelPl: "Wślizgi / pojedynki",
    shortLabelPl: "TKL",
    descriptionPl: "Wygrane wślizgi i pojedynki (tackles).",
    labelEn: "Tackles",
    shortLabelEn: "TKL",
    descriptionEn: "Successful tackles.",
    category: "DEFENDING_DC",
    supportsPer90: true,
    decimals: 0,
  },
  {
    key: "recoveries",
    labelPl: "Odzyskania piłki",
    shortLabelPl: "REC",
    descriptionPl: "Odzyskania piłki (recoveries) — istotne dla DC MID/FWD.",
    labelEn: "Recoveries",
    shortLabelEn: "REC",
    descriptionEn: "Ball recoveries — count toward MID/FWD DC.",
    category: "DEFENDING_DC",
    supportsPer90: true,
    decimals: 0,
  },
  {
    key: "saves",
    labelPl: "Obrony bramkarskie",
    shortLabelPl: "S",
    descriptionPl: "Liczba obron bramkarza.",
    labelEn: "Saves",
    shortLabelEn: "S",
    descriptionEn: "Goalkeeper saves.",
    category: "DEFENDING_DC",
    supportsPer90: true,
    decimals: 0,
  },
  {
    key: "goals_conceded",
    labelPl: "Stracone gole",
    shortLabelPl: "GC",
    descriptionPl: "Gole stracone przez drużynę przy udziale zawodnika.",
    labelEn: "Goals conceded",
    shortLabelEn: "GC",
    descriptionEn: "Goals conceded while the player was on the pitch.",
    category: "DEFENDING_DC",
    supportsPer90: true,
    invertScale: true,
    decimals: 0,
  },
  {
    key: "expected_goals_conceded",
    labelPl: "Expected Goals Conceded",
    shortLabelPl: "xGC",
    descriptionPl: "Oczekiwane stracone gole.",
    labelEn: "Expected goals conceded",
    shortLabelEn: "xGC",
    descriptionEn: "Expected goals conceded.",
    category: "DEFENDING_DC",
    supportsPer90: true,
    invertScale: true,
    decimals: 2,
  },

  // ── DISCIPLINE ──
  {
    key: "yellow_cards",
    labelPl: "Żółte kartki",
    shortLabelPl: "YC",
    descriptionPl: "Żółte kartki (−1 pkt FPL za każdą).",
    labelEn: "Yellow cards",
    shortLabelEn: "YC",
    descriptionEn: "Yellow cards (−1 FPL point each).",
    category: "DISCIPLINE",
    supportsPer90: false,
    invertScale: true,
    decimals: 0,
  },
  {
    key: "red_cards",
    labelPl: "Czerwone kartki",
    shortLabelPl: "RC",
    descriptionPl: "Czerwone kartki (−3 pkt FPL za każdą).",
    labelEn: "Red cards",
    shortLabelEn: "RC",
    descriptionEn: "Red cards (−3 FPL points each).",
    category: "DISCIPLINE",
    supportsPer90: false,
    invertScale: true,
    decimals: 0,
  },
  {
    key: "own_goals",
    labelPl: "Gole samobójcze",
    shortLabelPl: "OG",
    descriptionPl: "Gole samobójcze (−2 pkt FPL za każdy).",
    labelEn: "Own goals",
    shortLabelEn: "OG",
    descriptionEn: "Own goals (−2 FPL points each).",
    category: "DISCIPLINE",
    supportsPer90: false,
    invertScale: true,
    decimals: 0,
  },
  {
    key: "penalties_saved",
    labelPl: "Rzuty karne obronione",
    shortLabelPl: "PS",
    descriptionPl: "Obronione rzuty karne (+5 pkt FPL).",
    labelEn: "Penalties saved",
    shortLabelEn: "PS",
    descriptionEn: "Penalties saved (+5 FPL points each).",
    category: "DISCIPLINE",
    supportsPer90: false,
    decimals: 0,
  },
  {
    key: "penalties_missed",
    labelPl: "Rzuty karne zmarnowane",
    shortLabelPl: "PM",
    descriptionPl: "Zmarnowane rzuty karne (−2 pkt FPL).",
    labelEn: "Penalties missed",
    shortLabelEn: "PM",
    descriptionEn: "Penalties missed (−2 FPL points each).",
    category: "DISCIPLINE",
    supportsPer90: false,
    invertScale: true,
    decimals: 0,
  },
] as const;

export function getFplStatDefinition(key: FplStatKey): FplStatDefinition | undefined {
  return FPL_STAT_DEFINITIONS.find((d) => d.key === key);
}

export function getFplStatsByCategory(
  category: FplStatCategory,
): readonly FplStatDefinition[] {
  return FPL_STAT_DEFINITIONS.filter((d) => d.category === category);
}

/* ─────────────────────────────────────────────────
 * Rozbicie punktów FPL + serie (passy)
 * ───────────────────────────────────────────────── */

export type FplPointsPositiveBreakdown = {
  /**
   * Suma punktów za minuty (`appearanceBasePts + sixtyPlusPts`).
   * Zachowane dla kompatybilności / sortowania.
   */
  appearancePts: number;
  /** +1 pkt za każdy mecz z minutes >= 1. */
  appearanceBasePts: number;
  /** +1 pkt za każdy mecz z minutes >= 60. */
  sixtyPlusPts: number;
  goalPts: number;
  assistPts: number;
  cleanSheetPts: number;
  dcPts: number;
  savePts: number;
  penaltySavePts: number;
  bonusPts: number;
};

export type FplPointsNegativeBreakdown = {
  /** Ujemne wartości (lub 0). */
  goalsConcededDeduction: number;
  yellowCardDeduction: number;
  redCardDeduction: number;
  penaltyMissDeduction: number;
  ownGoalDeduction: number;
};

export type FplPointsBreakdown = {
  positiveBreakdown: FplPointsPositiveBreakdown;
  negativeBreakdown: FplPointsNegativeBreakdown;
  positiveTotal: number;
  /** Suma kar (ujemna lub 0). */
  negativeTotal: number;
  estimatedTotal: number;
  /** true = wyliczone mecz-po-meczu z historii GW. */
  fromHistory: boolean;
};

/** Mini-historia ostatnich meczów (chronologicznie, od najstarszego). */
export type PlayerStreakRecentFlags = {
  returnHit: boolean[];
  goalHit: boolean[];
  assistHit: boolean[];
  goalOrAssistHit: boolean[];
  cleanSheetHit: boolean[];
  dcHit: boolean[];
  sixtyMinHit: boolean[];
  savesHit: boolean[];
  bonusHit: boolean[];
};

export type PlayerStreaks = {
  maxReturnStreak: number;
  currentReturnStreak: number;
  maxGoalStreak: number;
  currentGoalStreak: number;
  maxAssistStreak: number;
  currentAssistStreak: number;
  maxGoalOrAssistStreak: number;
  currentGoalOrAssistStreak: number;
  maxCleanSheetStreak: number;
  currentCleanSheetStreak: number;
  maxDcPointsStreak: number;
  currentDcPointsStreak: number;
  max60MinStreak: number;
  current60MinStreak: number;
  /** Seria meczów z +1 pkt za obrony GK (`saves >= 3`). */
  maxSavesPointStreak: number;
  currentSavesPointStreak: number;
  /** Seria meczów z bonusem BPS (`bonus >= 1`). */
  maxBonusStreak: number;
  currentBonusStreak: number;
  /**
   * % meczów z `minutes > 0`, w których zaliczono Zwrot FPL
   * (ta sama definicja co serie zwrotów) — 0–100, `Math.round`.
   */
  returnConsistencyPct: number;
  /**
   * Ostatnie do 10 meczów — rzeczywista chronologia (ASC), nie „pierwsze N od lewej”.
   * `timelineDots` === `returnTimelineDots` (alias wstecznej kompatybilności).
   */
  timelineDots: boolean[];
  returnTimelineDots: boolean[];
  goalTimelineDots: boolean[];
  assistTimelineDots: boolean[];
  gaTimelineDots: boolean[];
  csTimelineDots: boolean[];
  dcTimelineDots: boolean[];
  sixtyMinTimelineDots: boolean[];
  savesTimelineDots: boolean[];
  bonusTimelineDots: boolean[];
  /** Ostatnie mecze per typ serii — kropki w kartach Eksploratora Pass. */
  recentFlags: PlayerStreakRecentFlags;
};

/** Progi Defensive Contributions wg regulaminu FPL. */
export const FPL_DC_THRESHOLD_DEF = 10;
export const FPL_DC_THRESHOLD_MID_FWD = 12;
export const FPL_DC_BONUS_POINTS = 2;
