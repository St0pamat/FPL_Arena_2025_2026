"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Earth,
  Loader2,
  Settings2,
  Swords,
  Trash2,
} from "lucide-react";
import {
  clearSimulatedRange,
  ensurePlayoffFixtures,
  generateSimulatedResults,
  publishSimulatedRange,
} from "@/app/admin/actions/simulator";
import {
  SIMULATOR_SCENARIOS,
  type SimulatorScenarioId,
  type SimulatorScenarioMeta,
} from "@/lib/admin/simulatorScenarios";
import type { Division, Season } from "@/lib/admin/types";
import { DIVISION_CAPACITY } from "@/lib/admin/divisionCapacity";
import {
  defaultGameweekForPhase,
  gameweekLabel,
  gameweeksForSeasonPhase,
  isPlayoffGameweek,
  resolveSeasonPhase,
} from "@/lib/public/season";

const selectClass =
  "w-full rounded-xl border border-slate-700/60 bg-[#070b14] px-4 py-3 text-sm font-medium text-white outline-none transition focus:border-[#39FF14] focus:ring-1 focus:ring-[#39FF14]/40";

const panelClass =
  "relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/90 via-[#0B0F19] to-slate-950 p-5 sm:p-6";

const accentRing: Record<SimulatorScenarioMeta["accent"], string> = {
  green:
    "border-emerald-400/70 bg-emerald-500/10 shadow-[0_0_24px_-8px_rgba(16,185,129,0.55)]",
  red: "border-rose-400/70 bg-rose-500/10 shadow-[0_0_24px_-8px_rgba(244,63,94,0.55)]",
  amber:
    "border-amber-400/70 bg-amber-500/10 shadow-[0_0_24px_-8px_rgba(245,158,11,0.55)]",
  sky: "border-sky-400/70 bg-sky-500/10 shadow-[0_0_24px_-8px_rgba(56,189,248,0.55)]",
};

const accentDot: Record<SimulatorScenarioMeta["accent"], string> = {
  green: "bg-emerald-400",
  red: "bg-rose-400",
  amber: "bg-amber-400",
  sky: "bg-sky-400",
};

function pickDefaultSeasonId(seasons: Season[]): string {
  const sorted = [...seasons].sort((a, b) => {
    const aa = a.is_archived ? 1 : 0;
    const bb = b.is_archived ? 1 : 0;
    if (aa !== bb) return aa - bb;
    if (a.status === "PUBLISHED" && b.status !== "PUBLISHED") return -1;
    if (b.status === "PUBLISHED" && a.status !== "PUBLISHED") return 1;
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });
  return sorted[0]?.id ?? "";
}

