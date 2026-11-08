"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ClipboardCopy,
  Download,
  Loader2,
  Search,
  Star,
  Table2,
} from "lucide-react";
import { queryStatsCentreAction } from "@/app/admin/actions/statsLabCentre";
import type { StatsLabBootstrapData } from "@/lib/stats-lab/analyticsEngine";
import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import type { FplPositionType } from "@/lib/stats-lab/types";
import {
  colourPillClass,
  createDefaultStatsCentreFilter,
  formatCentreCell,
  type StatsCentreFilter,
  type StatsCentreMode,
  type StatsCentrePlayerTab,
  type StatsCentreRangeMode,
  type StatsCentreResult,
  type StatsCentreTeamTab,
} from "@/lib/stats-lab/statsCentreEngine";
import {
  CENTRE_MODE_LABELS,
  CENTRE_RANGE_LABELS,
  PLAYER_TAB_LABELS,
  TEAM_TAB_LABELS,
  centreColLabel,
  centreColShort,
  centreUi,
} from "@/lib/stats-lab/statsCentreI18n";
import {
  captureStatsLabPngBlob,
  captureStatsLabPngDataUrl,
  copyPngBlobToClipboard,
  downloadDataUrl,
} from "@/lib/stats-lab/exportCapture";
import { ARENA_PORTAL_ALT, ARENA_PORTAL_LOGO } from "@/lib/arena";
import {
  STATS_LAB_CHART_THEMES,
  type StatsLabChartThemeId,
} from "@/components/admin/stats-lab/chartTheme";
import { getThemeTokens } from "@/lib/stats-lab/themeTokens";

const WATCHLIST_KEY = "fpl-arena-stats-centre-watchlist";
const PAGE_SIZE_OPTS = [25, 50, 100] as const;

const PLAYER_TABS: StatsCentrePlayerTab[] = [
  "OVERVIEW",
  "GOAL_THREAT",
  "CREATIVITY",
  "DEFENDING",
  "SET_PIECES",
  "DISCIPLINE",
  "EXPECTED",
  "VALUE_MARKET",
];

const TEAM_TABS: StatsCentreTeamTab[] = [
  "TEAM_OVERVIEW",
  "TEAM_ATTACKING",
  "TEAM_DEFENDING",
  "TEAM_EXPECTED",
];

const RANGE_MODES: StatsCentreRangeMode[] = [
  "ALL_MATCHES",
  "GW_RANGE",
  "ALL_HOME",
  "ALL_AWAY",
  "LAST_6_GW",
  "LAST_4_GW",
  "LAST_6_MATCHES",
  "LAST_4_MATCHES",
];

type Props = {
  bootstrap: StatsLabBootstrapData;
  lang: StatsLabLang;
  onLangChange: (lang: StatsLabLang) => void;
  themeId?: StatsLabChartThemeId;
  onThemeChange?: (theme: StatsLabChartThemeId) => void;
};

function loadWatchlist(): number[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  } catch {
    return [];
  }
}

function saveWatchlist(ids: number[]) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(ids));
}

