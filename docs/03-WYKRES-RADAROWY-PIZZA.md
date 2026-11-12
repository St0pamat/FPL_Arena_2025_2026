# Wykres Radarowy (Pizza / Polygon Radar) — **ZAMROŻONY / UKOŃCZONY**

**Status:** zamknięty etap. Nie zmieniać layoutu tarczy, kartotek ani geometrii bez osobnej decyzji produktowej.

| Pole | Wartość |
|------|---------|
| Tryb | `vizMode === "RADAR_PIZZA"` |
| Implementacja | `components/admin/stats-lab/charts/RadarPizzaChart.tsx` |
| Quick slots (poza PNG) | `components/admin/stats-lab/RadarQuickSlotsBar.tsx` |
| Chrome plakatu | `StatsLabChartCanvas.tsx` (wspólna stopka pigułkowa + instrukcja RADAR) |
| Silnik danych | `lib/stats-lab/analyticsEngine.ts` |

Powiązane: [`02-STATS-LAB-STUDIO-KONTEKST.md`](./02-STATS-LAB-STUDIO-KONTEKST.md) · [`04-DEKOMPOZYCJA-I-PROFIL-WIELOWYMIAROWY.md`](./04-DEKOMPOZYCJA-I-PROFIL-WIELOWYMIAROWY.md)

---

## 1. Po co ten wykres?

Pokazuje **kształt profilu** 1–4 zawodników na tych samych 2–8 osiach.

### Zasada prezentacji wartości na osiach (krytyczna)

| Warstwa | Co robi |
|---------|---------|
| **Silnik geometrii** | Percentyle 0–100 (`PERCENTILE` / UI: **Tło grupy (0–100)**) albo lokalna normalizacja `RAW` (UI: **Wartości statystyk**; `axisScoreRaw` + `invertScale` / zakres signed) — mapują **promień** wierzchołków wielokąta i wycinków Pizzy |
| **Pigułki przy osiach** | Zawsze **rzeczywiste** `displayValues` przez `formatStatDisplay` z `chartTheme.ts` — np. `70`, `7.1`, `+392.5k` — **nigdy** kody `P84` w pigułkach |
| **OCENA / RATING** | UI: **`OCENA`** (PL) / **`RATING`** (EN) na boksie kartoteki; w kodzie i `audit.json` pole **`compositeScore`** — średni percentyl aktywnych osi (0–100), z pominięciem cech o zerowej wariancji w puli |

Niezależnie od `scaleMode === 'PERCENTILE' | 'RAW'` etykiety osi pokazują faktyczne statystyki sezonu/okresu (po Per 90, jeśli włączone).

---

## 2. Układ Centralnej Areny (~1120 × 878px)

### Grid kolumn

- **1 gracz:** `lg:grid-cols-[246px_1fr]` — kartoteka tylko po lewej; radar zajmuje resztę (bez prawej kolumny dossier / bez karty tła puli).
- **2–4 graczy:** `lg:grid-cols-[246px_1fr_246px]`.

| Liczba graczy | Lewa 246px | Środek | Prawa 246px |
|---------------|------------|--------|-------------|
| **1** | Kartoteka #1 | Wielki radar | — |
| **2** (duel) | Kartoteka #1 (wyśrodkowana) | Wielki radar | Kartoteka #2 (wyśrodkowana) |
| **3** | #1 góra + #3 dół | Wielki radar | #2 wyśrodkowany |
| **4** | #1 góra + #3 dół | Wielki radar | #2 góra + #4 dół |

**Zakaz:** sztuczna „Karta Tła Puli” / mediany P50 jako piąta karta — usunięta. Średnia ligowa tylko opcjonalną linią przerywaną (`showAvg`).

### Tarcza SVG (środek)

- `viewBox="0 0 610 560"`, `cx = 305`, `cy = 280`, **`maxR = 188`**
- Pierścienie 25 / 50 / 75 / 100% + dyskretne znaczniki `%`
- **Wycinki Pizzy (`Pizza Wedges`):** renderowane dla `pizzaPlayer` (= gracz `effectiveSpotlightId`) **zarówno w `PERCENTILE`, jak i w `RAW`**; promień wycinka osi `m` = `radiusFromAxisScore(valueOnAxis(pizzaPlayer, m), maxR)` (ta sama funkcja co wierzchołek wielokąta)
- Wielokąty graczy (max 4) + opcjonalny **przerywany** wielokąt średniej (`showAvg === true`)
- Pigułki osi: `54×21px`, `fontSize: 12.5`, układ 1 / 2 w rzędzie / siatka **2×2** dla 3–4 graczy; tekst = `formatStatDisplay(key, displayValues[key], per90)` (transfery → `+392.5k`)

### Linia odniesienia (`showAvg`)

- Prop z Studio: `showPoolAverage` → `showAvg`
- **Domyślnie `false`** (`DEFAULT_UI.showPoolAverage = false`); przy wejściu na zakładkę `RADAR_PIZZA` Studio resetuje średnią na `false`
- Gdy `true`: rysuj dashed polygon + pigułka pod tarczą:
  - PL: `--- Linia przerywana: Średni poziom ligowy na tej pozycji ({poolSize} graczy)`
  - EN: `--- Dashed line: League average for this position ({poolSize} players)`
- Użytkownik włącza ręcznie: checkbox **„Pokaż średnią grupy”** w sekcji `03 · Wygląd i Styl`

### Pasek pod tarczą

- `🍕 Pizza: {web_name}` — zawsze gdy jest `pizzaPlayer` (oba tryby skali)
- Pigułka średniej — tylko gdy `showAvg`

