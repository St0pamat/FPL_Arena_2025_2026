import { Suspense } from "react";
import { UczestnicyHub } from "@/components/admin/UczestnicyHub";
import { listClubLogos } from "@/app/admin/actions/clubLogos";
import { getDivisions, getPyramids, getSeasons, getTeams } from "@/app/admin/actions/db";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { Division, Pyramid, Season, Team } from "@/lib/admin/types";

export default async function AdminUczestnicyPage() {
  let divisions: Division[] = [];
  let teams: Team[] = [];
  let seasons: Season[] = [];
  let pyramids: Pyramid[] = [];
  let logos: ClubLogoRecord[] = [];
  let loadError: string | null = null;

  try {
    [divisions, teams, seasons, pyramids, logos] = await Promise.all([
      getDivisions(),
      getTeams(),
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
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#39FF14]">Uczestnicy</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Zarządzanie uczestnikami</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Pełna obsługa drużyn: edycja, usuwanie, zmiana dywizji, import CSV i logo klubów. Po
          aktualizacji dane i cresty pojawiają się w terminarzu oraz listach.
        </p>
      </header>

      {loadError && (
        <p className="mb-6 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {loadError}
        </p>
      )}

      <Suspense
        fallback={<p className="text-sm text-slate-500">Ładowanie panelu uczestników…</p>}
      >
        <UczestnicyHub
          teams={teams}
          divisions={divisions}
          seasons={seasons}
          pyramids={pyramids}
          logos={logos}
        />
      </Suspense>
    </main>
  );
}
