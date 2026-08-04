"use client";

import { useCallback, useEffect, useMemo, useReducer, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Trash2,
  Trophy,
  UserPlus,
} from "lucide-react";
import {
  finalizeSeasonTransition,
  loadSeasonDraftBoard,
  markSeasonCompleted,
  type LoadDraftBoardResult,
} from "@/app/admin/actions/seasonTransition";
import {
  addNewPlayerToDraft,
  applyResignation,
  assignWaitingPlayerToTier,
  DRAFT_TARGET_SIZE,
  isBoardBalanced,
  promoteWaitingRoomToNewTier,
  toSerializableDraft,
  type DraftBoardState,
} from "@/lib/admin/seasonDraft";
import { teamSeasonStatusLabel } from "@/lib/admin/endSeasonStatuses";
import type { Season } from "@/lib/admin/types";

type BoardAction =
  | { type: "RESET" }
  | { type: "SET"; board: DraftBoardState }
  | { type: "RESIGN"; tempId: string }
  | { type: "PROMOTE_WAITING" }
  | { type: "ASSIGN_WAITING"; tempId: string; tier: number }
  | {
      type: "ADD_NEW";
      input: {
        manager_name: string;
        discord_nick: string;
        chosen_club: string;
        fpl_id?: string;
        fpl_team_name?: string;
      };
    };

function boardReducer(
  state: DraftBoardState | null,
  action: BoardAction,
): DraftBoardState | null {
  if (action.type === "RESET") return null;
  if (action.type === "SET") return action.board;
  if (!state) return state;
  if (action.type === "RESIGN") return applyResignation(state, action.tempId);
  if (action.type === "ADD_NEW") return addNewPlayerToDraft(state, action.input);
  if (action.type === "PROMOTE_WAITING") {
    const next = promoteWaitingRoomToNewTier(state);
    if ("error" in next) return state;
    return next;
  }
  if (action.type === "ASSIGN_WAITING") {
    const next = assignWaitingPlayerToTier(state, action.tempId, action.tier);
    if ("error" in next) return state;
    return next;
  }
  return state;
}

