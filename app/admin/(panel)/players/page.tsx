import { MasterImportPanel } from "@/components/admin/MasterImportPanel";
import { listClubLogos } from "@/app/admin/actions/clubLogos";
import { listTierLogos } from "@/app/admin/actions/tierLogos";
import {
  getDivisions,
  getPyramids,
  getSeasons,
  getTeams,
} from "@/app/admin/actions/db";
import {
  getDivisionScheduleStats,
  type DivisionScheduleMeta,
} from "@/app/admin/actions/masterImport";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { TierLogoRecord } from "@/lib/admin/tierLogos";
import type { Division, Pyramid, Season, Team } from "@/lib/admin/types";

export default async function AdminPlayersPage() {
  let seasons: Season[] = [];
  let pyramids: Pyramid[] = [];
  let divisions: Division[] = [];
  let teams: Team[] = [];
  let clubLogos: ClubLogoRecord[] = [];
  let tierLogos: TierLogoRecord[] = [];
  let scheduleByDivision: Record<string, DivisionScheduleMeta> = {};
  let loadError: string | null = null;

  try {
    [seasons, pyramids, divisions, teams, clubLogos, tierLogos] = await Promise.all([
      getSeasons(),
      getPyramids(),
      getDivisions(),
      getTeams(),
      listClubLogos(),
      listTierLogos(),
    ]);
    const stats = await getDivisionScheduleStats(divisions.map((d) => d.id));
    scheduleByDivision = Object.fromEntries(stats.map((s) => [s.divisionId, s]));
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Nie udało się pobrać danych.";
  }

  return (
    <main className="flex-1 bg-[#0B0F19] p-6 sm:p-8 lg:p-10">
      <header className="mb-8 max-w-3xl">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#39FF14]">
          Liga · Excel SSOT
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
          Baza Graczy i Dywizji
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Najpierw utwórz sezon w Strukturze, potem Master Import (12 kolumn), herby i terminarz
          Bergera.
        </p>
      </header>

      {loadError ? (
        <p className="mb-6 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {loadError}
        </p>
      ) : (
        <MasterImportPanel
          seasons={seasons}
          pyramids={pyramids}
          divisions={divisions}
          teams={teams}
          clubLogos={clubLogos}
          tierLogos={tierLogos}
          scheduleByDivision={scheduleByDivision}
        />
      )}
    </main>
  );
}
