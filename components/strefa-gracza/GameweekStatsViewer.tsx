"use client";

import { useMemo, useState } from "react";
import { CalendarRange, Scale, Swords, Target, Zap } from "lucide-react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { ClubCrest } from "@/components/na-minusie/hub/ClubCrest";
import { MiniStatCard } from "@/components/strefa-gracza/PantheonGrid";
import type { GameweekDivisionStats, GwMatchHighlight } from "@/lib/public/seasonStats";
import { identityClubClass } from "@/lib/na-minusie/playerIdentityStyles";

function GwMatchHighlightCard({
  highlight,
  kind,
  logos,
}: {
  highlight: GwMatchHighlight;
  kind: "blowout" | "nail_biter";
  logos: ClubLogoRecord[];
}) {
  const isBlowout = kind === "blowout";
  const homeClub = (highlight.homeTeam.chosen_club || "—").trim();
  const awayClub = (highlight.awayTeam.chosen_club || "—").trim();

  return (
    <article className="flex flex-col rounded-lg border border-slate-800 bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-[10px] font-black uppercase tracking-[0.16em] ${isBlowout ? "text-orange-400" : "text-sky-400"}`}
        >
          {isBlowout ? "💥 Pogrom Kolejki" : "🎯 Wojna Nerwów"}
        </p>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/25 ${isBlowout ? "text-orange-400" : "text-sky-400"}`}
        >
          {isBlowout ? <Zap className="h-3.5 w-3.5" aria-hidden /> : <Target className="h-3.5 w-3.5" aria-hidden />}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <ClubCrest clubName={homeClub} logos={logos} size="sm" className="!h-5 !w-5 shrink-0" />
          <span className={identityClubClass("sm", "default", "truncate")}>{homeClub}</span>
        </span>
        <span className="font-mono text-sm font-black text-white">
          {highlight.homePts}
          <span className="mx-1 text-slate-600">:</span>
          {highlight.awayPts}
        </span>
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <ClubCrest clubName={awayClub} logos={logos} size="sm" className="!h-5 !w-5 shrink-0" />
          <span className={identityClubClass("sm", "default", "truncate")}>{awayClub}</span>
        </span>
      </div>

      <p className="mt-2 text-[11px] text-slate-400">
        Różnica:{" "}
        <span className={`font-bold ${isBlowout ? "text-orange-300" : "text-sky-300"}`}>
          {highlight.margin} pkt
        </span>
      </p>
    </article>
  );
}

function MedianThresholdCard({ threshold }: { threshold: number }) {
  return (
    <article className="flex flex-col rounded-lg border border-slate-800 bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-400">
          ⚖️ Próg Mediany Dywizji
        </p>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/25 text-amber-400">
          <Scale className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
      <p className="mt-2 font-mono text-2xl font-black tracking-tight text-white sm:text-3xl">
        {threshold}
        <span className="ml-1.5 text-xs font-semibold text-slate-500">pkt</span>
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
        Próg bonusu +1 — TOP 5 wyników FPL w tej kolejce
      </p>
    </article>
  );
}

export function GameweekStatsViewer({
  archive,
  logos,
  defaultGw,
}: {
  archive: GameweekDivisionStats[];
  logos: ClubLogoRecord[];
  defaultGw?: number;
}) {
  const latestGw = archive[archive.length - 1]?.gameweek;
  const [selectedGw, setSelectedGw] = useState(
    defaultGw ?? latestGw ?? archive[0]?.gameweek ?? 1,
  );

  const entry = useMemo(
    () => archive.find((a) => a.gameweek === selectedGw) ?? null,
    [archive, selectedGw],
  );

  if (archive.length === 0) return null;

  return (
    <section aria-labelledby="gw-archive-heading" className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        <div>
          <h3
            id="gw-archive-heading"
            className="font-athletic text-lg uppercase tracking-wide text-white sm:text-xl"
          >
            📅 Przegląd Kolejek
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Wybierz kolejkę, aby zobaczyć szczegółowe wyniki z danego weekendu.
          </p>
        </div>

        <label className="inline-flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-sky-400" aria-hidden />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Kolejka
          </span>
          <select
            value={selectedGw}
            onChange={(e) => setSelectedGw(Number(e.target.value))}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-sky-500"
          >
            {archive.map((a) => (
              <option key={a.gameweek} value={a.gameweek} className="bg-slate-950">
                GW{a.gameweek}
              </option>
            ))}
          </select>
        </label>
      </div>

      {entry ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {entry.topScorer ? (
            <MiniStatCard card={entry.topScorer} logos={logos} />
          ) : (
            <EmptyGwSlot label="Menedżer Kolejki" gw={selectedGw} />
          )}
          {entry.redLantern ? (
            <MiniStatCard card={entry.redLantern} logos={logos} />
          ) : (
            <EmptyGwSlot label="Czerwona Latarnia" gw={selectedGw} />
          )}
          {entry.blowout ? (
            <GwMatchHighlightCard highlight={entry.blowout} kind="blowout" logos={logos} />
          ) : (
            <EmptyGwSlot label="Pogrom Kolejki" gw={selectedGw} icon={Swords} />
          )}
          {entry.nailBiter ? (
            <GwMatchHighlightCard highlight={entry.nailBiter} kind="nail_biter" logos={logos} />
          ) : (
            <EmptyGwSlot label="Wojna Nerwów" gw={selectedGw} icon={Target} />
          )}
          {entry.medianThreshold != null ? (
            <MedianThresholdCard threshold={entry.medianThreshold} />
          ) : (
            <EmptyGwSlot label="Próg Mediany" gw={selectedGw} icon={Scale} />
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
          Brak rozegranych meczów w GW{selectedGw}.
        </div>
      )}
    </section>
  );
}

function EmptyGwSlot({
  label,
  gw,
  icon: Icon,
}: {
  label: string;
  gw: number;
  icon?: typeof Swords;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700/80 bg-slate-900/30 px-3 py-6 text-center sm:p-4">
      {Icon ? <Icon className="mb-2 h-4 w-4 text-slate-600" aria-hidden /> : null}
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-xs text-slate-600">Brak danych · GW{gw}</p>
    </div>
  );
}
