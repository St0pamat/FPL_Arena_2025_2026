# Stats Lab — Silnik analityczny i metryki

| Pole | Wartość |
|------|---------|
| Zakres | Trzy zamrożone silniki + infrastruktura cache/audyt |
| Status | PASS AAA — Zero-Regression |

Powiązane: [`00-ACTIVE-ROADMAP.md`](./00-ACTIVE-ROADMAP.md) · [`01-ARCHITEKTURA-I-BAZA-DANYCH.md`](./01-ARCHITEKTURA-I-BAZA-DANYCH.md) · docs/03–08.

---

## 1. Mapa silników (FROZEN)

| Silnik | Plik | Konsument | Zakres |
|--------|------|-----------|--------|
| Chart Studio | `lib/stats-lab/analyticsEngine.ts` | Studio 6/6 | Percentyle, composite `OCENA`, Per 90, streaks, breakdown |
| Stats Centre | `lib/stats-lab/statsCentreEngine.ts` | Centre 13/13 | Tabele Players / Per GW / Teams, `colorNorm` P5–P95 |
| Projections | `lib/stats-lab/projectionsEngine.ts` | Predykcje 4/4 | Dixon-Coles, FDR, λ goli, CS%, karty meczowe |

**Wspólna zasada:** Studio i Centre stosują tę samą matematykę filtrów okresu / Per 90 / form / value / DC / transferów — użytkownik nie widzi rozjazdów przy zmianie zakładki.

---

## 2. Turbo-Cache a silniki

Silniki są **czyste** (bez I/O). Dane wejściowe:

1. Server action ładuje `getCachedStatsLabDataset(seasonCode)` z `serverDataCache.ts`.
2. Filtruje / mapuje do kontraktu silnika (np. `historyByPlayerId`, `historyXg`, fixtures).
3. Silnik zwraca wynik do klienta.

Invalidacja: fingerprint `fpl_lab_sync_meta` (`updated_at` + bootstrap/history stamps) — po syncu Stats Lab cache miss → świeże dane we wszystkich trzech zakładkach Keep-Alive.

Szczegóły cache: [`01-ARCHITEKTURA-I-BAZA-DANYCH.md`](./01-ARCHITEKTURA-I-BAZA-DANYCH.md) §2.

---

## 3. Keep-Alive a metryki UI

`StatsLabModuleShell` utrzymuje odwiedzone zakładki w DOM (`hidden` + `data-stats-lab-active-workspace`).

Wpływ na metryki jakości:

- brak utraty lokalnego stanu filtrów przy przełączaniu,
- `inspectFullStatsLabPageDom` liczy problemy **tylko** w aktywnym workspace (ukryte panele nie generują fałszywych overflowów).

---

## 4. Predykcje — kluczowe metryki (skrót)

| Metryka | Definicja |
|---------|-----------|
| `lambda_H` / `lambda_A` | Oczekiwane gole Dixona-Colesa (xG/xGC + prior `strength_*`) |
| `csProb` / `expectedCs` | P(CS) w skali **0…1** |
| `csPct` / `matchCsPct` | Ta sama wartość × 100 (**0…100**) do UI |
| FDR Overall / Attack / Defence | Lin-map trudności terminarza 1–5 |
| Top 3 exact scores | Najbardziej prawdopodobne wyniki z siatki DC |
| Zero-Data-Leakage | Dane po `deadline_time(GW_k)` nie wchodzą do modelu dla `GW_k` |

Pełna specyfikacja: [`08-PREDYKCJE-KLUBOW-I-FDR.md`](./08-PREDYKCJE-KLUBOW-I-FDR.md).

---

## 5. Baza Wiedzy a metryki

`knowledgeBaseContent.ts` opisuje prostym językiem:

- skalę P5–P95 / Per 90 (Centre),
- `OCENA` = średnia percentyli wybranych cech (Studio),
- DC FPL (DEF ≥10 CBI+TKL; MID/FWD ≥12 CBI+TKL+REC),
- FDR / prognozy / silnik Dixona-Colesa (Projections).

Modal: `StatsLabKnowledgeBaseModal` — globalny z shella.

---

## 6. Audyt metryk jakości (PASS AAA)

Każdy eksport JSON zawiera m.in.:

- `layoutDiagnostics` plakatu (`truncatedOrOverflowingElements`, `overlappingLabels`, `zeroWidthSegments`),
- `pageAndMenuDiagnostics` z `inspectFullStatsLabPageDom` (kontrast, theme mismatch, menu),
- dla Predykcji: `qaSelfCheck` silnika Dixona-Colesa.

Kontrakt zamrożenia: **`totalIssuesCount: 0`** w `ARENA_DARK`, `SCOUT_DARK`, `ANALYST_LIGHT`.
