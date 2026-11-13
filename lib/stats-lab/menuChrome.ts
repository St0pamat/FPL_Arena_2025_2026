/**
 * Wspólne klasy menu Stats Lab (Centre / Studio / ControlPanel / ExportBar).
 * Tylko warstwa UI — bez logiki filtrów/eksportu.
 * Jeden accent na motyw (= STATS_LAB_THEME_HEX.accent).
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
    // accent #0f766e
    return {
      themeId,
      isLight,
      isScout,
      panel: "border border-slate-300 bg-white text-slate-900 shadow-sm",
      group: "border border-slate-300 bg-slate-100",
      input:
        "min-h-[28px] border border-slate-300 bg-white text-slate-900 focus:border-[#0f766e]",
      option: "bg-white font-semibold text-slate-900",
      inactiveBtn:
        "min-h-[28px] border border-slate-300 bg-slate-100 font-bold text-slate-800 hover:bg-slate-200",
      activeBtn:
        "min-h-[28px] border border-[#0f766e] bg-[#0f766e] font-black text-white shadow-sm hover:bg-teal-800",
      mutedLabel: "text-slate-600",
      text: "text-slate-900",
      secondaryBtn:
        "min-h-[28px] border border-slate-300 bg-slate-100 font-bold text-slate-800 hover:bg-slate-200 disabled:opacity-50",
      exportPrimary:
        "min-h-[28px] border border-[#0f766e] bg-[#0f766e] font-black text-white shadow-sm hover:bg-teal-800 disabled:opacity-50",
      exportSecondary:
        "min-h-[28px] border border-slate-300 bg-slate-100 font-bold text-slate-800 hover:bg-slate-200 disabled:opacity-50",
      exportDiscord:
        "min-h-[28px] border border-slate-300 bg-slate-100 font-bold text-slate-800 hover:bg-slate-200 disabled:opacity-50",
      exportAudit:
        "min-h-[28px] border border-slate-300 bg-slate-100 font-bold text-slate-800 hover:bg-slate-200 disabled:opacity-50",
      knowledgeBtn:
        "min-h-[28px] border border-[#0f766e] bg-[#0f766e] font-black text-white shadow-sm hover:bg-teal-800",
    };
  }

  if (isScout) {
    // accent #2dd4bf; page #0b1c2e; panel #122a3a
    return {
      themeId,
      isLight,
      isScout,
      panel: "border border-teal-800/80 bg-[#122a3a] text-[#f0fdfa]",
      group: "border border-teal-900 bg-[#0b1c2e]",
      input:
        "min-h-[28px] border border-teal-700 bg-[#0b1c2e] text-[#f0fdfa] focus:border-[#2dd4bf]",
      option: "bg-[#0b1c2e] font-semibold text-[#f0fdfa]",
      inactiveBtn:
        "min-h-[28px] border border-teal-700 bg-[#122a3a] font-bold text-[#f0fdfa] hover:bg-teal-900/60",
      activeBtn:
        "min-h-[28px] border border-[#2dd4bf] bg-[#2dd4bf] font-black text-[#020617] shadow-sm hover:bg-teal-300",
      mutedLabel: "text-[#94a3b8]",
      text: "text-[#f0fdfa]",
      secondaryBtn:
        "min-h-[28px] border border-teal-700 bg-[#122a3a] font-bold text-[#f0fdfa] hover:bg-teal-900/60 disabled:opacity-50",
      exportPrimary:
        "min-h-[28px] border border-[#2dd4bf] bg-[#2dd4bf] font-black text-[#020617] shadow-sm hover:bg-teal-300 disabled:opacity-50",
      exportSecondary:
        "min-h-[28px] border border-teal-700 bg-[#122a3a] font-bold text-[#f0fdfa] hover:bg-teal-900/60 disabled:opacity-50",
      exportDiscord:
        "min-h-[28px] border border-teal-700 bg-[#122a3a] font-bold text-[#f0fdfa] hover:bg-teal-900/60 disabled:opacity-50",
      exportAudit:
        "min-h-[28px] border border-teal-700 bg-[#122a3a] font-bold text-[#f0fdfa] hover:bg-teal-900/60 disabled:opacity-50",
      knowledgeBtn:
        "min-h-[28px] border border-[#2dd4bf] bg-[#2dd4bf] font-black text-[#020617] shadow-sm hover:bg-teal-300",
    };
  }

  // ARENA_DARK — accent #39FF14
  return {
    themeId,
    isLight,
    isScout,
    panel: "border border-slate-800 bg-[#0c1322] text-slate-100",
    group: "border border-slate-800 bg-slate-950",
    input:
      "min-h-[28px] border border-slate-700 bg-slate-950 text-slate-100 focus:border-[#39FF14]",
    option: "bg-slate-900 font-semibold text-slate-100",
    inactiveBtn:
      "min-h-[28px] border border-slate-700 bg-slate-900 font-bold text-slate-100 hover:bg-slate-800",
    activeBtn:
      "min-h-[28px] border border-[#39FF14] bg-[#39FF14] font-black text-[#020617] shadow-sm hover:bg-lime-300",
    mutedLabel: "text-slate-400",
    text: "text-slate-100",
    secondaryBtn:
      "min-h-[28px] border border-slate-700 bg-slate-900 font-bold text-slate-100 hover:bg-slate-800 disabled:opacity-50",
    exportPrimary:
      "min-h-[28px] border border-[#39FF14] bg-[#39FF14] font-black text-[#020617] shadow-sm hover:bg-lime-300 disabled:opacity-50",
    exportSecondary:
      "min-h-[28px] border border-slate-700 bg-slate-900 font-bold text-slate-100 hover:bg-slate-800 disabled:opacity-50",
    exportDiscord:
      "min-h-[28px] border border-slate-700 bg-slate-900 font-bold text-slate-100 hover:bg-slate-800 disabled:opacity-50",
    exportAudit:
      "min-h-[28px] border border-slate-700 bg-slate-900 font-bold text-slate-100 hover:bg-slate-800 disabled:opacity-50",
    knowledgeBtn:
      "min-h-[28px] border border-[#39FF14] bg-[#39FF14] font-black text-[#020617] shadow-sm hover:bg-lime-300",
  };
}

export const STATS_LAB_THEME_SYNC_EVENT = "fpl-stats-lab-theme-sync";
