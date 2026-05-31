import { PLAYERS_DATA } from "@/data/players";
import { TEAM_BY_NAME } from "@/config/playersIndex";
import type { GwMatchesBlock, StandingRow } from "@/types/match";

export const emptyStandingRow = (team) => ({
    team,
    id: TEAM_BY_NAME[team]?.id || null,
    w: 0,
    d: 0,
    l: 0,
    pts: 0,
    score: 0
});

export const miniLeagueStats = (teams, matchLog) => {
    const s = {};
    teams.forEach((t) => { s[t] = { pts: 0, score: 0 }; });
    matchLog.forEach((m) => {
        if (!teams.includes(m.teamA) || !teams.includes(m.teamB)) return;
        s[m.teamA].pts += m.leaguePtsA;
        s[m.teamB].pts += m.leaguePtsB;
        s[m.teamA].score += m.fa;
        s[m.teamB].score += m.fb;
    });
    return s;
};

export const compareStandingRows = (a, b, matchLog) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.score !== a.score) return b.score - a.score;
    const mini = miniLeagueStats([a.team, b.team], matchLog);
    if (mini[b.team].pts !== mini[a.team].pts) return mini[b.team].pts - mini[a.team].pts;
    if (mini[b.team].score !== mini[a.team].score) return mini[b.team].score - mini[a.team].score;
    return a.team.localeCompare(b.team, "pl");
};

export const computeStandingsAtGw = (matchesByGw, throughGw) => {
    const teamNames = PLAYERS_DATA.map((p) => p.team);
    const stats = {};
    teamNames.forEach((t) => { stats[t] = emptyStandingRow(t); });
    const matchLog = [];

    const sortedBlocks = [...matchesByGw].sort((a, b) => Number(a.gw) - Number(b.gw));
    for (const block of sortedBlocks) {
        const gw = Number(block.gw);
        if (gw > throughGw) break;
        for (const m of block.matches || []) {
            const fa = Number(m.pointsA);
            const fb = Number(m.pointsB);
            let lpa;
            let lpb;
            if (fa > fb) {
                lpa = 3;
                lpb = 0;
                stats[m.teamA].w += 1;
                stats[m.teamB].l += 1;
            } else if (fa < fb) {
                lpa = 0;
                lpb = 3;
                stats[m.teamB].w += 1;
                stats[m.teamA].l += 1;
            } else {
                lpa = 1;
                lpb = 1;
                stats[m.teamA].d += 1;
                stats[m.teamB].d += 1;
            }
            stats[m.teamA].pts += lpa;
            stats[m.teamB].pts += lpb;
            stats[m.teamA].score += fa;
            stats[m.teamB].score += fb;
            matchLog.push({
                teamA: m.teamA,
                teamB: m.teamB,
                leaguePtsA: lpa,
                leaguePtsB: lpb,
                fa,
                fb
            });
        }
    }

    const rows = teamNames.map((t) => ({ ...stats[t] }));
    rows.sort((a, b) => compareStandingRows(a, b, matchLog));
    rows.forEach((r, i) => { r.rank = i + 1; });
    return rows;
};

export const buildStandingsHistory = (matchesByGw) => {
    if (!matchesByGw?.length) return { byGw: {}, gwList: [], maxGw: 38 };
    const gwList = [...matchesByGw]
        .map((b) => Number(b.gw))
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b);
    const maxGw = gwList[gwList.length - 1] || 38;
    const byGw = {};
    let prevRankByTeam = {};

    for (let gw = 1; gw <= maxGw; gw++) {
        if (!gwList.includes(gw)) continue;
        const rows = computeStandingsAtGw(matchesByGw, gw);
        rows.forEach((r) => {
            if (gw === 1) {
                r.rankChange = null;
            } else {
                const prev = prevRankByTeam[r.team];
                r.rankChange = prev != null ? prev - r.rank : null;
            }
        });
        prevRankByTeam = Object.fromEntries(rows.map((r) => [r.team, r.rank]));
        byGw[gw] = rows;
    }

    return { byGw, gwList, maxGw };
};
