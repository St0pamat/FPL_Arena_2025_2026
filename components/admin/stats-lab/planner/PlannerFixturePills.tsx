"use client";

import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import type { PlayerGwProjection } from "@/lib/stats-lab/plannerEngine";
import { pt, ptTip } from "@/lib/stats-lab/plannerI18n";
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
  /** Karta U6: wąskie pigułki, BGW jako „—”. */
  compact = false,
}: {
  lang: StatsLabLang;
  proj: PlayerGwProjection | null | undefined;
  isLight: boolean;
  fdrClass: (level: number, isLight: boolean) => string;
  className?: string;
  blankClass?: string;
  compact?: boolean;
}) {
  const pills = formatFixturePills(lang, proj);
  const venueTip = ptTip(lang, "planner.fixture.venueTip");
  const muted =
    blankClass ??
    (isLight
      ? "border-slate-300 bg-slate-100 text-slate-600"
      : "border-slate-600 bg-slate-800 text-slate-300");
  const matchCount = pills.filter((pill) => pill.kind === "match").length;
  const rowClass = compact
    ? `ppc-pills inline-flex max-w-full flex-nowrap items-center justify-center whitespace-nowrap ${
        matchCount > 1 ? "ppc-pills-dgw" : ""
      }`
    : "inline-flex flex-nowrap items-center justify-center gap-0.5 whitespace-nowrap";

  return (
    <div
      data-testid="fixture-pills-row"
      data-dgw={matchCount > 1 ? "1" : "0"}
      className={`${rowClass} ${className}`}
    >
      {pills.map((pill, idx) => {
        const text =
          compact && pill.kind !== "match"
            ? pt(lang, "planner.fixture.blankMark")
            : pill.label;
        return (
          <span
            key={`${pill.kind}-${pill.label}-${idx}`}
            data-kind={pill.kind}
            title={pill.kind === "match" ? venueTip : pill.label}
            className={`${compact ? "ppc-pill" : FIXTURE_PILL_CLASS} ${
              pill.kind === "match" ? fdrClass(pill.fdrLevel, isLight) : muted
            }`}
          >
            {text}
          </span>
        );
      })}
    </div>
  );
}
