"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Camera, Minus } from "lucide-react";
import { toPng } from "html-to-image";
import type {
  NoBigSixGwResult,
  NoBigSixPenalty,
  NoBigSixStandingRow,
  NoBigSixTeam,
  NoBigSixTrend,
} from "@/lib/no-big-six/types";
import { buildOverallStandings } from "@/lib/no-big-six/standings";
import {
  formatViolationLine,
  getIntentionalPenalties,
} from "@/lib/no-big-six/penalties";
import { DoZbanowaniaBadge } from "@/components/no-big-six/DoZbanowaniaBadge";
import { NoBigSixTeamCrest } from "@/components/no-big-six/NoBigSixTeamCrest";
import {
  NO_BIG_SIX_LOGO,
  NO_BIG_SIX_LOGO_ALT,
} from "@/lib/no-big-six/branding";
import { ARENA_PORTAL_ALT, ARENA_PORTAL_LOGO } from "@/lib/arena/branding";

type Props = {
  teams: NoBigSixTeam[];
  results: NoBigSixGwResult[];
  penalties: NoBigSixPenalty[];
};

const EXPORT_WIDTH_PX = 1080;

function TrendIcon({ trend }: { trend: NoBigSixTrend }) {
  if (trend === "up") {
    return <ArrowUp className="h-3.5 w-3.5 text-emerald-500" aria-label="Awans" />;
  }
  if (trend === "down") {
    return <ArrowDown className="h-3.5 w-3.5 text-rose-500" aria-label="Spadek" />;
  }
  return <Minus className="h-3.5 w-3.5 text-slate-500" aria-label="Bez zmian" />;
}

function podiumRowClass(rank: number | null, isBanned: boolean): string {
  if (isBanned) return "bg-rose-950/10 opacity-60 grayscale";
  if (rank === 1) return "bg-yellow-400/5";
  if (rank === 2) return "bg-slate-300/5";
  if (rank === 3) return "bg-amber-700/5";
  return "hover:bg-slate-800/30";
}

function rankClass(rank: number | null, isBanned: boolean): string {
  if (isBanned || rank == null) return "text-slate-400";
  if (rank === 1) return "text-yellow-400 font-black";
  if (rank === 2) return "text-slate-300 font-bold";
  if (rank === 3) return "text-amber-600 font-bold";
  return "text-slate-400 font-bold";
}

function maxGameweek(results: NoBigSixGwResult[]): number {
  return results.reduce((max, r) => Math.max(max, r.event), 0);
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function captureNode(node: HTMLElement): Promise<string> {
  const width = Math.ceil(node.scrollWidth) || EXPORT_WIDTH_PX;
  const height = Math.ceil(node.scrollHeight);

  return toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#020617",
    width,
    height,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: "none",
    },
  });
}

