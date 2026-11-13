/**
 * Klasy górnej nawigacji Stats Lab — jeden accent na motyw.
 */

import type { StatsLabChartThemeId } from "@/components/admin/stats-lab/chartTheme";

export function shellRootClass(themeId: StatsLabChartThemeId): string {
  const base =
    "space-y-5 overflow-x-hidden rounded-2xl p-4 transition-colors duration-200";
  if (themeId === "ANALYST_LIGHT") {
    return `${base} border border-slate-300 bg-[#f8fafc] text-slate-900 shadow-sm`;
  }
  if (themeId === "SCOUT_DARK") {
    return `${base} border border-teal-900/70 bg-[#0b1c2e] text-[#f0fdfa]`;
  }
  return `${base} border border-slate-800/80 bg-[#070b14] text-slate-100`;
}

export function shellNavClass(themeId: StatsLabChartThemeId): string {
  const base = "flex flex-wrap items-center gap-2 rounded-2xl p-2";
  if (themeId === "ANALYST_LIGHT") {
    return `${base} border border-slate-300 bg-white shadow-sm`;
  }
  if (themeId === "SCOUT_DARK") {
    return `${base} border border-teal-800/80 bg-[#122a3a]`;
  }
  return `${base} border border-slate-800 bg-[#0c1322]`;
}

export function shellNavInactiveClass(themeId: StatsLabChartThemeId): string {
  if (themeId === "ANALYST_LIGHT") {
    return "border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-950";
  }
  if (themeId === "SCOUT_DARK") {
    return "border border-teal-800 bg-[#0b1c2e] text-[#f0fdfa] hover:bg-teal-900/60";
  }
  return "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-slate-50";
}

/** Jeden accent: Arena #39FF14, Scout #2dd4bf, Light #0f766e. */
export function shellNavActiveClass(themeId: StatsLabChartThemeId): string {
  if (themeId === "ANALYST_LIGHT") {
    return "border border-[#0f766e] bg-[#0f766e] font-black text-white";
  }
  if (themeId === "SCOUT_DARK") {
    return "border border-[#2dd4bf] bg-[#2dd4bf] font-black text-[#020617]";
  }
  return "border border-[#39FF14] bg-[#39FF14] font-black text-[#020617]";
}

export function shellNavChipGroupClass(themeId: StatsLabChartThemeId): string {
  if (themeId === "ANALYST_LIGHT") {
    return "inline-flex rounded-xl border border-slate-300 bg-slate-50 p-1";
  }
  if (themeId === "SCOUT_DARK") {
    return "inline-flex rounded-xl border border-teal-800 bg-[#0b1c2e] p-1";
  }
  return "inline-flex rounded-xl border border-slate-700 bg-[#070b14] p-1";
}

export function shellNavTabClass(
  active: boolean,
  themeId: StatsLabChartThemeId,
): string {
  return `inline-flex min-h-[28px] items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-wider ${
    active ? shellNavActiveClass(themeId) : shellNavInactiveClass(themeId)
  }`;
}

export function shellNavChipClass(
  active: boolean,
  themeId: StatsLabChartThemeId,
): string {
  return `min-h-[28px] rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase ${
    active ? shellNavActiveClass(themeId) : shellNavInactiveClass(themeId)
  }`;
}

export const SHELL_NAV_TAB_IDS = [
  "centre",
  "studio",
  "projections",
  "planner",
] as const;

export type ShellNavTabId = (typeof SHELL_NAV_TAB_IDS)[number];
