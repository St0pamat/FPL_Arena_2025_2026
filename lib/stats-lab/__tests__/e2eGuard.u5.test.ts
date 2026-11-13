import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { readFileSync } from "node:fs";
import {
  assertE2eReadonly,
  E2E_READONLY_BLOCK_MESSAGE,
} from "../../../scripts/assert-e2e-readonly.mjs";

const ROOT = path.resolve(__dirname, "../../..");

describe("U5 e2e readonly guard (global-setup + shared assert)", () => {
  it("assertE2eReadonly blokuje bez flagi", () => {
    const env = { ...process.env };
    delete env.E2E_READONLY;
    const r = assertE2eReadonly(env);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toBe(E2E_READONLY_BLOCK_MESSAGE);
      expect(r.message).toMatch(/E2E_READONLY=1/);
    }
  });

  it("assertE2eReadonly OK przy E2E_READONLY=1", () => {
    expect(assertE2eReadonly({ E2E_READONLY: "1" }).ok).toBe(true);
  });

  it("global-setup.ts woła assertE2eReadonly na starcie", () => {
    const src = readFileSync(
      path.join(ROOT, "tests/e2e/global-setup.ts"),
      "utf8",
    );
    expect(src).toMatch(/assertE2eReadonly/);
    expect(src).toMatch(/assert-e2e-readonly\.mjs/);
  });

  it("bez E2E_READONLY=1 guard-e2e kończy się kodem 1", () => {
    const env = { ...process.env };
    delete env.E2E_READONLY;
    const r = spawnSync(
      process.execPath,
      [path.join(ROOT, "scripts/guard-e2e.mjs")],
      { env, encoding: "utf8" },
    );
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/E2E_READONLY=1/);
  });
});
