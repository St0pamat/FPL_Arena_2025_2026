"use client";

import { Lock } from "lucide-react";
import { SeasonSummaryView } from "@/components/na-minusie/hub/SeasonSummaryView";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { PublicSeasonSummaryPayload } from "@/lib/public/types";

/** Zakładka Podsumowanie Sezonu — kłódka lub raport końcowy. */
export function SeasonSummaryPanel({
  summary,
  loading,
  logos,
  seasonInProgress,
}: {
  summary: PublicSeasonSummaryPayload | null;
  loading: boolean;
  logos: ClubLogoRecord[];
  seasonInProgress: boolean;
}) {
  if (loading && !summary) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 text-sm text-slate-500">
        Ładowanie podsumowania sezonu…
      </div>
    );
  }

  const showLocked =
    seasonInProgress && (summary?.locked !== false || !summary?.is_completed);

  if (showLocked) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-16 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-slate-700 bg-slate-950">
          <Lock className="h-7 w-7 text-slate-500" aria-hidden />
        </div>
        <h2 className="font-athletic text-2xl uppercase tracking-wide text-white sm:text-3xl">
          Podsumowanie Sezonu
        </h2>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-400 sm:text-base">
          🔒 Oficjalny raport końcowy z medalistami, awansami i spadkami zostanie
          opublikowany po rozegraniu 19. kolejki i baraży.
        </p>
      </div>
    );
  }

  return <SeasonSummaryView summary={summary} loading={false} logos={logos} />;
}
