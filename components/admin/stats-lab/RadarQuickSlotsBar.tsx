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

const SLOT_COLORS = ["#4ade80", "#38bdf8", "#fbbf24", "#fb7185"] as const;

type Props = {
  bootstrap: StatsLabBootstrapData;
  plottedPlayers: PlottedStatsLabPlayer[];
  spotlightId: number | null;
  lang: StatsLabLang;
  positionFilter: number[];
  onAssignIds: (ids: number[]) => void;
  onSpotlight: (id: number) => void;
  onResetAutoTop4: () => void;
};

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
  const [photoFailed, setPhotoFailed] = useState(false);
  const [badgeFailed, setBadgeFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative shrink-0">
      <div
        className="h-12 w-12 overflow-hidden rounded-full border-2 bg-slate-900/70"
        style={{ borderColor: stroke }}
      >
        {photoFailed || playerCode <= 0 ? (
          <div
            className="flex h-full w-full items-center justify-center text-[11px] font-black"
            style={{ color: stroke }}
          >
            {initials || "?"}
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fplLabPlayerPhotoUrl(playerCode)}
            alt={name}
            crossOrigin="anonymous"
            className="h-full w-full object-cover object-top"
            onError={() => setPhotoFailed(true)}
          />
        )}
      </div>
      <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white p-0.5 shadow">
        {badgeFailed || clubPulseCode <= 0 ? (
          <span className="text-[7px] font-black text-slate-600">
            {clubShort.slice(0, 2)}
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fplLabBadgeUrl(clubPulseCode)}
            alt={clubShort}
            crossOrigin="anonymous"
            className="h-full w-full object-contain"
            onError={() => setBadgeFailed(true)}
          />
        )}
      </span>
    </div>
  );
}

function SlotSearch({
  slotIndex,
  bootstrap,
  positionFilter,
  occupiedIds,
  lang,
  placeholder,
  onPick,
}: {
  slotIndex: number;
  bootstrap: StatsLabBootstrapData;
  positionFilter: number[];
  occupiedIds: Set<number>;
  lang: StatsLabLang;
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
        className="w-full rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1.5 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-emerald-500"
        aria-label={`Radar slot ${slotIndex + 1} search`}
      />
      {open && suggestions.length > 0 ? (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-950 shadow-xl">
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
                      : "hover:bg-slate-900"
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
                    <span className="h-4 w-4 rounded bg-slate-800" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="font-bold text-white">{p.web_name}</span>
                    <span className="text-slate-500">
                      {" "}
                      · {club?.short ?? "—"} ·{" "}
                      {getFplPositionLabelEn(p.element_type)}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-400">
                    £{(Number(p.now_cost) / 10).toFixed(1)}m
                  </span>
                  <span className="shrink-0 font-bold tabular-nums text-[#39FF14]">
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
  positionFilter,
  onAssignIds,
  onSpotlight,
  onResetAutoTop4,
}: Props) {
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
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          {lang === "pl"
            ? "Szybkie sloty radaru (max 4) — poza eksportem PNG"
            : "Radar quick slots (max 4) — outside PNG export"}
        </p>
        <button
          type="button"
          onClick={onResetAutoTop4}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:border-[#39FF14] hover:text-[#39FF14]"
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
              className="flex flex-col justify-between gap-2.5 rounded-xl border border-slate-800 bg-slate-900/90 p-3"
              style={{ borderTopWidth: 3, borderTopColor: color }}
            >
              {/* Poziom 1 — pasek narzędzi */}
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
                    <span className="text-xs font-semibold text-slate-300">
                      {clubShort} · {pos} · £{price}m · {pts}{" "}
                      {lang === "pl" ? "pkt" : "pts"}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500">
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
                        isPizza
                          ? "bg-amber-500/25 text-amber-200 ring-1 ring-amber-400"
                          : "text-slate-300 hover:bg-slate-800"
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
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Poziom 2 — bohater: duże zdjęcie + pełne nazwisko */}
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
                    <p className="text-[16px] font-black leading-snug text-white">
                      {player.web_name}
                    </p>
                    <p className="text-[11px] font-medium text-slate-400">
                      {lang === "pl" ? "Posiadanie" : "Ownership"}:{" "}
                      {ownership.toFixed(1)}% · Composite:{" "}
                      {player.compositeScore.toFixed(1)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[52px] items-center gap-3 py-0.5">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-dashed text-xs font-black text-slate-600"
                    style={{ borderColor: `${color}66` }}
                  >
                    +
                  </div>
                  <p className="text-sm font-bold text-slate-500">
                    {lang === "pl"
                      ? `Dodaj gracza do slotu #${slotIndex + 1}`
                      : `Add player to slot #${slotIndex + 1}`}
                  </p>
                </div>
              )}

              {/* Poziom 3 — wyszukiwarka */}
              <SlotSearch
                slotIndex={slotIndex}
                bootstrap={bootstrap}
                positionFilter={positionFilter}
                occupiedIds={occupiedIds}
                lang={lang}
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
