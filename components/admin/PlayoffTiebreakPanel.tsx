"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Loader2, Swords, Trophy } from "lucide-react";
import {
  savePlayoffTiebreak,
  type WorkspaceFixtureRow,
} from "@/app/admin/actions/workspace";
import { FPL_POINTS_MAX, FPL_POINTS_MIN } from "@/lib/admin/constants";
import {
  bothDefined,
  cascadeVisibility,
  cupOutcomeLabel,
  cupOutcomesForWinner,
} from "@/lib/admin/playoffTiebreak";

function teamName(f: WorkspaceFixtureRow, side: "home" | "away") {
  const t = side === "home" ? f.home_team : f.away_team;
  if (!t) return "—";
  return t.fpl_team_name?.trim() || t.manager_name;
}

function NumInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white outline-none focus:border-[#39FF14] disabled:opacity-50"
      />
    </label>
  );
}

function parseOpt(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function isFplDraw(home: number | null | undefined, away: number | null | undefined) {
  return home != null && away != null && home === away;
}

function PlayoffMatchCard({
  fixture,
  homeScore,
  awayScore,
  busy,
  divisionNameById,
  onSetPoint,
  onSaved,
}: {
  fixture: WorkspaceFixtureRow;
  homeScore: number | undefined;
  awayScore: number | undefined;
  busy: boolean;
  divisionNameById: Map<string, string>;
  onSetPoint: (teamId: string, value: string) => void;
  onSaved: () => void;
}) {
  const homeFpl = homeScore ?? fixture.home_fpl_points;
  const awayFpl = awayScore ?? fixture.away_fpl_points;
  const isDraw = isFplDraw(homeFpl, awayFpl);
  const needsTb =
    isDraw && !fixture.tiebreaker_winner_id && !fixture.is_finished;

  const homeDiv =
    divisionNameById.get(fixture.home_team?.division_id ?? "") ??
    fixture.division_name;
  const awayDiv =
    divisionNameById.get(fixture.away_team?.division_id ?? "") ??
    fixture.division_name;

  const [homeGoals, setHomeGoals] = useState(
    fixture.tiebreaker_home_goals?.toString() ?? "",
  );
  const [awayGoals, setAwayGoals] = useState(
    fixture.tiebreaker_away_goals?.toString() ?? "",
  );
  const [homeConc, setHomeConc] = useState(
    fixture.tiebreaker_home_goals_conceded?.toString() ?? "",
  );
  const [awayConc, setAwayConc] = useState(
    fixture.tiebreaker_away_goals_conceded?.toString() ?? "",
  );
  const [homeBench, setHomeBench] = useState(
    fixture.tiebreaker_home_bench?.toString() ?? "",
  );
  const [awayBench, setAwayBench] = useState(
    fixture.tiebreaker_away_bench?.toString() ?? "",
  );
  const [winnerId, setWinnerId] = useState(fixture.tiebreaker_winner_id ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHomeGoals(fixture.tiebreaker_home_goals?.toString() ?? "");
    setAwayGoals(fixture.tiebreaker_away_goals?.toString() ?? "");
    setHomeConc(fixture.tiebreaker_home_goals_conceded?.toString() ?? "");
    setAwayConc(fixture.tiebreaker_away_goals_conceded?.toString() ?? "");
    setHomeBench(fixture.tiebreaker_home_bench?.toString() ?? "");
    setAwayBench(fixture.tiebreaker_away_bench?.toString() ?? "");
    setWinnerId(fixture.tiebreaker_winner_id ?? "");
  }, [fixture]);

  const gH = parseOpt(homeGoals);
  const gA = parseOpt(awayGoals);
  const cH = parseOpt(homeConc);
  const cA = parseOpt(awayConc);
  const bH = parseOpt(homeBench);
  const bA = parseOpt(awayBench);

  const visibility = useMemo(
    () =>
      cascadeVisibility({
        homeFpl,
        awayFpl,
        homeGoals: gH,
        awayGoals: gA,
        homeGoalsConceded: cH,
        awayGoalsConceded: cA,
        homeBench: bH,
        awayBench: bA,
      }),
    [homeFpl, awayFpl, gH, gA, cH, cA, bH, bA],
  );

  // Czyść niższe TB gdy wyższy rozstrzyga / nie jest remisem
  useEffect(() => {
    if (!visibility.showConceded && (homeConc || awayConc)) {
      setHomeConc("");
      setAwayConc("");
    }
  }, [visibility.showConceded, homeConc, awayConc]);

  useEffect(() => {
    if (!visibility.showBench && (homeBench || awayBench)) {
      setHomeBench("");
      setAwayBench("");
    }
  }, [visibility.showBench, homeBench, awayBench]);

  useEffect(() => {
    if (!visibility.showCoin && winnerId) {
      setWinnerId("");
    }
  }, [visibility.showCoin, winnerId]);

  const winnerFromMarker =
    fixture.is_finished && fixture.tiebreaker_winner_id
      ? fixture.tiebreaker_winner_id
      : fixture.is_finished && fixture.home_h2h_points === 2
        ? fixture.home_team_id
        : fixture.is_finished && fixture.away_h2h_points === 2
          ? fixture.away_team_id
          : null;

  const outcomes =
    winnerFromMarker != null
      ? cupOutcomesForWinner(winnerFromMarker, fixture.home_team_id)
      : null;

  async function save() {
    setSaving(true);
    try {
      const r = await savePlayoffTiebreak({
        fixtureId: fixture.id,
        homeGoals: visibility.showGoals ? parseOpt(homeGoals) : null,
        awayGoals: visibility.showGoals ? parseOpt(awayGoals) : null,
        homeGoalsConceded: visibility.showConceded ? parseOpt(homeConc) : null,
        awayGoalsConceded: visibility.showConceded ? parseOpt(awayConc) : null,
        homeBench: visibility.showBench ? parseOpt(homeBench) : null,
        awayBench: visibility.showBench ? parseOpt(awayBench) : null,
        manualWinnerId: visibility.showCoin ? winnerId || null : null,
      });
      if (r.error) {
        window.alert(r.error);
        return;
      }
      window.alert(r.success ?? "Zapisano.");
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <article
      className={`rounded-2xl border p-5 ${
        needsTb
          ? "border-amber-500/50 bg-amber-950/20"
          : "border-slate-700/50 bg-slate-950/60"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
            Baraż · Cross-Division
          </p>
          <p className="mt-2 text-lg font-extrabold text-white">
            {teamName(fixture, "home")}{" "}
            <span className="text-slate-500">vs</span>{" "}
            {teamName(fixture, "away")}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">{homeDiv}</span>
            {" · "}
            <span className="font-semibold text-slate-300">{awayDiv}</span>
          </p>
        </div>
        {needsTb ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 px-2 py-1 text-xs font-bold text-amber-200">
            <AlertTriangle className="h-3.5 w-3.5" />
            Remis — rozstrzygnij TB
          </span>
        ) : fixture.is_finished ? (
          <span className="rounded-lg bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-300">
            Rozliczony
            {fixture.tiebreaker_method ? ` · ${fixture.tiebreaker_method}` : ""}
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <input
            type="number"
            min={FPL_POINTS_MIN}
            max={FPL_POINTS_MAX}
            disabled={busy || saving}
            value={homeScore ?? ""}
            onChange={(e) => onSetPoint(fixture.home_team_id, e.target.value)}
            className="w-full max-w-[5.5rem] rounded-xl border border-slate-700 bg-[#070b14] px-3 py-2.5 text-center font-mono text-lg font-bold text-white outline-none focus:border-[#39FF14] disabled:opacity-50"
            placeholder="—"
          />
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
            FPL (home)
          </p>
          {outcomes ? (
            <p
              className={`mt-2 text-[11px] font-black uppercase tracking-wide ${
                outcomes.homeOutcome === "UTRZYMANIE" ||
                outcomes.homeOutcome === "AWANS"
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {cupOutcomeLabel(outcomes.homeOutcome)}
            </p>
          ) : null}
        </div>
        <div className="text-center">
          {homeFpl != null && awayFpl != null ? (
            <p className="font-mono text-2xl font-black text-white">
              {homeFpl}
              <span className="mx-2 text-slate-600">:</span>
              {awayFpl}
            </p>
          ) : (
            <p className="font-mono text-2xl font-black text-slate-600">vs</p>
          )}
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500/80">
            Wynik FPL
          </p>
        </div>
        <div className="text-right">
          <input
            type="number"
            min={FPL_POINTS_MIN}
            max={FPL_POINTS_MAX}
            disabled={busy || saving}
            value={awayScore ?? ""}
            onChange={(e) => onSetPoint(fixture.away_team_id, e.target.value)}
            className="ml-auto w-full max-w-[5.5rem] rounded-xl border border-slate-700 bg-[#070b14] px-3 py-2.5 text-center font-mono text-lg font-bold text-white outline-none focus:border-[#39FF14] disabled:opacity-50"
            placeholder="—"
          />
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
            FPL (away)
          </p>
          {outcomes ? (
            <p
              className={`mt-2 text-[11px] font-black uppercase tracking-wide ${
                outcomes.awayOutcome === "UTRZYMANIE" ||
                outcomes.awayOutcome === "AWANS"
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {cupOutcomeLabel(outcomes.awayOutcome)}
            </p>
          ) : null}
        </div>
      </div>

      {isDraw ? (
        <div className="mt-5 border-t border-amber-500/20 pt-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-300/90">
            Tie-breaker kaskadowy (pokazuj kolejny tylko przy remisie)
          </p>

          {visibility.showGoals ? (
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <NumInput
                label="TB1 · Gole XI (home)"
                value={homeGoals}
                onChange={setHomeGoals}
                disabled={busy || saving}
              />
              <NumInput
                label="TB1 · Gole XI (away)"
                value={awayGoals}
                onChange={setAwayGoals}
                disabled={busy || saving}
              />
              {bothDefined(gH, gA) && gH !== gA ? (
                <p className="sm:col-span-2 text-xs text-emerald-400">
                  TB1 rozstrzyga — kolejne pola zbędne.
                </p>
              ) : null}
            </div>
          ) : null}

          {visibility.showConceded ? (
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <NumInput
                label="TB2 · Stracone GK+DEF (home)"
                value={homeConc}
                onChange={setHomeConc}
                disabled={busy || saving}
              />
              <NumInput
                label="TB2 · Stracone GK+DEF (away)"
                value={awayConc}
                onChange={setAwayConc}
                disabled={busy || saving}
              />
              {bothDefined(cH, cA) && cH !== cA ? (
                <p className="sm:col-span-2 text-xs text-emerald-400">
                  TB2 rozstrzyga (mniej = lepiej) — kolejne pola zbędne.
                </p>
              ) : null}
            </div>
          ) : null}

          {visibility.showBench ? (
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <NumInput
                label="TB3 · Ławka pkt (home)"
                value={homeBench}
                onChange={setHomeBench}
                disabled={busy || saving}
              />
              <NumInput
                label="TB3 · Ławka pkt (away)"
                value={awayBench}
                onChange={setAwayBench}
                disabled={busy || saving}
              />
              {bothDefined(bH, bA) && bH !== bA ? (
                <p className="sm:col-span-2 text-xs text-emerald-400">
                  TB3 rozstrzyga — moneta zbędna.
                </p>
              ) : null}
            </div>
          ) : null}

          {visibility.showCoin ? (
            <label className="mb-3 block max-w-md">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-amber-400">
                🪙 TB4 · Rzut monetą — wybierz zwycięzcę
              </span>
              <select
                value={winnerId}
                disabled={busy || saving}
                onChange={(e) => setWinnerId(e.target.value)}
                className="w-full rounded-lg border border-amber-500/40 bg-slate-950 px-2 py-2 text-sm text-white outline-none focus:border-[#39FF14]"
              >
                <option value="">— wybierz —</option>
                <option value={fixture.home_team_id}>
                  Gospodarz · {teamName(fixture, "home")} (utrzymanie)
                </option>
                <option value={fixture.away_team_id}>
                  Gość · {teamName(fixture, "away")} (awans)
                </option>
              </select>
            </label>
          ) : null}

          <button
            type="button"
            disabled={busy || saving}
            onClick={() => void save()}
            className="mt-2 inline-flex items-center gap-2 rounded-xl border border-[#39FF14]/40 bg-[#39FF14]/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-[#39FF14] disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Swords className="h-3.5 w-3.5" />
            )}
            Zapisz tie-break
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function PlayoffWorkspacePanel({
  fixtures,
  scores,
  busy,
  divisionNameById,
  onSetPoint,
  onRefresh,
  emptySlot,
  generateButton,
}: {
  fixtures: WorkspaceFixtureRow[];
  scores: Record<string, number>;
  busy: boolean;
  divisionNameById: Map<string, string>;
  onSetPoint: (teamId: string, value: string) => void;
  onRefresh: () => void;
  emptySlot?: ReactNode;
  generateButton?: ReactNode;
}) {
  const playoffRows = fixtures.filter((f) => f.is_playoff);

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-slate-900/80 to-[#0B0F19] p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Trophy className="mt-0.5 h-6 w-6 shrink-0 text-amber-400" />
          <div>
            <h2 className="text-xl font-extrabold text-white sm:text-2xl">
              Baraże (Cross-Division)
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Mecz pucharowy · bez punktów ligowych H2H · 8. wyższej vs 3. niższej
            </p>
          </div>
        </div>
        {generateButton}
      </div>

      {busy && playoffRows.length === 0 ? (
        <p className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Ładowanie…
        </p>
      ) : playoffRows.length === 0 ? (
        (emptySlot ?? (
          <p className="rounded-xl border border-dashed border-amber-500/30 px-4 py-10 text-center text-sm text-amber-100/70">
            Brak meczów barażowych.
          </p>
        ))
      ) : (
        <div className="mx-auto max-w-2xl space-y-4">
          {playoffRows.map((f) => (
            <PlayoffMatchCard
              key={f.id}
              fixture={f}
              homeScore={scores[f.home_team_id]}
              awayScore={scores[f.away_team_id]}
              busy={busy}
              divisionNameById={divisionNameById}
              onSetPoint={onSetPoint}
              onSaved={onRefresh}
            />
          ))}
        </div>
      )}
    </section>
  );
}
