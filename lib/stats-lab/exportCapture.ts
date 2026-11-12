/**
 * Capture PNG / JPEG Stats Lab (html-to-image) — wzorowane na ExportControls Content Hub.
 */

import { toBlob, toJpeg, toPng } from "html-to-image";

/** Plakat social-first (X.com / Discord) — ~4:5 przy 6–10 graczach. */
export const STATS_LAB_EXPORT_WIDTH = 1120;
export const STATS_LAB_EXPORT_BG = "#070B14";
/** 1120 × 2.5 = 2800px fizycznie — ostre na Retina, duże glify w kadrze. */
export const STATS_LAB_EXPORT_PIXEL_RATIO = 2.5;

const CAPTURE_ROOT_STYLE: Record<string, string> = {
  transform: "none",
  overflow: "hidden",
  overflowX: "hidden",
  overflowY: "hidden",
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

async function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
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

function replaceBrokenImages(root: HTMLElement): () => void {
  const restores: Array<() => void> = [];
  for (const img of Array.from(root.querySelectorAll("img"))) {
    const broken =
      !img.complete || img.naturalWidth === 0 || img.naturalHeight === 0;
    if (!broken) continue;
    const parent = img.parentNode;
    if (!parent) continue;
    const placeholder = document.createElement("span");
    placeholder.setAttribute("aria-hidden", "true");
    placeholder.style.display = "inline-block";
    placeholder.style.width = `${Math.max(img.offsetWidth, 48)}px`;
    placeholder.style.height = `${Math.max(img.offsetHeight, 48)}px`;
    parent.replaceChild(placeholder, img);
    restores.push(() => {
      if (placeholder.parentNode === parent) parent.replaceChild(img, placeholder);
    });
  }
  return () => {
    for (const restore of restores) restore();
  };
}

function lockOverflowForCapture(root: HTMLElement): () => void {
  const snapshots: Array<{
    el: HTMLElement;
    overflow: string;
    overflowX: string;
    overflowY: string;
    scrollbarWidth: string;
    msOverflowStyle: string;
  }> = [];
  const rootBox = {
    width: root.style.width,
    minWidth: root.style.minWidth,
    maxWidth: root.style.maxWidth,
  };
  const fullWidth = Math.max(
    root.scrollWidth,
    root.offsetWidth,
    STATS_LAB_EXPORT_WIDTH,
  );
  root.style.width = `${fullWidth}px`;
  root.style.minWidth = `${fullWidth}px`;
  root.style.maxWidth = "none";

  const elements: HTMLElement[] = [
    root,
    ...Array.from(root.querySelectorAll<HTMLElement>("*")),
  ];
  for (const el of elements) {
    const cs = window.getComputedStyle(el);
    const scrolls =
      cs.overflowX === "auto" ||
      cs.overflowX === "scroll" ||
      cs.overflowY === "auto" ||
      cs.overflowY === "scroll" ||
      el.classList.contains("overflow-x-auto") ||
      el.classList.contains("overflow-y-auto") ||
      el.classList.contains("overflow-auto");
    if (!scrolls && el !== root) continue;
    snapshots.push({
      el,
      overflow: el.style.overflow,
      overflowX: el.style.overflowX,
      overflowY: el.style.overflowY,
      scrollbarWidth: el.style.scrollbarWidth,
      msOverflowStyle: (el.style as CSSStyleDeclaration & { msOverflowStyle?: string })
        .msOverflowStyle as string,
    });
    el.style.overflow = "hidden";
    el.style.overflowX = "hidden";
    el.style.overflowY = "hidden";
    el.style.scrollbarWidth = "none";
    (el.style as CSSStyleDeclaration & { msOverflowStyle?: string }).msOverflowStyle =
      "none";
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
      (
        s.el.style as CSSStyleDeclaration & { msOverflowStyle?: string }
      ).msOverflowStyle = s.msOverflowStyle;
    }
  };
}

export type StatsLabCaptureOptions = {
  backgroundColor?: string;
  pixelRatio?: number;
};

export async function captureStatsLabPngDataUrl(
  node: HTMLElement,
  options: StatsLabCaptureOptions = {},
): Promise<string> {
  await waitForImages(node);
  const restoreImages = replaceBrokenImages(node);
  const restoreOverflow = lockOverflowForCapture(node);
  try {
    const opts = {
      quality: 1 as const,
      pixelRatio: options.pixelRatio ?? STATS_LAB_EXPORT_PIXEL_RATIO,
      backgroundColor: options.backgroundColor ?? STATS_LAB_EXPORT_BG,
      cacheBust: true,
      style: CAPTURE_ROOT_STYLE,
    };
    // Warm-up pass (jak w Content Hub) — stabilizuje fonty / layout
    await toPng(node, opts);
    return await toPng(node, opts);
  } finally {
    restoreOverflow();
    restoreImages();
  }
}

export async function captureStatsLabPngBlob(
  node: HTMLElement,
  options: StatsLabCaptureOptions = {},
): Promise<Blob> {
  const dataUrl = await captureStatsLabPngDataUrl(node, options);
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  if (!blob || blob.size < 32) {
    // Fallback bezpośredni toBlob
    await waitForImages(node);
    const restoreImages = replaceBrokenImages(node);
    const restoreOverflow = lockOverflowForCapture(node);
    try {
      const direct = await toBlob(node, {
        quality: 1,
        pixelRatio: options.pixelRatio ?? STATS_LAB_EXPORT_PIXEL_RATIO,
        backgroundColor: options.backgroundColor ?? STATS_LAB_EXPORT_BG,
        cacheBust: true,
        style: CAPTURE_ROOT_STYLE,
      });
      if (!direct) throw new Error("Nie udało się wygenerować PNG (pusty blob).");
      return direct;
    } finally {
      restoreOverflow();
      restoreImages();
    }
  }
  return blob;
}

export async function captureStatsLabJpegDataUrl(
  node: HTMLElement,
  options: StatsLabCaptureOptions = {},
): Promise<string> {
  await waitForImages(node);
  const restoreImages = replaceBrokenImages(node);
  const restoreOverflow = lockOverflowForCapture(node);
  try {
    const opts = {
      quality: 0.95,
      pixelRatio: options.pixelRatio ?? 2,
      backgroundColor: options.backgroundColor ?? STATS_LAB_EXPORT_BG,
      cacheBust: true,
      style: CAPTURE_ROOT_STYLE,
    };
    await toJpeg(node, opts);
    return await toJpeg(node, opts);
  } finally {
    restoreOverflow();
    restoreImages();
  }
}

export async function captureStatsLabJpegBlob(
  node: HTMLElement,
  options: StatsLabCaptureOptions = {},
): Promise<Blob> {
  const dataUrl = await captureStatsLabJpegDataUrl(node, options);
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  if (!blob || blob.size < 32) {
    throw new Error("Nie udało się wygenerować JPG (pusty blob).");
  }
  return blob;
}

export function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  const hasExt = /\.(png|jpe?g|webp)$/i.test(fileName);
  link.download = hasExt ? fileName : `${fileName}.png`;
  link.href = dataUrl;
  link.click();
}

export async function copyPngBlobToClipboard(blob: Blob): Promise<void> {
  if (
    typeof ClipboardItem === "undefined" ||
    !navigator.clipboard ||
    typeof navigator.clipboard.write !== "function"
  ) {
    throw new Error(
      "Schowek systemowy nie obsługuje obrazów w tej przeglądarce.",
    );
  }
  await navigator.clipboard.write([
    new ClipboardItem({ "image/png": blob }),
  ]);
}
