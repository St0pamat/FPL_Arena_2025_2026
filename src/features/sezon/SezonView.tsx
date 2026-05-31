import { HubShell } from "@/components/layout/HubShell";
import { HUB_CONFIG } from "@/config/navigation";
import { StandingsView } from "@/features/standings/StandingsView";
import { WynikiView } from "@/features/wyniki/WynikiView";
import { TimelinePanel } from "@/features/centrum/sections/TimelinePanel";
import { PrognozaView } from "@/features/prognoza/PrognozaView";
import type { GwMatchesBlock } from "@/types/match";
import type { PlayerHighlightsMap } from "@/types/highlights";
import type { Player } from "@/types/player";
import type { GladiatorOrMap } from "@/types/or";

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
