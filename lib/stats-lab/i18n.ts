/**
 * FPL Arena: Stats Lab — bilingual UI helpers (PL community / EN official).
 */

import type { FplStatCategory, FplStatDefinition, FplStatKey } from "@/lib/stats-lab/types";
import {
  FPL_STAT_CATEGORY_LABELS_EN,
  FPL_STAT_CATEGORY_LABELS_PL,
  FPL_POSITION_LABELS_EN,
  FPL_POSITION_LABELS_PL,
  getFplStatDefinition,
} from "@/lib/stats-lab/types";
import type { StatsLabPeriodMode } from "@/lib/stats-lab/presets";

export type StatsLabLang = "pl" | "en";
export type StatsLabScaleMode = "PERCENTILE" | "RAW";

export function statLabel(key: FplStatKey, lang: StatsLabLang): string {
  const d = getFplStatDefinition(key);
  if (!d) return key;
  return lang === "en" ? d.labelEn : d.labelPl;
}

export function statShort(key: FplStatKey, lang: StatsLabLang): string {
  const d = getFplStatDefinition(key);
  if (!d) return key;
  return lang === "en" ? d.shortLabelEn : d.shortLabelPl;
}

export function statDescription(key: FplStatKey, lang: StatsLabLang): string {
  const d = getFplStatDefinition(key);
  if (!d) return "";
  return lang === "en" ? d.descriptionEn : d.descriptionPl;
}

export function categoryLabel(cat: FplStatCategory, lang: StatsLabLang): string {
  return lang === "en"
    ? FPL_STAT_CATEGORY_LABELS_EN[cat]
    : FPL_STAT_CATEGORY_LABELS_PL[cat];
}

export function positionLabel(
  type: 1 | 2 | 3 | 4,
  lang: StatsLabLang,
): string {
  return lang === "en"
    ? FPL_POSITION_LABELS_EN[type]
    : FPL_POSITION_LABELS_PL[type];
}

export const PERIOD_LABELS: Record<
  StatsLabLang,
  Record<StatsLabPeriodMode, string>
> = {
  pl: {
    FULL_SEASON: "Cały sezon",
    LAST_4_GW: "Ostatnie 4 GW",
    LAST_6_GW: "Ostatnie 6 GW",
    HOME_ONLY: "Tylko Dom",
    AWAY_ONLY: "Tylko Wyjazd",
    CUSTOM_RANGE: "Własny zakres GW",
  },
  en: {
    FULL_SEASON: "Full season",
    LAST_4_GW: "Last 4 GW",
    LAST_6_GW: "Last 6 GW",
    HOME_ONLY: "Home only",
    AWAY_ONLY: "Away only",
    CUSTOM_RANGE: "Custom GW range",
  },
};

export const VIZ_MODE_LABELS: Record<
  StatsLabLang,
  Record<string, string>
> = {
  pl: {
    STACKED_COMPOSITE: "Profil wielowymiarowy",
    POINTS_BREAKDOWN: "Dekompozycja punktów",
    STREAKS_EXPLORER: "Passy i regularność",
    RADAR_PIZZA: "Radar / Pizza",
    SCATTER_2D: "Scatter 2D",
    HEATMAP_MATRIX: "Macierz heatmap",
  },
  en: {
    STACKED_COMPOSITE: "Multi-metric profile",
    POINTS_BREAKDOWN: "Points breakdown",
    STREAKS_EXPLORER: "Streaks & consistency",
    RADAR_PIZZA: "Radar / Pizza",
    SCATTER_2D: "Scatter 2D",
    HEATMAP_MATRIX: "Heatmap matrix",
  },
};

