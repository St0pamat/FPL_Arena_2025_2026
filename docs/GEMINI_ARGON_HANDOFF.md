# FPL Arena / Na Minusie ™ — Handoff techniczny dla Gemini Argon

> **Wersja:** 4.0 (pełny snapshot stanu kodu)  
> **Data:** 6 listopada 2026  
> **Repo lokalne:** `fpl-arena-skarb-kibica`  
> **GitHub (historycznie):** `St0pamat/FPL_Arena_2025_2026`  
> **Produkcja:** VPS `/var/www/fpl-tracker`, PM2 `na-minusie`  
> **Cel dokumentu:** jednorazowy, ekspercki kontekst dla modelu AI (Gemini Argon) — *co już istnieje, jak działa, czego NIE budować od zera*.

### Jak używać tego pliku

1. Wklej **całość** jako kontekst systemowy / pierwszą wiadomość.
2. Kod jest źródłem prawdy ponad tym dokumentem, gdy się rozjeżdżają.
3. Algorytmy punktacji / baraży / FA Ranking — szczegóły historyczne w `docs/NA_MINUSIE_TECHNICAL.md` (v3, 18.08.2026). Ten plik jest **aktualizacją stanu systemu + delta**.
4. **Nie commituj** bez prośby użytkownika. Hard Reset **nie** kasuje `discord_webhooks` ani Auth.

---

## 0. Executive summary (30 sekund)

Monorepo Next.js 14 łączy:

| Produkt | URL | Status |
|---------|-----|--------|
| **Na Minusie ™** | `/na-minusie`, `/strefa-gracza`, `/admin/*` | **Aktywna liga H2H** (Mediana 2+1), 5 dywizji × 10 graczy |
| **No Big Six** | `/no-big-six`, `/admin/no-big-six/*` | **Aktywna** liga/challenge oddzielony schematycznie (`no_big_six_*`) |
| **FPL Arena (archiwum)** | `/arena` | Legacy Vite SPA w `src/` (Skarb Kibica 2025/26) |
| **Mates / Igrzyska** | — | Placeholder w nawigacji admina (`enabled: false`) |

**Stack:** Next.js 14 App Router · React 18 · Supabase (Postgres + Auth + RLS) · Tailwind 3 · Server Actions · `html-to-image` · PapaParse.

**Integracje zewnętrzne (stan 11.2026):**
- Discord webhooks (dual-server: `NA_MINUSIE` + `FPL_ARENA`)
- **n8n →** `POST /api/n8n/gw-decisions` → tabela `team_gw_decisions` (fundament pod personalizowane zapowiedzi)
- Content Hub: multi-select dywizji, masowa generacja X/Discord, sekwencyjna wysyłka PNG

---

