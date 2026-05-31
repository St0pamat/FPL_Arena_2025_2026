import { HubShell } from "@/components/layout/HubShell";
import { HUB_CONFIG } from "@/config/navigation";
import { CardGeneratorPanel } from "@/features/centrum/sections/CardGeneratorPanel";
import { StoryPosterPanel } from "@/features/centrum/sections/StoryPosterPanel";
import type { Player } from "@/types/player";
import type { PlayerHighlightsMap } from "@/types/highlights";

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