export const UI_COPY = {
  pl: {
    presets: "Presety",
    resetFilters: "Resetuj filtry",
    langPl: "Polski (PL — Społeczność FPL)",
    langEn: "English (Official FPL)",
    scalePercentile: "Skala percentylowa (0–100)",
    scaleRaw: "Wartości rzeczywiste (surowe)",
    sectionNumbers: "01 · Zakres i Metryki",
    sectionPlayers: "02 · Wybór Zawodników",
    sectionStyle: "03 · Wygląd i Styl",
    manualPick: "Ręczny wybór",
    autoTop: "Top N / Auto",
    allClubs: "Wszystkie kluby",
    clearClubs: "Wyczyść",
    showTop: "Pokaż najlepszych (Top N)",
    clubs: "Kluby Premier League",
    metricsCount: "Kryteria",
    axisX: "Oś X",
    axisY: "Oś Y",
    swapAxes: "Zamień osie",
    minMinutes: "Min. minut",
    maxPrice: "Max cena (£m)",
    maxSel: "Max Sel%",
    sortComposite: "Sortuj wg Composite Score",
    sortByStat: "Sortuj wg statystyki",
    spotlight: "Spotlight (wyróżnij)",
    none: "— brak —",
    chartTitle: "Tytuł wykresu",
    chartSubtitle: "Podtytuł",
    showAvg: "Pokaż średnią grupy",
    showBarValues: "Pokaż wartości na słupkach",
    showMeta: "Pokaż ceny i % posiadania",
    showNegatives: "Pokaż odjęte punkty / Kary (Minusy)",
    emptyChart: "Brak graczy spełniających filtry. Zmień kryteria lub wybierz zawodników ręcznie.",
    recalculating: "Przeliczam porównanie…",
    pool: "Pula",
    onChart: "Na wykresie",
    percentileExplain:
      "Skala percentylowa 0–100 określa, od ilu % zawodników na tej samej pozycji dany piłkarz wypada lepiej w wybranym kryterium (100 = lider ligi).",
    rawExplain:
      "Wartości rzeczywiste z bazy — każda metryka ma własną skalę (0…max w grupie).",
    gross: "Bez straconych punktów (Brutto)",
    penalties: "Stracone punkty (Kary)",
    net: "Oficjalne Punkty FPL (Suma Netto)",
    lostPointsBar: "Stracone punkty",
    player: "Zawodnik",
    clearSelection: "Wyczyść wybór",
    searchPlaceholder: "Szukaj: Raya, Arsenal…",
    addPlayersHint:
      "Dodaj graczy do porównania celowego — wykres pokaże tylko ich.",
  },
  en: {
    presets: "Presets",
    resetFilters: "Reset filters",
    langPl: "Polski (PL — FPL Community)",
    langEn: "English (Official FPL)",
    scalePercentile: "Percentile scale (0–100)",
    scaleRaw: "Raw values (from database)",
    sectionNumbers: "01 · Scope & Metrics",
    sectionPlayers: "02 · Player Selection",
    sectionStyle: "03 · Look & Style",
    manualPick: "Manual pick",
    autoTop: "Top N / Auto",
    allClubs: "All clubs",
    clearClubs: "Clear",
    showTop: "Show best (Top N)",
    clubs: "Premier League clubs",
    metricsCount: "Criteria",
    axisX: "X axis",
    axisY: "Y axis",
    swapAxes: "Swap axes",
    minMinutes: "Min. minutes",
    maxPrice: "Max price (£m)",
    maxSel: "Max Sel%",
    sortComposite: "Sort by Composite Score",
    sortByStat: "Sort by statistic",
    spotlight: "Spotlight",
    none: "— none —",
    chartTitle: "Chart title",
    chartSubtitle: "Subtitle",
    showAvg: "Show pool average",
    showBarValues: "Show values on bars",
    showMeta: "Show price & ownership",
    showNegatives: "Show deducted points / Penalties",
    emptyChart:
      "No players match the filters. Adjust criteria or pick players manually.",
    recalculating: "Recalculating comparison…",
    pool: "Pool",
    onChart: "On chart",
    percentileExplain:
      "Percentile scale 0–100 shows the percentage of peers in the same position a player outperforms (100 = league leader).",
    rawExplain:
      "Raw database values — each metric uses its own scale (0…group max).",
    gross: "Without deductions (Gross)",
    penalties: "Points lost (Penalties)",
    net: "Official FPL Points (Net)",
    lostPointsBar: "Points lost",
    player: "Player",
    clearSelection: "Clear selection",
    searchPlaceholder: "Search: Raya, Arsenal…",
    addPlayersHint:
      "Add players for a targeted comparison — the chart will show only them.",
  },
} as const;

export type UiCopy = (typeof UI_COPY)[StatsLabLang];

export function t(lang: StatsLabLang): UiCopy {
  return UI_COPY[lang];
}

