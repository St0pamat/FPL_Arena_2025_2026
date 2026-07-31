"use client";

import { useEffect, useRef, useTransition } from "react";
import { useFormState } from "react-dom";
import { Globe, Loader2, Trash2 } from "lucide-react";
import { createPyramid, deletePyramid } from "@/app/admin/actions/db";
import type { Pyramid } from "@/lib/admin/types";
import { INITIAL_ACTION_STATE } from "@/lib/admin/types";
import { SubmitButton } from "@/components/admin/SubmitButton";

const inputClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#39FF14]";

export function PyramidSection({ pyramids }: { pyramids: Pyramid[] }) {
  const [state, formAction] = useFormState(createPyramid, INITIAL_ACTION_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const [pendingDelete, startDelete] = useTransition();

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-[#39FF14]" />
        <h2 className="text-xl font-bold text-white">Piramidy (Regiony)</h2>
      </div>
      <p className="text-sm text-slate-400">
        Fundament skalowania: Anglia A, Anglia B… Każda piramida ma własne dywizje w ramach sezonu.
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
            placeholder='np. "Anglia A"'
            className={`${inputClass} flex-1`}
          />
          <SubmitButton label="Dodaj piramidę" className="sm:w-auto" />
        </div>
        {state.error && (
          <p className="mt-3 text-sm text-red-300" role="alert">
            {state.error}
          </p>
        )}
        {state.success && <p className="mt-3 text-sm text-[#39FF14]">{state.success}</p>}
      </form>

      <ul className="space-y-2">
        {pyramids.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-700/50 px-4 py-6 text-center text-sm text-slate-500">
            Brak piramid — dodaj pierwszą (np. Anglia A).
          </li>
        )}
        {pyramids.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/50 px-4 py-3"
          >
            <span className="font-semibold text-white">{p.name}</span>
            <button
              type="button"
              disabled={pendingDelete}
              onClick={() => {
                if (!confirm(`Usunąć piramidę „${p.name}”? Usunie też jej dywizje i drużyny.`)) return;
                startDelete(async () => {
                  const r = await deletePyramid(p.id);
                  if (r.error) alert(r.error);
                });
              }}
              className="rounded-lg border border-slate-700/50 p-2 text-slate-400 hover:border-red-500/40 hover:text-red-400"
              aria-label={`Usuń ${p.name}`}
            >
              {pendingDelete ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
