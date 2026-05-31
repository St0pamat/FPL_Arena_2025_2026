import { useState } from "react";

import { PLAYERS_DATA } from "@/data/players";

import { useLeagueData } from "@/hooks/useLeagueData";

import { AppHeader, AppFooter } from "@/components/layout";

import { CONTAINER_BY_TAB, CONTAINER_CLASS } from "@/config/layout";

import { HomeView } from "@/features/home/HomeView";

import { ProfilesView } from "@/features/profiles/ProfilesView";

import { SezonView } from "@/features/sezon/SezonView";

import { StatystykiView } from "@/features/statystyki/StatystykiView";

import { UdostepnijView } from "@/features/udostepnij/UdostepnijView";

import { MediaView } from "@/features/media/MediaView";

import type { AppTab } from "@/config/tabs";

import { ErrorBoundary } from "@/components/ErrorBoundary";



export default function App() {

  const [players] = useState(PLAYERS_DATA);

  const [activeTab, setActiveTab] = useState<AppTab>("home");

  const [magazynOpen, setMagazynOpen] = useState(false);

  const [selectedPlayerId, setSelectedPlayerId] = useState(22952);



  const {

    matchesByGw,

    matchesLoading,

    playerHighlights,

    highlightsLoading,

    seasonHistory,

    seasonHistoryLoading,

    gladiatorOr,

  } = useLeagueData();



  const containerWidth = CONTAINER_BY_TAB[activeTab];

  const mainClass = `app-main w-full mx-auto ${CONTAINER_CLASS[containerWidth]}`;

  const dataLoading = matchesLoading || highlightsLoading || seasonHistoryLoading;



  return (

    <div className="app-shell">

      <div className="fixed top-0 right-0 -z-10 w-full h-full overflow-hidden pointer-events-none opacity-20">

        <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-emerald-600/30 blur-[120px]" />

        <div className="absolute bottom-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px]" />

      </div>



      <AppHeader activeTab={activeTab} onTabChange={setActiveTab} />



      <main className={mainClass}>

        {activeTab === "home" && (

          <HomeView

            magazynOpen={magazynOpen}

            onOpenMagazyn={() => setMagazynOpen(true)}

            onNavigate={setActiveTab}

          />

        )}



        {activeTab === "sezon" && (

          <ErrorBoundary label="Sezon">

            <SezonView
              players={players}
              gladiatorOr={gladiatorOr}
              matchesByGw={matchesByGw}
              playerHighlights={playerHighlights}
              matchesLoading={matchesLoading}
              highlightsLoading={highlightsLoading}
            />

          </ErrorBoundary>

        )}



        {activeTab === "profiles" && (

          <ErrorBoundary label="Gladiatorzy">

            <ProfilesView

              players={players}

              selectedPlayerId={selectedPlayerId}

              onSelectPlayer={setSelectedPlayerId}

              matchesByGw={matchesByGw}

              matchesLoading={matchesLoading}

              playerHighlights={playerHighlights}

              highlightsLoading={highlightsLoading}

              seasonHistory={seasonHistory}

              seasonHistoryLoading={seasonHistoryLoading}

              gladiatorOr={gladiatorOr}

            />

          </ErrorBoundary>

        )}



        {activeTab === "statystyki" && (

          <ErrorBoundary label="Statystyki">

            <StatystykiView

              players={players}

              playerHighlights={playerHighlights}

              seasonHistory={seasonHistory}

              matchesByGw={matchesByGw}

              gladiatorOr={gladiatorOr}

              loading={dataLoading}

            />

          </ErrorBoundary>

        )}



        {activeTab === "udostepnij" && (

          <ErrorBoundary label="Udostępnij">

            <UdostepnijView players={players} playerHighlights={playerHighlights} />

          </ErrorBoundary>

        )}



        {activeTab === "media" && (

          <ErrorBoundary label="Media">

            <MediaView players={players} />

          </ErrorBoundary>

        )}

      </main>



      <AppFooter onTabChange={setActiveTab} />

    </div>

  );

}