/** Edukacyjny skrót metryki do legendy pod wykresem. */
/** Sam opis metryki — skrót formatuj osobno jako `TP:` (bez duplikatu `TP — TP = …`). */
export function metricGlossaryLine(
  def: FplStatDefinition,
  lang: StatsLabLang,
): string {
  return lang === "en" ? def.descriptionEn : def.descriptionPl;
}

export const STREAK_METRIC_KEYS = [
  "maxReturnStreak",
  "currentReturnStreak",
  "maxGoalStreak",
  "maxAssistStreak",
  "maxGoalOrAssistStreak",
  "maxCleanSheetStreak",
  "maxDcPointsStreak",
  "maxSavesPointStreak",
  "maxBonusStreak",
  "max60MinStreak",
  "returnConsistencyPct",
] as const;

export type StreakMetricKey = (typeof STREAK_METRIC_KEYS)[number];

/** Klucze paska sortowania Eksploratora Pass (DESC). */
export const STREAK_SORT_KEYS = [
  "returnConsistencyPct",
  "maxReturnStreak",
  "currentReturnStreak",
  "maxGoalOrAssistStreak",
  "maxGoalStreak",
  "maxAssistStreak",
  "maxCleanSheetStreak",
  "maxDcPointsStreak",
  "maxSavesPointStreak",
  "maxBonusStreak",
] as const satisfies readonly StreakMetricKey[];

export type StreakSortKey = (typeof STREAK_SORT_KEYS)[number];

export const STREAK_LABELS: Record<
  StatsLabLang,
  Record<StreakMetricKey, string>
> = {
  pl: {
    maxReturnStreak: "Najdłuższa seria zwrotów",
    currentReturnStreak: "Aktualna seria zwrotów",
    maxGoalStreak: "Seria z golem",
    maxAssistStreak: "Seria z asystą",
    maxGoalOrAssistStreak: "Seria G/A",
    maxCleanSheetStreak: "Seria czystych kont",
    maxDcPointsStreak: "Seria DC (+2)",
    maxSavesPointStreak: "Seria 3+ obron (pkt GK)",
    maxBonusStreak: "Seria z bonusem (BPS)",
    max60MinStreak: "Seria 60+ min",
    returnConsistencyPct: "Regularność zwrotów %",
  },
  en: {
    maxReturnStreak: "Max return streak",
    currentReturnStreak: "Current return streak",
    maxGoalStreak: "Goal streak",
    maxAssistStreak: "Assist streak",
    maxGoalOrAssistStreak: "G/A streak",
    maxCleanSheetStreak: "Clean sheet streak",
    maxDcPointsStreak: "DC (+2) streak",
    maxSavesPointStreak: "3+ Saves streak (+1 pt)",
    maxBonusStreak: "Bonus points streak",
    max60MinStreak: "60+ min streak",
    returnConsistencyPct: "Return consistency %",
  },
};

export const STREAK_SORT_SHORT_LABELS: Record<
  StatsLabLang,
  Record<StreakSortKey, string>
> = {
  pl: {
    returnConsistencyPct: "Regularność %",
    maxReturnStreak: "Max zwroty",
    currentReturnStreak: "Aktualne zwroty",
    maxGoalOrAssistStreak: "G/A",
    maxGoalStreak: "Gole",
    maxAssistStreak: "Asysty",
    maxCleanSheetStreak: "CS",
    maxDcPointsStreak: "DC",
    maxSavesPointStreak: "Obrony GK",
    maxBonusStreak: "Bonus",
  },
  en: {
    returnConsistencyPct: "Consistency %",
    maxReturnStreak: "Max return",
    currentReturnStreak: "Current return",
    maxGoalOrAssistStreak: "G/A",
    maxGoalStreak: "Goals",
    maxAssistStreak: "Assists",
    maxCleanSheetStreak: "CS",
    maxDcPointsStreak: "DC",
    maxSavesPointStreak: "Saves",
    maxBonusStreak: "Bonus",
  },
};

/**
 * Ścisła hierarchia wizualna małych kafelków (poza banerem Regularności).
 * Niezależna od kolejności kliknięć użytkownika.
 */
export const STREAK_HIERARCHY_ORDER: readonly StreakMetricKey[] = [
  "maxReturnStreak",
  "currentReturnStreak",
  "maxGoalOrAssistStreak",
  "maxGoalStreak",
  "maxAssistStreak",
  "maxCleanSheetStreak",
  "maxDcPointsStreak",
  "maxSavesPointStreak",
  "maxBonusStreak",
  // max60MinStreak — czas gry jest w Kartotece Piłkarza, nie w kafelkach zwrotów
] as const;

