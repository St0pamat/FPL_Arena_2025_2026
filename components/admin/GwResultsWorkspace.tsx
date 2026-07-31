"use client";

import { useState } from "react";
import { GwResultsBatchPanel } from "@/components/admin/GwResultsBatchPanel";
import { GwResultsStandingsPanel } from "@/components/admin/GwResultsStandingsPanel";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { Pyramid, Season } from "@/lib/admin/types";

export function GwResultsWorkspace({
  seasons,
  pyramids,
  logos,
}: {
  seasons: Season[];
  pyramids: Pyramid[];
  logos: ClubLogoRecord[];
}) {
  const [seasonId, setSeasonId] = useState("");
  const [pyramidId, setPyramidId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-8">
      <GwResultsBatchPanel
        seasons={seasons}
        pyramids={pyramids}
        seasonId={seasonId}
        pyramidId={pyramidId}
        onSeasonChange={setSeasonId}
        onPyramidChange={setPyramidId}
        onSettledSuccess={() => setRefreshKey((k) => k + 1)}
      />
      <GwResultsStandingsPanel
        seasons={seasons}
        pyramids={pyramids}
        logos={logos}
        seasonId={seasonId}
        pyramidId={pyramidId}
        onSeasonChange={setSeasonId}
        onPyramidChange={setPyramidId}
        refreshKey={refreshKey}
      />
    </div>
  );
}
