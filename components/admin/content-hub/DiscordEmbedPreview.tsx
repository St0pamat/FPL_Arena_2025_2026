"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";

type DiscordEmbedField = {
  name?: string;
  value?: string;
  inline?: boolean;
};

type DiscordEmbed = {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  author?: { name?: string; url?: string; icon_url?: string };
  footer?: { text?: string; icon_url?: string };
  thumbnail?: { url?: string };
  image?: { url?: string };
  fields?: DiscordEmbedField[];
  timestamp?: string;
};

export type DiscordWebhookParsed = {
  content?: string;
  embeds: DiscordEmbed[];
};

type ParseOutcome =
  | { status: "empty" }
  | { status: "invalid"; message: string }
  | { status: "ok"; data: DiscordWebhookParsed };

/**
 * Bezpieczne parsowanie payloadu Discord webhook (content + embeds).
 * Nie rzuca — zawsze zwraca outcome.
 */
export function parseDiscordWebhookJson(raw: string): ParseOutcome {
  const trimmed = raw.trim();
  if (!trimmed) return { status: "empty" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { status: "invalid", message: "⚠️ Nieprawidłowy format JSON" };
  }

  try {
    if (Array.isArray(parsed)) {
      if (!parsed.length) {
        return { status: "invalid", message: "⚠️ Nieprawidłowy format JSON" };
      }
      return { status: "ok", data: { embeds: parsed as DiscordEmbed[] } };
    }

    if (!parsed || typeof parsed !== "object") {
      return { status: "invalid", message: "⚠️ Nieprawidłowy format JSON" };
    }

    const obj = parsed as Record<string, unknown>;
    const content =
      typeof obj.content === "string"
        ? obj.content
        : obj.content == null
          ? undefined
          : String(obj.content);

    let embeds: DiscordEmbed[] = [];
    if (Array.isArray(obj.embeds)) {
      embeds = obj.embeds.filter(
        (e): e is DiscordEmbed => e != null && typeof e === "object",
      );
    } else if (
      "title" in obj ||
      "description" in obj ||
      "fields" in obj ||
      "author" in obj ||
      "color" in obj ||
      "footer" in obj
    ) {
      // Pojedynczy obiekt embed (bez wrappera)
      const { content: _c, embeds: _e, ...rest } = obj;
      embeds = [rest as DiscordEmbed];
    }

    if (!content && embeds.length === 0) {
      return { status: "invalid", message: "⚠️ Nieprawidłowy format JSON" };
    }

    return {
      status: "ok",
      data: {
        content: content || undefined,
        embeds,
      },
    };
  } catch {
    return { status: "invalid", message: "⚠️ Nieprawidłowy format JSON" };
  }
}

function colorToCss(color: number | undefined): string {
  if (color == null || !Number.isFinite(Number(color))) return "#5865F2";
  const hex = Math.max(0, Math.floor(Number(color)))
    .toString(16)
    .padStart(6, "0")
    .slice(-6);
  return `#${hex}`;
}