/**
 * Inteligentny zestaw startowy:
 * baner Regularności + Max/Current zwroty + 4 kafelki składowe (bez 60+ min).
 */
export const DEFAULT_STREAK_KEYS_BY_POSITION: Record<
  "GKP" | "DEF" | "MID" | "FWD" | "ALL",
  StreakMetricKey[]
> = {
  GKP: [
    "returnConsistencyPct",
    "maxReturnStreak",
    "currentReturnStreak",
    "maxCleanSheetStreak",
    "maxSavesPointStreak",
    "maxBonusStreak",
  ],
  DEF: [
    "returnConsistencyPct",
    "maxReturnStreak",
    "currentReturnStreak",
    "maxCleanSheetStreak",
    "maxDcPointsStreak",
    "maxGoalOrAssistStreak",
    "maxBonusStreak",
  ],
  MID: [
    "returnConsistencyPct",
    "maxReturnStreak",
    "currentReturnStreak",
    "maxGoalOrAssistStreak",
    "maxGoalStreak",
    "maxAssistStreak",
    "maxDcPointsStreak",
  ],
  FWD: [
    "returnConsistencyPct",
    "maxReturnStreak",
    "currentReturnStreak",
    "maxGoalOrAssistStreak",
    "maxGoalStreak",
    "maxAssistStreak",
    "maxBonusStreak",
  ],
  ALL: [
    "returnConsistencyPct",
    "maxReturnStreak",
    "currentReturnStreak",
    "maxGoalOrAssistStreak",
    "maxGoalStreak",
    "maxAssistStreak",
    "maxCleanSheetStreak",
  ],
};

/** @deprecated alias — używaj DEFAULT_STREAK_KEYS_BY_POSITION */
export const STREAK_SECONDARY_BY_POOL = {
  GKP: DEFAULT_STREAK_KEYS_BY_POSITION.GKP.filter(
    (k) => k !== "returnConsistencyPct",
  ),
  DEF: DEFAULT_STREAK_KEYS_BY_POSITION.DEF.filter(
    (k) => k !== "returnConsistencyPct",
  ),
  MID: DEFAULT_STREAK_KEYS_BY_POSITION.MID.filter(
    (k) => k !== "returnConsistencyPct",
  ),
  FWD: DEFAULT_STREAK_KEYS_BY_POSITION.FWD.filter(
    (k) => k !== "returnConsistencyPct",
  ),
  MIXED: DEFAULT_STREAK_KEYS_BY_POSITION.ALL.filter(
    (k) => k !== "returnConsistencyPct",
  ),
} as const;

export function defaultStreakKeysForPositions(
  positions: Array<1 | 2 | 3 | 4>,
): StreakMetricKey[] {
  if (positions.length === 1) {
    if (positions[0] === 1) return [...DEFAULT_STREAK_KEYS_BY_POSITION.GKP];
    if (positions[0] === 2) return [...DEFAULT_STREAK_KEYS_BY_POSITION.DEF];
    if (positions[0] === 3) return [...DEFAULT_STREAK_KEYS_BY_POSITION.MID];
    if (positions[0] === 4) return [...DEFAULT_STREAK_KEYS_BY_POSITION.FWD];
  }
  return [...DEFAULT_STREAK_KEYS_BY_POSITION.ALL];
}

/** Sortuje zaznaczone małe kafelki wg STREAK_HIERARCHY_ORDER. */
export function orderStreakKeysByHierarchy(
  keys: StreakMetricKey[],
): StreakMetricKey[] {
  const rank = new Map(STREAK_HIERARCHY_ORDER.map((k, i) => [k, i]));
  return [...keys]
    .filter((k) => k !== "returnConsistencyPct" && k !== "max60MinStreak")
    .sort((a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99));
}

export type StreakPoolKind = "GKP" | "DEF" | "MID" | "FWD" | "MIXED";

