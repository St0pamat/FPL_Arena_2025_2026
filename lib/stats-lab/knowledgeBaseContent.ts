/**
 * FPL Arena: Stats Lab — dwujęzyczna baza wiedzy / przewodnik analityczny.
 */

import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import {
  FPL_STAT_CATEGORY_LABELS_EN,
  FPL_STAT_CATEGORY_LABELS_PL,
  FPL_STAT_DEFINITIONS,
  type FplStatDefinition,
} from "@/lib/stats-lab/types";

export type KnowledgeTabId =
  | "HOW_TO_USE"
  | "POSITION_GUIDE"
  | "SCORING_AND_DC"
  | "STATS_GLOSSARY"
  | "STREAKS_AND_BREAKDOWN";

export type KnowledgeBlock = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  /** Wyróżniona karta (np. OCENA 0–100 / RATING) */
  featured?: boolean;
};

export type KnowledgeTable = {
  caption: string;
  headers: [string, string];
  rows: Array<[string, string]>;
};

export type KnowledgeTabContent = {
  id: KnowledgeTabId;
  label: string;
  intro: string;
  blocks: KnowledgeBlock[];
  tables?: KnowledgeTable[];
};

export type KnowledgePack = {
  title: string;
  searchPlaceholder: string;
  closeLabel: string;
  noResults: string;
  tabs: KnowledgeTabContent[];
};

const HOW_TO_USE_PL: KnowledgeTabContent = {
  id: "HOW_TO_USE",
  label: "3 moduły Stats Lab",
  intro:
    "Przewodnik po całej aplikacji Stats Lab: Stats Centre (tabele), Studio Wykresów (wizualizacje) oraz Predykcje i Terminarz (FDR i prognozy).",
  blocks: [
    {
      heading: "Moduł 1: Stats Centre — Tabele Analityczne",
      paragraphs: [
        "Tu przeglądasz dane w formie tabel. Masz trzy tryby: Zawodnicy, Mecz po meczu oraz Kluby.",
        "Zawodnicy mają 8 zakładek tematycznych (punkty, atak, kreacja, obrona/DC, ICT, wartość, dyscyplina, transfery). Kluby mają 4 zakładki (atak, obrona, forma, terminarz).",
        "Kolory komórek to skala percentyli P5–P95 na tle wybranej grupy porównawczej — im bardziej „gorąco”, tym lepszy wynik względem rówieśników (przy metrykach „mniej = lepiej” logika jest odwrócona).",
      ],
      bullets: [
        "Per 90: przelicza tempo na 90 minut — przydatne przy małej liczbie minut.",
        "Słownik skrótów: pełne nazwy kolumn znajdziesz w zakładce „Słownik skrótów” oraz w legendzie nagłówków tabeli.",
        "Ulubieni: gwiazdka dodaje zawodnika do watchlisty; filtr ★ Ulubieni zawęża tabelę.",
      ],
    },
    {
      heading: "Moduł 2: Studio Wykresów — 6 wizualizacji",
      paragraphs: [
        "Profil wielowymiarowy: porównanie wielu cech na raz + kafelek OCENA.",
        "Dekompozycja punktów: za co dokładnie gracz zbiera punkty FPL (i kary).",
        "Passy i regularność: serie zwrotów, CS, DC, 60+ min oraz Regularność zwrotów %.",
        "Radar / Pizza: 1–4 graczy na tych samych osiach + szybkie sloty wyboru.",
        "Scatter 2D: dwie osie X/Y z ćwiartkami względem grupy.",
        "Macierz heatmap: szybki skan Top N po wielu statystykach + kolumna OCENA.",
      ],
    },
    {
      heading: "OCENA (0–100) — jak liczona?",
      featured: true,
      paragraphs: [
        "OCENA to średnia percentyli wybranych cech na tle grupy porównawczej (comparisonPool). 90 = lepszy wynik niż 90% grupy; 100 = lider cechy.",
        "Liczymy tylko cechy, które realnie różnicują grupę (płaskie metryki, np. wszyscy 0 OG, nie pompują wyniku).",
      ],
      bullets: [
        "Tło grupy (0–100): długość / kolor = pozycja percentylowa; liczby na paskach = prawdziwe wartości.",
        "Wartości statystyk: porównujesz surowe liczby (np. 12 DC), nie relative ranking.",
      ],
    },
    {
      heading: "Oficjalne zasady FPL: DC i Returny",
      paragraphs: [
        "Defensive Contributions (DC): DEF ≥10 CBI+TKL w meczu = +2 pkt; MID/FWD ≥12 CBI+TKL+REC = +2 pkt.",
        "Return (Zwrot FPL): prawdziwy zwrot punktowy (gol/asysta/CS/DC/bonus itd.) — nie same 1–2 pkt za czas gry. W Studio patrz zakładkę Passy oraz słownik w SCORING.",
      ],
    },
    {
      heading: "Moduł 3: Predykcje i Terminarz",
      paragraphs: [
        "Kalendarz FDR pokazuje trudność terminarza w 3 skalach: Ogółem, Atak i Obrona.",
        "Prognozy: Oczekiwane Gole, Czyste Konto %, Karty Meczowe (Top 3 dokładne wyniki, 1X2%, weryfikacja Predykcje vs Rzeczywistość).",
        "DGW / BGW: podwójne i puste kolejki są oznaczone w terminarzu — planuj chipy i rotację z wyprzedzeniem.",
      ],
    },
    {
      heading: "Jak działa silnik predykcji pod maską",
      featured: true,
      paragraphs: [
        "Model matematyczny Dixona-Colesa łączy xG/xGC klubów z oficjalną siłą drużyn FPL (strength attack/defence home/away).",
        "Po deadlinie kolejki nie używamy danych z meczów tej kolejki do „przepowiadania wstecz” — snapshot jest zamrażany w momencie deadline’u, żeby weryfikacja była uczciwa.",
      ],
    },
    {
      heading: "Totals vs Per 90 (Centre + Studio)",
      paragraphs: [
        "Totals = suma w wybranym okresie. Najlepsze do rankingów „kto już nazbierał”.",
        "Per 90 = tempo na 90 minut. Używaj po kontuzji, transferze lub małej liczbie minut.",
      ],
    },
  ],
};

