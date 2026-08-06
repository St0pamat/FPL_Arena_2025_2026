import { HubShell } from "@/components/na-minusie/hub/HubShell";
import { parseHubTab } from "@/lib/na-minusie/hubTabs";
import {
  getPublicClubLogos,
  getPublicStructure,
  getPublicTierLogos,
} from "@/lib/public/actions";
import { getPlayerSearchList } from "@/lib/public/playerZone";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ tab?: string; seasonId?: string }>;
};

export default async function StrefaGraczaPage({ searchParams }: Props) {
  let loadError: string | null = null;

  try {
    const { tab, seasonId } = await searchParams;
    const [structure, logos, tierLogos, searchList] = await Promise.all([
      getPublicStructure(),
      getPublicClubLogos(),
      getPublicTierLogos(),
      getPlayerSearchList(),
    ]);

    return (
      <main className="relative min-h-screen bg-[#0B0F19] font-sans text-slate-100">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(56,189,248,0.06),_transparent_45%)]"
        />
        <div className="relative z-10">
          <HubShell
            structure={structure}
            logos={logos}
            tierLogos={tierLogos}
            searchPlayers={searchList.players}
            initialTab={parseHubTab(tab)}
            initialSeasonId={seasonId}
            isAdmin
          />
        </div>
      </main>
    );
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Nie udało się wczytać Strefy Gracza.";
  }

  return (
    <main className="relative min-h-screen bg-[#0B0F19] font-sans text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {loadError}
        </p>
      </div>
    </main>
  );
}
