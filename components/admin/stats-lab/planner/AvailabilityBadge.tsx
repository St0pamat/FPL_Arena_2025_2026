"use client";

import {
  availabilityMarkerLabel,
  buildAvailabilityDetail,
  type AvailabilityInput,
  type AvailabilityMarker,
} from "@/lib/stats-lab/availabilityMarker";
import type { StatsLabLang } from "@/lib/stats-lab/i18n";

const TONE_CLASS: Record<AvailabilityMarker["tone"], string> = {
  yellow: "border-amber-700 bg-amber-300 text-slate-950",
  orange: "border-orange-700 bg-orange-400 text-slate-950",
  red: "border-rose-800 bg-rose-600 text-amber-50",
  muted: "border-slate-500 bg-slate-400 text-slate-950",
};

export function AvailabilityBadge({
  marker,
  lang,
  compact = false,
}: {
  marker: AvailabilityMarker;
  lang: StatsLabLang;
  compact?: boolean;
}) {
  if (!marker.visible) return null;
  const label = availabilityMarkerLabel(lang, marker);
  return (
    <span
      data-testid="availability-marker"
      data-availability-tone={marker.tone}
      data-availability-kind={marker.kind}
      title={label}
      aria-label={label}
      role="img"
      className={`inline-flex items-center justify-center rounded-full border font-black leading-none ${TONE_CLASS[marker.tone]} ${
        compact
          ? "h-4 min-w-4 px-0.5 text-[8px]"
          : "h-5 min-w-5 px-1 text-[9px]"
      }`}
    >
      {marker.badge}
    </span>
  );
}

export function AvailabilityDetail({
  input,
  lang,
  mutedClass,
  textClass,
}: {
  input: AvailabilityInput;
  lang: StatsLabLang;
  mutedClass: string;
  textClass: string;
}) {
  const lines = buildAvailabilityDetail(lang, input);
  return (
    <dl
      data-testid="availability-detail"
      className="mt-2 space-y-1.5"
    >
      {lines.map((line) => (
        <div key={line.id}>
          <dt className={`text-[10px] font-black uppercase ${mutedClass}`}>
            {line.label}
          </dt>
          <dd className={`text-xs font-semibold ${textClass}`} title={line.hint}>
            {line.value}
          </dd>
          {line.hint ? (
            <p className={`text-[10px] leading-snug ${mutedClass}`}>{line.hint}</p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
