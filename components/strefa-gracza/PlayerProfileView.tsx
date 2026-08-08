"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Swords } from "lucide-react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { FA_RANKING_LOGO_NAME, resolveTierLogoName } from "@/lib/admin/tierLogos";
import { ClubCrest } from "@/components/na-minusie/hub/ClubCrest";
import { TierCrest } from "@/components/na-minusie/TierCrest";
import type { FormPill } from "@/lib/public/types";
import type { PlayerMatchRow, PlayerZoneProfile } from "@/lib/public/playerZoneTypes";
import {
  identityClubClass,
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
  valueExtra,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  valueExtra?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 transition-all duration-300 hover:border-slate-700">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className={`mt-2 flex flex-wrap items-baseline text-2xl font-extrabold tracking-tight sm:text-3xl ${accent}`}>
        <span>{value}</span>
        {valueExtra}
      </p>
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

  const opponentHref = row.opponent?.id
    ? `/strefa-gracza/gracz/${row.opponent.id}`
    : null;

  const identityBlock = (
    <>
      <span className="flex w-11 shrink-0 items-center justify-center self-stretch sm:w-12">
        <ClubCrest
          clubName={row.opponent.chosen_club}
          logos={logos}
          size="fill"
          className="!h-full !w-full !min-h-0"
        />
      </span>
      <div className="flex min-w-0 flex-col justify-center">
        <p className="truncate text-sm font-bold text-white">
          {row.isHome ? "vs" : "@"} {(row.opponent.chosen_club || "—").trim()}
        </p>
        <p className="truncate text-xs font-semibold tracking-wide text-[#39FF14]">
          {row.opponent.manager_name}
        </p>
        <p className="truncate text-[11px] font-normal text-slate-500">
          {row.opponent.discord_nick}
        </p>
      </div>
    </>
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-700/70 bg-slate-800/40 p-4 backdrop-blur transition-all duration-300 hover:border-slate-600 sm:flex-row sm:items-center">
      <div className="flex min-h-[3.25rem] min-w-0 flex-1 items-stretch gap-3">
        <span className="flex shrink-0 items-center rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-sky-400">
          GW {row.gameweek}
          {row.isPlayoff ? " · PO" : ""}
        </span>
        {opponentHref ? (
          <Link
            href={opponentHref}
            className="flex min-w-0 flex-1 items-stretch gap-2.5 rounded-lg transition-colors hover:bg-slate-900/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            {identityBlock}
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-stretch gap-2.5">{identityBlock}</div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <span className="rounded-lg bg-slate-900/80 px-3 py-1.5 font-mono text-sm font-bold text-white">
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
  const {
    team,
    standing,
    divisionName,
    form,
    matchHistory,
    logos,
    seasonName,
    tier,
    faRankingPosition,
    faRankingPlayers,
    faTrendDelta,
    faTotalPoints,
    ppg,
    highScore,
    lowScore,
    playedGameweeks,
    targetGameweeks,
    fplPointsDiff,
  } = profile;
  const club = (team.chosen_club || "—").trim();
  const fplTeam = team.fpl_team_name?.trim();
  const tierCrestName = resolveTierLogoName(divisionName, tier);
  const tierLogos = profile.tierLogos ?? [];

  const trendLabel =
    faTrendDelta == null
      ? null
      : faTrendDelta > 0
        ? `↑ ${faTrendDelta}`
        : faTrendDelta < 0
          ? `↓ ${Math.abs(faTrendDelta)}`
          : "→ 0";
  const trendAccent =
    faTrendDelta == null
      ? "text-slate-400"
      : faTrendDelta > 0
        ? "text-emerald-400"
        : faTrendDelta < 0
          ? "text-rose-400"
          : "text-slate-400";

  const fplDiffLabel =
    fplPointsDiff > 0
      ? `+${fplPointsDiff} pkt`
      : fplPointsDiff < 0
        ? `${fplPointsDiff} pkt`
        : "0 pkt";

  return (
    <div className="space-y-8 animate-fade-in">
      <Link
        href="/strefa-gracza"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition-colors hover:text-sky-400"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Wróć do Strefy Gracza
      </Link>

      <header className="relative overflow-visible rounded-2xl border border-slate-700/80 bg-slate-800/40 p-6 backdrop-blur sm:p-8">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-violet-600/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-sky-600/20 blur-3xl"
          aria-hidden
        />

        <div className="relative z-10 flex items-stretch gap-4 sm:gap-6">
          <div className="relative shrink-0 self-center overflow-visible">
            <div
              className="absolute inset-0 scale-110 rounded-3xl bg-violet-500/30 blur-3xl"
              aria-hidden
            />
            <span className="relative flex h-28 w-28 items-center justify-center overflow-visible sm:h-36 sm:w-36">
              <span className="flex h-full w-full scale-[1.28] items-center justify-center sm:scale-[1.32]">
                <ClubCrest
                  clubName={team.chosen_club}
                  logos={logos}
                  size="lg"
                  className="!h-full !w-full"
                />
              </span>
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-sky-400 sm:text-base sm:tracking-[0.2em]">
              {seasonName} · {divisionName}
            </p>
            <h1
              className={`${identityClubClass("lg", "default", "mt-2 !text-3xl sm:!text-4xl lg:!text-5xl")}`}
            >
              {club}
            </h1>
            <p
              className={`${identityManagerClass("lg", "default", "mt-2 !text-xl sm:!text-2xl lg:!text-3xl")}`}
            >
              {team.manager_name}
            </p>
            {fplTeam ? (
              <p
                className={`${identityFplTeamClass("lg", "default", "mt-1.5 !text-base sm:!text-lg lg:!text-xl")}`}
              >
                {fplTeam}
              </p>
            ) : null}
            {team.previous_season_or != null ? (
              <p className="mt-3 text-xs font-semibold text-amber-200/90">
                OR 2025/26: #{team.previous_season_or}
              </p>
            ) : null}
          </div>

          <div className="relative shrink-0 self-center overflow-visible">
            <div
              className="absolute inset-0 scale-110 rounded-3xl bg-emerald-500/20 blur-3xl"
              aria-hidden
            />
            <span className="relative flex h-28 w-28 items-center justify-center overflow-visible sm:h-36 sm:w-36">
              <span className="flex h-full w-full scale-[1.28] items-center justify-center sm:scale-[1.32]">
                <TierCrest
                  tierName={tierCrestName}
                  logos={tierLogos}
                  plain
                  className="!h-full !w-full !max-h-full !rounded-2xl !p-0"
                />
              </span>
            </span>
          </div>
        </div>
      </header>

      {/* —— 1. The FA Ranking —— */}
      <section
        aria-labelledby="fa-ranking-heading"
        className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 sm:p-6"
      >
        <div className="mb-5 flex items-center gap-3">
          <TierCrest
            tierName={FA_RANKING_LOGO_NAME}
            logos={tierLogos}
            plain
            className="!h-10 !w-10 !rounded-lg !p-0 shrink-0"
          />
          <div className="min-w-0">
            <h2
              id="fa-ranking-heading"
              className="font-athletic text-lg font-bold uppercase tracking-wide text-white sm:text-xl"
            >
              The FA Ranking
            </h2>
            <p className="text-xs text-slate-500">
              Klasyfikacja ogólna FPL ARENA: Na Minusie ™
              {faRankingPlayers > 0 ? ` · ${faRankingPlayers} graczy` : ""}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile
            label="Pozycja w FA Ranking"
            value={faRankingPosition != null ? `#${faRankingPosition}` : "—"}
            sub={
              faRankingPlayers > 0
                ? "na serwerze"
                : "brak danych kampanii"
            }
            accent="text-amber-400"
            valueExtra={
              trendLabel ? (
                <span className={`ml-2 text-base font-bold sm:text-lg ${trendAccent}`}>
                  {trendLabel}
                </span>
              ) : null
            }
          />
          <StatTile
            label="Suma Punktów Total"
            value={`${faTotalPoints} pkt`}
            sub="łączny dorobek klasyczny"
            accent="text-white"
          />
          <StatTile
            label="Średnia punktów (PPG)"
            value={ppg != null ? `${ppg} pkt/GW` : "—"}
            sub="średnia małych punktów na kolejkę"
            accent="text-emerald-300"
          />
          <StatTile
            label="Rekord kolejki (High Score)"
            value={highScore ? `${highScore.points} pkt` : "—"}
            sub={highScore ? `GW${highScore.gameweek}` : "brak meczów"}
            accent="text-violet-300"
          />
          <StatTile
            label="Najgorsza kolejka (Low Score)"
            value={lowScore ? `${lowScore.points} pkt` : "—"}
            sub={lowScore ? `GW${lowScore.gameweek}` : "brak meczów"}
            accent="text-rose-300"
          />
          <StatTile
            label="Rozegrane kolejki"
            value={`${playedGameweeks} / ${targetGameweeks}`}
            sub="zaliczone kolejki kampanii"
            accent="text-sky-300"
          />
        </div>
      </section>

      {/* —— 2. Dywizja H2H —— */}
      <section
        aria-labelledby="division-h2h-heading"
        className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 sm:p-6"
      >
        <div className="mb-5 flex items-center gap-3">
          <TierCrest
            tierName={tierCrestName}
            logos={tierLogos}
            plain
            className="!h-10 !w-10 !rounded-lg !p-0 shrink-0"
          />
          <div className="min-w-0">
            <h2
              id="division-h2h-heading"
              className="font-athletic text-lg font-bold uppercase tracking-wide text-white sm:text-xl"
            >
              {divisionName}
            </h2>
            <p className="text-xs text-slate-500">Rozgrywki Head-to-Head</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile
            label="Pozycja w Dywizji"
            value={standing ? `#${standing.position}` : "—"}
            sub={divisionName !== "—" ? `w ${divisionName}` : undefined}
            accent="text-sky-400"
          />
          <StatTile
            label="Bilans H2H"
            value={
              standing
                ? `${standing.won} - ${standing.drawn} - ${standing.lost}`
                : "0 - 0 - 0"
            }
            sub="Wygrane · Remisy · Porażki"
            accent="text-white"
          />
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 transition-all duration-300 hover:border-slate-700">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Forma H2H
            </p>
            <div className="mt-3">
              <FormStrip form={form} />
            </div>
            <p className="mt-2 text-xs text-slate-400">Ostatnie 5 meczów</p>
          </div>
          <StatTile
            label="Punkty Ligowe H2H"
            value={`${standing?.h2hPoints ?? 0} pkt`}
            sub="czyste punkty do tabeli dywizyjnej"
            accent="text-white"
          />
          <StatTile
            label="Bonusy z Mediany"
            value={`+${standing?.medianPoints ?? 0} pkt`}
            sub="zdobyte bonusy mediany"
            accent="text-emerald-400"
          />
          <StatTile
            label="Bilans Małych Punktów"
            value={fplDiffLabel}
            sub="różnica FPL w meczach H2H"
            accent={
              fplPointsDiff > 0
                ? "text-emerald-300"
                : fplPointsDiff < 0
                  ? "text-rose-300"
                  : "text-slate-300"
            }
          />
        </div>
      </section>

      {/* —— 3. Historia meczów —— */}
      <section aria-labelledby="match-history-heading">
        <div className="mb-4 flex items-center gap-2">
          <Swords className="h-5 w-5 text-slate-500" aria-hidden />
          <h2
            id="match-history-heading"
            className="font-athletic text-xl font-bold uppercase tracking-wide text-white"
          >
            Historia meczów H2H
          </h2>
        </div>

        {matchHistory.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-6 py-10 text-center text-sm text-slate-400">
            Brak rozegranych meczów w tej dywizji.
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
