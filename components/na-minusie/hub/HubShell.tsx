"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Activity,
  Crown,
  LayoutList,
  Loader2,
  CalendarRange,
  Swords,
  Trophy,
} from "lucide-react";
import {
  getDivisionStandings,
  getGameweekDetails,
} from "@/lib/public/actions";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type {
  DivisionStandingsPayload,
  GameweekDetailsPayload,
  PublicStructure,
} from "@/lib/public/types";
import { NA_MINUSIE_PATHS } from "@/lib/na-minusie/links";
import { StandingsTable } from "@/components/na-minusie/hub/StandingsTable";
import { GameweekCenter } from "@/components/na-minusie/hub/GameweekCenter";
import { ScheduleView } from "@/components/na-minusie/hub/ScheduleView";

type TabId = "table" | "gw" | "schedule";

const selectClass =
  "w-full rounded-xl border border-slate-700/70 bg-slate-950/80 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400 disabled:opacity-50";

export function HubShell({
  structure,
  logos,
  isAdmin = false,
}: {
  structure: PublicStructure;
  logos: ClubLogoRecord[];
  isAdmin?: boolean;
}) {
  const defaultSeasonId = structure.seasons[0]?.id ?? "";
  const [seasonId, setSeasonId] = useState(defaultSeasonId);

  const pyramidsForSeason = useMemo(() => {
    const ids = new Set(
      structure.divisions.filter((d) => d.season_id === seasonId).map((d) => d.pyramid_id),
    );
    return structure.pyramids.filter((p) => ids.has(p.id));
  }, [structure, seasonId]);

  const [pyramidId, setPyramidId] = useState(pyramidsForSeason[0]?.id ?? "");

  useEffect(() => {
    if (!pyramidsForSeason.find((p) => p.id === pyramidId)) {
      setPyramidId(pyramidsForSeason[0]?.id ?? "");
    }
  }, [pyramidsForSeason, pyramidId]);

  const divisions = useMemo(
    () =>
      structure.divisions
        .filter((d) => d.season_id === seasonId && d.pyramid_id === pyramidId)
        .sort((a, b) => a.tier - b.tier),
    [structure, seasonId, pyramidId],
  );

  const [divisionId, setDivisionId] = useState(divisions[0]?.id ?? "");

  useEffect(() => {
    if (!divisions.find((d) => d.id === divisionId)) {
      setDivisionId(divisions[0]?.id ?? "");
    }
  }, [divisions, divisionId]);

  const [tab, setTab] = useState<TabId>("table");
  const [bundle, setBundle] = useState<DivisionStandingsPayload | null>(null);
  const [gwDetails, setGwDetails] = useState<GameweekDetailsPayload | null>(null);
  const [selectedGw, setSelectedGw] = useState(1);
  const [pending, startTransition] = useTransition();
  const [gwPending, startGwTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!divisionId) {
      setBundle(null);
      setGwDetails(null);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const data = await getDivisionStandings(divisionId);
        setBundle(data);
        const firstGw = data.finishedGameweeks[data.finishedGameweeks.length - 1]
          ?? data.finishedGameweeks[0]
          ?? 1;
        setSelectedGw(firstGw);
      } catch (e) {
        setBundle(null);
        setError(e instanceof Error ? e.message : "Błąd ładowania tabeli");
      }
    });
  }, [divisionId]);

  useEffect(() => {
    if (!divisionId || tab !== "gw") return;
    if (!bundle?.finishedGameweeks.includes(selectedGw)) {
      setGwDetails(null);
      return;
    }
    startGwTransition(async () => {
      try {
        const data = await getGameweekDetails(divisionId, selectedGw);
        setGwDetails(data);
      } catch {
        setGwDetails(null);
      }
    });
  }, [divisionId, selectedGw, tab, bundle?.finishedGameweeks]);

  const seasonName =
    structure.seasons.find((s) => s.id === seasonId)?.name ?? "—";
  const divisionName = divisions.find((d) => d.id === divisionId)?.name ?? "—";
  const pyramidName = pyramidsForSeason.find((p) => p.id === pyramidId)?.name ?? "—";
  const exportMeta = {
    season: seasonName !== "—" ? seasonName : undefined,
    pyramid: pyramidName !== "—" ? pyramidName : undefined,
    division: divisionName !== "—" ? divisionName : undefined,
  };

  const tabs: { id: TabId; label: string; icon: typeof Trophy }[] = [
    { id: "table", label: "Tabela ogólna", icon: Trophy },
    { id: "gw", label: "Centrum kolejki", icon: Swords },
    { id: "schedule", label: "Pełny terminarz", icon: CalendarRange },
  ];

  if (!structure.seasons.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <LayoutList className="mx-auto mb-4 h-10 w-10 text-slate-600" />
        <h1 className="font-athletic text-3xl uppercase text-white">Strefa Gracza</h1>
        <p className="mt-3 text-slate-400">
          Brak opublikowanego sezonu. Administrator musi ustawić sezon na{" "}
          <strong className="text-emerald-400">PUBLISHED</strong>.
        </p>
        <Link
          href={NA_MINUSIE_PATHS.home}
          className="mt-8 inline-flex text-sm font-bold text-emerald-400 hover:underline"
        >
          ← Wróć na stronę Na Minusie
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-400">
            Strefa Gracza · Mediana 2+1
          </p>
          <h1 className="mt-1 font-athletic text-3xl uppercase tracking-wide text-white sm:text-4xl">
            Strefa Gracza
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Tabele, H2H, progi mediany i herby klubów — Twoje centrum dowodzenia.
          </p>
        </div>
        <Link
          href={NA_MINUSIE_PATHS.home}
          className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-emerald-400"
        >
          ← Na Minusie
        </Link>
      </header>

      {/* Selectors */}
      <section className="mb-4 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md sm:grid-cols-3 sm:p-5">
        {structure.seasons.length > 1 ? (
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Sezon
            </label>
            <select
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              className={selectClass}
            >
              {structure.seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex flex-col justify-center rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Sezon
            </span>
            <span className="font-athletic text-sm uppercase text-white">{seasonName}</span>
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Piramida
          </label>
          <select
            value={pyramidId}
            onChange={(e) => setPyramidId(e.target.value)}
            className={selectClass}
            disabled={!pyramidsForSeason.length}
          >
            {!pyramidsForSeason.length ? (
              <option value="">Brak</option>
            ) : (
              pyramidsForSeason.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))
            )}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Dywizja
          </label>
          <select
            value={divisionId}
            onChange={(e) => setDivisionId(e.target.value)}
            className={selectClass}
            disabled={!divisions.length}
          >
            {!divisions.length ? (
              <option value="">Brak</option>
            ) : (
              divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  T{d.tier} — {d.name}
                </option>
              ))
            )}
          </select>
        </div>
      </section>

      {/* Quick stats */}
      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Activity}
          label="Rozegrane GW"
          value={bundle ? String(bundle.playedGwCount) : "—"}
        />
        <StatCard
          icon={LayoutList}
          label="Śr. punkty FPL"
          value={bundle?.averageFpl != null ? String(bundle.averageFpl) : "—"}
        />
        <StatCard
          icon={Crown}
          label="Lider"
          value={
            bundle?.leader
              ? bundle.leader.team.chosen_club ||
                bundle.leader.team.fpl_team_name?.trim() ||
                "—"
              : "—"
          }
          sub={
            bundle?.leader
              ? [
                  bundle.leader.team.fpl_team_name?.trim(),
                  `${bundle.leader.totalPoints} pkt`,
                  divisionName,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : seasonName
          }
        />
      </section>

      {/* Tabs */}
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Zakładki huba">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition ${
              tab === id
                ? "bg-emerald-400 text-black shadow-lg shadow-emerald-500/20"
                : "border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </nav>

      {error && (
        <p className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      {pending && !bundle ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 py-20 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
          Ładowanie dywizji…
        </div>
      ) : !bundle ? (
        <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-16 text-center text-sm text-slate-500">
          Wybierz piramidę i dywizję.
        </div>
      ) : (
        <>
          {tab === "table" && (
            <StandingsTable
              rows={bundle.standings}
              logos={logos}
              tier={bundle.tier}
              exportMeta={exportMeta}
              divisionId={bundle.divisionId}
              showDiscordSend={isAdmin}
              hasWebhook={bundle.hasDiscordWebhook}
            />
          )}
          {tab === "gw" && (
            <GameweekCenter
              maxGameweek={bundle.maxGameweek}
              finishedGameweeks={bundle.finishedGameweeks}
              selectedGw={selectedGw}
              onSelectGw={setSelectedGw}
              details={gwDetails}
              loading={gwPending}
              logos={logos}
              exportMeta={exportMeta}
              fixtures={bundle.fixtures}
              divisionId={bundle.divisionId}
              showDiscordSend={isAdmin}
              hasWebhook={bundle.hasDiscordWebhook}
            />
          )}
          {tab === "schedule" && (
            <ScheduleView
              teams={bundle.teams}
              fixtures={bundle.fixtures}
              logos={logos}
            />
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Crown;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <Icon className="h-3.5 w-3.5 text-emerald-400" />
        {label}
      </div>
      <p className="mt-1 truncate font-athletic text-xl uppercase tracking-wide text-white">
        {value}
      </p>
      {sub ? <p className="truncate text-[11px] text-slate-500">{sub}</p> : null}
    </div>
  );
}
