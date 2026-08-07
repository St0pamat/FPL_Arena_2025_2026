import { ContentHubClient } from "@/components/admin/content-hub/ContentHubClient";
import {
  getContentHubDivisions,
  getContentHubPlayedGameweeks,
  getContentHubSeasons,
  type ContentHubDivisionOption,
  type ContentHubSeasonOption,
} from "@/app/admin/actions/contentHub";
import { listClubLogos } from "@/app/admin/actions/clubLogos";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";

export const dynamic = "force-dynamic";

export default async function AdminContentHubPage() {
  let divisions: ContentHubDivisionOption[] = [];
  let seasons: ContentHubSeasonOption[] = [];
  let playedGameweeks: number[] = [];
  let clubLogos: ClubLogoRecord[] = [];
  let loadError: string | null = null;

  try {
    [divisions, seasons, clubLogos] = await Promise.all([
      getContentHubDivisions(),
      getContentHubSeasons(),
      listClubLogos(),
    ]);
    playedGameweeks = await getContentHubPlayedGameweeks(divisions.map((d) => d.id));
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Nie udało się pobrać danych.";
  }

  return (
    <main className="flex-1 bg-[#0B0F19] p-6 sm:p-8 lg:p-10">
      <header className="mb-8 max-w-3xl">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#39FF14]">
          Content Hub · Dystrybucja
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
          Centrum Dystrybucji Treści
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Dywizje H2H (X.com + opcjonalne PNG), The FA Ranking (JSON + karuzela PNG po 10
          graczy) oraz FA Cup (tylko JSON embed).
        </p>
      </header>

      {loadError ? (
        <p className="mb-6 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {loadError}
        </p>
      ) : (
        <ContentHubClient
          divisions={divisions}
          seasons={seasons}
          playedGameweeks={playedGameweeks}
          clubLogos={clubLogos}
        />
      )}
    </main>
  );
}
