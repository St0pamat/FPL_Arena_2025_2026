import { useMemo } from "react";
import type { Player } from "@arena/types/player";
import type { PlayerHighlights } from "@arena/types/highlights";
import type { OrBundle, PredictedStandingEntry } from "@arena/features/profiles/lib/or";
import { buildProfileSeasonStory } from "@arena/features/profiles/lib/profileStory";
import { formatOrDisplay, orTierLabel } from "@arena/features/profiles/lib/or";
import { PLAYER_BY_ID } from "@arena/config/playersIndex";

export const ProfileExpectationsPanel = ({ player, highlights, orBundle, prediction, predictedStandings, preSeasonFavorite }) => {
    const story = useMemo(
        () => buildProfileSeasonStory(player, highlights, orBundle, prediction),
        [player, highlights, orBundle, prediction]
    );
    const delta = prediction?.predictedRank != null ? prediction.predictedRank - player.rank : null;
    const deltaLabel = delta == null
        ? null
        : delta > 0
        ? { text: `+${delta} miejsca vs prognoza`, tone: "good" }
        : delta < 0
        ? { text: `${delta} miejsca vs prognoza`, tone: "bad" }
        : { text: "Trafiona prognoza", tone: "neutral" };

    const topPredicted = predictedStandings.filter((e) => !e.isDebut).slice(0, 5);

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#020617] rounded-2xl border border-blue-500/30 p-4">
                    <div className="kpi-label uppercase tracking-widest text-blue-400 font-mono mb-1">Najlepszy historyczny OR</div>
                    <div className="text-2xl font-athletic font-bold text-white">
                        {orBundle.historicalOr != null ? formatOrDisplay(orBundle.historicalOr) : "Debiut"}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        {orBundle.historicalOrSeason ? `Sezon ${orBundle.historicalOrSeason}` : "Brak wcześniejszej historii w Akta"}
                    </div>
                    {orBundle.historicalOr != null && (
                        <div className="kpi-label text-blue-300/80 mt-2 uppercase">{orTierLabel(orBundle.historicalOr)}</div>
                    )}
                </div>
                <div className="bg-[#020617] rounded-2xl border border-emerald-500/30 p-4">
                    <div className="kpi-label uppercase tracking-widest text-emerald-400 font-mono mb-1">OR po sezonie 2025/26</div>
                    <div className="text-2xl font-athletic font-bold text-emerald-300">
                        {orBundle.seasonOr != null ? formatOrDisplay(orBundle.seasonOr) : "—"}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Ranking ogólny FPL (koniec sezonu)</div>
                    {orBundle.seasonOr != null && (
                        <div className="kpi-label text-emerald-300/80 mt-2 uppercase">{orTierLabel(orBundle.seasonOr)}</div>
                    )}
                </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900/80 to-[#020617] rounded-2xl border border-slate-700 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Prognoza przed sezonem (wg historycznego OR)</span>
                    {deltaLabel && (
                        <span className={`kpi-label font-bold px-2 py-1 rounded-lg border ${
                            deltaLabel.tone === "good"
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                : deltaLabel.tone === "bad"
                                ? "bg-red-500/15 text-red-300 border-red-500/30"
                                : "bg-slate-700/50 text-slate-300 border-slate-600"
                        }`}>{deltaLabel.text}</span>
                    )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                        <span className="text-slate-500 block kpi-label uppercase font-mono">Typowany ranking H2H</span>
                        <span className="text-white font-bold text-lg">
                            {prediction?.predictedRank != null ? `#${prediction.predictedRank}` : "—"}
                        </span>
                    </div>
                    <div>
                        <span className="text-slate-500 block kpi-label uppercase font-mono">Rzeczywisty wynik</span>
                        <span className="text-emerald-400 font-bold text-lg">#{player.rank}</span>
                    </div>
                </div>
                {preSeasonFavorite && (
                    <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                        Faworyt przed GW1 (najlepszy historyczny OR): <strong className="text-yellow-400/90">{preSeasonFavorite.team}</strong> (OR {formatOrDisplay(preSeasonFavorite.historicalOr)}).
                        {player.id === preSeasonFavorite.id
                            ? " To właśnie ta drużyna miała najlepsze OR w historii — presja była maksymalna."
                            : player.rank === 1
                            ? ` Mimo że typowano innych, to ${player.team} zabrało tytuł.`
                            : null}
                    </p>
                )}
                {prediction?.isDebut && (
                    <p className="text-xs text-amber-300/90 mt-3">Debiutant bez wpisu w Akta — do tabeli oczekiwań wliczony na koniec listy (brak historycznego OR).</p>
                )}
            </div>

            <div className="rounded-2xl border border-slate-800 overflow-hidden">
                <div className="bg-slate-900/60 px-3 py-2 kpi-label uppercase tracking-widest text-slate-500 font-mono">Top 5 prognozy przed sezonem</div>
                <div className="divide-y divide-slate-800/80">
                    {topPredicted.map((row) => {
                        const actual = PLAYER_BY_ID[row.id];
                        const diff = row.predictedRank - (actual?.rank ?? row.predictedRank);
                        const isCurrent = row.id === player.id;
                        return (
                            <div
                                key={row.id}
                                className={`flex items-center gap-2 px-3 py-2 text-xs ${isCurrent ? "bg-emerald-500/10" : ""}`}
                            >
                                <span className="w-5 font-mono text-slate-500">{row.predictedRank}.</span>
                                <span className={`flex-1 min-w-0 break-words leading-snug font-semibold ${isCurrent ? "text-emerald-300" : "text-slate-200"}`}>{row.team}</span>
                                <span className="text-slate-500 font-mono hidden sm:inline">OR {formatOrDisplay(row.historicalOr)}</span>
                                <span className="text-slate-500">→</span>
                                <span className={`font-bold ${diff >= 3 ? "text-emerald-400" : diff <= -3 ? "text-red-400" : "text-slate-300"}`}>#{actual?.rank}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {story.positives.length > 0 && (
                <div className="space-y-2">
                    <div className="kpi-label font-bold text-emerald-400 uppercase tracking-widest">Na plus</div>
                    {story.positives.map((item, i) => (
                        <div key={i} className="flex gap-2 text-sm text-slate-300 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-3 py-2">
                            <span className="shrink-0">{item.icon}</span>
                            <span>{item.text}</span>
                        </div>
                    ))}
                </div>
            )}

            {story.negatives.length > 0 && (
                <div className="space-y-2">
                    <div className="kpi-label font-bold text-red-400 uppercase tracking-widest">Na minus</div>
                    {story.negatives.map((item, i) => (
                        <div key={i} className="flex gap-2 text-sm text-slate-300 bg-red-500/5 border border-red-500/20 rounded-xl px-3 py-2">
                            <span className="shrink-0">{item.icon}</span>
                            <span>{item.text}</span>
                        </div>
                    ))}
                </div>
            )}

            <p className="text-xs text-slate-400 italic border-l-2 border-emerald-500/40 pl-3">{story.conclusion}</p>

            <div className="relative bg-[#020617] p-5 rounded-2xl border border-slate-800/80 italic text-slate-400 text-sm pl-11">
                <span className="absolute left-3 top-2 text-4xl font-athletic text-emerald-500/20 leading-none">"</span>
                <p className="relative z-10 leading-snug">{player.quote}</p>
            </div>
        </div>
    );
};
