/**
 * Szkice postów X.com / Discord dla Stats Lab (PL / EN).
 */

import type { PlottedStatsLabPlayer } from "@/lib/stats-lab/analyticsEngine";
import type { StatsLabQueryFilter } from "@/lib/stats-lab/presets";
import type { FplStatKey } from "@/lib/stats-lab/types";
import { getFplStatDefinition } from "@/lib/stats-lab/types";
import type { StatsLabLang, StatsLabScaleMode } from "@/lib/stats-lab/i18n";
import {
  PERIOD_LABELS,
  VIZ_MODE_LABELS,
  positionLabel,
  statShort,
} from "@/lib/stats-lab/i18n";
import type { StatsLabVizMode } from "@/components/admin/stats-lab/chartTheme";

const HASHTAGS = "#FPL #FPLCommunity #FPLArena";

function formatMetricValue(
  player: PlottedStatsLabPlayer,
  key: FplStatKey,
  scaleMode: StatsLabScaleMode,
): string {
  if (scaleMode === "PERCENTILE") {
    const p = Number(player.percentiles[key] ?? 0);
    return `${Math.round(p)}pctl`;
  }
  const def = getFplStatDefinition(key);
  const raw = Number(player.displayValues[key] ?? player.rawValues[key] ?? 0);
  const decimals = def?.decimals ?? 0;
  return decimals > 0 ? raw.toFixed(decimals) : String(Math.round(raw));
}

function topLine(
  player: PlottedStatsLabPlayer,
  rank: number,
  metrics: FplStatKey[],
  scaleMode: StatsLabScaleMode,
  lang: StatsLabLang,
): string {
  const club = player.club?.short_name ?? "—";
  const pts = Math.round(Number(player.rawValues.total_points ?? 0));
  const highlight = metrics.slice(0, 2).map((key) => {
    const short = statShort(key, lang);
    return `${short} ${formatMetricValue(player, key, scaleMode)}`;
  });
  const extra = highlight.length ? ` · ${highlight.join(", ")}` : "";
  return `${rank}. ${player.web_name} (${club}) — ${pts} pts${extra}`;
}

export function buildStatsLabSocialPost(input: {
  lang: StatsLabLang;
  vizMode: StatsLabVizMode;
  filter: StatsLabQueryFilter;
  scaleMode: StatsLabScaleMode;
  seasonCode: string;
  gwRange: [number, number];
  players: PlottedStatsLabPlayer[];
  metrics: FplStatKey[];
  title?: string;
}): string {
  const {
    lang,
    vizMode,
    filter,
    scaleMode,
    seasonCode,
    gwRange,
    players,
    metrics,
    title,
  } = input;

  const top = players.slice(0, 3);
  const viz = VIZ_MODE_LABELS[lang][vizMode] ?? vizMode;
  const period = PERIOD_LABELS[lang][filter.period.mode] ?? filter.period.mode;
  const pos =
    filter.positions.length === 1
      ? positionLabel(filter.positions[0], lang)
      : lang === "pl"
        ? "Wszystkie pozycje"
        : "All positions";
  const gwLabel =
    gwRange[0] > 0 ? `GW ${gwRange[0]}–${gwRange[1]}` : seasonCode;
  const scale =
    scaleMode === "PERCENTILE"
      ? lang === "pl"
        ? "percentyle"
        : "percentiles"
      : lang === "pl"
        ? "wartości surowe"
        : "raw values";
  const headline =
    title?.trim() ||
    (lang === "pl"
      ? `📊 Stats Lab · ${pos}`
      : `📊 Stats Lab · ${pos}`);

  if (lang === "pl") {
    const lines = [
      `${headline}`,
      `${viz} · ${seasonCode} · ${gwLabel} · ${period} · ${scale}`,
      "",
      ...top.map((p, i) => topLine(p, i + 1, metrics, scaleMode, lang)),
      "",
      `Pełna analiza: www.fpl-arena.com`,
      HASHTAGS,
    ];
    return lines.join("\n");
  }

  const lines = [
    `${headline}`,
    `${viz} · ${seasonCode} · ${gwLabel} · ${period} · ${scale}`,
    "",
    ...top.map((p, i) => topLine(p, i + 1, metrics, scaleMode, lang)),
    "",
    `Full analysis: www.fpl-arena.com`,
    HASHTAGS,
  ];
  return lines.join("\n");
}

export function buildStatsLabExportFileName(input: {
  filter: StatsLabQueryFilter;
  vizMode: StatsLabVizMode;
  gwRange: [number, number];
}): string {
  const pos =
    input.filter.positions.length === 1
      ? ["gkp", "def", "mid", "fwd"][input.filter.positions[0] - 1]
      : "all";
  const viz = input.vizMode.toLowerCase().replace(/_/g, "-");
  const gw =
    input.gwRange[0] > 0
      ? `gw${input.gwRange[0]}-${input.gwRange[1]}`
      : "season";
  return `fpl-arena-stats-lab-${pos}-${viz}-${gw}.png`;
}

export function buildStatsLabDiscordJson(input: {
  lang: StatsLabLang;
  content: string;
  fileName: string;
}): string {
  const title =
    input.lang === "pl"
      ? "FPL Arena · Stats Lab"
      : "FPL Arena · Stats Lab";
  const payload = {
    content: input.content.slice(0, 1800),
    embeds: [
      {
        title,
        color: 0x39ff14,
        image: { url: `attachment://${input.fileName}` },
        footer: {
          text: "www.fpl-arena.com • Powered by St0pa | FPL Arena",
        },
      },
    ],
  };
  return JSON.stringify(payload);
}
