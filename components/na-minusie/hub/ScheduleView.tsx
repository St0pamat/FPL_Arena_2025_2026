"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Search } from "lucide-react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { PlayoffPreviewPayload, PublicFixture, PublicTeam } from "@/lib/public/types";
import {
  gameweekLabel,
  isPlayoffGameweek,
  PLAYOFF_GAMEWEEK,
} from "@/lib/public/season";
import { LinkedCrestOnly } from "@/components/na-minusie/hub/LinkedTeamCell";
import { PlayoffMatchRow } from "@/components/na-minusie/hub/PlayoffMatchRow";
import { TeamIdentity, teamPrimaryLabel } from "@/components/na-minusie/hub/TeamIdentity";

export function ScheduleView({
  teams,
  fixtures,
  logos = [],
  playoffs,
}: {
  teams: PublicTeam[];
  fixtures: PublicFixture[];
  logos?: ClubLogoRecord[];
  playoffs: PlayoffPreviewPayload;
}) {
  const [filterTeamId, setFilterTeamId] = useState("");
  const [filterGw, setFilterGw] = useState("");

  const availableGws = useMemo(() => {
    const set = new Set(
      fixtures
        .filter((f) => !f.is_playoff && !isPlayoffGameweek(f.gameweek))
        .map((f) => f.gameweek),
    );
    set.add(playoffs.gameweek || PLAYOFF_GAMEWEEK);
    for (const m of playoffs.matches) set.add(m.fixture.gameweek);
    return [...set].sort((a, b) => a - b);
  }, [fixtures, playoffs.gameweek, playoffs.matches]);

  const byGw = useMemo(() => {
    // Baraże renderujemy w wyróżnionej sekcji (PlayoffMatchRow), nie w zwykłym terminarzu
    let filtered = fixtures.filter(
      (f) => !f.is_playoff && !isPlayoffGameweek(f.gameweek),
    );
    if (filterTeamId) {
      filtered = filtered.filter(
        (f) => f.home_team_id === filterTeamId || f.away_team_id === filterTeamId,
      );
    }
    if (filterGw) {
      const gw = Number(filterGw);
      if (isPlayoffGameweek(gw)) return [];
      filtered = filtered.filter((f) => f.gameweek === gw);
    }
    const map = new Map<number, PublicFixture[]>();
    for (const f of filtered) {
      const list = map.get(f.gameweek) ?? [];
      list.push(f);
      map.set(f.gameweek, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [fixtures, filterTeamId, filterGw]);

  const playoffMatchesFiltered = useMemo(() => {
    let list = playoffs.matches;
    if (filterTeamId) {
      list = list.filter(
        (m) =>
          m.fixture.home_team_id === filterTeamId ||
          m.fixture.away_team_id === filterTeamId,
      );
    }
    if (filterGw) {
      const gw = Number(filterGw);
      if (!isPlayoffGameweek(gw)) return [];
      list = list.filter((m) => m.fixture.gameweek === gw);
    }
    return list;
  }, [playoffs.matches, filterTeamId, filterGw]);

  const showPlayoffSection =
    (!filterGw || isPlayoffGameweek(Number(filterGw))) &&
    (playoffMatchesFiltered.length > 0 ||
      (playoffs.notices.length > 0 && !filterTeamId));

  const playoffSectionGw =
    playoffMatchesFiltered[0]?.fixture.gameweek ??
    (filterGw && isPlayoffGameweek(Number(filterGw))
      ? Number(filterGw)
      : playoffs.gameweek);

  const hasAnyContent = byGw.length > 0 || showPlayoffSection;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-emerald-400" />
            <h2 className="font-athletic text-lg uppercase tracking-wide text-white">
              Pełny terminarz
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Filtruj po drużynie i kolejce (GW). GW19 / GW38 = baraże.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:max-w-md sm:flex-row">
          <label className="relative block min-w-0 flex-1">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Kolejka
            </span>
            <select
              value={filterGw}
              onChange={(e) => setFilterGw(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-950 py-2.5 px-3 text-sm text-white outline-none focus:border-emerald-400"
            >
              <option value="">Wszystkie GW</option>
              {availableGws.map((gw) => (
                <option key={gw} value={String(gw)}>
                  {gameweekLabel(gw)}
                </option>
              ))}
            </select>
          </label>
          <label className="relative block min-w-0 flex-[1.4]">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Drużyna
            </span>
            <Search className="pointer-events-none absolute left-3 bottom-3 h-4 w-4 text-slate-500" />
            <select
              value={filterTeamId}
              onChange={(e) => setFilterTeamId(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-emerald-400"
            >
              <option value="">Wszystkie drużyny</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {teamPrimaryLabel(t)}
                  {t.fpl_team_name?.trim() ? ` · ${t.fpl_team_name.trim()}` : ""} ({t.discord_nick})
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {!hasAnyContent ? (
        <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-12 text-center text-sm text-slate-500">
          {filterTeamId || filterGw
            ? "Brak meczów dla wybranych filtrów."
            : "Brak meczów w terminarzu."}
        </div>
      ) : (
        <div className="space-y-5">
          {byGw.map(([gw, matches]) => (
            <section
              key={gw}
              className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-md"
            >
              <header className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
                <h3 className="font-athletic text-sm uppercase tracking-wider text-emerald-400">
                  {isPlayoffGameweek(gw) ? gameweekLabel(gw) : `Gameweek ${gw}`}
                </h3>
                <span className="text-[10px] uppercase tracking-wider text-slate-600">
                  {matches.every((m) => m.is_finished) ? "Rozliczona" : "Nadchodząca"}
                </span>
              </header>
              <ul className="divide-y divide-slate-800/80">
                {matches.map((f) => {
                  const highlight =
                    filterTeamId &&
                    (f.home_team_id === filterTeamId || f.away_team_id === filterTeamId);
                  return (
                    <li
                      key={f.id}
                      className={`grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3 ${
                        highlight ? "bg-emerald-500/5" : ""
                      }`}
                    >
                      <div className="flex min-h-[3.25rem] min-w-0 items-stretch justify-end gap-2">
                        <div className="flex min-w-0 flex-1 flex-col justify-center">
                          <TeamIdentity team={f.home_team} align="right" size="sm" />
                        </div>
                        <LinkedCrestOnly
                          team={f.home_team}
                          logos={logos}
                          colClass="w-11 sm:w-12"
                        />
                      </div>
                      <div className="flex flex-col items-center justify-center">
                        {f.is_finished ? (
                          <span className="font-mono text-sm font-black text-white">
                            {f.home_fpl_points ?? 0}:{f.away_fpl_points ?? 0}
                          </span>
                        ) : (
                          <span className="rounded bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400">
                            vs
                          </span>
                        )}
                      </div>
                      <div className="flex min-h-[3.25rem] min-w-0 items-stretch justify-start gap-2">
                        <LinkedCrestOnly
                          team={f.away_team}
                          logos={logos}
                          colClass="w-11 sm:w-12"
                        />
                        <div className="flex min-w-0 flex-1 flex-col justify-center">
                          <TeamIdentity team={f.away_team} align="left" size="sm" />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {showPlayoffSection ? (
            <section className="overflow-hidden rounded-2xl border border-amber-500/25 bg-slate-900/70 backdrop-blur-md">
              <header className="flex items-center justify-between border-b border-amber-500/20 px-4 py-2.5">
                <h3 className="font-athletic text-sm uppercase tracking-wider text-amber-400">
                  {gameweekLabel(playoffSectionGw)} · Mecz o Awans / Utrzymanie
                </h3>
                <span className="text-[10px] uppercase tracking-wider text-amber-500/70">
                  {playoffMatchesFiltered.some((m) => !m.isProvisional) ||
                  playoffs.matches.some((m) => !m.isProvisional)
                    ? "Wyniki baraży"
                    : "Podgląd baraży"}
                </span>
              </header>

              {playoffs.notices.map((notice) => (
                <p
                  key={notice}
                  className="border-b border-slate-800/80 px-4 py-3 text-sm leading-relaxed text-slate-400"
                >
                  {notice}
                </p>
              ))}

              {playoffMatchesFiltered.length > 0 ? (
                <ul className="divide-y divide-slate-800/80">
                  {playoffMatchesFiltered.map((m) => {
                    const highlight =
                      Boolean(filterTeamId) &&
                      (m.fixture.home_team_id === filterTeamId ||
                        m.fixture.away_team_id === filterTeamId);
                    return (
                      <li key={m.fixture.id} className="py-3">
                        <PlayoffMatchRow
                          match={m}
                          logos={logos}
                          highlight={highlight}
                        />
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
