# Stats Lab — UI Map (analiza repo, stan na 2026-11-13)

Dokument mapuje moduł Stats Lab (`/admin/stats-lab`, zakładki `planner` / `centre` / `studio` / `projections`) bez zmian w kodzie produkcyjnym. Jedyny nowy artefakt: ten plik.

---

## 1. Stack i komendy

| Warstwa | Wartość |
|--------|---------|
| Framework | **Next.js `^14.2.35`** — **App Router** (`app/`), nie Pages Router |
| React | **`^18.3.1`** (+ `react-dom`) |
| TypeScript | **`~5.7.2`** |
| Styling | **Tailwind CSS `^3.4.17`** + PostCSS + Autoprefixer; brak CSS Modules w Stats Lab; klasy utility + lokalne hex (`bg-[#070b14]` itd.) |
| Ikony / „UI kit” | **`lucide-react`** — brak shadcn/MUI/Chakra |
| Stan | **Lokalny React state** (`useState` / `useMemo` / `useTransition`) + **`localStorage`**; brak Redux/Zustand/Jotai |
| Backend danych | **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) — auth + tabele `fpl_lab_*` |
| Eksport obrazów | **`html-to-image`** (`toJpeg`) |
| Menedżer pakietów | **npm** (`package-lock.json`) |
| Legacy | Osobny tor Vite (`dev:arena` / `build:arena`) dla archiwum Areny — Stats Lab idzie przez Next |

### Komendy (`package.json`)

| Cel | Komenda |
|-----|---------|
| Dev | `npm run dev` (wrapper `scripts/dev-next.mjs`; `predev` sync public) |
| Dev strict | `npm run dev:strict` → `next dev` |
| Build | `npm run build` → `next build` |
| Start prod | `npm start` → `next start` |
| Lint | `npm run lint` → `eslint .` |
| Typecheck | `npm run typecheck` → `tsc --noEmit` (reguła projektu: też `npx tsc --noEmit`) |
| Format | `npm run format` (Prettier) |
| Test | **brak** skryptu `test` / `e2e` |

---

## 2. Komponenty UI — ścieżki, propsy, źródła danych

Wejście: `app/admin/(panel)/stats-lab/page.tsx` → `StatsLabModuleShell` → zakładki.

Górny shell: `components/admin/stats-lab/StatsLabModuleShell.tsx`  
Props: `bootstrap`, `initialResult`, `initialFilter`, `initialTab?`.  
Dane bootstrap/studio: Server Actions `loadStatsLabBootstrapDataAction` / `queryStatsLabComparisonAction` (`app/admin/actions/statsLabStudio.ts`).

### 2.1 Górny pasek Stats Lab

- **Plik:** `StatsLabModuleShell.tsx`
- Zakładki: Centre / Studio / Predykcje / Planer (`?tab=`).
- Chippy: PL/EN, Arena/Scout/Light, przycisk Bazy Wiedzy.
- Preferencje: `localStorage` (`fpl-arena-stats-lab-lang|theme` + klucze centre/studio) + event `fpl-stats-lab-theme-sync`.

### 2.2 Baza Wiedzy

- **UI:** `StatsLabKnowledgeBaseModal.tsx`
- **Treść:** `lib/stats-lab/knowledgeBaseContent.ts`
- Props: `open`, `lang`, `themeId`, `activeModuleTab`, `helpAnchor`, `onLangChange`, `onClose`.

### 2.3 Planer — orchestracja

- **Client:** `StatsLabPlannerClient.tsx`  
  Props: `seasonCode`, `lang`, `themeId`.  
  Payload: `queryStatsLabPlannerAction` / `loadPlannerTeamByIdAction` (`app/admin/actions/statsLabPlanner.ts`).  
  Drafty A/B/C + watchlist + team ID → **tylko `localStorage`**.
- **Silnik UI:** `evaluateRollingPlan` w `lib/stats-lab/plannerEngine.ts` (klient).

### 2.4 Kafelki KPI planera

