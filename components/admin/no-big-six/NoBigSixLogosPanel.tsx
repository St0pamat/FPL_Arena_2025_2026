"use client";

import type { NoBigSixTeam } from "@/lib/no-big-six/types";
import { NoBigSixTeamLogoUpload } from "@/components/admin/no-big-six/NoBigSixTeamLogoUpload";

type Props = {
  teams: NoBigSixTeam[];
};

function teamInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

export function NoBigSixLogosPanel({ teams }: Props) {
  const sorted = [...teams].sort((a, b) => {
    if (a.is_banned !== b.is_banned) return a.is_banned ? 1 : -1;
    return a.team_name.localeCompare(b.team_name, "pl");
  });

  if (sorted.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-800 bg-slate-900/60 px-6 py-10 text-center text-sm text-slate-400">
        Brak zespołów w bazie — najpierw uruchom synchronizację FPL.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sorted.map((team) => (
        <article
          key={team.entry_id}
          className={`flex flex-col items-center rounded-xl border p-6 text-center ${
            team.is_banned
              ? "border-rose-900/50 bg-slate-900/30 opacity-70"
              : "border-slate-800 bg-slate-900/60"
          }`}
        >
          {team.is_banned ? (
            <span className="mb-3 rounded border border-rose-500/40 bg-rose-950/50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-400">
              Zbanowany — brak uploadu
            </span>
          ) : null}

          {team.custom_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={team.custom_logo_url}
              alt={`Herb ${team.team_name}`}
              className="mb-4 h-20 w-20 rounded-2xl border border-slate-700 object-cover"
            />
          ) : (
            <div
              className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 font-athletic text-2xl font-bold text-amber-500"
              aria-hidden
            >
              {teamInitials(team.team_name)}
            </div>
          )}

          <h3 className="font-semibold text-white">{team.team_name}</h3>
          <p className="mt-1 text-sm text-slate-400">{team.player_name}</p>
          <p className="mt-1 text-[10px] text-slate-600">Entry {team.entry_id}</p>

          <NoBigSixTeamLogoUpload
            entryId={team.entry_id}
            teamName={team.team_name}
            disabled={team.is_banned}
          />
        </article>
      ))}
    </div>
  );
}
