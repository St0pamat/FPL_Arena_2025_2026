"use client";

import Link from "next/link";
import type { PublicTeam } from "@/lib/public/types";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { ClubCrest } from "@/components/na-minusie/hub/ClubCrest";
import {
  identityClubClass,
  identityDiscordClass,
  identityFplTeamClass,
  identityManagerClass,
  type PlayerIdentitySize,
} from "@/lib/na-minusie/playerIdentityStyles";

/**
 * Design System — tożsamość gracza:
 * [1] Herb + Discord Club · [2] FPL Manager · [3] FPL Team · [4] Discord (opcjonalnie)
 */
export function StatPlayerIdentity({
  team,
  logos,
  showFplTeam = true,
  showDiscord = false,
  size = "md",
  linkToProfile = true,
}: {
  team: PublicTeam;
  logos: ClubLogoRecord[];
  showFplTeam?: boolean;
  showDiscord?: boolean;
  size?: "sm" | "md" | "lg";
  linkToProfile?: boolean;
}) {
  const club = (team.chosen_club || "—").trim();
  const fplTeam = team.fpl_team_name?.trim();
  const idSize: PlayerIdentitySize = size === "lg" ? "lg" : size === "sm" ? "sm" : "md";
  const crestCol =
    size === "lg"
      ? "w-6 sm:w-7"
      : size === "sm"
        ? "w-5"
        : "w-5";

  const inner = (
    <div className="flex min-w-0 items-stretch gap-2.5">
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
        <p className={identityManagerClass(idSize, "default", "truncate")}>{team.manager_name}</p>
        {showFplTeam && fplTeam ? (
          <p className={identityFplTeamClass(idSize, "default", "truncate")}>{fplTeam}</p>
        ) : null}
        {showDiscord ? (
          <p className={identityDiscordClass(idSize, "truncate")}>{team.discord_nick}</p>
        ) : null}
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
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-slate-800 bg-slate-950/60 px-2 py-0.5">
      <ClubCrest clubName={club} logos={logos} size="sm" className="!h-4 !w-4 shrink-0" />
      <span className="min-w-0 truncate text-[11px]">
        <span className={identityClubClass("xs", "default")}>{club}</span>
        {oppFpl != null ? (
          <span className="text-slate-500"> · {oppFpl} pkt</span>
        ) : null}
      </span>
    </span>
  );
}

export function GwBadge({ gameweek }: { gameweek: number }) {
  return (
    <span className="inline-flex shrink-0 rounded-md bg-sky-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-sky-300 ring-1 ring-sky-500/30">
      GW{gameweek}
    </span>
  );
}
