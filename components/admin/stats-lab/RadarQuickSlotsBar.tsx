"use client";

import { useMemo, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import type {
  PlottedStatsLabPlayer,
  StatsLabBootstrapData,
  StatsLabBootstrapPlayer,
} from "@/lib/stats-lab/analyticsEngine";
import type { StatsLabLang } from "@/lib/stats-lab/i18n";
import { getFplPositionLabelEn } from "@/lib/stats-lab/types";
import {
  fplLabBadgeUrl,
  fplLabPlayerPhotoUrl,
} from "@/lib/stats-lab/mediaUrls";
import type { StatsLabChartThemeId } from "@/components/admin/stats-lab/chartTheme";

const SLOT_COLORS = ["#4ade80", "#38bdf8", "#fbbf24", "#fb7185"] as const;

type Props = {
  bootstrap: StatsLabBootstrapData;
  plottedPlayers: PlottedStatsLabPlayer[];
  spotlightId: number | null;
  lang: StatsLabLang;
  themeId: StatsLabChartThemeId;
  positionFilter: number[];
  onAssignIds: (ids: number[]) => void;
  onSpotlight: (id: number) => void;
  onResetAutoTop4: () => void;
};

type SlotChrome = {
  card: string;
  meta: string;
  name: string;
  title: string;
  empty: string;
  resetBtn: string;
  searchInput: string;
  dropdown: string;
  dropdownItem: string;
  dropdownName: string;
  dropdownMeta: string;
  pizzaIdle: string;
  pizzaActive: string;
};

function slotChrome(themeId: StatsLabChartThemeId): SlotChrome {
  if (themeId === "ANALYST_LIGHT") {
    return {
      card: "bg-white border-slate-300 text-slate-900 shadow-sm",
      meta: "text-slate-600",
      name: "text-slate-900",
      title: "text-slate-600",
      empty: "text-slate-500",
      resetBtn:
        "border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200",
      searchInput:
        "border border-slate-300 bg-slate-100 text-slate-800 placeholder:text-slate-500 hover:bg-slate-200 focus:border-emerald-600",
      dropdown: "border border-slate-300 bg-white shadow-xl",
      dropdownItem: "hover:bg-slate-100",
      dropdownName: "text-slate-900",
      dropdownMeta: "text-slate-500",
      pizzaIdle: "text-slate-600 hover:bg-slate-100",
      pizzaActive: "bg-amber-100 text-amber-900 ring-1 ring-amber-400",
    };
  }
  if (themeId === "SCOUT_DARK") {
    return {
      card: "bg-[#09222a] border-teal-800/80 text-teal-50",
      meta: "text-teal-200/80",
      name: "text-teal-50",
      title: "text-teal-200/80",
      empty: "text-teal-400/70",
      resetBtn:
        "border border-teal-700 bg-[#0d2d37] text-teal-100 hover:bg-teal-900/60",
      searchInput:
        "border border-teal-700 bg-[#06181e] text-teal-100 placeholder:text-teal-500 hover:bg-[#0d2d37] focus:border-emerald-400",
      dropdown: "border border-teal-700 bg-[#06181e] shadow-xl",
      dropdownItem: "hover:bg-[#0d2d37]",
      dropdownName: "text-teal-50",
      dropdownMeta: "text-teal-400",
      pizzaIdle: "text-teal-200 hover:bg-teal-900/50",
      pizzaActive: "bg-amber-500/25 text-amber-200 ring-1 ring-amber-400",
    };
  }
  return {
    card: "bg-[#0c1322] border-slate-800 text-slate-100",
    meta: "text-slate-400",
    name: "text-slate-100",
    title: "text-slate-400",
    empty: "text-slate-500",
    resetBtn:
      "border border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-900",
    searchInput:
      "border border-slate-700 bg-slate-950 text-slate-200 placeholder:text-slate-500 hover:bg-slate-900 focus:border-emerald-500",
    dropdown: "border border-slate-700 bg-slate-950 shadow-xl",
    dropdownItem: "hover:bg-slate-900",
    dropdownName: "text-white",
    dropdownMeta: "text-slate-500",
    pizzaIdle: "text-slate-300 hover:bg-slate-800",
    pizzaActive: "bg-amber-500/25 text-amber-200 ring-1 ring-amber-400",
  };
}

function positionShortPl(elementType: number): string {
  const map: Record<number, string> = {
    1: "BR",
    2: "OBR",
    3: "POM",
    4: "NAP",
  };
  return map[elementType] ?? getFplPositionLabelEn(elementType as 1 | 2 | 3 | 4);
}

function SlotHeroPhoto({
  playerCode,
  name,
  stroke,
  clubPulseCode,
  clubShort,
}: {
  playerCode: number;
  name: string;
  stroke: string;
  clubPulseCode: number;
  clubShort: string;
}) {
  return (
    <div className="relative shrink-0">
      <div
        className="h-12 w-12 overflow-hidden rounded-full border-2 bg-black/20"
        style={{ borderColor: stroke }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fplLabPlayerPhotoUrl(playerCode)}
          alt={name}
          crossOrigin="anonymous"
          className="h-full w-full object-cover object-top"
        />
      </div>
      {clubPulseCode > 0 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fplLabBadgeUrl(clubPulseCode)}
          alt={clubShort}
          crossOrigin="anonymous"
          className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-black/40 object-contain p-0.5"
        />
      ) : null}
    </div>
  );
}

