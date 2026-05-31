import { HubShell } from "@/components/layout/HubShell";
import { HUB_CONFIG } from "@/config/navigation";
import { TopkiView } from "@/features/topki/TopkiView";
import { HallOfFameView } from "@/features/hall/HallOfFameView";
import { ComparePanel } from "@/features/centrum/sections/ComparePanel";
import { ElitePanel } from "@/features/centrum/sections/ElitePanel";
import type { Player } from "@/types/player";
import type { PlayerHighlightsMap } from "@/types/highlights";
import type { PlayerSeasonHistoryMap } from "@/types/seasonHistory";
import type { GwMatchesBlock } from "@/types/match";
import type { GladiatorOrMap } from "@/types/or";

const HUB = HUB_CONFIG.statystyki;

export const StatystykiView = ({
  players,
  playerHighlights,
  seasonHistory,
  matchesByGw,
  gladiatorOr,
  loading,
}: {
  players: Player[];
  playerHighlights: PlayerHighlightsMap;
  seasonHistory: PlayerSeasonHistoryMap;
  matchesByGw: GwMatchesBlock[];
  gladiatorOr: GladiatorOrMap;
  loading: boolean;
}) => (
  <HubShell
    title={HUB.title}
    lead={HUB.lead}
    sections={HUB.sections}
    defaultSectionId="topki"
    sectionsWithOwnHeader={["topki"]}
  >
    {(section) => {
      if (section === "topki") {
        return (
          <TopkiView
            players={players}
            playerHighlights={playerHighlights}
            seasonHistory={seasonHistory}
            matchesByGw={matchesByGw}
            loading={loading}
            embedded
          />
        );
      }
      if (section === "hall") {
        return (
          <HallOfFameView
            players={players}
            playerHighlights={playerHighlights}
            seasonHistory={seasonHistory}
            embedded
          />
        );
      }
      if (section === "porownaj") {
        return (
          <ComparePanel
            players={players}
            matchesByGw={matchesByGw}
            highlights={playerHighlights}
            seasonHistory={seasonHistory}
            gladiatorOr={gladiatorOr}
          />
        );
      }
      return <ElitePanel players={players} seasonHistory={seasonHistory} />;
    }}
  </HubShell>
);