/** Twarda blokada kafelków niezgodnych z pozycją na wykresie. */
export function filterValidStreakKeysForPosition(
  keys: StreakMetricKey[],
  pool: StreakPoolKind,
): StreakMetricKey[] {
  return keys.filter((key) => {
    if (key === "max60MinStreak") return false; // Kartoteka Piłkarza
    if (pool === "GKP") {
      return !(
        key === "maxDcPointsStreak" ||
        key === "maxGoalStreak" ||
        key === "maxAssistStreak" ||
        key === "maxGoalOrAssistStreak"
      );
    }
    if (pool === "DEF" || pool === "MID" || pool === "FWD") {
      if (key === "maxSavesPointStreak") return false;
    }
    if (pool === "FWD" && key === "maxCleanSheetStreak") return false;
    if (pool === "MIXED" && key === "maxSavesPointStreak") return false;
    return true;
  });
}

export function detectStreakPoolKind(
  elementTypes: Array<1 | 2 | 3 | 4>,
): StreakPoolKind {
  const types = new Set(elementTypes);
  if (types.size !== 1) return "MIXED";
  const only = [...types][0];
  if (only === 1) return "GKP";
  if (only === 2) return "DEF";
  if (only === 3) return "MID";
  if (only === 4) return "FWD";
  return "MIXED";
}

export const POINTS_POS_LABELS: Record<
  StatsLabLang,
  Record<string, string>
> = {
  pl: {
    appearancePts: "Występy (1–2 pkt)",
    appearanceBasePts: "Występ",
    sixtyPlusPts: "60+ min",
    goalPts: "Gole",
    assistPts: "Asysty",
    cleanSheetPts: "Czyste konta (CS)",
    dcPts: "Defensive Contributions (DC)",
    savePts: "Obrony",
    penaltySavePts: "Karne",
    bonusPts: "Bonus",
  },
  en: {
    appearancePts: "Appearances (1–2 pts)",
    appearanceBasePts: "Appearance",
    sixtyPlusPts: "60+ mins",
    goalPts: "Goals",
    assistPts: "Assists",
    cleanSheetPts: "Clean sheets (CS)",
    dcPts: "Defensive Contributions (DC)",
    savePts: "Saves",
    penaltySavePts: "Penalties saved",
    bonusPts: "Bonus",
  },
};

/** Krótkie etykiety na listwie pod paskiem / w legendzie. */
export const POINTS_POS_SHORT: Record<
  StatsLabLang,
  Record<string, string>
> = {
  pl: {
    appearancePts: "MIN",
    appearanceBasePts: "WYS",
    sixtyPlusPts: "60+",
    goalPts: "GOL",
    assistPts: "AST",
    cleanSheetPts: "CS",
    dcPts: "DC",
    savePts: "OBR",
    penaltySavePts: "KAR",
    bonusPts: "BON",
  },
  en: {
    appearancePts: "MIN",
    appearanceBasePts: "APP",
    sixtyPlusPts: "60+",
    goalPts: "GOL",
    assistPts: "AST",
    cleanSheetPts: "CS",
    dcPts: "DC",
    savePts: "SV",
    penaltySavePts: "PS",
    bonusPts: "BON",
  },
};

export const POINTS_NEG_SHORT: Record<
  StatsLabLang,
  Record<string, string>
> = {
  pl: {
    goalsConcededDeduction: "GC",
    yellowCardDeduction: "ŻK",
    redCardDeduction: "CK",
    penaltyMissDeduction: "PK-",
    ownGoalDeduction: "OG",
  },
  en: {
    goalsConcededDeduction: "GC",
    yellowCardDeduction: "YC",
    redCardDeduction: "RC",
    penaltyMissDeduction: "PK-",
    ownGoalDeduction: "OG",
  },
};

export const POINTS_NEG_LABELS: Record<
  StatsLabLang,
  Record<string, string>
> = {
  pl: {
    goalsConcededDeduction: "Stracone gole (−1 / 2 GC)",
    yellowCardDeduction: "Żółte kartki (−1)",
    redCardDeduction: "Czerwone kartki (−3)",
    penaltyMissDeduction: "Zmarnowane karne (−2)",
    ownGoalDeduction: "Samobóje (−2)",
  },
  en: {
    goalsConcededDeduction: "Goals conceded (−1 / 2 GC)",
    yellowCardDeduction: "Yellow cards (−1)",
    redCardDeduction: "Red cards (−3)",
    penaltyMissDeduction: "Penalties missed (−2)",
    ownGoalDeduction: "Own goals (−2)",
  },
};
