import type { Player } from "@/types/player";
import { playerDisplayName } from "@/lib/playerDisplay";
import type { PlayerHighlights } from "@/types/highlights";
import { getDifferentialPicks } from "@/features/profiles/lib/differentialPicks";

export type CardTemplateId = "mvp" | "pechowiec" | "milestone" | "cytat";

export type CardContent = {
  template: CardTemplateId;
  badge: string;
  headline: string;
  statLine: string;
  subLine: string;
  quote?: string;
  accent: "emerald" | "amber" | "red" | "blue" | "violet";
};

export function buildCardContent(
  player: Player,
  highlights: PlayerHighlights | null,
  template: CardTemplateId
): CardContent {
  const diff = getDifferentialPicks(highlights);

  switch (template) {
    case "mvp": {
      const best = highlights?.bestGWs?.[0];
      const pts = best?.points ?? 0;
      const gw = best?.gw ?? "—";
      return {
        template,
        badge: "MVP kolejki",
        headline: player.team,
        statLine: best ? `${pts} pkt · GW${gw}` : player.bestGw.split("(")[0].trim(),
        subLine: `${playerDisplayName(player)} · ${player.rank}. miejsce H2H`,
        quote: player.quote,
        accent: "amber",
      };
    }
    case "pechowiec": {
      const worst = highlights?.worstGWs?.[0];
      const heavy = highlights?.heaviestLoss;
      return {
        template,
        badge: "Pechowiec weekendu",
        headline: player.team,
        statLine: worst ? `${worst.points} pkt · GW${worst.gw}` : "Trudny sezon",
        subLine: heavy
          ? `Porażka H2H ${heavy.score} (GW${heavy.gw})`
          : `${player.l} porażek H2H w sezonie`,
        quote: player.quote,
        accent: "red",
      };
    }
    case "milestone": {
      const transfer = highlights?.bestTransfers?.[0];
      return {
        template,
        badge: transfer ? "Transfer roku" : "Kamień milowy",
        headline: player.team,
        statLine: transfer
          ? `+${transfer.rpDiff.toFixed(0)} pkt · GW${transfer.gw}`
          : `#${player.rank} · ${player.pts} pkt H2H`,
        subLine: transfer
          ? `${transfer.sold} → ${transfer.bought}`
          : diff.gain
            ? `Bohater: ${diff.gain.playerName}`
            : player.winStreak,
        quote: player.quote,
        accent: "emerald",
      };
    }
    case "cytat":
    default:
      return {
        template: "cytat",
        badge: "FPL Arena 25/26",
        headline: player.team,
        statLine: `#${player.rank} · ${player.score} pkt FPL`,
        subLine: `${player.w}W–${player.d}D–${player.l}L · OR ${player.bestOr}`,
        quote: player.quote,
        accent: "violet",
      };
  }
}

export function buildStoryPosterLines(
  player: Player,
  highlights: PlayerHighlights | null
) {
  const diff = getDifferentialPicks(highlights);
  const gwPts = highlights?.gwPoints?.map((g) => g.points) ?? [];
  const maxPts = gwPts.length ? Math.max(...gwPts) : 0;
  const minPts = gwPts.length ? Math.min(...gwPts) : 0;
  const bestIdx = gwPts.indexOf(maxPts);
  const worstIdx = gwPts.indexOf(minPts);

  return {
    rank: player.rank,
    pts: player.pts,
    score: player.score,
    bestOr: player.bestOr,
    bestGw: player.bestGw.split("(")[0].trim(),
    winStreak: player.winStreak.split("(")[0].trim(),
    wdl: `${player.w}W · ${player.d}D · ${player.l}L`,
    hero: diff.gain ? `${diff.gain.playerName} (${diff.gain.netPoints > 0 ? "+" : ""}${diff.gain.netPoints.toFixed(1)})` : player.superStar.split("(")[0].trim(),
    villain: diff.loss ? `${diff.loss.playerName} (${diff.loss.netPoints.toFixed(1)})` : player.rankKiller.split("(")[0].trim(),
    avgGw: highlights?.avgGwPoints ?? "—",
    maxGwBar: maxPts,
    gwBars: gwPts.slice(0, 38),
    bestGwIdx: bestIdx,
    worstGwIdx: worstIdx,
    bestGwLabel: bestIdx >= 0 ? `GW${bestIdx + 1} · ${maxPts} pkt` : "—",
    worstGwLabel: worstIdx >= 0 ? `GW${worstIdx + 1} · ${minPts} pkt` : "—",
  };
}
