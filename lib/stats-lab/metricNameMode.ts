/**
 * Przełącznik nazw metryk: opisowe (domyślne) albo oficjalne skróty.
 * Rozszerza słownik U9 (FPL_STAT_DEFINITIONS). Wybór zostaje w localStorage.
 */

import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import {
  centreColFullLabel,
  centreColLabel,
  centreColShort,
} from "@/lib/stats-lab/statsCentreI18n";
import {
  getFplStatDefinition,
  type FplStatKey,
} from "@/lib/stats-lab/types";

export type MetricNameMode = "descriptive" | "abbrev";

export const METRIC_NAME_STORAGE_KEY = "fpl-arena-stats-lab-metric-names";
export const METRIC_NAME_EVENT = "fpl-stats-lab-metric-names";

export const METRIC_NAME_COPY = {
  pl: {
    group: "Nazwy",
    descriptive: "Opisowe",
    abbrev: "Skróty",
  },
  en: {
    group: "Names",
    descriptive: "Descriptive",
    abbrev: "Short",
  },
} as const;

/** Oficjalne skróty FPL / analityczne. Pełna nazwa zostaje w labelPl / labelEn. */
export const OFFICIAL_METRIC_ABBREV: Record<
  FplStatKey,
  { pl: string; en: string }
> = {
  total_points: { pl: "Pkt", en: "Pts" },
  event_points: { pl: "GW", en: "GW" },
  points_per_game: { pl: "PPM", en: "PPG" },
  form: { pl: "Forma", en: "Form" },
  now_cost: { pl: "£", en: "£" },
  selected_by_percent: { pl: "Sel%", en: "Sel%" },
  minutes: { pl: "Min", en: "Min" },
  starts: { pl: "XI", en: "XI" },
  dreamteam_count: { pl: "DT", en: "DT" },
  value_season: { pl: "V", en: "V" },
  value_form: { pl: "VF", en: "VF" },
  price_rise: { pl: "+£", en: "+£" },
  price_fall: { pl: "−£", en: "−£" },
  price_change_gw: { pl: "Δ£", en: "Δ£" },
  transfers_in: { pl: "In", en: "In" },
  transfers_out: { pl: "Out", en: "Out" },
  transfers_in_event: { pl: "InGW", en: "InGW" },
  transfers_out_event: { pl: "OutGW", en: "OutGW" },
  net_transfers_gw: { pl: "NT", en: "NT" },
  goals_scored: { pl: "G", en: "G" },
  expected_goals: { pl: "xG", en: "xG" },
  goals_vs_xg: { pl: "G−xG", en: "G−xG" },
  threat: { pl: "Thr", en: "Thr" },
  goals_assists: { pl: "G+A", en: "G+A" },
  expected_goal_involvements: { pl: "xGI", en: "xGI" },
  assists: { pl: "A", en: "A" },
  expected_assists: { pl: "xA", en: "xA" },
  creativity: { pl: "Kreat", en: "Crea" },
  influence: { pl: "Inf", en: "Inf" },
  ict_index: { pl: "ICT", en: "ICT" },
  bonus: { pl: "B", en: "B" },
  bps: { pl: "BPS", en: "BPS" },
  clean_sheets: { pl: "CS", en: "CS" },
  defensive_contributions_total: { pl: "DEFCON", en: "DEFCON" },
  dc_bonus_matches: { pl: "DC+2", en: "DC+2" },
  dc_bonus_points: { pl: "DC", en: "DC" },
  clearances_blocks_interceptions: { pl: "CBI", en: "CBI" },
  tackles: { pl: "Tkl", en: "Tkl" },
  recoveries: { pl: "Rec", en: "Rec" },
  saves: { pl: "Sv", en: "Sv" },
  goals_conceded: { pl: "SG", en: "GC" },
  expected_goals_conceded: { pl: "xSG", en: "xGC" },
  yellow_cards: { pl: "ŻK", en: "YC" },
  red_cards: { pl: "CK", en: "RC" },
  own_goals: { pl: "SB", en: "OG" },
  penalties_saved: { pl: "PK+", en: "PS" },
  penalties_missed: { pl: "PK−", en: "PM" },
};

const CENTRE_KEY_TO_STAT: Record<string, FplStatKey> = {
  price: "now_cost",
  starts: "starts",
  minutes: "minutes",
  selected_by_percent: "selected_by_percent",
  total_points: "total_points",
  goals_scored: "goals_scored",
  assists: "assists",
  goals_assists: "goals_assists",
  bonus: "bonus",
  bps: "bps",
  form: "form",
  points_per_game: "points_per_game",
  expected_goals: "expected_goals",
  threat: "threat",
  expected_goal_involvements: "expected_goal_involvements",
  expected_assists: "expected_assists",
  creativity: "creativity",
  influence: "influence",
  ict_index: "ict_index",
  clean_sheets: "clean_sheets",
  goals_conceded: "goals_conceded",
  defensive_contributions_total: "defensive_contributions_total",
  dc_bonus_points: "dc_bonus_points",
  dc_bonus_matches: "dc_bonus_matches",
  recoveries: "recoveries",
  tackles: "tackles",
  clearances_blocks_interceptions: "clearances_blocks_interceptions",
  saves: "saves",
  expected_goals_conceded: "expected_goals_conceded",
  penalties_saved: "penalties_saved",
  penalties_missed: "penalties_missed",
  yellow_cards: "yellow_cards",
  red_cards: "red_cards",
  own_goals: "own_goals",
  value_season: "value_season",
  value_form: "value_form",
  transfers_in_event: "transfers_in_event",
  transfers_out_event: "transfers_out_event",
  net_transfers_gw: "net_transfers_gw",
  dreamteam_count: "dreamteam_count",
};

