import type { Player } from "@/types/player";
import { PLAYER_BY_ID } from "@/config/playersIndex";
import { PRESENTATION_COLUMNS } from "@/data/presentations";
import { PageContainer, PageHeader } from "@/components/layout";
import { PresentationCard } from "./components/PresentationCard";

export const PresentationsView = ({ players, embedded = false }: { players: Player[]; embedded?: boolean }) => {
  const knownIds = new Set(players.map((p) => p.id));

  const body = (
    <>
      <PageHeader
        title="Prezentacje Gladiatorów"
        lead="Poznaj wszystkich uczestników ligi — każdy z własnym filmem wprowadzającym, historią klubu i pełnym tekstem lektora do przeczytania."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-7 items-stretch">
        {PRESENTATION_COLUMNS.map((column, colIdx) => (
          <div key={colIdx} className="flex flex-col gap-6 lg:gap-7 min-w-0">
            {column.map((pres) => {
              const player = PLAYER_BY_ID[pres.playerId];
              if (!player || !knownIds.has(pres.playerId)) return null;
              return (
                <PresentationCard
                  key={pres.playerId}
                  player={player}
                  presentation={pres}
                />
              );
            })}
          </div>
        ))}
      </div>
    </>
  );

  if (embedded) return body;
  return <PageContainer width="full">{body}</PageContainer>;
};
