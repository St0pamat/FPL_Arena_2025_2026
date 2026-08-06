import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const candidates = [
  path.join(root, "logo", "fpl-arena-ikk.png"),
  path.join(root, "logo", "FPL Arena IKK.png"),
];
const src = candidates.find((p) => fs.existsSync(p));
if (!src) {
  console.warn("WARN: Brak pliku fpl-arena-ikk.png — pominięto kopiowanie logotypu IKK.");
  process.exit(0);
}

const dest = path.join(root, "public", "logo", "fpl-arena-ikk.png");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);

console.log(`Copied IKK logo → ${path.relative(root, dest)}`);
