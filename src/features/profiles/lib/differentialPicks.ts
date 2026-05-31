import type { Player } from "@/types/player";
import type { PlayerHighlights } from "@/types/highlights";

export type DifferentialPick = {
  playerName: string;
  netPoints: number;
  totalPoints?: number;
};

export type DifferentialPicks = {
  gain: DifferentialPick | null;
  loss: DifferentialPick | null;
};

const INVALID_STATIC = new Set(["none", "—", "-", "brak", "n/a"]);

function isInvalidStatic(value: string | undefined | null): boolean {
  if (!value?.trim()) return true;
  return INVALID_STATIC.has(value.trim().toLowerCase());
}

function parseStaticPick(raw: string): DifferentialPick | null {
  if (isInvalidStatic(raw)) return null;
  const match = raw.match(/^(.+?)\s*\(([+-]?\d+(?:\.\d+)?)\s*pkt/i);
  if (!match) {
    return { playerName: raw.split("(")[0].trim(), netPoints: 0 };
  }
  return {
    playerName: match[1].trim(),
    netPoints: parseFloat(match[2]),
  };
}

function fromHighlights(
  highlights: PlayerHighlights | null | undefined
): DifferentialPicks {
  const gainRow = highlights?.topGains?.[0];
  const lossRow = highlights?.topLosses?.[0];
  return {
    gain: gainRow
      ? {
          playerName: gainRow.name,
          netPoints: gainRow.net,
          totalPoints: gainRow.points,
        }
      : null,
    loss: lossRow
      ? {
          playerName: lossRow.name,
          netPoints: lossRow.net,
          totalPoints: lossRow.points,
        }
      : null,
  };
}

/** Największa przewaga / strata vs przeciętny menedżer — preferuje dane z highlights. */
export function getDifferentialPicks(
  highlights: PlayerHighlights | null | undefined,
  player: Player
): DifferentialPicks {
  const fromHl = fromHighlights(highlights);
  return {
    gain: fromHl.gain ?? parseStaticPick(player.superStar),
    loss: fromHl.loss ?? parseStaticPick(player.rankKiller),
  };
}

export function formatDifferentialNet(net: number): string {
  const rounded = Math.abs(net % 1) < 0.05 ? net.toFixed(0) : net.toFixed(1);
  const sign = net >= 0 ? "+" : "";
  return `${sign}${rounded} pkt`;
}

export function formatDifferentialPick(pick: DifferentialPick): string {
  return `${pick.playerName} (${formatDifferentialNet(pick.netPoints)})`;
}

export const DIFFERENTIAL_GAIN = {
  title: "Bohater sezonu",
  description: "Zawodnik, który dał ci największą przewagę nad przeciętnym menedżerem w FPL.",
} as const;

export const DIFFERENTIAL_LOSS = {
  title: "Rozczarowanie sezonu",
  description: "Zawodnik, który kosztował cię najwięcej w porównaniu z resztą menedżerów w FPL.",
} as const;
