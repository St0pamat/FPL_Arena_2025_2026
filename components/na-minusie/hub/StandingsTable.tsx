"use client";

import { ArrowDown, ArrowUp, Medal } from "lucide-react";
import type { RefObject } from "react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { FormPill, PublicStandingRow, TableZone } from "@/lib/public/types";
import { LinkedTeamCell } from "@/components/na-minusie/hub/LinkedTeamCell";
import {
  DiscordExportFrame,
  slugForExport,
} from "@/components/na-minusie/hub/DiscordExport";

function FormPills({ form }: { form: FormPill[] }) {
  if (!form.length) {
    return <span className="text-[10px] text-slate-600">—</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {form.map((f) => {
        const bg =
          f.result === "W"
            ? "bg-emerald-500 text-black"
            : f.result === "D"
              ? "bg-amber-400 text-black"
              : "bg-rose-500 text-white";
        return (
          <span key={`${f.gameweek}-${f.result}`} className="relative">
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-black ${bg}`}
              title={`GW${f.gameweek}${f.median ? " · Mediana" : ""}`}
            >
              {f.result}
            </span>
            {f.median ? (
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-300 ring-1 ring-[#0B0F19]" />
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

function ZoneMark({ zone, position }: { zone: TableZone; position: number }) {
  if (zone === "gold") {
    return (
      <span
        className="inline-flex items-center gap-0.5 font-mono text-xs font-black text-amber-300"
        title="Mistrz / podium"
      >
        {position}
        <Medal className="h-3.5 w-3.5 text-amber-300" />
      </span>
    );
  }
  if (zone === "silver") {
    return (
      <span
        className="inline-flex items-center gap-0.5 font-mono text-xs font-black text-slate-200"
        title="Wicemistrz / podium"
      >
        {position}
        <Medal className="h-3.5 w-3.5 text-slate-300" />
      </span>
    );
  }
  if (zone === "bronze") {
    return (
      <span
        className="inline-flex items-center gap-0.5 font-mono text-xs font-black text-orange-400"
        title="3. miejsce / podium"
      >
        {position}
        <Medal className="h-3.5 w-3.5 text-orange-400" />
      </span>
    );
  }
  if (zone === "promotion") {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-xs font-black text-emerald-400">
        {position}
        <ArrowUp className="h-3 w-3" aria-label="Strefa awansu" />
      </span>
    );
  }
  if (zone === "playoff_up") {
    return (
      <span
        className="inline-flex items-center gap-0.5 font-mono text-xs font-black text-amber-400"
        title="Baraże o awans"
      >
        {position}
        <ArrowUp className="h-3 w-3" />
      </span>
    );
  }
  if (zone === "playoff_down") {
    return (
      <span
        className="inline-flex items-center gap-0.5 font-mono text-xs font-black text-amber-400"
        title="Baraże o utrzymanie"
      >
        {position}
        <ArrowDown className="h-3 w-3" />
      </span>
    );
  }
  if (zone === "relegation") {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-xs font-black text-rose-400">
        {position}
        <ArrowDown className="h-3 w-3" aria-label="Strefa spadku" />
      </span>
    );
  }
  return <span className="font-mono text-xs font-bold text-slate-400">{position}</span>;
}

function rowTone(zone: TableZone): string {
  switch (zone) {
    case "gold":
      return "bg-amber-400/10 hover:bg-amber-400/15";
    case "silver":
      return "bg-slate-300/10 hover:bg-slate-300/15";
    case "bronze":
      return "bg-orange-500/10 hover:bg-orange-500/15";
    case "promotion":
      return "bg-emerald-500/10 hover:bg-emerald-500/15";
    case "playoff_up":
    case "playoff_down":
      return "bg-amber-500/10 hover:bg-amber-500/15";
    case "relegation":
      return "bg-rose-500/5 hover:bg-rose-500/10";
    default:
      return "hover:bg-slate-800/40";
  }
}

export function StandingsTable({
  rows,
  logos = [],
  tier = 2,
  exportMeta,
  divisionId = "",
  showDiscordSend = false,
  hasWebhook = false,
  hideControls = false,
  captureRef,
}: {
  rows: PublicStandingRow[];
  logos?: ClubLogoRecord[];
  tier?: number;
  exportMeta?: { season?: string; pyramid?: string; division?: string };
  divisionId?: string;
  showDiscordSend?: boolean;
  hasWebhook?: boolean;
  hideControls?: boolean;
  captureRef?: RefObject<HTMLDivElement | null>;
}) {
  const divisionTitle = exportMeta?.division?.trim() || "Tabela";
  const seasonLine = exportMeta?.season?.trim() || undefined;
  const fileName = `${slugForExport([
    "tabela",
    exportMeta?.division,
    exportMeta?.pyramid,
    exportMeta?.season,
  ]) || "tabela-ogolna"}.png`;

  /** Najniższa dywizja (np. National League): bez spadków w UI, nawet gdy stare dane mają zone. */
  const displayRows = rows.map((r) => {
    if (
      tier >= 5 &&
      (r.zone === "relegation" || r.zone === "playoff_down")
    ) {
      return { ...r, zone: "mid" as const };
    }
    return r;
  });

  const headerParticipants = displayRows.map((r) => ({
    clubName: r.team?.chosen_club ?? "",
    managerName: r.team?.manager_name ?? "",
  }));

  if (!displayRows.length) {
    if (hideControls) {
      return (
        <DiscordExportFrame
          exportId="export-standings"
          fileName={fileName}
          title={divisionTitle}
          subtitle={seasonLine}
          divisionId={divisionId}
          hideControls
          captureRef={captureRef}
        >
          <p className="py-8 text-center text-sm text-slate-500">
            Brak drużyn lub rozliczonych meczów w tej dywizji.
          </p>
        </DiscordExportFrame>
      );
    }
    return (
      <div className="rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/40 px-6 py-12 text-center text-sm text-slate-500">
        Brak drużyn lub rozliczonych meczów w tej dywizji.
      </div>
    );
  }

  return (
    <DiscordExportFrame
      exportId="export-standings"
      fileName={fileName}
      title={divisionTitle}
      subtitle={seasonLine}
      divisionId={divisionId}
      discordMessage={`🏆 ${divisionTitle} — aktualna tabela!`}
      showDiscordSend={showDiscordSend}
      hasWebhook={hasWebhook}
      hideControls={hideControls}
      captureRef={captureRef}
      headerParticipants={headerParticipants}
      clubLogos={logos}
    >
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-700 text-[10px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-2 py-3 font-bold">Poz.</th>
            <th className="px-2 py-3 font-bold">Zespół</th>
            <th className="px-2 py-3 text-center font-bold">M</th>
            <th className="px-2 py-3 text-center font-bold">W-R-P</th>
            <th className="px-2 py-3 text-center font-bold">H2H</th>
            <th className="px-2 py-3 text-center font-bold">Med</th>
            <th className="px-2 py-3 text-center font-bold text-emerald-400">Suma</th>
            <th className="px-2 py-3 text-center font-bold">FPL</th>
            <th className="px-2 py-3 font-bold">Forma</th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((r, idx) => {
            const next = displayRows[idx + 1];
            const cutPlayoffDown =
              r.zone !== "playoff_down" &&
              r.zone !== "relegation" &&
              next?.zone === "playoff_down";
            const cutRel = r.zone !== "relegation" && next?.zone === "relegation";

            return (
              <tr
                key={r.teamId}
                className={`border-b border-slate-800/80 ${rowTone(r.zone)} ${
                  cutPlayoffDown ? "border-b-2 border-b-amber-400/70" : ""
                } ${cutRel ? "border-b-2 border-b-rose-500/70" : ""}`}
              >
                <td className="px-2 py-3">
                  <ZoneMark zone={r.zone} position={r.position} />
                </td>
                <td className="px-2 py-2.5 align-middle">
                  <LinkedTeamCell
                    team={r.team}
                    logos={logos}
                    identitySize="sm"
                    crestColClass="w-11 sm:w-12"
                  />
                </td>
                <td className="px-2 py-3 text-center tabular-nums text-slate-300">{r.played}</td>
                <td className="px-2 py-3 text-center tabular-nums text-slate-300">
                  {r.won}-{r.drawn}-{r.lost}
                </td>
                <td className="px-2 py-3 text-center tabular-nums text-slate-200">{r.h2hPoints}</td>
                <td className="px-2 py-3 text-center">
                  {r.medianPoints > 0 ? (
                    <span className="inline-flex rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-xs font-bold text-emerald-400">
                      +{r.medianPoints}
                    </span>
                  ) : (
                    <span className="text-slate-600">0</span>
                  )}
                </td>
                <td className="px-2 py-3 text-center font-athletic text-lg font-bold tabular-nums text-emerald-400">
                  {r.totalPoints}
                </td>
                <td className="px-2 py-3 text-center tabular-nums text-slate-300">{r.fplPoints}</td>
                <td className="px-2 py-3">
                  <FormPills form={r.form} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </DiscordExportFrame>
  );
}
