"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Activity,
  CalendarRange,
  LayoutList,
  Loader2,
  Shuffle,
  Swords,
  Trophy,
  UserCircle,
  Users,
} from "lucide-react";
import {
  getDivisionStandings,
  getGameweekDetails,
} from "@/lib/public/actions";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { TierLogoRecord } from "@/lib/admin/tierLogos";
import type {
  DivisionStandingsPayload,
  GameweekDetailsPayload,
  PublicStructure,
} from "@/lib/public/types";
import { NA_MINUSIE_PATHS } from "@/lib/na-minusie/links";
import { StandingsTable } from "@/components/na-minusie/hub/StandingsTable";
import { GameweekCenter } from "@/components/na-minusie/hub/GameweekCenter";
import { ScheduleView } from "@/components/na-minusie/hub/ScheduleView";
import {
  resolveTierLogoName,
  TierCrest,
} from "@/components/na-minusie/TierCrest";

type HubTab = "tabela" | "kolejki" | "terminarz" | "profile";

const SECTION_TABS: {
  id: HubTab;
  label: string;
  icon: typeof Trophy;
}[] = [
  { id: "tabela", label: "Tabela", icon: Trophy },
  { id: "kolejki", label: "Centrum kolejki", icon: Swords },
  { id: "terminarz", label: "Terminarz", icon: CalendarRange },
  { id: "profile", label: "Uczestnicy", icon: Users },
];

