"use client";

import type { NoBigSixTeam } from "@/lib/no-big-six/types";
import { NoBigSixTeamLogoUpload } from "@/components/admin/no-big-six/NoBigSixTeamLogoUpload";
import { NoBigSixTeamCrest } from "@/components/no-big-six/NoBigSixTeamCrest";

type Props = {
  teams: NoBigSixTeam[];
};

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

          <NoBigSixTeamCrest
            url={team.custom_logo_url}
            teamName={team.team_name}
            sizeClass="mb-4 h-20 w-20"
            shape="rounded"
            initialsChars={2}
          />

          <h3 className="font-semibold text-white">{team.team_name}</h3>
          <p className="mt-1 text-sm text-slate-400">{team.player_name}</p>
          <p className="mt-1 text-[10px] text-slate-600">Entry {team.entry_id}</p>

          <NoBigSixTeamLogoUpload
            entryId={team.entry_id}
            teamName={team.team_name}
            customLogoUrl={team.custom_logo_url}
            disabled={team.is_banned}
          />
        </article>
      ))}
    </div>
  );
}
