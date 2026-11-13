"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, BookOpen, CalendarRange, ClipboardList, Table2 } from "lucide-react";
import type {
  StatsLabBootstrapData,
  StatsLabComparisonResult,
} from "@/lib/stats-lab/analyticsEngine";
import type { StatsLabQueryFilter } from "@/lib/stats-lab/presets";
import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import { centreUi } from "@/lib/stats-lab/statsCentreI18n";
import { PROJECTIONS_MODULE_LABEL } from "@/lib/stats-lab/projectionsI18n";
import type { KnowledgeHelpAnchor } from "@/lib/stats-lab/knowledgeBaseContent";
import {
  STATS_LAB_CHART_THEMES,
  type StatsLabChartThemeId,
} from "@/components/admin/stats-lab/chartTheme";
import { StatsLabStudioClient } from "@/components/admin/stats-lab/StatsLabStudioClient";
import { StatsCentreView } from "@/components/admin/stats-lab/StatsCentreView";
import { StatsLabProjectionsClient } from "@/components/admin/stats-lab/StatsLabProjectionsClient";
import { StatsLabPlannerClient } from "@/components/admin/stats-lab/StatsLabPlannerClient";
import { StatsLabKnowledgeBaseModal } from "@/components/admin/stats-lab/StatsLabKnowledgeBaseModal";
import { getStatsLabMenuChrome } from "@/lib/stats-lab/menuChrome";

export type ModuleTab = "centre" | "studio" | "projections" | "planner";

type Props = {
  bootstrap: StatsLabBootstrapData;
  initialResult: StatsLabComparisonResult | null;
  initialFilter: StatsLabQueryFilter;
  initialTab?: ModuleTab;
};

const LANG_KEYS = [
  "fpl-arena-stats-lab-lang",
  "fpl-arena-stats-centre-lang",
  "fpl-arena-stats-studio-lang",
] as const;

const THEME_KEYS = [
  "fpl-arena-stats-lab-theme",
  "fpl-arena-stats-centre-theme",
  "fpl-arena-stats-studio-theme",
] as const;

const THEME_SYNC_EVENT = "fpl-stats-lab-theme-sync";

function parseSelectedIds(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function readStoredLang(): StatsLabLang {
  try {
    for (const key of LANG_KEYS) {
      const v = localStorage.getItem(key);
      if (v === "en" || v === "pl") return v;
    }
  } catch {
    /* ignore */
  }
  return "pl";
}

function readStoredTheme(): StatsLabChartThemeId {
  try {
    for (const key of THEME_KEYS) {
      const v = localStorage.getItem(key);
      if (v === "SCOUT_DARK" || v === "ANALYST_LIGHT" || v === "ARENA_DARK") {
        return v;
      }
    }
  } catch {
    /* ignore */
  }
  return "ARENA_DARK";
}

function persistThemeAndLang(
  themeId: StatsLabChartThemeId,
  lang: StatsLabLang,
): void {
  try {
    for (const key of LANG_KEYS) localStorage.setItem(key, lang);
    for (const key of THEME_KEYS) localStorage.setItem(key, themeId);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(THEME_SYNC_EVENT, {
        detail: { themeId, lang },
      }),
    );
  }
}

function shellRootClass(themeId: StatsLabChartThemeId): string {
  const base =
    "space-y-5 overflow-x-hidden rounded-2xl p-4 transition-colors duration-200";
  if (themeId === "ANALYST_LIGHT") {
    return `${base} border border-slate-300 bg-slate-100 text-slate-900 shadow-sm`;
  }
  if (themeId === "SCOUT_DARK") {
    return `${base} border border-teal-900/70 bg-[#06181e] text-teal-50`;
  }
  return `${base} border border-slate-800/80 bg-[#070b14] text-slate-100`;
}

function shellNavClass(themeId: StatsLabChartThemeId): string {
  const base = "flex flex-wrap items-center gap-2 rounded-2xl p-2";
  if (themeId === "ANALYST_LIGHT") {
    return `${base} border border-slate-300 bg-white shadow-sm`;
  }
  if (themeId === "SCOUT_DARK") {
    return `${base} border border-teal-800/80 bg-[#09222a]`;
  }
  return `${base} border border-slate-800 bg-[#0c1322]`;
}

function shellNavInactiveClass(themeId: StatsLabChartThemeId): string {
  if (themeId === "ANALYST_LIGHT") {
    return "border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-950";
  }
  if (themeId === "SCOUT_DARK") {
    return "border border-teal-800 bg-[#06181e] text-teal-100 hover:bg-teal-900/60 hover:text-white";
  }
  return "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white";
}

