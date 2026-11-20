"use client";

import { Loader2 } from "lucide-react";
import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import { t } from "@/lib/stats-lab/i18n";

/**
 * Gdy wykres już jest na ekranie, odświeżenie nie zasłania go napisem.
 * Zostaje sam dyskretny wskaźnik w rogu.
 */
export function StudioPendingCue({
  pending,
  hasResult,
  lang,
  isLight,
}: {
  pending: boolean;
  hasResult: boolean;
  lang: StatsLabLang;
  isLight: boolean;
}) {
  if (!pending) return null;
  const label = hasResult
    ? t(lang).recalculating
    : lang === "pl"
      ? "Ładuję dane…"
      : "Loading data…";
  return (
    <div
      className="absolute inset-0 z-30 flex flex-col justify-center gap-3 px-6"
      data-testid="studio-pending-cue"
      role="status"
      aria-label={label}
    >
      <div className={`absolute inset-0 ${isLight ? "bg-white/80" : "bg-slate-950/75"}`} />
      <p className={`relative text-sm font-bold ${isLight ? "text-slate-900" : "text-slate-100"}`}>
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />
        {label}
      </p>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`relative h-8 animate-pulse rounded-xl ${isLight ? "bg-slate-200" : "bg-slate-800"}`}
          style={{ width: `${88 - i * 8}%` }}
        />
      ))}
    </div>
  );
}
