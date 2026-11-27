"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { toJpeg } from "html-to-image";
import { queryStatsLabPlayerProjectionsAction } from "@/app/admin/actions/statsLabPlayerProjections";
import type { StatsLabChartThemeId } from "@/components/admin/stats-lab/chartTheme";
import { AvailabilityBadge } from "@/components/admin/stats-lab/planner/AvailabilityBadge";
import { fdrPillClass } from "@/components/admin/stats-lab/planner/plannerCardPalette";
import { downloadJsonFile } from "@/lib/stats-lab/auditExport";
import { mapAvailabilityMarker } from "@/lib/stats-lab/availabilityMarker";
import { downloadDataUrl } from "@/lib/stats-lab/exportCapture";
import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import { fplLabBadgeUrl } from "@/lib/stats-lab/mediaUrls";
import { getStatsLabMenuChrome } from "@/lib/stats-lab/menuChrome";
import {
  playerProjectionCopy,
  type PlayerProjectionCopy,
} from "@/lib/stats-lab/playerProjectionI18n";
import {
  PLAYER_PROJECTION_COLUMNS,
  PLAYER_PROJECTION_HORIZONS,
  formatCsText,
  formatFdrCell,
  formatOpponentCell,
  formatXptsCell,
  playerProjectionsToCsv,
  poundsToTenths,
  queryPlayerProjectionTable,
  type PlayerProjectionColumnId,
  type PlayerProjectionHorizon,
  type PlayerProjectionInput,
  type PlayerProjectionViewRow,
  type PlayerTableSortKey,
} from "@/lib/stats-lab/playerProjectionTable";
import { getThemeHex } from "@/lib/stats-lab/themeTokens";
import { formatTenthsAsPounds } from "@/lib/stats-lab/plannerI18n";

type ClubOption = { id: number; shortName: string; name: string };

const TOP_OPTIONS = [10, 25, 50, 100] as const;
const CHANCE_OPTIONS = [25, 50, 75, 100] as const;
const POSITIONS = [1, 2, 3, 4] as const;

const COLUMN_LABEL: Record<
  PlayerProjectionColumnId,
  keyof PlayerProjectionCopy
> = {
  price: "price",
  own: "own",
  status: "status",
  p60: "p60",
  minutes: "minutes",
  xpts: "xpts",
  goal: "goal",
  assist: "assist",
  cs: "cs",
  fdr: "fdr",
};

function positionCode(position: number): string {
  if (position === 1) return "GK";
  if (position === 2) return "DEF";
  if (position === 3) return "MID";
  return "FWD";
}

