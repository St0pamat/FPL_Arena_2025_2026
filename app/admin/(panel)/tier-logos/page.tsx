import { Layers } from "lucide-react";
import { listTierLogos } from "@/app/admin/actions/tierLogos";
import { TierLogoManager } from "@/components/admin/TierLogoManager";
import type { TierLogoRecord } from "@/lib/admin/tierLogos";

export const dynamic = "force-dynamic";

export default async function AdminTierLogosPage() {
  let logos: TierLogoRecord[] = [];

  try {
    logos = await listTierLogos();
  } catch (e) {
    console.error("[AdminTierLogosPage]", e);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#39FF14]">
          <Layers className="h-3.5 w-3.5" />
          Branding
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Logotypy Dywizji</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Oficjalne logo lig (Premier Division → National League) oraz The FA Ranking. Upload działa
          jak herby klubów: zapis do{" "}
          <code className="text-slate-300">public/uploads/tier-logos/</code> + API (PM2). Seed z
          gita zostaje w{" "}
          <code className="text-slate-300">public/tier-logos/</code>.
        </p>
      </header>

      <TierLogoManager logos={logos} />
    </div>
  );
}
