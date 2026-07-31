"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Dices, Loader2, Swords, Sparkles, Trash2 } from "lucide-react";
import { getDivisionsForSeasonPyramid } from "@/app/admin/actions/db";
import {
  deleteDivisionFixtures,
  generateDivisionFixtures,
  getFixturesByDivision,
  getFixturesCount,
  getTeamsByDivision,
  type FixtureRow,
} from "@/app/admin/actions/fixtures";
import type { Division, Pyramid, Season, Team } from "@/lib/admin/types";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { ClubLogo } from "@/components/admin/ClubLogo";
import { ClubNameWithLogo, resolveLogoSrc } from "@/components/admin/ClubNameWithLogo";

interface FixtureDrawMachineProps {
  seasons: Season[];
  pyramids: Pyramid[];
  divisions?: Division[];
  logos?: ClubLogoRecord[];
}

type DrawPhase = "idle" | "drawing-slots" | "revealing-gw1" | "done";

const selectClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-[#39FF14] disabled:cursor-not-allowed disabled:opacity-50";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function clubName(club: string) {
  return club.trim().toUpperCase();
}

function metaLine(manager: string, discord: string) {
  const m = manager?.trim() || "—";
  const d = discord?.trim() || "—";
  return `(${m} · ${d})`;
}

