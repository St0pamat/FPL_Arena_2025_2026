/**
 * Predykcje i Terminarz — słownik PL / EN (PROJECTIONS_CENTRE).
 */

import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import type {
  ProjectionsCellLayout,
  ProjectionsCellMetric,
  ProjectionsDgwCsDisplayMode,
  ProjectionsFdrMode,
  ProjectionsSubView,
  ProjectionsVenueFilter,
} from "@/lib/stats-lab/projectionsEngine";

export type ProjectionsFdrNumberFormat = "LEVEL_1_5" | "SCORE_0_100";

export const PROJECTIONS_MODULE_LABEL: Record<StatsLabLang, string> = {
  pl: "Predykcje i Terminarz",
  en: "Projections & Fixtures",
};

export const PROJECTIONS_POSTER_EYEBROW: Record<StatsLabLang, string> = {
  pl: "FPL ARENA • PREDYKCJE I TERMINARZ",
  en: "FPL ARENA • PROJECTIONS CENTRE",
};

export const PROJECTIONS_SUBVIEW_LABELS: Record<
  StatsLabLang,
  Record<ProjectionsSubView, string>
> = {
  pl: {
    FIXTURES_FDR: "Kalendarz FDR",
    PROJECTED_GOALS: "Predykcja Goli",
    CLEAN_SHEETS: "Czyste Konta %",
    MATCHUP_CARDS: "Karty Meczowe",
  },
  en: {
    FIXTURES_FDR: "FDR Fixture Ticker",
    PROJECTED_GOALS: "Projected Goals",
    CLEAN_SHEETS: "Clean Sheet Odds",
    MATCHUP_CARDS: "Matchup Cards",
  },
};

export const PROJECTIONS_FDR_MODE_LABELS: Record<
  StatsLabLang,
  Record<ProjectionsFdrMode, string>
> = {
  pl: {
    OVERALL: "Ogółem",
    ATTACK: "Atak",
    DEFENCE: "Obrona",
  },
  en: {
    OVERALL: "Overall",
    ATTACK: "Attack",
    DEFENCE: "Defence",
  },
};

export const PROJECTIONS_CELL_METRIC_LABELS: Record<
  StatsLabLang,
  Record<ProjectionsCellMetric, string>
> = {
  pl: {
    FDR: "Trudność FDR",
    GOALS: "Oczekiwane Gole (xG)",
    CS_PCT: "Czyste Konto %",
    WIN_PCT: "Szansa Wygranej %",
  },
  en: {
    FDR: "FDR Difficulty",
    GOALS: "Projected Goals",
    CS_PCT: "Clean Sheet %",
    WIN_PCT: "Win Odds %",
  },
};

export const PROJECTIONS_VENUE_FILTER_LABELS: Record<
  StatsLabLang,
  Record<ProjectionsVenueFilter, string>
> = {
  pl: {
    ALL: "Wszystkie",
    HOME_ONLY: "Tylko Dom",
    AWAY_ONLY: "Tylko Wyjazd",
  },
  en: {
    ALL: "All Venues",
    HOME_ONLY: "Home Only",
    AWAY_ONLY: "Away Only",
  },
};

export const PROJECTIONS_CELL_LAYOUT_LABELS: Record<
  StatsLabLang,
  Record<ProjectionsCellLayout, string>
> = {
  pl: {
    TEXT_ONLY: "Tylko tekst",
    TEXT_AND_BADGE: "Tekst + Herb",
    LARGE_BADGE: "Duży Herb",
  },
  en: {
    TEXT_ONLY: "Text Only",
    TEXT_AND_BADGE: "Text + Badge",
    LARGE_BADGE: "Large Badge",
  },
};

export const PROJECTIONS_FDR_NUMBER_FORMAT_LABELS: Record<
  StatsLabLang,
  Record<ProjectionsFdrNumberFormat, string>
> = {
  pl: {
    LEVEL_1_5: "Poziomy 1–5",
    SCORE_0_100: "Skala 0–100",
  },
  en: {
    LEVEL_1_5: "Levels 1–5",
    SCORE_0_100: "Scale 0–100",
  },
};

export const PROJECTIONS_DGW_CS_MODE_LABELS: Record<
  StatsLabLang,
  Record<ProjectionsDgwCsDisplayMode, string>
