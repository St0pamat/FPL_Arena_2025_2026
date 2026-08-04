import { SeasonSimulatorPanel } from "@/components/admin/SeasonSimulatorPanel";
import { getDivisions, getSeasons, getTeams } from "@/app/admin/actions/db";
import type { Division, Season, Team } from "@/lib/admin/types";

export default async function SimulatorPage() {
  let seasons: Season[] = [];
  let divisions: Division[] = [];
  let teams: Team[] = [];
  let loadError: string | null = null;

  try {
    [seasons, divisions, teams] = await Promise.all([
      getSeasons(),
      getDivisions(),
      getTeams(),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Nie udało się pobrać danych.";
  }

  const playerCountByDivision: Record<string, number> = {};
  for (const t of teams) {
    if (!t.division_id || t.is_active === false) continue;
    playerCountByDivision[t.division_id] =
      (playerCountByDivision[t.division_id] ?? 0) + 1;
  }

  return (
    <main className="flex-1 bg-[#0B0F19] p-6 sm:p-8 lg:p-10">
      <header className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#39FF14]">
          Symulacje · Sandbox
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Symulator Sezonu</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Tylko pełne dywizje (10/10). Wyniki lądują w brudnopisie (
          <code className="mx-1 text-[#39FF14]/80">is_published = false</code>
          ), potem publikujesz wybrany zakres.
        </p>
      </header>

      {loadError ? (
        <p className="mb-6 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {loadError}
        </p>
      ) : (
        <SeasonSimulatorPanel
          seasons={seasons}
          divisions={divisions}
          playerCountByDivision={playerCountByDivision}
        />
      )}
    </main>
  );
}
