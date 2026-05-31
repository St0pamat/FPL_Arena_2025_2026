import { useMemo } from "react";
import type { Player } from "@/types/player";
import type { PlayerHighlightsMap } from "@/types/highlights";
import type { PlayerSeasonHistoryMap } from "@/types/seasonHistory";
import type { GwMatchesBlock } from "@/types/match";
import type { GladiatorOrMap } from "@/types/or";
import { TEAM_BY_NAME } from "@/config/playersIndex";
import { getMatchOutcome } from "@/lib/match";
import { TeamCrest } from "@/components/branding";
import { PageContainer } from "@/components/layout";
import {
  buildPredictedStandings,
  formatOrDisplay,
  getPlayerOrBundle,
  getPredictionForPlayer,
} from "@/features/profiles/lib/or";
import { ProfileExpectationsPanel } from "@/features/profiles/components/ProfileExpectationsPanel";
import { ProfileSeasonEditorial } from "@/features/profiles/components/ProfileSeasonEditorial";
import { SeasonHighlightsPanel } from "@/features/profiles/components/SeasonHighlightsPanel";
import { FplElitePanel } from "@/features/profiles/components/FplElitePanel";
import { DiplomaGenerator } from "@/features/profiles/components/DiplomaGenerator";
import {
  DIFFERENTIAL_GAIN,
  DIFFERENTIAL_LOSS,
  formatDifferentialNet,
  getDifferentialPicks,
} from "@/features/profiles/lib/differentialPicks";

