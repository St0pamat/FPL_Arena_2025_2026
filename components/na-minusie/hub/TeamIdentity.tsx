"use client";

import type { PublicTeam } from "@/lib/public/types";

/** Hierarchia: Discord Club → FPL Team → Manager · Discord nick */
export function TeamIdentity({
  team,
  align = "left",
  size = "md",
}: {
  team: PublicTeam | null | undefined;
  align?: "left" | "right";
  size?: "sm" | "md";
}) {
  if (!team) {
    return <p className="text-sm text-slate-500">—</p>;
  }

  const club = (team.chosen_club || "—").trim();
  const fplTeam = team.fpl_team_name?.trim() || null;
  const alignCls = align === "right" ? "text-right" : "text-left";
  const clubCls =
    size === "sm"
      ? "truncate text-sm font-black uppercase tracking-wide text-white"
      : "truncate font-bold uppercase tracking-wide text-white";

  return (
    <div className={`min-w-0 ${alignCls}`}>
      <p className={clubCls}>{club}</p>
      {fplTeam ? (
        <p className="truncate text-[11px] font-medium leading-tight text-slate-400 sm:text-xs">
          {fplTeam}
        </p>
      ) : null}
      <p className="truncate text-[10px] leading-tight text-slate-500 sm:text-[11px]">
        {team.manager_name} · {team.discord_nick}
      </p>
    </div>
  );
}

export function teamPrimaryLabel(team: PublicTeam | null | undefined): string {
  if (!team) return "—";
  return (team.chosen_club || team.fpl_team_name || team.manager_name || "—").trim();
}