## 1. Architektura wysokiego poziomu

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     Next.js 14 (jedyny serwer produkcyjny)                │
│  /  ·  /arena  ·  /na-minusie/*  ·  /strefa-gracza/*  ·  /no-big-six     │
│  /admin/*  ·  /api/n8n/*  ·  /api/uploads/*  ·  /api/admin/*             │
│  middleware.ts  →  TYLKO /admin/:path* (sesja Supabase)                  │
├────────────────────────────┬─────────────────────────────────────────────┤
│ Legacy Vite (`src/`)       │ Na Minusie + No Big Six                     │
│ alias @arena → src/        │ app/ + components/ + lib/                   │
│ ArenaAppClient             │ Server Actions + RLS + service role (n8n)   │
└────────────────────────────┴──────────────────┬──────────────────────────┘
                                                ▼
                                     Supabase (Postgres + Auth)
```

### Warstwy kodu (kanon)

| Warstwa | Ścieżka | Zasada |
|---------|---------|--------|
| Routing RSC | `app/` | Strony, layouty, metadata |
| UI | `components/admin/`, `components/na-minusie/`, `components/no-big-six/`, `components/strefa-gracza/` | Widoki, PNG off-screen, formularze |
| **Silniki czyste** | `lib/admin/`, `lib/public/`, `lib/no-big-six/` | Logika bez I/O — testowalna |
| I/O | `app/admin/actions/*.ts`, `lib/public/actions.ts` | Server Actions + Supabase user client |
| Service role | `lib/supabase/service.ts` | **Tylko** serwer; obecnie n8n |
| Produkt / brand | `lib/na-minusie/` | Nawigacja, regulamin, linki, hub tabs |
| Schema | `supabase/schema.sql` + `supabase/migrations/` | Źródło prawdy DB |

### Kluczowa decyzja: brudnopis vs publikacja

`fixtures.is_published` oraz `team_gameweek_scores.is_published` sterują widocznością publiczną. RLS dla `anon` filtruje do `is_published = true`. Admin (`authenticated`) widzi draft. Content Hub może generować PNG/JSON z draftu przed publikacją.

---

## 2. Stack i toolchain

### Zależności (`package.json`)

- `next` ^14.2.35, `react`/`react-dom` 18.3
- `@supabase/ssr` ^0.12.4, `@supabase/supabase-js` ^2.111
- `html-to-image` ^1.11 — PNG (Content Hub, hub, No Big Six)
- `papaparse` ^5.5 — Master Import / CSV
- `lucide-react`, `tailwindcss` 3.4, `typescript` ~5.7, `vite` 6 (legacy Arena)

### Skrypty

| Komenda | Działanie |
|---------|-----------|
| `npm run dev` | `scripts/dev-next.mjs` (+ `predev` sync public; TLS relax) |
| `npm run dev:strict` | czysty `next dev` |
| `npm run build` / `start` | produkcja Next |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run dev:arena` / `build:arena` | legacy Vite |

### Env (`.env.example` / `.env.local`)

| Zmienna | Rola |
|---------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL projektu |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | klient przeglądarki + SSR user |
| `SUPABASE_SERVICE_ROLE_KEY` | **tylko serwer** — omija RLS (`createServiceClient`) |
| `N8N_API_SECRET` | Bearer dla `POST /api/n8n/gw-decisions` |
| `PORT` | opcjonalnie (default 3000) |

### Klienci Supabase

| Plik | Użycie |
|------|--------|
| `lib/supabase/server.ts` | Server Components / Actions — cookies + anon |
| `lib/supabase/client.ts` | Browser — login |
| `lib/supabase/service.ts` | Service role — **n8n** |
| `lib/supabase/env.ts` | Walidacja URL + anon key |

### Auth / middleware

- `middleware.ts` matcher: **tylko** `/admin/:path*`
- Sesja: `supabase.auth.getSession()` (SSR cookies)
- Tabela `admin_users` istnieje w schemacie, ale **aplikacja nie sprawdza jej** — wystarczy dowolny zalogowany użytkownik Supabase Auth
- Wzorzec Server Action: `requireAuth()` = `createClient()` + `getUser()`

---

## 3. Routing — mapa URL (aktualna)

### Publiczne

| URL | Opis |
|-----|------|
| `/` | Splash portal (FPL Arena + karty produktów) |
| `/arena` | Legacy Skarb Kibica (Vite via `ArenaAppClient`) |
| `/na-minusie` | Landing ligi |
| `/na-minusie/dywizje` | Struktura dywizji |
| `/na-minusie/regulamin` | Regulamin |
| `/na-minusie/hub` | Redirect → `/strefa-gracza` |
| `/strefa-gracza` | **Główny hub kibica** (tabela, wyniki, terminarz, stats, FA Ranking…) |
| `/strefa-gracza/[teamId]`, `/strefa-gracza/gracz/[teamId]` | Profil |
| `/strefa-gracza/rekordy` | Rekordy |
| `/no-big-six` | Publiczny hub No Big Six |

### Admin (`lib/admin/navigation.ts` — `ADMIN_PROJECTS`)

**Projekt Na Minusie:**
- `/admin/dashboard`, `/admin/struktura`, `/admin/players`
- `/admin/content-hub` — Content Hub (multi-select)
- `/admin/webhooks` — Dual Discord servers
- `/admin/workspace` — Edytor kolejek / publikacja
- `/admin/season-transition` — EoS + draft
- `/admin/tier-logos`, `/admin/logos`
- `/admin/simulator`, `/admin/settings` (Danger Zone)

**Projekt No Big Six:**
- `/admin/no-big-six/sync`
- `/admin/no-big-six/logos`

### API Routes

| Route | Metoda | Auth | Cel |
|-------|--------|------|-----|
| `/api/n8n/gw-decisions` | POST | `Bearer N8N_API_SECRET` | UPSERT `team_gw_decisions` |
| `/api/admin/no-big-six/logo` | POST/DELETE | sesja admin | upload/delete herbów |
| `/api/uploads/logos/[file]` | GET | public | stream logo klubów |
| `/api/uploads/tier-logos/[file]` | GET | public | stream logo dywizji |
| `/api/uploads/no-big-six-logos/[file]` | GET | public | stream herbów NBS |

---

## 4. Model danych Supabase

### Diagram relacji (Na Minusie)

```
admin_users → auth.users
pyramids 1──* divisions *──1 seasons
divisions 1──* teams          (division_id NULL = pula)
seasons 1──* fixtures *──1 divisions
teams 1──* fixtures (home/away)
seasons 1──* team_gameweek_scores *──1 teams
seasons 1──* gameweek_metadata
seasons 1──* team_gw_decisions *──1 teams
discord_webhooks   ← BEZ FK do seasons (trwałe; Hard Reset nie kasuje)
```

### Tabele kluczowe

#### `seasons`
- `status`: `DRAFT` | `PUBLISHED`
- `is_completed` — baraże skończone → publiczne Podsumowanie
- `is_archived` — sezon spakowany
- Legacy: `fa_ranking_webhook_url`, `fa_cup_webhook_url` (kanon = `discord_webhooks`)

#### `divisions`
- `tier` 1..5 (1 = Premier League), UNIQUE `(season_id, pyramid_id, tier)`
- Legacy: `discord_webhook_url`

#### `teams`
Excel SSOT → DB:
- `manager_name`, `discord_nick`, **`discord_id`** (snowflake TEXT), `fpl_id` (**TEXT**), `fpl_team_name`, `chosen_club`, `x_com`, `email`, `previous_season_or`, `fee_paid`, `is_active`, `status`
- Typ TS: `lib/admin/types.ts` → `Team`

#### `fixtures`
- Punkty: `home/away_fpl_points`, `home/away_h2h_points` (0|1|2), `home/away_median_bonus` (0|1)
- `is_finished`, **`is_published`**, `is_playoff`
- Tiebreaker: gole / stracone / ławka / coin / manual

#### `team_gameweek_scores`
Źródło prawdy **The FA Ranking** — FPL points per `(season_id, team_id, gameweek)` niezależnie od H2H (krytyczne GW19/38).

#### `discord_webhooks` (trwała)
- `scope`: `GLOBAL` | `DIVISION`
- `global_type`: `FA_RANKING` | `FA_CUP`
- `division_level`: tier
- **`server_target`**: `NA_MINUSIE` | `FPL_ARENA`
- Unique: GLOBAL `(global_type, server_target)`; DIVISION `(division_level, server_target)`

#### `gameweek_metadata` *(migracja 20260827)*
```
(season_id, gameweek) UNIQUE
gw_status ∈ { NOT_STARTED, PROVISIONAL, CONFIRMED }
last_sync_at
```
Publiczny odczyt statusu synchronizacji wyników FPL API.

#### `team_gw_decisions` *(migracja 20260828)* — **NOWY FUNDAMENT**
```
id uuid PK
season_id → seasons ON DELETE CASCADE
gameweek 1..38
team_id → teams ON DELETE CASCADE
points_total, points_benched, hit_cost INTEGER DEFAULT 0
chip_used VARCHAR(50) NULL   -- null gdy "None"
captain_points INTEGER DEFAULT 0
created_at, updated_at
UNIQUE (season_id, gameweek, team_id)  -- bezpieczny UPSERT
```
Typ TS: `TeamGwDecision` w `lib/admin/types.ts`.  
**Cel biznesowy:** n8n ładuje decyzje FPL (chip, ławka, hit, kapitan) → przyszły silnik personalizowanych zapowiedzi w Content Hub. **UI/silnik szablonów jeszcze NIE istnieje** — tylko DB + API.

### No Big Six (osobny namespace)

Migracje `20260820120000_create_no_big_six.sql` (+ bans, auto_sub):  
`no_big_six_config`, `no_big_six_teams`, `no_big_six_gw_results`, `no_big_six_penalties`, …  
Kod: `lib/no-big-six/*`, UI `components/no-big-six/*`.

### RLS (skrót)

| Tabela | anon | authenticated |
|--------|------|---------------|
| pyramids, seasons, divisions, teams | SELECT | ALL |
| fixtures, team_gameweek_scores | SELECT `is_published` | ALL |
| discord_webhooks | brak | ALL |
| gameweek_metadata, team_gw_decisions | SELECT | ALL |
| no_big_six_* | wg migracji | authenticated write |

**Uwaga:** zapis do `team_gw_decisions` z n8n idzie **service role** (omija RLS), nie przez `authenticated`.

### Migracje w `supabase/migrations/` (lista)

1. `add_x_com_to_teams.sql`
2. `add_season_global_webhooks.sql`
3. `add_team_gameweek_scores.sql`
4. `add_discord_webhooks.sql`
5. `add_discord_webhooks_server_target.sql`
6. `20260820120000_create_no_big_six.sql`
7. `20260820130000_no_big_six_authenticated_write.sql`
8. `20260822140000_add_banned_to_no_big_six.sql`
9. `20260822151000_add_auto_sub_to_penalties.sql`
10. `20260827120000_create_gameweek_metadata.sql`
11. `20260828130000_create_team_gw_decisions.sql`

Dodatkowo pliki one-off / root SQL (np. `supabase/one-off/20260828_backfill_discord_id.sql`, `add_teams_discord_id.sql`).

---

## 5. Domenowa logika ligi (skrót ekspercki)

Pełne algorytmy: `docs/NA_MINUSIE_TECHNICAL.md` + kod w `lib/admin/*`, `lib/public/*`.

| Temat | Istota | Kod |
|-------|--------|-----|
| **Mediana 2+1** | H2H 2/1/0 + bonus +1 za górną połowę FPL w dywizji | silniki w `lib/admin`, workspace |
| **Pojemność** | Dokładnie **10** graczy / dywizja | `lib/na-minusie` capacity |
| **Kalendarz** | Rok FPL 38 GW = 2 sezony ligowe (jesień + wiosna + baraże GW19/38) | nazwa sezonu → faza |
| **Berger** | Terminarz H2H | `lib/admin/berger.ts` + Master Import |
| **Baraże** | Cross-division, TB (gole/stracone/ławka/coin) | fixtures `is_playoff` |
| **FA Ranking** | Sumowane `team_gameweek_scores` | `lib/public/faRanking.ts` |
| **EoS / Draft** | Kaskady awans/spadek + nowy sezon | `seasonTransition.ts`, `endSeason.ts` |

---

## 6. Content Hub — stan na 11.2026 (SZCZEGÓŁOWO)

**URL:** `/admin/content-hub`  
**Page:** `app/admin/(panel)/content-hub/page.tsx`  
**Orchestrator UI:** `components/admin/content-hub/ContentHubClient.tsx`

### Podział plików UI

| Plik | Rola |
|------|------|
| `ContentHubClient.tsx` | Stan, multi-select, capture refs, sekwencyjna wysyłka |
| `ContentHubSendPanel.tsx` | Edytory + panel wysyłki (serwery, grafiki, CTA) |
| `ContentHubDivisionEditor.tsx` | Akordeon per dywizja (X + Discord JSON + preview) |
| `DiscordEmbedPreview.tsx` | Live preview embeda |
| `GameweekPreviewExportNode.tsx` | Off-screen PNG zapowiedzi |
| `FARankingExportCarousel.tsx` | Karuzela FA Ranking |
| `FaRankingParticipantsExportNode.tsx` | Lista uczestników FA Ranking PNG |

### Server Actions (`app/admin/actions/contentHub.ts`)

| Funkcja | Cel |
|---------|-----|
| `getContentHubDivisions` / `getContentHubSeasons` / `getContentHubPlayedGameweeks` | Bootstrap UI |
| `generateXComDraft` / `generatePreviewXComDraft` | Szkice X.com |
| **`generatePreviewDiscordJSON`** | JSON zapowiedzi Discord (aktualny format poniżej) |
| **`generateSummaryDiscordJSONForDivision`** | JSON podsumowania (wyniki + pingi) |
| `getDiscordWebhookForSend` | Rozwiązanie URL webhooków (bez leak do klienta poza potrzebą wysyłki) |
| `getContentHubCaptureData` | Dane do PNG (mecze, tabela, `discord_id`) |
| `getFaRankingParticipantsRoster` | Roster FA Ranking |

### Helpers Discord

| Plik | Eksporty |
|------|----------|
| `lib/admin/discordSummary.ts` | `formatSummaryDiscordPlayer`, `generateSummaryDiscordJSON` |
| `lib/admin/discordRoles.ts` | `NA_MINUSIE_DIVISION_ROLE_BY_TIER`, `getDivisionRoleMention(tier)` |
| `lib/admin/discordClientSend.ts` | `postDiscordWebhookFromClient`, limity plików |
| `lib/admin/discordWebhooks.ts` | typy `DiscordServerTarget`, labele |

**Ping gracza (kanon):**
```
discord_id numeryczny → <@snowflake>
brak → manager_name (bez @)
```
Funkcja: `formatSummaryDiscordPlayer`.

**Ping roli dywizji:**
```
tier 1 → <@&1538514648486117449>  // Premier League
… tier 5 National League
```

### Multi-select — architektura stanu

```ts
selectedDivisionIds: string[]          // H2H multi
selectedGlobalTarget: 'fa_ranking' | 'fa_cup' | null  // single
xComDrafts: Record<divId, string>
discordJsons: Record<divId, string>
capturesByDivision: Record<divId, CapturePayload | null>
// wspólne: attachGraphics, sendServers, customFiles
```

**Wykluczenia:** wybór globalny czyści dywizje i odwrotnie.

**Refs PNG:** `useStableRefMap()` → unikalny ref per `divId` dla Results / Standings / Preview — `html-to-image` fotografuje właściwy węzeł.

**Masowe generowanie:** pętle `for...of` (nie `Promise.all` dla całego batchu z PNG).

**Masowa wysyłka Discord:**
1. `for (divId of selectedDivisionIds)`
2. JSON z `discordJsons[divId]`
3. opcjonalnie `captureDivisionFiles(divId)` → PNG blob
4. `postDiscordWebhookFromClient`
5. `await sleep(1000)` — rate limit Discord
6. toast progress: `Wysyłanie: {name} (i/n)…`

### Format JSON Zapowiedzi (`generatePreviewDiscordJSON`) — AKTUALNY

```json
{
  "content": "🚨 **UWAGA <@&ROLE> !** 🚨\n\n🔜 Deadline FPL się zbliża — czas ustawić składy!",
  "embeds": [{
    "title": "🔜 Zapowiedź Kolejki {gw}! 🏆",
    "description": "**{divisionName}** · FPL Arena: Na Minusie ™\n\nOto pary meczowe na nadchodzącą kolejkę (GW {gw}):\n\n**[Home]** vs **[Away]**\n...",
    "color": 15379208,
    "footer": { "text": "www.fpl-arena.com • Powered by St0pa | FPL Arena" }
  }]
}
```

- **Brak `fields`** — pary tylko w `description`
- **Brak klubów** w parach
- Mention = `formatSummaryDiscordPlayer` (`discord_id` lub `manager_name`)
- Role = `getDivisionRoleMention(tier)`

### Format JSON Podsumowania (`generateSummaryDiscordJSON`)

- `content`: `🚨 **UWAGA <@&ROLE> !** 🚨`
- Embed title: `🏆 Wyniki & Tabela - GW {n}`
- Description: lista `mention **pts : pts** mention` (bez fields)

### Cele wysyłki

| Cel | Tryb | Grafiki |
|-----|------|---------|
| Dywizje H2H (1–5) | Multi-select | Wyniki+Tabela (summary) lub Terminarz (preview) |
| FA Ranking | Single global | Karuzela PNG |
| FA Cup | Single global | **Bez załączników** (guard w kodzie) |

---

## 7. Integracja n8n ↔ `team_gw_decisions`

### Endpoint

`POST /api/n8n/gw-decisions`  
Plik: `app/api/n8n/gw-decisions/route.ts`  
Runtime: `nodejs`, `force-dynamic`

### Auth

```
Authorization: Bearer <N8N_API_SECRET>
```
Porównanie: `crypto.timingSafeEqual` (stała długość). Brak sekretu / mismatch → **401**.

### Payload wejściowy

```json
{
  "fpl_entry": 123456,
  "gw": 1,
  "report_json": {
    "gw_points_total": 71,
    "chips": "Bench Boost",
    "transfers": { "hit_cost": 0 },
    "captain": { "points_final": 4 },
    "bench": [{ "points": 2 }, { "points": 6 }]
  }
}
```

### Transformacje

| Pole DB | Źródło |
|---------|--------|
| `points_total` | `report_json.gw_points_total \|\| 0` |
| `points_benched` | suma `bench[].points` (safe) |
| `hit_cost` | `transfers.hit_cost \|\| 0` |
| `chip_used` | `"None"` / puste → `null`, inaczej string |
| `captain_points` | `captain.points_final \|\| 0` |

### Resolve team

1. Sezony z `!is_archived`
2. `teams` gdzie `fpl_id = String(fpl_entry)` JOIN `divisions!inner` z `season_id` w aktywnych
3. Brak → **404** `"Aktywna drużyna nie znaleziona dla podanego FPL ID"`
4. UPSERT `onConflict: season_id,gameweek,team_id`

### Odpowiedź 200

```json
{ "ok": true, "id": "...", "season_id": "...", "team_id": "...", "gameweek": 1 }
```

### Stan produktowy

- ✅ Migracja SQL
- ✅ Typ `TeamGwDecision`
- ✅ API n8n
- ❌ Brak silnika szablonów Content Hub czytającego `team_gw_decisions`
- ❌ Brak UI admin do podglądu decyzji
- ❌ Brak batch endpointu (1 request = 1 gracz × 1 GW)

---

## 8. Panel admina — katalog Server Actions

| Plik | Domeny |
|------|--------|
| `contentHub.ts` | Content Hub |
| `masterImport.ts` | Excel import, Berger |
| `workspace.ts` / `fixtures.ts` | Edytor GW, wyniki |
| `discordWebhooks.ts` / `discord.ts` | Konfiguracja / test webhooków |
| `playerActions.ts` | CRUD gracza (+ `discord_id`) |
| `seasonTransition.ts` / `endSeason.ts` | EoS |
| `simulator.ts` | Sandbox |
| `tierLogos.ts` / `clubLogos.ts` | Assety |
| `db.ts` | Danger Zone / wipe (kolejność DROP; Auth + webhooks zostają) |

Publiczne I/O: `lib/public/actions.ts` (standings, GW details, FA Ranking, structure, season summary).

---

## 9. Strefa Gracza (public)

- Shell: `components/na-minusie/hub/HubShell.tsx`
- Taby: `lib/na-minusie/hubTabs.ts` — `tabela`, `wyniki`, `terminarz`, `statystyki`, `uczestnicy`, `podsumowanie`, `fa-ranking`
- Eksport PNG: `ExportControls.tsx` (`captureExportNode` / `toPng`), `DiscordExport.tsx`
- Dane tylko `is_published` (RLS)

---

## 10. Workflow operacyjny (typowy tydzień)

1. **Workspace** — wklejenie punktów FPL → draft fixtures + `team_gameweek_scores`
2. **Content Hub · Podsumowanie** — multi-select dywizji → Generuj JSON / X → edycja → PNG → sekwencyjna wysyłka webhooków
3. **Publikacja** w Workspace → kibice widzą wyniki w Strefie
4. **Przed kolejną kolejką · Zapowiedź** — Content Hub Preview → JSON z pingami ról/graczy + PNG terminarza
5. **n8n (równolegle / post-GW)** — POST decyzji do `team_gw_decisions` (przygotowanie pod przyszłe personalizacje)

---

## 11. Mapa plików — szybki indeks

```
app/
  admin/(panel)/content-hub/page.tsx
  admin/actions/contentHub.ts
  api/n8n/gw-decisions/route.ts
  strefa-gracza/
  na-minusie/
  no-big-six/
components/admin/content-hub/*
components/na-minusie/hub/*
lib/admin/{discordSummary,discordRoles,discordClientSend,discordWebhooks,types,berger,navigation}.ts
lib/public/{actions,faRanking,types}.ts
lib/supabase/{server,client,service,env}.ts
lib/no-big-six/*
supabase/schema.sql
supabase/migrations/20260828130000_create_team_gw_decisions.sql
supabase/migrations/20260827120000_create_gameweek_metadata.sql
docs/NA_MINUSIE_TECHNICAL.md          # algorytmy (v3)
docs/GEMINI_PROJECT_CONTEXT.md        # starszy handoff (v3)
docs/GEMINI_ARGON_HANDOFF.md          # TEN PLIK (v4)
```

---

## 12. Delta względem dokumentacji z 18.08.2026

| Obszar | Było (v3) | Jest (v4 / 11.2026) |
|--------|-----------|---------------------|
| Content Hub | Single-target | **Multi-select dywizji**, mapy draftów, sekwencyjna wysyłka |
| Discord Zapowiedź | Długi description + fields „Mecz N” + kluby | **Role ping + pary w description**, bez fields/klubów, footer St0pa |
| Discord Podsumowanie | — | Pingi `<@id>` / fallback manager + role tier |
| `discord_id` | Pole w teams | CRUD w PlayerForm + Master Import + backfill SQL |
| `team_gw_decisions` | brak | Migracja + typ + **API n8n** |
| `gameweek_metadata` | brak | Migracja (PROVISIONAL/CONFIRMED) |
| No Big Six | częściowo | Pełny projekt w admin nav + public + logo API |
| Env | URL + anon | + `SERVICE_ROLE` + `N8N_API_SECRET` |
| Service role client | brak | `lib/supabase/service.ts` |

---

## 13. Świadome ograniczenia / dług techniczny

1. `admin_users` nie egzekwuje whitelisty — wystarczy Auth.
2. `typescript.ignoreBuildErrors: true` w Next (legacy `src/`).
3. Dev: `NODE_TLS_REJECT_UNAUTHORIZED=0` (Windows/antywirus).
4. Content Hub nie czyta jeszcze `team_gw_decisions`.
5. n8n = 1 gracz/request (brak batch).
6. Hard Reset chroni `discord_webhooks` + Auth — świadomie.
7. Funkcje SQL `has_*_discord_webhook` sprawdzają głównie serwer `NA_MINUSIE`.
8. Dual-write legacy kolumn webhooków na `seasons`/`divisions` vs kanon `discord_webhooks`.

---

## 14. Instrukcje dla Gemini Argon przy implementacji

1. **Najpierw przeczytaj istniejący kod** we wskazanych ścieżkach — nie duplikuj generatorów Discord.
2. Nowe endpointy zewnętrzne: Bearer + `createServiceClient()`, nigdy anon w zapisie.
3. Content Hub: zachowaj sekwencyjność PNG (`for...of` + sleep); nie wracaj do `Promise.all` na capture.
4. Pingi graczy: zawsze `formatSummaryDiscordPlayer` / ta sama walidacja snowflake `/^\d+$/`.
5. Pingi ról: tylko `getDivisionRoleMention(tier)`.
6. Zmiany schematu: plik w `supabase/migrations/` + typ w `lib/admin/types.ts`.
7. Publiczne dane: respektuj `is_published` i RLS.
8. Nie mieszaj namespace’ów No Big Six z tabelami Na Minusie.
9. Commit / push / deploy — tylko na wyraźną prośbę użytkownika.

---

## 15. Słownik pojęć

| Termin | Znaczenie |
|--------|-----------|
| **Na Minusie ™** | Liga H2H Mediana 2+1 |
| **tier** | Poziom dywizji 1–5 |
| **GW** | Gameweek FPL 1–38 |
| **brudnopis** | `is_published=false` |
| **Content Hub** | Generator X + Discord + PNG |
| **server_target** | `NA_MINUSIE` \| `FPL_ARENA` |
| **team_gw_decisions** | Decyzje FPL z n8n (chip/ławka/hit/kapitan) |
| **Skarb Kibica** | Legacy archiwum `/arena` |
| **No Big Six** | Osobny produkt / tabele `no_big_six_*` |

---

**Koniec handoffu v4.0.**  
Przy wątpliwości: otwórz plik wskazany w tabeli, nie zgaduj. Kod > dokument.
