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
import { getStatsLabMenuChrome } from "@/lib/stats-lab/menuChrome";

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
  const chrome = getStatsLabMenuChrome(chartTheme);
  const isLight = chartTheme === "ANALYST_LIGHT";
  const isScout = chartTheme === "SCOUT_DARK";
  const btnPng = isLight
    ? "inline-flex min-h-[28px] items-center gap-1.5 rounded-xl border border-emerald-800 bg-emerald-700 px-3 py-2 text-[10px] font-black text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
    : "inline-flex min-h-[28px] items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-400 px-3 py-2 text-[10px] font-black text-slate-950 shadow-sm hover:bg-emerald-300 disabled:opacity-50";
  const btnNeutral = isLight
    ? "inline-flex min-h-[28px] items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-800 hover:bg-slate-200 disabled:opacity-50"
    : isScout
      ? "inline-flex min-h-[28px] items-center gap-1.5 rounded-xl border border-teal-700 bg-[#0d2d37] px-3 py-2 text-[10px] font-bold text-teal-50 hover:bg-teal-900/60 disabled:opacity-50"
      : "inline-flex min-h-[28px] items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[10px] font-bold text-slate-100 hover:bg-slate-800 disabled:opacity-50";
  const btnAudit = btnNeutral;

  return (
    <div className={`space-y-3 rounded-2xl p-4 ${chrome.panel}`}>
      <div className="flex flex-wrap items-center gap-2">
        <p className={`mr-2 text-[10px] font-black uppercase tracking-[0.2em] ${chrome.mutedLabel}`}>
          {lang === "pl" ? "Eksport & publikacja" : "Export & publish"}
        </p>

        <button
          type="button"
          disabled={disabled}
          onClick={() => void onDownloadPng()}
          className={btnPng}
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
          className={btnNeutral}
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
          className={btnNeutral}
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
          className={btnNeutral}
        >
          <Send className="h-3.5 w-3.5" />
          {lang === "pl" ? "Wyślij na Discord" : "Send to Discord"}
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => void onDownloadAuditJson()}
          className={btnAudit}
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
          className={btnAudit}
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
        <div className={`space-y-3 rounded-xl p-3 ${chrome.group}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${chrome.mutedLabel}`}>
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
                  className={`rounded-lg px-3 py-1.5 text-[10px] uppercase tracking-wider ${
                    on ? chrome.activeBtn : chrome.inactiveBtn
                  }`}
                >
                  {DISCORD_SERVER_LABELS[target]}
                </button>
              );
            })}
          </div>
          <pre className={`max-h-28 overflow-auto rounded-lg p-2 text-[10px] leading-relaxed whitespace-pre-wrap ${chrome.input}`}>
            {postText}
          </pre>
          <button
            type="button"
            disabled={disabled}
            onClick={() => void onSendDiscord()}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[10px] ${chrome.exportDiscord}`}
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
