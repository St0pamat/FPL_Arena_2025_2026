"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  NoBigSixGwResult,
  NoBigSixPenalty,
  NoBigSixTeam,
} from "@/lib/no-big-six/types";
import { availableGameweeks } from "@/lib/no-big-six/standings";
import {
  formatViolationLine,
  getIntentionalPenalties,
  hasIntentionalViolation,
} from "@/lib/no-big-six/penalties";
import { DoZbanowaniaBadge } from "@/components/no-big-six/DoZbanowaniaBadge";

type Props = {
  teams: NoBigSixTeam[];
  results: NoBigSixGwResult[];
  penalties: NoBigSixPenalty[];
};

export function GwResultsTab({ teams, results, penalties }: Props) {
  const gameweeks = useMemo(() => availableGameweeks(results), [results]);
  const [selectedGw, setSelectedGw] = useState<number>(() => gameweeks[0] ?? 1);

  useEffect(() => {
    if (gameweeks.length === 0) return;
    if (!gameweeks.includes(selectedGw)) {
      setSelectedGw(gameweeks[gameweeks.length - 1] ?? gameweeks[0]);
    }
  }, [gameweeks, selectedGw]);

  const teamByEntry = useMemo(
    () => new Map(teams.map((t) => [t.entry_id, t])),
    [teams],
  );

  const gwResults = useMemo(
    () =>
      results
        .filter((r) => r.event === selectedGw)
        .sort((a, b) => b.official_points - a.official_points),
    [results, selectedGw],
  );

  const penaltiesByEntry = useMemo(() => {
    const map = new Map<number, NoBigSixPenalty[]>();
    for (const p of penalties.filter((x) => x.event === selectedGw)) {
      const list = map.get(p.entry_id) ?? [];
      list.push(p);
      map.set(p.entry_id, list);
    }
    return map;
  }, [penalties, selectedGw]);

  if (gameweeks.length === 0) {
    return (
      <p className="py-8 text-center text-slate-400">
        Brak rozegranych kolejek — wyniki pojawią się po synchronizacji z FPL.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Kolejka:
        </span>
        {gameweeks.map((gw) => (
          <button
            key={gw}
            type="button"
            onClick={() => setSelectedGw(gw)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
              selectedGw === gw
                ? "border-amber-500 bg-amber-500/10 text-amber-500"
                : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"
            }`}
          >
            GW{gw}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {gwResults.map((row) => {
          const team = teamByEntry.get(row.entry_id);
          const rowPenalties = penaltiesByEntry.get(row.entry_id) ?? [];
          const intentionalPenalties = getIntentionalPenalties(
            penalties,
            row.entry_id,
            selectedGw,
          );
          const flagForBan = hasIntentionalViolation(penalties, row.entry_id, selectedGw);

          return (
            <article
              key={row.id}
              className={`rounded-xl border bg-slate-900/50 p-4 sm:p-5 ${
                flagForBan ? "border-rose-500/40 ring-1 ring-rose-500/20" : "border-slate-800"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">
                      {team?.team_name ?? `Entry ${row.entry_id}`}
                    </p>
                    {flagForBan ? <DoZbanowaniaBadge /> : null}
                  </div>
                  <p className="text-xs text-slate-500">{team?.player_name ?? "—"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Oficjalnie</p>
                  <p className="text-2xl font-bold tabular-nums text-amber-500">
                    {row.official_points}
                  </p>
                  <p className="text-xs tabular-nums text-slate-500">
                    FPL {row.raw_fpl_points}
                    {row.penalty_points > 0 && (
                      <span className="text-rose-500"> · −{row.penalty_points} kara</span>
                    )}
                  </p>
                </div>
              </div>

              {intentionalPenalties.length > 0 ? (
                <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/30 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                    Celowe naruszenia — do weryfikacji przez admina
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {intentionalPenalties.map((p) => (
                      <li key={p.id} className="text-sm font-medium text-rose-300">
                        🚫 {formatViolationLine(p)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {rowPenalties.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {rowPenalties.map((p) => (
                    <li
                      key={p.id}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        p.is_auto_sub
                          ? "border-slate-700 bg-slate-800/50 text-slate-400"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      {p.is_auto_sub ? "↩️" : "🚫"} {p.player_name} — Odjęto{" "}
                      {p.deducted_points} pkt. Powód: {p.reason}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
