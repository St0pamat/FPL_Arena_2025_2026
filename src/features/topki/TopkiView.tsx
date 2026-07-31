import { useMemo, useState } from "react";
import type { Player } from "@arena/types/player";
import type { PlayerHighlightsMap } from "@arena/types/highlights";
import type { PlayerSeasonHistoryMap } from "@arena/types/seasonHistory";
import type { GwMatchesBlock } from "@arena/types/match";
import { PageContainer, PageHeader } from "@arena/components/layout";
import { EmptyState } from "@arena/components/ui";
import { LeaderboardCard } from "./components/LeaderboardCard";
import { computeAllTopki } from "./lib/computeLeaderboards";

export const TopkiView = ({
  players,
  playerHighlights,
  seasonHistory = {},
  matchesByGw,
  loading,
  embedded = false,
}: {
  players: Player[];
  playerHighlights: PlayerHighlightsMap;
  seasonHistory?: PlayerSeasonHistoryMap;
  matchesByGw: GwMatchesBlock[];
  loading: boolean;
  embedded?: boolean;
}) => {
  const sections = useMemo(
    () => computeAllTopki(players, playerHighlights, matchesByGw, seasonHistory),
    [players, playerHighlights, matchesByGw, seasonHistory]
  );

  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "h2h");
  const current = sections.find((s) => s.id === activeSection) ?? sections[0];

  if (loading) {
    const empty = <EmptyState>Ładowanie topów sezonu…</EmptyState>;
    return embedded ? empty : <PageContainer width="full">{empty}</PageContainer>;
  }

  if (!sections.length) {
    const empty = (
      <EmptyState tone="error">
        Brak danych do wygenerowania topów. Sprawdź pliki{" "}
        <span className="font-mono">player_highlights.json</span> i{" "}
        <span className="font-mono">wyniki_meczy.json</span>.
      </EmptyState>
    );
    return embedded ? empty : <PageContainer width="full">{empty}</PageContainer>;
  }

  const body = (
    <>
      <PageHeader
        title="Topki sezonu"
        lead="Najlepsze, najgorsze i najbardziej szalone momenty sezonu 2025/26 — rankingi H2H, formy, transferów i rywalizacji między Gladiatorami."
      />

      <div className="flex flex-col xl:flex-row gap-8 xl:gap-10">
        <aside className="xl:w-80 2xl:w-96 shrink-0">
          <div className="xl:sticky xl:top-28 glass-panel rounded-2xl border border-slate-800 panel-pad">
            <h3 className="text-fluid-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-4 px-1">
              Sekcje
            </h3>
            <nav className="flex flex-row xl:flex-col gap-2 overflow-x-auto xl:overflow-visible pb-1 xl:pb-0">
              {sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  className={`shrink-0 xl:shrink xl:w-full text-left px-4 py-3.5 rounded-xl text-fluid-sm font-semibold transition-all border flex items-center gap-3 ${
                    activeSection === s.id
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-inner"
                      : "text-slate-400 border-slate-800 hover:text-white hover:border-slate-600 hover:bg-slate-800/40"
                  }`}
                >
                  <span className="text-xl">{s.icon}</span>
                  <span className="whitespace-nowrap xl:whitespace-normal">{s.title}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {current && (
          <section className="flex-1 min-w-0 space-y-8">
            <div>
              <h3 className="text-fluid-2xl font-athletic font-bold text-white uppercase tracking-wide flex items-center gap-3">
                <span>{current.icon}</span>
                {current.title}
              </h3>
              <p className="text-fluid-base text-slate-400 mt-2 leading-relaxed">{current.description}</p>
              <p className="text-fluid-sm text-slate-500 mt-1">
                {current.leaderboards.length} rankingów w tej sekcji
              </p>
            </div>

            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6 lg:gap-7">
              {current.leaderboards.map((board) => (
                <LeaderboardCard key={board.id} board={board} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );

  if (embedded) return body;
  return <PageContainer width="full">{body}</PageContainer>;
};
