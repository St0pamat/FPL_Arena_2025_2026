import { useMemo } from "react";
import type { Player } from "@/types/player";
import type { GladiatorOrMap } from "@/types/or";
import { PLAYER_BY_ID } from "@/config/playersIndex";
import { TeamBrand } from "@/components/branding";
import { PageContainer, PageHeader } from "@/components/layout";
import {
  buildPredictedStandings,
  formatOrDisplay,
  getPlayerOrBundle,
  orTierLabel,
} from "@/features/profiles/lib/or";
import {
  buildPredictionComment,
  getOutcomeLabel,
  getPredictionOutcome,
} from "@/features/prognoza/lib/predictionCommentary";
import { PredictionTopCard } from "@/features/prognoza/components/PredictionTopCard";

const PredictionStatCell = ({
  label,
  value,
  sub,
  valueClassName = "text-white",
  highlightClassName = "",
}: {
  label: string;
  value: string;
  sub?: string;
  valueClassName?: string;
  highlightClassName?: string;
}) => (
  <div
    className={`rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-3 flex flex-col items-center justify-center text-center min-h-[5.75rem] h-full ${highlightClassName}`}
  >
    <div className="kpi-label mb-2 w-full">{label}</div>
    <div className={`font-mono font-bold text-fluid-lg leading-none tabular-nums ${valueClassName}`}>
      {value}
    </div>
    <div className="text-[10px] text-slate-500 mt-2 uppercase tracking-wide leading-tight min-h-[2.25rem] flex items-start justify-center w-full">
      {sub || "\u00a0"}
    </div>
  </div>
);