export function SeasonSimulatorPanel({
  seasons,
  divisions,
  playerCountByDivision = {},
}: {
  seasons: Season[];
  divisions: Division[];
  playerCountByDivision?: Record<string, number>;
}) {
  const defaultSeason = pickDefaultSeasonId(seasons);
  const [seasonId, setSeasonId] = useState(defaultSeason);
  const selectedSeason = seasons.find((s) => s.id === seasonId);
  const phase = resolveSeasonPhase(selectedSeason?.name);
  const gwOptions = useMemo(() => gameweeksForSeasonPhase(phase), [phase]);

  const seasonDivisions = useMemo(
    () =>
      divisions
        .filter((d) => d.season_id === seasonId)
        .filter(
          (d) => (playerCountByDivision[d.id] ?? 0) === DIVISION_CAPACITY,
        )
        .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name, "pl")),
    [divisions, seasonId, playerCountByDivision],
  );

  const incompleteHidden = useMemo(() => {
    return divisions.filter(
      (d) =>
        d.season_id === seasonId &&
        (playerCountByDivision[d.id] ?? 0) > 0 &&
        (playerCountByDivision[d.id] ?? 0) < DIVISION_CAPACITY,
    ).length;
  }, [divisions, seasonId, playerCountByDivision]);

  const [gwFrom, setGwFrom] = useState(defaultGameweekForPhase(phase));
  const [gwTo, setGwTo] = useState(
    gwOptions[Math.min(4, gwOptions.length - 1)] ?? defaultGameweekForPhase(phase),
  );
  const [selectedDivs, setSelectedDivs] = useState<string[]>([]);
  const [scenario, setScenario] = useState<SimulatorScenarioId>("CHAOS");
  const [pending, setPending] = useState(false);
  const [log, setLog] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!gwOptions.includes(gwFrom)) setGwFrom(defaultGameweekForPhase(phase));
    if (!gwOptions.includes(gwTo)) {
      setGwTo(
        gwOptions[Math.min(4, gwOptions.length - 1)] ?? defaultGameweekForPhase(phase),
      );
    }
  }, [gwOptions, gwFrom, gwTo, phase]);

  // Tylko przy zmianie sezonu — nie resetuj zaznaczenia po każdym refreshu listy.
  useEffect(() => {
    setSelectedDivs(seasonDivisions.map((d) => d.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- celowo tylko seasonId
  }, [seasonId]);

  // Wyrzuć z zaznaczenia ID, które zniknęły z listy (np. stały się niepełne)
  useEffect(() => {
    const allowed = new Set(seasonDivisions.map((d) => d.id));
    setSelectedDivs((prev) => {
      const next = prev.filter((id) => allowed.has(id));
      if (next.length === prev.length && next.every((id, i) => id === prev[i])) {
        return prev;
      }
      return next;
    });
  }, [seasonDivisions]);

  const range = {
    seasonId,
    divisionIds: selectedDivs,
    gwFrom: Math.min(gwFrom, gwTo),
    gwTo: Math.max(gwFrom, gwTo),
  };

  const canAct = Boolean(seasonId && selectedDivs.length > 0);
  const playoffGwInRange =
    isPlayoffGameweek(range.gwFrom) ||
    isPlayoffGameweek(range.gwTo) ||
    (range.gwFrom <= 19 && range.gwTo >= 19) ||
    (range.gwFrom <= 38 && range.gwTo >= 38);
  const playoffGw =
    range.gwFrom === range.gwTo && isPlayoffGameweek(range.gwFrom)
      ? range.gwFrom
      : phase === "SPRING"
        ? 38
        : 19;

  async function run(
    label: string,
    fn: () => Promise<{ error: string | null; success?: string | null }>,
  ) {
    setPending(true);
    setLog(null);
    try {
      const r = await fn();
      if (r.error) {
        setLog({ type: "err", text: r.error });
        return;
      }
      setLog({ type: "ok", text: r.success ?? label });
    } catch (e) {
      setLog({
        type: "err",
        text: e instanceof Error ? e.message : label,
      });
    } finally {
      setPending(false);
    }
  }

  function toggleDiv(id: string) {
    setSelectedDivs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div className="space-y-5">
      {/* Panel A — Zakres */}
      <section className={panelClass}>
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#39FF14]/5 blur-3xl"
          aria-hidden
        />
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#39FF14]">
              Panel A · Zakres
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-white sm:text-xl">
              Scope
            </h2>
          </div>
          <p className="text-right text-[11px] text-slate-500">
            GW {range.gwFrom}–{range.gwTo}
            <span className="mx-1.5 text-slate-700">·</span>
            {selectedDivs.length}/{seasonDivisions.length} dywizji
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Sezon
            </span>
            <select
              className={selectClass}
              value={seasonId}
              disabled={pending || seasons.length === 0}
              onChange={(e) => setSeasonId(e.target.value)}
            >
              {seasons.length === 0 ? (
                <option value="">Brak sezonów</option>
              ) : (
                seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Od kolejki
            </span>
            <select
              className={selectClass}
              value={gwFrom}
              disabled={pending}
              onChange={(e) => setGwFrom(Number(e.target.value))}
            >
              {gwOptions.map((n) => (
                <option key={n} value={n}>
                  {gameweekLabel(n)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Do kolejki
            </span>
            <select
              className={selectClass}
              value={gwTo}
              disabled={pending}
              onChange={(e) => setGwTo(Number(e.target.value))}
            >
              {gwOptions.map((n) => (
                <option key={n} value={n}>
                  {gameweekLabel(n)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Dywizje
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={pending || seasonDivisions.length === 0}
                onClick={() => setSelectedDivs(seasonDivisions.map((d) => d.id))}
                className="rounded-lg border border-[#39FF14]/30 bg-[#39FF14]/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-[#39FF14] transition hover:bg-[#39FF14]/20 disabled:opacity-40"
              >
                Zaznacz Wszystkie
              </button>
              <button
                type="button"
                disabled={pending || selectedDivs.length === 0}
                onClick={() => setSelectedDivs([])}
                className="text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 disabled:opacity-40"
              >
                Odznacz
              </button>
            </div>
          </div>

          {seasonDivisions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-700/80 px-4 py-8 text-center text-sm text-slate-500">
              Brak pełnych dywizji (10/10) w tym sezonie
              {incompleteHidden > 0
                ? ` · ukryto ${incompleteHidden} niepełn(e/ych)`
                : ""}
              . Uzupełnij rekrutację albo wybierz inny sezon.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {seasonDivisions.map((d) => {
                const on = selectedDivs.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={pending}
                    onClick={() => toggleDiv(d.id)}
                    className={`group flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition ${
                      on
                        ? "border-[#39FF14]/45 bg-[#39FF14]/10 text-white"
                        : "border-slate-700/70 bg-[#070b14] text-slate-400 hover:border-slate-500 hover:text-slate-200"
                    } disabled:opacity-40`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] font-black ${
                        on
                          ? "border-[#39FF14] bg-[#39FF14] text-black"
                          : "border-slate-600 text-transparent"
                      }`}
                      aria-hidden
                    >
                      ✓
                    </span>
                    <span>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Dywizja {d.tier}
                      </span>
                      <span className="font-semibold">{d.name}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Panel B — Scenariusze */}
      <section className={panelClass}>
        <div
          className="pointer-events-none absolute -left-20 top-0 h-48 w-48 rounded-full bg-sky-500/5 blur-3xl"
          aria-hidden
        />
        <div className="mb-5">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-sky-400">
            Panel B · Scenariusze
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-white sm:text-xl">
            Wybierz tryb
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Jeden aktywny scenariusz — zero dodatkowych kliknięć przy generowaniu.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {SIMULATOR_SCENARIOS.map((s) => {
            const active = scenario === s.id;
            return (
              <button
                key={s.id}
                type="button"
                disabled={pending}
                onClick={() => setScenario(s.id)}
                className={`relative rounded-2xl border p-4 text-left transition ${
                  active
                    ? accentRing[s.accent]
                    : "border-slate-700/70 bg-[#070b14] hover:border-slate-500"
                } disabled:opacity-40`}
              >
                {active ? (
                  <span className="absolute right-3 top-3 rounded-md bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white/90">
                    Aktywny
                  </span>
                ) : null}
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none" aria-hidden>
                    {s.emoji}
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-white">{s.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      {s.description}
                    </p>
                    <span
                      className={`mt-3 inline-flex h-1.5 w-10 rounded-full ${accentDot[s.accent]}`}
                      aria-hidden
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Panel C — Centrum Dowodzenia */}
      <section className={panelClass}>
        <div
          className="pointer-events-none absolute bottom-0 right-0 h-40 w-56 rounded-full bg-[#39FF14]/5 blur-3xl"
          aria-hidden
        />
        <div className="mb-5">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-400">
            Panel C · Centrum Dowodzenia
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-white sm:text-xl">
            Akcje
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Generuj → przeglądaj brudnopis → publikuj. Undo czyści punkty w zakresie.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <button
            type="button"
            disabled={pending || !canAct}
            onClick={() =>
              void run("Wygenerowano", () =>
                generateSimulatedResults({ ...range, scenario }),
              )
            }
            className="group flex min-h-[5.5rem] flex-col items-start justify-center gap-2 rounded-2xl bg-[#39FF14] px-5 py-4 text-left text-black shadow-[0_0_40px_-12px_rgba(57,255,20,0.7)] transition hover:brightness-110 disabled:opacity-40"
          >
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em]">
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Settings2 className="h-4 w-4" />
              )}
              Generuj Symulację
            </span>
            <span className="text-sm font-bold opacity-80">(Brudnopis)</span>
          </button>

          <button
            type="button"
            disabled={pending || !canAct}
            onClick={() =>
              void run("Opublikowano", () => publishSimulatedRange(range))
            }
            className="flex min-h-[5.5rem] flex-col items-start justify-center gap-2 rounded-2xl border border-sky-400/40 bg-sky-500/10 px-5 py-4 text-left text-sky-100 transition hover:bg-sky-500/20 disabled:opacity-40"
          >
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em]">
              <Earth className="h-4 w-4" />
              Publikuj Wybrany Zakres
            </span>
            <span className="text-xs text-sky-200/70">is_published → true</span>
          </button>

          <button
            type="button"
            disabled={pending || !canAct}
            onClick={() => {
              if (
                !window.confirm(
                  `Wyczyścić wyniki GW ${range.gwFrom}–${range.gwTo} w ${selectedDivs.length} dywizjach?\nPrzywróci surowy terminarz (Undo).`,
                )
              ) {
                return;
              }
              void run("Wyczyszczono", () => clearSimulatedRange(range));
            }}
            className="flex min-h-[5.5rem] flex-col items-start justify-center gap-2 rounded-2xl border border-rose-500/50 bg-rose-950/40 px-5 py-4 text-left text-rose-200 transition hover:bg-rose-900/50 disabled:opacity-40"
          >
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em]">
              <Trash2 className="h-4 w-4" />
              Wyczyść Wyniki (Undo)
            </span>
            <span className="text-xs text-rose-300/70">Danger Zone · reset zakresu</span>
          </button>
        </div>

        {playoffGwInRange ? (
          <button
            type="button"
            disabled={pending || !seasonId}
            onClick={() =>
              void run("Baraże", () => ensurePlayoffFixtures(seasonId, playoffGw))
            }
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-5 py-3 text-xs font-black uppercase tracking-wider text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-40 sm:w-auto"
          >
            <Swords className="h-4 w-4" />
            Generuj Pary Barażowe Cross-Division (GW{playoffGw})
          </button>
        ) : null}

        {log ? (
          <p
            className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
              log.type === "ok"
                ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-200"
                : "border-rose-500/30 bg-rose-950/40 text-rose-200"
            }`}
          >
            {log.type === "ok" ? (
              <CheckCircle2 className="mr-2 inline h-4 w-4" />
            ) : null}
            {log.text}
          </p>
        ) : (
          <p className="mt-5 text-xs text-slate-600">
            Generuj zapisuje brudnopis (is_published=false). Publikuj odsłania Strefę Gracza.
          </p>
        )}
      </section>
    </div>
  );
}