export function StatsCentreView({
  bootstrap,
  lang,
  onLangChange,
  themeId = "ARENA_DARK",
  onThemeChange,
}: Props) {
  const ui = centreUi(lang);
  const tokens = getThemeTokens(themeId);
  const theme = STATS_LAB_CHART_THEMES[themeId];
  const exportRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<StatsCentreFilter>(() =>
    createDefaultStatsCentreFilter(bootstrap.seasonCode),
  );
  const [draftRange, setDraftRange] = useState<StatsCentreRangeMode>(
    filter.rangeMode,
  );
  const [draftGwFrom, setDraftGwFrom] = useState(1);
  const [draftGwTo, setDraftGwTo] = useState(Math.max(1, bootstrap.maxGw || 1));
  const [result, setResult] = useState<StatsCentreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [watchlist, setWatchlist] = useState<number[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTS)[number]>(25);
  const [flash, setFlash] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);

  useEffect(() => {
    setWatchlist(loadWatchlist());
  }, []);

  const runQuery = useCallback(
    (next: StatsCentreFilter) => {
      startTransition(async () => {
        try {
          setError(null);
          const data = await queryStatsCentreAction(next);
          setResult(data);
          setPage(1);
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Błąd zapytania Stats Centre.",
          );
        }
      });
    },
    [],
  );

  useEffect(() => {
    if (bootstrap.players.length === 0) return;
    const tmr = window.setTimeout(() => runQuery(filter), 200);
    return () => window.clearTimeout(tmr);
  }, [bootstrap.players.length, filter, runQuery]);

  function patchFilter(patch: Partial<StatsCentreFilter>) {
    setFilter((prev) => ({ ...prev, ...patch }));
  }

  function applyRange() {
    patchFilter({
      rangeMode: draftRange,
      gwFrom: draftRange === "GW_RANGE" ? draftGwFrom : null,
      gwTo: draftRange === "GW_RANGE" ? draftGwTo : null,
    });
  }

  function toggleWatch(id: number) {
    setWatchlist((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      saveWatchlist(next);
      return next;
    });
  }

  function onSort(key: string) {
    setFilter((prev) => {
      if (prev.sortKey === key) {
        return {
          ...prev,
          sortDir: prev.sortDir === "DESC" ? "ASC" : "DESC",
        };
      }
      return { ...prev, sortKey: key, sortDir: "DESC" };
    });
  }

  const pageRows = useMemo(() => {
    const all = result?.rows ?? [];
    const start = (page - 1) * pageSize;
    return all.slice(start, start + pageSize);
  }, [result, page, pageSize]);

  const totalPages = Math.max(
    1,
    Math.ceil((result?.totalRows ?? 0) / pageSize),
  );

  async function exportPng(mode: "download" | "copy") {
    const node = exportRef.current;
    if (!node) return;
    setExportBusy(true);
    try {
      if (mode === "download") {
        const url = await captureStatsLabPngDataUrl(node);
        downloadDataUrl(
          url,
          `fpl-arena-stats-centre-${filter.centreMode.toLowerCase()}.png`,
        );
        setFlash(ui.saved);
      } else {
        const blob = await captureStatsLabPngBlob(node);
        await copyPngBlobToClipboard(blob);
        setFlash(ui.copied);
      }
      window.setTimeout(() => setFlash(null), 2500);
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExportBusy(false);
    }
  }

  const studioHref =
    watchlist.length > 0
      ? `/admin/stats-lab?tab=studio&selected=${watchlist.join(",")}`
      : "/admin/stats-lab?tab=studio";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            className={`flex items-center gap-2 text-xl font-extrabold ${tokens.textStrong}`}
          >
            <Table2 className={`h-5 w-5 ${tokens.accentText}`} />
            {ui.title}
          </h2>
          <p className={`mt-1 max-w-2xl text-sm ${tokens.textMuted}`}>
            {ui.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onThemeChange ? (
            <div
              className={`inline-flex rounded-xl border p-1 ${tokens.panelBorder} ${tokens.page}`}
            >
              {(
                Object.keys(STATS_LAB_CHART_THEMES) as StatsLabChartThemeId[]
              ).map((id) => (
                <button
                  key={id}
                  type="button"
                  title={
                    lang === "en"
                      ? STATS_LAB_CHART_THEMES[id].labelEn
                      : STATS_LAB_CHART_THEMES[id].labelPl
                  }
                  onClick={() => onThemeChange(id)}
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase ${
                    themeId === id
                      ? "bg-[#39FF14] text-black"
                      : tokens.textMuted
                  }`}
                >
                  {id === "ARENA_DARK"
                    ? "Arena"
                    : id === "SCOUT_DARK"
                      ? "Scout"
                      : "Light"}
                </button>
              ))}
            </div>
          ) : null}
          <div
            className={`inline-flex rounded-xl border p-1 ${tokens.panelBorder} ${tokens.page}`}
          >
            {(["PLAYERS", "PER_GW", "TEAMS"] as StatsCentreMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() =>
                  patchFilter({
                    centreMode: m,
                    sortKey:
                      m === "TEAMS"
                        ? "total_points"
                        : m === "PER_GW"
                          ? "total_points"
                          : "total_points",
                  })
                }
                className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
                  filter.centreMode === m
                    ? "bg-[#39FF14] text-black"
                    : tokens.textMuted
                }`}
              >
                {CENTRE_MODE_LABELS[lang][m]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div
        className={`space-y-3 rounded-2xl border p-4 ${tokens.panel} ${tokens.panelBorder}`}
      >
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[10px] font-bold uppercase text-slate-500">
            {ui.range}
            <select
              value={draftRange}
              onChange={(e) =>
                setDraftRange(e.target.value as StatsCentreRangeMode)
              }
              className={`mt-1 block min-w-[200px] rounded-lg border px-2 py-2 text-sm ${tokens.input}`}
            >
              {RANGE_MODES.map((m) => (
                <option key={m} value={m}>
                  {CENTRE_RANGE_LABELS[lang][m]}
                </option>
              ))}
            </select>
          </label>
          {draftRange === "GW_RANGE" ? (
            <>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                {ui.gwFrom}
                <input
                  type="number"
                  min={1}
                  max={38}
                  value={draftGwFrom}
                  onChange={(e) => setDraftGwFrom(Number(e.target.value))}
                  className="mt-1 block w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white"
                />
              </label>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                {ui.gwTo}
                <input
                  type="number"
                  min={1}
                  max={38}
                  value={draftGwTo}
                  onChange={(e) => setDraftGwTo(Number(e.target.value))}
                  className="mt-1 block w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white"
                />
              </label>
            </>
          ) : null}
          <button
            type="button"
            onClick={applyRange}
            className="rounded-xl bg-[#39FF14] px-4 py-2 text-[10px] font-black uppercase tracking-wider text-black"
          >
            {ui.apply}
          </button>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => onLangChange("pl")}
                className={`rounded-lg px-2 py-1 text-[10px] font-black ${
                  lang === "pl" ? "bg-[#39FF14] text-black" : "text-slate-400"
                }`}
              >
                PL
              </button>
              <button
                type="button"
                onClick={() => onLangChange("en")}
                className={`rounded-lg px-2 py-1 text-[10px] font-black ${
                  lang === "en" ? "bg-[#39FF14] text-black" : "text-slate-400"
                }`}
              >
                EN
              </button>
            </div>
            <span className="rounded-lg border border-slate-700 px-2 py-1.5 text-[10px] font-bold text-slate-400">
              {ui.season}: {bootstrap.seasonCode}
            </span>
          </div>
        </div>

        {/* Category pills */}
        {filter.centreMode === "PLAYERS" ? (
          <div className="flex flex-wrap gap-1.5">
            {PLAYER_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() =>
                  patchFilter({
                    playerTab: tab,
                    sortKey:
                      PLAYER_TAB_LABELS[lang][tab] &&
                      (tab === "OVERVIEW"
                        ? "total_points"
                        : tab === "GOAL_THREAT"
                          ? "expected_goals"
                          : tab === "CREATIVITY"
                            ? "expected_assists"
                            : tab === "DEFENDING"
                              ? "dc_bonus_points"
                              : tab === "DISCIPLINE"
                                ? "negative_points_total"
                                : tab === "EXPECTED"
                                  ? "xgi_delta"
                                  : tab === "VALUE_MARKET"
                                    ? "value_season"
                                    : "total_points"),
                  })
                }
                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                  filter.playerTab === tab
                    ? "bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-500/40"
                    : "border border-slate-700 text-slate-400 hover:border-slate-500"
                }`}
              >
                {PLAYER_TAB_LABELS[lang][tab]}
              </button>
            ))}
          </div>
        ) : null}
        {filter.centreMode === "TEAMS" ? (
          <div className="flex flex-wrap gap-1.5">
            {TEAM_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => patchFilter({ teamTab: tab })}
                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                  filter.teamTab === tab
                    ? "bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-500/40"
                    : "border border-slate-700 text-slate-400 hover:border-slate-500"
                }`}
              >
                {TEAM_TAB_LABELS[lang][tab]}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {filter.centreMode !== "TEAMS" ? (
            <select
              value={filter.positions[0] ?? 0}
              onChange={(e) => {
                const v = Number(e.target.value);
                patchFilter({
                  positions: v === 0 ? [] : [v as FplPositionType],
                });
              }}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white"
            >
              <option value={0}>{ui.allPositions}</option>
              <option value={1}>GK</option>
              <option value={2}>DEF</option>
              <option value={3}>MID</option>
              <option value={4}>FWD</option>
            </select>
          ) : null}

          <select
            value={filter.clubIds[0] ?? 0}
            onChange={(e) => {
              const v = Number(e.target.value);
              patchFilter({ clubIds: v === 0 ? [] : [v] });
            }}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white"
          >
            <option value={0}>{ui.allTeams}</option>
            {bootstrap.clubs.map((c) => (
              <option key={c.fpl_team_id} value={c.fpl_team_id}>
                {c.short_name} — {c.name}
              </option>
            ))}
          </select>

          <div className="inline-flex rounded-lg border border-slate-700 bg-slate-950 p-0.5">
            <button
              type="button"
              onClick={() => patchFilter({ per90: false })}
              className={`rounded-md px-2.5 py-1 text-[10px] font-black uppercase ${
                !filter.per90 ? "bg-slate-800 text-white" : "text-slate-500"
              }`}
            >
              {ui.totals}
            </button>
            <button
              type="button"
              onClick={() => patchFilter({ per90: true })}
              className={`rounded-md px-2.5 py-1 text-[10px] font-black uppercase ${
                filter.per90 ? "bg-[#39FF14] text-black" : "text-slate-500"
              }`}
            >
              {ui.per90}
            </button>
          </div>

          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              value={filter.search}
              onChange={(e) => patchFilter({ search: e.target.value })}
              placeholder={ui.search}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-1.5 pl-8 pr-2 text-xs text-white"
            />
          </div>

          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-black uppercase text-slate-300"
          >
            {ui.advanced}
          </button>

          <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[10px] font-black uppercase text-amber-200">
            <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
            {ui.watchlist}: {watchlist.length}
          </span>
        </div>

        {advancedOpen ? (
          <div className="flex flex-wrap gap-3 border-t border-slate-800 pt-3">
            <label className="text-[10px] text-slate-500">
              {ui.minMinutes}
              <input
                type="number"
                min={0}
                value={filter.minMinutes}
                onChange={(e) =>
                  patchFilter({ minMinutes: Number(e.target.value) })
                }
                className="mt-1 block w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="text-[10px] text-slate-500">
              {ui.maxPrice}
              <input
                type="number"
                min={3}
                max={15}
                step={0.1}
                value={filter.maxPrice ?? ""}
                onChange={(e) =>
                  patchFilter({
                    maxPrice: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
                className="mt-1 block w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="text-[10px] text-slate-500">
              {ui.maxOwn}
              <input
                type="number"
                min={0}
                max={100}
                value={filter.maxOwnershipPct ?? ""}
                onChange={(e) =>
                  patchFilter({
                    maxOwnershipPct: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
                className="mt-1 block w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white"
              />
            </label>
          </div>
        ) : null}
      </div>

      {/* Watchlist CTA + export */}
      <div className="flex flex-wrap items-center gap-2">
        {watchlist.length > 0 ? (
          <Link
            href={studioHref}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-200 hover:bg-emerald-500/20"
          >
            📈 {ui.compareInStudio} ({watchlist.length}) ↗
          </Link>
        ) : null}
        <button
          type="button"
          disabled={exportBusy || !pageRows.length}
          onClick={() => void exportPng("download")}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600 px-3 py-2 text-[10px] font-black uppercase text-slate-200 disabled:opacity-40"
        >
          {exportBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {ui.downloadPng}
        </button>
        <button
          type="button"
          disabled={exportBusy || !pageRows.length}
          onClick={() => void exportPng("copy")}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600 px-3 py-2 text-[10px] font-black uppercase text-slate-200 disabled:opacity-40"
        >
          <ClipboardCopy className="h-3.5 w-3.5" />
          {ui.copyPng}
        </button>
        {pending ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" /> …
          </span>
        ) : null}
        {flash ? (
          <span className="text-[10px] font-semibold text-emerald-300">
            {flash}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {/* Exportable table node */}
      <div
        ref={exportRef}
        className={`overflow-hidden rounded-2xl border ${tokens.panelBorder} ${tokens.tableBg}`}
        style={{ background: theme.canvasBg, borderColor: theme.border }}
      >
        <div
          className="flex items-center gap-3 border-b px-4 py-3"
          style={{ borderColor: theme.border }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ARENA_PORTAL_LOGO}
            alt={ARENA_PORTAL_ALT}
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
            crossOrigin="anonymous"
          />
          <div>
            <p
              className={`text-[10px] font-black uppercase tracking-[0.28em] ${tokens.accentText}`}
            >
              FPL ARENA • STATS CENTRE
            </p>
            <p
              className={`text-sm font-bold ${tokens.textStrong}`}
              style={{ color: theme.text }}
            >
              {CENTRE_MODE_LABELS[lang][filter.centreMode]}
              {filter.centreMode === "PLAYERS"
                ? ` · ${PLAYER_TAB_LABELS[lang][filter.playerTab]}`
                : filter.centreMode === "TEAMS"
                  ? ` · ${TEAM_TAB_LABELS[lang][filter.teamTab]}`
                  : ""}
              {" · "}
              {CENTRE_RANGE_LABELS[lang][filter.rangeMode]}
              {filter.per90 ? " · Per 90" : " · Totals"}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          {!result || pageRows.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-slate-500">
              {ui.empty}
            </p>
          ) : (
            <table className="min-w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80">
                  {filter.centreMode !== "TEAMS" ? (
                    <th className="sticky left-0 z-10 bg-slate-950 px-2 py-2 text-[10px] font-black uppercase text-slate-500">
                      ★
                    </th>
                  ) : null}
                  <th className="sticky left-8 z-10 bg-slate-950 px-3 py-2 text-[10px] font-black uppercase text-slate-400">
                    {ui.player}
                  </th>
                  {result.columns.map((c) => {
                    const active = filter.sortKey === c.key;
                    return (
                      <th key={c.key} className="px-1.5 py-2">
                        <button
                          type="button"
                          title={centreColLabel(c.key, lang)}
                          onClick={() => onSort(c.key)}
                          className={`inline-flex items-center gap-0.5 rounded px-1.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                            active
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {centreColShort(c.key, lang)}
                          {active ? (
                            filter.sortDir === "DESC" ? (
                              <ArrowDown className="h-3 w-3" />
                            ) : (
                              <ArrowUp className="h-3 w-3" />
                            )
                          ) : null}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const watched =
                    row.fpl_element_id != null &&
                    watchlist.includes(row.fpl_element_id);
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-slate-800/80 hover:bg-slate-900/50"
                    >
                      {filter.centreMode !== "TEAMS" ? (
                        <td
                          className="sticky left-0 z-10 px-2 py-1.5"
                          style={{ background: theme.canvasBg }}
                        >
                          {row.fpl_element_id != null ? (
                            <button
                              type="button"
                              onClick={() => toggleWatch(row.fpl_element_id!)}
                              className="text-amber-300/80 hover:text-amber-200"
                              title={ui.watchlist}
                            >
                              <Star
                                className={`h-3.5 w-3.5 ${
                                  watched ? "fill-amber-300" : ""
                                }`}
                              />
                            </button>
                          ) : null}
                        </td>
                      ) : null}
                      <td
                        className="sticky left-8 z-10 whitespace-nowrap px-3 py-1.5"
                        style={{ background: theme.canvasBg }}
                      >
                        {filter.centreMode === "TEAMS" ? (
                          <span className="inline-flex items-center gap-2">
                            {row.club_pulse_code ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`/api/uploads/fpl-lab/badge/${row.club_pulse_code}`}
                                alt={row.club_short}
                                width={28}
                                height={28}
                                crossOrigin="anonymous"
                                className="h-7 w-7 object-contain"
                              />
                            ) : null}
                            <span
                              className={`font-bold ${tokens.textStrong}`}
                              style={{ color: theme.text }}
                            >
                              {row.web_name}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            {row.player_code ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`/api/uploads/fpl-lab/player/${row.player_code}`}
                                alt={row.web_name}
                                width={36}
                                height={36}
                                crossOrigin="anonymous"
                                className="h-9 w-9 shrink-0 rounded-full border border-slate-700/80 bg-slate-800 object-cover object-top"
                              />
                            ) : null}
                            <span className="min-w-0">
                              <span
                                className={`font-bold ${tokens.textStrong}`}
                                style={{ color: theme.text }}
                              >
                                {row.web_name}
                              </span>
                              <span
                                className={`ml-2 inline-flex items-center gap-1 font-mono text-[10px] ${tokens.textMuted}`}
                              >
                                {row.club_pulse_code ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={`/api/uploads/fpl-lab/badge/${row.club_pulse_code}`}
                                    alt={row.club_short}
                                    width={20}
                                    height={20}
                                    crossOrigin="anonymous"
                                    className="h-5 w-5 object-contain"
                                  />
                                ) : null}
                                {row.club_short}
                                {row.position_label !== "TEAM"
                                  ? ` ${row.position_label}`
                                  : ""}
                              </span>
                            </span>
                          </span>
                        )}
                      </td>
                      {result.columns.map((c) => {
                        const raw = row.values[c.key];
                        const norm = row.colorNorm[c.key] ?? 0.5;
                        const num =
                          typeof raw === "number" ? raw : null;
                        return (
                          <td key={c.key} className="px-1.5 py-1.5">
                            <span
                              className={`inline-flex min-w-[2.5rem] justify-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${colourPillClass(
                                norm,
                                c.isDelta,
                                num,
                                true,
                              )}`}
                              title={centreColLabel(c.key, lang)}
                            >
                              {formatCentreCell(c, raw)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 px-4 py-3 text-[10px] text-slate-500">
          <span>{ui.colourLegend}</span>
          <span className="font-semibold text-[#39FF14]">
            www.fpl-arena.com • Powered by St0pa | FPL Arena
          </span>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span>{ui.rowsPerPage}</span>
          {PAGE_SIZE_OPTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setPageSize(n);
                setPage(1);
              }}
              className={`rounded-md px-2 py-1 font-black ${
                pageSize === n
                  ? "bg-[#39FF14] text-black"
                  : "border border-slate-700"
              }`}
            >
              {n}
            </button>
          ))}
          <span className="ml-2 text-slate-500">
            {result?.totalRows ?? 0} · {page}/{totalPages}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-[10px] font-black uppercase disabled:opacity-40"
          >
            {ui.prev}
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-[10px] font-black uppercase disabled:opacity-40"
          >
            {ui.next}
          </button>
        </div>
      </div>
    </div>
  );
}
