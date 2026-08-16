"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import {
  createPlayer,
  updatePlayer,
  type PlayerFormInput,
} from "@/app/admin/actions/playerActions";
import type { Team } from "@/lib/admin/types";

const inputClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#39FF14]";
const labelClass =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500";

const STATUS_OPTIONS = [
  "Aktywny",
  "Nieaktywny",
  "Rezerwowy",
  "Oczekuje",
] as const;

export type PlayerFormModalProps = {
  open: boolean;
  onClose: () => void;
  /** null = tryb tworzenia */
  player: Team | null;
  /** Wymagane przy tworzeniu; przy edycji domyślnie z gracza */
  divisionId: string | null;
  divisionLabel?: string;
  onSaved?: (message: string) => void;
  onError?: (message: string) => void;
};

function emptyForm(divisionId: string | null): PlayerFormInput {
  return {
    manager_name: "",
    fpl_team_name: "",
    fpl_id: "",
    discord_nick: "",
    x_com: "",
    email: "",
    previous_season_or: null,
    status: "Aktywny",
    chosen_club: "",
    division_id: divisionId,
  };
}

function fromTeam(player: Team): PlayerFormInput {
  return {
    manager_name: player.manager_name ?? "",
    fpl_team_name: player.fpl_team_name ?? "",
    fpl_id: player.fpl_id ?? "",
    discord_nick: player.discord_nick ?? "",
    x_com: player.x_com ?? "",
    email: player.email ?? "",
    previous_season_or: player.previous_season_or ?? null,
    status:
      player.status?.trim() ||
      (player.is_active === false ? "Nieaktywny" : "Aktywny"),
    chosen_club: player.chosen_club ?? "",
    division_id: player.division_id,
  };
}

export function PlayerFormModal({
  open,
  onClose,
  player,
  divisionId,
  divisionLabel,
  onSaved,
  onError,
}: PlayerFormModalProps) {
  const isEdit = Boolean(player);
  const [form, setForm] = useState<PlayerFormInput>(() =>
    player ? fromTeam(player) : emptyForm(divisionId),
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setForm(player ? fromTeam(player) : emptyForm(divisionId));
  }, [open, player, divisionId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  if (!open) return null;

  function setField<K extends keyof PlayerFormInput>(
    key: K,
    value: PlayerFormInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const payload: PlayerFormInput = {
        ...form,
        division_id: form.division_id ?? divisionId,
      };
      const result = isEdit && player
        ? await updatePlayer(player.id, payload)
        : await createPlayer(payload);

      if (result.error) {
        onError?.(result.error);
        window.alert(result.error);
        return;
      }
      onSaved?.(result.success ?? (isEdit ? "Zapisano." : "Dodano."));
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-form-title"
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div>
            <h3
              id="player-form-title"
              className="text-lg font-bold text-white"
            >
              {isEdit ? "Edytuj gracza" : "Dodaj gracza"}
            </h3>
            {divisionLabel ? (
              <p className="mt-1 text-xs text-slate-400">{divisionLabel}</p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-40"
            aria-label="Zamknij"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="grid gap-4 overflow-y-auto px-5 py-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="pf-manager">
                FPL Manager
              </label>
              <input
                id="pf-manager"
                required
                className={inputClass}
                value={form.manager_name}
                onChange={(e) => setField("manager_name", e.target.value)}
                disabled={pending}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="pf-team">
                FPL Team
              </label>
              <input
                id="pf-team"
                className={inputClass}
                value={form.fpl_team_name ?? ""}
                onChange={(e) => setField("fpl_team_name", e.target.value)}
                disabled={pending}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="pf-fplid">
                FPL ID
              </label>
              <input
                id="pf-fplid"
                inputMode="numeric"
                className={inputClass}
                value={form.fpl_id ?? ""}
                onChange={(e) => setField("fpl_id", e.target.value)}
                disabled={pending}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="pf-discord">
                Discord Name
              </label>
              <input
                id="pf-discord"
                required
                className={inputClass}
                value={form.discord_nick}
                onChange={(e) => setField("discord_nick", e.target.value)}
                disabled={pending}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="pf-club">
                Nazwa Klubu
              </label>
              <input
                id="pf-club"
                required
                className={inputClass}
                value={form.chosen_club}
                onChange={(e) => setField("chosen_club", e.target.value)}
                disabled={pending}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="pf-x">
                X.com
              </label>
              <input
                id="pf-x"
                className={inputClass}
                placeholder="@handle"
                value={form.x_com ?? ""}
                onChange={(e) => setField("x_com", e.target.value)}
                disabled={pending}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="pf-email">
                Email
              </label>
              <input
                id="pf-email"
                type="email"
                className={inputClass}
                value={form.email ?? ""}
                onChange={(e) => setField("email", e.target.value)}
                disabled={pending}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="pf-or">
                OR 2025/26
              </label>
              <input
                id="pf-or"
                inputMode="numeric"
                className={inputClass}
                value={
                  form.previous_season_or != null
                    ? String(form.previous_season_or)
                    : ""
                }
                onChange={(e) => {
                  const raw = e.target.value.replace(/\s+/g, "").replace(/,/g, "");
                  if (!raw) {
                    setField("previous_season_or", null);
                    return;
                  }
                  const n = Number.parseInt(raw, 10);
                  setField(
                    "previous_season_or",
                    Number.isFinite(n) ? n : null,
                  );
                }}
                disabled={pending}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="pf-status">
                Status
              </label>
              <select
                id="pf-status"
                className={inputClass}
                value={form.status ?? "Aktywny"}
                onChange={(e) => setField("status", e.target.value)}
                disabled={pending}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                {form.status &&
                !STATUS_OPTIONS.includes(
                  form.status as (typeof STATUS_OPTIONS)[number],
                ) ? (
                  <option value={form.status}>{form.status}</option>
                ) : null}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4">
            <button
              type="button"
              disabled={pending}
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white disabled:opacity-40"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#39FF14] px-4 py-2 text-xs font-black uppercase tracking-wider text-black disabled:opacity-40"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              {isEdit ? "Zapisz zmiany" : "Dodaj gracza"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