export const ProfilesView = ({
  players,
  selectedPlayerId,
  onSelectPlayer,
  matchesByGw,
  matchesLoading,
  playerHighlights,
  highlightsLoading,
  seasonHistory,
  seasonHistoryLoading,
  gladiatorOr,
}: {
  players: Player[];
  selectedPlayerId: number;
  onSelectPlayer: (id: number) => void;
  matchesByGw: GwMatchesBlock[];
  matchesLoading: boolean;
  playerHighlights: PlayerHighlightsMap;
  highlightsLoading: boolean;
  seasonHistory: PlayerSeasonHistoryMap;
  seasonHistoryLoading: boolean;
  gladiatorOr: GladiatorOrMap;
}) => {
  const currentPlayer = useMemo(
    () => players.find((p) => p.id === selectedPlayerId),
    [players, selectedPlayerId]
  );

  const currentHighlights = useMemo(
    () => playerHighlights[String(selectedPlayerId)] || null,
    [playerHighlights, selectedPlayerId]
  );

  const currentSeasonHistory = useMemo(
    () => seasonHistory[String(selectedPlayerId)] || null,
    [seasonHistory, selectedPlayerId]
  );

  const achievementTiles = useMemo(() => {
    if (!currentPlayer) return [];
    const tiles = [
      { label: "Śr. pozycja", value: currentPlayer.avgPosition, cls: "text-emerald-400" },
      {
        label: "Seria win H2H",
        value: currentPlayer.winStreak?.split(" ")[0] ?? "—",
        cls: "text-white",
      },
      {
        label: "Kolejka MVP",
        value: currentPlayer.bestGw?.split("(")[0].trim() ?? "—",
        cls: "text-yellow-500",
      },
      { label: "Miesiąc", value: currentPlayer.monthlyWins || "—", cls: "text-purple-400" },
    ];
    if (currentPlayer.weeksTop > 0) {
      tiles.push({
        label: "Tygodnie na #1",
        value: currentPlayer.weeksTop,
        cls: "text-yellow-400",
      });
    }
    if (currentPlayer.weeksBottom > 0) {
      tiles.push({
        label: "Tygodnie w piwnicy",
        value: currentPlayer.weeksBottom,
        cls: "text-red-400",
      });
    }
    return tiles;
  }, [currentPlayer]);

  const predictedStandings = useMemo(
    () => buildPredictedStandings(players, gladiatorOr),
    [players, gladiatorOr]
  );

  const currentOrBundle = useMemo(() => {
    if (!currentPlayer) return { historicalOr: null, historicalOrSeason: null, seasonOr: null };
    return getPlayerOrBundle(currentPlayer.id, gladiatorOr, currentHighlights);
  }, [currentPlayer, gladiatorOr, currentHighlights]);

  const currentPrediction = useMemo(() => {
    if (!currentPlayer) return null;
    return getPredictionForPlayer(currentPlayer.id, predictedStandings);
  }, [currentPlayer, predictedStandings]);

  const preSeasonFavorite = useMemo(() => {
    const withHist = predictedStandings.filter((e) => e.historicalOr != null);
    return withHist[0] || null;
  }, [predictedStandings]);

  const playerSchedule = useMemo(() => {
    if (!currentPlayer) return [];
    return matchesByGw
      .map((gwData) => {
        const currentGw = Number(gwData.gw);
        const matches = Array.isArray(gwData.matches) ? gwData.matches : [];
        const match = matches.find(
          (m) => m.teamA === currentPlayer.team || m.teamB === currentPlayer.team
        );
        if (!match) return null;
        const isHome = match.teamA === currentPlayer.team;
        const goalsFor = isHome ? match.pointsA : match.pointsB;
        const goalsAgainst = isHome ? match.pointsB : match.pointsA;
        const opponent = isHome ? match.teamB : match.teamA;
        return {
          gw: currentGw,
          isHome,
          goalsFor,
          goalsAgainst,
          opponent,
          opponentId: TEAM_BY_NAME[opponent]?.id || null,
          outcome: getMatchOutcome(goalsFor, goalsAgainst),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null)
      .sort((a, b) => a.gw - b.gw);
  }, [currentPlayer, matchesByGw]);

  const scheduleSummary = useMemo(() => {
    const base = { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
    playerSchedule.forEach((match) => {
      if (match.outcome === "W") base.wins += 1;
      else if (match.outcome === "D") base.draws += 1;
      else base.losses += 1;
      base.goalsFor += match.goalsFor;
      base.goalsAgainst += match.goalsAgainst;
    });
    return base;
  }, [playerSchedule]);

  const differentialPicks = useMemo(
    () =>
      currentPlayer
        ? getDifferentialPicks(currentHighlights, currentPlayer)
        : { gain: null, loss: null },
    [currentPlayer, currentHighlights]
  );

  return (
    <PageContainer width="full" className="!space-y-0">
      <div className="flex flex-col xl:flex-row gap-6 lg:gap-8 w-full min-h-[75vh]">
        <aside className="w-full xl:w-[22rem] 2xl:w-[26rem] glass-panel rounded-2xl border-slate-800 flex flex-col shrink-0 xl:max-h-[calc(100vh-10rem)] xl:sticky xl:top-28 overflow-hidden shadow-2xl">
          <div className="panel-pad border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-sm z-10">
            <h3 className="text-fluid-sm font-bold text-slate-400 uppercase tracking-widest mb-1">
              Spis treści
            </h3>
            <p className="text-fluid-sm text-slate-500">Wybierz profil menedżera</p>
          </div>
          <div className="overflow-y-auto flex-1 p-3 space-y-2">
            {[...players]
              .sort((a, b) => a.rank - b.rank)
              .map((p) => {
                const isSelected = p.id === selectedPlayerId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectPlayer(p.id)}
                    className={`w-full p-4 text-left transition-all rounded-xl flex items-center gap-3 ${
                      isSelected
                        ? "bg-emerald-500/15 border border-emerald-500/30"
                        : "hover:bg-slate-800/50 border border-transparent"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-athletic font-bold text-fluid-sm ${
                        p.rank === 1
                          ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/50"
                          : p.rank <= 3
                            ? "bg-slate-800 text-slate-300 border border-slate-600"
                            : "bg-slate-900/50 text-slate-500 border border-slate-800"
                      }`}
                    >
                      {p.rank}
                    </div>
                    <TeamCrest fplId={p.id} size="md" />
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-fluid-base font-bold break-words leading-snug ${isSelected ? "text-emerald-400" : "text-slate-200"}`}
                      >
                        {p.team}
                      </h4>
                      <p className="text-fluid-sm text-slate-500 break-words leading-snug mt-0.5">{p.manager}</p>
                    </div>
                  </button>
                );
              })}
          </div>
        </aside>

        {currentPlayer && (
          <div className="flex-1 flex flex-col gap-6 lg:gap-8 w-full animate-fade-in min-w-0">
            <div className="glass-panel panel-pad rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 lg:gap-8">
              <div className="absolute -right-10 -bottom-10 text-emerald-500/5 font-athletic font-bold text-[10rem] xl:text-[12rem] uppercase pointer-events-none select-none leading-none z-0">
                #{currentPlayer.rank}
              </div>
              <div className="relative z-10 flex gap-5 lg:gap-6 items-center min-w-0 flex-1">
                <TeamCrest fplId={currentPlayer.id} size="profile" profile className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-2xl lg:text-3xl leading-none">
                      {currentPlayer.rank === 1
                        ? "🥇"
                        : currentPlayer.rank === 2
                          ? "🥈"
                          : currentPlayer.rank === 3
                            ? "🥉"
                            : "🛡️"}
                    </span>
                    <span className="badge-pill bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      Pozycja #{currentPlayer.rank}
                    </span>
                    <span
                      className="badge-pill bg-blue-500/10 text-blue-400 border-blue-500/20"
                      title={currentOrBundle.historicalOrSeason || ""}
                    >
                      Hist. OR:{" "}
                      {currentOrBundle.historicalOr != null
                        ? formatOrDisplay(currentOrBundle.historicalOr)
                        : "Debiut"}
                    </span>
                    <span className="badge-pill bg-violet-500/10 text-violet-300 border-violet-500/20">
                      OR 25/26:{" "}
                      {currentOrBundle.seasonOr != null
                        ? formatOrDisplay(currentOrBundle.seasonOr)
                        : "—"}
                    </span>
                  </div>
                  <h2 className="text-fluid-4xl font-athletic font-bold text-white tracking-tight uppercase leading-[0.95] mb-2">
                    {currentPlayer.team}
                  </h2>
                  <p className="text-fluid-base text-slate-400">
                    Menedżer:{" "}
                    <span className="text-white font-semibold">{currentPlayer.manager}</span>{" "}
                    <span className="text-slate-500">({currentPlayer.discord})</span>
                  </p>
                  <DiplomaGenerator player={currentPlayer} highlights={currentHighlights} />
                </div>
              </div>
              <div className="relative z-10 flex gap-4 w-full lg:w-auto">
                <div className="flex-1 lg:flex-none kpi-card min-w-[8.5rem]">
                  <div className="kpi-label">Punkty H2H</div>
                  <div className="kpi-value">{currentPlayer.pts}</div>
                </div>
                <div className="flex-1 lg:flex-none kpi-card min-w-[8.5rem]">
                  <div className="kpi-label">Score overall</div>
                  <div className="kpi-value-accent">{currentPlayer.score}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6 lg:gap-8 w-full">
              <div className="glass-panel panel-pad rounded-3xl border border-slate-800 shadow-xl flex flex-col">
                <ProfileSeasonEditorial playerId={currentPlayer.id} />
                <h4 className="text-fluid-xl font-bold text-white border-l-4 border-emerald-500 pl-4 mb-2 uppercase tracking-wide font-athletic">
                  Oczekiwania vs rzeczywistość
                </h4>
                <p className="text-fluid-sm text-slate-500 mb-6">
                  Prognoza z historycznego OR (Akta Gladiatorów) kontra tabela H2H i OR po sezonie 25/26.
                </p>
                <ProfileExpectationsPanel
                  player={currentPlayer}
                  highlights={currentHighlights}
                  orBundle={currentOrBundle}
                  prediction={currentPrediction}
                  predictedStandings={predictedStandings}
                  preSeasonFavorite={preSeasonFavorite}
                />
              </div>

              <div className="space-y-6 lg:space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
                  <div className="glass-panel panel-pad rounded-2xl border border-slate-800">
                    <h5 className="kpi-label text-emerald-400 flex items-center gap-2 mb-3">
                      <span>✔️</span> Lubi
                    </h5>
                    <p className="text-fluid-base text-slate-300 leading-relaxed">{currentPlayer.likes}</p>
                  </div>
                  <div className="glass-panel panel-pad rounded-2xl border border-slate-800">
                    <h5 className="kpi-label text-red-400 flex items-center gap-2 mb-3">
                      <span>❌</span> Nie znosi
                    </h5>
                    <p className="text-fluid-base text-slate-300 leading-relaxed">{currentPlayer.dislikes}</p>
                  </div>
                </div>

                <div className="glass-panel panel-pad rounded-3xl border border-slate-800 space-y-5">
                  <h4 className="kpi-label border-b border-slate-800/60 pb-3">Zarządzanie taktyką</h4>
                  <div>
                    <div className="flex justify-between text-fluid-sm mb-2">
                      <span className="text-slate-400">Przepalone punkty (ławka)</span>
                      <span className="font-mono font-bold text-yellow-500">{currentPlayer.pointsBenched} pkt</span>
                    </div>
                    <div className="w-full bg-[#020617] rounded-full h-2.5 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full ${currentPlayer.pointsBenched > 280 ? "bg-red-500" : "bg-emerald-500"}`}
                        style={{ width: `${Math.min(100, (currentPlayer.pointsBenched / 400) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-fluid-sm mb-2">
                      <span className="text-slate-400">Poniesione kary (hity)</span>
                      <span className="font-mono font-bold text-red-400">{currentPlayer.hits} pkt</span>
                    </div>
                    <div className="w-full bg-[#020617] rounded-full h-2.5 overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${Math.min(100, (Math.abs(currentPlayer.hits) / 100) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="bg-[#020617] panel-pad rounded-xl border border-slate-800 flex justify-between items-center gap-4">
                    <div>
                      <span className="kpi-label block">Punkty kapitanów</span>
                      <span className="text-fluid-sm text-slate-500 mt-1 block">
                        Zaufany: {currentPlayer.mostCaptained.split("(")[0].trim()}
                      </span>
                    </div>
                    <span className="text-kpi font-athletic font-bold text-emerald-400">
                      {currentPlayer.captainPts}{" "}
                      <span className="text-fluid-base">pkt</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="glass-panel panel-pad rounded-2xl border border-emerald-500/20 relative overflow-hidden">
                    <span className="kpi-label text-emerald-400 block">{DIFFERENTIAL_GAIN.title}</span>
                    <p className="text-fluid-xs text-slate-500 mt-1.5 leading-relaxed">
                      {DIFFERENTIAL_GAIN.description}
                    </p>
                    {differentialPicks.gain ? (
                      <>
                        <span className="text-fluid-base font-bold text-white mt-3 block break-words leading-snug">
                          {differentialPicks.gain.playerName}
                        </span>
                        <span className="text-fluid-sm font-mono font-semibold text-emerald-400 mt-1.5 block">
                          {formatDifferentialNet(differentialPicks.gain.netPoints)}
                        </span>
                      </>
                    ) : (
                      <span className="text-fluid-sm text-slate-500 mt-3 block">Brak danych sezonowych</span>
                    )}
                  </div>
                  <div className="glass-panel panel-pad rounded-2xl border border-red-500/20 relative overflow-hidden">
                    <span className="kpi-label text-red-400 block">{DIFFERENTIAL_LOSS.title}</span>
                    <p className="text-fluid-xs text-slate-500 mt-1.5 leading-relaxed">
                      {DIFFERENTIAL_LOSS.description}
                    </p>
                    {differentialPicks.loss ? (
                      <>
                        <span className="text-fluid-base font-bold text-white mt-3 block break-words leading-snug">
                          {differentialPicks.loss.playerName}
                        </span>
                        <span className="text-fluid-sm font-mono font-semibold text-red-400 mt-1.5 block">
                          {formatDifferentialNet(differentialPicks.loss.netPoints)}
                        </span>
                      </>
                    ) : (
                      <span className="text-fluid-sm text-slate-500 mt-3 block">Brak danych sezonowych</span>
                    )}
                  </div>
                </div>

                <div className="glass-panel panel-pad rounded-3xl border border-slate-800">
                  <h4 className="kpi-label border-b border-slate-800/60 pb-3 mb-4">Gablota osiągnięć</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {achievementTiles.map(({ label, value, cls }) => (
                      <div key={label} className="kpi-card !p-4">
                        <span className="kpi-label">{label}</span>
                        <span className={`text-fluid-lg font-athletic font-bold mt-2 block ${cls}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-panel panel-pad rounded-3xl border border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-slate-800/60 pb-4 mb-4">
                    <div>
                      <h4 className="text-fluid-lg font-bold text-white uppercase tracking-wide font-athletic">
                        Terminarz 38 kolejek
                      </h4>
                      <p className="text-fluid-sm text-slate-400 mt-1">
                        Mecze profilu — szybki podgląd przeciwników i wyników.
                      </p>
                    </div>
                    <div className="text-fluid-sm text-slate-500 font-mono">
                      Mecze: <span className="text-slate-300 font-bold">{playerSchedule.length}</span> / 38
                    </div>
                  </div>

                  {!matchesLoading && playerSchedule.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                      {[
                        { label: "W", value: scheduleSummary.wins, cls: "text-emerald-400" },
                        { label: "R", value: scheduleSummary.draws, cls: "text-slate-300" },
                        { label: "P", value: scheduleSummary.losses, cls: "text-red-400" },
                        { label: "Pkt za", value: scheduleSummary.goalsFor, cls: "text-emerald-300" },
                        { label: "Pkt przeciw", value: scheduleSummary.goalsAgainst, cls: "text-amber-300" },
                      ].map(({ label, value, cls }) => (
                        <div key={label} className="kpi-card !p-3">
                          <div className="kpi-label">{label}</div>
                          <div className={`text-fluid-lg font-bold mt-1 ${cls}`}>{value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {matchesLoading ? (
                    <div className="text-fluid-base text-slate-400 bg-[#020617] rounded-xl border border-slate-800 p-5">
                      Ładowanie terminarza…
                    </div>
                  ) : playerSchedule.length === 0 ? (
                    <div className="text-fluid-base text-red-300 bg-red-950/20 rounded-xl border border-red-500/30 p-5">
                      Brak danych meczowych. Sprawdź plik{" "}
                      <span className="font-mono">wyniki_meczy.json</span>.
                    </div>
                  ) : (
                    <div className="max-h-[28rem] overflow-y-auto pr-1 space-y-3">
                      {playerSchedule.map((match) => (
                        <div
                          key={`${currentPlayer.id}-${match.gw}`}
                          className="bg-[#020617] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="kpi-label mb-2">
                              GW {match.gw} · {match.isHome ? "Dom" : "Wyjazd"}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center gap-2 sm:gap-3 min-w-0">
                              <div className="flex items-start gap-2 min-w-0">
                                <TeamCrest fplId={currentPlayer.id} size="sm" className="shrink-0 mt-0.5" />
                                <span className="text-fluid-sm text-slate-300 break-words leading-snug">{currentPlayer.team}</span>
                              </div>
                              <span className="text-fluid-lg font-mono font-bold text-white shrink-0 text-center">
                                {match.goalsFor}:{match.goalsAgainst}
                              </span>
                              <div className="flex items-start gap-2 min-w-0 sm:justify-end">
                                <span className="text-fluid-sm text-slate-300 break-words leading-snug sm:text-right">
                                  {match.opponent}
                                </span>
                                <TeamCrest fplId={match.opponentId} size="sm" className="shrink-0 mt-0.5" />
                              </div>
                            </div>
                          </div>
                          <span
                            className={`badge-pill shrink-0 self-end sm:self-center ${
                              match.outcome === "W"
                                ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                                : match.outcome === "D"
                                  ? "text-slate-300 border-slate-500/30 bg-slate-500/10"
                                  : "text-red-400 border-red-500/30 bg-red-500/10"
                            }`}
                          >
                            {match.outcome}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!seasonHistoryLoading && (
              <FplElitePanel history={currentSeasonHistory} />
            )}

            {!highlightsLoading && (
              <SeasonHighlightsPanel
                highlights={currentHighlights}
                seasonGwDetails={currentSeasonHistory?.gwDetails}
              />
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
};
