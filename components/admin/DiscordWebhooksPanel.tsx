"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Loader2,
  Plus,
  Save,
  Shield,
  Trash2,
  Webhook,
} from "lucide-react";
import {
  upsertDivisionLevelWebhook,
  upsertGlobalWebhook,
  type WebhooksAdminDivisionSlot,
  type WebhooksAdminPayload,
  type WebhooksAdminServerSlice,
} from "@/app/admin/actions/discordWebhooks";
import {
  DISCORD_SERVER_LABELS,
  DISCORD_SERVER_TARGETS,
  GLOBAL_WEBHOOK_LABELS,
  type DiscordServerTarget,
} from "@/lib/admin/discordWebhooks";

const inputClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#39FF14]";

type GlobalKey = "FA_RANKING" | "FA_CUP";

type ServerDraft = {
  rankingUrl: string;
  cupUrl: string;
  divDrafts: Record<number, string>;
  extraLevels: number[];
};

function sliceToDraft(slice: WebhooksAdminServerSlice): ServerDraft {
  const divDrafts: Record<number, string> = {};
  for (const s of slice.divisions) divDrafts[s.level] = s.url;
  return {
    rankingUrl: slice.globals.FA_RANKING.url,
    cupUrl: slice.globals.FA_CUP.url,
    divDrafts,
    extraLevels: [],
  };
}

