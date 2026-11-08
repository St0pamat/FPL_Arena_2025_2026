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
import {
  STATS_LAB_CHART_THEMES,
  type StatsLabChartThemeId,
} from "@/components/admin/stats-lab/chartTheme";
import { getThemeTokens } from "@/lib/stats-lab/themeTokens";
import { StatsLabStudioClient } from "@/components/admin/stats-lab/StatsLabStudioClient";
import { StatsCentreView } from "@/components/admin/stats-lab/StatsCentreView";

type ModuleTab = "centre" | "studio";

type Props = {
  bootstrap: StatsLabBootstrapData;
  initialResult: StatsLabComparisonResult | null;
  initialFilter: StatsLabQueryFilter;
  initialTab?: ModuleTab;
};

const LANG_KEY = "fpl-arena-stats-lab-lang";
const THEME_KEY = "fpl-arena-stats-lab-theme";

function parseSelectedIds(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function readStoredLang(): StatsLabLang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v === "en" ? "en" : "pl";
  } catch {
    return "pl";
  }
}

function readStoredTheme(): StatsLabChartThemeId {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "SCOUT_DARK" || v === "ANALYST_LIGHT" || v === "ARENA_DARK") {
      return v;
    }
  } catch {
    /* ignore */
  }
  return "ARENA_DARK";
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
  const [chartTheme, setChartTheme] =
    useState<StatsLabChartThemeId>("ARENA_DARK");
  const [prefsReady, setPrefsReady] = useState(false);
  const ui = centreUi(lang);
  const tokens = getThemeTokens(chartTheme);

  const seedSelectedIds = useMemo(
    () => parseSelectedIds(selectedParam),
    [selectedParam],
  );

  useEffect(() => {
    setLang(readStoredLang());
    setChartTheme(readStoredTheme());
    setPrefsReady(true);
  }, []);

  useEffect(() => {
    if (!prefsReady) return;
    try {
      localStorage.setItem(LANG_KEY, lang);
      localStorage.setItem(THEME_KEY, chartTheme);
    } catch {
      /* ignore */
    }
  }, [lang, chartTheme, prefsReady]);

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
      <div
        className={`flex flex-wrap items-center gap-2 rounded-2xl border p-2 ${tokens.panel} ${tokens.panelBorder}`}
      >
        <button
          type="button"
          onClick={() => switchTab("centre")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-wider ${
            tab === "centre"
              ? "bg-[#39FF14] text-black"
              : `${tokens.textMuted} hover:brightness-125`
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
              : `${tokens.textMuted} hover:brightness-125`
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          {ui.moduleStudio}
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div
            className={`inline-flex rounded-xl border p-1 ${tokens.panelBorder} ${tokens.page}`}
          >
            <button
              type="button"
              onClick={() => setLang("pl")}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase ${
                lang === "pl" ? "bg-[#39FF14] text-black" : tokens.textMuted
              }`}
            >
              🇵🇱 PL
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase ${
                lang === "en" ? "bg-[#39FF14] text-black" : tokens.textMuted
              }`}
            >
              🇬🇧 EN
            </button>
          </div>

          <div
            className={`inline-flex rounded-xl border p-1 ${tokens.panelBorder} ${tokens.page}`}
          >
            {(
              Object.keys(STATS_LAB_CHART_THEMES) as StatsLabChartThemeId[]
            ).map((id) => (
              <button
                key={id}
                type="button"
                title={
                  lang === "en"
                    ? STATS_LAB_CHART_THEMES[id].labelEn
                    : STATS_LAB_CHART_THEMES[id].labelPl
                }
                onClick={() => setChartTheme(id)}
                className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase ${
                  chartTheme === id
                    ? "bg-[#39FF14] text-black"
                    : tokens.textMuted
                }`}
              >
                {id === "ARENA_DARK"
                  ? "Arena"
                  : id === "SCOUT_DARK"
                    ? "Scout"
                    : "Light"}
              </button>
            ))}
          </div>

          <Link
            href="/admin/stats-lab/centre"
            className={`text-[10px] font-bold uppercase tracking-wider ${tokens.textMuted} hover:opacity-80`}
          >
            /centre
          </Link>
        </div>
      </div>

      {tab === "centre" ? (
        <StatsCentreView
          bootstrap={bootstrap}
          lang={lang}
          onLangChange={setLang}
          themeId={chartTheme}
          onThemeChange={setChartTheme}
        />
      ) : (
        <StatsLabStudioClient
          bootstrap={bootstrap}
          initialResult={initialResult}
          initialFilter={initialFilter}
          seedSelectedPlayerIds={seedSelectedIds}
          seedLang={lang}
          seedChartTheme={chartTheme}
          onLangChange={setLang}
          onChartThemeChange={setChartTheme}
        />
      )}
    </div>
  );
}
