import type { Player } from "@arena/types/player";
import type { PlayerHighlightsMap } from "@arena/types/highlights";

export type PantheonRecord = {
  id: string;
  category: string;
  title: string;
  value: string;
  details: string;
  playerIds: number[];
  tone: "gold" | "green" | "red" | "blue" | "neutral";
};

export function buildPantheonRecords(
  players: Player[],
  highlights: PlayerHighlightsMap
): PantheonRecord[] {
  const records: PantheonRecord[] = [];

  const champ = players.find((p) => p.rank === 1);
  if (champ) {
    records.push({
      id: "champion",
      category: "Liga H2H",
      title: "Mistrz sezonu",
      value: `#1 · ${champ.pts} pkt ligowych`,
      details: `${champ.w}W–${champ.d}D–${champ.l}L · ${champ.score} pkt FPL`,
      playerIds: [champ.id],
      tone: "gold",
    });
  }

  const maxStreak = [...players].sort((a, b) => {
    const na = parseInt(String(a.winStreak).match(/(\d+)/)?.[1] || "0", 10);
    const nb = parseInt(String(b.winStreak).match(/(\d+)/)?.[1] || "0", 10);
    return nb - na;
  })[0];
  if (maxStreak) {
    records.push({
      id: "win-streak",
      category: "Serie H2H",
      title: "Najdłuższa seria wygranych",
      value: maxStreak.winStreak.split("(")[0].trim(),
      details: maxStreak.winStreak.includes("(") ? maxStreak.winStreak.split("(")[1].replace(")", "") : "—",
      playerIds: [maxStreak.id],
      tone: "green",
    });
  }

  const klonek = players.find((p) => p.id === 24962);
  if (klonek) {
    records.push({
      id: "best-gw",
      category: "Pojedyncza kolejka",
      title: "Rekord punktów w jednym GW",
      value: "137 pkt",
      details: "GW33 · Bench Boost · Ulane Warchlaki",
      playerIds: [klonek.id],
      tone: "gold",
    });
  }

  const seb = players.find((p) => p.id === 425158);
  if (seb) {
    records.push({
      id: "gw110",
      category: "Pojedyncza kolejka",
      title: "Drugie miejsce — wybuch punktowy",
      value: "110 pkt",
      details: "GW36 · Scuderia Blaugrana",
      playerIds: [seb.id],
      tone: "green",
    });
  }

  const marcel = players.find((p) => p.id === 49321);
  if (marcel) {
    records.push({
      id: "bench",
      category: "Ławka",
      title: "Najwięcej punktów na ławce",
      value: `${marcel.pointsBenched} pkt`,
      details: "Rekord Areny · świnie Pepa",
      playerIds: [marcel.id],
      tone: "red",
    });
  }

  const morfeusz = players.find((p) => p.id === 4002);
  if (morfeusz) {
    records.push({
      id: "hits",
      category: "Transfery",
      title: "Największy koszt hitów",
      value: `${morfeusz.hits} pkt`,
      details: `${morfeusz.transfers} transferów · Furiosa FC Morfeusza`,
      playerIds: [morfeusz.id],
      tone: "red",
    });
  }

  const alan = players.find((p) => p.id === 68435);
  if (alan) {
    records.push({
      id: "hit-gw3",
      category: "Transfery",
      title: "Największy hit w jednej kolejce",
      value: "−60 pkt",
      details: "GW3 · debiut · FcpoNalewce",
      playerIds: [alan.id],
      tone: "red",
    });
  }

  const mquc = players.find((p) => p.id === 546068);
  if (mquc) {
    records.push({
      id: "loss-streak",
      category: "Serie H2H",
      title: "Najdłuższa seria porażek",
      value: "17 meczów",
      details: "GW20–GW36 · MQUC",
      playerIds: [mquc.id],
      tone: "red",
    });
  }

  const owen = players.find((p) => p.id === 2953280);
  if (owen) {
    records.push({
      id: "tc-fail",
      category: "Chipy",
      title: "Legendarny Triple Captain",
      value: "6 pkt",
      details: "Haaland · Bolesławiec King — temat na roast",
      playerIds: [owen.id],
      tone: "red",
    });
  }

  const st0pa = players.find((p) => p.id === 22952);
  if (st0pa) {
    records.push({
      id: "or",
      category: "FPL globalnie",
      title: "Najlepszy OR sezonu w Arenie",
      value: `OR ${st0pa.bestOr}`,
      details: "Kapcie Kłapcia · sezon 2025/26",
      playerIds: [st0pa.id],
      tone: "blue",
    });
    records.push({
      id: "weeks-top",
      category: "Dominacja tabeli",
      title: "Najdłużej na 1. miejscu H2H",
      value: `${st0pa.weeksTop} tygodni`,
      details: "Kapcie Kłapcia",
      playerIds: [st0pa.id],
      tone: "gold",
    });
  }

  const mnstr = players.find((p) => p.id === 3749264);
  if (mnstr) {
    records.push({
      id: "weeks-bottom",
      category: "Dominacja tabeli",
      title: "Najdłużej na ostatnim miejscu",
      value: `${mnstr.weeksBottom} tygodni`,
      details: "MnstrNaf",
      playerIds: [mnstr.id],
      tone: "red",
    });
  }

  const palce = players.find((p) => p.id === 9084);
  if (palce) {
    records.push({
      id: "pechowiec",
      category: "Paradoks sezonu",
      title: "Wysoki score, niska tabela",
      value: `#14 przy score #4`,
      details: `${palce.score} pkt FPL · Wirtz Team Ever`,
      playerIds: [palce.id],
      tone: "neutral",
    });
  }

  let bestTransfer = { rp: -999, id: 0, detail: "" };
  Object.entries(highlights).forEach(([idStr, h]) => {
    const t = h.bestTransfers?.[0];
    if (t && t.rpDiff > bestTransfer.rp) {
      bestTransfer = {
        rp: t.rpDiff,
        id: Number(idStr),
        detail: `${t.sold} → ${t.bought}, GW${t.gw}`,
      };
    }
  });
  if (bestTransfer.id) {
    records.push({
      id: "transfer-best",
      category: "Transfery",
      title: "Transfer roku",
      value: `+${bestTransfer.rp.toFixed(0)} pkt`,
      details: bestTransfer.detail,
      playerIds: [bestTransfer.id],
      tone: "green",
    });
  }

  let worstTransfer = { rp: 999, id: 0, detail: "" };
  Object.entries(highlights).forEach(([idStr, h]) => {
    const t = h.worstTransfers?.[0];
    if (t && t.rpDiff < worstTransfer.rp) {
      worstTransfer = {
        rp: t.rpDiff,
        id: Number(idStr),
        detail: `${t.sold} → ${t.bought}, GW${t.gw}`,
      };
    }
  });
  if (worstTransfer.id) {
    records.push({
      id: "transfer-worst",
      category: "Transfery",
      title: "Najgorszy transfer",
      value: `${worstTransfer.rp.toFixed(0)} pkt`,
      details: worstTransfer.detail,
      playerIds: [worstTransfer.id],
      tone: "red",
    });
  }

  const alanJp = players.find((p) => p.id === 68435);
  if (alanJp?.superStar.includes("287")) {
    records.push({
      id: "hero-pick",
      category: "Zawodnicy",
      title: "Największy zysk z jednego picka",
      value: alanJp.superStar.split("(")[0].trim(),
      details: alanJp.superStar,
      playerIds: [alanJp.id],
      tone: "green",
    });
  }

  return records;
}