> = {
  pl: {
    SPLIT_MATCHES: "DGW: Oba mecze osobno",
    COMBINED_AT_LEAST_ONE: "DGW: Szansa na ≥1 CS (%)",
  },
  en: {
    SPLIT_MATCHES: "DGW: Split matches",
    COMBINED_AT_LEAST_ONE: "DGW: ≥1 CS Odds (%)",
  },
};

export const PROJECTIONS_RANGE_PRESETS: Record<
  StatsLabLang,
  Record<5 | 6 | 8 | 10, string>
> = {
  pl: {
    5: "Następne 5 GW",
    6: "Następne 6 GW",
    8: "Następne 8 GW",
    10: "Następne 10 GW",
  },
  en: {
    5: "Next 5 GWs",
    6: "Next 6 GWs",
    8: "Next 8 GWs",
    10: "Next 10 GWs",
  },
};

export const PROJECTIONS_FDR_LEVEL_LABELS: Record<
  StatsLabLang,
  Record<1 | 2 | 3 | 4 | 5, string>
> = {
  pl: {
    1: "Bardzo łatwy",
    2: "Łatwy",
    3: "Średni",
    4: "Trudny",
    5: "Bardzo trudny",
  },
  en: {
    1: "Very easy",
    2: "Easy",
    3: "Average",
    4: "Hard",
    5: "Very hard",
  },
};

export const PROJECTIONS_GOALS_BAND_LABELS: Record<
  StatsLabLang,
  Record<"elite" | "good" | "avg" | "low" | "vlow", string>
> = {
  pl: {
    elite: "≥2.20 Elitarny atak",
    good: "1.65–2.19 Dobry atak",
    avg: "1.15–1.64 Średni",
    low: "0.80–1.14 Niski",
    vlow: "<0.80 Bardzo niski",
  },
  en: {
    elite: "≥2.20 Elite attack",
    good: "1.65–2.19 Good attack",
    avg: "1.15–1.64 Average",
    low: "0.80–1.14 Low",
    vlow: "<0.80 Very low",
  },
};

export const PROJECTIONS_CS_BAND_LABELS: Record<
  StatsLabLang,
  Record<"elite" | "good" | "avg" | "low" | "vlow", string>
> = {
  pl: {
    elite: "≥42% Wysoka szansa CS",
    good: "32–41.9% Dobra szansa CS",
    avg: "22–31.9% Średnia",
    low: "14–21.9% Niska",
    vlow: "<14% Bardzo niska",
  },
  en: {
    elite: "≥42% High CS odds",
    good: "32–41.9% Good CS odds",
    avg: "22–31.9% Average",
    low: "14–21.9% Low",
    vlow: "<14% Very low",
  },
};

export type ProjectionsMatchupDisplayMode =
  | "CARDS_GRID"
  | "POSTER_3COL"
  | "VERIFICATION";

export type ProjectionsMatchupSortKey =
  | "KICKOFF"
  | "TOTAL_GOALS_DESC"
  | "FAVOURITE_WIN_DESC";

export const PROJECTIONS_MATCHUP_MODE_LABELS: Record<
  StatsLabLang,
  Record<ProjectionsMatchupDisplayMode, string>
> = {
  pl: {
    CARDS_GRID: "Karty Pojedynków (Siatka)",
    POSTER_3COL: "Plakat 1-GW (3 Kolumny)",
    VERIFICATION: "Weryfikacja: Predykcje vs Rzeczywistość",
  },
  en: {
    CARDS_GRID: "Matchup Cards (Grid)",
    POSTER_3COL: "1-GW Poster (3 Columns)",
    VERIFICATION: "Verification: Projected vs Actual",
  },
};

export const PROJECTIONS_MATCHUP_SORT_LABELS: Record<
  StatsLabLang,
  Record<ProjectionsMatchupSortKey, string>
> = {
  pl: {
    KICKOFF: "Wg czasu meczu",
    TOTAL_GOALS_DESC: "Wg sumy oczekiwanych goli",
    FAVOURITE_WIN_DESC: "Wg najbardziej jednostronnych",
  },
  en: {
    KICKOFF: "By kickoff time",
    TOTAL_GOALS_DESC: "By total projected goals",
    FAVOURITE_WIN_DESC: "By most one-sided",
  },
};

