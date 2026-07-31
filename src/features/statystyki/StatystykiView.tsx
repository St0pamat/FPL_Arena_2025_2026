import { HubShell } from "@arena/components/layout/HubShell";
import { HUB_CONFIG } from "@arena/config/navigation";
import { TopkiView } from "@arena/features/topki/TopkiView";
import { HallOfFameView } from "@arena/features/hall/HallOfFameView";
import { ComparePanel } from "@arena/features/centrum/sections/ComparePanel";
import { ElitePanel } from "@arena/features/centrum/sections/ElitePanel";
import type { Player } from "@arena/types/player";
import type { PlayerHighlightsMap } from "@arena/types/highlights";
import type { PlayerSeasonHistoryMap } from "@arena/types/seasonHistory";
import type { GwMatchesBlock } from "@arena/types/match";
import type { GladiatorOrMap } from "@arena/types/or";

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
