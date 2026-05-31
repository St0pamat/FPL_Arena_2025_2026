# FPL Arena — Skarb Kibica

Interaktywny, posezonowy raport ligi FPL Arena (format H2H): profile gladiatorów, wyniki 38 kolejek, tabela, statystyki, Panteon i jedenastka sezonu.

**Dokumentacja techniczna (architektura, dane, testy, utrzymanie):** [`docs/TECHNICAL.md`](docs/TECHNICAL.md)

## Wymagania

- **Node.js** 20+ (development, build, opcjonalny serwer produkcyjny)
- **Python 3** (tylko regeneracja danych z Excel — opcjonalnie)

Aplikacja **nie wymaga** połączenia z API Fantasy Premier League — działa offline na lokalnych plikach JSON (opcjonalnie YouTube i linki zewnętrzne w sekcji Media).

## Struktura projektu

```
├── docs/
│   └── TECHNICAL.md        # Pełna dokumentacja techniczna
├── public/                 # Statyczne assety serwowane bez zmian (JSON, logo)
│   ├── logo/               # Herby drużyn + logo ligi (skopiuj z folderu logo/)
│   ├── soundtracks/        # WAV (recznie, gitignore) — Vite kopiuje do dist/
│   ├── FPL-Arena-Soundtrack-Sezon-2025-26.zip  # recznie w public/ (gitignore)
│   ├── player_highlights.json
│   ├── player_season_history.json
│   ├── wyniki_meczy.json
│   └── gladiator_or.json
├── src/
│   ├── app/                # Shell aplikacji (zakładki)
│   ├── features/           # Logika domenowa (wyniki, tabela, hall, profile, pitch, …)
│   ├── components/         # Współdzielone UI (branding, StatPill, …)
│   ├── services/fpl/       # Helpery dream team (mapowanie, formacja — bez HTTP)
│   ├── hooks/              # useLeagueData — ładowanie JSON z public/
│   ├── data/               # PLAYERS_DATA (statyczny katalog gladiatorów)
│   ├── config/             # Nawigacja, branding, indeksy graczy
│   ├── lib/                # Małe helpery (np. wynik meczu W/D/L)
│   ├── types/              # Typy TypeScript
│   └── styles/             # CSS globalny
├── scripts/sync-public.mjs # JSON + logo → public/ (predev / prebuild)
├── scripts/verify-public.mjs
├── scripts/verify-dist.mjs # Po buildzie — 20 WAV + ZIP w dist/
├── deploy/                 # nginx.example.conf, DIGITALOCEAN.md
├── server/                 # Prosty serwer Node dla dist/ (SPA)
├── archive/                # Stary HTML + skrypty migracji (nieużywane w buildzie)
├── konwertuj_*.py          # Regeneracja JSON z Excel
└── *.json (katalog główny) # Źródło danych; kopie w public/ po sync
```

## Instalacja

```bash
npm install
```

Skopiuj herby i logo ligi do `public/logo/` (jeśli jeszcze nie ma):

```powershell
Copy-Item -Recurse -Force "logo\*" "public\logo\"
```

Pliki JSON w katalogu głównym są kopiowane do `public/` automatycznie przez `scripts/sync-public.ps1` przy `npm run dev` / `npm run build`. Po ręcznej regeneracji Pythonem możesz też uruchomić sync bezpośrednio:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/sync-public.ps1
```

## Development

```bash
npm run dev
```

Aplikacja: [http://localhost:5173](http://localhost:5173)

## Build (publikacja statyczna)

**Produkcja (z audio):**

```bash
npm run build:prod
```

Sprawdza `public/soundtracks/` (20 WAV) + ZIP, buduje `dist/`, weryfikuje wynik (`postbuild`).

**Szybki build (bez audio — verify-dist moze failowac):**

```bash
npm run build
```

Wynik w **`dist/`**. Pliki z `public/` (w tym audio) sa kopiowane przez Vite bez obrobki.

```bash
npm run preview   # podglad lokalny buildu (port 4173)
npm run verify-public -- --strict   # tylko sprawdzenie public/
npm run verify-dist                 # tylko sprawdzenie dist/
```

## Deploy — DigitalOcean + Nginx (zalecany)

Pelna instrukcja: [`deploy/DIGITALOCEAN.md`](deploy/DIGITALOCEAN.md)

1. Umiesc recznie w **`public/soundtracks/`** pliki `01-4002.wav` … `20-3873739.wav` oraz **`public/FPL-Arena-Soundtrack-Sezon-2025-26.zip`** (lista: `scripts/soundtrack-manifest.mjs`).
2. `npm run build:prod` — komunikat: `OK - dist/ gotowy do publikacji`.
3. Wgraj **caly** folder `dist/` na droplet (np. `rsync -avz dist/ user@IP:/var/www/fpl-arena-skarb-kibica/dist/`).
4. Nginx: [`deploy/nginx.example.conf`](deploy/nginx.example.conf) — `try_files $uri =404` dla `/soundtracks/` i `*.wav`/`*.zip`.

Test: `https://twoja-domena.pl/soundtracks/12-22952.wav` musi zwrocic audio, **nie** HTML.

