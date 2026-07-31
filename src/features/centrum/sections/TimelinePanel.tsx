import { useMemo, type ReactNode } from "react";
import type { GwMatchesBlock } from "@arena/types/match";
import type { PlayerHighlightsMap } from "@arena/types/highlights";
import { buildSeasonTimeline } from "@arena/features/centrum/lib/seasonTimeline";
import type { TimelinePerson } from "@arena/features/centrum/lib/seasonTimeline";
import { TeamCrest } from "@arena/components/branding";

const TimelineTile = ({
  label,
  person,
  value,
  valueClass = "text-white",
}: {
  label: string;
  person: TimelinePerson;
  value?: ReactNode;
  valueClass?: string;
}) => (
  <div className="rounded-xl bg-slate-950/60 border border-slate-800/90 p-3 flex flex-col">
    <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">{label}</p>
    {person.team === "—" ? (
      <p className="text-slate-500 text-sm">—</p>
    ) : (
      <div className="flex items-start gap-2.5 min-w-0">
        {person.playerId && <TeamCrest fplId={person.playerId} size="md" className="shrink-0" />}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white text-sm leading-snug break-words">{person.team}</p>
          {person.manager && (
            <p className="text-[11px] text-slate-500 mt-0.5 break-words leading-snug">{person.manager}</p>
          )}
          {value != null && (
            <p className={`text-xs font-semibold mt-1 ${valueClass}`}>{value}</p>
          )}
        </div>
      </div>
    )}
  </div>
);

export const TimelinePanel = ({
  matchesByGw,
  highlights,
  loading,
}: {
  matchesByGw: GwMatchesBlock[];
  highlights: PlayerHighlightsMap;
  loading: boolean;
}) => {
  const timeline = useMemo(
    () => (loading ? [] : buildSeasonTimeline(matchesByGw, highlights)),
    [matchesByGw, highlights, loading]
  );

  if (loading) {
    return <p className="text-slate-400">Ładowanie osi czasu…</p>;
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-emerald-500/30 hidden sm:block" aria-hidden />
      <div className="space-y-3">
        {timeline.map((entry) => (
          <div
            key={entry.gw}
            className="glass-panel panel-pad rounded-xl border border-slate-800 sm:ml-10 relative"
          >
            <span className="hidden sm:flex absolute -left-[2.35rem] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/50 items-center justify-center text-xs font-bold text-emerald-400">
              {entry.gw}
            </span>
            <div className="flex flex-wrap items-baseline gap-2 mb-4">
              <span className="sm:hidden font-mono text-emerald-400 font-bold">GW{entry.gw}</span>
              <span className="kpi-label text-slate-500">Kolejka {entry.gw}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <TimelineTile label="Lider tabeli H2H" person={entry.tableLeader} />
              <TimelineTile
                label="Król punktów w lidze"
                person={entry.topScorer}
                value={`${entry.topScorer.points} pkt`}
                valueClass="text-amber-400"
              />
              <TimelineTile
                label="Największy hit"
                person={entry.maxHit ?? { playerId: null, team: "—", manager: "" }}
                value={entry.maxHit ? `−${entry.maxHit.hit} pkt` : undefined}
                valueClass="text-red-400"
              />
              <div className="rounded-xl bg-slate-950/60 border border-slate-800/90 p-3 flex flex-col">
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Chipy</p>
                {entry.chips.length === 0 ? (
                  <p className="text-slate-500 text-sm">—</p>
                ) : (
                  <ul className="space-y-1.5 text-sm leading-snug">
                    {entry.chips.map((c) => (
                      <li key={`${c.playerId}-${c.label}`} className="text-violet-300 break-words">
                        <span className="font-semibold text-violet-200">{c.team}</span>
                        <span className="text-violet-400/90"> · {c.label} · {c.points} pkt</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
