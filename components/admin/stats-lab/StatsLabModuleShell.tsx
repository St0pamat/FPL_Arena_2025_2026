"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, Table2 } from "lucide-react";
import type {
  StatsLabBootstrapData,
  StatsLabComparisonResult,
} from "@/lib/stats-lab/analyticsEngine";
import type { StatsLabQueryFilter } from "@/lib/stats-lab/presets";
import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import { centreUi } from "@/lib/stats-lab/statsCentreI18n";
import { StatsLabStudioClient } from "@/components/admin/stats-lab/StatsLabStudioClient";
import { StatsCentreView } from "@/components/admin/stats-lab/StatsCentreView";

type ModuleTab = "centre" | "studio";

type Props = {
  bootstrap: StatsLabBootstrapData;
  initialResult: StatsLabComparisonResult | null;
  initialFilter: StatsLabQueryFilter;
  initialTab?: ModuleTab;
};

function parseSelectedIds(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export function StatsLabModuleShell({
  bootstrap,
  initialResult,
  initialFilter,
  initialTab = "studio",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const selectedParam = searchParams.get("selected");

  const [tab, setTab] = useState<ModuleTab>(
    tabParam === "centre" || initialTab === "centre" ? "centre" : "studio",
  );
  const [lang, setLang] = useState<StatsLabLang>("pl");
  const ui = centreUi(lang);

  const seedSelectedIds = useMemo(
    () => parseSelectedIds(selectedParam),
    [selectedParam],
  );

  useEffect(() => {
    if (tabParam === "centre" || tabParam === "studio") {
      setTab(tabParam);
    }
  }, [tabParam]);

  function switchTab(next: ModuleTab) {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    if (next === "centre") params.delete("selected");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-2">
        <button
          type="button"
          onClick={() => switchTab("centre")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-wider ${
            tab === "centre"
              ? "bg-[#39FF14] text-black"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Table2 className="h-3.5 w-3.5" />
          {ui.moduleCentre}
        </button>
        <button
          type="button"
          onClick={() => switchTab("studio")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-wider ${
            tab === "studio"
              ? "bg-[#39FF14] text-black"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          {ui.moduleStudio}
        </button>
        <Link
          href="/admin/stats-lab/centre"
          className="ml-auto text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-400"
        >
          /centre
        </Link>
      </div>

      {tab === "centre" ? (
        <StatsCentreView
          bootstrap={bootstrap}
          lang={lang}
          onLangChange={setLang}
        />
      ) : (
        <StatsLabStudioClient
          bootstrap={bootstrap}
          initialResult={initialResult}
          initialFilter={initialFilter}
          seedSelectedPlayerIds={seedSelectedIds}
          seedLang={lang}
        />
      )}
    </div>
  );
}
