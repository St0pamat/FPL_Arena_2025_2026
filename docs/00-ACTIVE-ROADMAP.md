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
| 1 | `CHART_STUDIO` | 7 wykresów (Stacked, Points, Streaks, Radar/Pizza, Scatter 2D, Heatmap, Diagram Venna) | ✅ **AKTYWNY** — stan po U8: [`stats-lab/stan-po-u8.md`](./stats-lab/stan-po-u8.md) |
| 2 | `STATS_CENTRE` | 13 widoków (Players 8 + Per GW + Teams 4) | ✅ **AKTYWNY** |
| 3 | `PROJECTIONS_CENTRE` | 4 widoki (FDR · Goals · CS% · Matchup Cards) | ✅ **AKTYWNY** |
| 4 | `FPL_PLANNER` | Interaktywny Planer Drużyny i Transferów | ✅ **AKTYWNY** (karta U6, panel admina U6b) |
| 5 | `PLAYER_PROJECTIONS` | Predykcje punktowe zawodników (`xMins`, `xPts`) | ⏭️ **KOLEJNY W KOLEJCE** |

---

## Zakres bez zmian

Właściciel odmroził cały Stats Lab (Centre, Studio, Predykcje, Planer). Bez zmian zostaje tylko „Baza i Synchronizacja FPL” (`/admin/stats-lab/sync`).

Wspólna infrastruktura shella (Keep-Alive, Baza Wiedzy, Turbo-Cache, audit DOM) jest opisana w [`01-ARCHITEKTURA-I-BAZA-DANYCH.md`](./01-ARCHITEKTURA-I-BAZA-DANYCH.md).

---

## Stan po U5c–U8

Opis kroków (karta Planera, zwijany panel, Studio, diagram Venna): [`stats-lab/stan-po-u8.md`](./stats-lab/stan-po-u8.md).
