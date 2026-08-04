"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  ClipboardPaste,
  Eraser,
  Flame,
  Loader2,
  RefreshCw,
  Send,
  Trophy,
  Undo2,
  X,
} from "lucide-react";
import {
  generateGlobalPlayoffs,
} from "@/app/admin/actions/fixtures";
import {
  clearDivisionGameweekDraft,
  clearSeasonGameweekDraft,
  getSeasonGameweek,
  importGlobalGameweekResults,
  publishSeasonGameweek,
  saveDivisionGameweekDraft,
  saveSeasonGameweekDraft,
  unpublishSeasonGameweek,
  type SeasonWorkspacePayload,
  type WorkspaceFixtureRow,
} from "@/app/admin/actions/workspace";
import { PlayoffWorkspacePanel } from "@/components/admin/PlayoffTiebreakPanel";
import { computeMedianBonusSet, resolveH2h } from "@/lib/admin/medianEngine";
import { FPL_POINTS_MAX, FPL_POINTS_MIN } from "@/lib/admin/constants";
import type { Division, Season } from "@/lib/admin/types";
import {
  defaultGameweekForPhase,
  gameweekLabel,
  gameweeksForSeasonPhase,
  isPlayoffGameweek,
  resolveSeasonPhase,
} from "@/lib/public/season";

const selectClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-[#39FF14]";

function teamLabel(f: WorkspaceFixtureRow, side: "home" | "away") {
  const t = side === "home" ? f.home_team : f.away_team;
  if (!t) return "—";
  return t.fpl_team_name?.trim() || t.manager_name;
}

function discordLabel(f: WorkspaceFixtureRow, side: "home" | "away") {
  const t = side === "home" ? f.home_team : f.away_team;
  return t?.discord_nick ?? "—";
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  return fallback;
}

/** Mediana i H2H liczone osobno per dywizja. Baraże: tylko H2H, bez mediany. */
function liveRecalcByDivision(
  fixtures: WorkspaceFixtureRow[],
  scores: Record<string, number>,
): WorkspaceFixtureRow[] {
  const byDiv = new Map<string, WorkspaceFixtureRow[]>();
  for (const f of fixtures) {
    const list = byDiv.get(f.division_id) ?? [];
    list.push(f);
    byDiv.set(f.division_id, list);
  }

  const out: WorkspaceFixtureRow[] = [];
  for (const [, rows] of byDiv) {
    const pts = new Map<string, number>();
    const skipMedian = rows.every(
      (f) => f.is_playoff || isPlayoffGameweek(f.gameweek),
    );

    for (const f of rows) {
      if (f.is_playoff || isPlayoffGameweek(f.gameweek)) continue;
      const hp = scores[f.home_team_id];
      const ap = scores[f.away_team_id];
      if (Number.isFinite(hp)) pts.set(f.home_team_id, hp);
      if (Number.isFinite(ap)) pts.set(f.away_team_id, ap);
    }
    const winners = skipMedian ? new Set<string>() : computeMedianBonusSet(pts, 5);

    for (const f of rows) {
      const playoff = f.is_playoff || isPlayoffGameweek(f.gameweek);
      const homeFpl = scores[f.home_team_id];
      const awayFpl = scores[f.away_team_id];
      if (!Number.isFinite(homeFpl) || !Number.isFinite(awayFpl)) {
        out.push({
          ...f,
          home_fpl_points: Number.isFinite(homeFpl) ? homeFpl : f.home_fpl_points,
          away_fpl_points: Number.isFinite(awayFpl) ? awayFpl : f.away_fpl_points,
          home_median_bonus: playoff
            ? 0
            : winners.has(f.home_team_id)
              ? 1
              : f.home_median_bonus,
          away_median_bonus: playoff
            ? 0
            : winners.has(f.away_team_id)
              ? 1
              : f.away_median_bonus,
        });
        continue;
      }
      const h2h = resolveH2h(homeFpl, awayFpl);
      if (playoff) {
        if (homeFpl === awayFpl) {
          out.push({
            ...f,
            home_fpl_points: homeFpl,
            away_fpl_points: awayFpl,
            home_h2h_points: 0,
            away_h2h_points: 0,
            home_median_bonus: 0,
            away_median_bonus: 0,
            is_finished: false,
          });
        } else {
          out.push({
            ...f,
            home_fpl_points: homeFpl,
            away_fpl_points: awayFpl,
            home_h2h_points: h2h.home === 1 ? 0 : h2h.home,
            away_h2h_points: h2h.away === 1 ? 0 : h2h.away,
            home_median_bonus: 0,
            away_median_bonus: 0,
            is_finished: true,
            tiebreaker_method: "FPL_POINTS",
            tiebreaker_winner_id:
              homeFpl > awayFpl ? f.home_team_id : f.away_team_id,
          });
        }
        continue;
      }
      out.push({
        ...f,
        home_fpl_points: homeFpl,
        away_fpl_points: awayFpl,
        home_h2h_points: h2h.home,
        away_h2h_points: h2h.away,
        home_median_bonus: winners.has(f.home_team_id) ? 1 : 0,
        away_median_bonus: winners.has(f.away_team_id) ? 1 : 0,
        is_finished: true,
      });
    }
  }
  return out;
}

function ScoreCell({
  value,
  median,
  disabled,
  onChange,
}: {
  value: number | undefined;
  median: boolean;
  disabled?: boolean;
  onChange: (raw: string) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <input
        type="number"
        min={FPL_POINTS_MIN}
        max={FPL_POINTS_MAX}
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-16 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-center font-mono text-sm text-white outline-none focus:border-[#39FF14] disabled:opacity-50"
      />
      {median ? (
        <Flame className="h-4 w-4 text-orange-400" aria-label="Powyżej mediany (+1)" />
      ) : (
        <span className="inline-block w-4" />
      )}
    </div>
  );
}

function FixturesTable({
  rows,
  scores,
  busy,
  onSetPoint,
  emptySlot,
  divisionNameById,
}: {
  rows: WorkspaceFixtureRow[];
  scores: Record<string, number>;
  busy: boolean;
  onSetPoint: (teamId: string, value: string) => void;
  emptySlot?: ReactNode;
  divisionNameById: Map<string, string>;
}) {
  if (!rows.length) {
    return (
      emptySlot ?? (
        <p className="rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
          Brak meczów — wygeneruj terminarz Berger w Bazie Graczy.
        </p>
      )
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-950 text-[10px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-3 py-2.5">Gospodarz</th>
            <th className="px-3 py-2.5 text-center">Małe pkt</th>
            <th className="px-3 py-2.5 text-center">H2H</th>
            <th className="px-3 py-2.5 text-center">vs</th>
            <th className="px-3 py-2.5 text-center">H2H</th>
            <th className="px-3 py-2.5 text-center">Małe pkt</th>
            <th className="px-3 py-2.5">Gość</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80">
          {rows.map((f) => {
            const homeDivName =
              divisionNameById.get(f.home_team?.division_id ?? "") ??
              f.division_name;
            const awayDivName =
              divisionNameById.get(f.away_team?.division_id ?? "") ??
              f.division_name;
            const showDivBadge = f.is_playoff || isPlayoffGameweek(f.gameweek);
            return (
              <tr key={f.id} className="bg-slate-900/40 hover:bg-slate-900/80">
                <td className="px-3 py-3">
                  <p className="font-semibold text-white">{teamLabel(f, "home")}</p>
                  <p className="text-xs text-slate-500">{discordLabel(f, "home")}</p>
                  {showDivBadge ? (
                    <span className="mt-1 inline-block rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                      {homeDivName}
                    </span>
                  ) : null}
                </td>
                <td className="px-2 py-3">
                  <ScoreCell
                    value={scores[f.home_team_id]}
                    median={!showDivBadge && f.home_median_bonus === 1}
                    disabled={busy}
                    onChange={(v) => onSetPoint(f.home_team_id, v)}
                  />
                </td>
                <td className="px-2 py-3 text-center font-mono text-lg font-bold text-[#39FF14]">
                  {f.home_h2h_points}
                  {!showDivBadge && f.home_median_bonus ? (
                    <span className="ml-1 text-xs text-orange-400">
                      +{f.home_median_bonus}
                    </span>
                  ) : null}
                </td>
                <td className="px-2 py-3 text-center">
                  {showDivBadge ? (
                    <span className="rounded-md bg-amber-400/15 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-300">
                      Baraż
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-600">—</span>
                  )}
                </td>
                <td className="px-2 py-3 text-center font-mono text-lg font-bold text-[#39FF14]">
                  {f.away_h2h_points}
                  {!showDivBadge && f.away_median_bonus ? (
                    <span className="ml-1 text-xs text-orange-400">
                      +{f.away_median_bonus}
                    </span>
                  ) : null}
                </td>
                <td className="px-2 py-3">
                  <ScoreCell
                    value={scores[f.away_team_id]}
                    median={!showDivBadge && f.away_median_bonus === 1}
                    disabled={busy}
                    onChange={(v) => onSetPoint(f.away_team_id, v)}
                  />
                </td>
                <td className="px-3 py-3 text-right">
                  <p className="font-semibold text-white">{teamLabel(f, "away")}</p>
                  <p className="text-xs text-slate-500">{discordLabel(f, "away")}</p>
                  {showDivBadge ? (
                    <span className="mt-1 inline-block rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                      {awayDivName}
                    </span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function GameweekWorkspace({
  seasons,
  divisions,
}: {
  seasons: Season[];
  divisions: Division[];
}) {
  const defaultSeason = useMemo(() => {
    const sorted = [...seasons].sort((a, b) => {
      const aa = a.is_archived ? 1 : 0;
      const bb = b.is_archived ? 1 : 0;
      if (aa !== bb) return aa - bb;
      if (a.status === "PUBLISHED" && b.status !== "PUBLISHED") return -1;
      if (b.status === "PUBLISHED" && a.status !== "PUBLISHED") return 1;
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });
    return sorted[0]?.id ?? "";
  }, [seasons]);
  const [seasonId, setSeasonId] = useState(defaultSeason);
  const selectedSeason = seasons.find((s) => s.id === seasonId);
  const seasonPhase = resolveSeasonPhase(selectedSeason?.name);
  const gwOptions = useMemo(
    () => gameweeksForSeasonPhase(seasonPhase),
    [seasonPhase],
  );
  const seasonDivisions = useMemo(
    () =>
      divisions
        .filter((d) => d.season_id === seasonId)
        .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name, "pl")),
    [divisions, seasonId],
  );

  const [gw, setGw] = useState(defaultGameweekForPhase(seasonPhase));
  const [activeDivisionId, setActiveDivisionId] = useState(
    seasonDivisions[0]?.id ?? "",
  );
  const [bundle, setBundle] = useState<SeasonWorkspacePayload | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteRaw, setPasteRaw] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);

  useEffect(() => {
    if (!gwOptions.includes(gw)) {
      setGw(defaultGameweekForPhase(seasonPhase));
    }
  }, [gwOptions, gw, seasonPhase]);

  useEffect(() => {
    if (!seasonDivisions.some((d) => d.id === activeDivisionId)) {
      setActiveDivisionId(seasonDivisions[0]?.id ?? "");
    }
  }, [seasonDivisions, activeDivisionId]);

  const load = useCallback(
    async (gwOverride?: number) => {
      if (!seasonId) {
        setBundle(null);
        setScores({});
        return;
      }
      const targetGw = gwOverride ?? gw;
      setIsLoading(true);
      try {
        const data = await getSeasonGameweek(seasonId, targetGw);
        setBundle(data);
        const next: Record<string, number> = {};
        for (const f of data.fixtures) {
          if (f.home_fpl_points != null) next[f.home_team_id] = f.home_fpl_points;
          if (f.away_fpl_points != null) next[f.away_team_id] = f.away_fpl_points;
        }
        setScores(next);
        setActiveDivisionId((prev) =>
          data.divisions.some((d) => d.id === prev)
            ? prev
            : (data.divisions[0]?.id ?? ""),
        );
      } catch (e) {
        const text = errorMessage(e, "Błąd ładowania GW");
        setMessage({ type: "err", text });
        window.alert(text);
      } finally {
        setIsLoading(false);
      }
    },
    [seasonId, gw],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const displayRows = useMemo(() => {
    if (!bundle) return [];
    return liveRecalcByDivision(bundle.fixtures, scores);
  }, [bundle, scores]);

  const divisionTabs = useMemo(() => {
    if (bundle?.divisions.length) return bundle.divisions;
    return seasonDivisions.map((d) => ({
      id: d.id,
      name: d.name,
      tier: d.tier,
      fixtureCount: 0,
      finishedCount: 0,
      publishedCount: 0,
    }));
  }, [bundle, seasonDivisions]);

  const activeRows = useMemo(() => {
    if (!isPlayoffGameweek(gw)) {
      return displayRows.filter((f) => f.division_id === activeDivisionId);
    }
    // Cross-division: pokaż baraż jeśli drużyna z aktywnej dywizji gra
    return displayRows.filter((f) => {
      if (f.division_id === activeDivisionId) return true;
      return (
        f.home_team?.division_id === activeDivisionId ||
        f.away_team?.division_id === activeDivisionId
      );
    });
  }, [displayRows, activeDivisionId, gw]);

  const divisionNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of seasonDivisions) map.set(d.id, d.name);
    return map;
  }, [seasonDivisions]);

  function setPoint(teamId: string, value: string) {
    const n = Number.parseInt(value, 10);
    setScores((prev) => {
      const next = { ...prev };
      if (!Number.isFinite(n) || value === "") {
        delete next[teamId];
      } else {
        next[teamId] = Math.max(0, n);
      }
      return next;
    });
  }

  async function run(
    label: string,
    fn: () => Promise<{
      error: string | null;
      success?: string | null;
      unmatched?: string[];
      gameweek?: number;
    }>,
  ) {
    setMessage(null);
    setIsActionPending(true);
    try {
      const r = await fn();
      if (r.error) {
        setMessage({ type: "err", text: r.error });
        window.alert(
          r.unmatched?.length
            ? `${r.error}\n\n${r.unmatched.slice(0, 15).join("\n")}`
            : r.error,
        );
        return;
      }
      const targetGw = r.gameweek ?? gw;
      if (r.gameweek && r.gameweek !== gw) {
        setGw(r.gameweek);
      }
      const ok = r.success ?? label;
      setMessage({ type: "ok", text: ok });
      window.alert(
        r.unmatched?.length
          ? `${ok}\n\n${r.unmatched.slice(0, 15).join("\n")}`
          : ok,
      );
      await load(targetGw);
    } catch (e) {
      const text = errorMessage(e, `Błąd: ${label}`);
      setMessage({ type: "err", text });
      window.alert(text);
    } finally {
      setIsActionPending(false);
    }
  }

  const busy = isLoading || isActionPending;
  const isPlayoffGw = isPlayoffGameweek(gw);
  const seasonPlayoffCount =
    bundle?.fixtures.filter((f) => f.is_playoff).length ?? 0;
  const needsPlayoffGenerate =
    isPlayoffGw && Boolean(seasonId) && !isLoading && seasonPlayoffCount === 0;
  const statusLabel = bundle?.isFullyPublished
    ? "OPUBLIKOWANE"
    : bundle?.hasAnyPublished
      ? "CZĘŚCIOWO OPUBLIKOWANE"
      : "BRUDNOPIS (Nieopublikowane)";

  return (
    <div className="space-y-6 pb-32">
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/70 p-5 sm:p-6">
        <p className="mb-4 text-[10px] font-black uppercase tracking-[0.25em] text-[#39FF14]">
          Brudnopis kolejki · One-Box Import
        </p>

        <button
          type="button"
          disabled={busy || !seasonId}
          onClick={() => {
            setPasteRaw("");
            setPasteOpen(true);
          }}
          className="mb-5 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[#39FF14] px-6 py-4 text-base font-black uppercase tracking-wider text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          <ClipboardPaste className="h-5 w-5" />
          Wklej Wyniki GW (Wszystkie Dywizje)
        </button>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Sezon
            </span>
            <select
              className={selectClass}
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              disabled={busy || seasons.length === 0}
            >
              {seasons.length === 0 ? (
                <option value="">Brak sezonów</option>
              ) : (
                seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.status === "PUBLISHED" ? " · aktywny" : ""}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Kolejka (podgląd / fallback)
            </span>
            <select
              className={selectClass}
              value={gw}
              onChange={(e) => setGw(Number(e.target.value))}
              disabled={busy}
            >
              {gwOptions.map((n) => (
                <option key={n} value={n}>
                  {gameweekLabel(n)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void load()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-600 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-300 hover:border-[#39FF14]/40 hover:text-[#39FF14] disabled:opacity-40"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Odśwież
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !seasonId || !displayRows.length}
            onClick={() =>
              void run("Zapisano", () => saveSeasonGameweekDraft(seasonId, gw, scores))
            }
            className="inline-flex items-center gap-2 rounded-xl border border-[#39FF14]/40 bg-[#39FF14]/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#39FF14] disabled:opacity-40"
          >
            <CheckCircle2 className="h-4 w-4" />
            Zapisz brudnopis (wszystkie dywizje)
          </button>
          <button
            type="button"
            disabled={busy || !activeDivisionId}
            onClick={() => {
              const divScores: Record<string, number> = {};
              for (const f of activeRows) {
                if (scores[f.home_team_id] != null) {
                  divScores[f.home_team_id] = scores[f.home_team_id]!;
                }
                if (scores[f.away_team_id] != null) {
                  divScores[f.away_team_id] = scores[f.away_team_id]!;
                }
              }
              void run("Zapisano dywizję", () =>
                saveDivisionGameweekDraft(seasonId, activeDivisionId, gw, divScores),
              );
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-300 disabled:opacity-40"
          >
            Zapisz tylko aktywną dywizję
          </button>
          <button
            type="button"
            disabled={busy || !activeDivisionId}
            onClick={() => {
              if (
                !window.confirm(
                  `Wyczyścić punkty GW${gw} tylko w aktywnej dywizji?`,
                )
              ) {
                return;
              }
              void run("Wyczyszczono dywizję", () =>
                clearDivisionGameweekDraft(seasonId, activeDivisionId, gw),
              );
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-rose-300 disabled:opacity-40"
          >
            <Eraser className="h-4 w-4" />
            Wyczyść dywizję
          </button>
          <button
            type="button"
            disabled={busy || !seasonId}
            onClick={() => {
              if (
                !window.confirm(
                  `Wyczyścić punkty / H2H / medianę dla całej GW${gw} (wszystkie dywizje)?`,
                )
              ) {
                return;
              }
              void run("Wyczyszczono GW", () =>
                clearSeasonGameweekDraft(seasonId, gw),
              );
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-rose-300 disabled:opacity-40"
          >
            <Eraser className="h-4 w-4" />
            Wyczyść całą GW{gw}
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Format wklejki:{" "}
          <strong className="text-slate-400">GW | FPL Team | FPL Manager | Punkty</strong>{" "}
          (każdy wiersz osobno, wiele kolejek OK). Silnik: Mediana 2+1 (H2H 2/1/0 + bonus).
        </p>

        {message ? (
          <p
            className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
              message.type === "ok"
                ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-200"
                : "border-rose-500/30 bg-rose-950/40 text-rose-200"
            }`}
          >
            {message.text}
          </p>
        ) : null}
      </section>

      {isPlayoffGw ? (
        <PlayoffWorkspacePanel
          fixtures={bundle?.fixtures ?? []}
          scores={scores}
          busy={busy}
          divisionNameById={divisionNameById}
          onSetPoint={setPoint}
          onRefresh={() => void load()}
          generateButton={
            seasonId ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (
                    seasonPlayoffCount > 0 &&
                    !window.confirm(
                      `Usunąć wszystkie mecze GW19 i GW38 w sezonie, potem wygenerować baraże cross-division od nowa?`,
                    )
                  ) {
                    return;
                  }
                  void run("Baraże", () => generateGlobalPlayoffs(seasonId, gw));
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-amber-200 hover:bg-amber-500/20 disabled:opacity-40"
              >
                <Trophy className="h-4 w-4" />
                {seasonPlayoffCount > 0
                  ? "Przegeneruj baraże"
                  : "Generuj Mecze Barażowe"}
              </button>
            ) : null
          }
          emptySlot={
            needsPlayoffGenerate ? (
              <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-[#070b14]/80 px-6 py-12 text-center sm:px-10">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-400">
                  {gameweekLabel(gw)}
                </p>
                <h3 className="mt-3 text-2xl font-extrabold text-white">
                  Czas na Baraże!
                </h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
                  Wygeneruj jeden mecz na granicę dywizji (8. wyższej vs 3. niższej).
                  Przed zapisem usuwamy wszystkie stare mecze GW19 i GW38 w sezonie.
                </p>
                <button
                  type="button"
                  disabled={busy || !seasonId}
                  onClick={() =>
                    void run("Baraże", () => generateGlobalPlayoffs(seasonId, gw))
                  }
                  className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-6 py-3.5 text-sm font-black uppercase tracking-wider text-black disabled:opacity-40"
                >
                  {isActionPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Trophy className="h-5 w-5" />
                  )}
                  Generuj Mecze Barażowe (Między dywizjami)
                </button>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-700 px-4 py-10 text-center text-sm text-slate-500">
                Brak meczów barażowych.
              </p>
            )
          }
        />
      ) : (
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/70 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#39FF14]">
              Mecze · {gameweekLabel(gw)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              <Flame className="mr-1 inline h-3.5 w-3.5 text-orange-400" />
              = powyżej mediany w dywizji (+1) · edycja inline zawsze dostępna
            </p>
          </div>
        </div>

        {divisionTabs.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {divisionTabs.map((d) => {
              const active = d.id === activeDivisionId;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setActiveDivisionId(d.id)}
                  className={`rounded-xl px-3 py-2 text-left text-xs font-bold uppercase tracking-wide transition-colors ${
                    active
                      ? "bg-[#39FF14] text-black"
                      : "border border-slate-700 bg-slate-950 text-slate-300 hover:border-[#39FF14]/40"
                  }`}
                >
                  <span className="block">T{d.tier} · {d.name}</span>
                  <span
                    className={`mt-0.5 block text-[10px] font-semibold normal-case tracking-normal ${
                      active ? "text-black/70" : "text-slate-500"
                    }`}
                  >
                    {d.finishedCount}/{d.fixtureCount || "—"} meczów
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {!seasonId ? (
          <p className="rounded-xl border border-dashed border-slate-700 px-4 py-10 text-center text-sm text-slate-500">
            Wybierz sezon.
          </p>
        ) : isLoading && !bundle ? (
          <p className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Ładowanie…
          </p>
        ) : (
          <FixturesTable
            rows={activeRows}
            scores={scores}
            busy={busy}
            onSetPoint={setPoint}
            divisionNameById={divisionNameById}
          />
        )}
      </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-700/80 bg-[#0B0F19]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Status GW{gw}
            </p>
            <p
              className={`text-sm font-bold ${
                bundle?.isFullyPublished ? "text-emerald-300" : "text-amber-300"
              }`}
            >
              {statusLabel}
              {bundle
                ? ` · ${bundle.finishedCount}/${bundle.fixtures.length} meczów`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !seasonId || !displayRows.length}
              onClick={() =>
                void run("Opublikowano", () => publishSeasonGameweek(seasonId, gw))
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#39FF14] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-black disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              Publikuj Całą Kolejkę GW{gw} do Strefy Gracza
            </button>
            <button
              type="button"
              disabled={busy || !seasonId || !bundle?.hasAnyPublished}
              onClick={() =>
                void run("Cofnięto", () => unpublishSeasonGameweek(seasonId, gw))
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-300 disabled:opacity-40"
            >
              <Undo2 className="h-4 w-4" />
              Cofnij Publikację
            </button>
          </div>
        </div>
      </div>

      {pasteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Wklej Wyniki GW — wszystkie dywizje
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Wklej wyniki. Kolumny:{" "}
                  <code className="text-slate-300">GW | FPL Team | FPL Manager | Punkty</code>.
                  Możesz wkleić wiele kolejek naraz (GW1, GW2…). System sam mapuje graczy do
                  dywizji i przelicza H2H + medianę.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPasteOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Zamknij"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <textarea
              value={pasteRaw}
              onChange={(e) => setPasteRaw(e.target.value)}
              rows={16}
              className="min-h-[280px] w-full flex-1 rounded-xl border border-slate-700 bg-slate-900 p-3 font-mono text-xs text-white outline-none focus:border-[#39FF14]"
              placeholder={`GW1\tKapcie Kłapcia\tMateusz Stopczyński\t85\nGW1\tFootball Heritage\tChef Juan\t82\nGW2\tKapcie Kłapcia\tMateusz Stopczyński\t55`}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasteOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold uppercase text-slate-400"
              >
                Anuluj
              </button>
              <button
                type="button"
                disabled={busy || !pasteRaw.trim() || !seasonId}
                onClick={() => {
                  const payload = pasteRaw;
                  setPasteOpen(false);
                  void run("Import OK", () =>
                    importGlobalGameweekResults(payload, seasonId, gw),
                  );
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#39FF14] px-4 py-2 text-xs font-black uppercase text-black disabled:opacity-40"
              >
                <CheckCircle2 className="h-4 w-4" />
                Importuj i przelicz wszystkie dywizje
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
