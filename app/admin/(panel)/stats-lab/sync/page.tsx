import { Database } from "lucide-react";
import { getStatsLabOverview } from "@/app/admin/actions/statsLabSync";
import { StatsLabSyncClient } from "@/components/admin/stats-lab/StatsLabSyncClient";
import { DEFAULT_STATS_LAB_SEASON } from "@/lib/stats-lab/syncEngine";

export const dynamic = "force-dynamic";

export default async function AdminStatsLabSyncPage() {
  const overview = await getStatsLabOverview(DEFAULT_STATS_LAB_SEASON);

  return (
    <main className="flex-1 bg-[#0B0F19] p-6 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
            <Database className="h-3.5 w-3.5" />
            Stats Lab · Incremental ETL
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-white">
            Baza i Synchronizacja FPL
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Pobiera snapshot z{" "}
            <code className="text-slate-300">bootstrap-static</code>, a następnie
            przyrostowo dociąga historię meczową tylko dla aktywnych zawodników
            (minuty &gt; 0) z{" "}
            <code className="text-slate-300">element-summary</code>. Hard Reset
            ligi Na Minusie nie kasuje tabel <code>fpl_lab_*</code>.
          </p>
        </header>

        <StatsLabSyncClient initialOverview={overview} />
      </div>
    </main>
  );
}
