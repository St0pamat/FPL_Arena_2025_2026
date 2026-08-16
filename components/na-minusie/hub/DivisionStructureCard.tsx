"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Check, Download, Loader2, MessageCircle } from "lucide-react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import {
  resolveTierLogoName,
  type TierLogoRecord,
} from "@/lib/admin/tierLogos";
import { DIVISION_CAPACITY } from "@/lib/admin/divisionCapacity";
import type { DivisionRosterBlock } from "@/lib/public/types";
import { NA_MINUSIE_EXPORT_BRAND } from "@/lib/na-minusie";
import { ClubCrest } from "@/components/na-minusie/hub/ClubCrest";
import { TierCrest } from "@/components/na-minusie/TierCrest";
import { captureExportNode } from "@/components/na-minusie/hub/ExportControls";
import {
  identityClubClass,
  identityDiscordClass,
  identityFplTeamClass,
  identityManagerClass,
} from "@/lib/na-minusie/playerIdentityStyles";

const EXPORT_BG = "#0F172A";

function formatOr(value: number | null): string {
  if (value == null || !Number.isFinite(value) || value < 1) {
    return "Nowy gracz";
  }
  return `#${value.toLocaleString("pl-PL")}`;
}

function divisionPngFileName(divisionName: string): string {
  const slug =
    divisionName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "Dywizja";
  return `FPL-Arena-Dywizja-${slug}.png`;
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}

export function DivisionStructureCard({
  block,
  logos,
  tierLogos,
  linkToProfile = false,
}: {
  block: DivisionRosterBlock;
  logos: ClubLogoRecord[];
  tierLogos: TierLogoRecord[];
  linkToProfile?: boolean;
}) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const crestName = resolveTierLogoName(block.name, block.tier);
  const filled = block.teams.length;
  const full = filled >= DIVISION_CAPACITY;

  const onDownload = useCallback(async () => {
    const node = captureRef.current;
    if (!node || busy) return;
    setBusy(true);
    setDone(false);
    try {
      const dataUrl = await captureExportNode(node, EXPORT_BG);
      downloadDataUrl(dataUrl, divisionPngFileName(block.name));
      setDone(true);
      window.setTimeout(() => setDone(false), 2000);
    } catch (err) {
      console.error("[DivisionStructureCard] PNG", err);
      window.alert("Nie udało się wygenerować PNG.");
    } finally {
      setBusy(false);
    }
  }, [block.name, busy]);

  return (
    <div className="space-y-3">
      <div
        ref={captureRef}
        className="overflow-hidden rounded-2xl border border-slate-700/60 no-scrollbar"
        style={{ backgroundColor: EXPORT_BG }}
      >
        <header className="flex flex-wrap items-stretch gap-3 border-b border-slate-800 bg-slate-950/70 px-4 py-3.5 sm:px-5">
          <div className="flex w-11 shrink-0 items-center justify-center self-stretch sm:w-12">
            <TierCrest
              tierName={crestName}
              logos={tierLogos}
              plain
              className="!h-full !w-full !max-h-full !rounded-lg !p-0"
            />
          </div>
          <div className="flex min-w-0 flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#39FF14]">
              {block.pyramidName !== "—" ? block.pyramidName : "Piramida"}
            </p>
            <h2 className="truncate font-athletic text-base uppercase tracking-wide text-white sm:text-lg">
              {block.name}
            </h2>
          </div>
          <span
            className={`ml-auto self-center rounded-lg px-2.5 py-1 font-mono text-xs font-bold ${
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
          <div className="overflow-x-auto no-scrollbar">
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
                  <th className="px-3 py-3 sm:px-4">Klub &amp; Drużyna FPL</th>
                  <th className="px-3 py-3 sm:px-4">Menedżer FPL</th>
                  <th className="px-3 py-3 sm:px-4">Discord</th>
                  <th className="px-3 py-3 text-right sm:px-4">OR 2025/26</th>
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
                          className="flex min-h-[3.25rem] min-w-0 items-stretch gap-2.5 rounded-lg transition-colors group-hover:text-emerald-300"
                        >
                          <div className="flex w-11 shrink-0 items-center justify-center self-stretch sm:w-12">
                            <ClubCrest
                              clubName={row.chosen_club}
                              logos={logos}
                              size="fill"
                              className="!h-full !w-full !min-h-0"
                            />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col justify-center">
                            <p
                              className={identityClubClass(
                                "sm",
                                "table",
                                "truncate group-hover:text-emerald-200",
                              )}
                            >
                              {row.chosen_club || "—"}
                            </p>
                            <p
                              className={identityFplTeamClass(
                                "sm",
                                "table",
                                "truncate",
                              )}
                            >
                              {row.fpl_team_name?.trim() || "—"}
                            </p>
                          </div>
                        </Link>
                      ) : (
                        <div className="flex min-h-[3.25rem] min-w-0 items-stretch gap-2.5">
                          <div className="flex w-11 shrink-0 items-center justify-center self-stretch sm:w-12">
                            <ClubCrest
                              clubName={row.chosen_club}
                              logos={logos}
                              size="fill"
                              className="!h-full !w-full !min-h-0"
                            />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col justify-center">
                            <p
                              className={identityClubClass(
                                "sm",
                                "table",
                                "truncate",
                              )}
                            >
                              {row.chosen_club || "—"}
                            </p>
                            <p
                              className={identityFplTeamClass(
                                "sm",
                                "table",
                                "truncate",
                              )}
                            >
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
                          className={identityManagerClass(
                            "sm",
                            "table",
                            "hover:brightness-110",
                          )}
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
                        <span
                          className={identityDiscordClass("sm", "truncate")}
                        >
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

        <footer className="flex items-center justify-between gap-3 border-t border-slate-800/80 px-4 py-2.5 sm:px-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Powered by {NA_MINUSIE_EXPORT_BRAND}
          </p>
          <p className="text-[10px] font-medium text-slate-600">
            Architekt Ligi: St0pa
          </p>
        </footer>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onDownload}
          disabled={busy || filled === 0}
          title={
            filled === 0
              ? "Brak składu do wyeksportowania"
              : `Pobierz PNG — ${block.name}`
          }
          className="inline-flex items-center gap-2 rounded-xl border border-[#39FF14]/35 bg-slate-950/80 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-[#39FF14] transition hover:border-[#39FF14]/60 hover:bg-[#39FF14]/10 hover:text-[#6dff4d] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#39FF14]/35 disabled:hover:bg-slate-950/80 disabled:hover:text-[#39FF14]"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : done ? (
            <Check className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Download className="h-3.5 w-3.5" aria-hidden />
          )}
          {busy ? "Generuję…" : done ? "Gotowe" : "Pobierz PNG"}
        </button>
      </div>
    </div>
  );
}
