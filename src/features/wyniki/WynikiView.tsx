import { useEffect, useMemo, useState } from "react";
import type { GwMatchesBlock } from "@arena/types/match";
import { TEAM_BY_NAME } from "@arena/config/playersIndex";
import { getMatchOutcome } from "@arena/lib/match";
import { TeamCrest } from "@arena/components/branding";
import { playerDisplayName, shouldShowPlayerName } from "@arena/lib/playerDisplay";
import { PageContainer, PageHeader, GwNavigator } from "@arena/components/layout";
import { EmptyState, StatPill } from "@arena/components/ui";
import { H2H_PL } from "@arena/features/fpl/constants";

export function WynikiView({
  matchesByGw,
  loading,
  embedded = false,
}: {
  matchesByGw: GwMatchesBlock[];
  loading: boolean;
  embedded?: boolean;
}) {
  const gwList = useMemo(() => {
    if (!matchesByGw?.length) return [];
    return [...matchesByGw]
      .map((b) => Number(b.gw))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
  }, [matchesByGw]);

  const [selectedGw, setSelectedGw] = useState(1);

  useEffect(() => {
    if (gwList.length && !gwList.includes(selectedGw)) setSelectedGw(gwList[0]);
  }, [gwList, selectedGw]);

  const currentBlock = useMemo(
    () => matchesByGw.find((b) => Number(b.gw) === selectedGw),
    [matchesByGw, selectedGw]
  );

  const matches = currentBlock?.matches || [];
  const gwIndex = gwList.indexOf(selectedGw);
  const canPrev = gwIndex > 0;
  const canNext = gwIndex >= 0 && gwIndex < gwList.length - 1;

  const gwStats = useMemo(() => {
    if (!matches.length) return null;
    const scores = matches.flatMap((m) => [m.pointsA, m.pointsB]);
    const top = [...matches].sort(
      (a, b) => Math.max(b.pointsA, b.pointsB) - Math.max(a.pointsA, a.pointsB)
    )[0];
    const topPts = top ? Math.max(top.pointsA, top.pointsB) : 0;
    const topTeam = top ? (top.pointsA >= top.pointsB ? top.teamA : top.teamB) : "";
    return { totalPts: scores.reduce((s, n) => s + Number(n), 0), topTeam, topPts };
  }, [matches]);

  const body = (
    <>
      <PageHeader
        title="Wyniki kolejek"
        lead="Wszystkie mecze H2H FPL Arena — 10 spotkań na kolejkę, 38 tygodni sezonu."
      />

      {loading ? (
        <EmptyState>Ładowanie wyników…</EmptyState>
      ) : gwList.length === 0 ? (
        <EmptyState tone="error">
          Brak danych. Upewnij się, że plik <span className="font-mono">wyniki_meczy.json</span> jest dostępny.
        </EmptyState>
      ) : (
        <>
          <GwNavigator
            label="Kolejka"
            displayValue={`GW ${selectedGw}`}
            canPrev={canPrev}
            canNext={canNext}
            onPrev={() => canPrev && setSelectedGw(gwList[gwIndex - 1])}
            onNext={() => canNext && setSelectedGw(gwList[gwIndex + 1])}
            gwList={gwList}
            selectedGw={selectedGw}
            onSelectGw={setSelectedGw}
          >
            {gwList.map((g) => (
              <option key={g} value={g}>
                Kolejka {g}
              </option>
            ))}
          </GwNavigator>

          {gwStats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5">
              <StatPill label="Mecze w kolejce" value={matches.length} />
              <StatPill label="Suma punktów FPL" value={gwStats.totalPts} tone="good" />
              <StatPill
                label="Najwyższy wynik"
                value={`${gwStats.topPts} pkt`}
                sub={gwStats.topTeam}
                tone="warn"
              />
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 lg:gap-6">
            {matches.map((m, idx) => {
              const playerA = TEAM_BY_NAME[m.teamA];
              const playerB = TEAM_BY_NAME[m.teamB];
              const ptsA = Number(m.pointsA);
              const ptsB = Number(m.pointsB);
              const outcomeA = getMatchOutcome(ptsA, ptsB);
              const outcomeB = outcomeA === "W" ? "L" : outcomeA === "L" ? "W" : "D";
              const winA = outcomeA === "W";
              const winB = outcomeB === "W";

              return (
                <article
                  key={`${selectedGw}-${idx}-${m.teamA}-${m.teamB}`}
                  className="glass-panel rounded-2xl border border-slate-800 panel-pad hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div
                      className={`flex-1 min-w-0 flex items-start gap-3 ${winA ? "opacity-100" : winB ? "opacity-80" : ""}`}
                    >
                      <TeamCrest fplId={playerA?.id} size="lg" className="shrink-0" />
                      <div className="min-w-0">
                        <div
                          className={`text-fluid-base font-bold break-words leading-snug ${winA ? "text-emerald-300" : "text-slate-200"}`}
                        >
                          {m.teamA}
                        </div>
                        {playerA && shouldShowPlayerName(playerA) && (
                          <div className="text-fluid-sm text-slate-500 break-words leading-snug mt-0.5">{playerDisplayName(playerA)}</div>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-center px-2 font-mono font-bold text-fluid-2xl text-white whitespace-nowrap">
                      <span className={winA ? "text-emerald-400" : ""}>{ptsA}</span>
                      <span className="text-slate-600 mx-1.5">:</span>
                      <span className={winB ? "text-emerald-400" : ""}>{ptsB}</span>
                    </div>
                    <div
                      className={`flex-1 min-w-0 flex items-start gap-3 justify-end text-right ${winB ? "opacity-100" : winA ? "opacity-80" : ""}`}
                    >
                      <div className="min-w-0">
                        <div
                          className={`text-fluid-base font-bold break-words leading-snug ${winB ? "text-emerald-300" : "text-slate-200"}`}
                        >
                          {m.teamB}
                        </div>
                        {playerB && shouldShowPlayerName(playerB) && (
                          <div className="text-fluid-sm text-slate-500 break-words leading-snug mt-0.5">{playerDisplayName(playerB)}</div>
                        )}
                      </div>
                      <TeamCrest fplId={playerB?.id} size="lg" className="shrink-0" />
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    <span
                      className={`badge-pill ${
                        outcomeA === "W"
                          ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
                          : outcomeA === "L"
                            ? "text-red-400 border-red-500/40 bg-red-500/10"
                            : "text-slate-400 border-slate-600 bg-slate-800/50"
                      }`}
                    >
                      {m.teamA.split(" ")[0]}: {H2H_PL[outcomeA]}
                    </span>
                    <span
                      className={`badge-pill ${
                        outcomeB === "W"
                          ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
                          : outcomeB === "L"
                            ? "text-red-400 border-red-500/40 bg-red-500/10"
                            : "text-slate-400 border-slate-600 bg-slate-800/50"
                      }`}
                    >
                      {m.teamB.split(" ")[0]}: {H2H_PL[outcomeB]}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </>
  );

  if (embedded) return body;
  return <PageContainer width="full">{body}</PageContainer>;
}