export function SeasonTransitionBoard({ seasons }: { seasons: Season[] }) {
  const router = useRouter();
  const activeSeasons = useMemo(
    () => seasons.filter((s) => !s.is_archived),
    [seasons],
  );
  const [seasonId, setSeasonId] = useState(
    activeSeasons.find((s) => s.status === "PUBLISHED")?.id ??
      activeSeasons[0]?.id ??
      "",
  );
  const [pyramidId, setPyramidId] = useState("");
  const [pyramids, setPyramids] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [seasonMeta, setSeasonMeta] = useState<LoadDraftBoardResult["season"]>();
  const [board, dispatch] = useReducer(boardReducer, null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [newManager, setNewManager] = useState("");
  const [newDiscord, setNewDiscord] = useState("");
  const [newClub, setNewClub] = useState("");
  const [newFplId, setNewFplId] = useState("");
  const [newFplTeam, setNewFplTeam] = useState("");
  const [nextName, setNextName] = useState("");

  const reload = useCallback(
    (sid: string, pid?: string) => {
      setError(null);
      setInfo(null);
      startTransition(async () => {
        const r = await loadSeasonDraftBoard(sid, pid);
        setSeasonMeta(r.season);
        setPyramids(r.pyramids ?? []);
        if (r.error) {
          setError(r.error);
          if (r.board) dispatch({ type: "SET", board: r.board });
          else dispatch({ type: "RESET" });
          return;
        }
        if (r.board) {
          dispatch({ type: "SET", board: r.board });
          setPyramidId(r.board.pyramidId);
          setNextName(r.board.suggestedNextSeasonName);
        } else {
          dispatch({ type: "RESET" });
        }
      });
    },
    [],
  );

  useEffect(() => {
    if (seasonId) reload(seasonId, pyramidId || undefined);
  }, [seasonId]); // eslint-disable-line react-hooks/exhaustive-deps

  const balanced = board ? isBoardBalanced(board) : false;

  const incompleteColumns = useMemo(
    () =>
      (board?.columns ?? []).filter((c) => c.players.length < DRAFT_TARGET_SIZE),
    [board],
  );

  function onResign(tempId: string) {
    if (!window.confirm("Oznaczyć gracza jako rezygnację i uruchomić kaskadę?")) {
      return;
    }
    dispatch({ type: "RESIGN", tempId });
  }

  function onAssignWaiting(tempId: string, tier: number) {
    if (!board) return;
    const next = assignWaitingPlayerToTier(board, tempId, tier);
    if ("error" in next) {
      window.alert(next.error);
      return;
    }
    dispatch({ type: "ASSIGN_WAITING", tempId, tier });
  }

  function onAddNew(e: React.FormEvent) {
    e.preventDefault();
    if (!newManager.trim() || !newDiscord.trim()) {
      window.alert("Podaj menedżera i Discord nick.");
      return;
    }
    dispatch({
      type: "ADD_NEW",
      input: {
        manager_name: newManager,
        discord_nick: newDiscord,
        chosen_club: newClub || "TBD",
        fpl_id: newFplId || undefined,
        fpl_team_name: newFplTeam || undefined,
      },
    });
    setNewManager("");
    setNewDiscord("");
    setNewClub("");
    setNewFplId("");
    setNewFplTeam("");
  }

  function onMarkCompleted() {
    if (!seasonId) return;
    startTransition(async () => {
      const r = await markSeasonCompleted(seasonId);
      if (r.error) setError(r.error);
      else {
        setInfo(r.success ?? "OK");
        reload(seasonId, pyramidId || undefined);
      }
    });
  }

  function onFinalize() {
    if (!board || !balanced) return;
    if (
      !window.confirm(
        `Zarchiwizować „${board.seasonName}” i utworzyć „${nextName || board.suggestedNextSeasonName}”? Tej operacji nie da się łatwo cofnąć.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const payload = toSerializableDraft({
        ...board,
        suggestedNextSeasonName: nextName || board.suggestedNextSeasonName,
      });
      const r = await finalizeSeasonTransition(payload);
      if (r.error) {
        setError(r.error);
        return;
      }
      setInfo(r.success ?? "Gotowe");
      router.push("/admin/workspace");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900 to-[#0B0F19] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">
              End of Season · Etap 3
            </p>
            <h1 className="mt-1 font-athletic text-2xl uppercase text-white sm:text-3xl">
              Rozliczenie Sezonu (Kaskady)
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Tablica draftu nowego układu dywizji. Rezygnacje uruchamiają awanse
              kaskadowe. Przy 10/10 w każdej kolumnie generujesz nowy sezon + Berger.
            </p>
          </div>
          <Trophy className="h-10 w-10 text-amber-400/80" />
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
              Sezon
            </span>
            <select
              value={seasonId}
              onChange={(e) => {
                setSeasonId(e.target.value);
                setPyramidId("");
              }}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              {activeSeasons.length === 0 ? (
                <option value="">Brak aktywnych sezonów</option>
              ) : (
                activeSeasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.is_completed ? " · completed" : ""}
                  </option>
                ))
              )}
            </select>
          </label>

          {pyramids.length > 1 ? (
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                Piramida
              </span>
              <select
                value={pyramidId}
                onChange={(e) => {
                  setPyramidId(e.target.value);
                  reload(seasonId, e.target.value);
                }}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                {pyramids.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <button
            type="button"
            disabled={pending || !seasonId}
            onClick={() => reload(seasonId, pyramidId || undefined)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-3 py-2 text-xs font-bold uppercase text-slate-300 disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
            Odśwież
          </button>

          {seasonMeta && !seasonMeta.is_completed ? (
            <button
              type="button"
              disabled={pending}
              onClick={onMarkCompleted}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold uppercase text-emerald-300 disabled:opacity-40"
            >
              <Archive className="h-3.5 w-3.5" />
              Opublikuj Podsumowanie
            </button>
          ) : null}
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
          {info}
        </p>
      ) : null}

      {pending && !board ? (
        <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Ładowanie draftu…
        </div>
      ) : !board ? (
        <p className="rounded-xl border border-dashed border-slate-700 px-4 py-12 text-center text-sm text-slate-500">
          Wybierz sezon i odśwież tablicę (wymagane opublikowane wyniki fazy + baraży).
        </p>
      ) : (
        <>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {board.columns.map((col) => {
              const n = col.players.length;
              const ok = n === DRAFT_TARGET_SIZE;
              return (
                <section
                  key={col.tier}
                  className={`w-[min(100%,20rem)] shrink-0 rounded-2xl border ${
                    ok
                      ? "border-emerald-500/40 bg-emerald-950/20"
                      : "border-red-500/40 bg-red-950/15"
                  }`}
                >
                  <header className="flex items-center justify-between border-b border-slate-800 px-3 py-2.5">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500">
                        Tier {col.tier}
                      </p>
                      <h3 className="font-athletic text-sm uppercase text-white">
                        {col.label}
                      </h3>
                    </div>
                    <span
                      className={`rounded-lg px-2 py-1 font-mono text-xs font-black ${
                        ok ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {n}/{DRAFT_TARGET_SIZE}
                    </span>
                  </header>
                  <ul className="max-h-[28rem] space-y-2 overflow-y-auto p-2">
                    {col.players.map((p) => (
                      <li
                        key={p.tempId}
                        className={`rounded-xl border px-2.5 py-2 ${
                          p.cascadePromotion
                            ? "border-sky-500/50 bg-sky-500/10"
                            : p.isNew
                              ? "border-violet-500/40 bg-violet-500/10"
                              : "border-slate-700/80 bg-slate-950/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-white">
                              {p.chosen_club}
                            </p>
                            <p className="truncate text-[11px] text-slate-400">
                              {p.manager_name} · {p.discord_nick}
                            </p>
                            <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
                              {p.cascadePromotion
                                ? "Awans kaskadowy"
                                : p.isNew
                                  ? "Świeżak"
                                  : p.originalStatus === "NEW"
                                    ? "Świeżak"
                                    : teamSeasonStatusLabel(p.originalStatus)}
                              {" · "}
                              {p.totalPoints} pkt
                            </p>
                          </div>
                          <button
                            type="button"
                            title="Zrezygnował z gry"
                            onClick={() => onResign(p.tempId)}
                            className="rounded-lg border border-red-500/40 p-1.5 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          <section className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-violet-300" />
                <h2 className="font-athletic text-lg uppercase text-white">
                  Poczekalnia / Rekrutacja
                </h2>
                <span className="rounded-lg bg-violet-500/20 px-2 py-0.5 font-mono text-xs font-bold text-violet-200">
                  {board.waitingRoom.length}
                </span>
              </div>
              {board.waitingRoom.length === DRAFT_TARGET_SIZE ? (
                <button
                  type="button"
                  onClick={() => {
                    const next = promoteWaitingRoomToNewTier(board);
                    if ("error" in next) {
                      window.alert(next.error);
                      return;
                    }
                    dispatch({ type: "PROMOTE_WAITING" });
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-black uppercase tracking-wider text-emerald-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Utwórz Tier {board.maxTier + 1} (10/10)
                </button>
              ) : null}
            </div>
            <p className="mb-4 text-xs text-slate-400">
              Gracze z niepełnych dywizji (&lt;10) oraz nowi rekruci. Możesz przenieść ich
              do niepełnej kolumny (np. Tier 2 8/10) albo przy {DRAFT_TARGET_SIZE} osobach
              otworzyć nowy tier.
            </p>

            {board.waitingRoom.length > 0 ? (
              <ul className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {board.waitingRoom.map((p) => (
                  <li
                    key={p.tempId}
                    className="rounded-xl border border-violet-500/40 bg-violet-500/10 px-2.5 py-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">
                          {p.chosen_club}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">
                          {p.manager_name} · {p.discord_nick}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-violet-300/80">
                          {p.isNew || p.originalStatus === "NEW"
                            ? "Świeżak"
                            : teamSeasonStatusLabel(p.originalStatus)}
                          {p.oldDivisionName
                            ? ` · było: ${p.oldDivisionName}`
                            : ""}
                        </p>
                        {incompleteColumns.length > 0 ? (
                          <label className="mt-2 block">
                            <span className="sr-only">Przenieś do dywizji</span>
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                const tier = Number(e.target.value);
                                if (!Number.isFinite(tier) || tier < 1) return;
                                onAssignWaiting(p.tempId, tier);
                                e.target.value = "";
                              }}
                              className="mt-1 w-full rounded-lg border border-violet-500/40 bg-slate-950 px-2 py-1.5 text-[11px] font-semibold text-violet-100 outline-none focus:border-violet-300"
                            >
                              <option value="" disabled>
                                Przenieś do…
                              </option>
                              {incompleteColumns.map((c) => (
                                <option key={c.tier} value={c.tier}>
                                  Tier {c.tier} · {c.label} ({c.players.length}/
                                  {DRAFT_TARGET_SIZE})
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : (
                          <p className="mt-2 text-[10px] text-slate-500">
                            Brak niepełnych kolumn — zbierz 10 i utwórz nowy tier.
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        title="Zrezygnował z gry"
                        onClick={() => onResign(p.tempId)}
                        className="rounded-lg border border-red-500/40 p-1.5 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-slate-500">Poczekalnia pusta.</p>
            )}

            <form
              onSubmit={onAddNew}
              className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
            >
              <input
                required
                placeholder="Menedżer"
                value={newManager}
                onChange={(e) => setNewManager(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
              <input
                required
                placeholder="Discord nick"
                value={newDiscord}
                onChange={(e) => setNewDiscord(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
              <input
                placeholder="Discord Club"
                value={newClub}
                onChange={(e) => setNewClub(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
              <input
                placeholder="FPL ID"
                value={newFplId}
                onChange={(e) => setNewFplId(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
              <input
                placeholder="FPL Team"
                value={newFplTeam}
                onChange={(e) => setNewFplTeam(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-violet-500/15 px-3 py-2 text-xs font-black uppercase text-violet-200"
              >
                <Plus className="h-3.5 w-3.5" />
                Dodaj do draftu
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-5">
            <label className="mb-3 block">
              <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                Nazwa nowego sezonu
              </span>
              <input
                value={nextName}
                onChange={(e) => setNextName(e.target.value)}
                className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <p className="mb-4 text-xs text-slate-500">
              Faza: {board.nextPhase === "SPRING" ? "Wiosna (GW20–37)" : "Jesień (GW1–18)"} ·
              offset Bergera +{board.bergerGwOffset}
            </p>
            <button
              type="button"
              disabled={!balanced || pending}
              onClick={onFinalize}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#39FF14]/50 bg-[#39FF14]/15 px-5 py-3 text-sm font-black uppercase tracking-wider text-[#39FF14] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Package className="h-4 w-4" />
              )}
              Zakończ Sezon i Generuj Nowy
            </button>
            {!balanced ? (
              <p className="mt-2 text-xs text-red-300">
                Przycisk zablokowany — każda dywizja musi mieć dokładnie {DRAFT_TARGET_SIZE}/
                {DRAFT_TARGET_SIZE}.
              </p>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
