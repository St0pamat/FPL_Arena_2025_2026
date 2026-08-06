"use client";

import { TrendingUp } from "lucide-react";
import { GameweekStatsViewer } from "@/components/strefa-gracza/GameweekStatsViewer";
import { H2HComparator } from "@/components/strefa-gracza/H2HComparator";
import { PantheonGrid } from "@/components/strefa-gracza/PantheonGrid";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { EMPTY_SEASON_STATS, type SeasonStatsPayload } from "@/lib/public/seasonStats";

export function SeasonStatsPanel({
  stats = EMPTY_SEASON_STATS,
  logos,
  seasonName,
  divisionName,
  divisionKey,
}: {
  stats?: SeasonStatsPayload;
  logos: ClubLogoRecord[];
  seasonName?: string;
  divisionName?: string;
  divisionKey?: string;
}) {
  if (!stats.hasPlayedFixtures) {
    return (
      <div className="space-y-6">
        <StatsHeader seasonName={seasonName} divisionName={divisionName} />
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-6 py-12 text-center backdrop-blur-sm">
          <TrendingUp className="mx-auto mb-3 h-8 w-8 text-slate-600" aria-hidden />
          <p className="text-lg font-bold text-slate-300">Sezon się rozgrzewa</p>
          <p className="mt-2 text-sm text-slate-500">
            Rekordy, przegląd kolejek i porównywarka pojawią się po pierwszych meczach
            {divisionName ? ` w ${divisionName}` : ""}.
          </p>
        </div>
      </div>
    );
  }

  const firstGw = stats.finishedGameweeks[0];
  const lastGw = stats.finishedGameweeks[stats.finishedGameweeks.length - 1];
  const gwBadge =
    firstGw != null && lastGw != null
      ? firstGw === lastGw
        ? `GW ${firstGw}`
        : `GW ${firstGw} – GW ${lastGw}`
      : null;

  return (
    <div className="space-y-10 sm:space-y-12">
      <StatsHeader
        seasonName={seasonName}
        divisionName={divisionName}
        gwBadge={gwBadge}
      />

      <section aria-labelledby="rekordy-heading" className="space-y-3 sm:space-y-4">
        <h3
          id="rekordy-heading"
          className="font-athletic text-lg uppercase tracking-wide text-white sm:text-xl"
        >
          🔥 Rekordy Dywizji
        </h3>
        <PantheonGrid cards={stats.pantheon} logos={logos} />
      </section>

      <GameweekStatsViewer
        archive={stats.gameweekArchive}
        logos={logos}
        defaultGw={lastGw}
      />

      <H2HComparator
        key={divisionKey}
        teamFplTotals={stats.teamFplTotals}
        fixtures={stats.fixtures}
        logos={logos}
      />
    </div>
  );
}

function StatsHeader({
  seasonName,
  divisionName,
  gwBadge,
}: {
  seasonName?: string;
  divisionName?: string;
  gwBadge?: string | null;
}) {
  const contextParts = [divisionName, seasonName].filter(Boolean);

  return (
    <header className="relative">
      {gwBadge ? (
        <span className="absolute right-0 top-0 rounded-md border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {gwBadge}
        </span>
      ) : null}
      <h2 className="font-athletic text-2xl uppercase tracking-wide text-white sm:text-3xl">
        📊 Statystyki Sezonu
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm text-slate-400">
        Kluczowe rekordy i podsumowanie wyników w trwającym sezonie.
      </p>
      {contextParts.length > 0 ? (
        <p className="mt-2 text-xs font-semibold text-slate-300">
          {contextParts.join(" · ")}
        </p>
      ) : null}
    </header>
  );
}
