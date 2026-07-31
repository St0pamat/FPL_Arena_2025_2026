import { DivisionManager } from "@/components/admin/DivisionManager";
import { PyramidSection } from "@/components/admin/PyramidSection";
import { SeasonSection } from "@/components/admin/SeasonSection";
import { getDivisions, getPyramids, getSeasons } from "@/app/admin/actions/db";
import type { Division, Pyramid, Season } from "@/lib/admin/types";

export default async function AdminStrukturaPage() {
  let pyramids: Pyramid[] = [];
  let seasons: Season[] = [];
  let divisions: Division[] = [];
  let loadError: string | null = null;

  try {
    [pyramids, seasons, divisions] = await Promise.all([
      getPyramids(),
      getSeasons(),
      getDivisions(),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Nie udało się pobrać danych.";
  }

  return (
    <main className="flex-1 bg-[#0B0F19] p-6 sm:p-8 lg:p-10">
      <header className="mb-10">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#39FF14]">
          Struktura Ligi
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Architektura sezonu</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Komplet w jednym miejscu: piramidy (regiony) → sezony (Szkic/Publikacja) → dywizje (tier
          w sezonie × piramidzie). Potem przejdź do Uczestników i Maszyny Losującej.
        </p>
      </header>

      {loadError && (
        <p className="mb-6 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {loadError}
        </p>
      )}

      <div className="space-y-12">
        <div className="grid gap-10 xl:grid-cols-2">
          <PyramidSection pyramids={pyramids} />
          <SeasonSection seasons={seasons} />
        </div>

        <section id="dywizje" className="scroll-mt-8">
          <DivisionManager divisions={divisions} seasons={seasons} pyramids={pyramids} />
        </section>
      </div>
    </main>
  );
}
