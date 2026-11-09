/**
 * FPL Arena: Stats Lab — filtry Studio + inteligentne presety pozycyjne.
 */

import type { FplPositionType, FplStatKey } from "@/lib/stats-lab/types";
import type { StreakMetricKey } from "@/lib/stats-lab/i18n";
import { DEFAULT_STATS_LAB_SEASON } from "@/lib/stats-lab/syncEngine";

/* ─────────────────────────────────────────────────
 * Filtry okresu / zapytania
 * ───────────────────────────────────────────────── */

export type StatsLabPeriodMode =
  | "FULL_SEASON"
  | "LAST_4_GW"
  | "LAST_6_GW"
  | "HOME_ONLY"
  | "AWAY_ONLY"
  | "CUSTOM_RANGE";

export type StatsLabPeriodFilter = {
  mode: StatsLabPeriodMode;
  /** Wymagane dla CUSTOM_RANGE (włącznie). */
  gwFrom?: number;
  gwTo?: number;
};

export type StatsLabSortDirection = "DESC" | "ASC";

export type StatsLabQueryFilter = {
  seasonCode: string;
  period: StatsLabPeriodFilter;
  /** Przelicz metryki z supportsPer90 na 90 minut. */
  per90: boolean;
  /**
   * Pusta tablica lub wszystkie 4 pozycje = brak filtra pozycji.
   * Np. `[2]` = tylko obrońcy.
   */
  positions: FplPositionType[];
  /** Pusta = wszystkie kluby. */
  clubIds: number[];
  minMinutes: number;
  /** Max cena w dziesiątkach (65 = £6.5m). */
  maxCostTenths?: number;
  /** Max % posiadania (np. 10 = różnice / underradar). */
  maxOwnershipPct?: number;
  /**
   * Ręczny wybór graczy do porównania (`fpl_element_id`).
   * Pusta = Top N wg `sortByStat`.
   */
  selectedPlayerIds: number[];
  limitPlayers: number;
  sortByStat: FplStatKey;
  sortDirection: StatsLabSortDirection;
  /** 2–8 metryk do radar / stacked / tabeli. */
  activeMetrics: FplStatKey[];
  /**
   * Gdy ustawione (widok STREAKS_EXPLORER): TOP N sortuje całą pulę
   * po tej serii + tie-breakerach, dopiero potem `.slice(0, limitPlayers)`.
   */
  streakSortKey?: StreakMetricKey;
  /** Opcjonalne kryterium sortowania Dekompozycji (przyszłe użycie). */
  breakdownSortKey?: string;
};

export type StatsLabPresetId =
  | "GK_WALL"
  | "DEF_COMPLETE"
  | "MID_CREATORS_THREAT"
  | "FWD_SNIPERS"
  | "VALUE_GEMS";

export type StatsLabPreset = {
  id: StatsLabPresetId;
  labelPl: string;
  labelEn: string;
  descriptionPl: string;
  descriptionEn: string;
  /** Częściowy patch filtra (nakładany na default). */
  patch: Partial<StatsLabQueryFilter>;
};