const HOW_TO_USE_EN: KnowledgeTabContent = {
  id: "HOW_TO_USE",
  label: "3 Stats Lab modules",
  intro:
    "Guide to the full Stats Lab: Stats Centre (tables), Chart Studio (visuals) and Projections & Fixtures (FDR and forecasts).",
  blocks: [
    {
      heading: "Module 1: Stats Centre — Analytical Tables",
      paragraphs: [
        "Browse data as tables. Three modes: Players, Match-by-match and Clubs.",
        "Players have 8 topical tabs (points, attack, creation, defence/DC, ICT, value, discipline, transfers). Clubs have 4 tabs (attack, defence, form, fixtures).",
        "Cell colours use a P5–P95 percentile scale vs your comparison group — hotter means a stronger relative result (inverted for “lower is better” metrics).",
      ],
      bullets: [
        "Per 90: rate per 90 minutes — useful with limited minutes.",
        "Abbreviation glossary: full column names live in the glossary tab and table header tooltips.",
        "Favourites: star a player for the watchlist; ★ Favourites filter narrows the table.",
      ],
    },
    {
      heading: "Module 2: Chart Studio — 6 visualisations",
      paragraphs: [
        "Multi-metric profile: many traits at once + RATING tile.",
        "Points breakdown: exactly where FPL points (and penalties) come from.",
        "Streaks & consistency: Return / CS / DC / 60+ streaks plus Return consistency %.",
        "Radar / Pizza: 1–4 players on shared axes + quick player slots.",
        "Scatter 2D: X/Y axes with group quadrants.",
        "Heatmap matrix: fast Top N scan across many stats + RATING column.",
      ],
    },
    {
      heading: "RATING (0–100) — how is it calculated?",
      featured: true,
      paragraphs: [
        "RATING is the mean of percentiles for your selected traits vs the comparison pool. 90 = better than 90% of the group; 100 = trait leader.",
        "Only differentiating traits count (flat metrics, e.g. everyone on 0 OG, do not inflate the score).",
      ],
      bullets: [
        "Group rank (0–100): length/colour = percentile position; numbers on bars = real values.",
        "Actual stats: compare raw numbers (e.g. 12 DC), not relative rank.",
      ],
    },
    {
      heading: "Official FPL rules: DC and Returns",
      paragraphs: [
        "Defensive Contributions (DC): DEF ≥10 CBI+TKL in a match = +2 pts; MID/FWD ≥12 CBI+TKL+REC = +2 pts.",
        "FPL Return: a true scoring return (goal/assist/CS/DC/bonus etc.) — not plain 1–2 appearance points. See Streaks in Studio and the SCORING tab.",
      ],
    },
    {
      heading: "Module 3: Projections & Fixtures",
      paragraphs: [
        "The FDR calendar shows fixture difficulty on 3 scales: Overall, Attack and Defence.",
        "Forecasts: Expected Goals, Clean Sheet %, Match Cards (Top 3 exact scores, 1X2%, Predictions vs Reality).",
        "DGW / BGW: double and blank gameweeks are flagged so you can plan chips and rotation early.",
      ],
    },
    {
      heading: "How the prediction engine works under the hood",
      featured: true,
      paragraphs: [
        "A Dixon–Coles model blends club xG/xGC with official FPL team strengths (attack/defence home/away).",
        "After a gameweek deadline we do not use that GW’s match data to “predict backwards” — the snapshot freezes at deadline so verification stays fair.",
      ],
    },
    {
      heading: "Totals vs Per 90 (Centre + Studio)",
      paragraphs: [
        "Totals = sum in the selected window. Best for “who already banked points” ranks.",
        "Per 90 = rate per 90 minutes. Use after injuries, transfers or limited minutes.",
      ],
    },
  ],
};

