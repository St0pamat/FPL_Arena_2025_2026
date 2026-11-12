# Dekompozycja punktów + Profil wielowymiarowy — **ZAMROŻONE (Zero-Regression)**

Dokument dla architekta AI / osoby z zewnątrz: **finalny stan kodu** widoków `POINTS_BREAKDOWN` i `STACKED_COMPOSITE`.  
**Zakaz dalszych zmian UI/logiki tych wykresów** bez osobnej decyzji produktowej. Scatter 2D jest również zamrożony — [`05-WYKRES-SCATTER-2D.md`](./05-WYKRES-SCATTER-2D.md).

| Etap | Zakres | Status |
|------|--------|--------|
| **A** | `PointsBreakdownChart` — legenda dynamiczna + kontrast AAA | **ZAMROŻONY (Zero-Regression)** |
| **B** | `StackedCompositeChart` + OCENA/RATING + presety / DC Per 90 + flat metrics | **ZAMROŻONY (Zero-Regression)** |

Powiązane: [`02-STATS-LAB-STUDIO-KONTEKST.md`](./02-STATS-LAB-STUDIO-KONTEKST.md) · [`03-WYKRES-RADAROWY-PIZZA.md`](./03-WYKRES-RADAROWY-PIZZA.md) · [`05-WYKRES-SCATTER-2D.md`](./05-WYKRES-SCATTER-2D.md)

---

## 0. Mapa plików

| Obszar | Plik | Status |
|--------|------|--------|
| UI Dekompozycja | `components/admin/stats-lab/charts/PointsBreakdownChart.tsx` | **ZAMROŻONY** |
| UI Profil wielowymiarowy | `components/admin/stats-lab/charts/StackedCompositeChart.tsx` | **ZAMROŻONY** |
| Format pigułek (DC Per 90) | `components/admin/stats-lab/chartTheme.ts` | **ZAMROŻONY** (reguła Opta) |
| Wyliczenia breakdown / DC / `formatStatDisplay` | `lib/stats-lab/analyticsEngine.ts` | Wspólny silnik |
| Typy breakdown / progi DC | `lib/stats-lab/types.ts` | — |
| Presety + `defaultActiveMetricsForPositions` + `isSortByStatAlignedWithPositions` | `lib/stats-lab/presets.ts` | **ZAMROŻONY** (kontrakt formacji) |
| Reakcja na zmianę pozycji | `components/admin/stats-lab/StatsLabStudioClient.tsx` → `onFilterChange` | **ZAMROŻONY** |
| Panel filtrów | `components/admin/stats-lab/StatsLabControlPanel.tsx` | — |
| Canvas / stopka PNG | `components/admin/stats-lab/StatsLabChartCanvas.tsx` | — |

---

# Część A — `POINTS_BREAKDOWN` (Etap A — zamrożony)

## A1. Cel widoku

Pokazuje **skąd biorą się oficjalne punkty FPL** w badanym okresie: skumulowany pasek składowych dodatnich (brutto) oraz opcjonalny pasek kar (ujemne), z saldem netto = `player.total_points` / suma `row.total_points` w okresie.

Dane na gracza: `PlottedStatsLabPlayer.pointsBreakdown` (`FplPointsBreakdown`), budowane w silniku (`scoreMatchPoints` per GW → suma → `forceBreakdownBalance`).

## A2. Kategorie dodatnie (`positiveBreakdown`)

Stała kolejność UI (`POS_KEYS` w `PointsBreakdownChart.tsx`):

