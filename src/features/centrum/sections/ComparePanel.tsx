import { useMemo, useState } from "react";
import type { Player } from "@/types/player";
import type { PlayerHighlightsMap } from "@/types/highlights";
import type { PlayerSeasonHistoryMap } from "@/types/seasonHistory";
import type { GwMatchesBlock } from "@/types/match";
import type { GladiatorOrMap } from "@/types/or";
import { comparePlayers } from "@/features/centrum/lib/comparePlayers";
import { formatOrDisplay } from "@/features/profiles/lib/or";
import { TeamCrest } from "@/components/branding";

export const ComparePanel = ({
  players,
  matchesByGw,
  highlights,
  seasonHistory,
  gladiatorOr,
}: {
  players: Player[];
  matchesByGw: GwMatchesBlock[];
  highlights: PlayerHighlightsMap;
  seasonHistory: PlayerSeasonHistoryMap;
  gladiatorOr: GladiatorOrMap;
}) => {
  const [idA, setIdA] = useState(players[0]?.id ?? 0);
  const [idB, setIdB] = useState(players[1]?.id ?? 0);

  const result = useMemo(
    () => comparePlayers(idA, idB, players, matchesByGw, highlights, seasonHistory, gladiatorOr),
    [idA, idB, players, matchesByGw, highlights, seasonHistory, gladiatorOr]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: "Gracz A", value: idA, set: setIdA },
          { label: "Gracz B", value: idB, set: setIdB },
        ].map(({ label, value, set }) => (
          <label key={label} className="glass-panel panel-pad rounded-xl border border-slate-800 block">
            <span className="kpi-label block mb-2">{label}</span>
            <select
              value={value}
              onChange={(e) => set(Number(e.target.value))}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white"
            >
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.team}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="glass-panel panel-pad rounded-2xl border border-emerald-500/30 text-center">
              <TeamCrest fplId={result.playerA.id} size="lg" className="mx-auto mb-3" />
              <p className="font-bold text-white text-fluid-lg break-words">{result.playerA.team}</p>
              <p className="text-3xl font-athletic text-emerald-400 mt-2">{result.record.winsA}</p>
              <p className="text-xs text-slate-500 uppercase">wygrane H2H</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-slate-400">{result.record.draws}</p>
              <p className="kpi-label">remisy</p>
              <p className="text-fluid-sm text-slate-500 mt-4">
                Bilans FPL w meczach: {result.fplWinsInDirect.a}–{result.fplWinsInDirect.draws}–
                {result.fplWinsInDirect.b}
              </p>
            </div>
            <div className="glass-panel panel-pad rounded-2xl border border-blue-500/30 text-center">
              <TeamCrest fplId={result.playerB.id} size="lg" className="mx-auto mb-3" />
              <p className="font-bold text-white text-fluid-lg break-words">{result.playerB.team}</p>
              <p className="text-3xl font-athletic text-blue-400 mt-2">{result.record.winsB}</p>
              <p className="text-xs text-slate-500 uppercase">wygrane H2H</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { p: result.playerA, or: result.orA, avg: result.avgVsTop10kA, score: result.totalFplA },
              { p: result.playerB, or: result.orB, avg: result.avgVsTop10kB, score: result.totalFplB },
            ].map(({ p, or, avg, score }) => (
              <div key={p.id} className="glass-panel panel-pad rounded-xl border border-slate-800">
                <p className="font-semibold text-white mb-3">{p.team}</p>
                <dl className="space-y-2 text-fluid-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Score sezonu</dt>
                    <dd className="font-mono text-white">{score}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">OR po sezonie</dt>
                    <dd className="font-mono text-emerald-400">{formatOrDisplay(or.season)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Historyczne OR</dt>
                    <dd className="font-mono text-slate-300">{formatOrDisplay(or.historical)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Śr. vs Top 10k</dt>
                    <dd className="font-mono text-amber-400">
                      {avg != null ? `${avg > 0 ? "+" : ""}${avg} pkt/GW` : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-3 bg-slate-900/60 kpi-label uppercase text-slate-500">
              Bezpośrednie mecze ({result.directMatches.length})
            </div>
            <div className="divide-y divide-slate-800 max-h-80 overflow-y-auto">
              {result.directMatches.map((m) => (
                <div key={m.gw} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-fluid-sm">
                  <span className="font-mono text-slate-500">GW{m.gw}</span>
                  <span className={m.outcome === "A" ? "text-emerald-400 font-bold" : "text-slate-300"}>
                    {m.scoreA}
                  </span>
                  <span className="text-slate-600">:</span>
                  <span className={m.outcome === "B" ? "text-blue-400 font-bold" : "text-slate-300"}>
                    {m.scoreB}
                  </span>
                  <span className="text-xs text-slate-500">
                    {m.outcome === "A" ? "→ A" : m.outcome === "B" ? "→ B" : "remis"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