- **Plik:** `planner/PlannerHeaderAndControls.tsx` (sekcja KPI)
- Props (fragment): `freeTransfers`, `freeTransfersSource`, `hitsCostPts`, `bankTenths`, `bankSource`, `grossXPts`, `netXPts`, `spendingPowerTenths`, handlery manual FT/bank.
- **Źródło wartości:** `activeGwState` z `evaluateRollingPlan` dla **bieżącej GW** (+ źródła z `entry` / override).
- Etykiety: Transfery, Koszt (Hity), W banku, Prognoza xPts + chip „Siła nabywcza”.

### 2.5 Pasek chipów + akcje

- Ten sam `PlannerHeaderAndControls.tsx`: WC / FH / BB / TC, Optymalizuj XI, Undo, Reset GW/plan, selektor metryki kafelka (`FIXTURES|XPTS|PRICES|FORM|DC`).
- Chip state: `GwPlanDecision.activeChip` w draftcie; dostępność z `entry.usedChips` + plan.

### 2.6 Warianty A/B/C + tabela porównania

- **UI:** `PlannerHeaderAndControls.tsx` (`draftSummaries`)
- **Agregacja:** `StatsLabPlannerClient.tsx` → `draftSummaries` = suma `grossXPts` / hitów po **wszystkich GW horyzontu**, FT = `ftAvailable` **ostatniej** GW, bank końcowy, chipy po GW.
- Dane per wariant: trzy niezależne `evaluateRollingPlan(...)`.

### 2.7 Kafelek zawodnika na boisku + ławka

- **Plik:** `planner/PlannerPitch.tsx`  
  Props: `themeId`, `lang`, `currentGw`, `availableGameweeks`, `squadPicks`, `playersById`, `projectionsByElement`, `tileMetric`, handlery swap/C/V/transfer/watchlist/SP, `activeChip`, `isExporting`.
- **Akcje:** `×` transfer out, `⇄` swap, `C`/`V` kapitan/vice, opaski `C`/`V`/`3×C`, `☆` watchlist, `ⓘ` modal.
- **Ławka:** sloty 12–15 (GKP + 1./2./3. REZ); te same kafelki.
- Dane: `squadPicks` ze stanu ewaluowanego + katalog/projekcje z payloadu.

### 2.8 Kolumna rynku (Zawodnicy / Ulubieni / Podsumowanie)

- **Plik:** `planner/PlannerMarketSidebar.tsx`  
  Props: katalog `players`/`clubs`, `projectionsByElement`, `squadPicks`, watchlist, pending OUT, budżet, `evaluatedGws`, wartości SP/CP, `onExecuteTransfer`, `onOpenPlayerInfo`, …
- Taby: `PLAYERS` | `WATCHLIST` | `SUMMARY`.
- Dane: ten sam payload planera; filtr/sort lokalny (xPts GW / 3GW, cena, TSB, forma, DC…).

### 2.9 Macierz wielokolejkowa (4 podzakładki)

- **Plik:** `planner/PlannerMultiGwTable.tsx`
- Metryki: `FIXTURE_XPTS` | `XPTS_HEATMAP` | `EXPECTED_MINS` | `PRICES_TABLE`.
- Dane: 15 picków × `availableGameweeks` × `projectionsByElement`.

### 2.10 Modal szczegółów zawodnika

- **Plik:** lokalny `PlayerInfoModal` w `PlannerPitch.tsx` (otwierany też z rynku/macierzy przez `onOpenPlayerInfo` → ten sam stan w pitchu / client).
- Pokazuje PP/CP/SP, źródło ceny, xPts v1, fixtury, opcjonalna korekta SP.

### 2.11 Komunikaty walidacji transferów

- Klucze: `PlannerValidationErrorKey` w `plannerEngine.ts`.
- Teksty: `plannerUi(...)` w `plannerI18n.ts`.
- Render: `PlannerHeaderAndControls` (`validationErrors` / `validationWarnings`).
- Część `warnings` z silnika jest **zahardkodowana po angielsku** (np. `"Captain has BGW."`, Free Hit rollback).

### 2.12 Eksport plakatu (Planer)

