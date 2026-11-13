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
    price: { label: "Cena", short: "£M" },
    starts: { label: "Starty", short: "ST" },
    minutes: { label: "Minuty", short: "MIN" },
    selected_by_percent: { label: "Posiadanie %", short: "OWN%" },
    total_points: { label: "Punkty FPL", short: "PTS" },
    goals_scored: { label: "Gole", short: "GLS" },
    assists: { label: "Asysty", short: "AST" },
    goals_assists: { label: "G+A", short: "G+A" },
    dd_hauls: { label: "DD Hauls (≥10 pkt)", short: "DD" },
    bonus: { label: "Bonus", short: "BON" },
    bps: { label: "BPS", short: "BPS" },
    form: { label: "Forma", short: "FORM" },
    points_per_game: { label: "Pkt / mecz", short: "PPM" },
    expected_goals: { label: "xG", short: "xG" },
    xg_delta: { label: "Gls − xG", short: "ΔxG" },
    threat: { label: "Threat", short: "THR" },
    mins_per_goal: { label: "Minuty / gol", short: "Min/G" },
    mins_per_xg: { label: "Minuty / xG", short: "Min/xG" },
    expected_goal_involvements: { label: "xGI", short: "xGI" },
    penalties_order: { label: "Kolejność karnych", short: "Pen#" },
    expected_assists: { label: "xA", short: "xA" },
    xa_delta: { label: "Ast − xA", short: "ΔxA" },
    creativity: { label: "Creativity", short: "CREA" },
    influence: { label: "Influence", short: "INF" },
    ict_index: { label: "ICT Index", short: "ICT" },
    mins_per_assist: { label: "Minuty / asysta", short: "Min/A" },
    corners_order: { label: "Kolejność rożnych", short: "CK#" },
    clean_sheets: { label: "Czyste konta", short: "CS" },
    goals_conceded: { label: "Stracone gole", short: "GC" },
    defensive_contributions_total: { label: "Suma DC", short: "DC" },
    dc_bonus_points: { label: "Punkty DC", short: "DC Pkt" },
    dc_bonus_matches: { label: "Mecze z bonusem DC", short: "DC Mecz" },
    dc_hit_rate_pct: { label: "DC % (hit rate)", short: "DC %" },
    recoveries: { label: "Odzyskania", short: "REC" },
    tackles: { label: "Wślizgi", short: "TKL" },
    clearances_blocks_interceptions: { label: "CBI", short: "CBI" },
    saves: { label: "Obrony GK", short: "SAV" },
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
    negative_points_total: { label: "Stracone punkty", short: "NEG" },
    xgi_delta: { label: "(G+A) − xGI", short: "ΔxGI" },
    xgc_delta: { label: "GC − xGC", short: "ΔxGC" },
    value_season: { label: "Wartość sezon (Pts/£)", short: "V(S)" },
    value_form: { label: "Wartość forma", short: "V(F)" },
    cost_change_start: { label: "Zmiana ceny sezon", short: "Δ£ S" },
    cost_change_event: { label: "Zmiana ceny GW", short: "Δ£ GW" },
    transfers_in_event: { label: "Transfery in GW", short: "TI" },
    transfers_out_event: { label: "Transfery out GW", short: "TO" },
    net_transfers_gw: { label: "Bilans transferów GW", short: "NET T" },
    dreamteam_count: { label: "Dream Team", short: "DT" },
    gameweek: { label: "Kolejka", short: "GW" },
    opponent_label: { label: "Przeciwnik", short: "OPP" },
    matches_played: { label: "Mecze", short: "M" },
    goal_diff: { label: "Bilans bramek", short: "+/−" },
    net_xg_balance: { label: "Net xG (xG − xGC)", short: "Net xG" },
  },
  en: {
    price: { label: "Price", short: "£M" },
    starts: { label: "Starts", short: "ST" },
    minutes: { label: "Minutes", short: "MIN" },
    selected_by_percent: { label: "Ownership %", short: "OWN%" },
    total_points: { label: "Total points", short: "PTS" },
    goals_scored: { label: "Goals", short: "GLS" },
    assists: { label: "Assists", short: "AST" },
    goals_assists: { label: "G+A", short: "G+A" },
    dd_hauls: { label: "DD Hauls (≥10 pts)", short: "DD" },
    bonus: { label: "Bonus", short: "BON" },
    bps: { label: "BPS", short: "BPS" },
    form: { label: "Form", short: "FORM" },
    points_per_game: { label: "Pts per match", short: "PPM" },
    expected_goals: { label: "xG", short: "xG" },
    xg_delta: { label: "Gls − xG", short: "ΔxG" },
    threat: { label: "Threat", short: "THR" },
    mins_per_goal: { label: "Mins per goal", short: "Min/G" },
    mins_per_xg: { label: "Mins per xG", short: "Min/xG" },
    expected_goal_involvements: { label: "xGI", short: "xGI" },
    penalties_order: { label: "Penalties order", short: "Pen#" },
    expected_assists: { label: "xA", short: "xA" },
    xa_delta: { label: "Ast − xA", short: "ΔxA" },
    creativity: { label: "Creativity", short: "CREA" },
    influence: { label: "Influence", short: "INF" },
    ict_index: { label: "ICT Index", short: "ICT" },
    mins_per_assist: { label: "Mins per assist", short: "Min/A" },
    corners_order: { label: "Corners order", short: "CK#" },
    clean_sheets: { label: "Clean sheets", short: "CS" },
    goals_conceded: { label: "Goals conceded", short: "GC" },
    defensive_contributions_total: { label: "DefCon total", short: "DC" },
    dc_bonus_points: { label: "DC points", short: "DC Pts" },
    dc_bonus_matches: { label: "DC bonus matches", short: "DC M" },
    dc_hit_rate_pct: { label: "DC hit rate %", short: "DC %" },
    recoveries: { label: "Recoveries", short: "REC" },
    tackles: { label: "Tackles", short: "TKL" },
    clearances_blocks_interceptions: { label: "CBI", short: "CBI" },
    saves: { label: "Saves", short: "SAV" },
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
    negative_points_total: { label: "Points lost", short: "NEG" },
    xgi_delta: { label: "(G+A) − xGI", short: "ΔxGI" },
    xgc_delta: { label: "GC − xGC", short: "ΔxGC" },
    value_season: { label: "Value season (Pts/£)", short: "V(S)" },
    value_form: { label: "Value form", short: "V(F)" },
    cost_change_start: { label: "Price change season", short: "Δ£ S" },
    cost_change_event: { label: "Price change GW", short: "Δ£ GW" },
    transfers_in_event: { label: "Transfers in GW", short: "TI" },
    transfers_out_event: { label: "Transfers out GW", short: "TO" },
    net_transfers_gw: { label: "Net transfers GW", short: "NET T" },
    dreamteam_count: { label: "Dream Team", short: "DT" },
    gameweek: { label: "Gameweek", short: "GW" },
    opponent_label: { label: "Opponent", short: "OPP" },
    matches_played: { label: "Matches", short: "M" },
    goal_diff: { label: "Goal difference", short: "+/−" },
    net_xg_balance: { label: "Net xG (xG − xGC)", short: "Net xG" },
  },
};

