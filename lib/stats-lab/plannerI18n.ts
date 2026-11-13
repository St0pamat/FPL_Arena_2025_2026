/**
 * FPL Planner — kanoniczny słownik PL / EN (krok 02).
 * nav.* / common.* żyją wyłącznie w i18n.ts.
 */

import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import type { PlannerValueSource } from "@/lib/stats-lab/fplEntryApi";
import type { PlannerValidationErrorKey } from "@/lib/stats-lab/plannerEngine";

export type PlannerTileMetric =
  | "FIXTURES"
  | "XPTS"
  | "PRICES"
  | "FORM"
  | "DC";

export type PlannerDraftVariant = "A" | "B" | "C";

export type PlannerChipType = "wildcard" | "freehit" | "bboost" | "3xc";

/** Oficjalne angielskie nazwy chipów (PL i EN) — ostrzeżenia i komunikaty. */
export const PLANNER_CHIP_OFFICIAL_NAMES: Record<PlannerChipType, string> = {
  wildcard: "Wildcard",
  freehit: "Free Hit",
  bboost: "Bench Boost",
  "3xc": "Triple Captain",
};

/** Pełna nazwa chipa; nieznane id z FPL → surowy string (bez „undefined”). */
export function plannerChipOfficialName(chip: string): string {
  if (
    Object.prototype.hasOwnProperty.call(PLANNER_CHIP_OFFICIAL_NAMES, chip)
  ) {
    return PLANNER_CHIP_OFFICIAL_NAMES[chip as PlannerChipType];
  }
  return String(chip || "");
}

/** Skróty WC/FH/BB/TC — tylko tabela A/B/C i pigułki; nieznane → surowe id. */
export function plannerChipShort(chip: string): string {
  if (chip === "wildcard") return "WC";
  if (chip === "freehit") return "FH";
  if (chip === "bboost") return "BB";
  if (chip === "3xc") return "TC";
  return String(chip || "");
}

