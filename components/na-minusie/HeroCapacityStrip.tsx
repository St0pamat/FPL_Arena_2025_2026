import { LeagueCapacityMeterCompact } from "@/components/na-minusie/LeagueCapacityMeterCompact";
import { getRecruitmentClubsData } from "@/lib/public/getAvailableClubs";

export async function HeroCapacityStrip() {
  const data = await getRecruitmentClubsData();
  const occupied = data.players.length;
  const pending = data.reservedClubs.length;

  return (
    <div className="w-full">
      <p
        role="status"
        className="mb-6 text-center font-black uppercase tracking-widest text-red-500 text-xl sm:text-2xl"
      >
        REKRUTACJA NA SEZON FPL 2026/2027 ZOSTAŁA ZAMKNIĘTA
      </p>
      <LeagueCapacityMeterCompact occupied={occupied} pending={pending} />
    </div>
  );
}

export function HeroCapacityStripSkeleton() {
  return (
    <div className="mb-8 w-full" aria-hidden>
      <div className="mb-6 h-8 w-full animate-pulse rounded bg-slate-800/60 sm:h-9" />
      <div className="h-[52px] w-full animate-pulse rounded-xl border border-[#39FF14]/15 bg-slate-950/50" />
    </div>
  );
}
