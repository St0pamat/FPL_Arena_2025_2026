import { GameweekWorkspace } from "@/components/admin/GameweekWorkspace";
import { getDivisions, getSeasons } from "@/app/admin/actions/db";
import type { Division, Season } from "@/lib/admin/types";

export default async function AdminWorkspacePage() {
  let seasons: Season[] = [];
  let divisions: Division[] = [];
  let loadError: string | null = null;

  try {
    [seasons, divisions] = await Promise.all([getSeasons(), getDivisions()]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Nie udało się pobrać danych.";
  }

  return (
    <main className="flex-1 bg-[#0B0F19] p-6 sm:p-8 lg:p-10">
      <header className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#39FF14]">
          Rozgrywki · Workspace
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Edytor Kolejek</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Brudnopis kolejki (MODUŁ 3): jeden import FPL dla wszystkich dywizji (GW + Team +
          Manager + Punkty), H2H + Mediana 2+1, ręczna korekta i publikacja całej kolejki.
        </p>
      </header>

      {loadError ? (
        <p className="mb-6 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {loadError}
        </p>
      ) : (
        <GameweekWorkspace seasons={seasons} divisions={divisions} />
      )}
    </main>
  );
}