const POSITION_GUIDE_PL: KnowledgeTabContent = {
  id: "POSITION_GUIDE",
  label: "Atrybuty wg pozycji",
  intro:
    "Co realnie przekłada się na punkty FPL — według pozycji, z naciskiem na Defensive Contributions i BPS.",
  blocks: [
    {
      heading: "Bramkarze (GKP)",
      paragraphs: [
        "Baza punktów = czyste konta + xGC drużyny (czy obrona dopuszcza mało groźnych sytuacji).",
      ],
      bullets: [
        "Saves: co 3 obrony = +1 pkt — bramkarze słabszych drużyn często „żyją” z obron i BPS.",
        "Obronione karne = +5 pkt (rzadkie, ale game-changing).",
        "Patrz: CS, saves, xGC, form / PPM, BPS.",
      ],
    },
    {
      heading: "Obrońcy (DEF) — defensywa i baza",
      paragraphs: [
        "Czyste konto = +4 pkt. Niski xGC drużyny zwiększa szansę na CS.",
        "Defensive Contributions (DC): środkowi z wysokim CBI + Tackles (próg ≥10 w meczu) regularnie dokładają +2 pkt nawet BEZ czystego konta.",
      ],
      bullets: [
        "Kluczowe: CS, xGC, defensive_contributions_total, dc_bonus_matches / dc_bonus_points, BPS.",
      ],
    },
    {
      heading: "Obrońcy (DEF) — zagrożenie w ataku",
      paragraphs: [
        "Wahadłowi / ofensywni DEF: xGI, Threat (strzały i dośrodkowania po stałych fragmentach), BPS.",
        "Gol obrońcy = +6 pkt + duży zastrzyk BPS — szukaj set-piece targets.",
      ],
    },
    {
      heading: "Pomocnicy (MID) — atakujący / skrzydłowi",
      paragraphs: [
        "Inside forwards: xG, xGI, Threat, gole (+5), czyste konto (+1).",
      ],
    },
    {
      heading: "Pomocnicy (MID) — kreatorzy i stałe fragmenty",
      paragraphs: [
        "xA, Creativity, udział w rożnych / wolnych / karnych. Asysta = +3 + BPS.",
      ],
    },
    {
      heading: "Pomocnicy (MID) — box-to-box / „ósemki” i „szóstki”",
      paragraphs: [
        "DC jest tu przełomowe: próg ≥12 (CBI + Tackles + Recoveries) = +2 pkt w meczu.",
        "Tani MID z wysokim DC bywa najlepszą opcją budżetową sezonu — punkty bez goli.",
      ],
    },
    {
      heading: "Napastnicy (FWD)",
      paragraphs: [
        "xG i Threat mówią o jakości szans. Goals vs xG pokazuje, czy napastnik jest nieskuteczny (może „nadrobić”) czy ma zawyżoną skuteczność (regresja).",
        "Gol napastnika = +4 pkt FPL, ale w BPS to aż +24 — niemal pewny bonus przy trafieniu.",
      ],
      bullets: [
        "Patrz: xG, Threat, G−xG, udział w karnych, form / PPM, bonus.",
      ],
    },
  ],
};

