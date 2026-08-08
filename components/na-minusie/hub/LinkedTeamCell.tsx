"use client";

import Link from "next/link";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { PublicTeam } from "@/lib/public/types";
import { ClubCrest } from "@/components/na-minusie/hub/ClubCrest";
import { TeamIdentity } from "@/components/na-minusie/hub/TeamIdentity";

/**
 * Herb + tożsamość → profil.
 * Zasady: bez białego tła, herb max wysokości wiersza, bez powiększania wiersza.
 */
export function LinkedTeamCell({
  team,
  logos,
  align = "left",
  identitySize = "sm",
  truncate = true,
  className = "",
  linkToProfile = true,
  /** Szerokość kolumny herbu (wysokość = stretch wiersza) */
  crestColClass = "w-11 sm:w-12",
}: {
  team: PublicTeam | null | undefined;
  logos: ClubLogoRecord[];
  /** @deprecated — zawsze fill wysokości wiersza */
  crestSize?: "fill" | "md" | "lg";
  align?: "left" | "right";
  identitySize?: "sm" | "md";
  truncate?: boolean;
  className?: string;
  linkToProfile?: boolean;
  crestColClass?: string;
}) {
  if (!team) {
    return <p className="text-sm text-slate-500">—</p>;
  }

  const row = (
    <div
      className={`flex min-w-0 items-stretch gap-2.5 ${
        align === "right" ? "flex-row-reverse" : ""
      } ${className}`.trim()}
    >
      <div
        className={`flex shrink-0 items-center justify-center self-stretch py-0.5 ${crestColClass}`}
      >
        <ClubCrest
          clubName={team.chosen_club}
          logos={logos}
          size="fill"
          className="!h-full !w-full !min-h-0"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <TeamIdentity
          team={team}
          align={align}
          size={identitySize}
          truncate={truncate}
          linkToProfile={false}
        />
      </div>
    </div>
  );

  if (!linkToProfile || !team.id) return row;

  return (
    <Link
      href={`/strefa-gracza/gracz/${team.id}`}
      className="group block min-w-0 rounded-lg outline-none transition-colors hover:bg-slate-800/40 focus-visible:ring-2 focus-visible:ring-emerald-500/60"
    >
      <div className="transition-opacity group-hover:opacity-95 [&_p]:transition-colors group-hover:[&_p:first-child]:text-emerald-300">
        {row}
      </div>
    </Link>
  );
}

/**
 * Sam herb (wyniki / terminarz) — wypełnia wysokość rodzica ze stretch.
 */
export function LinkedCrestOnly({
  team,
  logos,
  className = "",
  /** Stała szerokość kolumny; wysokość bierze z self-stretch rodzica */
  colClass = "w-14 sm:w-16",
}: {
  team: PublicTeam | null | undefined;
  logos: ClubLogoRecord[];
  /** @deprecated */
  size?: "fill" | "md" | "lg";
  className?: string;
  colClass?: string;
}) {
  const crest = (
    <div
      className={`flex shrink-0 items-center justify-center self-stretch ${colClass} ${className}`.trim()}
    >
      <ClubCrest
        clubName={team?.chosen_club}
        logos={logos}
        size="fill"
        className="!h-full !w-full !min-h-0"
      />
    </div>
  );

  if (!team?.id) return crest;

  return (
    <Link
      href={`/strefa-gracza/gracz/${team.id}`}
      className={`flex shrink-0 self-stretch transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${colClass}`}
      title={`Profil: ${team.manager_name}`}
    >
      <ClubCrest
        clubName={team.chosen_club}
        logos={logos}
        size="fill"
        className="!h-full !w-full !min-h-0"
      />
    </Link>
  );
}
