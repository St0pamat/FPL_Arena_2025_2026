/**
 * Stats Centre — etykiety PL / EN.
 */

import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import type {
  StatsCentreMode,
  StatsCentrePlayerTab,
  StatsCentreRangeMode,
  StatsCentreTeamTab,
} from "@/lib/stats-lab/statsCentreEngine";

export const CENTRE_MODE_LABELS: Record<
  StatsLabLang,
  Record<StatsCentreMode, string>
> = {
  pl: {
    PLAYERS: "Zawodnicy",
    PER_GW: "Mecz po meczu",
    TEAMS: "Kluby",
  },
  en: {
    PLAYERS: "Players",
    PER_GW: "Per GW",
    TEAMS: "Teams",
  },
};

export const CENTRE_RANGE_LABELS: Record<
  StatsLabLang,
  Record<StatsCentreRangeMode, string>
> = {
  pl: {
    ALL_MATCHES: "Wszystkie mecze",
    GW_RANGE: "Zakres kolejek (od–do)",
    ALL_HOME: "Mecze domowe",
    ALL_AWAY: "Mecze wyjazdowe",
    LAST_6_GW: "Ostatnie 6 kolejek ligowych",
    LAST_4_GW: "Ostatnie 4 kolejki ligowe",
    LAST_6_MATCHES: "Ostatnie 6 rozegranych meczów",
    LAST_4_MATCHES: "Ostatnie 4 rozegrane mecze",
  },
  en: {
    ALL_MATCHES: "All matches",
    GW_RANGE: "Gameweek range",
    ALL_HOME: "All home matches",
    ALL_AWAY: "All away matches",
    LAST_6_GW: "Last six Gameweeks",
    LAST_4_GW: "Last four Gameweeks",
    LAST_6_MATCHES: "Last six matches",
    LAST_4_MATCHES: "Last four matches",
  },
};

export const PLAYER_TAB_LABELS: Record<
  StatsLabLang,
  Record<StatsCentrePlayerTab, string>
> = {
  pl: {
    OVERVIEW: "Ogólne",
    GOAL_THREAT: "Zagrożenie Bramkowe",
    CREATIVITY: "Kreacja",
    DEFENDING: "Defensywa i DC",
    SET_PIECES: "Stałe Fragmenty",
    DISCIPLINE: "Dyscyplina",
    EXPECTED: "Oczekiwane xG",
    VALUE_MARKET: "Wartość i Transfery",
  },
  en: {
    OVERVIEW: "Overview",
    GOAL_THREAT: "Goal Threat",
    CREATIVITY: "Creativity",
    DEFENDING: "Defending",
    SET_PIECES: "Set Pieces",
    DISCIPLINE: "Discipline",
    EXPECTED: "Expected",
    VALUE_MARKET: "Value & Market",
  },
};

export const TEAM_TAB_LABELS: Record<
  StatsLabLang,
  Record<StatsCentreTeamTab, string>
> = {
  pl: {
    TEAM_OVERVIEW: "Przegląd",
    TEAM_ATTACKING: "Atak",
    TEAM_DEFENDING: "Defensywa",
    TEAM_EXPECTED: "Oczekiwane",
  },
  en: {
    TEAM_OVERVIEW: "Overview",
    TEAM_ATTACKING: "Attacking",
    TEAM_DEFENDING: "Defending",
    TEAM_EXPECTED: "Expected",
  },
};

const COL_LABELS: Record<
  StatsLabLang,
  Record<string, { label: string; short: string }>