| Klucz w kodzie | Alias w wymaganiach | Jak liczone (per mecz → suma) |
|----------------|---------------------|-------------------------------|
| `appearanceBasePts` | appearanceBasePts | `minutes > 0` → **+1**; `minutes === 0` → 0 |
| `sixtyPlusPts` | sixtyPlusPts | `minutes >= 60` → **+1** (razem z bazą = 2 pkt występu) |
| `goalPts` | goalPts | `goals_scored ×` (GK **10** / DEF **6** / MID **5** / FWD **4**) |
| `assistPts` | assistPts | `assists × 3` |
| `cleanSheetPts` | cleanSheetPts | CS tylko gdy `clean_sheets > 0` **i** `minutes >= 60`: GK/DEF **+4**, MID **+1**, FWD **0** |
| `dcPts` | dcPts | Bonus DC z bilansu meczu (patrz A4 / część C) — zwykle **+2** na mecz z progiem |
| `savePts` | savePts | Tylko GK: `floor(saves / 3)` |
| `penaltySavePts` | penaltySavePts | `penalties_saved × 5` |
| `bonusPts` | bonusPts | Oficjalne `bonus` (BPS); może wchłaniać korektę bilansu gdy `diff ≠ ±2` |

Funkcje: `appearancePointsSplit`, `goalPointsPerGoal`, `cleanSheetPointsPerCs`, `scoreMatchPoints` w `analyticsEngine.ts`.

`appearancePts` (osobne pole agregatu) = `appearanceBasePts + sixtyPlusPts` (utrzymywane helperem spójności).

## A3. Kategorie ujemne (`negativeBreakdown`)

Stała kolejność (`NEG_KEYS`):

| Klucz w kodzie | Alias (spec) | Reguła |
|----------------|--------------|--------|
| `goalsConcededDeduction` | gcPenalty | GK/DEF: `−floor(goals_conceded / 2)`; MID/FWD: **0** |
| `yellowCardDeduction` | ycPenalty | `−1 × yellow_cards` |
| `redCardDeduction` | rcPenalty | `−3 × red_cards` |
| `penaltyMissDeduction` | penMissPenalty | `−2 × penalties_missed` |
| `ownGoalDeduction` | ogPenalty | `−2 × own_goals` (+ ewentualna korekta bilansu gdy `diff < 0`) |

W UI włącza je przełącznik **`showNegativeBreakdown`** → prop `showNegatives`.

## A4. DC w dekompozycji meczu (`scoreMatchPoints`)

1. Policz znany subtotal (występ + gole + asysty + CS + obrony + karne + bonus + kary).
2. `diff = officialTotal − knownSubtotal`.
3. Jeśli `diff === FPL_DC_BONUS_POINTS (2)` **lub** (`matchHasDcBonus` i `diff > 0`) → `dcPts = diff` (gdy dodatni), `awardedDcBonus = true`.
4. Inaczej przy `diff ≠ 0`: dodatnią resztę wchłania `bonusPts`, ujemną — `ownGoalDeduction` (żeby **suma składowych === oficjalne `total_points`**).

## A5. Górna legenda kategorii — **reguła uniwersalna (wdrożona)**

**Status: ZAMROŻONE.** Legenda pokazuje wyłącznie kategorie, które faktycznie występują na wykresie.

```ts
const visiblePosKeys = POS_KEYS.filter((key) =>
  players.some((p) => readPosValue(p.pointsBreakdown, key) !== 0),
);

const visibleNegKeys = showNegatives
  ? NEG_KEYS.filter((key) =>
      players.some((p) => Math.abs(readNegValue(p.pointsBreakdown, key)) > 0),
    )
  : [];
```

| Reguła | Zachowanie |
|--------|------------|
| `visiblePosKeys` | Kategoria dodatnia w legendzie **tylko** gdy ≥1 gracz z `plottedPlayers` ma w niej wartość `!= 0` w badanym okresie |
| `visibleNegKeys` | Kategoria kary **tylko** gdy `showNegatives === true` **oraz** ≥1 gracz ma `|kara| > 0` |
| Wiersz `Kary:` | **Ukryty**, gdy `visibleNegKeys.length === 0` (brak fallbacku pustych GC / ŻK / CK) |
| Bezpieczny sort | Jeśli `sortKey` wskazuje kategorię spoza `visiblePosKeys` / `visibleNegKeys` → lokalny fallback **`estimatedTotal`** (netto FPL; w spec: `"net"`) |

