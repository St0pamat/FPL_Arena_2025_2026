"use client";

import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { ARENA_PORTAL_ALT, ARENA_PORTAL_LOGO } from "@/lib/arena";
import {
  NA_MINUSIE_EXPORT_BRAND,
  NA_MINUSIE_LOGO,
  NA_MINUSIE_LOGO_ALT,
} from "@/lib/na-minusie";
import { ClubCrest } from "@/components/na-minusie/hub/ClubCrest";

export type PromoHeaderParticipant = {
  clubName: string;
  managerName: string;
};

function ParticipantCrest({
  clubName,
  managerName,
  logos,
}: {
  clubName: string;
  managerName: string;
  logos: ClubLogoRecord[];
}) {
  const label = managerName.trim() || "—";

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center">
      <div className="aspect-square w-full max-w-[4.5rem]">
        <ClubCrest
          clubName={clubName}
          logos={logos}
          size="fill"
          className="!h-full !w-full !min-h-0"
        />
      </div>
      <p
        className="mt-0 flex h-[2em] w-full items-center justify-center px-0.5 text-center text-[8px] font-semibold leading-none text-slate-400 sm:text-[9px]"
        title={label}
      >
        <span className="line-clamp-2 break-words leading-[1.05] hyphens-auto">
          {label}
        </span>
      </p>
    </div>
  );
}

function CrestStrip({
  participants,
  logos,
}: {
  participants: PromoHeaderParticipant[];
  logos: ClubLogoRecord[];
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-center gap-1 self-center sm:gap-1.5">
      {participants.map((p, i) => (
        <ParticipantCrest
          key={`${p.clubName}-${p.managerName}-${i}`}
          clubName={p.clubName}
          managerName={p.managerName}
          logos={logos}
        />
      ))}
    </div>
  );
}

function BrandMark({
  src,
  alt,
  /** Okrągły kontener — ten sam rozmiar co logo Arena (np. Na Minusie) */
  circle = false,
  /** Arena → lewo, Na Minusie → prawo */
  side = "left",
}: {
  src: string;
  alt: string;
  circle?: boolean;
  side?: "left" | "right";
}) {
  return (
    <div
      className={`aspect-square h-[7rem] shrink-0 self-start sm:h-[8.5rem] ${
        side === "left" ? "-ml-3 sm:-ml-5" : "-mr-3 sm:-mr-5"
      } ${
        circle
          ? "overflow-hidden rounded-full bg-[#F5C542] ring-1 ring-white/10"
          : ""
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- html-to-image */}
      <img
        src={src}
        alt={alt}
        className={`box-border h-full w-full object-center ${
          circle ? "scale-110 object-cover" : "object-contain object-top"
        }`}
        crossOrigin="anonymous"
        decoding="async"
      />
    </div>
  );
}

function TitleBlock({
  title,
  subtitle,
  compact,
}: {
  title: string;
  subtitle?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex h-full shrink-0 flex-col items-center px-1 text-center ${
        compact ? "min-w-0 flex-1" : "w-[11.5rem] sm:w-[15rem] md:w-[17rem]"
      }`}
    >
      {/* Góra: brand + sezon tuż nad tytułem */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-end gap-0.5 pb-0.5 sm:gap-1 sm:pb-1">
        <p className="text-[10px] font-black uppercase leading-tight tracking-[0.12em] text-emerald-400 sm:text-[13px] sm:tracking-[0.16em]">
          {NA_MINUSIE_EXPORT_BRAND}
        </p>
        {subtitle ? (
          <p className="text-[11px] font-semibold leading-tight text-slate-300 sm:text-sm md:text-base">
            {subtitle}
          </p>
        ) : null}
      </div>

      {/* Premier League — idealnie w połowie wysokości paska */}
      <h2 className="max-w-full shrink-0 font-athletic text-[1.35rem] uppercase leading-[0.95] tracking-wide text-white sm:text-[2rem] md:text-[2.35rem]">
        {title}
      </h2>

      {/* Dół: puste flex-1 = równoważy górę, trzymając tytuł w środku */}
      <div className="min-h-0 flex-1" aria-hidden />
    </div>
  );
}

/**
 * Logotypy przyklejone do górnej krawędzi, podpisy tuż pod herbami.
 * Teksty na środku — bez zmian (wyśrodkowane w pionie).
 */
export function StandingsPromoHeader({
  title,
  subtitle,
  participants = [],
  logos = [],
}: {
  title: string;
  subtitle?: string;
  participants?: PromoHeaderParticipant[];
  logos?: ClubLogoRecord[];
}) {
  const top10 = participants.slice(0, 10);
  const left = top10.slice(0, 5);
  const right = top10.slice(5, 10);
  const withRoster = left.length > 0 || right.length > 0;

  return (
    <header className="mb-5 overflow-visible border-b border-emerald-500/30">
      <div className="flex h-[7.5rem] items-stretch gap-1 sm:h-[9rem] sm:gap-1.5">
        <BrandMark src={ARENA_PORTAL_LOGO} alt={ARENA_PORTAL_ALT} side="left" />

        {withRoster ? (
          <>
            <CrestStrip participants={left} logos={logos} />
            <TitleBlock title={title} subtitle={subtitle} />
            <CrestStrip participants={right} logos={logos} />
          </>
        ) : (
          <TitleBlock title={title} subtitle={subtitle} compact />
        )}

        <BrandMark
          src={NA_MINUSIE_LOGO}
          alt={NA_MINUSIE_LOGO_ALT}
          circle
          side="right"
        />
      </div>
    </header>
  );
}
