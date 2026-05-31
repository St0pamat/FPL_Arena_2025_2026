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

## 5. Diagnostyka na serwerze

```bash
DIST_DIR=/var/www/fpl-arena-skarb-kibica/dist node scripts/verify-dist.mjs
```

Skrypt sprawdza 20 WAV, sciezke ZIP, rozmiar (~540 MB), uprawnienia odczytu, sygnature PK oraz czy plik to nie HTML.

## 6. Test po deploy

```text
https://twoja-domena.pl/FPL-Arena-Soundtrack-Sezon-2025-26.zip -> ZIP (~540 MB, nie HTML)
https://twoja-domena.pl/soundtracks/12-22952.wav               -> audio
```

## 7. Typowy blad: pobierany HTML zamiast ZIP/WAV

- **ZIP wgrany do `public/` zamiast `dist/`** — Nginx serwuje `dist/`:
  ```bash
  cp /var/www/.../public/FPL-Arena-Soundtrack-Sezon-2025-26.zip /var/www/.../dist/
  ```
- Brak pliku w `dist/` (niepelny rsync)
- SPA fallback bez reguly `try_files $uri =404` dla `.zip` / `/soundtracks/`
