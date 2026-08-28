"use client";

import { Check, Copy, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { DiscordEmbedPreview } from "@/components/admin/content-hub/DiscordEmbedPreview";
import type { ContentHubCapturePayload, ContentHubDivisionOption } from "@/app/admin/actions/contentHub";

const X_LIMIT = 280;

const textareaClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-950 px-4 py-3 font-mono text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-[#39FF14]";

export type ContentHubDivisionEditorProps = {
  division: ContentHubDivisionOption;
  gameweek: number;
  isPreview: boolean;
  isSummary: boolean;
  xDraft: string;
  discordJson: string;
  capture: ContentHubCapturePayload | null;
  captureLoading: boolean;
  xGenPending: boolean;
  discordGenPending: boolean;
  defaultOpen?: boolean;
  onXChange: (value: string) => void;
  onDiscordChange: (value: string) => void;
  onGenerateX: () => void;
  onGenerateDiscord: () => void;
};

export function ContentHubDivisionEditor({
  division,
  gameweek,
  isPreview,
  isSummary,
  xDraft,
  discordJson,
  capture,
  captureLoading,
  xGenPending,
  discordGenPending,
  defaultOpen = true,
  onXChange,
  onDiscordChange,
  onGenerateX,
  onGenerateDiscord,
}: ContentHubDivisionEditorProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const xLen = xDraft.length;
  const xOver = xLen > X_LIMIT;

  async function onCopyX() {
    if (!xDraft.trim()) return;
    try {
      await navigator.clipboard.writeText(xDraft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="group rounded-2xl border border-slate-700/50 bg-slate-900/60"
    >
      <summary className="cursor-pointer list-none px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              D{division.tier} · {division.pyramidName}
            </p>
            <h3 className="text-base font-bold text-white">{division.name}</h3>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {captureLoading ? (
              <span className="inline-flex items-center gap-1 text-amber-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Grafiki…
              </span>
            ) : capture ? (
              <span className="text-emerald-400">Grafiki OK</span>
            ) : (
              <span className="text-slate-600">Brak capture</span>
            )}
            <span className="text-slate-600 group-open:rotate-180">▼</span>
          </div>
        </div>
      </summary>

      <div className="space-y-5 border-t border-slate-800 px-5 pb-5 pt-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Szkic X.com
            </p>
            <button
              type="button"
              disabled={xGenPending}
              onClick={onGenerateX}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600/60 bg-slate-950 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-200 hover:bg-slate-800 disabled:opacity-40"
            >
              {xGenPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              Generuj X
            </button>
          </div>
          <textarea
            className={`${textareaClass} min-h-[120px]`}
            value={xDraft}
            onChange={(e) => onXChange(e.target.value)}
            spellCheck={false}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p
              className={`text-xs font-semibold tabular-nums ${
                xOver ? "text-rose-500" : "text-slate-500"
              }`}
            >
              {xLen} / {X_LIMIT}
            </p>
            <button
              type="button"
              disabled={!xDraft.trim()}
              onClick={onCopyX}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:bg-slate-800 disabled:opacity-40"
            >
              {copied ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              Kopiuj
            </button>
          </div>
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Discord JSON · GW{gameweek}
            </p>
            <button
              type="button"
              disabled={discordGenPending}
              onClick={onGenerateDiscord}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider disabled:opacity-40 ${
                isPreview
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {discordGenPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {isPreview ? "Generuj zapowiedź" : "Generuj podsumowanie"}
            </button>
          </div>
          <textarea
            className={`${textareaClass} min-h-[200px]`}
            value={discordJson}
            onChange={(e) => onDiscordChange(e.target.value)}
            spellCheck={false}
          />
          {jsonError ? (
            <p className="mt-2 text-xs font-semibold text-rose-500">{jsonError}</p>
          ) : null}
          <div className="mt-4 rounded-xl border border-slate-700/40 bg-slate-950/50 p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Podgląd embed
            </p>
            <DiscordEmbedPreview
              rawJson={discordJson}
              onParseError={setJsonError}
            />
          </div>
        </div>
      </div>
    </details>
  );
}
