import type { PlayerSeasonHistory } from "@arena/types/seasonHistory";
import { StatPill } from "@arena/components/ui";

const fmtRank = (n: number | null | undefined) =>
  n != null ? n.toLocaleString("pl-PL") : "—";

const fmtSigned = (n: number | null | undefined, suffix = "") => {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}${suffix}`;
};

export const FplElitePanel = ({ history }: { history: PlayerSeasonHistory | null }) => {
  if (!history || (history.avgVsTop10k == null && !history.mostStarted?.name)) return null;

  const started = history.mostStarted;
  const benched = history.mostBenchedPlayer;

  return (
    <div className="glass-panel panel-pad rounded-3xl border border-slate-800 space-y-5">
      <div className="border-b border-slate-800/60 pb-4">
        <h4 className="kpi-label">Sezon w światowym FPL</h4>
        <p className="text-fluid-xs text-slate-500 mt-2 leading-relaxed">
          Porównanie z elitą (Top 10k) i globalnymi rankami — dane z eksportu sezonu menedżera,
          niezależne od ligi H2H Areny.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {history.avgVsTop10k != null && (
          <StatPill
            label="Średnio vs Top 10k"
            value={fmtSigned(history.avgVsTop10k, " pkt")}
            sub="na kolejkę"
            tone={history.avgVsTop10k >= 0 ? "good" : "bad"}
          />
        )}
        {history.weeksAboveTop10k != null && (
          <StatPill
            label="Kolejki powyżej elity"
            value={history.weeksAboveTop10k}
            sub={`z ${(history.weeksAboveTop10k ?? 0) + (history.weeksBelowTop10k ?? 0) + (history.weeksEqualTop10k ?? 0)}`}
            tone="good"
          />
        )}
        {history.weeksBelowTop10k != null && history.weeksBelowTop10k > 0 && (
          <StatPill
            label="Kolejki poniżej elity"
            value={history.weeksBelowTop10k}
            sub="vs Top 10k"
            tone="warn"
          />
        )}
        {history.bestGwRank != null && (
          <StatPill
            label="Najlepszy rank w GW"
            value={`#${fmtRank(history.bestGwRank)}`}
            sub="globalnie w jednej kolejce"
            tone="info"
          />
        )}
        {history.peakTeamValue != null && (
          <StatPill
            label="Szczyt wartości drużyny"
            value={`${history.peakTeamValue.toFixed(1)}`}
            sub="mln £"
            tone="neutral"
          />
        )}
      </div>

      {(started?.name || benched?.name) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {started?.name && (
            <div className="kpi-card !p-4">
              <span className="kpi-label text-emerald-400 block">Najczęściej w XI</span>
              <span className="text-fluid-base font-bold text-white mt-2 block break-words">
                {started.name}
              </span>
              {started.count != null && (
                <span className="text-fluid-xs text-slate-500 mt-1 block">{started.count} kolejek w składzie</span>
              )}
            </div>
          )}
          {benched?.name && (
            <div className="kpi-card !p-4">
              <span className="kpi-label text-amber-400 block">Najczęściej na ławce</span>
              <span className="text-fluid-base font-bold text-white mt-2 block break-words">
                {benched.name}
              </span>
              {benched.count != null && (
                <span className="text-fluid-xs text-slate-500 mt-1 block">{benched.count} kolejek poza XI</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
