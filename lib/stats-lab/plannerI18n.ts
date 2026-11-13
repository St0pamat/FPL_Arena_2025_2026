/**
 * FPL Planner — słownik PL / EN (FPL_PLANNER).
 */

import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import type { PlannerValueSource } from "@/lib/stats-lab/fplEntryApi";

export type PlannerTileMetric =
  | "FIXTURES"
  | "XPTS"
  | "PRICES"
  | "FORM"
  | "DC";

export type PlannerDraftVariant = "A" | "B" | "C";

export type PlannerChipType = "wildcard" | "freehit" | "bboost" | "3xc";

export const PLANNER_MODULE_LABEL: Record<StatsLabLang, string> = {
  pl: "Planer FPL — Drużyna, Transfery i Chipy",
  en: "FPL Planner — Team, Transfers & Chips",
};

export const PLANNER_MODULE_SUBTITLE: Record<StatsLabLang, string> = {
  pl: "Kroczące planowanie wielokolejkowe, dokładne ceny sprzedaży (SP), prognozy xPts v1 i warianty A/B/C",
  en: "Rolling multi-GW planning, exact selling prices (SP), xPts v1 projections & A/B/C drafts",
};

export const PLANNER_POSTER_FOOTER: Record<StatsLabLang, string> = {
  pl: "Planer FPL Arena • Ceny sprzedaży (SP), kroczące FT i predykcje xPts v1 oparte na modelu Dixona-Colesa",
  en: "FPL Arena Planner • Selling prices (SP), rolling FT & xPts v1 projections powered by Dixon-Coles",
};