export const PrognozaView = ({
  players,
  gladiatorOr,
  embedded = false,
}: {
  players: Player[];
  gladiatorOr: GladiatorOrMap;
  embedded?: boolean;
}) => {
  const predictedStandings = useMemo(
    () => buildPredictedStandings(players, gladiatorOr),
    [players, gladiatorOr]
  );

  const topFive = useMemo(
    () => predictedStandings.filter((e) => !e.isDebut).slice(0, 5),
    [predictedStandings]
  );

  const summary = useMemo(() => {
    let beat = 0;
    let miss = 0;
    let close = 0;
    let best: { player: Player; delta: number } | null = null;
    let worst: { player: Player; delta: number } | null = null;

    predictedStandings.forEach((entry) => {
      const player = PLAYER_BY_ID[entry.id];
      if (!player || entry.predictedRank == null || entry.isDebut) return;
      const delta = entry.predictedRank - player.rank;
      const outcome = getPredictionOutcome(player, entry);
      if (outcome === "beat" || outcome === "smash") beat += 1;
      else if (outcome === "miss" || outcome === "disaster") miss += 1;
      else close += 1;
      if (!best || delta > best.delta) best = { player, delta };
      if (!worst || delta < worst.delta) worst = { player, delta };
    });

    return { beat, miss, close, best, worst };
  }, [predictedStandings]);

  const favorite = topFive[0] ?? null;

  const body = (
    <>
      <PageHeader
        title="Prognoza przed sezonem"
        lead="Kto miał mocne OR z przeszłości, kto miał pecha — porównanie typów przed GW1 (wg najlepszego historycznego OR) z rzeczywistą tabelą H2H po 38 kolejkach."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8 lg:mb-10">
        {[
          {
            label: "Powyżej prognozy",
            value: summary.beat,
            sub: "min. +3 miejsca vs typ",
            cls: "text-emerald-400 border-emerald-500/30",
          },
          {
            label: "Poniżej prognozy",
            value: summary.miss,
            sub: "min. −3 miejsca vs typ",
            cls: "text-red-400 border-red-500/30",
          },
          {
            label: "W tolerancji",
            value: summary.close,
            sub: "±2 miejsca od typu",
            cls: "text-slate-300 border-slate-600",
          },
          {
            label: "Faworyt przed GW1",
            value: favorite?.team ?? "—",
            sub: favorite?.historicalOr
              ? `OR ${formatOrDisplay(favorite.historicalOr)}`
              : "Brak danych",
            cls: "text-amber-300 border-amber-500/30",
            small: true,
          },
        ].map(({ label, value, sub, cls, small }) => (
          <div key={label} className={`kpi-card border ${cls}`}>
            <div className="kpi-label">{label}</div>
            <div className={`mt-2 font-athletic font-bold text-white ${small ? "text-fluid-lg leading-snug break-words" : "text-kpi"}`}>
              {value}
            </div>
            <div className="text-fluid-xs text-slate-500 mt-2">{sub}</div>
          </div>
        ))}
      </div>

      {(summary.best || summary.worst) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 lg:mb-10">
          {summary.best && summary.best.delta > 0 && (
            <div className="glass-panel panel-pad rounded-2xl border border-emerald-500/25 bg-emerald-500/5">
              <div className="kpi-label text-emerald-400 mb-2">Największe przebicie prognozy</div>
              <p className="text-fluid-sm text-slate-200 leading-relaxed">
                <strong className="text-white">{summary.best.player.team}</strong> — typowano #
                {predictedStandings.find((e) => e.id === summary.best!.player.id)?.predictedRank}, finał #
                {summary.best.player.rank}{" "}
                <span className="text-emerald-400 font-mono font-bold">
                  (+{summary.best.delta} miejsca)
                </span>
              </p>
            </div>
          )}
          {summary.worst && summary.worst.delta < 0 && (
            <div className="glass-panel panel-pad rounded-2xl border border-red-500/25 bg-red-500/5">
              <div className="kpi-label text-red-400 mb-2">Największe rozczarowanie faworyta</div>
              <p className="text-fluid-sm text-slate-200 leading-relaxed">
                <strong className="text-white">{summary.worst.player.team}</strong> — typowano #
                {predictedStandings.find((e) => e.id === summary.worst!.player.id)?.predictedRank}, finał #
                {summary.worst.player.rank}{" "}
                <span className="text-red-400 font-mono font-bold">
                  ({summary.worst.delta} miejsca)
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      <section className="mb-10 lg:mb-12">
        <h3 className="text-fluid-xl font-athletic font-bold text-white uppercase tracking-wide mb-2">
          Top 5 przed sezonem
        </h3>
        <p className="text-fluid-sm text-slate-400 mb-6 max-w-3xl leading-relaxed">
          Pięciu menedżerów z najlepszym historycznym OR w Akta — tak wyglądała elita przed pierwszą kolejką.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-5 lg:gap-6">
          {topFive.map((entry, idx) => {
            const player = PLAYER_BY_ID[entry.id];
            if (!player) return null;
            const orBundle = getPlayerOrBundle(player.id, gladiatorOr, null);
            return (
              <PredictionTopCard
                key={entry.id}
                rank={idx + 1}
                entry={entry}
                player={player}
                orBundle={orBundle}
              />
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="text-fluid-xl font-athletic font-bold text-white uppercase tracking-wide mb-2">
          Pełna tabela prognoz — 20 Gladiatorów
        </h3>
        <p className="text-fluid-sm text-slate-400 mb-6 max-w-3xl leading-relaxed">
          Kolejność według typu przed sezonem. Debiutanci bez historycznego OR trafili na koniec listy — bo
          statystyka nie miała na czym pracować.
        </p>

        <div className="space-y-4">
          {predictedStandings.map((entry) => {
            const player = PLAYER_BY_ID[entry.id];
            if (!player) return null;
            const orBundle = getPlayerOrBundle(player.id, gladiatorOr, null);
            const delta = entry.predictedRank != null ? entry.predictedRank - player.rank : null;
            const outcome = getPredictionOutcome(player, entry);
            const comment = buildPredictionComment(player, entry, orBundle);

            const rowBorder =
              outcome === "smash" || outcome === "beat"
                ? "border-emerald-500/25"
                : outcome === "miss" || outcome === "disaster"
                  ? "border-red-500/25"
                  : entry.isDebut
                    ? "border-amber-500/20"
                    : "border-slate-800";

            const deltaClass =
              delta == null
                ? "text-slate-500"
                : delta >= 3
                  ? "text-emerald-400"
                  : delta <= -3
                    ? "text-red-400"
                    : "text-slate-300";

            const deltaHighlight =
              delta == null
                ? ""
                : delta >= 3
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : delta <= -3
                    ? "border-red-500/30 bg-red-500/5"
                    : "";

            const deltaValue =
              delta == null
                ? "—"
                : delta > 0
                  ? `+${delta}`
                  : delta === 0
                    ? "0"
                    : String(delta);

            return (
              <article
                key={entry.id}
                className={`glass-panel rounded-2xl border ${rowBorder} panel-pad grid grid-cols-1 lg:grid-cols-[minmax(0,17rem)_minmax(0,22rem)_1fr] gap-5 lg:gap-6 lg:items-stretch`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 shrink-0 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center font-athletic font-bold text-fluid-lg text-slate-400 tabular-nums">
                    {entry.predictedRank ?? "—"}
                  </div>
                  <TeamBrand
                    player={player}
                    crestSize="md"
                    layout="col"
                    nameClassName="text-fluid-sm font-bold text-white leading-snug"
                    subClassName="text-fluid-xs text-slate-500"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-stretch">
                  <PredictionStatCell
                    label="Hist. OR"
                    value={entry.isDebut ? "Debiut" : formatOrDisplay(entry.historicalOr)}
                    sub={
                      entry.isDebut
                        ? "brak historii"
                        : entry.historicalOr != null
                          ? orTierLabel(entry.historicalOr)
                          : "—"
                    }
                    valueClassName="text-blue-300 text-fluid-sm"
                  />
                  <PredictionStatCell
                    label="Typ"
                    value={`#${entry.predictedRank ?? "—"}`}
                    sub="przed GW1"
                  />
                  <PredictionStatCell
                    label="Finał H2H"
                    value={`#${player.rank}`}
                    sub="po 38 GW"
                    valueClassName="text-emerald-400"
                  />
                  <PredictionStatCell
                    label="Różnica"
                    value={deltaValue}
                    sub={delta != null && delta !== 0 ? "miejsc vs typ" : "vs typ"}
                    valueClassName={deltaClass}
                    highlightClassName={deltaHighlight}
                  />
                </div>

                <div className="flex flex-col justify-center min-w-0 border-t border-slate-800/80 pt-4 lg:border-t-0 lg:pt-0 lg:pl-2">
                  <span className="text-fluid-xs font-mono uppercase tracking-wider text-slate-500 mb-2 block">
                    {getOutcomeLabel(outcome)}
                  </span>
                  <p className="text-fluid-sm text-slate-300 leading-relaxed italic">{comment}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );

  if (embedded) return body;
  return <PageContainer width="full">{body}</PageContainer>;
};
