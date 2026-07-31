import { useMemo } from "react";
import type { Player } from "@arena/types/player";
import { playerDisplayName } from "@arena/lib/playerDisplay";
import type { PlayerSeasonHistoryMap } from "@arena/types/seasonHistory";
import { TeamCrest } from "@arena/components/branding";

export const ElitePanel = ({
  players,
  seasonHistory,
}: {
  players: Player[];
  seasonHistory: PlayerSeasonHistoryMap;
}) => {
  const rows = useMemo(
    () =>
      players
        .map((p) => {
          const h = seasonHistory[String(p.id)];
          return {
            player: p,
            avgVsTop10k: h?.avgVsTop10k ?? null,
            weeksAbove: h?.weeksAboveTop10k ?? null,
            weeksBelow: h?.weeksBelowTop10k ?? null,
            bestGwRank: h?.bestGwRank ?? null,
          };
        })
        .sort((a, b) => (b.avgVsTop10k ?? -999) - (a.avgVsTop10k ?? -999)),
    [players, seasonHistory]
  );

  const withData = rows.filter((r) => r.avgVsTop10k != null);
  const eliteCount = withData.filter((r) => (r.avgVsTop10k ?? 0) > 0).length;

  return (
    <div className="space-y-6">
      <div className="glass-panel panel-pad rounded-2xl border border-blue-500/25 bg-blue-500/5">
        <p className="text-fluid-sm text-slate-300 leading-relaxed">
          Porównanie z <strong className="text-blue-300">globalną elitą FPL (Top 10k)</strong> — niezależne od
          ligi H2H. Możesz mieć wysokie miejsce w Arenie przy słabszym wyniku vs świat, i odwrotnie.
        </p>
        <p className="text-fluid-sm text-slate-400 mt-2">
          {eliteCount} z {withData.length} menedżerów miało średnią powyżej Top 10k w sezonie.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-fluid-sm text-left">
          <thead>
            <tr className="bg-slate-900/80 text-slate-400 uppercase text-xs">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3 min-w-[14rem]">Menedżer</th>
              <th className="px-4 py-3">H2H</th>
              <th className="px-4 py-3">Śr. vs Top10k</th>
              <th className="px-4 py-3">GW &gt; elity</th>
              <th className="px-4 py-3">GW &lt; elity</th>
              <th className="px-4 py-3">Best rank GW</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((r, i) => {
              const isElite = (r.avgVsTop10k ?? 0) > 0;
              return (
                <tr
                  key={r.player.id}
                  className={`hover:bg-slate-900/40 ${isElite ? "bg-blue-500/[0.06]" : ""}`}
                >
                  <td className="px-4 py-3 text-slate-500 font-mono align-middle">{i + 1}</td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-3 min-w-0">
                      <TeamCrest fplId={r.player.id} size="lg" className="shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-white break-words leading-snug">{r.player.team}</p>
                        <p className="text-xs text-slate-500 break-words mt-0.5">{playerDisplayName(r.player)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300 align-middle">#{r.player.rank}</td>
                  <td
                    className={`px-4 py-3 font-mono font-bold align-middle ${
                      (r.avgVsTop10k ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {r.avgVsTop10k != null ? `${r.avgVsTop10k > 0 ? "+" : ""}${r.avgVsTop10k}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-emerald-400/90 align-middle">{r.weeksAbove ?? "—"}</td>
                  <td className="px-4 py-3 text-red-400/90 align-middle">{r.weeksBelow ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-slate-300 align-middle">
                    {r.bestGwRank != null ? `#${r.bestGwRank.toLocaleString("pl-PL")}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
