"use client";

import {
  useMemo,
  useState,
  type MutableRefObject,
  type RefObject,
} from "react";
import {
  Check,
  ClipboardCopy,
  Download,
  FileJson,
  Loader2,
  PenLine,
  Send,
} from "lucide-react";
import { getDiscordWebhookForSend } from "@/app/admin/actions/contentHub";
import {
  dataUrlToFile,
  formatDiscordMultiSendToast,
  postDiscordWebhookFromClient,
} from "@/lib/admin/discordClientSend";
import {
  DISCORD_SERVER_LABELS,
  DISCORD_SERVER_TARGETS,
  type DiscordServerTarget,
} from "@/lib/admin/discordWebhooks";
import type { StatsLabComparisonResult } from "@/lib/stats-lab/analyticsEngine";
import type { StatsLabQueryFilter } from "@/lib/stats-lab/presets";
import type { FplStatKey } from "@/lib/stats-lab/types";
import type {
  StatsLabLang,
  StatsLabScaleMode,
  StreakMetricKey,
} from "@/lib/stats-lab/i18n";
import type {
  StatsLabChartThemeId,
  StatsLabVizMode,
} from "@/components/admin/stats-lab/chartTheme";
import {
  captureStatsLabPngBlob,
  captureStatsLabPngDataUrl,
  copyPngBlobToClipboard,
  downloadDataUrl,
} from "@/lib/stats-lab/exportCapture";
import {
  buildStatsLabDiscordJson,
  buildStatsLabExportFileName,
  buildStatsLabSocialPost,
} from "@/lib/stats-lab/exportPostCopy";
import {
  buildAuditJsonFileName,
  buildChartStudioAiAuditReport,
  copyJsonToClipboard,
  downloadJsonFile,
} from "@/lib/stats-lab/auditExport";

type Props = {
  exportRef:
    | RefObject<HTMLDivElement | null>
    | MutableRefObject<HTMLDivElement | null>;
  result: StatsLabComparisonResult | null;
  filter: StatsLabQueryFilter;
  vizMode: StatsLabVizMode;
  lang: StatsLabLang;
  scaleMode: StatsLabScaleMode;
  seasonCode: string;
  customTitle: string;
  chartTheme?: StatsLabChartThemeId;
  activeStreakKeys?: StreakMetricKey[];
  showNegativeBreakdown?: boolean;
  streakSortKey?: StreakMetricKey;
  /** Osie Scatter — dokumentowane w audit.json. */
  scatterAxisX?: FplStatKey | null;
  scatterAxisY?: FplStatKey | null;
};

type FlashKind = "ok" | "err";

