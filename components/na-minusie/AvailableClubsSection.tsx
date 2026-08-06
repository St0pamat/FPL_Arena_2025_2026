import { AvailableClubsGrid } from "@/components/na-minusie/AvailableClubsGrid";
import { SectionShell } from "@/components/na-minusie/SectionShell";
import { getPublicClubLogos } from "@/lib/public/actions";
import { getRecruitmentClubsData } from "@/lib/public/getAvailableClubs";

export async function AvailableClubsSection() {
  const [data, logos] = await Promise.all([
    getRecruitmentClubsData(),
    getPublicClubLogos(),
  ]);

  return <AvailableClubsGrid data={data} logos={logos} />;
}

export function AvailableClubsSkeleton() {
  return (
    <>
      <SectionShell id="aktualni-uczestnicy" tight>
        <div className="max-w-3xl space-y-4">
          <div className="h-3 w-40 animate-pulse rounded bg-slate-800" />
          <div className="h-10 w-72 max-w-full animate-pulse rounded-lg bg-slate-800" />
        </div>
        <div className="mt-8 h-44 animate-pulse rounded-2xl border border-[#39FF14]/15 bg-slate-900/80" />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/80"
            />
          ))}
        </div>
      </SectionShell>
      <SectionShell id="dostepne-kluby" tight>
        <div className="h-40 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60" />
      </SectionShell>
    </>
  );
}
