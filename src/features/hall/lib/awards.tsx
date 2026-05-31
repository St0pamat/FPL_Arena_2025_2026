import type { Player } from "@/types/player";
import type { PlayerHighlightsMap } from "@/types/highlights";
import type { PlayerSeasonHistoryMap } from "@/types/seasonHistory";

export const parsePtsFromStat = (str: string | undefined) => {
    if (!str) return 0;
    const m = String(str).match(/([-+]?[\d.]+)/);
    return m ? parseFloat(m[1]) : 0;
};

export const buildExtraHallAwards = (
    players: Player[],
    highlights: PlayerHighlightsMap,
    seasonHistory: PlayerSeasonHistoryMap = {}
) => {
    if (!highlights || Object.keys(highlights).length === 0) return [];

    const scan = {
        bestGw: { points: 0, gw: 0, id: 0 },
        maxBench: { val: 0, id: 0 },
        maxWinStreak: { val: 0, id: 0 },
        maxAvg: { val: 0, id: 0 },
        maxChipPts: { val: 0, id: 0 },
        bestChipWeek: { points: 0, id: 0, gw: 0, label: "" },
        bestTransfer: { rp: -999, id: 0, gw: 0, sold: "", bought: "" },
        worstTransfer: { rp: 999, id: 0, gw: 0, sold: "", bought: "" },
        maxExpOver: { val: 0, id: 0 },
        maxSpring: { trend: -999, id: 0 },
        minAutumn: { trend: 999, id: 0 },
        maxDraws: { val: 0, id: 0 },
        maxTopGain: { net: 0, id: 0, name: "" },
        minHits: { val: 999, id: 0 }
    };

    Object.entries(highlights).forEach(([idStr, data]) => {
        const id = Number(idStr);
        (data.gwPoints || []).forEach((g) => {
            if (g.points > scan.bestGw.points) scan.bestGw = { points: g.points, gw: g.gw, id };
        });
        if ((data.totalBench || 0) > scan.maxBench.val) scan.maxBench = { val: data.totalBench, id };
        const ws = data.h2hStreaks?.maxWins || 0;
        if (ws > scan.maxWinStreak.val) scan.maxWinStreak = { val: ws, id };
        if ((data.avgGwPoints || 0) > scan.maxAvg.val) scan.maxAvg = { val: data.avgGwPoints, id };
        const chipSum = (data.chips || []).reduce((s, c) => s + c.points, 0);
        if (chipSum > scan.maxChipPts.val) scan.maxChipPts = { val: chipSum, id };
        (data.chips || []).forEach((c) => {
            if (c.points > scan.bestChipWeek.points) {
                scan.bestChipWeek = { points: c.points, id, gw: c.gw, label: c.chipLabel };
            }
        });
        (data.bestTransfers || []).forEach((t) => {
            if (t.rpDiff > scan.bestTransfer.rp) scan.bestTransfer = { rp: t.rpDiff, id, gw: t.gw, sold: t.sold, bought: t.bought };
        });
        (data.worstTransfers || []).forEach((t) => {
            if (t.rpDiff < scan.worstTransfer.rp) scan.worstTransfer = { rp: t.rpDiff, id, gw: t.gw, sold: t.sold, bought: t.bought };
        });
        const over = data.expSummary?.overperform || 0;
        if (over > scan.maxExpOver.val) scan.maxExpOver = { val: over, id };
        const trend = data.seasonSplit?.trend;
        if (trend != null) {
            if (trend > scan.maxSpring.trend) scan.maxSpring = { trend, id };
            if (trend < scan.minAutumn.trend) scan.minAutumn = { trend, id };
        }
        const draws = (data.gwPoints || []).filter((g) => g.h2hOutcome === "D").length;
        if (draws > scan.maxDraws.val) scan.maxDraws = { val: draws, id };
        const top = data.topGains?.[0];
        if (top && top.net > scan.maxTopGain.net) scan.maxTopGain = { net: top.net, id, name: top.name };
        const hits = data.totalHitCost ?? 999;
        if (hits < scan.minHits.val) scan.minHits = { val: hits, id };
    });

    const autumn = [...players].sort((a, b) => a.gw19Rank - b.gw19Rank)[0];
    const mostTransfers = [...players].sort((a, b) => b.transfers - a.transfers)[0];
    const mostGreen = [...players].sort((a, b) => b.greenArrows - a.greenArrows)[0];
    const mostCaptain = [...players].sort((a, b) => b.captainPts - a.captainPts)[0];
    const veteran = [...players].sort((a, b) => b.seasons - a.seasons)[0];
    const orLegend = [...players].filter((p) => p.bestOr !== "Debiut").sort((a, b) => {
        const na = parseInt(String(a.bestOr).replace(/\s/g, ""), 10) || 9999999;
        const nb = parseInt(String(b.bestOr).replace(/\s/g, ""), 10) || 9999999;
        return na - nb;
    })[0];
    const balanced = players.find((p) => p.w === 19 && p.l === 19);
    const killer = [...players].sort((a, b) => parsePtsFromStat(a.rankKiller) - parsePtsFromStat(b.rankKiller))[0];
    const mvpGw = [...players].sort((a, b) => {
        const extract = (s) => { const m = String(s).match(/\((\d+)\s*pkt\)/); return m ? parseInt(m[1], 10) : 0; };
        return extract(b.bestGw) - extract(a.bestGw);
    })[0];

    const cards = [];

    if (scan.maxWinStreak.val > 0 && scan.maxWinStreak.id !== 22952) {
        cards.push({
            id: "win-streak",
            emoji: "🔥",
            border: "border-t-cyan-500",
            title: "Najdłuższa seria zwycięstw H2H",
            playerIds: [scan.maxWinStreak.id],
            body: <>Nieprzerwana passa <strong className="text-cyan-400">{scan.maxWinStreak.val} wygranych meczów ligowych</strong> z rzędu. Rywale nie mieli litości w terminarzu.</>
        });
    }

    if (autumn) {
        cards.push({
            id: "autumn-king",
            emoji: "🍂",
            border: "border-t-amber-500",
            title: "Mistrz Jesieni",
            playerIds: [autumn.id],
            body: <>Po pierwszej połowie sezonu (do GW19) prowadził tabelę ligi H2H. Potem sezon nabrał innego biegu, ale jesień należała do niego.</>
        });
    }

    if (scan.bestChipWeek.points > 0) {
        cards.push({
            id: "chip-explosion",
            emoji: "🎴",
            border: "border-t-violet-500",
            title: "Najlepszy weekend z chipem",
            playerIds: [scan.bestChipWeek.id],
            body: <>W kolejce <strong className="text-violet-400">{scan.bestChipWeek.gw}</strong> użył <strong className="text-violet-300">{scan.bestChipWeek.label}</strong> i zdobył <strong className="text-white">{scan.bestChipWeek.points} pkt</strong> — najlepszy wynik chipowy w całej lidze.</>
        });
    }

    if (scan.bestTransfer.rp > 0) {
        cards.push({
            id: "transfer-sniper",
            emoji: "🎯",
            border: "border-t-teal-500",
            title: "Transfer roku",
            playerIds: [scan.bestTransfer.id],
            body: <>Kolejka {scan.bestTransfer.gw}: zamiana <strong className="text-slate-200">{scan.bestTransfer.sold}</strong> na <strong className="text-slate-200">{scan.bestTransfer.bought}</strong> dała <strong className="text-teal-400">+{scan.bestTransfer.rp} pkt</strong> ponad oczekiwania.</>
        });
    }

    if (scan.worstTransfer.rp < 0) {
        cards.push({
            id: "transfer-disaster",
            emoji: "💣",
            border: "border-t-rose-600",
            title: "Najgorszy transfer sezonu",
            playerIds: [scan.worstTransfer.id],
            body: <>Kolejka {scan.worstTransfer.gw}: <strong className="text-slate-200">{scan.worstTransfer.sold} → {scan.worstTransfer.bought}</strong> kosztował <strong className="text-red-400">{scan.worstTransfer.rp} pkt</strong>. Ból w czystej postaci.</>
        });
    }

    if (scan.minHits.val < 999) {
        cards.push({
            id: "discipline",
            emoji: "🧘",
            border: "border-t-sky-500",
            title: "Asceta transferowy",
            playerIds: [scan.minHits.id],
            body: <>Tylko <strong className="text-sky-400">{Math.abs(scan.minHits.val)} pkt</strong> kar za transfery przez cały sezon. Spokój, cierpliwość i brak paniki przed deadline.</>
        });
    }

    if (scan.maxAvg.val > 0) {
        cards.push({
            id: "avg-machine",
            emoji: "⚙️",
            border: "border-t-emerald-400",
            title: "Maszyna punktowa",
            playerIds: [scan.maxAvg.id],
            body: <>Najwyższa średnia FPL w lidze: <strong className="text-emerald-400">{scan.maxAvg.val} pkt na kolejkę</strong>. Regularność, która buduje przewagę.</>
        });
    }

    if (scan.maxExpOver.val > 0) {
        cards.push({
            id: "lucky",
            emoji: "🍀",
            border: "border-t-lime-500",
            title: "Łowca niespodzianek",
            playerIds: [scan.maxExpOver.id],
            body: <><strong className="text-lime-400">{scan.maxExpOver.val} kolejek</strong> z wynikiem lepszym niż przewidywały statystyki. Sezon uśmiechał się częściej niż rywalom.</>
        });
    }

    if (scan.maxSpring.trend > 0) {
        cards.push({
            id: "spring",
            emoji: "🌱",
            border: "border-t-green-500",
            title: "Wiosenny comeback",
            playerIds: [scan.maxSpring.id],
            body: <>Po przerwie świątecznej podniósł średnią o <strong className="text-green-400">+{scan.maxSpring.trend} pkt na kolejkę</strong>. Druga połowa sezonu należała do niego.</>
        });
    }

    if (scan.minAutumn.trend < 0) {
        cards.push({
            id: "fall",
            emoji: "📉",
            border: "border-t-stone-500",
            title: "Jesienny zjazd",
            playerIds: [scan.minAutumn.id],
            body: <>Druga połowa sezonu obcięła formę o <strong className="text-red-400">{Math.abs(scan.minAutumn.trend)} pkt</strong> średnio na kolejkę. Terminarz i decyzje nie pomogły.</>
        });
    }

    if (scan.maxTopGain.net > 0) {
        cards.push({
            id: "hero-pick",
            emoji: "⭐",
            border: "border-t-yellow-400",
            title: "Zawodnik sezonu (zysk vs liga)",
            playerIds: [scan.maxTopGain.id],
            body: <><strong className="text-yellow-300">{scan.maxTopGain.name}</strong> dał największą przewagę nad przeciętnym menedżerem: <strong className="text-emerald-400">+{scan.maxTopGain.net} pkt</strong> w całym sezonie.</>
        });
    }

    if (killer && parsePtsFromStat(killer.rankKiller) < -100) {
        cards.push({
            id: "killer",
            emoji: "☠️",
            border: "border-t-red-700",
            title: "Klątwa sezonu",
            playerIds: [killer.id],
            body: <>Największe rozczarowanie sezonu: <strong className="text-red-400">{killer.rankKiller.split("(")[0].trim()}</strong> — najgorsza strata w porównaniu z resztą menedżerów FPL w całej Arenie.</>
        });
    }

    if (mostGreen) {
        cards.push({
            id: "arrows",
            emoji: "📈",
            border: "border-t-green-400",
            title: "Król zielonych strzałek",
            playerIds: [mostGreen.id],
            body: <><strong className="text-green-400">{mostGreen.greenArrows} tygodni</strong> ze wzrostem w rankingu ogólnym FPL. Liga widziała, kiedy trafia w formę.</>
        });
    }

    if (mostCaptain) {
        cards.push({
            id: "captain",
            emoji: "©️",
            border: "border-t-indigo-500",
            title: "Kapitanowski bank",
            playerIds: [mostCaptain.id],
            body: <>Opaska przyniosła mu <strong className="text-indigo-300">{mostCaptain.captainPts} pkt</strong> w sezonie — najwięcej w całej lidze. Zaufanie do jednego wyboru się opłaciło.</>
        });
    }

    if (balanced) {
        cards.push({
            id: "balance",
            emoji: "⚖️",
            border: "border-t-slate-400",
            title: "Idealna równowaga",
            playerIds: [balanced.id],
            body: <>Dokładnie <strong className="text-slate-200">19 wygranych i 19 porażek</strong> H2H. Sezon jak metronom — zero remisów, czysta matematyka chaosu.</>
        });
    }

    if (mostTransfers) {
        cards.push({
            id: "f5",
            emoji: "⌨️",
            border: "border-t-orange-600",
            title: "Król przycisku F5",
            playerIds: [mostTransfers.id],
            body: <><strong className="text-orange-400">{mostTransfers.transfers} transferów</strong> w sezonie. Palec na klawiaturze pracował więcej niż niejeden menedżer w biurze.</>
        });
    }

    if (veteran && veteran.seasons >= 8) {
        cards.push({
            id: "veteran",
            emoji: "🦖",
            border: "border-t-zinc-500",
            title: "Dinozaur Areny",
            playerIds: [veteran.id],
            body: <><strong className="text-slate-200">{veteran.seasons} sezonów</strong> w Fantasy Premier League. Pamięta czasy, gdy chipy jeszcze nie istniały.</>
        });
    }

    if (orLegend) {
        cards.push({
            id: "or",
            emoji: "🌍",
            border: "border-t-blue-500",
            title: "Globalna legenda",
            playerIds: [orLegend.id],
            body: <>Życiówka na poziomie <strong className="text-blue-400">OR {orLegend.bestOr}</strong> — najlepszy historyczny wynik wśród wszystkich gladiatorów ligi.</>
        });
    }

    const mquc = players.find((p) => p.id === 546068);
    if (mquc) {
        cards.push({
            id: "mcburnie",
            emoji: "🐐",
            border: "border-t-pink-500",
            title: "Kult jednego napastnika",
            playerIds: [mquc.id],
            body: <>Najwięcej punktów z jednego zawodnika w składzie: <strong className="text-pink-300">Ollie McBurnie</strong>. Reszta świata grała na Haalandzie — on na duszy.</>
        });
    }

    const owen = players.find((p) => p.id === 2953280);
    if (owen && parsePtsFromStat(owen.rankKiller) < -100) {
        cards.push({
            id: "tc-fail",
            emoji: "🎭",
            border: "border-t-fuchsia-600",
            title: "Potrójny kapitan w piekło",
            playerIds: [owen.id],
            body: <>Legendarny Triple Captain na Haalandzie za <strong className="text-red-400">6 punktów</strong>. Strata <strong className="text-red-400">{Math.abs(parsePtsFromStat(owen.rankKiller)).toFixed(0)} pkt</strong> vs elita — temat na wiele piątkowych roastów.</>
        });
    }

    if (mvpGw && mvpGw.id !== 24962) {
        const pts = String(mvpGw.bestGw).match(/(\d+)\s*pkt/);
        cards.push({
            id: "mvp-gw",
            emoji: "💥",
            border: "border-t-amber-400",
            title: "Eksplozja pojedynczej kolejki",
            playerIds: [mvpGw.id],
            body: <>{mvpGw.bestGw.split("(")[0].trim()} — weekend, który zapamięta cała liga (poza rekordem 137 pkt Klonka).</>
        });
    }

    if (scan.maxDraws.val >= 2) {
        cards.push({
            id: "draws",
            emoji: "🤝",
            border: "border-t-gray-500",
            title: "Dyplomata remisów",
            playerIds: [scan.maxDraws.id],
            body: <><strong className="text-slate-300">{scan.maxDraws.val} remisy</strong> H2H w sezonie — najwięcej w lidze. Nikt nie wygrywał, nikt nie przegrywał… czasem.</>
        });
    }

    const alan = players.find((p) => p.id === 68435);
    if (alan) {
        cards.push({
            id: "debut",
            emoji: "🌟",
            border: "border-t-cyan-400",
            title: "Debiutant z charakterem",
            playerIds: [alan.id],
            body: <>Pierwszy sezon w Arenie i już legenda: <strong className="text-red-400">hit -60 pkt w GW3</strong> po nocnej sesji transferowej. Wszedł jak przyszła burza.</>
        });
    }

    const throne = [...players].sort((a, b) => b.weeksTop - a.weeksTop)[0];
    if (throne && throne.weeksTop >= 5 && throne.id !== 22952) {
        cards.push({
            id: "throne-weeks",
            emoji: "🏛️",
            border: "border-t-yellow-600",
            title: "Władca tronu tabeli",
            playerIds: [throne.id],
            body: <>Spędził <strong className="text-yellow-400">{throne.weeksTop} kolejek</strong> na 1. miejscu w tabeli H2H — najdłużej w lidze poza mistrzem sezonu.</>
        });
    }

    const cellar = [...players].sort((a, b) => b.weeksBottom - a.weeksBottom)[0];
    if (cellar && cellar.weeksBottom >= 10 && cellar.id !== 546068 && cellar.id !== 3749264) {
        cards.push({
            id: "cellar-weeks",
            emoji: "🕳️",
            border: "border-t-stone-600",
            title: "Stały lokator piwnicy",
            playerIds: [cellar.id],
            body: <><strong className="text-red-400">{cellar.weeksBottom} tygodni</strong> na ostatnim miejscu tabeli H2H. Widok z dołu stał się rutyną.</>
        });
    }

    const consistency = [...players].sort((a, b) => a.avgPosition - b.avgPosition)[0];
    if (consistency && consistency.avgPosition <= 4 && consistency.id !== 49321) {
        cards.push({
            id: "consistency",
            emoji: "📊",
            border: "border-t-teal-400",
            title: "Mistrz regularności w tabeli",
            playerIds: [consistency.id],
            body: <>Średnia pozycja <strong className="text-teal-300">{consistency.avgPosition.toFixed(2)}</strong> przez 38 kolejek — najstabilniejszy wynik w lidze H2H.</>
        });
    }

    let eliteId = 0;
    let eliteAvg = -999;
    Object.entries(seasonHistory).forEach(([idStr, h]) => {
        const avg = h.avgVsTop10k;
        if (avg != null && avg > eliteAvg) {
            eliteAvg = avg;
            eliteId = Number(idStr);
        }
    });
    if (eliteId && eliteAvg > 0) {
        cards.push({
            id: "elite-fpl",
            emoji: "🌐",
            border: "border-t-blue-400",
            title: "Łowca elity globalnej",
            playerIds: [eliteId],
            body: <>Średnio <strong className="text-blue-300">+{eliteAvg} pkt</strong> na kolejkę lepiej niż menedżerowie z Top 10k FPL na świecie.</>
        });
    }

    return cards;
};