/** Pełne nazwy słownikowe do stopki plakatu (SKRÓT: pełna nazwa). */
export const COLUMN_FULL_LABELS: Record<
  StatsLabLang,
  Record<string, string>
> = {
  pl: {
    price: "Cena zawodnika",
    starts: "Mecze w 1. składzie",
    minutes: "Rozegrane minuty",
    selected_by_percent: "Posiadanie %",
    total_points: "Punkty FPL",
    goals_scored: "Gole",
    assists: "Asysty",
    goals_assists: "Gole + Asysty",
    dd_hauls: "Dwucyfrowe zdobycze (10+ pkt)",
    bonus: "Punkty bonusowe",
    bps: "Bonus Points System",
    form: "Forma (ost. 4 GW)",
    points_per_game: "Punkty na mecz",
    expected_goals: "Oczekiwane gole (xG)",
    xg_delta: "Różnica Gole − xG",
    threat: "Threat (FPL)",
    mins_per_goal: "Minuty na gola",
    mins_per_xg: "Minuty na xG",
    expected_goal_involvements: "Oczekiwany udział w golach (xGI)",
    penalties_order: "Kolejność wykonywania karnych",
    expected_assists: "Oczekiwane asysty (xA)",
    xa_delta: "Różnica Asysty − xA",
    creativity: "Creativity (FPL)",
    influence: "Influence (FPL)",
    ict_index: "ICT Index",
    mins_per_assist: "Minuty na asystę",
    corners_order: "Kolejność wykonywania rożnych",
    clean_sheets: "Czyste konta",
    goals_conceded: "Stracone gole",
    defensive_contributions_total: "Suma Defensive Contributions",
    dc_bonus_points: "Punkty bonusowe DC",
    dc_bonus_matches: "Mecze z progiem DC",
    dc_hit_rate_pct: "Odsetek meczów z bonusem DC",
    recoveries: "Odzyskania piłki",
    tackles: "Wślizgi",
    clearances_blocks_interceptions: "Clearances + Blocks + Interceptions",
    saves: "Obrony bramkarza",
    expected_goals_conceded: "Oczekiwane stracone gole (xGC)",
    corners_and_indirect_freekicks_order: "Kolejność rożnych i pośrednich wolnych",
    direct_freekicks_order: "Kolejność wolnych bezpośrednich",
    penalties_saved: "Obronione karne",
    penalties_missed: "Zmarnowane karne",
    yellow_cards: "Żółte kartki",
    red_cards: "Czerwone kartki",
    own_goals: "Bramki samobójcze",
    negative_points_total: "Punkty ujemne (kary)",
    xgi_delta: "Różnica (G+A) − xGI",
    xgc_delta: "Różnica GC − xGC",
    value_season: "Wartość sezonowa (Pkt/£)",
    value_form: "Wartość formy",
    cost_change_start: "Zmiana ceny od startu sezonu",
    cost_change_event: "Zmiana ceny w GW",
    transfers_in_event: "Transfery przychodzące w GW",
    transfers_out_event: "Transfery wychodzące w GW",
    net_transfers_gw: "Bilans transferów w GW",
    dreamteam_count: "Występy w Dream Team",
    gameweek: "Numer kolejki",
    opponent_label: "Przeciwnik",
    matches_played: "Rozegrane mecze",
    goal_diff: "Bilans bramek",
    net_xg_balance: "Bilans xG (xG − xGC)",
  },
  en: {
    price: "Player price",
    starts: "Starts in XI",
    minutes: "Minutes played",
    selected_by_percent: "Ownership %",
    total_points: "FPL points",
    goals_scored: "Goals",
    assists: "Assists",
    goals_assists: "Goals + Assists",
    dd_hauls: "Double-digit hauls (10+ pts)",
    bonus: "Bonus points",
    bps: "Bonus Points System",
    form: "Form (last 4 GW)",
    points_per_game: "Points per match",
    expected_goals: "Expected goals (xG)",
    xg_delta: "Goals − xG delta",
    threat: "Threat (FPL)",
    mins_per_goal: "Minutes per goal",
    mins_per_xg: "Minutes per xG",
    expected_goal_involvements: "Expected goal involvements (xGI)",
    penalties_order: "Penalty taker order",
    expected_assists: "Expected assists (xA)",
    xa_delta: "Assists − xA delta",
    creativity: "Creativity (FPL)",
    influence: "Influence (FPL)",
    ict_index: "ICT Index",
    mins_per_assist: "Minutes per assist",
    corners_order: "Corner taker order",
    clean_sheets: "Clean sheets",
    goals_conceded: "Goals conceded",
    defensive_contributions_total: "Defensive Contributions total",
    dc_bonus_points: "DC bonus points",
    dc_bonus_matches: "Matches hitting DC threshold",
    dc_hit_rate_pct: "DC hit-rate %",
    recoveries: "Ball recoveries",
    tackles: "Tackles",
    clearances_blocks_interceptions: "Clearances + Blocks + Interceptions",
    saves: "Goalkeeper saves",
    expected_goals_conceded: "Expected goals conceded (xGC)",
    corners_and_indirect_freekicks_order: "Corners & indirect FK order",
    direct_freekicks_order: "Direct free-kick order",
    penalties_saved: "Penalties saved",
    penalties_missed: "Penalties missed",
    yellow_cards: "Yellow cards",
    red_cards: "Red cards",
    own_goals: "Own goals",
    negative_points_total: "Negative points total",
    xgi_delta: "(G+A) − xGI delta",
    xgc_delta: "GC − xGC delta",
    value_season: "Season value (Pts/£)",
    value_form: "Form value",
    cost_change_start: "Price change since season start",
    cost_change_event: "Price change this GW",
    transfers_in_event: "Transfers in this GW",
    transfers_out_event: "Transfers out this GW",
    net_transfers_gw: "Net transfers this GW",
    dreamteam_count: "Dream Team appearances",
    gameweek: "Gameweek number",
    opponent_label: "Opponent",
    matches_played: "Matches played",
    goal_diff: "Goal difference",
    net_xg_balance: "Net xG (xG − xGC)",
  },
};

