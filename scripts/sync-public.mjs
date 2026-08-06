#!/usr/bin/env node
/**
 * Kopiuje JSON + logo do public/ przed dev/build.
 * Pliki audio (public/soundtracks/, ZIP) NIE sa generowane tutaj —
 * umieszcz je recznie w public/ (gitignore); Vite skopiuje je do dist/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");

const jsonFiles = [
  "player_highlights.json",
  "player_season_history.json",
  "wyniki_meczy.json",
  "gladiator_or.json",
];

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

fs.mkdirSync(path.join(publicDir, "logo"), { recursive: true });

for (const name of jsonFiles) {
  const src = path.join(root, name);
  if (fs.existsSync(src)) {
    copyFile(src, path.join(publicDir, name));
    console.log(`Copied ${name}`);
  }
}

copyDir(path.join(root, "logo"), path.join(publicDir, "logo"));
if (fs.existsSync(path.join(root, "logo"))) {
  console.log("Copied logo/");
}

const imagesDir = path.join(publicDir, "images");
fs.mkdirSync(imagesDir, { recursive: true });

const portalLogos = [
  {
    src: path.join(root, "logo", "FPL Arena.png"),
    dest: path.join(imagesDir, "fpl-arena-logo.png"),
  },
  {
    src: path.join(root, "logo", "Na Minusie.png"),
    dest: path.join(imagesDir, "na-minusie-logo.png"),
  },
];

for (const { src, dest } of portalLogos) {
  if (fs.existsSync(src)) {
    copyFile(src, dest);
    console.log(`Copied portal logo → ${path.relative(publicDir, dest)}`);
  } else {
    console.warn(`WARN: Brak pliku ${path.relative(root, src)} — pominięto kopiowanie logotypu portalu.`);
  }
}

const soundtrackDir = path.join(publicDir, "soundtracks");
const wavInPublic = fs.existsSync(soundtrackDir)
  ? fs.readdirSync(soundtrackDir).filter((f) => f.endsWith(".wav")).length
  : 0;
const zipInPublic = fs.existsSync(path.join(publicDir, "FPL-Arena-Soundtrack-Sezon-2025-26.zip"));

if (wavInPublic === 0) {
  console.warn(
    "WARN: Brak plikow WAV w public/soundtracks/ — umiesc 20 utworow przed buildem produkcyjnym."
  );
} else {
  console.log(`public/soundtracks/: ${wavInPublic} plikow WAV (Vite skopiuje do dist/)`);
}

if (!zipInPublic) {
  console.warn(
    "WARN: Brak public/FPL-Arena-Soundtrack-Sezon-2025-26.zip — dodaj archiwum przed deployem."
  );
}

try {
  await import("./process-fpl-arena-ikk-logo.mjs");
} catch (err) {
  console.warn("WARN: Nie udało się przetworzyć logotypu IKK:", err.message);
}
