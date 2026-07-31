import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toPng } from "html-to-image";
import type { Player } from "@arena/types/player";
import type { PlayerHighlights } from "@arena/types/highlights";
import { buildDiplomaContent } from "@arena/features/profiles/lib/diplomaContent";
import { DiplomaDocument } from "@arena/features/profiles/components/DiplomaDocument";

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

async function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        })
    )
  );
}

export const DiplomaGenerator = ({
  player,
  highlights,
}: {
  player: Player;
  highlights: PlayerHighlights | null;
}) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const content = useMemo(
    () => buildDiplomaContent(player, highlights),
    [player, highlights]
  );

  const fileBase = useMemo(
    () => `Dyplom-FPL-Arena-${slugify(player.team) || player.id}`,
    [player.team, player.id]
  );

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const captureDiploma = useCallback(async () => {
    const node = exportRef.current;
    if (!node) throw new Error("Brak dokumentu dyplomu");
    await waitForImages(node);
    return toPng(node, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: "#0a0e17",
    });
  }, []);

  const handleDownload = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await captureDiploma();
      const link = document.createElement("a");
      link.download = `${fileBase}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setError("Nie udało się wygenerować pliku. Spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  }, [captureDiploma, fileBase]);

  const handlePrint = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await captureDiploma();
      const win = window.open("", "_blank");
      if (!win) {
        setError("Przeglądarka zablokowała okno druku. Zezwól na pop-upy.");
        return;
      }
      win.document.write(`
        <!DOCTYPE html>
        <html><head><title>${fileBase}</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          html, body { margin: 0; padding: 0; }
          img { width: 210mm; height: 297mm; display: block; }
        </style></head>
        <body><img src="${dataUrl}" alt="Dyplom" /></body></html>
      `);
      win.document.close();
      win.onload = () => {
        win.focus();
        win.print();
      };
    } catch {
      setError("Nie udało się przygotować wydruku.");
    } finally {
      setBusy(false);
    }
  }, [captureDiploma, fileBase]);

  const modal =
    open &&
    createPortal(
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="diploma-dialog-title"
      >
        <button
          type="button"
          className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
          aria-label="Zamknij podgląd dyplomu"
          onClick={() => setOpen(false)}
        />

        <div className="relative z-10 w-full max-w-5xl max-h-[calc(100vh-2rem)] flex flex-col rounded-2xl border border-slate-700 bg-[#0b0f19] shadow-2xl shadow-black/50 overflow-hidden">
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-800 bg-slate-900/80">
            <div className="min-w-0">
              <h3 id="diploma-dialog-title" className="text-fluid-lg font-bold text-white break-words leading-snug">
                Dyplom — {player.team}
              </h3>
              <p className="text-fluid-sm text-slate-400">
                Format A4 · pobierz PNG lub drukuj bezpośrednio na papierze
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                disabled={busy}
                onClick={handleDownload}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-fluid-sm hover:bg-emerald-400 disabled:opacity-50 transition-colors"
              >
                {busy ? "Generuję…" : "Pobierz PNG (A4)"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 font-semibold text-fluid-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                Drukuj
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 font-semibold text-fluid-sm hover:text-white hover:border-slate-500 transition-colors"
              >
                ✕ Zamknij
              </button>
            </div>
          </div>

          {error && (
            <p className="shrink-0 mx-5 mt-3 text-fluid-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-5 bg-slate-950/40">
            <div className="mx-auto w-fit origin-top scale-[0.38] sm:scale-[0.48] md:scale-[0.55] lg:scale-[0.62] xl:scale-[0.68]">
              <DiplomaDocument player={player} content={content} />
            </div>
          </div>
        </div>

        <div className="fixed left-[-10000px] top-0 pointer-events-none" aria-hidden>
          <div ref={exportRef}>
            <DiplomaDocument player={player} content={content} />
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 text-fluid-sm font-semibold hover:bg-amber-500/20 hover:border-amber-400/60 transition-all shadow-[0_0_20px_rgba(251,191,36,0.12)]"
      >
        <span aria-hidden>🏆</span>
        Wygeneruj dyplom uczestnictwa
      </button>
      {modal}
    </>
  );
};
