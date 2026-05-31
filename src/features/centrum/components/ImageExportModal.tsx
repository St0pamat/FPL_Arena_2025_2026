import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toPng } from "html-to-image";

async function waitForImages(root: HTMLElement) {
  await Promise.all(
    Array.from(root.querySelectorAll("img")).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        })
    )
  );
}

async function flushLayout() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export const ImageExportModal = ({
  open,
  onClose,
  title,
  subtitle,
  fileBase,
  preview,
  exportNode,
  exportWidth,
  exportHeight,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  fileBase: string;
  preview: ReactNode;
  exportNode: ReactNode;
  exportWidth: number;
  exportHeight: number;
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const capture = useCallback(async () => {
    const node = exportRef.current;
    if (!node) throw new Error("Brak dokumentu");
    await flushLayout();
    await waitForImages(node);
    await flushLayout();
    return toPng(node, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#0a0e17",
      width: exportWidth,
      height: exportHeight,
      canvasWidth: exportWidth * 2,
      canvasHeight: exportHeight * 2,
    });
  }, [exportWidth, exportHeight]);

  const handleDownload = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await capture();
      const link = document.createElement("a");
      link.download = `${fileBase}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setError("Nie udało się wygenerować pliku.");
    } finally {
      setBusy(false);
    }
  }, [capture, fileBase]);

  if (!open) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
        <button type="button" className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" aria-label="Zamknij" onClick={onClose} />
        <div className="relative z-10 w-full max-w-4xl max-h-[calc(100vh-2rem)] flex flex-col rounded-2xl border border-slate-700 bg-[#0b0f19] shadow-2xl overflow-hidden">
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-800">
            <div>
              <h3 className="text-fluid-lg font-bold text-white">{title}</h3>
              <p className="text-fluid-sm text-slate-400">{subtitle}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={handleDownload}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-fluid-sm hover:bg-emerald-400 disabled:opacity-50"
              >
                {busy ? "Generuję…" : "Pobierz PNG"}
              </button>
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
          </div>
          {error && <p className="mx-5 mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2">{error}</p>}
          <div className="flex-1 overflow-auto p-5 bg-slate-950/40 flex justify-center">{preview}</div>
        </div>
      </div>
      {/* W viewport (niewidoczny) — pozycja -10000px daje czarny PNG w Chrome/Edge */}
      <div
        aria-hidden
        className="pointer-events-none"
        style={{ position: "fixed", left: 0, top: 0, opacity: 0, zIndex: 99999, pointerEvents: "none" }}
      >
        <div ref={exportRef}>{exportNode}</div>
      </div>
    </>,
    document.body
  );
};
