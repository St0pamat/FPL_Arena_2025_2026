import { LeagueCapacityMeterCompact } from "@/components/na-minusie/LeagueCapacityMeterCompact";
import { getRecruitmentClubsData } from "@/lib/public/getAvailableClubs";

export async function HeroCapacityStrip() {
  const data = await getRecruitmentClubsData();
  const occupied = data.players.length;
  const pending = data.reservedClubs.length;

  return (
    <LeagueCapacityMeterCompact occupied={occupied} pending={pending} />
  );
}

export function HeroCapacityStripSkeleton() {
  return (
    <div
      className="mb-8 h-[52px] w-full animate-pulse rounded-xl border border-[#39FF14]/15 bg-slate-950/50"
      aria-hidden
    />
  );
}