- `StatsLabPlannerClient.exportPair()`: `html-to-image` JPEG z `exportRef` (pitch + nagłówek plakatu) + `buildPlannerAiAuditReport` → `*-audit.json`.
- Studio/Centre/Projections: wspólny wzorzec `StatsLabExportBar` / lokalne eksporty + `auditExport.ts`.

### 2.13 Pozostałe zakładki

| Zakładka | Client | Engine / i18n | Dane |
|----------|--------|---------------|------|
| **Centre** | `StatsCentreView.tsx` (**FROZEN**) | `statsCentreEngine.ts`, `statsCentreI18n.ts` | bootstrap + lokalne filtry; tabele FFS-style |
| **Studio** | `StatsLabStudioClient.tsx` + charts (**FROZEN**) | `analyticsEngine.ts`, `i18n.ts`, `presets.ts` | `queryStatsLabComparisonAction` |
| **Predykcje / Terminarz** | `StatsLabProjectionsClient.tsx` | `projectionsEngine.ts`, `projectionsI18n.ts` | `queryStatsLabProjectionsAction` |
| **Sync** (osobna strona) | `StatsLabSyncClient.tsx` | `syncEngine.ts` | `app/admin/actions/statsLabSync.ts` → upsert DB |

Charts Studio (FROZEN): `PointsBreakdownChart`, `StreaksExplorerChart`, `StackedCompositeChart`, `RadarPizzaChart`, `RadarQuickSlotsBar`, `Scatter2DChart`, `HeatmapMatrixChart`.

---

## 3. i18n i wartości techniczne w UI

### Mechanizm

- **Brak** next-intl / react-i18next.
- Słowniki TypeScript:
  - wspólne: `lib/stats-lab/i18n.ts` (`StatsLabLang = "pl" | "en"`)
  - Planer: `plannerI18n.ts`
  - Centre: `statsCentreI18n.ts`
  - Projections: `projectionsI18n.ts`
  - Studio labels: `i18n.ts` + `VIZ_MODE_LABELS` / `PERIOD_LABELS`
  - Knowledge: `knowledgeBaseContent.ts`
- Wybór języka: shell → `localStorage` + props w dół.

### Teksty zahardkodowane / mieszane (Planer i shell — przykłady)

- Shell: emoji + `"📋 Planer FPL..."`, `"📚 Baza Wiedzy..."`, `"Arena"|"Scout"|"Light"`, `"🇵🇱 PL"`.
- Header: `"PREV"` / `"NEXT"`, kolumna `"Chips"`, `"xPts"`, `"FT"`, `"OK"`, `"−0.1m"` / `"+0.1m"`.
- Pitch: title `"Transfer out"|"Swap"|"Captain"|"Vice"`, `"Undo"`, `"BGW —"`, `"DGW"`, `"TSB:"`, `"DC Pkt:"`, `"● SP OK"`.
- Market/MultiGW: skróty `GKP/DEF/MID/FWD`, `WC/FH/BB/TC`, `PP/CP/SP`, `1. REZ`.
- Silnik → UI: angielskie `warnings` stringi z `evaluateRollingPlan`.
- Strona `stats-lab/page.tsx`: PL-only nagłówek „Stats Centre & Studio” (poza shellem PL/EN).

### Wartości techniczne trafiające do UI

| Miejsce | Co widać |
|---------|----------|
| KPI source badge | `api` / `derived` / `manual` → przetłumaczone przez `ui.valueSource`, ale enum w danych |
| Porównanie A/B/C | chipy jako `WC@GW12` (skrót enum `wildcard`→WC) |
| Ceny | etykiety **PP / CP / SP** (purchase / current / selling) |
| Chip keys | `wildcard`, `freehit`, `bboost`, `3xc` w stanie; UI mapuje na label |
| Metryki kafelka / macierzy | enumy `FIXTURES`, `XPTS_HEATMAP`, … czasem jako klucz w audit |
| Status zawodnika API | `status`, `chance_of_playing_next_round` → badge `25%`/`50%`… |
| FDR | poziomy `1..5` (liczba) na pillach |
| Audit JSON | pełne pola techniczne (`grossXPts`, `elementId`, `layoutDiagnostics`, …) |
| Centre | skróty kolumn `ST`, `DD`, `OWN%`, `DC Pkt`, klucze `LAST_6_GW` w filtrach |

