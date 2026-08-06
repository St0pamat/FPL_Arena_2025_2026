import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayerProfileView } from "@/components/strefa-gracza/PlayerProfileView";
import { getPlayerZoneProfile } from "@/lib/public/playerZone";
import { NM_CONTAINER } from "@/lib/na-minusie/theme";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ teamId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { teamId } = await params;
  const profile = await getPlayerZoneProfile(teamId);
  if (!profile) return { title: "Gracz nie znaleziony" };

  const name = profile.team.fpl_team_name?.trim() || profile.team.manager_name;
  return {
    title: `${name} — Strefa Gracza`,
    description: `Profil H2H: ${name} · ${profile.divisionName} · Na Minusie ™`,
  };
}

export default async function StrefaGraczaProfilePage({ params }: Props) {
  const { teamId } = await params;
  const profile = await getPlayerZoneProfile(teamId);

  if (!profile) {
    notFound();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-900 font-sans text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.12),_transparent_50%),radial-gradient(ellipse_at_bottom_left,_rgba(56,189,248,0.08),_transparent_45%)]"
      />

      <div className={`relative z-10 ${NM_CONTAINER} py-10 sm:py-14`}>
        <PlayerProfileView profile={profile} />
      </div>
    </main>
  );
}