> = {
  pl: {
    price: { label: "Cena", short: "£m" },
    starts: { label: "Starty", short: "ST" },
    minutes: { label: "Minuty", short: "Min" },
    selected_by_percent: { label: "Posiadanie %", short: "Own%" },
    total_points: { label: "Punkty FPL", short: "Pts" },
    goals_scored: { label: "Gole", short: "Gls" },
    assists: { label: "Asysty", short: "Ast" },
    goals_assists: { label: "G+A", short: "G+A" },
    dd_hauls: { label: "DD Hauls (≥10 pkt)", short: "DD" },
    bonus: { label: "Bonus", short: "Bon" },
    bps: { label: "BPS", short: "BPS" },
    form: { label: "Forma", short: "Form" },
    points_per_game: { label: "Pkt / mecz", short: "PPM" },
    expected_goals: { label: "xG", short: "xG" },
    xg_delta: { label: "Gls − xG", short: "ΔxG" },
    threat: { label: "Threat", short: "Thr" },
    mins_per_goal: { label: "Minuty / gol", short: "Min/G" },
    mins_per_xg: { label: "Minuty / xG", short: "Min/xG" },
    expected_goal_involvements: { label: "xGI", short: "xGI" },
    penalties_order: { label: "Kolejność karnych", short: "Pen#" },
    expected_assists: { label: "xA", short: "xA" },
    xa_delta: { label: "Ast − xA", short: "ΔxA" },
    creativity: { label: "Creativity", short: "Crea" },
    influence: { label: "Influence", short: "Inf" },
    ict_index: { label: "ICT Index", short: "ICT" },
    mins_per_assist: { label: "Minuty / asysta", short: "Min/A" },
    corners_order: { label: "Kolejność rożnych", short: "CK#" },
    clean_sheets: { label: "Czyste konta", short: "CS" },
    goals_conceded: { label: "Stracone gole", short: "GC" },
    defensive_contributions_total: { label: "Suma DC", short: "DefCon" },
    dc_bonus_points: { label: "Punkty DC", short: "DC Pts" },
    dc_hit_rate_pct: { label: "DC % (hit rate)", short: "DC%" },
    recoveries: { label: "Odzyskania", short: "Rec" },
    tackles: { label: "Wślizgi", short: "Tkl" },
    clearances_blocks_interceptions: { label: "CBI", short: "CBI" },
    saves: { label: "Obrony GK", short: "Saves" },
    expected_goals_conceded: { label: "xGC", short: "xGC" },
    corners_and_indirect_freekicks_order: {
      label: "Rożne i pośrednie",
      short: "CK/IFK#",
    },
    direct_freekicks_order: { label: "Wolne bezpośrednie", short: "DFK#" },
    penalties_saved: { label: "Obronione karne", short: "PS" },
    penalties_missed: { label: "Zmarnowane karne", short: "PM" },
    yellow_cards: { label: "Żółte kartki", short: "YC" },
    red_cards: { label: "Czerwone kartki", short: "RC" },
    own_goals: { label: "Samobóje", short: "OG" },
    negative_points_total: { label: "Stracone punkty", short: "Neg" },
    xgi_delta: { label: "(G+A) − xGI", short: "ΔxGI" },
    xgc_delta: { label: "GC − xGC", short: "ΔxGC" },
    value_season: { label: "Wartość sezon (Pts/£)", short: "V(S)" },
    value_form: { label: "Wartość forma", short: "V(F)" },
    cost_change_start: { label: "Zmiana ceny sezon", short: "Δ£ S" },
    cost_change_event: { label: "Zmiana ceny GW", short: "Δ£ GW" },
    transfers_in_event: { label: "Transfery in GW", short: "TI" },
    transfers_out_event: { label: "Transfery out GW", short: "TO" },
    net_transfers_gw: { label: "Bilans transferów GW", short: "Net T" },
    dreamteam_count: { label: "Dream Team", short: "DT" },
    gameweek: { label: "Kolejka", short: "GW" },
    opponent_label: { label: "Przeciwnik", short: "Opp" },
    matches_played: { label: "Mecze", short: "M" },
    goal_diff: { label: "Bilans bramek", short: "+/−" },
    net_xg_balance: { label: "Net xG (xG − xGC)", short: "Net xG" },
  },
  en: {
    price: { label: "Price", short: "£m" },
    starts: { label: "Starts", short: "ST" },
    minutes: { label: "Minutes", short: "Mins" },
    selected_by_percent: { label: "Ownership %", short: "Own%" },
    total_points: { label: "Total points", short: "Pts" },
    goals_scored: { label: "Goals", short: "Gls" },
    assists: { label: "Assists", short: "Ast" },
    goals_assists: { label: "G+A", short: "G+A" },
    dd_hauls: { label: "DD Hauls (≥10 pts)", short: "DD" },
    bonus: { label: "Bonus", short: "Bon" },
    bps: { label: "BPS", short: "BPS" },
    form: { label: "Form", short: "Form" },
    points_per_game: { label: "Pts per match", short: "PPM" },
    expected_goals: { label: "xG", short: "xG" },
    xg_delta: { label: "Gls − xG", short: "ΔxG" },
    threat: { label: "Threat", short: "Thr" },
    mins_per_goal: { label: "Mins per goal", short: "Min/G" },
    mins_per_xg: { label: "Mins per xG", short: "Min/xG" },
    expected_goal_involvements: { label: "xGI", short: "xGI" },
    penalties_order: { label: "Penalties order", short: "Pen#" },
    expected_assists: { label: "xA", short: "xA" },
    xa_delta: { label: "Ast − xA", short: "ΔxA" },
    creativity: { label: "Creativity", short: "Crea" },
    influence: { label: "Influence", short: "Inf" },
    ict_index: { label: "ICT Index", short: "ICT" },
    mins_per_assist: { label: "Mins per assist", short: "Min/A" },
    corners_order: { label: "Corners order", short: "CK#" },
    clean_sheets: { label: "Clean sheets", short: "CS" },
    goals_conceded: { label: "Goals conceded", short: "GC" },
    defensive_contributions_total: { label: "DefCon total", short: "DefCon" },
    dc_bonus_points: { label: "DC points", short: "DC Pts" },
    dc_hit_rate_pct: { label: "DC hit rate %", short: "DC%" },
    recoveries: { label: "Recoveries", short: "Rec" },
    tackles: { label: "Tackles", short: "Tkl" },
    clearances_blocks_interceptions: { label: "CBI", short: "CBI" },
    saves: { label: "Saves", short: "Saves" },
    expected_goals_conceded: { label: "xGC", short: "xGC" },
    corners_and_indirect_freekicks_order: {
      label: "Corners & indirect FK",
      short: "CK/IFK#",
    },
    direct_freekicks_order: { label: "Direct free-kicks", short: "DFK#" },
    penalties_saved: { label: "Penalties saved", short: "PS" },
    penalties_missed: { label: "Penalties missed", short: "PM" },
    yellow_cards: { label: "Yellow cards", short: "YC" },
    red_cards: { label: "Red cards", short: "RC" },
    own_goals: { label: "Own goals", short: "OG" },
    negative_points_total: { label: "Points lost", short: "Neg" },
    xgi_delta: { label: "(G+A) − xGI", short: "ΔxGI" },
    xgc_delta: { label: "GC − xGC", short: "ΔxGC" },
    value_season: { label: "Value season (Pts/£)", short: "V(S)" },
    value_form: { label: "Value form", short: "V(F)" },
    cost_change_start: { label: "Price change season", short: "Δ£ S" },
    cost_change_event: { label: "Price change GW", short: "Δ£ GW" },
    transfers_in_event: { label: "Transfers in GW", short: "TI" },
    transfers_out_event: { label: "Transfers out GW", short: "TO" },
    net_transfers_gw: { label: "Net transfers GW", short: "Net T" },
    dreamteam_count: { label: "Dream Team", short: "DT" },
    gameweek: { label: "Gameweek", short: "GW" },
    opponent_label: { label: "Opponent", short: "Opp" },
    matches_played: { label: "Matches", short: "M" },
    goal_diff: { label: "Goal difference", short: "+/−" },
    net_xg_balance: { label: "Net xG (xG − xGC)", short: "Net xG" },
  },
};

