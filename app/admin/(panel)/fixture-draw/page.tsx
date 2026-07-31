import { FixtureDrawMachine } from "@/components/admin/FixtureDrawMachine";
import { listClubLogos } from "@/app/admin/actions/clubLogos";
import { getDivisions, getPyramids, getSeasons } from "@/app/admin/actions/db";
import type { Division, Pyramid, Season } from "@/lib/admin/types";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";

export default async function AdminFixtureDrawPage() {
  let seasons: Season[] = [];
  let pyramids: Pyramid[] = [];
  let divisions: Division[] = [];
  let logos: ClubLogoRecord[] = [];
  let loadError: string | null = null;

  try {
    [seasons, pyramids, divisions, logos] = await Promise.all([
      getSeasons(),
      getPyramids(),
      getDivisions(),
      listClubLogos(),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Nie udało się pobrać danych.";
  }

  return (
    <main className="flex-1 bg-[#0B0F19] p-6 sm:p-8 lg:p-10">
      <header className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#39FF14]">
          Maszyna Losująca
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Terminarz H2H (Berger)</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Wylosuj pozycje startowe i wygeneruj pełny kalendarz mecz + rewanż dla wybranej dywizji.
        </p>
      </header>

      {loadError && (
        <p className="mb-6 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {loadError}
        </p>
      )}

      <FixtureDrawMachine
        seasons={seasons}
        pyramids={pyramids}
        divisions={divisions}
        logos={logos}
      />
    </main>
  );
}