export function OverallTableTab({ teams, results, penalties }: Props) {
  const standings = useMemo(
    () => buildOverallStandings(teams, results, penalties),
    [teams, results, penalties],
  );

  const cleanPlayers = useMemo(
    () => standings.filter((row) => !row.flag_for_ban && !row.is_banned),
    [standings],
  );

  const bannedPlayers = useMemo(
    () => standings.filter((row) => row.flag_for_ban || row.is_banned),
    [standings],
  );

  const part1Ref = useRef<HTMLDivElement>(null);
  const part2Ref = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const gw = maxGameweek(results) || 1;

  async function exportToPng() {
    const part1 = part1Ref.current;
    const part2 = part2Ref.current;
    if (!part1 || !part2) return;

    setExporting(true);
    setExportMessage(null);

    try {
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");

      setExportMessage("Eksportowanie części 1 — Czysta tabela…");
      const cleanUrl = await captureNode(part1);
      downloadDataUrl(cleanUrl, `no-big-six-czysta-gw${gw}-${stamp}.png`);

      await delay(400);

      if (bannedPlayers.length > 0) {
        setExportMessage("Eksportowanie części 2 — Oznaczeni / zbanowani…");
        const banUrl = await captureNode(part2);
        downloadDataUrl(banUrl, `no-big-six-bany-gw${gw}-${stamp}.png`);
        setExportMessage("Zapisano 2 pliki PNG — czysta tabela + kary/bany.");
      } else {
        setExportMessage("Zapisano PNG czystej tabeli (brak graczy do zbanowania).");
      }
    } catch (err) {
      console.error("[OverallTableTab] exportToPng", err);
      setExportMessage(
        "Nie udało się wygenerować PNG (fonty/CORS). Odśwież stronę i spróbuj ponownie.",
      );
    } finally {
      setExporting(false);
    }
  }

  if (standings.length === 0) {
    return (
      <p className="py-8 text-center text-slate-400">
        Brak wyników — tabela pojawi się po pierwszej rozegranej kolejce.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void exportToPng()}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-500 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
        >
          <Camera className="h-3.5 w-3.5" aria-hidden />
          {exporting ? "Eksportuję…" : "Eksportuj Tabelę"}
        </button>
      </div>

      {exportMessage ? (
        <p className="text-xs text-slate-400" role="status">
          {exportMessage}
        </p>
      ) : null}

      {/* Publiczny widok — jedna pełna tabela (bez zmian logiki) */}
      <StandingsCard
        title="No Big Six — Tabela"
        gw={gw}
        rows={standings}
        penalties={penalties}
        showViolations
      />

      {/* Off-screen: eksport cz. 1 i 2 (poza viewportem, stała szerokość social) */}
      <div
        className="pointer-events-none absolute -left-[9999px] top-0"
        aria-hidden
      >
        <div ref={part1Ref} style={{ width: EXPORT_WIDTH_PX }}>
          <StandingsCard
            title="Oficjalna Tabela po"
            gw={gw}
            rows={cleanPlayers}
            penalties={penalties}
            showViolations={false}
            exportLayout
            exportVariant="official"
          />
        </div>
        <div ref={part2Ref} style={{ width: EXPORT_WIDTH_PX }}>
          <StandingsCard
            title="Oznaczeni do zbanowania po"
            gw={gw}
            rows={bannedPlayers}
            penalties={penalties}
            showViolations
            exportLayout
            exportVariant="bans"
            emptyHint="Brak graczy oznaczonych do zbanowania / zbanowanych."
          />
        </div>
      </div>
    </div>
  );
}

