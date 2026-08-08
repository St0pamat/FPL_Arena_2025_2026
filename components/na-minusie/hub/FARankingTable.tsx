"use client";

import { useMemo, useState } from "react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { LinkedTeamCell } from "@/components/na-minusie/hub/LinkedTeamCell";
import {
  formBadgeClass,
  sliceFormHistory,
  type FAFormWindow,
  type FARankingPayload,
  type FARankingRow,
} from "@/lib/public/faRanking";

function RankCell({
  position,
  totalRows,
}: {
  position: number;
  totalRows: number;
}) {
  if (position === 1) {
    return (
      <span className="inline-flex items-center gap-1 font-black text-amber-500">
        🥇 <span className="font-mono text-xs">{position}</span>
      </span>
    );
  }
  if (position === 2) {
    return (
      <span className="inline-flex items-center gap-1 font-black text-slate-300">
        🥈 <span className="font-mono text-xs">{position}</span>
      </span>
    );
  }
  if (position === 3) {
    return (
      <span className="inline-flex items-center gap-1 font-black text-orange-700">
        🥉 <span className="font-mono text-xs">{position}</span>
      </span>
    );
  }
  if (totalRows >= 3 && position > totalRows - 3) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-rose-500">
        {position} 📉
      </span>
    );
  }
  return (
    <span className="font-mono text-xs font-bold text-slate-400">{position}</span>
  );
}