function SlotSearch({
  slotIndex,
  bootstrap,
  positionFilter,
  occupiedIds,
  lang,
  chrome,
  placeholder,
  onPick,
}: {
  slotIndex: number;
  bootstrap: StatsLabBootstrapData;
  positionFilter: number[];
  occupiedIds: Set<number>;
  lang: StatsLabLang;
  chrome: SlotChrome;
  placeholder: string;
  onPick: (id: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const clubById = useMemo(() => {
    const m = new Map<number, { short: string; pulse: number }>();
    for (const c of bootstrap.clubs) {
      m.set(c.fpl_team_id, {
        short: c.short_name,
        pulse: Number(c.pulse_code ?? 0),
      });
    }
    return m;
  }, [bootstrap.clubs]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!open && q.length < 1) return [] as StatsLabBootstrapPlayer[];
    let list = bootstrap.players;
    if (positionFilter.length > 0) {
      list = list.filter((p) => positionFilter.includes(p.element_type));
    }
    if (q.length >= 1) {
      list = list.filter((p) => {
        const club = (clubById.get(p.fpl_team_id)?.short ?? "").toLowerCase();
        return (
          p.web_name.toLowerCase().includes(q) ||
          p.second_name.toLowerCase().includes(q) ||
          p.first_name.toLowerCase().includes(q) ||
          club.includes(q)
        );
      });
    }
    return [...list]
      .sort(
        (a, b) =>
          Number(b.total_points ?? 0) - Number(a.total_points ?? 0),
      )
      .slice(0, 8);
  }, [bootstrap.players, clubById, open, positionFilter, query]);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 160);
        }}
        placeholder={placeholder}
        className={`w-full rounded-lg px-2.5 py-1.5 text-xs outline-none ${chrome.searchInput}`}
        aria-label={`Radar slot ${slotIndex + 1} search`}
      />
      {open && suggestions.length > 0 ? (
        <ul
          className={`absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg ${chrome.dropdown}`}
        >
          {suggestions.map((p) => {
            const club = clubById.get(p.fpl_team_id);
            const already = occupiedIds.has(p.fpl_element_id);
            return (
              <li key={p.fpl_element_id}>
                <button
                  type="button"
                  disabled={already}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (already) return;
                    onPick(p.fpl_element_id);
                    setQuery("");
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-2.5 py-2 text-left text-[11px] ${
                    already
                      ? "cursor-not-allowed opacity-40"
                      : chrome.dropdownItem
                  }`}
                >
                  {club && club.pulse > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fplLabBadgeUrl(club.pulse)}
                      alt={club.short}
                      crossOrigin="anonymous"
                      className="h-4 w-4 object-contain"
                    />
                  ) : (
                    <span className="h-4 w-4 rounded bg-slate-500/30" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={`font-bold ${chrome.dropdownName}`}>
                      {p.web_name}
                    </span>
                    <span className={chrome.dropdownMeta}>
                      {" "}
                      · {club?.short ?? "—"} ·{" "}
                      {getFplPositionLabelEn(p.element_type)}
                    </span>
                  </span>
                  <span className={`shrink-0 tabular-nums ${chrome.dropdownMeta}`}>
                    £{(Number(p.now_cost) / 10).toFixed(1)}m
                  </span>
                  <span className="shrink-0 font-bold tabular-nums text-emerald-500">
                    {Number(p.total_points ?? 0)}
                    {lang === "pl" ? " pkt" : " pts"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function RadarQuickSlotsBar({
  bootstrap,
  plottedPlayers,
  spotlightId,
  lang,
  themeId,
  positionFilter,
  onAssignIds,
  onSpotlight,
  onResetAutoTop4,
}: Props) {
  const chrome = slotChrome(themeId);
  const currentRadarPlayers = plottedPlayers.slice(0, 4);
  const occupiedIds = useMemo(
    () => new Set(currentRadarPlayers.map((p) => p.fpl_element_id)),
    [currentRadarPlayers],
  );

  function pickIntoSlot(slotIndex: number, pickedId: number) {
    const nextIds = currentRadarPlayers.map((p) => p.fpl_element_id);
    if (nextIds.includes(pickedId)) return;
    if (slotIndex < nextIds.length) {
      nextIds[slotIndex] = pickedId;
    } else {
      nextIds.push(pickedId);
    }
    onAssignIds(nextIds);
  }

  function removeFromSlot(slotIndex: number) {
    const player = currentRadarPlayers[slotIndex];
    if (!player) return;
    const nextIds = currentRadarPlayers
      .map((p) => p.fpl_element_id)
      .filter((id) => id !== player.fpl_element_id);
    onAssignIds(nextIds);
  }

  return (
    <div className="mb-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={`text-[10px] font-black uppercase tracking-wider ${chrome.title}`}
        >
          {lang === "pl"
            ? "Szybkie sloty radaru (max 4) — poza eksportem PNG"
            : "Radar quick slots (max 4) — outside PNG export"}
        </p>
        <button
          type="button"
          onClick={onResetAutoTop4}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${chrome.resetBtn}`}
        >
          <RotateCcw className="h-3 w-3" />
          {lang === "pl" ? "Resetuj do AUTO Top 4" : "Reset to AUTO Top 4"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((slotIndex) => {
          const color = SLOT_COLORS[slotIndex]!;
          const player = currentRadarPlayers[slotIndex];
          const isPizza = player
            ? player.fpl_element_id === spotlightId
            : false;
          const clubShort = player?.club?.short_name ?? "—";
          const pos =
            player != null
              ? lang === "pl"
                ? positionShortPl(player.element_type)
                : getFplPositionLabelEn(player.element_type)
              : "";
          const price =
            player != null
              ? (Number(player.rawValues.now_cost) / 10).toFixed(1)
              : "";
          const pts =
            player != null
              ? Math.round(Number(player.rawValues.total_points ?? 0))
              : 0;
          const ownership =
            player != null
              ? Number(player.rawValues.selected_by_percent ?? 0)
              : 0;

          return (
            <div
              key={slotIndex}
              className={`flex flex-col justify-between gap-2.5 rounded-xl border p-3 ${chrome.card}`}
              style={{ borderTopWidth: 3, borderTopColor: color }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span
                    className="rounded px-2 py-0.5 text-xs font-black"
                    style={{
                      background: `${color}22`,
                      color,
                      border: `1px solid ${color}`,
                    }}
                  >
                    #{slotIndex + 1}
                  </span>
                  {player ? (
                    <span className={`text-xs font-semibold ${chrome.meta}`}>
                      {clubShort} · {pos} · £{price}m · {pts}{" "}
                      {lang === "pl" ? "pkt" : "pts"}
                    </span>
                  ) : (
                    <span className={`text-xs font-semibold ${chrome.empty}`}>
                      {lang === "pl" ? "Wolne miejsce" : "Empty slot"}
                    </span>
                  )}
                </div>
                {player ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      title={
                        lang === "pl"
                          ? "Ustaw jako Pizzę / Spotlight"
                          : "Set as Pizza / Spotlight"
                      }
                      onClick={() => onSpotlight(player.fpl_element_id)}
                      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition-all ${
                        isPizza ? chrome.pizzaActive : chrome.pizzaIdle
                      }`}
                    >
                      {isPizza
                        ? lang === "pl"
                          ? "🍕 Pizza"
                          : "🍕 Pizza"
                        : "🍕"}
                    </button>
                    <button
                      type="button"
                      title={lang === "pl" ? "Usuń" : "Remove"}
                      onClick={() => removeFromSlot(slotIndex)}
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-rose-400 hover:bg-rose-500/10"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>

              {player ? (
                <div className="flex items-center gap-3 py-0.5">
                  <SlotHeroPhoto
                    playerCode={player.playerCode}
                    name={player.web_name}
                    stroke={color}
                    clubPulseCode={player.clubPulseCode}
                    clubShort={clubShort}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[16px] font-black leading-snug ${chrome.name}`}
                    >
                      {player.web_name}
                    </p>
                    <p className={`text-[11px] font-medium ${chrome.meta}`}>
                      {lang === "pl" ? "Posiadanie" : "Ownership"}:{" "}
                      {ownership.toFixed(1)}% ·{" "}
                      {lang === "pl" ? "OCENA" : "RATING"}:{" "}
                      {Math.round(player.compositeScore)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[52px] items-center gap-3 py-0.5">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-dashed text-xs font-black opacity-60"
                    style={{ borderColor: `${color}66` }}
                  >
                    +
                  </div>
                  <p className={`text-sm font-bold ${chrome.empty}`}>
                    {lang === "pl"
                      ? `Dodaj gracza do slotu #${slotIndex + 1}`
                      : `Add player to slot #${slotIndex + 1}`}
                  </p>
                </div>
              )}

              <SlotSearch
                slotIndex={slotIndex}
                bootstrap={bootstrap}
                positionFilter={positionFilter}
                occupiedIds={occupiedIds}
                lang={lang}
                chrome={chrome}
                placeholder={
                  player
                    ? lang === "pl"
                      ? "🔍 Zmień gracza..."
                      : "🔍 Change player..."
                    : lang === "pl"
                      ? "🔍 + Dodaj gracza do slotu..."
                      : "🔍 + Add player to slot..."
                }
                onPick={(id) => pickIntoSlot(slotIndex, id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