---

## 4. Motywy i layout admina

### Motywy Stats Lab

Trzy ID: **`ARENA_DARK` | `SCOUT_DARK` | `ANALYST_LIGHT`**.

| Warstwa | Plik | Forma |
|---------|------|-------|
| Kolory canvas/wykresów | `components/admin/stats-lab/chartTheme.ts` | obiekty hex (`canvasBg`, `accent`…) |
| Tokeny kart/UI | `lib/stats-lab/themeTokens.ts` | **stringi klas Tailwind** (`page`, `card`, `accentText`…) |
| Chrome menu/paneli | `lib/stats-lab/menuChrome.ts` | klasy Tailwind per motyw |
| Shell root/nav | `StatsLabModuleShell.tsx` | funkcje `shellRootClass` / `shellNav*` |

**Nie ma** globalnych CSS variables typu `--arena-bg` dla tych trzech motywów — to TS tokeny + utility classes. Motyw nie jest w Tailwind `theme.extend.colors` jako named tokens.

### Sidebar / layout admina

- Layout: `app/admin/(panel)/layout.tsx` — `flex` + `AdminSidebar` + `children`.
- Sidebar: `components/admin/AdminSidebar.tsx` — **`w-64 shrink-0` na stałe**.
- **Brak** breakpointów `sm/md/lg` ukrywających sidebar, **brak** hamburgera / off-canvas / drawer.
- Na wąskim viewportcie sidebar + content stoją obok siebie (ryzyko ciasnoty).
- Nawigacja projektów: wspólna dla The FA League / No Big Six / Stats Lab (`lib/admin/navigation.ts` → `ADMIN_PROJECTS`).

---

## 5. Testy i CI

| Rodzaj | Status |
|--------|--------|
| Unit / komponentowe | **Brak** plików `*.test.*` / `*.spec.*`, brak Vitest/Jest |
| e2e / Playwright / Cypress | **Brak** konfiguracji i skryptów |
| Visual regression | **Brak** |
| axe-core / a11y automated | **Brak** |
| CI (`.github/workflows`) | **Brak** w repo |
| QA wbudowane | `runProjectionsEngineQaSelfCheck()` w `projectionsEngine.ts` (self-check silnika, nie test runner) |
| „Audit” DOM | `audit.json` / `layoutDiagnostics` przy eksporcie (manual/dev workflow, nie CI) |

Uruchomienie testów: **nie dotyczy** — nie ma komendy. Najbliższy gate: `npm run typecheck` / `npx tsc --noEmit`, `npm run lint`.

---

## 6. Reguły agenta (`.cursor/rules`, `AGENTS.md`, `.cursorrules`)

- **`AGENTS.md`:** brak  
- **`.cursorrules`:** brak  
- **`.cursor/rules/`:** 2 pliki

### 6.1 `fpl-arena-standards.mdc` (`alwaysApply: true`)

1. **Zero-regression FROZEN:** `CHART_STUDIO` (6 widoków + RadarQuickSlotsBar) oraz `STATS_CENTRE` (`StatsCentreView`, `statsCentreEngine`, `statsCentreI18n`) — bez edycji bez jawnego polecenia.
2. **Tailwind v3 opacity:** tylko oficjalne kroki (`/5`…`/95`); zakaz `/35`, `/45`.
3. Zakaz `truncate` / `text-ellipsis` na nazwiskach/klubach na plakatach.
4. Kontrast 3 motywów × PL/EN; media przez `/api/uploads/fpl-lab/player|badge/...` + `crossOrigin="anonymous"`.
5. Eksport: `layoutDiagnostics` puste listy; na końcu zadania **`npx tsc --noEmit` = 0 błędów**.

### 6.2 `player-identity-design.mdc` (Na Minusie, nie Stats Lab)

SSOT: `lib/na-minusie/playerIdentityStyles.ts` — kolory Discord Club / FPL Manager / FPL Team / Discord Name; zakaz lokalnego hardkodu tożsamości.

