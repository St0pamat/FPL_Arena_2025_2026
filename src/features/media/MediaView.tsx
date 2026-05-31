import { HubShell } from "@/components/layout/HubShell";
import { HUB_CONFIG } from "@/config/navigation";
import { PresentationsView } from "@/features/presentations/PresentationsView";
import { LogosDownloadPanel } from "@/features/media/sections/LogosDownloadPanel";
import { SoundtrackPanel } from "@/features/media/sections/SoundtrackPanel";
import type { Player } from "@/types/player";

const HUB = HUB_CONFIG.media;

export const MediaView = ({ players }: { players: Player[] }) => (
  <HubShell
    title={HUB.title}
    lead={HUB.lead}
    sections={HUB.sections}
    defaultSectionId="prezentacje"
    sectionsWithOwnHeader={["prezentacje"]}
  >
    {(section) => {
      if (section === "prezentacje") {
        return <PresentationsView players={players} embedded />;
      }
      if (section === "soundtrack") {
        return <SoundtrackPanel />;
      }
      return <LogosDownloadPanel players={players} />;
    }}
  </HubShell>
);
