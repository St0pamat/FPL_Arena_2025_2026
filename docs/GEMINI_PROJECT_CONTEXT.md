# FPL Arena / Na Minusie ™ — pełny kontekst projektu (handoff dla AI)

> **Wersja:** 3.0  
> **Data:** 18 sierpnia 2026  
> **Repozytorium:** `St0pamat/FPL_Arena_2025_2026` (lokalnie: `fpl-arena-skarb-kibica`)  
> **Produkcja:** VPS `/var/www/fpl-tracker`, PM2 `na-minusie`  
> **Powiązany dokument:** `docs/NA_MINUSIE_TECHNICAL.md` (szczegóły algorytmów — ten plik jest **supersetem** + instrukcją operacyjną)

---

## Jak używać tego dokumentu w nowym wątku (Gemini / inny AI)

1. Wklej **cały ten plik** jako pierwszą wiadomość systemową lub kontekst projektu.
2. Do zadań kodowych podawaj ścieżki plików z sekcji [Mapa plików](#mapa-plików).
3. **Źródło prawdy algorytmów:** `lib/admin/*.ts`, `lib/public/*.ts` — dokument może być nieco za dokumentacją kodu.
4. **Źródło prawdy schematu DB:** `supabase/schema.sql` + `supabase/migrations/*.sql`.
5. Przed zmianami w Discord/webhookach sprawdź migrację `add_discord_webhooks_server_target.sql`.
6. Nie commituj bez prośby użytkownika. Hard Reset nie kasuje `discord_webhooks` ani Auth.

---

## 1. Executive summary — co to jest

**Monorepo** łączące dwa produkty:

| Produkt | Trasa | Rola |
|---------|-------|------|
| **FPL Arena** | `/arena` | Legacy archiwum (Vite SPA w `src/`) — Skarb Kibica, sezon 2025/26 |
| **Na Minusie ™** | `/na-minusie`, `/strefa-gracza`, `/admin/*` | Aktywna liga H2H FPL z systemem **Mediana 2+1** |

**Stack:** Next.js 14 App Router + Supabase (Postgres + Auth + RLS) + Tailwind + Server Actions.

**Właściciele produktu:**
- **Baldwiniasty** — społeczność Discord, klimat ligi
- **St0pa** — architekt systemu, kod, logistyka, VPS

**Rdzeń biznesowy:** Liga H2H w piramidzie angielskiej (Premier League → National League). Każda dywizja = **dokładnie 10 graczy**. Rok FPL (GW1–38) = **2 sezony ligowe** (jesień GW1–18 + baraż GW19; wiosna GW20–37 + baraż GW38). Punktacja: H2H (2/1/0) + bonus mediany (+1 za górną połowę wyników FPL w kolejce).

---

## 2. Architektura techniczna

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Next.js 14 — jedyny serwer produkcyjny               │
│  /  splash  ·  /arena  ·  /na-minusie  ·  /strefa-gracza  ·  /admin/*  │
│  /api/uploads/*  ·  middleware.ts (Supabase session)                    │
├──────────────────────────────┬──────────────────────────────────────────┤
│ Legacy Vite (`src/`)         │ Na Minusie (`app/`, `components/`, `lib/`) │
│ alias webpack `@arena`       │ Supabase Server Actions + RLS              │
└──────────────────────────────┴──────────────────────────────────────────┘
                                    │
                                    ▼
                         Supabase (Postgres + Auth)
```

### Warstwy kodu Na Minusie

| Warstwa | Ścieżka | Odpowiedzialność |
|---------|---------|------------------|
| Routing RSC | `app/` | Strony, layouty, metadata |
| UI | `components/na-minusie/`, `components/admin/` | Widoki, eksport PNG, formularze |
| **Silniki (czysta logika)** | `lib/admin/`, `lib/public/` | Algorytmy bez I/O — testowalne, współdzielone |
| I/O | `app/admin/actions/`, `lib/public/actions.ts` | Server Actions, Supabase |
| Konfiguracja produktu | `lib/na-minusie/` | Nawigacja, regulamin, linki, branding |
| Schema | `supabase/schema.sql`, `supabase/migrations/` | Baza danych |

### Kluczowa decyzja architektoniczna: brudnopis vs publikacja

Wyniki H2H i FA Ranking żyją w tych samych tabelach. Publiczność widzi tylko wiersze z `is_published = true`. RLS wymusza to dla roli `anon`. Admin (`authenticated`) widzi wszystko.

**Po co:** Operator może wkleić wyniki FPL, skorygować, wygenerować PNG w Content Hub z draftu, dopiero potem opublikować.

---

## 3. Stos technologiczny i konfiguracja

### Zależności (`package.json`)

- **next** ^14.2.35, **react** 18, **tailwindcss** 3
- **@supabase/ssr**, **@supabase/supabase-js**
- **html-to-image** — eksport PNG (Content Hub, dywizje)
- **papaparse** — CSV (Google Sheets, Master Import)
- **lucide-react** — ikony

### Skrypty

| Komenda | Działanie |
|---------|-----------|
| `npm run dev` | Dev Next (`scripts/dev-next.mjs`, predev sync public) |
| `npm run build` / `npm start` | Produkcja |
| `npm run dev:arena` | Legacy Vite Arena |

### Zmienne środowiskowe

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Admin działa na sesji Supabase Auth + RLS `authenticated`. Brak osobnego REST API ligi.

### `next.config.mjs` — świadome ustawienia

- `serverActions.bodySizeLimit: "25mb"` — duże payloady (historycznie Discord przez server; teraz głównie client-side)
- `typescript.ignoreBuildErrors: true` — legacy `src/` ma luźniejsze typy
- Dev: `webpack cache = false` — OneDrive + znaki w ścieżce psują cache
- Dev: `NODE_TLS_REJECT_UNAUTHORIZED=0` — antywirus na Windows
- Rewrites: `/uploads/logos/*`, `/tier-logos/*` → API stream z dysku (upload po buildzie)

### Fonty (`app/layout.tsx`)

- **Inter** — body
- **Oswald** — nagłówki athletic (FPL ARENA splash)
- **Anton** — tagline splash „TWÓJ SKŁAD. NASZA ARENA.”

### Wdrożenie produkcyjne

```bash
cd /var/www/fpl-tracker
git pull origin main
npm run build
pm2 restart na-minusie
```

Uploady logo: `public/uploads/logos/`, `public/uploads/tier-logos/` — poza gitem.

---

## 4. Routing — mapa URL

### Publiczne

| URL | Opis |
|-----|------|
| `/` | Splash portal: FPL ARENA lockup + karty Arena / Na Minusie |
| `/arena` | Legacy FPL Arena (Vite) |
| `/na-minusie` | Landing ligi (rekrutacja zamknięta w UI) |
| `/na-minusie/dywizje` | Oficjalna struktura dywizji + eksport PNG |
| `/na-minusie/regulamin` | Regulamin (`lib/na-minusie/regulaminContent.ts`) |
| `/na-minusie/hub` | Alias → Strefa Gracza |
| `/strefa-gracza` | Hub: tabela, wyniki, terminarz, statystyki, uczestnicy, podsumowanie, FA Ranking |
| `/strefa-gracza/[teamId]` | Profil menedżera |
| `/strefa-gracza/rekordy` | Rekordy / pantheon |

### Admin (wymaga Supabase Auth)

| URL | Moduł |
|-----|-------|
| `/admin/login` | Logowanie |
| `/admin/dashboard` | Podsumowanie, alerty niepełnych dywizji |
| `/admin/struktura` | Sezony, piramidy, dywizje |
| `/admin/players` | Baza graczy, Master Import Excel |
| `/admin/workspace` | **Edytor kolejek** — wklejka FPL, publikacja, baraże |
| `/admin/content-hub` | PNG, X.com, Discord |
| `/admin/webhooks` | **Webhooki Discord** (2 serwery) |
| `/admin/season-transition` | Rozliczenie + Draft Board + nowy sezon |
| `/admin/tier-logos`, `/admin/logos` | Assety |
| `/admin/simulator` | Sandbox fikcyjnych GW |
| `/admin/settings` | Danger Zone (Hard Reset) |

Nawigacja kanoniczna: `lib/admin/navigation.ts`.

### Middleware (`middleware.ts`)

- `/admin` bez sesji → login
- `/admin` z sesją → dashboard
- Odświeżanie cookies Supabase SSR

---

## 5. Strona główna `/` — splash portal

**Komponent:** `components/platform/SplashBrandLockup.tsx` + `app/page.tsx`

**Layout lockupu:**
- Po **lewej:** duże logo FPL Arena (`ARENA_PORTAL_LOGO`)
- Po **prawej:** dwa wiersze w **wysokości logo** (napisy nie wychodzą poza górną/dolną krawędź herbu):
  - **FPL ARENA** — Oswald, bold; rozmiar dopasowywany JS (binary search) do szerokości tagline
  - **TWÓJ SKŁAD. NASZA ARENA.** — Anton, uppercase, mniejszy, z **kropką na końcu**

**CSS:** `app/globals.css` — klasy `.splash-brand`, `.splash-brand-logo`, `.splash-brand-title`, `.splash-brand-tagline`

**Karty portalu:** `PortalCard` — Igrzyska Kapci Kłapcia (zamknięte) + Na Minusie ™ (aktualne).

---

## 6. Model danych Supabase

Kanoniczny dump: `supabase/schema.sql`. Migracje przyrostowe w `supabase/migrations/`.

### Diagram relacji

```
admin_users → auth.users
pyramids 1──* divisions *──1 seasons
divisions 1──* teams
seasons 1──* fixtures
divisions 1──* fixtures
teams 1──* fixtures (home/away)
seasons 1──* team_gameweek_scores *──1 teams
discord_webhooks  (BEZ FK do seasons — celowo trwałe)
```

### Tabela `seasons`

| Kolumna | Znaczenie |
|---------|-----------|
| `name` | Np. „Sezon 1 (Jesień 2026/27)” — **faza wykrywana z nazwy** (AUTUMN/SPRING) |
| `status` | `DRAFT` \| `PUBLISHED` |
| `is_completed` | Baraże skończone → publiczne Podsumowanie |
| `is_archived` | Sezon spakowany, gracze w nowym sezonie |
| `fa_ranking_webhook_url`, `fa_cup_webhook_url` | **Legacy** — kanon: tabela `discord_webhooks` |

### Tabela `divisions`

| Kolumna | Znaczenie |
|---------|-----------|
| `tier` | 1 = elita; UNIQUE `(season_id, pyramid_id, tier)` |
| `discord_webhook_url` | **Legacy** — kanon: `discord_webhooks.division_level = tier` |

### Tabela `teams`

Pola z Excela: `manager_name`, `discord_nick`, `discord_id`, `fpl_id` (TEXT!), `fpl_team_name`, `chosen_club`, `fee_paid`, `is_active`, `status`, `x_com`, `email`, `previous_season_or`.

`division_id` NULL = pula przed losowaniem. Po archiwizacji sezonu wskazuje **nową** dywizję — skład historyczny odtwarza się z `fixtures`.

### Tabela `fixtures`

| Kolumna | Znaczenie |
|---------|-----------|
| `home_*` / `away_*` | FPL, H2H (0\|1\|2), mediana (0\|1) |
| `is_finished`, `is_published` | Rozliczenie / widoczność publiczna |
| `is_playoff` | Baraż — **nie liczy się do tabeli fazy zasadniczej** |
| `tiebreaker_*` | Gole XI, stracone, ławka, zwycięzca, metoda, powód |

Baraż cross-division: fixture przypięty do `division_id` **wyższej** ligi (gospodarz = 8. miejsce).

### Tabela `team_gameweek_scores`

**Źródło prawdy The FA Ranking.** Jedna wartość FPL na `(season_id, team_id, gameweek)`.

**Po co osobna tabela:** W GW19/GW38 większość graczy nie ma meczu H2H — i tak zdobywają punkty FPL. Fixtures tego nie pokrywają.

### Tabela `discord_webhooks` (trwała — Hard Reset NIE kasuje)

| Kolumna | Znaczenie |
|---------|-----------|
| `scope` | `GLOBAL` \| `DIVISION` |
| `global_type` | `FA_RANKING` \| `FA_CUP` (tylko GLOBAL) |
| `division_level` | tier 1, 2, … (tylko DIVISION) |
| **`server_target`** | **`NA_MINUSIE` \| `FPL_ARENA`** |
| `url` | Discord webhook URL |

**Unique index:**
- GLOBAL: `(global_type, server_target)`
- DIVISION: `(division_level, server_target)`

**Dwa serwery Discord (backup / polisa ubezpieczeniowa):**
- **NA_MINUSIE** — serwer ligi live (Baldwiniasty / Na Minusie)
- **FPL_ARENA** — ukryty serwer backup St0py — ta sama architektura kanałów (5 dywizji + 2 globalne), osobne URL-e

Migracja: `supabase/migrations/add_discord_webhooks_server_target.sql`

Funkcje publiczne `has_division_discord_webhook`, `has_global_discord_webhook` — sprawdzają **tylko NA_MINUSIE** (bez ujawniania URL).

### RLS — skrót

| Tabela | anon (kibic) | authenticated (admin) |
|--------|--------------|------------------------|
| pyramids, seasons, divisions, teams | SELECT | ALL |
| fixtures, team_gameweek_scores | SELECT tylko `is_published=true` | ALL |
| discord_webhooks | brak | ALL |

### Lista migracji

1. `add_x_com_to_teams.sql`
2. `add_season_global_webhooks.sql` (legacy kolumny na seasons)
3. `add_team_gameweek_scores.sql`
4. `add_discord_webhooks.sql`
5. **`add_discord_webhooks_server_target.sql`** ← wymagana dla dual-server

---

## 7. Kalendarz sezonu (`lib/public/season.ts`)

| Stała | Wartość |
|-------|---------|
| Jesień faza zasadnicza | GW 1–18 |
| Jesień baraż | GW 19 |
| Wiosna faza zasadnicza | GW 20–37 |
| Wiosna baraż | GW 38 |

`resolveSeasonPhase(name)` — regex na `wiosna|spring|gw20|sezon 2`; inaczej AUTUMN. **Nazwa sezonu w panelu musi zawierać fazę.**

---

## 8. Reguła 10 graczy (`lib/admin/divisionCapacity.ts`)

`DIVISION_CAPACITY = 10`.

Pełna dywizja wymagana do: Berger, publikacji, symulatora, rozliczenia EoS.

Niepełne dywizje: rekrutacja / poczekalnia. **Strefa Gracza ukrywa** niepełne w sezonie żywym.

---

## 9. System Mediana 2+1 (`lib/admin/medianEngine.ts`)

### H2H (duże punkty ligowe)

```
wygrana FPL  → 2 : 0
remis FPL    → 1 : 1
przegrana    → 0 : 2
```

### Bonus mediany

W każdej dywizji i kolejce fazy zasadniczej: próg = **5. najwyższy** wynik FPL. Wszyscy z `fpl >= próg` dostają +1. Remisy na progu: wszyscy z wynikiem równym progowi dostają bonus.

Funkcje: `resolveH2h`, `medianThreshold`, `computeMedianBonusSet`.

### Parsery wklejki FPL

| Funkcja | Format |
|---------|--------|
| `parseGwBatchText` | GW, FPL_ID, Punkty |
| `parseFplClassicLeaguePaste` | Tabela z fantasy.premierleague.com |
| `parseMultiGameweekPaste` | GW \\t Team \\t Manager \\t Punkty |

**Brak live API FPL** — operator kopiuje tabelę Classic i wkleja w Workspace.

Zakres FPL: -20 … 300 (`lib/admin/constants.ts`).

---

## 10. Tabele ligowe (`lib/public/standings.ts`, `lib/admin/standings.ts`)

### Sortowanie publiczne (kanon dla kibica)

1. totalPoints (H2H + Med)
2. fplPoints
3. h2hPoints
4. teamId

### Strefy `zoneFor(position, total, tier, isLowestDivision)`

- **Tier 1:** złoto/srebro/brąz, 8. baraż w dół, 9–10 spadek
- **Tier 2+:** 1–2 awans, 3. baraż w górę, 8. baraż w dół, 9–10 spadek
- **Najniższa dywizja:** brak spadków i barażu w dół

---

## 11. Berger (`lib/admin/berger.ts`)

Circle method, 10 drużyn → 18 GW (9 rund + 9 rewanży). Offset GW przy sezonie wiosennym (+19). Baraże generowane osobno.

---

## 12. Baraże (`lib/admin/playoffPairs.ts`, `playoffTiebreak.ts`)

**Para:** 8. wyższej dywizji (gospodarz, utrzymanie) vs 3. niższej (gość, awans).

**Kaskada tie-break:** FPL → Gole XI → Stracone GK+DEF → Ławka → Coin toss.

UI progresywne: `cascadeVisibility`. Ścieżka dla kibica: `buildPlayoffDecisionPath`.

---

## 13. The FA Ranking (`lib/public/faRanking.ts`)

- Ranking **overall FPL** (kampania jesień+wiosna), nie H2H
- Klucz gracza: `fpl:{id}` lub `discord:{nick}`
- Preferuje `team_gameweek_scores`; fallback fixtures (gubi graczy bez H2H w barażach)
- Eksport Content Hub: karuzele po 10, uczestnicy 1920px 6 kolumn

---

## 14. Rozliczenie sezonu (`lib/admin/endSeasonStatuses.ts`, `endSeasonCompute.ts`, `seasonDraft.ts`)

Statusy: CHAMPION, RUNNER_UP, THIRD_PLACE, PROMOTED_*, SAFE, RELEGATED_*, WAITING_ROOM.

Draft Board: kolumny = `next_tier`, kaskady rezygnacji (`applyResignation`).

`finalizeSeasonTransition`: archiwizacja → nowy sezon → dywizje → gracze → Berger.

---

## 15. Workspace — jak używać (`/admin/workspace`)

**Plik:** `app/admin/actions/workspace.ts`, UI `GameweekWorkspace.tsx`

### Typowy workflow GW

1. Po deadline FPL skopiuj tabelę z fantasy.premierleague.com (Classic)
2. **Import globalny** (`importGlobalGameweekResults`) — wszystkie dywizje naraz  
   LUB per-dywizja / per-sezon
3. Sprawdź `unmatched` (niezmapowani gracze)
4. Zapis = brudnopis (`is_published=false`), automatycznie H2H + mediana + `team_gameweek_scores`
5. Content Hub: podgląd PNG z draftu
6. **Publikacja** (`publishSeasonGameweek` / `publishDivisionGameweek`)
7. Content Hub → Discord (patrz sekcja 16)

### Baraże w Workspace

`savePlayoffTiebreak` — kaskada TB gdy remis FPL. Mediana **nie** w barażach.

---

## 16. Content Hub i Discord — jak używać

**Pliki:** `app/admin/actions/contentHub.ts`, `components/admin/content-hub/ContentHubClient.tsx`

### Typy treści

- **Podsumowanie GW** — wyniki H2H + tabela PNG
- **Zapowiedź GW** — terminarz PNG
- **The FA Ranking** — karuzela PNG (10 graczy/slide)
- **FA Cup** — tylko JSON embed (bez PNG)
- **Uczestnicy FA Ranking** — siatka 50+ herbów (`FaRankingParticipantsExportNode.tsx`)

### Wysyłka Discord — architektura (ważne!)

**Historyczny problem:** Server Action z PNG ~6 MB padała cicho (limit ~4.5 MB Next/Vercel).

**Obecne rozwiązanie:**
1. Server Action `getDiscordWebhookForSend(target, serverTargets[])` zwraca **tablicę URL** (bez wysyłki pliku przez Next)
2. Przeglądarka: `postDiscordWebhookFromClient` (`lib/admin/discordClientSend.ts`) — `fetch` CORS prosto na Discord
3. Przy wielu serwerach: **Promise.all** — ten sam JSON/FormData na każdy URL

### Wybór serwera Discord (Content Hub)

Checkboxy przed wysyłką:
- [x] **Na Minusie ™** (domyślnie)
- [ ] **FPL Arena (Backup)**

Możliwe kombinacje: tylko Na Minusie, tylko FPL Arena, **oba naraz** (mirror treści).

Przycisk zablokowany gdy: brak zaznaczonego serwera, brak webhooka na zaznaczonym serwerze, błędny JSON.

Toast: `formatDiscordMultiSendToast` — sukces/częściowy sukces/błąd per serwer.

### Konfiguracja webhooków (`/admin/webhooks`)

Zakładki:
- **Na Minusie ™** — live
- **FPL Arena (Backup)** — mirror

W każdej: 2 globalne (FA Ranking, FA Cup) + Level 1…N (tier dywizji).

Hard Reset **nie kasuje** tej tabeli.

---

## 17. Strefa Gracza

**Pliki:** `lib/public/actions.ts`, `components/na-minusie/hub/HubShell.tsx`

Zakładki (`lib/na-minusie/hubTabs.ts`): tabela, wyniki, terminarz, statystyki, uczestnicy, podsumowanie, fa-ranking.

Widoczność: sezon PUBLISHED; dywizje 10/10 (lub archiwum z fixtures). Tylko `is_published=true` (RLS).

Statystyki: `lib/public/seasonStats.ts` — median king, win streak, blowout, nail-biter, itd.

Eksport PNG z Strefy Gracza (admin): `ExportControls.tsx` — wysyłka przez legacy `sendImageToDiscord` (server-side, tylko NA_MINUSIE domyślnie).

---

## 18. Symulator (`/admin/simulator`)

Scenariusze: CHAOS, NEGATIVE, TIGHT, DRAW_FESTIVAL. Losuje FPL, ten sam silnik 2+1. Wymaga pełnych 10/10.

---

## 19. Logotypy

- **Kluby:** seed `public/club-logos/` + runtime `public/uploads/logos/` — `lib/admin/clubLogos.ts`
- **Dywizje:** `public/tier-logos/` + upload — `lib/admin/tierLogos.ts`
- Mapowanie crest: `lib/public/clubCrest.ts`

---

## 20. Rekrutacja i Google Sheets

Landing **nie** zapisuje do Supabase. Źródła:
- Formularz Google (`NA_MINUSIE_LINKS.form`) — **zamknięty w UI** (`HowToJoinSection.tsx`)
- CSV bazy uczestników + LIVE VIEW klubów — `lib/public/getAvailableClubs.ts`

Po starcie sezonu źródłem obsady jest Supabase `teams`.

---

## 21. Danger Zone (`/admin/settings`)

`wipeLeagueData("POTWIERDZAM")` kasuje: fixtures, teams, divisions, seasons, pyramids.

**NIE kasuje:** `discord_webhooks`, `admin_users`, Auth users.

Osobno: clear wyników / terminarza sezonu (bez pełnego wipe).

---

## 22. Założenia produktowe i techniczne

1. **Dokładnie 10 graczy** na dywizję w rozgrywkach — nie konfigurowalne bez zmiany regulaminu i Bergera.
2. **Faza sezonu z nazwy** — brak kolumny `phase` w DB; konwencja nazewnictwa obowiązkowa.
3. **Mediana per dywizja** — próg liczony w obrębie 10 graczy, nie globalnie.
4. **Brak API FPL** — wklejka operatora jest feature, nie dług techniczny.
5. **Jeden poziom admina** — każdy authenticated = pełny zapis RLS.
6. **Webhooki trwałe** — przetrwają wipe ligi; mirror na FPL Arena to backup, nie sync rozmów.
7. **Publikacja flagą** — brak osobnej tabeli „live results”.
8. **Monorepo** — Na Minusie nie importuje logiki Areny.

---

## 23. Co NIE jest zaimplementowane

| Feature | Status |
|---------|--------|
| Silnik pucharowy FA Cup (mecze, tabela) | ❌ — tylko kanał Discord + embed |
| Live API fantasy.premierleague.com | ❌ |
| Role adminów (editor vs superadmin) | ❌ |
| Automatyczny sync Discord ↔ Discord | ❌ — mirror tylko przy wysyłce z Content Hub |
| Transakcje SQL w `finalizeSeasonTransition` | ❌ — kroki sekwencyjne |
| ExportControls ze Strefy Gracza → dual server | ❌ — tylko NA_MINUSIE via server action |
| Mniejsze ligi 6–8 (regulamin opcja B) | ❌ — procedura manualna |

---

## 24. Katalog Server Actions (indeks)

### `app/admin/actions/db.ts`
CRUD: pyramids, seasons, divisions, teams, bulk import, wipeLeagueData, clear fixtures/results

### `app/admin/actions/workspace.ts`
get/save/publish/unpublish/clear gameweek (season, division), importGlobalGameweekResults, savePlayoffTiebreak

### `app/admin/actions/discordWebhooks.ts`
getWebhooksAdminPayload, upsertGlobalWebhook, upsertDivisionLevelWebhook (+ server_target), resolve*Webhook*, listDivisionWebhookLevelsByServer

### `app/admin/actions/contentHub.ts`
getContentHubDivisions/Seasons, generateXComDraft, generatePreviewDiscordJSON, getDiscordWebhookForSend(destinations[]), getContentHubCaptureData, getFaRankingParticipantsRoster

### `app/admin/actions/seasonTransition.ts`
markSeasonCompleted, loadSeasonDraftBoard, finalizeSeasonTransition

### `app/admin/actions/masterImport.ts`
masterExcelImport, generateBergerForDivision

### `app/admin/actions/fixtures.ts`
generateDivisionFixtures, generatePlayoffFixtures, calculateGameweeksBatch

### `app/admin/actions/simulator.ts`
generateSimulatedResults, publish/unpublish/clear simulation

### `app/admin/actions/endSeason.ts`
calculateEndSeasonStatuses

### `lib/public/actions.ts`
getPublicStructure, getDivisionStandings, getGameweekDetails, getFARankingData, getPublicSeasonSummary, …

### `lib/public/playerZone.ts`
getPlayerZoneOverview, profil, wyszukiwarka

---

## 25. Mapa plików {#mapa-plików}

### Silniki (czytaj w tej kolejności)

```
lib/public/season.ts
lib/admin/divisionCapacity.ts
lib/admin/medianEngine.ts
lib/admin/berger.ts
lib/admin/standings.ts
lib/public/standings.ts
lib/admin/playoffPairs.ts
lib/admin/playoffTiebreak.ts
lib/public/playoffs.ts
lib/public/faRanking.ts
lib/admin/teamGameweekScores.ts
lib/admin/endSeasonStatuses.ts
lib/admin/endSeasonCompute.ts
lib/admin/seasonDraft.ts
lib/public/seasonStats.ts
lib/admin/simulatorScenarios.ts
lib/admin/discordWebhooks.ts          ← server_target NA_MINUSIE | FPL_ARENA
lib/admin/discordClientSend.ts        ← Promise.all multi-URL
```

### UI kluczowe

```
app/page.tsx                          ← splash portal
components/platform/SplashBrandLockup.tsx
components/admin/DiscordWebhooksPanel.tsx   ← zakładki 2 serwerów
components/admin/content-hub/ContentHubClient.tsx  ← checkboxy serwera
components/admin/GameweekWorkspace.tsx
components/na-minusie/hub/HubShell.tsx
components/admin/content-hub/FaRankingParticipantsExportNode.tsx
```

### Schema

```
supabase/schema.sql
supabase/migrations/add_discord_webhooks.sql
supabase/migrations/add_discord_webhooks_server_target.sql
supabase/migrations/add_team_gameweek_scores.sql
```

---

## 26. Workflow operacyjny — checklist sezonu

### Przed GW1
- [ ] Sezon + piramida + dywizje tier 1…N
- [ ] Master Import → 10/10 per dywizja
- [ ] Berger (offset 0 jesień / 19 wiosna)
- [ ] Webhooki: oba serwery jeśli mirror (`/admin/webhooks`)
- [ ] `status = PUBLISHED`
- [ ] Logo klubów / szczebli

### Każda GW
- [ ] Wklejka Classic → Workspace
- [ ] Korekta unmatched
- [ ] Content Hub: PNG z draftu
- [ ] Publikacja GW
- [ ] Content Hub → Discord (wybierz serwer/y)

### GW19 / GW38
- [ ] Tabela 1–18 / 20–37 opublikowana
- [ ] Baraże wygenerowane
- [ ] FPL wszystkich → team_gameweek_scores
- [ ] TB baraży w UI
- [ ] markSeasonCompleted

### Między sezonami
- [ ] Draft Board wyrównany 10/10
- [ ] finalizeSeasonTransition

### Migracje Supabase (stan wymagany)
- [ ] `add_discord_webhooks.sql`
- [ ] `add_team_gameweek_scores.sql`
- [ ] **`add_discord_webhooks_server_target.sql`**

---

## 27. Słownik pojęć

| Termin | Definicja |
|--------|-----------|
| Małe punkty | Punkty FPL w kolejce |
| Duże punkty | H2H (0/1/2) + mediana (0/1) |
| Mediana 2+1 | H2H + bonus za próg 5. wyniku FPL |
| Brudnopis | is_published=false |
| Tier / Level | Szczebel piramidy (1=PL); Level webhooka = tier |
| Kampania | Para sezonów jesień+wiosna (FA Ranking) |
| server_target | NA_MINUSIE lub FPL_ARENA w discord_webhooks |
| Hard Reset | wipeLeagueData — bez webhooków |

---

## 28. Changelog istotny (dla kontekstu AI)

| Data | Zmiana |
|------|--------|
| 2026-07 | v1 doc — plan; hub/wyniki „niezaimplementowane” (przestarzałe) |
| 2026-08-17 | v2 doc — pełny silnik Mediana, Strefa Gracza, Content Hub, FA Ranking |
| 2026-08-17 | Discord client-side send (limit PNG); trwałe webhooki |
| 2026-08-17 | Splash: TWÓJ SKŁAD. NASZA ARENA. + SplashBrandLockup |
| 2026-08-18 | **Dual Discord:** server_target, zakładki webhooks, checkboxy Content Hub, Promise.all |

---

*Ten dokument jest przeznaczony do wklejenia w nowy wątek Gemini jako pełny kontekst projektu FPL Arena / Na Minusie ™.*