export function HubShell({
  structure,
  logos,
  tierLogos = [],
  isAdmin = false,
}: {
  structure: PublicStructure;
  logos: ClubLogoRecord[];
  tierLogos?: TierLogoRecord[];
  isAdmin?: boolean;
}) {
  const defaultSeasonId = structure.seasons[0]?.id ?? "";
  const [seasonId, setSeasonId] = useState(defaultSeasonId);

  const divisions = useMemo(
    () =>
      structure.divisions
        .filter((d) => d.season_id === seasonId)
        .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name, "pl")),
    [structure.divisions, seasonId],
  );

  const [activeDivisionId, setActiveDivisionId] = useState(divisions[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<HubTab>("tabela");

  useEffect(() => {
    if (!divisions.find((d) => d.id === activeDivisionId)) {
      setActiveDivisionId(divisions[0]?.id ?? "");
    }
  }, [divisions, activeDivisionId]);

  const [bundle, setBundle] = useState<DivisionStandingsPayload | null>(null);
  const [gwDetails, setGwDetails] = useState<GameweekDetailsPayload | null>(null);
  const [selectedGw, setSelectedGw] = useState(1);
  const [pending, startTransition] = useTransition();
  const [gwPending, startGwTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeDivisionId) {
      setBundle(null);
      setGwDetails(null);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const data = await getDivisionStandings(activeDivisionId);
        setBundle(data);
        const firstGw =
          data.finishedGameweeks[data.finishedGameweeks.length - 1] ??
          data.finishedGameweeks[0] ??
          1;
        setSelectedGw(firstGw);
      } catch (e) {
        setBundle(null);
        setError(e instanceof Error ? e.message : "Błąd ładowania tabeli");
      }
    });
  }, [activeDivisionId]);

  useEffect(() => {
    if (!activeDivisionId || activeTab !== "kolejki") return;
    if (!bundle?.finishedGameweeks.includes(selectedGw)) {
      setGwDetails(null);
      return;
    }
    startGwTransition(async () => {
      try {
        const data = await getGameweekDetails(activeDivisionId, selectedGw);
        setGwDetails(data);
      } catch {
        setGwDetails(null);
      }
    });
  }, [activeDivisionId, selectedGw, activeTab, bundle?.finishedGameweeks]);

  const seasonName = structure.seasons.find((s) => s.id === seasonId)?.name ?? "—";
  const activeDivision = divisions.find((d) => d.id === activeDivisionId);
  const divisionName = activeDivision?.name ?? "—";
  const pyramidName =
    structure.pyramids.find((p) => p.id === activeDivision?.pyramid_id)?.name ?? "—";

  const exportMeta = {
    season: seasonName !== "—" ? seasonName : undefined,
    pyramid: pyramidName !== "—" ? pyramidName : undefined,
    division: divisionName !== "—" ? divisionName : undefined,
  };

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
      {/* Header */}
      <header className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-400">
              Centrum Dowodzenia
            </p>
            <h1 className="mt-1 font-athletic text-3xl uppercase tracking-wide text-white sm:text-4xl">
              Strefa Gracza
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              {structure.seasons.length > 1 ? (
                <label className="inline-flex items-center gap-2">
                  <span className="sr-only">Sezon</span>
                  <select
                    value={seasonId}
                    onChange={(e) => setSeasonId(e.target.value)}
                    className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 text-sm font-bold text-emerald-300 outline-none focus:border-emerald-400"
                  >
                    {structure.seasons.map((s) => (
                      <option key={s.id} value={s.id} className="bg-slate-950 text-white">
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 text-sm font-bold text-emerald-300">
                  {seasonName}
                </span>
              )}

              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-300">
                <Activity className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                Kolejka {bundle ? `${bundle.playedGwCount}/${bundle.maxGameweek}` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Compact stats */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          <StatChip
            label="Śr. FPL"
            value={bundle?.averageFpl != null ? String(bundle.averageFpl) : "—"}
          />
          <StatChip
            label="Lider"
            value={
              bundle?.leader
                ? bundle.leader.team.chosen_club ||
                  bundle.leader.team.fpl_team_name?.trim() ||
                  "—"
                : "—"
            }
          />
          <StatChip
            label="Dywizja"
            value={divisionName}
            className="col-span-2 sm:col-span-1"
          />
        </div>
      </header>

      {/* Division pills */}
      {divisions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-12 text-center text-sm text-slate-500">
          Brak dywizji w tym sezonie.
        </div>
      ) : (
        <>
          <nav
            className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Wybór dywizji"
          >
            {divisions.map((d) => {
              const active = d.id === activeDivisionId;
              const crestName = resolveTierLogoName(d.name, d.tier);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setActiveDivisionId(d.id)}
                  className={`inline-flex shrink-0 items-center gap-2.5 rounded-full border px-3.5 py-2 text-sm font-bold transition-all ${
                    active
                      ? "border-emerald-500 bg-emerald-600/20 text-white shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                      : "border-slate-700/80 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                  }`}
                >
                  <TierCrest tierName={crestName} logos={tierLogos} size="sm" />
                  <span className="whitespace-nowrap">{d.name}</span>
                </button>
              );
            })}
          </nav>

          {/* Section sub-nav */}
          <nav
            className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-800 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Sekcje dywizji"
          >
            {SECTION_TABS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-black uppercase tracking-wider transition-colors sm:px-4 ${
                    active
                      ? "border-emerald-500 text-white"
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                </button>
              );
            })}
          </nav>

          {error ? (
            <p className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          {pending && !bundle ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 py-20 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
              Ładowanie dywizji…
            </div>
          ) : !bundle && activeTab !== "profile" ? (
            <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-16 text-center text-sm text-slate-500">
              Wybierz dywizję.
            </div>
          ) : (
            <div key={`${activeDivisionId}-${activeTab}`} className="nm-hub-panel min-h-[20rem]">
              {/* Dane scoped: getDivisionStandings(activeDivisionId) → tylko aktywna dywizja */}
              {activeTab === "tabela" && bundle ? (
                <StandingsTable
                  rows={bundle.standings}
                  logos={logos}
                  tier={bundle.tier}
                  exportMeta={exportMeta}
                  divisionId={bundle.divisionId}
                  showDiscordSend={isAdmin}
                  hasWebhook={bundle.hasDiscordWebhook}
                />
              ) : null}

              {activeTab === "kolejki" && bundle ? (
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
              ) : null}

              {activeTab === "terminarz" && bundle ? (
                bundle.fixtures.length === 0 ? (
                  <SchedulePlaceholder divisionName={divisionName} />
                ) : (
                  <ScheduleView
                    teams={bundle.teams}
                    fixtures={bundle.fixtures}
                    logos={logos}
                  />
                )
              ) : null}

              {activeTab === "profile" ? (
                <ProfilesPlaceholder divisionName={divisionName} />
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatChip({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2.5 ${className}`.trim()}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function ProfilesPlaceholder({ divisionName }: { divisionName: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/30 px-6 py-16 text-center">
      <UserCircle className="mb-5 h-16 w-16 text-emerald-500/50" strokeWidth={1.25} aria-hidden />
      <h2 className="font-athletic text-2xl uppercase tracking-wide text-white sm:text-3xl">
        Profile i Statystyki Menedżerów
      </h2>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-400 sm:text-base">
        Karty zawodników, historia transferów i osiągnięcia w budowie. Zbieramy dane do pierwszych
        statystyk
        {divisionName !== "—" ? ` · ${divisionName}` : ""}.
      </p>
    </div>
  );
}

function SchedulePlaceholder({ divisionName }: { divisionName: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/30 px-6 py-16 text-center">
      <Shuffle className="mb-5 h-14 w-14 text-emerald-500/50" strokeWidth={1.25} aria-hidden />
      <h2 className="font-athletic text-2xl uppercase tracking-wide text-white sm:text-3xl">
        Terminarz
      </h2>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-400 sm:text-base">
        Terminarz {divisionName !== "—" ? `dla ${divisionName}` : "tej dywizji"} pojawi się po
        oficjalnym losowaniu meczów. Wróć tutaj po maszynie losującej.
      </p>
    </div>
  );
}
