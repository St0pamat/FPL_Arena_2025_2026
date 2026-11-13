import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type FullConfig } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ENV_FILE = path.join(ROOT, ".env.test.local");
const AUTH_DIR = path.join(ROOT, "tests", ".auth");
const AUTH_STATE = path.join(AUTH_DIR, "admin.json");

function loadEnvTestLocal(): void {
  if (!fs.existsSync(ENV_FILE)) return;
  const raw = fs.readFileSync(ENV_FILE, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function assertLocalOnly(baseURL: string): void {
  let url: URL;
  try {
    url = new URL(baseURL);
  } catch {
    throw new Error(
      `[e2e] Invalid baseURL "${baseURL}". E2E runs only against local http://localhost:3000.`,
    );
  }
  const host = url.hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(
      `[e2e] Refusing non-local baseURL "${baseURL}". E2E is local-dev only (never production).`,
    );
  }
}

async function waitForLocalServer(baseURL: string, timeoutMs = 120_000): Promise<void> {
  const started = Date.now();
  let lastError = "unknown";
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(baseURL, { redirect: "manual" });
      if (res.status > 0) return;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(
    `[e2e] Timed out waiting for ${baseURL} (${lastError}). Start \`npm run dev\` or rely on playwright webServer.`,
  );
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  // Blokada także przy bezpośrednim `npx playwright test` (omija npm run test:e2e).
  const { assertE2eReadonly } = await import("../../scripts/assert-e2e-readonly.mjs");
  const readonly = assertE2eReadonly(process.env);
  if (!readonly.ok) {
    throw new Error(readonly.message);
  }

  loadEnvTestLocal();

  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";
  assertLocalOnly(baseURL);

  const email = process.env.E2E_ADMIN_EMAIL?.trim();
  const password = process.env.E2E_ADMIN_PASSWORD?.trim();

  if (!email || !password) {
    throw new Error(
      [
        "[e2e] Missing E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD.",
        "Copy .env.test.local.example → .env.test.local and set local Supabase admin credentials.",
        "E2E never targets production.",
      ].join(" "),
    );
  }

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  // Placeholder so Playwright can resolve storageState path before first write.
  if (!fs.existsSync(AUTH_STATE)) {
    fs.writeFileSync(
      AUTH_STATE,
      JSON.stringify({ cookies: [], origins: [] }),
      "utf8",
    );
  }

  await waitForLocalServer(baseURL);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(`${baseURL}/admin/login`, { waitUntil: "domcontentloaded" });
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /Zaloguj/i }).click();
    await page.waitForURL(/\/admin(\/dashboard)?/, { timeout: 30_000 });
    await page.context().storageState({ path: AUTH_STATE });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      [
        "[e2e] Admin login failed during globalSetup.",
        "Auth is Supabase signInWithPassword via /admin/login (no seed user in repo).",
        `Details: ${message}`,
      ].join(" "),
    );
  } finally {
    await browser.close();
  }
}
