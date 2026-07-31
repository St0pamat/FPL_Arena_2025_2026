"use client";

import { useRef, useState, useTransition } from "react";
import { Calculator, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import {
  calculateGameweeksBatch,
  type BatchCalculateResult,
} from "@/app/admin/actions/fixtures";
import type { Pyramid, Season } from "@/lib/admin/types";

const selectClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-[#39FF14] disabled:opacity-50";

const EXAMPLE = `1, 7212, 85
1, 90441, 62
1, 22952, 71
2, 7212, 44
2, 90441, 58`;

export function GwResultsBatchPanel({
  seasons,
  pyramids,
  seasonId: controlledSeason,
  pyramidId: controlledPyramid,
  onSeasonChange,
  onPyramidChange,
  onSettledSuccess,
}: {
  seasons: Season[];
  pyramids: Pyramid[];
  seasonId?: string;
  pyramidId?: string;
  onSeasonChange?: (id: string) => void;
  onPyramidChange?: (id: string) => void;
  onSettledSuccess?: () => void;
}) {
  const [localSeason, setLocalSeason] = useState("");
  const [localPyramid, setLocalPyramid] = useState("");
  const seasonId = controlledSeason ?? localSeason;
  const pyramidId = controlledPyramid ?? localPyramid;
  const setSeasonId = onSeasonChange ?? setLocalSeason;
  const setPyramidId = onPyramidChange ?? setLocalPyramid;
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<BatchCalculateResult | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function onCsvFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setRaw(text);
      setResult(null);
    };
    reader.readAsText(file, "UTF-8");
  }

  function runBatch() {
    setResult(null);
    startTransition(async () => {
      const r = await calculateGameweeksBatch(seasonId, pyramidId, raw);
      setResult(r);
      if (!r.error) onSettledSuccess?.();
    });
  }

  function clearAll() {
    setRaw("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const canRun = Boolean(seasonId && pyramidId && raw.trim()) && !pending;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 sm:p-8">
        <div className="mb-6 flex items-start gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#39FF14]/10">
            <Calculator className="h-5 w-5 text-[#39FF14]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Batch Processor — Mediana 2+1</h2>
            <p className="mt-1 text-sm text-slate-400">
              Wklej wyniki z wielu kolejek naraz. Format linii:{" "}
              <code className="text-[#39FF14]">GW, FPL_ID, Punkty</code>. Algorytm rozda H2H (2/1/0),
              policzy medianę w każdej dywizji (+1) i oznaczy mecze jako zakończone.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Sezon
            </label>
            <select
              value={seasonId}
              onChange={(e) => {
                setSeasonId(e.target.value);
                setResult(null);
              }}
              className={selectClass}
              disabled={pending}
            >
              <option value="">Wybierz sezon…</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status === "PUBLISHED" ? "Opublikowany" : "Szkic"})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Piramida
            </label>
            <select
              value={pyramidId}
              onChange={(e) => {
                setPyramidId(e.target.value);
                setResult(null);
              }}
              className={selectClass}
              disabled={pending}
            >
              <option value="">Wybierz piramidę…</option>
              {pyramids.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Dane wejściowe (wiele GW)
            </label>
            <button
              type="button"
              onClick={() => {
                setRaw(EXAMPLE);
                setResult(null);
              }}
              className="text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-[#39FF14]"
            >
              Wstaw przykład
            </button>
          </div>
          <textarea
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setResult(null);
            }}
            rows={14}
            disabled={pending}
            spellCheck={false}
            placeholder={"1, 7212, 85\n1, 90441, 62\n2, 7212, 44\n…"}
            className="w-full resize-y rounded-2xl border border-slate-700/50 bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#39FF14]"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-slate-300 hover:border-[#39FF14]/40 hover:text-[#39FF14]">
            <Upload className="h-4 w-4" />
            Wczytaj CSV / TXT do pola
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="sr-only"
              disabled={pending}
              onChange={(e) => onCsvFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Plik tylko wypełnia textarea — rozliczenie robi przycisk poniżej.
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!canRun}
            onClick={runBatch}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#39FF14] px-6 py-3.5 text-sm font-black uppercase tracking-wider text-black transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Liczenie Mediana 2+1…
              </>
            ) : (
              <>
                <Calculator className="h-5 w-5" />
                Rozlicz Kolejki (Mediana 2+1)
              </>
            )}
          </button>
          <button
            type="button"
            disabled={pending || (!raw && !result)}
            onClick={clearAll}
            className="rounded-xl border border-slate-600 px-5 py-3.5 text-sm font-bold text-slate-300 hover:bg-slate-900 disabled:opacity-40"
          >
            Wyczyść pole
          </button>
        </div>
      </section>

      {result && (
        <section
          className={`rounded-2xl border px-5 py-4 text-sm ${
            result.error
              ? "border-red-500/40 bg-red-950/30 text-red-200"
              : "border-[#39FF14]/40 bg-[#39FF14]/10 text-[#39FF14]"
          }`}
          role="status"
        >
          {result.error ? (
            <pre className="whitespace-pre-wrap font-sans leading-relaxed">{result.error}</pre>
          ) : (
            <div className="space-y-2">
              <p className="text-base font-bold">{result.success}</p>
              {result.fixturesUpdated != null && (
                <p className="text-sm text-[#39FF14]/80">
                  Mecze: {result.fixturesUpdated}
                  {result.gameweeks?.length
                    ? ` · GW: ${result.gameweeks.join(", ")}`
                    : ""}
                </p>
              )}
              <button
                type="button"
                onClick={clearAll}
                className="mt-2 text-xs font-bold uppercase tracking-wider text-white/80 underline hover:text-white"
              >
                Wyczyść i rozlicz kolejne dane
              </button>
            </div>
          )}
          {result.warnings?.length ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-amber-200/90">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
        </section>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 px-5 py-4 text-xs leading-relaxed text-slate-500">
        <p className="font-bold uppercase tracking-wider text-slate-400">Jak liczymy</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>Przypisanie małych punktów FPL do meczów (home/away).</li>
          <li>H2H: wyższa FPL → 2 pkt, niższa 0; remis → po 1.</li>
          <li>
            Mediana w każdej dywizji osobno: próg = 5. wynik malejąco; wszyscy z FPL ≥ próg dostają
            +1.
          </li>
          <li>Tylko mecze z <code className="text-slate-400">is_finished = false</code>.</li>
        </ol>
      </section>
    </div>
  );
}
