import { GwResultsWorkspace } from "@/components/admin/GwResultsWorkspace";
import { listClubLogos } from "@/app/admin/actions/clubLogos";
import { getPyramids, getSeasons } from "@/app/admin/actions/db";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { Pyramid, Season } from "@/lib/admin/types";

export default async function AdminGwResultsPage() {
  let seasons: Season[] = [];
  let pyramids: Pyramid[] = [];
  let logos: ClubLogoRecord[] = [];
  let loadError: string | null = null;

  try {
    [seasons, pyramids, logos] = await Promise.all([
      getSeasons(),
      getPyramids(),
      listClubLogos(),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Nie udało się pobrać danych.";
  }

  return (
    <main className="flex-1 bg-[#0B0F19] p-6 sm:p-8 lg:p-10">
      <header className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#39FF14]">
          Faza 6 · Batch Processor
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Kalkulator kolejki</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Rozliczaj wiele Gameweeków naraz, potem sprawdzaj wyniki meczów oraz tabele GW i ogólną
          w wybranej dywizji.
        </p>
      </header>

      {loadError && (
        <p className="mb-6 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {loadError}
        </p>
      )}

      <GwResultsWorkspace seasons={seasons} pyramids={pyramids} logos={logos} />
    </main>
  );
}
