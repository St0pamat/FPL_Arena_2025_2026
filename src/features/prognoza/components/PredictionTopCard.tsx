import type { Player } from "@arena/types/player";
import type { PredictedStandingEntry } from "@arena/features/profiles/lib/or";
import { TeamBrand } from "@arena/components/branding";
import { formatOrDisplay } from "@arena/features/profiles/lib/or";
import {
  buildPredictionComment,
  getOutcomeLabel,
  getPredictionOutcome,
} from "@arena/features/prognoza/lib/predictionCommentary";
import type { OrBundle } from "@arena/features/profiles/lib/or";

const MEDAL = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"] as const;

export const PredictionTopCard = ({
  rank,
  entry,
  player,
  orBundle,
}: {
  rank: number;
  entry: PredictedStandingEntry;
  player: Player;
  orBundle: OrBundle;
}) => {
  const delta = entry.predictedRank != null ? entry.predictedRank - player.rank : null;
  const outcome = getPredictionOutcome(player, entry);
  const comment = buildPredictionComment(player, entry, orBundle);

  const deltaClass =
    delta == null
      ? "text-slate-400"
      : delta >= 3
        ? "text-emerald-400"
        : delta <= -3
          ? "text-red-400"
          : "text-slate-300";

  return (
    <article className="glass-panel rounded-2xl border border-slate-800 border-t-4 border-t-amber-400/80 panel-pad flex flex-col gap-4 h-full">
      <div className="flex items-start justify-between gap-3">
        <span className="text-3xl leading-none" aria-hidden>
          {MEDAL[rank - 1] ?? `#${rank}`}
        </span>
        <span className="kpi-label text-amber-400/90 shrink-0">Prognoza #{entry.predictedRank}</span>
      </div>

      <TeamBrand
        player={player}
        crestSize="lg"
        layout="col"
        nameClassName="text-fluid-lg font-athletic text-white"
        subClassName="text-fluid-sm text-slate-400"
      />

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-950/60 border border-slate-800 px-2 py-2.5">
          <div className="kpi-label mb-1">Hist. OR</div>
          <div className="text-fluid-sm font-mono font-bold text-blue-300">
            {entry.historicalOr != null ? formatOrDisplay(entry.historicalOr) : "—"}
          </div>
        </div>
        <div className="rounded-xl bg-slate-950/60 border border-slate-800 px-2 py-2.5">
          <div className="kpi-label mb-1">Typ H2H</div>
          <div className="text-fluid-sm font-mono font-bold text-white">#{entry.predictedRank}</div>
        </div>
        <div className="rounded-xl bg-slate-950/60 border border-slate-800 px-2 py-2.5">
          <div className="kpi-label mb-1">Finał</div>
          <div className="text-fluid-sm font-mono font-bold text-emerald-400">#{player.rank}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={`badge-pill border font-mono ${deltaClass} border-current/30 bg-slate-950/50`}>
          {delta == null
            ? "—"
            : delta > 0
              ? `+${delta} vs prognoza`
              : delta < 0
                ? `${delta} vs prognoza`
                : "Trafione"}
        </span>
        <span className="text-fluid-xs text-slate-500">{getOutcomeLabel(outcome)}</span>
      </div>

      <p className="text-fluid-sm text-slate-300 leading-relaxed italic border-l-2 border-amber-500/40 pl-3 flex-1">
        {comment}
      </p>
    </article>
  );
};