const POSITION_GUIDE_EN: KnowledgeTabContent = {
  id: "POSITION_GUIDE",
  label: "Attributes by position",
  intro:
    "What actually drives FPL points by position — with emphasis on Defensive Contributions and BPS.",
  blocks: [
    {
      heading: "Goalkeepers (GKP)",
      paragraphs: [
        "Point base = clean sheets + team xGC (are opponents creating few big chances?).",
      ],
      bullets: [
        "Saves: every 3 saves = +1 pt — keepers in weaker sides often live on saves + BPS.",
        "Penalty saves = +5 pts (rare, but haul-makers).",
        "Watch: CS, saves, xGC, form / PPG, BPS.",
      ],
    },
    {
      heading: "Defenders (DEF) — defence & floor",
      paragraphs: [
        "Clean sheet = +4 pts. Low team xGC raises CS odds.",
        "Defensive Contributions (DC): centre-backs with high CBI + Tackles (threshold ≥10 in a match) regularly add +2 even WITHOUT a clean sheet.",
      ],
      bullets: [
        "Key: CS, xGC, defensive_contributions_total, dc_bonus_matches / dc_bonus_points, BPS.",
      ],
    },
    {
      heading: "Defenders (DEF) — attacking upside",
      paragraphs: [
        "Wing-backs / attacking DEF: xGI, Threat (shots & deliveries from set pieces), BPS.",
        "A defender goal = +6 pts + a big BPS spike — target set-piece threats.",
      ],
    },
    {
      heading: "Midfielders (MID) — attackers / wingers",
      paragraphs: [
        "Inside forwards: xG, xGI, Threat, goals (+5), clean sheet (+1).",
      ],
    },
    {
      heading: "Midfielders (MID) — creators & set pieces",
      paragraphs: [
        "xA, Creativity, corners / free-kicks / pens. An assist = +3 + BPS.",
      ],
    },
    {
      heading: "Midfielders (MID) — box-to-box / 8s & 6s",
      paragraphs: [
        "DC is transformative here: threshold ≥12 (CBI + Tackles + Recoveries) = +2 pts in a match.",
        "A cheap MID with elite DC can be the season’s best budget enabler — points without goals.",
      ],
    },
    {
      heading: "Forwards (FWD)",
      paragraphs: [
        "xG and Threat show chance quality. Goals vs xG shows underperformance (due a spike) vs overperformance (due a regression).",
        "A forward goal = +4 FPL pts, but +24 BPS — almost a locked bonus when they score.",
      ],
      bullets: [
        "Watch: xG, Threat, G−xG, penalty duty, form / PPG, bonus.",
      ],
    },
  ],
};

