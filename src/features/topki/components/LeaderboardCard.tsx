import { useState } from "react";
import type { LeaderboardBadge, LeaderboardResult } from "../types";
import { LeaderboardEntryCell } from "./LeaderboardEntryCell";

const BADGE_STYLES: Record<LeaderboardBadge, string> = {
  Pozytywna: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Negatywna: "bg-red-500/15 text-red-400 border-red-500/30",
  Ciekawostka: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  Strategia: "bg-blue-500/15 text-blue-300 border-blue-500/30",
};

const TOP_PREVIEW = 3;

export const LeaderboardCard = ({ board }: { board: LeaderboardResult }) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? board.entries : board.entries.slice(0, TOP_PREVIEW);

  return (
    <article className="glass-panel rounded-2xl border border-slate-800 panel-pad flex flex-col gap-5 shadow-lg h-full">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-base md:text-lg font-bold text-white font-athletic uppercase tracking-wide leading-snug">
            {board.title}
          </h4>
          <p className="text-sm md:text-base text-slate-400 mt-1.5 leading-relaxed">{board.description}</p>
        </div>
        <span
          className={`text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border shrink-0 ${BADGE_STYLES[board.badge]}`}
        >
          {board.badge}
        </span>
      </div>

      <div className="flex flex-col gap-0 divide-y divide-slate-800/70">
        {visible.map((entry, idx) => {
          const pos = idx + 1;
          const medal =
            pos === 1 ? "text-yellow-400" : pos === 2 ? "text-slate-300" : pos === 3 ? "text-amber-600" : "text-slate-500";
          return (
            <div
              key={`${board.id}-${entry.playerId}-${entry.details}-${pos}`}
              className="flex gap-3 sm:gap-4 py-4 first:pt-0"
            >
              <div className={`font-athletic font-bold text-lg md:text-xl shrink-0 w-7 sm:w-8 pt-0.5 ${medal}`}>
                {pos}
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="flex-1 min-w-0">
                  <LeaderboardEntryCell entry={entry} />
                </div>
                <div className="shrink-0 sm:text-right sm:max-w-[9rem] lg:max-w-[10rem]">
                  <div className="font-mono font-bold text-emerald-400 text-base md:text-lg leading-tight">
                    {entry.value}
                  </div>
                  {entry.details && entry.details !== "—" && (
                    <div className="text-sm text-slate-400 leading-snug mt-0.5 break-words">{entry.details}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {board.entries.length > TOP_PREVIEW && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-sm md:text-base text-emerald-400 hover:text-emerald-300 font-semibold text-left transition-colors mt-auto pt-1"
        >
          {expanded ? "Pokaż Top 3" : `Pokaż pełen ranking (${board.entries.length})`}
        </button>
      )}
    </article>
  );
};