## Deploy — inne hosty

**Apache** — `dist/.htaccess` z `public/`.

**Netlify / Cloudflare** — publish: `dist`, plik `dist/_redirects` z `public/`.

### Dlaczego pobiera sie HTML zamiast WAV?

1. Brak plikow w `dist/soundtracks/` na serwerze (build bez `public/soundtracks/` lub niepelny upload).
2. SPA fallback w Nginx/Apache — naprawa: reguly z `deploy/nginx.example.conf`.

## Deploy — wariant B: Node.js

Po buildzie:

```bash
npm run start
```

Domyślny port **3000** (zmienna `PORT`). Serwer w `server/index.js` serwuje `dist/`, zwraca poprawne MIME dla WAV/ZIP i **nie** podstawia `index.html` pod brakujące pliki audio.

## Regeneracja danych (bez zmiany kodu aplikacji)

```bash
python konwertuj_wyniki.py
python konwertuj_highlights.py
python konwertuj_history.py
python konwertuj_or.py
node scripts/sync-public.mjs
```

Szczegóły pipeline'u, schematy JSON i checklist testów: [`docs/TECHNICAL.md`](docs/TECHNICAL.md).

## Skrypty npm

| Skrypt | Opis |
|--------|------|
| `npm run dev` | Vite dev server (+ sync `public/`) |
| `npm run build` | Vite → `dist/` (+ postbuild verify-dist) |
| `npm run build:prod` | Weryfikacja public/ + build + weryfikacja dist/ |
| `npm run verify-public` | Sprawdzenie plikow audio w public/ |
| `npm run verify-dist` | Sprawdzenie dist/ po buildzie |
| `npm run preview` | Podgląd `dist/` |
| `npm run start` | Serwer Node dla `dist/` |
| `npm run typecheck` | Sprawdzenie typów TypeScript |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Architektura

- **Routing:** zakładki w `src/app/App.tsx` (`home` | `sezon` | `profiles` | `statystyki` | `udostepnij` | `media`) — bez React Router.
- **UI:** `components/` + widoki w `features/*/`.
- **Dane runtime:** cztery pliki JSON z `public/`, ładowane w `hooks/useLeagueData.ts` (`fetch` przy starcie aplikacji).
- **Dane statyczne:** `src/data/players.ts` (katalog 20 gladiatorów) — wbudowane w bundle.
- **Jedenastka sezonu:** wyłącznie z `player_highlights.json` → `dreamTeam` (panel listowy w `TeamOfSeasonPanel`).
- **Logika domenowa:** `features/standings/`, `features/profiles/`, `features/pitch/`, `features/topki/` itd.
- **Style:** Tailwind + `src/styles/global.css`.

## Uwagi

- Monolit HTML jest w `archive/` (opcjonalnie do usunięcia). Aplikacja produkcyjna: `index.html` + `src/`.
- Pliki `public/*.json` powstają przez `scripts/sync-public.ps1` (hook `predev` / `prebuild`).
- Brak bazy danych — projekt działa na JSON i lokalnym stanie React.
- Brak integracji z API FPL w runtime (usunięte 2026-05-31). Szczegóły migracji: [`docs/TECHNICAL.md` §4](docs/TECHNICAL.md#4-zmiana-rezygnacja-z-api-fpl-2026-05-31).
