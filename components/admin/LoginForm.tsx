"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDetails(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        console.error("[LoginForm] auth error:", signInError);
        setError(signInError.message);
        setDetails(JSON.stringify(signInError, null, 2));
        return;
      }

      // Pełne przejście — unika wiszącego spinnera przy redirect/middleware.
      window.location.assign("/admin/dashboard");
    } catch (err) {
      console.error("[LoginForm] exception:", err);
      if (err instanceof Error) {
        const cause =
          err.cause instanceof Error
            ? `${err.cause.name}: ${err.cause.message}`
            : err.cause
              ? String(err.cause)
              : null;
        setError(err.message);
        setDetails([cause, err.stack].filter(Boolean).join("\n\n"));
      } else {
        setError("Unknown error");
        setDetails(JSON.stringify(err));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#888]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          className="admin-input"
          placeholder="admin@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#888]">
          Hasło
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          className="admin-input"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div
          className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-300"
          role="alert"
        >
          <p className="text-center font-medium">{error}</p>
          {details && (
            <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-all text-left text-[11px] text-red-200/80">
              {details}
            </pre>
          )}
        </div>
      )}

      <button type="submit" disabled={loading} className="admin-btn-primary">
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Logowanie...
          </span>
        ) : (
          "Zaloguj"
        )}
      </button>
    </form>
  );
}
