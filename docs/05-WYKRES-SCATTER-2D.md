# Wykres punktowy 2D (`SCATTER_2D`) — zamrożony (Zero-Regression)

| Pole | Wartość |
|------|---------|
| Tryb | `vizMode === "SCATTER_2D"` |
| Status | **Zamrożony / ukończony** (Social-First AAA — Kroki 1–5) |
| Implementacja | `components/admin/stats-lab/charts/Scatter2DChart.tsx` |
| Osie UI | `ui.axisX` / `ui.axisY` + Quick Axis Presets |
| Canvas / stopka | `StatsLabChartCanvas.tsx` (`scaleMode`, `per90`, `poolSize`) |
| Osie + kolizje | `chartTheme.ts` → `computeScatterAxisConfig`, `resolveScatterSmartLabels`, `getScatterClubColor` |
| Dane | `displayValues` (RAW) / `percentiles` (PERCENTILE) + `poolAverages` |
| Audyt | `activeCriteriaAndFilters.scatterAxisX` / `scatterAxisY` |

Powiązane: [`02-STATS-LAB-STUDIO-KONTEKST.md`](./02-STATS-LAB-STUDIO-KONTEKST.md) · [`04-DEKOMPOZYCJA-I-PROFIL-WIELOWYMIAROWY.md`](./04-DEKOMPOZYCJA-I-PROFIL-WIELOWYMIAROWY.md) · [`06-MACIERZ-HEATMAP.md`](./06-MACIERZ-HEATMAP.md)

**Zakaz dalszych zmian UI/logiki Scatter** bez osobnej decyzji produktowej — Zero-Regression jak Radar / Points / Stacked.

---

## 1. Cel produktowy

`SCATTER_2D` = **korelacja dwóch cech** na jednej płaszczyźnie:

- oś **X** / **Y** = wybrane `FplStatKey`,
- punkt = zawodnik z `plottedPlayers`,
- **prawy górny róg ↗** = najlepszy profil w obu cechach (po uwzględnieniu `invertScale` w RAW),
- linie przerywane = średnia grupy (`poolAverages` / P50 w trybie Tło grupy).

Typowe pytania: outlier xGI vs TP, cena vs PPM, DC vs DC Pkt, kto jest „tanio i mocno”.

---

## 2. Panel boczny (osie)

### 2.1. Stan Studio

| Pole | Domyślnie |
|------|-----------|
| `axisX` | `expected_goal_involvements` |
| `axisY` | `total_points` |

### 2.2. Kontrolki

1. Select **Oś X** / **Oś Y** — etykiety `(short) label` (np. `(xGI) Expected Goal Involvements`).
2. **Zamień osie**.
3. **Quick Axis Presets** (4 pigułki):
   - `xGI vs TP`
   - `xG vs Gole` / Goals
   - `Cena vs PPM` / Price vs PPG
   - `DC vs DC Pkt`
4. Select **Sortuj wg statystyki** — te same etykiety `(short) label`.

`activeMetrics` nie sterują pozycją punktów Scatter — tylko `axisX`/`axisY` (+ `compositeScore` w kartotece / priorytecie etykiet).

---

## 3. `scaleMode` i wartości na osiach

| Tryb UI | Wartość punktu | Domeny / ticki |
|---------|----------------|----------------|
| **Wartości** (`RAW`) | `displayValues[axis]` | `computeScatterAxisConfig` — pad 4%, floor 0 dla nieujemnych; Totals → skala całkowita (`isIntegerScale`) gdy metryka nie jest ułamkowa; `invertScale` odwraca `project` („mniej = lepiej” → prawo / góra) |
| **Tło grupy** (`PERCENTILE`) | `percentiles[axis]` (0–100) | domena zawsze `0–100`, ticki `P0…P100`, `avg = 50` (invert już w silniku) |

Canvas przekazuje: `scaleMode`, `per90={filter.per90}`, `poolSize={result.poolSize}`.

Stopka Canvas (1 zdanie):

- PERCENTILE — pozycja na tle grupy 0–100, P50 = środek,
- RAW — rzeczywiste wartości, linie = średnia grupy.

---

## 4. Geometria SVG (Social-First)

| Stała | Wartość | Rola |
|-------|---------|------|
| `W` × `H` | `1000` × `560` | `viewBox` |
| `PAD` | `t:20 r:54 b:36 l:78` | ramka plotu (tytuły osi w HTML) |
| `DATA_INSET_X/Y` | `44` | wewnętrzny bufor — kropki/siatka/średnia **nie** wchodzą na odznaki ćwiartek |