export const PLANNER_LABELS = {
  pl: {
    "planner.brand.title": "FPL Arena • Planer",
    "planner.price.purchase": "Cena zakupu (PP)",
    "planner.price.purchase.short": "Zakup (PP)",
    "planner.price.current": "Cena teraz (CP)",
    "planner.price.current.short": "Teraz (CP)",
    "planner.price.selling": "Cena sprzedaży (SP)",
    "planner.price.selling.short": "Sprzedaż (SP)",
    "planner.price.teamValueNow": "Wartość drużyny teraz",
    "planner.price.teamSellingValue": "Wartość przy sprzedaży",
    "planner.price.spendingPower": "Do wydania",
    "planner.price.spendingPower.long":
      "Do wydania (gdy sprzedasz wszystkich)",
    "planner.price.dropColumn": "Wpływ spadku o £0.1m",
    "planner.price.dropAffects": "Spadek obniży cenę sprzedaży",
    "planner.price.dropSafe": "Spadek nie zmieni ceny sprzedaży",
    "planner.kpi.bank": "W banku",
    "planner.kpi.spendingPower": "Do wydania",
    "planner.xpts.label": "Prognozowane punkty (xPts)",
    "planner.kpi.xpts": "Prognoza",
    "planner.xpts.nextGw": "Ta kolejka (GW{gw})",
    "planner.xpts.horizonSum": "Suma xPts (GW{from}–GW{to})",
    "planner.xpts.modal": "Prognoza na GW{gw}: {value} pkt",
    "planner.xpts.howto": "Jak liczymy prognozę",
    "planner.minutes": "Przewidywane minuty",
    "planner.minutes.certain":
      "Prawie na pewno zagra cały mecz (~{min} min)",
    "planner.minutes.likely": "Raczej zagra 60+ min",
    "planner.minutes.uncertain": "Niepewny występ ({p60}% na 60+ min)",
    "planner.defcon": "Wkład defensywny (DefCon)",
    "planner.fdr": "FDR",
    "planner.metric.fixtures3": "Terminarz (3 GW)",
    "planner.metric.formOwn": "Forma i posiadanie",
    "planner.metric.select": "Metryka kafelka",
    "planner.kpi.transfers": "Transfery",
    "planner.kpi.cost": "Koszt",
    "planner.ft": "Darmowe transfery (FT)",
    "planner.ft.nextGw": "FT na tę kolejkę (GW{gw})",
    "planner.ft.endOfPlan": "FT na koniec planu",
    "planner.hit.cost": "koszt −4 pkt (hit)",
    "planner.hit.thisTransfer": "Ten transfer kosztuje −4 pkt (hit)",
    "planner.hit.bar": "Transfery: {used} ({ft}, −{cost} pkt)",
    "planner.hit.barNoHit": "Transfery: {used} ({ft})",
    "planner.hit.barUnlimited": "Transfery: {used} ({chip}, bez kosztu)",
    "planner.hit.ftOne": "{n} darmowy",
    "planner.hit.ftFew": "{n} darmowe",
    "planner.hit.ftMany": "{n} darmowych",
    "planner.hit.ftPhrase": "{n} free",
    "planner.hit.netto": "Netto",
    "planner.hit.brutto": "brutto {value}",
    "chip.wildcard": "Wildcard",
    "chip.freehit": "Free Hit",
    "chip.triplecaptain": "Triple Captain",
    "chip.benchboost": "Bench Boost",
    "chip.usedIn": "Użyty w GW{gw}",
    "chip.available": "Dostępny",
    "planner.fixture.bgw.gameweek": "Pusta kolejka (BGW)",
    "planner.fixture.bgw.player": "Bez meczu",
    "planner.fixture.dgw": "Podwójna kolejka (DGW)",
    "planner.fixture.home": "(D)",
    "planner.fixture.away": "(W)",
    "planner.fixture.unknown": "Brak danych",
    "planner.fixture.venueTip": "D = u siebie, W = na wyjeździe",
    "planner.captain.noFixture": "Kapitan nie gra w tej kolejce",
    "planner.vice.noFixture": "Wicekapitan nie gra w tej kolejce",
    "planner.fh.rollback":
      "Po Free Hicie w GW{gw} skład wraca do stanu sprzed tej kolejki.",
    "planner.chip.alreadyUsedHalf":
      "{chip} został już użyty w tej połowie sezonu.",
    "planner.chip.alreadyPlanned": "{chip} jest już zaplanowany w GW{gw}.",
    "planner.chip.fhConsecutive":
      "Free Hit nie może być użyty w dwóch kolejkach z rzędu.",
    "planner.club.preExisting43":
      "Masz już {n} zawodników z {name}. Najpierw sprzedaj jednego z nich.",
    "planner.role.captain": "Kapitan",
    "planner.role.vice": "Wicekapitan",
    "planner.role.badgeC": "C",
    "planner.role.badgeVC": "VC",
    "planner.role.badgeTC": "TC",
    "planner.role.badgeTC.aria": "Kapitan, Triple Captain",
    "planner.captain.missing": "Wybierz kapitana",
    "planner.vice.missing": "Wybierz wicekapitana",
    "planner.bench.gkp": "Bramkarz rezerwowy",
    "planner.bench.outfield": "{n}. rezerwowy",
    "planner.action.sell": "Sprzedaj",
    "planner.action.swap": "Zamień",
    "planner.action.captain": "Ustaw kapitana",
    "planner.action.vice": "Ustaw wicekapitana",
    "planner.action.watch": "Dodaj do obserwowanych",
    "planner.action.unwatch": "Usuń z obserwowanych",
    "planner.action.info": "Informacje",
    "planner.action.editFt": "Popraw liczbę transferów",
    "planner.action.editBank": "Popraw stan konta",
    "planner.action.undo": "Cofnij",
    "planner.action.cancelPick": "Anuluj wybór (przywróć)",
    "planner.action.forSale": "Do wymiany",
    "planner.market.cantAfford": "Nie stać Cię (brakuje £{x}m)",
    "planner.market.alreadyIn": "Już w składzie",
    "planner.market.clubLimit": "Limit 3 z klubu {club}",
    "planner.market.add": "Dodaj: {player}",
    "planner.market.wrongPosition":
      "Możesz wymienić zawodnika tylko na kogoś z tej samej pozycji",
    "planner.watchlist": "Obserwowani",
    "planner.watchlist.count": "Obserwowani ({n})",
    "planner.watchlist.empty":
      "Brak obserwowanych. Kliknij ☆ przy zawodniku, żeby go tu dodać.",
    "planner.market": "Rynek",
    "planner.market.players": "Zawodnicy",
    "planner.market.summary": "Podsumowanie",
    "planner.market.summaryCount": "{n} zmian",
    "planner.loadSquad": "Wczytaj skład",
    "planner.teamId": "ID drużyny FPL",
    "planner.variant.label": "Wariant {id}",
    "planner.variant.menu": "Warianty",
    "planner.variant.copyTo": "Kopiuj do {id}",
    "planner.variant.compare": "Porównaj",
    "planner.compare.identical":
      "Warianty A, B i C są takie same. Skopiuj A do B i zmień transfery, żeby porównać.",
    "planner.compare.sameAs": "Taki sam jak {v}",
    "planner.compare.chips": "Chipy",
    "planner.compare.noChip": "Brak",
    "planner.compare.hits": "Hity",
    "planner.action.optimise": "Ułóż najlepszą jedenastkę",
    "planner.action.more": "Więcej",
    "planner.action.resetGw": "Resetuj GW",
    "planner.action.resetPlan": "Resetuj plan",
    "planner.action.resetPlanConfirm":
      "Na pewno zresetować cały plan? Tej czynności nie da się cofnąć.",
    "planner.export.poster": "Pobierz plakat",
    "planner.export.json": "Eksport danych (dla zespołu)",
    "planner.view.pitchMarket": "Boisko + Rynek",
    "planner.view.poster": "Pełny plakat boiska",
    "planner.view.table": "Tabela wielokolejkowa",
    "planner.gw.transfersOne": "{n} transfer",
    "planner.gw.transfersFew": "{n} transfery",
    "planner.gw.transfersMany": "{n} transferów",
    "planner.gw.transfersTip": "{label} w tej kolejce",
    "planner.gw.prev": "Poprzednia",
    "planner.gw.next": "Następna",
    "planner.horizon.title": "Plan na kolejne kolejki",
    "planner.horizon.tab.fixturesPts": "Terminarz i punkty",
    "planner.horizon.tab.ptsOnly": "Tylko punkty",
    "planner.horizon.tab.minutes": "Minuty",
    "planner.horizon.tab.prices": "Ceny zakupu / teraz / sprzedaży",
    "planner.horizon.matches": "Mecze",
    "planner.source.api": "Z danych FPL",
    "planner.source.derived": "Wyliczone z Twojej historii",
    "planner.source.manual": "Ręcznie",
    "planner.state.ftMismatch":
      "Nie jesteśmy pewni liczby darmowych transferów — pokazujemy wartość wyliczoną z Twoich minusów za wymiany. Możesz ją poprawić.",
    "planner.state.preseason":
      "Sezon jeszcze się nie zaczął — skład pojawi się po pierwszym terminie transferów.",
    "planner.state.priceApprox":
      "Cena zakupu jest przybliżona (±0.1), bo drużyna powstała w trakcie sezonu albo nie mamy pełnej historii.",
    "planner.state.minutesPrior":
      "Mało danych o minutach — prognoza jest ostrożna, aż zagra dwa mecze.",
    "planner.rule.r1.formation":
      "Ta zamiana psuje ustawienie. W jedenastce musisz mieć min. 3 obrońców, 2 pomocników i 1 napastnika.",
    "planner.rule.r1.gkSwap":
      "Bramkarza możesz zamienić tylko z drugim bramkarzem.",
    "planner.rule.r2.samePosition":
      "Możesz wymienić zawodnika tylko na kogoś z tej samej pozycji.",
    "planner.rule.r3.overLimit":
      "Masz {n} zawodników z {club}. W FPL można mieć najwyżej 3.",
    "planner.rule.r3.sellFirst":
      "Żeby zrobić inny transfer, najpierw sprzedaj kogoś z {club}. Możesz też pominąć kolejkę i zachować transfer.",
    "planner.rule.r4.negativeBank":
      "Brak środków w banku na zatwierdzenie tej kolejki.",
    "planner.rule.r5.conflict":
      "Ten transfer już nie pasuje — zawodnika nie ma w składzie po zmianach we wcześniejszej kolejce.",
    "planner.rule.r7r8.ftAfterChip":
      "Po Wildcardzie / Free Hicie zachowujesz swoje darmowe transfery (bez dorzucenia kolejnego).",
    "planner.rule.r8.freehitReturn":
      "Free Hit działa tylko w tej kolejce. Od następnej wraca Twój poprzedni skład.",
    "planner.rule.r9.cancelWildcard":
      "Wyłączenie Wildcarda naliczy minusy za te transfery (np. −20 pkt przy 1 darmowym). Na pewno?",
    "planner.rule.r10.usedInHalf":
      "Tego chipa już użyłeś w tej połowie sezonu.",
    "planner.rule.r10.onePerGw":
      "W jednej kolejce można zagrać tylko jeden chip.",
    "planner.rule.r10.noCarryOver":
      "Niewykorzystane chipy z pierwszej połowy sezonu przepadają.",
    "planner.rule.r11.captainOnBench":
      "Kapitan musi być w jedenastce — wybierz nowego.",
    "planner.rule.r11.sameMatch":
      "Kapitan i wice grają w tym samym meczu — gdy padnie, możesz stracić obie opaski.",
    "planner.rule.r12.leftLeague":
      "{name} odszedł z Premier League. Możesz go sprzedać za £{sp}m, ale nie kupisz go ponownie.",
    "planner.rule.r12.teamNotFound":
      "Nie znaleźliśmy drużyny o tym numerze. Sprawdź ID i spróbuj jeszcze raz.",
    "planner.rule.r12.todayPrices":
      "Ceny w przyszłych kolejkach są dzisiejsze — nie zgadujemy wzrostów i spadków.",
    "planner.rule.r12.fixturesChanged":
      "Terminarz się zmienił — przeliczyliśmy kolejki {list}.",
    "planner.poster.brand": "Planer FPL",
    "planner.poster.teamValue": "Wartość drużyny",
    "planner.poster.footer":
      "fpl-arena.com · Dane: FPL · Predykcje: FPL Arena",
    "planner.poster.verified": "Dane z FPL · prognozy FPL Arena",
    "planner.entry.freeHitRollback":
      "Free Hit w GW{gw}: skład i bank przywrócone ze stanu GW{prev}.",
    "planner.entry.priceApprox": "Cena sprzedaży (SP) przybliżona",
    "planner.entry.squadSize":
      "Oczekiwano 15 zawodników w składzie, otrzymano {n}.",
    "planner.entry.clubLimit":
      "Stan zastany narusza limit 3 graczy/klub: {list}.",
    "planner.entry.valueDelta":
      "Wartość składu różni się od FPL o {value}",
    "planner.validation.title": "Zgodność z zasadami FPL",
    "planner.draft.variant": "Wariant",
    "planner.pitch.emptySlot": "Wolne miejsce",
    "planner.pitch.benchBoostActive":
      "Bench Boost aktywny: punkty ławki też się liczą",
    "planner.pitch.pickFromList": "Wybierz z listy",
    "planner.fixture.none": "Bez meczu",
    "planner.horizon.subtitle": "15 zawodników × najbliższe kolejki",
    "planner.horizon.startingXi": "Wyjściowa XI",
    "planner.horizon.bench": "Ławka",
    "planner.horizon.lockedProfit": "Zysk przy sprzedaży",
    "planner.horizon.priceSource": "Źródło",
    "planner.market.search": "Szukaj zawodnika / klubu…",
    "planner.market.filter.all": "Wszyscy",
    "planner.market.filter.allClubs": "Wszystkie kluby",
    "planner.market.sort.xptsGw": "xPts (GW{gw})",
    "planner.market.sort.xpts3gw": "Suma xPts (3 GW)",
    "planner.market.sort.xpts3gw.col": "3 GW",
    "planner.market.sort.totalPoints": "Punkty ogółem",
    "planner.market.sort.price": "Cena",
    "planner.market.sort.tsb": "TSB%",
    "planner.market.sort.form": "Forma",
    "planner.market.sort.dc": "Punkty za obronę (DC)",
    "planner.market.onlyInBudget": "Tylko w moim budżecie",
    "planner.market.maxTsb": "TSB ≤ {n}%",
    "planner.market.maxTsbAll": "Dowolne TSB",
    "planner.market.maxPrice": "≤ £{n}m",
    "planner.market.maxPriceAll": "Bez limitu ceny",
    "planner.market.noResults": "Brak zawodników dla tych filtrów.",
  },
  en: {
    "planner.brand.title": "FPL Arena • Planner",
    "planner.price.purchase": "Purchase price (PP)",
    "planner.price.purchase.short": "PP",
    "planner.price.current": "Current price (CP)",
    "planner.price.current.short": "CP",
    "planner.price.selling": "Selling price (SP)",
    "planner.price.selling.short": "SP",
    "planner.price.teamValueNow": "Team value",
    "planner.price.teamSellingValue": "Selling value",
    "planner.price.spendingPower": "Spending power",
    "planner.price.spendingPower.long":
      "Spending power (if you sell everyone)",
    "planner.price.dropColumn": "Effect of a £0.1m fall",
    "planner.price.dropAffects":
      "A price drop will affect your selling value.",
    "planner.price.dropSafe":
      "A price drop will not affect your selling value.",
    "planner.kpi.bank": "Bank",
    "planner.kpi.spendingPower": "Spending power",
    "planner.xpts.label": "Predicted points (xPts)",
    "planner.kpi.xpts": "Prediction",
    "planner.xpts.nextGw": "This gameweek (GW{gw})",
    "planner.xpts.horizonSum": "xPts total (GW{from}–GW{to})",
    "planner.xpts.modal": "GW{gw} prediction: {value} pts",
    "planner.xpts.howto": "How we calculate the forecast",
    "planner.minutes": "Expected minutes",
    "planner.minutes.certain":
      "Expected to play the whole match (about {min} min)",
    "planner.minutes.likely": "Likely to play 60+ minutes",
    "planner.minutes.uncertain":
      "Uncertain start ({p60}% chance of 60+ min)",
    "planner.defcon": "Defensive contribution (DefCon)",
    "planner.fdr": "FDR",
    "planner.metric.fixtures3": "Fixtures (3 GW)",
    "planner.metric.formOwn": "Form and ownership",
    "planner.metric.select": "Tile metric",
    "planner.kpi.transfers": "Transfers",
    "planner.kpi.cost": "Cost",
    "planner.ft": "Free transfers (FT)",
    "planner.ft.nextGw": "FT this gameweek (GW{gw})",
    "planner.ft.endOfPlan": "FT at end of plan",
    "planner.hit.cost": "−4 pts (a hit)",
    "planner.hit.thisTransfer": "This transfer costs −4 points (a hit)",
    "planner.hit.bar": "Transfers: {used} ({ft}, −{cost} pts)",
    "planner.hit.barNoHit": "Transfers: {used} ({ft})",
    "planner.hit.barUnlimited": "Transfers: {used} ({chip}, no cost)",
    "planner.hit.ftOne": "{n} free",
    "planner.hit.ftFew": "{n} free",
    "planner.hit.ftMany": "{n} free",
    "planner.hit.ftPhrase": "{n} free",
    "planner.hit.netto": "Net",
    "planner.hit.brutto": "gross {value}",
    "chip.wildcard": "Wildcard",
    "chip.freehit": "Free Hit",
    "chip.triplecaptain": "Triple Captain",
    "chip.benchboost": "Bench Boost",
    "chip.usedIn": "Used in GW{gw}",
    "chip.available": "Available",
    "planner.fixture.bgw.gameweek": "Blank Gameweek (BGW)",
    "planner.fixture.bgw.player": "No fixture",
    "planner.fixture.dgw": "Double Gameweek (DGW)",
    "planner.fixture.home": "(H)",
    "planner.fixture.away": "(A)",
    "planner.fixture.unknown": "No data",
    "planner.fixture.venueTip": "H = home, A = away",
    "planner.captain.noFixture": "Your captain has no match this gameweek",
    "planner.vice.noFixture":
      "Your vice-captain has no match this gameweek",
    "planner.fh.rollback":
      "After the Free Hit in GW{gw}, your squad goes back to how it was before that gameweek.",
    "planner.chip.alreadyUsedHalf":
      "{chip} has already been used in this half of the season.",
    "planner.chip.alreadyPlanned": "{chip} is already planned for GW{gw}.",
    "planner.chip.fhConsecutive":
      "Free Hit can't be played in two consecutive gameweeks.",
    "planner.club.preExisting43":
      "You already have {n} players from {name}. Sell one of them first.",
    "planner.role.captain": "Captain",
    "planner.role.vice": "Vice-captain",
    "planner.role.badgeC": "C",
    "planner.role.badgeVC": "VC",
    "planner.role.badgeTC": "TC",
    "planner.role.badgeTC.aria": "Captain, Triple Captain",
    "planner.captain.missing": "Pick a captain",
    "planner.vice.missing": "Pick a vice-captain",
    "planner.bench.gkp": "Sub GK",
    "planner.bench.outfield": "Sub {n}",
    "planner.action.sell": "Sell",
    "planner.action.swap": "Swap",
    "planner.action.captain": "Set captain",
    "planner.action.vice": "Set vice-captain",
    "planner.action.watch": "Add to Watchlist",
    "planner.action.unwatch": "Remove from Watchlist",
    "planner.action.info": "Information",
    "planner.action.editFt": "Edit transfer count",
    "planner.action.editBank": "Edit bank",
    "planner.action.undo": "Undo",
    "planner.action.cancelPick": "Cancel selection (restore)",
    "planner.action.forSale": "To be transferred out",
    "planner.market.cantAfford": "Can't afford (short £{x}m)",
    "planner.market.alreadyIn": "Already in squad",
    "planner.market.clubLimit": "Max 3 from {club}",
    "planner.market.add": "Add: {player}",
    "planner.market.wrongPosition":
      "You can only transfer a player for someone in the same position",
    "planner.watchlist": "Watchlist",
    "planner.watchlist.count": "Watchlist ({n})",
    "planner.watchlist.empty":
      "No players on your Watchlist. Tap ☆ on a player to add them.",
    "planner.market": "Transfer market",
    "planner.market.players": "Players",
    "planner.market.summary": "Summary",
    "planner.market.summaryCount": "{n} changes",
    "planner.loadSquad": "Load squad",
    "planner.teamId": "FPL team ID",
    "planner.variant.label": "Variant {id}",
    "planner.variant.menu": "Variants",
    "planner.variant.copyTo": "Copy to {id}",
    "planner.variant.compare": "Compare",
    "planner.compare.identical":
      "Variants A, B and C are the same. Copy A to B and change the transfers to compare.",
    "planner.compare.sameAs": "Same as {v}",
    "planner.compare.chips": "Chips",
    "planner.compare.noChip": "None",
    "planner.compare.hits": "Hits",
    "planner.action.optimise": "Pick best XI",
    "planner.action.more": "More",
    "planner.action.resetGw": "Reset gameweek",
    "planner.action.resetPlan": "Reset plan",
    "planner.action.resetPlanConfirm":
      "Reset the whole plan? This can't be undone.",
    "planner.export.poster": "Download poster",
    "planner.export.json": "Data export (for the team)",
    "planner.view.pitchMarket": "Pitch + market",
    "planner.view.poster": "Full pitch poster",
    "planner.view.table": "Multi-gameweek table",
    "planner.gw.transfersOne": "{n} transfer",
    "planner.gw.transfersFew": "{n} transfers",
    "planner.gw.transfersMany": "{n} transfers",
    "planner.gw.transfersTip": "{label} this gameweek",
    "planner.gw.prev": "Previous",
    "planner.gw.next": "Next",
    "planner.horizon.title": "Multi-gameweek plan",
    "planner.horizon.tab.fixturesPts": "Fixtures and points",
    "planner.horizon.tab.ptsOnly": "Points only",
    "planner.horizon.tab.minutes": "Minutes",
    "planner.horizon.tab.prices": "Purchase / current / selling prices",
    "planner.horizon.matches": "Matches",
    "planner.source.api": "From FPL data",
    "planner.source.derived": "Calculated from your history",
    "planner.source.manual": "Edited",
    "planner.state.ftMismatch":
      "We're not sure about your free transfer count, so we're showing the figure implied by your hit points. You can correct it.",
    "planner.state.preseason":
      "The season hasn't started yet. Your squad will appear after the first deadline.",
    "planner.state.priceApprox":
      "This purchase price is estimated (±0.1), because the team was created mid-season or history is incomplete.",
    "planner.state.minutesPrior":
      "Limited minutes data — this is a cautious estimate until he's played two matches.",
    "planner.rule.r1.formation":
      "That switch isn't allowed. Your XI needs at least 3 defenders, 2 midfielders and 1 forward.",
    "planner.rule.r1.gkSwap":
      "You can only swap a goalkeeper with the other goalkeeper.",
    "planner.rule.r2.samePosition":
      "You can only transfer a player for someone in the same position.",
    "planner.rule.r3.overLimit":
      "You have {n} players from {club}. In FPL you can have at most 3.",
    "planner.rule.r3.sellFirst":
      "To make another transfer, sell a {club} player first. You can also skip this gameweek and keep the free transfer.",
    "planner.rule.r4.negativeBank":
      "Insufficient bank funds for this Gameweek.",
    "planner.rule.r5.conflict":
      "This transfer no longer works — the player isn't in your squad after earlier gameweek changes.",
    "planner.rule.r7r8.ftAfterChip":
      "After a Wildcard / Free Hit you keep your stored free transfers (no extra one is added).",
    "planner.rule.r8.freehitReturn":
      "Free Hit lasts for this gameweek only. Next week your previous squad returns.",
    "planner.rule.r9.cancelWildcard":
      "Turning off Wildcard will apply hit points for these transfers (e.g. −20 with 1 free transfer). Are you sure?",
    "planner.rule.r10.usedInHalf":
      "You've already used this chip in this half of the season.",
    "planner.rule.r10.onePerGw":
      "You can only play one chip per gameweek.",
    "planner.rule.r10.noCarryOver":
      "Unused chips from the first half don't carry over.",
    "planner.rule.r11.captainOnBench":
      "Your captain has to be in the starting XI — pick a new one.",
    "planner.rule.r11.sameMatch":
      "Captain and vice play in the same match — if it's postponed, you could lose both boosts.",
    "planner.rule.r12.leftLeague":
      "{name} has left the Premier League. You can sell him for £{sp}m, but you can't buy him back.",
    "planner.rule.r12.teamNotFound":
      "We couldn't find a team with that ID. Check it and try again.",
    "planner.rule.r12.todayPrices":
      "Future gameweeks use today's prices — we don't forecast rises or falls.",
    "planner.rule.r12.fixturesChanged":
      "The fixture list changed — we recalculated gameweeks {list}.",
    "planner.poster.brand": "FPL Planner",
    "planner.poster.teamValue": "Team value",
    "planner.poster.footer":
      "fpl-arena.com · Data: FPL · Predictions: FPL Arena",
    "planner.poster.verified": "Data from FPL · forecasts by FPL Arena",
    "planner.entry.freeHitRollback":
      "Free Hit in GW{gw}: squad and bank restored from GW{prev}.",
    "planner.entry.priceApprox": "Selling price (SP) estimated",
    "planner.entry.squadSize":
      "Expected 15 players in the squad, received {n}.",
    "planner.entry.clubLimit":
      "Pre-existing state breaks the 3-player club limit: {list}.",
    "planner.entry.valueDelta":
      "Squad value differs from FPL by {value}",
    "planner.validation.title": "FPL rules check",
    "planner.draft.variant": "Draft",
    "planner.pitch.emptySlot": "Empty slot",
    "planner.pitch.benchBoostActive":
      "Bench Boost active: bench points count too",
    "planner.pitch.pickFromList": "Pick from list",
    "planner.fixture.none": "No fixture",
    "planner.horizon.subtitle": "15 players × upcoming gameweeks",
    "planner.horizon.startingXi": "Starting XI",
    "planner.horizon.bench": "Bench",
    "planner.horizon.lockedProfit": "Profit on sale",
    "planner.horizon.priceSource": "Source",
    "planner.market.search": "Search player / club…",
    "planner.market.filter.all": "All",
    "planner.market.filter.allClubs": "All clubs",
    "planner.market.sort.xptsGw": "xPts (GW{gw})",
    "planner.market.sort.xpts3gw": "xPts sum (3 GW)",
    "planner.market.sort.xpts3gw.col": "3 GW",
    "planner.market.sort.totalPoints": "Total points",
    "planner.market.sort.price": "Price",
    "planner.market.sort.tsb": "TSB%",
    "planner.market.sort.form": "Form",
    "planner.market.sort.dc": "Defensive contribution (DC)",
    "planner.market.onlyInBudget": "Only in my budget",
    "planner.market.maxTsb": "TSB ≤ {n}%",
    "planner.market.maxTsbAll": "Any TSB",
    "planner.market.maxPrice": "≤ £{n}m",
    "planner.market.maxPriceAll": "No price limit",
    "planner.market.noResults": "No players match these filters.",
  },
} as const;