---

## 7. Warstwa obliczeń

Logika jest w **czystych funkcjach TS** (bez JSX). JSX tylko konsumuje wyniki.

| Metryka | Plik | Funkcja / wzór (skrót) |
|---------|------|-------------------------|
| **λ home/away** | `lib/stats-lab/projectionsEngine.ts` | `predictFixture`: `λH = clamp(μH · aH · dA)`, `λA = clamp(μA · aA · dH)` |
| **csProb** | tamże | `csProbHome = exp(−λAway)`, `csProbAway = exp(−λHome)` |
| **Top 3 wyniki** | `buildDixonColesGrid` | siatka DC → sort po `p` → top 3 `scoreLabel` |
| **FDR** | `computeFdrBundle` + `fdrLevel` | attack/defence/overall ∈ [0,100] → level 1–5 |
| **xPts v1 zawodnika** | `plannerEngine.ts` | `computeMatchXPts` (minuty, shrink Per90, share × λ, CS/GC/saves/DC/bonus/cards) → `projectPlayerGw` (suma meczów GW) |
| **sellingPrice / purchasePrice** | `fplEntryApi.ts` | `computeSellingPriceTenths`: zysk floor((now−pur)/2); spadek = now; PP z historii transferów / summary / demo |
| **FT** | `evaluateRollingPlan` | hit: `hits = max(0, T−FT)`, koszt `×4`; next: `min(5, max(0,FT−T)+1)`; WC/FH: FT bez +1 |
| **Suma xPts A/B/C** | `StatsLabPlannerClient` `draftSummaries` | `Σ grossXPts` po GW horyzontu |
| **KPI Transfery/Koszt/Bank/Prognoza** | ten sam client → header | **tylko bieżąca GW:** `ftAvailable`, `transferCostPts`, `bankTenths`, `grossXPts`/`netXPts` |
| **Team GW xPts** | `computeTeamGwXPts` | XI sum + bonus kapitana `(m−1)·C + (m−1)·p0(C)·VC` (`m=2|3`) + bench jeśli BB − hity |

Horyzont: `planningHorizon` w `statsLabPlanner.ts` — od `lastFinishedGw+1`, span domyślnie **11** (clamp 8–15) → typowo **~12 GW** włącznie.

---

## 8. Skąd `836.7 xPts` i `FT 5` vs KPI `70.0` / `2 FT`?

To **dwa różne agregaty**, nie bug arytmetyki jednej komórki.

### Prognoza

| UI | Pole | Zakres |
|----|------|--------|
| Kafelek KPI „Prognoza xPts” | `activeGwState.grossXPts` | **1 kolejka** (bieżąca) |
| Tabela Porównaj A/B/C | `totalGrossXPts` | **suma `grossXPts` wszystkich GW** w `[planningStartGw, planningEndGw]` |

Przy ~12 GW i ~70 xPts/GW: `12 × ~70 ≈ 840` → rząd wielkości **836.7** jest zgodny.

**Wzór `grossXPts` (nie jest sumą 15):**

```
gross = Σ_{slot 1..11} xPts(i)
      + (mult−1)·xPts(C) + (mult−1)·p0(C)·xPts(VC)   // mult=2 lub 3 (TC)
      + (BB ? Σ_{slot 12..15} xPts(j) : 0)
net   = gross − transferCostPts   // 0 przy WC/FH
```

→ **`70.0` = XI + bonus kapitana (+ ławka tylko przy Bench Boost), nie suma całej 15.**

### FT

| UI | Pole | Znaczenie |
|----|------|-----------|
| KPI „Transfery” | `ftAvailable` **bieżącej** GW | np. start **2** (demo / entry) |
| Porównanie A/B/C | `last.ftAvailable` | FT **na ostatniej** GW horyzontu po rollu |

Roll (bez transferów, bez WC/FH): każdy tydzień `FT' = min(5, FT+1)` → po kilku GW **FT 5**.

Kod:

