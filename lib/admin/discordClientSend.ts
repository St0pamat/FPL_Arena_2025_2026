/**
 * Client-side Discord webhook POST (CORS).
 * Pliki idą z przeglądarki prosto na Discord — bez limitu payloadu Next/Vercel.
 */

export const DISCORD_MAX_FILES = 10;
export const DISCORD_MAX_FILE_BYTES = 25 * 1024 * 1024;

export function normalizeDiscordWebhookPayload(
  rawJson: string,
): { ok: true; body: Record<string, unknown> } | { ok: false; error: string } {
  if (!rawJson.trim()) return { ok: false, error: "Wklej kod JSON dla Discorda." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { ok: false, error: "Niepoprawny JSON — popraw składnię przed wysyłką." };
  }

  if (Array.isArray(parsed)) {
    return { ok: true, body: { embeds: parsed } };
  }
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.embeds) || typeof obj.content === "string") {
      return { ok: true, body: obj };
    }
    if ("title" in obj || "description" in obj || "fields" in obj) {
      return { ok: true, body: { embeds: [obj] } };
    }
    return {
      ok: false,
      error:
        "JSON musi zawierać `embeds` / `content`, tablicę embedów albo pojedynczy obiekt embed.",
    };
  }
  return { ok: false, error: "JSON musi być obiektem lub tablicą embedów." };
}

export async function dataUrlToFile(
  dataUrl: string,
  fileName: string,
): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const safeName = /\.[a-z0-9]{2,5}$/i.test(fileName)
    ? fileName
    : `${fileName}.png`;
  return new File([blob], safeName, {
    type: blob.type || "image/png",
  });
}

function formatDiscordReject(status: number, body: unknown): string {
  const obj =
    body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const discordMsg = String(obj?.message ?? "").trim();

  if (status === 413 || /too large|payload/i.test(discordMsg)) {
    return "Discord odrzucił wysyłkę: plik jest za duży (limit webhooka to 25 MB).";
  }
  if (status === 401 || status === 404) {
    return "Brak skonfigurowanego lub nieprawidłowy adres Webhooka. Ustaw w adminie → Webhooki Discord.";
  }
  if (discordMsg) return `Discord odrzucił wysyłkę (${status}): ${discordMsg}`;
  return `Discord odrzucił wysyłkę (${status}). Sprawdź JSON / webhook / limity.`;
}

/** POST bezpośrednio na webhook Discord (JSON albo multipart z plikami). */
export async function postDiscordWebhookFromClient(input: {
  webhookUrl: string;
  rawJson: string;
  files?: File[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = input.webhookUrl.trim();
  if (!url) {
    return {
      ok: false,
      error: "Brak skonfigurowanego adresu Webhooka dla tej akcji.",
    };
  }

  const normalized = normalizeDiscordWebhookPayload(input.rawJson);
  if (!normalized.ok) return { ok: false, error: normalized.error };

  const files = input.files ?? [];
  if (files.length > DISCORD_MAX_FILES) {
    return {
      ok: false,
      error: `Discord przyjmuje max ${DISCORD_MAX_FILES} plików (masz ${files.length}).`,
    };
  }

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  if (totalBytes > DISCORD_MAX_FILE_BYTES) {
    const mb = (totalBytes / (1024 * 1024)).toFixed(1);
    return {
      ok: false,
      error: `Plik jest za duży (${mb} MB). Limit webhooka Discord to 25 MB.`,
    };
  }

  try {
    let res: Response;
    if (!files.length) {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized.body),
      });
    } else {
      const form = new FormData();
      form.append("payload_json", JSON.stringify(normalized.body));
      files.forEach((file, i) => {
        form.append(`files[${i}]`, file, file.name);
      });
      res = await fetch(url, {
        method: "POST",
        body: form,
      });
    }

    if (!res.ok) {
      let parsed: unknown = null;
      const text = await res.text().catch(() => "");
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = { message: text.slice(0, 280) };
      }
      console.error("Full Discord Error:", res.status, parsed ?? text);
      return { ok: false, error: formatDiscordReject(res.status, parsed) };
    }

    return { ok: true };
  } catch (e) {
    console.error("Full Discord Error:", e);
    return {
      ok: false,
      error:
        e instanceof Error && e.message.trim()
          ? e.message
          : "Wystąpił nieznany błąd podczas wysyłki.",
    };
  }
}
