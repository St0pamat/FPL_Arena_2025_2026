#!/usr/bin/env node
/**
 * Weryfikacja public/ przed buildem (opcjonalnie --strict = exit 1).
 * Uruchom: node scripts/verify-public.mjs [--strict]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SOUNDTRACK_BUNDLE_FILE,
  SOUNDTRACK_WAV_COUNT,
  SOUNDTRACK_WAV_FILES,
} from "./soundtrack-manifest.mjs";

const strict = process.argv.includes("--strict");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const soundtrackDir = path.join(publicDir, "soundtracks");
const zipPath = path.join(publicDir, SOUNDTRACK_BUNDLE_FILE);

const errors = [];
const warnings = [];

if (!fs.existsSync(soundtrackDir)) {
  errors.push("Brak katalogu public/soundtracks/");
} else {
  const present = new Set(fs.readdirSync(soundtrackDir).filter((f) => f.endsWith(".wav")));
  const missing = SOUNDTRACK_WAV_FILES.filter((f) => !present.has(f));
  const extra = [...present].filter((f) => !SOUNDTRACK_WAV_FILES.includes(f));

  if (missing.length > 0) {
    errors.push(`Brakuje ${missing.length} plikow WAV w public/soundtracks/: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "..." : ""}`);
  }
  if (extra.length > 0) {
    warnings.push(`Nadmiarowe pliki WAV w public/soundtracks/: ${extra.join(", ")}`);
  }
  if (present.size !== SOUNDTRACK_WAV_COUNT) {
    errors.push(`public/soundtracks/ ma ${present.size} plikow WAV (oczekiwane ${SOUNDTRACK_WAV_COUNT})`);
  }
}

if (!fs.existsSync(zipPath)) {
  errors.push(`Brak pliku public/${SOUNDTRACK_BUNDLE_FILE}`);
} else {
  const sizeMb = fs.statSync(zipPath).size / (1024 * 1024);
  if (sizeMb < 1) {
    errors.push(`public/${SOUNDTRACK_BUNDLE_FILE} jest podejrzanie maly (${sizeMb.toFixed(2)} MB)`);
  }
}

for (const w of warnings) console.warn(`WARN: ${w}`);

if (errors.length > 0) {
  console.error("BLAD - public/ niegotowy do buildu produkcyjnego:");
  errors.forEach((e) => console.error(`  - ${e}`));
  console.error("\nUmiesc pliki recznie w public/soundtracks/ i public/ (patrz public/soundtracks/README.md).");
  if (strict) process.exit(1);
  process.exit(0);
}

console.log(`OK - public/ zawiera ${SOUNDTRACK_WAV_COUNT} utworow WAV + ZIP (gotowe do vite build)`);
