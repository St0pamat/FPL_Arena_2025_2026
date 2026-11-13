# Stats Lab — Active Roadmap

| Pole | Wartość |
|------|---------|
| Produkt | FPL Arena · Stats Lab (`/admin/stats-lab`) |
| Data zamknięcia etapu 1–3 | 2026-11-13 |
| Status QA | **PASS AAA** — `totalIssuesCount: 0` (ARENA_DARK · SCOUT_DARK · ANALYST_LIGHT) |

Powiązane: [`01-ARCHITEKTURA-I-BAZA-DANYCH.md`](./01-ARCHITEKTURA-I-BAZA-DANYCH.md) · [`02-SILNIK-ANALITYCZNY-I-METRYKI.md`](./02-SILNIK-ANALITYCZNY-I-METRYKI.md) · docs/03–08 · [`09-PLANER-FPL-TEAM.md`](./09-PLANER-FPL-TEAM.md).

---

## Moduły Stats Lab

| # | Moduł | Zakres | Status |
|---|--------|--------|--------|
| 1 | `CHART_STUDIO` | 6/6 wykresów (Stacked, Points, Streaks, Radar/Pizza, Scatter 2D, Heatmap) | ✅ **UKOŃCZONY I ZAMROŻONY (PASS AAA)** |
| 2 | `STATS_CENTRE` | 13/13 widoków (Players 8 + Per GW + Teams 4) | ✅ **UKOŃCZONY I ZAMROŻONY (PASS AAA)** |
| 3 | `PROJECTIONS_CENTRE` | 4/4 widoki (FDR · Goals · CS% · Matchup Cards) | ✅ **UKOŃCZONY I ZAMROŻONY (PASS AAA)** |
| 4 | `FPL_PLANNER` | Interaktywny Planer Drużyny i Transferów (wzorowany na `fpl.team/plan/`) | 🎯 **AKTYWNY CEL W NOWYM OKNIE** |
| 5 | `PLAYER_PROJECTIONS` | Predykcje punktowe zawodników (`xMins`, `xPts`) | ⏭️ **KOLEJNY W KOLEJCE** |

---

## Zero-Regression (FROZEN)

Bez jawnego polecenia użytkownika **zakaz** modyfikacji:

| Moduł | Pliki / katalogi |
|-------|------------------|
| Chart Studio | `components/admin/stats-lab/charts/*`, `RadarQuickSlotsBar.tsx`, `StatsLabChartCanvas.tsx`, `StatsLabStudioClient.tsx`, `StatsLabControlPanel.tsx`, `lib/stats-lab/analyticsEngine.ts` |
| Stats Centre | `StatsCentreView.tsx`, `lib/stats-lab/statsCentreEngine.ts`, `statsCentreI18n.ts` |
| Projections | `StatsLabProjectionsClient.tsx`, `lib/stats-lab/projectionsEngine.ts`, `projectionsI18n.ts` |

Wspólna infrastruktura shella (Keep-Alive, Baza Wiedzy, Turbo-Cache, audit DOM) jest opisana w [`01-ARCHITEKTURA-I-BAZA-DANYCH.md`](./01-ARCHITEKTURA-I-BAZA-DANYCH.md) — zmiany tylko przy nowym module, **bez regresji** trzech zamrożonych zakładek.

---

## Następny krok produktowy

1. **Nowe okno / wątek:** projektowanie i implementacja **Modułu 4 — `FPL_PLANNER`** (patrz [`09-PLANER-FPL-TEAM.md`](./09-PLANER-FPL-TEAM.md)).
2. Wpięcie 4. zakładki w `StatsLabModuleShell.tsx` **bez** edycji zamrożonych widoków 1–3.
3. Dopiero po stabilizacji Planera — Moduł 5 `PLAYER_PROJECTIONS`.