Dzięki temu przy samych **Napastnikach** znikają z legendy CS / DC / Obrony, jeśli nikt nie zdobył w nich punktów; przy **GK** nie widać DC, jeśli `dcPts === 0` u wszystkich.

Pigułki legendy są klikalne (sort po kategorii) — poza `variant === "export"`.

### Kontrast AAA (`ANALYST_LIGHT` + dark)

| Element | `ANALYST_LIGHT` | Dark (`ARENA_DARK` / `SCOUT_DARK`) |
|---------|-----------------|-------------------------------------|
| Segment **WYS** (`appearanceBasePts`) | Stalowy **`#64748b`**, tekst `#ffffff` | Dotychczasowa paleta / kontrast segmentu |
| Segment **60+** (`sixtyPlusPts`) | Grafit **`#334155`**, tekst `#ffffff` | Dotychczasowa paleta |
| Pigułki legendy | `bg-slate-100 border-slate-300 text-slate-800`; aktywna: `bg-emerald-50 border-emerald-500 …` | `bg-white/[0.04] border-white/10 text-slate-200` |
| Pigułka **Brutto** | `bg-emerald-100 text-emerald-900 border-emerald-300 font-bold` | `bg-emerald-500/15 text-emerald-300 border-emerald-500/30` |
| Pigułka **Kary** (`< 0`) | `bg-rose-100 text-rose-900 border-rose-300 font-bold` | `bg-rose-500/20 text-rose-300 border-rose-500/30` |
| Pigułka **Kary: 0** | `bg-slate-100 text-slate-700 border-slate-300` | `bg-white/5 text-slate-400 border-white/10` |
| Tory pasków | `bg-slate-100 border-slate-200/90` | `bg-slate-950/60 border-white/5` |
| Pod-legenda `Kary:` | `text-rose-900 font-semibold` | `text-amber-300 font-medium` |

## A6. Wiersz zawodnika (layout)

Grid: `grid-cols-[210px_minmax(0,1fr)_125px]`.

1. **Lewa:** `StatsLabPlayerIdentity` (rank, portret, herb, nazwisko, opcjonalnie cena/Sel% przez `showMeta`).
2. **Środek:**
   - **Pasek brutto** (`h-10`): szerokość względna `playerGross / maxGrossAmongPlotted`; segmenty `flexGrow: value` tylko dla `value > 0`; etykieta `+{pts}` w segmencie.
   - **Pasek kar** (gdy `showNegatives && playerPenAbs > 0`): `h-7`, szerokość vs `maxAbsPenalty`; tekst `{short}: −{abs} pkt`.
   - **Jednoliniowa pod-legenda**: kropka koloru + `{posShort} +{value}` dla segmentów > 0; po prawej (opcjonalnie) `Kary:` + negatywy.
3. **Prawa:** netto FPL (`estimatedTotal`) + pigułki Brutto / Kary (kontrast AAA jak wyżej).

Sort: `PointsSortKey` (netto, brutto, kary, pojedyncze kategorie) z fallbackiem do `estimatedTotal`.

---

# Część B — `STACKED_COMPOSITE` (Etap B — zamrożony)

## B1. Cel

Porównanie 2–8 `activeMetrics` + **OCENA (0–100)** / **RATING (0–100)** — w kodzie i `audit.json` pole **`compositeScore`** (= średni percentyl wybranych cech na tle `comparisonPool`, z pominięciem cech flat).

Props kluczowe: `scaleMode`, `showValues` ← `showBarValues`, `showMeta` ← `showPlayerMeta`, `per90`.  
Sortowanie: **lokalny** stan `localSortKey: null | FplStatKey | "composite"` (props `sortKey` z Canvas nie nadpisują kolejności silnika).  
**Uwaga:** wykres **nie** rysuje linii średniej puli — `showAvg` dotyczy Radar/Scatter.

