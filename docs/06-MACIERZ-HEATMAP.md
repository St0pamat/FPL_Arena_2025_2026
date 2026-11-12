# Macierz heatmap (`HEATMAP_MATRIX`) — zamrożony (Zero-Regression)

| Pole | Wartość |
|------|---------|
| Tryb | `vizMode === "HEATMAP_MATRIX"` |
| Status | **Zamrożony / ukończony (Zero-Regression — Social-First AAA)** |
| Pakiet Studio | **Chart Studio 6/6 zamrożone** (Radar, Points, Stacked, Streaks, Scatter, Heatmap) |
| Implementacja | `components/admin/stats-lab/charts/HeatmapMatrixChart.tsx` |
| Canvas / stopka | `StatsLabChartCanvas.tsx` (`scaleMode`, `per90`, `poolAverages`, `poolSize`, `showAvg` / `showPoolAverage`, `showMeta`) |
| Słownik PL | ujednolicone `labelPl` w `lib/stats-lab/types.ts` (`FPL_STAT_DEFINITIONS`) |
| Kolumny | `filter.activeMetrics` + filar **OCENA / RATING** (`112px`) |
| Dane | `displayValues` + `percentiles` (tylko kolor) + `compositeScore` + `poolAverages` |
| Format wartości | `formatStatDisplay` / korekta Totals `threat` → integer |

Powiązane: [`02-STATS-LAB-STUDIO-KONTEKST.md`](./02-STATS-LAB-STUDIO-KONTEKST.md) · [`03-WYKRES-RADAROWY-PIZZA.md`](./03-WYKRES-RADAROWY-PIZZA.md) · [`04-DEKOMPOZYCJA-I-PROFIL-WIELOWYMIAROWY.md`](./04-DEKOMPOZYCJA-I-PROFIL-WIELOWYMIAROWY.md) · [`05-WYKRES-SCATTER-2D.md`](./05-WYKRES-SCATTER-2D.md)

**Zakaz dalszych zmian UI/logiki Heatmap** bez osobnej decyzji produktowej.

---

## 1. Cel produktowy

`HEATMAP_MATRIX` = **szybki skan Top N × wybrane cechy** na jednym plakacie Social-First:

- wiersz = zawodnik z `plottedPlayers`,
- kolumna = metryka z `activeMetrics`,
- **kolor kafelka** = siła na tle grupy (`percentiles` → 5 pasm Elita…Słaby),
- **liczba w kafelku** = wyłącznie sformatowana wartość docelowa (`displayValues`, bez kodów `P0–100`),
- prawa kolumna = werdykt **OCENA / RATING** (`compositeScore`),
- opcjonalny dół = **Ø Średnia grupy** (`showPoolAverage` + `poolAverages`).

---

## 2. Jednolita siatka CSS Grid

Wspólna stała dla nagłówka, wierszy graczy i wiersza Ø:

```ts
const matrixGridTemplate = `280px repeat(${metrics.length}, minmax(0, 1fr)) 112px`;
// kontener: grid items-stretch gap-2 rounded-xl border px-2.5 py-1.5
```

| Strefa | Szerokość | Treść |
|--------|-----------|--------|
| Lewa | `280px` | `#Rank` + portret + nazwisko + meta |
| Środkowe | `minmax(0, 1fr)` × N | kafelki kryteriów |
| Prawa | `112px` | filar OCENA / RATING (+ `border-l-2`) |

**Zero `truncate` / `text-ellipsis`** — audyt: `truncatedOrOverflowingElements: []`.

Nagłówek i wiersze dzielą ten sam poziomy padding `px-2.5`, dzięki czemu krawędzie kolumn (w tym OCENA) pokrywają się 1:1.

---

## 3. Kolumna zawodnika (`280px`)

1. Badge `#Rank` — `min-w-[30px] h-7 text-[12px] font-black` (kontrast Light/Dark; Spotlight amber).
2. Portret **52×52px** + biały medalion herbu **20×20px** (`object-contain`).
3. Nazwisko `web_name` — `text-[15px] font-black leading-tight break-words` (bez truncate).
4. Meta jednoliniowa (`whitespace-nowrap text-[11px] font-bold`):  
   `{clubShort} · {posShort} · £Xm · Y.Y%` (gdy `showMeta`).

---

## 4. Nagłówki kryteriów (1:1 z dolną legendą)

Kolor metryki = `getMetricColor(idx, theme)` (to samo źródło co pigułki stopki Canvas / `METRIC_SEGMENT_COLORS`):

