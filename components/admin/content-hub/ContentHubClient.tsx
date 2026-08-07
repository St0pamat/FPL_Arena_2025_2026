"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Check,
  Copy,
  Download,
  Flame,
  ImageIcon,
  Loader2,
  Megaphone,
  Send,
  Sparkles,
  Table2,
  Swords,
} from "lucide-react";
import type { RefObject } from "react";
import {
  generateXComDraft,
  getContentHubCaptureData,
  sendDiscordWebhookJson,
  sendDiscordWebhookWithFiles,
  type ContentHubCapturePayload,
  type ContentHubDivisionOption,
  type ContentHubSeasonOption,
  type ContentHubSendTarget,
} from "@/app/admin/actions/contentHub";
import { getFARankingData } from "@/lib/public/actions";
import type { FARankingPayload } from "@/lib/public/faRanking";
import { DiscordEmbedPreview } from "@/components/admin/content-hub/DiscordEmbedPreview";
import { FARankingExportCarousel } from "@/components/admin/content-hub/FARankingExportCarousel";
import { MatchCard } from "@/components/na-minusie/hub/GameweekCenter";
import { StandingsTable } from "@/components/na-minusie/hub/StandingsTable";
import {
  DiscordExportFrame,
  slugForExport,
} from "@/components/na-minusie/hub/DiscordExport";
import { captureExportNode } from "@/components/na-minusie/hub/ExportControls";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";

const X_LIMIT = 280;

const selectClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-[#39FF14]";
const textareaClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-950 px-4 py-3 font-mono text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-[#39FF14]";

const SAMPLE_EMBED_JSON = `{
  "content": "🏆 Wyniki H2H właśnie wpadły!",
  "embeds": [
    {
      "title": "Premier League · GW 5",
      "description": "Tabela i wyniki dostępne w **Strefie Gracza**.\\nNa Minusie ™",
      "color": 5763719,
      "author": { "name": "Na Minusie ™" },
      "fields": [
        { "name": "Zwycięzcy", "value": "Lista @ z X", "inline": true },
        { "name": "Mediana", "value": "—", "inline": true }
      ],
      "footer": { "text": "Content Hub · podgląd" }
    }
  ]
}`;

type TargetKey =
  | `div:${string}`
  | `global:${string}:fa_ranking`
  | `global:${string}:fa_cup`;

function parseTargetKey(key: string): ContentHubSendTarget | null {
  if (key.startsWith("div:")) {
    const divisionId = key.slice(4);
    return divisionId ? { kind: "division", divisionId } : null;
  }
  const m = /^global:([^:]+):(fa_ranking|fa_cup)$/.exec(key);
  if (!m) return null;
  return {
    kind: "global",
    seasonId: m[1],
    channel: m[2] as "fa_ranking" | "fa_cup",
  };
}

function encodeDivision(id: string): TargetKey {
  return `div:${id}`;
}

function encodeGlobal(seasonId: string, channel: "fa_ranking" | "fa_cup"): TargetKey {
  return `global:${seasonId}:${channel}`;
}

async function waitForImages(node: HTMLElement) {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }),
    ),
  );
}