### Skala UI (`scaleMode`) — styl FIFA / FPL

| Kod | Etykieta PL | Etykieta EN |
|-----|-------------|-------------|
| `PERCENTILE` | **Tło grupy (0–100)** | **Group rank (0–100)** |
| `RAW` | **Wartości statystyk** | **Actual stats** |

### Wyliczanie OCENY — zerowa wariancja (silnik)

W `computePercentilesForPool` / `buildStatsLabComparison`:

- Dla każdej metryki z `activeMetrics`: jeśli w `comparisonPool` **`poolMin === poolMax`**, cecha **nie wchodzi** do średniej `compositeScore`.
- Percentyl flat (`n > 1`): **0** (dodatnia max 0) albo **50** (invert / signed) — bez sztucznych `100` za OG=0 / PR/PF=0.
- Gdy **wszystkie** aktywne metryki są flat → `compositeScore = 50`.

## B2. Tryb `scaleMode === 'PERCENTILE'` — UI: Tło grupy (0–100)

1. **Kolejność wierszy (krytyczne):**
   - Domyślnie `localSortKey === null` → **1:1 kolejność tablicy `players` z `analyticsEngine`** (`filter.sortByStat`, Top N, `sortByComposite === false`).
   - Lokalne przetasowanie **tylko** po kliknięciu pigułki w `MetricLegendBar` (metryka lub OCENA); ponowne kliknięcie przełącza `DESC`/`ASC`.
   - `useEffect` resetuje `localSortKey → null` przy zmianie `metrics` lub zestawu ID graczy.
2. **Szerokość całego paska** gracza:
   ```ts
   barWidthPct = max(42, round((compositeScore / maxCompositeInView) * 100))
   ```
   → dłuższy pasek = wyższa **OCENA** względem lidera na plakacie.
3. **Segmenty** — dla każdej aktywnej metryki:
   - `pct = clamp(percentiles[key], 0, 100)`;
   - odrzuć `pct === 0`;
   - `flex: (pct / sumPct) 1 44px`;
   - wewnątrz (gdy `showValues`): **rzeczywista** `formatMetricDisplayValue(key, displayValues[key], per90)`.
4. **Pod-legenda atrybutów** (gdy `showValues`) — **bez sufiksów `(Pxx)`** (Etap B):

```tsx
<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
  {/* kropka · skrót · wartość rzeczywista — bez (P99) */}
  {statShort(key, lang)} {formatMetricDisplayValue(key, val, per90)}
</div>
```

Przykład UI: `TP 70 · xGI 7.1 · DC 9.1 · …`  
`flex-wrap` eliminuje poziomy overflow DOM przy 7 metrykach (`truncatedOrOverflowingElements` w audycie JSON).

5. **OCENA** — box po prawej: etykieta `OCENA`/`RATING`, `compositeScore.toFixed(0)` + mikro-etykieta `z wybranych cech` / `selected stats`.

### Oznaczenie OCENA / RATING w legendzie i boksie

| Miejsce | PL | EN | Kod / JSON |
|---------|----|----|------------|
| Pigułka w `MetricLegendBar` | `OCENA (0–100) · Wybrane cechy` | `RATING (0–100) · Selected stats` | sort key `"composite"` |
| Nagłówek boksu gracza | `OCENA` | `RATING` | wartość = `compositeScore` |
| Mikro-etykieta pod liczbą | `z wybranych cech` | `selected stats` | — |

## B3. Tryb `scaleMode === 'RAW'` — UI: Wartości statystyk (`GroupedRawBars`)

