"use client";

import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import type { PlayerGwProjection } from "@/lib/stats-lab/plannerEngine";
import { ptTip } from "@/lib/stats-lab/plannerI18n";
import {
  FIXTURE_PILL_CLASS,
  formatFixturePills,
} from "@/lib/stats-lab/plannerFixtureUi";

export function PlannerFixturePills({
  lang,
  proj,
  isLight,
  fdrClass,
  className = "",
  blankClass,
}: {
  lang: StatsLabLang;
  proj: PlayerGwProjection | null | undefined;
  isLight: boolean;
  fdrClass: (level: number, isLight: boolean) => string;
  className?: string;
  blankClass?: string;
}) {
  const pills = formatFixturePills(lang, proj);
  const venueTip = ptTip(lang, "planner.fixture.venueTip");
  const muted =
    blankClass ??
    (isLight
      ? "border-slate-300 bg-slate-100 text-slate-600"
      : "border-slate-600 bg-slate-800 text-slate-300");

  return (
    <div
      data-testid="fixture-pills-row"
      className={`inline-flex flex-nowrap items-center justify-center gap-0.5 whitespace-nowrap ${className}`}
    >
      {pills.map((pill, idx) => (
        <span
          key={`${pill.kind}-${pill.label}-${idx}`}
          title={pill.kind === "match" ? venueTip : undefined}
          className={`${FIXTURE_PILL_CLASS} ${
            pill.kind === "match" ? fdrClass(pill.fdrLevel, isLight) : muted
          }`}
        >
          {pill.label}
        </span>
      ))}
    </div>
  );
}