- górny pasek `borderTopWidth: 4px`,
- kolorowa kropka `2.5×2.5`,
- skrót FPL **bez** wymuszania `uppercase` (`TP`, `xG`, `xGI`, `DC Mecz`, `DC Pkt`, `V(S)`…),
- `invertScale` → strzałka **↓**,
- lokalny sort → `▲` / `▼` + accent border.

---

## 5. Kafelki kryteriów

| Element | Spec |
|---------|------|
| Wymiary | `min-h-[64px]`, `rounded-xl`, równe wysokości z OCENA |
| Liczba | wyłącznie `formatStatDisplay` / integer `threat` w Totals — **bez** `Pxx` |
| Typografia | `text-[18px] sm:text-[19px] font-black tabular-nums` |
| Kolor tła | 5-stopniowa paleta AAA z `percentiles` (Elita / Wysoki / Środek / Niski / Słaby) |
| Liderzy | wszyscy ex aequo z `bestVal` → `★` + złoty ring (w Light: `ring-2 ring-amber-500/80`) |

Legenda nad tabelą: same nazwy pasm (bez `P85–100`), pigułka `★ Lider kolumny`, opcjonalnie `↓ mniej = lepiej`.

---

## 6. Filar OCENA / RATING (`112px`)

Kontener z separatorem: `pl-2 border-l-2` (Light: `border-slate-300`, Dark: `border-amber-400/25`).

### Nagłówek

- złoty top `4px` (`#f59e0b`),
- Light: `bg-slate-900 text-white border-slate-800`,
- Dark: `bg-amber-500/20 text-amber-100 border-amber-400/60`,
- tytuł `OCENA` / `RATING` + mikro `0–100`.

### Kafelek gracza (Hero Verdict)

- Light: ciemny granat `bg-slate-900`, lider → amber ring,
- Dark: gradient bursztynowo-grafitowy (nie zielony heatmapy),
- liczba `20–22px font-black` + `★` dla współliderów oceny,
- mikro-etykieta: **`Z CECH`** / **`SEL. STATS`**.

---

## 7. Wiersz Ø Średnia grupy

Render **tylko** gdy `Boolean(showAvg) && Boolean(poolAverages)` (`showAvg` ← Studio `showPoolAverage`).

- lewa: `Ø` + „Średnia grupy” / „Group average” (+ `poolSize`),
- kafelki: wyłącznie sformatowane średnie (bez `P50`),
- OCENA: `50` w tym samym stylu filaru.

---

## 8. Inwariant sortowania

| Stan | Zachowanie |
|------|------------|
| `localSortKey === null` | kolejność 1:1 z `analyticsEngine` |
| Klik nagłówka | lokalny sort (poza `export`) |
| RAW + `invertScale` | pierwszy kierunek `ASC`; inaczej `DESC` |
| Reset / zmiana metrics lub ID | `localSortKey = null` |

---

## 9. Stopka Canvas

Jedna instrukcja (bez kodów P0–100):

- PL: liczby = wartości statystyk; kolor = poziom vs grupa (Słaby→Elita); ★ = lider; OCENA podsumowuje cechy.
- EN: analogicznie (Poor→Elite, RATING).

---

## 10. Mapa plików

| Temat | Plik |
|-------|------|
| Macierz | `components/admin/stats-lab/charts/HeatmapMatrixChart.tsx` |
| Props + stopka | `components/admin/stats-lab/StatsLabChartCanvas.tsx` |
| Kolory legendy | `getMetricColor` / `METRIC_SEGMENT_COLORS` w `chartTheme.ts` |
| `labelPl` PL | `lib/stats-lab/types.ts` → `FPL_STAT_DEFINITIONS` |
| Dane | `lib/stats-lab/analyticsEngine.ts` |

---

## 11. Zero-regression — Chart Studio 6/6

Przy dalszych pracach **nie wolno** zmieniać bez decyzji produktowej:

1. `RadarPizzaChart.tsx` + `RadarQuickSlotsBar.tsx` (docs/03)
2. `PointsBreakdownChart.tsx` (docs/04)
3. `StackedCompositeChart.tsx` (docs/04)
4. `StreaksExplorerChart.tsx` (docs/04 / Studio)
5. `Scatter2DChart.tsx` (docs/05)
6. `HeatmapMatrixChart.tsx` (ten dokument — docs/06)

Dozwolone: wspólne typy/silnik, KB copy, inne moduły poza geometrią zamrożonych viz.
