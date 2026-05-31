# Pliki soundtrack (WAV)

Umiesc tutaj **20 plikow** w formacie:

```text
01-4002.wav
02-9084.wav
…
20-3873739.wav
```

Pelna lista: `scripts/soundtrack-manifest.mjs`.

Archiwum calej playlisty wrzuc do **`public/FPL-Arena-Soundtrack-Sezon-2025-26.zip`** (katalog nadrzedny).

Pliki sa w `.gitignore` — nie trafiaja do GitHub. Vite kopiuje je do `dist/` przy `npm run build`.

Weryfikacja przed deployem:

```bash
npm run verify-public -- --strict
npm run build:prod
```
