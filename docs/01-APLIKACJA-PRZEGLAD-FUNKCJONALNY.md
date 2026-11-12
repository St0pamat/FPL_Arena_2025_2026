# FPL Arena / Skarb Kibica — przegląd funkcjonalny aplikacji

Dokument dla osoby, która nie zna projektu. Opisuje **po co istnieje produkt**, **dla kogo**, **co robi** oraz **jakie technologie** stoją za repozytorium `fpl-arena-skarb-kibica`.

---

## 1. Jednym zdaniem

To **platforma społeczności Fantasy Premier League (FPL)** wokół marki **FPL Arena** (`www.fpl-arena.com`): łączy **archiwum ligi H2H**, **żywą ligę H2H (The FA League)**, wariant ligi **No Big Six** oraz wewnętrzne **laboratorium analityczne graczy FPL (Stats Lab)** dla adminów / contentu.

---

## 2. Problem, który rozwiązuje

Typowy menedżer FPL i organizator prywatnej ligi potrzebuje:

| Potrzeba | Co daje platforma |
|----------|-------------------|
| Podsumowanie sezonu H2H „na pamiątkę” | **Igrzyska Kapci Kłapcia / Skarb Kibica** — interaktywny raport posezonowy |
| Bieżąca liga H2H z własnymi zasadami | **The FA League** — piramida dywizji, Mediana 2+1, Strefa Gracza |
| Alternatywna rywalizacja (kara za Big Six) | **No Big Six** — sync z oficjalnym FPL API |
| Analiza zawodników PL pod decyzje FPL + grafiki social | **Stats Lab** (Studio + Centre) w panelu admina |

Publiczna strona startowa (`/`) to **splash z trzema portalami** (karty wejścia). Panel `/admin` wymaga logowania Supabase.

---

## 3. Trzy portale produktu

### 3.1. Igrzyska Kapci Kłapcia (Skarb Kibica) — archiwum

- **Status:** sezon zamknięty / archiwum.
- **Wejście:** `/arena` (aplikacja osadzona w Next.js; historycznie też Vite SPA).
- **Charakter:** offline’owy, interaktywny **raport ligi H2H**: tabela, 38 kolejek, profile „gladiatorów”, statystyki, Panteon, onelevenka sezonu, karty do udostępniania (PNG).
- **Dane:** lokalne pliki JSON (`wyniki_meczy.json`, historie, highlighty…) — **bez** odpytywania FPL API w runtime.

### 3.2. The FA League (dawniej „Na Minusie”) — żywa liga H2H

- **Wejście publiczne:** `/The-FA-League`, hub gracza `/strefa-gracza`.
- **Charakter:** sezon na żywo — dywizje (piramida), terminarz Berger, wyniki, ranking FA, regulamin.
- **Kluczowa zasada punktacji:** **Mediana 2+1** (punkty H2H + bonus medianowy) — logika w silniku admina, opis w regulaminie.
- **Dane:** **Supabase / PostgreSQL** (sezony, dywizje, drużyny, mecze, wyniki GW, decyzje GW, webhooki Discord).
- **Admin:** import Excel, workspace GW, settlement sezonu, Content Hub (Discord/X), logo klubów/tierów, symulator.

### 3.3. No Big Six — liga poboczna

- **Wejście:** `/no-big-six`.
- **Charakter:** klasyfikacja w stylu FPL, gdzie punkty z zawodników „Big Six” są **penalizowane**.
- **Dane:** osobne tabele `no_big_six_*` + synchronizacja z oficjalnym API FPL.

---

## 4. Panel administracyjny (`/admin`)

Dostęp tylko dla użytkowników z Supabase Auth + allowlistą `admin_users`.

Główne obszary (nawigacja projektowa):

1. **The FA League** — operacje sezonu, struktura, gracze, workspace GW, settlement, Discord, logo.
2. **No Big Six** — sync wyników, logo drużyn.
3. **Stats Lab** — ETL danych FPL, **Stats Centre** (tabele), **Studio** (wykresy / plakaty).

Stats Lab **nie miesza się** z resetem danych The FA League — ma własną przestrzeń tabel `fpl_lab_*`.

---

## 5. Technologie (stack)

Repozytorium to **jeden pakiet npm** (nie klasyczny multi-package monorepo), ale **dwa runtime’y**:

