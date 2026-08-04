"use client";

import { Lock, Medal, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type {
  PublicSeasonSummaryPayload,
  SeasonSummaryPlayerRow,
} from "@/lib/public/types";
import { ClubCrest } from "@/components/na-minusie/hub/ClubCrest";
import { TeamIdentity } from "@/components/na-minusie/hub/TeamIdentity";

function PlayerTile({
  row,
  logos,
  accent,
}: {
  row: SeasonSummaryPlayerRow;
  logos: ClubLogoRecord[];
  accent: "green" | "red" | "amber";
}) {
  const border =
    accent === "green"
      ? "border-emerald-500/40 bg-emerald-500/5"
      : accent === "red"
        ? "border-red-500/40 bg-red-500/5"
        : "border-amber-500/40 bg-amber-500/5";
  const badge =
    accent === "green"
      ? "bg-emerald-500/15 text-emerald-400"
      : accent === "red"
        ? "bg-red-500/15 text-red-400"
        : "bg-amber-500/15 text-amber-300";

  return (
    <article
      className={`flex items-center gap-3 rounded-2xl border px-3 py-3 sm:gap-4 sm:px-4 ${border}`}
    >
      <ClubCrest clubName={row.team.chosen_club} logos={logos} size="lg" />
      <div className="min-w-0 flex-1">
        <TeamIdentity team={row.team} size="sm" truncate={false} />
        <p className="mt-1 text-[11px] text-slate-400">
          {row.fromDivisionName}
          {accent !== "amber" ? ` · ${row.toDivisionHint}` : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <span
          className={`inline-flex rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wide ${badge}`}
        >
          {row.statusLabel}
        </span>
        {row.totalPoints != null ? (
          <p className="mt-1 font-mono text-xs font-bold text-slate-300">
            {row.totalPoints} pkt
          </p>
        ) : null}
      </div>
    </article>
  );
}

function PodiumCard({
  row,
  place,
  logos,
}: {
  row: SeasonSummaryPlayerRow;
  place: 1 | 2 | 3;
  logos: ClubLogoRecord[];
}) {
  const styles = {
    1: {
      wrap: "order-1 border-amber-400/50 bg-gradient-to-b from-amber-500/20 to-slate-950 sm:order-2 sm:-mt-4",
      crown: "text-amber-300",
      label: "Mistrz",
      ring: "ring-amber-400/40",
    },
    2: {
      wrap: "order-2 border-slate-400/40 bg-gradient-to-b from-slate-400/15 to-slate-950 sm:order-1",
      crown: "text-slate-300",
      label: "Wicemistrz",
      ring: "ring-slate-400/30",
    },
    3: {
      wrap: "order-3 border-orange-700/40 bg-gradient-to-b from-orange-700/20 to-slate-950 sm:order-3",
      crown: "text-orange-400",
      label: "3. miejsce",
      ring: "ring-orange-600/30",
    },
  }[place];

  return (
    <article
      className={`flex flex-col items-center rounded-2xl border p-5 text-center ring-1 ${styles.wrap} ${styles.ring}`}
    >
      <Medal className={`mb-2 h-8 w-8 ${styles.crown}`} aria-hidden />
      <p className={`text-[10px] font-black uppercase tracking-[0.25em] ${styles.crown}`}>
        {styles.label}
      </p>
      <div className="mt-3">
        <ClubCrest clubName={row.team.chosen_club} logos={logos} size="lg" />
      </div>
      <div className="mt-3 w-full text-center [&_.min-w-0]:mx-auto [&_.min-w-0]:text-center">
        <TeamIdentity team={row.team} align="left" size="sm" truncate={false} />
      </div>
      <p className="mt-3 font-mono text-2xl font-black text-white">
        {row.totalPoints ?? "—"}
        <span className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-500">
          pkt
        </span>
      </p>
      {row.fplPoints != null ? (
        <p className="text-[11px] text-slate-500">FPL łącznie: {row.fplPoints}</p>
      ) : null}
    </article>
  );
}

/** Zakładka 🏆 Podsumowanie Sezonu — kłódka lub raport EoS. */
export function SeasonSummaryView({
  summary,
  loading,
  logos = [],
}: {
  summary: PublicSeasonSummaryPayload | null;
  loading?: boolean;
  logos?: ClubLogoRecord[];
}) {
  if (loading || !summary) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 text-sm text-slate-500">
        Ładowanie podsumowania…
      </div>
    );
  }

  if (summary.locked) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-16 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-slate-700 bg-slate-950">
          <Lock className="h-7 w-7 text-slate-500" aria-hidden />
        </div>
        <h2 className="font-athletic text-2xl uppercase tracking-wide text-white sm:text-3xl">
          Podsumowanie Sezonu
        </h2>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-400 sm:text-base">
          Podsumowanie sezonu i oficjalne rozstrzygnięcia pojawią się tutaj po
          rozegraniu wszystkich spotkań i zakończeniu baraży.
        </p>
      </div>
    );
  }

  if (summary.error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 px-4 py-6 text-sm text-rose-200">
        {summary.error}
      </div>
    );
  }

  const champion = summary.podium.find((p) => p.status === "CHAMPION");
  const runner = summary.podium.find((p) => p.status === "RUNNER_UP");
  const third = summary.podium.find((p) => p.status === "THIRD_PLACE");

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 px-5 py-6 sm:px-7">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-400">
          Raport końcowy
        </p>
        <h2 className="mt-1 font-athletic text-2xl uppercase tracking-wide text-white sm:text-3xl">
          🏆 Podsumowanie · {summary.seasonName}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Oficjalne rozstrzygnięcia po fazie zasadniczej i barażach.
        </p>
      </header>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          <h3 className="font-athletic text-lg uppercase tracking-wide text-white">
            👑 Podium Ligi
          </h3>
        </div>
        {!champion && !runner && !third ? (
          <p className="rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
            Brak danych podium Tier 1.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
            {runner ? (
              <PodiumCard row={runner} place={2} logos={logos} />
            ) : (
              <div className="hidden sm:block" />
            )}
            {champion ? (
              <PodiumCard row={champion} place={1} logos={logos} />
            ) : null}
            {third ? (
              <PodiumCard row={third} place={3} logos={logos} />
            ) : (
              <div className="hidden sm:block" />
            )}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          <h3 className="font-athletic text-lg uppercase tracking-wide text-white">
            🟩 Awanse
          </h3>
        </div>
        {summary.promotions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-emerald-500/20 px-4 py-8 text-center text-sm text-slate-500">
            Brak awansów w tym sezonie (lub tylko jedna dywizja).
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {summary.promotions.map((row) => (
              <PlayerTile key={row.teamId} row={row} logos={logos} accent="green" />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-red-400" />
          <h3 className="font-athletic text-lg uppercase tracking-wide text-white">
            🟥 Spadki
          </h3>
        </div>
        {summary.relegations.length === 0 ? (
          <p className="rounded-xl border border-dashed border-red-500/20 px-4 py-8 text-center text-sm text-slate-500">
            Brak spadków w tym sezonie.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {summary.relegations.map((row) => (
              <PlayerTile key={row.teamId} row={row} logos={logos} accent="red" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
