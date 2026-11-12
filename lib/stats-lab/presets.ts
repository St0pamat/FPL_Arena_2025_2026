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
  /**
   * Gdy true (i TOP N): sortuj całą comparisonPool po `compositeScore`
   * przed `.slice(0, limitPlayers)` — nie sortuj wtórnie tylko Top N.
   * Domyślnie false — NIGDY nie włączać po cichu przy zmianie viz/okresu/pozycji.
   */
  sortByComposite?: boolean;
  /**
   * Gdy true: sortuj po `rawValues[sortByStat]` niezależnie od `per90`
   * (POINTS_BREAKDOWN = oficjalne sumy meczowe FPL 1:1 z wykresem).
   */
  sortByRawValues?: boolean;
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
    sortByComposite: false,
    sortByRawValues: false,
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

/**
 * Domyślne `activeMetrics` dla wybranej pozycji (Studio).
 * Używane przy zmianie filtra pozycji, żeby composite nie liczył CS u MID/FWD.
 *
 * Kontrakt (formacje):
 * - GK [1]: TP, CS, saves, form, PPM, xGC
 * - DEF [2]: TP, CS, DC suma / DC Mecz / DC Pkt, xGI, BPS
 * - MID [3]: TP, G+A, xGI, xG, xA, DC Pkt, BPS
 * - FWD [4]: TP, gole, xG, xGI, threat, bonus
 * - Wszystkie / multi: TP, xGI, BPS, G+A
 */
export function defaultActiveMetricsForPositions(
  positions: FplPositionType[],
): FplStatKey[] {
  if (positions.length === 1) {
    if (positions[0] === 1) {
      return [
        "total_points",
        "clean_sheets",
        "saves",
        "form",
        "points_per_game",
        "expected_goals_conceded",
      ];
    }
    if (positions[0] === 2) {
      return [
        "total_points",
        "clean_sheets",
        "defensive_contributions_total",
        "dc_bonus_matches",
        "dc_bonus_points",
        "expected_goal_involvements",
        "bps",
      ];
    }
    if (positions[0] === 3) {
      return [
        "total_points",
        "goals_assists",
        "expected_goal_involvements",
        "expected_goals",
        "expected_assists",
        "dc_bonus_points",
        "bps",
      ];
    }
    if (positions[0] === 4) {
      return [
        "total_points",
        "goals_scored",
        "expected_goals",
        "expected_goal_involvements",
        "threat",
        "bonus",
      ];
    }
  }
  return [
    "total_points",
    "expected_goal_involvements",
    "bps",
    "goals_assists",
  ];
}

/** Sortowanie ataku / DC — nieadekwatne dla samego GK. */
const SORT_MISMATCH_ON_GK = new Set<FplStatKey>([
  "goals_scored",
  "expected_goals",
  "threat",
  "dc_bonus_points",
  "dc_bonus_matches",
  "defensive_contributions_total",
  "goals_assists",
  "assists",
]);

/** Sortowanie bramkarskie — nieadekwatne dla DEF / MID / FWD. */
const SORT_MISMATCH_OFF_GK = new Set<FplStatKey>([
  "saves",
  "penalties_saved",
]);

/**
 * Czy `sortByStat` pasuje do nowej pozycji i aktualnych `activeMetrics`.
 * `total_points` zawsze OK; inaczej klucz musi być w metrykach i nie być
 * typowym mismatchem formacji (np. gole przy GK, saves przy FWD).
 */
export function isSortByStatAlignedWithPositions(
  sortByStat: FplStatKey,
  positions: FplPositionType[],
  activeMetrics: FplStatKey[],
): boolean {
  if (sortByStat === "total_points") return true;
  if (!activeMetrics.includes(sortByStat)) return false;

  if (positions.length === 1) {
    if (positions[0] === 1 && SORT_MISMATCH_ON_GK.has(sortByStat)) {
      return false;
    }
    if (positions[0] !== 1 && SORT_MISMATCH_OFF_GK.has(sortByStat)) {
      return false;
    }
  }
  return true;
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
