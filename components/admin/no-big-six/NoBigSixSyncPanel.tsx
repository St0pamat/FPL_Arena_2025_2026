"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { syncNoBigSixGameweek } from "@/lib/no-big-six/actions";

type Props = {
  defaultGw?: number;
};

export function NoBigSixSyncPanel({ defaultGw = 1 }: Props) {
  const [gw, setGw] = useState(defaultGw);
  const [status, setStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleSync = () => {
    if (
      !window.confirm(
        `Pobrać dane z FPL API dla GW${gw}? (600 ms opóźnienia między graczami — rate limit).`,
      )
    ) {
      return;
    }

    setStatus(null);
    setIsError(false);

    startTransition(async () => {
      const result = await syncNoBigSixGameweek(gw);
      setIsError(!result.ok);
      let text = result.message;
      if (result.errors?.length) {
        text += `\n\n${result.errors.slice(0, 5).join("\n")}`;
        if (result.errors.length > 5) {
          text += `\n… i ${result.errors.length - 5} więcej`;
        }
      }
      setStatus(text);
    });
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Kolejka (GW)
          </span>
          <input
            type="number"
            min={1}
            max={38}
            value={gw}
            onChange={(e) => setGw(Number(e.target.value))}
            disabled={pending}
            className="w-28 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500"
          />
        </label>
        <button
          type="button"
          onClick={handleSync}
          disabled={pending || !Number.isFinite(gw) || gw < 1}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 px-5 py-2.5 text-sm font-bold text-amber-500 transition-colors hover:bg-amber-500/20 disabled:opacity-40"
        >
          <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} aria-hidden />
          {pending ? "Synchronizuję…" : "Synchronizuj z FPL"}
        </button>
      </div>

      {status ? (
        <p
          className={`mt-4 whitespace-pre-wrap rounded-xl border px-4 py-3 text-sm ${
            isError
              ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          }`}
          role="status"
        >
          {status}
        </p>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          Opóźnienie 600 ms między graczami — ochrona przed blokadą FPL API. Wymaga
          rekordu w <code className="text-slate-400">no_big_six_config</code>.
        </p>
      )}
    </div>
  );
}
