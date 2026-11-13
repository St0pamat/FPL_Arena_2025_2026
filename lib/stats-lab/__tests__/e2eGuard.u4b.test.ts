import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
const GUARD = path.join(ROOT, "scripts/guard-e2e.mjs");

describe("U4b e2e guard (bez Playwright)", () => {
  it("bez E2E_READONLY=1 kończy się kodem 1 i czytelnym komunikatem", () => {
    const env = { ...process.env };
    delete env.E2E_READONLY;
    const r = spawnSync(process.execPath, [GUARD], {
      env,
      encoding: "utf8",
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/E2E_READONLY=1/);
    expect(r.stderr).toMatch(/ZABLOKOWANE|produkcyjn/i);
  });

  it("z E2E_READONLY=1 kończy się kodem 0 (bez uruchamiania playwright)", () => {
    const r = spawnSync(process.execPath, [GUARD], {
      env: { ...process.env, E2E_READONLY: "1" },
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/E2E_READONLY=1 OK/);
  });
});
