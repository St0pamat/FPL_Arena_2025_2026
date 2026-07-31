import { HubShell } from "@arena/components/layout/HubShell";
import { HUB_CONFIG } from "@arena/config/navigation";
import { StandingsView } from "@arena/features/standings/StandingsView";
import { WynikiView } from "@arena/features/wyniki/WynikiView";
import { TimelinePanel } from "@arena/features/centrum/sections/TimelinePanel";
import { PrognozaView } from "@arena/features/prognoza/PrognozaView";
import type { GwMatchesBlock } from "@arena/types/match";
import type { PlayerHighlightsMap } from "@arena/types/highlights";
import type { Player } from "@arena/types/player";
import type { GladiatorOrMap } from "@arena/types/or";

const HUB = HUB_CONFIG.sezon;

export const SezonView = ({
  players,
  gladiatorOr,
  matchesByGw,
  playerHighlights,
  matchesLoading,
  highlightsLoading,
}: {
  players: Player[];
  gladiatorOr: GladiatorOrMap;
  matchesByGw: GwMatchesBlock[];
  playerHighlights: PlayerHighlightsMap;
  matchesLoading: boolean;
  highlightsLoading: boolean;
}) => (
  <HubShell
    title={HUB.title}
    lead={HUB.lead}
    sections={HUB.sections}
    defaultSectionId="prognoza"
    sectionsWithOwnHeader={["prognoza", "standings", "wyniki"]}
  >
    {(section) => {
      if (section === "prognoza") {
        return <PrognozaView players={players} gladiatorOr={gladiatorOr} embedded />;
      }
      if (section === "standings") {
        return <StandingsView matchesByGw={matchesByGw} loading={matchesLoading} embedded />;
      }
      if (section === "wyniki") {
        return <WynikiView matchesByGw={matchesByGw} loading={matchesLoading} embedded />;
      }
      return (
        <TimelinePanel
          matchesByGw={matchesByGw}
          highlights={playerHighlights}
          loading={matchesLoading || highlightsLoading}
        />
      );
    }}
  </HubShell>
);
