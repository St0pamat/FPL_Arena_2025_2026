"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Table2, Swords } from "lucide-react";
import { getDivisionsForSeasonPyramid } from "@/app/admin/actions/db";
import {
  getDivisionResultsBundle,
  type DivisionResultsBundle,
  type DivisionResultsFixture,
} from "@/app/admin/actions/fixtures";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { Division, Pyramid, Season } from "@/lib/admin/types";
import {
  buildStandings,
  finishedGameweeks,
  type StandingRow,
} from "@/lib/admin/standings";
import { ClubLogo } from "@/components/admin/ClubLogo";
import { resolveLogoSrc } from "@/components/admin/ClubNameWithLogo";

const selectClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-[#39FF14] disabled:opacity-50";

function clubLabel(f: DivisionResultsFixture["home_team"]) {
  return (f?.chosen_club ?? "—").toUpperCase();
}

function StandingsTable({
  rows,
  teamsById,
  logos,
  title,
}: {
  rows: StandingRow[];
  teamsById: Map<string, { chosen_club: string; manager_name: string; discord_nick: string }>;
  logos: ClubLogoRecord[];
  title: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-700/50 px-4 py-6 text-center text-sm text-slate-500">
        Brak danych do tabeli.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/40">
      <header className="border-b border-slate-700/50 px-4 py-3">
        <h4 className="text-sm font-bold text-white">{title}</h4>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-700/40 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2.5 font-bold">#</th>
              <th className="px-3 py-2.5 font-bold">Klub</th>
              <th className="px-3 py-2.5 font-bold text-center" title="Mecze">
                M
              </th>
              <th className="px-3 py-2.5 font-bold text-center" title="Zwycięstwa">
                Z
              </th>
              <th className="px-3 py-2.5 font-bold text-center" title="Remisy">
                R
              </th>
              <th className="px-3 py-2.5 font-bold text-center" title="Porażki">
                P
              </th>
              <th className="px-3 py-2.5 font-bold text-center" title="Małe punkty FPL">
                FPL
              </th>
              <th className="px-3 py-2.5 font-bold text-center" title="Punkty H2H (2/1/0)">
                H2H
              </th>
              <th className="px-3 py-2.5 font-bold text-center" title="Bonus mediany">
                Med
              </th>
              <th className="px-3 py-2.5 font-bold text-center text-[#39FF14]" title="H2H + Mediana">
                Pkt
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((r) => {
              const t = teamsById.get(r.teamId);
              const club = (t?.chosen_club ?? "—").toUpperCase();
              return (
                <tr key={r.teamId} className="hover:bg-slate-900/50">
                  <td className="px-3 py-2 font-mono text-xs font-bold text-[#39FF14]">
                    {r.position}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex min-h-[2.75rem] min-w-0 items-stretch gap-2">
                      <ClubLogo
                        src={resolveLogoSrc(logos, t?.chosen_club)}
                        clubName={t?.chosen_club}
                        fill
                      />
                      <div className="flex min-w-0 flex-col justify-center">
                        <p className="truncate font-bold uppercase tracking-wide text-white">
                          {club}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {t ? `(${t.manager_name} · ${t.discord_nick})` : "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums text-slate-300">{r.played}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-slate-300">{r.won}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-slate-300">{r.drawn}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-slate-300">{r.lost}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-slate-200">{r.fplPoints}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-slate-200">{r.h2hPoints}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-emerald-300">
                    {r.medianPoints}
                  </td>
                  <td className="px-3 py-2 text-center text-base font-black tabular-nums text-[#39FF14]">
                    {r.totalPoints}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatchResultsList({
  fixtures,
  logos,
}: {
  fixtures: DivisionResultsFixture[];
  logos: ClubLogoRecord[];
}) {
  if (fixtures.length === 0) {
    return (
      <p className="text-sm text-slate-500">Brak rozliczonych meczów w tej dywizji.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {fixtures.map((f) => (
        <li
          key={f.id}
          className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-slate-700/40 bg-slate-900/50 px-3 py-2 sm:gap-3 sm:px-4"
        >
          <div className="flex min-h-[3rem] min-w-0 items-stretch justify-end gap-2">
            <div className="flex min-w-0 flex-col justify-center text-right">
              <p className="truncate text-sm font-black uppercase text-white">
                {clubLabel(f.home_team)}
              </p>
              <p className="truncate text-[11px] text-slate-500">
                FPL {f.home_fpl_points ?? "—"} · H2H {f.home_h2h_points}
                {f.home_median_bonus ? " · Med +1" : ""}
              </p>
            </div>
            <ClubLogo
              src={resolveLogoSrc(logos, f.home_team?.chosen_club)}
              clubName={f.home_team?.chosen_club}
              fill
            />
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="rounded bg-black/40 px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-[#39FF14]">
              GW{f.gameweek}
            </span>
            <span className="font-mono text-sm font-black text-white">
              {f.home_fpl_points ?? "—"}:{f.away_fpl_points ?? "—"}
            </span>
          </div>
          <div className="flex min-h-[3rem] min-w-0 items-stretch justify-start gap-2">
            <ClubLogo
              src={resolveLogoSrc(logos, f.away_team?.chosen_club)}
              clubName={f.away_team?.chosen_club}
              fill
            />
            <div className="flex min-w-0 flex-col justify-center text-left">
              <p className="truncate text-sm font-black uppercase text-white">
                {clubLabel(f.away_team)}
              </p>
              <p className="truncate text-[11px] text-slate-500">
                FPL {f.away_fpl_points ?? "—"} · H2H {f.away_h2h_points}
                {f.away_median_bonus ? " · Med +1" : ""}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function GwResultsStandingsPanel({
  seasons,
  pyramids,
  logos = [],
  seasonId: controlledSeason,
  pyramidId: controlledPyramid,
  onSeasonChange,
  onPyramidChange,
  refreshKey = 0,
}: {
  seasons: Season[];
  pyramids: Pyramid[];
  logos?: ClubLogoRecord[];
  seasonId?: string;
  pyramidId?: string;
  onSeasonChange?: (id: string) => void;
  onPyramidChange?: (id: string) => void;
  refreshKey?: number;
}) {
  const [localSeason, setLocalSeason] = useState("");
  const [localPyramid, setLocalPyramid] = useState("");
  const seasonId = controlledSeason ?? localSeason;
  const pyramidId = controlledPyramid ?? localPyramid;
  const setSeasonId = onSeasonChange ?? setLocalSeason;
  const setPyramidId = onPyramidChange ?? setLocalPyramid;
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [divisionId, setDivisionId] = useState("");
  const [bundle, setBundle] = useState<DivisionResultsBundle | null>(null);
  const [tableMode, setTableMode] = useState<"overall" | number>("overall");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDivisionId("");
    setBundle(null);
    setDivisions([]);
    if (!seasonId || !pyramidId) return;

    let cancelled = false;
    startTransition(async () => {
      try {
        const list = await getDivisionsForSeasonPyramid(seasonId, pyramidId);
        if (!cancelled) {
          setDivisions(list);
          if (list.length === 1) setDivisionId(list[0].id);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Błąd dywizji");
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [seasonId, pyramidId]);

  useEffect(() => {
    if (!divisionId) {
      setBundle(null);
      return;
    }
    let cancelled = false;
    setError(null);
    startTransition(async () => {
      try {
        const data = await getDivisionResultsBundle(divisionId);
        if (!cancelled) {
          setBundle(data);
          setTableMode("overall");
        }
      } catch (e) {
        if (!cancelled) {
          setBundle(null);
          setError(e instanceof Error ? e.message : "Błąd wyników");
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [divisionId, refreshKey]);

  const finished = useMemo(
    () => (bundle ? bundle.fixtures.filter((f) => f.is_finished) : []),
    [bundle],
  );

  const gws = useMemo(() => finishedGameweeks(finished), [finished]);

  const teamsById = useMemo(() => {
    const m = new Map<
      string,
      { chosen_club: string; manager_name: string; discord_nick: string }
    >();
    for (const t of bundle?.teams ?? []) {
      m.set(t.id, {
        chosen_club: t.chosen_club,
        manager_name: t.manager_name,
        discord_nick: t.discord_nick,
      });
    }
    return m;
  }, [bundle]);

  const teamIds = useMemo(() => (bundle?.teams ?? []).map((t) => t.id), [bundle]);

  const standings = useMemo(() => {
    if (!bundle) return [];
    const subset =
      tableMode === "overall"
        ? finished
        : finished.filter((f) => f.gameweek === tableMode);
    return buildStandings(subset, teamIds);
  }, [bundle, finished, tableMode, teamIds]);

  const matchesForList = useMemo(() => {
    if (tableMode === "overall") return finished;
    return finished.filter((f) => f.gameweek === tableMode);
  }, [finished, tableMode]);

  return (
    <section className="space-y-6 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#39FF14]/10">
          <Table2 className="h-5 w-5 text-[#39FF14]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Podgląd wyników i tabele</h2>
          <p className="mt-1 text-sm text-slate-400">
            Rozliczone mecze, tabela kolejki (każde GW osobno) oraz tabela ogólna: miejsce, FPL, Z/R/P,
            H2H, mediana, punkty łącznie.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
            Sezon
          </label>
          <select
            value={seasonId}
            onChange={(e) => setSeasonId(e.target.value)}
            className={selectClass}
            disabled={pending}
          >
            <option value="">Wybierz…</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
            Piramida
          </label>
          <select
            value={pyramidId}
            onChange={(e) => setPyramidId(e.target.value)}
            className={selectClass}
            disabled={pending}
          >
            <option value="">Wybierz…</option>
            {pyramids.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
            Dywizja
          </label>
          <select
            value={divisionId}
            onChange={(e) => setDivisionId(e.target.value)}
            className={selectClass}
            disabled={pending || !divisions.length}
          >
            <option value="">Wybierz…</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                D{d.tier} — {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {pending && (
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Ładowanie…
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {bundle && !pending && (
        <>
          <p className="text-xs text-slate-500">
            Rozliczone mecze:{" "}
            <strong className="text-slate-300">{bundle.finishedCount}</strong> /{" "}
            {bundle.fixtures.length}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTableMode("overall")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
                tableMode === "overall"
                  ? "bg-[#39FF14] text-black"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              Tabela ogólna
            </button>
            {gws.map((gw) => (
              <button
                key={gw}
                type="button"
                onClick={() => setTableMode(gw)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
                  tableMode === gw
                    ? "bg-[#39FF14] text-black"
                    : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                GW{gw}
              </button>
            ))}
          </div>

          <StandingsTable
            title={
              tableMode === "overall"
                ? "Tabela ogólna (suma rozliczonych kolejek)"
                : `Tabela GW${tableMode}`
            }
            rows={standings}
            teamsById={teamsById}
            logos={logos}
          />

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Swords className="h-4 w-4 text-[#39FF14]" />
              <h3 className="text-sm font-bold text-white">
                {tableMode === "overall"
                  ? "Wszystkie rozliczone mecze"
                  : `Mecze GW${tableMode}`}
              </h3>
            </div>
            <MatchResultsList fixtures={matchesForList} logos={logos} />
          </div>
        </>
      )}
    </section>
  );
}
