"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { AlertTriangle, Calendar, Loader2, Pencil, Trash2 } from "lucide-react";
import {
  createSeason,
  deleteSeason,
  updateSeasonGlobalWebhooks,
  updateSeasonName,
  updateSeasonStatus,
} from "@/app/admin/actions/db";
import type { Season } from "@/lib/admin/types";
import { INITIAL_ACTION_STATE } from "@/lib/admin/types";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { resolveSeasonPhase } from "@/lib/public/season";

const inputClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#39FF14]";

function SeasonRow({ season }: { season: Season }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(season.name);
  const isPublished = season.status === "PUBLISHED";
  const phase = resolveSeasonPhase(season.name);

  useEffect(() => {
    setNameDraft(season.name);
  }, [season.name]);

  return (
    <tr className="hover:bg-slate-900/40">
      <td className="px-5 py-3">
        {editing ? (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const r = await updateSeasonName(season.id, nameDraft);
                if (r.error) {
                  window.alert(r.error);
                  return;
                }
                setEditing(false);
              });
            }}
          >
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              className="min-w-[12rem] flex-1 rounded-lg border border-slate-600 bg-slate-950 px-3 py-1.5 text-sm text-white outline-none focus:border-[#39FF14]"
              autoFocus
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-[#39FF14]/15 px-2.5 py-1.5 text-xs font-bold text-[#39FF14] disabled:opacity-50"
            >
              Zapisz
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setNameDraft(season.name);
                setEditing(false);
              }}
              className="rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Anuluj
            </button>
          </form>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white">{season.name}</p>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-lg border border-slate-700/50 p-1.5 text-slate-400 hover:border-[#39FF14]/40 hover:text-[#39FF14]"
                aria-label="Edytuj nazwę sezonu"
                title="Edytuj nazwę"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {phase === "SPRING" ? "Wiosna · GW20–38" : "Jesień · GW1–19"}
              {" · "}faza wykrywana z nazwy / kontekstu
            </p>
          </>
        )}
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          {isPublished ? (
            <span className="rounded-lg bg-[#39FF14]/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#39FF14]">
              Aktywny
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
              : "Ustawić sezon jako aktywny (PUBLISHED)? Będzie widoczny publicznie.";
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

function SeasonGlobalWebhooksPanel({ seasons }: { seasons: Season[] }) {
  const activeSeasons = useMemo(
    () => seasons.filter((s) => !s.is_archived),
    [seasons],
  );
  const defaultId =
    activeSeasons.find((s) => s.status === "PUBLISHED")?.id ??
    activeSeasons[0]?.id ??
    "";
  const [seasonId, setSeasonId] = useState(defaultId);
  const [rankingUrl, setRankingUrl] = useState("");
  const [cupUrl, setCupUrl] = useState("");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!activeSeasons.some((s) => s.id === seasonId)) {
      setSeasonId(defaultId);
    }
  }, [activeSeasons, seasonId, defaultId]);

  useEffect(() => {
    const s = activeSeasons.find((x) => x.id === seasonId);
    setRankingUrl(s?.fa_ranking_webhook_url ?? "");
    setCupUrl(s?.fa_cup_webhook_url ?? "");
    setToast(null);
  }, [seasonId, activeSeasons]);

  if (activeSeasons.length === 0) return null;

  const selected = activeSeasons.find((s) => s.id === seasonId);
  const rankingOk = Boolean((selected?.fa_ranking_webhook_url ?? "").trim());
  const cupOk = Boolean((selected?.fa_cup_webhook_url ?? "").trim());

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
        Kanały globalne · Content Hub
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        Webhooki sezonowe (nie dywizyjne): The FA Ranking (JSON + opcjonalna karuzela PNG)
        oraz FA Cup (tylko JSON embed).
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Sezon
          </label>
          <select
            className={inputClass}
            value={seasonId}
            onChange={(e) => setSeasonId(e.target.value)}
            disabled={pending}
          >
            {activeSeasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.status === "PUBLISHED" ? " · Aktywny" : " · Szkic"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>The FA Ranking · Webhook URL</span>
            {rankingOk ? (
              <span className="normal-case tracking-normal text-emerald-400/80">
                · webhook OK
              </span>
            ) : (
              <span className="normal-case tracking-normal text-amber-400/70">
                · brak webhooka
              </span>
            )}
          </label>
          <input
            className={inputClass}
            value={rankingUrl}
            onChange={(e) => setRankingUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/…"
            disabled={pending}
            spellCheck={false}
          />
        </div>

        <div>
          <label className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>FA Cup · Webhook URL</span>
            {cupOk ? (
              <span className="normal-case tracking-normal text-emerald-400/80">
                · webhook OK
              </span>
            ) : (
              <span className="normal-case tracking-normal text-amber-400/70">
                · brak webhooka
              </span>
            )}
          </label>
          <input
            className={inputClass}
            value={cupUrl}
            onChange={(e) => setCupUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/…"
            disabled={pending}
            spellCheck={false}
          />
        </div>

        <button
          type="button"
          disabled={pending || !seasonId}
          onClick={() => {
            startTransition(async () => {
              const r = await updateSeasonGlobalWebhooks(seasonId, {
                fa_ranking_webhook_url: rankingUrl.trim() || null,
                fa_cup_webhook_url: cupUrl.trim() || null,
              });
              setToast(r.error ?? r.success ?? null);
              if (r.error) window.alert(r.error);
            });
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[#39FF14] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-black transition hover:bg-white disabled:opacity-40"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Zapisz webhooki globalne
        </button>
        {toast ? (
          <p className="text-xs text-slate-400" role="status">
            {toast}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function SeasonSection({ seasons }: { seasons: Season[] }) {
  const [state, formAction] = useFormState(createSeason, INITIAL_ACTION_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  function buildDefaultName() {
    if (!nameRef.current) return;
    if (nameRef.current.dataset.touched === "1" && nameRef.current.value.trim()) {
      return;
    }
    nameRef.current.value = `Sezon ${seasons.length + 1}`;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-[#39FF14]" />
        <h2 className="text-xl font-bold text-white">Sezony</h2>
      </div>
      <p className="text-sm text-slate-400">
        Nazwa historyczna: <strong className="text-slate-200">Sezon 1</strong>,{" "}
        <strong className="text-slate-200">Sezon 2</strong>… (bez dopisków „Wiosna/Jesień” w nazwie —
        fazę ustala kontekst GW). Możesz edytować nazwę w tabeli.
      </p>

      <form
        ref={formRef}
        action={formAction}
        className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5"
        onSubmit={buildDefaultName}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Nazwa sezonu
            </label>
            <input
              ref={nameRef}
              name="name"
              placeholder={`np. Sezon ${seasons.length + 1}`}
              className={inputClass}
              onInput={() => {
                if (nameRef.current) nameRef.current.dataset.touched = "1";
              }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Status startowy
            </label>
            <select name="status" defaultValue="DRAFT" className={inputClass}>
              <option value="DRAFT">DRAFT — Szkic</option>
              <option value="ACTIVE">ACTIVE — Aktywny (PUBLISHED)</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <SubmitButton label="Utwórz sezon" className="sm:w-auto" />
          <button
            type="button"
            onClick={() => {
              if (nameRef.current) {
                nameRef.current.dataset.touched = "";
                nameRef.current.value = `Sezon ${seasons.length + 1}`;
              }
            }}
            className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white"
          >
            Wstaw Sezon {seasons.length + 1}
          </button>
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
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            Brak sezonów — utwórz pierwszy powyżej, zanim zaimportujesz graczy.
          </p>
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

      <SeasonGlobalWebhooksPanel seasons={seasons} />
    </section>
  );
}