export function DiscordWebhooksPanel({
  initial,
}: {
  initial: WebhooksAdminPayload;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [activeServer, setActiveServer] =
    useState<DiscordServerTarget>("NA_MINUSIE");

  const [drafts, setDrafts] = useState<Record<DiscordServerTarget, ServerDraft>>(
    () => ({
      NA_MINUSIE: sliceToDraft(initial.byServer.NA_MINUSIE),
      FPL_ARENA: sliceToDraft(initial.byServer.FPL_ARENA),
    }),
  );

  useEffect(() => {
    setDrafts({
      NA_MINUSIE: sliceToDraft(initial.byServer.NA_MINUSIE),
      FPL_ARENA: sliceToDraft(initial.byServer.FPL_ARENA),
    });
  }, [initial]);

  const slice = initial.byServer[activeServer];
  const draft = drafts[activeServer];

  const slots = useMemo(() => {
    const base: WebhooksAdminDivisionSlot[] = [...slice.divisions];
    const existing = new Set(base.map((s) => s.level));
    for (const level of draft.extraLevels) {
      if (existing.has(level)) continue;
      base.push({
        level,
        divisionId: null,
        divisionName: null,
        seasonName: null,
        webhookId: null,
        url: draft.divDrafts[level] ?? "",
        hasWebhook: false,
        missing: true,
        orphan: false,
      });
      existing.add(level);
    }
    return base.sort((a, b) => a.level - b.level);
  }, [slice.divisions, draft.extraLevels, draft.divDrafts]);

  const maxLevel = Math.max(
    initial.maxConfiguredLevel,
    ...slots.map((s) => s.level),
    0,
  );

  function patchDraft(
    server: DiscordServerTarget,
    patch: Partial<ServerDraft>,
  ) {
    setDrafts((prev) => ({
      ...prev,
      [server]: { ...prev[server], ...patch },
    }));
  }

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
    run(() => upsertGlobalWebhook(key, url, activeServer));
  }

  function saveDivision(level: number, url: string) {
    run(() => upsertDivisionLevelWebhook(level, url, activeServer));
  }

  if (initial.missingTable) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-950/30 p-6 text-sm text-amber-100">
        <p className="font-bold">
          Brak tabeli <code>discord_webhooks</code>
        </p>
        <p className="mt-2 text-amber-200/80">
          Uruchom migracje w Supabase SQL Editor:{" "}
          <code className="text-amber-100">
            supabase/migrations/add_discord_webhooks.sql
          </code>{" "}
          oraz{" "}
          <code className="text-amber-100">
            add_discord_webhooks_server_target.sql
          </code>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-300">
          {toast}
        </p>
      ) : null}

      <div
        role="tablist"
        aria-label="Serwer Discord"
        className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-700/50 bg-slate-900/60 p-1.5"
      >
        {DISCORD_SERVER_TARGETS.map((server) => {
          const active = activeServer === server;
          const okCount =
            Number(initial.byServer[server].globals.FA_RANKING.hasWebhook) +
            Number(initial.byServer[server].globals.FA_CUP.hasWebhook) +
            initial.byServer[server].divisions.filter((d) => d.hasWebhook)
              .length;
          return (
            <button
              key={server}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveServer(server)}
              className={`rounded-xl px-3 py-3 text-left transition ${
                active
                  ? "bg-[#39FF14]/15 text-white ring-1 ring-[#39FF14]/40"
                  : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
                {server === "FPL_ARENA" ? (
                  <Shield className="h-4 w-4 text-sky-300" />
                ) : (
                  <Webhook className="h-4 w-4 text-[#39FF14]" />
                )}
                {DISCORD_SERVER_LABELS[server]}
              </span>
              <span className="mt-1 block text-[11px] font-medium normal-case tracking-normal text-slate-500">
                {okCount} skonfigurowanych kanałów
              </span>
            </button>
          );
        })}
      </div>

      {activeServer === "FPL_ARENA" ? (
        <p className="rounded-xl border border-sky-500/25 bg-sky-950/25 px-4 py-2.5 text-xs leading-relaxed text-sky-100/90">
          Ukryty serwer backup / test. Te same 2 kanały globalne i poziomy dywizji
          co Na Minusie — osobne URL-e. Hard Reset ich nie kasuje.
        </p>
      ) : (
        <p className="rounded-xl border border-slate-700/40 bg-slate-900/40 px-4 py-2.5 text-xs leading-relaxed text-slate-400">
          Serwer ligi live. Content Hub wysyła tu domyślnie; FPL Arena dokładasz
          checkboxem przy wysyłce.
        </p>
      )}

      <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-6">
        <div className="mb-1 flex items-center gap-2">
          <Webhook className="h-5 w-5 text-[#39FF14]" />
          <h2 className="text-lg font-bold text-white">Webhooki globalne</h2>
        </div>
        <p className="mb-5 text-xs text-slate-500">
          Stałe kanały ligi Classic FPL · {DISCORD_SERVER_LABELS[activeServer]}.
        </p>

        <div className="space-y-5">
          {(
            [
              {
                key: "FA_RANKING" as const,
                url: draft.rankingUrl,
                setUrl: (url: string) =>
                  patchDraft(activeServer, { rankingUrl: url }),
                hint: "Klasyczny ranking ligi FPL · Content Hub → The FA Ranking",
                ok: slice.globals.FA_RANKING.hasWebhook,
              },
              {
                key: "FA_CUP" as const,
                url: draft.cupUrl,
                setUrl: (url: string) =>
                  patchDraft(activeServer, { cupUrl: url }),
                hint: "Oficjalny puchar klasyczny FPL · Content Hub → FA Cup",
                ok: slice.globals.FA_CUP.hasWebhook,
              },
            ] as const
          ).map((g) => (
            <div key={`${activeServer}-${g.key}`} className="space-y-2">
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
          Mapowanie po poziomie (tier): Level 1 → najwyższa dywizja. Osobny URL
          na serwer ({DISCORD_SERVER_LABELS[activeServer]}).
        </p>
        {initial.emptyStructure ? (
          <p className="mb-4 flex items-start gap-2 rounded-xl border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-xs text-slate-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            Brak aktywnego sezonu / dywizji — edytujesz trwałe sloty Level N. Po
            Master Import Level 1 podepnie się pod najwyższą dywizję.
          </p>
        ) : null}

        <div className="space-y-4">
          {slots.map((slot) => {
            const slotDraft = draft.divDrafts[slot.level] ?? slot.url ?? "";
            return (
              <div
                key={`${activeServer}-${slot.level}`}
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
                    value={slotDraft}
                    onChange={(e) =>
                      patchDraft(activeServer, {
                        divDrafts: {
                          ...draft.divDrafts,
                          [slot.level]: e.target.value,
                        },
                      })
                    }
                    placeholder="https://discord.com/api/webhooks/…"
                    spellCheck={false}
                    disabled={pending}
                  />
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => saveDivision(slot.level, slotDraft)}
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
                      disabled={pending || !slotDraft.trim()}
                      onClick={() => {
                        patchDraft(activeServer, {
                          divDrafts: { ...draft.divDrafts, [slot.level]: "" },
                        });
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
          onClick={() =>
            patchDraft(activeServer, {
              extraLevels: [...draft.extraLevels, maxLevel + 1],
            })
          }
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:border-[#39FF14]/50 hover:text-white"
        >
          <Plus className="h-4 w-4" />
          Dodaj webhook dla kolejnego poziomu (Level {maxLevel + 1})
        </button>
      </section>
    </div>
  );
}
