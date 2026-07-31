import type { Player } from "@arena/types/player";
import type { PlayerHighlights } from "@arena/types/highlights";
import type { OrBundle } from "@arena/features/profiles/lib/or";
import type { PredictedStandingEntry } from "@arena/features/profiles/lib/or";
import { formatOrDisplay, orTierLabel } from "@arena/features/profiles/lib/or";

export const buildProfileSeasonStory = (player, highlights, orBundle, prediction) => {
    const positives = [];
    const negatives = [];
    const actual = player.rank;
    const predicted = prediction?.predictedRank;
    const delta = predicted != null ? predicted - actual : null;

    if (prediction?.isDebut) {
        positives.push({
            icon: "🆕",
            text: `Debiut na Arenie — brak historycznego OR sprzed sezonu. Końcowy glob: ${formatOrDisplay(orBundle.seasonOr)}.`
        });
    } else if (delta != null && delta >= 5) {
        positives.push({
            icon: "📈",
            text: `Niedoceniony przez historię: przed sezonem typowano ~${predicted}. miejsce (OR ${formatOrDisplay(prediction.historicalOr)}), a skończył na ${actual}.`
        });
    } else if (delta != null && delta <= -5) {
        negatives.push({
            icon: "📉",
            text: `Wyżej w oczekiwaniach niż w tabeli: historyczny OR sugerował ~${predicted}. lokatę, realnie ${actual}.`
        });
    } else if (predicted != null) {
        positives.push({
            icon: "⚖️",
            text: `Prognoza (~${predicted}. w tabeli) trafiła w punkt z wynikiem ${actual}. — stabilny sezon względem historii OR.`
        });
    }

    if (orBundle.seasonOr != null && orBundle.historicalOr != null) {
        const improved = orBundle.seasonOr < orBundle.historicalOr;
        if (improved) {
            positives.push({
                icon: "🌍",
                text: `Życiówka w rankingu globu: z OR ${formatOrDisplay(orBundle.historicalOr)} (${orBundle.historicalOrSeason || "wcześniej"}) na ${formatOrDisplay(orBundle.seasonOr)} po sezonie 25/26.`
            });
        } else if (orBundle.seasonOr > orBundle.historicalOr * 1.5) {
            negatives.push({
                icon: "🌧️",
                text: `Spadek formy w FPL Classic: końcowy OR ${formatOrDisplay(orBundle.seasonOr)} vs najlepszy historyczny ${formatOrDisplay(orBundle.historicalOr)}.`
            });
        }
    } else if (orBundle.seasonOr != null) {
        positives.push({
            icon: "🌍",
            text: `Sezon 25/26 zamknięty na OR ${formatOrDisplay(orBundle.seasonOr)} w rankingu ogólnym (${orTierLabel(orBundle.seasonOr) || "FPL"}).`
        });
    }

    if (player.gw19Rank && player.gw19Rank <= 3 && actual > player.gw19Rank + 2) {
        negatives.push({
            icon: "❄️",
            text: `Po przerwie świątecznej był w czołówce (${player.gw19Rank}.), ale wiosna zepchnęła na ${actual}. — zjazd po jesieni.`
        });
    } else if (player.gw19Rank && actual < player.gw19Rank - 2) {
        positives.push({
            icon: "☀️",
            text: `Mocny finisz: z ${player.gw19Rank}. miejsca po GW19 wspiął się na ${actual}. w lidze H2H.`
        });
    }

    if (highlights?.seasonSplit?.trend != null) {
        const t = highlights.seasonSplit.trend;
        if (t >= 3) {
            positives.push({
                icon: "🔥",
                text: `Druga połowa sezonu (+${t.toFixed(1)} pkt/kolejkę vs pierwsza) — forma rosła wraz z kalendarzem.`
            });
        } else if (t <= -3) {
            negatives.push({
                icon: "🥶",
                text: `Po GW19 siadła średnia (${t.toFixed(1)} pkt/kolejkę mniej w drugiej połowie).`
            });
        }
    }

    if (highlights?.expSummary) {
        const { overperform, underperform } = highlights.expSummary;
        if (overperform > underperform + 5) {
            positives.push({
                icon: "🎲",
                text: `Częściej bijał oczekiwania statystyczne (${overperform} kolejek ponad xP vs ${underperform} poniżej).`
            });
        } else if (underperform > overperform + 5) {
            negatives.push({
                icon: "📊",
                text: `Statystyki częściej go zawodziły (${underperform} słabszych kolejek vs ${overperform} lepszych od xP).`
            });
        }
    }

    if (player.pointsBenched >= 300) {
        negatives.push({
            icon: "🪑",
            text: `Kosztowna ławka: ${player.pointsBenched} pkt FPL nie weszło do składu — potencjał został w szatni.`
        });
    }

    if (player.hits <= -40) {
        negatives.push({
            icon: "💳",
            text: `Agresywne hity (${player.hits} pkt) — transferowa ruletka zjadała budżet co tydzień.`
        });
    } else if (player.hits >= -8 && player.transfers >= 35) {
        positives.push({
            icon: "🧘",
            text: `Spokojna gospodarka transferami (${player.hits} pkt kar, ${player.transfers} ruchów) — mało chaosu przy deadlinach.`
        });
    }

    const topGain = highlights?.topGains?.[0];
    if (topGain && !positives.some((p) => p.text.includes(topGain.name))) {
        positives.push({
            icon: "⭐",
            text: `${topGain.name} dowiózł największą przewagę nad przeciętnym menedżerem (+${topGain.net} pkt netto).`
        });
    }
    const topLoss = highlights?.topLosses?.[0];
    if (topLoss && !negatives.some((n) => n.text.includes(topLoss.name))) {
        negatives.push({
            icon: "💸",
            text: `${topLoss.name} najbardziej odstawał od reszty ligi (${topLoss.net} pkt netto).`
        });
    }

    const briefParts = [];
    if (player.rank === 1) {
        briefParts.push(`${player.team} — mistrz FPL Arena 25/26, ${player.w} zwycięstw H2H i ${player.pts} pkt ligowych.`);
    } else if (player.rank <= 3) {
        briefParts.push(`Podium Areny: ${player.rank}. miejsce (${player.w}W–${player.d}D–${player.l}L), ${player.score} pkt FPL w klasyku.`);
    } else {
        briefParts.push(`${player.team} kończy sezon na ${player.rank}. miejscu w H2H (${player.pts} pkt, bilans ${player.w}-${player.d}-${player.l}).`);
    }
    if (orBundle.seasonOr != null) {
        briefParts.push(`W rankingu ogólnym FPL: OR ${formatOrDisplay(orBundle.seasonOr)}.`);
    }

    let conclusion = "";
    if (delta != null && delta >= 8) {
        conclusion = "Werdykt: sezon powyżej oczekiwań — historia OR nie przewidziała takiego skoku.";
    } else if (delta != null && delta <= -8) {
        conclusion = "Werdykt: rozczarowanie względem oczekiwań — tabela H2H odjechała od prognozy z OR.";
    } else if (player.rank <= 5) {
        conclusion = "Werdykt: udany rok — wynik ligowy potwierdza klasę menedżera.";
    } else {
        conclusion = "Werdykt: mieszany bilans — kilka mocnych akcentów, ale tabela nie poszła w parze z ambicjami.";
    }

    return {
        brief: briefParts.join(" "),
        positives: positives.slice(0, 3),
        negatives: negatives.slice(0, 3),
        conclusion
    };
};
