"use client";

import type { PublicTeam } from "@/lib/public/types";

/** Hierarchia: Discord Club → FPL Team → Manager → Discord nick (4 linie) */
export function TeamIdentity({
  team,
  align = "left",
  size = "md",
  truncate = true,
}: {
  team: PublicTeam | null | undefined;
  align?: "left" | "right";
  size?: "sm" | "md";
  /** false = pełne nazwy (H2H / zapowiedź) */
  truncate?: boolean;
}) {
  if (!team) {
    return <p className="text-sm text-slate-500">—</p>;
  }

  const club = (team.chosen_club || "—").trim();
  const fplTeam = team.fpl_team_name?.trim() || null;
  const alignCls = align === "right" ? "text-right" : "text-left";
  const line = truncate ? "truncate" : "break-words";
  const clubCls =
    size === "sm"
      ? `${line} text-sm font-black uppercase tracking-wide text-white`
      : `${line} font-bold uppercase tracking-wide text-white`;

  return (
    <div className={`min-w-0 ${alignCls}`}>
      <p className={clubCls}>{club}</p>
      {fplTeam ? (
        <p className={`${line} text-[11px] font-medium leading-snug text-sky-300/90 sm:text-xs`}>
          {fplTeam}
        </p>
      ) : null}
      <p className={`${line} text-[11px] font-semibold leading-snug text-[#39FF14] sm:text-xs`}>
        {team.manager_name}
      </p>
      <p className={`${line} text-[10px] leading-snug text-slate-500 sm:text-[11px]`}>
        {team.discord_nick}
      </p>
    </div>
  );
}

export function teamPrimaryLabel(team: PublicTeam | null | undefined): string {
  if (!team) return "—";
  return (team.chosen_club || team.fpl_team_name || team.manager_name || "—").trim();
}