/** Rekordy już opisane flagowymi kartami u góry Panteonu */
const FLAGSHIP_PANTHEON_SKIP = new Set([
  "champion",
  "best-gw",
  "bench",
  "loss-streak",
  "pechowiec",
  "hit-gw3",
]);

export function buildPantheonEncyclopediaSections(
  players: Player[],
  highlights: PlayerHighlightsMap
) {
  const TONE_BORDER: Record<PantheonRecord["tone"], string> = {
    gold: "border-t-yellow-500",
    green: "border-t-emerald-500",
    red: "border-t-red-500",
    blue: "border-t-blue-500",
    neutral: "border-t-slate-500",
  };

  const TONE_EMOJI: Record<PantheonRecord["tone"], string> = {
    gold: "🏆",
    green: "📈",
    red: "💀",
    blue: "🌍",
    neutral: "📊",
  };

  const TONE_VALUE: Record<PantheonRecord["tone"], string> = {
    gold: "text-yellow-400",
    green: "text-emerald-400",
    red: "text-red-400",
    blue: "text-blue-400",
    neutral: "text-slate-200",
  };

  const records = buildPantheonRecords(players, highlights).filter(
    (r) => !FLAGSHIP_PANTHEON_SKIP.has(r.id)
  );

  const byCategory = new Map<string, PantheonRecord[]>();
  records.forEach((r) => {
    const list = byCategory.get(r.category) ?? [];
    list.push(r);
    byCategory.set(r.category, list);
  });

  return [...byCategory.entries()].map(([category, items]) => ({
    category,
    cards: items.map((r) => ({
      id: r.id,
      emoji: TONE_EMOJI[r.tone],
      border: TONE_BORDER[r.tone],
      title: r.title,
      playerIds: r.playerIds,
      valueClass: TONE_VALUE[r.tone],
      value: r.value,
      details: r.details,
    })),
  }));
}
