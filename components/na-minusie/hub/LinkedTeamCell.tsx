"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { PublicTeam } from "@/lib/public/types";
import { ClubCrest } from "@/components/na-minusie/hub/ClubCrest";
import { TeamIdentity } from "@/components/na-minusie/hub/TeamIdentity";

/**
 * Herb + tożsamość jako jeden link do karty menedżera.
 * Unika zagnieżdżonych <a> (TeamIdentity z linkToProfile=false).
 */
export function LinkedTeamCell({
  team,
  logos,
  crestSize = "md",
  align = "left",
  identitySize = "sm",
  truncate = true,
  className = "",
  linkToProfile = true,
}: {
  team: PublicTeam | null | undefined;
  logos: ClubLogoRecord[];
  crestSize?: "fill" | "md" | "lg";
  align?: "left" | "right";
  identitySize?: "sm" | "md";
  truncate?: boolean;
  className?: string;
  linkToProfile?: boolean;
}) {
  if (!team) {
    return <p className="text-sm text-slate-500">—</p>;
  }

  const row = (
    <div
      className={`flex min-w-0 items-center gap-2.5 ${
        align === "right" ? "flex-row-reverse" : ""
      } ${className}`.trim()}
    >
      <ClubCrest clubName={team.chosen_club} logos={logos} size={crestSize} />
      <TeamIdentity
        team={team}
        align={align}
        size={identitySize}
        truncate={truncate}
        linkToProfile={false}
      />
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

export function LinkedCrestOnly({
  team,
  logos,
  size = "lg",
  children,
}: {
  team: PublicTeam | null | undefined;
  logos: ClubLogoRecord[];
  size?: "fill" | "md" | "lg";
  children?: ReactNode;
}) {
  const crest = (
    <ClubCrest clubName={team?.chosen_club} logos={logos} size={size} />
  );
  if (!team?.id) return crest;
  return (
    <Link
      href={`/strefa-gracza/gracz/${team.id}`}
      className="shrink-0 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
      title={`Profil: ${team.manager_name}`}
    >
      {children ?? crest}
    </Link>
  );
}
