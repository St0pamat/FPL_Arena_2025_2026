"use client";

import Link from "next/link";
import type { PublicTeam } from "@/lib/public/types";
import {
  identityClubClass,
  identityDiscordClass,
  identityFplTeamClass,
  identityManagerClass,
} from "@/lib/na-minusie/playerIdentityStyles";

/** Hierarchia: Discord Club → FPL Manager → FPL Team → Discord nick */
export function TeamIdentity({
  team,
  align = "left",
  size = "md",
  truncate = true,
  linkToProfile = true,
}: {
  team: PublicTeam | null | undefined;
  align?: "left" | "right";
  size?: "sm" | "md";
  /** false = pełne nazwy (H2H / zapowiedź) */
  truncate?: boolean;
  /** Link do profilu gracza w Strefie Gracza */
  linkToProfile?: boolean;
}) {
  if (!team) {
    return <p className="text-sm text-slate-500">—</p>;
  }

  const club = (team.chosen_club || "—").trim();
  const fplTeam = team.fpl_team_name?.trim() || null;
  const alignCls = align === "right" ? "text-right" : "text-left";
  const line = truncate ? "truncate" : "break-words";
  const idSize = size === "sm" ? "sm" : "md";
  const profileHref = `/strefa-gracza/gracz/${team.id}`;
  const hoverCls = linkToProfile
    ? "rounded-md transition-colors hover:text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
    : "";

  const inner = (
    <div className={`min-w-0 ${alignCls}`}>
      <p className={identityClubClass(idSize, "table", line)}>{club}</p>
      <p className={identityManagerClass(idSize, "table", `${line} leading-snug`)}>
        {team.manager_name}
      </p>
      {fplTeam ? (
        <p className={identityFplTeamClass(idSize, "table", `${line} leading-snug`)}>
          {fplTeam}
        </p>
      ) : null}
      <p className={identityDiscordClass(idSize, `${line} leading-snug`)}>
        {team.discord_nick}
      </p>
    </div>
  );

  if (linkToProfile && team.id) {
    return (
      <Link href={profileHref} className={`block min-w-0 ${hoverCls}`}>
        {inner}
      </Link>
    );
  }

  return inner;
}

export function teamPrimaryLabel(team: PublicTeam | null | undefined): string {
  if (!team) return "—";
  return (team.chosen_club || team.fpl_team_name || team.manager_name || "—").trim();
}