const SCORING_AND_DC_PL: KnowledgeTabContent = {
  id: "SCORING_AND_DC",
  label: "Punktacja i DC",
  intro:
    "Oficjalne zasady punktów FPL + dokładne omówienie Defensive Contributions, asyst i BPS.",
  blocks: [
    {
      heading: "Defensive Contributions (DC) — reguła",
      paragraphs: [
        "DC to dodatkowe +2 pkt FPL za osiągnięcie progu interwencji defensywnych w JEDNYM meczu. Nie kumuluje się: nawet przy 20 akcjach dostajesz maksymalnie +2.",
      ],
      bullets: [
        "DEF: Clearances + Blocks + Interceptions (CBI) + Tackles ≥ 10 → +2 pkt.",
        "MID / FWD: CBI + Tackles + Recoveries ≥ 12 → +2 pkt.",
        "GK nie zbierają punktów DC w tym systemie progów.",
      ],
    },
    {
      heading: "Asysty FPL — praktycznie",
      paragraphs: [
        "Asysta FPL jest szersza niż „ostatnie podanie” w TV. Liczą się m.in.:",
      ],
      bullets: [
        "Podanie przed golem (także po rykoszecie / dobitce, jeśli FPL uzna ciąg akcji).",
        "Wywalczony rzut karny lub wolny, po którym pada gol.",
        "Akcje po słupku / poprzeczce w określonych przypadkach regulaminu FPL.",
      ],
    },
    {
      heading: "Bonus Points System (BPS)",
      paragraphs: [
        "1–3 pkt bonusowe dla trzech najwyższych BPS w meczu. Duży wpływ mają: gol, asysta, CS (GK/DEF), strzał celny, kluczowe podanie, drybling, wysoka celność podań, wybicie z linii, karne obronione itd.",
        "Dlatego napastnik po golu prawie zawsze „wchodzi” w bonus — +24 BPS za gola FWD.",
      ],
    },
  ],
  tables: [
    {
      caption: "Podstawowa punktacja FPL (skrót)",
      headers: ["Akcja", "Punkty"],
      rows: [
        ["Występ 1–59 min", "+1"],
        ["Występ 60+ min", "+2"],
        ["Gol GK", "+10"],
        ["Gol DEF", "+6"],
        ["Gol MID", "+5"],
        ["Gol FWD", "+4"],
        ["Asysta", "+3"],
        ["Czyste konto GK/DEF", "+4"],
        ["Czyste konto MID", "+1"],
        ["DC (próg w meczu)", "+2"],
        ["3 obrony GK", "+1"],
        ["Obroniony karny", "+5"],
        ["Bonus BPS", "+1 / +2 / +3"],
        ["2 stracone gole (GK/DEF)", "−1"],
        ["Żółta kartka", "−1"],
        ["Czerwona kartka", "−3"],
        ["Zmarnowany karny", "−2"],
        ["Gol samobójczy", "−2"],
      ],
    },
  ],
};

