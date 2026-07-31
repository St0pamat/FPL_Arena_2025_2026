"use server";

import { createClient } from "@/lib/supabase/server";

export interface DiscordSendResult {
  error: string | null;
  success?: string;
}

/**
 * Wysyła PNG (data URL / base64) na webhook Discord przypisany do dywizji.
 * Wymaga zalogowanego admina.
 */
export async function sendImageToDiscord(
  base64Image: string,
  divisionId: string,
  message: string,
  fileName = "na-minusie.png",
): Promise<DiscordSendResult> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Brak sesji. Zaloguj się jako admin." };
    }

    if (!divisionId) return { error: "Brak ID dywizji." };
    if (!base64Image?.trim()) return { error: "Brak obrazu do wysłania." };

    const { data: division, error } = await supabase
      .from("divisions")
      .select("id, name, discord_webhook_url")
      .eq("id", divisionId)
      .maybeSingle();

    if (error) {
      console.error("[sendImageToDiscord]", error);
      return { error: error.message };
    }
    if (!division) return { error: "Nie znaleziono dywizji." };

    const webhook = (division.discord_webhook_url ?? "").trim();
    if (!webhook) {
      return {
        error: "Brak skonfigurowanego webhooka dla tej dywizji.",
      };
    }

    let payload = base64Image.trim();
    const comma = payload.indexOf(",");
    if (payload.startsWith("data:") && comma !== -1) {
      payload = payload.slice(comma + 1);
    }

    const buffer = Buffer.from(payload, "base64");
    if (!buffer.length) {
      return { error: "Nie udało się odczytać obrazu PNG." };
    }

    const safeName = fileName.endsWith(".png") ? fileName : `${fileName}.png`;
    const blob = new Blob([buffer], { type: "image/png" });

    const form = new FormData();
    form.append("file", blob, safeName);
    const content = (message || "").trim().slice(0, 1900);
    if (content) {
      form.append("content", content);
    }

    const res = await fetch(webhook, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[sendImageToDiscord] webhook", res.status, text);
      return {
        error: `Discord odrzucił wysyłkę (${res.status}). Sprawdź webhook.`,
      };
    }

    return {
      error: null,
      success: `Wysłano na Discord · ${division.name}`,
    };
  } catch (e) {
    console.error("[sendImageToDiscord]", e);
    return {
      error: e instanceof Error ? e.message : "Nieznany błąd wysyłki Discord.",
    };
  }
}
