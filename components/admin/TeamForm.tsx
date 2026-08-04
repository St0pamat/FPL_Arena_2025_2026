"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { UserPlus } from "lucide-react";
import { createTeam } from "@/app/admin/actions/db";
import type { Division } from "@/lib/admin/types";
import { INITIAL_ACTION_STATE } from "@/lib/admin/types";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { ClubField } from "@/components/admin/ClubField";

const inputClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#39FF14]";

function divisionLabel(d: Division) {
  return `T${d.tier} — ${d.name}`;
}

export function TeamForm({
  divisions,
  logos = [],
}: {
  divisions: Division[];
  logos?: ClubLogoRecord[];
}) {
  const [state, formAction] = useFormState(createTeam, INITIAL_ACTION_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6"
    >
      <div className="mb-5 flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-[#39FF14]" />
        <h2 className="text-lg font-bold text-white">Dodaj drużynę / gracza</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="manager_name" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
            Menedżer
          </label>
          <input id="manager_name" name="manager_name" required placeholder="np. St0pa" className={inputClass} />
        </div>

        <div>
          <label htmlFor="discord_nick" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
            Nick Discord
          </label>
          <input id="discord_nick" name="discord_nick" required placeholder="np. st0pa" className={inputClass} />
        </div>

        <div>
          <label htmlFor="fpl_id" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
            FPL ID
          </label>
          <input id="fpl_id" name="fpl_id" placeholder="np. 22952" className={inputClass} />
        </div>

        <div>
          <label htmlFor="fpl_team_name" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
            Nazwa drużyny FPL
          </label>
          <input id="fpl_team_name" name="fpl_team_name" placeholder="np. Kapcie Kłapcia" className={inputClass} />
        </div>

        <ClubField logos={logos} />

        <div>
          <label htmlFor="division_id" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
            Dywizja (wskazówka)
          </label>
          <select
            id="division_id"
            name="division_id"
            required
            defaultValue=""
            className={inputClass}
            disabled={divisions.length === 0}
          >
            <option value="" disabled>
              {divisions.length === 0 ? "Najpierw dodaj dywizję" : "Wybierz sezon/piramidę…"}
            </option>
            {[...divisions]
              .sort((a, b) => a.tier - b.tier)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {divisionLabel(d)}
                </option>
              ))}
          </select>
          <p className="mt-1.5 text-[11px] text-slate-500">
            Serwer przypisze gracza do pierwszej niepełnej dywizji od góry w tej piramidzie.
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 py-3 sm:col-span-2">
          <input
            type="checkbox"
            name="fee_paid"
            className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-[#39FF14] focus:ring-[#39FF14]"
          />
          <span className="text-sm font-semibold text-slate-200">Wpisowe opłacone</span>
        </label>
      </div>

      {state.error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-300" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="mt-4 rounded-lg border border-[#39FF14]/30 bg-[#39FF14]/10 px-3 py-2 text-sm text-[#39FF14]">
          {state.success}
        </p>
      )}

      <div className="mt-5">
        <SubmitButton label="Dodaj drużynę" className="w-full sm:w-auto" />
      </div>
    </form>
  );
}