const SCORING_AND_DC_EN: KnowledgeTabContent = {
  id: "SCORING_AND_DC",
  label: "Scoring & DC",
  intro:
    "Official FPL scoring rules plus a clear walkthrough of Defensive Contributions, assists and BPS.",
  blocks: [
    {
      heading: "Defensive Contributions (DC) — the rule",
      paragraphs: [
        "DC awards +2 FPL points for hitting a defensive-action threshold in a SINGLE match. It does not stack: even with 20 actions you still get a maximum of +2.",
      ],
      bullets: [
        "DEF: Clearances + Blocks + Interceptions (CBI) + Tackles ≥ 10 → +2 pts.",
        "MID / FWD: CBI + Tackles + Recoveries ≥ 12 → +2 pts.",
        "GKs do not earn DC points via these thresholds.",
      ],
    },
    {
      heading: "FPL assists — in practice",
      paragraphs: [
        "An FPL assist is broader than the “final ball” on TV. It can include:",
      ],
      bullets: [
        "The pass before a goal (including some rebound / tap-in chains if FPL credits the sequence).",
        "Winning a penalty or free-kick that leads to a goal.",
        "Certain actions after a post / crossbar under FPL’s published rules.",
      ],
    },
    {
      heading: "Bonus Points System (BPS)",
      paragraphs: [
        "1–3 bonus points go to the top three BPS scores in a match. Big drivers: goal, assist, CS (GK/DEF), shot on target, key pass, dribble, high pass completion, goal-line clearance, penalty save, etc.",
        "That is why a scoring forward almost always lands bonus — +24 BPS for a FWD goal.",
      ],
    },
  ],
  tables: [
    {
      caption: "Core FPL scoring (cheat sheet)",
      headers: ["Action", "Points"],
      rows: [
        ["Appearance 1–59 mins", "+1"],
        ["Appearance 60+ mins", "+2"],
        ["Goal GK", "+10"],
        ["Goal DEF", "+6"],
        ["Goal MID", "+5"],
        ["Goal FWD", "+4"],
        ["Assist", "+3"],
        ["Clean sheet GK/DEF", "+4"],
        ["Clean sheet MID", "+1"],
        ["DC (match threshold)", "+2"],
        ["3 GK saves", "+1"],
        ["Penalty save", "+5"],
        ["BPS bonus", "+1 / +2 / +3"],
        ["2 goals conceded (GK/DEF)", "−1"],
        ["Yellow card", "−1"],
        ["Red card", "−3"],
        ["Missed penalty", "−2"],
        ["Own goal", "−2"],
      ],
    },
  ],
};

const STREAKS_PL: KnowledgeTabContent = {
  id: "STREAKS_AND_BREAKDOWN",
  label: "Passy i rozbicie punktów",
  intro:
    "Jak czytać Dekompozycję Punktów i Eksplorator Pass — oraz czym dokładnie jest Zwrot FPL (FPL Return).",
  blocks: [
    {
      heading: "Zwrot FPL (FPL Return) — definicja meczowa",
      featured: true,
      paragraphs: [
        "Zwrot FPL = mecz z realnym dorobkiem punktowym PONAD sam czas gry. Zwykłe 1–2 pkt za występ / 60+ minut BEZ żadnej z poniższych akcji NIE jest zwrotem.",
        "W meczu z minutes > 0 gracz ma hasReturn = true, jeśli spełnił co najmniej jeden warunek:",
      ],
      bullets: [
        "Gol (goals_scored > 0) lub asysta (assists > 0).",
        "Czyste konto: clean_sheets > 0, minutes ≥ 60 oraz pozycja GK / DEF / MID (element_type 1–3).",
        "+2 pkt za próg Defensive Contributions: DEF → CBI+TKL ≥ 10; MID/FWD → CBI+TKL+REC ≥ 12 (albo dcPts ≥ 2 z bilansu). NIGDY nie liczymy samego defensive_contributions_total > 0!",
        "Bramkarz: saves ≥ 3 (+1 za obrony) lub penalties_saved > 0.",
        "Bonus BPS: bonus ≥ 1.",
      ],
    },
    {
      heading: "Serie, regularność i kropki meczowe",
      paragraphs: [
        "maxReturnStreak = najdłuższa seria kolejnych występów z hasReturn. currentReturnStreak = seria liczona wstecz od ostatniego rozegranego meczu. returnConsistencyPct = round((mecze ze zwrotem / mecze z minutes>0) × 100).",
        "Dzięki temu 7 zwrotów w 9 meczach = 78% regularności — i max streak nie może magicznie wynosić 9 GW. Kropki na kafelku = ostatnie do 10 występów (kolor = zwrot, szary = brak).",
      ],
      bullets: [
        "Występ (1+ min) vs 60+ min w Dekompozycji: rozbite osobno, żeby widać floor za czas gry vs prawdziwe akcje punktowe.",
        "Explosive: rzadkie haule, niska regularność, krótkie current streak. Consistent: żywa seria zwrotów + wysoki Consistency % + DC/CS tydzień w tydzień.",
      ],
    },
    {
      heading: "Dekompozycja punktów — co sprawdzać",
      paragraphs: [
        "Spójrz najpierw na segmenty dodatnie: czy haul stoi na golach/asystach, na CS, czy na DC (+2)?",
        "Włącz „Kary / Minusy”: kartki i stracone gole potrafią zjeść połowę brutto — szczególnie u DEF z wysokim GC.",
        "Porównaj Brutto → Kary → Netto z oficjalnymi punktami FPL (historia meczowa = dokładne; sam snapshot = estymacja).",
      ],
    },
    {
      heading: "Stats Centre → Watchlist → Studio",
      paragraphs: [
        "W Stats Centre sortujesz i filtrujesz pełną tabelę (zakładki Overview / Goal Threat / Defending itd.). Gwiazdka ★ dodaje gracza do Watchlist.",
        "Przycisk „Porównaj w Studiu” otwiera Chart Studio w trybie ręcznym z tymi samymi ID — idealne do Radar / Scatter / Streaks na Twojej krótkiej liście.",
      ],
    },
  ],
};

