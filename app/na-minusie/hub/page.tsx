import type { Metadata } from "next";
import { HubShell } from "@/components/na-minusie/hub/HubShell";
import { HubUnderConstruction } from "@/components/na-minusie/hub/HubUnderConstruction";
import { getPublicClubLogos, getPublicStructure } from "@/lib/public/actions";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { PublicStructure } from "@/lib/public/types";
import { NA_MINUSIE_BRAND } from "@/lib/na-minusie";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: `Strefa Gracza — ${NA_MINUSIE_BRAND}`,
  description:
    "Tabele ligowe, wyniki H2H, progi Mediany 2+1 i herby klubów — centrum aktywnego gracza Na Minusie ™.",
};

export const dynamic = "force-dynamic";

export default async function PublicHubPage() {
  let isAdmin = false;

  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    isAdmin = Boolean(auth.user);
  } catch {
    isAdmin = false;
  }

  if (!isAdmin) {
    return (
      <main className="relative min-h-screen bg-[#0B0F19] font-sans text-slate-100">
        <HubUnderConstruction />
      </main>
    );
  }

  let structure: PublicStructure = { seasons: [], pyramids: [], divisions: [] };
  let logos: ClubLogoRecord[] = [];
  let loadError: string | null = null;

  try {
    const [structureResult, logosResult] = await Promise.all([
      getPublicStructure(),
      getPublicClubLogos(),
    ]);
    structure = structureResult;
    logos = logosResult;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Nie udało się wczytać danych huba.";
  }

  return (
    <main className="relative min-h-screen bg-[#0B0F19] font-sans text-slate-100">
      <div
        className="sticky top-16 z-40 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center backdrop-blur-md sm:top-[4.5rem]"
        role="status"
      >
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
          [ TRYB ADMINA: Podgląd WIP ]
        </p>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(56,189,248,0.06),_transparent_45%)]"
      />
      <div className="relative z-10">
        {loadError ? (
          <div className="mx-auto max-w-3xl px-4 py-16">
            <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
              {loadError}
            </p>
          </div>
        ) : null}
        <HubShell structure={structure} logos={logos} isAdmin />
      </div>
    </main>
  );
}