export function plannerUi(lang: StatsLabLang) {
  const isPl = lang === "pl";
  return {
    moduleTitle: PLANNER_MODULE_LABEL[lang],
    moduleSubtitle: PLANNER_MODULE_SUBTITLE[lang],
    posterFooter: PLANNER_POSTER_FOOTER[lang],

    teamIdLabel: isPl ? "ID drużyny FPL" : "FPL Team ID",
    loadTeamBtn: isPl ? "Wczytaj skład" : "Load squad",
    loadDemoBtn: isPl ? "Skład Demo" : "Demo Squad",
    draftVariantLabel: isPl ? "Wariant planu" : "Draft variant",
    cloneDraftBtn: isPl ? "Kopiuj do..." : "Copy to...",

    transfers: isPl ? "Transfery" : "Transfers",
    cost: isPl ? "Koszt (Hity)" : "Cost (Hits)",
    bank: isPl ? "W banku" : "In Bank",
    projectedPts: isPl ? "Prognoza xPts" : "Projected xPts",
    spendingPower: isPl ? "Siła nabywcza (Budżet)" : "Spending power",

    valueSource: {
      api: isPl ? "Oficjalne API" : "Official API",
      derived: isPl ? "Wyliczone z historii" : "Derived from history",
      manual: isPl ? "Korekta ręczna" : "Manual override",
    } satisfies Record<PlannerValueSource, string>,

    wildcard: "Wildcard",
    freehit: "Free Hit",
    bboost: "Bench Boost",
    "3xc": "Triple Captain",
    chipFtRuleHint: isPl
      ? "Zasada FPL: Po użyciu Wildcard lub Free Hit zapisane darmowe transfery są zachowywane (np. 2 FT zostają 2 FT w kolejnej GW, bez +1)."
      : "FPL Rule: Saved free transfers are preserved after Wildcard or Free Hit (e.g. 2 FT remain 2 FT next GW, without +1).",

    optimiseXiBtn: isPl ? "Optymalizuj XI (xPts)" : "Optimise XI (xPts)",
    undoBtn: isPl ? "Cofnij" : "Undo",
    resetGwBtn: isPl ? "Resetuj GW" : "Reset GW",
    resetAllBtn: isPl ? "Resetuj plan" : "Reset Plan",

    tileMetric: {
      FIXTURES: isPl ? "Terminarz (3 GW)" : "Fixtures (3 GW)",
      XPTS: isPl ? "Prognoza xPts" : "Projected xPts",
      PRICES: isPl ? "Ceny (PP / CP / SP)" : "Prices (PP / CP / SP)",
      FORM: isPl ? "Forma i Posiadanie" : "Form & Ownership",
      DC: isPl ? "Def. Contribution" : "Def. Contribution",
    } satisfies Record<PlannerTileMetric, string>,

    formationErrorMinDef: isPl
      ? "Niedozwolona formacja: Pierwszy skład musi mieć minimum 3 obrońców (DEF)."
      : "Invalid formation: Starting XI requires at least 3 defenders (DEF).",
    formationErrorMinMid: isPl
      ? "Niedozwolona formacja: Pierwszy skład musi mieć minimum 2 pomocników (MID)."
      : "Invalid formation: Starting XI requires at least 2 midfielders (MID).",
    formationErrorMinFwd: isPl
      ? "Niedozwolona formacja: Pierwszy skład musi mieć minimum 1 napastnika (FWD)."
      : "Invalid formation: Starting XI requires at least 1 forward (FWD).",
    formationErrorGkOnly: isPl
      ? "Bramkarza (GKP) można zamienić wyłącznie z drugim bramkarzem."
      : "Goalkeeper (GKP) can only be swapped with the other goalkeeper.",
    clubLimitExceeded: isPl
      ? "Przekroczono limit 3 zawodników z jednego klubu:"
      : "Exceeded limit of 3 players from the same club:",
    clubLimitPreExistingMustFix: isPl
      ? "Stan zastany 4/3 — najpierw sprzedaj zawodnika z klubu:"
      : "Pre-existing 4/3 state — first sell a player from club:",
    negativeBankError: isPl
      ? "Brak środków w banku na zatwierdzenie tej kolejki."
      : "Insufficient bank funds for this Gameweek.",
    transferConflictError: isPl
      ? "Konflikt planu: transfer w tej kolejce dotyczy gracza zmienionego we wcześniejszej GW."
      : "Plan conflict: transfer in this GW references a player modified in an earlier GW.",
    priceDropSafe: isPl
      ? "Najbliższy spadek ceny (-£0.1m) NIE obniży Twojej ceny sprzedaży (SP)."
      : "Next price drop (-£0.1m) will NOT affect your selling price (SP).",
    priceDropRisk: isPl
      ? "Uwaga: Najbliższy spadek ceny (-£0.1m) obniży Twoją cenę sprzedaży (SP) o £0.1m!"
      : "Warning: Next price drop (-£0.1m) will reduce your selling price (SP) by £0.1m!",

    playersTab: isPl ? "Zawodnicy" : "Players",
    watchlistTab: isPl ? "★ Ulubieni" : "★ Watchlist",
    summaryTab: isPl ? "Podsumowanie" : "Summary",

    draftA: "A",
    draftB: "B",
    draftC: "C",
    freeTransfersShort: isPl ? "FT" : "FT",
    hitsShort: isPl ? "Hity" : "Hits",
    captainShort: isPl ? "C" : "C",
    viceShort: isPl ? "VC" : "VC",
    blankGw: isPl ? "BGW" : "BGW",
    doubleGw: isPl ? "DGW" : "DGW",
  };
}

export type PlannerUiPack = ReturnType<typeof plannerUi>;

export const PLANNER_CHIP_LABELS: Record<
  StatsLabLang,
  Record<PlannerChipType, string>
> = {
  pl: {
    wildcard: "Wildcard",
    freehit: "Free Hit",
    bboost: "Bench Boost",
    "3xc": "Triple Captain",
  },
  en: {
    wildcard: "Wildcard",
    freehit: "Free Hit",
    bboost: "Bench Boost",
    "3xc": "Triple Captain",
  },
};

export const PLANNER_TILE_METRIC_LABELS: Record<
  StatsLabLang,
  Record<PlannerTileMetric, string>
> = {
  pl: {
    FIXTURES: "Terminarz (3 GW)",
    XPTS: "Prognoza xPts",
    PRICES: "Ceny (PP / CP / SP)",
    FORM: "Forma i Posiadanie",
    DC: "Def. Contribution",
  },
  en: {
    FIXTURES: "Fixtures (3 GW)",
    XPTS: "Projected xPts",
    PRICES: "Prices (PP / CP / SP)",
    FORM: "Form & Ownership",
    DC: "Def. Contribution",
  },
};
