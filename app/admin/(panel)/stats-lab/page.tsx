import Link from "next/link";
import { Suspense } from "react";
import { BarChart3, Database } from "lucide-react";
import {
  loadStatsLabBootstrapDataAction,
  queryStatsLabComparisonAction,
} from "@/app/admin/actions/statsLabStudio";
import { StatsLabModuleShell } from "@/components/admin/stats-lab/StatsLabModuleShell";
import {
  applyStatsLabPreset,
  createDefaultStatsLabFilter,
} from "@/lib/stats-lab/presets";
import { DEFAULT_STATS_LAB_SEASON } from "@/lib/stats-lab/syncEngine";
import type { StatsLabComparisonResult } from "@/lib/stats-lab/analyticsEngine";

export const dynamic = "force-dynamic";

export default async function AdminStatsLabStudioPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  let bootstrapError: string | null = null;

  const bootstrap = await loadStatsLabBootstrapDataAction(
    DEFAULT_STATS_LAB_SEASON,
  ).catch((e) => {
    bootstrapError =
      e instanceof Error
        ? e.message
        : "Nie udało się wczytać bazy Stats Lab.";
    return null;
  });

  if (!bootstrap) {
    return (
      <main className="flex-1 bg-[#0B0F19] p-6 sm:p-8 lg:p-10">
        <div className="mx-auto max-w-3xl space-y-4">
          <h1 className="text-2xl font-extrabold text-white">
            FPL Arena: Stats Lab
          </h1>
          <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            {bootstrapError}
          </p>
          <Link
            href="/admin/stats-lab/sync"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#39FF14]"
          >
            <Database className="h-4 w-4" />
            Sprawdź synchronizację / migrację
          </Link>
        </div>
      </main>
    );
  }

  const initialFilter = applyStatsLabPreset(
    "DEF_COMPLETE",
    createDefaultStatsLabFilter(bootstrap.seasonCode || DEFAULT_STATS_LAB_SEASON),
  );

  let initialResult: StatsLabComparisonResult | null = null;
  if (bootstrap.players.length > 0) {
    try {
      initialResult = await queryStatsLabComparisonAction(initialFilter);
    } catch {
      initialResult = null;
    }
  }

  const initialTab =
    searchParams?.tab === "centre" ? "centre" : ("studio" as const);

  return (
    <main className="flex-1 bg-[#0B0F19] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
              <BarChart3 className="h-3.5 w-3.5" />
              FPL Arena · Stats Lab
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
              Stats Centre & Studio
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Tabele analityczne (FFS-style) + Studio wykresów — jeden moduł, dwa
              silniki, wspólna baza FPL.
            </p>
          </div>
          <Link
            href="/admin/stats-lab/sync"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-300 hover:border-[#39FF14]/40 hover:text-[#39FF14]"
          >
            <Database className="h-3.5 w-3.5" />
            Sync FPL
          </Link>
        </header>

        <Suspense
          fallback={
            <p className="text-sm text-slate-500">Ładowanie Stats Lab…</p>
          }
        >
          <StatsLabModuleShell
            bootstrap={bootstrap}
            initialResult={initialResult}
            initialFilter={initialFilter}
            initialTab={initialTab}
          />
        </Suspense>
      </div>
    </main>
  );
}
