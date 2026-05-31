import { useEffect, useMemo, useState } from "react";
import type { GwMatchesBlock } from "@/types/match";
import { TEAM_BY_NAME } from "@/config/playersIndex";
import { TeamBrand } from "@/components/branding";
import { PageContainer, PageHeader, GwNavigator } from "@/components/layout";
import { EmptyState } from "@/components/ui";
import { buildStandingsHistory } from "@/features/standings/lib/standings";
import { RankChangeBadge } from "@/features/standings/components/RankChangeBadge";

export const StandingsView = ({
  matchesByGw,
  loading,
  embedded = false,
}: {
  matchesByGw: GwMatchesBlock[];
  loading: boolean;
  embedded?: boolean;
}) => {
  const standingsHistory = useMemo(() => buildStandingsHistory(matchesByGw), [matchesByGw]);
  const { byGw, gwList, maxGw } = standingsHistory;
  const [selectedGw, setSelectedGw] = useState<number | null>(null);

  useEffect(() => {
    if (maxGw && selectedGw == null) setSelectedGw(maxGw);
    else if (maxGw && selectedGw != null && selectedGw > maxGw) setSelectedGw(maxGw);
  }, [maxGw, selectedGw]);

  const effectiveGw = selectedGw ?? maxGw;
  const rows = byGw[effectiveGw] || [];
  const gwIndex = gwList.indexOf(effectiveGw);
  const canPrev = gwIndex > 0;
  const canNext = gwIndex >= 0 && gwIndex < gwList.length - 1;
  const isFinal = effectiveGw === maxGw;

  const body = (
    <>
      <PageHeader
        title={isFinal ? "Tabela końcowa FPL Arena" : `Tabela po kolejce ${effectiveGw}`}
        lead={
          <>
            Klasyfikacja H2H liczona z wyników meczów:{" "}
            <strong className="text-slate-300">pkt ligi</strong> (3/1/0), przy remisie punktów —{" "}
            <strong className="text-slate-300">Score ogółem</strong>, potem{" "}
            <strong className="text-slate-300">bilans bezpośredni</strong>.
            {isFinal ? " Domyślnie widok po 38. kolejce." : null}
          </>
        }
      />

      {loading ? (
        <EmptyState>Ładowanie tabeli…</EmptyState>
      ) : gwList.length === 0 ? (
        <EmptyState tone="error">
          Brak wyników meczowych — sprawdź plik <span className="font-mono">wyniki_meczy.json</span>.
        </EmptyState>
      ) : (
        <>
          <GwNavigator
            label="Stan tabeli"
            displayValue={isFinal ? "Finał" : `GW ${effectiveGw}`}
            canPrev={canPrev}
            canNext={canNext}
            onPrev={() => canPrev && setSelectedGw(gwList[gwIndex - 1])}
            onNext={() => canNext && setSelectedGw(gwList[gwIndex + 1])}
            gwList={gwList}
            selectedGw={effectiveGw}
            onSelectGw={setSelectedGw}
            extraActions={
              <button
                type="button"
                onClick={() => setSelectedGw(maxGw)}
                className={`px-5 py-3 rounded-xl text-fluid-sm font-semibold border transition-all whitespace-nowrap ${
                  isFinal
                    ? "bg-emerald-500 text-slate-950 border-emerald-400"
                    : "bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-500/40"
                }`}
              >
                Tabela końcowa
              </button>
            }
          >
            {gwList.map((g) => (
              <option key={g} value={g}>
                {g === maxGw ? `Kolejka ${g} (tabela końcowa)` : `Po kolejce ${g}`}
              </option>
            ))}
          </GwNavigator>

          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-center w-16">Poz.</th>
                  <th className="text-center w-20" title="Zmiana vs poprzednia kolejka">
                    Zm.
                  </th>
                  <th className="min-w-[16rem]">Menedżer i klub</th>
                  <th className="text-center">Bilans (W-R-P)</th>
                  <th className="text-center text-white">Pkt H2H</th>
                  <th className="text-center text-emerald-400">Score ogółem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const player = TEAM_BY_NAME[r.team] || { id: 0, team: r.team, manager: "" };
                  const pos = r.rank ?? 0;
                  return (
                    <tr key={r.team}>
                      <td
                        className={`text-center font-athletic text-fluid-xl font-bold ${
                          pos <= 3 ? "text-yellow-500" : pos >= 18 ? "text-red-500" : "text-slate-500"
                        }`}
                      >
                        {pos}
                      </td>
                      <td className="text-center">
                        <RankChangeBadge change={r.rankChange} />
                      </td>
                      <td>
                        <TeamBrand
                          player={player}
                          crestSize="md"
                          nameClassName="text-fluid-base font-bold text-white"
                          subClassName="text-fluid-sm text-slate-400"
                        />
                      </td>
                      <td className="text-center font-mono text-fluid-sm text-slate-400">
                        <span className="text-emerald-500">{r.w}</span>
                        {" · "}
                        <span className="text-slate-500">{r.d}</span>
                        {" · "}
                        <span className="text-red-500">{r.l}</span>
                      </td>
                      <td className="text-center font-bold text-white text-fluid-lg">{r.pts}</td>
                      <td className="text-center font-mono text-emerald-400 text-fluid-base">{r.score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );

  if (embedded) return body;
  return <PageContainer width="full">{body}</PageContainer>;
};
