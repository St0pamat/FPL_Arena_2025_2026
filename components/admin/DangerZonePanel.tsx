"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertOctagon, Loader2, Skull } from "lucide-react";
import { wipeLeagueDataForm } from "@/app/admin/actions/db";
import { INITIAL_ACTION_STATE } from "@/lib/admin/types";

const CONFIRM_WORD = "POTWIERDZAM";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black uppercase tracking-wider text-white transition-colors ${
        pending ? "cursor-wait bg-red-950/60 text-red-300/50" : "bg-red-600 hover:bg-red-500"
      }`}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Skull className="h-4 w-4" />}
      Zresetuj Bazę Danych (Usuń wszystkie sezony, dywizje i drużyny)
    </button>
  );
}

export function DangerZonePanel() {
  const [state, formAction] = useFormState(wipeLeagueDataForm, INITIAL_ACTION_STATE);

  return (
    <section className="rounded-2xl border border-red-500/40 bg-red-950/20 p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <AlertOctagon className="mt-0.5 h-6 w-6 shrink-0 text-red-400" />
        <div>
          <h2 className="text-xl font-extrabold text-red-300">Strefa Testowa (Wipe Data)</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-red-200/80">
            Usuwa <strong>wszystkie</strong> piramidy, sezony, dywizje, drużyny i mecze. Konta Auth
            zostają. Tej operacji nie da się cofnąć.
          </p>
        </div>
      </div>

      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="wipe-confirm"
            className="mb-2 block text-xs font-bold uppercase tracking-wider text-red-300/80"
          >
            Wpisz dokładnie: {CONFIRM_WORD}
          </label>
          <input
            id="wipe-confirm"
            name="confirm"
            required
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full max-w-md rounded-xl border border-red-500/30 bg-[#0B0F19] px-4 py-3 text-sm text-white outline-none focus:border-red-400"
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
          <span>
            Rozumiem, że to nieodwracalnie skasuje całą strukturę ligi (piramidy → sezony → dywizje →
            drużyny → mecze).
          </span>
        </label>

        <SubmitButton />

        {state.error && <p className="text-sm text-red-300">{state.error}</p>}
        {state.success && <p className="text-sm text-[#39FF14]">{state.success}</p>}
      </form>
    </section>
  );
}