export function centreColShort(key: string, lang: StatsLabLang): string {
  return COL_LABELS[lang][key]?.short ?? key;
}

export function centreColLabel(key: string, lang: StatsLabLang): string {
  return COL_LABELS[lang][key]?.label ?? key;
}

export function centreColFullLabel(key: string, lang: StatsLabLang): string {
  return COLUMN_FULL_LABELS[lang][key] ?? centreColLabel(key, lang);
}

export const CENTRE_UI = {
  pl: {
    title: "Stats Centre",
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
    singleMatches: "Pojedyncze mecze",
    search: "Szukaj graczy lub klubów…",
    advanced: "Zaawansowane",
    minMinutes: "Min. minut",
    maxPrice: "Maks. cena £m",
    maxOwn: "Maks. posiadanie %",
    watchlist: "Ulubieni",
    compareInStudio: "Porównaj wybranych w Studiu Wykresów",
    downloadPair: "Eksportuj parę (.jpg + .json)",
    downloadJpg: "Pobierz JPG Tabeli",
    copyJpg: "Kopiuj JPG",
    colourLegend:
      "Skala kolorów: im bardziej zielony, tym lepszy wynik w aktualnej grupie (róż = słaby wynik przy metrykach odwróconych).",
    rowsPerPage: "Wierszy",
    prev: "Poprzednia",
    next: "Następna",
    player: "Zawodnik",
    club: "Klub",
    empty: "Brak wierszy dla wybranych filtrów.",
    loadError: "Nie udało się wczytać danych. Spróbuj ponownie.",
    retry: "Spróbuj ponownie",
    gwFrom: "GW od",
    gwTo: "GW do",
    copied: "Skopiowano JPG do schowka!",
    saved: "Zapisano parę JPG + JSON.",
    poolAverage: "Ø Średnia grupy",
    poolAverageLeague: "Ø Średnia ligi",
    poolPlayers: "graczy",
    poolAppearances: "występów",
    poolClubs: "klubów",
    perGwHistory: "Historia GW",
  },
  en: {
    title: "Stats Centre",
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
    singleMatches: "Single matches",
    search: "Search players or teams…",
    advanced: "Advanced",
    minMinutes: "Min. minutes",
    maxPrice: "Max price £m",
    maxOwn: "Max ownership %",
    watchlist: "Watchlist",
    compareInStudio: "Compare selected in Chart Studio",
    downloadPair: "Export pair (.jpg + .json)",
    downloadJpg: "Download table JPG",
    copyJpg: "Copy JPG",
    colourLegend:
      "Colour scale: greener = better in the current pool (rose = weak on inverted metrics).",
    rowsPerPage: "Rows",
    prev: "Prev",
    next: "Next",
    player: "Player",
    club: "Club",
    empty: "No rows for the selected filters.",
    loadError: "Couldn't load data. Try again.",
    retry: "Try again",
    gwFrom: "GW from",
    gwTo: "GW to",
    copied: "Table JPG copied to clipboard!",
    saved: "Saved JPG + JSON pair.",
    poolAverage: "Ø Pool average",
    poolAverageLeague: "Ø League average",
    poolPlayers: "players",
    poolAppearances: "appearances",
    poolClubs: "clubs",
    perGwHistory: "Per GW",
  },
} as const;

