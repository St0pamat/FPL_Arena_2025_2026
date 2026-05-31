#!/usr/bin/env node
/**
 * Weryfikacja dist/ po npm run build (lub na serwerze produkcyjnym).
 *
 * Uzycie:
 *   npm run verify-dist
 *   node scripts/verify-dist.mjs
 *   node scripts/verify-dist.mjs --dist=/var/www/fpl-arena-skarb-kibica/dist
 *   DIST_DIR=/var/www/.../dist node scripts/verify-dist.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SOUNDTRACK_BUNDLE_FILE,
  SOUNDTRACK_WAV_COUNT,
  SOUNDTRACK_WAV_FILES,
} from "./soundtrack-manifest.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

function parseDistDir() {
  const flag = process.argv.find((a) => a.startsWith("--dist="));
  if (flag) return path.resolve(flag.slice("--dist=".length));
  if (process.env.DIST_DIR) return path.resolve(process.env.DIST_DIR);
  return path.join(projectRoot, "dist");
}

const distDir = parseDistDir();
const publicDir = path.join(projectRoot, "public");
const soundtrackDir = path.join(distDir, "soundtracks");
const zipPath = path.join(distDir, SOUNDTRACK_BUNDLE_FILE);
const publicZipPath = path.join(publicDir, SOUNDTRACK_BUNDLE_FILE);
const nginxUrlPath = `/${SOUNDTRACK_BUNDLE_FILE}`;

const errors = [];
const warnings = [];
const report = [];

function line(title, value) {
  report.push({ title, value });
}

function formatMode(mode) {
  if (process.platform === "win32") {
    return `(Windows, brak chmod; sprawdzono fs.access R_OK)`;
  }
  return `0${(mode & 0o777).toString(8)}`;
}

function checkReadable(filePath, label) {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return { ok: true, detail: "odczyt OK (fs.access R_OK)" };
  } catch (err) {
    return { ok: false, detail: `BRAK ODCZYTU: ${err.message}` };
  }
}

function isZipArchive(filePath) {
  try {
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    // Magic PK\x03\x04 lub pusty zip PK\x05\x06
    return buf[0] === 0x50 && buf[1] === 0x4b;
  } catch {
    return false;
  }
}

function isHtmlFile(filePath) {
  try {
    const head = fs.readFileSync(filePath, { encoding: "utf8", flag: "r" }).slice(0, 512).trimStart();
    return head.startsWith("<!") || head.toLowerCase().includes("<html");
  } catch {
    return false;
  }
}

function inspectFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const stat = fs.statSync(filePath);
  const read = checkReadable(filePath, path.basename(filePath));
  return {
    exists: true,
    path: filePath,
    sizeBytes: stat.size,
    sizeMb: stat.size / (1024 * 1024),
    mode: formatMode(stat.mode),
    uid: stat.uid,
    gid: stat.gid,
    mtime: stat.mtime.toISOString(),
    readable: read.ok,
    readableDetail: read.detail,
    isFile: stat.isFile(),
  };
}

// --- Raport naglowkowy ---
line("Cel", "Diagnostyka deployu soundtrack (WAV + ZIP)");
line("Platforma", `${process.platform} / ${process.arch}`);
line("Katalog dist (sprawdzany)", distDir);
line("Oczekiwana nazwa ZIP (case-sensitive)", SOUNDTRACK_BUNDLE_FILE);
line("URL pobierania w aplikacji (href)", nginxUrlPath);
line("Nginx root musi wskazywac na", ".../dist (NIE na .../public)");

console.log("\n=== FPL Arena — verify-dist ===\n");

// --- index.html ---
const indexPath = path.join(distDir, "index.html");
if (!fs.existsSync(indexPath)) {
  errors.push(`Brak ${indexPath}`);
  line("dist/index.html", "BRAK");
} else {
  line("dist/index.html", "OK");
}

// --- WAV ---
if (!fs.existsSync(soundtrackDir)) {
  errors.push(`Brak katalogu ${soundtrackDir}`);
  line("dist/soundtracks/", "BRAK KATALOGU");
} else {
  const present = new Set(fs.readdirSync(soundtrackDir).filter((f) => f.endsWith(".wav")));
  const missing = SOUNDTRACK_WAV_FILES.filter((f) => !present.has(f));
  const extra = [...present].filter((f) => !SOUNDTRACK_WAV_FILES.includes(f));

  line("dist/soundtracks/ (sciezka)", soundtrackDir);
  line("Pliki WAV obecne", `${present.size} / ${SOUNDTRACK_WAV_COUNT}`);

  if (missing.length > 0) {
    errors.push(`Brakuje WAV: ${missing.join(", ")}`);
  }
  if (extra.length > 0) {
    warnings.push(`Nadmiarowe WAV w dist: ${extra.join(", ")}`);
  }
  if (present.size !== SOUNDTRACK_WAV_COUNT) {
    errors.push(`Oczekiwano ${SOUNDTRACK_WAV_COUNT} WAV, jest ${present.size}`);
  }

  let wavTotalMb = 0;
  for (const f of SOUNDTRACK_WAV_FILES) {
    const fp = path.join(soundtrackDir, f);
    if (fs.existsSync(fp)) {
      wavTotalMb += fs.statSync(fp).size;
    }
  }
  line("Laczny rozmiar WAV", `~${(wavTotalMb / (1024 * 1024)).toFixed(1)} MB`);
}

// --- ZIP w dist/ (krytyczne dla Nginx) ---
line("", "");
line("--- Archiwum ZIP (serwowane z korzenia dist/) ---", "");

const zipDist = inspectFile(zipPath);
const zipPublic = inspectFile(publicZipPath);

if (!zipDist) {
  errors.push(`Brak pliku ZIP w dist/: ${zipPath}`);
  line("dist ZIP — sciezka absolutna", zipPath);
  line("dist ZIP — status", "NIE ISTNIEJE");

  if (zipPublic) {
    errors.push(
      "ZIP znaleziony w public/, ale BRAK w dist/. Nginx serwuje dist/ — pobieranie zwroci index.html (HTML zamiast ZIP)."
    );
    line("public ZIP (zrodlo Vite)", `${publicZipPath} — ISTNIEJE (${zipPublic.sizeMb.toFixed(1)} MB)`);
    line("Naprawa", "npm run build LUB skopiuj recznie: cp public/*.zip dist/");
  }
} else {
  line("dist ZIP — sciezka absolutna", zipDist.path);
  line("dist ZIP — rozmiar", `${zipDist.sizeMb.toFixed(2)} MB (${zipDist.sizeBytes.toLocaleString("pl-PL")} B)`);
  line("dist ZIP — uprawnienia (mode)", zipDist.mode);
  line("dist ZIP — wlasciciel uid/gid", `${zipDist.uid} / ${zipDist.gid}`);
  line("dist ZIP — mtime", zipDist.mtime);
  line("dist ZIP — odczyt", zipDist.readableDetail);

  if (!zipDist.readable) {
    errors.push(`Brak uprawnien do odczytu ZIP: ${zipPath}`);
  }
  if (!zipDist.isFile) {
    errors.push(`Sciezka ZIP nie jest plikiem: ${zipPath}`);
  }
  if (zipDist.sizeMb < 10) {
    errors.push(`ZIP podejrzanie maly (${zipDist.sizeMb.toFixed(2)} MB) — oczekiwano ~500+ MB`);
  }

  if (isHtmlFile(zipPath)) {
    errors.push(
      "Plik ZIP w dist/ zawiera HTML (prawdopodobnie index.html) — to wyjasnia uszkodzone pobieranie!"
    );
    line("dist ZIP — sygnatura", "BLAD: to jest HTML, nie archiwum ZIP");
  } else if (!isZipArchive(zipPath)) {
    errors.push("Plik w dist/ nie ma sygnatury ZIP (PK) — moze byc uszkodzony lub to nie archiwum");
    line("dist ZIP — sygnatura", "BLAD: brak magic bytes PK");
  } else {
    line("dist ZIP — sygnatura", "OK (PK — prawidlowe archiwum ZIP)");
  }

  if (zipPublic) {
    if (Math.abs(zipPublic.sizeBytes - zipDist.sizeBytes) > 1024) {
      warnings.push(
        `Rozmiar ZIP rozni sie: public=${zipPublic.sizeMb.toFixed(1)} MB vs dist=${zipDist.sizeMb.toFixed(1)} MB — uruchom ponownie npm run build`
      );
    }
    line("public ZIP (zrodlo przed buildem)", `${publicZipPath} (${zipPublic.sizeMb.toFixed(1)} MB)`);
  } else if (fs.existsSync(publicDir)) {
    warnings.push(`Brak ${publicZipPath} — przy nastepnym buildzie Vite nie skopiuje ZIP do dist/`);
  }
}

// --- Weryfikacja zgodnosci nazwy z kodem aplikacji ---
const expectedFromCode = SOUNDTRACK_BUNDLE_FILE;
const distFiles = fs.existsSync(distDir) ? fs.readdirSync(distDir) : [];
const zipLike = distFiles.filter((f) => f.toLowerCase().includes("soundtrack") && f.endsWith(".zip"));

if (zipLike.length === 0 && !zipDist) {
  line("Pliki *soundtrack*.zip w dist/", "brak");
} else if (zipLike.length > 0 && !zipLike.includes(expectedFromCode)) {
  errors.push(
    `W dist/ sa ZIP o innej nazwie niz w kodzie aplikacji: ${zipLike.join(", ")} (oczekiwano dokladnie: ${expectedFromCode})`
  );
  line("Pliki *soundtrack*.zip w dist/", zipLike.join(", "));
}

// --- Wypisz raport ---
for (const { title, value } of report) {
  if (title === "" && value === "") {
    console.log("");
    continue;
  }
  console.log(`${title}`);
  console.log(`  ${value}`);
  console.log("");
}

if (warnings.length > 0) {
  console.log("OSTRZEZENIA:");
  warnings.forEach((w) => console.log(`  ! ${w}`));
  console.log("");
}

if (errors.length > 0) {
  console.error("BLAD — deploy niekompletny lub ZIP niedostepny dla Nginx:\n");
  errors.forEach((e) => console.error(`  x ${e}`));
  console.error("\nTypowa przyczyna HTML zamiast ZIP:");
  console.error("  1. ZIP wgrany do public/ na serwerze, ale nginx root = dist/");
  console.error("  2. Plik nie wgrany do dist/ — brak po buildzie / niepelny rsync");
  console.error("  3. SPA fallback zwraca index.html dla /FPL-Arena-Soundtrack-....zip");
  console.error("\nNaprawa:");
  console.error(`  cp ${publicZipPath} ${zipPath}`);
  console.error("  lub: npm run build:prod && rsync -avz dist/ serwer:/var/www/.../dist/");
  process.exit(1);
}

console.log("OK - dist/ gotowy do publikacji");
console.log(`     ${SOUNDTRACK_WAV_COUNT} utworow WAV + ${SOUNDTRACK_BUNDLE_FILE}`);
console.log(`     Test URL: https://TWOJA-DOMENA${nginxUrlPath}`);
console.log("     (musi zwrocic application/zip, NIE text/html)\n");
