"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error: string | null;
  details?: string | null;
}

function serializeUnknownError(e: unknown): LoginState {
  if (e instanceof Error) {
    const cause =
      e.cause instanceof Error
        ? `${e.cause.name}: ${e.cause.message}`
        : e.cause
          ? JSON.stringify(e.cause)
          : null;

    console.error("[loginAction] exception:", e.message, cause, e.stack);

    return {
      error: e.message,
      details: [cause, e.stack].filter(Boolean).join("\n\n") || null,
    };
  }

  console.error("[loginAction] unknown exception:", e);
  return {
    error: "Unknown error",
    details: typeof e === "string" ? e : JSON.stringify(e),
  };
}

/**
 * Zapasowa Server Action (diagnostyka). Preferowane logowanie jest po stronie klienta
 * w LoginForm — unika „fetch failed” typowego dla SSR → Supabase w Next.js 14.
 */
export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Podaj email i hasło." };
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error("[loginAction] supabase auth error:", error);
      return {
        error: error.message,
        details: JSON.stringify(error, null, 2),
      };
    }

    revalidatePath("/", "layout");
    redirect("/admin/dashboard");
  } catch (e) {
    // Next.js redirect() rzuca wyjątek — przepuszczamy go dalej
    if (
      e &&
      typeof e === "object" &&
      "digest" in e &&
      typeof (e as { digest?: string }).digest === "string" &&
      (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw e;
    }

    return serializeUnknownError(e);
  }
}
