"use client";

import type { RefObject } from "react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { GwMatchCard } from "@/lib/public/types";
import { LinkedCrestOnly } from "@/components/na-minusie/hub/LinkedTeamCell";
import { TeamIdentity } from "@/components/na-minusie/hub/TeamIdentity";
import {
  DiscordExportFrame,
  slugForExport,
} from "@/components/na-minusie/hub/DiscordExport";

/**
 * Lustrzany kafelek jak na stronie (Terminarz / MatchCard):
 * Klub · Menedżer · FPL Team · Discord — herb przy środku.
 */
function PreviewMatchRow({
  match,
  logos,
}: {
  match: GwMatchCard;
  logos: ClubLogoRecord[];
}) {
  const { fixture } = match;

  return (
    <article className="w-full rounded-xl border border-slate-800/50 bg-slate-900/40 px-6 py-3">
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-6">
        {/* Gospodarz: tekst → herb */}
        <div className="flex min-w-0 items-center justify-end gap-4">
          <div className="min-w-0 flex-1">
            <TeamIdentity
              team={fixture.home_team}
              align="right"
              size="md"
              truncate={false}
              linkToProfile={false}
            />
          </div>
          <LinkedCrestOnly
            team={fixture.home_team}
            logos={logos}
            colClass="w-14 sm:w-16"
          />
        </div>

        <div className="justify-self-center shrink-0 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-slate-400">
          VS
        </div>

        {/* Gość: herb → tekst */}
        <div className="flex min-w-0 items-center justify-start gap-4">
          <LinkedCrestOnly
            team={fixture.away_team}
            logos={logos}
            colClass="w-14 sm:w-16"
          />
          <div className="min-w-0 flex-1">
            <TeamIdentity
              team={fixture.away_team}
              align="left"
              size="md"
              truncate={false}
              linkToProfile={false}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Off-screen PNG zapowiedzi kolejki — pełna 4-liniowa tożsamość jak na stronie.
 */
export function GameweekPreviewExportNode({
  matches,
  logos,
  gameweek,
  divisionName,
  seasonName,
  pyramidName,
  captureRef,
}: {
  matches: GwMatchCard[];
  logos: ClubLogoRecord[];
  gameweek: number;
  divisionName: string;
  seasonName?: string;
  pyramidName?: string;
  captureRef: RefObject<HTMLDivElement | null>;
}) {
  const title = `🔜 Zapowiedź Kolejki ${gameweek} | ${divisionName}`;
  const subtitle = [seasonName, pyramidName, divisionName]
    .filter(Boolean)
    .join(" · ");
  const fileName = `${
    slugForExport(["zapowiedz", `gw${gameweek}`, divisionName]) || "zapowiedz"
  }.png`;

  return (
    <DiscordExportFrame
      fileName={fileName}
      title={title}
      subtitle={subtitle}
      hideControls
      captureRef={captureRef}
      exportId="content-hub-zapowiedz"
      safeExportEdges
    >
      {matches.length === 0 ? (
        <p className="mb-8 w-full py-6 text-center text-sm text-slate-500">
          Brak meczów dla GW{gameweek}.
        </p>
      ) : (
        <div className="mb-8 flex w-full flex-col gap-4">
          {matches.map((m) => (
            <PreviewMatchRow key={m.fixture.id} match={m} logos={logos} />
          ))}
        </div>
      )}
    </DiscordExportFrame>
  );
}
