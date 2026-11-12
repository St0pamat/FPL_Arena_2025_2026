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
  colourPillNeutralClass,
  createDefaultStatsCentreFilter,
  formatCentreCell,
  type StatsCentreColumnDef,
  type StatsCentreFilter,
  type StatsCentreMode,
  type StatsCentrePlayerTab,
  type StatsCentreRangeMode,
  type StatsCentreResult,
  type StatsCentreRow,
  type StatsCentreTeamTab,
} from "@/lib/stats-lab/statsCentreEngine";
import {
  CENTRE_MODE_LABELS,
  CENTRE_RANGE_LABELS,
  PLAYER_TAB_LABELS,
  TEAM_TAB_LABELS,
  centreColFullLabel,
  centreColLabel,
  centreColShort,
  centreUi,
} from "@/lib/stats-lab/statsCentreI18n";
import { toJpeg } from "html-to-image";
import {
  copyPngBlobToClipboard,
  downloadDataUrl,
} from "@/lib/stats-lab/exportCapture";
import {
  buildStatsCentreAiAuditReport,
  downloadJsonFile,
} from "@/lib/stats-lab/auditExport";
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

type CentreSurface = {
  canvasBg: string;
  rowOdd: string;
  rowEven: string;
  headBg: string;
  borderClass: string;
  textClass: string;
  mutedClass: string;
  accent: string;
  accentTextClass: string;
  stickyBorderClass: string;
};

function getCentreSurface(themeId: StatsLabChartThemeId): CentreSurface {
  if (themeId === "ANALYST_LIGHT") {
    return {
      canvasBg: "#F8FAFC",
      rowOdd: "#FFFFFF",
      rowEven: "#F1F5F9",
      headBg: "#E2E8F0",
      borderClass: "border-slate-200",
      textClass: "text-slate-900",
      mutedClass: "text-slate-600",
      accent: "#059669",
      accentTextClass: "text-emerald-700",
      stickyBorderClass: "border-slate-200",
    };
  }
  if (themeId === "SCOUT_DARK") {
    return {
      canvasBg: "#07120F",
      rowOdd: "#07120F",
      rowEven: "#0B1B16",
      headBg: "#0F241D",
      borderClass: "border-emerald-900/60",
      textClass: "text-emerald-50",
      mutedClass: "text-emerald-300/70",
      accent: "#34D399",
      accentTextClass: "text-emerald-300",
      stickyBorderClass: "border-emerald-900/60",
    };
  }
  return {
    canvasBg: "#070B14",
    rowOdd: "#070B14",
    rowEven: "#0B1120",
    headBg: "#0F172A",
    borderClass: "border-slate-800/80",
    textClass: "text-slate-100",
    mutedClass: "text-slate-400",
    accent: "#39FF14",
    accentTextClass: "text-emerald-400",
    stickyBorderClass: "border-slate-800/80",
  };
}

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

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function PlayerPortrait({
  row,
  isLight,
}: {
  row: StatsCentreRow;
  isLight: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const initials = initialsFromName(row.web_name);
  return (
    <span className="relative inline-flex h-[52px] w-[52px] shrink-0">
      {row.player_code && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/uploads/fpl-lab/player/${row.player_code}`}
          alt={row.web_name}
          width={52}
          height={52}
          crossOrigin="anonymous"
          onError={() => setBroken(true)}
          className={`h-[52px] w-[52px] shrink-0 rounded-full border object-cover object-top ${
            isLight ? "border-slate-300 bg-slate-200" : "border-slate-700/80 bg-slate-800"
          }`}
        />
      ) : (
        <span
          className={`flex h-[52px] w-[52px] items-center justify-center rounded-full border text-[13px] font-black ${
            isLight
              ? "border-slate-300 bg-slate-200 text-slate-700"
              : "border-slate-700 bg-slate-800 text-slate-200"
          }`}
        >
          {initials}
        </span>
      )}
      {row.club_pulse_code ? (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white p-0.5 shadow-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/uploads/fpl-lab/badge/${row.club_pulse_code}`}
            alt={row.club_short}
            width={20}
            height={20}
            crossOrigin="anonymous"
            className="h-full w-full object-contain"
          />
        </span>
      ) : null}
    </span>
  );
}

