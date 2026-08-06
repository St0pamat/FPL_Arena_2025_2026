"use client";

import { useMemo, useState } from "react";
import { Swords } from "lucide-react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { ClubCrest } from "@/components/na-minusie/hub/ClubCrest";
import { StatPlayerIdentity } from "@/components/strefa-gracza/StatPlayerIdentity";
import { getHeadToHeadFixtures, type TeamFplTotal } from "@/lib/public/seasonStats";
import type { PublicFixture } from "@/lib/public/types";
import {
  identityClubClass,
  identityManagerClass,
} from "@/lib/na-minusie/playerIdentityStyles";

function PlayerSelect({
  label,
  value,
  onChange,
  options,
  logos,
  excludeId,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  options: TeamFplTotal[];
  logos: ClubLogoRecord[];
  excludeId?: string;
}) {
  const filtered = options.filter((o) => o.teamId !== excludeId);
  const selected = filtered.find((o) => o.teamId === value);

  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-violet-500"
      >
        <option value="">— Wybierz gracza —</option>
        {filtered.map((o) => (
          <option key={o.teamId} value={o.teamId} className="bg-slate-950">
            {(o.team.chosen_club || "—").trim()} · {o.team.manager_name}
          </option>
        ))}
      </select>
      {selected ? (
        <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2 backdrop-blur-sm">
          <StatPlayerIdentity
            team={selected.team}
            logos={logos}
            showFplTeam
            linkToProfile={false}
            size="sm"
          />
        </div>
      ) : null}
    </label>
  );
}

function VersusMatchRow({
  fixture,
  teamAId,
  teamBId,
  logos,
}: {
  fixture: PublicFixture;
  teamAId: string;
  teamBId: string;
  logos: ClubLogoRecord[];
}) {
  const isHomeA = fixture.home_team_id === teamAId;
  const teamA = isHomeA ? fixture.home_team : fixture.away_team;
  const teamB = isHomeA ? fixture.away_team : fixture.home_team;
  const clubA = (teamA?.chosen_club || "—").trim();
  const clubB = (teamB?.chosen_club || "—").trim();
  const ptsA = isHomeA ? fixture.home_fpl_points : fixture.away_fpl_points;
  const ptsB = isHomeA ? fixture.away_fpl_points : fixture.home_fpl_points;
  const h2hA = isHomeA ? fixture.home_h2h_points : fixture.away_h2h_points;
  const h2hB = isHomeA ? fixture.away_h2h_points : fixture.home_h2h_points;

  const aWon = h2hA === 2;
  const bWon = h2hB === 2;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2.5 backdrop-blur-sm sm:gap-3">
      <span className="shrink-0 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-sky-300">
        GW{fixture.gameweek}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
        <ClubCrest clubName={clubA} logos={logos} size="sm" className="!h-5 !w-5 shrink-0" />
        <span className={identityClubClass("xs", "default", `truncate ${aWon ? "" : "opacity-90"}`)}>
          {clubA}
        </span>
        <span className={`font-mono text-xs font-black ${aWon ? "text-emerald-400" : "text-white"}`}>
          {ptsA ?? "—"}
        </span>
        <span className="text-slate-600">:</span>
        <span className={`font-mono text-xs font-black ${bWon ? "text-emerald-400" : "text-white"}`}>
          {ptsB ?? "—"}
        </span>
        <span className={identityClubClass("xs", "default", `truncate ${bWon ? "" : "opacity-90"}`)}>
          {clubB}
        </span>
        <ClubCrest clubName={clubB} logos={logos} size="sm" className="!h-5 !w-5 shrink-0" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {aWon ? "→ A" : bWon ? "→ B" : "Remis"}
      </span>
    </div>
  );
}

function VersusClubRow({
  team,
  totalFpl,
  playedMatches,
  logos,
  align = "left",
}: {
  team: TeamFplTotal["team"];
  totalFpl: number;
  playedMatches: number;
  logos: ClubLogoRecord[];
  align?: "left" | "right";
}) {
  const club = (team.chosen_club || "—").trim();

  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : "text-left"}`}>
      <div
        className={`inline-flex min-w-0 max-w-full items-center gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        <ClubCrest clubName={club} logos={logos} size="sm" className="!h-6 !w-6 shrink-0" />
        <div className="min-w-0">
          <p className={identityClubClass("md", "default", "truncate")}>{club}</p>
          <p className={identityManagerClass("md", "default", "truncate")}>
            {team.manager_name}
          </p>
        </div>
      </div>
      <p className={`mt-2 font-mono text-xl font-black text-white ${align === "right" ? "text-right" : ""}`}>
        {totalFpl}
        <span className="ml-1 text-[10px] font-semibold text-slate-500">pkt FPL</span>
      </p>
      <p className={`text-[11px] text-slate-500 ${align === "right" ? "text-right" : ""}`}>
        {playedMatches} meczów w sezonie
      </p>
    </div>
  );
}