export type PlannerLabelKey = keyof (typeof PLANNER_LABELS)["pl"];

export const PLANNER_CHIP_LABEL_KEY = {
  wildcard: "chip.wildcard",
  freehit: "chip.freehit",
  bboost: "chip.benchboost",
  "3xc": "chip.triplecaptain",
} as const satisfies Record<PlannerChipType, PlannerLabelKey>;

/**
 * Alias PlannerValidationErrorKey → planner.rule.* (jedyny dopuszczalny alias).
 * formation* → r1.formation (jeden komunikat zbiorczy z tabeli 02).
 */
export const PLANNER_VALIDATION_ERROR_TO_LABEL = {
  formationErrorMinDef: "planner.rule.r1.formation",
  formationErrorMinMid: "planner.rule.r1.formation",
  formationErrorMinFwd: "planner.rule.r1.formation",
  formationErrorGkOnly: "planner.rule.r1.gkSwap",
  clubLimitExceeded: "planner.rule.r3.overLimit",
  clubLimitPreExistingMustFix: "planner.rule.r3.sellFirst",
  negativeBankError: "planner.rule.r4.negativeBank",
  transferConflictError: "planner.rule.r5.conflict",
} as const satisfies Record<PlannerValidationErrorKey, PlannerLabelKey>;

