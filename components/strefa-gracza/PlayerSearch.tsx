"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { ClubCrest } from "@/components/na-minusie/hub/ClubCrest";
import type { PlayerSearchEntry } from "@/lib/public/playerZoneTypes";
import { dedupePlayerSearchEntries } from "@/lib/public/dedupePlayers";

function normalizeQuery(q: string) {
  return q.trim().toLowerCase();
}

function matchesPlayer(p: PlayerSearchEntry, q: string) {
  if (!q) return true;
  const haystack = [
    p.discord_nick,
    p.fpl_team_name,
    p.manager_name,
    p.chosen_club,
    p.divisionName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function PlayerSearch({
  players,
  logos,
  onNavigate,
}: {
  players: PlayerSearchEntry[];
  logos: ClubLogoRecord[];
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const normalized = normalizeQuery(query);

  const uniquePlayers = useMemo(
    () => dedupePlayerSearchEntries(players),
    [players],
  );

  const filtered = useMemo(
    () => uniquePlayers.filter((p) => matchesPlayer(p, normalized)).slice(0, 12),
    [uniquePlayers, normalized],
  );

  const navigate = useCallback(
    (teamId: string) => {
      setOpen(false);
      setQuery("");
      onNavigate?.();
      router.push(`/strefa-gracza/gracz/${teamId}`);
    },
    [router, onNavigate],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [normalized]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[activeIndex]) {
      e.preventDefault();
      navigate(filtered[activeIndex].teamId);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-3xl">
      <div
        className={`group flex items-center gap-3 rounded-2xl border bg-slate-900/80 px-4 py-3 shadow-[0_0_40px_-12px_rgba(56,189,248,0.25)] backdrop-blur-xl transition-all duration-300 ${
          open
            ? "border-sky-500/50 ring-2 ring-sky-500/20"
            : "border-slate-700/80 hover:border-slate-600"
        }`}
      >
        <Search
          className={`h-5 w-5 shrink-0 transition-colors ${open ? "text-sky-400" : "text-slate-500"}`}
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="🔍 Wyszukaj swój klub, Discord Nick lub nazwę FPL..."
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none sm:text-base"
          aria-label="Wyszukaj gracza"
          aria-expanded={open}
          aria-controls="player-search-listbox"
          aria-autocomplete="list"
          role="combobox"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
            aria-label="Wyczyść"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {open && filtered.length > 0 ? (
        <ul
          id="player-search-listbox"
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-700/90 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl"
        >
          {filtered.map((p, i) => {
            const label = p.fpl_team_name?.trim() || p.manager_name;
            const isActive = i === activeIndex;
            return (
              <li key={p.teamId} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => navigate(p.teamId)}
                  className={`flex w-full items-stretch gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ${
                    isActive
                      ? "bg-sky-500/15 ring-1 ring-sky-500/30"
                      : "hover:bg-slate-800/80"
                  }`}
                >
                  <span className="flex w-11 shrink-0 items-center justify-center self-stretch sm:w-12">
                    <ClubCrest
                      clubName={p.chosen_club}
                      logos={logos}
                      size="fill"
                      className="!h-full !w-full !min-h-0"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-white">{label}</span>
                    <span className="block truncate text-xs text-slate-400">
                      {p.discord_nick}
                      {p.chosen_club ? ` · ${p.chosen_club}` : ""}
                    </span>
                  </span>
                  <span className="hidden shrink-0 rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:inline">
                    {p.divisionName}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {open && normalized && filtered.length === 0 ? (
        <div className="absolute left-0 right-0 z-50 mt-2 rounded-2xl border border-slate-700/90 bg-slate-900/95 px-4 py-6 text-center text-sm text-slate-400 backdrop-blur-xl">
          Brak wyników dla „{query.trim()}”.
        </div>
      ) : null}
    </div>
  );
}
