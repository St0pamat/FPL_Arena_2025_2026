# Na Minusie ™ — kompletna dokumentacja techniczna

> **Wersja dokumentu:** 3.0  
> **Data:** 18 sierpnia 2026  
> **Handoff AI (Gemini):** pełny kontekst projektu → [`docs/GEMINI_PROJECT_CONTEXT.md`](GEMINI_PROJECT_CONTEXT.md)  
> **Zakres:** cała platforma **Na Minusie ™** w monorepo `fpl-arena-skarb-kibica` — landing, Strefa Gracza, panel admina, silniki punktacji, baraże, FA Ranking, Content Hub, Discord (dual-server), przejście sezonu, baza Supabase, wdrożenie.  
> **Repozytorium GitHub:** `St0pamat/FPL_Arena_2025_2026`  
> **Produkcja:** VPS `/var/www/fpl-tracker`, proces PM2 `na-minusie`

Ten dokument opisuje **jak system działa i dlaczego** tak został zbudowany. Źródłem prawdy dla algorytmów jest kod w `lib/` (czysta logika) oraz Server Actions w `app/admin/actions/` i `lib/public/`. Regulamin publiczny (`lib/na-minusie/regulaminContent.ts`, strona `/na-minusie/regulamin`) jest warstwą produktową — silnik musi go odwzorowywać.

---

## Spis treści

