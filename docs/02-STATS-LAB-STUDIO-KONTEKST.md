# Stats Lab Studio — kontekst funkcjonalny

Dokument ogólny: **czym jest Stats Lab**, jak działa **Studio** (pracownia wykresów) i jakimi pojęciami operuje. Nie jest to pełna specyfikacja każdego wykresu — szczegóły w docs/03–07. **Chart Studio: zamrożone 6/6** — Radar, Points, Stacked, Streaks, Scatter, Heatmap. **Stats Centre: zamrożony** (docs/07) — Players 8/8, Per GW, Teams 4/4.

---

## 1. Po co istnieje Stats Lab?

**Stats Lab** to wewnętrzne laboratorium analityczne oparte na zsynchronizowanych danych oficjalnego FPL (`fpl_lab_*` w Supabase). Służy:

1. **Scoutingowi** — kto jest najlepszy w wybranej puli (pozycja, kluby, minuty, cena, ownership).
2. **Porównaniom wielowymiarowym** — nie tylko „ile punktów FPL”, ale profil (xG, BPS, DC, asysty…).
3. **Produkcji contentu** — plakaty PNG, copy na Discord/X, raport audytowy JSON.

Dostęp: panel admina → **`/admin/stats-lab`**.

W module są **dwie zakładki / ścieżki**:

| Ścieżka | Rola |
|---------|------|
| **Studio** | Interaktywne wykresy + eksport plakatów |
| **Stats Centre** | Tabele w stylu „FFS” (osobny silnik `statsCentreEngine`) |
| **Sync** | ETL z API FPL do lokalnych tabel |

Deep-link ze Stats Centre: `?selected=<id,id,…>` otwiera Studio w trybie **ręcznego wyboru** zawodników.

**Wymóg spójności liczb:** Studio (`analyticsEngine`) i Stats Centre (`statsCentreEngine`) stosują **tę samą matematykę** dla filtrów okresu i Per 90 — użytkownik przełączający zakładki widzi identyczne GWP / PPM / Form / V(S) / V(F) / DC / transfery.

---

## 2. Studio — czym jest w praktyce

**Stats Lab Studio** to workbench:

```
Filtr + wybór zawodników
        ↓
Zapytanie serwerowe (Server Action)
        ↓
Silnik analyticsEngine → porównanie / percentyle / composite
        ↓
Canvas wykresu (jeden z 6 trybów wizualizacji)
        ↓
Eksport PNG / copy / Discord / audit JSON
```

Główny klient: `components/admin/stats-lab/StatsLabStudioClient.tsx`  
Silnik: `lib/stats-lab/analyticsEngine.ts`  
Płótno: `components/admin/stats-lab/StatsLabChartCanvas.tsx`

---

## 3. Sześć trybów wizualizacji (viz modes)

| ID | Nazwa UI (skrót) | Status | Do czego służy |
|----|------------------|--------|----------------|
| `STACKED_COMPOSITE` | Profil wielowymiarowy | **Zamrożony** (docs/04) | Paski / segmenty wielu metryk + **OCENA (0–100)** (`compositeScore`) |
| `POINTS_BREAKDOWN` | Dekompozycja punktów | **Zamrożony** (docs/04) | Skąd biorą się punkty FPL (gole, CS, DC, bonus, kary…) |
| `STREAKS_EXPLORER` | Serie / regularność | **Zamrożony** (docs/04) | Serie returnów, CS, timeline HIT/MISS/DNP |
| `RADAR_PIZZA` | Radar / Pizza | **Zamrożony / ukończony** (docs/03) | Kształt profilu 1–4 graczy na tych samych osiach |
| `SCATTER_2D` | Scatter 2D | **Zamrożony / ukończony** (docs/05) | Korelacja X vs Y, RAW/PERCENTILE, ćwiartki vs średnia grupy |
| `HEATMAP_MATRIX` | Heatmapa | **Zamrożony / ukończony** (docs/06) | Macierz gracze × metryki, RAW/PERCENTILE, ★ liderzy, Ø średnia grupy |

