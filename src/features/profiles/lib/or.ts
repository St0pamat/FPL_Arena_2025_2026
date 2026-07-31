import type { Player } from "@arena/types/player";
import type { PlayerHighlights } from "@arena/types/highlights";
import type { GladiatorOrMap } from "@arena/types/or";

export interface OrBundle {
  historicalOr: number | null;
  historicalOrSeason: string | null;
  seasonOr: number | null;
}

export interface PredictedStandingEntry {
  id: number;
  team: string;
  actualRank: number;
  historicalOr: number | null;
  historicalOrSeason: string | null;
  predictedRank: number | null;
  isDebut?: boolean;
}

export const formatOrDisplay = (n) => {
    if (n == null || n === undefined || n === "Debiut") return "—";
    const num = Number(String(n).replace(/\s/g, ""));
    return Number.isFinite(num) ? num.toLocaleString("pl-PL") : String(n);
};

export const orTierLabel = (or) => {
    if (or == null) return null;
    if (or <= 10_000) return "światowa elita";
    if (or <= 100_000) return "mocna światówka";
    if (or <= 500_000) return "solidny poziom";
    return "środkowa półka globu";
};

export const getPlayerOrBundle = (playerId, orById, highlights) => {
    const row = orById[String(playerId)] || orById[playerId] || {};
    const seasonOr = highlights?.seasonOr ?? row.seasonOr ?? null;
    const hist = row.historicalOr;
    return {
        historicalOr: hist != null && Number(hist) > 0 ? Number(hist) : null,
        historicalOrSeason: row.historicalOrSeason ?? null,
        seasonOr: seasonOr != null ? Number(seasonOr) : null
    };
};

export const buildPredictedStandings = (players, orById) => {
    const ranked = [];
    const debuts = [];
    players.forEach((p) => {
        const or = getPlayerOrBundle(p.id, orById, null);
        const entry = {
            id: p.id,
            team: p.team,
            actualRank: p.rank,
            historicalOr: or.historicalOr,
            historicalOrSeason: or.historicalOrSeason
        };
        if (or.historicalOr != null) ranked.push(entry);
        else debuts.push({ ...entry, predictedRank: null, isDebut: true });
    });
    ranked.sort((a, b) => a.historicalOr - b.historicalOr);
    ranked.forEach((e, i) => { e.predictedRank = i + 1; });
    const base = ranked.length;
    debuts.forEach((e, i) => {
        e.predictedRank = base + i + 1;
        e.isDebut = true;
    });
    return [...ranked, ...debuts];
};

export const getPredictionForPlayer = (playerId, predictedStandings) =>
    predictedStandings.find((e) => e.id === playerId) || null;