export function projectionsUi(lang: StatsLabLang) {
  const isPl = lang === "pl";
  return {
    moduleLabel: PROJECTIONS_MODULE_LABEL[lang],
    posterEyebrow: PROJECTIONS_POSTER_EYEBROW[lang],
    loading: isPl ? "Ładowanie projekcji…" : "Loading projections…",
    empty: isPl
      ? "Brak danych terminarza — uruchom Sync FPL (bootstrap + fixtures)."
      : "No fixture data — run Stats Lab Sync (bootstrap + fixtures).",
    error: isPl ? "Błąd ładowania projekcji" : "Failed to load projections",
    exportPair: isPl ? "Eksport JPG + JSON" : "Export JPG + JSON",
    exportBusy: isPl ? "Eksport…" : "Exporting…",
    customSubtitle: isPl ? "Podtytuł redakcyjny" : "Editorial subtitle",
    customSubtitlePh: isPl
      ? "np. Najłatwiejszy terminarz mid-season"
      : "e.g. Easiest mid-season run",
    fromGw: isPl ? "Od GW" : "From GW",
    toGw: isPl ? "Do GW" : "To GW",
    hiddenGws: isPl ? "Ukryte kolejki" : "Hidden GWs",
    restoreAllGws: isPl ? "Przywróć wszystkie GW" : "Restore all GWs",
    fdrMode: isPl ? "Skala FDR" : "FDR scale",
    cellMetric: isPl ? "Miara w komórce" : "Cell metric",
    venueFilter: isPl ? "Filtr meczu" : "Venue filter",
    cellLayout: isPl ? "Układ komórki" : "Cell layout",
    fdrNumberFormat: isPl ? "Format FDR" : "FDR format",
    dgwCsMode: isPl ? "Prezentacja DGW" : "DGW display",
    topAttacksPreset: isPl
      ? "🔥 Top Ataki: Następne 6 GW"
      : "🔥 Top Attacks: Next 6 GWs",
    topDefencesPreset: isPl
      ? "🛡️ Top Obrony: Następne 6 GW"
      : "🛡️ Top Defences: Next 6 GWs",
    colRank: "#",
    colClub: isPl ? "KLUB" : "TEAM",
    colM: "M",
    colMFull: isPl ? "Mecze w zakresie" : "Matches in range",
    colAvgFdr: isPl ? "ŚR. FDR" : "AVG FDR",
    colAvgFdrFull: isPl
      ? "Średnia trudność na mecz"
      : "Average difficulty per match",
    colGoals: isPl ? "GOLE" : "GOALS",
    colGoalsFull: isPl
      ? "Suma oczekiwanych goli"
      : "Total projected goals",
    colCs: "CS",
    colCsFull: isPl
      ? "Suma oczekiwanych czystych kont"
      : "Total expected clean sheets",
    colAvgPerMatch: isPl ? "ŚR. / MECZ" : "AVG / M",
    colAvgPerMatchFull: isPl
      ? "Średnia oczekiwanych goli na mecz"
      : "Average projected goals per match",
    colTotal: isPl ? "SUMA" : "TOTAL",
    colTotalFull: isPl
      ? "Suma oczekiwanych goli w zakresie"
      : "Total projected goals in range",
    colAvgCsPct: isPl ? "ŚR. CS%" : "AVG CS%",
    colAvgCsPctFull: isPl
      ? "Średnia szansa na czyste konto na mecz"
      : "Average clean sheet % per match",
    colTotalCs: isPl ? "SUMA CS" : "TOTAL CS",
    colTotalCsFull: isPl
      ? "Suma oczekiwanych czystych kont w zakresie"
      : "Total expected clean sheets in range",
    leagueAvg: isPl ? "Ø Średnia ligi" : "Ø League average",
    dgwBadge: "DGW",
    blankCell: "—",
    venueLegend: isPl
      ? "WIELKIE LITERY = mecz u siebie (np. ARS) · małe litery = mecz na wyjeździe (np. avl)"
      : "UPPERCASE = Home match (e.g. ARS) · lowercase = Away match (e.g. avl)",
    credibilityLine1: isPl
      ? "Prognozy FPL Arena oparte na formie drużyn (gole, xG, defensywa) oraz sile terminarza Premier League"
      : "FPL Arena projections based on team form (goals, xG, defence) and Premier League fixture strength",
    credibilityLine2: (args: {
      syncedAt?: string | null;
      season: string;
      gwRangeLabel: string;
    }) => {
      const sync =
        args.syncedAt &&
        args.syncedAt.trim() !== "" &&
        args.syncedAt !== "—"
          ? isPl
            ? ` · Aktualizacja: ${args.syncedAt}`
            : ` · Updated: ${args.syncedAt}`
          : "";
      return isPl
        ? `Sezon: ${args.season} · Zakres: ${args.gwRangeLabel}${sync} · Opis wyliczeń w Bazie Wiedzy`
        : `Season: ${args.season} · Range: ${args.gwRangeLabel}${sync} · Methodology in Knowledge Base`;
    },
    brandFooter: "www.fpl-arena.com • Powered by St0pa | FPL Arena",
    qaPass: isPl
      ? "✓ Dane i prognozy zweryfikowane"
      : "✓ Projections verified",
    qaFail: isPl
      ? "⚠ Sprawdź synchronizację danych"
      : "⚠ Check data sync",
    hideGwHint: isPl ? "Ukryj kolejkę" : "Hide gameweek",
    scaleLabel: isPl ? "Skala" : "Scale",
    matchupGw: isPl ? "Kolejka" : "Gameweek",
    matchupMode: isPl ? "Tryb prezentacji" : "Display mode",
    matchupSort: isPl ? "Sortowanie kart" : "Card sort",
    matchupPrevFinished: (gw: number) =>
      isPl
        ? `◀ Poprzednia GW (GW${gw} — Weryfikacja)`
        : `◀ Last Finished GW (GW${gw})`,
    matchupUpcoming: (gw: number) =>
      isPl
        ? `🎯 Nadchodząca GW (GW${gw})`
        : `🎯 Upcoming GW (GW${gw})`,
    matchupNext: isPl ? "Następna GW ▶" : "Next GW ▶",
    projectedGoalsLabel: isPl ? "OCZEKIWANE GOLE (xG)" : "PROJECTED GOALS",
    topExactScores: isPl ? "TOP 3 DOKŁADNE WYNIKI" : "TOP 3 EXACT SCORES",
    csPctLabel: isPl ? "Czyste Konto % (CS%)" : "Clean Sheet %",
    twoPlusLabel: isPl ? "Szansa na 2+ Gole %" : "2+ Goals Odds %",
    drawLabel: isPl ? "Remis" : "Draw",
    posterColGoals: (gw: number) =>
      isPl ? `OCZEKIWANE GOLE (GW${gw})` : `PROJECTED GOALS (GW${gw})`,
    posterColCs: (gw: number) =>
      isPl ? `CZYSTE KONTO % (GW${gw})` : `CLEAN SHEET ODDS % (GW${gw})`,
    posterColWin: (gw: number) =>
      isPl ? `SZANSA WYGRANEJ % (GW${gw})` : `WIN ODDS % (GW${gw})`,
    kpiFinished: isPl ? "MECZE ZAKOŃCZONE" : "FINISHED MATCHES",
    kpi1x2: isPl ? "TRAFNOŚĆ 1X2" : "1X2 ACCURACY",
    kpiTop3: isPl ? "DOKŁADNY WYNIK W TOP 3" : "TOP 3 EXACT SCORE HITS",
    kpiMae: isPl ? "ŚREDNI BŁĄD GOLI (MAE)" : "GOALS MAE",
    kpiBrier: isPl ? "Śr. Brier Score" : "Avg Brier Score",
    predBeforeDeadline: isPl
      ? "PREDYKCJA MODELU (przed deadline'em)"
      : "MODEL PREDICTION (pre-deadline)",
    actualFt: isPl ? "RZECZYWISTOŚĆ (Wynik końcowy FT)" : "ACTUAL RESULT (FT)",
    hit1x2: isPl ? "✓ TRAFIONY 1X2" : "✓ 1X2 HIT",
    miss1x2: isPl ? "✗ PUDŁO 1X2" : "✗ 1X2 MISS",
    hitExact: (rank: number) =>
      isPl
        ? `🎯 TRAFIONY WYNIK TOP #${rank}`
        : `🎯 EXACT SCORE HIT #${rank}`,
    pendingMatch: isPl
      ? "Mecz przed rozegraniem — wybierz zakończoną kolejkę (np. GW10), aby zobaczyć weryfikację"
      : "Fixture not played yet — select a finished GW (e.g. GW10) to see verification",
    ftBadge: "FT",
    favourite: isPl ? "Faworyt" : "Favourite",
    noMatchups: isPl
      ? "Brak meczów w tej kolejce"
      : "No fixtures in this gameweek",
  };
}

export function formatProjectionsGwRangeLabel(
  startGw: number,
  endGw: number,
): string {
  return startGw === endGw ? `GW${startGw}` : `GW${startGw}–GW${endGw}`;
}