Użytkownik przełącza tryb zakładkami u góry Studio. **Ten sam filtr i ta sama wynikowa lista graczy** karmią różne wykresy — zmienia się tylko sposób rysowania.

---

## 4. Kluczowe pojęcia (słownik Studio)

### 4.1. Filtr (`StatsLabQueryFilter`)

Zestaw parametrów zapytania: sezon, okres (pełny sezon / last 4/6 GW / custom / home-away), pozycje, kluby, `minMinutes`, opcjonalnie max cena / ownership, `per90`, lista `activeMetrics` (2–8), sortowanie, Top N, ręcznie wybrane ID.

### 4.2. Pula odniesienia (`comparisonPool`)

Wszyscy zawodnicy spełniający filtry bazowe **oraz** próg **`minMinutes`**.  
Na tle tej puli liczone są:

- **percentyle** każdej statystyki (0–100),
- **średnie puli** (`poolAverages`),
- rozmiar puli (`poolSize`).

W trybie ręcznego wyboru nadal używamy tej puli jako **benchmarku** — nawet jeśli na wykresie widać tylko 3–8 wybranych nazwisk.

### 4.3. Totals vs Per 90

- **Totals** — sumy / wartości w wybranym okresie.
- **Per 90** — dla metryk z flagą `supportsPer90`: `(wartość / minuty) × 90`, zaokrąglenie do **2 dp**.

**DC Per 90 (obowiązkowe):** `dc_bonus_points` (`DC Pkt`) oraz `dc_bonus_matches` (`DC Mecz`) mają `supportsPer90: true` w `FPL_STAT_DEFINITIONS` — w trybie Per 90 są uczciwie przeliczane na 90 minut (np. `1.00`), w Totals pozostają liczbami całkowitymi (`4`, `2`).

**Zaokrąglanie `poolAverages` w Per 90** (`roundPoolAverage` w `analyticsEngine`): dla metryk z `supportsPer90` — wartości `|mean| < 10` → **2 dp**, `|mean| ≥ 10` → **1 dp**. Metryki zawsze-1-dp (`points_per_game`, `form`, `value_season`, `value_form`) nigdy nie dostają wzoru Per 90.

Wykresy w trybie RAW skalują **`displayValues`** (już po Per 90), nie surowe sumy sezonowe.

### 4.4. Percentyle (tło grupy 0–100)

Dla gracza *i* metryki *k* (matematyka silnika; UI: **Tło grupy (0–100)**):

- lider puli → **P100**,
- metryki „tylko dodatnie” z wartością ≤ 0 → **P0** (bez fałszywego „P15 za zera”),
- skale odwrócone (`invertScale`) — niższa wartość jest lepsza,
- **zerowa wariancja** w `comparisonPool` (`poolMin === poolMax`, `n > 1`): percentyl **0** (dodatnia cecha z max 0) albo **50** (invert / signed) — **bez sztucznych 100** za OG=0 czy PR/PF=0.

### 4.5. OCENA (0–100) / RATING — pole techniczne `compositeScore`

| Warstwa | Nazwa |
|---------|--------|
| **UI / plakat PNG** | **PL:** `OCENA (0–100)` · mikro: `z wybranych cech` · **EN:** `RATING (0–100)` · mikro: `selected stats` |
| **TypeScript / `audit.json`** | Pole techniczne **`compositeScore`** (bez zmiany nazwy w kodzie) |

**Definicja:** średnia arytmetyczna percentyli **wyłącznie z zaznaczonych `activeMetrics`**, które **różnicują** grupę (`poolMin !== poolMax`).  
Cechy flat (np. wszyscy `own_goals === 0`) **nie wchodzą** do średniej. Gdy wszystkie aktywne metryki są flat → **`50`**.

Sort w panelu: **„Sortuj po OCENIE (0–100)”** / **„Sort by RATING (0–100)”** (flaga nadal `sortByComposite`).

### 4.6. Priorytet sortowania (krytyczne)

Domyślnie w UI: **`sortByComposite = false`** (`StatsLabStudioClient` → `DEFAULT_UI`).

