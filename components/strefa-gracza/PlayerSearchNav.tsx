"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { PlayerSearch } from "@/components/strefa-gracza/PlayerSearch";
import { getPlayerSearchList } from "@/lib/public/playerZone";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { PlayerSearchEntry } from "@/lib/public/playerZoneTypes";

export function PlayerSearchNav() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<PlayerSearchEntry[]>([]);
  const [logos, setLogos] = useState<ClubLogoRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const data = await getPlayerSearchList();
      setPlayers(data.players);
      setLogos(data.logos);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [loaded, loading]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 transition-colors hover:border-sky-500/40 hover:text-sky-300 sm:px-3 sm:text-xs"
        aria-label="Szukaj gracza"
      >
        <Search className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">Szukaj gracza</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 p-4 pt-24 sm:pt-28"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="player-search-nav-title"
            className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2
                  id="player-search-nav-title"
                  className="text-lg font-bold text-white"
                >
                  Wyszukaj gracza
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Discord, nazwa drużyny FPL lub menedżer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Zamknij"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loading && !loaded ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin text-sky-400" />
                Ładowanie listy graczy…
              </div>
            ) : (
              <PlayerSearch
                players={players}
                logos={logos}
                onNavigate={() => setOpen(false)}
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
