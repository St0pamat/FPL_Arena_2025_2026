"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type RefObject,
} from "react";
import {
  Loader2,
  Megaphone,
  Sparkles,
  Users,
} from "lucide-react";
import {
  generatePreviewDiscordJSON,
  generatePreviewXComDraft,
  generateSummaryDiscordJSONForDivision,
  generateXComDraft,
  getContentHubCaptureData,
  getDiscordWebhookForSend,
  getFaRankingParticipantsRoster,
  type ContentHubCapturePayload,
  type ContentHubDivisionOption,
  type ContentHubSeasonOption,
  type ContentHubSendTarget,
  type FaRankingParticipant,
} from "@/app/admin/actions/contentHub";
import {
  dataUrlToFile,
  DISCORD_MAX_FILE_BYTES,
  DISCORD_MAX_FILES,
  formatDiscordMultiSendToast,
  postDiscordWebhookFromClient,
} from "@/lib/admin/discordClientSend";
import {
  DISCORD_SERVER_LABELS,
  DISCORD_SERVER_TARGETS,
  type DiscordServerTarget,
} from "@/lib/admin/discordWebhooks";
import { getFARankingData } from "@/lib/public/actions";
import type { FARankingPayload } from "@/lib/public/faRanking";
import { ContentHubSendPanel } from "@/components/admin/content-hub/ContentHubSendPanel";
import { FARankingExportCarousel } from "@/components/admin/content-hub/FARankingExportCarousel";
import { FaRankingParticipantsExportNode } from "@/components/admin/content-hub/FaRankingParticipantsExportNode";
import { GameweekPreviewExportNode } from "@/components/admin/content-hub/GameweekPreviewExportNode";
import { MatchCard } from "@/components/na-minusie/hub/GameweekCenter";
import { StandingsTable } from "@/components/na-minusie/hub/StandingsTable";
import {
  DiscordExportFrame,
  slugForExport,
} from "@/components/na-minusie/hub/DiscordExport";
import { captureExportNode } from "@/components/na-minusie/hub/ExportControls";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";

type ContentType = "summary" | "preview";

const selectClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-[#39FF14]";
const textareaClass =
  "w-full rounded-xl border border-slate-700/50 bg-slate-950 px-4 py-3 font-mono text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-[#39FF14]";

type GlobalChannel = "fa_ranking" | "fa_cup";

function useStableRefMap() {
  const mapRef = useRef(new Map<string, RefObject<HTMLDivElement | null>>());
  const getRef = useCallback((key: string): RefObject<HTMLDivElement | null> => {
    let ref = mapRef.current.get(key);
    if (!ref) {
      ref = { current: null };
      mapRef.current.set(key, ref);
    }
    return ref;
  }, []);
  return getRef;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
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
  const defaultGlobalSeasonId = useMemo(
    () =>
      seasons.find((x) => x.status === "PUBLISHED")?.id ?? seasons[0]?.id ?? "",
    [seasons],
  );

  const [selectedDivisionIds, setSelectedDivisionIds] = useState<string[]>([]);
  const [selectedGlobalTarget, setSelectedGlobalTarget] =
    useState<GlobalChannel | null>(null);
  const [selectedGlobalSeasonId, setSelectedGlobalSeasonId] = useState(
    defaultGlobalSeasonId,
  );
  const [contentType, setContentType] = useState<ContentType>("summary");
  const [gameweek, setGameweek] = useState(
    () => playedGameweeks[playedGameweeks.length - 1] ?? 1,
  );
  const [xComDrafts, setXComDrafts] = useState<Record<string, string>>({});
  const [discordJsons, setDiscordJsons] = useState<Record<string, string>>({});
  const [globalDiscordJson, setGlobalDiscordJson] = useState("");
  const [globalJsonError, setGlobalJsonError] = useState<string | null>(null);
  const [capturesByDivision, setCapturesByDivision] = useState<
    Record<string, ContentHubCapturePayload | null>
  >({});
  const [captureLoadingByDivision, setCaptureLoadingByDivision] = useState<
    Record<string, boolean>
  >({});
  const [attachGraphics, setAttachGraphics] = useState(false);
  const [customFiles, setCustomFiles] = useState<File[]>([]);
  const customFileInputRef = useRef<HTMLInputElement>(null);
  const [faRanking, setFaRanking] = useState<FARankingPayload | null>(null);
  const [faRankingLoading, setFaRankingLoading] = useState(false);
  const [faRoster, setFaRoster] = useState<FaRankingParticipant[]>([]);
  const [faRosterSeasonLabel, setFaRosterSeasonLabel] = useState("2026/27");
  const [faRosterLoading, setFaRosterLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const [copiedGlobalX, setCopiedGlobalX] = useState(false);
  const [bulkXPending, setBulkXPending] = useState(false);
  const [bulkDiscordPending, setBulkDiscordPending] = useState(false);
  const [singleXPending, startSingleX] = useTransition();
  const [singleDiscordPending, startSingleDiscord] = useTransition();
  const [sendPending, setSendPending] = useState(false);
  const [sendAllPending, setSendAllPending] = useState(false);
  const [sendProgress, setSendProgress] = useState<string | null>(null);
  const [sendServers, setSendServers] = useState<
    Record<DiscordServerTarget, boolean>
  >({
    NA_MINUSIE: true,
    FPL_ARENA: false,
  });
  const [downloadBusy, setDownloadBusy] = useState<
    "wyniki" | "tabela" | "terminarz" | "fa-roster" | null
  >(null);

  const getResultsRef = useStableRefMap();
  const getStandingsRef = useStableRefMap();
  const getPreviewRef = useStableRefMap();

  const faRosterRef = useRef<HTMLDivElement>(null);
  const faCarouselRefs = useRef<RefObject<HTMLDivElement | null>[]>([]);

  const isGlobalMode = selectedGlobalTarget !== null;
  const isDivisionMode = !isGlobalMode && selectedDivisionIds.length > 0;
  const isPreview = contentType === "preview";
  const isSummary = contentType === "summary";

  const globalSendTarget = useMemo((): ContentHubSendTarget | null => {
    if (!selectedGlobalTarget || !selectedGlobalSeasonId) return null;
    return {
      kind: "global",
      seasonId: selectedGlobalSeasonId,
      channel: selectedGlobalTarget,
    };
  }, [selectedGlobalTarget, selectedGlobalSeasonId]);

  const isFaRanking = selectedGlobalTarget === "fa_ranking";

  const canAttachGraphics = isDivisionMode || (isGlobalMode && isFaRanking);

  const selectedDivisions = useMemo(
    () =>
      selectedDivisionIds
        .map((id) => divisions.find((d) => d.id === id))
        .filter((d): d is ContentHubDivisionOption => Boolean(d)),
    [divisions, selectedDivisionIds],
  );

  const selectedSeason = useMemo(() => {
    if (!selectedGlobalSeasonId) return null;
    return seasons.find((s) => s.id === selectedGlobalSeasonId) ?? null;
  }, [seasons, selectedGlobalSeasonId]);

  const webhookByServer = useMemo((): Record<DiscordServerTarget, boolean> => {
    const empty = { NA_MINUSIE: false, FPL_ARENA: false };
    if (isDivisionMode) {
      if (selectedDivisions.length === 0) return empty;
      return {
        NA_MINUSIE: selectedDivisions.every(
          (d) => d.hasWebhookByServer.NA_MINUSIE,
        ),
        FPL_ARENA: selectedDivisions.every(
          (d) => d.hasWebhookByServer.FPL_ARENA,
        ),
      };
    }
    if (globalSendTarget?.kind === "global") {
      if (globalSendTarget.channel === "fa_ranking") {
        return selectedSeason?.hasFaRankingWebhookByServer ?? empty;
      }
      return selectedSeason?.hasFaCupWebhookByServer ?? empty;
    }
    return empty;
  }, [isDivisionMode, selectedDivisions, globalSendTarget, selectedSeason]);

  const divisionWebhookById = useCallback(
    (divisionId: string): Record<DiscordServerTarget, boolean> => {
      const d = divisions.find((x) => x.id === divisionId);
      return d?.hasWebhookByServer ?? { NA_MINUSIE: false, FPL_ARENA: false };
    },
    [divisions],
  );

  const selectedServerTargets = useMemo(
    () => DISCORD_SERVER_TARGETS.filter((s) => sendServers[s]),
    [sendServers],
  );

  const hasWebhook = useMemo(() => {
    if (!selectedServerTargets.length) return false;
    return selectedServerTargets.every((s) => webhookByServer[s]);
  }, [selectedServerTargets, webhookByServer]);

  const anyWebhookConfigured = useMemo(
    () => DISCORD_SERVER_TARGETS.some((s) => webhookByServer[s]),
    [webhookByServer],
  );

  const targetLabel = useMemo(() => {
    if (isDivisionMode) {
      if (selectedDivisions.length === 1) return selectedDivisions[0].name;
      return `${selectedDivisions.length} dywizji H2H`;
    }
    if (globalSendTarget?.kind === "global") {
      const ch =
        globalSendTarget.channel === "fa_ranking" ? "The FA Ranking" : "FA Cup";
      return `${selectedSeason?.name ?? "Sezon"} · ${ch}`;
    }
    return "—";
  }, [isDivisionMode, selectedDivisions, globalSendTarget, selectedSeason]);

  const primaryDivisionId = selectedDivisionIds[0] ?? "";
  const globalXDraft = primaryDivisionId ? xComDrafts[primaryDivisionId] ?? "" : "";
  const xLen = globalXDraft.length;

  const gwOptions = useMemo(() => {
    if (isPreview) {
      const maxPlayed = playedGameweeks.length
        ? Math.max(...playedGameweeks)
        : 0;
      const max = Math.max(19, maxPlayed);
      return Array.from({ length: max }, (_, i) => i + 1);
    }
    if (playedGameweeks.length) return playedGameweeks;
    return Array.from({ length: 19 }, (_, i) => i + 1);
  }, [playedGameweeks, isPreview]);

  const allDivisionIds = useMemo(() => divisions.map((d) => d.id), [divisions]);

  const toggleDivision = useCallback((divisionId: string) => {
    setSelectedGlobalTarget(null);
    setSelectedDivisionIds((prev) =>
      prev.includes(divisionId)
        ? prev.filter((id) => id !== divisionId)
        : [...prev, divisionId],
    );
  }, []);

  const selectAllDivisions = useCallback(() => {
    setSelectedGlobalTarget(null);
    setSelectedDivisionIds(allDivisionIds);
  }, [allDivisionIds]);

  const selectGlobal = useCallback((channel: GlobalChannel) => {
    setSelectedDivisionIds([]);
    setSelectedGlobalTarget(channel);
  }, []);

  const showToast = useCallback((type: "ok" | "err", text: string) => {
    setToast({ type, text });
  }, []);

  useEffect(() => {
    if (isPreview && isGlobalMode && divisions.length) {
      setSelectedGlobalTarget(null);
      setSelectedDivisionIds((prev) =>
        prev.length ? prev : [divisions[0]!.id],
      );
    }
  }, [isPreview, isGlobalMode, divisions]);

  useEffect(() => {
    if (!canAttachGraphics && attachGraphics) setAttachGraphics(false);
    if (!canAttachGraphics && customFiles.length > 0) setCustomFiles([]);
  }, [canAttachGraphics, attachGraphics, customFiles.length]);

  useEffect(() => {
    setXComDrafts({});
    setDiscordJsons({});
    setGlobalDiscordJson("");
  }, [contentType]);

  useEffect(() => {
    if (isGlobalMode || selectedDivisionIds.length === 0) {
      setCapturesByDivision({});
      setCaptureLoadingByDivision({});
      return;
    }

    let cancelled = false;
    const loadingState: Record<string, boolean> = {};
    for (const id of selectedDivisionIds) loadingState[id] = true;
    setCaptureLoadingByDivision(loadingState);
    setCapturesByDivision((prev) => {
      const next = { ...prev };
      for (const id of selectedDivisionIds) {
        if (!(id in next)) next[id] = null;
      }
      return next;
    });

    (async () => {
      for (const divId of selectedDivisionIds) {
        if (cancelled) return;
        try {
          const res = await getContentHubCaptureData(divId, gameweek);
          if (cancelled) return;
          if (res.error || !res.data) {
            setCapturesByDivision((prev) => ({ ...prev, [divId]: null }));
            showToast(
              "err",
              res.error ??
                `Brak danych grafik dla ${divisions.find((d) => d.id === divId)?.name ?? divId}.`,
            );
          } else {
            setCapturesByDivision((prev) => ({ ...prev, [divId]: res.data! }));
          }
        } catch (e) {
          if (cancelled) return;
          setCapturesByDivision((prev) => ({ ...prev, [divId]: null }));
          showToast(
            "err",
            e instanceof Error ? e.message : "Błąd ładowania grafik.",
          );
        } finally {
          if (!cancelled) {
            setCaptureLoadingByDivision((prev) => ({
              ...prev,
              [divId]: false,
            }));
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isGlobalMode, selectedDivisionIds, gameweek, divisions, showToast]);

  // Off-screen: The FA Ranking (karuzela 10-osobowa) — tylko tryb Podsumowanie
  useEffect(() => {
    if (!isSummary || !isFaRanking || !selectedGlobalSeasonId) {
      setFaRanking(null);
      faCarouselRefs.current = [];
      return;
    }
    let cancelled = false;
    setFaRankingLoading(true);
    getFARankingData(selectedGlobalSeasonId)
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
  }, [isSummary, isFaRanking, selectedGlobalSeasonId, showToast]);

  // Off-screen: pełna lista uczestników FA Ranking (siatka 10×5)
  useEffect(() => {
    if (!isFaRanking) {
      setFaRoster([]);
      return;
    }
    let cancelled = false;
    setFaRosterLoading(true);
    getFaRankingParticipantsRoster()
      .then((res) => {
        if (cancelled) return;
        if (res.error) {
          setFaRoster([]);
          showToast("err", res.error);
          return;
        }
        setFaRoster(res.players);
        setFaRosterSeasonLabel(res.seasonLabel);
      })
      .catch((e) => {
        if (cancelled) return;
        setFaRoster([]);
        showToast(
          "err",
          e instanceof Error ? e.message : "Błąd listy uczestników FA Ranking.",
        );
      })
      .finally(() => {
        if (!cancelled) setFaRosterLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isFaRanking, showToast]);

  const onFaCarouselReady = useCallback(
    (refs: RefObject<HTMLDivElement | null>[]) => {
      faCarouselRefs.current = refs;
    },
    [],
  );

  const handleDownloadFaRoster = useCallback(async () => {
    if (!isFaRanking) return;
    if (faRosterLoading || !faRoster.length) {
      showToast("err", "Poczekaj na załadowanie listy uczestników…");
      return;
    }
    if (!faRosterRef.current) {
      showToast("err", "Brak węzła off-screen listy uczestników.");
      return;
    }
    setDownloadBusy("fa-roster");
    showToast("ok", "Generowanie listy The FA Ranking…");
    try {
      await waitForImages(faRosterRef.current);
      await new Promise((r) => window.setTimeout(r, 80));
      const dataUrl = await captureExportNode(faRosterRef.current);
      const link = document.createElement("a");
      link.download = `the-fa-ranking-uczestnicy-${faRosterSeasonLabel.replace(/\//g, "-")}.png`;
      link.href = dataUrl;
      link.click();
      showToast("ok", `Pobrano ${link.download}`);
    } catch (error) {
      console.error("[ContentHub] FA roster PNG", error);
      showToast("err", "Błąd podczas pobierania listy uczestników.");
    } finally {
      setDownloadBusy(null);
    }
  }, [
    faRoster.length,
    faRosterLoading,
    faRosterSeasonLabel,
    isFaRanking,
    showToast,
  ]);

  const handleDownloadImage = useCallback(
    async (
      divisionId: string,
      ref: RefObject<HTMLDivElement | null>,
      filename: string,
      kind: "wyniki" | "tabela" | "terminarz",
    ) => {
      if (!divisionId) return;
      const capture = capturesByDivision[divisionId];
      const loading = captureLoadingByDivision[divisionId];
      if (loading || !capture) {
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
        await sleep(60);
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
    [capturesByDivision, captureLoadingByDivision, showToast],
  );

  const captureDivisionFiles = useCallback(
    async (divisionId: string): Promise<File[]> => {
      const capture = capturesByDivision[divisionId];
      if (!capture) {
        throw new Error("Brak danych capture dla dywizji.");
      }

      if (isPreview) {
        const previewNode = getPreviewRef(divisionId).current;
        if (!previewNode) throw new Error("Brak węzła zapowiedzi do capture.");
        await waitForImages(previewNode);
        await sleep(80);
        const terminarzPng = await captureExportNode(previewNode);
        return [await dataUrlToFile(terminarzPng, "terminarz.png")];
      }

      const resultsNode = getResultsRef(divisionId).current;
      const standingsNode = getStandingsRef(divisionId).current;
      if (!resultsNode || !standingsNode) {
        throw new Error("Brak węzłów off-screen do capture.");
      }
      await waitForImages(resultsNode);
      await waitForImages(standingsNode);
      await sleep(80);
      const wynikiPng = await captureExportNode(resultsNode);
      const tabelaPng = await captureExportNode(standingsNode);
      return [
        await dataUrlToFile(wynikiPng, "wyniki.png"),
        await dataUrlToFile(tabelaPng, "tabela.png"),
      ];
    },
    [capturesByDivision, getPreviewRef, getResultsRef, getStandingsRef, isPreview],
  );

  async function generateXForDivision(divisionId: string): Promise<string | null> {
    const result = isPreview
      ? await generatePreviewXComDraft(divisionId, gameweek)
      : await generateXComDraft(divisionId, gameweek);
    if (result.error) {
      showToast("err", result.error);
      return null;
    }
    return result.draft ?? "";
  }

  async function generateDiscordForDivision(
    divisionId: string,
  ): Promise<string | null> {
    const result = isPreview
      ? await generatePreviewDiscordJSON(divisionId, gameweek)
      : await generateSummaryDiscordJSONForDivision(divisionId, gameweek);
    if (result.error) {
      showToast("err", result.error);
      return null;
    }
    return result.json ?? "";
  }

  async function onGenerateAllX() {
    if (!selectedDivisionIds.length) {
      showToast("err", "Zaznacz co najmniej jedną dywizję H2H.");
      return;
    }
    setBulkXPending(true);
    try {
      const next = { ...xComDrafts };
      for (const divId of selectedDivisionIds) {
        const draft = await generateXForDivision(divId);
        if (draft != null) next[divId] = draft;
      }
      setXComDrafts(next);
      showToast("ok", `Wygenerowano szkice X.com (${selectedDivisionIds.length}).`);
    } finally {
      setBulkXPending(false);
    }
  }

  async function onGenerateAllDiscord() {
    if (!selectedDivisionIds.length) {
      showToast("err", "Zaznacz co najmniej jedną dywizję H2H.");
      return;
    }
    setBulkDiscordPending(true);
    try {
      const next = { ...discordJsons };
      for (const divId of selectedDivisionIds) {
        const json = await generateDiscordForDivision(divId);
        if (json != null) next[divId] = json;
      }
      setDiscordJsons(next);
      showToast(
        "ok",
        `Wygenerowano JSON Discord (${selectedDivisionIds.length}).`,
      );
    } finally {
      setBulkDiscordPending(false);
    }
  }

  function onGenerateXSingle(divisionId: string) {
    startSingleX(async () => {
      const draft = await generateXForDivision(divisionId);
      if (draft == null) return;
      setXComDrafts((prev) => ({ ...prev, [divisionId]: draft }));
      showToast("ok", "Szkic X.com gotowy.");
    });
  }

  function onGenerateDiscordSingle(divisionId: string) {
    startSingleDiscord(async () => {
      const json = await generateDiscordForDivision(divisionId);
      if (json == null) return;
      setDiscordJsons((prev) => ({ ...prev, [divisionId]: json }));
      showToast("ok", "JSON Discord gotowy.");
    });
  }

  async function onCopyGlobalX() {
    if (!globalXDraft.trim()) return;
    try {
      await navigator.clipboard.writeText(globalXDraft);
      setCopiedGlobalX(true);
      window.setTimeout(() => setCopiedGlobalX(false), 2000);
    } catch {
      showToast("err", "Nie udało się skopiować do schowka.");
    }
  }

  async function postDiscordPayload(
    sendTarget: ContentHubSendTarget,
    rawJson: string,
    generatedFiles: File[],
  ): Promise<boolean> {
    if (
      sendTarget.kind === "global" &&
      sendTarget.channel === "fa_cup" &&
      (generatedFiles.length > 0 || customFiles.length > 0)
    ) {
      showToast("err", "Kanał FA Cup nie przyjmuje załączników PNG.");
      return false;
    }

    const dest = await getDiscordWebhookForSend(
      sendTarget,
      selectedServerTargets,
    );
    if (!dest || "error" in dest) {
      showToast(
        "err",
        dest && "error" in dest
          ? dest.error
          : "Brak skonfigurowanego webhooka.",
      );
      return false;
    }

    const files = [...generatedFiles, ...customFiles];
    if (files.length > DISCORD_MAX_FILES) {
      showToast(
        "err",
        `Discord przyjmuje max ${DISCORD_MAX_FILES} plików (masz ${files.length}).`,
      );
      return false;
    }
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    if (totalBytes > DISCORD_MAX_FILE_BYTES) {
      showToast("err", "Pliki przekraczają limit 25 MB webhooka Discord.");
      return false;
    }

    const posted = await postDiscordWebhookFromClient({
      destinations: dest.destinations,
      rawJson,
      files,
    });
    if (!posted.ok) {
      showToast("err", posted.error);
      return false;
    }
    const extra = files.length ? ` + ${files.length} plik(ów)` : "";
    const toastMsg = formatDiscordMultiSendToast(posted.results);
    showToast("ok", `${toastMsg.message}${extra}`);
    return true;
  }

  async function onSendAllDivisions() {
    if (!selectedDivisionIds.length) {
      showToast("err", "Zaznacz co najmniej jedną dywizję H2H.");
      return;
    }
    if (!selectedServerTargets.length) {
      showToast("err", "Zaznacz co najmniej jeden serwer Discord.");
      return;
    }

    const serverNames = selectedServerTargets
      .map((s) => DISCORD_SERVER_LABELS[s])
      .join(" + ");
    if (
      !window.confirm(
        `Wysłać ${selectedDivisionIds.length} wiadomości (Discord) → ${serverNames}?${
          attachGraphics ? " Z załączonymi grafikami PNG." : ""
        }`,
      )
    ) {
      return;
    }

    setSendAllPending(true);
    let sent = 0;
    try {
      for (let i = 0; i < selectedDivisionIds.length; i++) {
        const divId = selectedDivisionIds[i];
        const division = divisions.find((d) => d.id === divId);
        const label = division?.name ?? `Dywizja ${i + 1}`;
        setSendProgress(`Wysyłanie: ${label} (${i + 1}/${selectedDivisionIds.length})…`);
        showToast(
          "ok",
          `Wysyłanie: ${label} (${i + 1}/${selectedDivisionIds.length})…`,
        );

        const rawJson = discordJsons[divId]?.trim();
        if (!rawJson) {
          showToast("err", `Pominięto ${label}: brak JSON Discord.`);
          continue;
        }

        const hooks = divisionWebhookById(divId);
        if (!selectedServerTargets.every((s) => hooks[s])) {
          showToast("err", `Pominięto ${label}: brak webhooka na serwerze.`);
          continue;
        }

        let generatedFiles: File[] = [];
        if (attachGraphics) {
          if (captureLoadingByDivision[divId] || !capturesByDivision[divId]) {
            showToast("err", `Pominięto ${label}: grafiki niegotowe.`);
            continue;
          }
          try {
            generatedFiles = await captureDivisionFiles(divId);
          } catch (e) {
            showToast(
              "err",
              `Pominięto ${label}: ${e instanceof Error ? e.message : "błąd PNG"}`,
            );
            continue;
          }
        }

        const ok = await postDiscordPayload(
          { kind: "division", divisionId: divId },
          rawJson,
          generatedFiles,
        );
        if (ok) sent += 1;

        if (i < selectedDivisionIds.length - 1) {
          await sleep(1000);
        }
      }
      showToast("ok", `Zakończono masową wysyłkę (${sent}/${selectedDivisionIds.length}).`);
    } catch (e) {
      console.error("[ContentHub] bulk send", e);
      showToast(
        "err",
        e instanceof Error ? e.message : "Błąd masowej wysyłki.",
      );
    } finally {
      setSendAllPending(false);
      setSendProgress(null);
    }
  }

  async function onSendDiscordGlobal() {
    if (!globalSendTarget) {
      showToast("err", "Wybierz cel globalny (FA Ranking / FA Cup).");
      return;
    }
    if (!selectedServerTargets.length) {
      showToast("err", "Zaznacz co najmniej jeden serwer Discord.");
      return;
    }
    if (!hasWebhook) {
      showToast("err", "Brak webhooka na zaznaczonym serwerze.");
      return;
    }

    const serverNames = selectedServerTargets
      .map((s) => DISCORD_SERVER_LABELS[s])
      .join(" + ");
    if (
      !window.confirm(
        `Wysłać embed${attachGraphics && canAttachGraphics ? " + grafiki" : ""} na „${targetLabel}” → ${serverNames}?`,
      )
    ) {
      return;
    }

    setSendPending(true);
    try {
      let generatedFiles: File[] = [];

      if (attachGraphics && canAttachGraphics && isFaRanking) {
        if (faRankingLoading || !faRanking) {
          showToast("err", "Poczekaj na załadowanie The FA Ranking…");
          return;
        }
        const refs = faCarouselRefs.current;
        if (!refs.length) {
          showToast("err", "Brak węzłów karuzeli FA Ranking.");
          return;
        }
        for (let i = 0; i < refs.length; i++) {
          const node = refs[i]?.current;
          if (!node) {
            showToast("err", `Brak węzła PNG #${i + 1}.`);
            return;
          }
          await waitForImages(node);
          await sleep(40);
          const png = await captureExportNode(node);
          const from = i * 10 + 1;
          const to = Math.min((i + 1) * 10, faRanking.rows.length);
          generatedFiles.push(
            await dataUrlToFile(png, `fa-ranking-${from}-${to}.png`),
          );
        }
      }

      await postDiscordPayload(
        globalSendTarget,
        globalDiscordJson,
        generatedFiles,
      );
    } catch (e) {
      console.error("Full Discord Error:", e);
      showToast(
        "err",
        e instanceof Error ? e.message : "Błąd wysyłki Discord.",
      );
    } finally {
      setSendPending(false);
    }
  }

  const anyCaptureLoading = selectedDivisionIds.some(
    (id) => captureLoadingByDivision[id],
  );
  const allCapturesReady =
    selectedDivisionIds.length > 0 &&
    selectedDivisionIds.every((id) => capturesByDivision[id]);

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
      {sendProgress ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-2 text-sm font-semibold text-amber-200" role="status">
          {sendProgress}
        </p>
      ) : null}

      <div className="space-y-5">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-[#39FF14]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                A · Kontekst
              </h2>
            </div>

            <div className="mb-4">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Typ treści
              </p>
              <div
                className="inline-flex w-full rounded-xl border border-slate-700/60 bg-slate-950 p-1 sm:w-auto"
                role="group"
                aria-label="Typ treści Content Hub"
              >
                <button
                  type="button"
                  onClick={() => setContentType("summary")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-wider transition sm:flex-none ${
                    isSummary
                      ? "bg-[#39FF14] text-black shadow"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                >
                  📊 Podsumowanie
                </button>
                <button
                  type="button"
                  onClick={() => setContentType("preview")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-wider transition sm:flex-none ${
                    isPreview
                      ? "bg-amber-400 text-black shadow"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                >
                  🔜 Zapowiedź
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                {isPreview
                  ? "Tryb piątkowy: terminarz, napięcie przed deadlinem — bez wyników i tabeli."
                  : "Tryb poniedziałkowy: wyniki H2H, tabela i chwalenie zwycięzców."}
              </p>
            </div>

            {isSummary ? (
              <div className="mb-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Rozgrywki globalne (pojedynczy wybór)
                </p>
                <div className="flex flex-wrap gap-2">
                  {seasons.map((s) => (
                    <div key={s.id} className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGlobalSeasonId(s.id);
                          selectGlobal("fa_ranking");
                        }}
                        className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${
                          selectedGlobalTarget === "fa_ranking" &&
                          selectedGlobalSeasonId === s.id
                            ? "border-[#39FF14] bg-[#39FF14]/15 text-[#39FF14]"
                            : "border-slate-700 text-slate-400 hover:border-slate-500"
                        }`}
                      >
                        FA Ranking · {s.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGlobalSeasonId(s.id);
                          selectGlobal("fa_cup");
                        }}
                        className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${
                          selectedGlobalTarget === "fa_cup" &&
                          selectedGlobalSeasonId === s.id
                            ? "border-[#39FF14] bg-[#39FF14]/15 text-[#39FF14]"
                            : "border-slate-700 text-slate-400 hover:border-slate-500"
                        }`}
                      >
                        FA Cup · {s.name}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mb-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Dywizje H2H (multi-select)
                </p>
                <button
                  type="button"
                  disabled={!divisions.length}
                  onClick={selectAllDivisions}
                  className="rounded-lg border border-slate-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                >
                  Zaznacz wszystkie ({divisions.length})
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {divisions.map((d) => {
                  const checked = selectedDivisionIds.includes(d.id);
                  return (
                    <label
                      key={d.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
                        checked
                          ? "border-[#39FF14]/40 bg-[#39FF14]/5"
                          : "border-slate-700/60 bg-slate-950/40 hover:border-slate-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-[#39FF14]"
                        checked={checked}
                        onChange={() => toggleDivision(d.id)}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-white">
                          {d.name}
                        </span>
                        <span className="text-[11px] text-slate-500">{d.label}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Aktywny tryb
                </p>
                <p className="text-sm text-slate-300">
                  {isGlobalMode
                    ? targetLabel
                    : isDivisionMode
                      ? `${selectedDivisionIds.length} dywizji · GW${gameweek}`
                      : "— wybierz dywizje lub cel globalny"}
                </p>
                <p className="mt-2 text-[11px] text-slate-500">
                  Webhook:{" "}
                  {anyWebhookConfigured ? (
                    <span className="text-emerald-400">
                      {DISCORD_SERVER_TARGETS.filter((s) => webhookByServer[s])
                        .map((s) => DISCORD_SERVER_LABELS[s])
                        .join(" · ") || "częściowo"}{" "}
                      · {targetLabel}
                    </span>
                  ) : (
                    <span className="text-amber-400">brak — Webhooki Discord</span>
                  )}
                </p>
              </div>
              {!isGlobalMode ? (
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
                        {playedGameweeks.includes(gw)
                          ? " · rozegrana"
                          : isPreview
                            ? " · zapowiedź"
                            : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            {isDivisionMode ? (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  disabled={bulkXPending || !selectedDivisionIds.length}
                  onClick={onGenerateAllX}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#39FF14] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-black disabled:opacity-40"
                >
                  {bulkXPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Generuj wszystkie szkice X.com
                </button>
                <button
                  type="button"
                  disabled={bulkDiscordPending || !selectedDivisionIds.length}
                  onClick={onGenerateAllDiscord}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-emerald-200 disabled:opacity-40"
                >
                  {bulkDiscordPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Generuj wszystkie JSON (Discord)
                </button>
              </div>
            ) : null}
          </section>

          <ContentHubSendPanel
            isDivisionMode={isDivisionMode}
            isGlobalMode={isGlobalMode}
            isPreview={isPreview}
            isSummary={isSummary}
            isFaRanking={isFaRanking}
            gameweek={gameweek}
            selectedDivisions={selectedDivisions}
            xComDrafts={xComDrafts}
            discordJsons={discordJsons}
            globalDiscordJson={globalDiscordJson}
            globalJsonError={globalJsonError}
            capturesByDivision={capturesByDivision}
            captureLoadingByDivision={captureLoadingByDivision}
            bulkXPending={bulkXPending}
            bulkDiscordPending={bulkDiscordPending}
            singleXPending={singleXPending}
            singleDiscordPending={singleDiscordPending}
            attachGraphics={attachGraphics}
            canAttachGraphics={canAttachGraphics}
            customFiles={customFiles}
            customFileInputRef={customFileInputRef}
            sendServers={sendServers}
            webhookByServer={webhookByServer}
            selectedServerTargets={selectedServerTargets}
            hasWebhook={hasWebhook}
            sendPending={sendPending}
            sendAllPending={sendAllPending}
            sendProgress={sendProgress}
            anyCaptureLoading={anyCaptureLoading}
            allCapturesReady={allCapturesReady}
            faRankingLoading={faRankingLoading}
            faRankingReady={Boolean(faRanking)}
            faRosterLoading={faRosterLoading}
            faRosterCount={faRoster.length}
            downloadBusy={downloadBusy}
            copiedGlobalX={copiedGlobalX}
            globalXDraft={globalXDraft}
            xLen={xLen}
            onXChange={(id, v) => setXComDrafts((p) => ({ ...p, [id]: v }))}
            onDiscordChange={(id, v) => setDiscordJsons((p) => ({ ...p, [id]: v }))}
            onGlobalDiscordChange={setGlobalDiscordJson}
            onGenerateXSingle={onGenerateXSingle}
            onGenerateDiscordSingle={onGenerateDiscordSingle}
            onCopyGlobalX={onCopyGlobalX}
            onAttachGraphicsChange={setAttachGraphics}
            onSendServersChange={(server, checked) =>
              setSendServers((prev) => ({ ...prev, [server]: checked }))
            }
            onCustomFilesChange={setCustomFiles}
            onSendAllDivisions={onSendAllDivisions}
            onSendGlobal={onSendDiscordGlobal}
            onDownloadImage={handleDownloadImage}
            onDownloadFaRoster={handleDownloadFaRoster}
            getResultsRef={getResultsRef}
            getStandingsRef={getStandingsRef}
            getPreviewRef={getPreviewRef}
            onGlobalJsonError={setGlobalJsonError}
          />
        </div>

      {/* Off-screen: H2H — per dywizja (unikalne ref-y do capture) */}
      {isDivisionMode && isSummary
        ? selectedDivisionIds.map((divId) => {
            const capture = capturesByDivision[divId];
            if (!capture) return null;
            const division = divisions.find((d) => d.id === divId);
            const exportMeta = {
              season: capture.seasonName,
              pyramid: capture.pyramidName,
              division: capture.divisionName,
            };
            const resultsTitle = `Wyniki H2H · GW${capture.gameweek}`;
            const resultsFile = `${
              slugForExport(["wyniki", `gw${gameweek}`, division?.name]) ||
              "wyniki"
            }.png`;
            return (
              <div
                key={`summary-${divId}`}
                className="pointer-events-none absolute -left-[10000px] top-0 flex w-[1200px] flex-col gap-8"
                aria-hidden
              >
                <DiscordExportFrame
                  fileName={resultsFile}
                  title={resultsTitle}
                  subtitle={[
                    exportMeta.season,
                    exportMeta.pyramid,
                    exportMeta.division,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  hideControls
                  captureRef={getResultsRef(divId)}
                  exportId={`content-hub-wyniki-${divId}`}
                >
                  {capture.gwDetails.matches.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">
                      Brak meczów dla GW{capture.gameweek}.
                    </p>
                  ) : (
                    <div className="flex w-full flex-col gap-2.5">
                      {capture.gwDetails.matches.map((m) => (
                        <MatchCard
                          key={m.fixture.id}
                          match={m}
                          logos={clubLogos}
                        />
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
                  captureRef={getStandingsRef(divId)}
                />
              </div>
            );
          })
        : null}

      {isDivisionMode && isPreview
        ? selectedDivisionIds.map((divId) => {
            const capture = capturesByDivision[divId];
            if (!capture) return null;
            return (
              <div
                key={`preview-${divId}`}
                className="pointer-events-none absolute -left-[10000px] top-0 w-[1200px]"
                aria-hidden
              >
                <GameweekPreviewExportNode
                  matches={capture.gwDetails.matches}
                  logos={clubLogos}
                  gameweek={capture.gameweek}
                  divisionName={capture.divisionName}
                  seasonName={capture.seasonName}
                  pyramidName={capture.pyramidName}
                  captureRef={getPreviewRef(divId)}
                />
              </div>
            );
          })
        : null}

      {isFaRanking && faRanking && isSummary ? (
        <FARankingExportCarousel
          data={faRanking}
          logos={clubLogos}
          onReady={onFaCarouselReady}
        />
      ) : null}

      {isFaRanking && faRoster.length > 0 ? (
        <div
          className="pointer-events-none absolute -left-[10000px] top-0 w-[1920px]"
          aria-hidden
        >
          <FaRankingParticipantsExportNode
            players={faRoster}
            logos={clubLogos}
            seasonLabel={faRosterSeasonLabel}
            captureRef={faRosterRef}
          />
        </div>
      ) : null}
    </div>
    </div>
  );
}