- KPI: `PlannerHeaderAndControls` ← props z `activeGwState`
- Compare: `draftSummaries` w `StatsLabPlannerClient.tsx` (~linie 401–421)
- Team pts: `computeTeamGwXPts` (`plannerEngine.ts`)
- FT roll: `evaluateRollingPlan` R7/R8/R9

---

## 9. Czy Planer zapisuje do Supabase?

**Nie.** Planer **nie** robi `insert` / `update` / `upsert` / `rpc` dla draftów, transferów ani override’ów.

| Operacja | Gdzie | Zapis? |
|----------|-------|--------|
| `queryStatsLabPlannerAction` / `loadPlannerTeamByIdAction` | `statsLabPlanner.ts` | tylko `auth.getUser` + **SELECT** datasetu (`serverDataCache`) |
| Drafty A/B/C, overrides, team ID, watchlist | `StatsLabPlannerClient` | **`localStorage`** |
| Entry FPL | `fplEntryApi.reconstructFplEntryState` | fetch **zewnętrznego** FPL API (nie zapis do Supabase) |
| Demo | `buildDemoEntryState` | in-memory |

Zapisy `fpl_lab_*` są w **Sync** (`statsLabSync.ts`: upsert clubs/players/fixtures/history/meta) — poza UI Planera.

---

## 10. Ryzyka i dług techniczny (krótko)

1. **KPI vs Compare** — łatwo mylić sumę horyzontu z xPts jednej GW (to §8).
2. **Brak testów / CI** — regresje silnika i UI niewykrywalne automatycznie.
3. **FROZEN Centre/Studio** vs żywy Planer — rozjazd konwencji i18n/export.
4. **Sidebar bez mobile** — wspólny layout psuje wąskie ekrany całego `/admin`.
5. **Stan tylko w `localStorage`** — brak sync między urządzeniami; kolizje kluczy watchlist Centre↔Planer.
6. **Warnings EN w silniku** — dziury i18n.
7. **Hardcoded UI strings** obok `plannerI18n` — dryf PL/EN.
8. **Zależność od żywego FPL API** przy Team ID — flaky e2e/prod; demo jako fallback.
9. **`StatsLabPlannerClient` monolityczny** — orkiestracja + export + drafty w jednym pliku.
10. **Nav Stats Lab** w sidebarze nie linkuje bezpośrednio Planera/Predykcji (tylko centre/studio/sync) — odkrywalność.
11. **Opacity / kontrast** — reguły AAA, ale dużo lokalnych hex; ryzyko regresji wizualnych bez visual tests.
12. **page.tsx** nie ustawia `initialTab=planner` z `searchParams` (shell i tak czyta `?tab=` po stronie klienta).

---

## 11. E2E Planera — auth, mocki, tryb deweloperski

### Auth dziś

- Cookie sesji **Supabase Auth** (`middleware.ts` + `app/admin/(panel)/layout.tsx` → redirect `/admin/login`).
- Login: `LoginForm` → `supabase.auth.signInWithPassword` (client) lub zapasowa `loginAction`.
- **Brak** Playwright `storageState`, seed usera w repo, mock auth middleware.

### Jak Playwright *mógłby* wejść (rekomendacja, nie zaimplementowane)

1. **storageState:** one-time login UI → zapisz cookies Supabase → `storageState` w projekcie.
2. **API setup:** `signInWithPassword` w `globalSetup` przeciw temu samemu projektowi Supabase (wymaga test usera w env).
3. **Mock auth:** testowy bypass w middleware tylko przy `E2E_AUTH_BYPASS` — **nie istnieje** obecnie.

### Dane zamiast prawdziwego FPL API

| Mechanizm | Status |
|-----------|--------|
| **Demo Squad** | **Tak** — `buildDemoEntryState` / przycisk „Skład Demo”; bez Team ID |
| Fixture/katalog z DB | Tak — synced `fpl_lab_*` (nie mock) |
| MSW / mock `fetch` entry | **Nie** w repo |
| Flaga env „offline planner” | **Nie** |

Praktyczny tor e2e bez FPL API: zalogowany admin + Demo Squad + zsynchronizowana baza lab.

### Flagi / eksport JSON