---

## 3. Duża Kartoteka Piłkarza (Hero Dossier, max-width 246px)

| Element | Specyfikacja zamrożona |
|---------|------------------------|
| Portret | **`82×82px`** (`w-[82px] h-[82px]`), `rounded-full`, `border-[3px]` w kolorze slotu, `object-cover object-top scale-105` — **bez** herbu na koszulce |
| Herb | Niezależny medalion **`44×44px`** (`w-11 h-11`), `rounded-xl bg-white border-2 p-1.5 shadow-md`, `ml-auto`; `<img className="w-full h-full object-contain">` (**bez** `scale-110` — bez obcinania czubków ARS/MCI) |
| Górny rząd | `#N` + pigułka pozycji (`BR`/`OBR`/`POM`/`NAP`) + herb po prawej |
| Nazwisko | `text-[17px] font-black` |
| Meta | `{club} · £Xm · Y.Y%` gdy `showPlayerMeta`; minuty · starts (`wyj.` / `st.`) |
| Pizza badge | `🍕 Aktywna Pizza` gdy `isPizzaOwner` (oba tryby skali) |
| Boksy dolne | **PKT FPL** lub **PKT / 90** (`formatStatDisplay(total_points)`) + **`OCENA` / `RATING`** (tekst UI; wartość = `compositeScore`, 1 dp) — **bez zmiany geometrii kartoteki** |

Kolory slotów: zielony / niebieski / bursztyn / róż (osobne palety LIGHT/DARK).

---

## 4. Matematyka promieni

```
r = (6 + (axisScore / 100) * 94) / 100 * maxR
```

| Tryb (kod) | Etykieta UI | `axisScore` (`valueOnAxis`) |
|------------|-------------|------------------------------|
| `PERCENTILE` | **Tło grupy (0–100)** / Group rank | `clamp(percentiles[m], 0, 100)` |
| `RAW` + `invertScale` | **Wartości statystyk** / Actual stats | mniej = lepiej → bliżej zewnętrznego kręgu |
| `RAW` signed (np. G−xG) | j.w. | liniowo `[min,max] → [15,100]` **bez** `Math.abs` |
| `RAW` ≥ 0 | j.w. | `val / rawMax * 100` (rawMax uwzględnia też średnią puli gdy `showAvg`) |

Avg (gdy `showAvg`): P50 w PERCENTILE albo `axisScoreRaw(poolAverages[m])` w RAW.

---

## 5. `RadarQuickSlotsBar` (poza `exportRef` / PNG)

Render w `StatsLabStudioClient` **nad** canvasem, tylko gdy `vizMode === "RADAR_PIZZA"` — **nie** wchodzi do eksportu PNG.

- 4 sloty `#1..#4` w siatce `xl:grid-cols-4`
- Każda karta 3-poziomowa: wybór / podmiana gracza z bootstrapu (filtrowanego pozycją), spotlight Pizzy, usuwanie ze slotu
- Przycisk **Resetuj do AUTO Top 4**
- Max 4 ID → tryb MANUAL + `selectedPlayerIds`

---

## 6. Nagłówek i stopka plakatu

Wspólny standard Canvas (docs/02 §6):

- **Dwupoziomowy podtytuł:** gdy użytkownik poda `customSubtitle`, pod nim nadal renderowany jest kompaktowy `autoSubtitle` (GW, min, Totals/Per 90, skala, grupa).
- `autoSubtitle`: `Sezon … · okres · Min. … · Totals|Per 90 · Tło grupy (0–100)|Wartości statystyk · Grupa porównawcza: N graczy`  
  (EN: Group rank / Actual stats / Comparison group)
- Stopka: pigułki `SKRÓT: Nazwa` dla aktywnych osi + instrukcja:

> PL: *Im dalej od środka tarczy, tym lepszy wynik w danej statystyce (w pigułkach podano rzeczywiste liczby). OCENA (0–100) podsumowuje wybrane kryteria na tle grupy.*  
> EN: *Further from the center means a stronger result in that stat (pills show actual numbers). RATING (0–100) summarizes the selected criteria against the group.*

---

## 7. Limit MAX 4 + sort + audyt

| Warstwa | Zachowanie |
|---------|------------|
| Wykres / tytuł TOP X | `players.slice(0, 4)` (`MAX_RADAR_PLAYERS`) |
| Audyt JSON | `displayedEntities` = max 4; pole wyniku ogólnego = **`compositeScore`** (UI: OCENA/RATING) |
| Sort Top N | Domyślnie `sortByStat` na całej puli przed slice; sort po OCENIE tylko przy `sortByComposite === true` lub jako tie-breaker |

---

## 8. Pliki (zamrożone)

| Temat | Plik | Status |
|-------|------|--------|
| Centralna Arena + kartoteki + Pizza | `charts/RadarPizzaChart.tsx` | **ZAMROŻONY** |
| Quick slots | `RadarQuickSlotsBar.tsx` | **ZAMROŻONY** (UX poza PNG) |
| Stopka / podtytuł | `StatsLabChartCanvas.tsx` | Wspólny standard (nie łamać RADAR) |
| Dane / okres / transfery k | `analyticsEngine.ts` + `chartTheme.ts` | Globalne |

**Również zamrożone (zero-regression):** `PointsBreakdownChart`, `StreaksExplorerChart`, `StackedCompositeChart` (docs/04 — Etap A/B ukończony). W `RadarPizzaChart.tsx` dozwolona jest wyłącznie podmiana etykiety tekstowej `COMPOSITE` → `OCENA`/`RATING` — **bez** zmian geometrii.
