"use client";

import {
  CalendarDays,
  Check,
  Copy,
  Download,
  Flame,
  ImageIcon,
  Loader2,
  Paperclip,
  Send,
  Sparkles,
  Swords,
  Table2,
  Trash2,
  Users,
} from "lucide-react";
import type { RefObject } from "react";
import type { ContentHubCapturePayload, ContentHubDivisionOption } from "@/app/admin/actions/contentHub";
import { ContentHubDivisionEditor } from "@/components/admin/content-hub/ContentHubDivisionEditor";
import { DiscordEmbedPreview } from "@/components/admin/content-hub/DiscordEmbedPreview";
import {
  DISCORD_MAX_FILES,
} from "@/lib/admin/discordClientSend";
import {
  DISCORD_SERVER_LABELS,
  type DiscordServerTarget,
} from "@/lib/admin/discordWebhooks";

const textareaClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-950 px-4 py-3 font-mono text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-[#39FF14]";

const X_LIMIT = 280;

export type ContentHubSendPanelProps = {
  isDivisionMode: boolean;
  isGlobalMode: boolean;
  isPreview: boolean;
  isSummary: boolean;
  isFaRanking: boolean;
  gameweek: number;
  selectedDivisions: ContentHubDivisionOption[];
  xComDrafts: Record<string, string>;
  discordJsons: Record<string, string>;
  globalDiscordJson: string;
  globalJsonError: string | null;
  capturesByDivision: Record<string, ContentHubCapturePayload | null>;
  captureLoadingByDivision: Record<string, boolean>;
  bulkXPending?: boolean;
  bulkDiscordPending?: boolean;
  singleXPending: boolean;
  singleDiscordPending: boolean;
  attachGraphics: boolean;
  canAttachGraphics: boolean;
  customFiles: File[];
  customFileInputRef: RefObject<HTMLInputElement | null>;
  sendServers: Record<DiscordServerTarget, boolean>;
  webhookByServer: Record<DiscordServerTarget, boolean>;
  selectedServerTargets: DiscordServerTarget[];
  hasWebhook: boolean;
  sendPending: boolean;
  sendAllPending: boolean;
  sendProgress: string | null;
  anyCaptureLoading: boolean;
  allCapturesReady: boolean;
  faRankingLoading: boolean;
  faRankingReady: boolean;
  faRosterLoading: boolean;
  faRosterCount: number;
  downloadBusy: string | null;
  copiedGlobalX: boolean;
  globalXDraft: string;
  xLen: number;
  onXChange: (divId: string, value: string) => void;
  onDiscordChange: (divId: string, value: string) => void;
  onGlobalDiscordChange: (value: string) => void;
  onGenerateXSingle: (divId: string) => void;
  onGenerateDiscordSingle: (divId: string) => void;
  onCopyGlobalX: () => void;
  onAttachGraphicsChange: (checked: boolean) => void;
  onSendServersChange: (server: DiscordServerTarget, checked: boolean) => void;
  onCustomFilesChange: (files: File[]) => void;
  onSendAllDivisions: () => void;
  onSendGlobal: () => void;
  onDownloadImage: (
    divId: string,
    ref: RefObject<HTMLDivElement | null>,
    filename: string,
    kind: "wyniki" | "tabela" | "terminarz",
  ) => void;
  onDownloadFaRoster: () => void;
  getResultsRef: (divId: string) => RefObject<HTMLDivElement | null>;
  getStandingsRef: (divId: string) => RefObject<HTMLDivElement | null>;
  getPreviewRef: (divId: string) => RefObject<HTMLDivElement | null>;
  onGlobalJsonError: (err: string | null) => void;
};

export function ContentHubSendPanel(props: ContentHubSendPanelProps) {
  const {
    isDivisionMode,
    isGlobalMode,
    isPreview,
    isSummary,
    isFaRanking,
    gameweek,
    selectedDivisions,
    xComDrafts,
    discordJsons,
    globalDiscordJson,
    globalJsonError,
    capturesByDivision,
    captureLoadingByDivision,
    singleXPending,
    singleDiscordPending,
    attachGraphics,
    canAttachGraphics,
    customFiles,
    customFileInputRef,
    sendServers,
    webhookByServer,
    selectedServerTargets,
    hasWebhook,
    sendPending,
    sendAllPending,
    sendProgress,
    anyCaptureLoading,
    allCapturesReady,
    faRankingLoading,
    faRankingReady,
    faRosterLoading,
    faRosterCount,
    downloadBusy,
    copiedGlobalX,
    globalXDraft,
    xLen,
    onXChange,
    onDiscordChange,
    onGlobalDiscordChange,
    onGenerateXSingle,
    onGenerateDiscordSingle,
    onCopyGlobalX,
    onAttachGraphicsChange,
    onSendServersChange,
    onCustomFilesChange,
    onSendAllDivisions,
    onSendGlobal,
    onDownloadImage,
    onDownloadFaRoster,
    getResultsRef,
    getStandingsRef,
    getPreviewRef,
    onGlobalJsonError,
  } = props;

  if (!isDivisionMode && !isGlobalMode) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-700 px-6 py-12 text-center text-sm text-slate-500">
        Zaznacz dywizje H2H (multi-select) lub wybierz cel globalny FA Ranking / FA Cup.
      </section>
    );
  }

  return (
    <>
      {isDivisionMode ? (
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            B · C · Edycja treści per dywizja ({selectedDivisions.length})
          </h2>
          {selectedDivisions.map((division, index) => (
            <ContentHubDivisionEditor
              key={division.id}
              division={division}
              gameweek={gameweek}
              isPreview={isPreview}
              isSummary={isSummary}
              xDraft={xComDrafts[division.id] ?? ""}
              discordJson={discordJsons[division.id] ?? ""}
              capture={capturesByDivision[division.id] ?? null}
              captureLoading={Boolean(captureLoadingByDivision[division.id])}
              xGenPending={singleXPending}
              discordGenPending={singleDiscordPending}
              defaultOpen={index < 2}
              onXChange={(v) => onXChange(division.id, v)}
              onDiscordChange={(v) => onDiscordChange(division.id, v)}
              onGenerateX={() => onGenerateXSingle(division.id)}
              onGenerateDiscord={() => onGenerateDiscordSingle(division.id)}
            />
          ))}

          {isSummary ? (
            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              {selectedDivisions.map((division) => {
                const capture = capturesByDivision[division.id];
                const loading = captureLoadingByDivision[division.id];
                return (
                  <div key={division.id} className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={Boolean(downloadBusy) || loading || !capture}
                      onClick={() =>
                        onDownloadImage(
                          division.id,
                          getResultsRef(division.id),
                          `wyniki-${division.name}-gw${gameweek}.png`,
                          "wyniki",
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/35 bg-sky-500/10 px-2.5 py-1.5 text-[10px] font-bold uppercase text-sky-200 disabled:opacity-40"
                    >
                      <Swords className="h-3 w-3" />
                      {division.name} · Wyniki
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(downloadBusy) || loading || !capture}
                      onClick={() =>
                        onDownloadImage(
                          division.id,
                          getStandingsRef(division.id),
                          `tabela-${division.name}-gw${gameweek}.png`,
                          "tabela",
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-bold uppercase text-emerald-200 disabled:opacity-40"
                    >
                      <Table2 className="h-3 w-3" />
                      {division.name} · Tabela
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}

          {isPreview ? (
            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              {selectedDivisions.map((division) => {
                const capture = capturesByDivision[division.id];
                const loading = captureLoadingByDivision[division.id];
                return (
                  <button
                    key={division.id}
                    type="button"
                    disabled={Boolean(downloadBusy) || loading || !capture}
                    onClick={() =>
                      onDownloadImage(
                        division.id,
                        getPreviewRef(division.id),
                        `terminarz-${division.name}-gw${gameweek}.png`,
                        "terminarz",
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[10px] font-bold uppercase text-amber-200 disabled:opacity-40"
                  >
                    <CalendarDays className="h-3 w-3" />
                    {division.name} · Terminarz
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      {isGlobalMode ? (
        <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-300">
            B · C · Treść globalna
          </h2>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Discord JSON
          </label>
          <textarea
            className={`${textareaClass} min-h-[260px]`}
            value={globalDiscordJson}
            onChange={(e) => onGlobalDiscordChange(e.target.value)}
            spellCheck={false}
          />
          {globalJsonError ? (
            <p className="mt-2 text-xs font-semibold text-rose-500">{globalJsonError}</p>
          ) : null}
          <div className="mt-4 rounded-xl border border-slate-700/40 bg-slate-950/50 p-4">
            <DiscordEmbedPreview
              rawJson={globalDiscordJson}
              onParseError={onGlobalJsonError}
            />
          </div>
          {isFaRanking ? (
            <button
              type="button"
              disabled={Boolean(downloadBusy) || faRosterLoading || faRosterCount === 0}
              onClick={onDownloadFaRoster}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#39FF14]/40 bg-[#39FF14]/10 px-3.5 py-2 text-xs font-bold uppercase text-[#39FF14] disabled:opacity-40"
            >
              {downloadBusy === "fa-roster" || faRosterLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Users className="h-3.5 w-3.5" />
              )}
              Generuj listę The FA Ranking (PNG)
            </button>
          ) : null}
          {globalXDraft ? (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <p className="mb-2 text-[10px] font-bold uppercase text-slate-500">
                Podgląd X ({xLen}/{X_LIMIT})
              </p>
              <pre className="whitespace-pre-wrap text-xs text-slate-300">{globalXDraft}</pre>
              <button
                type="button"
                onClick={onCopyGlobalX}
                className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400"
              >
                {copiedGlobalX ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                Kopiuj X
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-300">
          D · Wysyłka Discord
        </h2>

        <label
          className={`mb-4 flex items-start gap-3 rounded-xl border border-slate-700/60 bg-slate-950/50 px-4 py-3 ${
            canAttachGraphics ? "cursor-pointer" : "cursor-not-allowed opacity-60"
          }`}
        >
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[#39FF14]"
            checked={attachGraphics && canAttachGraphics}
            disabled={!canAttachGraphics}
            onChange={(e) => onAttachGraphicsChange(e.target.checked)}
          />
          <span className="min-w-0 text-sm text-slate-200">
            {isFaRanking
              ? "Dołącz karuzelę PNG The FA Ranking"
              : isPreview
                ? "Dołącz grafikę terminarza (per dywizja)"
                : "Dołącz wygenerowane grafiki (Wyniki + Tabela per dywizja)"}
            {isDivisionMode && anyCaptureLoading ? (
              <span className="ml-1 text-amber-400"> · ładowanie capture…</span>
            ) : null}
            {isDivisionMode && !anyCaptureLoading && allCapturesReady ? (
              <span className="ml-1 text-emerald-400"> · grafiki gotowe</span>
            ) : null}
            {isFaRanking && faRankingLoading ? (
              <span className="ml-1 text-amber-400"> · FA Ranking…</span>
            ) : null}
            {isFaRanking && faRankingReady ? (
              <span className="ml-1 text-emerald-400"> · karuzela gotowa</span>
            ) : null}
          </span>
        </label>

        <div className="mb-4 space-y-2">
          <input
            ref={customFileInputRef as RefObject<HTMLInputElement>}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              if (!picked.length) return;
              const next = [...customFiles];
              for (const file of picked) {
                if (
                  !next.some(
                    (f) =>
                      f.name === file.name &&
                      f.size === file.size &&
                      f.lastModified === file.lastModified,
                  )
                ) {
                  next.push(file);
                }
              }
              onCustomFilesChange(next.slice(0, DISCORD_MAX_FILES));
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={!canAttachGraphics}
            onClick={() => customFileInputRef.current?.click()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-600/70 bg-slate-800 px-3.5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-200 disabled:opacity-40"
          >
            <Paperclip className="h-3.5 w-3.5" />
            Dodaj własne grafiki (opcjonalnie)
          </button>
          {customFiles.length > 0 ? (
            <ul className="space-y-1.5 rounded-xl border border-slate-700/50 bg-slate-950/40 px-3 py-2.5">
              {customFiles.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2 text-xs text-slate-300"
                >
                  <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                  <span className="flex-1 truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      onCustomFilesChange(customFiles.filter((_, i) => i !== index))
                    }
                    className="text-slate-500 hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <fieldset className="space-y-2 rounded-xl border border-slate-700/50 bg-slate-950/50 p-4">
          <legend className="px-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
            Serwer Discord
          </legend>
          {(["NA_MINUSIE", "FPL_ARENA"] as DiscordServerTarget[]).map((server) => (
            <label
              key={server}
              className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-1.5"
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[#39FF14]"
                checked={sendServers[server]}
                onChange={(e) => onSendServersChange(server, e.target.checked)}
              />
              <span>
                <span className="block text-sm font-bold text-white">
                  {DISCORD_SERVER_LABELS[server]}
                </span>
                <span
                  className={`text-[11px] ${
                    webhookByServer[server] ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {webhookByServer[server] ? "Webhook OK" : "Brak webhooka"}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        {sendProgress ? (
          <p className="mt-4 text-sm font-semibold text-amber-200" role="status">
            {sendProgress}
          </p>
        ) : null}

        {isDivisionMode ? (
          <button
            type="button"
            disabled={
              sendAllPending ||
              !selectedDivisions.length ||
              !selectedServerTargets.length ||
              (attachGraphics && (!allCapturesReady || anyCaptureLoading))
            }
            onClick={onSendAllDivisions}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-orange-500/50 bg-orange-500/20 px-4 py-4 text-sm font-black uppercase tracking-wider text-orange-100 disabled:opacity-40"
          >
            {sendAllPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Flame className="h-4 w-4" />
            )}
            🚀 Wyślij wszystkie zaznaczone (webhooki)
            <Send className="h-3.5 w-3.5 opacity-70" />
          </button>
        ) : null}

        {isGlobalMode ? (
          <button
            type="button"
            disabled={
              sendPending ||
              !globalDiscordJson.trim() ||
              Boolean(globalJsonError) ||
              !selectedServerTargets.length ||
              !hasWebhook ||
              (attachGraphics && isFaRanking && (faRankingLoading || !faRankingReady))
            }
            onClick={onSendGlobal}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/15 px-4 py-3 text-sm font-black uppercase tracking-wider text-orange-200 disabled:opacity-40"
          >
            {sendPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Flame className="h-4 w-4" />
            )}
            Wyślij globalnie przez Webhook
            <Send className="h-3.5 w-3.5 opacity-70" />
          </button>
        ) : null}
      </section>
    </>
  );
}