export const PLANNER_TOOLTIPS = {
  pl: {
    "planner.price.purchase":
      "Za ile kupiłeś tego zawodnika (purchase price, oficjalny skrót FPL: PP).",
    "planner.price.purchase.short": "Cena zakupu (PP)",
    "planner.price.current":
      "Aktualna cena zawodnika (current price, oficjalny skrót FPL: CP).",
    "planner.price.current.short": "Cena teraz (CP)",
    "planner.price.selling":
      "Za ile sprzedasz tego zawodnika (selling price, oficjalny skrót FPL: SP).",
    "planner.price.selling.short": "Cena sprzedaży (SP)",
    "planner.price.teamValueNow":
      "Suma cen teraz (CP) Twojej kadry, bez banku.",
    "planner.price.teamSellingValue":
      "Suma cen sprzedaży (SP) Twojej kadry, bez banku.",
    "planner.price.spendingPower":
      "Ile możesz wydać, gdy sprzedasz wszystkich z kadry: cena sprzedaży (SP) + kwota w banku.",
    "planner.price.dropColumn":
      "Czy spadek ceny teraz o £0.1m obniży Twoją cenę sprzedaży.",
    "planner.kpi.bank":
      "Gotówka, która zostaje po transferach — nie darmowe transfery.",
    "planner.xpts.label":
      "Nasza prognoza punktów. Bez kursów bukmacherskich.",
    "planner.kpi.xpts":
      "Prognozowane punkty (xPts) na najbliższą kolejkę.",
    "planner.xpts.nextGw":
      "Prognozowane punkty (xPts) na najbliższą kolejkę.",
    "planner.xpts.horizonSum":
      "Suma prognozowanych punktów od pierwszej do ostatniej kolejki planu.",
    "planner.defcon":
      "Punkty za akcje defensywne (defensive contribution points). Progi: 10 akcji u obrońcy, 12 u pomocnika i napastnika.",
    "planner.fdr":
      "Trudność meczów 1–5 (1 = bardzo łatwy, 5 = bardzo trudny).",
    "planner.metric.fixtures3": "Następne trzy mecze na kafelku.",
    "planner.metric.select": "Co pokazuje linia na kafelku zawodnika.",
    "planner.kpi.transfers":
      "Ile transferów planujesz w tej kolejce i ile masz darmowych (FT).",
    "planner.kpi.cost":
      "Koszt −4 pkt (hit) za każdy transfer ponad darmowe.",
    "planner.ft":
      "Zaoszczędzone darmowe transfery. To nie jest gotówka z kafelka „W banku”.",
    "planner.ft.nextGw":
      "Ile darmowych transferów masz na najbliższą kolejkę.",
    "planner.ft.endOfPlan":
      "Ile darmowych transferów zostanie po ostatniej kolejce planu.",
    "planner.hit.cost": "Extra transfer ponad darmowe odejmuje 4 punkty.",
    "planner.hit.netto": "Prognoza po odjęciu hitów.",
    "planner.hit.brutto": "Prognoza przed odjęciem hitów.",
    "chip.wildcard":
      "Dzika karta — dowolna liczba transferów bez minusów; skład zostaje.",
    "chip.freehit": "Skład tylko na tę kolejkę, potem wraca poprzedni.",
    "chip.triplecaptain": "Kapitan ×3 w tej kolejce.",
    "chip.benchboost": "Punktuje także ławka.",
    "planner.fixture.bgw.gameweek": "W tej kolejce klub nie ma meczu.",
    "planner.fixture.bgw.player":
      "Zawodnik nie gra w tej kolejce. W sumach liczone jako 0 pkt, w średnich pomijane.",
    "planner.fixture.dgw":
      "Zawodnik gra dwa mecze w tej kolejce. xPts to suma obu.",
    "planner.fixture.home": "Mecz u siebie (home).",
    "planner.fixture.away": "Mecz na wyjeździe (away).",
    "planner.fixture.venueTip": "D = u siebie, W = na wyjeździe",
    "planner.role.badgeC": "Kapitan",
    "planner.role.badgeVC": "Wicekapitan",
    "planner.role.badgeTC": "Kapitan, Triple Captain",
    "planner.captain.missing": "Wybierz kapitana",
    "planner.vice.missing": "Wybierz wicekapitana",
    "planner.bench.gkp": "Bramkarz rezerwowy na ławce.",
    "planner.bench.outfield": "Kolejność wejścia z ławki.",
    "planner.action.sell": "Sprzedaj: {player}",
    "planner.action.swap": "Zamień: {player}",
    "planner.action.captain": "Kapitan: {player}",
    "planner.action.vice": "Wicekapitan: {player}",
    "planner.action.watch": "Obserwuj: {player}",
    "planner.action.unwatch": "Usuń z obserwowanych: {player}",
    "planner.action.info": "Informacje: {player}",
    "planner.action.forSale": "Wybierz zastępstwo z listy.",
    "planner.watchlist":
      "Watchlist — zawodnicy, których śledzisz (nie lista ulubionych).",
    "planner.market": "Rynek transferowy",
    "planner.compare.hits": "Suma kosztów −4 pkt (hit) w planie.",
    "planner.action.optimise":
      "Ustawia najlepszą jedenastkę według prognozowanych punktów (xPts).",
    "planner.export.poster": "Pobierz plakat (.JPG)",
    "planner.gw.transfersTip": "Liczba transferów w tej kolejce.",
    "planner.gw.prev": "Poprzednia kolejka",
    "planner.gw.next": "Następna kolejka",
    "planner.horizon.title": "Widok zawodnik × kolejka.",
    "planner.horizon.tab.minutes": "Przewidywane minuty",
    "planner.horizon.tab.prices":
      "Cena zakupu (PP), cena teraz (CP), cena sprzedaży (SP)",
    "planner.horizon.matches": "Liczba kolejek w zakresie planu.",
    "planner.horizon.lockedProfit":
      "Tyle zyskasz, sprzedając teraz (FPL oddaje połowę wzrostu ceny, zaokrągloną w dół). Gdy cena spadła poniżej ceny zakupu, pokazuje 0 (strata nie jest tu liczona).",
    "planner.validation.title":
      "Sprawdzenie reguł FPL R1–R12 dla bieżącej kolejki planu.",
    "planner.market.sort.tsb":
      "Wybrany przez % menedżerów (TSB)",
    "planner.market.sort.xpts3gw.col":
      "Suma xPts z 3 najbliższych kolejek",
    "planner.source.api": "Z oficjalnych danych FPL.",
    "planner.source.derived":
      "Publiczne API nie podaje ceny sprzedaży, więc liczymy ją z zasad FPL i Twojej historii transferów.",
    "planner.source.manual":
      "Wpisane przez Ciebie. Korekta zostaje po odświeżeniu danych.",
  },
  en: {
    "planner.price.purchase":
      "What you paid for this player (official FPL abbreviation: PP).",
    "planner.price.purchase.short": "Purchase price (PP)",
    "planner.price.current":
      "The player's current price (official FPL abbreviation: CP).",
    "planner.price.current.short": "Current price (CP)",
    "planner.price.selling":
      "What you'll get if you sell this player (official term: selling price; abbreviation: SP).",
    "planner.price.selling.short": "Selling price (SP)",
    "planner.price.teamValueNow":
      "Sum of current prices (CP) for your squad, excluding the bank.",
    "planner.price.teamSellingValue":
      "Sum of selling prices (SP) for your squad, excluding the bank.",
    "planner.price.spendingPower":
      "How much you can spend if you sell your whole squad: selling prices (SP) plus money in the bank.",
    "planner.price.dropColumn":
      "Whether a £0.1m drop in current price will lower your selling price.",
    "planner.kpi.bank":
      "Cash left after transfers — not stored free transfers.",
    "planner.xpts.label": "Our points forecast. Not bookmaker odds.",
    "planner.kpi.xpts":
      "Predicted points (xPts) for the next gameweek.",
    "planner.xpts.nextGw":
      "Predicted points (xPts) for the upcoming gameweek.",
    "planner.xpts.horizonSum":
      "Sum of predicted points from the first to the last gameweek in the plan.",
    "planner.defcon":
      "Points for defensive actions (defensive contribution points). Thresholds: 10 actions for defenders, 12 for midfielders and forwards.",
    "planner.fdr":
      "Fixture difficulty 1–5 (1 = very easy, 5 = very hard).",
    "planner.metric.fixtures3": "Next three fixtures on the player tile.",
    "planner.metric.select": "What the line on the player tile shows.",
    "planner.kpi.transfers":
      "How many transfers you plan this gameweek and how many free transfers (FT) you have.",
    "planner.kpi.cost":
      "−4 pts (a hit) for each transfer beyond your free ones.",
    "planner.ft":
      "Stored free transfers. This is not the cash shown in Bank.",
    "planner.ft.nextGw":
      "How many free transfers you have for the next gameweek.",
    "planner.ft.endOfPlan":
      "How many free transfers you'll have after the last gameweek in the plan.",
    "planner.hit.cost":
      "Each transfer beyond your free ones deducts 4 points.",
    "planner.hit.netto": "Forecast after deducting hits.",
    "planner.hit.brutto": "Forecast before deducting hits.",
    "chip.wildcard": "Unlimited free transfers; the new squad stays.",
    "chip.freehit":
      "Squad for this gameweek only; then your previous squad returns.",
    "chip.triplecaptain": "Captain scores ×3 this gameweek.",
    "chip.benchboost": "Bench also scores.",
    "planner.fixture.bgw.gameweek":
      "This club has no match in this gameweek.",
    "planner.fixture.bgw.player":
      "This player has no match this gameweek. Counts as 0 in totals; excluded from averages.",
    "planner.fixture.dgw":
      "This player has two matches this gameweek. xPts is the sum of both.",
    "planner.fixture.home": "Home fixture.",
    "planner.fixture.away": "Away fixture.",
    "planner.fixture.venueTip": "H = home, A = away",
    "planner.role.badgeC": "Captain",
    "planner.role.badgeVC": "Vice-captain",
    "planner.role.badgeTC": "Captain, Triple Captain",
    "planner.captain.missing": "Pick a captain",
    "planner.vice.missing": "Pick a vice-captain",
    "planner.bench.gkp": "Backup goalkeeper on the bench.",
    "planner.bench.outfield": "Bench order for substitutions.",
    "planner.action.sell": "Sell: {player}",
    "planner.action.swap": "Swap: {player}",
    "planner.action.captain": "Captain: {player}",
    "planner.action.vice": "Vice-captain: {player}",
    "planner.action.watch": "Watch: {player}",
    "planner.action.unwatch": "Remove from Watchlist: {player}",
    "planner.action.info": "Details: {player}",
    "planner.action.forSale": "Pick a replacement from the list.",
    "planner.watchlist":
      "Players you're tracking — not a favourites list.",
    "planner.market": "Transfer market",
    "planner.compare.hits": "Total −4 pt hit costs in the plan.",
    "planner.action.optimise":
      "Picks the best starting XI by predicted points (xPts).",
    "planner.export.poster": "Download poster (.JPG)",
    "planner.gw.transfersTip": "Number of transfers this gameweek.",
    "planner.gw.prev": "Previous gameweek",
    "planner.gw.next": "Next gameweek",
    "planner.horizon.title": "Player × gameweek view.",
    "planner.horizon.tab.minutes": "Expected minutes",
    "planner.horizon.tab.prices":
      "Purchase price (PP), current price (CP), selling price (SP)",
    "planner.horizon.matches": "Number of gameweeks in the plan range.",
    "planner.horizon.lockedProfit":
      "What you gain by selling now (FPL returns half of the price rise, rounded down). Shows 0 if the price fell below what you paid (losses not shown).",
    "planner.validation.title":
      "FPL rules check R1–R12 for the current plan gameweek.",
    "planner.market.sort.tsb":
      "Selected by % of managers (TSB)",
    "planner.market.sort.xpts3gw.col":
      "xPts sum over the next 3 gameweeks",
    "planner.source.api": "From official FPL data.",
    "planner.source.derived":
      "The public API doesn't provide selling price, so we calculate it from FPL rules and your transfer history.",
    "planner.source.manual":
      "Entered by you. Your edit survives a data refresh.",
  },
} as const;

