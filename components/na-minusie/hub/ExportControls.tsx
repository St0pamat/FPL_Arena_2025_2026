"use client";

import { useCallback, useState, type RefObject } from "react";
import { toPng } from "html-to-image";
import { Check, Download, Loader2, Send } from "lucide-react";
import { sendImageToDiscord } from "@/app/admin/actions/discord";

const EXPORT_BG = "#0B0F19";

export async function captureExportNode(node: HTMLElement): Promise<string> {
  await toPng(node, {
    quality: 1,
    pixelRatio: 2,
    backgroundColor: EXPORT_BG,
    cacheBust: true,
  });
  return toPng(node, {
    quality: 1,
    pixelRatio: 2,
    backgroundColor: EXPORT_BG,
    cacheBust: true,
    style: { transform: "none" },
  });
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.download = fileName.endsWith(".png") ? fileName : `${fileName}.png`;
  link.href = dataUrl;
  link.click();
}

/**
 * Pobierz PNG + (dla admina) wyślij na webhook Discord dywizji.
 */
export function ExportControls({
  targetRef,
  fileName,
  divisionId,
  discordMessage,
  showDiscordSend = false,
  hasWebhook = false,
  compact = false,
  hideWebhookHint = false,
}: {
  targetRef: RefObject<HTMLElement | null>;
  fileName: string;
  divisionId: string;
  discordMessage: string;
  /** Tylko zalogowany admin widzi „Wyślij na Discord” */
  showDiscordSend?: boolean;
  hasWebhook?: boolean;
  /** Mniejsze przyciski w jednym rzędzie (Centrum Kolejki) */
  compact?: boolean;
  hideWebhookHint?: boolean;
}) {
  const [dlBusy, setDlBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [dlDone, setDlDone] = useState(false);
  const [sendDone, setSendDone] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const onDownload = useCallback(async () => {
    const node = targetRef.current;
    if (!node || dlBusy) return;
    setDlBusy(true);
    setDlDone(false);
    try {
      const dataUrl = await captureExportNode(node);
      downloadDataUrl(dataUrl, fileName);
      setDlDone(true);
      window.setTimeout(() => setDlDone(false), 2000);
    } catch (err) {
      console.error("[ExportControls] download", err);
      window.alert("Nie udało się wygenerować PNG.");
    } finally {
      setDlBusy(false);
    }
  }, [dlBusy, fileName, targetRef]);

  const onSend = useCallback(async () => {
    const node = targetRef.current;
    if (!node || sendBusy || !divisionId) return;
    setSendBusy(true);
    setSendDone(false);
    setSendError(null);
    try {
      const dataUrl = await captureExportNode(node);
      const result = await sendImageToDiscord(
        dataUrl,
        divisionId,
        discordMessage,
        fileName,
      );
      if (result.error) {
        setSendError(result.error);
        return;
      }
      setSendDone(true);
      window.setTimeout(() => setSendDone(false), 2500);
    } catch (err) {
      console.error("[ExportControls] send", err);
      setSendError("Błąd wysyłki na Discord.");
    } finally {
      setSendBusy(false);
    }
  }, [discordMessage, divisionId, fileName, sendBusy, targetRef]);

  const iconClass = compact ? "h-3 w-3" : "h-3.5 w-3.5";
  const btnBase = compact
    ? "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wide transition disabled:opacity-50"
    : "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black uppercase tracking-wider transition disabled:opacity-50";

  return (
    <div className={compact ? "min-w-0" : "space-y-2"}>
      <div className={`flex items-center ${compact ? "flex-nowrap gap-1" : "flex-wrap gap-2"}`}>
        <button
          type="button"
          onClick={onDownload}
          disabled={dlBusy || sendBusy}
          className={`${btnBase} border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20`}
        >
          {dlBusy ? (
            <Loader2 className={`${iconClass} animate-spin`} />
          ) : dlDone ? (
            <Check className={iconClass} />
          ) : (
            <Download className={iconClass} />
          )}
          {dlBusy ? "…" : dlDone ? "OK" : compact ? "PNG" : "Pobierz PNG"}
        </button>

        {showDiscordSend ? (
          <button
            type="button"
            onClick={onSend}
            disabled={sendBusy || dlBusy || !hasWebhook}
            title={
              hasWebhook
                ? "Wyślij grafikę na kanał Discord tej dywizji"
                : "Brak webhooka — ustaw w panelu Struktura Ligi"
            }
            className={`${btnBase} border border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {sendBusy ? (
              <Loader2 className={`${iconClass} animate-spin`} />
            ) : sendDone ? (
              <Check className={iconClass} />
            ) : (
              <Send className={iconClass} />
            )}
            {sendBusy ? "…" : sendDone ? "OK" : compact ? "Discord" : "Wyślij na Discord"}
          </button>
        ) : null}
      </div>
      {sendError ? (
        <p className="mt-1 text-[10px] text-rose-300" role="alert">
          {sendError}
        </p>
      ) : null}
      {!hideWebhookHint && showDiscordSend && !hasWebhook ? (
        <p className="mt-1 text-[10px] text-amber-400/80">
          Ustaw Discord Webhook URL dla tej dywizji w adminie → Struktura Ligi.
        </p>
      ) : null}
    </div>
  );
}