export function PlayerProjectionsPanel({
  lang,
  themeId,
}: {
  lang: StatsLabLang;
  themeId: StatsLabChartThemeId;
}) {
  const copy = playerProjectionCopy(lang);
  const chrome = getStatsLabMenuChrome(themeId);
  const hex = getThemeHex(themeId);
  const exportRef = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<PlayerProjectionInput[]>([]);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [seasonCode, setSeasonCode] = useState("");
  const [horizon, setHorizon] = useState<PlayerProjectionHorizon>(3);
  const [search, setSearch] = useState("");
  const [positions, setPositions] = useState<number[]>([]);
  const [clubId, setClubId] = useState<number | null>(null);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minChance, setMinChance] = useState<number | null>(null);
  const [hideInjured, setHideInjured] = useState(false);
  const [topN, setTopN] = useState<number | null>(25);
  const [sortKey, setSortKey] = useState<PlayerTableSortKey>("xptsSum");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [columns, setColumns] = useState<PlayerProjectionColumnId[]>([
    ...PLAYER_PROJECTION_COLUMNS,
  ]);
  const [exportBusy, setExportBusy] = useState(false);

  function load() {
    startTransition(async () => {
      try {
        setError(null);
        const payload = await queryStatsLabPlayerProjectionsAction();
        setRows(payload.rows);
        setClubs(payload.clubs);
        setSeasonCode(payload.seasonCode);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : copy.error);
      }
    });
  }

  useEffect(() => {
    load();
    // Pierwsze wczytanie. Ponowienie jest na przycisku.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const views = useMemo(
    () =>
      queryPlayerProjectionTable({
        rows,
        horizon,
        search,
        positions,
        clubIds: clubId == null ? [] : [clubId],
        minPriceTenths: minPrice.trim()
          ? poundsToTenths(Number(minPrice))
          : null,
        maxPriceTenths: maxPrice.trim()
          ? poundsToTenths(Number(maxPrice))
          : null,
        minPlayChancePct: minChance,
        hideInjured,
        sortKey,
        sortDir,
        topN,
      }),
    [
      rows,
      horizon,
      search,
      positions,
      clubId,
      minPrice,
      maxPrice,
      minChance,
      hideInjured,
      sortKey,
      sortDir,
      topN,
    ],
  );

  const on = new Set(columns);
  const gwHeaders = views[0]?.horizonGws ?? rows[0]?.gameweeks.slice(0, horizon) ?? [];

  function toggleColumn(id: PlayerProjectionColumnId) {
    setColumns((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function togglePosition(position: number) {
    setPositions((current) =>
      current.includes(position)
        ? current.filter((item) => item !== position)
        : [...current, position],
    );
  }

  function onSort(key: PlayerTableSortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "name" ? "asc" : "desc");
  }

  async function exportImage() {
    const node = exportRef.current;
    if (!node) return;
    setExportBusy(true);
    try {
      await withFitExportWidth(node, async () => {
        const opts = {
          quality: 0.95,
          pixelRatio: 2,
          backgroundColor: hex.page,
          cacheBust: true,
          width: node.offsetWidth,
          height: node.offsetHeight,
        };
        await toJpeg(node, opts);
        const dataUrl = await toJpeg(node, opts);
        downloadDataUrl(
          dataUrl,
          `fpl-arena-player-projections-${seasonCode || "season"}-${lang}.jpg`,
        );
      });
    } finally {
      setExportBusy(false);
    }
  }

  function exportCsv() {
    const csv = playerProjectionsToCsv({ views, lang, columns });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fpl-arena-player-projections-${lang}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    downloadJsonFile(`fpl-arena-player-projections-${lang}.json`, {
      seasonCode,
      horizon,
      columns,
      rows: views.map((view) => ({
        elementId: view.row.elementId,
        webName: view.row.webName,
        position: positionCode(view.row.position),
        club: view.row.clubShort,
        priceTenths: view.row.priceTenths,
        ownership: view.row.ownership,
        status: view.row.status,
        chanceNext: view.row.chanceNext,
        xptsSum: view.xptsSum,
        playChancePct: view.playChancePct,
        minutes: view.minutes,
        goalChance: null,
        assistChance: null,
        cleanSheet: formatCsText(view.row.position, view.horizonGws),
        gameweeks: view.horizonGws,
        goalNote: copy.dashGoal,
        assistNote: copy.dashAssist,
      })),
    });
  }

  const control = `min-h-11 rounded-lg px-2 text-sm ${chrome.input}`;

  return (
    <div className="space-y-3" data-testid="player-projections">
      <div className={`space-y-3 rounded-2xl p-3 ${chrome.panel}`}>
        <div className="flex flex-wrap items-end gap-2">
          <label className={`text-[10px] font-black uppercase ${chrome.mutedLabel}`}>
            {copy.horizon}
            <select
              aria-label={copy.horizon}
              value={horizon}
              onChange={(event) =>
                setHorizon(Number(event.target.value) as PlayerProjectionHorizon)
              }
              className={`mt-1 block ${control}`}
            >
              {PLAYER_PROJECTION_HORIZONS.map((value) => (
                <option key={value} value={value}>
                  {value} GW
                </option>
              ))}
            </select>
          </label>
          <label className={`text-[10px] font-black uppercase ${chrome.mutedLabel}`}>
            {copy.club}
            <select
              aria-label={copy.club}
              value={clubId ?? ""}
              onChange={(event) =>
                setClubId(event.target.value ? Number(event.target.value) : null)
              }
              className={`mt-1 block max-w-[11rem] ${control}`}
            >
              <option value="">{copy.allClubs}</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.shortName}
                </option>
              ))}
            </select>
          </label>
          <label className={`text-[10px] font-black uppercase ${chrome.mutedLabel}`}>
            {copy.priceMin}
            <input
              aria-label={copy.priceMin}
              inputMode="decimal"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              className={`mt-1 block w-24 ${control}`}
            />
          </label>
          <label className={`text-[10px] font-black uppercase ${chrome.mutedLabel}`}>
            {copy.priceMax}
            <input
              aria-label={copy.priceMax}
              inputMode="decimal"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              className={`mt-1 block w-24 ${control}`}
            />
          </label>
          <label className={`text-[10px] font-black uppercase ${chrome.mutedLabel}`}>
            {copy.minChance}
            <select
              aria-label={copy.minChance}
              value={minChance ?? ""}
              onChange={(event) =>
                setMinChance(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              className={`mt-1 block ${control}`}
            >
              <option value="">{copy.anyChance}</option>
              {CHANCE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}%
                </option>
              ))}
            </select>
          </label>
          <label className={`min-w-[12rem] flex-1 text-[10px] font-black uppercase ${chrome.mutedLabel}`}>
            {copy.search}
            <input
              aria-label={copy.search}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={`mt-1 block w-full ${control}`}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[10px] font-black uppercase ${chrome.mutedLabel}`}>
            {copy.position}
          </span>
          <button
            type="button"
            aria-pressed={positions.length === 0}
            onClick={() => setPositions([])}
            className={`min-h-11 rounded-lg px-3 text-[11px] ${
              positions.length === 0 ? chrome.activeBtn : chrome.inactiveBtn
            }`}
          >
            {copy.allPositions}
          </button>
          {POSITIONS.map((position) => (
            <button
              key={position}
              type="button"
              aria-pressed={positions.includes(position)}
              onClick={() => togglePosition(position)}
              className={`min-h-11 rounded-lg px-3 text-[11px] ${
                positions.includes(position) ? chrome.activeBtn : chrome.inactiveBtn
              }`}
            >
              {positionCode(position)}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={hideInjured}
            onClick={() => setHideInjured((value) => !value)}
            className={`min-h-11 rounded-lg px-3 text-[11px] ${
              hideInjured ? chrome.activeBtn : chrome.inactiveBtn
            }`}
          >
            {copy.hideInjured}
          </button>
          <label className={`text-[10px] font-black uppercase ${chrome.mutedLabel}`}>
            {copy.topN}
            <select
              aria-label={copy.topN}
              value={topN ?? ""}
              onChange={(event) =>
                setTopN(event.target.value ? Number(event.target.value) : null)
              }
              className={`ml-2 ${control}`}
            >
              <option value="">{copy.topAll}</option>
              {TOP_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className={`self-center text-[10px] font-black uppercase ${chrome.mutedLabel}`}>
            {copy.columns}
          </span>
          {PLAYER_PROJECTION_COLUMNS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={on.has(id)}
              title={copy[COLUMN_LABEL[id]]}
              onClick={() => toggleColumn(id)}
              className={`min-h-11 rounded-lg px-2.5 text-[11px] ${
                on.has(id) ? chrome.activeBtn : chrome.inactiveBtn
              }`}
            >
              {copy[COLUMN_LABEL[id]]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={exportBusy || !views.length}
            onClick={() => void exportImage()}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[11px] ${chrome.exportPrimary}`}
          >
            {exportBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {copy.downloadImage}
          </button>
          <details>
            <summary
              className={`min-h-11 cursor-pointer list-none rounded-xl px-3 py-2 text-[11px] font-bold ${chrome.inactiveBtn}`}
            >
              {copy.more}
            </summary>
            <div className="mt-1 flex flex-wrap gap-1">
              <button
                type="button"
                disabled={!views.length}
                onClick={exportCsv}
                className={`min-h-11 rounded-xl px-3 text-[11px] ${chrome.inactiveBtn}`}
              >
                {copy.downloadCsv}
              </button>
              <button
                type="button"
                disabled={!views.length}
                onClick={exportJson}
                className={`min-h-11 rounded-xl px-3 text-[11px] ${chrome.inactiveBtn}`}
              >
                {copy.downloadJson}
              </button>
            </div>
          </details>
          <span className={`text-[11px] font-bold ${chrome.mutedLabel}`}>
            {copy.rows}: {views.length}
          </span>
          {pending ? (
            <span className={`inline-flex items-center gap-1 text-[11px] ${chrome.mutedLabel}`}>
              <Loader2 className="h-3 w-3 animate-spin" />
              {copy.loading}
            </span>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 ${chrome.panel}`}>
          <p className={`text-sm ${chrome.text}`}>{copy.error}</p>
          <button
            type="button"
            onClick={load}
            className={`min-h-11 rounded-xl px-3 text-[11px] ${chrome.activeBtn}`}
          >
            {copy.retry}
          </button>
        </div>
      ) : null}

      <div
        ref={exportRef}
        className={`overflow-hidden rounded-2xl border ${chrome.panel}`}
        style={{ background: hex.page, color: hex.text }}
      >
        <div className="px-3 py-3">
          <p className="text-sm font-black">{copy.posterTitle}</p>
          <p className={`text-[11px] font-semibold ${chrome.mutedLabel}`}>
            {seasonCode || "—"} · {horizon} GW
          </p>
        </div>
        {!views.length ? (
          <p className={`px-3 pb-6 text-sm ${chrome.mutedLabel}`}>
            {pending ? copy.loading : copy.empty}
          </p>
        ) : (
          <div className="overflow-x-auto" data-player-projections-table-wrap="true">
            <table className="min-w-full border-collapse text-left">
              <thead>
                <tr>
                  <SortTh
                    label={copy.player}
                    active={sortKey === "name"}
                    dir={sortDir}
                    onClick={() => onSort("name")}
                    sticky
                    hex={hex}
                  />
                  {on.has("price") ? (
                    <SortTh label={copy.price} title={copy.price} active={sortKey === "price"} dir={sortDir} onClick={() => onSort("price")} hex={hex} />
                  ) : null}
                  {on.has("own") ? (
                    <SortTh label={copy.own} active={sortKey === "own"} dir={sortDir} onClick={() => onSort("own")} hex={hex} />
                  ) : null}
                  {on.has("status") ? (
                    <SortTh label={copy.status} active={sortKey === "status"} dir={sortDir} onClick={() => onSort("status")} hex={hex} />
                  ) : null}
                  {on.has("p60") ? (
                    <SortTh label={copy.p60} active={sortKey === "p60"} dir={sortDir} onClick={() => onSort("p60")} hex={hex} />
                  ) : null}
                  {on.has("minutes") ? (
                    <SortTh label={copy.minutes} active={sortKey === "minutes"} dir={sortDir} onClick={() => onSort("minutes")} hex={hex} />
                  ) : null}
                  {on.has("xpts")
                    ? gwHeaders.map((gw) => (
                        <SortTh
                          key={gw.gw}
                          label={`GW${gw.gw}`}
                          title={`${copy.xpts} GW${gw.gw}`}
                          active={sortKey === `xpts:${gw.gw}`}
                          dir={sortDir}
                          onClick={() => onSort(`xpts:${gw.gw}`)}
                          hex={hex}
                        />
                      ))
                    : null}
                  {on.has("xpts") ? (
                    <SortTh label={copy.sum} title={copy.sum} active={sortKey === "xptsSum"} dir={sortDir} onClick={() => onSort("xptsSum")} hex={hex} />
                  ) : null}
                  {on.has("goal") ? (
                    <th className="px-2 py-2 text-[11px] font-black" title={copy.dashGoal}>
                      {copy.goal}
                    </th>
                  ) : null}
                  {on.has("assist") ? (
                    <th className="px-2 py-2 text-[11px] font-black" title={copy.dashAssist}>
                      {copy.assist}
                    </th>
                  ) : null}
                  {on.has("cs") ? (
                    <SortTh label={copy.cs} title={copy.dashCsPosition} active={sortKey === "cs"} dir={sortDir} onClick={() => onSort("cs")} hex={hex} />
                  ) : null}
                  {on.has("fdr") ? (
                    <SortTh label={copy.fdr} active={sortKey === "fdr"} dir={sortDir} onClick={() => onSort("fdr")} hex={hex} />
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {views.map((view) => (
                  <PlayerRow
                    key={view.row.elementId}
                    view={view}
                    lang={lang}
                    columns={on}
                    copy={copy}
                    card={hex.card}
                    isLight={themeId === "ANALYST_LIGHT"}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className={`px-3 py-2 text-center text-[11px] font-bold ${chrome.mutedLabel}`}>
          {copy.footer}
        </p>
      </div>
    </div>
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
    overflow: node.style.overflow,
    overflowX: node.style.overflowX,
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
      node.style.overflow = "visible";
      node.style.overflowX = "visible";
      for (const el of Array.from(
        node.querySelectorAll<HTMLElement>(
          "[data-player-projections-table-wrap], .overflow-x-auto",
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
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    return await run();
  } finally {
    node.style.width = prev.width;
    node.style.minWidth = prev.minWidth;
    node.style.maxWidth = prev.maxWidth;
    node.style.overflow = prev.overflow;
    node.style.overflowX = prev.overflowX;
    for (const wrapper of wrappers) {
      wrapper.el.style.overflow = wrapper.overflow;
      wrapper.el.style.overflowX = wrapper.overflowX;
      wrapper.el.style.overflowY = wrapper.overflowY;
    }
  }
}

function SortTh({
  label,
  title,
  active,
  dir,
  onClick,
  sticky = false,
  hex,
}: {
  label: string;
  title?: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  sticky?: boolean;
  hex: { card: string; text: string };
}) {
  return (
    <th
      className={`px-2 py-2 text-left ${sticky ? "sticky left-0 z-10" : ""}`}
      style={sticky ? { background: hex.card } : undefined}
    >
      <button
        type="button"
        title={title ?? label}
        onClick={onClick}
        className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap text-[11px] font-black"
        style={{ color: hex.text }}
      >
        {label}
        {active ? (dir === "desc" ? " ↓" : " ↑") : ""}
      </button>
    </th>
  );
}

function PlayerRow({
  view,
  lang,
  columns,
  copy,
  card,
  isLight,
}: {
  view: PlayerProjectionViewRow;
  lang: StatsLabLang;
  columns: Set<PlayerProjectionColumnId>;
  copy: PlayerProjectionCopy;
  card: string;
  isLight: boolean;
}) {
  const row = view.row;
  const marker = mapAvailabilityMarker({
    status: row.status,
    chanceOfPlayingNextRound: row.chanceNext,
    chanceOfPlayingThisRound: row.chanceThis,
    news: row.news,
    newsAdded: row.newsAdded,
  });
  return (
    <tr className="border-t border-slate-500/20">
      <td className="sticky left-0 z-10 px-2 py-2" style={{ background: card }}>
        <div className="flex items-center gap-1.5">
          {row.clubPulseCode ? (
            <img
              src={fplLabBadgeUrl(row.clubPulseCode)}
              alt=""
              crossOrigin="anonymous"
              className="h-4 w-4 shrink-0 object-contain"
            />
          ) : null}
          <span className="whitespace-nowrap text-[13px] font-bold">
            {row.webName}
          </span>
          <AvailabilityBadge marker={marker} lang={lang} compact />
          <span className="whitespace-nowrap text-[10px] font-semibold opacity-70">
            {positionCode(row.position)} · {row.clubShort}
          </span>
        </div>
      </td>
      {columns.has("price") ? (
        <td className="whitespace-nowrap px-2 py-2 text-[12px] tabular-nums">
          {formatTenthsAsPounds(row.priceTenths)}
        </td>
      ) : null}
      {columns.has("own") ? (
        <td className="px-2 py-2 text-[12px] tabular-nums">
          {row.ownership.toFixed(1)}%
        </td>
      ) : null}
      {columns.has("status") ? (
        <td className="px-2 py-2">
          <AvailabilityBadge marker={marker} lang={lang} compact />
        </td>
      ) : null}
      {columns.has("p60") ? (
        <td className="px-2 py-2 text-[12px] tabular-nums" title={copy.p60}>
          {view.playChancePct == null ? "—" : `${view.playChancePct}%`}
        </td>
      ) : null}
      {columns.has("minutes") ? (
        <td className="px-2 py-2 text-[12px] tabular-nums">{view.minutes}</td>
      ) : null}
      {columns.has("xpts")
        ? view.horizonGws.map((gw) => (
            <td
              key={gw.gw}
              className="px-2 py-2 text-[12px] tabular-nums"
              title={gw.isBlank ? copy.dashBlank : formatOpponentCell(gw)}
            >
              {formatXptsCell(gw)}
            </td>
          ))
        : null}
      {columns.has("xpts") ? (
        <td className="px-2 py-2 text-[12px] font-black tabular-nums">
          {view.xptsSum.toFixed(1)}
        </td>
      ) : null}
      {columns.has("goal") ? (
        <td className="px-2 py-2 text-[12px]" title={copy.dashGoal}>
          —
        </td>
      ) : null}
      {columns.has("assist") ? (
        <td className="px-2 py-2 text-[12px]" title={copy.dashAssist}>
          —
        </td>
      ) : null}
      {columns.has("cs") ? (
        <td
          className="whitespace-nowrap px-2 py-2 text-[12px]"
          title={
            row.position === 1 || row.position === 2
              ? copy.dashCsMissing
              : copy.dashCsPosition
          }
        >
          {formatCsText(row.position, view.horizonGws)}
        </td>
      ) : null}
      {columns.has("fdr") ? (
        <td className="whitespace-nowrap px-2 py-2 text-[12px]">
          <span className="inline-flex flex-wrap items-center gap-1">
            {view.horizonGws.length === 0 ? "—" : null}
            {view.horizonGws.map((gw) => {
              const text = formatFdrCell(gw);
              if (text === "—") {
                return (
                  <span key={gw.gw} title={copy.dashBlank}>
                    —
                  </span>
                );
              }
              return gw.opponents.map((name, index) => {
                const level = gw.fdrLevels[index];
                const label = level == null ? name : `${name} ${level}`;
                return (
                  <span
                    key={`${gw.gw}-${index}`}
                    className={
                      level == null
                        ? "font-semibold"
                        : `inline-flex items-center rounded border px-1 py-0.5 font-bold ${fdrPillClass(level, isLight)}`
                    }
                  >
                    {label}
                  </span>
                );
              });
            })}
          </span>
        </td>
      ) : null}
    </tr>
  );
}
