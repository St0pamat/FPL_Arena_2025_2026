"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { bulkImportPlayers } from "@/app/admin/actions/db";

/**
 * Masowy import z wklejki Excela/Sheets (tab-separated) do puli graczy.
 */
export function BulkPlayerImport({
  triggerClassName,
}: {
  triggerClassName?: string;
} = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  async function onImport() {
    if (!raw.trim() || pending) return;
    setPending(true);
    setToast(null);
    try {
      const result = await bulkImportPlayers(raw);
      if (result.error) {
        const details = result.skipped?.length
          ? `\n\n${result.skipped.slice(0, 10).join("\n")}`
          : "";
        setToast({ type: "err", text: result.error + details });
        window.alert(result.error);
        return;
      }
      const ok =
        result.success ?? `Pomyślnie zaimportowano ${result.imported ?? 0} graczy.`;
      setToast({ type: "ok", text: ok });
      window.alert(
        result.skipped?.length
          ? `${ok}\n\nSzczegóły:\n${result.skipped.slice(0, 15).join("\n")}`
          : ok,
      );
      setRaw("");
      setOpen(false);
      router.refresh();
    } catch (e) {
      const text = e instanceof Error ? e.message : "Błąd importu.";
      setToast({ type: "err", text });
      window.alert(text);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setToast(null);
          setOpen(true);
        }}
        className={
          triggerClassName ??
          "inline-flex items-center gap-2 rounded-xl border border-[#39FF14]/40 bg-[#39FF14]/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#39FF14] transition-colors hover:bg-[#39FF14]/20 disabled:opacity-40"
        }
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        Zaimportuj z Excela
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-import-title"
            className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-2xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#39FF14]/10">
                  <FileSpreadsheet className="h-5 w-5 text-[#39FF14]" />
                </div>
                <div>
                  <h3 id="bulk-import-title" className="font-bold text-white">
                    Masowy Import Graczy
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Skopiuj wiersze z Excela / Google Sheets (separator: tab). Upsert po Discord
                    Name — nowi trafiają do puli (bez dywizji), status: aktywny.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-40"
                aria-label="Zamknij"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-2 font-mono text-[11px] text-slate-500">
              FPL Team {"\\t"} FPL Manager {"\\t"} FPL ID {"\\t"} OR {"\\t"} Discord Name {"\\t"}{" "}
              Discord Club
            </p>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              disabled={pending}
              rows={14}
              className="min-h-[220px] w-full flex-1 rounded-xl border border-slate-700 bg-slate-900 p-3 font-mono text-xs text-white outline-none focus:border-[#39FF14] disabled:opacity-60"
              placeholder={`FC Example\tJan Kowalski\t123456\t50000\tst0pa.\tArsenal\nAnother FC\tAnna Nowak\t789012\t120000\tbaldwiniasty\tDerby County`}
            />

            {toast ? (
              <p
                className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
                  toast.type === "ok"
                    ? "border-[#39FF14]/30 bg-[#39FF14]/10 text-[#39FF14]"
                    : "border-red-500/30 bg-red-950/40 text-red-300"
                }`}
                role="alert"
              >
                {toast.text}
              </p>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold uppercase text-slate-400 disabled:opacity-40"
              >
                Anuluj
              </button>
              <button
                type="button"
                disabled={pending || !raw.trim()}
                onClick={() => void onImport()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#39FF14] px-4 py-2 text-xs font-black uppercase text-black disabled:opacity-40"
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importuję…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Zaimportuj
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