export function centreUi(lang: StatsLabLang) {
  return CENTRE_UI[lang];
}

const POS_LABEL_PL: Record<number, string> = {
  1: "bramkarzy",
  2: "obrońców",
  3: "pomocników",
  4: "napastników",
};
const POS_LABEL_EN: Record<number, string> = {
  1: "goalkeepers",
  2: "defenders",
  3: "midfielders",
  4: "forwards",
};
const POS_NAME_PL: Record<number, string> = {
  1: "Bramkarze",
  2: "Obrońcy",
  3: "Pomocnicy",
  4: "Napastnicy",
};
const POS_NAME_EN: Record<number, string> = {
  1: "GK",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

/**
 * Komunikat pustego wyniku — wskazuje filtry (nie mylić z błędem wczytania).
 * Nigdy nie pisze „min. 0 min” / „min. 1 min” jako głównej przyczyny.
 */
export function centreEmptyFilterMessage(
  lang: StatsLabLang,
  filter: {
    positions: number[];
    minMinutes: number;
    centreMode: string;
  },
): string {
  const positions = filter.positions.filter((p) => p >= 1 && p <= 4);
  const min = Math.max(0, Math.round(Number(filter.minMinutes) || 0));
  const mentionMinutes = min > 1;
  const minHint = mentionMinutes
    ? lang === "pl"
      ? ` z min. ${min} min. Zmniejsz minimalne minuty.`
      : ` with min. ${min} min. Lower the minutes filter.`
    : lang === "pl"
      ? ". Zmień zakres GW, klub lub inne filtry."
      : ". Change GW range, club or other filters.";

  if (lang === "pl") {
    if (positions.length === 1) {
      const noun = POS_LABEL_PL[positions[0]!] ?? "zawodników";
      return `Brak ${noun}${mentionMinutes ? ` z min. ${min} min. Zmniejsz minimalne minuty.` : minHint}`;
    }
    if (positions.length > 1) {
      const names = positions
        .map((p) => POS_NAME_PL[p] ?? String(p))
        .join(", ");
      return `Brak zawodników na wybranych pozycjach (${names})${mentionMinutes ? ` z min. ${min} min. Zmniejsz minimalne minuty.` : minHint}`;
    }
    if (mentionMinutes) {
      return `Brak zawodników z min. ${min} min. Zmniejsz minimalne minuty.`;
    }
    return CENTRE_UI.pl.empty;
  }

  if (positions.length === 1) {
    const noun = POS_LABEL_EN[positions[0]!] ?? "players";
    return `No ${noun}${mentionMinutes ? ` with min. ${min} min. Lower the minutes filter.` : minHint}`;
  }
  if (positions.length > 1) {
    const names = positions.map((p) => POS_NAME_EN[p] ?? String(p)).join(", ");
    return `No players in selected positions (${names})${mentionMinutes ? ` with min. ${min} min. Lower the minutes filter.` : minHint}`;
  }
  if (mentionMinutes) {
    return `No players with min. ${min} min. Lower the minutes filter.`;
  }
  return CENTRE_UI.en.empty;
}

export function logStatsCentreLoadError(err: unknown): void {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Unknown Stats Centre load error";
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: unknown }).code ?? "unknown")
      : err && typeof err === "object" && "status" in err
        ? String((err as { status?: unknown }).status ?? "unknown")
        : "unknown";
  console.error("[Stats Centre] load failed", {
    action: "queryStatsCentreAction",
    message,
    code,
  });
}
