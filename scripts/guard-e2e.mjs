/**
 * Blokada uruchamiania Playwright e2e przeciw produkcyjnej bazie Supabase.
 * Wymaga jawnego E2E_READONLY=1 (konto tylko do odczytu).
 * Nie uruchamia Playwrighta — tylko waliduje env i kończy proces.
 */
import { assertE2eReadonly } from "./assert-e2e-readonly.mjs";

const check = assertE2eReadonly(process.env);
if (!check.ok) {
  console.error(check.message);
  process.exit(1);
}

console.log(
  "[e2e] E2E_READONLY=1 OK — kontynuuję Playwright (lokalny localhost only).",
);
