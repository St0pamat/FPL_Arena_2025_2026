"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Shuffle,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  generateBergerForDivision,
  masterExcelImport,
  type DivisionScheduleMeta,
} from "@/app/admin/actions/masterImport";
import { ClubLogo } from "@/components/admin/ClubLogo";
import { resolveLogoSrc } from "@/components/admin/ClubNameWithLogo";
import {
  resolveTierLogoName,
  TierCrest,
} from "@/components/na-minusie/TierCrest";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { TierLogoRecord } from "@/lib/admin/tierLogos";
import type { Division, Pyramid, Season, Team } from "@/lib/admin/types";

const selectClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-[#39FF14]";

type DivisionGroup = {
  division: Division | null;
  label: string;
  teams: Team[];
};

export function MasterImportPanel({
  seasons,
  pyramids,
  divisions,
  teams,
  clubLogos = [],
  tierLogos = [],
  scheduleByDivision = {},
}: {
  seasons: Season[];
  pyramids: Pyramid[];
  divisions: Division[];
  teams: Team[];
  clubLogos?: ClubLogoRecord[];
  tierLogos?: TierLogoRecord[];
  scheduleByDivision?: Record<string, DivisionScheduleMeta>;
}) {
  const router = useRouter();
  const newestSeasonId = useMemo(() => {
    const sorted = [...seasons].sort((a, b) => {
      const aa = a.is_archived ? 1 : 0;
      const bb = b.is_archived ? 1 : 0;
      if (aa !== bb) return aa - bb;
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });
    return sorted[0]?.id ?? "";
  }, [seasons]);

  const [seasonId, setSeasonId] = useState(newestSeasonId);
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [pending, setPending] = useState(false);
  const [bergerPendingId, setBergerPendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  useEffect(() => {
    if (seasons.length === 0) {
      setSeasonId("");
    } else if (!seasons.some((s) => s.id === seasonId)) {
      setSeasonId(newestSeasonId);
    }
  }, [seasons, seasonId, newestSeasonId]);

  const groups = useMemo(() => {
    const pyramidName = (id: string) =>
      pyramids.find((p) => p.id === id)?.name ?? "Piramida?";
    const seasonName = (id: string) =>
      seasons.find((s) => s.id === id)?.name ?? "Sezon?";

    const scopedDivisions = [...divisions]
      .filter((d) => !seasonId || d.season_id === seasonId)
      .sort((a, b) => {
        const pa = pyramidName(a.pyramid_id).localeCompare(pyramidName(b.pyramid_id), "pl");
        if (pa !== 0) return pa;
        return a.tier - b.tier;
      });

    const result: DivisionGroup[] = scopedDivisions.map((d) => ({
      division: d,
      label: `${seasonName(d.season_id)} · ${pyramidName(d.pyramid_id)} · D${d.tier} — ${d.name}`,
      teams: teams
        .filter((t) => t.division_id === d.id)
        .sort((a, b) => a.manager_name.localeCompare(b.manager_name, "pl")),
    }));

    const unassigned = teams
      .filter((t) => !t.division_id)
      .sort((a, b) => a.manager_name.localeCompare(b.manager_name, "pl"));
    if (unassigned.length) {
      result.unshift({
        division: null,
        label: "Pula bez dywizji",
        teams: unassigned,
      });
    }

    return result;
  }, [divisions, teams, pyramids, seasons, seasonId]);

  const totalPlayers = teams.length;
  const canImport = seasons.length > 0 && Boolean(seasonId);

  async function runImport() {
    if (!raw.trim() || pending) return;
    if (!canImport) {
      setToast({
        type: "err",
        text: "Najpierw utwórz sezon w Strukturze Ligi.",
      });
      return;
    }
    setPending(true);
    setToast(null);
    try {
      const result = await masterExcelImport(raw, seasonId);
      if (result.error) {
        setToast({ type: "err", text: result.error });
        window.alert(
          result.skipped?.length
            ? `${result.error}\n\n${result.skipped.slice(0, 12).join("\n")}`
            : result.error,
        );
        return;
      }
      const ok = result.success ?? "Import zakończony.";
      setToast({ type: "ok", text: ok });
      window.alert(
        result.skipped?.length
          ? `${ok}\n\n${result.skipped.slice(0, 15).join("\n")}`
          : ok,
      );
      setRaw("");
      setOpen(false);
      router.refresh();
    } catch (e) {
      const text = e instanceof Error ? e.message : "Błąd importu.";
      setToast({ type: "err", text });
      window.alert(text);
    } finally {
      setPending(false);
    }
  }

  async function runBerger(divisionId: string, regenerate: boolean) {
    if (regenerate) {
      if (
        !window.confirm(
          "Regenerować terminarz? Nieopublikowane mecze tej dywizji zostaną zastąpione nowym losowaniem Bergera.",
        )
      ) {
        return;
      }
    }
    setBergerPendingId(divisionId);
    setToast(null);
    try {
      const result = await generateBergerForDivision(divisionId, regenerate);
      if (result.error?.includes("już istnieje") && !regenerate) {
        if (
          !window.confirm(
            `${result.error}\n\nUsunąć nieopublikowany terminarz i wylosować ponownie?`,
          )
        ) {
          return;
        }
        const retry = await generateBergerForDivision(divisionId, true);
        if (retry.error) {
          setToast({ type: "err", text: retry.error });
          window.alert(retry.error);
          return;
        }
        setToast({ type: "ok", text: retry.success ?? "OK" });
        window.alert(retry.success ?? "OK");
        router.refresh();
        return;
      }
      if (result.error) {
        setToast({ type: "err", text: result.error });
        window.alert(result.error);
        return;
      }
      const ok = result.success ?? "Terminarz wygenerowany.";
      setToast({ type: "ok", text: ok });
      window.alert(ok);
      router.refresh();
    } catch (e) {
      const text = e instanceof Error ? e.message : "Błąd Bergera.";
      setToast({ type: "err", text });
      window.alert(text);
    } finally {
      setBergerPendingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-[220px] flex-1">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Sezon docelowy (Master Import)
            </label>
            <select
              className={selectClass}
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              disabled={pending || seasons.length === 0}
            >
              {seasons.length === 0 ? (
                <option value="">Brak sezonów — utwórz w Strukturze</option>
              ) : (
                seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.status === "PUBLISHED" ? "Aktywny" : "Szkic"})
                  </option>
                ))
              )}
            </select>
            {seasons.length === 0 ? (
              <p className="mt-2 text-xs text-amber-300">
                Najpierw utwórz sezon w{" "}
                <Link href="/admin/struktura" className="underline">
                  Strukturze Ligi
                </Link>
                .
              </p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={pending || !canImport}
            onClick={() => {
              setToast(null);
              setOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#39FF14] px-5 py-3 text-sm font-black uppercase tracking-wider text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Upload className="h-4 w-4" />
            Zasil Bazę z Excela
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Excel SSOT · 14 kolumn · wybierz istniejący sezon · {totalPlayers} w bazie
        </p>
        {toast ? (
          <p
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              toast.type === "ok"
                ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-200"
                : "border-rose-500/30 bg-rose-950/40 text-rose-200"
            }`}
            role="alert"
          >
            {toast.text}
          </p>
        ) : null}
      </section>

      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[#39FF14]" />
          <h2 className="text-lg font-bold text-white">Roster według dywizji</h2>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-12 text-center text-sm text-slate-500">
            Brak graczy. Utwórz sezon, potem „Zasil Bazę z Excela”.
          </div>
        ) : (
          groups.map((g) => {
            const meta = g.division
              ? scheduleByDivision[g.division.id]
              : undefined;
            const hasSchedule = Boolean(meta?.hasSchedule);
            const tierName = g.division
              ? resolveTierLogoName(g.division.name, g.division.tier)
              : "";

            return (
              <div
                key={g.division?.id ?? "pool"}
                className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/50"
              >
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/60 px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {g.division ? (
                      <TierCrest tierName={tierName} logos={tierLogos} size="sm" />
                    ) : null}
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#39FF14]">
                        {g.division ? `Dywizja ${g.division.tier}` : "Pula"}
                      </p>
                      <h3 className="mt-0.5 truncate text-base font-bold text-white">
                        {g.label}
                      </h3>
                      {g.division ? (
                        <p
                          className={`mt-1.5 inline-flex rounded-lg px-2 py-0.5 text-xs font-semibold ${
                            hasSchedule
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {hasSchedule
                            ? `Terminarz: Wygenerowany (${meta!.fixtureCount} meczów, GW${meta!.minGw}–${meta!.maxGw})`
                            : "Terminarz: Brak"}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                        g.division && g.teams.length < 10
                          ? "bg-amber-500/20 text-amber-200"
                          : "bg-slate-900 text-slate-400"
                      }`}
                    >
                      {g.teams.length} / 10
                    </span>
                    {g.division ? (
                      g.teams.length < 10 ? (
                        <p
                          className="max-w-[220px] text-right text-[11px] font-semibold leading-snug text-amber-200"
                          title="Terminarz Bergera wymaga równe 10 zespołów."
                        >
                          Berger zablokowany — wymagane 10/10
                        </p>
                      ) : hasSchedule ? (
                        <button
                          type="button"
                          disabled={bergerPendingId === g.division.id}
                          onClick={() => void runBerger(g.division!.id, true)}
                          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-amber-200 disabled:opacity-40"
                        >
                          {bergerPendingId === g.division.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Shuffle className="h-3.5 w-3.5" />
                          )}
                          Regeneruj Terminarz
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={bergerPendingId === g.division.id}
                          onClick={() => void runBerger(g.division!.id, false)}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#39FF14]/40 bg-[#39FF14]/10 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-[#39FF14] disabled:opacity-40"
                        >
                          {bergerPendingId === g.division.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Shuffle className="h-3.5 w-3.5" />
                          )}
                          Generuj Terminarz (Berger)
                        </button>
                      )
                    ) : null}
                  </div>
                </header>

                {g.teams.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-slate-500">
                    Brak drużyn w tej dywizji.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] text-left text-sm">
                      <thead className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-bold">Manager</th>
                          <th className="px-4 py-3 font-bold">Discord</th>
                          <th className="px-4 py-3 font-bold">FPL Team</th>
                          <th className="px-4 py-3 font-bold">FPL ID</th>
                          <th className="px-4 py-3 font-bold">Klub</th>
                          <th className="px-4 py-3 font-bold">OR</th>
                          <th className="px-4 py-3 font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {g.teams.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-950/50">
                            <td className="px-4 py-2.5 font-semibold text-white">
                              {t.manager_name}
                            </td>
                            <td className="px-4 py-2.5 text-slate-300">
                              {t.discord_nick}
                            </td>
                            <td className="px-4 py-2.5 text-slate-400">
                              {t.fpl_team_name || "—"}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-slate-400">
                              {t.fpl_id || "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <ClubLogo
                                  src={resolveLogoSrc(clubLogos, t.chosen_club)}
                                  clubName={t.chosen_club}
                                  size="md"
                                />
                                <span className="truncate font-semibold uppercase tracking-wide text-slate-200">
                                  {t.chosen_club}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-slate-400">
                              {t.previous_season_or ?? "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              {(() => {
                                const label =
                                  t.status?.trim() ||
                                  (t.is_active === false ? "Nieaktywny" : "Aktywny");
                                const inactive =
                                  t.is_active === false ||
                                  /^nieaktyw/i.test(label) ||
                                  /^inactive/i.test(label);
                                return (
                                  <span
                                    className={`text-xs font-bold ${
                                      inactive ? "text-slate-500" : "text-[#39FF14]"
                                    }`}
                                  >
                                    {label.toUpperCase()}
                                  </span>
                                );
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="master-import-title"
            className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-2xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 id="master-import-title" className="text-lg font-bold text-white">
                  Master Import — Excel SSOT
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Wklej z Excela 14 kolumn (TSV):{" "}
                  <span className="font-mono text-slate-300">
                    LP | Piramida | Dywizja | Nazwa dywizji | FPL Team | FPL Manager | FPL ID |
                    OR 2025/26 | Discord Name | Discord Club | Discord ID | Status | x.com | email
                  </span>
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Zamknij"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              disabled={pending}
              rows={16}
              className="min-h-[280px] w-full flex-1 rounded-xl border border-slate-700 bg-slate-900 p-3 font-mono text-xs text-white outline-none focus:border-[#39FF14] disabled:opacity-60"
              placeholder={
                "1\tAnglia\t1\tPremier League\tFC Example\tJan Kowalski\t123456\t50000\tst0pa.\tArsenal\t111\tAktywny\t@st0pamat\tjan@example.com"
              }
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold uppercase text-slate-400"
              >
                Anuluj
              </button>
              <button
                type="button"
                disabled={pending || !raw.trim() || !canImport}
                onClick={() => void runImport()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#39FF14] px-4 py-2 text-xs font-black uppercase text-black disabled:opacity-40"
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importuję…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Uruchom Master Import
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