const STREAKS_EN: KnowledgeTabContent = {
  id: "STREAKS_AND_BREAKDOWN",
  label: "Streaks & breakdown",
  intro:
    "How to read Points Breakdown and the Streaks Explorer — and exactly what counts as an FPL Return.",
  blocks: [
    {
      heading: "FPL Return — match definition",
      featured: true,
      paragraphs: [
        "FPL Return = a match with real scoring actions BEYOND appearance time. Plain 1–2 pts for minutes alone (no actions below) is NOT a return.",
        "In a match with minutes > 0, hasReturn = true if at least one of these fires:",
      ],
      bullets: [
        "Goal (goals_scored > 0) or assist (assists > 0).",
        "Clean sheet: clean_sheets > 0, minutes ≥ 60, and position GK / DEF / MID (element_type 1–3).",
        "+2 pts DC threshold: DEF → CBI+TKL ≥ 10; MID/FWD → CBI+TKL+REC ≥ 12 (or dcPts ≥ 2 from the match ledger). NEVER use raw defensive_contributions_total > 0!",
        "Goalkeeper: saves ≥ 3 or penalties_saved > 0.",
        "Bonus BPS: bonus ≥ 1.",
      ],
    },
    {
      heading: "Streaks, consistency and match dots",
      paragraphs: [
        "maxReturnStreak = longest run of consecutive appearances with hasReturn. currentReturnStreak = run counted backwards from the latest played match. returnConsistencyPct = round((return matches / matches with minutes>0) × 100).",
        "So 7 returns in 9 matches = 78% consistency — and max streak cannot magically be 9 GW. Tile dots = last up to 10 appearances (colored = return, grey = miss).",
      ],
      bullets: [
        "Appearance (1+ min) vs 60+ min in Breakdown: split so you see the minutes floor vs true scoring actions.",
        "Explosive: rare hauls, low consistency, short current streak. Consistent: live return streak + high Consistency % + weekly DC/CS.",
      ],
    },
    {
      heading: "Points breakdown — what to check",
      paragraphs: [
        "Start with positive segments: are hauls driven by goals/assists, clean sheets, or DC (+2)?",
        "Enable “Penalties / Deductions”: cards and goals conceded can wipe half of gross — especially for DEF with high GC.",
        "Compare Gross → Penalties → Net with official FPL totals (match history = exact; snapshot-only = estimate).",
      ],
    },
    {
      heading: "Stats Centre → Watchlist → Studio",
      paragraphs: [
        "In Stats Centre you sort/filter the full table (Overview / Goal Threat / Defending tabs, etc.). The ★ star adds a player to the Watchlist.",
        "“Compare in Studio” opens Chart Studio in manual mode with those IDs — ideal for Radar / Scatter / Streaks on your shortlist.",
      ],
    },
  ],
};