export function ContentHubClient({
  divisions,
  seasons,
  playedGameweeks,
  clubLogos = [],
}: {
  divisions: ContentHubDivisionOption[];
  seasons: ContentHubSeasonOption[];
  playedGameweeks: number[];
  clubLogos?: ClubLogoRecord[];
}) {
  const defaultTarget = useMemo((): TargetKey => {
    if (divisions[0]?.id) return encodeDivision(divisions[0].id);
    const s =
      seasons.find((x) => x.status === "PUBLISHED") ?? seasons[0] ?? null;
    if (s) return encodeGlobal(s.id, "fa_ranking");
    return "div:" as TargetKey;
  }, [divisions, seasons]);

  const [targetKey, setTargetKey] = useState<TargetKey>(defaultTarget);
  const [gameweek, setGameweek] = useState(
    () => playedGameweeks[playedGameweeks.length - 1] ?? 1,
  );
  const [xDraft, setXDraft] = useState("");
  const [discordJson, setDiscordJson] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [attachGraphics, setAttachGraphics] = useState(false);
  const [capture, setCapture] = useState<ContentHubCapturePayload | null>(null);
  const [captureLoading, setCaptureLoading] = useState(false);
  const [faRanking, setFaRanking] = useState<FARankingPayload | null>(null);
  const [faRankingLoading, setFaRankingLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [sendPending, setSendPending] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState<"wyniki" | "tabela" | null>(
    null,
  );

  const resultsRef = useRef<HTMLDivElement>(null);
  const standingsRef = useRef<HTMLDivElement>(null);
  const faCarouselRefs = useRef<RefObject<HTMLDivElement | null>[]>([]);

  const sendTarget = useMemo(() => parseTargetKey(targetKey), [targetKey]);
  const isGlobal = sendTarget?.kind === "global";
  const isFaRanking =
    sendTarget?.kind === "global" && sendTarget.channel === "fa_ranking";
  const canAttachGraphics = !isGlobal || isFaRanking;

  const selectedDivision = useMemo(() => {
    if (sendTarget?.kind !== "division") return null;
    return divisions.find((d) => d.id === sendTarget.divisionId) ?? null;
  }, [divisions, sendTarget]);

  const selectedSeason = useMemo(() => {
    if (sendTarget?.kind !== "global") return null;
    return seasons.find((s) => s.id === sendTarget.seasonId) ?? null;
  }, [seasons, sendTarget]);

  const hasWebhook = useMemo(() => {
    if (!sendTarget) return false;
    if (sendTarget.kind === "division") {
      return Boolean(selectedDivision?.hasWebhook);
    }
    if (sendTarget.channel === "fa_ranking") {
      return Boolean(selectedSeason?.hasFaRankingWebhook);
    }
    return Boolean(selectedSeason?.hasFaCupWebhook);
  }, [sendTarget, selectedDivision, selectedSeason]);

  const targetLabel = useMemo(() => {
    if (sendTarget?.kind === "division") {
      return selectedDivision?.name ?? "Dywizja";
    }
    if (sendTarget?.kind === "global") {
      const ch =
        sendTarget.channel === "fa_ranking" ? "The FA Ranking" : "FA Cup";
      return `${selectedSeason?.name ?? "Sezon"} · ${ch}`;
    }
    return "—";
  }, [sendTarget, selectedDivision, selectedSeason]);

  const divisionIdForTools =
    sendTarget?.kind === "division" ? sendTarget.divisionId : "";

  const gwOptions = useMemo(() => {
    if (playedGameweeks.length) return playedGameweeks;
    return Array.from({ length: 19 }, (_, i) => i + 1);
  }, [playedGameweeks]);

  const xLen = xDraft.length;
  const xOver = xLen > X_LIMIT;

  const showToast = useCallback((type: "ok" | "err", text: string) => {
    setToast({ type, text });
  }, []);

  useEffect(() => {
    if (!canAttachGraphics && attachGraphics) setAttachGraphics(false);
  }, [canAttachGraphics, attachGraphics]);

  // Off-screen: ładuj dane zawsze dla dywizji H2H (X download + Discord PNG)
  useEffect(() => {
    if (isGlobal || !divisionIdForTools) {
      setCapture(null);
      return;
    }
    let cancelled = false;
    setCaptureLoading(true);
    getContentHubCaptureData(divisionIdForTools, gameweek)
      .then((res) => {
        if (cancelled) return;
        if (res.error || !res.data) {
          setCapture(null);
          showToast("err", res.error ?? "Brak danych do grafik.");
          return;
        }
        setCapture(res.data);
      })
      .catch((e) => {
        if (cancelled) return;
        setCapture(null);
        showToast("err", e instanceof Error ? e.message : "Błąd ładowania grafik.");
      })
      .finally(() => {
        if (!cancelled) setCaptureLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isGlobal, divisionIdForTools, gameweek, showToast]);

  // Off-screen: The FA Ranking (karuzela 10-osobowa)
  useEffect(() => {
    if (!isFaRanking || !sendTarget || sendTarget.kind !== "global") {
      setFaRanking(null);
      faCarouselRefs.current = [];
      return;
    }
    let cancelled = false;
    setFaRankingLoading(true);
    getFARankingData(sendTarget.seasonId)
      .then((data) => {
        if (cancelled) return;
        setFaRanking(data);
      })
      .catch((e) => {
        if (cancelled) return;
        setFaRanking(null);
        showToast(
          "err",
          e instanceof Error ? e.message : "Błąd ładowania FA Ranking.",
        );
      })
      .finally(() => {
        if (!cancelled) setFaRankingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isFaRanking, sendTarget, showToast]);

  const onFaCarouselReady = useCallback(
    (refs: RefObject<HTMLDivElement | null>[]) => {
      faCarouselRefs.current = refs;
    },
    [],
  );

  const handleDownloadImage = useCallback(
    async (
      ref: RefObject<HTMLDivElement | null>,
      filename: string,
      kind: "wyniki" | "tabela",
    ) => {
      if (isGlobal || !divisionIdForTools) return;
      if (captureLoading || !capture) {
        showToast("err", "Poczekaj na załadowanie grafik…");
        return;
      }
      if (!ref.current) {
        showToast("err", "Brak węzła off-screen do capture.");
        return;
      }
      setDownloadBusy(kind);
      showToast("ok", "Generowanie grafiki…");
      try {
        await waitForImages(ref.current);
        await new Promise((r) => window.setTimeout(r, 60));
        const dataUrl = await captureExportNode(ref.current);
        const link = document.createElement("a");
        link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
        link.href = dataUrl;
        link.click();
        showToast("ok", `Pobrano ${link.download}`);
      } catch (error) {
        console.error("[ContentHub] download PNG", error);
        showToast("err", "Błąd podczas pobierania grafiki.");
      } finally {
        setDownloadBusy(null);
      }
    },
    [isGlobal, divisionIdForTools, captureLoading, capture, showToast],
  );

  function onGenerateX() {
    if (isGlobal || !divisionIdForTools) {
      showToast("err", "Generator X.com działa tylko dla dywizji H2H.");
      return;
    }
    startTransition(async () => {
      const result = await generateXComDraft(divisionIdForTools, gameweek);
      if (result.error) {
        showToast("err", result.error);
        return;
      }
      setXDraft(result.draft ?? "");
      showToast("ok", result.success ?? "Szkic gotowy.");
    });
  }

  async function onCopyX() {
    if (!xDraft.trim()) return;
    try {
      await navigator.clipboard.writeText(xDraft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("err", "Nie udało się skopiować do schowka.");
    }
  }

  async function onSendDiscord() {
    if (!sendTarget) {
      showToast("err", "Wybierz cel wysyłki.");
      return;
    }
    if (!hasWebhook) {
      showToast(
        "err",
        isGlobal
          ? "Brak webhooka globalnego — ustaw w Strukturze Ligi → Kanały globalne."
          : "Ta dywizja nie ma webhooka — ustaw w Strukturze Ligi.",
      );
      return;
    }
    if (
      !window.confirm(
        `Wysłać embed${
          attachGraphics && canAttachGraphics
            ? isFaRanking
              ? " + karuzelę PNG (FA Ranking)"
              : " + grafiki PNG"
            : ""
        } na „${targetLabel}”?`,
      )
    ) {
      return;
    }

    setSendPending(true);
    try {
      if (!attachGraphics || !canAttachGraphics) {
        const result = await sendDiscordWebhookJson(sendTarget, discordJson);
        if (result.error) {
          showToast("err", result.error);
          return;
        }
        showToast("ok", result.success ?? "Wysłano.");
        return;
      }

      if (isFaRanking) {
        if (faRankingLoading || !faRanking) {
          showToast("err", "Poczekaj na załadowanie The FA Ranking…");
          return;
        }
        const refs = faCarouselRefs.current;
        if (!refs.length) {
          showToast("err", "Brak węzłów karuzeli FA Ranking do capture.");
          return;
        }
        showToast("ok", `Generowanie ${refs.length} grafik…`);
        const files: { fileName: string; base64: string }[] = [];
        for (let i = 0; i < refs.length; i++) {
          const node = refs[i]?.current;
          if (!node) {
            showToast("err", `Brak węzła PNG #${i + 1}.`);
            return;
          }
          await waitForImages(node);
          await new Promise((r) => window.setTimeout(r, 40));
          const png = await captureExportNode(node);
          const from = i * 10 + 1;
          const to = Math.min((i + 1) * 10, faRanking.rows.length);
          files.push({
            fileName: `fa-ranking-${from}-${to}.png`,
            base64: png,
          });
        }
        const result = await sendDiscordWebhookWithFiles(
          sendTarget,
          discordJson,
          files,
        );
        if (result.error) {
          showToast("err", result.error);
          return;
        }
        showToast("ok", result.success ?? "Wysłano karuzelę FA Ranking.");
        return;
      }

      if (captureLoading || !capture) {
        showToast("err", "Poczekaj na załadowanie grafik (wyniki + tabela).");
        return;
      }
      const resultsNode = resultsRef.current;
      const standingsNode = standingsRef.current;
      if (!resultsNode || !standingsNode) {
        showToast("err", "Brak węzłów off-screen do capture.");
        return;
      }

      await waitForImages(resultsNode);
      await waitForImages(standingsNode);
      await new Promise((r) => window.setTimeout(r, 80));

      const wynikiPng = await captureExportNode(resultsNode);
      const tabelaPng = await captureExportNode(standingsNode);

      const result = await sendDiscordWebhookWithFiles(sendTarget, discordJson, [
        { fileName: "wyniki.png", base64: wynikiPng },
        { fileName: "tabela.png", base64: tabelaPng },
      ]);
      if (result.error) {
        showToast("err", result.error);
        return;
      }
      showToast("ok", result.success ?? "Wysłano.");
    } catch (e) {
      console.error("[ContentHub] send", e);
      showToast(
        "err",
        e instanceof Error ? e.message : "Błąd capture / wysyłki Discord.",
      );
    } finally {
      setSendPending(false);
    }
  }

  const exportMeta = capture
    ? {
        season: capture.seasonName,
        pyramid: capture.pyramidName,
        division: capture.divisionName,
      }
    : undefined;

  const resultsTitle = capture
    ? `Wyniki H2H · GW${capture.gameweek}`
    : `Wyniki H2H · GW${gameweek}`;
  const resultsFile = `${slugForExport(["wyniki", `gw${gameweek}`, selectedDivision?.name]) || "wyniki"}.png`;

  return (
    <div className="relative space-y-6">
      {toast ? (
        <p
          className={`rounded-xl border px-4 py-3 text-sm ${
            toast.type === "ok"
              ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-200"
              : "border-rose-500/30 bg-rose-950/40 text-rose-200"
          }`}
          role="alert"
        >
          {toast.text}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-[#39FF14]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                A · Kontekst
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={isGlobal ? "sm:col-span-2" : ""}>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Cel wysyłki
                </label>
                <select
                  className={selectClass}
                  value={targetKey}
                  onChange={(e) => setTargetKey(e.target.value as TargetKey)}
                >
                  <optgroup label="Rozgrywki Globalne">
                    {seasons.length === 0 ? (
                      <option value="" disabled>
                        Brak sezonów
                      </option>
                    ) : (
                      seasons.flatMap((s) => [
                        <option
                          key={`${s.id}-ranking`}
                          value={encodeGlobal(s.id, "fa_ranking")}
                        >
                          The FA Ranking · {s.name}
                          {s.hasFaRankingWebhook ? "" : " · brak webhooka"}
                        </option>,
                        <option
                          key={`${s.id}-cup`}
                          value={encodeGlobal(s.id, "fa_cup")}
                        >
                          FA Cup · {s.name}
                          {s.hasFaCupWebhook ? "" : " · brak webhooka"}
                        </option>,
                      ])
                    )}
                  </optgroup>
                  <optgroup label="Dywizje H2H">
                    {divisions.length === 0 ? (
                      <option value="" disabled>
                        Brak dywizji
                      </option>
                    ) : (
                      divisions.map((d) => (
                        <option key={d.id} value={encodeDivision(d.id)}>
                          {d.label}
                          {d.hasWebhook ? "" : " · brak webhooka"}
                        </option>
                      ))
                    )}
                  </optgroup>
                </select>
                <p className="mt-2 text-[11px] text-slate-500">
                  Webhook:{" "}
                  {hasWebhook ? (
                    <span className="text-emerald-400">OK · {targetLabel}</span>
                  ) : (
                    <span className="text-amber-400">
                      brak — Struktura Ligi
                      {isGlobal ? " → Kanały globalne" : ""}
                    </span>
                  )}
                </p>
              </div>
              {!isGlobal ? (
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Kolejka (GW)
                  </label>
                  <select
                    className={selectClass}
                    value={gameweek}
                    onChange={(e) => setGameweek(Number(e.target.value))}
                  >
                    {gwOptions.map((gw) => (
                      <option key={gw} value={gw}>
                        GW {gw}
                        {playedGameweeks.includes(gw) ? " · rozegrana" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          </section>

          <section
            className={`rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 sm:p-6 ${
              isGlobal ? "opacity-50" : ""
            }`}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  B · Generator X.com
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {isGlobal
                    ? "Niedostępne dla rozgrywek globalnych (brak H2H dywizji)."
                    : "Limit 280 znaków · zwycięzcy z x_com · pobierz PNG wyników / tabeli."}
                </p>
              </div>
              <button
                type="button"
                disabled={pending || isGlobal || !divisionIdForTools}
                onClick={onGenerateX}
                className="inline-flex items-center gap-2 rounded-xl bg-[#39FF14] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Generuj Szkic X.com
              </button>
            </div>
            <textarea
              className={`${textareaClass} min-h-[180px]`}
              value={xDraft}
              onChange={(e) => setXDraft(e.target.value)}
              disabled={isGlobal}
              placeholder={`🏆 Wyniki & Tabela - GW ${gameweek}\n🏴󠁧󠁢󠁥󠁮󠁧󠁿 … (FPL Arena: Na Minusie ™)\n\nSwoje mecze wygrali:\n@nick1, @nick2\n\n#FPL #FPLpl #FantasyPL`}
              spellCheck={false}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p
                className={`text-xs font-semibold tabular-nums ${
                  xOver ? "text-rose-500" : "text-slate-500"
                }`}
                aria-live="polite"
              >
                {xLen} / {X_LIMIT} znaków
              </p>
              <button
                type="button"
                disabled={isGlobal || !xDraft.trim()}
                onClick={onCopyX}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Skopiowano" : "Kopiuj"}
              </button>
            </div>

            {!isGlobal ? (
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={
                    Boolean(downloadBusy) ||
                    captureLoading ||
                    !capture ||
                    !divisionIdForTools
                  }
                  onClick={() =>
                    handleDownloadImage(
                      resultsRef,
                      `wyniki-gw${gameweek}.png`,
                      "wyniki",
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-sky-500/35 bg-sky-500/10 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-sky-200 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Pobierz PNG wyników H2H (off-screen)"
                >
                  {downloadBusy === "wyniki" || (captureLoading && !capture) ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Swords className="h-3.5 w-3.5" />
                  )}
                  <Download className="h-3.5 w-3.5 opacity-70" />
                  Pobierz Wyniki
                </button>
                <button
                  type="button"
                  disabled={
                    Boolean(downloadBusy) ||
                    captureLoading ||
                    !capture ||
                    !divisionIdForTools
                  }
                  onClick={() =>
                    handleDownloadImage(
                      standingsRef,
                      `tabela-gw${gameweek}.png`,
                      "tabela",
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Pobierz PNG tabeli (off-screen)"
                >
                  {downloadBusy === "tabela" || (captureLoading && !capture) ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Table2 className="h-3.5 w-3.5" />
                  )}
                  <Download className="h-3.5 w-3.5 opacity-70" />
                  Pobierz Tabelę
                </button>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  C · Discord Embed Editor
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Wklej JSON (Discohook / AI). Podgląd na żywo po prawej.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDiscordJson(SAMPLE_EMBED_JSON)}
                className="text-[10px] font-bold uppercase tracking-wider text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
              >
                Wstaw przykładowy JSON
              </button>
            </div>

            <label
              className={`mb-4 flex items-start gap-3 rounded-xl border border-slate-700/60 bg-slate-950/50 px-4 py-3 ${
                canAttachGraphics ? "cursor-pointer" : "cursor-not-allowed opacity-60"
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-[#39FF14] focus:ring-[#39FF14] disabled:opacity-50"
                checked={attachGraphics && canAttachGraphics}
                disabled={!canAttachGraphics}
                onChange={(e) => setAttachGraphics(e.target.checked)}
              />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-200">
                  <ImageIcon className="h-4 w-4 text-sky-300" />
                  {isFaRanking
                    ? "Generuj i załącz grafiki (karuzela The FA Ranking, po 10 graczy)"
                    : "Dołącz wygenerowane grafiki (Wyniki H2H i Tabela z wybranego GW)"}
                  {!canAttachGraphics ? (
                    <span className="text-[11px] font-medium text-amber-400/90">
                      (Opcja niedostępna dla FA Cup)
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block text-[11px] text-slate-500">
                  {isFaRanking
                    ? "Off-screen capture → multipart webhook (album Discord / grid X.com)."
                    : "Off-screen capture → multipart webhook (te same PNG co „Pobierz” w sekcji X)."}
                  {isFaRanking && faRankingLoading ? (
                    <span className="ml-1 text-amber-400"> Ładowanie FA Ranking…</span>
                  ) : null}
                  {isFaRanking && !faRankingLoading && faRanking ? (
                    <span className="ml-1 text-emerald-400">
                      {" "}
                      Gotowe ({Math.max(1, Math.ceil(faRanking.rows.length / 10))}{" "}
                      PNG).
                    </span>
                  ) : null}
                  {!isGlobal && captureLoading ? (
                    <span className="ml-1 text-amber-400"> Ładowanie danych…</span>
                  ) : null}
                  {!isGlobal && !captureLoading && capture ? (
                    <span className="ml-1 text-emerald-400"> Grafiki gotowe.</span>
                  ) : null}
                </span>
              </span>
            </label>

            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Wklej kod JSON dla Discorda (Wygenerowany przez AI)
            </label>
            <textarea
              className={`${textareaClass} min-h-[260px]`}
              value={discordJson}
              onChange={(e) => setDiscordJson(e.target.value)}
              placeholder='{ "content": "<@…>", "embeds": [ { "title": "…", "color": 5763719 } ] }'
              spellCheck={false}
            />
            {jsonError ? (
              <p className="mt-2 text-xs font-semibold text-rose-500" role="alert">
                {jsonError}
              </p>
            ) : null}
            <button
              type="button"
              disabled={
                sendPending ||
                !sendTarget ||
                !discordJson.trim() ||
                Boolean(jsonError) ||
                (attachGraphics &&
                  !isGlobal &&
                  (captureLoading || !capture)) ||
                (attachGraphics &&
                  isFaRanking &&
                  (faRankingLoading || !faRanking))
              }
              onClick={onSendDiscord}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/15 px-4 py-3 text-sm font-black uppercase tracking-wider text-orange-200 transition hover:bg-orange-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sendPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Flame className="h-4 w-4" />
              )}
              Wyślij przez Webhook
              <Send className="h-3.5 w-3.5 opacity-70" />
            </button>
          </section>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-300">
              Live Preview · Discord
            </h2>
            <DiscordEmbedPreview
              rawJson={discordJson}
              onParseError={setJsonError}
            />
          </section>
        </div>
      </div>

      {/* Off-screen: zawsze przy dywizji H2H (download X + opcjonalny Discord) */}
      {!isGlobal && capture ? (
        <div
          className="pointer-events-none absolute -left-[10000px] top-0 flex w-[920px] flex-col gap-8"
          aria-hidden
        >
          <DiscordExportFrame
            fileName={resultsFile}
            title={resultsTitle}
            subtitle={[exportMeta?.season, exportMeta?.pyramid, exportMeta?.division]
              .filter(Boolean)
              .join(" · ")}
            hideControls
            captureRef={resultsRef}
            exportId="content-hub-wyniki"
          >
            {capture.gwDetails.matches.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Brak meczów dla GW{capture.gameweek}.
              </p>
            ) : (
              <div className="flex w-full flex-col gap-2.5">
                {capture.gwDetails.matches.map((m) => (
                  <MatchCard key={m.fixture.id} match={m} logos={clubLogos} />
                ))}
              </div>
            )}
          </DiscordExportFrame>

          <StandingsTable
            rows={capture.standings}
            logos={clubLogos}
            tier={capture.tier}
            exportMeta={exportMeta}
            divisionId={capture.divisionId}
            hideControls
            captureRef={standingsRef}
          />
        </div>
      ) : null}

      {isFaRanking && faRanking ? (
        <FARankingExportCarousel
          data={faRanking}
          logos={clubLogos}
          onReady={onFaCarouselReady}
        />
      ) : null}
    </div>
  );
}