- Eksport Planera **zawsze** zrzuca JPEG + **`*-audit.json`** (`buildPlannerAiAuditReport`) — nie ma osobnej flagi „dev only”.
- Studio/Centre: przyciski audit w `StatsLabExportBar`.
- Brak `NEXT_PUBLIC_STATS_LAB_DEV` / podobnej flagi pod Planer.

---

## 12. Sidebar wspólny; DD i ST; ograniczenie mobile tylko do Stats Lab

### Wspólny layout

Tak — **jeden** `AdminSidebar` + `(panel)/layout.tsx` dla The FA League, No Big Six i Stats Lab.

### Jak ograniczyć hamburger/off-canvas tylko do `/admin/stats-lab`

Opcje (bez implementacji teraz):

1. **Conditional w `AdminSidebar`:** `pathname.startsWith("/admin/stats-lab")` → mobile drawer; pozostałe ścieżki bez zmian.
2. **Własny layout route group:** np. `app/admin/(panel)/stats-lab/layout.tsx` z lokalnym chrome i ukryciem sidebara (`md:hidden` na rodzicu tylko w tej gałęzi) — wymaga ostrożnego nested layout, żeby nie zdublować auth.
3. **Prop / context z layoutu stats-lab** — kruche przy współdzielonym aside.

Najbezpieczniej zero-regression: warunek po `pathname` **wewnątrz** `AdminSidebar` (lub cienki wrapper), bez ruszania nawigacji FA League / No Big Six.

### Kolumny DD i ST (Stats Centre)

Z `statsCentreI18n.ts` + agregacji w `statsCentreEngine.ts`:

| Skrót | Klucz | Znaczenie |
|-------|-------|-----------|
| **ST** | `starts` | **Starty** — mecz liczy się jako start, gdy `starts > 0` **lub** `minutes ≥ 60` |
| **DD** | `dd_hauls` | **DD Hauls (≥10 pkt)** — liczba meczów z `total_points ≥ 10` („double-digit haul”) |

---

## Szybka mapa plików (Planer)

```
app/admin/(panel)/stats-lab/page.tsx
app/admin/actions/statsLabPlanner.ts
components/admin/stats-lab/StatsLabModuleShell.tsx
components/admin/stats-lab/StatsLabPlannerClient.tsx
components/admin/stats-lab/planner/PlannerHeaderAndControls.tsx
components/admin/stats-lab/planner/PlannerPitch.tsx
components/admin/stats-lab/planner/PlannerMarketSidebar.tsx
components/admin/stats-lab/planner/PlannerMultiGwTable.tsx
lib/stats-lab/plannerEngine.ts
lib/stats-lab/plannerI18n.ts
lib/stats-lab/fplEntryApi.ts
lib/stats-lab/projectionsEngine.ts
lib/stats-lab/themeTokens.ts / menuChrome.ts / auditExport.ts
```

---

## Pytania do Product / Owner

1. Czy w porównaniu A/B/C wolisz **sumę horyzontu**, **średnią / GW**, czy **netto po hitach** — i czy KPI mają dostać drugi wiersz „Σ planu”?
2. Czy FT w tabeli porównania ma pokazywać FT **bieżącej** GW (jak KPI), FT **na końcu** planu, czy obie kolumny?
3. Czy Planer ma kiedykolwiek **persystować drafty w Supabase**, czy `localStorage` zostaje SSOT?
4. Czy e2e mają iść na **Demo Squad + seed DB**, czy na **fixture’ach MSW** odcinających FPL API i ewentualnie Supabase?
5. Czy mobile hamburger ma wejść **tylko** w Stats Lab, czy od razu w całym `/admin`?
6. Czy zamrażamy też Planer po AAA, czy Centre/Studio mają dostać wyjątek od FROZEN na i18n skrótów (DD/ST)?
7. Czy nagłówek strony `Stats Centre & Studio` ma zostać ujednolicony z 4 zakładkami (w tym Planer/Predykcje) i PL/EN?
8. Czy warningi z `evaluateRollingPlan` mają wejść do `plannerI18n` w tej samej iteracji co UI polish?

