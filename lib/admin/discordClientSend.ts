/**
 * Client-side Discord webhook POST (CORS).
 * Pliki idą z przeglądarki prosto na Discord — bez limitu payloadu Next/Vercel.
 * Wiele URL-i → równoległy Promise.all (ten sam JSON / te same pliki).
 */

import {
  DISCORD_SERVER_LABELS,
  type DiscordServerTarget,
} from "@/lib/admin/discordWebhooks";

export const DISCORD_MAX_FILES = 10;
export const DISCORD_MAX_FILE_BYTES = 25 * 1024 * 1024;

export type DiscordSendDestination = {
  url: string;
  label: string;
  serverTarget?: DiscordServerTarget;
};

export type DiscordMultiSendResult = {
  destination: DiscordSendDestination;
  ok: boolean;
  error?: string;
};

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

function destinationLabel(dest: DiscordSendDestination): string {
  if (dest.serverTarget) return DISCORD_SERVER_LABELS[dest.serverTarget];
  return dest.label || "Discord";
}

/**
 * Wiąże załączone pliki z embedami przez `attachment://filename`.
 * Dzięki temu Discord wyświetla grafikę **pod** tekstem embeda,
 * a nie jako osobny attachment nad embedem.
 */
function embedFilesInPayload(
  body: Record<string, unknown>,
  files: File[],
): Record<string, unknown> {
  if (!files.length) return body;

  const embeds = Array.isArray(body.embeds) ? [...body.embeds] : [];
  const imageFiles = files.filter((f) =>
    /\.(png|jpe?g|gif|webp)$/i.test(f.name),
  );

  for (const file of imageFiles) {
    const ref = `attachment://${file.name}`;
    const alreadyReferenced = embeds.some(
      (e: Record<string, unknown>) =>
        (e.image as Record<string, unknown>)?.url === ref ||
        (e.thumbnail as Record<string, unknown>)?.url === ref,
    );
    if (alreadyReferenced) continue;

    const lastEmbed = embeds[embeds.length - 1] as
      | Record<string, unknown>
      | undefined;
    if (lastEmbed && !lastEmbed.image) {
      lastEmbed.image = { url: ref };
    } else {
      embeds.push({ image: { url: ref } });
    }
  }

  return { ...body, embeds };
}

function buildPostInit(
  body: Record<string, unknown>,
  files: File[],
): RequestInit {
  if (!files.length) {
    return {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    };
  }
  const enriched = embedFilesInPayload(body, files);
  const form = new FormData();
  form.append("payload_json", JSON.stringify(enriched));
  files.forEach((file, i) => {
    form.append(`files[${i}]`, file, file.name);
  });
  return { method: "POST", body: form };
}

async function postOneWebhook(
  dest: DiscordSendDestination,
  body: Record<string, unknown>,
  files: File[],
): Promise<DiscordMultiSendResult> {
  const url = dest.url.trim();
  if (!url) {
    return {
      destination: dest,
      ok: false,
      error: "Brak skonfigurowanego adresu Webhooka dla tej akcji.",
    };
  }

  try {
    const res = await fetch(url, buildPostInit(body, files));
    if (!res.ok) {
      let parsed: unknown = null;
      const text = await res.text().catch(() => "");
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = { message: text.slice(0, 280) };
      }
      console.error("Full Discord Error:", dest.label, res.status, parsed ?? text);
      return {
        destination: dest,
        ok: false,
        error: formatDiscordReject(res.status, parsed),
      };
    }
    return { destination: dest, ok: true };
  } catch (e) {
    console.error("Full Discord Error:", dest.label, e);
    return {
      destination: dest,
      ok: false,
      error:
        e instanceof Error && e.message.trim()
          ? e.message
          : "Wystąpił nieznany błąd podczas wysyłki.",
    };
  }
}

export function formatDiscordMultiSendToast(
  results: DiscordMultiSendResult[],
): { ok: boolean; message: string } {
  const ok = results.filter((r) => r.ok);
  const fail = results.filter((r) => !r.ok);
  const names = (list: DiscordMultiSendResult[]) =>
    list.map((r) => destinationLabel(r.destination)).join(" i ");

  if (ok.length && !fail.length) {
    return { ok: true, message: `Wysłano na Discord · ${names(ok)}` };
  }
  if (ok.length && fail.length) {
    const failText = fail
      .map((r) => `${destinationLabel(r.destination)}: ${r.error}`)
      .join(" ");
    return {
      ok: false,
      message: `Częściowy sukces: wysłano na ${names(ok)}. Błąd — ${failText}`,
    };
  }
  const failText = fail.map((r) => r.error).filter(Boolean).join(" ");
  return {
    ok: false,
    message: failText || "Nie udało się wysłać na żaden serwer Discord.",
  };
}

function resolveDestinations(input: {
  webhookUrl?: string;
  destinations?: DiscordSendDestination[];
}): DiscordSendDestination[] {
  if (input.destinations?.length) {
    return input.destinations.filter((d) => d.url.trim());
  }
  const single = input.webhookUrl?.trim();
  if (single) return [{ url: single, label: "Discord" }];
  return [];
}

/**
 * POST bezpośrednio na webhook Discord (JSON albo multipart z plikami).
 * `destinations` (lub pojedynczy `webhookUrl`) — przy 2+ URL-ach Promise.all.
 */
export async function postDiscordWebhookFromClient(input: {
  webhookUrl?: string;
  destinations?: DiscordSendDestination[];
  rawJson: string;
  files?: File[];
}): Promise<
  | { ok: true; results: DiscordMultiSendResult[] }
  | { ok: false; error: string; results?: DiscordMultiSendResult[] }
> {
  const destinations = resolveDestinations(input);
  if (!destinations.length) {
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

  const results = await Promise.all(
    destinations.map((dest) => postOneWebhook(dest, normalized.body, files)),
  );

  const toast = formatDiscordMultiSendToast(results);
  if (!toast.ok) {
    return { ok: false, error: toast.message, results };
  }
  return { ok: true, results };
}