export type PlannerTooltipKey = keyof (typeof PLANNER_TOOLTIPS)["pl"];

/** Klucze ostrzeżeń silnika + entry — silnik/API zwraca klucz, UI tłumaczy. */
export type PlannerWarningKey =
  | "planner.captain.noFixture"
  | "planner.vice.noFixture"
  | "planner.captain.missing"
  | "planner.vice.missing"
  | "planner.fh.rollback"
  | "planner.chip.alreadyUsedHalf"
  | "planner.chip.alreadyPlanned"
  | "planner.chip.fhConsecutive"
  | "planner.club.preExisting43"
  | "planner.entry.freeHitRollback"
  | "planner.entry.priceApprox"
  | "planner.entry.squadSize"
  | "planner.entry.clubLimit"
  | "planner.entry.valueDelta"
  | "planner.state.preseason";

export type PlannerWarning = {
  key: PlannerWarningKey;
  params?: Record<string, string | number>;
};

export function formatPlannerTemplate(
  template: string,
  params: Record<string, string | number> = {},
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      return String(params[key]);
    }
    return match;
  });
}

/** Format £{x.x}m z dziesiątych (tylko wyświetlanie). */
export function formatTenthsAsPounds(tenths: number): string {
  const sign = tenths < 0 ? "-" : "";
  return `${sign}£${(Math.abs(Math.round(tenths)) / 10).toFixed(1)}m`;
}

