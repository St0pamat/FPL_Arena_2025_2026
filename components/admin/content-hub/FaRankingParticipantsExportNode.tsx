"use client";

import type { RefObject, ReactNode } from "react";
import { CalendarDays, Crown, Trophy, Users } from "lucide-react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { FaRankingParticipant } from "@/app/admin/actions/contentHub";
import { ClubCrest } from "@/components/na-minusie/hub/ClubCrest";
import { StandingsPromoHeader } from "@/components/na-minusie/hub/StandingsPromoHeader";
import { NA_MINUSIE_EXPORT_BRAND } from "@/lib/na-minusie";
import { PLAYER_IDENTITY } from "@/lib/na-minusie/playerIdentityStyles";

const EXPORT_BG = "#0B0F19";
const EXPORT_WIDTH = 1920;

function StatBlock({
  icon,
  value,
  label,
  valueClass = "text-white",
  labelClass = "text-slate-400",
}: {
  icon: ReactNode;
  value: string;
  label: string;
  valueClass?: string;
  labelClass?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 text-center">
      <div className="text-[#39FF14]">{icon}</div>
      <p
        className={`font-athletic text-6xl font-black tabular-nums leading-none tracking-tight ${valueClass}`}
      >
        {value}
      </p>
      <p
        className={`text-lg font-bold uppercase tracking-widest ${labelClass}`}
      >
        {label}
      </p>
    </div>
  );
}

function PlayerTile({
  player,
  logos,
}: {
  player: FaRankingParticipant;
  logos: ClubLogoRecord[];
}) {
  return (
    <article className="col-span-1 flex h-full min-h-[280px] w-full flex-col items-center justify-center space-y-4 overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/40 px-4 py-6 text-center">
      <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950/80 ring-1 ring-slate-700/60">
        <ClubCrest
          clubName={player.discordClub}
          logos={logos}
          size="fill"
          className="!h-full !w-full !min-h-0 object-contain"
        />
      </div>
      <div className="flex w-full min-w-0 flex-col space-y-2">
        <p
          className={`${PLAYER_IDENTITY.club} w-full truncate text-xl leading-tight`}
          title={player.discordClub}
        >
          {player.discordClub}
        </p>
        <p
          className={`${PLAYER_IDENTITY.manager} w-full truncate text-lg leading-tight`}
          title={player.fplManager}
        >
          {player.fplManager}
        </p>
        <p
          className={`${PLAYER_IDENTITY.fplTeam} w-full truncate text-base leading-tight`}
          title={player.fplTeam || "—"}
        >
          {player.fplTeam?.trim() || "—"}
        </p>
      </div>
    </article>
  );
}

/**
 * Off-screen: The FA Ranking — grid 6 kolumn.
 * Rząd 1: karta statystyk (2) + 2 graczy + karta statystyk (2).
 * Dalej: 48 graczy × 8 rzędów po 6.
 */
export function FaRankingParticipantsExportNode({
  players,
  logos = [],
  seasonLabel = "2026/27",
  captureRef,
}: {
  players: FaRankingParticipant[];
  logos?: ClubLogoRecord[];
  seasonLabel?: string;
  captureRef: RefObject<HTMLDivElement | null>;
}) {
  const featured = players.slice(0, 2);
  const rest = players.slice(2);
  const managerCount = players.length || 50;

  return (
    <div
      ref={captureRef}
      className="box-border overflow-hidden rounded-2xl border border-slate-800 no-scrollbar"
      style={{
        width: EXPORT_WIDTH,
        minWidth: EXPORT_WIDTH,
        backgroundColor: EXPORT_BG,
      }}
    >
      <div
        className="box-border px-8 pb-12 pt-10"
        style={{ backgroundColor: EXPORT_BG }}
      >
        <StandingsPromoHeader
          title={`THE FA RANKING ${seasonLabel}`}
          subtitle="OFICJALNA LISTA UCZESTNIKÓW"
          safeEdges
        />

        {players.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">
            Brak uczestników do wyświetlenia.
          </p>
        ) : (
          <div className="mx-auto grid w-full grid-cols-6 gap-6 pt-2">
            <div className="col-span-2 flex min-h-[280px] flex-row items-center justify-around rounded-2xl border border-slate-700 bg-slate-800/30 px-6 py-8">
              <StatBlock
                icon={<Users className="h-16 w-16" strokeWidth={1.5} aria-hidden />}
                value={String(managerCount)}
                label="Menedżerów"
              />
              <StatBlock
                icon={<Trophy className="h-16 w-16" strokeWidth={1.5} aria-hidden />}
                value="5"
                label="Dywizji"
              />
            </div>

            {featured.map((player) => (
              <PlayerTile
                key={`${player.discordClub}-${player.fplManager}`}
                player={player}
                logos={logos}
              />
            ))}

            <div className="col-span-2 flex min-h-[280px] flex-row items-center justify-around rounded-2xl border border-slate-700 bg-slate-800/30 px-6 py-8">
              <StatBlock
                icon={
                  <CalendarDays className="h-16 w-16" strokeWidth={1.5} aria-hidden />
                }
                value="38"
                label="Kolejek (GW)"
              />
              <StatBlock
                icon={<Crown className="h-16 w-16" strokeWidth={1.5} aria-hidden />}
                value="1"
                label="Menedżer Roku"
                valueClass="text-emerald-400"
                labelClass="text-emerald-500"
              />
            </div>

            {rest.map((player) => (
              <PlayerTile
                key={`${player.discordClub}-${player.fplManager}`}
                player={player}
                logos={logos}
              />
            ))}
          </div>
        )}

        <footer className="mt-10 flex items-center justify-between gap-4 border-t border-slate-800/80 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Powered by {NA_MINUSIE_EXPORT_BRAND}
          </p>
          <p className="text-[11px] font-medium text-slate-600">
            {players.length} uczestników · alfabetycznie (Discord Club)
          </p>
        </footer>
      </div>
    </div>
  );
}
