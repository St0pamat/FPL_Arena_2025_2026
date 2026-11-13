/**
 * Wspólna blokada e2e: wymaga E2E_READONLY=1.
 * Używane przez scripts/guard-e2e.mjs oraz tests/e2e/global-setup.ts.
 */

export const E2E_READONLY_BLOCK_MESSAGE = [
  "[e2e] ZABLOKOWANE: uruchomienie Playwright wymaga E2E_READONLY=1.",
  "Mamy jedną produkcyjną bazę Supabase — e2e loguje się kontem E2E_ADMIN_*.",
  "Ustaw E2E_READONLY=1 tylko dla konta admin z samym odczytem (bez sync/zapisów/lig).",
  "Przykład: E2E_READONLY=1 npx playwright test",
].join("\n");

/**
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env]
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function assertE2eReadonly(env = process.env) {
  const flag = String(env.E2E_READONLY ?? "").trim();
  if (flag !== "1") {
    return { ok: false, message: E2E_READONLY_BLOCK_MESSAGE };
  }
  return { ok: true };
}
