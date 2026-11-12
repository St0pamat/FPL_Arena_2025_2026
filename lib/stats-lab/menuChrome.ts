/**
 * Wspólne klasy menu Stats Lab (Centre / Studio / ControlPanel / ExportBar).
 * Tylko warstwa UI — bez logiki filtrów/eksportu.
 */

import type { StatsLabChartThemeId } from "@/components/admin/stats-lab/chartTheme";

export type StatsLabMenuChrome = {
  themeId: StatsLabChartThemeId;
  isLight: boolean;
  isScout: boolean;
  panel: string;
  group: string;
  input: string;
  option: string;
  inactiveBtn: string;
  activeBtn: string;
  mutedLabel: string;
  text: string;
  secondaryBtn: string;
  exportPrimary: string;
  exportSecondary: string;
  exportDiscord: string;
  exportAudit: string;
  knowledgeBtn: string;
};

export function getStatsLabMenuChrome(
  themeId: StatsLabChartThemeId,
): StatsLabMenuChrome {
  const isLight = themeId === "ANALYST_LIGHT";
  const isScout = themeId === "SCOUT_DARK";

  if (isLight) {
    return {
      themeId,
      isLight,
      isScout,
      panel: "border border-slate-300 bg-white text-slate-900 shadow-sm",
      group: "border border-slate-300 bg-slate-100",
      input:
        "min-h-[28px] border border-slate-300 bg-white text-slate-900 focus:border-emerald-600",
      option: "bg-white font-semibold text-slate-900",
      inactiveBtn:
        "min-h-[28px] border border-slate-300 bg-slate-100 font-bold text-slate-800 hover:bg-slate-200",
      activeBtn:
        "min-h-[28px] border border-emerald-800 bg-emerald-700 font-black text-white shadow-sm hover:bg-emerald-800",
      mutedLabel: "text-slate-700",
      text: "text-slate-900",
      secondaryBtn:
        "min-h-[28px] border border-slate-300 bg-slate-100 font-bold text-slate-800 hover:bg-slate-200 disabled:opacity-50",
      exportPrimary:
        "min-h-[28px] border border-emerald-800 bg-emerald-700 font-black text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50",
      exportSecondary:
        "min-h-[28px] border border-slate-300 bg-slate-100 font-bold text-slate-800 hover:bg-slate-200 disabled:opacity-50",
      exportDiscord:
        "min-h-[28px] border border-slate-300 bg-slate-100 font-bold text-slate-800 hover:bg-slate-200 disabled:opacity-50",
      exportAudit:
        "min-h-[28px] border border-slate-300 bg-slate-100 font-bold text-slate-800 hover:bg-slate-200 disabled:opacity-50",
      knowledgeBtn:
        "min-h-[28px] border border-emerald-800 bg-emerald-700 font-black text-white shadow-sm hover:bg-emerald-800",
    };
  }

  if (isScout) {
    return {
      themeId,
      isLight,
      isScout,
      panel: "border border-teal-800/80 bg-[#09222a] text-teal-50",
      group: "border border-teal-900 bg-[#06181e]",
      input:
        "min-h-[28px] border border-teal-700 bg-[#06181e] text-teal-50 focus:border-emerald-400",
      option: "bg-[#06181e] font-semibold text-teal-50",
      inactiveBtn:
        "min-h-[28px] border border-teal-700 bg-[#0d2d37] font-bold text-teal-50 hover:bg-teal-900/60",
      activeBtn:
        "min-h-[28px] border border-emerald-300 bg-emerald-400 font-black text-slate-950 shadow-sm hover:bg-emerald-300",
      mutedLabel: "text-teal-200/80",
      text: "text-teal-50",
      secondaryBtn:
        "min-h-[28px] border border-teal-700 bg-[#0d2d37] font-bold text-teal-50 hover:bg-teal-900/60 disabled:opacity-50",
      exportPrimary:
        "min-h-[28px] border border-emerald-300 bg-emerald-400 font-black text-slate-950 shadow-sm hover:bg-emerald-300 disabled:opacity-50",
      exportSecondary:
        "min-h-[28px] border border-teal-700 bg-[#0d2d37] font-bold text-teal-50 hover:bg-teal-900/60 disabled:opacity-50",
      exportDiscord:
        "min-h-[28px] border border-teal-700 bg-[#0d2d37] font-bold text-teal-50 hover:bg-teal-900/60 disabled:opacity-50",
      exportAudit:
        "min-h-[28px] border border-teal-700 bg-[#0d2d37] font-bold text-teal-50 hover:bg-teal-900/60 disabled:opacity-50",
      knowledgeBtn:
        "min-h-[28px] border border-emerald-300 bg-emerald-400 font-black text-slate-950 shadow-sm hover:bg-emerald-300",
    };
  }

  return {
    themeId,
    isLight,
    isScout,
    panel: "border border-slate-800 bg-[#0c1322] text-slate-100",
    group: "border border-slate-800 bg-slate-950",
    input:
      "min-h-[28px] border border-slate-700 bg-slate-950 text-white focus:border-emerald-400",
    option: "bg-slate-900 font-semibold text-white",
    inactiveBtn:
      "min-h-[28px] border border-slate-700 bg-slate-900 font-bold text-slate-100 hover:bg-slate-800",
    activeBtn:
      "min-h-[28px] border border-emerald-300 bg-emerald-400 font-black text-slate-950 shadow-sm hover:bg-emerald-300",
    mutedLabel: "text-slate-400",
    text: "text-slate-100",
    secondaryBtn:
      "min-h-[28px] border border-slate-700 bg-slate-900 font-bold text-slate-100 hover:bg-slate-800 disabled:opacity-50",
    exportPrimary:
      "min-h-[28px] border border-emerald-300 bg-emerald-400 font-black text-slate-950 shadow-sm hover:bg-emerald-300 disabled:opacity-50",
    exportSecondary:
      "min-h-[28px] border border-slate-700 bg-slate-900 font-bold text-slate-100 hover:bg-slate-800 disabled:opacity-50",
    exportDiscord:
      "min-h-[28px] border border-slate-700 bg-slate-900 font-bold text-slate-100 hover:bg-slate-800 disabled:opacity-50",
    exportAudit:
      "min-h-[28px] border border-slate-700 bg-slate-900 font-bold text-slate-100 hover:bg-slate-800 disabled:opacity-50",
    knowledgeBtn:
      "min-h-[28px] border border-emerald-300 bg-emerald-400 font-black text-slate-950 shadow-sm hover:bg-emerald-300",
  };
}

export const STATS_LAB_THEME_SYNC_EVENT = "fpl-stats-lab-theme-sync";
