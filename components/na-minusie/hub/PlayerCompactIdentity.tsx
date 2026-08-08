"use client";

import Link from "next/link";
import type { PublicTeam } from "@/lib/public/types";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { ClubCrest } from "@/components/na-minusie/hub/ClubCrest";
import {
  identityClubClass,
  identityManagerClass,
} from "@/lib/na-minusie/playerIdentityStyles";

/**
 * Skrócona tożsamość gracza (Design System Na Minusie):
 * [1] Herb + Discord Club · [2] FPL Manager
 */
export function PlayerCompactIdentity({
  team,
  logos,
  size = "md",
  linkToProfile = true,
}: {
  team: PublicTeam;
  logos: ClubLogoRecord[];
  size?: "sm" | "md" | "lg";
  linkToProfile?: boolean;
}) {
  const club = (team.chosen_club || "—").trim();
  const idSize = size === "lg" ? "lg" : size === "sm" ? "sm" : "md";
  const crestCol =
    size === "lg"
      ? "w-14 sm:w-16"
      : size === "sm"
        ? "w-9"
        : "w-11 sm:w-12";

  const inner = (
    <div className="flex min-w-0 items-stretch gap-3">
      <div className={`flex shrink-0 items-center justify-center self-stretch ${crestCol}`}>
        <ClubCrest
          clubName={club}
          logos={logos}
          size="fill"
          className="!h-full !w-full !min-h-0"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className={identityClubClass(idSize, "default", "truncate")}>{club}</p>
        <p className={identityManagerClass(idSize, "default", "truncate")}>
          {team.manager_name}
        </p>
      </div>
    </div>
  );

  if (linkToProfile && team.id) {
    return (
      <Link
        href={`/strefa-gracza/gracz/${team.id}`}
        className="block min-w-0 transition-colors hover:text-emerald-300"
      >
        {inner}
      </Link>
    );
  }

  return inner;
}

/** Mini wiersz rywala w kontekście meczu. */
export function OpponentContext({
  opponent,
  oppFpl,
  logos,
}: {
  opponent: PublicTeam | null;
  oppFpl: number | null;
  logos: ClubLogoRecord[];
}) {
  if (!opponent) return null;
  const club = (opponent.chosen_club || "—").trim();

  return (
    <span className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/50 px-2 py-1">
      <ClubCrest clubName={club} logos={logos} size="sm" className="!h-6 !w-6 shrink-0" />
      <span className="min-w-0 truncate text-[11px]">
        <span className={identityClubClass("xs", "default")}>{club}</span>
        {oppFpl != null ? (
          <span className="text-slate-500"> · {oppFpl} pkt</span>
        ) : null}
      </span>
    </span>
  );
}
