"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MessageCircle, Users } from "lucide-react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { ClubCrest } from "@/components/na-minusie/hub/ClubCrest";
import {
  identityClubClass,
  identityDiscordClass,
  identityFplTeamClass,
  identityManagerClass,
} from "@/lib/na-minusie/playerIdentityStyles";
import type { PublicTeam } from "@/lib/public/types";
import type { PlayerSearchEntry } from "@/lib/public/playerZoneTypes";

function toDisplayTeam(p: PlayerSearchEntry | PublicTeam): PublicTeam {
  if ("teamId" in p) {
    return {
      id: p.teamId,
      chosen_club: p.chosen_club,
      manager_name: p.manager_name,
      discord_nick: p.discord_nick,
      fpl_team_name: p.fpl_team_name,
      fpl_id: null,
    };
  }
  return p;
}

function ParticipantCard({
  team,
  logos,
}: {
  team: PublicTeam;
  logos: ClubLogoRecord[];
}) {
  const club = (team.chosen_club || "—").trim();
  const fplTeam = team.fpl_team_name?.trim();
  const discord = team.discord_nick?.trim();

  return (
    <Link
      href={`/strefa-gracza/gracz/${team.id}`}
      className="group flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-3 transition-all hover:border-slate-700 sm:p-4"
    >
      <div className="flex min-w-0 items-start gap-2">
        <ClubCrest
          clubName={club}
          logos={logos}
          size="sm"
          className="!h-6 !w-6 shrink-0 mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <p className={identityClubClass("md", "default", "truncate")}>{club}</p>
          <p className={identityManagerClass("md", "default", "truncate")}>
            {team.manager_name}
          </p>
          {fplTeam ? (
            <p className={identityFplTeamClass("md", "default", "truncate")}>{fplTeam}</p>
          ) : null}
        </div>
      </div>

      {discord ? (
        <span className="mt-3 inline-flex max-w-full items-center gap-1.5 self-start rounded-md border border-slate-800 bg-slate-950/60 px-2 py-0.5">
          <MessageCircle className="h-3 w-3 shrink-0 text-slate-500" aria-hidden />
          <span className={identityDiscordClass("sm", "truncate")}>
            {discord.startsWith("@") ? discord : `@${discord}`}
          </span>
        </span>
      ) : null}
    </Link>
  );
}

/** Zakładka Uczestnicy — siatka 2×5 graczy aktywnej dywizji. */
export function ParticipantsPanel({
  players = [],
  teams,
  logos,
  divisionId,
  divisionName,
}: {
  players?: PlayerSearchEntry[];
  teams?: PublicTeam[];
  logos: ClubLogoRecord[];
  divisionId?: string;
  divisionName?: string;
}) {
  const divisionTeams = useMemo(() => {
    if (teams && teams.length > 0) {
      return [...teams].sort((a, b) => {
        const aClub = (a.chosen_club || a.manager_name).trim();
        const bClub = (b.chosen_club || b.manager_name).trim();
        return aClub.localeCompare(bClub, "pl");
      });
    }

    return players
      .filter((p) => !divisionId || p.divisionId === divisionId)
      .map(toDisplayTeam)
      .sort((a, b) => {
        const aClub = (a.chosen_club || a.manager_name).trim();
        const bClub = (b.chosen_club || b.manager_name).trim();
        return aClub.localeCompare(bClub, "pl");
      });
  }, [teams, players, divisionId]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <header>
        <h2 className="font-athletic text-2xl uppercase tracking-wide text-white sm:text-3xl">
          Uczestnicy
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-400">
          Skład aktywnej dywizji — kliknij kafelek, aby otworzyć profil gracza.
        </p>
        {divisionName ? (
          <p className="mt-2 text-xs font-semibold text-slate-300">{divisionName}</p>
        ) : null}
      </header>

      {divisionTeams.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 px-6 py-12 text-center text-sm text-slate-500">
          {divisionName
            ? `Brak uczestników w ${divisionName}.`
            : "Brak uczestników do wyświetlenia."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {divisionTeams.map((team) => (
            <ParticipantCard key={team.id} team={team} logos={logos} />
          ))}
        </div>
      )}

      <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
        <Users className="h-3.5 w-3.5" aria-hidden />
        {divisionTeams.length}{" "}
        {divisionTeams.length === 1 ? "uczestnik" : "uczestników"}
        {divisionName ? ` · ${divisionName}` : ""}
      </p>
    </div>
  );
}
