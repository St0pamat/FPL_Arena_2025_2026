/**
 * Lokalny Windows (antivirus / SSL inspection) często psuje fetch do Google Sheets.
 * Uruchamia next dev z wyłączoną weryfikacją certyfikatów TLS.
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { spawn } from "node:child_process";

const child = spawn("npx", ["next", "dev"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
