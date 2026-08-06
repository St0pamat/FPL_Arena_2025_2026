"use client";

import Link from "next/link";
import { ArrowLeft, Swords } from "lucide-react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { ClubCrest } from "@/components/na-minusie/hub/ClubCrest";
import type { FormPill } from "@/lib/public/types";
import type { PlayerMatchRow, PlayerZoneProfile } from "@/lib/public/playerZoneTypes";
import {
  identityClubClass,
  identityDiscordClass,
  identityFplTeamClass,
  identityManagerClass,
} from "@/lib/na-minusie/playerIdentityStyles";

function FormStrip({ form }: { form: FormPill[] }) {
  const last5 = form.slice(-5);
  if (last5.length === 0) {
    return <span className="text-sm text-slate-500">Brak rozegranych meczów</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      {last5.map((f) => (
        <span
          key={f.gameweek}
          title={`GW ${f.gameweek}${f.median ? " · Mediana" : ""}`}
          className="text-lg leading-none transition-transform duration-200 hover:scale-110"
        >
          {f.result === "W" ? "🟢" : f.result === "D" ? "⚪" : "🔴"}
        </span>
      ))}
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  accent = "text-white",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-800/50 p-4 backdrop-blur transition-all duration-300 hover:border-slate-600 hover:bg-slate-800/70">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl ${accent}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-400">{sub}</p> : null}
    </div>
  );
}

function MatchHistoryRow({
  row,
  logos,
}: {
  row: PlayerMatchRow;
  logos: ClubLogoRecord[];
}) {
  const resultStyles =
    row.result === "W"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : row.result === "D"
        ? "border-slate-500/30 bg-slate-500/10 text-slate-300"
        : "border-rose-500/30 bg-rose-500/10 text-rose-300";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-700/70 bg-slate-800/40 p-4 backdrop-blur transition-all duration-300 hover:border-slate-600 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="shrink-0 rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-sky-400">
          GW {row.gameweek}
          {row.isPlayoff ? " · PO" : ""}
        </span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1">
          <ClubCrest clubName={row.opponent.chosen_club} logos={logos} size="md" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">
            {row.isHome ? "vs" : "@"} {(row.opponent.chosen_club || "—").trim()}
          </p>
          <p className="truncate text-xs tracking-wide text-[#39FF14] font-semibold">
            {row.opponent.manager_name}
          </p>
          <p className="truncate text-[11px] font-normal text-slate-500">
            {row.opponent.discord_nick}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <span className="rounded-lg bg-slate-900/80 px-3 py-1.5 text-sm font-mono font-bold text-white">
          {row.myFpl}
          <span className="mx-1 text-slate-600">:</span>
          {row.oppFpl}
          <span className="ml-1 text-[10px] font-normal text-slate-500">FPL</span>
        </span>
        <span
          className={`rounded-lg border px-2.5 py-1 text-xs font-black uppercase tracking-wider ${resultStyles}`}
        >
          {row.result === "W" ? "W" : row.result === "D" ? "R" : "L"}
        </span>
        {row.medianBonus ? (
          <span className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
            Mediana +1
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function PlayerProfileView({ profile }: { profile: PlayerZoneProfile }) {
  const { team, standing, divisionName, form, matchHistory, logos, seasonName } = profile;
  const club = (team.chosen_club || "—").trim();
  const fplTeam = team.fpl_team_name?.trim();

  return (
    <div className="space-y-8 animate-fade-in">
      <Link
        href="/strefa-gracza"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition-colors hover:text-sky-400"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Wróć do Strefy Gracza
      </Link>

      {/* Header — Design System tożsamości */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-800/40 p-6 backdrop-blur sm:p-8">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-violet-600/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-sky-600/20 blur-3xl"
          aria-hidden
        />

        <div className="relative z-10 flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <div className="relative">
            <div
              className="absolute inset-0 scale-110 rounded-3xl bg-violet-500/30 blur-3xl"
              aria-hidden
            />
            <span className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl bg-white p-3 shadow-2xl sm:h-36 sm:w-36 sm:p-4">
              <ClubCrest clubName={team.chosen_club} logos={logos} size="lg" className="!h-full !w-full" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-400">
              {seasonName} · {divisionName}
            </p>
            <h1 className={`${identityClubClass("lg", "default", "mt-2 !text-3xl sm:!text-4xl lg:!text-5xl")}`}>
              {club}
            </h1>
            <p className={identityManagerClass("lg", "default", "mt-2")}>{team.manager_name}</p>
            {fplTeam ? (
              <p className={identityFplTeamClass("md", "default", "mt-1")}>{fplTeam}</p>
            ) : null}
            <p className={identityDiscordClass("md", "mt-3")}>
              {team.discord_nick.startsWith("@")
                ? team.discord_nick
                : `@${team.discord_nick}`}
            </p>
            {team.previous_season_or != null ? (
              <p className="mt-3 text-xs font-semibold text-amber-200/90">
                OR 2025/26: #{team.previous_season_or}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatTile
          label="Dywizja · Miejsce"
          value={standing ? `#${standing.position}` : "—"}
          sub={divisionName}
          accent="text-sky-400"
        />
        <StatTile
          label="Bilans H2H"
          value={
            standing ? `${standing.won}-${standing.drawn}-${standing.lost}` : "0-0-0"
          }
          sub="Wygrane · Remisy · Porażki"
        />
        <div className="rounded-xl border border-slate-700/80 bg-slate-800/50 p-4 backdrop-blur transition-all duration-300 hover:border-slate-600 hover:bg-slate-800/70">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Forma</p>
          <div className="mt-3">
            <FormStrip form={form} />
          </div>
          <p className="mt-2 text-xs text-slate-400">Ostatnie 5 meczów H2H</p>
        </div>
        <StatTile
          label="Punkty ligowe"
          value={standing ? String(standing.totalPoints) : "0"}
          sub={
            standing
              ? `${standing.h2hPoints} H2H + ${standing.medianPoints} Mediana · ${standing.fplPoints} FPL`
              : undefined
          }
          accent="text-emerald-400"
        />
      </div>

      {/* Match history */}
      <section aria-labelledby="match-history-heading">
        <div className="mb-4 flex items-center gap-2">
          <Swords className="h-5 w-5 text-slate-500" aria-hidden />
          <h2
            id="match-history-heading"
            className="font-athletic text-xl font-bold uppercase tracking-wide text-white"
          >
            Historia meczów
          </h2>
        </div>

        {matchHistory.length === 0 ? (
          <div className="rounded-xl border border-slate-700/80 bg-slate-800/40 px-6 py-10 text-center text-sm text-slate-400">
            Brak rozegranych meczów w tym sezonie.
          </div>
        ) : (
          <div className="space-y-3">
            {matchHistory.map((row) => (
              <MatchHistoryRow key={row.fixtureId} row={row} logos={logos} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
