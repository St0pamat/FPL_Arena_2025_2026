"use client";

import type { ReactNode } from "react";
import type { StatsLabChartThemeId } from "@/components/admin/stats-lab/chartTheme";
import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import { METRIC_NAME_COPY } from "@/lib/stats-lab/metricNameMode";
import {
  shellNavChipClass,
  shellNavChipGroupClass,
} from "@/lib/stats-lab/shellNavChrome";
import {
  MetricNameContext,
  useMetricNameMode,
} from "@/components/admin/stats-lab/metricNameModeContext";

export function MetricNameModeProvider({ children }: { children: ReactNode }) {
  const state = useMetricNameMode();
  return (
    <MetricNameContext.Provider value={state}>{children}</MetricNameContext.Provider>
  );
}

export function MetricNameToggle({
  lang,
  themeId,
}: {
  lang: StatsLabLang;
  themeId: StatsLabChartThemeId;
}) {
  const { mode, setMode } = useMetricNameMode();
  const copy = METRIC_NAME_COPY[lang];
  return (
    <div
      className={shellNavChipGroupClass(themeId)}
      role="group"
      aria-label={copy.group}
      data-testid="metric-name-toggle"
    >
      <span className="inline-flex min-h-11 items-center px-1.5 text-[10px] font-black uppercase">
        {copy.group}
      </span>
      <button
        type="button"
        aria-pressed={mode === "descriptive"}
        onClick={() => setMode("descriptive")}
        className={shellNavChipClass(mode === "descriptive", themeId)}
      >
        {copy.descriptive}
      </button>
      <button
        type="button"
        aria-pressed={mode === "abbrev"}
        onClick={() => setMode("abbrev")}
        className={shellNavChipClass(mode === "abbrev", themeId)}
      >
        {copy.abbrev}
      </button>
    </div>
  );
}
