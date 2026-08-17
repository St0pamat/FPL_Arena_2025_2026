"use client";

import { useCallback, useState, type RefObject } from "react";
import { toPng } from "html-to-image";
import { Check, Download, Loader2, Send } from "lucide-react";
import { sendImageToDiscord } from "@/app/admin/actions/discord";

const EXPORT_BG = "#0B0F19";

const CAPTURE_ROOT_STYLE: Record<string, string> = {
  transform: "none",
  overflow: "hidden",
  overflowX: "hidden",
  overflowY: "hidden",
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

type OverflowSnapshot = {
  el: HTMLElement;
  overflow: string;
  overflowX: string;
  overflowY: string;
  scrollbarWidth: string;
  msOverflowStyle: string;
};

async function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              const done = () => resolve();
              img.addEventListener("load", done, { once: true });
              img.addEventListener("error", done, { once: true });
            }),
    ),
  );
}

/**
 * html-to-image rzuca przy 404 (np. brak stoke.png w Championship).
 * Na czas capture zamieniamy uszkodzone <img> na puste placeholdery.
 */
function replaceBrokenImages(root: HTMLElement): () => void {
  const restores: Array<() => void> = [];

  for (const img of Array.from(root.querySelectorAll("img"))) {
    const broken = !img.complete || img.naturalWidth === 0 || img.naturalHeight === 0;
    if (!broken) continue;

    const parent = img.parentNode;
    if (!parent) continue;

    const placeholder = document.createElement("span");
    placeholder.setAttribute("aria-hidden", "true");
    placeholder.style.display = "inline-block";
    placeholder.style.width = `${Math.max(img.offsetWidth, 32)}px`;
    placeholder.style.height = `${Math.max(img.offsetHeight, 32)}px`;
    placeholder.style.flexShrink = "0";

    parent.replaceChild(placeholder, img);
    restores.push(() => {
      if (placeholder.parentNode === parent) {
        parent.replaceChild(img, placeholder);
      }
    });
  }

  return () => {
    for (const restore of restores) restore();
  };
}

/**
 * html-to-image kopiuje widoczne scrollbary z overflow-auto/x-auto.
 * Na czas capture: rozszerz root do pełnej szerokości treści + ukryj overflow/scrollbary w poddrzewie.
 */
function lockOverflowForCapture(root: HTMLElement): () => void {
  const snapshots: OverflowSnapshot[] = [];
  const rootBox = {
    width: root.style.width,
    minWidth: root.style.minWidth,
    maxWidth: root.style.maxWidth,
  };

  const fullWidth = Math.max(root.scrollWidth, root.offsetWidth, 1200);
  root.style.width = `${fullWidth}px`;
  root.style.minWidth = `${fullWidth}px`;
  root.style.maxWidth = "none";

  const elements: HTMLElement[] = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];

  for (const el of elements) {
    const cs = window.getComputedStyle(el);
    const ox = cs.overflowX;
    const oy = cs.overflowY;
    const scrolls =
      ox === "auto" ||
      ox === "scroll" ||
      ox === "overlay" ||
      oy === "auto" ||
      oy === "scroll" ||
      oy === "overlay" ||
      el.classList.contains("overflow-x-auto") ||
      el.classList.contains("overflow-y-auto") ||
      el.classList.contains("overflow-auto") ||
      el.classList.contains("overflow-scroll");

    if (!scrolls && el !== root) continue;

    snapshots.push({
      el,
      overflow: el.style.overflow,
      overflowX: el.style.overflowX,
      overflowY: el.style.overflowY,
      scrollbarWidth: el.style.scrollbarWidth,
      msOverflowStyle: el.style.msOverflowStyle,
    });
    el.style.overflow = "hidden";
    el.style.overflowX = "hidden";
    el.style.overflowY = "hidden";
    el.style.scrollbarWidth = "none";
    el.style.msOverflowStyle = "none";
  }

  return () => {
    root.style.width = rootBox.width;
    root.style.minWidth = rootBox.minWidth;
    root.style.maxWidth = rootBox.maxWidth;
    for (const s of snapshots) {
      s.el.style.overflow = s.overflow;
      s.el.style.overflowX = s.overflowX;
      s.el.style.overflowY = s.overflowY;
      s.el.style.scrollbarWidth = s.scrollbarWidth;
      s.el.style.msOverflowStyle = s.msOverflowStyle;
    }
  };
}

export async function captureExportNode(
  node: HTMLElement,
  backgroundColor: string = EXPORT_BG,
): Promise<string> {
  await waitForImages(node);
  const restoreImages = replaceBrokenImages(node);
  const restoreOverflow = lockOverflowForCapture(node);
  try {
    const options = {
      quality: 1 as const,
      pixelRatio: 2,
      backgroundColor,
      cacheBust: true,
      style: CAPTURE_ROOT_STYLE,
    };
    await toPng(node, options);
    return await toPng(node, options);
  } finally {
    restoreOverflow();
    restoreImages();
  }
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
                : "Brak webhooka — ustaw w adminie → Webhooki Discord"
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
          Ustaw Discord Webhook URL dla tej dywizji w adminie → Webhooki Discord (Level = tier).
        </p>
      ) : null}
    </div>
  );
}
