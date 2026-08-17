"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Loader2,
  Plus,
  Save,
  Trash2,
  Webhook,
} from "lucide-react";
import {
  upsertDivisionLevelWebhook,
  upsertGlobalWebhook,
  type WebhooksAdminPayload,
} from "@/app/admin/actions/discordWebhooks";
import { GLOBAL_WEBHOOK_LABELS } from "@/lib/admin/discordWebhooks";

const inputClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#39FF14]";

type GlobalKey = "FA_RANKING" | "FA_CUP";

export function DiscordWebhooksPanel({
  initial,
}: {
  initial: WebhooksAdminPayload;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const [rankingUrl, setRankingUrl] = useState(initial.globals.FA_RANKING.url);
  const [cupUrl, setCupUrl] = useState(initial.globals.FA_CUP.url);

  const [divDrafts, setDivDrafts] = useState<Record<number, string>>(() => {
    const next: Record<number, string> = {};
    for (const s of initial.divisions) next[s.level] = s.url;
    return next;
  });

  const [extraLevels, setExtraLevels] = useState<number[]>([]);

  useEffect(() => {
    setRankingUrl(initial.globals.FA_RANKING.url);
    setCupUrl(initial.globals.FA_CUP.url);
    const next: Record<number, string> = {};
    for (const s of initial.divisions) next[s.level] = s.url;
    setDivDrafts(next);
    setExtraLevels([]);
  }, [initial]);

  const slots = useMemo(() => {
    const base = [...initial.divisions];
    const existing = new Set(base.map((s) => s.level));
    for (const level of extraLevels) {
      if (existing.has(level)) continue;
      base.push({
        level,
        divisionId: null,
        divisionName: null,
        seasonName: null,
        webhookId: null,
        url: divDrafts[level] ?? "",
        hasWebhook: false,
        missing: true,
        orphan: false,
      });
      existing.add(level);
    }
    return base.sort((a, b) => a.level - b.level);
  }, [initial.divisions, extraLevels, divDrafts]);

  const maxLevel = Math.max(
    initial.maxConfiguredLevel,
    ...slots.map((s) => s.level),
    0,
  );

  function run(
    fn: () => Promise<{ error: string | null; success?: string | null }>,
  ) {
    setToast(null);
    startTransition(async () => {
      const r = await fn();
      if (r.error) {
        window.alert(r.error);
        return;
      }
      setToast(r.success ?? "Zapisano.");
      router.refresh();
    });
  }

  function saveGlobal(key: GlobalKey, url: string) {
    run(() => upsertGlobalWebhook(key, url));
  }

  function saveDivision(level: number, url: string) {
    run(() => upsertDivisionLevelWebhook(level, url));
  }

  if (initial.missingTable) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-950/30 p-6 text-sm text-amber-100">
        <p className="font-bold">Brak tabeli <code>discord_webhooks</code></p>
        <p className="mt-2 text-amber-200/80">
          Uruchom migrację w Supabase SQL Editor:{" "}
          <code className="text-amber-100">
            supabase/migrations/add_discord_webhooks.sql
          </code>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {toast ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-300">
          {toast}
        </p>
      ) : null}

      <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-6">
        <div className="mb-1 flex items-center gap-2">
          <Webhook className="h-5 w-5 text-[#39FF14]" />
          <h2 className="text-lg font-bold text-white">Webhooki globalne</h2>
        </div>
        <p className="mb-5 text-xs text-slate-500">
          Stałe kanały ligi Classic FPL. Przetrwają Hard Reset w Danger Zone.
        </p>

        <div className="space-y-5">
          {(
            [
              {
                key: "FA_RANKING" as const,
                url: rankingUrl,
                setUrl: setRankingUrl,
                hint: "Klasyczny ranking ligi FPL · Content Hub → The FA Ranking",
                ok: initial.globals.FA_RANKING.hasWebhook,
              },
              {
                key: "FA_CUP" as const,
                url: cupUrl,
                setUrl: setCupUrl,
                hint: "Oficjalny puchar klasyczny FPL · Content Hub → FA Cup",
                ok: initial.globals.FA_CUP.hasWebhook,
              },
            ] as const
          ).map((g) => (
            <div key={g.key} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-white">
                    {GLOBAL_WEBHOOK_LABELS[g.key]}
                  </p>
                  <p className="text-[11px] text-slate-500">{g.hint}</p>
                </div>
                {g.ok ? (
                  <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Webhook OK
                  </span>
                ) : (
                  <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Brak webhooka
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className={inputClass}
                  value={g.url}
                  onChange={(e) => g.setUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/…"
                  spellCheck={false}
                  disabled={pending}
                />
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => saveGlobal(g.key, g.url)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#39FF14] px-4 py-3 text-xs font-black uppercase tracking-wider text-[#0B0F19] disabled:opacity-50"
                  >
                    {pending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Zapisz
                  </button>
                  <button
                    type="button"
                    disabled={pending || !g.url.trim()}
                    onClick={() => {
                      g.setUrl("");
                      saveGlobal(g.key, "");
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/40 px-3 py-3 text-xs font-bold text-red-300 hover:bg-red-950/40 disabled:opacity-40"
                    title="Usuń webhook"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-6">
        <div className="mb-1 flex items-center gap-2">
          <Webhook className="h-5 w-5 text-[#39FF14]" />
          <h2 className="text-lg font-bold text-white">Webhooki dywizyjne</h2>
        </div>
        <p className="mb-2 text-xs text-slate-500">
          Mapowanie po poziomie (tier): Level 1 → najwyższa dywizja po imporcie (np. Premier
          League). Po Hard Reset sloty zostają; po imporcie automatycznie pasują do{" "}
          <code className="text-slate-400">divisions.tier</code>.
        </p>
        {initial.emptyStructure ? (
          <p className="mb-4 flex items-start gap-2 rounded-xl border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-xs text-slate-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            Brak aktywnego sezonu / dywizji — edytujesz trwałe sloty Level N. Po Master Import
            Level 1 podepnie się pod najwyższą dywizję.
          </p>
        ) : null}

        <div className="space-y-4">
          {slots.map((slot) => {
            const draft = divDrafts[slot.level] ?? slot.url ?? "";
            return (
              <div
                key={slot.level}
                className={`rounded-xl border p-4 ${
                  slot.missing
                    ? "border-red-500/40 bg-red-950/20"
                    : slot.orphan
                      ? "border-slate-600/60 bg-slate-900/40"
                      : "border-slate-700/50 bg-slate-900/30"
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-white">
                      Level {slot.level}
                      {slot.divisionName
                        ? `: ${slot.divisionName}`
                        : " · Webhook dla poziomu"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {slot.seasonName
                        ? `Sezon: ${slot.seasonName}`
                        : slot.orphan
                          ? "Brak dywizji na tym poziomie w obecnym sezonie"
                          : "Slot trwały (bez struktury)"}
                    </p>
                  </div>
                  {slot.missing ? (
                    <span className="rounded-md bg-red-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-300">
                      Brak webhooka
                    </span>
                  ) : slot.hasWebhook ? (
                    <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      Webhook OK
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    className={inputClass}
                    value={draft}
                    onChange={(e) =>
                      setDivDrafts((prev) => ({
                        ...prev,
                        [slot.level]: e.target.value,
                      }))
                    }
                    placeholder="https://discord.com/api/webhooks/…"
                    spellCheck={false}
                    disabled={pending}
                  />
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => saveDivision(slot.level, draft)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#39FF14] px-4 py-3 text-xs font-black uppercase tracking-wider text-[#0B0F19] disabled:opacity-50"
                    >
                      {pending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Zapisz
                    </button>
                    <button
                      type="button"
                      disabled={pending || !draft.trim()}
                      onClick={() => {
                        setDivDrafts((prev) => ({ ...prev, [slot.level]: "" }));
                        saveDivision(slot.level, "");
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/40 px-3 py-3 text-xs font-bold text-red-300 hover:bg-red-950/40 disabled:opacity-40"
                      title="Usuń webhook"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={() => setExtraLevels((prev) => [...prev, maxLevel + 1])}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:border-[#39FF14]/50 hover:text-white"
        >
          <Plus className="h-4 w-4" />
          Dodaj webhook dla kolejnego poziomu (Level {maxLevel + 1})
        </button>
      </section>
    </div>
  );
}
