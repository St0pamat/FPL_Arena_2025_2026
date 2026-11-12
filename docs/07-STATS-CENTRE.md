# Stats Centre — zamrożony (Zero-Regression — Social-First AAA)

| Pole | Wartość |
|------|---------|
| Moduł | `STATS_CENTRE` (`/admin/stats-lab` → zakładka Centre / `/admin/stats-lab/centre`) |
| Status | **Zamrożony / ukończony (Zero-Regression — Social-First AAA)** |
| Komplet | **Players 8/8 · Per GW · Teams 4/4** |
| UI | `components/admin/stats-lab/StatsCentreView.tsx` |
| Silnik | `lib/stats-lab/statsCentreEngine.ts` |
| i18n PL/EN | `lib/stats-lab/statsCentreI18n.ts` |
| Motywy | `ARENA_DARK` · `SCOUT_DARK` · `ANALYST_LIGHT` |
| Eksport | sparowana para `.jpg` + `.json` (audyt AI) |

Powiązane: [`01-APLIKACJA-PRZEGLAD-FUNKCJONALNY.md`](./01-APLIKACJA-PRZEGLAD-FUNKCJONALNY.md) · [`02-STATS-LAB-STUDIO-KONTEKST.md`](./02-STATS-LAB-STUDIO-KONTEKST.md) · Chart Studio docs/03–06 (**zamrożone 6/6**).

**Zakaz dalszych zmian UI/logiki Stats Centre** bez osobnej decyzji produktowej.  
**Zero-Regression Chart Studio:** nie modyfikować `charts/*`, `StatsLabChartCanvas.tsx`, `StatsLabStudioClient.tsx`, `StatsLabControlPanel.tsx`, `analyticsEngine.ts`.

---

## 1. Cel produktowy

Stats Centre = **tabelaryczny skauting FFS-style** na plakacie Social-First:

- szybkie rankingi zawodników / występów / 20 klubów PL,
- kolorowe pigułki wartości na tle grupy (`colorNorm`),
- słownik widocznych kolumn w stopce plakatu,
- eksport JPG + pełny audyt JSON (`layoutDiagnostics`, `displayedEntities`, `poolAverages`).

---

## 2. Architektura plików

| Warstwa | Plik |
|---------|------|
| Widok / plakat / eksport | `StatsCentreView.tsx` |
| Silnik tabel (bez I/O) | `statsCentreEngine.ts` |
| Etykiety PL/EN + `COLUMN_FULL_LABELS` | `statsCentreI18n.ts` |
| Query server action | `app/admin/actions/statsLabCentre.ts` |
| Audyt JSON | `buildStatsCentreAiAuditReport` w `auditExport.ts` |

Typy trybów/zakładek żyją w **`statsCentreEngine.ts`** (nie w `types.ts`):

- `StatsCentreMode`: `PLAYERS` \| `PER_GW` \| `TEAMS`
- `StatsCentrePlayerTab` (8) · `StatsCentreTeamTab` (4)

---

## 3. Tryby i zakładki

### `PLAYERS` (8 zakładek)

| ID | PL | EN |
|----|----|----|
| `OVERVIEW` | Ogólne | Overview |
| `GOAL_THREAT` | Zagrożenie Bramkowe | Goal Threat |
| `CREATIVITY` | Kreacja | Creativity |
| `DEFENDING` | Defensywa i DC | Defending |
| `SET_PIECES` | Stałe Fragmenty | Set Pieces |
| `DISCIPLINE` | Dyscyplina | Discipline |
| `EXPECTED` | Oczekiwane xG | Expected |
| `VALUE_MARKET` | Wartość i Transfery | Value & Market |

Domyślne sorty: m.in. `DISCIPLINE` → `negative_points_total ASC`; `SET_PIECES` → `creativity DESC`.

### `PER_GW`

Jedna tabela historii mecz po meczu. **`per90` zawsze `false`** (silnik + UI + audit).  
Wiersz Ø: `gameweek` / `opponent_label` → `—`.

### `TEAMS` (4 zakładki)

| ID | PL | EN |
|----|----|----|
| `TEAM_OVERVIEW` | Przegląd | Overview |
| `TEAM_ATTACKING` | Atak | Attacking |
| `TEAM_DEFENDING` | Defensywa | Defending |
| `TEAM_EXPECTED` | Oczekiwane | Expected |

20 klubów na jednej stronie (`pageSize ≥ 25`). Wiersz Ø: **Ø Średnia ligi** / **Ø League average**.

---

## 4. Standard wizualny AAA

| Element | Spec |
|---------|------|
| Portret gracza | **52×52px** + biały medalion herbu **20×20px** |
| Herb klubu (TEAMS) | **44×44px** na białym medalionie |
| Nazwisko / klub | `15px font-bold`, **bez `truncate` / `max-w` ucinającego** |
| Meta | `11px uppercase` — `{club} · {pos}` |
| Kolumna `#` | ranking `(page-1)*pageSize+idx+1` + ★ watchlist (PLAYERS/PER_GW) |
| Nagłówki | `12px font-extrabold uppercase` |
| Wartości | `14px` mono; przy **≥13 kolumn** → gęstsze `13px` / `min-w-[42px]` |
| Order (`Pen#`, `CK#`…) | `#1` / `#2` szmaragd jak liderzy; reszta neutralna |
| Transfery | kompakt `k` / `M` (+ dla `net_transfers_gw`) |
| Motywy | pełne sticky tła wierszy (bez odcięć Light/Dark) |

