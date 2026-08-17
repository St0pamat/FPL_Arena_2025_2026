"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  AlertOctagon,
  CalendarX,
  Eraser,
  Loader2,
  Skull,
} from "lucide-react";
import {
  clearSeasonFixtureResultsForm,
  clearSeasonFixturesForm,
  wipeLeagueDataForm,
} from "@/app/admin/actions/db";
import type { Season } from "@/lib/admin/types";
import { INITIAL_ACTION_STATE } from "@/lib/admin/types";

const CONFIRM_WORD = "POTWIERDZAM";

const inputClass =
  "w-full max-w-md rounded-xl border border-red-500/30 bg-[#0B0F19] px-4 py-3 text-sm text-white outline-none focus:border-red-400";

function PendingSubmit({
  label,
  icon: Icon,
  danger = "red",
}: {
  label: string;
  icon: typeof Skull;
  danger?: "amber" | "orange" | "red";
}) {
  const { pending } = useFormStatus();
  const colors =
    danger === "amber"
      ? pending
        ? "bg-amber-950/60 text-amber-300/50"
        : "bg-amber-600 hover:bg-amber-500"
      : danger === "orange"
        ? pending
          ? "bg-orange-950/60 text-orange-300/50"
          : "bg-orange-600 hover:bg-orange-500"
        : pending
          ? "bg-red-950/60 text-red-300/50"
          : "bg-red-600 hover:bg-red-500";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black uppercase tracking-wider text-white transition-colors ${
        pending ? `cursor-wait ${colors}` : colors
      }`}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </button>
  );
}

function useActionAlerts(state: { error?: string | null; success?: string | null }) {
  const router = useRouter();
  useEffect(() => {
    if (state.success) {
      window.alert(state.success);
      router.refresh();
    }
  }, [state.success, router]);
  useEffect(() => {
    if (state.error) window.alert(state.error);
  }, [state.error]);
}

export function DangerZonePanel({ seasons }: { seasons: Season[] }) {
  const [seasonId, setSeasonId] = useState(
    seasons.find((s) => s.status === "PUBLISHED" && !s.is_archived)?.id ??
      seasons[0]?.id ??
      "",
  );

  const [resultsState, resultsAction] = useFormState(
    clearSeasonFixtureResultsForm,
    INITIAL_ACTION_STATE,
  );
  const [fixturesState, fixturesAction] = useFormState(
    clearSeasonFixturesForm,
    INITIAL_ACTION_STATE,
  );
  const [wipeState, wipeAction] = useFormState(wipeLeagueDataForm, INITIAL_ACTION_STATE);

  useActionAlerts(resultsState);
  useActionAlerts(fixturesState);
  useActionAlerts(wipeState);

  useEffect(() => {
    if (seasons.length && !seasons.some((s) => s.id === seasonId)) {
      setSeasonId(seasons[0]!.id);
    }
  }, [seasons, seasonId]);

  const confirmFields = (idPrefix: string) => (
    <>
      <div>
        <label
          htmlFor={`${idPrefix}-confirm`}
          className="mb-2 block text-xs font-bold uppercase tracking-wider text-red-300/80"
        >
          Wpisz dokładnie: {CONFIRM_WORD}
        </label>
        <input
          id={`${idPrefix}-confirm`}
          name="confirm"
          required
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={inputClass}
          placeholder={CONFIRM_WORD}
        />
      </div>
      <label className="flex max-w-xl cursor-pointer items-start gap-3 text-sm text-red-100/90">
        <input
          type="checkbox"
          name="acknowledge"
          required
          className="mt-1 h-4 w-4 accent-red-500"
        />
        <span>Rozumiem, że tej operacji nie da się łatwo cofnąć.</span>
      </label>
    </>
  );

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-amber-500/40 bg-amber-950/15 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <Eraser className="mt-0.5 h-6 w-6 shrink-0 text-amber-400" />
          <div>
            <h2 className="text-xl font-extrabold text-amber-200">Wyczyść wyniki meczów</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-amber-100/80">
              Zeruje punkty FPL, H2H, medianę i tie-breakery. Terminarz (pary meczów) zostaje.
              Ustawia <code className="text-amber-200">is_published = false</code>.
            </p>
          </div>
        </div>
        <form action={resultsAction} className="mt-6 space-y-4">
          <input type="hidden" name="season_id" value={seasonId} />
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-amber-300/80">
              Sezon
            </label>
            <select
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              className={inputClass.replace("border-red-500/30", "border-amber-500/30").replace("focus:border-red-400", "focus:border-amber-400")}
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          {confirmFields("results")}
          <PendingSubmit
            label="Wyczyść wyniki (zostaw terminarz)"
            icon={Eraser}
            danger="amber"
          />
        </form>
      </section>

      <section className="rounded-2xl border border-orange-500/40 bg-orange-950/15 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <CalendarX className="mt-0.5 h-6 w-6 shrink-0 text-orange-400" />
          <div>
            <h2 className="text-xl font-extrabold text-orange-200">Wyczyść terminarz i mecze</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-orange-100/80">
              Usuwa wszystkie rekordy <code className="text-orange-200">fixtures</code> wybranego
              sezonu. Drużyny i dywizje zostają — możesz wylosować Berger od zera.
            </p>
          </div>
        </div>
        <form action={fixturesAction} className="mt-6 space-y-4">
          <input type="hidden" name="season_id" value={seasonId} />
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-orange-300/80">
              Sezon
            </label>
            <select
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              className={inputClass.replace("border-red-500/30", "border-orange-500/30").replace("focus:border-red-400", "focus:border-orange-400")}
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          {confirmFields("fixtures")}
          <PendingSubmit
            label="Usuń terminarz sezonu"
            icon={CalendarX}
            danger="orange"
          />
        </form>
      </section>

      <section className="rounded-2xl border border-red-500/40 bg-red-950/20 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <AlertOctagon className="mt-0.5 h-6 w-6 shrink-0 text-red-400" />
          <div>
            <h2 className="text-xl font-extrabold text-red-300">Pełny Reset (Hard Reset)</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-red-200/80">
              Usuwa <strong>wszystkie</strong> piramidy, sezony, dywizje, drużyny i mecze. Konta Auth
              oraz <strong>trwałe Webhooki Discord</strong> (admin → Webhooki Discord) zostają.
            </p>
          </div>
        </div>

        <form action={wipeAction} className="mt-6 space-y-4">
          {confirmFields("wipe")}
          <PendingSubmit
            label="Zresetuj Bazę Danych (wszystko)"
            icon={Skull}
            danger="red"
          />
        </form>
      </section>
    </div>
  );
}
