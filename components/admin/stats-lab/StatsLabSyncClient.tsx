"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  Activity,
  Database,
  ImageIcon,
  Loader2,
  RefreshCw,
  RotateCcw,
  Users,
} from "lucide-react";
import {
  getStatsLabMediaArchiveStatsAction,
  getStatsLabOverview,
  runBootstrapSyncAction,
  runHistoryBatchSyncAction,
  syncStatsLabMediaBatchAction,
  type StatsLabMediaArchiveStats,
} from "@/app/admin/actions/statsLabSync";
import {
  DEFAULT_STATS_LAB_SEASON,
  type StatsLabOverview,
} from "@/lib/stats-lab/syncEngine";
import { getFplPositionLabelEn } from "@/lib/stats-lab/types";

type Props = {
  initialOverview: StatsLabOverview;
  seasonCode?: string;
};

function formatCost(nowCost: number): string {
  return `£${(nowCost / 10).toFixed(1)}m`;
}

function formatXgi(value: number): string {
  return Number(value).toFixed(2);
}

export function StatsLabSyncClient({
  initialOverview,
  seasonCode = DEFAULT_STATS_LAB_SEASON,
}: Props) {
  const [overview, setOverview] = useState(initialOverview);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState(0);
  const [log, setLog] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pending, startTransition] = useTransition();
  const [mediaPending, startMediaTransition] = useTransition();
  const [mediaStats, setMediaStats] = useState<StatsLabMediaArchiveStats | null>(
    null,
  );
  const [mediaLabel, setMediaLabel] = useState<string | null>(null);
  const [mediaPct, setMediaPct] = useState(0);
  const [mediaLog, setMediaLog] = useState<string | null>(null);

  const refreshOverview = useCallback(async () => {
    const next = await getStatsLabOverview(seasonCode);
    setOverview(next);
    return next;
  }, [seasonCode]);

  const refreshMediaStats = useCallback(async () => {
    const next = await getStatsLabMediaArchiveStatsAction(seasonCode);
    setMediaStats(next);
    return next;
  }, [seasonCode]);

  useEffect(() => {
    void refreshMediaStats().catch(() => undefined);
  }, [refreshMediaStats]);

  const runMediaLoop = useCallback(
    async (forceRefresh: boolean) => {
      setMediaLog(null);
      setMediaPct(0);
      setMediaLabel(
        forceRefresh
          ? "Force refresh: herby + wszystkie portrety…"
          : "Pobieranie brakujących herbów i portretów…",
      );

      let offset = 0;
      let guard = 0;
      let done = false;

      while (!done && guard < 120) {
        guard += 1;
        // Bez force: zawsze offset 0 — workLista to tylko brakujące pliki (kurczy się).
        // Z force: stała lista wszystkich kodów — offset przesuwa się o batchSize.
        const batch = await syncStatsLabMediaBatchAction(
          seasonCode,
          forceRefresh ? offset : 0,
          15,
          forceRefresh,
        );
        setMediaLog(batch.message);
        const total = Math.max(1, batch.totalTargetPhotos);
        const donePhotos = Math.max(0, total - batch.remaining);
        setMediaPct(Math.min(100, Math.round((donePhotos / total) * 100)));
        setMediaLabel(
          batch.isComplete
            ? `Gotowe — ${batch.cachedBadges} herbów, ${batch.cachedPhotos} portretów.`
            : `Archiwizacja: ${donePhotos} / ${total} portretów…`,
        );
        setMediaStats({
          cachedBadges: batch.cachedBadges,
          cachedPhotos: batch.cachedPhotos,
          totalTargetPhotos: batch.totalTargetPhotos,
          totalClubs: mediaStats?.totalClubs ?? 20,
        });

        if (!batch.ok && batch.remaining === 0 && !batch.isComplete) {
          setMediaLog(batch.message);
          break;
        }

        done = batch.isComplete;
        if (!done) {
          if (forceRefresh) offset += 15;
          await new Promise((r) => setTimeout(r, 120));
        }
      }

      setMediaPct(100);
      await refreshMediaStats();
    },
    [mediaStats?.totalClubs, refreshMediaStats, seasonCode],
  );

  const runIncrementalLoop = useCallback(
    async (forceFullResync: boolean) => {
      setIsError(false);
      setLog(null);
      setProgressPct(0);
      setProgressLabel("Bootstrap-static: kluby + zawodnicy…");

      const boot = await runBootstrapSyncAction(seasonCode);
      if (!boot.ok) {
        setIsError(true);
        setLog(boot.message);
        setProgressLabel(null);
        await refreshOverview();
        return;
      }

      setLog(boot.message);
      let done = false;
      let firstBatch = true;
      let guard = 0;

      while (!done && guard < 80) {
        guard += 1;
        const batch = await runHistoryBatchSyncAction(
          seasonCode,
          20,
          forceFullResync && firstBatch,
        );
        firstBatch = false;

        if (batch.rateLimited) {
          setIsError(true);
          setLog(batch.message);
          setProgressLabel(
            "Rate-limit FPL API — odczekaj ok. 1 minutę i wznów sync.",
          );
          await refreshOverview();
          return;
        }

        if (!batch.ok && batch.processedInBatch === 0 && !batch.isComplete) {
          setIsError(true);
          setLog(batch.message);
          setProgressLabel(null);
          await refreshOverview();
          return;
        }

        const total = Math.max(1, batch.totalActivePlayers);
        const synced = Math.max(0, total - batch.remainingPlayers);
        const pct = Math.min(100, Math.round((synced / total) * 100));
        setProgressPct(pct);
        setProgressLabel(
          batch.isComplete
            ? `Gotowe — historia GW${batch.currentGw} kompletna.`
            : `Pobieranie historii meczowej: ${synced} / ${total} aktywnych zawodników…`,
        );
        setLog(
          [
            boot.message,
            batch.message,
            batch.errors.length
              ? `Ostrzeżenia: ${batch.errors.slice(0, 3).join(" · ")}`
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        done = batch.isComplete;
        if (!done) {
          await new Promise((r) => setTimeout(r, 80));
        }
      }

      setProgressPct(100);
      await refreshOverview();
    },
    [refreshOverview, seasonCode],
  );

  const onIncremental = () => {
    startTransition(async () => {
      await runIncrementalLoop(false);
    });
  };

  const onForceFull = () => {
    if (
      !window.confirm(
        "Wymusić pełną resynchronizację sezonu?\n\nUstawi last_synced_gw = 0 dla wszystkich zawodników i pobierze historię od zera. To zajmie dłużej i obciąży FPL API.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      await runIncrementalLoop(true);
    });
  };

  const statusLabel = useMemo(() => {
    const s = overview.meta?.sync_status ?? "IDLE";
    if (pending) return "RUNNING";
    return s;
  }, [overview.meta?.sync_status, pending]);

  const kpi = [
    {
      label: "Sezon",
      value: overview.seasonCode,
      icon: Database,
    },
    {
      label: "Ostatnia GW",
      value: overview.targetGw > 0 ? `GW${overview.targetGw}` : "—",
      icon: Activity,
    },
    {
      label: "Piłkarze",
      value: `${overview.playersCount} (${overview.activePlayersCount} z min.)`,
      icon: Users,
    },
    {
      label: "Występy GW",
      value: String(overview.historyRowsCount),
      icon: RefreshCw,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpi.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
            >
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <Icon className="h-3.5 w-3.5 text-[#39FF14]" />
                {card.label}
              </p>
              <p className="mt-2 text-xl font-extrabold text-white">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Status synchronizacji
            </p>
            <p className="mt-1 text-sm font-bold text-emerald-300">{statusLabel}</p>
            {overview.meta?.last_error ? (
              <p className="mt-1 text-xs text-rose-400">{overview.meta.last_error}</p>
            ) : null}
            <p className="mt-2 text-xs text-slate-500">
              Do dociągnięcia historii:{" "}
              <span className="font-semibold text-slate-300">
                {overview.playersNeedingHistory}
              </span>{" "}
              aktywnych zawodników
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={onIncremental}
              className="inline-flex items-center gap-2 rounded-xl bg-[#39FF14] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-black disabled:opacity-40"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Aktualizuj dane z FPL API (Incremental Sync)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={onForceFull}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-amber-200 disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Wymuś pełną resynchronizację sezonu
            </button>
          </div>
        </div>

        {progressLabel ? (
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{progressLabel}</span>
              <span className="tabular-nums text-slate-300">{progressPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-950">
              <div
                className="h-full rounded-full bg-[#39FF14] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        ) : null}

        {log ? (
          <pre
            className={`mt-4 whitespace-pre-wrap rounded-xl border px-4 py-3 text-xs ${
              isError
                ? "border-rose-500/30 bg-rose-950/40 text-rose-200"
                : "border-emerald-500/25 bg-emerald-950/20 text-emerald-200"
            }`}
          >
            {log}
          </pre>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Incremental: bootstrap aktualizuje snapshot; historia idzie tylko dla
            graczy z minutami &gt; 0 i <code>last_synced_gw &lt; target GW</code>.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <ImageIcon className="h-3.5 w-3.5 text-[#39FF14]" />
              Archiwum Zdjęć Piłkarzy i Herbów Klubów
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Lokalnie na dysku:{" "}
              <span className="font-bold text-white">
                {mediaStats?.cachedBadges ?? "…"}
              </span>{" "}
              / {mediaStats?.totalClubs ?? 20} herbów ·{" "}
              <span className="font-bold text-white">
                {mediaStats?.cachedPhotos ?? "…"}
              </span>{" "}
              / {mediaStats?.totalTargetPhotos ?? "…"} portretów (minuty &gt; 0)
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Ścieżki: <code>public/uploads/fpl-lab/badges/</code> ·{" "}
              <code>public/uploads/fpl-lab/players/</code> — serwowane przez{" "}
              <code>/api/uploads/fpl-lab/…</code> (CORS-safe dla PNG).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={mediaPending || pending}
              onClick={() =>
                startMediaTransition(async () => {
                  await runMediaLoop(false);
                })
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#39FF14] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-black disabled:opacity-40"
            >
              {mediaPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5" />
              )}
              Pobierz brakujące zdjęcia i herby
            </button>
            <button
              type="button"
              disabled={mediaPending || pending}
              onClick={() => {
                if (
                  !window.confirm(
                    "Wymusić ponowne pobranie wszystkich herbów i portretów z CDN Premier League?",
                  )
                ) {
                  return;
                }
                startMediaTransition(async () => {
                  await runMediaLoop(true);
                });
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-sky-200 disabled:opacity-40"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Aktualizuj wszystkie zdjęcia (Force Refresh)
            </button>
          </div>
        </div>

        {mediaLabel ? (
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{mediaLabel}</span>
              <span className="tabular-nums text-slate-300">{mediaPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-950">
              <div
                className="h-full rounded-full bg-sky-400 transition-all duration-300"
                style={{ width: `${mediaPct}%` }}
              />
            </div>
          </div>
        ) : null}

        {mediaLog ? (
          <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-xs text-slate-300">
            {mediaLog}
          </pre>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 px-5 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Top 10 w bazie · punkty FPL
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">Zawodnik</th>
                <th className="px-4 py-2.5">Poz.</th>
                <th className="px-4 py-2.5">Klub</th>
                <th className="px-4 py-2.5">Cena</th>
                <th className="px-4 py-2.5">Pkt</th>
                <th className="px-4 py-2.5">xGI</th>
                <th className="px-4 py-2.5">Sync GW</th>
              </tr>
            </thead>
            <tbody>
              {overview.topPlayers.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    Brak danych — uruchom Incremental Sync.
                  </td>
                </tr>
              ) : (
                overview.topPlayers.map((p, idx) => (
                  <tr
                    key={p.fpl_element_id}
                    className="border-t border-slate-800/80 text-slate-200"
                  >
                    <td className="px-4 py-2.5 tabular-nums text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-white">
                      {p.web_name}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">
                      {getFplPositionLabelEn(p.element_type)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-[#39FF14]">
                      {p.club_short ?? `T${p.fpl_team_id}`}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-300">
                      {formatCost(p.now_cost)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums font-bold text-white">
                      {p.total_points}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-300">
                      {formatXgi(p.expected_goal_involvements)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-400">
                      {p.last_synced_gw > 0 ? `GW${p.last_synced_gw}` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
