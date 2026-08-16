/**
 * Lokalny Windows (antivirus / SSL inspection) psuje Node fetch do Supabase
 * i Google Sheets — UNABLE_TO_VERIFY_LEAF_SIGNATURE.
 * W development wyłączamy weryfikację certyfikatów na poziomie procesu Node.
 * (Middleware Edge i tak unika getUser — patrz middleware.ts)
 */
export async function register() {
  if (process.env.NODE_ENV === "development") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
}
