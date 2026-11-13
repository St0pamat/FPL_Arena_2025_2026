import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const SCAN_DIRS = [
  path.join(ROOT, "components/admin/stats-lab/planner"),
  path.join(ROOT, "components/admin/stats-lab/StatsLabModuleShell.tsx"),
  path.join(ROOT, "lib/stats-lab/menuChrome.ts"),
  path.join(ROOT, "lib/stats-lab/shellNavChrome.ts"),
];

/**
 * Dozwolone wyjątki — z uzasadnieniem:
 * - FDR: wspólna skala trudności meczów we wszystkich motywach
 * - Overlay badge herbu: półprzezroczyste tło pod ikoną
 * - Modal backdrop: przyciemnienie tła
 * - Tokeny motywu / shell: jawne hex z STATS_LAB_THEME_HEX (jeden accent)
 * - Tailwind opacity steps na tokenach (np. /10, /15)
 */
const ALLOW_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /fdrPillClass|fdrHeat|level <= 1|level === 2|level === 3|level === 4/, reason: "FDR scale (shared)" },
  { re: /bg-emerald-[0-9]+|text-emerald-[0-9]+|border-emerald-[0-9]+/, reason: "FDR / legacy green — only if near fdr*" },
  { re: /bg-rose-[0-9]+|text-rose-[0-9]+|border-rose-[0-9]+/, reason: "FDR hard + danger (hit/sell soft bg)" },
  { re: /bg-amber-[0-9]+|text-amber-[0-9]+|border-amber-[0-9]+/, reason: "FDR mid + SP warning" },
  { re: /bg-black\/(40|60)|backdrop-blur/, reason: "badge overlay / modal scrim" },
  { re: /#(070b14|0c1322|0b1c2e|122a3a|0f313c|f8fafc|f0fdfa|94a3b8|39FF14|39ff14|2dd4bf|0f766e|f59e0b|1c1917|b45309|e2e8f0|0f172a|1e293b|020617|be123c|334155|cbd5e1|fb7185)/i, reason: "theme token hex" },
  { re: /sky-[0-9]+/, reason: "swap selected state" },
  { re: /slate-[0-9]+/, reason: "neutral slate scale (paired with isLight)" },
  { re: /teal-[0-9]+/, reason: "Scout borders / hover neutrals" },
  { re: /lime-[0-9]+/, reason: "Arena accent hover" },
];

const BANNED = [
  /\btext-white\b/,
  /\bbg-black\b(?!\/)/,
  /#[0-9a-fA-F]{3,8}\b/,
  /\brgba?\(/,
];

function listFiles(entry: string): string[] {
  const st = fs.statSync(entry);
  if (st.isFile()) return entry.endsWith(".tsx") || entry.endsWith(".ts") ? [entry] : [];
  const out: string[] = [];
  for (const name of fs.readdirSync(entry)) {
    if (name === "__tests__") continue;
    out.push(...listFiles(path.join(entry, name)));
  }
  return out;
}

function lineAllowed(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
    return true;
  }
  // FDR helper bodies
  if (/fdr|FDR|level <=|level ===/.test(line)) return true;
  for (const { re } of ALLOW_PATTERNS) {
    if (re.test(line)) return true;
  }
  return false;
}

describe("U4 no hardcoded colors outside allowlist (planner + shell)", () => {
  it("flags unexpected hex / text-white / bg-black / rgb in scanned files", () => {
    const files = SCAN_DIRS.flatMap(listFiles);
    expect(files.length).toBeGreaterThan(5);

    const violations: string[] = [];
    for (const file of files) {
      const rel = path.relative(ROOT, file).replace(/\\/g, "/");
      // themeTokens / chartTheme are the source of hex — skip
      if (rel.includes("themeTokens") || rel.includes("chartTheme")) continue;
      const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((line, i) => {
        for (const ban of BANNED) {
          if (!ban.test(line)) continue;
          if (lineAllowed(line)) continue;
          violations.push(`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`);
        }
      });
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });
});
