import { useMemo } from "react";

import type { Player } from "@arena/types/player";

import type { PlayerHighlightsMap } from "@arena/types/highlights";

import type { PlayerSeasonHistoryMap } from "@arena/types/seasonHistory";

import { PageContainer, PageHeader } from "@arena/components/layout";

import { HallFameCard } from "@arena/features/hall/components/HallFameCard";

import { buildExtraHallAwards } from "@arena/features/hall/lib/awards";

import { buildPantheonEncyclopediaSections } from "@arena/features/hall/lib/pantheonRecords";



export const HallOfFameView = ({
  players,
  playerHighlights,
  seasonHistory = {},
  embedded = false,
}: {
  players: Player[];
  playerHighlights: PlayerHighlightsMap;
  seasonHistory?: PlayerSeasonHistoryMap;
  embedded?: boolean;
}) => {

  const extraAwards = useMemo(

    () => buildExtraHallAwards(players, playerHighlights, seasonHistory),

    [players, playerHighlights, seasonHistory]

  );



  const encyclopedia = useMemo(

    () => buildPantheonEncyclopediaSections(players, playerHighlights),

    [players, playerHighlights]

  );



  const body = (
    <>
      {!embedded && (
        <PageHeader
          title="Panteon Areny"
          lead="Encyklopedia rekordów sezonu 2025/26 — flagowe osiągnięcia, kompromitacje i ekstremalne liczby z całej FPL Arena."
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 lg:gap-7">

        <HallFameCard

          emoji="👑"

          border="border-t-yellow-500"

          title="Oficjalny Mistrz Ligi"

          playerIds={[22952]}

          body={

            <>

              Zmiażdżył ligę Wiosennym Terrorem (

              <strong className="text-yellow-400">12 zwycięstw H2H z rzędu</strong>!) i ukończył na kosmicznym{" "}

              <strong className="text-yellow-400">665. miejscu OR</strong> w rankingu globu.

            </>

          }

        />

        <HallFameCard

          emoji="🚀"

          border="border-t-emerald-500"

          title="Najlepszy weekend sezonu"

          playerIds={[24962]}

          body={

            <>

              Astronomiczne <strong className="text-emerald-400">137 punktów w kolejce 33</strong> (Bench Boost).

              Najwyższy pojedynczy wynik w historii tej edycji ligi.

            </>

          }

        />

        <HallFameCard

          emoji="🎭"

          border="border-t-purple-500"

          title="Największy pechowiec H2H"

          playerIds={[9084]}

          body={

            <>

              Wykręcił <strong className="text-purple-300">4. najlepszy Score</strong> w lidze (2341 pkt FPL), a przez

              brutalny terminarz H2H skończył dopiero na <strong className="text-purple-400">14. miejscu</strong>.

            </>

          }

        />

        <HallFameCard

          emoji="🪓"

          border="border-t-red-500"

          title="Rzeźnicy transferowi"

          playerIds={[3749264, 68435]}

          body={

            <>

              Ankara: <strong className="text-red-400">-36 pkt</strong> z hitów w sezonie. Alan: legendarne{" "}

              <strong className="text-red-400">-60 pkt</strong> w jednej kolejce (GW3) po nocnej serii transferów.

            </>

          }

        />

        <HallFameCard

          emoji="⛓️"

          border="border-t-slate-600"

          title="Piwnica sezonu"

          playerIds={[546068]}

          body={

            <>

              Rekord ligi: <strong className="text-red-500">17 porażek H2H z rzędu</strong> (od kolejki 20 do 36).

              Koszmar, z którego trudno się podnieść.

            </>

          }

        />

        <HallFameCard

          emoji="🛋️"

          border="border-t-orange-500"

          title="Władca marnotrawstwa"

          playerIds={[49321]}

          body={

            <>

              Na ławce zostawił <strong className="text-orange-400">382 punkty</strong> — rekord Areny. Gdyby weszły

              do gry, mógłby być mistrzem.

            </>

          }

        />



        {extraAwards.map((award) => (

          <HallFameCard

            key={award.id}

            emoji={award.emoji}

            border={award.border}

            title={award.title}

            playerIds={award.playerIds}

            body={award.body}

          />

        ))}

      </div>



      {encyclopedia.length > 0 && (

        <div className="mt-14 space-y-10">

          <div>

            <h2 className="text-fluid-2xl font-athletic font-bold text-white uppercase tracking-wide">

              Rekordy w liczbach

            </h2>

            <p className="text-fluid-base text-slate-400 mt-2 leading-relaxed">

              Uzupełnienie flagowych kart — surowe statystyki i kamienie milowe sezonu.

            </p>

          </div>



          {encyclopedia.map(({ category, cards }) => (

            <section key={category}>

              <h3 className="text-fluid-lg font-athletic font-bold text-emerald-400/90 uppercase tracking-wide mb-5">

                {category}

              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

                {cards.map((card) => (

                  <HallFameCard

                    key={card.id}

                    emoji={card.emoji}

                    border={card.border}

                    title={card.title}

                    playerIds={card.playerIds}

                    body={

                      <>

                        <strong className={card.valueClass}>{card.value}</strong>

                        <span className="text-slate-400"> · </span>

                        {card.details}

                      </>

                    }

                  />

                ))}

              </div>

            </section>

          ))}

        </div>
      )}
    </>
  );

  if (embedded) return body;
  return <PageContainer width="full">{body}</PageContainer>;
};


