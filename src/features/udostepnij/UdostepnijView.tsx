import { HubShell } from "@arena/components/layout/HubShell";
import { HUB_CONFIG } from "@arena/config/navigation";
import { CardGeneratorPanel } from "@arena/features/centrum/sections/CardGeneratorPanel";
import { StoryPosterPanel } from "@arena/features/centrum/sections/StoryPosterPanel";
import type { Player } from "@arena/types/player";
import type { PlayerHighlightsMap } from "@arena/types/highlights";

const HUB = HUB_CONFIG.udostepnij;

export const UdostepnijView = ({
  players,
  playerHighlights,
}: {
  players: Player[];
  playerHighlights: PlayerHighlightsMap;
}) => (
  <HubShell title={HUB.title} lead={HUB.lead} sections={HUB.sections} defaultSectionId="karty">
    {(section) =>
      section === "karty" ? (
        <CardGeneratorPanel players={players} highlights={playerHighlights} />
      ) : (
        <StoryPosterPanel players={players} highlights={playerHighlights} />
      )
    }
  </HubShell>
);
