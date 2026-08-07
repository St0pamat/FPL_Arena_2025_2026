"use client";

import { CLUB_LOGO_SIZES, type ClubLogoSize } from "@/lib/admin/clubLogos";

interface ClubLogoProps {
  src?: string | null;
  clubName?: string | null;
  size?: ClubLogoSize;
  className?: string;
}

/**
 * Crest 1:1, object-contain — w kafelkach: fill wysokości rodzica (max herb).
 * Z plikiem: bez tła / ramki (PNG transparency widoczne).
 * Bez pliku: lekki placeholder z inicjałem.
 */
export function ClubLogo({
  src,
  clubName,
  size = "md",
  fill = false,
  className = "",
}: ClubLogoProps & { fill?: boolean }) {
  const px = CLUB_LOGO_SIZES[size];
  const initial = (clubName?.trim()?.charAt(0) || "?").toUpperCase();

  const shell = fill
    ? `relative aspect-square h-auto w-auto min-h-[2.75rem] shrink-0 self-stretch py-px ${className}`.trim()
    : `relative inline-flex shrink-0 items-center justify-center ${className}`;

  if (src) {
    return (
      <span
        className={shell}
        style={fill ? undefined : { width: px, height: px }}
        title={clubName ?? undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- lokalne crestsy (/club-logos, /uploads/logos) */}
        <img
          src={src}
          alt={clubName ? `Logo ${clubName}` : ""}
          width={fill ? undefined : px}
          height={fill ? undefined : px}
          className={
            fill
              ? "absolute inset-0 m-auto h-full w-full object-contain p-px"
              : "h-full w-full object-contain"
          }
          loading="lazy"
          decoding="async"
        />
      </span>
    );
  }

  return (
    <span
      className={`${shell} rounded-full border border-dashed border-slate-600/70 bg-transparent`}
      style={fill ? undefined : { width: px, height: px }}
      title={clubName ?? undefined}
      aria-hidden
    >
      <span
        className="absolute inset-0 flex select-none items-center justify-center font-black text-slate-500"
        style={{ fontSize: fill ? undefined : Math.max(11, Math.round(px * 0.38)) }}
      >
        {initial}
      </span>
    </span>
  );
}
