# Moduł 4 — `FPL_PLANNER` · Inwentaryzacja techniczna

| Pole | Wartość |
|------|---------|
| Moduł | `FPL_PLANNER` — Interaktywny Planer Drużyny i Transferów |
| Wzorzec UX | [fpl.team/plan](https://fpl.team/plan/) (pitch + transfery + chipy) |
| Status | 🎯 **AKTYWNY CEL** (nowe okno) — kod jeszcze niezaimplementowany |
| Zero-Regression | Zakaz edycji zamrożonych widoków/silników Centre · Studio · Projections |

Powiązane: [`00-ACTIVE-ROADMAP.md`](./00-ACTIVE-ROADMAP.md) · [`01-ARCHITEKTURA-I-BAZA-DANYCH.md`](./01-ARCHITEKTURA-I-BAZA-DANYCH.md).

---

## 1. Endpointy FPL API — drużyna menedżera

Oficjalna baza: `https://fantasy.premierleague.com/api`.

| Endpoint | Potrzeba Planera | Stan w repo |
|----------|------------------|-------------|
| `GET /entry/{teamId}/` | Profil entry (nazwa, bank, overall rank, current event…) | **Brak** dedykowanego helpera Stats Lab |
| `GET /entry/{teamId}/event/{gw}/picks/` | Skład GW (15 picks, captain, vice, active chip, entry_history) | **Częściowo** — używany poza Stats Lab |
| `GET /entry/{teamId}/transfers/` | Historia transferów (cena in/out) | **Brak** |
| `GET /entry/{teamId}/history/` | Sezon: past/current, chips, chips history | **Brak** |

### 1.1 Istniejące wywołania `/entry/.../picks/` (do reuse / wzorca)

| Plik | Użycie |
|------|--------|
| `app/admin/actions/workspace.ts` | Sync punktów The FA League: `…/entry/${fplId}/event/${gameweek}/picks/` → `entry_history.points` / `event_transfers_cost` (tylko punkty net, **bez** listy `picks[]`) |
| `lib/no-big-six/actions.ts` | Sync No Big Six: ten sam endpoint → raw/penalty/official points |

Stałe bazowe:

- Stats Lab sync: `FPL_API_BASE` w `lib/stats-lab/syncEngine.ts`
- No Big Six: `FPL_BASE` w `lib/no-big-six/actions.ts`

### 1.2 Czego brakuje pod Planer (do zbudowania)

1. **Client/helper Stats Lab** (np. `lib/stats-lab/fplEntryApi.ts` lub server action `statsLabPlanner.ts`) z:
   - `fetchEntry(teamId)`
   - `fetchEntryPicks(teamId, gw)` — pełny payload `picks`, `entry_history`, `active_chip`
   - `fetchEntryTransfers(teamId)`
   - `fetchEntryHistory(teamId)`
2. Mapowanie `element` → `fpl_lab_players` (cena, status, klub, pozycja, zdjęcie).
3. Cache / rate-limit względem oficjalnego API (wzór jitter z `statsLabSync`).
4. UI input: ID drużyny FPL (Team ID) + opcjonalnie zapis w localStorage admina.

**Wniosek:** infrastruktura `fetch` do `/entry/.../picks/` istnieje w innych modułach produktu, ale **Stats Lab nie ma jeszcze warstwy Entry/Picks/Transfers/History** pod Planer.

---

## 2. Dane Supabase dostępne dla Planera

Cache RAM: `getCachedStatsLabDataset(seasonCode)` → `clubs`, `players`, `fixtures`, `playerGwHistory`.

### 2.1 `fpl_lab_players` (typ `FplLabPlayer` w `types.ts`) — już w cache

| Kolumna / pole | Dostępne? | Uwagi pod Planer |
|----------------|-----------|------------------|
| `fpl_element_id` | ✅ | ID do mapowania picks |
| `player_code` (`code`) | ✅ | Zdjęcia `/api/uploads/fpl-lab/player/...` |
| `web_name`, `first_name`, `second_name` | ✅ | Etykiety na pitchu |
| `element_type` | ✅ | GKP/DEF/MID/FWD |
| `fpl_team_id` (`team`) | ✅ | Klub + herb |
| `now_cost` | ✅ | Cena ×0.1 = £m |
| `status` | ✅ | `a`/`d`/`i`/`s`/`u`… |
| `selected_by_percent` | ✅ | Ownership |
| `total_points`, `event_points` | ✅ | Sezon / GW |
| `form`, `points_per_game` | ✅ | Szybkie rankingi |
| `transfers_in_event` / `transfers_out_event` | ✅ | Momentum transferów |
| `chance_of_playing_next_round` | ❌ | **Brak w typie/syncu** — do dodania z bootstrapu |
| `news` | ❌ | **Brak** — do dodania |
| `ep_next` / `ep_this` | ❌ | **Brak** — do dodania (przyda się przed Modułem 5) |

### 2.2 Pozostałe tabele

| Tabela | Przydatność Planera |
|--------|---------------------|
| `fpl_lab_clubs` | Herby, short_name, strength (kontekst FDR w planie) |
| `fpl_lab_fixtures` | Najbliższe GW przeciwnika dla każdego zawodnika w składzie |
| `fpl_lab_player_gw_history` | Forma / xGI / minuty pod ranking kandydatów na transfer |
| `fpl_lab_sync_meta` | Świeżość cen i statusów |

---

## 3. Biblioteki UI (`package.json`)

| Biblioteka | Zainstalowana? | Uwagi |
|------------|----------------|-------|
| `lucide-react` | ✅ `^1.27.0` | Ikony (już w Stats Lab) |
| `html-to-image` | ✅ | Eksport plakatów Planera (jak Centre/Studio) |
| `@dnd-kit/core` / `@dnd-kit/sortable` | ❌ | **Brak** |
| `framer-motion` | ❌ | **Brak** |
| `react-beautiful-dnd` / `@hello-pangea/dnd` | ❌ | **Brak** |

**Rekomendacja DnD dla Planera:**

1. **Faza 1 (zero nowych deps):** natywne HTML5 Drag & Drop **lub** Click-to-Swap (klik A → klik B) — spójne z AAA i łatwe w audycie DOM.
2. **Faza 2 (opcjonalnie):** dodać `@dnd-kit/*` dopiero jeśli Click-to-Swap okaże się niewystarczający na pitchu 15-osobowym.

Stack UI: React 18 + Next 14 + Tailwind CSS v3 (oficjalne opacity `/5`…`/95`).

---

## 4. Proponowana architektura wpięcia (bez naruszenia FROZEN)

### 4.1 Nowe pliki (zielone pole)

```
components/admin/stats-lab/
  StatsLabPlannerClient.tsx          # widok główny Planera
  planner/
    PlannerPitch.tsx                 # formacja 1–4–4–2 / bench
    PlannerTransferRail.tsx          # lista kandydatów / bank
    PlannerChipBar.tsx               # WC / BB / FH / TC
    PlannerWeekStrip.tsx             # GW timeline

lib/stats-lab/
  plannerEngine.ts                   # czysta logika: bank, FT, walidacja XI
  plannerI18n.ts                     # PL/EN
  fplEntryApi.ts                     # fetch entry/picks/transfers/history (server)

app/admin/actions/
  statsLabPlanner.ts                 # server actions + cache entry
```

### 4.2 Shell — 4. zakładka (minimalny diff)

W `StatsLabModuleShell.tsx` (dozwolone przy starcie Modułu 4):

1. Rozszerzyć `ModuleTab`: `"centre" | "studio" | "projections" | "planner"`.
2. Dodać przycisk nav: `📋 Planer FPL (Drużyna i Transfery)` / EN odpowiednik.
3. Keep-Alive: `visitedTabs.has("planner")` + `data-stats-lab-active-workspace` jak pozostałe.
4. **Nie** edytować treści `StatsCentreView` / `StatsLabStudioClient` / `StatsLabProjectionsClient`.
5. Baza Wiedzy: nowa sekcja „Moduł 4: Planer” w `knowledgeBaseContent.ts` (dozwolone).

### 4.3 Motywy i eksport

- Chrome przycisków: `getStatsLabMenuChrome(themeId)` — te same klasy co Centre/Studio/Projections.
- Eksport: para JPG + JSON z `inspectFullStatsLabPageDom` (PASS AAA).

### 4.4 MVP funkcjonalne (propozycja kolejności)

1. Input Team ID → fetch picks bieżącej/następnej GW.
2. Pitch 15 + captain/vice + bank + free transfers (z `entry` / `entry_history`).
3. Click-to-Swap / transfer out→in z walidacją budżetu i pozycji.
4. Strip GW z FDR z `fpl_lab_fixtures` (reuse Projections data, bez edycji silnika).
5. Eksport planu na X/Discord.

---

## 5. Luki danych do domknięcia przed / w trakcie MVP

| Luka | Priorytet | Działanie |
|------|-----------|-----------|
| Brak `chance_of_playing_next_round`, `news`, `ep_next` w `fpl_lab_players` | Wysoki | Migracja + sync bootstrap |
| Brak helperów `entry` / `transfers` / `history` | Krytyczny | Nowy `fplEntryApi` + server action |
| Brak biblioteki DnD | Niski | Start od Click-to-Swap |
| Brak zakładki shell | Krytyczny (UX) | Diff tylko w ModuleShell + nowy client |

---

## 6. Kontrakt Zero-Regression przy starcie implementacji

- Nie ruszać: `analyticsEngine`, `statsCentreEngine`, `projectionsEngine`, charts/*, Centre/Studio/Projections clients.
- Dozwolone: nowe pliki Planera, rozszerzenie shella o tab `planner`, opcjonalnie `knowledgeBaseContent.ts`, migracje kolumn gracza, nowe actions.
- Po każdym kroku UI: `npx tsc --noEmit` = 0 oraz audyt `totalIssuesCount: 0` w 3 motywach.