function shellNavActiveClass(themeId: StatsLabChartThemeId): string {
  if (themeId === "ANALYST_LIGHT") {
    return "border border-emerald-800 bg-emerald-700 font-black text-white";
  }
  return "border border-[#39ff14] bg-[#39ff14] font-black text-slate-950";
}

function shellNavChipGroupClass(themeId: StatsLabChartThemeId): string {
  if (themeId === "ANALYST_LIGHT") {
    return "inline-flex rounded-xl border border-slate-300 bg-slate-50 p-1";
  }
  if (themeId === "SCOUT_DARK") {
    return "inline-flex rounded-xl border border-teal-800 bg-[#06181e] p-1";
  }
  return "inline-flex rounded-xl border border-slate-700 bg-[#070b14] p-1";
}

function shellNavTabClass(
  active: boolean,
  themeId: StatsLabChartThemeId,
): string {
  return `inline-flex min-h-[28px] items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-wider ${
    active ? shellNavActiveClass(themeId) : shellNavInactiveClass(themeId)
  }`;
}

function shellNavChipClass(
  active: boolean,
  themeId: StatsLabChartThemeId,
): string {
  return `min-h-[28px] rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase ${
    active ? shellNavActiveClass(themeId) : shellNavInactiveClass(themeId)
  }`;
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

  const [tab, setTab] = useState<ModuleTab>(() => {
    if (
      tabParam === "centre" ||
      tabParam === "studio" ||
      tabParam === "projections" ||
      tabParam === "planner"
    ) {
      return tabParam;
    }
    if (
      initialTab === "centre" ||
      initialTab === "projections" ||
      initialTab === "planner"
    ) {
      return initialTab;
    }
    return "studio";
  });
  const [lang, setLang] = useState<StatsLabLang>("pl");
  const [chartTheme, setChartTheme] =
    useState<StatsLabChartThemeId>("ARENA_DARK");
  const [prefsReady, setPrefsReady] = useState(false);
  const [visitedTabs, setVisitedTabs] = useState<Set<ModuleTab>>(() => {
    const initial: ModuleTab =
      tabParam === "centre" ||
      tabParam === "studio" ||
      tabParam === "projections" ||
      tabParam === "planner"
        ? tabParam
        : initialTab === "centre" ||
            initialTab === "projections" ||
            initialTab === "planner"
          ? initialTab
          : "studio";
    return new Set<ModuleTab>([initial]);
  });
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [knowledgeAnchor, setKnowledgeAnchor] =
    useState<KnowledgeHelpAnchor | null>(null);
  const ui = centreUi(lang);
  const chrome = getStatsLabMenuChrome(chartTheme);

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
    persistThemeAndLang(chartTheme, lang);
  }, [lang, chartTheme, prefsReady]);

  useEffect(() => {
    function onExternalSync(ev: Event) {
      const detail = (ev as CustomEvent<{ themeId?: string; lang?: string }>)
        .detail;
      if (!detail) return;
      if (
        detail.themeId === "ARENA_DARK" ||
        detail.themeId === "SCOUT_DARK" ||
        detail.themeId === "ANALYST_LIGHT"
      ) {
        setChartTheme(detail.themeId);
      }
      if (detail.lang === "pl" || detail.lang === "en") {
        setLang(detail.lang);
      }
    }
    window.addEventListener(THEME_SYNC_EVENT, onExternalSync);
    return () => window.removeEventListener(THEME_SYNC_EVENT, onExternalSync);
  }, []);

  useEffect(() => {
    if (
      tabParam === "centre" ||
      tabParam === "studio" ||
      tabParam === "projections" ||
      tabParam === "planner"
    ) {
      setTab(tabParam);
      setVisitedTabs((prev) => {
        if (prev.has(tabParam)) return prev;
        const next = new Set(prev);
        next.add(tabParam);
        return next;
      });
    }
  }, [tabParam]);

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, [tab]);

  function switchTab(next: ModuleTab) {
    setTab(next);
    setVisitedTabs((prev) => {
      if (prev.has(next)) return prev;
      const copy = new Set(prev);
      copy.add(next);
      return copy;
    });
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    if (next === "centre") params.delete("selected");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function applyLang(next: StatsLabLang) {
    setLang(next);
  }

  function applyTheme(next: StatsLabChartThemeId) {
    setChartTheme(next);
  }

  function openKnowledge(anchor: KnowledgeHelpAnchor = "general") {
    setKnowledgeAnchor(anchor);
    setKnowledgeOpen(true);
  }

  return (
    <div
      className={shellRootClass(chartTheme)}
      data-stats-lab-shell-root="true"
      data-stats-lab-theme={chartTheme}
      data-stats-lab-lang={lang}
      data-stats-lab-active-tab={tab}
    >
      <div
        data-stats-lab-region="SHELL_HEADER_NAV"
        className={shellNavClass(chartTheme)}
      >
        <button
          type="button"
          onClick={() => switchTab("centre")}
          className={shellNavTabClass(tab === "centre", chartTheme)}
        >
          <Table2 className="h-3.5 w-3.5" />
          {ui.moduleCentre}
        </button>
        <button
          type="button"
          onClick={() => switchTab("studio")}
          className={shellNavTabClass(tab === "studio", chartTheme)}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          {ui.moduleStudio}
        </button>
        <button
          type="button"
          onClick={() => switchTab("projections")}
          className={shellNavTabClass(tab === "projections", chartTheme)}
        >
          <CalendarRange className="h-3.5 w-3.5" />
          {PROJECTIONS_MODULE_LABEL[lang]}
        </button>
        <button
          type="button"
          onClick={() => switchTab("planner")}
          className={shellNavTabClass(tab === "planner", chartTheme)}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          {lang === "pl"
            ? "📋 Planer FPL (Drużyna i Transfery)"
            : "📋 FPL Planner (Team & Transfers)"}
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className={shellNavChipGroupClass(chartTheme)}>
            <button
              type="button"
              onClick={() => applyLang("pl")}
              className={shellNavChipClass(lang === "pl", chartTheme)}
            >
              🇵🇱 PL
            </button>
            <button
              type="button"
              onClick={() => applyLang("en")}
              className={shellNavChipClass(lang === "en", chartTheme)}
            >
              🇬🇧 EN
            </button>
          </div>

          <div className={shellNavChipGroupClass(chartTheme)}>
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
                onClick={() => applyTheme(id)}
                className={shellNavChipClass(chartTheme === id, chartTheme)}
              >
                {id === "ARENA_DARK"
                  ? "Arena"
                  : id === "SCOUT_DARK"
                    ? "Scout"
                    : "Light"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => openKnowledge("general")}
            className={`inline-flex min-h-[28px] items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] uppercase tracking-wider ${chrome.knowledgeBtn}`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            {lang === "pl"
              ? "📚 Baza Wiedzy i Zasady FPL"
              : "📚 Knowledge Base & FPL Rules"}
          </button>
        </div>
      </div>

      <div data-stats-lab-region="MODULE_WORKSPACE">
        {visitedTabs.has("centre") ? (
          <div
            className={tab === "centre" ? undefined : "hidden"}
            data-stats-lab-active-workspace={
              tab === "centre" ? "true" : undefined
            }
            aria-hidden={tab !== "centre"}
          >
            <StatsCentreView
              bootstrap={bootstrap}
              lang={lang}
              onLangChange={applyLang}
              themeId={chartTheme}
              onThemeChange={applyTheme}
            />
          </div>
        ) : null}

        {visitedTabs.has("studio") ? (
          <div
            className={tab === "studio" ? undefined : "hidden"}
            data-stats-lab-active-workspace={
              tab === "studio" ? "true" : undefined
            }
            aria-hidden={tab !== "studio"}
          >
            <StatsLabStudioClient
              bootstrap={bootstrap}
              initialResult={initialResult}
              initialFilter={initialFilter}
              seedSelectedPlayerIds={seedSelectedIds}
              seedLang={lang}
              seedChartTheme={chartTheme}
              onLangChange={applyLang}
              onChartThemeChange={applyTheme}
              onOpenKnowledge={openKnowledge}
            />
          </div>
        ) : null}

        {visitedTabs.has("projections") ? (
          <div
            className={tab === "projections" ? undefined : "hidden"}
            data-stats-lab-active-workspace={
              tab === "projections" ? "true" : undefined
            }
            aria-hidden={tab !== "projections"}
          >
            <StatsLabProjectionsClient lang={lang} themeId={chartTheme} />
          </div>
        ) : null}

        {visitedTabs.has("planner") ? (
          <div
            className={tab === "planner" ? undefined : "hidden"}
            data-stats-lab-active-workspace={
              tab === "planner" ? "true" : undefined
            }
            aria-hidden={tab !== "planner"}
          >
            <StatsLabPlannerClient
              seasonCode={bootstrap.seasonCode}
              lang={lang}
              themeId={chartTheme}
            />
          </div>
        ) : null}
      </div>

      <StatsLabKnowledgeBaseModal
        open={knowledgeOpen}
        lang={lang}
        themeId={chartTheme}
        activeModuleTab={tab}
        helpAnchor={knowledgeAnchor}
        onLangChange={applyLang}
        onClose={() => {
          setKnowledgeOpen(false);
          setKnowledgeAnchor(null);
        }}
      />
    </div>
  );
}