---

## 5. Matematyka i `colorNorm`

### Ogólne

- `colorNorm` i `poolAverages` liczone dla **wszystkich** numerycznych kluczy w `row.values` (niezależnie od aktywnej zakładki).
- Audyt filtruje do **widocznych** kolumn bieżącego UI.
- Outliery: skala **P5–P95**; przy `PLAYERS` + Per 90 granice z podzbioru `minutes ≥ 90` (≥10 takich wierszy).
- `matches_played` / `gameweek`: **bez** `colorNorm` (zawsze neutralne).

### Delty ze znakiem

Klucze: `xg_delta`, `xa_delta`, `xgi_delta`, `xgc_delta`, `cost_change_*`, `net_transfers_gw` (+ `goal_diff` / `net_xg_balance` specjalnie).

- Dodatnie = lepiej (zieleń), ujemne = gorzej (róż), z wyjątkiem **`xgc_delta`** (odwrócone).
- Skala wokół `0 → 0.5` (P95 dodatnich / P5 ujemnych).
- `goal_diff`: `≥ +3` zieleń, `−2…+2` neutral `0.35`, `≤ −3` róż.

### Kary (`PENALTY_COLUMNS`)

`yellow_cards`, `red_cards`, `own_goals`, `penalties_missed`, `negative_points_total`, `transfers_out_event`, `transfers_out`.

- `0` / niski poziom → **`colorNorm = 0.35`** (szary — nigdy zielony lider).
- Kary > 0 → róż `0.00…0.24`.
- **TO**: ≤ P50 → `0.35`; P50–P80 → `0.35…0.30`; **P80–P95 → `0.24…0.00`**.

### Pigułki UI (ostrzeżenia)

| Norm | Dark | Light |
|------|------|-------|
| `0 ≤ norm ≤ 0.10` | `bg-rose-500/30 … border-rose-500/50 font-extrabold` | `bg-rose-600 text-white …` |
| `0.10 < norm < 0.25` | `bg-rose-500/15 … border-rose-500/30 font-bold` | `bg-rose-100 …` |

Zwykłe metryki dodatnie przy niskim norm (np. 0 goli) → **szare**, nigdy róż.

### Per 90 / progi

| Tryb | Reguła |
|------|--------|
| `PLAYERS` + `per90` | efektywne `minMinutes = max(filter.minMinutes, 90)`; wartości skalowane /90 → **2 dp** |
| `PER_GW` | `per90` wymuszone `false` |
| `TEAMS` + `per90` | dzielnik = **`matches_played`** (nie suma minut graczy); delty/bilanse = sumy okresu |

### Mecze klubowe (`TEAMS`)

Fixture autentyczny tylko gdy ≥ **7** graczy z `minutes > 0` (fallback per GW: najlepszy fixture ≥ **5**). Eliminuje historię z poprzednich klubów transferowanych zawodników → spójne `M` / CS / GC / xGC.

### Wiersz Ø

- PLAYERS / PER_GW: **Ø Średnia grupy** / **Ø Pool average**
- TEAMS: **Ø Średnia ligi** / **Ø League average**
- Totals: całkowite w Ø → **1 dp**; minuty / Min/G → `Math.round`

---

## 6. Plakat i eksport

### Nagłówek

Logo 48×48 · `FPL ARENA • STATS CENTRE` · tytuł tryb—zakładka · metryczka  
`Sezon · GW a–b · zakres · Min. X min · Totals|Per 90|Pojedyncze mecze · Pula: N …`

### Stopka

Pigułki słownikowe `SKRÓT: pełna nazwa` (`COLUMN_FULL_LABELS`) + legenda skali + branding St0pa.

### Eksport

- Główny przycisk: **para** `fpl-arena-stats-centre-{mode}-{tab}-{lang}.jpg` + `.json`
- Przed capture: pełna szerokość tabeli (`scrollWidth+64`), `overflow: visible`, ukryty scrollbar, `toJpeg(width/height)`
- Audyt: `effectiveGwRange ≥ 1`, `poolAverages` widocznych kolumn, `label`/`fullLabel`, `layoutDiagnostics` → cel: puste `truncatedOrOverflowingElements` / `overlappingLabels` / `zeroWidthSegments`

---

## 7. Zero-regression — Stats Centre

Przy dalszych pracach **nie wolno** zmieniać bez decyzji:

1. `StatsCentreView.tsx` (ten dokument — geometria plakatu / pigułki / eksport)
2. `statsCentreEngine.ts` (colorNorm, Per 90 TEAMS, filtrowanie fixture’ów, kary/TO)
3. `statsCentreI18n.ts` (słownik skrótów i pełnych nazw)

Dozwolone: Sync ETL, KB copy, Chart Studio (osobno zamrożone docs/03–06).
