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
  /** Bez ujemnych marginesów — bezpieczne dla html-to-image */
  safeEdges = false,
  size = "default",
}: {
  src: string;
  alt: string;
  circle?: boolean;
  side?: "left" | "right";
  safeEdges?: boolean;
  size?: "default" | "hero";
}) {
  const box =
    size === "hero"
      ? "aspect-square h-[220px] w-[220px] shrink-0"
      : `aspect-square h-[7rem] w-[7rem] shrink-0 sm:h-[8.5rem] sm:w-[8.5rem] ${
          safeEdges ? "self-center" : "self-start"
        } ${
          safeEdges
            ? ""
            : side === "left"
              ? "-ml-3 sm:-ml-5"
              : "-mr-3 sm:-mr-5"
        }`;

  return (
    <div
      className={`${box} ${
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
          circle
            ? safeEdges || size === "hero"
              ? "object-cover"
              : "scale-110 object-cover"
            : size === "hero"
              ? "object-contain"
              : "object-contain object-top"
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
 * `safeEdges` — Grid 1fr|auto|1fr: tytuł zawsze w matematycznym środku (PNG).
 * `centerLockup` — zwarty blok (loga otulają tytuł) — The FA Ranking 1920px.
 */
export function StandingsPromoHeader({
  title,
  subtitle,
  participants = [],
  logos = [],
  safeEdges = false,
  centerLockup = false,
}: {
  title: string;
  subtitle?: string;
  participants?: PromoHeaderParticipant[];
  logos?: ClubLogoRecord[];
  safeEdges?: boolean;
  centerLockup?: boolean;
}) {
  const top10 = participants.slice(0, 10);
  const left = top10.slice(0, 5);
  const right = top10.slice(5, 10);
  const withRoster = left.length > 0 || right.length > 0;

  if (centerLockup) {
    return (
      <header className="mb-16 mt-8 w-full overflow-visible border-b border-emerald-500/30 pb-10">
        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex w-full justify-center">
            <BrandMark
              src={ARENA_PORTAL_LOGO}
              alt={ARENA_PORTAL_ALT}
              side="left"
              safeEdges
              size="hero"
            />
          </div>

          <div className="flex flex-col items-center justify-center px-8 text-center">
            <h2 className="max-w-full font-athletic text-8xl font-black uppercase leading-[0.9] tracking-tight text-white">
              {title}
            </h2>
            <p className="mt-5 text-3xl font-extrabold uppercase tracking-[0.2em] text-emerald-400">
              {NA_MINUSIE_EXPORT_BRAND}
            </p>
            {subtitle ? (
              <p className="mt-2 text-2xl font-bold uppercase tracking-widest text-slate-400">
                {subtitle}
              </p>
            ) : null}
          </div>

          <div className="flex w-full justify-center">
            <BrandMark
              src={NA_MINUSIE_LOGO}
              alt={NA_MINUSIE_LOGO_ALT}
              circle
              side="right"
              safeEdges
              size="hero"
            />
          </div>
        </div>
      </header>
    );
  }

  if (safeEdges) {
    return (
      <header className="mb-8 w-full overflow-visible border-b border-emerald-500/30 pb-4">
        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="justify-self-start">
            <BrandMark
              src={ARENA_PORTAL_LOGO}
              alt={ARENA_PORTAL_ALT}
              side="left"
              safeEdges
            />
          </div>

          <div className="justify-self-center flex max-w-[28rem] flex-col items-center px-2 text-center">
            <p className="text-[10px] font-black uppercase leading-tight tracking-[0.12em] text-emerald-400 sm:text-[13px] sm:tracking-[0.16em]">
              {NA_MINUSIE_EXPORT_BRAND}
            </p>
            {subtitle ? (
              <p className="mt-1 text-[11px] font-semibold leading-tight text-slate-300 sm:text-sm">
                {subtitle}
              </p>
            ) : null}
            <h2 className="mt-2 max-w-full font-athletic text-[1.35rem] uppercase leading-[0.95] tracking-wide text-white sm:text-[2rem]">
              {title}
            </h2>
            {withRoster ? (
              <div className="mt-3 flex w-full max-w-xl items-start justify-center gap-2">
                <CrestStrip participants={left} logos={logos} />
                <CrestStrip participants={right} logos={logos} />
              </div>
            ) : null}
          </div>

          <div className="justify-self-end">
            <BrandMark
              src={NA_MINUSIE_LOGO}
              alt={NA_MINUSIE_LOGO_ALT}
              circle
              side="right"
              safeEdges
            />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="mb-5 overflow-visible border-b border-emerald-500/30 pb-2">
      <div className="flex h-[7.5rem] w-full items-stretch justify-between gap-2 sm:h-[9rem] sm:gap-3">
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