export const STATS_LAB_PRESETS: readonly StatsLabPreset[] = [
  {
    id: "GK_WALL",
    labelPl: "Bramkarze — Kompletny Profil",
    labelEn: "Goalkeepers — Complete Profile",
    descriptionPl:
      "CS, obrony, forma, PPM, bonus i xGC na tle innych bramkarzy.",
    descriptionEn:
      "CS, saves, form, PPG, bonus and xGC versus other goalkeepers.",
    patch: {
      positions: [1],
      sortByStat: "total_points",
      sortDirection: "DESC",
      activeMetrics: [
        "total_points",
        "clean_sheets",
        "saves",
        "form",
        "points_per_game",
        "expected_goals_conceded",
      ],
      minMinutes: 180,
      limitPlayers: 10,
    },
  },
  {
    id: "DEF_COMPLETE",
    labelPl: "Obrońcy — Defensywa + DC",
    labelEn: "Defenders — Defence + DC",
    descriptionPl:
      "CS + DC (suma / mecze z progiem / pkt) + xGI + BPS — pełny profil DEF.",
    descriptionEn:
      "CS + DC (total / threshold matches / points) + xGI + BPS — full DEF profile.",
    patch: {
      positions: [2],
      sortByStat: "total_points",
      sortDirection: "DESC",
      activeMetrics: [
        "total_points",
        "clean_sheets",
        "defensive_contributions_total",
        "dc_bonus_matches",
        "dc_bonus_points",
        "expected_goal_involvements",
        "bps",
      ],
      minMinutes: 180,
      limitPlayers: 10,
    },
  },
  {
    id: "MID_CREATORS_THREAT",
    labelPl: "Pomocnicy — Kreacja, Threat i DC",
    labelEn: "Midfielders — Creation, Threat & DC",
    descriptionPl: "xG, xA, G+A, Creativity, Threat i DC wśród MID.",
    descriptionEn: "xG, xA, G+A, Creativity, Threat and DC among MIDs.",
    patch: {
      positions: [3],
      sortByStat: "expected_goal_involvements",
      sortDirection: "DESC",
      activeMetrics: [
        "total_points",
        "expected_goals",
        "expected_assists",
        "goals_assists",
        "creativity",
        "defensive_contributions_total",
        "dc_bonus_points",
      ],
      minMinutes: 180,
      limitPlayers: 10,
    },
  },
  {
    id: "FWD_SNIPERS",
    labelPl: "Napastnicy — Egzekutorzy",
    labelEn: "Forwards — Finishers",
    descriptionPl: "Gole, xG, xGI, Threat, forma i PPM wśród FWD.",
    descriptionEn: "Goals, xG, xGI, Threat, form and PPG among FWDs.",
    patch: {
      positions: [4],
      sortByStat: "goals_scored",
      sortDirection: "DESC",
      activeMetrics: [
        "total_points",
        "goals_scored",
        "expected_goals",
        "expected_goal_involvements",
        "threat",
        "form",
        "points_per_game",
      ],
      minMinutes: 180,
      limitPlayers: 10,
    },
  },
  {
    id: "VALUE_GEMS",
    labelPl: "Ukryte Perełki (≤10% + Value)",
    labelEn: "Hidden Gems (≤10% + Value)",
    descriptionPl:
      "Różnice do 10% Sel% — punkty, value_season, forma, xGI i PPM.",
    descriptionEn:
      "Differentials ≤10% Sel% — points, value_season, form, xGI and PPG.",
    patch: {
      positions: [],
      maxOwnershipPct: 10,
      sortByStat: "value_season",
      sortDirection: "DESC",
      activeMetrics: [
        "total_points",
        "value_season",
        "form",
        "points_per_game",
        "expected_goal_involvements",
        "now_cost",
      ],
      minMinutes: 180,
      limitPlayers: 15,
    },
  },
] as const;

export function createDefaultStatsLabFilter(
  seasonCode: string = DEFAULT_STATS_LAB_SEASON,
): StatsLabQueryFilter {
  return {
    seasonCode,
    period: { mode: "FULL_SEASON" },
    per90: false,
    positions: [],
    clubIds: [],
    minMinutes: 180,
    selectedPlayerIds: [],
    limitPlayers: 10,
    sortByStat: "total_points",
    sortDirection: "DESC",
    activeMetrics: [
      "total_points",
      "expected_goal_involvements",
      "bps",
      "goals_assists",
    ],
    streakSortKey: undefined,
    breakdownSortKey: undefined,
  };
}

export function applyStatsLabPreset(
  presetId: StatsLabPresetId,
  base: StatsLabQueryFilter = createDefaultStatsLabFilter(),
): StatsLabQueryFilter {
  const preset = STATS_LAB_PRESETS.find((p) => p.id === presetId);
  if (!preset) return base;
  return {
    ...base,
    ...preset.patch,
    period: preset.patch.period ?? base.period,
    positions: preset.patch.positions ?? base.positions,
    clubIds: preset.patch.clubIds ?? base.clubIds,
    selectedPlayerIds: preset.patch.selectedPlayerIds ?? base.selectedPlayerIds,
    activeMetrics: preset.patch.activeMetrics ?? base.activeMetrics,
  };
}

/** Czy filtr pozycji jest aktywny (nie „wszystkie”). */
export function hasActivePositionFilter(positions: FplPositionType[]): boolean {
  if (!positions.length) return false;
  if (positions.length >= 4) {
    const set = new Set(positions);
    return !(set.has(1) && set.has(2) && set.has(3) && set.has(4));
  }
  return true;
}

export const TOP_N_OPTIONS = [3, 5, 8, 10, 15, 20] as const;
