#!/usr/bin/env node
/**
 * Weryfikacja dist/ po npm run build.
 * Uruchom: node scripts/verify-dist.mjs
 * (alias npm run verify-dist; hook postbuild)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SOUNDTRACK_BUNDLE_FILE,
  SOUNDTRACK_WAV_COUNT,
  SOUNDTRACK_WAV_FILES,
} from "./soundtrack-manifest.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const soundtrackDir = path.join(distDir, "soundtracks");
const zipPath = path.join(distDir, SOUNDTRACK_BUNDLE_FILE);

const errors = [];

if (!fs.existsSync(path.join(distDir, "index.html"))) {
  errors.push("Brak dist/index.html — uruchom: npm run build");
}

if (!fs.existsSync(soundtrackDir)) {
  errors.push("Brak dist/soundtracks/ — Vite nie skopiowal plikow z public/soundtracks/");
} else {
  const present = new Set(fs.readdirSync(soundtrackDir).filter((f) => f.endsWith(".wav")));
  const missing = SOUNDTRACK_WAV_FILES.filter((f) => !present.has(f));

  if (missing.length > 0) {
    errors.push(
      `W dist/soundtracks/ brakuje: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? ` (+${missing.length - 5})` : ""}`
    );
  }
  if (present.size !== SOUNDTRACK_WAV_COUNT) {
    errors.push(`dist/soundtracks/ ma ${present.size} plikow WAV (oczekiwane ${SOUNDTRACK_WAV_COUNT})`);
  }
}

if (!fs.existsSync(zipPath)) {
  errors.push(`Brak dist/${SOUNDTRACK_BUNDLE_FILE}`);
} else {
  const sizeMb = fs.statSync(zipPath).size / (1024 * 1024);
  if (sizeMb < 1) {
    errors.push(`dist/${SOUNDTRACK_BUNDLE_FILE} jest podejrzanie maly (${sizeMb.toFixed(2)} MB)`);
  }
}

if (errors.length > 0) {
  console.error("BLAD - deploy niekompletny:");
  errors.forEach((e) => console.error(`  - ${e}`));
  console.error("\nNaprawa:");
  console.error("  1. Umiesc 20 plikow .wav w public/soundtracks/ oraz ZIP w public/");
  console.error("  2. npm run build");
  console.error("  3. Wgraj caly folder dist/ na serwer DigitalOcean (nginx root)");
  process.exit(1);
}

let totalMb = 0;
for (const f of SOUNDTRACK_WAV_FILES) {
  totalMb += fs.statSync(path.join(soundtrackDir, f)).size;
}
totalMb = totalMb / (1024 * 1024);
const zipMb = fs.statSync(zipPath).size / (1024 * 1024);

console.log("OK - dist/ gotowy do publikacji");
console.log(`     ${SOUNDTRACK_WAV_COUNT} utworow WAV w dist/soundtracks/ (~${totalMb.toFixed(0)} MB)`);
console.log(`     dist/${SOUNDTRACK_BUNDLE_FILE} (~${zipMb.toFixed(0)} MB)`);
console.log("     Wgraj cala zawartosc dist/ na serwer (root nginx).");