function StandingsCard({
  title,
  gw,
  rows,
  penalties,
  showViolations,
  exportLayout = false,
  exportVariant = "official",
  emptyHint,
}: {
  title: string;
  gw: number;
  rows: NoBigSixStandingRow[];
  penalties: NoBigSixPenalty[];
  showViolations: boolean;
  exportLayout?: boolean;
  exportVariant?: "official" | "bans";
  emptyHint?: string;
}) {
  return (
    <div className={`w-full rounded-xl bg-[#020617] ${exportLayout ? "pb-6" : "p-4 sm:p-5"}`}>
      {exportLayout ? (
        <header className="mb-4 flex w-full items-center justify-between border-b-2 border-slate-800 bg-slate-900 px-8 py-5">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ARENA_PORTAL_LOGO}
              alt={ARENA_PORTAL_ALT}
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
            <div className="hidden h-6 w-px bg-slate-700 sm:block" aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={NO_BIG_SIX_LOGO}
              alt={NO_BIG_SIX_LOGO_ALT}
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
            <p className="text-lg font-black tracking-tight text-white">
              FPL Arena: No Big Six
            </p>
          </div>

          <div className="flex items-center">
            {exportVariant === "official" ? (
              <>
                <span className="mr-4 text-sm font-medium uppercase tracking-wider text-slate-400">
                  Oficjalna Tabela po
                </span>
                <span className="rounded bg-amber-500 px-3 py-1 text-sm font-black text-slate-950">
                  GW{gw}
                </span>
              </>
            ) : (
              <>
                <span className="mr-4 text-sm font-bold uppercase tracking-wider text-rose-500">
                  Oznaczeni do zbanowania po
                </span>
                <span className="rounded bg-rose-500 px-3 py-1 text-sm font-black text-slate-950">
                  GW{gw}
                </span>
              </>
            )}
          </div>
        </header>
      ) : (
        <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-800/50 bg-slate-900/40 p-5 shadow-sm sm:flex-row sm:items-center">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ARENA_PORTAL_LOGO}
                alt={ARENA_PORTAL_ALT}
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
              <div className="hidden h-8 w-px bg-slate-700/50 sm:block" aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={NO_BIG_SIX_LOGO}
                alt={NO_BIG_SIX_LOGO_ALT}
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-amber-500">
                FPL Arena
              </p>
              <h3 className="text-xl font-black tracking-tight text-slate-100 sm:text-2xl">
                {title}
              </h3>
            </div>
          </div>

          <div className="flex items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-sm font-bold text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
            GW{gw}
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className={`py-8 text-center text-sm text-slate-500 ${exportLayout ? "px-8" : ""}`}>
          {emptyHint ?? "Brak wpisów."}
        </p>
      ) : (
        <div className={exportLayout ? "px-8" : ""}>
          <table className="w-full table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[7%]" />
              <col className="w-[53%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                <th className="px-2 py-3 sm:px-3">#</th>
                <th className="px-2 py-3 sm:px-3">Menedżer / Drużyna</th>
                <th className="px-2 py-3 text-right sm:px-3">FPL Pkt</th>
                <th className="px-2 py-3 text-right sm:px-3">Kary</th>
                <th className="px-2 py-3 text-right sm:px-3">Oficjalne Pkt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <StandingRow
                  key={row.entry_id}
                  row={row}
                  penalties={penalties}
                  showViolations={showViolations}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p
        className={`mt-5 text-center text-[10px] uppercase tracking-[0.22em] text-slate-600 ${
          exportLayout ? "px-8" : ""
        }`}
      >
        FPL Arena · No Big Six
      </p>
    </div>
  );
}

function StandingRow({
  row,
  penalties,
  showViolations,
}: {
  row: NoBigSixStandingRow;
  penalties: NoBigSixPenalty[];
  showViolations: boolean;
}) {
  const intentionalViolations = showViolations
    ? getIntentionalPenalties(penalties, row.entry_id)
    : [];

  return (
    <tr
      className={`border-b border-slate-800/60 transition-colors ${podiumRowClass(
        row.rank,
        row.is_banned,
      )} ${
        !row.is_banned && row.flag_for_ban
          ? "ring-1 ring-inset ring-rose-500/15"
          : ""
      }`}
    >
      <td className="px-2 py-3 sm:px-3">
        <div className="flex items-center gap-1.5">
          <span className={`tabular-nums ${rankClass(row.rank, row.is_banned)}`}>
            {row.is_banned || row.rank == null ? "—" : row.rank}
          </span>
          {!row.is_banned ? <TrendIcon trend={row.trend} /> : null}
        </div>
      </td>
      <td className="px-2 py-3 sm:px-3">
        <div className="flex items-start gap-3">
          <NoBigSixTeamCrest
            url={row.custom_logo_url}
            teamName={row.team_name}
            sizeClass="h-8 w-8"
            shape="circle"
            initialsChars={1}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={`font-semibold ${
                  row.is_banned
                    ? "text-slate-400 line-through decoration-rose-500/60"
                    : "text-white"
                }`}
              >
                {row.team_name}
              </p>
              {row.is_banned ? (
                <span className="rounded border border-rose-500/40 bg-rose-950/50 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-400">
                  Zbanowany
                </span>
              ) : null}
              {row.flag_for_ban ? <DoZbanowaniaBadge /> : null}
            </div>
            <p className="text-xs text-slate-500">{row.player_name}</p>
            {showViolations && intentionalViolations.length > 0 ? (
              <ul className="mt-2 space-y-0.5">
                {intentionalViolations.map((p) => (
                  <li key={p.id} className="text-[11px] leading-snug text-rose-400/90">
                    {formatViolationLine(p)}
                  </li>
                ))}
              </ul>
            ) : showViolations && row.is_banned ? (
              <p className="mt-1 text-[11px] text-rose-400/60">
                Brak celowych naruszeń w bazie
              </p>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-2 py-3 text-right tabular-nums text-slate-300 sm:px-3">
        {row.raw_fpl_points}
      </td>
      <td
        className={`px-2 py-3 text-right tabular-nums sm:px-3 ${
          row.penalty_points > 0 ? "font-semibold text-rose-500" : "text-slate-500"
        }`}
      >
        {row.penalty_points > 0 ? `−${row.penalty_points}` : "0"}
      </td>
      <td className="px-2 py-3 text-right tabular-nums text-lg font-bold text-amber-500 sm:px-3">
        {row.official_points}
      </td>
    </tr>
  );
}
