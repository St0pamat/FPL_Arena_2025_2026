"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { Layers, Loader2, Save, Trash2, Webhook } from "lucide-react";
import {
  createDivision,
  deleteDivision,
  updateDivision,
} from "@/app/admin/actions/db";
import type { Division, Pyramid, Season } from "@/lib/admin/types";
import { INITIAL_ACTION_STATE } from "@/lib/admin/types";
import { SubmitButton } from "@/components/admin/SubmitButton";

const inputClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#39FF14]";

export function DivisionManager({
  divisions,
  seasons,
  pyramids,
}: {
  divisions: Division[];
  seasons: Season[];
  pyramids: Pyramid[];
}) {
  const [state, formAction] = useFormState(createDivision, INITIAL_ACTION_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [webhookDrafts, setWebhookDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const d of divisions) {
      next[d.id] = d.discord_webhook_url ?? "";
    }
    setWebhookDrafts(next);
  }, [divisions]);

  const canCreate = seasons.length > 0 && pyramids.length > 0;
  const seasonName = (id: string) => seasons.find((s) => s.id === id)?.name ?? "—";
  const pyramidName = (id: string) => pyramids.find((p) => p.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <form
        ref={formRef}
        action={formAction}
        className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6"
      >
        <div className="mb-5 flex items-center gap-2">
          <Layers className="h-5 w-5 text-[#39FF14]" />
          <h2 className="text-lg font-bold text-white">Dodaj dywizję</h2>
        </div>

        <p className="mb-4 rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-xs text-slate-400">
          Nowy tier (np. T3) wolno utworzyć dopiero gdy wszystkie wyższe dywizje mają dokładnie
          10/10 graczy.
        </p>

        {!canCreate && (
          <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-300">
            Najpierw utwórz co najmniej jeden sezon i jedną piramidę w zakładce Struktura.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Sezon
            </label>
            <select
              name="season_id"
              required
              defaultValue=""
              className={inputClass}
              disabled={!canCreate}
            >
              <option value="" disabled>
                Wybierz sezon…
              </option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status === "PUBLISHED" ? "Opublikowany" : "Szkic"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Piramida
            </label>
            <select
              name="pyramid_id"
              required
              defaultValue=""
              className={inputClass}
              disabled={!canCreate}
            >
              <option value="" disabled>
                Wybierz piramidę…
              </option>
              {pyramids.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Nazwa
            </label>
            <input
              name="name"
              required
              placeholder='np. "Premier Division"'
              className={inputClass}
              disabled={!canCreate}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Poziom (Tier)
            </label>
            <input
              name="tier"
              type="number"
              min={1}
              required
              placeholder="1"
              className={inputClass}
              disabled={!canCreate}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Webhook className="h-3.5 w-3.5 text-[#39FF14]" />
              Discord Webhook URL
              <span className="font-normal normal-case tracking-normal text-slate-600">
                (opcjonalnie)
              </span>
            </label>
            <input
              name="discord_webhook_url"
              type="url"
              placeholder="https://discord.com/api/webhooks/…"
              className={inputClass}
              disabled={!canCreate}
            />
            <p className="mt-1.5 text-[11px] text-slate-500">
              Osobny webhook = osobny kanał dywizji (wyniki / tabela / zapowiedź).
            </p>
          </div>
        </div>

        {state.error && (
          <p className="mt-4 text-sm text-red-300" role="alert">
            {state.error}
          </p>
        )}
        {state.success && <p className="mt-4 text-sm text-[#39FF14]">{state.success}</p>}

        <div className="mt-5">
          <SubmitButton label="Dodaj dywizję" className="w-full sm:w-auto" />
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/50">
        {divisions.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Brak dywizji.</p>
        ) : (
          <div className="divide-y divide-slate-700/40">
            {divisions.map((d) => {
              const draft = webhookDrafts[d.id] ?? "";
              const saved = d.discord_webhook_url ?? "";
              const dirty = draft !== saved;
              return (
                <div key={d.id} className="px-5 py-4 hover:bg-slate-900/30">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{d.name}</p>
                      <p className="text-xs text-slate-500">
                        {seasonName(d.season_id)} · {pyramidName(d.pyramid_id)} · Tier{" "}
                        <span className="font-mono text-[#39FF14]">{d.tier}</span>
                        {saved ? (
                          <span className="ml-2 text-emerald-400/80">· webhook OK</span>
                        ) : (
                          <span className="ml-2 text-amber-400/70">· brak webhooka</span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (!confirm(`Usunąć dywizję „${d.name}”?`)) return;
                        startTransition(async () => {
                          const r = await deleteDivision(d.id);
                          if (r.error) alert(r.error);
                        });
                      }}
                      className="inline-flex rounded-lg border border-slate-700/50 p-2 text-slate-400 hover:border-red-500/40 hover:text-red-400"
                    >
                      {pending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="url"
                      value={draft}
                      onChange={(e) =>
                        setWebhookDrafts((prev) => ({
                          ...prev,
                          [d.id]: e.target.value,
                        }))
                      }
                      placeholder="https://discord.com/api/webhooks/…"
                      className={`${inputClass} flex-1 py-2 text-xs`}
                    />
                    <button
                      type="button"
                      disabled={pending || !dirty}
                      onClick={() => {
                        startTransition(async () => {
                          const r = await updateDivision(d.id, {
                            discord_webhook_url: draft.trim() || null,
                          });
                          if (r.error) alert(r.error);
                        });
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#39FF14]/40 bg-[#39FF14]/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#39FF14] disabled:opacity-40"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Zapisz webhook
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