export function StatsLabExportBar({
  exportRef,
  result,
  filter,
  vizMode,
  lang,
  scaleMode,
  seasonCode,
  customTitle,
  chartTheme = "ARENA_DARK",
  activeStreakKeys = [],
  showNegativeBreakdown = true,
  streakSortKey,
  scatterAxisX = null,
  scatterAxisY = null,
}: Props) {
  const [busy, setBusy] = useState<
    null | "png" | "copy" | "post" | "discord" | "audit" | "auditCopy"
  >(null);
  const [flash, setFlash] = useState<{ kind: FlashKind; text: string } | null>(
    null,
  );
  const [discordOpen, setDiscordOpen] = useState(false);
  const [serverTargets, setServerTargets] = useState<DiscordServerTarget[]>([
    "FPL_ARENA",
  ]);
  const [copiedPost, setCopiedPost] = useState(false);
  const [copiedPng, setCopiedPng] = useState(false);

  const players = result?.plottedPlayers ?? [];
  const metrics = result?.activeMetrics?.length
    ? result.activeMetrics
    : filter.activeMetrics;
  const gwRange = result?.effectiveGwRange ?? ([0, 0] as [number, number]);

  const fileName = useMemo(
    () => buildStatsLabExportFileName({ filter, vizMode, gwRange }),
    [filter, vizMode, gwRange],
  );

  const postText = useMemo(
    () =>
      buildStatsLabSocialPost({
        lang,
        vizMode,
        filter,
        scaleMode,
        seasonCode,
        gwRange,
        players,
        metrics,
        title: customTitle,
      }),
    [
      lang,
      vizMode,
      filter,
      scaleMode,
      seasonCode,
      gwRange,
      players,
      metrics,
      customTitle,
    ],
  );

  function showFlash(kind: FlashKind, text: string) {
    setFlash({ kind, text });
    window.setTimeout(() => setFlash(null), 3200);
  }

  async function ensureNode(): Promise<HTMLDivElement> {
    const node = exportRef.current;
    if (!node) throw new Error("Brak węzła eksportu PNG.");
    // Daj przeglądarce klatkę na layout off-screen
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    return node;
  }

  async function onDownloadPng() {
    if (!players.length) {
      showFlash(
        "err",
        lang === "pl"
          ? "Brak graczy na wykresie — zmień filtry."
          : "No players on chart — change filters.",
      );
      return;
    }
    setBusy("png");
    try {
      const node = await ensureNode();
      const dataUrl = await captureStatsLabPngDataUrl(node);
      downloadDataUrl(dataUrl, fileName);
      showFlash(
        "ok",
        lang === "pl"
          ? `Zapisano PNG HD: ${fileName}`
          : `Saved HD PNG: ${fileName}`,
      );
    } catch (e) {
      console.error("[StatsLabExport] download", e);
      showFlash(
        "err",
        e instanceof Error
          ? e.message
          : lang === "pl"
            ? "Nie udało się wygenerować PNG."
            : "Failed to generate PNG.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function onCopyPng() {
    if (!players.length) {
      showFlash(
        "err",
        lang === "pl"
          ? "Brak graczy na wykresie — zmień filtry."
          : "No players on chart — change filters.",
      );
      return;
    }
    setBusy("copy");
    try {
      const node = await ensureNode();
      const blob = await captureStatsLabPngBlob(node);
      await copyPngBlobToClipboard(blob);
      setCopiedPng(true);
      window.setTimeout(() => setCopiedPng(false), 2200);
      showFlash(
        "ok",
        lang === "pl"
          ? "Skopiowano grafikę HD do schowka!"
          : "HD graphic copied to clipboard!",
      );
    } catch (e) {
      console.error("[StatsLabExport] copy png", e);
      showFlash(
        "err",
        e instanceof Error
          ? e.message
          : lang === "pl"
            ? "Nie udało się skopiować PNG."
            : "Failed to copy PNG.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function onCopyPost() {
    setBusy("post");
    try {
      await navigator.clipboard.writeText(postText);
      setCopiedPost(true);
      window.setTimeout(() => setCopiedPost(false), 2200);
      showFlash(
        "ok",
        lang === "pl"
          ? "Skopiowano gotowy post na X.com / Social!"
          : "Social post text copied!",
      );
    } catch (e) {
      showFlash(
        "err",
        e instanceof Error
          ? e.message
          : lang === "pl"
            ? "Nie udało się skopiować tekstu."
            : "Failed to copy post text.",
      );
    } finally {
      setBusy(null);
    }
  }

  function buildAuditReport() {
    if (!result) throw new Error("Brak wyniku porównania.");
    return buildChartStudioAiAuditReport({
      result,
      filter,
      vizMode,
      lang,
      chartTheme,
      scaleMode,
      seasonCode,
      activeStreakKeys,
      showNegativeBreakdown,
      streakSortKey: streakSortKey ?? filter.streakSortKey,
      scatterAxisX,
      scatterAxisY,
      rootElement: exportRef.current,
    });
  }

  async function onDownloadAuditJson() {
    if (!players.length) {
      showFlash(
        "err",
        lang === "pl"
          ? "Brak graczy na wykresie — zmień filtry."
          : "No players on chart — change filters.",
      );
      return;
    }
    setBusy("audit");
    try {
      await ensureNode();
      const report = buildAuditReport();
      const name = buildAuditJsonFileName({
        module: "CHART_STUDIO",
        subView: vizMode,
        positions: filter.positions,
        gwRange,
      });
      downloadJsonFile(name, report);
      showFlash(
        "ok",
        lang === "pl"
          ? `Zapisano audyt AI: ${name}`
          : `Saved AI audit: ${name}`,
      );
    } catch (e) {
      console.error("[StatsLabExport] audit json", e);
      showFlash(
        "err",
        e instanceof Error
          ? e.message
          : lang === "pl"
            ? "Nie udało się wygenerować audytu AI."
            : "Failed to build AI audit.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function onCopyAuditJson() {
    if (!players.length) {
      showFlash(
        "err",
        lang === "pl"
          ? "Brak graczy na wykresie — zmień filtry."
          : "No players on chart — change filters.",
      );
      return;
    }
    setBusy("auditCopy");
    try {
      await ensureNode();
      const report = buildAuditReport();
      await copyJsonToClipboard(report);
      showFlash(
        "ok",
        lang === "pl"
          ? "Skopiowano pełny raport diagnostyczny AI do schowka!"
          : "Full AI diagnostic report copied to clipboard!",
      );
    } catch (e) {
      console.error("[StatsLabExport] audit copy", e);
      showFlash(
        "err",
        e instanceof Error
          ? e.message
          : lang === "pl"
            ? "Nie udało się skopiować audytu AI."
            : "Failed to copy AI audit.",
      );
    } finally {
      setBusy(null);
    }
  }

  function toggleServer(target: DiscordServerTarget) {
    setServerTargets((prev) => {
      if (prev.includes(target)) {
        const next = prev.filter((t) => t !== target);
        return next.length ? next : prev;
      }
      return DISCORD_SERVER_TARGETS.filter(
        (t) => t === target || prev.includes(t),
      );
    });
  }

  async function onSendDiscord() {
    if (!players.length) {
      showFlash(
        "err",
        lang === "pl"
          ? "Brak graczy na wykresie — zmień filtry."
          : "No players on chart — change filters.",
      );
      return;
    }
    if (!serverTargets.length) {
      showFlash(
        "err",
        lang === "pl"
          ? "Wybierz co najmniej jeden serwer Discord."
          : "Select at least one Discord server.",
      );
      return;
    }
    setBusy("discord");
    try {
      const node = await ensureNode();
      const dataUrl = await captureStatsLabPngDataUrl(node);
      const file = await dataUrlToFile(dataUrl, fileName);
      const dest = await getDiscordWebhookForSend(
        {
          kind: "global",
          seasonId: "stats-lab",
          channel: "fa_ranking",
        },
        serverTargets,
      );
      if (!dest || "error" in dest) {
        showFlash(
          "err",
          dest && "error" in dest
            ? dest.error
            : lang === "pl"
              ? "Brak webhooka Discord (The FA Ranking)."
              : "Missing Discord webhook (The FA Ranking).",
        );
        return;
      }
      const rawJson = buildStatsLabDiscordJson({
        lang,
        content: postText,
        fileName: file.name,
      });
      const posted = await postDiscordWebhookFromClient({
        destinations: dest.destinations,
        rawJson,
        files: [file],
      });
      if (!posted.ok) {
        showFlash("err", posted.error);
        return;
      }
      const toast = formatDiscordMultiSendToast(posted.results);
      showFlash("ok", `${toast.message} · ${file.name}`);
      setDiscordOpen(false);
    } catch (e) {
      console.error("[StatsLabExport] discord", e);
      showFlash(
        "err",
        e instanceof Error
          ? e.message
          : lang === "pl"
            ? "Wysyłka Discord nieudana."
            : "Discord send failed.",
      );
    } finally {
      setBusy(null);
    }
  }

  const disabled = busy != null || !players.length;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          {lang === "pl" ? "Eksport & publikacja" : "Export & publish"}
        </p>

        <button
          type="button"
          disabled={disabled}
          onClick={() => void onDownloadPng()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-40"
        >
          {busy === "png" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {lang === "pl" ? "Pobierz PNG (HD)" : "Download PNG ↓"}
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => void onCopyPng()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-200 hover:border-slate-400 disabled:opacity-40"
        >
          {busy === "copy" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : copiedPng ? (
            <Check className="h-3.5 w-3.5 text-[#39FF14]" />
          ) : (
            <ClipboardCopy className="h-3.5 w-3.5" />
          )}
          {lang === "pl" ? "Kopiuj grafikę do schowka" : "Copy PNG 📋"}
        </button>

        <button
          type="button"
          disabled={busy != null}
          onClick={() => void onCopyPost()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-200 hover:border-slate-400 disabled:opacity-40"
        >
          {busy === "post" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : copiedPost ? (
            <Check className="h-3.5 w-3.5 text-[#39FF14]" />
          ) : (
            <PenLine className="h-3.5 w-3.5" />
          )}
          {lang === "pl"
            ? "Kopiuj gotowy post na X.com"
            : "Copy Post Text ✍️"}
        </button>

        <button
          type="button"
          disabled={busy != null}
          onClick={() => setDiscordOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
          {lang === "pl" ? "Wyślij na Discord" : "Send to Discord"}
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => void onDownloadAuditJson()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-amber-100 hover:bg-amber-500/20 disabled:opacity-40"
          title={
            lang === "pl"
              ? "Pełny raport diagnostyczny (filtry + wzory + matchTrace + DOM)"
              : "Full diagnostic report (filters + formulas + matchTrace + DOM)"
          }
        >
          {busy === "audit" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileJson className="h-3.5 w-3.5" />
          )}
          {lang === "pl"
            ? "🔍 Pobierz Audyt AI (.json)"
            : "🔍 Download AI Audit JSON"}
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => void onCopyAuditJson()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-amber-100 hover:bg-amber-500/20 disabled:opacity-40"
        >
          {busy === "auditCopy" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ClipboardCopy className="h-3.5 w-3.5" />
          )}
          {lang === "pl" ? "📋 Kopiuj JSON dla AI" : "📋 Copy AI Audit"}
        </button>
      </div>

      {discordOpen ? (
        <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/80 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {lang === "pl"
              ? "Serwer docelowy · kanał The FA Ranking"
              : "Target server · The FA Ranking channel"}
          </p>
          <div className="flex flex-wrap gap-2">
            {DISCORD_SERVER_TARGETS.map((target) => {
              const on = serverTargets.includes(target);
              return (
                <button
                  key={target}
                  type="button"
                  onClick={() => toggleServer(target)}
                  className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
                    on
                      ? "bg-[#39FF14] text-black"
                      : "border border-slate-700 text-slate-400"
                  }`}
                >
                  {DISCORD_SERVER_LABELS[target]}
                </button>
              );
            })}
          </div>
          <pre className="max-h-28 overflow-auto rounded-lg border border-slate-800 bg-black/40 p-2 text-[10px] leading-relaxed text-slate-400 whitespace-pre-wrap">
            {postText}
          </pre>
          <button
            type="button"
            disabled={disabled}
            onClick={() => void onSendDiscord()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#5865F2] px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white hover:brightness-110 disabled:opacity-40"
          >
            {busy === "discord" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {lang === "pl"
              ? "Wyślij PNG + post na Discord"
              : "Send PNG + post to Discord"}
          </button>
        </div>
      ) : null}

      {flash ? (
        <p
          className={`rounded-lg px-3 py-2 text-xs font-semibold ${
            flash.kind === "ok"
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border border-rose-500/30 bg-rose-500/10 text-rose-200"
          }`}
        >
          {flash.text}
        </p>
      ) : null}
    </div>
  );
}