function EmbedCard({ embed }: { embed: DiscordEmbed }) {
  const border = colorToCss(embed.color);
  const fields = embed.fields ?? [];
  const inlineFields = fields.filter((f) => f.inline);
  const blockFields = fields.filter((f) => !f.inline);

  return (
    <div
      className="overflow-hidden rounded-md bg-[#2B2D31]"
      style={{ borderLeftWidth: 4, borderLeftStyle: "solid", borderLeftColor: border }}
    >
      <div className="p-3 sm:p-4">
        {embed.author?.name ? (
          <div className="mb-2 flex items-center gap-2">
            {embed.author.icon_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={embed.author.icon_url}
                alt=""
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : null}
            {embed.author.url ? (
              <a
                href={embed.author.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-white hover:underline"
              >
                {embed.author.name}
              </a>
            ) : (
              <span className="text-sm font-semibold text-white">{embed.author.name}</span>
            )}
          </div>
        ) : null}

        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            {embed.title ? (
              embed.url ? (
                <a
                  href={embed.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-bold text-[#00a8fc] hover:underline"
                >
                  {embed.title}
                </a>
              ) : (
                <p className="text-base font-bold text-[#00a8fc]">{embed.title}</p>
              )
            ) : null}

            {embed.description ? (
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#dbdee1]">
                {embed.description}
              </p>
            ) : null}

            {inlineFields.length > 0 ? (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {inlineFields.map((field, i) => (
                  <div key={`inline-${i}`} className="min-w-0">
                    <p className="text-xs font-bold text-white">{field.name || "\u200b"}</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-[#dbdee1]">
                      {field.value || "\u200b"}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {blockFields.length > 0 ? (
              <div className="mt-3 space-y-2">
                {blockFields.map((field, i) => (
                  <div key={`block-${i}`}>
                    <p className="text-xs font-bold text-white">{field.name || "\u200b"}</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-[#dbdee1]">
                      {field.value || "\u200b"}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {embed.image?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={embed.image.url}
                alt=""
                className="mt-3 max-h-72 w-full rounded-md object-cover"
              />
            ) : null}

            {embed.footer?.text || embed.timestamp ? (
              <div className="mt-3 flex items-center gap-2 text-[10px] text-[#949ba4]">
                {embed.footer?.icon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={embed.footer.icon_url}
                    alt=""
                    className="h-4 w-4 rounded-full object-cover"
                  />
                ) : null}
                <span className="text-[10px]">
                  {[embed.footer?.text, embed.timestamp].filter(Boolean).join(" · ")}
                </span>
              </div>
            ) : null}
          </div>

          {embed.thumbnail?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={embed.thumbnail.url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-md object-cover"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/60 bg-[#313338] px-6 py-10 text-center">
      <MessageCircle className="mb-3 h-10 w-10 text-[#5865F2]" strokeWidth={1.5} />
      <p className="max-w-xs text-sm font-medium leading-relaxed text-slate-400">
        Wklej kod JSON od Gemini, aby zobaczyć podgląd wiadomości.
      </p>
    </div>
  );
}

function MessagePreview({ data }: { data: DiscordWebhookParsed }) {
  const firstEmbed = data.embeds[0];

  return (
    <div className="space-y-3 rounded-xl bg-[#313338] p-4 shadow-inner shadow-black/40">
      <div className="mb-1 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5865F2] text-xs font-black text-white">
          NM
        </div>
        <div>
          <p className="text-sm font-semibold text-white">
            Na Minusie{" "}
            <span className="ml-1 rounded bg-[#5865F2]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#949cf7]">
              BOT
            </span>
          </p>
          <p className="text-[10px] text-[#949ba4]">Live Preview · webhook</p>
        </div>
      </div>

      {/* content = pingi / tekst NAD embedem */}
      {data.content ? (
        <p className="mb-3 whitespace-pre-wrap text-sm text-slate-200">{data.content}</p>
      ) : null}

      {firstEmbed ? <EmbedCard embed={firstEmbed} /> : null}

      {!data.content && !firstEmbed ? (
        <p className="text-xs text-slate-500">Payload bez content i embeds.</p>
      ) : null}
    </div>
  );
}

/**
 * Live Preview webhooka Discord.
 * - Puste pole → empty state
 * - Błąd JSON → zachowaj ostatni poprawny podgląd + callback błędu (pod textarea)
 * - OK → content nad embeds[0]
 */
export function DiscordEmbedPreview({
  rawJson,
  onParseError,
}: {
  rawJson: string;
  /** null = OK / puste; string = komunikat pod textarea */
  onParseError?: (message: string | null) => void;
}) {
  const outcome = useMemo(() => parseDiscordWebhookJson(rawJson), [rawJson]);
  const [sticky, setSticky] = useState<DiscordWebhookParsed | null>(null);
  const lastOk = useRef<DiscordWebhookParsed | null>(null);

  useEffect(() => {
    if (outcome.status === "ok") {
      lastOk.current = outcome.data;
      setSticky(outcome.data);
      onParseError?.(null);
      return;
    }
    if (outcome.status === "empty") {
      lastOk.current = null;
      setSticky(null);
      onParseError?.(null);
      return;
    }
    // invalid — nie czyść sticky / lastOk
    onParseError?.(outcome.message);
  }, [outcome, onParseError]);

  if (outcome.status === "empty") {
    return <EmptyPreview />;
  }

  const data = outcome.status === "ok" ? outcome.data : sticky ?? lastOk.current;

  if (!data) {
    return <EmptyPreview />;
  }

  return <MessagePreview data={data} />;
}