| Flaga | Zachowanie silnika (`buildStatsLabComparison`) |
|-------|-----------------------------------------------|
| `sortByComposite === false` | Kolejność = **`filter.sortByStat`** (+ kierunek). `compositeScore` (OCENA) jest **wyłącznie tie-breakerem**. |
| `sortByComposite === true` | Sort **całej** `comparisonPool` po OCENIE **przed** wycięciem Top N. |

Zmiana `sortByStat` w panelu automatycznie wyłącza sort po OCENIE (`sortByComposite → false`). Preset też wraca z flagą OFF. Zmiana `vizMode` / okresu / pozycji / `per90` **nigdy** nie włącza sortu po OCENIE po cichu.

### 4.7. Skala wykresu (`scaleMode`) — etykiety UI (styl FIFA / FPL)

| Wartość w kodzie | Etykieta UI PL | Etykieta UI EN | Znaczenie |
|------------------|----------------|----------------|-----------|
| `PERCENTILE` | **Tło grupy (0–100)** | **Group rank (0–100)** | Osie / segmenty w przestrzeni 0–100 (porównywalne między jednostkami) |
| `RAW` | **Wartości statystyk** | **Actual stats** | Rzeczywiste `displayValues`, każda metryka ma własną skalę |

`scaleMode` **nie zmienia** zapytania SQL — tylko sposób rysowania wyniku.

### 4.8. Wybór zawodników

| Tryb | Zachowanie |
|------|------------|
| **AUTO (Top N)** | Sort całej kwalifikowanej puli → wycięcie Top `limitPlayers` |
| **MANUAL** | Tylko `selectedPlayerIds`; percentyle i tak względem `comparisonPool` |

### 4.9. Motywy wykresu

`ARENA_DARK`, `SCOUT_DARK`, `ANALYST_LIGHT` — kolory tła, siatki, tekstu, akcentów (export social).

### 4.10. Presety

Gotowe „sceny” (`GK_WALL`, `DEF_COMPLETE`, `MID_CREATORS_THREAT`, `FWD_SNIPERS`, `VALUE_GEMS`): ustawiają pozycję, metryki, sort, minuty, Top N jednym kliknięciem. Szczegóły list metryk → [`04-DEKOMPOZYCJA-I-PROFIL-WIELOWYMIAROWY.md`](./04-DEKOMPOZYCJA-I-PROFIL-WIELOWYMIAROWY.md).

---

## 5. Dynamiczne metryki zależne od okresu (oba silniki)

Gdy `period.mode !== 'FULL_SEASON'` (Studio) lub `rangeMode !== 'ALL_MATCHES'` (Centre) — **nie wolno** brać GWP/PPM/Form/Value/transferów GW ze snapshotu sezonowego `fpl_lab_players`. Wyliczenia z odfiltrowanej historii `fpl_lab_player_gw_history` (`playerGwRows`):

| Klucz | UI | Reguła w okresie filtrowanym |
|-------|----|------------------------------|
| `event_points` | **GWP** | Suma `total_points` z **ostatniej kolejki (`maxGw`)** obecnej w filtrze (np. ostatni mecz wyjazdowy przy `AWAY_ONLY`) |
| `points_per_game` | **PPM** | `Number((periodTotalPoints / appearancesInPeriod).toFixed(1))`, gdzie `appearancesInPeriod` = liczba meczów z `minutes > 0` |
| `value_season` | **V(S)** | `Number((periodTotalPoints / (now_cost/10)).toFixed(1))` |
| `form` | **Form** | Średnia punktów z maks. **4 ostatnich kolejek** w filtrze (unikalne GW) |
| `value_form` | **V(F)** | `form / (now_cost/10)`, 1 dp |
| `transfers_in` / `transfers_out` | TI / TO | Suma po **unikalnych GW** w okresie (bez podwójnego DGW) |
| `transfers_in_event` / `transfers_out_event` / `net_transfers_gw` | TI GW / TO GW / **NT GW** | Wartości z **ostatniej kolejki** okresu (`transfers_in`/`out`/`balance` w historii) |
| `dreamteam_count` | DT | Zostaje ze snapshotu (brak flagi DT per GW w historii) |