/** Wartość |tenths|/10 z 1 miejscem — do parametrów bez znaku. */
export function formatTenthsAbsValue(tenths: number): string {
  return (Math.abs(Math.round(tenths)) / 10).toFixed(1);
}

/** Znak +/− i £{x.x}m — do planner.entry.valueDelta. Nigdy „−£0.0m”. */
export function formatSignedTenthsAsPounds(tenths: number): string {
  const rounded = Math.round(tenths);
  const abs = (Math.abs(rounded) / 10).toFixed(1);
  if (rounded > 0) return `+£${abs}m`;
  if (rounded < 0) return `−£${abs}m`;
  return `£${abs}m`;
}

export function pt(
  lang: StatsLabLang,
  key: PlannerLabelKey,
  params: Record<string, string | number> = {},
): string {
  return formatPlannerTemplate(PLANNER_LABELS[lang][key], params);
}

export function ptTip(
  lang: StatsLabLang,
  key: PlannerTooltipKey,
  params: Record<string, string | number> = {},
): string {
  return formatPlannerTemplate(PLANNER_TOOLTIPS[lang][key], params);
}

export function resolvePlannerWarning(
  warning: PlannerWarning,
  lang: StatsLabLang,
): string {
  const raw = { ...(warning.params ?? {}) };
  const chipRaw = raw.chip;
  if (
    typeof chipRaw === "string" &&
    Object.prototype.hasOwnProperty.call(PLANNER_CHIP_OFFICIAL_NAMES, chipRaw)
  ) {
    raw.chip = plannerChipOfficialName(chipRaw as PlannerChipType);
  }
  return pt(lang, warning.key as PlannerLabelKey, raw);
}

export function resolvePlannerValidationError(
  key: PlannerValidationErrorKey,
  lang: StatsLabLang,
  detail?: string,
): string {
  const labelKey = PLANNER_VALIDATION_ERROR_TO_LABEL[key];
  if (key === "clubLimitExceeded" || key === "clubLimitPreExistingMustFix") {
    return pt(lang, labelKey, {
      club: detail ?? "",
      n: detail ? "4" : "",
    });
  }
  return pt(lang, labelKey);
}

export function plannerSourceLabel(
  lang: StatsLabLang,
  source: PlannerValueSource,
): string {
  if (source === "api") return pt(lang, "planner.source.api");
  if (source === "derived") return pt(lang, "planner.source.derived");
  return pt(lang, "planner.source.manual");
}

export function plannerTileMetricLabel(
  lang: StatsLabLang,
  metric: PlannerTileMetric,
): string {
  if (metric === "FIXTURES") return pt(lang, "planner.metric.fixtures3");
  if (metric === "XPTS") return pt(lang, "planner.kpi.xpts");
  if (metric === "PRICES") return pt(lang, "planner.horizon.tab.prices");
  if (metric === "FORM") return pt(lang, "planner.metric.formOwn");
  return pt(lang, "planner.defcon");
}
