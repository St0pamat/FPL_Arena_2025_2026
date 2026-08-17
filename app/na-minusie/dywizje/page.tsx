import type { Metadata } from "next";
import { DivisionStructureView } from "@/components/na-minusie/hub/DivisionStructureView";
import { getPublicClubLogos, getPublicTierLogos } from "@/lib/public/actions";
import { getPublicDivisionsFromBaza } from "@/lib/public/getAvailableClubs";
import { NA_MINUSIE_BRAND } from "@/lib/na-minusie";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { TierLogoRecord } from "@/lib/admin/tierLogos";
import type { PublicSeasonDivisionStructurePayload } from "@/lib/public/types";

export const metadata: Metadata = {
  title: `Dywizje — ${NA_MINUSIE_BRAND}`,
  description:
    "Oficjalny, zamknięty podział uczestników Na Minusie ™ na dywizje w sezonie 2026/27.",
};

/** Jak „Grają z Nami” — odświeżanie z CSV co ~60s (revalidate w fetch). */
export const revalidate = 60;

export default async function DywizjePage() {
  let data: PublicSeasonDivisionStructurePayload = {
    seasonId: "",
    seasonName: "",
    divisions: [],
    updatedAt: null,
    isPreview: true,
  };
  let logos: ClubLogoRecord[] = [];
  let tierLogos: TierLogoRecord[] = [];

  try {
    const [preview, clubLogos, tier] = await Promise.all([
      getPublicDivisionsFromBaza(),
      getPublicClubLogos(),
      getPublicTierLogos(),
    ]);
    data = preview;
    logos = clubLogos;
    tierLogos = tier;
  } catch (e) {
    data = {
      ...data,
      error: e instanceof Error ? e.message : "Nie udało się wczytać dywizji.",
    };
  }

  return (
    <main className="relative min-h-screen bg-[#0B0F19] font-sans text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(56,189,248,0.06),_transparent_45%)]"
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <DivisionStructureView
          data={data}
          logos={logos}
          tierLogos={tierLogos}
          linkToProfile
        />
      </div>
    </main>
  );
}