- **Brak** jednego skumulowanego paska szerokości OCENY.
- Siatka kolumn: `repeat(metrics.length, 1fr)` — **osobny** pasek na metrykę.
- Szerokość wypełnienia: `val === 0` → **0%**; `val !== 0` → skala `|val| / max|·|` z min. wizualnym **10%** tylko dla niezerowych (ujemne signed: max abs w grupie).
- Kolejność wierszy: ta sama reguła lokalnego sortu co w Tło grupy (`null` = silnik).
- Prawy box: **OCENA/RATING** (gdy `localSortKey` null/`"composite"`) **albo** skrót metryki lokalnego sortu; mikro-etykieta `z wybranych cech` tylko przy OCENIE.
- **AAA:** kapsułki wartości (`bg-slate-950/80` dark / `bg-white/90` light) na krótkich paskach.

## B4. Przełączniki

| UI | Prop | Efekt |
|----|------|-------|
| Pokaż wartości na paskach | `showBarValues` → `showValues` | Liczby w segmentach + pod-legenda (Tło grupy) / w paskach (Wartości statystyk) |
| Meta gracza | `showPlayerMeta` → `showMeta` | Cena / Sel% w identity |
| Pokaż średnią grupy | `showPoolAverage` | **Nie używane** przez Stacked |
| Totals / Per 90 | `filter.per90` | Format i źródło `displayValues` z silnika |
| Sortuj po OCENIE (0–100) | `sortByComposite` | Silnik sortuje Top N po `compositeScore` |

Górna `MetricLegendBar`: pigułki metryk (`ANALYST_LIGHT`: `bg-slate-100 border-slate-300 text-slate-800`) + **OCENA (0–100)** + lokalny sort po kliknięciu.

---

# Część C — Domyślne `activeMetrics`, presety, pipeline DC (Etap B — zamrożony)

## C1. Co się dzieje po kliknięciu pozycji (Wszystkie / GK / DEF / MID / FWD)?

Ścieżka: panel → `onFilterChange(next)` w `StatsLabStudioClient.tsx`.

```ts
if (prevPos !== nextPos) {
  setActiveStreakKeys(defaultStreakKeysForPositions(next.positions));
  const metricsUnchanged =
    next.activeMetrics.join(",") === filter.activeMetrics.join(",");
  if (metricsUnchanged) {
    resolved = {
      ...next,
      activeMetrics: defaultActiveMetricsForPositions(next.positions),
    };
  }
  // Reset sortByStat, gdy nie pasuje do nowej formacji / metryk
  if (!isSortByStatAlignedWithPositions(
    resolved.sortByStat,
    resolved.positions,
    resolved.activeMetrics,
  )) {
    resolved = {
      ...resolved,
      sortByStat: "total_points",
      sortDirection: "DESC",
    };
    setUi((prev) => ({ ...prev, sortByComposite: false }));
  }
}
```

| Warunek | Zachowanie |
|---------|------------|
| Zmieniła się tylko pozycja, a `activeMetrics` w `next` są **takie same** jak wcześniej | **Auto-podmiana** na `defaultActiveMetricsForPositions(positions)` |
| W tym samym kroku użytkownik też zmienił metryki | Auto-podmiana **nie** startuje |
| `sortByStat` nie jest w nowych `activeMetrics` **lub** to mismatche formacji (gole/threat/DC przy GK; saves przy DEF/MID/FWD) | **Reset** `sortByStat → "total_points"`, `sortDirection → "DESC"`, `sortByComposite → false` |
| Preset | `applyStatsLabPreset` nadpisuje pozycję + metryki; Composite OFF |

**Przykład:** preset Napastników (`sortByStat: "goals_scored"`) → klik **GK** → metryki bramkarskie + sort **`total_points` DESC** (nie po golach).

### `defaultActiveMetricsForPositions` (`presets.ts`)

