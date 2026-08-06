"use client";

import { Lock } from "lucide-react";
import { BentoHighlights } from "@/components/strefa-gracza/BentoHighlights";
import { SeasonSummaryView } from "@/components/na-minusie/hub/SeasonSummaryView";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { HighlightCard } from "@/lib/public/playerZoneTypes";
import type { PublicSeasonSummaryPayload } from "@/lib/public/types";

export function SeasonSummaryRecordsPanel({
  highlights,
  logos,
  hasPlayedFixtures,
  summary,
  summaryLoading,
  seasonInProgress,
}: {
  highlights: HighlightCard[];
  logos: ClubLogoRecord[];
  hasPlayedFixtures: boolean;
  summary: PublicSeasonSummaryPayload | null;
  summaryLoading: boolean;
  /** Aktywny sezon jeszcze trwa (nie zakończony). */
  seasonInProgress: boolean;
}) {
  const showLockedReport =
    seasonInProgress && (summary?.locked !== false || !summary?.is_completed);

  return (
    <div className="space-y-12">
      <section aria-labelledby="hof-heading">
        <header className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-sky-400">
            Live · po każdej kolejce
          </p>
          <h2
            id="hof-heading"
            className="font-athletic mt-1 text-2xl uppercase tracking-wide text-white sm:text-3xl"
          >
            🔥 Hall of Fame &amp; Shame
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Rekordy chlubne i niechlubne wyliczane dynamicznie z opublikowanych wyników H2H.
          </p>
        </header>
        <BentoHighlights
          highlights={highlights}
          logos={logos}
          hasPlayedFixtures={hasPlayedFixtures}
        />
      </section>

      <section aria-labelledby="report-heading" className="border-t border-slate-800 pt-10">
        <header className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-400">
            Raport sezonowy
          </p>
          <h2
            id="report-heading"
            className="font-athletic mt-1 text-2xl uppercase tracking-wide text-white sm:text-3xl"
          >
            🏆 Podsumowanie ligi
          </h2>
        </header>

        {summaryLoading && !summary ? (
          <div className="flex min-h-[24vh] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 text-sm text-slate-500">
            Ładowanie raportu…
          </div>
        ) : showLockedReport ? (
          <div className="flex min-h-[28vh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-14 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-slate-700 bg-slate-950">
              <Lock className="h-6 w-6 text-slate-500" aria-hidden />
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
              🔒 Oficjalny raport końcowy z medalistami, awansami i spadkami zostanie
              opublikowany po rozegraniu 19. kolejki i baraży.
            </p>
          </div>
        ) : (
          <SeasonSummaryView summary={summary} loading={false} logos={logos} embedded />
        )}
      </section>
    </div>
  );
}
