"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import {
  chunkFARankingRows,
  type FARankingPayload,
} from "@/lib/public/faRanking";
import {
  DiscordExportFrame,
  slugForExport,
} from "@/components/na-minusie/hub/DiscordExport";
import { FARankingExportSlice } from "@/components/na-minusie/hub/FARankingTable";

const CHUNK = 10;

function CarouselChunk({
  slice,
  index,
  data,
  logos,
  registerRef,
}: {
  slice: FARankingPayload["rows"];
  index: number;
  data: FARankingPayload;
  logos: ClubLogoRecord[];
  registerRef: (index: number, ref: RefObject<HTMLDivElement | null>) => void;
}) {
  const captureRef = useRef<HTMLDivElement>(null);
  const from = index * CHUNK + 1;
  const to = index * CHUNK + slice.length;
  const title =
    slice.length > 0
      ? `The FA Ranking (Miejsca ${from}–${to})`
      : "The FA Ranking";
  const fileName =
    slugForExport(["fa-ranking", `${from}-${to}`, data.campaignLabel]) ||
    `fa-ranking-${from}-${to}`;

  useEffect(() => {
    registerRef(index, captureRef);
  }, [index, registerRef]);

  return (
    <DiscordExportFrame
      fileName={fileName}
      title={title}
      subtitle={data.campaignLabel}
      hideControls
      captureRef={captureRef}
    >
      <FARankingExportSlice
        rows={slice}
        logos={logos}
        finishedGameweeks={data.finishedGameweeks}
        title={title}
        subtitle={
          data.latestFinishedGw != null
            ? `Po GW${data.latestFinishedGw} · forma: ost. 6 kolejek`
            : undefined
        }
        totalRowsInFullTable={data.rows.length}
      />
    </DiscordExportFrame>
  );
}

/**
 * Off-screen karuzela: tabela FA Ranking pocięta na paczki po 10 graczy.
 */
export function FARankingExportCarousel({
  data,
  logos,
  onReady,
}: {
  data: FARankingPayload;
  logos: ClubLogoRecord[];
  onReady: (refs: RefObject<HTMLDivElement | null>[]) => void;
}) {
  const chunks = chunkFARankingRows(data.rows, CHUNK);
  const mapRef = useRef<Map<number, RefObject<HTMLDivElement | null>>>(
    new Map(),
  );

  const registerRef = (index: number, ref: RefObject<HTMLDivElement | null>) => {
    mapRef.current.set(index, ref);
    const ordered: RefObject<HTMLDivElement | null>[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const r = mapRef.current.get(i);
      if (r) ordered.push(r);
    }
    if (ordered.length === chunks.length) {
      onReady(ordered);
    }
  };

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-[-10000px] top-0 z-[-1] w-[960px] opacity-0"
    >
      {chunks.map((slice, idx) => (
        <CarouselChunk
          key={`${idx}-${slice[0]?.playerKey ?? "empty"}`}
          slice={slice}
          index={idx}
          data={data}
          logos={logos}
          registerRef={registerRef}
        />
      ))}
    </div>
  );
}