1. [Wizja produktu i kontekst](#1-wizja-produktu-i-kontekst)
2. [Architektura platformy (monorepo)](#2-architektura-platformy-monorepo)
3. [Stos technologiczny](#3-stos-technologiczny)
4. [Środowisko, konfiguracja i wdrożenie](#4-środowisko-konfiguracja-i-wdrożenie)
5. [Routing i mapa URL](#5-routing-i-mapa-url)
6. [Warstwa wizualna i branding](#6-warstwa-wizualna-i-branding)
7. [Strony publiczne](#7-strony-publiczne)
8. [Model danych (Supabase)](#8-model-danych-supabase)
9. [Autentykacja, middleware, RLS](#9-autentykacja-middleware-rls)
10. [Kalendarz sezonu FPL vs sezon ligowy](#10-kalendarz-sezonu-fpl-vs-sezon-ligowy)
11. [Pojemność dywizji (reguła 10)](#11-pojemność-dywizji-reguła-10)
12. [System Mediana 2+1 — silnik punktacji](#12-system-mediana-21--silnik-punktacji)
13. [Tabele ligowe i strefy piramidy](#13-tabele-ligowe-i-strefy-piramidy)
14. [Terminarz Bergera](#14-terminarz-bergera)
15. [Baraże (GW19 / GW38)](#15-baraże-gw19--gw38)
16. [The FA Ranking](#16-the-fa-ranking)
17. [Rozliczenie sezonu (EoS) i Draft Board](#17-rozliczenie-sezonu-eos-i-draft-board)
18. [Workspace — ingest wyników FPL](#18-workspace--ingest-wyników-fpl)
19. [Strefa Gracza](#19-strefa-gracza)
20. [Content Hub i eksport PNG](#20-content-hub-i-eksport-png)
21. [Webhooki Discord](#21-webhooki-discord)
22. [Symulator sezonu](#22-symulator-sezonu)
23. [Logotypy klubów i dywizji](#23-logotypy-klubów-i-dywizji)
24. [Panel administratora — katalog modułów](#24-panel-administratora--katalog-modułów)
25. [Server Actions — katalog API](#25-server-actions--katalog-api)
26. [Workflow operacyjny sezonu](#26-workflow-operacyjny-sezonu)
27. [Statystyki i rekordy](#27-statystyki-i-rekordy)
28. [Rekrutacja i źródła Google Sheets](#28-rekrutacja-i-źródła-google-sheets)
29. [Znane ograniczenia i świadome decyzje](#29-znane-ograniczenia-i-świadome-decyzje)
30. [Mapa plików](#30-mapa-plików)
31. [Słownik pojęć](#31-słownik-pojęć)

---

## 1. Wizja produktu i kontekst

**Na Minusie ™** to liga Fantasy Premier League w formacie **Head-to-Head (H2H)** z unikalnym systemem **Mediana 2+1**. Powstała z fuzji społeczności: **Baldwiniasty** prowadzi serwer Discord i klimat, **St0pa** jest architektem systemu ligowego (organizacja, logistyka, kod).

### Problem, który rozwiązuje liga

Klasyczne H2H FPL karze pechowym terminarzem: menedżer może mieć świetny GW, a mimo to przegrać z jeszcze lepszym rywalem i dostać 0 punktów ligowych. Mediana 2+1 zostawia bezpośredni pojedynek (2 / 1 / 0), ale **dokłada +1 za bycie w górnej połowie dywizji w danej kolejce**. Dzięki temu „Twój wynik ma znaczenie” niezależnie od pary H2H.

### Cele produktowe (stan na sierpień 2026)

| Cel | Status |
|-----|--------|
| Publiczny landing rekrutacyjny + regulamin | ✅ (rekrutacja 2026/27 zamknięta w UI) |
| Portal wyboru Arena vs Na Minusie na `/` | ✅ |
| Panel CMS: sezony, piramidy, dywizje, gracze | ✅ |
| Import Excel / CSV uczestników | ✅ |
| Logo klubów i logotypy szczebli | ✅ |
| Losowanie terminarza (Berger) | ✅ |
| Workspace: wklejka FPL → H2H + mediana → publikacja | ✅ |
| Publiczna Strefa Gracza (tabele, wyniki, FA Ranking) | ✅ |
| Baraże cross-division + kaskada TB | ✅ |
| The FA Ranking (kampania jesień+wiosna, niezależna od H2H) | ✅ |
| Content Hub: PNG + Discord + szkice X.com | ✅ |
| Trwałe webhooki Discord (Hard Reset ich nie kasuje) | ✅ |
| **Dual-server Discord** (Na Minusie + FPL Arena backup, mirror wysyłki) | ✅ |
| Rozliczenie sezonu + Draft Board + nowy Berger | ✅ |
| Symulator sezonu (sandbox) | ✅ |
| Puchary stylu CL / FA Cup jako rozgrywki w silniku | ❌ (kanał Discord FA_CUP istnieje; brak silnika pucharowego) |

### Dwa sezony w jednym roku FPL

Pełny rok Fantasy Premier League (GW1–38) jest w Na Minusie **dwoma niezależnymi sezonami ligowymi**:

- **Sezon Jesienny** — faza zasadnicza GW1–18, baraże **GW19**
- **Sezon Wiosenny** — faza zasadnicza GW20–37, baraże **GW38**

Numeracja historyczna jest ciągła: Sezon 1 (jesień), Sezon 2 (wiosna), Sezon 3 (jesień kolejnego roku) itd. Faza jest wykrywana z **nazwy sezonu** (`resolveSeasonPhase`), nie z osobnej kolumny w bazie.

### Piramida szczebli

Nazewnictwo odwzorowuje angielską piramidę:

| Tier | Oficjalna nazwa |
|------|-----------------|
| 1 | Premier League |
| 2 | Championship |
| 3 | League One |
| 4 | League Two |
| 5+ | National League |

Kod UI: `D{tier}` (`divisionCode`). Etykiety w `lib/na-minusie/divisionLabels.ts`.

---

## 2. Architektura platformy (monorepo)

Jedno repozytorium, dwa światy produktowe, jeden proces Next.js:

```
┌─────────────────────────────────────────────────────────────────┐
│                 Next.js 14 (App Router) — entrypoint            │
│   /  splash  ·  /arena  ·  /na-minusie  ·  /strefa-gracza       │
│   /admin/*   ·  /api/uploads/*                                  │
├──────────────────────────────┬──────────────────────────────────┤
│ Legacy Vite SPA (`src/`)     │  Na Minusie (`app/` + `lib/` +   │
│ FPL Arena / Skarb Kibica     │  `components/na-minusie` +       │
│ montowane aliasem `@arena`   │  `components/admin`)             │
│ trasa `/arena`               │  Supabase + Server Actions       │
└──────────────────────────────┴──────────────────────────────────┘
                              │
                              ▼
                    Supabase (Postgres + Auth + RLS)
```

### Zasady podziału

1. **Next.js jest jedynym serwerem produkcyjnym** (`npm run dev` → `next dev`, `npm run start` → `next start`).
2. **FPL Arena** żyje w `src/` (historyczny Vite). Webpack alias `@arena` → `src`. To archiwum / Skarb Kibica, nie silnik ligi H2H.
3. **Na Minusie** nie importuje logiki Areny. Współdzielone są najwyżej assety (`public/`) i branding splash na `/`.
4. Logika biznesowa ligi jest **czysta** (bez I/O) w `lib/admin/*` i `lib/public/*`. Server Actions tylko ładują dane, wołają silnik, zapisują.
5. Publikacja (`is_published`) oddziela brudnopis admina od tego, co widzi kibic. RLS na `fixtures` i `team_gameweek_scores` wymusza to po stronie bazy.

### Warstwy kodu Na Minusie

| Warstwa | Ścieżka | Rola |
|---------|---------|------|
| Routing / RSC | `app/na-minusie`, `app/strefa-gracza`, `app/admin` | Strony, layouty, metadata |
| UI | `components/na-minusie`, `components/admin` | Widoki, eksport PNG, formularze |
| Silniki | `lib/admin/*.ts`, `lib/public/*.ts` | Algorytmy, typy, stałe |
| I/O | `app/admin/actions/*.ts`, `lib/public/actions.ts` | Server Actions, Supabase |
| Konfiguracja produktu | `lib/na-minusie/*` | Nawigacja, regulamin, linki, branding |
| Schema | `supabase/schema.sql` + `supabase/migrations/` | Źródło prawdy DB |

Dlaczego tak: silniki da się testować bez bazy; ten sam `buildPublicStandings` / `evaluateDivisionEndStatuses` służy adminowi i Strefie Gracza; publikacja jest flagą, nie osobną tabelą „live”.

---

## 3. Stos technologiczny

| Element | Wybór | Po co |
|---------|-------|--------|
| Framework | Next.js 14 App Router | RSC, Server Actions, middleware sesji |
| UI | React 18, Tailwind CSS 3 | Design system `nm-*`, panel admina slate |
| Ikony | lucide-react | Spójne ikony nawigacji |
| Baza | Supabase (Postgres) | Auth + RLS + realtime-ready |
| Klient DB | `@supabase/ssr` + `@supabase/supabase-js` | Cookies sesji w middleware |
| CSV | papaparse | Import Excel/CSV, Google Sheets |
| PNG | html-to-image | Content Hub (off-screen DOM → PNG) |
| Discord | Webhook API, POST z przeglądarki | Embed + pliki bez limitu Next body |
| Legacy Arena | Vite 6 (osobne skrypty `dev:arena`) | Historyczny SPA |

`package.json` name: `fpl-arena-skarb-kibica`. Type: `module`.

**Świadome ustawienia Next** (`next.config.mjs`):

- `experimental.serverActions.bodySizeLimit: "25mb"` — duże PNG w Server Actions (choć wysyłka Discord idzie już z klienta).
- `typescript.ignoreBuildErrors: true` — legacy `src/` ma luźniejsze typy; Next sprawdza `app/` + `components/`.
- Dev: `webpack cache = false` — OneDrive + znaki specjalne w ścieżce psuły PackFileCache (404 na chunki).
- Dev: `NODE_TLS_REJECT_UNAUTHORIZED=0` — antywirus na Windows zrywa TLS do Supabase/Google.
- Rewrites `/uploads/logos/:file` i `/tier-logos/:file` → API stream z dysku (upload po buildzie nie wymaga rebuildu).

---

## 4. Środowisko, konfiguracja i wdrożenie

### Zmienne środowiskowe

Wymagane:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Opcjonalnie (service role tylko jeśli kiedyś pojawi się job serwerowy; panel działa na sesji admina + RLS `authenticated`):

- `SUPABASE_SERVICE_ROLE_KEY` — **nie** jest używany w typowym flow UI.

### Skrypty

| Komenda | Działanie |
|---------|-----------|
| `npm run dev` | `scripts/dev-next.mjs` (predev sync public) |
| `npm run build` | `next build` |
| `npm start` | `next start` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run dev:arena` / `build:arena` | legacy Vite |

`predev` / `prebuild` wołają `scripts/sync-public.mjs` (assety Areny).

### Produkcja (stan operacyjny)

- VPS, katalog `/var/www/fpl-tracker`
- Proces PM2: `na-minusie`
- Deploy: `git pull origin main && npm run build && pm2 restart na-minusie`
- Uploady logo: `public/uploads/logos/`, `public/uploads/tier-logos/` — poza gitem, serwowane przez rewrite → API

Hard Reset w Danger Zone **nie** kasuje `discord_webhooks` ani `admin_users` / Auth.

---

## 5. Routing i mapa URL

### Publiczne

| URL | Rola |
|-----|------|
| `/` | Splash: wybór FPL Arena vs Na Minusie |
| `/na-minusie` | Landing ligi (hero, mediana, piramida, kluby, jak dołączyć, kontakt) |
| `/na-minusie/dywizje` | Oficjalna struktura dywizji (karty + eksport PNG) |
| `/na-minusie/regulamin` | Pełny regulamin (treść z `regulaminContent.ts`) |
| `/na-minusie/hub` | Alias / przekierowanie do Strefy Gracza |
| `/strefa-gracza` | Hub sezonu: tabela, wyniki, terminarz, statystyki, uczestnicy, podsumowanie, FA Ranking |
| `/strefa-gracza/[teamId]` | Profil menedżera |
| `/strefa-gracza/gracz/[teamId]` | Alternatywna ścieżka profilu |
| `/strefa-gracza/rekordy` | Rekordy / pantheon |
| `/arena` | Legacy FPL Arena (Vite SPA) |

Nawigacja główna (`lib/na-minusie/navigation.ts`): O lidze · Dywizje · Strefa Gracza.

Zakładki Strefy Gracza (`lib/na-minusie/hubTabs.ts`): `tabela`, `wyniki`, `terminarz`, `statystyki`, `uczestnicy`, `podsumowanie`, `fa-ranking`. Aliasowane stare ID (`kolejki` → `wyniki` itd.).

### Admin

| URL | Rola |
|-----|------|
| `/admin` | Redirect: zalogowany → dashboard, gość → login |
| `/admin/login` | Logowanie Supabase Auth |
| `/admin/dashboard` | Podsumowanie, wypełnienie dywizji |
| `/admin/struktura` | Sezony, piramidy, dywizje |
| `/admin/players` | Baza graczy, Master Import Excel |
| `/admin/content-hub` | PNG, szkice X, Discord |
| `/admin/webhooks` | Trwałe webhooki Discord |
| `/admin/workspace` | Edytor kolejek (brudnopis, wklejka, publikacja, baraże) |
| `/admin/season-transition` | Rozliczenie + draft + nowy sezon |
| `/admin/tier-logos` | Logotypy szczebli |
| `/admin/logos` | Herby klubów |
| `/admin/simulator` | Sandbox fikcyjnych GW |
| `/admin/settings` | Danger Zone (wipe) |

Część starszych tras nadal istnieje w `app/admin/(panel)/` (np. `gw-results`, `data-ingestion`, `fixture-draw`, `uczestnicy`) — nawigacja kanoniczna jest w `lib/admin/navigation.ts`.

### Middleware

Plik: `middleware.ts` + `lib/supabase/middleware.ts`.

- `/admin` bez sesji → `/admin/login?redirect=…`
- `/admin` z sesją → `/admin/dashboard`
- `/admin/login` z sesją → dashboard
- `/admin/login` i `/admin` (root) są wyjątkami od „protected”

Sesja odświeżana przez cookies Supabase SSR.

---

## 6. Warstwa wizualna i branding

- Kolor akcentu: `#39FF14` (neon green) — `nm-green`, `nm-glow`, `nm-btn-primary`.
- Tło: slate / black, karty `nm-card`.
- Logo ligi: `lib/na-minusie/branding.ts` + pliki w `public/images/`.
- Herby klubów: seed `public/club-logos/` + runtime `public/uploads/logos/`.
- Logotypy dywizji: seed `public/tier-logos/` + runtime upload.
- Eksporty PNG (Content Hub, dywizje, FA Ranking) renderują **off-screen DOM** w stałej szerokości (często 1920 px), potem `html-to-image` — żeby Discord/X dostały identyczny kadr niezależnie od okna admina.

Dlaczego off-screen: zrzut widocznego UI łapałby scrollbary, skalowanie i motywy przeglądarki. Węzeł eksportu ma twarde wymiary i czcionki.

---

## 7. Strony publiczne

### 7.1 Landing `/na-minusie`

Sekcje (scroll-spy `NA_MINUSIE_SECTION_NAV`):

1. Hero — hasło „Twój Wynik Ma Znaczenie”, pasek pojemności z Google Sheets.
2. Dlaczego warto.
3. System Mediana 2+1 (edukacja).
4. Piramida ligowa.
5. Aktualni uczestnicy.
6. Dostępne kluby (LIVE CSV + baza).
7. Jak dołączyć — **formularz zamknięty** (`FORMULARZ ZAMKNIĘTY - KONIEC REKRUTACJI`), Discord nadal aktywny.
8. Kontakt (Discord / X / e-mail).

Rekrutacja 2026/27 jest zakończona w UI; lista klubów i baza CSV zostają jako dokumentacja obsady.

### 7.2 Dywizje `/na-minusie/dywizje`

Oficjalny, zamknięty podział. Karty `DivisionStructureCard` z herbami, eksport PNG (scrollbar/crest fixes). Komunikat: rekrutacja zakończona.

### 7.3 Regulamin `/na-minusie/regulamin`

Treść w `lib/na-minusie/regulaminContent.ts` — ten sam tekst, który cytuje landing. Zmiana regulaminu = zmiana tego pliku, nie CMS.

### 7.4 Strefa Gracza

Zob. [§19](#19-strefa-gracza). Widoczność: sezon `PUBLISHED`; dywizje **pełne 10/10** (albo archiwum z opublikowanymi meczami). Brudnopisy (`is_published = false`) są niewidoczne dzięki RLS.

---

## 8. Model danych (Supabase)

Kanoniczny dump: `supabase/schema.sql` (V2: piramidy + statusy sezonów). Migracje przyrostowe w `supabase/migrations/`.

### 8.1 Diagram relacji

```
admin_users (user_id → auth.users)
pyramids 1──* divisions *──1 seasons
divisions 1──* teams
seasons 1──* fixtures
divisions 1──* fixtures
teams 1──* fixtures (home / away)
seasons 1──* team_gameweek_scores *──1 teams
discord_webhooks  (bez FK do seasons — celowo)
```

### 8.2 Tabele

#### `admin_users`

Whitelist kont z uprawnieniami zapisu. `user_id` → `auth.users`. Hard Reset **nie** kasuje tej tabeli.

#### `pyramids`

Nazwana piramida (np. główna liga). Dywizje należą do `(pyramid_id, season_id)`. Pozwala teoretycznie na wiele piramid w jednym sezonie (Draft Board operuje per piramida).

#### `seasons`

| Kolumna | Znaczenie |
|---------|-----------|
| `name` | Np. „Sezon 1 (Jesień 2026/27)” — **z nazwy** wynika faza AUTUMN/SPRING |
| `status` | `DRAFT` \| `PUBLISHED` |
| `is_completed` | Baraże rozliczone → publiczne Podsumowanie |
| `is_archived` | Sezon spakowany, gracze przeniesieni |
| `fa_ranking_webhook_url` / `fa_cup_webhook_url` | Legacy; kanoniczne URL-e są w `discord_webhooks` |

#### `divisions`

| Kolumna | Znaczenie |
|---------|-----------|
| `tier` | 1 = elita; unique `(season_id, pyramid_id, tier)` |
| `name` | Wyświetlana nazwa |
| `discord_webhook_url` | Legacy per-dywizja; kanon: `discord_webhooks.division_level = tier` |

#### `teams`

Uczestnik. `division_id` NULL = pula przed losowaniem / Master Import. Pola z Excela: `manager_name`, `discord_nick`, `discord_id`, `fpl_id`, `fpl_team_name`, `chosen_club`, `fee_paid`, `is_active`, `status`, `x_com`, `email`, `previous_season_or`.

`fpl_id` jest **TEXT** (wartość numeryczna) — unika utraty zer wiodących i problemów CSV.

Po archiwizacji sezonu `teams.division_id` wskazuje **nową** dywizję. Stare składy odtwarza się z `fixtures` (EoS i Strefa Gracza to uwzględniają).

#### `fixtures`

Jeden mecz H2H (lub baraż).

| Kolumna | Znaczenie |
|---------|-----------|
| `gameweek` | 1–38 |
| `home_*` / `away_*` | FPL, H2H (0\|1\|2), mediana (0\|1) |
| `is_finished` | Wynik rozliczony |
| `is_published` | Widoczne publicznie |
| `is_playoff` | Baraż (nie liczy się do tabeli fazy zasadniczej) |
| `tiebreaker_*` | Gole XI, stracone, ławka, zwycięzca, metoda, powód |

Constraint: `home_team_id <> away_team_id`. Unique: `(season_id, division_id, gameweek, home_team_id, away_team_id)`.

**Uwaga baraży:** mecz barażowy jest przypięty do `division_id` **wyższej** ligi (gospodarz = 8. miejsce wyższego tieru). Gość jest z innej dywizji — to jedyny legalny cross-division fixture.

#### `team_gameweek_scores`

Źródło prawdy **The FA Ranking**. Jedna wartość FPL na `(season_id, team_id, gameweek)`, niezależna od tego, czy gracz ma mecz H2H w tej kolejce.

Dlaczego osobna tabela: w GW19/GW38 baraże grają tylko wybrane pary. Reszta i tak zdobywa punkty FPL — ranking overall musi je zliczyć. Fixtures H2H tego nie pokrywają.

`is_published` analogicznie do meczów.

#### `discord_webhooks`

Trwałe, **bez FK** do sezonów/dywizji.

| `scope` | Klucz | Przykład |
|---------|-------|----------|
| `GLOBAL` | `global_type` = `FA_RANKING` \| `FA_CUP` | Kanały overall / puchar |
| `DIVISION` | `division_level` = tier (1, 2, …) | Kanał Premier League, Championship, … |

Unique index per `global_type` i per `division_level`. Hard Reset ich **nie** kasuje — URL-e kanałów przeżywają wipe ligi.

### 8.3 RLS (skrót)

- Odczyt publiczny (`anon`): pyramids, seasons, divisions, teams — tak; fixtures i scores — **tylko `is_published = true`**.
- Zapis: `authenticated`.
- `discord_webhooks`: **tylko authenticated** (URL-e nie wyciekają na frontend kibica). Funkcja `has_division_discord_webhook(level)` jest `SECURITY DEFINER` — UI może sprawdzić „czy jest webhook” bez ujawniania URL.

### 8.4 Migracje przyrostowe

- `add_x_com_to_teams.sql`
- `add_season_global_webhooks.sql` (legacy kolumny na `seasons`)
- `add_team_gameweek_scores.sql`
- `add_discord_webhooks.sql`

Nowa baza: wkleić `schema.sql`. Istniejąca: odpalać migracje.

---

## 9. Autentykacja, middleware, RLS

1. Admin loguje się przez Supabase Auth (`/admin/login`).
2. Middleware odświeża sesję i broni `/admin/*`.
3. Każda Server Action admina woła `getUser()` — brak sesji = błąd.
4. Kibic używa klienta anon; widzi wyłącznie opublikowane mecze i score'y.

**Nie ma ról w aplikacji** poza „zalogowany = admin”. RLS `authenticated` FOR ALL jest szerokie — zakłada, że konta Auth są tylko dla operatorów ligi. Nie dodawać zwykłych użytkowników do Auth bez zmiany polityk.

---

## 10. Kalendarz sezonu FPL vs sezon ligowy

Źródło: `lib/public/season.ts`.

| Stała | Wartość | Znaczenie |
|-------|---------|-----------|
| `REGULAR_MAX_GAMEWEEK` | 18 | Koniec fazy zasadniczej jesieni |
| `PLAYOFF_GAMEWEEK` | 19 | Baraże jesień |
| `SEASON_MAX_GAMEWEEK` | 19 | Ostatnia GW selecta jesień |
| `SPRING_SEASON_MIN_GAMEWEEK` | 20 | Start wiosny |
| `SPRING_REGULAR_MAX_GAMEWEEK` | 37 | Koniec fazy zasadniczej wiosny |
| `SPRING_PLAYOFF_GAMEWEEK` | 38 | Baraże wiosna |

`isPlayoffGameweek(gw)` → `gw === 19 || gw === 38`.

`regularSeasonRangeForPlayoff(19)` → `{1,18}`; dla 38 → `{20,37}`.

`resolveSeasonPhase(name)` — regex na `wiosna|spring|gw20|sezon 2`; w przeciwnym razie **AUTUMN**. Dlatego nazwa sezonu w panelu musi zawierać słowo wiosny, jeśli to runda GW20–38.

Workspace pokazuje listę GW zależną od fazy (`gameweeksForSeasonPhase`).

**Dlaczego GW19/38 są barażami, a nie 19. kolejką ligową:** regulamin dzieli rok FPL na dwa sezony po 18 kolejek każdy-z-każdym (Berger dla 10 drużyn = 18 GW). 19. kolejka FPL w każdej połowie roku to „puchar utrzymania/awansu”, nie punkty ligowe.

---

## 11. Pojemność dywizji (reguła 10)

Źródło: `lib/admin/divisionCapacity.ts`.

`DIVISION_CAPACITY = 10`.

Pełna dywizja jest **jedynym** stanem, w którym wolno:

- generować Berger,
- publikować wyniki GW,
- odpalać symulator / publikację sandbox,
- rozliczać sezon (aktywna piramida).

Niepełna (`n < 10`) może istnieć w rekrutacji / poczekalni. Publiczna Strefa Gracza **ukrywa** niepełne dywizje w sezonie żywym. Archiwum pokazuje dywizje, które mają opublikowane fixtures (skład mógł już zostać przeniesiony).

`findFirstIncompleteDivisionId` — pierwsza luka od góry (najniższy numer tieru z brakiem graczy) — używane przy uzupełnianiu rekrutacji.

**Dlaczego dokładnie 10:** Berger bez BYE, 9 kolejek w jedną stronę + 9 rewanży = 18 = faza zasadnicza. Mediana „5. najwyższy” ma sens przy 10 osobach (górna połowa). Regulamin piramidy (2 awanse, 2 spadki, 1 baraż w górę, 1 w dół) jest skalibrowany pod 10 miejsc.

---

## 12. System Mediana 2+1 — silnik punktacji

Źródło: `lib/admin/medianEngine.ts`.

To serce ligi. Wszystkie tabele, strefy, baraże (składy) i EoS wychodzą z tych liczb.

### 12.1 Punkty H2H (duże)

Dla pary w kolejce porównujemy **punkty FPL** (małe) obu menedżerów:

```
resolveH2h(homeFpl, awayFpl):
  home > away  →  home 2, away 0
  away > home  →  home 0, away 2
  równe        →  home 1, away 1
```

Zapis w DB: `home_h2h_points` / `away_h2h_points` ∈ {0,1,2}.

Nie ma 3 punktów za wygraną — format jest „piłkarski 2–0 / 1–1”, żeby suma dwójki zawsze wynosiła 2 (albo 2 przy remisie 1+1). Dzięki temu tabela nie rozjeżdża się skalą.

Zakres FPL: `FPL_POINTS_MIN = -20`, `FPL_POINTS_MAX = 300` (`lib/admin/constants.ts`). Clamp przy imporcie. Ujemne punkty są legalne (czerwone kartki, hit chips w symulatorze).

### 12.2 Bonus mediany (+1)

W **każdej dywizji i każdej kolejce fazy zasadniczej** zbieramy 10 wyników FPL, sortujemy malejąco, bierzemy **5. najwyższy** jako próg (`k = 5`).

```
medianThreshold(sortedDesc, k=5) = sortedDesc[min(k, n) - 1]
```

Każdy z `fpl >= próg` dostaje `median_bonus = 1`. Remisy na progu: **wszyscy** z wynikiem równym progowi dostają bonus (może być 5, 6, 7… zwycięzców mediany).

`computeMedianBonusSet(pointsByTeam, k=5)` zwraca `Set<teamId>`.

**Dlaczego 5. najwyższy, a nie klasyczna mediana statystyczna:** przy 10 osobach 5. wynik to próg „górnej połowy”. Klasyczna mediana pary (5. i 6.) byłaby niższa i nagradzałaby 6 osób. Regulamin chce nagradzać formę powyżej środka stawki.

**Dlaczego `>=`, nie `>`:** przy remisie na 5. miejscu nie wolno losowo wykluczać. Wszyscy, którzy trafili w próg, zasłużyli.

**Gdy dywizja ma < 5 wyników** (nie powinno się zdarzyć przy publikacji 10/10): `k = min(5, n)` — próg = najniższy z dostępnych top-k.

Baraże **nie** dostają mediany ligowej (to mecz pucharowy). Silnik ingest przy `is_playoff` nie nadpisuje TB i nie traktuje pary jak kolejki ligowej.

### 12.3 Duże punkty kolejki

Dla menedżera w GW:

```
total_gw = h2h_points (0|1|2) + median_bonus (0|1)
```

Maksymalnie **3** (wygrana H2H + mediana). Minimum **0**.

Suma sezonowa:

```
totalPoints = Σ h2h + Σ median     // „duże”
fplPoints   = Σ fpl                // „małe”, tie-break
```

### 12.4 Parsery wklejki

Ten sam plik obsługuje kilka formatów, bo admin kopiuje z różnych widoków FPL:

| Funkcja | Format |
|---------|--------|
| `parseGwBatchText` | `GW, FPL_ID, Punkty` (CSV/TSV) |
| `parseFplClassicLeaguePaste` | Tabela ligi Classic z fantasy.premierleague.com |
| `parseMultiGameweekPaste` / `parseGlobalGameweekPaste` | `GW \t FPL Team \t FPL Manager \t Punkty` |

Dopasowanie gracza (`fplNamesMatch`, `matchTeamInPool`): najpierw Team+Manager, potem osobno, normalizacja spacji/case. Niezmapowane wiersze wracają jako `unmatched` — nie znikają po cichu.

### 12.5 Przeliczenie kolejki (recalc)

Workspace po wklejce:

1. Zbiera mapę `teamId → fpl`.
2. Dla każdego fixture GW (nie-playoff): `resolveH2h` + `computeMedianBonusSet` na **całej dywizji**.
3. Zapisuje FPL/H2H/medianę, `is_finished=true`, `is_published=false`.
4. Upsert `team_gameweek_scores` (też draft).

Mediana jest liczona **per dywizja**, nie globalnie. 55 pkt w Premier League i 55 pkt w National League to dwa różne progi.

---

## 13. Tabele ligowe i strefy piramidy

### 13.1 Dwa sortowania (świadomy detail)

**Publiczna tabela** (`lib/public/standings.ts` → `buildPublicStandings`) — zgodna z regulaminem na stronie:

1. `totalPoints` (H2H + Med) DESC  
2. `fplPoints` DESC  
3. `h2hPoints` DESC  
4. `teamId` (stabilny tie-break)

**Admin `buildStandings`** (`lib/admin/standings.ts`) — nieco inna kaskada wewnętrzna:

1. `totalPoints`  
2. `h2hPoints`  
3. `medianPoints`  
4. `fplPoints`  
5. `fplDiff`  
6. `teamId`

**Pary barażowe** (`sortStandingsDesc` w `playoffPairs.ts`):

1. `totalPoints`  
2. `fplPoints`  
3. `teamId`

Publiczny widok jest kanonem dla kibica. EoS używa `buildStandings` + `sortStandingsDesc` — przy skrajnym remisie kolejność 8./3. miejsca może teoretycznie różnić się o trzeci klucz. W praktyce przy 10 osobach i FPL jako drugim kluczu publicznym to rzadkie; jeśli kiedyś ujednolicać, publiczny porządek jest właściwym celem.

Do tabeli **wchodzą tylko** mecze `is_finished` **i** faza zasadnicza (`!is_playoff && !isPlayoffGameweek`). Baraż nie psuje miejsc 1–10 przed rozliczeniem.

Forma (ostatnie 5): pill W/D/L + flaga mediany.

### 13.2 Strefy kolorystyczne `zoneFor`

Dla `position` 1-based, `total` = liczba drużyn (10), `tier`, `isLowestDivision`:

**Najniższa dywizja:** brak `relegation` i `playoff_down` (nie ma dokąd spaść). Zostają awanse / baraż w górę (jeśli to nie jedyna liga).

**Tier 1 (Premier League):**

| Pozycja | Strefa | Znaczenie |
|---------|--------|-----------|
| 1 | `gold` | Mistrz |
| 2 | `silver` | Wicemistrz |
| 3 | `bronze` | 3. miejsce |
| 8 | `playoff_down` | Baraż o utrzymanie vs 3. niższej |
| 9–10 | `relegation` | Spadek bezpośredni |
| reszta | `mid` | Utrzymanie |

**Tier 2+ (nie najniższy):**

| Pozycja | Strefa |
|---------|--------|
| 1–2 | `promotion` |
| 3 | `playoff_up` |
| 8 | `playoff_down` |
| 9–10 | `relegation` |
| 4–7 | `mid` |

`fromBottom = total - position + 1` — 1 = ostatni.

**Dlaczego 2+2+baraż, a nie 3 spadki:** przy 10 osobach 20% spada bezpośrednio, 10% gra baraż — piramida oddycha bez totalnego chaosu. 3. miejsce niższej vs 8. wyższej to klasyczny „play-off” angielski (nie 4–7 w play-offach Championship, tylko jeden mecz, bo mamy jedną kolejkę FPL).

---

## 14. Terminarz Bergera

Źródło: `lib/admin/berger.ts`.

Algorytm **circle method**:

- N parzyste (u nas 10). Jeśli nieparzyste — dopisek `__BYE__` (nie używany przy regule 10).
- Rundy pierwszej połowy: `N - 1` (= 9).
- Indeks 0 stały, reszta rotuje: ostatni → pozycja 1.
- Gospodarz/gość w pierwszej połowie: `(r + i) % 2`.
- Druga połowa: te same pary, **zamiana stron**, `gameweek += 9`.

Wynik: **18 kolejek**, każdy z każdym u siebie i na wyjeździe.

Przed insertem IDs są tasowane (`shuffleInPlace`), żeby kolejność w tabeli DB nie determinowała par 1. kolejki.

**Offset GW:** przy sezonie wiosennym `bergerGwOffset = 19` (GW1 Bergera → FPL GW20). `finalizeSeasonTransition` dodaje offset do `gameweek`.

Berger **nigdy** nie tworzy GW19/38 — baraże są generowane osobno z tabel.

**Dlaczego Berger, a nie losowanie każdej kolejki:** gwarantuje fairness (każdy gra z każdym 2×), 18 GW = dokładnie faza zasadnicza, zero BYE.

---

## 15. Baraże (GW19 / GW38)

### 15.1 Kto z kim

Źródło: `lib/admin/playoffPairs.ts`.

Dla każdej pary sąsiednich tierów w piramidzie (`consecutiveTierBoundaries`):

- **Gospodarz:** 8. miejsce wyższej dywizji (indeks 7 po sortowaniu DESC) — gra o **utrzymanie**.
- **Gość:** 3. miejsce niższej dywizji (indeks 2) — gra o **awans**.

Najniższy szczebel nie ma barażu w dół. Tier 1 nie ma barażu w górę.

Mecz jest pucharowy: wygrywa jeden, drugi odpada. **Nie** stosuje się ligowego 1–1 jako „oba dostają punkt”.

### 15.2 Kaskada tie-break (regulamin §4.2)

Źródło: `lib/admin/playoffTiebreak.ts` → `resolvePlayoffWinner`.

```
1. FPL (wyższy wygrywa)
2. Gole XI (więcej goli strzelonych składem)
3. Stracone GK+DEF (mniej = lepiej)
4. Punkty na ławce (więcej = lepiej)
5. Wirtualny rzut monetą (admin wskazuje zwycięzcę)
```

UI odblokowuje kolejne pola tylko gdy wyższy poziom jest remisem (`cascadeVisibility`). Po rozstrzygnięciu niższego poziomu pola poniżej są czyszczone (nie zostają śmieci w DB).

Wynik zapisuje `tiebreaker_winner_id`, `tiebreaker_method`, `tiebreaker_reason` oraz marker `home_h2h_points` 2–0 **wyłącznie jako wewnętrzna flaga zwycięzcy** — nie wyświetlać kibicowi jako „H2H ligowe”.

`cupOutcomesForWinner`: gospodarz wygrywa → UTRZYMANIE / BRAK AWANSU; gość wygrywa → SPADEK / AWANS.

`buildPlayoffDecisionPath` — czytelna ścieżka remisów dla Strefy Gracza.

### 15.3 Podgląd publiczny

`lib/public/playoffs.ts` buduje **prowizoryczne** pary z aktualnej tabeli, dopóki nie ma opublikowanego fixture barażowego. Badge: `⚔️ MECZ BARAŻOWY O AWANS / UTRZYMANIE`.

### 15.4 Ingest barażu

Przy zapisie FPL w GW playoff: jeśli FPL różne — mecz `is_finished`, TB wyczyszczone. Jeśli FPL remis — `is_finished=false`, admin uzupełnia Gole XI itd. przez `savePlayoffTiebreak`. Mediana ligowa nie wchodzi.

---

## 16. The FA Ranking

Źródło: `lib/public/faRanking.ts` + tabela `team_gameweek_scores`.

### 16.1 Czym jest, a czym nie jest

To **ranking overall punktów FPL** w lidze Classic „Na Minusie ™” (kampania rok rozgrywkowy), **nie** tabela H2H. Mediana i H2H nie mają tu znaczenia. Liczy się suma małych punktów FPL ze wszystkich GW kampanii, w tym GW19 i GW38.

### 16.2 Tożsamość gracza między sezonami

```
faPlayerKey(team) =
  fpl_id   → "fpl:{id}"
  else     → "discord:{nick.lower}"
```

Jesień i wiosna to dwa wiersze `teams` (inne UUID), ale ten sam człowiek. Ranking skleja ich po kluczu. Wyświetlana karta: nowszy sezon / kotwica (`preferTeam`).

### 16.3 Kampania (Rok Rozgrywkowy)

`resolveCampaignSeasonIds(seasons, anchor)`:

- Kotwica jesień → dołącz następną wiosnę (jeśli istnieje).
- Kotwica wiosna → dołącz poprzednią jesień.

Label kampanii składa się z nazw obu sezonów.

### 16.4 Agregacja punktów

`buildFARanking(teams, fixtures, campaignIds, …, scores)`:

1. Jeśli `scores` (z `team_gameweek_scores`) niepuste — **tylko one** (preferowane).
2. W przeciwnym razie fallback: opublikowane, skończone fixtures (legacy; **gubi** ludzi bez meczu H2H w barażach).

Jedna wartość na GW (`byGw.has` — bez podwójnego sumowania).

### 16.5 Trend

Pozycja vs pozycja **bez ostatniej skończonej GW**. `trendDelta = prevPos - position` (dodatnie = awans w rankingu). Wymaga ≥ 2 skończonych GW.

### 16.6 Okna formy

- Zawsze: „Ostatnie 6 GW”.
- Plus paczki `from..from+5` w zakresie skończonych GW.

Badge kolor: ≥65 emerald, ≤35 rose, środek slate.

### 16.7 Eksport Content Hub

`chunkFARankingRows(rows, 10)` — karuzele po 10. Osobny eksport **uczestników** (`FaRankingParticipantsExportNode.tsx`): siatka 6 kolumn, 1920 px, founderzy przypięci (AFC Richmond / Watford), cinematic footer St0pa × Baldwiniasty. Wysyłka na webhook `GLOBAL / FA_RANKING`.

---

## 17. Rozliczenie sezonu (EoS) i Draft Board

### 17.1 Statusy

Źródło: `lib/admin/endSeasonStatuses.ts`.

```
CHAMPION | RUNNER_UP | THIRD_PLACE
PROMOTED_DIRECTLY | PROMOTED_PLAYOFF
SAFE
RELEGATED_PLAYOFF | RELEGATED_DIRECTLY
WAITING_ROOM          // dywizja < 10, poza piramidą
```

`next_tier` = szczebel w **następnym** sezonie (`null` = poczekalnia).

Aktywna dywizja do rozliczenia = dokładnie 10 graczy. `ACTUAL_MAX_TIER` = najwyższy tier z pełną dziesiątką (niepełne na dole nie tworzą „spadku w próżnię”).

### 17.2 Macierz (10 osób)

Jedyna dywizja w piramidzie: podium + SAFE, zero awansów/spadków.

**Tier 1:** 1–3 podium, 4–7 SAFE, 8. baraż (wygrana → SAFE, porażka → RELEGATED_PLAYOFF tier 2), 9–10 RELEGATED_DIRECTLY.

**Środek:** 1–2 PROMOTED_DIRECTLY, 3. baraż w górę, 4–7 SAFE, 8. baraż w dół, 9–10 spadek.

**Dół:** 1–2 awans, 3. baraż, 4–10 SAFE (nikt nie spada).

Baraż nierozstrzygnięty → `playoffPending`, status tymczasowo SAFE na obecnym tierze.

Zwycięzca barażu: `tiebreaker_winner_id` → różnica FPL → marker H2H 2:0 (`resolvePlayoffMatchWinnerId`).

### 17.3 Kalkulacja wspólna

`runCalculateEndSeasonStatuses` (`endSeasonCompute.ts`) ładuje opublikowane mecze, odcina baraże, buduje ranking, woła `evaluateDivisionEndStatuses`. Publiczne Podsumowanie i admin używają **tej samej** funkcji.

Archiwum: jeśli `teams.division_id` już wskazuje nowy sezon, składy historyczne biorą się z fixtures.

### 17.4 Draft Board

Źródło: `lib/admin/seasonDraft.ts` + `app/admin/actions/seasonTransition.ts`.

Kolumny = `next_tier`. Poczekalnia = WAITING_ROOM + świeżacy. Rezygnacja (`applyResignation`):

1. Usuń gracza z kolumny.
2. Z niższej kolumny weź najlepszego **kandydata kaskady** (nie osoby, które już awansowały/spadły regulaminowo).
3. Powtórz w dół, aż luka zniknie albo brak kandydatów.

Świeżak idzie do poczekalni, nie do PL.

`isBoardBalanced`: każda kolumna = 10. Dopiero wtedy `finalizeSeasonTransition`:

1. Archiwizuje stary sezon (`is_archived`, `is_completed`, `PUBLISHED`).
2. Tworzy nowy sezon (nazwa sugerowana z fazy).
3. Tworzy dywizje, przenosi/insertuje graczy.
4. Generuje Berger z offsetem GW.
5. Rezygnacje: `is_active=false` / poza składem.

Brak pełnej transakcji SQL w kliencie JS — kroki sekwencyjne, early return przy błędzie. Krytyczne okno jest małe; w razie padu w połowie trzeba sprawdzić `is_archived` ręcznie.

`markSeasonCompleted` — flaga podsumowania **bez** tworzenia nowego sezonu (baraże skończone, draft później).

---

## 18. Workspace — ingest wyników FPL

Źródło: `app/admin/actions/workspace.ts` + UI `GameweekWorkspace`.

### 18.1 Model brudnopisu

Wyniki żyją w tych samych `fixtures` / `team_gameweek_scores`. Różnica: `is_published`.

- Zapis draftu → publiczność nic nie widzi (RLS).
- Publikacja → flaga true + revalidate Strefy Gracza.
- Cofnięcie publikacji → z powrotem draft.

Nie publikuje się dywizji niepełnej.

### 18.2 Ścieżki zapisu

| Akcja | Zakres |
|-------|--------|
| `saveSeasonGameweekDraft` / `publishSeasonGameweek` | Cały sezon, jedna GW |
| `saveDivisionGameweekDraft` / `publishDivisionGameweek` | Jedna dywizja |
| `importGlobalGameweekResults` | Wklejka multi-GW / Classic → mapowanie wszystkich dywizji |
| `processGameweekPoints` | Legacy per-dywizja |
| `savePlayoffTiebreak` | Kaskada TB barażu |
| `clear*Draft` | Zeruje FPL/H2H/medianę w brudnopisie |

Przy zapisie punktów ligowych zawsze upsert `team_gameweek_scores` (FA Ranking nie zależy od tego, czy para H2H istnieje). W GW19/38 osoby **bez** barażu i tak dostają FPL do rankingu (import globalny / solo w symulatorze).

### 18.3 Źródło danych FPL

**Nie ma live API FPL w backendzie.** Operator kopiuje tabelę z `fantasy.premierleague.com` (liga Classic) i wkleja. Parsery tolerują tab/przecinek/nagłówki.

Dlaczego wklejka, nie API: oficjalne API FPL nie jest publicznym kontraktem, rate-limit i CORS; wklejka z ligi Classic jest źródłem, które i tak administracja weryfikuje wzrokiem; awaria API nie blokuje GW.

### 18.4 Publikacja

`publishSeasonGameweek` wymaga pełnych 10 w każdej publikowanej dywizji, oznacza fixtures + scores jako published. `unpublish` odwrotnie.

---

## 19. Strefa Gracza

Źródło: `lib/public/actions.ts`, `lib/public/playerZone.ts`, `components/na-minusie/hub/*`.

### 19.1 Ładowanie struktury

`getPublicStructure` — sezony PUBLISHED, dywizje przefiltrowane `filterCompleteDivisions`:

- Sezon żywy: tylko 10 aktywnych drużyn.
- Sezon completed/archived: dywizje, które mają opublikowane mecze (nawet jeśli gracze już w nowym sezonie).

### 19.2 Zakładki

| Tab | Dane |
|-----|------|
| Tabela | `getDivisionStandings` → `buildPublicStandings` + strefy + forma |
| Wyniki | `getGameweekDetails` — karty meczów, próg mediany, ranking FPL w GW |
| Terminarz | Wszystkie GW, w tym przyszłe (bez punktów) |
| Statystyki | `computeSeasonStats` (pantheon, blowout, nail-biter, …) |
| Uczestnicy | Roster + herby |
| Podsumowanie | EoS statusy gdy `is_completed` |
| FA Ranking | Kampania + okna formy |

Hub trzyma wybraną dywizję/sezon w URL search params (shareable).

### 19.3 Profil gracza

`/strefa-gracza/[teamId]`: historia meczów, H2H, mediana, baraże z `buildPlayoffDecisionPath`, miejsce w tabeli.

Wyszukiwarka: `dedupePlayerSearchEntries` (ten sam człowiek w wielu sezonach).

### 19.4 Widoczność brudnopisu

Kibic **nigdy** nie widzi nieopublikowanych FPL. Admin w Content Hub może zaciągnąć draft (`getContentHubCaptureData` idzie przez sesję authenticated) — żeby przygotować grafikę przed „go live”.

---

## 20. Content Hub i eksport PNG

Źródło: `app/admin/actions/contentHub.ts`, `components/admin/content-hub/*`.

### 20.1 Po co

Po każdej GW admin publikuje w Discord (kanały dywizji) i X.com: tabela, wyniki, FA Ranking, lista uczestników.

### 20.2 Dane

- `getContentHubCaptureData(divisionId, gw)` — standings + szczegóły GW (także draft).
- `generateXComDraft` / `generatePreviewDiscordJSON` — szkice tekstu/embed.
- `getFaRankingParticipantsRoster` — siatka 50+ herbów.

### 20.3 PNG

Off-screen React node + `html-to-image`. Węzły m.in.:

- wyniki GW + tabela dywizji,
- struktura dywizji,
- FA Ranking (paczki),
- uczestnicy FA Ranking (`FaRankingParticipantsExportNode`: 1920 px, 6 kolumn, duże herby, founder lockup, footer cinematic, **bez** „50 uczestników” jako liczby marketingowej po prawej).

Załącznik custom image — admin może dodać własny plik do wysyłki.

### 20.4 Wysyłka Discord

Historycznie Server Action POSTowała webhook — **padało po cichu przy ~6.3 MB PNG** (limit body Next/Vercel ~4.5 MB).

Obecnie:

1. Server Action `getDiscordWebhookForSend(target)` zwraca **tylko URL** zalogowanemu adminowi.
2. Przeglądarka `postDiscordWebhookFromClient` (`lib/admin/discordClientSend.ts`) robi `fetch` na Discord CORS: JSON albo `multipart/form-data` (`payload_json` + `files[i]`).
3. Limity klienta: max 10 plików, 25 MB łącznie (limit Discord).

Target: `{ kind: "division", divisionId }` albo `{ kind: "global", channel: "fa_ranking" | "fa_cup", seasonId }`.

Walidacja JSON: tablica embedów, obiekt z `embeds`/`content`, albo pojedynczy embed.

---

## 21. Webhooki Discord

Źródło: `lib/admin/discordWebhooks.ts`, `app/admin/actions/discordWebhooks.ts`, `lib/admin/discordClientSend.ts`, UI `/admin/webhooks`, Content Hub.

### 21.1 Model trwały + dwa serwery

Kolumna **`server_target`**: `NA_MINUSIE` (liga live) | `FPL_ARENA` (ukryty backup St0py).

- Ten sam układ kanałów: 2 globalne (FA Ranking, FA Cup) + Level 1…N (tier dywizji).
- **Unique:** `(global_type, server_target)` oraz `(division_level, server_target)`.
- Migracja: `supabase/migrations/add_discord_webhooks_server_target.sql`.

Klucz biznesowy to **poziom ligi (tier)** albo **typ globalny**, nie UUID dywizji w danym sezonie.

Walidacja URL: `https` + host `discord.com` | `discordapp.com` + path `/api/webhooks/`.

### 21.2 Panel `/admin/webhooks`

Zakładki: **Na Minusie ™** | **FPL Arena (Backup)**. W każdej osobne URL-e. Hard Reset nie kasuje tabeli.

### 21.3 Content Hub — wysyłka

Checkboxy: Na Minusie (domyślnie) / FPL Arena / oba. `getDiscordWebhookForSend` zwraca tablicę URL; klient robi `Promise.all` (`postDiscordWebhookFromClient`).

### 21.4 Hard Reset

`wipeLeagueData` kasuje: `fixtures`, `teams`, `divisions`, `seasons`, `pyramids`. **Nie kasuje:** `discord_webhooks`, Auth.

### 21.5 Legacy

Kolumny `divisions.discord_webhook_url` i `seasons.fa_*_webhook_url` — nie używać przy nowych feature’ach.

---

## 22. Symulator sezonu

Źródło: `lib/admin/simulatorScenarios.ts`, `app/admin/actions/simulator.ts`.

Sandbox na **prawdziwej** strukturze (ci sami gracze, te same fixtures). Losuje FPL i odpalają ten sam silnik 2+1 + scores.

| Scenariusz | Zakres FPL | Po co |
|------------|------------|--------|
| `CHAOS` | 30–100 | Normalny rozrzut |
| `NEGATIVE` | −10–30 | Ujemne / hit |
| `TIGHT` | 50–55 | Test sortowania / tie-break |
| `DRAW_FESTIVAL` | identyczne pary | Remisy H2H 1–1 + kaskada mediany |

`rollFplSolo` — osoby bez meczu H2H w GW barażowym (FA Ranking).

Blokada: dywizja ≠ 10/10. Symulacja może publikować (ostrożnie na produkcji) — to ten sam `is_published`.

---

## 23. Logotypy klubów i dywizji

### 23.1 Kluby

`lib/admin/clubLogos.ts`:

- Seed git: `public/club-logos/` + `index.json`.
- Runtime: `public/uploads/logos/` (max 2 MB, kwadrat ~400×400, PNG z alfa).
- `deletedKeys` — po `git pull` seed nie wraca na UI, jeśli admin usunął herb.
- Klucz: slug z nazwy (`west-ham-united`).
- Rozmiary kanoniczne: xs 36 … hero 112.

Rewrite `/uploads/logos/:file` → `/api/uploads/logos/:file` — pliki dodane po `next build` nadal się serwują.

Publiczny crest: `lib/public/clubCrest.ts` mapuje `chosen_club` → plik.

### 23.2 Szczeble

Analogicznie `tierLogos.ts` / `/admin/tier-logos`. Używane na kartach dywizji i eksportach.

### 23.3 Unikalność klubu

Rekrutacja: jeden Discord Club na osobę. Lista zajętych/wolnych z Google Sheets (LIVE VIEW kolumna S + baza). Po starcie sezonu `chosen_club` siedzi w `teams`.

---

## 24. Panel administratora — katalog modułów

Nawigacja: `lib/admin/navigation.ts`.

### Liga (Live)

- **Dashboard** — liczniki, alerty niepełnych dywizji.
- **Struktura Ligi** — CRUD sezonów/piramid/dywizji, status PUBLISHED, nazewnictwo fazy.
- **Baza Graczy** — Master Import Excel (kolumny FPL Manager, Discord, FPL ID, Team, Club, fee, OR, x.com, e-mail). Przypisanie do dywizji, `is_active`.
- **Content Hub** — §20.
- **Webhooki Discord** — §21.

### Rozgrywki

- **Edytor Kolejek (Workspace)** — §18. Berger (jeśli brak fixtures), wklejka, publikacja, TB baraży.
- **Rozliczenie Sezonu** — §17.

### Assety

- Logotypy dywizji i klubów.

### Symulacje

- Symulator — §22.

### Danger Zone (`/admin/settings`)

- Wipe z frazą `POTWIERDZAM` + checkbox.
- Osobne czyszczenie wyników / terminarza sezonu (nie mylić z pełnym wipe).

Starsze strony (`fixture-draw`, `data-ingestion`, `gw-results`) mogą być aliasami lub legacy UI — kanon to Workspace.

---

## 25. Server Actions — katalog API

Wszystkie `"use server"`. Wymagają sesji (admin) albo są publiczne (read-only).

### Publiczne (`lib/public/actions.ts`, `playerZone.ts`)

- `getPublicStructure`, `getDivisionStandings`, `getGameweekDetails`
- `getFARankingData`, `getPublicSeasonSummary`
- `getPlayerZoneOverview`, profil, wyszukiwarka
- `getPublicClubLogos`, `getPublicTierLogos`
- `getAvailableClubs` / `getRecruitmentClubsData`

### Admin — workspace

`getSeasonGameweek`, `importGlobalGameweekResults`, `save/publish/unpublish/clear` (sezon i dywizja), `savePlayoffTiebreak`, `getSeasonPlayoffFixtures`, …

### Admin — sezon

`markSeasonCompleted`, `loadSeasonDraftBoard`, `finalizeSeasonTransition`

### Admin — content / discord

`getContentHubCaptureData`, `generateXComDraft`, `generatePreviewDiscordJSON`, `getDiscordWebhookForSend`, `getFaRankingParticipantsRoster`, CRUD webhooków

### Admin — struktura / gracze / logo / db

`app/admin/actions.ts`, `db.ts`, `masterImport.ts`, `playerActions.ts`, `fixtures.ts` (Berger), `clubLogos.ts`, `tierLogos.ts`, `simulator.ts`, `endSeason.ts`

Nie ma REST `/api/v1` dla ligi — kontrakt to Server Actions + RSC.

---

## 26. Workflow operacyjny sezonu

### A. Przed GW1

1. Utwórz sezon (nazwa z fazą) + piramidę + dywizje tier 1…N.
2. Master Import / ręczni gracze, kluby unikalne, `fpl_id` obowiązkowe do FA Ranking.
3. Uzupełnij do 10/10 (albo ukryj niepełne).
4. Berger (offset 0 jesień / 19 wiosna).
5. Ustaw webhooki (raz na zawsze).
6. `status = PUBLISHED`.
7. Logo klubów / szczebli.

### B. Każda kolejka fazy zasadniczej

1. Po deadline FPL: skopiuj tabelę Classic.
2. Workspace → wklejka → sprawdź `unmatched`.
3. Skoryguj brudnopis ręcznie jeśli trzeba.
4. Content Hub: PNG z draftu, recenzja.
5. Publikacja GW.
6. Discord (client POST) + X.

### C. GW19 / GW38

1. Upewnij się, że tabela 1–18 / 20–37 jest opublikowana (pary 8 vs 3).
2. Wygeneruj / zapisz fixtures barażowe.
3. Wklej FPL **wszystkich** (scores do FA Ranking).
4. Pary barażowe: jeśli remis FPL → TB w UI.
5. `markSeasonCompleted` gdy wszystkie baraże mają zwycięzcę.
6. Podsumowanie publiczne.

### D. Przerwa między sezonami

1. Draft Board: rezygnacje, kaskady, świeżacy.
2. Wyrównaj 10/10.
3. `finalizeSeasonTransition` → nowy Berger.
4. Stary sezon zostaje archiwum w Strefie Gracza.

### E. Disaster recovery

- Cofnij publikację GW, popraw, publikuj ponownie.
- Clear draft / clear season results (Danger Zone) — nie rusza webhooków.
- Pełny wipe tylko z `POTWIERDZAM`.

---

## 27. Statystyki i rekordy

Źródło: `lib/public/seasonStats.ts`. Tylko mecze ligowe skończone, **bez baraży**.

| Kind | Definicja |
|------|-----------|
| `top_scorer_gw` / `gw_top` | Najwyższy FPL w meczu |
| `red_lantern` / `gw_low` | Najniższy FPL |
| `median_king` | Najwięcej bonusów +1 w sezonie |
| `win_streak` | Najdłuższa seria H2H wygranych (≥2) |
| `unlucky_loser` | Wysoki FPL przy H2H 0 (pech pary) |
| `lucky_winner` | Niski FPL przy H2H 2 |
| blowout / nail-biter | Max / min margines FPL w GW (remis 0 wykluczony z nail-biter) |

Próg mediany w archiwum GW = ten sam `medianThreshold` (5. najwyższy).

`averageFplFromFinished` — średnia małych punktów do profili.

---

## 28. Rekrutacja i źródła Google Sheets

Landing **nie** zapisuje zgłoszeń do Supabase. Formularz Google + arkusz LIVE.

| Źródło | URL w | Rola |
|--------|-------|------|
| Formularz zgłoszeniowy | `NA_MINUSIE_LINKS.form` | CTA (obecnie zamknięte w UI) |
| LIVE VIEW CSV | `clubsCsv` | Kolumna S = przykładowe wolne kluby; statusy rezerwacji |
| Baza uczestników CSV | `bazaCsv` | FPL Manager / Team / Discord Club / OR |

`getRecruitmentClubsData` (`lib/public/getAvailableClubs.ts`):

- Parsuje oba CSV (papaparse).
- `reservedClubs` — zajęty klub, status ≠ Potwierdzony i ≠ Brak zgłoszenia.
- `blockedClubs` — Brak zgłoszenia.
- `availableClubs` — reszta minus baza potwierdzonych.
- Cache `unstable_cache`.
- Discord nick display: `resolveDiscordDisplayNick`.

Hero pokazuje pojemność (ilu graczy w bazie vs sloty).

Po starcie sezonu źródłem obsady jest **Supabase `teams`**, nie Sheets. Sheets zostają do landingu / dywizji marketingowych.

Deadline’y z regulaminu (treść, nie kod): główny formularz do 9.08.2026 23:59; uzupełniająca do 21.08.2026 19:30. Kod do ligi Classic FPL: 24 h na join po DM.

---

## 29. Znane ograniczenia i świadome decyzje

1. **Brak oficjalnego API FPL** — wklejka jest feature’em, nie długiem.
2. **Faza sezonu z nazwy** — literówka „Wiosna” vs brak słowa = zły zakres GW. Operator musi trzymać konwencję nazw.
3. **Dwa sortowania tabeli** (public vs admin EoS) — ujednolicenie byłoby refaktorem; publiczny regulamin jest kanonem kibica.
4. **Brak transakcji SQL** przy `finalizeSeasonTransition` — nie przerywać w połowie; sprawdzić flagi po błędzie.
5. **RLS authenticated = pełny zapis** — tylko zaufani admini w Auth.
6. **FA Cup** — webhook globalny istnieje, silnika pucharowego nie ma.
7. **TypeScript ignoreBuildErrors** — legacy Arena; nowy kod Na Minusie i tak powinien być czysty.
8. **PNG z klienta** — webhook URL ląduje w przeglądarce admina (to zamierzone; nie logować URL w analytics).
9. **OneDrive + znaki `-=` w ścieżce** — cache webpack wyłączony w dev.
10. **Niepełna dywizja** — świadomie niewidoczna publicznie; nie da się „grać 8-osobowej ligi” bez zmiany `DIVISION_CAPACITY` i regulaminu (opcja B w regulaminie jest procedurą ludzką, nie zaimplementowaną automatycznie).
11. **Baraż w `division_id` gospodarza** — zapytania „wszystkie mecze dywizji X” w GW19 zawierają mecz 8. vs gościa z dołu, nie mecz 3. miejsca tej dywizji (ten jest w fidze wyższej ligi). UI baraży to uwzględnia.
12. **Hard Reset nie czyści `team_gameweek_scores` osobno** — tabela ma FK CASCADE do `seasons`/`teams`, więc znika razem z wipe sezonów/graczy. Webhooki zostają.

---

## 30. Mapa plików

### Silniki (czytaj w tej kolejności)

```
lib/public/season.ts                 Kalendarz GW / faza
lib/admin/divisionCapacity.ts        Reguła 10
lib/admin/medianEngine.ts            H2H + mediana + parsery
lib/admin/berger.ts                  Terminarz
lib/admin/standings.ts               Tabela admin / EoS
lib/public/standings.ts              Tabela publiczna + strefy
lib/admin/playoffPairs.ts            8 vs 3
lib/admin/playoffTiebreak.ts         Kaskada TB
lib/public/playoffs.ts               Podgląd baraży
lib/public/faRanking.ts              Overall FPL
lib/admin/teamGameweekScores.ts      I/O scores
lib/admin/endSeasonStatuses.ts       Macierz awansów
lib/admin/endSeasonCompute.ts        EoS + DB
lib/admin/seasonDraft.ts             Kaskady rezygnacji
lib/public/seasonStats.ts            Rekordy
lib/admin/simulatorScenarios.ts      Losowanie FPL
lib/admin/discordWebhooks.ts         Typy / walidacja URL
lib/admin/discordClientSend.ts       POST z przeglądarki
```

### I/O

```
app/admin/actions/workspace.ts
app/admin/actions/seasonTransition.ts
app/admin/actions/contentHub.ts
app/admin/actions/discordWebhooks.ts
app/admin/actions/simulator.ts
app/admin/actions/fixtures.ts
app/admin/actions/masterImport.ts
app/admin/actions/db.ts              w tym wipeLeagueData
lib/public/actions.ts
lib/public/playerZone.ts
lib/public/getAvailableClubs.ts
```

### UI kluczowe

```
components/admin/GameweekWorkspace.tsx
components/admin/content-hub/
components/admin/content-hub/FaRankingParticipantsExportNode.tsx
components/na-minusie/hub/HubShell.tsx
components/na-minusie/hub/StandingsTable.tsx
components/na-minusie/HowToJoinSection.tsx
```

### Schema

```
supabase/schema.sql
supabase/migrations/add_team_gameweek_scores.sql
supabase/migrations/add_discord_webhooks.sql
```

### Produkt / copy

```
lib/na-minusie/regulaminContent.ts
lib/na-minusie/navigation.ts
lib/na-minusie/links.ts
lib/na-minusie/branding.ts
lib/admin/navigation.ts
```

---

## 31. Słownik pojęć

| Termin | Znaczenie |
|--------|-----------|
| **Małe punkty** | Punkty FPL w kolejce (XI + eventy gry Fantasy) |
| **Duże punkty** | H2H (0/1/2) + bonus mediany (0/1) |
| **Mediana 2+1** | System: pojedynek 2–0 lub 1–1 plus +1 za próg 5. wyniku |
| **Próg mediany** | 5. najwyższy FPL w dywizji w GW |
| **Brudnopis** | `is_published = false` — tylko admin |
| **Publikacja** | Flaga widoczności + RLS |
| **Berger** | Terminarz każdy z każdym + rewanże, 18 GW |
| **Baraż** | GW19/38, 8. wyższej vs 3. niższej, puchar nie liga |
| **Tier** | Szczebel piramidy (1 = PL) |
| **Piramida** | Zestaw dywizji jednego „toru” awansów |
| **Kampania** | Para sezonów jesień+wiosna do FA Ranking |
| **The FA Ranking** | Suma FPL overall, nie H2H |
| **EoS** | End of Season — statusy + `next_tier` |
| **Draft Board** | Tablica przenosin przed nowym sezonem |
| **WAITING_ROOM** | Niepełna obsada / rekrutacja, poza rozliczeniem |
| **Kaskada rezygnacji** | Awans zastępcy z niższej kolumny draftu |
| **Founder lockup** | AFC Richmond / Watford na eksporcie uczestników |
| **Hard Reset** | Wipe ligi bez webhooków i kont Auth |

---

*Dokument v2.0 zastępuje v1.0 z 30 lipca 2026 (tamten tekst opisywał hub wyników i medianę jako niezaimplementowane — to już nieaktualne).*
