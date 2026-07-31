import { Image } from "lucide-react";
import { listClubLogos } from "@/app/admin/actions/clubLogos";
import { ClubLogoManager } from "@/components/admin/ClubLogoManager";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { getMarketingClubNames } from "@/lib/public/getAvailableClubs";

export const dynamic = "force-dynamic";

export default async function AdminLogosPage() {
  let logos: ClubLogoRecord[] = [];
  let marketingClubs: string[] = [];

  try {
    [logos, marketingClubs] = await Promise.all([listClubLogos(), getMarketingClubNames()]);
  } catch (e) {
    console.error("[AdminLogosPage]", e);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#39FF14]">
          <Image className="h-3.5 w-3.5" />
          Branding
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Logotypy Klubów</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Przypisz herby do klubów z bazy uczestników oraz z listy przykładowych dostępnych (kolumna S
          arkusza LIVE VIEW). Te same logo pojawiają się na stronie reklamowej.
        </p>
      </header>

      <ClubLogoManager logos={logos} marketingClubs={marketingClubs} />
    </div>
  );
}