export function H2HComparator({
  teamFplTotals,
  fixtures,
  logos,
}: {
  teamFplTotals: TeamFplTotal[];
  fixtures: PublicFixture[];
  logos: ClubLogoRecord[];
}) {
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");

  const teamA = teamFplTotals.find((t) => t.teamId === teamAId);
  const teamB = teamFplTotals.find((t) => t.teamId === teamBId);

  const h2hFixtures = useMemo(() => {
    if (!teamAId || !teamBId || teamAId === teamBId) return [];
    return getHeadToHeadFixtures(fixtures, teamAId, teamBId).sort(
      (a, b) => a.gameweek - b.gameweek,
    );
  }, [fixtures, teamAId, teamBId]);

  const h2hBalance = useMemo(() => {
    let winsA = 0;
    let winsB = 0;
    let draws = 0;
    for (const f of h2hFixtures) {
      const isHomeA = f.home_team_id === teamAId;
      const h2hA = isHomeA ? f.home_h2h_points : f.away_h2h_points;
      const h2hB = isHomeA ? f.away_h2h_points : f.home_h2h_points;
      if (h2hA === 2) winsA += 1;
      else if (h2hB === 2) winsB += 1;
      else if (h2hA === 1 && h2hB === 1) draws += 1;
    }
    return { winsA, winsB, draws };
  }, [h2hFixtures, teamAId]);

  const ready = Boolean(teamA && teamB && teamAId !== teamBId);

  return (
    <section aria-labelledby="h2h-comparator-heading" className="space-y-4 sm:space-y-5">
      <div>
        <h3
          id="h2h-comparator-heading"
          className="font-athletic text-lg uppercase tracking-wide text-white sm:text-xl"
        >
          ⚔️ Porównywarka H2H
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Wybierz dwóch menedżerów z dywizji i sprawdź ich bilans.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <PlayerSelect
          label="Gracz A"
          value={teamAId}
          onChange={setTeamAId}
          options={teamFplTotals}
          logos={logos}
          excludeId={teamBId}
        />
        <PlayerSelect
          label="Gracz B"
          value={teamBId}
          onChange={setTeamBId}
          options={teamFplTotals}
          logos={logos}
          excludeId={teamAId}
        />
      </div>

      {!ready ? (
        <div className="rounded-lg border border-dashed border-slate-700 px-6 py-10 text-center text-sm text-slate-500">
          Wybierz dwóch różnych graczy, aby zobaczyć porównanie.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-violet-500/25 bg-slate-900/60 backdrop-blur-sm">
          <div className="grid gap-3 p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-4 sm:p-4">
            <VersusClubRow
              team={teamA!.team}
              totalFpl={teamA!.totalFpl}
              playedMatches={teamA!.playedMatches}
              logos={logos}
              align="left"
            />

            <div className="flex flex-col items-center justify-center px-1">
              <Swords className="mb-1.5 h-6 w-6 text-violet-400" aria-hidden />
              <p className="font-athletic text-2xl font-black text-violet-300">VS</p>
              <div className="mt-2 text-center text-xs text-slate-400">
                <p>
                  <span className="font-bold text-emerald-400">{h2hBalance.winsA}</span>
                  <span className="text-slate-600"> – </span>
                  <span className="font-bold text-slate-300">{h2hBalance.draws}</span>
                  <span className="text-slate-600"> – </span>
                  <span className="font-bold text-rose-400">{h2hBalance.winsB}</span>
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider">Bilans H2H (Z–R–P)</p>
              </div>
            </div>

            <VersusClubRow
              team={teamB!.team}
              totalFpl={teamB!.totalFpl}
              playedMatches={teamB!.playedMatches}
              logos={logos}
              align="right"
            />
          </div>

          <div className="border-t border-slate-800 bg-slate-950/40 px-3 py-3 sm:px-4">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Bezpośrednie mecze ({h2hFixtures.length})
            </p>
            {h2hFixtures.length === 0 ? (
              <p className="text-sm text-slate-400">
                Brak rozegranych meczów bezpośrednich między tymi graczami.
              </p>
            ) : (
              <div className="space-y-2">
                {h2hFixtures.map((f) => (
                  <VersusMatchRow
                    key={f.id}
                    fixture={f}
                    teamAId={teamAId}
                    teamBId={teamBId}
                    logos={logos}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
