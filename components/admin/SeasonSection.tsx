"use client";

import { useEffect, useRef, useTransition } from "react";
import { useFormState } from "react-dom";
import { AlertTriangle, Calendar, Loader2, Trash2 } from "lucide-react";
import { createSeason, deleteSeason, updateSeasonStatus } from "@/app/admin/actions/db";
import type { Season } from "@/lib/admin/types";
import { INITIAL_ACTION_STATE } from "@/lib/admin/types";
import { SubmitButton } from "@/components/admin/SubmitButton";

const inputClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#39FF14]";

function SeasonRow({ season }: { season: Season }) {
  const [pending, startTransition] = useTransition();
  const isPublished = season.status === "PUBLISHED";

  return (
    <tr className="hover:bg-slate-900/40">
      <td className="px-5 py-3 font-semibold text-white">{season.name}</td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          {isPublished ? (
            <span className="rounded-lg bg-[#39FF14]/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#39FF14]">
              Opublikowany
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Szkic
            </span>
          )}
        </div>
      </td>
      <td className="px-5 py-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const next = isPublished ? "DRAFT" : "PUBLISHED";
            const msg = isPublished
              ? "Cofnąć sezon do szkicu? Zniknie z widoku publicznego."
              : "Opublikować sezon? Będzie widoczny publicznie.";
            if (!confirm(msg)) return;
            startTransition(async () => {
              const r = await updateSeasonStatus(season.id, next);
              if (r.error) alert(r.error);
            });
          }}
          className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-50 ${
            isPublished ? "bg-[#39FF14]" : "bg-slate-700"
          }`}
          aria-label="Przełącz status sezonu"
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
              isPublished ? "left-5" : "left-0.5"
            }`}
          />
        </button>
      </td>
      <td className="px-5 py-3 text-right">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Usunąć sezon „${season.name}”? Usunie dywizje, drużyny i mecze.`)) return;
            startTransition(async () => {
              const r = await deleteSeason(season.id);
              if (r.error) alert(r.error);
            });
          }}
          className="inline-flex rounded-lg border border-slate-700/50 p-2 text-slate-400 hover:border-red-500/40 hover:text-red-400"
          aria-label="Usuń sezon"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </td>
    </tr>
  );
}

export function SeasonSection({ seasons }: { seasons: Season[] }) {
  const [state, formAction] = useFormState(createSeason, INITIAL_ACTION_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-[#39FF14]" />
        <h2 className="text-xl font-bold text-white">Sezony</h2>
      </div>
      <p className="text-sm text-slate-400">
        Nowy sezon startuje jako <strong className="text-amber-400">Szkic</strong>. Publikujesz dopiero gdy
        struktura, gracze i terminarze są gotowe.
      </p>

      <form
        ref={formRef}
        action={formAction}
        className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            name="name"
            required
            placeholder='np. "Jesień 2026"'
            className={`${inputClass} flex-1`}
          />
          <SubmitButton label="Dodaj sezon" className="sm:w-auto" />
        </div>
        {state.error && (
          <p className="mt-3 text-sm text-red-300" role="alert">
            {state.error}
          </p>
        )}
        {state.success && <p className="mt-3 text-sm text-[#39FF14]">{state.success}</p>}
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/50">
        {seasons.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Brak sezonów.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-700/50 bg-slate-900/60 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 font-bold">Nazwa</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th className="px-5 py-3 font-bold">Publikacja</th>
                <th className="px-5 py-3 text-right font-bold">Usuń</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {seasons.map((s) => (
                <SeasonRow key={s.id} season={s} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