```ts
innerLeft/Right/Top/Bottom = PAD ± DATA_INSET
sx(v) = innerLeft + axisConfigX.project(v) * innerW
sy(v) = innerTop  + (1 - axisConfigY.project(v)) * innerH
```

### 4.1. Warstwy wykresu

1. Tło ćwiartek (↗ emerald / ↙ rose) względem split = avg lub środek geometryczny.
2. Siatka 5×5 z `axisConfig.ticks` (`sx(tick.value)` / `sy(tick.value)`).
3. Ramka plotu + linie średniej (dashed).
4. Ticki numeryczne (bez obróconych `<text -90°>`).
5. 4 narożne odznaki (`↗ CZOŁÓWKA`, `↖ DOBRY: Y`, `↘ DOBRY: X`, `↙ PONIŻEJ ŚR.`) — w `reservedBoxes` solvera.
6. Punkty + smart etykiety (Spotlight zawsze na wierzchu).

### 4.2. Tytuły osi — HTML (nie SVG)

Aby `audit.json` nie zgłaszał `scrollWidth > clientWidth` na strzałkach `↑`/`→`:

- **nad** SVG: `↑ (shortY) labelY` (+ opcjonalnie legenda średniej),
- **pod** SVG: `(shortX) labelX →` (+ dopisek „mniej = lepiej” gdy `inverted`).

---

## 5. Punkty, kolory, etykiety, kartoteka

### 5.1. Kolor klubu

`getScatterClubColor(short_name, primary_color, accent)` — paleta short_name (ARS, LIV, LEE, …) + deterministyczny hash 12 barw dla nieznanych kodów.

### 5.2. Markery

- zwykły: `r = 9.5`, stroke canvas,
- Spotlight: `r = 13` + złoty pierścień `r = 18`,
- mikro-separacja identycznych pikseli (`< 6px`) po okręgu `6.5px`.

### 5.3. Smart labels (`resolveScatterSmartLabels`)

- AABB + 18 bazowych offsetów + dalekie L/R względem `hw = boxW/2`,
- priority: Spotlight `10000` → liderzy skrajni `600−` → reszta `300−`,
- brak etykiety gdy brak wolnego kandydata (`overlappingLabels = 0`),
- pigułka: accent bar koloru klubu; meta `£Xm · Sel%` przy `showMeta`.

### 5.4. Roster grid (pod SVG)

Karty 2–5 kolumn: portret 44px + biały medalion herbu, `#rank` (kontrast Light/Dark), nazwisko bez `truncate`, pary `short: value` z `whitespace-nowrap`, pigułka **OCENA / RATING**.

Tooltip hover: `OCENA (0–100)` / `RATING (0–100)` — nie „Composite”.

---

## 6. Audyt JSON

`buildChartStudioAiAuditReport` → `activeCriteriaAndFilters`:

```ts
scatterAxisX: ui.axisX   // tylko gdy vizMode === SCATTER_2D
scatterAxisY: ui.axisY
```

Przekazanie: `StatsLabStudioClient` → `StatsLabExportBar` → `auditExport.ts`.

---

## 7. Mapa plików

| Temat | Plik |
|-------|------|
| Wykres + roster | `components/admin/stats-lab/charts/Scatter2DChart.tsx` |
| Osie / smart labels / kolory klubów | `components/admin/stats-lab/chartTheme.ts` |
| Selecty + Quick Presets | `StatsLabControlPanel.tsx` |
| Props + stopka instrukcji | `StatsLabChartCanvas.tsx` |
| Stan UI + audit props | `StatsLabStudioClient.tsx`, `StatsLabExportBar.tsx` |
| Serializacja osi | `lib/stats-lab/auditExport.ts` |

---

## 8. Zero-regression — Chart Studio 6/6

Przy dalszych pracach Studio **nie wolno** zmieniać bez decyzji (pakiet **6/6 zamrożony**):

1. `RadarPizzaChart.tsx` + `RadarQuickSlotsBar.tsx` (docs/03)
2. `PointsBreakdownChart.tsx` (docs/04)
3. `StackedCompositeChart.tsx` (docs/04)
4. `StreaksExplorerChart.tsx` (docs/04)
5. `Scatter2DChart.tsx` (ten dokument — docs/05)
6. `HeatmapMatrixChart.tsx` ([docs/06](./06-MACIERZ-HEATMAP.md))

Dozwolone: wspólne typy/silnik, KB copy (poza geometrią zamrożonych viz).
