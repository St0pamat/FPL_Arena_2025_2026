import { Building2, Clock, Info, MessageCircle } from "lucide-react";
import Link from "next/link";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import {
  resolveTierLogoName,
  type TierLogoRecord,
} from "@/lib/admin/tierLogos";
import { DIVISION_CAPACITY } from "@/lib/admin/divisionCapacity";
import type { PublicSeasonDivisionStructurePayload } from "@/lib/public/types";
import { ClubCrest } from "@/components/na-minusie/hub/ClubCrest";
import { TierCrest } from "@/components/na-minusie/TierCrest";
import {
  identityClubClass,
  identityDiscordClass,
  identityFplTeamClass,
  identityManagerClass,
} from "@/lib/na-minusie/playerIdentityStyles";

function formatOr(value: number | null): string {
  if (value == null || !Number.isFinite(value) || value < 1) {
    return "Nowy gracz";
  }
  return `#${value.toLocaleString("pl-PL")}`;
}

function formatUpdatedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date}, ${time}`;
}

export function DivisionStructureView({
  data,
  logos = [],
  tierLogos = [],
  variant = "page",
  linkToProfile = false,
}: {
  data: PublicSeasonDivisionStructurePayload;
  logos?: ClubLogoRecord[];
  tierLogos?: TierLogoRecord[];
  /** Ukryj duży nagłówek strony — osadzenie w HubShell */
  variant?: "page" | "embedded";
  linkToProfile?: boolean;
}) {
  const updatedLabel = formatUpdatedAt(data.updatedAt);

  if (data.error) {
    return (
      <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
        {data.error}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {variant === "page" ? (
      <header className="space-y-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">
            Live · Baza uczestników
          </p>
          <h1 className="mt-1 font-athletic text-3xl uppercase tracking-wide text-white sm:text-4xl">
            Dywizje
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
            Aktualny podział z arkusza zapisów. Sortowanie w dywizji wg OR
            2025/26.
          </p>
        </div>

        {updatedLabel ? (
          <p className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/70 px-3.5 py-1.5 text-xs font-semibold text-slate-300">
            <Clock className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
            Ostatnia aktualizacja:{" "}
            <time dateTime={data.updatedAt ?? undefined} className="text-white">
              {updatedLabel}
            </time>
          </p>
        ) : null}

        <aside
          className="flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3.5 sm:px-5"
          role="note"
        >
          <Info
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-300"
            aria-hidden
          />
          <div className="min-w-0 space-y-1 text-sm leading-relaxed text-amber-50/90">
            <p className="font-bold text-amber-200">To tylko aktualny podgląd</p>
            <p className="text-amber-100/75">
              Wraz z postępem zapisów składy i poziomy lig będą się zmieniać.
              Widok odświeża się automatycznie z bazy — ostateczny podział
              zamkniemy po zakończeniu rekrutacji.
            </p>
          </div>
        </aside>
      </header>
      ) : (
        <p className="text-sm text-slate-400">
          Obsada dywizji · herby klubów, Discord, FPL Team, menedżer i OR 2025/26.
        </p>
      )}

      {!data.divisions.length ? (
        <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-16 text-center text-sm text-slate-500">
          <Building2 className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          Brak dywizji w tym sezonie — pojawią się wraz z pierwszymi
          przypisaniami.
        </div>
      ) : (
        data.divisions.map((block) => {
          const crestName = resolveTierLogoName(block.name, block.tier);
          const filled = block.teams.length;
          const full = filled >= DIVISION_CAPACITY;
          return (
            <section
              key={block.divisionId}
              className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/50"
            >
              <header className="flex flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-950/70 px-4 py-3.5 sm:px-5">
                <TierCrest tierName={crestName} logos={tierLogos} size="sm" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#39FF14]">
                    {block.pyramidName !== "—" ? block.pyramidName : "Piramida"}
                  </p>
                  <h2 className="truncate font-athletic text-base uppercase tracking-wide text-white sm:text-lg">
                    {block.name}
                  </h2>
                </div>
                <span
                  className={`ml-auto rounded-lg px-2.5 py-1 font-mono text-xs font-bold ${
                    full
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {filled}/{DIVISION_CAPACITY}
                </span>
              </header>

              {filled === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500 sm:px-5">
                  Jeszcze nikogo nie przypisano do tej dywizji.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] table-fixed text-left text-sm">
                    <colgroup>
                      <col className="w-[3.25rem]" />
                      <col className="w-[34%]" />
                      <col className="w-[22%]" />
                      <col className="w-[22%]" />
                      <col className="w-[7.5rem]" />
                    </colgroup>
                    <thead className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-3 sm:px-4">LP</th>
                        <th className="px-3 py-3 sm:px-4">
                          Klub &amp; Drużyna FPL
                        </th>
                        <th className="px-3 py-3 sm:px-4">Menedżer FPL</th>
                        <th className="px-3 py-3 sm:px-4">Discord</th>
                        <th className="px-3 py-3 text-right sm:px-4">
                          OR 2025/26
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {block.teams.map((row) => (
                        <tr
                          key={row.teamId}
                          className={`transition-colors hover:bg-slate-800/40 ${linkToProfile ? "group" : ""}`}
                        >
                          <td className="px-3 py-2.5 font-mono text-xs font-black text-slate-400 sm:px-4">
                            {row.lp}
                          </td>
                          <td className="px-3 py-2 sm:px-4">
                            {linkToProfile ? (
                              <Link
                                href={`/strefa-gracza/gracz/${row.teamId}`}
                                className="flex min-w-0 items-center gap-3 rounded-lg transition-colors group-hover:text-emerald-300"
                              >
                                <ClubCrest
                                  clubName={row.chosen_club}
                                  logos={logos}
                                  size="md"
                                  className="!h-10 !w-10 shrink-0 sm:!h-11 sm:!w-11"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className={identityClubClass("sm", "table", "truncate group-hover:text-emerald-200")}>
                                    {row.chosen_club || "—"}
                                  </p>
                                  <p className={identityFplTeamClass("sm", "table", "truncate")}>
                                    {row.fpl_team_name?.trim() || "—"}
                                  </p>
                                </div>
                              </Link>
                            ) : (
                              <div className="flex min-w-0 items-center gap-3">
                                <ClubCrest
                                  clubName={row.chosen_club}
                                  logos={logos}
                                  size="md"
                                  className="!h-10 !w-10 shrink-0 sm:!h-11 sm:!w-11"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className={identityClubClass("sm", "table", "truncate")}>
                                    {row.chosen_club || "—"}
                                  </p>
                                  <p className={identityFplTeamClass("sm", "table", "truncate")}>
                                    {row.fpl_team_name?.trim() || "—"}
                                  </p>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="truncate px-3 py-2.5 sm:px-4">
                            {linkToProfile ? (
                              <Link
                                href={`/strefa-gracza/gracz/${row.teamId}`}
                                className={identityManagerClass("sm", "table", "hover:brightness-110")}
                              >
                                {row.manager_name}
                              </Link>
                            ) : (
                              <span className={identityManagerClass("sm", "table")}>
                                {row.manager_name}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 sm:px-4">
                            <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1">
                              <MessageCircle className="h-3 w-3 shrink-0 text-slate-500" />
                              <span className={identityDiscordClass("sm", "truncate")}>
                                {row.discord_nick}
                              </span>
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs font-bold tabular-nums text-slate-300 sm:px-4 sm:text-sm">
                            {formatOr(row.previous_or)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
