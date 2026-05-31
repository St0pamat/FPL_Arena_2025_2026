# FPL Arena — Skarb Kibica

Interaktywny, posezonowy raport ligi FPL Arena (format H2H): profile gladiatorów, wyniki 38 kolejek, tabela na żywo, Sala Chwały i jedenastka sezonu.

## Wymagania

- **Node.js** 20+ (development, build, opcjonalny serwer produkcyjny)
- **Python 3** (tylko regeneracja danych z Excel — opcjonalnie)

## Struktura projektu

```
├── public/                 # Statyczne assety serwowane bez zmian (JSON, logo)
│   ├── logo/               # Herby drużyn + logo ligi (skopiuj z folderu logo/)
│   ├── player_highlights.json
│   ├── wyniki_meczy.json
│   └── gladiator_or.json
├── src/
│   ├── app/                # Routing / shell aplikacji (zakładki)
│   ├── features/           # Logika domenowa (FPL, wyniki, tabela, hall, profile, pitch)
│   ├── components/         # Współdzielone UI (branding, StatPill, …)
│   ├── services/fpl/       # API Premier League (bootstrap, zdjęcia, dream team)
│   ├── hooks/              # useLeagueData — ładowanie JSON + FPL bootstrap
│   ├── data/               # PLAYERS_DATA (statyczny katalog gladiatorów)
│   ├── config/             # Ścieżki logo, indeksy graczy
│   ├── lib/                # Małe helpery (np. wynik meczu W/D/L)
│   ├── types/              # Typy TypeScript
│   └── styles/             # CSS globalny + boisko
├── scripts/sync-public.ps1 # JSON + logo → public/
├── server/                 # Prosty serwer Node dla dist/ (SPA)
├── archive/                # Stary HTML + skrypty migracji (nieużywane w buildzie)
├── konwertuj_*.py          # Regeneracja JSON z Excel
└── *.json (katalog główny) # Źródło danych; kopie w public/ po sync (gitignore)
```

## Instalacja

```bash
npm install
```

Skopiuj herby i logo ligi do `public/logo/` (jeśli jeszcze nie ma):

```powershell
Copy-Item -Recurse -Force "logo\*" "public\logo\"
```

Pliki JSON w katalogu głównym są kopiowane do `public/` przy pierwszym setupie; po regeneracji Pythonem skopiuj je ponownie:

```powershell
Copy-Item player_highlights.json, wyniki_meczy.json, gladiator_or.json -Destination public/
```

## Development

```bash
npm run dev
```

Aplikacja: [http://localhost:5173](http://localhost:5173)

## Build (publikacja statyczna)

```bash
npm run build
```

Wynik w folderze **`dist/`** — można wrzucić na dowolny hosting statyczny (nginx, Apache, S3, Netlify, itd.).

```bash
npm run preview   # podgląd lokalny buildu (port 4173)
```

## Deploy — wariant A: hosting statyczny (zalecany)

1. `npm run build`
2. Wgraj całą zawartość `dist/` na serwer.
3. Skonfiguruj fallback do `index.html` (SPA), np. nginx:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

Dane (`*.json`) i `logo/` są już w `dist/` po buildzie Vite.

## Deploy — wariant B: Node.js

Po buildzie:

```bash
npm run start
```

Domyślny port **3000** (zmienna `PORT`). Serwer w `server/index.js` serwuje `dist/` i przekierowuje nieznane ścieżki na `index.html`.

## Regeneracja danych (bez zmiany kodu aplikacji)

```bash
python konwertuj_highlights.py
python konwertuj_or.py
python konwertuj_wyniki.py
Copy-Item player_highlights.json, wyniki_meczy.json, gladiator_or.json -Destination public/
```

## Skrypty npm

| Skrypt      | Opis                          |
|------------|-------------------------------|
| `npm run dev`     | Vite dev server               |
| `npm run build`   | Produkcja → `dist/`           |
| `npm run preview` | Podgląd `dist/`               |
| `npm run start`   | Serwer Node dla `dist/`       |
| `npm run lint`    | ESLint                        |
| `npm run format`  | Prettier                      |
## Architektura

- **Routing:** zakładki w `src/app/App.tsx` (`home` | `profiles` | `wyniki` | `standings` | `hall`) — bez React Router, jak w oryginale.
- **UI:** `components/` + widoki w `features/*/`.
- **Dane:** `public/*.json` + fetch w `hooks/useLeagueData.ts`; FPL bootstrap tylko do zdjęć zawodników.
- **Logika FPL:** `services/fpl/`, `features/profiles/`, `features/pitch/`, `features/standings/lib/`.
- **Style:** Tailwind + `src/styles/global.css` (zachowany wygląd z monolitu).

## Uwagi

- Monolit HTML jest w `archive/` (opcjonalnie do usunięcia). Aplikacja produkcyjna: `index.html` + `src/`.
- Pliki `public/*.json` nie są wersjonowane — powstają przez `scripts/sync-public.ps1` (hook `predev` / `prebuild`).
- API FPL (`bootstrap-static`) wymaga dostępu z sieci; przy blokadzie CORS zdjęcia zawodników mają fallback (inicjały).
- Nie dodawano bazy danych — projekt nadal działa na JSON i lokalnym stanie React.