function TeamBadge({
  pulseCode,
  shortName,
}: {
  pulseCode: number | null;
  shortName: string;
}) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white p-1.5 shadow-md">
      {pulseCode ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/uploads/fpl-lab/badge/${pulseCode}`}
          alt={shortName}
          width={44}
          height={44}
          crossOrigin="anonymous"
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="text-[11px] font-black text-slate-700">{shortName}</span>
      )}
    </span>
  );
}

function orderPillClass(raw: string, isDark: boolean): string {
  const v = raw.trim();
  if (!v || v === "—") {
    return isDark
      ? "bg-transparent text-slate-500 border border-transparent opacity-50"
      : "bg-transparent text-slate-400 border border-transparent opacity-50";
  }
  if (v === "#1") {
    return isDark
      ? "bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 font-extrabold"
      : "bg-emerald-600 text-white font-extrabold shadow-sm";
  }
  if (v === "#2") {
    return isDark
      ? "bg-emerald-500/30 text-emerald-200 border border-emerald-500/40"
      : "bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold";
  }
  return isDark
    ? "bg-slate-800/45 text-slate-300 border border-slate-700/50"
    : "bg-slate-100 text-slate-700 border border-slate-200";
}

function ValuePill({
  col,
  raw,
  norm,
  isDark,
  lang,
  per90,
  isPoolAverage = false,
  dense = false,
}: {
  col: StatsCentreColumnDef;
  raw: string | number | null;
  norm: number | null | undefined;
  isDark: boolean;
  lang: StatsLabLang;
  per90: boolean;
  isPoolAverage?: boolean;
  dense?: boolean;
}) {
  const pillSize = dense
    ? "min-w-[42px] px-1.5 py-0.5 text-[13px]"
    : "min-w-[54px] px-2.5 py-1 text-[14px]";

  if (col.format === "order") {
    const text =
      raw == null || raw === ""
        ? "—"
        : typeof raw === "string"
          ? raw
          : String(raw);
    return (
      <span
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-md font-mono font-bold tabular-nums ${pillSize} ${orderPillClass(text, isDark)}`}
        title={centreColLabel(col.key, lang)}
      >
        {text}
      </span>
    );
  }

  const isTextual = col.format === "text";
  const num = typeof raw === "number" ? raw : null;
  const cls =
    isTextual || num == null || norm == null
      ? colourPillNeutralClass(isDark)
      : colourPillClass(norm, col.key, isDark, num);
  return (
    <span
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md font-mono font-bold tabular-nums ${pillSize} ${cls}`}
      title={centreColLabel(col.key, lang)}
    >
      {formatCentreCell(col, raw, per90, isPoolAverage)}
    </span>
  );
}

async function withFitExportWidth<T>(
  node: HTMLElement,
  run: () => Promise<T>,
): Promise<T> {
  const prev = {
    width: node.style.width,
    minWidth: node.style.minWidth,
    maxWidth: node.style.maxWidth,
  };
  const wrappers: Array<{
    el: HTMLElement;
    overflow: string;
    overflowX: string;
    overflowY: string;
  }> = [];
  try {
    const tableEl = node.querySelector("table");
    if (tableEl) {
      const fullTableWidth = Math.max(1200, tableEl.scrollWidth + 64);
      node.style.width = `${fullTableWidth}px`;
      node.style.minWidth = `${fullTableWidth}px`;
      node.style.maxWidth = "none";
      for (const el of Array.from(
        node.querySelectorAll<HTMLElement>(
          "[data-centre-table-wrap], .overflow-x-auto",
        ),
      )) {
        wrappers.push({
          el,
          overflow: el.style.overflow,
          overflowX: el.style.overflowX,
          overflowY: el.style.overflowY,
        });
        el.style.overflow = "visible";
        el.style.overflowX = "visible";
        el.style.overflowY = "visible";
      }
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
    }
    return await run();
  } finally {
    node.style.width = prev.width;
    node.style.minWidth = prev.minWidth;
    node.style.maxWidth = prev.maxWidth;
    for (const w of wrappers) {
      w.el.style.overflow = w.overflow;
      w.el.style.overflowX = w.overflowX;
      w.el.style.overflowY = w.overflowY;
    }
  }
}

async function captureCentreJpegDataUrl(
  node: HTMLElement,
  backgroundColor: string,
): Promise<string> {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }),
    ),
  );
  const opts = {
    quality: 0.95,
    pixelRatio: 2,
    backgroundColor,
    cacheBust: true,
    width: node.offsetWidth,
    height: node.offsetHeight,
    style: {
      transform: "none",
      overflow: "hidden",
      overflowX: "hidden",
      overflowY: "hidden",
    },
  };
  await toJpeg(node, opts);
  return await toJpeg(node, opts);
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
  const isLight = themeId === "ANALYST_LIGHT";
  const isDark = !isLight;
  const surface = getCentreSurface(themeId);
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

  const runQuery = useCallback((next: StatsCentreFilter) => {
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
  }, []);

  useEffect(() => {
    if (bootstrap.players.length === 0) return;
    const tmr = window.setTimeout(() => runQuery(filter), 200);
    return () => window.clearTimeout(tmr);
  }, [bootstrap.players.length, filter, runQuery]);

  function patchFilter(patch: Partial<StatsCentreFilter>) {
    setFilter((prev) => {
      const next = { ...prev, ...patch };
      if (next.centreMode === "PER_GW") next.per90 = false;
      return next;
    });
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
      return {
        ...prev,
        sortKey: key,
        sortDir: key === "negative_points_total" ? "ASC" : "DESC",
      };
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

  const activeTabKey =
    filter.centreMode === "TEAMS"
      ? filter.teamTab
      : filter.centreMode === "PLAYERS"
        ? filter.playerTab
        : "PER_GW";

  const gwLo = Math.max(
    1,
    filter.gwFrom ??
      Number(String(result?.effectiveLabel ?? "1").split("–")[0]) ??
      1,
  );
  const gwHi = Math.max(
    gwLo,
    filter.gwTo ?? result?.maxGw ?? bootstrap.maxGw ?? gwLo,
  );

  const posterTitle = useMemo(() => {
    if (filter.centreMode === "PLAYERS") {
      return `${CENTRE_MODE_LABELS[lang].PLAYERS} — ${PLAYER_TAB_LABELS[lang][filter.playerTab]}`;
    }
    if (filter.centreMode === "TEAMS") {
      return `${CENTRE_MODE_LABELS[lang].TEAMS} — ${TEAM_TAB_LABELS[lang][filter.teamTab]}`;
    }
    return lang === "pl"
      ? `Mecz po meczu — ${ui.perGwHistory}`
      : `Match by Match — ${ui.perGwHistory}`;
  }, [filter.centreMode, filter.playerTab, filter.teamTab, lang, ui.perGwHistory]);

  const poolNoun =
    filter.centreMode === "TEAMS"
      ? ui.poolClubs
      : filter.centreMode === "PER_GW"
        ? ui.poolAppearances
        : ui.poolPlayers;

  const scaleLabel =
    filter.centreMode === "PER_GW"
      ? ui.singleMatches
      : filter.per90
        ? ui.per90
        : ui.totals;

  const posterSubtitle = useMemo(() => {
    const parts = [
      `${ui.season} ${bootstrap.seasonCode}`,
      `GW ${gwLo}–${gwHi}`,
      CENTRE_RANGE_LABELS[lang][filter.rangeMode],
    ];
    if (filter.centreMode !== "TEAMS") {
      parts.push(`Min. ${filter.minMinutes} min`);
    }
    parts.push(scaleLabel);
    parts.push(
      lang === "pl"
        ? `Pula: ${result?.totalRows ?? 0} ${poolNoun}`
        : `Pool: ${result?.totalRows ?? 0} ${poolNoun}`,
    );
    return parts.join(" · ");
  }, [
    bootstrap.seasonCode,
    filter.centreMode,
    filter.minMinutes,
    filter.rangeMode,
    gwHi,
    gwLo,
    lang,
    poolNoun,
    result?.totalRows,
    scaleLabel,
    ui.season,
  ]);

  function buildExportBaseName() {
    const mode = filter.centreMode.toLowerCase();
    const tab = String(activeTabKey).toLowerCase().replace(/_/g, "-");
    return `fpl-arena-stats-centre-${mode}-${tab}-${lang}`;
  }

  function buildAuditReport() {
    if (!result || !pageRows.length) return null;
    const effectiveMin =
      filter.centreMode === "PLAYERS" && filter.per90
        ? Math.max(filter.minMinutes, 90)
        : filter.minMinutes;
    const auditFilter: StatsCentreFilter = {
      ...filter,
      per90: filter.centreMode === "PER_GW" ? false : filter.per90,
      minMinutes: effectiveMin,
    };
    // Audyt: tylko aktualnie widoczne kolumny (+ ich poolAverages)
    const visibleKeys = new Set(result.columns.map((c) => c.key));
    const visiblePool: Record<string, number | null> = {};
    for (const c of result.columns) {
      visiblePool[c.key] = result.poolAverages?.[c.key] ?? null;
    }
    const auditResult: StatsCentreResult = {
      ...result,
      poolAverages: visiblePool,
      rows: result.rows,
    };
    const auditPageRows = pageRows.map((row) => {
      const colorNorm: Record<string, number> = {};
      for (const k of Object.keys(row.colorNorm)) {
        if (visibleKeys.has(k)) colorNorm[k] = row.colorNorm[k]!;
      }
      return { ...row, colorNorm };
    });
    return buildStatsCentreAiAuditReport({
      filter: auditFilter,
      result: auditResult,
      pageRows: auditPageRows,
      page,
      pageSize,
      lang,
      chartTheme: themeId,
      seasonCode: bootstrap.seasonCode,
      rootElement: exportRef.current,
    });
  }

  async function exportPair() {
    const node = exportRef.current;
    if (!node || !result || !pageRows.length) return;
    setExportBusy(true);
    try {
      const base = buildExportBaseName();
      await withFitExportWidth(node, async () => {
        const url = await captureCentreJpegDataUrl(node, surface.canvasBg);
        downloadDataUrl(url, `${base}.jpg`);
        const report = buildAuditReport();
        if (report) downloadJsonFile(`${base}.json`, report);
      });
      setFlash(ui.saved);
      window.setTimeout(() => setFlash(null), 2800);
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExportBusy(false);
    }
  }

  async function exportJpgOnly(mode: "download" | "copy") {
    const node = exportRef.current;
    if (!node) return;
    setExportBusy(true);
    try {
      await withFitExportWidth(node, async () => {
        const url = await captureCentreJpegDataUrl(node, surface.canvasBg);
        if (mode === "download") {
          downloadDataUrl(url, `${buildExportBaseName()}.jpg`);
          setFlash(ui.saved);
        } else {
          const res = await fetch(url);
          const blob = await res.blob();
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/jpeg": blob }),
            ]);
          } catch {
            await copyPngBlobToClipboard(blob);
          }
          setFlash(ui.copied);
        }
      });
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

  const showWatch = filter.centreMode !== "TEAMS";
  const isWideTable = (result?.columns.length ?? 0) >= 13;
  const densePad = isWideTable ? "px-1 py-2.5" : "px-1.5 py-2.5";
  const nameMinClass = isWideTable ? "min-w-[115px] pr-1.5" : "min-w-[140px]";
  const poolAvgLabel =
    filter.centreMode === "TEAMS" ? ui.poolAverageLeague : ui.poolAverage;

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
                onClick={() => {
                  patchFilter({
                    centreMode: m,
                    sortKey: "total_points",
                    sortDir: "DESC",
                    per90: m === "PER_GW" ? false : filter.per90,
                  });
                  if (m === "TEAMS" && pageSize < 25) setPageSize(25);
                }}
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
                  className={`mt-1 block w-20 rounded-lg border px-2 py-2 text-sm ${tokens.input}`}
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
                  className={`mt-1 block w-20 rounded-lg border px-2 py-2 text-sm ${tokens.input}`}
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
                      tab === "OVERVIEW"
                        ? "total_points"
                        : tab === "GOAL_THREAT"
                          ? "expected_goals"
                          : tab === "CREATIVITY"
                            ? "expected_assists"
                            : tab === "DEFENDING"
                              ? "dc_bonus_points"
                              : tab === "SET_PIECES"
                                ? "creativity"
                                : tab === "DISCIPLINE"
                                  ? "negative_points_total"
                                  : tab === "EXPECTED"
                                    ? "xgi_delta"
                                    : tab === "VALUE_MARKET"
                                      ? "value_season"
                                      : "total_points",
                    sortDir:
                      tab === "DISCIPLINE" ? "ASC" : "DESC",
                  })
                }
                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                  filter.playerTab === tab
                    ? "bg-[#39FF14] text-black"
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
                onClick={() =>
                  patchFilter({
                    teamTab: tab,
                    sortKey:
                      tab === "TEAM_ATTACKING"
                        ? "goals_scored"
                        : tab === "TEAM_DEFENDING"
                          ? "clean_sheets"
                          : tab === "TEAM_EXPECTED"
                            ? "expected_goals"
                            : "total_points",
                    sortDir: "DESC",
                  })
                }
                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                  filter.teamTab === tab
                    ? "bg-[#39FF14] text-black"
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
              className={`rounded-lg border px-2 py-1.5 text-xs ${tokens.input}`}
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
            className={`rounded-lg border px-2 py-1.5 text-xs ${tokens.input}`}
          >
            <option value={0}>{ui.allTeams}</option>
            {bootstrap.clubs.map((c) => (
              <option key={c.fpl_team_id} value={c.fpl_team_id}>
                {c.short_name} — {c.name}
              </option>
            ))}
          </select>

          {filter.centreMode !== "PER_GW" ? (
            <div className="inline-flex rounded-lg border border-slate-700 bg-slate-950 p-0.5">
              <button
                type="button"
                onClick={() =>
                  patchFilter({
                    per90: false,
                    minMinutes:
                      filter.minMinutes === 90 ? 1 : filter.minMinutes,
                  })
                }
                className={`rounded-md px-2.5 py-1 text-[10px] font-black uppercase ${
                  !filter.per90 ? "bg-slate-800 text-white" : "text-slate-500"
                }`}
              >
                {ui.totals}
              </button>
              <button
                type="button"
                onClick={() =>
                  patchFilter({
                    per90: true,
                    minMinutes: Math.max(filter.minMinutes, 90),
                  })
                }
                className={`rounded-md px-2.5 py-1 text-[10px] font-black uppercase ${
                  filter.per90 ? "bg-[#39FF14] text-black" : "text-slate-500"
                }`}
              >
                {ui.per90}
              </button>
            </div>
          ) : (
            <span className="rounded-md border border-slate-700 px-2.5 py-1 text-[10px] font-black uppercase text-slate-400">
              {ui.singleMatches}
            </span>
          )}

          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              value={filter.search}
              onChange={(e) => patchFilter({ search: e.target.value })}
              placeholder={ui.search}
              className={`w-full rounded-lg border py-1.5 pl-8 pr-2 text-xs ${tokens.input}`}
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
                className={`mt-1 block w-24 rounded-lg border px-2 py-1.5 text-sm ${tokens.input}`}
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
                    maxPrice: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className={`mt-1 block w-24 rounded-lg border px-2 py-1.5 text-sm ${tokens.input}`}
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
                className={`mt-1 block w-24 rounded-lg border px-2 py-1.5 text-sm ${tokens.input}`}
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
          onClick={() => void exportPair()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-100 disabled:opacity-40"
        >
          {exportBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {ui.downloadPair}
        </button>
        <button
          type="button"
          disabled={exportBusy || !pageRows.length}
          onClick={() => void exportJpgOnly("download")}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600 px-3 py-2 text-[10px] font-black uppercase text-slate-200 disabled:opacity-40"
        >
          {ui.downloadJpg}
        </button>
        <button
          type="button"
          disabled={exportBusy || !pageRows.length}
          onClick={() => void exportJpgOnly("copy")}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600 px-3 py-2 text-[10px] font-black uppercase text-slate-200 disabled:opacity-40"
        >
          <ClipboardCopy className="h-3.5 w-3.5" />
          {ui.copyJpg}
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

      {/* Exportable poster node */}
      <div
        ref={exportRef}
        className={`overflow-hidden rounded-2xl border ${surface.borderClass}`}
        style={{ background: surface.canvasBg }}
      >
        <div
          className={`flex items-center gap-3 border-b px-5 py-4 ${surface.borderClass}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ARENA_PORTAL_LOGO}
            alt={ARENA_PORTAL_ALT}
            width={48}
            height={48}
            className="h-12 w-12 object-contain"
            crossOrigin="anonymous"
          />
          <div className="min-w-0">
            <p
              className={`text-[11px] font-bold uppercase tracking-[0.2em] ${surface.accentTextClass}`}
            >
              FPL ARENA • STATS CENTRE
            </p>
            <p
              className={`text-[22px] font-black tracking-tight ${surface.textClass}`}
            >
              {posterTitle}
            </p>
            <p className={`mt-0.5 text-[13px] font-medium ${surface.mutedClass}`}>
              {posterSubtitle}
            </p>
          </div>
        </div>

        <div
          className="overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          data-centre-table-wrap
        >
          {!result || pageRows.length === 0 ? (
            <p className={`px-6 py-16 text-center text-sm ${surface.mutedClass}`}>
              {ui.empty}
            </p>
          ) : (
            <table className="min-w-full border-collapse text-left">
              <thead>
                <tr
                  className={`border-b ${surface.borderClass}`}
                  style={{ background: surface.headBg }}
                >
                  <th
                    className={`sticky left-0 z-20 w-9 whitespace-nowrap border-r ${isWideTable ? "px-1" : "px-2.5"} py-3 text-[12px] font-extrabold uppercase tracking-wider ${surface.stickyBorderClass} ${surface.mutedClass}`}
                    style={{ background: surface.headBg }}
                  >
                    #
                  </th>
                  <th
                    className={`sticky z-20 whitespace-nowrap border-r ${isWideTable ? "px-1.5" : "px-3"} py-3 text-[12px] font-extrabold uppercase tracking-wider ${surface.stickyBorderClass} ${surface.textClass}`}
                    style={{
                      background: surface.headBg,
                      left: isWideTable ? 36 : 56,
                    }}
                  >
                    {filter.centreMode === "TEAMS" ? ui.club : ui.player}
                  </th>
                  {result.columns.map((c) => {
                    const active = filter.sortKey === c.key;
                    return (
                      <th
                        key={c.key}
                        className={isWideTable ? "px-1 py-3" : "px-1.5 py-3"}
                      >
                        <button
                          type="button"
                          title={centreColLabel(c.key, lang)}
                          onClick={() => onSort(c.key)}
                          className={`inline-flex items-center gap-0.5 whitespace-nowrap rounded text-[12px] font-extrabold uppercase tracking-wider ${
                            isWideTable ? "px-1 py-1" : "px-2.5 py-1"
                          } ${
                            active
                              ? `${surface.accentTextClass} font-black`
                              : surface.mutedClass
                          }`}
                          style={
                            active
                              ? {
                                  background: isLight
                                    ? "rgba(5,150,105,0.12)"
                                    : "rgba(52,211,153,0.15)",
                                }
                              : undefined
                          }
                        >
                          {centreColShort(c.key, lang)}
                          {active ? (
                            filter.sortDir === "DESC" ? (
                              <ArrowDown className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowUp className="h-3.5 w-3.5" />
                            )
                          ) : null}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, idx) => {
                  const rank = (page - 1) * pageSize + idx + 1;
                  const rowBg = idx % 2 === 0 ? surface.rowOdd : surface.rowEven;
                  const watched =
                    row.fpl_element_id != null &&
                    watchlist.includes(row.fpl_element_id);
                  return (
                    <tr
                      key={row.id}
                      className={`border-b ${surface.borderClass}`}
                      style={{ background: rowBg }}
                    >
                      <td
                        className={`sticky left-0 z-10 border-r ${isWideTable ? "w-9 px-1" : "px-2"} py-2.5 ${surface.stickyBorderClass}`}
                        style={{ background: rowBg }}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`w-6 text-right font-mono text-[12px] font-bold opacity-75 ${surface.textClass}`}
                          >
                            {rank}
                          </span>
                          {showWatch && row.fpl_element_id != null ? (
                            <button
                              type="button"
                              onClick={() => toggleWatch(row.fpl_element_id!)}
                              className="text-amber-400/90 hover:text-amber-300"
                              title={ui.watchlist}
                            >
                              <Star
                                className={`h-3.5 w-3.5 ${
                                  watched ? "fill-amber-300" : ""
                                }`}
                              />
                            </button>
                          ) : null}
                        </span>
                      </td>
                      <td
                        className={`sticky z-10 border-r ${isWideTable ? "px-1.5" : "px-3"} py-2.5 ${surface.stickyBorderClass}`}
                        style={{
                          background: rowBg,
                          left: isWideTable ? 36 : 56,
                        }}
                      >
                        {filter.centreMode === "TEAMS" ? (
                          <span className="inline-flex items-center gap-3">
                            <TeamBadge
                              pulseCode={row.club_pulse_code}
                              shortName={row.club_short}
                            />
                            <span
                              className={`flex flex-col justify-center ${nameMinClass}`}
                            >
                              <span
                                className={`whitespace-nowrap text-[15px] font-bold leading-tight ${surface.textClass}`}
                              >
                                {row.club_name}
                              </span>
                              <span
                                className={`mt-0.5 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider opacity-70 ${surface.mutedClass}`}
                              >
                                {row.club_short}
                              </span>
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-3">
                            <PlayerPortrait row={row} isLight={isLight} />
                            <span
                              className={`flex flex-col justify-center ${nameMinClass}`}
                            >
                              <span
                                className={`whitespace-nowrap text-[15px] font-bold leading-tight ${surface.textClass}`}
                              >
                                {row.web_name}
                              </span>
                              <span
                                className={`mt-0.5 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider leading-tight opacity-75 ${surface.mutedClass}`}
                              >
                                {row.club_short}
                                {row.position_label !== "TEAM"
                                  ? ` · ${row.position_label}`
                                  : ""}
                              </span>
                            </span>
                          </span>
                        )}
                      </td>
                      {result.columns.map((c) => {
                        const raw = row.values[c.key];
                        const norm = row.colorNorm[c.key];
                        return (
                          <td key={c.key} className={densePad}>
                            <ValuePill
                              col={c}
                              raw={raw}
                              norm={norm}
                              isDark={isDark}
                              lang={lang}
                              dense={isWideTable}
                              per90={
                                filter.centreMode === "PER_GW"
                                  ? false
                                  : filter.per90
                              }
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr
                  className={`border-t-2 border-b-2 ${surface.borderClass}`}
                  style={{ background: surface.headBg }}
                >
                  <td
                    className={`sticky left-0 z-10 border-r py-3 ${isWideTable ? "w-9 px-1" : "px-2"} ${surface.stickyBorderClass}`}
                    style={{ background: surface.headBg }}
                  />
                  <td
                    className={`sticky z-10 border-r py-3 ${isWideTable ? "px-1.5" : "px-3"} ${surface.stickyBorderClass}`}
                    style={{
                      background: surface.headBg,
                      left: isWideTable ? 36 : 56,
                    }}
                  >
                    <span
                      className={`whitespace-nowrap text-[13px] font-black ${surface.accentTextClass}`}
                    >
                      {poolAvgLabel}
                    </span>
                    <span
                      className={`ml-2 text-[11px] font-semibold ${surface.mutedClass}`}
                    >
                      (n={result.totalRows})
                    </span>
                  </td>
                  {result.columns.map((c) => {
                    const avg = result.poolAverages?.[c.key];
                    const per90Effective =
                      filter.centreMode === "PER_GW" ? false : filter.per90;
                    const footPad = isWideTable ? "px-1 py-3" : "px-1.5 py-3";
                    if (avg == null) {
                      return (
                        <td key={c.key} className={footPad}>
                          <span
                            className={`inline-flex items-center justify-center rounded-md font-mono font-bold ${
                              isWideTable
                                ? "min-w-[42px] px-1.5 py-0.5 text-[13px]"
                                : "min-w-[54px] px-2.5 py-1 text-[14px]"
                            } ${colourPillNeutralClass(isDark)}`}
                          >
                            —
                          </span>
                        </td>
                      );
                    }
                    return (
                      <td key={c.key} className={footPad}>
                        <ValuePill
                          col={c}
                          raw={avg}
                          norm={undefined}
                          isDark={isDark}
                          lang={lang}
                          dense={isWideTable}
                          per90={per90Effective}
                          isPoolAverage
                        />
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Dictionary footer */}
        {result && result.columns.length > 0 ? (
          <div
            className={`space-y-3 border-t px-5 py-4 ${surface.borderClass}`}
          >
            <div className="flex flex-wrap gap-2">
              {result.columns.map((c) => (
                <span
                  key={c.key}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${surface.borderClass} ${surface.textClass}`}
                  style={{
                    background: isLight
                      ? "rgba(255,255,255,0.85)"
                      : "rgba(15,23,42,0.55)",
                  }}
                >
                  <span
                    className={`font-black ${surface.accentTextClass}`}
                    style={{ color: surface.accent }}
                  >
                    {centreColShort(c.key, lang)}
                  </span>
                  <span className={surface.mutedClass}>
                    : {centreColFullLabel(c.key, lang)}
                  </span>
                </span>
              ))}
            </div>
            <p className={`text-[12px] font-medium ${surface.mutedClass}`}>
              {ui.colourLegend}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className={`text-[10px] ${surface.mutedClass}`}>
                {posterTitle}
              </span>
              <span
                className="text-[10px] font-semibold"
                style={{ color: surface.accent }}
              >
                www.fpl-arena.com • Powered by St0pa | FPL Arena
              </span>
            </div>
          </div>
        ) : (
          <div
            className={`flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-[10px] ${surface.borderClass} ${surface.mutedClass}`}
          >
            <span>{ui.colourLegend}</span>
            <span className="font-semibold" style={{ color: surface.accent }}>
              www.fpl-arena.com • Powered by St0pa | FPL Arena
            </span>
          </div>
        )}
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
