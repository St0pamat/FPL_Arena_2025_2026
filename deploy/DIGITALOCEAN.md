# DigitalOcean — wdrozenie Skarb Kibica (Nginx + dist/)

## 1. Pliki audio (poza Git)

Umiesc recznie w repozytorium lokalnym (gitignore):

```
public/soundtracks/01-4002.wav … 20-3873739.wav   (20 plikow)
public/FPL-Arena-Soundtrack-Sezon-2025-26.zip
```

Lista nazw: `scripts/soundtrack-manifest.mjs` (zgodna z `src/data/soundtrackTracks.ts`).

## 2. Build produkcyjny (lokalnie lub na droplet)

```bash
npm ci
npm run build:prod
```

`build:prod` = weryfikacja `public/` + `vite build` + weryfikacja `dist/`.

Bez audio (tylko UI): `npm run build` — `postbuild` failuje jesli brak WAV/ZIP w dist.

Pomin weryfikacje audio (dev): nie uzywaj `build:prod`; uruchom samo `vite build` bez plikow w public.

## 3. Upload na droplet

```bash
# Caly dist/ (~570 MB audio + aplikacja)
rsync -avz --delete dist/ user@twoja-droplet-ip:/var/www/fpl-arena-skarb-kibica/dist/

# LUB tylko brakujace audio (jesli aplikacja juz jest):
rsync -avz public/soundtracks/ user@IP:/var/www/.../dist/soundtracks/
rsync -avz public/FPL-Arena-Soundtrack-Sezon-2025-26.zip user@IP:/var/www/.../dist/
```

## 4. Nginx

Skopiuj `deploy/nginx.example.conf` do `/etc/nginx/sites-available/fpl-arena`, ustaw `root` na sciezke `dist/`.

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 5. Test po deploy

```text
https://twoja-domena.pl/soundtracks/12-22952.wav     -> audio (nie HTML)
https://twoja-domena.pl/FPL-Arena-Soundtrack-Sezon-2025-26.zip -> ZIP
https://twoja-domena.pl/brakujacy.wav                -> 404 (nie index.html)
```

## 6. Typowy blad: pobierany HTML zamiast WAV

- Brak plikow w `dist/soundtracks/` na serwerze
- Nginx `try_files $uri /index.html` dla sciezki /soundtracks/ (uzyj konfiguracji z tego repo)