function buildGlossaryTab(lang: StatsLabLang): KnowledgeTabContent {
  const isPl = lang === "pl";
  return {
    id: "STATS_GLOSSARY",
    label: isPl ? "Słownik A–Z" : "Glossary A–Z",
    intro: isPl
      ? "Wszystkie metryki Studia ze słownika FPL_STAT_DEFINITIONS — skrót, nazwa, kategoria i praktyczny opis. Użyj wyszukiwarki powyżej."
      : "Every Studio metric from FPL_STAT_DEFINITIONS — short label, name, category and a practical description. Use the search box above.",
    blocks: FPL_STAT_DEFINITIONS.map((d: FplStatDefinition) => {
      const cat = isPl
        ? FPL_STAT_CATEGORY_LABELS_PL[d.category]
        : FPL_STAT_CATEGORY_LABELS_EN[d.category];
      const short = isPl ? d.shortLabelPl : d.shortLabelEn;
      const label = isPl ? d.labelPl : d.labelEn;
      const desc = isPl ? d.descriptionPl : d.descriptionEn;
      const invert = d.invertScale
        ? isPl
          ? "Niższa wartość jest lepsza."
          : "Lower is better."
        : isPl
          ? "Wyższa wartość jest lepsza."
          : "Higher is better.";
      const computed = d.computed
        ? isPl
          ? "Metryka wyliczana (nie surowa kolumna API)."
          : "Computed metric (not a raw API column)."
        : null;
      return {
        heading: `${short} — ${label}`,
        paragraphs: [
          `${isPl ? "Kategoria" : "Category"}: ${cat}. ${invert}${
            computed ? ` ${computed}` : ""
          }`,
          desc,
          isPl
            ? `EN: ${d.shortLabelEn} — ${d.labelEn}`
            : `PL: ${d.shortLabelPl} — ${d.labelPl}`,
        ],
      };
    }),
  };
}

export const KNOWLEDGE_BASE: Record<StatsLabLang, KnowledgePack> = {
  pl: {
    title: "Baza Wiedzy i Zasady FPL",
    searchPlaceholder: "Szukaj: DC, xGI, OCENA, BPS…",
    closeLabel: "Zamknij",
    noResults: "Brak wyników dla tego hasła.",
    tabs: [
      HOW_TO_USE_PL,
      POSITION_GUIDE_PL,
      SCORING_AND_DC_PL,
      buildGlossaryTab("pl"),
      STREAKS_PL,
    ],
  },
  en: {
    title: "Knowledge Base & FPL Rules",
    searchPlaceholder: "Search: DC, xGI, RATING, BPS…",
    closeLabel: "Close",
    noResults: "No results for this query.",
    tabs: [
      HOW_TO_USE_EN,
      POSITION_GUIDE_EN,
      SCORING_AND_DC_EN,
      buildGlossaryTab("en"),
      STREAKS_EN,
    ],
  },
};

export const KNOWLEDGE_TAB_ORDER: KnowledgeTabId[] = [
  "HOW_TO_USE",
  "POSITION_GUIDE",
  "SCORING_AND_DC",
  "STATS_GLOSSARY",
  "STREAKS_AND_BREAKDOWN",
];

/** Mapowanie przycisków pomocy (?) → startowa zakładka. */
export type KnowledgeHelpAnchor =
  | "scale"
  | "per90"
  | "dc"
  | "general";

export function tabForHelpAnchor(anchor: KnowledgeHelpAnchor): KnowledgeTabId {
  switch (anchor) {
    case "scale":
    case "per90":
      return "HOW_TO_USE";
    case "dc":
      return "SCORING_AND_DC";
    default:
      return "HOW_TO_USE";
  }
}

export function getKnowledgeTab(
  lang: StatsLabLang,
  id: KnowledgeTabId,
): KnowledgeTabContent {
  const pack = KNOWLEDGE_BASE[lang];
  return pack.tabs.find((t) => t.id === id) ?? pack.tabs[0];
}

export function filterKnowledgeBlocks(
  tab: KnowledgeTabContent,
  query: string,
): KnowledgeBlock[] {
  const q = query.trim().toLowerCase();
  if (!q) return tab.blocks;
  return tab.blocks.filter((b) => {
    const hay = [
      b.heading,
      ...b.paragraphs,
      ...(b.bullets ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
