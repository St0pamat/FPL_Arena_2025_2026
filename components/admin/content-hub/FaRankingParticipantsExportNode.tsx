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

function norm(value: string): string {
  return value.trim().toLowerCase();
}

function isFounderRichmond(p: FaRankingParticipant): boolean {
  const club = norm(p.discordClub);
  const manager = norm(p.fplManager);
  return club.includes("afc richmond") || manager.includes("st0pa");
}

function isFounderWatford(p: FaRankingParticipant): boolean {
  const club = norm(p.discordClub);
  const manager = norm(p.fplManager);
  return club.includes("watford") || manager.includes("baldwiniasty");
}

/** Górny rząd: założyciele; reszta alfabetycznie po FPL Manager. */
function splitFounders(players: FaRankingParticipant[]): {
  founderLeft: FaRankingParticipant | null;
  founderRight: FaRankingParticipant | null;
  remaining: FaRankingParticipant[];
} {
  const founderLeft = players.find(isFounderRichmond) ?? null;
  const founderRight =
    players.find(
      (p) =>
        isFounderWatford(p) &&
        p !== founderLeft,
    ) ?? null;

  const remaining = players
    .filter((p) => p !== founderLeft && p !== founderRight)
    .sort((a, b) =>
      a.fplManager.localeCompare(b.fplManager, "pl", { sensitivity: "base" }),
    );

  return { founderLeft, founderRight, remaining };
}

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
    <div className="flex flex-col items-center justify-center space-y-5 text-center">
      <div className="text-[#39FF14]">{icon}</div>
      <p
        className={`font-athletic text-7xl font-black tabular-nums leading-none tracking-tight ${valueClass}`}
      >
        {value}
      </p>
      <p
        className={`text-xl font-bold uppercase tracking-widest ${labelClass}`}
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
    <article className="col-span-1 flex h-full min-h-[320px] w-full flex-col items-center justify-start overflow-hidden bg-transparent px-2 py-5 text-center">
      <div className="flex h-36 w-full shrink-0 items-center justify-center">
        <ClubCrest
          clubName={player.discordClub}
          logos={logos}
          size="fill"
          className="!h-full !w-full !min-h-0 object-contain"
        />
      </div>
      <div className="mt-4 flex w-full min-w-0 flex-1 flex-col items-center justify-start px-1">
        <div className="flex h-20 w-full items-center justify-center px-1">
          <p
            className={`${PLAYER_IDENTITY.club} line-clamp-2 w-full text-center text-3xl leading-tight`}
            title={player.discordClub}
          >
            {player.discordClub}
          </p>
        </div>
        <div className="mt-2 flex h-14 w-full items-start justify-center">
          <p
            className={`${PLAYER_IDENTITY.manager} line-clamp-2 w-full text-center text-2xl leading-tight`}
            title={player.fplManager}
          >
            {player.fplManager}
          </p>
        </div>
        <div className="mt-1 flex h-12 w-full items-start justify-center">
          <p
            className={`${PLAYER_IDENTITY.fplTeam} line-clamp-2 w-full text-center text-xl leading-tight`}
            title={player.fplTeam || "—"}
          >
            {player.fplTeam?.trim() || "—"}
          </p>
        </div>
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
  const { founderLeft, founderRight, remaining } = splitFounders(players);
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
          centerLockup
        />

        {players.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">
            Brak uczestników do wyświetlenia.
          </p>
        ) : (
          <div className="mx-auto grid w-full grid-cols-6 gap-6 pt-2">
            <div className="col-span-2 flex min-h-[320px] flex-row items-center justify-around rounded-2xl border border-slate-700 bg-slate-800/30 px-6 py-8">
              <StatBlock
                icon={<Users className="h-20 w-20" strokeWidth={1.5} aria-hidden />}
                value={String(managerCount)}
                label="Menedżerów"
              />
              <StatBlock
                icon={<Trophy className="h-20 w-20" strokeWidth={1.5} aria-hidden />}
                value="5"
                label="Dywizji"
              />
            </div>

            {founderLeft ? (
              <PlayerTile
                key={`${founderLeft.discordClub}-${founderLeft.fplManager}`}
                player={founderLeft}
                logos={logos}
              />
            ) : (
              <div className="col-span-1 min-h-[320px]" aria-hidden />
            )}

            {founderRight ? (
              <PlayerTile
                key={`${founderRight.discordClub}-${founderRight.fplManager}`}
                player={founderRight}
                logos={logos}
              />
            ) : (
              <div className="col-span-1 min-h-[320px]" aria-hidden />
            )}

            <div className="col-span-2 flex min-h-[320px] flex-row items-center justify-around rounded-2xl border border-slate-700 bg-slate-800/30 px-6 py-8">
              <StatBlock
                icon={
                  <CalendarDays className="h-20 w-20" strokeWidth={1.5} aria-hidden />
                }
                value="38"
                label="Kolejek (GW)"
              />
              <StatBlock
                icon={<Crown className="h-20 w-20" strokeWidth={1.5} aria-hidden />}
                value="1"
                label="Menedżer Roku"
                valueClass="text-emerald-400"
                labelClass="text-emerald-500"
              />
            </div>

            {remaining.map((player) => (
              <PlayerTile
                key={`${player.discordClub}-${player.fplManager}`}
                player={player}
                logos={logos}
              />
            ))}
          </div>
        )}

        <footer className="mt-12 grid w-full grid-cols-[1fr_auto_1fr] items-center border-t border-slate-800 py-10 text-slate-500">
          <p className="justify-self-start text-left text-lg font-semibold uppercase tracking-[0.2em]">
            Powered by {NA_MINUSIE_EXPORT_BRAND}
          </p>

          <div className="flex flex-col items-center justify-center px-8">
            <span className="mb-4 text-sm font-medium uppercase tracking-[0.25em] text-slate-500">
              Projekt powstał we współpracy
            </span>
            <div className="flex items-center space-x-12">
              <div className="flex flex-col items-end text-right">
                <span className="text-xl font-bold tracking-wide text-slate-300">
                  St0pa | FPL Arena
                </span>
                <span className="mt-1 text-base text-slate-500">
                  Architekt & Twórca Ligi
                </span>
              </div>
              <span className="mx-2 text-4xl font-black text-emerald-500" aria-hidden>
                ×
              </span>
              <div className="flex flex-col items-start text-left">
                <span className="text-xl font-bold tracking-wide text-slate-300">
                  Baldwiniasty | Na Minusie
                </span>
                <span className="mt-1 text-base text-slate-500">
                  Założyciel Społeczności
                </span>
              </div>
            </div>
          </div>

          <div aria-hidden />
        </footer>
      </div>
    </div>
  );
}
