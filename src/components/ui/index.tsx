import type { ReactNode } from "react";

export const StatPill = ({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: "neutral" | "good" | "warn" | "info";
}) => {
  const tones = {
    neutral: "bg-slate-900/80 border-slate-700 text-white",
    good: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
    warn: "bg-yellow-500/15 border-yellow-500/40 text-yellow-300",
    info: "bg-blue-500/15 border-blue-500/40 text-blue-300",
  };
  return (
    <div className={`kpi-card min-w-[8rem] ${tones[tone] || tones.neutral}`}>
      <div className="kpi-label">{label}</div>
      <div className={`mt-1.5 ${tone === "good" ? "kpi-value-accent" : "kpi-value"}`}>{value}</div>
      {sub && <div className="text-fluid-xs text-slate-500 mt-2">{sub}</div>}
    </div>
  );
};

export const InsightCard = ({
  icon,
  title,
  detail,
  badge,
  badgeTone = "good",
}: {
  icon: string;
  title: string;
  detail?: string;
  badge?: string;
  badgeTone?: "good" | "bad" | "neutral";
}) => {
  const badgeClass =
    badgeTone === "good"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      : badgeTone === "bad"
        ? "bg-red-500/20 text-red-300 border-red-500/30"
        : "bg-slate-700/50 text-slate-300 border-slate-600";
  return (
    <div
      className={`rounded-2xl border p-5 lg:p-6 flex gap-4 items-start ${
        badgeTone === "good"
          ? "border-emerald-500/25 bg-emerald-500/5"
          : badgeTone === "bad"
            ? "border-red-500/25 bg-red-500/5"
            : "border-slate-700 bg-slate-900/40"
      }`}
    >
      <span className="text-3xl shrink-0 leading-none" aria-hidden>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-fluid-base font-semibold text-white leading-snug break-words">{title}</div>
        {detail && <div className="text-fluid-sm text-slate-400 mt-2 leading-relaxed">{detail}</div>}
      </div>
      {badge && (
        <span className={`shrink-0 text-fluid-sm font-bold px-3 py-1.5 rounded-lg border ${badgeClass}`}>
          {badge}
        </span>
      )}
    </div>
  );
};

export const EmptyState = ({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "error";
}) => (
  <div
    className={`glass-panel rounded-2xl border panel-pad text-center text-fluid-base ${
      tone === "error"
        ? "border-red-500/30 bg-red-950/20 text-red-300"
        : "border-slate-800 text-slate-400"
    }`}
  >
    {children}
  </div>
);
