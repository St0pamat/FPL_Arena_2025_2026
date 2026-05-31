# FPL Arena — Skarb Kibica  
## Dokumentacja techniczna

**Wersja dokumentu:** 2026-05-31  
**Kontekst:** aplikacja posezonowego raportu ligi FPL Arena (format H2H, sezon 2025/26).  
**Ostatnia istotna zmiana architektury:** usunięcie integracji z publicznym API Fantasy Premier League — aplikacja działa w pełni offline na lokalnych danych (JSON + statyczny katalog TypeScript).

Ten dokument służy jako punkt odniesienia przy poprawkach, testach regresji, onboardingu i regeneracji danych sezonowych.

---

## Spis treści

1. [Cel aplikacji](#1-cel-aplikacji)
2. [Stack technologiczny](#2-stack-technologiczny)
3. [Architektura wysokiego poziomu](#3-architektura-wysokiego-poziomu)
4. [Zmiana: rezygnacja z API FPL (2026-05-31)](#4-zmiana-rezygnacja-z-api-fpl-2026-05-31)
5. [Źródła danych](#5-źródła-danych)
6. [Schematy plików JSON](#6-schematy-plików-json)
7. [Przepływ danych w runtime](#7-przepływ-danych-w-runtime)
8. [Moduły aplikacji (mapa kodu)](#8-moduły-aplikacji-mapa-kodu)
9. [Jedenastka sezonu (`dreamTeam`)](#9-jedenastka-sezonu-dreamteam)
10. [Połączenia sieciowe](#10-połączenia-sieciowe)
11. [Pipeline regeneracji danych (Python)](#11-pipeline-regeneracji-danych-python)
12. [Build, dev i deploy](#12-build-dev-i-deploy)
13. [Checklist testów manualnych](#13-checklist-testów-manualnych)
14. [Typowe scenariusze utrzymania](#14-typowe-scenariusze-utrzymania)
15. [Ograniczenia i znane długi techniczne](#15-ograniczenia-i-znane-długi-techniczne)
16. [Indeks plików powiązanych ze zmianą FPL](#16-indeks-plików-powiązanych-ze-zmianą-fpl)

---

## 1. Cel aplikacji

**Skarb Kibica** to statyczna SPA (Single Page Application) prezentująca wyniki prywatnej ligi FPL Arena:

- tabela i wyniki meczów H2H (38 kolejek),
- profile 20 „gladiatorów” (menedżerów) z narracją sezonu,
- statystyki, topki, Panteon, porównywarka H2H,
- generatory grafik do udostępniania (Discord / story),
- sekcja mediów (prezentacje YouTube, logotypy).

Aplikacja **nie jest** live trackerem FPL. Nie pobiera w czasie rzeczywistym wyników kolejek ani tabeli globalnej FPL. Wszystkie liczby pochodzą z wcześniej wygenerowanych plików (Excel → Python → JSON).

---

## 2. Stack technologiczny

| Warstwa | Technologia |
|---------|-------------|
| UI | React 18, TypeScript |
| Bundler | Vite 6 |
| Style | Tailwind CSS + `src/styles/global.css` |
| Routing | Brak React Router — zakładki w stanie lokalnym (`App.tsx`) |
| Dane runtime | `fetch()` do plików w `public/` |
| Dane statyczne | `src/data/*.ts` (katalog graczy, prezentacje) |
| Regeneracja danych | Python 3 + openpyxl (`konwertuj_*.py`) |
| Produkcja | `dist/` (hosting statyczny) lub `server/index.js` (Node SPA fallback) |
| Eksport grafik | `html-to-image`, Canvas API |

**Alias importów:** `@/` → `src/` (konfiguracja w `vite.config.ts` i `tsconfig`).

---

## 3. Architektura wysokiego poziomu

```
┌─────────────────────────────────────────────────────────────────┐
│                         index.html                               │
│                              │                                   │
│                         main.tsx                                 │
│                              │                                   │
│                          App.tsx                                 │
│    ┌──────────────┬──────────┴──────────┬──────────────────┐    │
│    │ useLeagueData│   PLAYERS_DATA      │  zakładki (tabs) │    │
│    │  (4× fetch)  │  (src/data/players) │  home|sezon|…    │    │
│    └──────┬───────┴─────────────────────┴────────┬─────────┘    │
│           │                                       │              │
│     public/*.json                          features/*/*.tsx      │
└─────────────────────────────────────────────────────────────────┘

Pipeline offline (poza runtime aplikacji):

  Excel (highlights/, wyniki_h2h_fpl.xlsx, baza OR)
       │
       ▼
  konwertuj_*.py
       │
       ▼
  *.json (katalog główny)
       │
       ▼
  scripts/sync-public.ps1  ──►  public/*.json + public/logo/
       │
       ▼
  npm run dev / build  ──►  serwowane jako /wyniki_meczy.json itd.
```

### Zakładki (`AppTab`)

Zdefiniowane w `src/config/navigation.ts`:

| ID | Etykieta | Widok główny |
|----|----------|--------------|
| `home` | Start | `HomeView` |
| `sezon` | Sezon | `SezonView` (hub: prognoza, tabela, wyniki, oś czasu) |
| `profiles` | Gladiatorzy | `ProfilesView` |
| `statystyki` | Statystyki | `StatystykiView` (hub: topki, panteon, porównaj, elita) |
| `udostepnij` | Udostępnij | `UdostepnijView` |
| `media` | Media | `MediaView` |

Huby używają wspólnego shella `HubShell` z boczną nawigacją sekcji.

---

## 4. Zmiana: rezygnacja z API FPL (2026-05-31)

### 4.1. Stan przed zmianą

Aplikacja (oraz legacy HTML w `archive/`) przy starcie wywoływała:

```
GET https://fantasy.premierleague.com/api/bootstrap-static/
```

Z odpowiedzi budowano mapę `fplPlayersById` (id → `web_name`, `photo`, `element_type`) i przekazywano ją przez:

`App` → `ProfilesView` → `SeasonHighlightsPanel` → `TeamOfSeasonPanel` / `TeamOfSeasonPitch`

Dodatkowo komponent `TeamOfSeasonPitch` ładował zdjęcia z CDN:

```
https://resources.premierleague.com/premierleague/photos/players/...
```

### 4.2. Powód zmiany

- UI produkcyjne **nie wyświetla już zdjęć** zawodników FPL (panel listowy zastąpił boisko ze zdjęciami).
- Tablica `dreamTeam` w `player_highlights.json` zawiera **kompletne pola lokalne** (`name`, `position`, `points`, bonusy kapitana itd.) dla wszystkich 20 menedżerów.
- Bootstrap FPL był zbędną zależnością sieciową i punktem awarii (CORS, downtime API, zmiany struktury odpowiedzi).

### 4.3. Stan po zmianie

| Element | Status |
|---------|--------|
| Fetch `bootstrap-static` | **Usunięty** |
| Stan `fplPlayersById` | **Usunięty** |
| Typ `src/types/fpl.ts` | **Usunięty** |
| `TeamOfSeasonPitch.tsx` | **Usunięty** (martwy kod) |
| `FPL_BOOTSTRAP_URL`, `FPL_PHOTO_SIZES`, `getPlayerPhotoUrl` | **Usunięte** z `services/fpl/api.ts` |
| `mapDreamTeamPlayer` | Uproszczony — tylko dane z JSON |
| `TeamOfSeasonPanel` | Działa bez zewnętrznych propsów FPL |

### 4.4. Co pozostało w `src/services/fpl/`

Folder nadal istnieje z **helperami czysto lokalnymi** (bez HTTP):

- `mapDreamTeamPlayer(player)` — normalizacja wpisu `dreamTeam` / `squadPlayers`
- `inferFormation(players)` — liczenie formacji typu `4-4-2` z pozycji 1–4

Stałe UI FPL (pozycje, kolory linii, etykiety chipów) są w `src/features/fpl/constants.ts` — to **nie** jest integracja API, tylko słownik etykiet.

### 4.5. Weryfikacja kompletności danych lokalnych (2026-05-31)

Automatyczna kontrola pliku `public/player_highlights.json`:

| Metryka | Wynik |
|---------|-------|
| Profile z tablicą `dreamTeam` | 20 / 20 |
| Wpisy `dreamTeam` bez `name` | 0 |
| Wpisy `dreamTeam` bez `position` | 0 |
| Wpisy `dreamTeam` bez `points` | 0 |
| Wpisy `squadPlayers` bez `name` | 0 / 1343 |

**Wniosek:** jedenastka sezonu i lista rezerwowych z sezonu nie wymagają bootstrap FPL.

---

## 5. Źródła danych

Aplikacja korzysta z **trzech warstw** danych:

### 5.1. Warstwa A — statyczny TypeScript (`src/data/`)

| Plik | Zawartość | Klucz |
|------|-----------|-------|
| `players.ts` | `PLAYERS_DATA` — 20 gladiatorów: manager, drużyna, rank, W/D/L, cytaty, skrypty wideo, statystyki redakcyjne | `Player.id` (FPL entry ID) |
| `presentations.ts` | Lista prezentacji YouTube pogrupowana po fazach pucharowych | `playerId` |

Te dane są **wbudowane w bundle** przy buildzie. Zmiana wymaga edycji pliku + rebuild.

### 5.2. Warstwa B — JSON runtime (`public/`)

| Plik | Klucz obiektu | Generowany przez |
|------|---------------|------------------|
| `wyniki_meczy.json` | — (tablica GW) | `konwertuj_wyniki.py` |
| `player_highlights.json` | FPL entry ID (string) | `konwertuj_highlights.py` |
| `player_season_history.json` | FPL entry ID (string) | `konwertuj_history.py` |
| `gladiator_or.json` | FPL entry ID (string) | `konwertuj_or.py` |

**Źródło prawdy:** pliki JSON w **katalogu głównym** repozytorium.  
**Kopia serwowana:** `public/` — tworzona przez `scripts/sync-public.ps1` (hook `predev` / `prebuild`).

### 5.3. Warstwa C — assety graficzne

| Ścieżka | Zawartość |
|---------|-----------|
| `public/logo/` | Herby drużyn + logo ligi (kopiowane z `logo/` przez sync) |

### 5.4. Mapowanie tożsamości

W całej aplikacji identyfikator menedżera to **FPL entry ID** (`Player.id`, klucze w JSON).

Nazwa drużyny H2H (`Player.team`) łączy dane z `wyniki_meczy.json` (pola `teamA` / `teamB`).

Indeks pomocniczy: `src/config/playersIndex.ts` (`TEAM_BY_NAME`).

---

## 6. Schematy plików JSON

### 6.1. `wyniki_meczy.json`

Tablica 38 bloków kolejek:

```json
{
  "gw": 1,
  "matches": [
    {
      "teamA": "Kapcie Kłapcia",
      "pointsA": 31,
      "teamB": "immigrants fc",
      "pointsB": 58
    }
  ]
}
```

**Użycie:** tabela (`StandingsView`), wyniki H2H (`WynikiView`), oś czasu, topki, porównywarka, prognoza.

**Logika tabeli:** `src/features/standings/lib/standings.ts` — przelicza W/D/L i punkty ligowe z logu meczów do wybranej GW.

### 6.2. `player_highlights.json`

Obiekt: `{ [fplEntryId: string]: PlayerHighlights }`.

Kluczowe pola (niepełna lista — pełny typ w `src/types/highlights.ts`):

| Pole | Opis |
|------|------|
| `fplId` | ID menedżera FPL |
| `seasonOr` | Overall Rank na koniec sezonu |
| `gwPoints[]` | Punkty FPL i wynik H2H per kolejka |
| `gwPoints[].h2hOutcome` | `"W"` \| `"D"` \| `"L"` |
| `gwPoints[].opponent`, `h2hScore` | Kontekst meczu ligowego |
| `h2hStreaks` | Serie wygranych/przegranych |
| `topGains`, `topLosses` | Transfery / differential |
| `dreamTeam[]` | **Jedenastka sezonu** (patrz §9) |
| `squadPlayers[]` | Pozostali zawodnicy z sezonu (poza top 11) |
| `expSummary` | Panel oczekiwań vs wynik |
| `pointSources`, `pointsByPosition` | Wykresy w profilu |

Przykład wpisu `dreamTeam`:

```json
{
  "name": "Haaland",
  "elementId": 430,
  "position": 4,
  "posLabel": "FW",
  "points": 394,
  "pointsBase": 215,
  "captainBonus": 147,
  "tcBonus": 32,
  "captaincies": 22,
  "pitchX": 13.5,
  "pitchY": 108.0
}
```

Pozycje FPL: `1` GK, `2` DEF, `3` MID, `4` FWD.

### 6.3. `player_season_history.json`

Obiekt: `{ [fplEntryId: string]: PlayerSeasonHistory }`.

| Pole | Opis |
|------|------|
| `gwDetails[]` | Porównanie do Top 10k / overall per GW |
| `avgVsTop10k`, `weeksAboveTop10k` | Panel elity FPL |
| `mostStarted`, `mostBenchedPlayer` | Statystyki składu |
| `peakTeamValue` | Wartość drużyny |

Typ: `src/types/seasonHistory.ts`.

### 6.4. `gladiator_or.json`

Obiekt: `{ [fplEntryId: string]: GladiatorOrRow }`.

```json
{
  "historicalOr": 113116,
  "historicalOrSeason": "2024/25",
  "seasonOr": 375851
}
```

**Użycie:** prognoza przed sezonem, profile (OR), dyplomy.

---

## 7. Przepływ danych w runtime

### 7.1. Hook `useLeagueData`

Plik: `src/hooks/useLeagueData.ts`

Przy montowaniu `App` wykonuje **4 równoległe fetch'e** (osobne `useEffect`):

| URL | Stan | Flag loading |
|-----|------|--------------|
| `/wyniki_meczy.json` | `matchesByGw` | `matchesLoading` |
| `/player_highlights.json` | `playerHighlights` | `highlightsLoading` |
| `/player_season_history.json` | `seasonHistory` | `seasonHistoryLoading` |
| `/gladiator_or.json` | `gladiatorOr` | *(brak flagi — ładuje się w tle)* |

**Obsługa błędów:** przy nieudanym fetch ustawiane są puste tablice/obiekty — aplikacja nie crashuje, ale sekcje mogą być puste.

**Brak cache / revalidacji:** dane ładują się raz na start sesji.

### 7.2. Rozdzielenie propsów w `App.tsx`

```
useLeagueData()
    ├── SezonView      → matches, highlights, gladiatorOr
    ├── ProfilesView   → matches, highlights, seasonHistory, gladiatorOr
    ├── StatystykiView → wszystkie powyższe + players
    ├── UdostepnijView → playerHighlights
    └── MediaView      → players (tylko)
```

`PLAYERS_DATA` jest ładowany bezpośrednio z importu — nie przechodzi przez hook.

---

## 8. Moduły aplikacji (mapa kodu)

```
src/
├── app/App.tsx                 # Shell, routing zakładek, ErrorBoundary
├── hooks/useLeagueData.ts      # Jedyny punkt ładowania JSON
├── data/                       # Statyczne katalogi
├── config/                     # Nawigacja, branding, layout, indeksy
├── types/                      # Kontrakty TS (highlights, match, player, …)
├── services/fpl/api.ts         # Helpery dreamTeam (lokalne)
├── features/
│   ├── home/                   # Strona startowa
│   ├── sezon/                  # Hub sezonu
│   ├── standings/              # Tabela H2H
│   ├── wyniki/                 # Mecze per GW
│   ├── prognoza/               # Typy vs rzeczywistość
│   ├── profiles/               # Profile gladiatorów + jedenastka sezonu
│   ├── pitch/                  # TeamOfSeasonPanel
│   ├── topki/                  # Rankingi sezonu
│   ├── hall/                   # Panteon / rekordy
│   ├── centrum/                | Generatory grafik, timeline, compare, elite
│   ├── udostepnij/             # Hub udostępniania
│   ├── media/                  | Prezentacje, logotypy
│   └── fpl/constants.ts        # Etykiety pozycji, chipów (bez API)
├── components/                 # Layout, branding, UI
└── styles/global.css           # Style globalne (+ legacy CSS boiska — patrz §15)
```

### Logika domenowa — gdzie szukać

| Problem / feature | Plik(i) |
|-------------------|---------|
| Tabela po GW | `features/standings/lib/standings.ts` |
| Wynik meczu W/D/L | `lib/match.ts` |
| Topki / leaderboardy | `features/topki/lib/computeLeaderboards.ts` |
| Rekordy Panteonu | `features/hall/lib/pantheonRecords.ts` |
| OR i prognoza | `features/profiles/lib/or.ts` |
| Eksport PNG kart | `features/centrum/components/ShareCardDocument.tsx`, `html-to-image` |
| Jedenastka sezonu | `features/pitch/components/TeamOfSeasonPanel.tsx` |

---

## 9. Jedenastka sezonu (`dreamTeam`)

### 9.1. Źródło danych

Wyłącznie `player_highlights.json` → pole `dreamTeam` (oraz opcjonalnie `squadPlayers` dla rozwiniętej listy).

Generowane w `konwertuj_highlights.py` na podstawie arkuszy Excel w `highlights/{fpl_id}.xlsx` (agregacja wyborów z całego sezonu).

### 9.2. Ścieżka renderowania

```
ProfilesView
  └── SeasonHighlightsPanel  (gdy highlights.dreamTeam.length > 0)
        └── TeamOfSeasonPanel
              ├── mapDreamTeamPlayer()  × N
              ├── inferFormation()
              ├── groupByPosition()     (lokalna funkcja w panelu)
              └── PlayerRow × N         (lista, bez zdjęć)
```

### 9.3. `mapDreamTeamPlayer` (po refaktorze)

Plik: `src/services/fpl/api.ts`

```typescript
export const mapDreamTeamPlayer = (player) => ({
  ...player,
  elementId: player.elementId ?? null,
  displayName: player.name || "Zawodnik",
  position: player.position ?? 0,
});
```

**Nie wykonuje** lookupu po ID w zewnętrznym API. Pole `name` w JSON jest wymagane dla poprawnego UI.

### 9.4. Co wyświetla panel

- formacja (np. `4-4-2`),
- KPI: największy wkład, suma punktów, najsilniejsza linia,
- wykres rozkładu punktów wg linii (GK/DEF/MID/FWD),
- listy zawodników pogrupowane po pozycji,
- rozbicie punktów: bazowe + bonus kapitana (©) + Triple Captain (TC),
- opcjonalnie: rozwijana lista `squadPlayers` (reszta składu sezonu).

### 9.5. Test regresji jedenastki sezonu

1. Uruchom `npm run dev`.
2. Zakładka **Gladiatorzy** → wybierz menedżera (np. ID 22952 — St0pa).
3. Przewiń do **„Twoja jedenastka sezonu”**.
4. Sprawdź:
   - 11 zawodników z poprawnymi nazwami (nie „Zawodnik”),
   - sensowna formacja,
   - suma punktów > 0,
   - przy menedżerach z TC — widoczne rozbicie bonusów.
5. W DevTools → Network: **brak** żądań do `fantasy.premierleague.com` i `resources.premierleague.com`.

---

## 10. Połączenia sieciowe

### 10.1. Wymagane do działania core aplikacji

**Brak.** Po zmianie 2026-05-31 aplikacja działa w pełni offline po załadowaniu bundle + JSON.

### 10.2. Opcjonalne (poza logiką ligi)

| Cel | URL | Gdzie |
|-----|-----|-------|
| Prezentacje wideo | `youtube.com`, `img.youtube.com` | `PresentationCard.tsx` |
| Linki społecznościowe | Discord, YouTube, X | `socialLinks.ts`, footer |
| Pobieranie logo lokalnych | `/logo/...` (same-origin) | `LogosDownloadPanel` |

Te zasoby nie wpływają na dane ligowe ani jedenastkę sezonu.

---

## 11. Pipeline regeneracji danych (Python)

### 11.1. Skrypty

| Skrypt | Wejście | Wyjście |
|--------|---------|---------|
| `konwertuj_wyniki.py` | `wyniki_h2h_fpl.xlsx` | `wyniki_meczy.json` |
| `konwertuj_highlights.py` | `highlights/*.xlsx` + `wyniki_meczy.json` | `player_highlights.json` |
| `konwertuj_history.py` | pliki `*_history25-26.xlsx` | `player_season_history.json` |
| `konwertuj_or.py` | baza Excel gladiatorów | `gladiator_or.json` |

Skrypty **nie korzystają** z API FPL w runtime — dane pochodzą z eksportów/analiz Excel.

### 11.2. Typowy workflow po aktualizacji danych

```powershell
# 1. Regeneracja (w zależności od tego, co się zmieniło)
python konwertuj_wyniki.py
python konwertuj_highlights.py
python konwertuj_history.py
python konwertuj_or.py

# 2. Sync do public/ (automatycznie przy npm run dev/build)
powershell -File scripts/sync-public.ps1

# 3. Podgląd
npm run dev
```

### 11.3. Audyt danych

Pomocnicze skrypty w `scripts/`:

- `audit_full.py`, `audit_history_xlsx.py` — walidacja spójności Excel/JSON
- `repair_players_diff.py` — naprawa rozbieżności differential

Szczegóły plików źródłowych: `archive/DECISIONS.md`.

---

## 12. Build, dev i deploy

### 12.1. Development

```bash
npm install
npm run dev    # → http://localhost:5173
```

Hook `predev` uruchamia `sync-public.ps1` (kopiuje JSON + logo do `public/`).

### 12.2. Build produkcyjny

```bash
npm run build   # → dist/
npm run preview # → http://localhost:4173
```

Vite kopiuje całą zawartość `public/` do `dist/` — JSON i logo są dostępne pod tymi samymi ścieżkami.

### 12.3. Deploy

**Wariant A (zalecany):** hosting statyczny + fallback SPA do `index.html`.

**Wariant B:** `npm run start` — serwer Node w `server/index.js`, port `3000` (env `PORT`).

### 12.4. Typecheck

```bash
npm run typecheck
```

Uwaga: projekt ma historyczne ostrzeżenia TS (`implicit any` w wielu plikach) — nie blokują one Vite dev/build, ale warto je stopniowo poprawiać przy dotykaniu modułów.

---

## 13. Checklist testów manualnych

### Po każdej zmianie danych JSON

- [ ] Start aplikacji bez błędów w konsoli
- [ ] **Sezon → Tabela** — 20 drużyn, sensowna klasyfikacja końcowa
- [ ] **Sezon → Wyniki H2H** — 38 kolejek, poprawne pary drużyn
- [ ] **Sezon → Oś czasu** — wydarzenia per GW
- [ ] **Gladiatorzy** — przełączanie wszystkich 20 profili
- [ ] **Jedenastka sezonu** — widoczna u każdego z `dreamTeam`
- [ ] **Statystyki → Topki** — listy niepuste
- [ ] **Statystyki → Panteon** — rekordy renderują się
- [ ] **Udostępnij** — eksport PNG działa
- [ ] **Media → Prezentacje** — miniatury YouTube (wymaga internetu)

### Po zmianach w kodzie ładowania danych

- [ ] Network: tylko 4 fetch'e do `/*.json` na starcie
- [ ] Brak requestów do domen Premier League / FPL API
- [ ] Przy usuniętym JSON — graceful empty state (nie biały ekran)

### Po refaktorze `dreamTeam` / `TeamOfSeasonPanel`

- [ ] Nazwy zawodników z pola `name` (nie fallback „Zawodnik”)
- [ ] Formacja zgadza się z liczbą obrońców/pomocników/napastników
- [ ] Rozwinięcie „Pokaż wszystkich z składów sezonu” sortuje po punktach

---

## 14. Typowe scenariusze utrzymania

### Nowy sezon / nowi uczestnicy

1. Zaktualizuj listę `PLAYERS` w skryptach Python i `src/data/players.ts`.
2. Dodaj pliki Excel w `highlights/`.
3. Uruchom pipeline konwersji.
4. Zaktualizuj herby w `logo/` → sync.
5. Przejdź checklistę §13.

### Błędne nazwy w jedenastce sezonu

**Nie** szukaj problemu w API FPL. Sprawdź:

1. Wpis w `player_highlights.json` → `dreamTeam[].name`
2. Regenerację w `konwertuj_highlights.py` (mapowanie `element` → nazwa w Excelu)

### Pusta jedenastka sezonu u jednego gracza

1. Czy w JSON jest `"dreamTeam": [...]` dla jego FPL ID?
2. Czy tablica ma wpisy z `position` 1–4?
3. Czy `SeasonHighlightsPanel` dostaje `highlights` pod właściwym kluczem (`String(player.id)`)?

### Tabela H2H nie zgadza się z Excel

1. Regeneruj `wyniki_meczy.json` z `konwertuj_wyniki.py`.
2. Sprawdź spójność nazw drużyn (`Player.team` vs `teamA`/`teamB` w JSON).

---

## 15. Ograniczenia i znane długi techniczne

| Obszar | Opis |
|--------|------|
| Brak testów automatycznych | Jest tylko `typecheck` i skrypty audytu Python — brak Jest/Vitest/Playwright |
| Routing zakładek | Stan w `useState` — brak deep linków URL (`/profiles/22952`) |
| CSS boiska | Style `.season-pitch*` w `global.css` pozostały po usuniętym `TeamOfSeasonPitch` — można usunąć przy okazji porządków CSS |
| README główny | Może zawierać nieaktualne wzmianki o bootstrap FPL — źródłem prawdy jest ten dokument |
| Legacy | `archive/`, `podglad-legacy.html` nadal zawierają stary kod z fetch FPL — **nie są** częścią buildu Vite |
| `elementId` w dreamTeam | ID z sezonu 2025/26 FPL — służy do deduplikacji w UI, nie do live lookupu |
| Offline deploy | Prezentacje YouTube i linki zewnętrzne wymagają sieci; reszta nie |

---

## 16. Indeks plików powiązanych ze zmianą FPL

### Usunięte

| Plik | Powód |
|------|-------|
| `src/types/fpl.ts` | Typy bootstrap FPL nieużywane |
| `src/features/pitch/components/TeamOfSeasonPitch.tsx` | Martwy komponent ze zdjęciami CDN |

### Zmodyfikowane

| Plik | Zmiana |
|------|--------|
| `src/hooks/useLeagueData.ts` | Usunięty fetch bootstrap + stan `fplPlayersById` |
| `src/services/fpl/api.ts` | Tylko `mapDreamTeamPlayer`, `inferFormation` |
| `src/features/pitch/components/TeamOfSeasonPanel.tsx` | Bez props `fplPlayersById` |
| `src/features/profiles/components/SeasonHighlightsPanel.tsx` | Bez props `fplPlayersById` |
| `src/features/profiles/ProfilesView.tsx` | Bez props `fplPlayersById` |
| `src/app/App.tsx` | Bez przekazywania `fplPlayersById` |

### Nienaruszone (świadomie)

| Plik | Uwaga |
|------|-------|
| `src/features/fpl/constants.ts` | Stałe etykiet — nie API |
| `archive/*`, `podglad-legacy.html` | Historyczna referencja |
| `konwertuj_*.py` | Pipeline offline bez HTTP |

---

## Szybkie odniesienia

| Potrzebujesz… | Zacznij od… |
|---------------|-------------|
| Dodać pole do profilu | `src/types/highlights.ts` + `konwertuj_highlights.py` + komponent w `profiles/` |
| Naprawić tabelę | `standings/lib/standings.ts` + `wyniki_meczy.json` |
| Zmienić zakładki | `src/config/navigation.ts` + `App.tsx` |
| Zrozumieć ładowanie danych | `src/hooks/useLeagueData.ts` |
| Jedenastka sezonu | §9 + `TeamOfSeasonPanel.tsx` |
| Pełny obraz danych | §5–§6 |

---

*Dokument utworzony w kontekście refaktoru offline-first (2026-05-31). Aktualizuj sekcję §4 i §16 przy kolejnych istotnych zmianach architektury danych.*