| Pozycje | Domyślne `activeMetrics` |
|---------|--------------------------|
| wyłącznie **GK (1)** | `total_points`, `clean_sheets`, `saves`, `form`, `points_per_game`, `expected_goals_conceded` |
| wyłącznie **DEF (2)** | `total_points`, `clean_sheets`, `defensive_contributions_total`, `dc_bonus_matches`, `dc_bonus_points`, `expected_goal_involvements`, `bps` |
| wyłącznie **MID (3)** | `total_points`, `goals_assists`, `expected_goal_involvements`, `expected_goals`, `expected_assists`, `dc_bonus_points`, `bps` |
| wyłącznie **FWD (4)** | `total_points`, `goals_scored`, `expected_goals`, `expected_goal_involvements`, `threat`, `bonus` |
| puste / wiele / „Wszystkie” | `total_points`, `expected_goal_involvements`, `bps`, `goals_assists` |

## C2. Presety (`STATS_LAB_PRESETS`)

| ID | Pozycje | `sortByStat` | `activeMetrics` | Inne |
|----|---------|--------------|-----------------|------|
| `GK_WALL` | `[1]` | `total_points` | TP, CS, saves, form, PPM, xGC | min 180′, Top 10 |
| `DEF_COMPLETE` | `[2]` | `total_points` | TP, CS, DC suma, DC Mecz, DC Pkt, xGI, BPS | min 180′, Top 10 |
| `MID_CREATORS_THREAT` | `[3]` | `expected_goal_involvements` | TP, xG, xA, G+A, creativity, DC suma, DC Pkt | min 180′, Top 10 |
| `FWD_SNIPERS` | `[4]` | `goals_scored` | TP, gole, xG, xGI, threat, form, PPM | min 180′, Top 10 |
| `VALUE_GEMS` | `[]` | `value_season` | TP, V(S), form, PPM, xGI, now_cost | `maxOwnershipPct: 10`, Top 15 |

Domyślny filtr bez presetu (`createDefaultStatsLabFilter`): pozycje puste, metryki TP / xGI / BPS / G+A, sort TP DESC, Top 10, `FULL_SEASON`, `per90: false`.

## C3. Pipeline trzech metryk Defensive Contributions

Stałe (`types.ts`):

- `FPL_DC_THRESHOLD_DEF = 10`
- `FPL_DC_THRESHOLD_MID_FWD = 12`
- `FPL_DC_BONUS_POINTS = 2`

### C3.1. Suma akcji DC w meczu — `computeMatchDcComponents` / `matchDcTotal`

| Pozycja | Składniki | Próg bonusu (`hitsDcThreshold`) |
|---------|-----------|----------------------------------|
| DEF (2) | CBI + Tackles | ≥ **10** |
| MID/FWD (3/4) | CBI + Tackles + Recoveries | ≥ **12** |
| GK (1) | 0 | nigdy |

`matchDcTotal`: preferuj API `defensive_contribution` jeśli > 0, inaczej suma składowych.

### C3.2. Agregaty sezonu / okresu + **formatowanie wyświetlania**

| Klucz | Short | Totals (display) | Per 90 (display) |
|-------|-------|------------------|------------------|
| `defensive_contributions_total` | **DC** | Int (`91`) | **Zawsze 1 dp** Opta: `9.1`, `11.2` (nie `9.10` vs `11.2`) |
| `dc_bonus_matches` | **DC Mecz** | Int (`5`) | **Zawsze 2 dp**: `0.50`, `0.87` |
| `dc_bonus_points` | **DC Pkt** | Int (`10`) | **Zawsze 2 dp**: `1.00`, `1.73` |

Silnik: `(sum / minutes) × 90` przy `supportsPer90: true`.  
Formatter (1:1): `chartTheme.formatMetricDisplayValue` ↔ `analyticsEngine.formatStatDisplay`  
(`PER90_OPTA_ONE_DP` vs `PER90_POINTS_TWO_DP`).

Bez historii GW: `dc_bonus_matches/points = 0` (nie zgaduj z CBI sezonowego).

Stats Centre: ta sama matematyka w `accumulatePlayerRows` + `applyPer90Rounded`.

### C3.3. Różnica DC „suma akcji” vs „punkty FPL”