Dla `FULL_SEASON` / `ALL_MATCHES`: snapshot FPL (z ewentualnym doprecyzowaniem PPM/V(S) z historii).

Implementacja: `applyPeriodDerivedOverviewMetrics` (+ transfery) w `analyticsEngine.ts`; `derivePeriodOverviewFromHistory` w `statsCentreEngine.ts`.

### 5.1. Kompaktowe formatowanie transferów

Funkcje: `formatStatDisplay` / `formatMetricDisplayValue` w **`chartTheme.ts`** (pigułki wykresów) oraz `formatStatDisplay` w **`analyticsEngine.ts`** (export/audyt). Klucze: `transfers_in`, `transfers_out`, `transfers_in_event`, `transfers_out_event`, `net_transfers_gw`.

- **Ignorują `per90`** (nigdy `.toFixed(2)` z Per 90).
- `net_transfers_gw > 0` → prefix `+`.
- `|v| ≥ 1_000_000` → `±X.XXM`; `|v| ≥ 1_000` → `±X.Xk`; inaczej całkowita (`+473`, `-96`).

Przykłady: `+392.5k`, `+102.4k`, `-9.6k`, `+1.25M`.

---

## 6. Globalny standard nagłówka i stopki plakatu PNG

`StatsLabChartCanvas.tsx` — nad paskiem `www.fpl-arena.com • Powered by St0pa | FPL Arena`:

1. **Pigułki definicji metryk** (`SKRÓT: Krótka nazwa`) — bez `descriptionPl` / `descriptionEn`:
   - `STACKED_COMPOSITE`, `RADAR_PIZZA`, `HEATMAP_MATRIX` → `activeMetrics`,
   - `SCATTER_2D` → `[axisX, axisY]`.
2. **1-zdaniowa instrukcja czytania** dopasowana do `vizMode` (+ `scaleMode` dla Stacked) — język **OCENA / RATING** oraz **Tło grupy / Wartości statystyk**.
3. `POINTS_BREAKDOWN` / `STREAKS_EXPLORER` — własne jednoliniowe podsumowania (`text-[11px]`), bez pigułek słownikowych.

### 6.1. Dwupoziomowy podtytuł (krytyczne)

| Stan | Render w nagłówku |
|------|-------------------|
| `customSubtitle` **pusty** | Sam **`autoSubtitle`** (metryczka danych) |
| `customSubtitle` **podany** | **Góra:** komentarz redakcyjny użytkownika · **Pod spodem** (`text-[11px] font-medium opacity-75 mt-0.5`): pełny **`autoSubtitle`** |

Dzięki temu plakat PNG ma jednocześnie narrację (np. „Chelsea — scenariusz do testów”) **oraz** pełną metryczkę: GW, minuty, Totals/Per 90, skalę, rozmiar grupy.

**`autoSubtitle` (techniczny):**

`Sezon {season} · {periodLabel} · Min. {minMinutes} min · {Totals\|Per 90} · {Tło grupy (0–100)\|Wartości statystyk} · Grupa porównawcza: {poolSize} graczy`  
(EN: `Group rank (0–100)` / `Actual stats` / `Comparison group: N players`)  
(dla Points/Streaks: bez skali grupy — etykieta „Oficjalne punkty FPL”).

---

## 7. Przepływ danych (uproszczony)

```
StatsLabStudioClient
  ├─ state: filter + ui (vizMode, scaleMode, theme, pickMode, sortByComposite=false, …)
  ├─ debounce ~280 ms
  └─ queryStatsLabComparisonAction(filter)
         │
         ▼
   Supabase: fpl_lab_players / clubs / player_gw_history
         │
         ▼
   buildStatsLabComparison()
         │  agregacja okresu (GWP/PPM/Form/Value/TI…) → comparisonPool
         │  → displayValues (+ Per 90 / DC) → percentyle → compositeScore (OCENA;
         │     pomija metryki poolMin===poolMax)
         │  → breakdown / streaks → sort (sortByStat | sortByComposite/OCENA) / Top N
         ▼
   StatsLabComparisonResult
         │
         ▼
   StatsLabChartCanvas → charts/*.tsx
         │  customSubtitle? → autor + autoSubtitle; inaczej sam autoSubtitle
         ▼
   Stopka: pigułki SKRÓT + instrukcja · branding fpl-arena.com
```