export function centreColShort(key: string, lang: StatsLabLang): string {
  return COL_LABELS[lang][key]?.short ?? key;
}

export function centreColLabel(key: string, lang: StatsLabLang): string {
  return COL_LABELS[lang][key]?.label ?? key;
}

export const CENTRE_UI = {
  pl: {
    title: "Stats Centre",
    subtitle:
      "Tabele analityczne zawodników, występów meczowych i 20 klubów PL — wzorowane na Fantasy Football Scout.",
    moduleCentre: "📊 Stats Centre (Tabele Analityczne)",
    moduleStudio: "📈 Studio Wykresów (Wizualizacje)",
    range: "Zakres",
    apply: "Zastosuj",
    season: "Sezon",
    position: "Pozycja",
    allPositions: "Wszystkie",
    team: "Klub",
    allTeams: "Wszystkie kluby",
    dataType: "Typ danych",
    totals: "Totals (Suma)",
    per90: "Per 90",
    search: "Szukaj graczy lub klubów…",
    advanced: "Zaawansowane",
    minMinutes: "Min. minut",
    maxPrice: "Maks. cena £m",
    maxOwn: "Maks. posiadanie %",
    watchlist: "Ulubieni",
    compareInStudio: "Porównaj wybranych w Studiu Wykresów",
    downloadPng: "Pobierz PNG Tabeli",
    copyPng: "Kopiuj PNG",
    colourLegend:
      "Skala kolorów: im bardziej zielony, tym lepszy wynik w aktualnej grupie",
    rowsPerPage: "Wierszy",
    prev: "Poprzednia",
    next: "Następna",
    player: "Zawodnik",
    empty: "Brak wierszy dla wybranych filtrów.",
    gwFrom: "GW od",
    gwTo: "GW do",
    copied: "Skopiowano PNG do schowka!",
    saved: "Zapisano PNG tabeli.",
  },
  en: {
    title: "Stats Centre",
    subtitle:
      "Analytical tables for players, match appearances and all 20 PL clubs — Fantasy Football Scout style.",
    moduleCentre: "📊 Stats Centre (Tables)",
    moduleStudio: "📈 Chart Studio (Visualisations)",
    range: "Range",
    apply: "Apply",
    season: "Season",
    position: "Position",
    allPositions: "All",
    team: "Team",
    allTeams: "All teams",
    dataType: "Data type",
    totals: "Totals",
    per90: "Per 90",
    search: "Search players or teams…",
    advanced: "Advanced",
    minMinutes: "Min. minutes",
    maxPrice: "Max price £m",
    maxOwn: "Max ownership %",
    watchlist: "Watchlist",
    compareInStudio: "Compare selected in Chart Studio",
    downloadPng: "Download table PNG",
    copyPng: "Copy PNG",
    colourLegend:
      "Colour scale: greener = better among current players",
    rowsPerPage: "Rows",
    prev: "Prev",
    next: "Next",
    player: "Player",
    empty: "No rows for the selected filters.",
    gwFrom: "GW from",
    gwTo: "GW to",
    copied: "Table PNG copied to clipboard!",
    saved: "Table PNG saved.",
  },
} as const;

export function centreUi(lang: StatsLabLang) {
  return CENTRE_UI[lang];
}
