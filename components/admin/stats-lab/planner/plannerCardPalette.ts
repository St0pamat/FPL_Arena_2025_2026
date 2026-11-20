import type { StatsLabChartThemeId } from "@/components/admin/stats-lab/chartTheme";

/**
 * Kropki FDR. Te same odcienie co pigułki Light (emerald / slate / amber / rose),
 * ale kryjące: na ciemnej karcie łatwy mecz ma jaśniejsze tło i obwódkę,
 * na białej — ciemniejszy zielony, żeby kontrast do tła tabliczki był ≥ 3:1.
 */
export function fdrDotClass(
  level: number,
  themeId: StatsLabChartThemeId,
): string {
  const dark = themeId !== "ANALYST_LIGHT";
  if (level <= 1) {
    return dark
      ? "bg-emerald-300 border border-emerald-100"
      : "bg-emerald-600 border border-emerald-800";
  }
  if (level === 2) {
    return dark
      ? "bg-emerald-500 border border-emerald-300"
      : "bg-emerald-700 border border-emerald-900";
  }
  if (level === 3) {
    return dark
      ? "bg-slate-200 border border-slate-100"
      : "bg-slate-500 border border-slate-700";
  }
  if (level === 4) {
    return dark
      ? "bg-amber-200 border border-amber-100"
      : "bg-amber-600 border border-amber-800";
  }
  return dark
    ? "bg-rose-500 border border-rose-300"
    : "bg-rose-600 border border-rose-800";
}

export function fdrPillClass(level: number, isLight: boolean): string {
  if (isLight) {
    if (level <= 1) return "bg-emerald-600 text-white border-emerald-700";
    if (level === 2) return "bg-emerald-100 text-emerald-950 border-emerald-300";
    if (level === 3) return "bg-slate-200 text-slate-900 border-slate-300";
    if (level === 4) return "bg-amber-200 text-amber-950 border-amber-400";
    return "bg-rose-600 text-white border-rose-700";
  }
  if (level <= 1) return "bg-emerald-500/30 text-emerald-100 border-emerald-400/50";
  if (level === 2) return "bg-emerald-500/20 text-emerald-100 border-emerald-400/40";
  if (level === 3) return "bg-slate-500/30 text-slate-100 border-slate-400/40";
  if (level === 4) return "bg-amber-500/25 text-amber-100 border-amber-400/40";
  return "bg-rose-500/30 text-rose-100 border-rose-400/50";
}

export type CardPalette = {
  plate: string;
  name: string;
  xpts: string;
  price: string;
  badgeC: string;
  badgeVC: string;
  icon: string;
  empty: string;
  blankPill: string;
  dotBlank: string;
};

/** Klasy z hexów tokenów motywu. Literały zostają w `components/`, żeby Tailwind je wygenerował. */
export function plannerCardPalette(themeId: StatsLabChartThemeId): CardPalette {
  if (themeId === "ANALYST_LIGHT") {
    return {
      plate: "border border-slate-300 bg-[#ffffff]/95 text-[#0f172a]",
      name: "text-[#0f172a]",
      xpts: "text-[#0f766e]",
      price: "text-[#334155]",
      badgeC: "bg-[#f59e0b] text-[#1c1917]",
      badgeVC: "bg-[#1e293b] text-[#ffffff]",
      icon: "border-0 bg-white/80 text-slate-900",
      empty: "text-[#0f172a]",
      blankPill: "bg-[#cbd5e1] text-[#1e293b]",
      dotBlank: "bg-slate-500",
    };
  }
  if (themeId === "SCOUT_DARK") {
    return {
      plate: "border border-teal-900/70 bg-[#122a3a]/95 text-[#f0fdfa]",
      name: "text-[#f0fdfa]",
      xpts: "text-[#f59e0b]",
      price: "text-[#94a3b8]",
      badgeC: "bg-[#f59e0b] text-[#1c1917]",
      badgeVC: "bg-[#e2e8f0] text-[#0f172a]",
      icon: "border-0 bg-slate-950/80 text-slate-100",
      empty: "text-[#f0fdfa]",
      blankPill: "bg-[#334155] text-[#e2e8f0]",
      dotBlank: "bg-slate-500",
    };
  }
  return {
    plate: "border border-slate-800 bg-[#0c1322]/95 text-[#f8fafc]",
    name: "text-[#f8fafc]",
    xpts: "text-[#39FF14]",
    price: "text-[#94a3b8]",
    badgeC: "bg-[#f59e0b] text-[#1c1917]",
    badgeVC: "bg-[#e2e8f0] text-[#0f172a]",
    icon: "border-0 bg-slate-950/80 text-slate-100",
    empty: "text-[#e2e8f0]",
    blankPill: "bg-[#334155] text-[#e2e8f0]",
    dotBlank: "bg-slate-500",
  };
}
