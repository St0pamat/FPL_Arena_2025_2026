"use client";

import { ClubLogo } from "@/components/admin/ClubLogo";
import {
  findClubLogo,
  resolveClubLogoSrc,
  type ClubLogoRecord,
  type ClubLogoSize,
} from "@/lib/admin/clubLogos";

export function resolveLogoSrc(
  logos: ClubLogoRecord[] | unknown,
  clubName: string | null | undefined | number,
): string | null {
  const hit = findClubLogo(logos, clubName);
  return hit ? resolveClubLogoSrc(hit) : null;
}

/**
 * Układ względem VS (terminarz):
 * - home (lewa):  [nazwa] [LOGO]  ← logo przy VS
 * - away (prawa): [LOGO] [nazwa]  ← logo przy VS
 */
export function ClubNameWithLogo({
  clubName,
  logos,
  size = "lg",
  align = "left",
  nameClassName = "text-sm font-black uppercase tracking-wide text-white sm:text-base",
  meta,
}: {
  clubName: string;
  logos: ClubLogoRecord[];
  size?: ClubLogoSize;
  /** left = strona gospodarzy (logo po prawej, przy VS); right = goście (logo po lewej, przy VS) */
  align?: "left" | "right";
  nameClassName?: string;
  meta?: string;
}) {
  const src = resolveLogoSrc(logos, clubName);
  const logo = <ClubLogo src={src} clubName={clubName} size={size} fill />;
  const text = (
    <div className={`flex min-w-0 flex-col justify-center ${align === "left" ? "text-right" : "text-left"}`}>
      <p className={`truncate leading-tight ${nameClassName}`}>{clubName}</p>
      {meta ? (
        <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-400 sm:text-xs">{meta}</p>
      ) : null}
    </div>
  );

  if (align === "left") {
    return (
      <div className="flex min-h-[3rem] min-w-0 items-stretch justify-end gap-2">
        {text}
        {logo}
      </div>
    );
  }

  return (
    <div className="flex min-h-[3rem] min-w-0 items-stretch justify-start gap-2">
      {logo}
      {text}
    </div>
  );
}