const CENTRE_ONLY_ABBREV: Record<StatsLabLang, Record<string, string>> = {
  pl: {
    dd_hauls: "DD",
    xg_delta: "G−xG",
    mins_per_goal: "Min/G",
    mins_per_xg: "Min/xG",
    penalties_order: "Pen",
    xa_delta: "A−xA",
    mins_per_assist: "Min/A",
    corners_order: "CK",
    dc_hit_rate_pct: "DC%",
    corners_and_indirect_freekicks_order: "CK",
    direct_freekicks_order: "FK",
    negative_points_total: "Neg",
    xgi_delta: "±xGI",
    xgc_delta: "ΔxGC",
    cost_change_start: "Δ£",
    cost_change_event: "Δ£GW",
    gameweek: "GW",
    opponent_label: "Ryw",
    matches_played: "M",
    goal_diff: "GB",
    net_xg_balance: "xGD",
  },
  en: {
    dd_hauls: "DD",
    xg_delta: "G−xG",
    mins_per_goal: "Min/G",
    mins_per_xg: "Min/xG",
    penalties_order: "Pen",
    xa_delta: "A−xA",
    mins_per_assist: "Min/A",
    corners_order: "CK",
    dc_hit_rate_pct: "DC%",
    corners_and_indirect_freekicks_order: "CK",
    direct_freekicks_order: "FK",
    negative_points_total: "Neg",
    xgi_delta: "±xGI",
    xgc_delta: "ΔxGC",
    cost_change_start: "Δ£",
    cost_change_event: "Δ£GW",
    gameweek: "GW",
    opponent_label: "Opp",
    matches_played: "M",
    goal_diff: "GD",
    net_xg_balance: "xGD",
  },
};

export function isMetricNameMode(value: unknown): value is MetricNameMode {
  return value === "descriptive" || value === "abbrev";
}

export function readMetricNameMode(): MetricNameMode {
  try {
    const stored = localStorage.getItem(METRIC_NAME_STORAGE_KEY);
    return isMetricNameMode(stored) ? stored : "descriptive";
  } catch {
    return "descriptive";
  }
}

export function writeMetricNameMode(mode: MetricNameMode): void {
  try {
    localStorage.setItem(METRIC_NAME_STORAGE_KEY, mode);
  } catch {
    /* tryb zostaje w pamięci komponentu */
  }
}

export function officialMetricAbbrev(
  key: FplStatKey,
  lang: StatsLabLang,
): string {
  const pair = OFFICIAL_METRIC_ABBREV[key];
  return lang === "en" ? pair.en : pair.pl;
}

export function descriptiveMetricLabel(
  key: FplStatKey,
  lang: StatsLabLang,
): string {
  const def = getFplStatDefinition(key);
  if (!def) return key;
  return lang === "en" ? def.labelEn : def.labelPl;
}

/** Nazwa na pigułce kryterium. Opisowe = pełna nazwa ze słownika. */
export function metricChipLabel(
  key: FplStatKey,
  lang: StatsLabLang,
  mode: MetricNameMode,
): string {
  if (mode === "abbrev") return officialMetricAbbrev(key, lang);
  return descriptiveMetricLabel(key, lang);
}

/**
 * Krótka etykieta wykresu. Opisowe zostawia dotychczasowy skrót słownika,
 * żeby oś i heatmapa nie zmieniły układu. Skróty włączają zestaw oficjalny.
 */
export function metricTightLabel(
  key: FplStatKey,
  lang: StatsLabLang,
  mode: MetricNameMode,
  currentShort: string,
): string {
  if (mode === "abbrev") return officialMetricAbbrev(key, lang);
  return currentShort;
}

export function centreHeaderFace(
  key: string,
  lang: StatsLabLang,
  mode: MetricNameMode,
): { text: string; title: string } {
  const title = centreColFullLabel(key, lang);
  if (mode === "descriptive") {
    return { text: centreColLabel(key, lang), title };
  }
  const stat = CENTRE_KEY_TO_STAT[key];
  if (stat) return { text: officialMetricAbbrev(stat, lang), title };
  return {
    text: CENTRE_ONLY_ABBREV[lang][key] ?? centreColShort(key, lang),
    title,
  };
}