function TrendCell({ delta, hasPrevious }: { delta: number; hasPrevious: boolean }) {
  if (!hasPrevious) {
    return <span className="text-slate-600">➖</span>;
  }
  if (delta > 0) {
    return (
      <span className="whitespace-nowrap text-xs font-bold text-emerald-400">
        ⬆️ +{delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="whitespace-nowrap text-xs font-bold text-rose-400">
        ⬇️ {delta}
      </span>
    );
  }
  return <span className="text-slate-500">➖</span>;
}

function FormTiles({
  row,
  window,
  finishedGameweeks,
}: {
  row: FARankingRow;
  window: FAFormWindow;
  finishedGameweeks: number[];
}) {
  const tiles = sliceFormHistory(row.formHistory, window, finishedGameweeks);
  if (!tiles.length) {
    return <span className="text-[10px] text-slate-600">—</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      {tiles.map((t) => (
        <span
          key={t.gw}
          title={`GW${t.gw}: ${t.points} pkt`}
          className={`inline-flex min-w-[2rem] items-center justify-center rounded px-2 py-1 text-xs font-bold ${formBadgeClass(t.points)}`}
        >
          {t.points}
        </span>
      ))}
    </div>
  );
}

function rowBgClass(position: number, totalRows: number): string {
  if (position === 1) return "bg-amber-500/10";
  if (position === 2) return "bg-slate-300/10";
  if (position === 3) return "bg-orange-700/10";
  if (totalRows >= 3 && position > totalRows - 3) return "bg-rose-950/30";
  return "";
}

export function FARankingTable({
  data,
  logos,
  compact = false,
}: {
  data: FARankingPayload;
  logos: ClubLogoRecord[];
  /** Węższy wariant (eksport PNG) */
  compact?: boolean;
}) {
  const [windowId, setWindowId] = useState<string>(
    () => data.formWindows[0]?.id ?? "last6",
  );

  const activeWindow = useMemo((): FAFormWindow => {
    return (
      data.formWindows.find((w) => w.id === windowId) ??
      data.formWindows[0] ?? { id: "last6", label: "Ostatnie 6 GW" }
    );
  }, [data.formWindows, windowId]);

  const hasPrevious = (data.finishedGameweeks?.length ?? 0) > 1;
  const totalRows = data.rows.length;

  return (
    <div className="space-y-4">
      {!compact ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-400/90">
              Liga Classic · Cały serwer
            </p>
            <h2 className="mt-1 font-athletic text-2xl uppercase tracking-wide text-white sm:text-3xl">
              🏆 The FA Ranking
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {data.campaignLabel}
              {data.latestFinishedGw != null
                ? ` · po GW${data.latestFinishedGw}`
                : " · brak opublikowanych kolejek"}
            </p>
          </div>
          <label className="inline-flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Pokaż formę z:
            <select
              value={activeWindow.id}
              onChange={(e) => setWindowId(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-200 outline-none focus:border-amber-500/50"
            >
              {data.formWindows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <th className="px-3 py-3 sm:px-4">#</th>
              <th className="px-2 py-3">Trend</th>
              <th className="px-3 py-3 sm:px-4">Menedżer</th>
              <th className="px-3 py-3 sm:px-4">Forma</th>
              <th className="px-3 py-3 text-right sm:px-4">Suma</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-16 text-center text-sm text-slate-500"
                >
                  Brak opublikowanych wyników w kampanii.
                </td>
              </tr>
            ) : (
              data.rows.map((row) => (
                <tr
                  key={row.playerKey}
                  className={`border-b border-slate-800/80 ${rowBgClass(row.position, totalRows)}`}
                >
                  <td className="px-3 py-3 align-middle sm:px-4">
                    <RankCell position={row.position} totalRows={totalRows} />
                  </td>
                  <td className="px-2 py-3 align-middle">
                    <TrendCell delta={row.trendDelta} hasPrevious={hasPrevious} />
                  </td>
                  <td className="px-3 py-3 align-middle sm:px-4">
                    <div className="min-w-0">
                      <LinkedTeamCell
                        team={row.team}
                        logos={logos}
                        identitySize="sm"
                        linkToProfile={!compact}
                        crestColClass="w-11 sm:w-12"
                      />
                      {row.divisionName && !compact ? (
                        <p className="mt-0.5 truncate pl-[3.25rem] text-[10px] text-slate-600 sm:pl-14">
                          {row.divisionName}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3 align-middle sm:px-4">
                    <FormTiles
                      row={row}
                      window={activeWindow}
                      finishedGameweeks={data.finishedGameweeks}
                    />
                  </td>
                  <td className="px-3 py-3 text-right align-middle sm:px-4">
                    <span
                      className={`font-black text-white ${compact ? "text-lg" : "text-xl"}`}
                    >
                      {row.totalPoints}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Wariant do off-screen PNG — stałe okno formy (ostatnie 6), bez selecta. */
export function FARankingExportSlice({
  rows,
  logos,
  finishedGameweeks,
  title,
  subtitle,
  totalRowsInFullTable,
}: {
  rows: FARankingRow[];
  logos: ClubLogoRecord[];
  finishedGameweeks: number[];
  title: string;
  subtitle?: string;
  /** Liczba wszystkich graczy (dla strefy bottom 3) */
  totalRowsInFullTable: number;
}) {
  const window: FAFormWindow = { id: "last6", label: "Ostatnie 6 GW" };
  const hasPrevious = finishedGameweeks.length > 1;

  return (
    <div>
      <p className="mb-3 text-xs text-slate-400">{subtitle}</p>
      <table className="w-full min-w-[800px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <th className="px-3 py-2">#</th>
            <th className="px-2 py-2">Trend</th>
            <th className="px-3 py-2">Menedżer</th>
            <th className="px-3 py-2">Forma (ost. 6)</th>
            <th className="px-3 py-2 text-right">Suma</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.playerKey}
              className={`border-b border-slate-800/80 ${rowBgClass(row.position, totalRowsInFullTable)}`}
            >
              <td className="px-3 py-2.5 align-middle">
                <RankCell
                  position={row.position}
                  totalRows={totalRowsInFullTable}
                />
              </td>
              <td className="px-2 py-2.5 align-middle">
                <TrendCell delta={row.trendDelta} hasPrevious={hasPrevious} />
              </td>
              <td className="px-3 py-2.5 align-middle">
                <LinkedTeamCell
                  team={row.team}
                  logos={logos}
                  identitySize="sm"
                  linkToProfile={false}
                  crestColClass="w-11 sm:w-12"
                />
              </td>
              <td className="px-3 py-2.5 align-middle">
                <FormTiles
                  row={row}
                  window={window}
                  finishedGameweeks={finishedGameweeks}
                />
              </td>
              <td className="px-3 py-2.5 text-right align-middle">
                <span className="text-lg font-black text-white">{row.totalPoints}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* title used by parent DiscordExportFrame */}
      <span className="sr-only">{title}</span>
    </div>
  );
}