- **DC (suma)** = wolumen Opta (CBI+TKL[+REC]) — scout intensywności; Per 90 jako indeks **1 dp**.
- **DC Mecz / DC Pkt** = ile razy FPL wypłaciło **+2**; Per 90 jako stawka punktowa **2 dp** — spójne z dekompozycją `dcPts`.

---

## D. Nagłówek i stopka PNG dla tych widoków

Z `StatsLabChartCanvas` / docs/02:

### D1. Dwupoziomowy podtytuł

| Stan | Render |
|------|--------|
| Brak `customSubtitle` | Sam `autoSubtitle` (Sezon · GW · Min. · Totals/Per 90 · **Tło grupy / Wartości statystyk** · **Grupa porównawcza: N**) |
| Jest `customSubtitle` | Autor (góra) + kompaktowy `autoSubtitle` pod spodem (`text-[11px] opacity-75`) — plakat nie gubi metryczki danych |

### D2. Stopka / instrukcje

- **STACKED · Tło grupy:** *Całkowita długość paska = OCENA (0–100) z wybranych kryteriów; liczby = rzeczywiste statystyki.*
- **STACKED · Wartości statystyk:** *Kolumna = rzeczywista statystyka vs lider; OCENA (0–100) = nota z wybranych cech na tle grupy.*
- **POINTS:** bez pigułek metryk; *Punkty Netto = oficjalny wynik FPL (brutto − kary…)*.

---

## E. Problemy produktowe Etapu A/B — **WDROŻONE I ZAMKNIĘTE**

| # | Temat | Status |
|---|-------|--------|
| 1 | **Legenda POINTS** — `visiblePosKeys` / `visibleNegKeys` tylko gdy wartość `!= 0`; ukrycie wiersza `Kary:`; fallback sortu do netto | **WDROŻONE I ZAMKNIĘTE** |
| 2 | **STACKED pod-legenda PERCENTILE** — usunięte `(Pxx)`; czyste `displayValues` + `flex-wrap` | **WDROŻONE I ZAMKNIĘTE** |
| 3 | **Presety vs pozycja** — auto-metryki formacji + reset `sortByStat → total_points` gdy mismatche | **WDROŻONE I ZAMKNIĘTE** |
| 4 | **Sort Stacked vs silnik** — domyślnie kolejność z `analyticsEngine`; lokalny sort po kliknięciu legendy | **WDROŻONE I ZAMKNIĘTE** |
| 5 | **Terminologia OCENA/RATING** — UI `OCENA (0–100) · Wybrane cechy` / `z wybranych cech`; kod = `compositeScore` | **WDROŻONE I ZAMKNIĘTE** |
| 6 | **Format DC Per 90** — DC 1 dp; DC Mecz / DC Pkt 2 dp (chartTheme + analyticsEngine) | **WDROŻONE I ZAMKNIĘTE** |
| 7 | **Kontrast AAA** Points + Stacked Light | **WDROŻONE I ZAMKNIĘTE** |
| 8 | **OCENA bez flat metrics** — `poolMin === poolMax` pomijane w średniej; percentyle 0/50 zamiast fałszywych 100 | **WDROŻONE I ZAMKNIĘTE** |
| 9 | **Dwupoziomowy podtytuł** — `customSubtitle` + zawsze widoczny `autoSubtitle` | **WDROŻONE I ZAMKNIĘTE** |

---

## F. Zero-regression

**Zamrożone (nie modyfikować bez osobnej decyzji produktowej):**

- `PointsBreakdownChart.tsx` (Etap A)
- `StackedCompositeChart.tsx` (Etap B)
- `RadarPizzaChart.tsx`, `RadarQuickSlotsBar.tsx` (docs/03)
- `StreaksExplorerChart.tsx`

Zmiany silnika wspólne (okres, Per 90, format transferów, format Opta DC) — założone jako obowiązujący standard Studio + Stats Centre.