| Warstwa | Technologia |
|---------|-------------|
| Aplikacja główna | **Next.js 14** (App Router), React 18, TypeScript |
| Legacy Skarb Kibica | **Vite 6** + React 18, montowane pod `/arena` (alias `@arena`) |
| Styling | **Tailwind CSS 3**, CSS globalny, Lucide icons |
| Baza / auth | **Supabase** (Postgres + Auth, SSR cookies), SQL w `supabase/` |
| Logika serwera | Next.js **Server Actions**, RSC, route handlers `app/api/` |
| Eksport grafik | `html-to-image` (Stats Lab, karty Skarb Kibica) |
| Automatyzacja | webhook **n8n** (`/api/n8n/gw-decisions`) |
| Źródło FPL (admin) | Oficjalne API `fantasy.premierleague.com` (sync / workspace) |
| Fonty | Google Fonts (m.in. Inter, Oswald, Anton) |

**Nie używamy** Prisma/Drizzle — dostęp do danych przez klienta Supabase + migracje SQL.

### Układ katalogów (skrót)

```
app/           → trasy Next (publiczne + admin)
components/    → UI Next (portale, admin, stats-lab, …)
lib/           → domena (na-minusie, no-big-six, stats-lab, platform, …)
src/           → legacy Skarb Kibica (Vite)
public/        → JSON, logo, assety statyczne
supabase/      → schema + migracje
docs/          → dokumentacja
scripts/       → sync-public, dev-next, weryfikacje
```

---

## 6. Źródła danych — mapa

| Produkt | Skąd dane | Uwagi |
|---------|-----------|--------|
| Skarb Kibica | JSON w `public/` | Pipeline Excel → skrypty Python → sync |
| The FA League | Supabase | Publikacja meczów (`is_published`), Strefa Gracza czyta tylko opublikowane |
| No Big Six | Supabase + FPL API | Sync admin |
| Stats Lab | `fpl_lab_players`, `fpl_lab_clubs`, `fpl_lab_player_gw_history` | ETL z FPL API |

---

## 7. Jak uruchomić (orientacyjnie)

```bash
npm install
npm run dev          # Next — główna platforma
# npm run dev:arena  # opcjonalnie: sam Vite Skarb Kibica
```

Wymagania środowiskowe: Node 20+, zmienne Supabase / sekrety admina dla pełnego panelu.

---

## 8. Powiązane dokumenty w tym pakiecie

**Chart Studio: zamrożone 6/6 · Stats Centre: zamrożony (Zero-Regression).**

| Plik | Treść |
|------|--------|
| [`02-STATS-LAB-STUDIO-KONTEKST.md`](./02-STATS-LAB-STUDIO-KONTEKST.md) | Stats Lab Studio: pojęcia, okresowe metryki, Per 90/DC, OCENA, stopka PNG |
| [`03-WYKRES-RADAROWY-PIZZA.md`](./03-WYKRES-RADAROWY-PIZZA.md) | **Zamrożony** Radar / Pizza + Quick Slots |
| [`04-DEKOMPOZYCJA-I-PROFIL-WIELOWYMIAROWY.md`](./04-DEKOMPOZYCJA-I-PROFIL-WIELOWYMIAROWY.md) | **Zamrożony (Zero-Regression):** Points Breakdown + Stacked + Streaks / DC |
| [`05-WYKRES-SCATTER-2D.md`](./05-WYKRES-SCATTER-2D.md) | **Zamrożony (Zero-Regression):** Scatter 2D — Social-First AAA |
| [`06-MACIERZ-HEATMAP.md`](./06-MACIERZ-HEATMAP.md) | **Zamrożony (Zero-Regression):** Macierz Heatmap — Social-First AAA (6/6) |
| [`07-STATS-CENTRE.md`](./07-STATS-CENTRE.md) | **Zamrożony (Zero-Regression):** Stats Centre — Social-First AAA (komplet: Players 8/8, Per GW, Teams 4/4) |
| `TECHNICAL.md`, `architecture.md`, `project_overview.md` | Starsza / głębsza dokumentacja Skarb Kibica i architektury |

---

## 9. Słownik skrótów

| Skrót | Znaczenie |
|-------|-----------|
| **FPL** | Fantasy Premier League (oficjalna gra Fantasy) |
| **H2H** | Head-to-Head — bezpośrednie pojedynki menedżerów |
| **GW** | Gameweek — kolejka FPL (1–38) |
| **Skarb Kibica** | Posezonowy raport / archiwum ligi Arena |
| **Stats Lab** | Moduł analityczny zawodników FPL w adminie |
| **OCENA / RATING (0–100)** | UI dla `compositeScore` — średnia percentyli wybranych cech vs grupa |
