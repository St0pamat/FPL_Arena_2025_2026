"use client";

import { Lock, Medal, Trophy } from "lucide-react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type {
  PublicSeasonSummaryPayload,
  SeasonSummaryDivisionBlock,
  SeasonSummaryPlayerRow,
  SeasonSummaryPlayoffMatch,
} from "@/lib/public/types";
import { ClubCrest } from "@/components/na-minusie/hub/ClubCrest";
import {
  identityClubClass,
  identityDiscordClass,
  identityFplTeamClass,
  identityManagerClass,
} from "@/lib/na-minusie/playerIdentityStyles";
import { divisionLabel } from "@/lib/na-minusie/divisionLabels";

function IdentityBlock({
  team,
  logos,
  size = "md",
  centered = false,
  align = "left",
}: {
  team: SeasonSummaryPlayerRow["team"];
  logos: ClubLogoRecord[];
  size?: "sm" | "md" | "lg";
  centered?: boolean;
  align?: "left" | "right";
}) {
  const club = (team.chosen_club || "—").trim();
  const fplTeam = team.fpl_team_name?.trim();
  const crestCls =
    size === "lg"
      ? "!h-16 !w-16 sm:!h-20 sm:!w-20"
      : size === "sm"
        ? "!h-10 !w-10"
        : "!h-12 !w-12 sm:!h-14 sm:!w-14";
  const idSize = size === "lg" ? "lg" : size === "sm" ? "sm" : "md";
  const isRight = align === "right";

  if (centered) {
    return (
      <div className="flex min-w-0 flex-col items-center text-center">
        <ClubCrest
          clubName={club}
          logos={logos}
          size={size === "lg" ? "lg" : "md"}
          className={`${crestCls} mb-2 shrink-0`}
        />
        <div className="min-w-0 w-full">
          <p className={identityClubClass(idSize, "default", "truncate")}>{club}</p>
          <p className={identityManagerClass(idSize, "default", "truncate")}>
            {team.manager_name}
          </p>
          {fplTeam ? (
            <p className={identityFplTeamClass(idSize, "default", "truncate")}>{fplTeam}</p>
          ) : null}
          <p className={identityDiscordClass(idSize, "truncate")}>
            {team.discord_nick?.startsWith("@")
              ? team.discord_nick
              : `@${team.discord_nick}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex min-w-0 items-start gap-2.5 ${isRight ? "flex-row-reverse text-right" : "text-left"}`}
    >
      <ClubCrest
        clubName={club}
        logos={logos}
        size={size === "lg" ? "lg" : "md"}
        className={`${crestCls} shrink-0`}
      />
      <div className="min-w-0 flex-1">
        <p className={identityClubClass(idSize, "default", "truncate")}>{club}</p>
        <p className={identityManagerClass(idSize, "default", "truncate")}>
          {team.manager_name}
        </p>
        {fplTeam ? (
          <p className={identityFplTeamClass(idSize, "default", "truncate")}>{fplTeam}</p>
        ) : null}
        <p className={identityDiscordClass(idSize, "truncate")}>
          {team.discord_nick?.startsWith("@")
            ? team.discord_nick
            : `@${team.discord_nick}`}
        </p>
      </div>
    </div>
  );
}

function PointsLine({ row }: { row: SeasonSummaryPlayerRow }) {
  return (
    <div className="mt-2 space-y-0.5">
      <p className="font-mono text-lg font-black text-white sm:text-xl">
        {row.totalPoints ?? "—"}
        <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          pkt H2H
        </span>
      </p>
      {row.fplPoints != null ? (
        <p className="text-[11px] text-slate-500">FPL łącznie: {row.fplPoints}</p>
      ) : null}
    </div>
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
      wrap: "order-1 border-amber-500/50 bg-amber-950/20 sm:order-2 sm:pb-8 sm:pt-6",
      crown: "text-amber-300",
      label: "🏆 Mistrz",
      height: "sm:min-h-[22rem]",
      crest: "lg" as const,
    },
    2: {
      wrap: "order-2 border-slate-400/30 bg-slate-900/60 sm:order-1 sm:pb-5 sm:pt-4 sm:mt-8",
      crown: "text-slate-300",
      label: "Wicemistrz",
      height: "sm:min-h-[18rem]",
      crest: "md" as const,
    },
    3: {
      wrap: "order-3 border-amber-700/30 bg-amber-950/10 sm:order-3 sm:pb-4 sm:pt-3 sm:mt-12",
      crown: "text-amber-600",
      label: "3. miejsce",
      height: "sm:min-h-[16rem]",
      crest: "md" as const,
    },
  }[place];

  return (
    <article
      className={`flex flex-col items-center rounded-lg border p-4 text-center backdrop-blur-sm sm:p-5 ${styles.wrap} ${styles.height}`}
    >
      <Medal className={`mb-1.5 h-7 w-7 ${styles.crown}`} aria-hidden />
      <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${styles.crown}`}>
        {styles.label}
      </p>
      <div className="mt-3 w-full">
        <IdentityBlock team={row.team} logos={logos} size={styles.crest} centered />
      </div>
      <PointsLine row={row} />
    </article>
  );
}

function MovementTile({
  row,
  logos,
  accent,
  message,
}: {
  row: SeasonSummaryPlayerRow;
  logos: ClubLogoRecord[];
  accent: "green" | "red";
  message: string;
}) {
  const club = (row.team.chosen_club || "—").trim();
  const fplTeam = row.team.fpl_team_name?.trim();
  const discord = row.team.discord_nick?.startsWith("@")
    ? row.team.discord_nick
    : `@${row.team.discord_nick}`;

  const border =
    accent === "green"
      ? "border-emerald-500/35 bg-emerald-500/5"
      : "border-red-500/35 bg-red-500/5";
  const badge =
    accent === "green"
      ? "border border-emerald-800/50 bg-emerald-950/40 text-emerald-400"
      : "border border-rose-800/50 bg-rose-950/40 text-rose-400";

  return (
    <article
      className={`flex w-full items-center gap-3 rounded-lg border p-3 sm:gap-4 sm:p-4 ${border}`}
    >
      {/* Herb — wysokość kafelka */}
      <ClubCrest
        clubName={club}
        logos={logos}
        size="lg"
        className="!h-14 !w-14 shrink-0 self-center sm:!h-16 sm:!w-16"
      />

      {/* Nazwy — pionowo przy herbie */}
      <div className="min-w-0 flex-1">
        <p className={identityClubClass("sm", "default", "break-words")}>{club}</p>
        <p className={identityManagerClass("sm", "default", "break-words")}>
          {row.team.manager_name}
        </p>
        {fplTeam ? (
          <p className={identityFplTeamClass("xs", "default", "break-words")}>{fplTeam}</p>
        ) : null}
        <p className={identityDiscordClass("xs", "break-words")}>{discord}</p>
      </div>

      {/* Badge — na prawo od nazw */}
      <span
        className={`inline-flex w-fit shrink-0 items-center rounded-md px-2 py-1 text-center text-[10px] font-black uppercase tracking-wide sm:text-xs ${badge}`}
      >
        {message}
      </span>

      {/* Punkty — duże, wyśrodkowane w pionie, po prawej */}
      {row.totalPoints != null ? (
        <div className="flex shrink-0 flex-col items-end justify-center pl-1">
          <span className="text-2xl font-black tabular-nums leading-none text-white sm:text-3xl">
            {row.totalPoints}
          </span>
          <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            pkt
          </span>
        </div>
      ) : null}
    </article>
  );
}

function PlayoffSideBlock({
  team,
  logos,
  positionLabel,
  side,
}: {
  team: SeasonSummaryPlayerRow["team"];
  logos: ClubLogoRecord[];
  positionLabel: string;
  side: "left" | "right";
}) {
  const club = (team.chosen_club || "—").trim();
  const fplTeam = team.fpl_team_name?.trim();
  const discord = team.discord_nick?.startsWith("@")
    ? team.discord_nick
    : `@${team.discord_nick}`;
  const isLeft = side === "left";

  return (
    <div
      className={`inline-flex max-w-full flex-col ${isLeft ? "justify-self-start" : "justify-self-end"}`}
    >
      {/* Etykieta wyśrodkowana względem herbu + nazw */}
      <p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {positionLabel}
      </p>

      <div
        className={`flex max-w-full items-center gap-3 ${isLeft ? "flex-row-reverse" : "flex-row"}`}
      >
        {/* Herb od strony środka; nazwy przy zewnętrznej krawędzi kafelka */}
        <ClubCrest
          clubName={club}
          logos={logos}
          size="lg"
          className="!h-14 !w-14 shrink-0 sm:!h-16 sm:!w-16"
        />
        <div className={`min-w-0 ${isLeft ? "text-left" : "text-right"}`}>
          <p className={identityClubClass("md", "default", "break-words")}>{club}</p>
          <p className={identityManagerClass("md", "default", "break-words")}>
            {team.manager_name}
          </p>
          {fplTeam ? (
            <p className={identityFplTeamClass("sm", "default", "break-words")}>{fplTeam}</p>
          ) : null}
          <p className={identityDiscordClass("sm", "break-words")}>{discord}</p>
        </div>
      </div>
    </div>
  );
}

function PlayoffStatusBadge({
  kind,
  label,
}: {
  kind: "stay" | "no_promo" | "promo" | "relegate" | "pending";
  label: string;
}) {
  const styles = {
    stay: "bg-blue-950/40 text-blue-400 border-blue-800/50",
    no_promo: "bg-orange-950/40 text-orange-400 border-orange-800/50",
    promo: "bg-emerald-950/40 text-emerald-400 border-emerald-800/50",
    relegate: "bg-rose-950/40 text-rose-400 border-rose-800/50",
    pending: "bg-slate-900/60 text-slate-400 border-slate-700/50",
  }[kind];

  return (
    <span
      className={`w-fit shrink-0 rounded border px-2 py-0.5 text-center text-[10px] font-bold uppercase leading-tight tracking-wide shadow-sm sm:text-xs ${styles}`}
    >
      {label}
    </span>
  );
}

function PlayoffMatchCard({
  match,
  logos,
}: {
  match: SeasonSummaryPlayoffMatch;
  logos: ClubLogoRecord[];
}) {
  const higherWon = match.winnerTeamId === match.higher.teamId;
  const lowerWon = match.winnerTeamId === match.lower.teamId;
  const resolved = higherWon || lowerWon;

  const higherBadge = !resolved
    ? { kind: "pending" as const, label: "Baraż nierozstrzygnięty" }
    : higherWon
      ? {
          kind: "stay" as const,
          label: `Utrzymanie w ${match.higherDivisionName}`,
        }
      : {
          kind: "relegate" as const,
          label: `Spadek do ${match.lowerDivisionName}`,
        };

  const lowerBadge = !resolved
    ? { kind: "pending" as const, label: "Baraż nierozstrzygnięty" }
    : lowerWon
      ? {
          kind: "promo" as const,
          label: `Awans do ${match.higherDivisionName}`,
        }
      : {
          kind: "no_promo" as const,
          label: `Brak awansu do ${match.higherDivisionName}`,
        };

  return (
    <article className="w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60">
      <div className="border-b border-violet-500/25 bg-violet-950/20 px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.18em] text-violet-300 sm:px-4">
        ⚔️ Baraż o utrzymanie / awans
      </div>
      <p className="px-3 pt-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:px-4">
        Mecz Barażowy · GW{match.gameweek} · utrzymanie / awans · {match.higherDivisionName}
      </p>

      {/*
        Baner: [Tożsamość A ← zewnątrz] [Badge] [WYNIK] [Badge] [Tożsamość B → zewnątrz]
        Herby ku środkowi, nazwy bez ucięcia, etykieta ligi wyśrodkowana nad blokiem.
      */}
      <div className="grid w-full grid-cols-1 items-center gap-3 p-3 sm:grid-cols-[1fr_auto_auto_auto_1fr] sm:gap-3 sm:p-4">
        <PlayoffSideBlock
          team={match.higher.team}
          logos={logos}
          positionLabel={`${match.higher.position}. · ${match.higherDivisionName}`}
          side="left"
        />

        <div className="flex justify-center sm:justify-end">
          <PlayoffStatusBadge kind={higherBadge.kind} label={higherBadge.label} />
        </div>

        <div className="flex items-center justify-center gap-2 px-1 sm:px-2">
          <span className="text-3xl font-black tabular-nums text-white sm:text-4xl">
            {match.higherFpl ?? "—"}
          </span>
          <span className="text-sm font-black uppercase text-slate-600">vs</span>
          <span className="text-3xl font-black tabular-nums text-white sm:text-4xl">
            {match.lowerFpl ?? "—"}
          </span>
        </div>

        <div className="flex justify-center sm:justify-start">
          <PlayoffStatusBadge kind={lowerBadge.kind} label={lowerBadge.label} />
        </div>

        <PlayoffSideBlock
          team={match.lower.team}
          logos={logos}
          positionLabel={`${match.lower.position}. · ${match.lowerDivisionName}`}
          side="right"
        />
      </div>
    </article>
  );
}

function DivisionMovementBlock({
  block,
  logos,
}: {
  block: SeasonSummaryDivisionBlock;
  logos: ClubLogoRecord[];
}) {
  const lowerLeague = divisionLabel(block.tier + 1);
  const higherLeague = block.tier > 1 ? divisionLabel(block.tier - 1) : null;
  const hasContent =
    block.directPromotions.length > 0 ||
    block.directRelegations.length > 0 ||
    block.playoff != null;

  if (!hasContent) return null;

  return (
    <section className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
      <h4 className="font-athletic text-base uppercase tracking-wide text-white sm:text-lg">
        {block.divisionName}
      </h4>

      {block.directPromotions.length > 0 && higherLeague ? (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-400">
            🟢 Awanse bezpośrednie
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {block.directPromotions.map((row) => (
              <MovementTile
                key={row.teamId}
                row={row}
                logos={logos}
                accent="green"
                message={`Awans do ${higherLeague}`}
              />
            ))}
          </div>
        </div>
      ) : null}

      {block.directRelegations.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-400">
            🔴 Spadki bezpośrednie
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {block.directRelegations.map((row) => (
              <MovementTile
                key={row.teamId}
                row={row}
                logos={logos}
                accent="red"
                message={`Spadek do ${lowerLeague}`}
              />
            ))}
          </div>
        </div>
      ) : null}

      {block.playoff ? (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-400">
            ⚔️ Baraż o utrzymanie / awans · {block.divisionName}
          </p>
          <PlayoffMatchCard match={block.playoff} logos={logos} />
        </div>
      ) : null}
    </section>
  );
}

/** Zakładka 🏆 Podsumowanie Sezonu — kłódka lub raport EoS. */
export function SeasonSummaryView({
  summary,
  loading,
  logos = [],
  embedded = false,
}: {
  summary: PublicSeasonSummaryPayload | null;
  loading?: boolean;
  logos?: ClubLogoRecord[];
  embedded?: boolean;
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
          Oficjalny raport końcowy pojawi się po rozegraniu wszystkich spotkań i baraży.
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
  const topLeagueName =
    champion?.fromDivisionName ||
    summary.divisionBlocks[0]?.divisionName ||
    divisionLabel(1);

  const champions = summary.divisionChampions ?? [];
  const blocks = summary.divisionBlocks ?? [];

  return (
    <div className="space-y-10 sm:space-y-12">
      {!embedded ? (
        <header>
          <h2 className="font-athletic text-2xl uppercase tracking-wide text-white sm:text-3xl">
            🏆 Podsumowanie Sezonu
          </h2>
          <p className="mt-1.5 text-sm text-slate-400">
            Oficjalne rozstrzygnięcia po fazie zasadniczej i barażach
            {summary.seasonName ? ` · ${summary.seasonName}` : ""}.
          </p>
        </header>
      ) : (
        <p className="text-sm text-slate-400">
          Oficjalne rozstrzygnięcia · {summary.seasonName}
        </p>
      )}

      {/* SEKCJA 1: Podium */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" aria-hidden />
          <h3 className="font-athletic text-lg uppercase tracking-wide text-white sm:text-xl">
            👑 Podium · {topLeagueName}
          </h3>
        </div>
        {!champion && !runner && !third ? (
          <p className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
            Brak danych podium {topLeagueName}.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
            {runner ? <PodiumCard row={runner} place={2} logos={logos} /> : <div className="hidden sm:block" />}
            {champion ? <PodiumCard row={champion} place={1} logos={logos} /> : null}
            {third ? <PodiumCard row={third} place={3} logos={logos} /> : <div className="hidden sm:block" />}
          </div>
        )}
      </section>

      {/* SEKCJA 2: Mistrzowie wszystkich dywizji */}
      <section className="space-y-4">
        <h3 className="font-athletic text-lg uppercase tracking-wide text-white sm:text-xl">
          🏆 Mistrzowie Wszystkich Dywizji
        </h3>
        {champions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
            Brak mistrzów dywizji do wyświetlenia.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {champions.map((row) => {
              const club = (row.team.chosen_club || "—").trim();
              const fplTeam = row.team.fpl_team_name?.trim();
              const discord = row.team.discord_nick?.startsWith("@")
                ? row.team.discord_nick
                : `@${row.team.discord_nick}`;

              return (
                <article
                  key={row.teamId}
                  className="flex items-center gap-2.5 rounded-lg border border-amber-500/25 bg-slate-900/60 p-3"
                >
                  <ClubCrest
                    clubName={club}
                    logos={logos}
                    size="lg"
                    className="!h-14 !w-14 shrink-0 sm:!h-[4.25rem] sm:!w-[4.25rem]"
                  />

                  <div className="min-w-0 flex-1">
                    <p className={identityClubClass("xs", "default", "break-words")}>{club}</p>
                    <p className={identityManagerClass("xs", "default", "break-words")}>
                      {row.team.manager_name}
                    </p>
                    {fplTeam ? (
                      <p className={identityFplTeamClass("xs", "default", "break-words")}>
                        {fplTeam}
                      </p>
                    ) : null}
                    <p className={identityDiscordClass("xs", "break-words")}>{discord}</p>
                    <span className="mt-1 inline-flex w-fit rounded border border-amber-800/50 bg-amber-950/40 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-400">
                      Mistrz {row.fromDivisionName}
                    </span>
                  </div>

                  <div className="flex shrink-0 flex-col items-end justify-center self-center pl-1">
                    {row.totalPoints != null ? (
                      <>
                        <span className="text-xl font-black tabular-nums leading-none text-white sm:text-2xl">
                          {row.totalPoints}
                        </span>
                        <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          pkt
                        </span>
                      </>
                    ) : null}
                    {row.fplPoints != null ? (
                      <span className="mt-1 text-[9px] text-slate-500">FPL {row.fplPoints}</span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* SEKCJA 3: Ruchy ligowe per dywizja */}
      <section className="space-y-4">
        <h3 className="font-athletic text-lg uppercase tracking-wide text-white sm:text-xl">
          🔄 Ruchy Ligowe i Baraże
        </h3>
        {blocks.every(
          (b) =>
            b.directPromotions.length === 0 &&
            b.directRelegations.length === 0 &&
            !b.playoff,
        ) ? (
          <p className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
            Brak awansów, spadków ani baraży w tym sezonie.
          </p>
        ) : (
          <div className="space-y-4">
            {blocks.map((block) => (
              <DivisionMovementBlock key={block.divisionId} block={block} logos={logos} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