function TeamCard({
  team,
  slot,
  reveal,
  logos,
}: {
  team: Team | null;
  slot: number;
  reveal?: boolean;
  logos: ClubLogoRecord[];
}) {
  return (
    <li
      className={`rounded-xl border px-3 py-1.5 transition-all duration-700 ${
        reveal && team
          ? "border-[#39FF14]/40 bg-[#39FF14]/10 shadow-[0_0_24px_rgba(57,255,20,0.12)]"
          : team
            ? "border-slate-700/40 bg-slate-900/50"
            : "border-dashed border-slate-700/50 bg-slate-900/20 opacity-60"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 font-mono text-xs font-bold text-[#39FF14]">#{slot}</span>
        {team ? (
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <ClubLogo
              src={resolveLogoSrc(logos, team.chosen_club)}
              clubName={team.chosen_club}
              size={reveal ? "xl" : "lg"}
            />
            <div className="min-w-0 py-0.5">
              <p className="truncate text-base font-black uppercase tracking-wide text-white sm:text-lg leading-tight">
                {clubName(team.chosen_club)}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-400 leading-tight">
                {metaLine(team.manager_name, team.discord_nick)}
              </p>
            </div>
          </div>
        ) : (
          <p className="animate-pulse text-sm text-slate-600">Oczekiwanie na losowanie…</p>
        )}
      </div>
    </li>
  );
}

function FixtureSide({
  team,
  align,
  logos,
}: {
  team: FixtureRow["home_team"];
  align: "left" | "right";
  logos: ClubLogoRecord[];
}) {
  if (!team) {
    return <div className={align === "left" ? "text-right text-slate-500" : "text-slate-500"}>—</div>;
  }

  return (
    <ClubNameWithLogo
      clubName={clubName(team.chosen_club)}
      logos={logos}
      size="lg"
      align={align}
      nameClassName="text-sm font-black uppercase tracking-wide text-white sm:text-base"
      meta={metaLine(team.manager_name, team.discord_nick ?? "")}
    />
  );
}

export function FixtureDrawMachine({ seasons, pyramids, logos = [] }: FixtureDrawMachineProps) {
  const [seasonId, setSeasonId] = useState("");
  const [pyramidId, setPyramidId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [liveDivisions, setLiveDivisions] = useState<Division[]>([]);
  const [loadingDivisions, setLoadingDivisions] = useState(false);

  const [teams, setTeams] = useState<Team[]>([]);
  const [fixtures, setFixtures] = useState<FixtureRow[]>([]);
  const [existingCount, setExistingCount] = useState(0);
  const [activeGw, setActiveGw] = useState(1);
  const [loadingContext, setLoadingContext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [phase, setPhase] = useState<DrawPhase>("idle");
  const [slotTeams, setSlotTeams] = useState<(Team | null)[]>([]);
  const [revealedSlot, setRevealedSlot] = useState(-1);
  const [gw1Visible, setGw1Visible] = useState<FixtureRow[]>([]);
  const [statusLine, setStatusLine] = useState("");

  const selectorsReady = Boolean(seasonId && pyramidId);

  // Ładuj dywizje dopiero po wyborze sezonu + piramidy (bez zagnieżdżonych joinów)
  useEffect(() => {
    setDivisionId("");
    setTeams([]);
    setFixtures([]);
    setExistingCount(0);
    resetCeremony();

    if (!seasonId || !pyramidId) {
      setLiveDivisions([]);
      return;
    }

    let cancelled = false;
    setLoadingDivisions(true);
    setToast(null);

    getDivisionsForSeasonPyramid(seasonId, pyramidId)
      .then((list) => {
        if (!cancelled) setLiveDivisions(list);
      })
      .catch((e) => {
        if (!cancelled) {
          setLiveDivisions([]);
          setToast({
            type: "err",
            text: e instanceof Error ? e.message : "Nie udało się pobrać dywizji.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDivisions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [seasonId, pyramidId]);

  useEffect(() => {
    if (!divisionId) {
      setTeams([]);
      setFixtures([]);
      setExistingCount(0);
      resetCeremony();
      return;
    }

    let cancelled = false;
    setLoadingContext(true);
    setToast(null);
    resetCeremony();

    Promise.all([
      getTeamsByDivision(divisionId),
      getFixturesByDivision(divisionId),
      getFixturesCount(divisionId),
    ])
      .then(([t, f, c]) => {
        if (cancelled) return;
        setTeams(t);
        setFixtures(f);
        setExistingCount(c);
        if (f.length > 0) setActiveGw(f[0]?.gameweek ?? 1);
      })
      .catch((e) => {
        if (cancelled) return;
        setToast({
          type: "err",
          text: e instanceof Error ? e.message : "Błąd ładowania dywizji.",
        });
      })
      .finally(() => {
        if (!cancelled) setLoadingContext(false);
      });

    return () => {
      cancelled = true;
    };
  }, [divisionId]);

  function resetCeremony() {
    setPhase("idle");
    setSlotTeams([]);
    setRevealedSlot(-1);
    setGw1Visible([]);
    setStatusLine("");
  }

  const gameweeks = useMemo(() => {
    const set = new Set(fixtures.map((f) => f.gameweek));
    return [...set].sort((a, b) => a - b);
  }, [fixtures]);

  const fixturesForGw = useMemo(
    () => fixtures.filter((f) => f.gameweek === activeGw),
    [fixtures, activeGw],
  );

  const teamCountOk = teams.length === 10;
  const canDraw = Boolean(seasonId && divisionId) && teams.length >= 2 && !busy;
  const showCeremonySlots = phase === "drawing-slots" || phase === "revealing-gw1";

  async function playCeremony(drawOrder: Team[], allFixtures: FixtureRow[]) {
    setPhase("drawing-slots");
    setFixtures([]);
    setGw1Visible([]);
    setSlotTeams(Array.from({ length: drawOrder.length }, () => null));
    setRevealedSlot(-1);
    setStatusLine("Tasowanie pozycji startowych…");
    await sleep(1600);

    for (let i = 0; i < drawOrder.length; i++) {
      setStatusLine(`Losowanie pozycji #${i + 1} z ${drawOrder.length}…`);
      await sleep(900);
      setSlotTeams((prev) => {
        const next = [...prev];
        next[i] = drawOrder[i];
        return next;
      });
      setRevealedSlot(i);
      setStatusLine(`#${i + 1} → ${clubName(drawOrder[i].chosen_club)}`);
      await sleep(1750);
    }

    setStatusLine("Pozycje ustawione. Zaraz odsłaniamy GW1…");
    await sleep(2800);

    setPhase("revealing-gw1");
    setActiveGw(1);
    const gw1 = allFixtures
      .filter((f) => f.gameweek === 1)
      .sort((a, b) => a.home_team_id.localeCompare(b.home_team_id));

    await sleep(1800);
    for (let i = 0; i < gw1.length; i++) {
      setStatusLine(`GW1 — mecz ${i + 1} z ${gw1.length}`);
      setGw1Visible((prev) => [...prev, gw1[i]]);
      await sleep(2200);
    }

    setStatusLine("Rozlosowywanie GW2–końca…");
    await sleep(1200);
    setFixtures(allFixtures);
    setTeams(drawOrder);
    setExistingCount(allFixtures.length);
    setPhase("done");
    setStatusLine("");
    setActiveGw(1);
  }

  async function runDraw(force: boolean) {
    if (!seasonId || !divisionId) return;

    setBusy(true);
    setToast(null);

    try {
      let result = await generateDivisionFixtures(seasonId, divisionId, force);

      if (result.error?.includes("już istnieje") && !force) {
        const ok = confirm(
          `${result.error}\n\nCzy na pewno chcesz USUNĄĆ stary terminarz i wylosować od nowa?`,
        );
        if (!ok) {
          setToast({ type: "err", text: "Anulowano ponowne losowanie." });
          return;
        }
        result = await generateDivisionFixtures(seasonId, divisionId, true);
      }

      if (result.error) {
        setToast({ type: "err", text: result.error });
        return;
      }

      if (!result.drawOrder?.length || !result.fixtures?.length) {
        setToast({ type: "err", text: "Brak danych ceremonii losowania." });
        return;
      }

      await playCeremony(result.drawOrder, result.fixtures);
      setToast({ type: "ok", text: result.success ?? "Wylosowano." });
    } catch (e) {
      setToast({
        type: "err",
        text: e instanceof Error ? e.message : "Nieznany błąd.",
      });
      resetCeremony();
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteFixtures() {
    if (!divisionId) return;
    if (!confirm("Usunąć cały terminarz tej dywizji? Tej operacji nie da się cofnąć.")) return;

    setBusy(true);
    setToast(null);
    try {
      const r = await deleteDivisionFixtures(divisionId);
      if (r.error) {
        setToast({ type: "err", text: r.error });
      } else {
        setFixtures([]);
        setExistingCount(0);
        setGw1Visible([]);
        resetCeremony();
        setToast({ type: "ok", text: r.success ?? "Usunięto." });
      }
    } catch (e) {
      setToast({
        type: "err",
        text: e instanceof Error ? e.message : "Błąd usuwania.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 sm:p-8">
        <div className="mb-6 flex items-start gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#39FF14]/10">
            <Dices className="h-5 w-5 text-[#39FF14]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Maszyna Losująca (Tabele Bergera)</h2>
            <p className="mt-1 text-sm text-slate-400">
              Wybierz sezon i piramidę, potem dywizję. Możesz podejrzeć istniejący terminarz, usunąć go
              lub wylosować ponownie.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Sezon
            </label>
            <select
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              className={selectClass}
              disabled={busy}
            >
              <option value="">Wybierz sezon…</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Piramida
            </label>
            <select
              value={pyramidId}
              onChange={(e) => setPyramidId(e.target.value)}
              className={selectClass}
              disabled={busy}
            >
              <option value="">Wybierz piramidę…</option>
              {pyramids.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Dywizja
            </label>
            <select
              value={divisionId}
              onChange={(e) => setDivisionId(e.target.value)}
              className={selectClass}
              disabled={busy || !selectorsReady || loadingDivisions}
            >
              <option value="">
                {!selectorsReady
                  ? "Najpierw sezon i piramida…"
                  : loadingDivisions
                    ? "Ładowanie dywizji…"
                    : liveDivisions.length === 0
                      ? "Brak dywizji dla tego wyboru"
                      : "Wybierz dywizję…"}
              </option>
              {liveDivisions.map((d) => (
                <option key={d.id} value={d.id}>
                  T{d.tier} — {d.name}
                </option>
              ))}
            </select>
            {selectorsReady && !loadingDivisions && liveDivisions.length === 0 && (
              <p className="mt-2 text-xs text-amber-300">
                Brak dywizji dla tego sezonu i piramidy. Dodaj je w zakładce Dywizje.
              </p>
            )}
          </div>
        </div>

        {toast && (
          <p
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              toast.type === "ok"
                ? "border-[#39FF14]/30 bg-[#39FF14]/10 text-[#39FF14]"
                : "border-red-500/30 bg-red-950/40 text-red-300"
            }`}
            role="alert"
          >
            {toast.text}
          </p>
        )}
      </section>

      {divisionId && (
        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-white">
              {showCeremonySlots
                ? "Losowanie pozycji startowych"
                : `Drużyny w dywizji (${teams.length})`}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {existingCount > 0 && phase === "idle" && (
                <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                  Terminarz istnieje · {existingCount} meczów
                </span>
              )}
              {existingCount > 0 && phase === "idle" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleDeleteFixtures()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-red-300 hover:bg-red-950/40 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Usuń terminarz
                </button>
              )}
            </div>
          </div>

          {statusLine && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#39FF14]/20 bg-[#39FF14]/5 px-4 py-3 text-sm text-[#39FF14]">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span className="font-semibold">{statusLine}</span>
            </div>
          )}

          {loadingContext ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Ładowanie…
            </div>
          ) : teams.length === 0 && phase === "idle" ? (
            <p className="text-sm text-slate-500">Brak drużyn w tej dywizji.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {(showCeremonySlots
                ? slotTeams.map((t, i) => ({ team: t, slot: i + 1, reveal: i === revealedSlot }))
                : teams.map((t, i) => ({ team: t, slot: i + 1, reveal: false }))
              ).map(({ team, slot, reveal }) => (
                <TeamCard
                  key={`${slot}-${team?.id ?? "empty"}`}
                  team={team}
                  slot={slot}
                  reveal={reveal}
                  logos={logos}
                />
              ))}
            </ul>
          )}

          {!teamCountOk && teams.length > 0 && phase === "idle" && (
            <div className="mt-4 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <p>
                Uwaga! Zgodnie z regulaminem dywizja powinna liczyć dokładnie 10 zespołów. Aktualnie:{" "}
                <strong>{teams.length}</strong>.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!canDraw || loadingContext}
              onClick={() => void runDraw(false)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#39FF14] px-6 py-4 text-sm font-black uppercase tracking-wider text-black transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Trwa ceremonia losowania…
                </>
              ) : existingCount > 0 ? (
                <>
                  <Dices className="h-5 w-5" />
                  Wylosuj ponownie (nadpisz)
                </>
              ) : (
                <>
                  <Dices className="h-5 w-5" />
                  Losuj Terminarz i Generuj Kolejki
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {phase === "revealing-gw1" && (
        <section className="rounded-2xl border border-[#39FF14]/25 bg-slate-800/50 p-6">
          <div className="mb-5 flex items-center gap-2">
            <Swords className="h-5 w-5 text-[#39FF14]" />
            <h3 className="text-lg font-bold text-white">GW1 — odsłanianie par</h3>
          </div>
          <div className="space-y-3">
            {gw1Visible.map((f) => (
              <div
                key={f.id}
                className="nm-draw-fade grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-[#39FF14]/30 bg-[#39FF14]/5 px-3 py-1 sm:gap-3 sm:px-4"
              >
                <FixtureSide team={f.home_team} align="left" logos={logos} />
                <span className="rounded bg-black/40 px-3 py-1.5 font-mono text-xs font-bold uppercase text-[#39FF14]">
                  vs
                </span>
                <FixtureSide team={f.away_team} align="right" logos={logos} />
              </div>
            ))}
          </div>
        </section>
      )}

      {fixtures.length > 0 && phase !== "drawing-slots" && phase !== "revealing-gw1" && (
        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Swords className="h-5 w-5 text-[#39FF14]" />
              <h3 className="text-lg font-bold text-white">
                Podgląd terminarza ({fixtures.length} meczów)
              </h3>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDeleteFixtures()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-red-300 hover:bg-red-950/40 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Usuń terminarz
            </button>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {gameweeks.map((gw) => (
              <button
                key={gw}
                type="button"
                onClick={() => setActiveGw(gw)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeGw === gw
                    ? "bg-[#39FF14] text-black"
                    : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                GW{gw}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {fixturesForGw.map((f) => (
              <div
                key={f.id}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-slate-700/40 bg-slate-900/50 px-3 py-1 sm:gap-3 sm:px-4"
              >
                <FixtureSide team={f.home_team} align="left" logos={logos} />
                <span className="rounded bg-slate-800 px-3 py-1.5 font-mono text-xs font-bold uppercase text-slate-300">
                  vs
                </span>
                <FixtureSide team={f.away_team} align="right" logos={logos} />
              </div>
            ))}
            {fixturesForGw.length === 0 && (
              <p className="text-sm text-slate-500">Brak meczów w GW{activeGw}.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
