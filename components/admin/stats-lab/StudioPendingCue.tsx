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
  if (!pending || !hasResult) return null;
  return (
    <div
      className="pointer-events-none absolute right-3 top-3 z-30"
      data-testid="studio-pending-cue"
    >
      <span
        role="status"
        aria-label={t(lang).recalculating}
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
          isLight ? "bg-emerald-700/80 text-white" : "bg-slate-950/80 text-emerald-300"
        }`}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      </span>
    </div>
  );
}