---

## 8. Panel sterowania — co użytkownik ustawia

`StatsLabControlPanel.tsx` (panel boczny):

- okres i tryb Totals / Per 90,
- metryki aktywne (2–8),
- AUTO vs MANUAL (+ wyszukiwarka graczy),
- Top N, sort po statystyce lub **OCENIE (0–100)** (`sortByComposite`),
- **Min. minut (grupa porównawcza dla OCENY 0–100)** — także przy ręcznym wyborze,
- cena / ownership / kluby / pozycje,
- spotlight gracza (lista = `plottedPlayers` z wykresu), tytuły custom, przełączniki „pokaż średnią grupy” (`showPoolAverage`, **domyślnie `false`**), wartości na paskach itd.

Górny pasek Studio: język PL/EN, motyw, przełącznik skali **Tło grupy (0–100)** / **Wartości statystyk** (`PERCENTILE` / `RAW`), presetty, zakładki viz, Knowledge Base, pasek eksportu.

Przy wejściu na zakładkę `RADAR_PIZZA` Studio wymusza `showPoolAverage = false` (czysty plakat pojedynku 2–4 graczy).

---

## 9. Eksport i content

- **PNG plakat** (ukryty węzeł eksportu + `html-to-image`),
- copy pod post (Discord / X),
- opcjonalnie webhook Discord,
- **AI audit JSON** (diagnostyka layoutu / śladu danych — używany przy QA wykresów).

---

## 10. Gdzie szukać w kodzie

| Temat | Plik |
|-------|------|
| Klient Studio | `components/admin/stats-lab/StatsLabStudioClient.tsx` |
| Panel | `components/admin/stats-lab/StatsLabControlPanel.tsx` |
| Canvas / stopka PNG | `components/admin/stats-lab/StatsLabChartCanvas.tsx` |
| Silnik wykresów | `lib/stats-lab/analyticsEngine.ts` |
| Silnik tabel | `lib/stats-lab/statsCentreEngine.ts` |
| Format pigułek (k/M) | `components/admin/stats-lab/chartTheme.ts` |
| Presety / filtr | `lib/stats-lab/presets.ts` |
| Katalog metryk | `lib/stats-lab/types.ts` (`FPL_STAT_DEFINITIONS`) |
| i18n | `lib/stats-lab/i18n.ts` |

---

## 11. Dokumenty powiązane

| Dokument | Temat |
|----------|-------|
| [`03-WYKRES-RADAROWY-PIZZA.md`](./03-WYKRES-RADAROWY-PIZZA.md) | **Zamrożony** Radar / Pizza + Quick Slots |
| [`04-DEKOMPOZYCJA-I-PROFIL-WIELOWYMIAROWY.md`](./04-DEKOMPOZYCJA-I-PROFIL-WIELOWYMIAROWY.md) | **Zamrożony (Zero-Regression):** Points Breakdown + Stacked Composite + OCENA / Tło grupy + DC |
| [`05-WYKRES-SCATTER-2D.md`](./05-WYKRES-SCATTER-2D.md) | **Zamrożony (Zero-Regression):** Scatter 2D — Social-First AAA |
| [`06-MACIERZ-HEATMAP.md`](./06-MACIERZ-HEATMAP.md) | **Zamrożony (Zero-Regression):** Macierz Heatmap — Social-First AAA (**Chart Studio 6/6**) |
| [`07-STATS-CENTRE.md`](./07-STATS-CENTRE.md) | **Zamrożony (Zero-Regression):** Stats Centre — Social-First AAA (komplet: Players 8/8, Per GW, Teams 4/4) |
| [`01-APLIKACJA-PRZEGLAD-FUNKCJONALNY.md`](./01-APLIKACJA-PRZEGLAD-FUNKCJONALNY.md) | Przegląd całej aplikacji FPL Arena |
