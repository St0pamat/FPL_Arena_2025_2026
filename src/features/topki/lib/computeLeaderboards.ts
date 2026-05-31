import type { Player } from "@/types/player";
import type { PlayerHighlightsMap } from "@/types/highlights";
import type { PlayerSeasonHistoryMap } from "@/types/seasonHistory";
import type { GwMatchesBlock } from "@/types/match";
import type { LeaderboardBadge, LeaderboardResult, TopEntry, TopkiSection } from "../types";
import {
  buildManagerContexts,
  h2hWinsInRange,
  leagueAvgByGw,
  leagueMedianByGw,
  leaguePointsByGw,
  longestStreak,
  rankTrajectory,
  stdDev,
  sumFirstN,
  sumLastN,
  type H2HRow,
} from "./stats";
import { buildStandingsHistory } from "@/features/standings/lib/standings";
import { playerDisplayName } from "@/lib/playerDisplay";

type RawRow = {
  playerId: number;
  sortValue: number;
  value: string;
  details: string;
  manager?: string;
  team?: string;
  opponentTeam?: string;
  matchupTeams?: [string, string];
};

const toEntries = (rows: RawRow[], players: Player[]): TopEntry[] => {
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  return [...rows]
    .sort((a, b) => b.sortValue - a.sortValue)
    .map((r) => {
      const p = byId[r.playerId];
      return {
        playerId: r.playerId,
        manager: p ? playerDisplayName(p) : (r.manager ?? "—"),
        team: r.team ?? p?.team ?? "—",
        value: r.value,
        details: r.details,
        sortValue: r.sortValue,
        opponentTeam: r.opponentTeam,
        matchupTeams: r.matchupTeams,
      };
    });
};

const board = (
  id: string,
  title: string,
  description: string,
  badge: LeaderboardBadge,
  rows: RawRow[],
  players: Player[]
): LeaderboardResult | null => {
  const entries = toEntries(rows, players);
  if (entries.length === 0) return null;
  return { id, title, description, badge, entries };
};

const section = (
  id: string,
  title: string,
  icon: string,
  description: string,
  leaderboards: (LeaderboardResult | null)[]
): TopkiSection => ({
  id,
  title,
  icon,
  description,
  leaderboards: leaderboards.filter((b): b is LeaderboardResult => b != null),
});

export function computeAllTopki(
  players: Player[],
  highlights: PlayerHighlightsMap,
  matchesByGw: GwMatchesBlock[],
  seasonHistory: PlayerSeasonHistoryMap = {}
): TopkiSection[] {
  const ctxs = buildManagerContexts(players, highlights);
  const avgGw = leagueAvgByGw(matchesByGw);
  const medGw = leagueMedianByGw(matchesByGw);
  const allGwPts = leaguePointsByGw(matchesByGw);
  const maxGw = matchesByGw.length
    ? Math.max(...matchesByGw.map((b) => Number(b.gw)))
    : 38;

  const weeklyTopScorerCount: Record<string, number> = {};
  for (const block of matchesByGw) {
    const ptsByTeam: Record<string, number> = {};
    for (const m of block.matches || []) {
      ptsByTeam[m.teamA] = Number(m.pointsA);
      ptsByTeam[m.teamB] = Number(m.pointsB);
    }
    const entries = Object.entries(ptsByTeam);
    if (!entries.length) continue;
    const maxPts = Math.max(...entries.map(([, p]) => p));
    entries.forEach(([team, pts]) => {
      if (pts === maxPts) weeklyTopScorerCount[team] = (weeklyTopScorerCount[team] || 0) + 1;
    });
  }

  // —— 0. Dominacja w tabeli H2H ——
  const dominanceBoards: (LeaderboardResult | null)[] = [
    board(
      "weeks-at-top",
      "Najdłużej na tronie",
      "Ile kolejek menedżer spędził na 1. miejscu w tabeli ligi H2H.",
      "Pozytywna",
      players.map((p) => ({
        playerId: p.id,
        sortValue: p.weeksTop,
        value: `${p.weeksTop} tyg.`,
        details: p.weeksTop ? "lider tabeli" : "nigdy na szczycie",
      })),
      players
    ),
    board(
      "weeks-at-bottom",
      "Najdłużej w piwnicy",
      "Ile kolejek menedżer spędził na ostatnim miejscu tabeli H2H.",
      "Negatywna",
      players.map((p) => ({
        playerId: p.id,
        sortValue: p.weeksBottom,
        value: `${p.weeksBottom} tyg.`,
        details: p.weeksBottom ? "ostatnia pozycja" : "nigdy w piwnicy",
      })),
      players
    ),
    board(
      "avg-table-position",
      "Najlepsza średnia pozycja",
      "Średnie miejsce w tabeli H2H przez cały sezon (niżej = lepiej).",
      "Pozytywna",
      players.map((p) => ({
        playerId: p.id,
        sortValue: -p.avgPosition,
        value: p.avgPosition.toFixed(2),
        details: "średnia z 38 kolejek",
      })),
      players
    ),
    board(
      "weekly-league-top-scorer",
      "Król weekendowych punktów",
      "Ile razy menedżer miał najwyższy wynik FPL w lidze w danej kolejce.",
      "Pozytywna",
      players.map((p) => {
        const count = weeklyTopScorerCount[p.team] || 0;
        return {
          playerId: p.id,
          sortValue: count,
          value: `${count}×`,
          details: count ? "najlepszy wynik w GW" : "—",
        };
      }),
      players
    ),
  ];

  // —— FPL global (z eksportu sezonu) ——
  const fplGlobalBoards: (LeaderboardResult | null)[] = [
    board(
      "avg-vs-top10k",
      "Przewaga nad elitą FPL",
      "Średnia różnica punktów vs menedżerów z Top 10k globalnie.",
      "Pozytywna",
      players.map((p) => {
        const h = seasonHistory[String(p.id)];
        const avg = h?.avgVsTop10k ?? null;
        return {
          playerId: p.id,
          sortValue: avg ?? -999,
          value: avg != null ? `${avg > 0 ? "+" : ""}${avg} pkt` : "—",
          details: avg != null ? "średnio na kolejkę" : "brak eksportu",
        };
      }),
      players
    ),
    board(
      "weeks-above-top10k",
      "Najwięcej kolejek powyżej Top 10k",
      "Weekendy, w których wynik FPL był lepszy niż średnia globalnej elity.",
      "Pozytywna",
      players.map((p) => {
        const h = seasonHistory[String(p.id)];
        const w = h?.weeksAboveTop10k ?? 0;
        return {
          playerId: p.id,
          sortValue: w,
          value: `${w} GW`,
          details: h ? `poniżej elity: ${h.weeksBelowTop10k ?? 0}` : "—",
        };
      }),
      players
    ),
    board(
      "best-gw-global-rank",
      "Najlepszy rank w pojedynczej kolejce",
      "Najniższy (najlepszy) globalny rank FPL osiągnięty w jednym weekendzie.",
      "Pozytywna",
      players.map((p) => {
        const h = seasonHistory[String(p.id)];
        const rank = h?.bestGwRank;
        return {
          playerId: p.id,
          sortValue: rank ? -rank : -99999999,
          value: rank ? `#${rank.toLocaleString("pl-PL")}` : "—",
          details: rank ? "najlepszy weekend globalnie" : "—",
        };
      }),
      players
    ),
  ];

  // —— 1. Rekordy H2H ——
  const h2hBoards: (LeaderboardResult | null)[] = [];

  h2hBoards.push(
    board(
      "win-streak",
      "Najdłuższe serie wygranych",
      "Najwięcej kolejnych zwycięstw w meczach H2H w zakończonym sezonie.",
      "Pozytywna",
      ctxs.map((c) => {
        const s = longestStreak(c.h2h, (o) => o === "W");
        const pre = (c.highlights?.h2hStreaks as { maxWins?: number })?.maxWins;
        const len = Math.max(s.length, pre ?? 0);
        return {
          playerId: c.player.id,
          sortValue: len,
          value: `${len} meczów`,
          details: s.length ? `GW${s.startGw}–GW${s.endGw}` : pre ? "z danych sezonu" : "—",
        };
      }),
      players
    )
  );

  h2hBoards.push(
    board(
      "unbeaten-streak",
      "Najdłuższe serie bez porażki",
      "Wygrane i remisy bez przegranej z rzędu.",
      "Pozytywna",
      ctxs.map((c) => {
        const s = longestStreak(c.h2h, (o) => o === "W" || o === "D");
        return {
          playerId: c.player.id,
          sortValue: s.length,
          value: `${s.length} meczów`,
          details: s.length ? `${s.record}, GW${s.startGw}–GW${s.endGw}` : "—",
        };
      }),
      players
    )
  );

  h2hBoards.push(
    board(
      "loss-streak",
      "Najdłuższe serie porażek",
      "Najwięcej kolejnych przegranych meczów ligowych.",
      "Negatywna",
      ctxs.map((c) => {
        const s = longestStreak(c.h2h, (o) => o === "L");
        const pre = (c.highlights?.h2hStreaks as { maxLosses?: number })?.maxLosses;
        const len = Math.max(s.length, pre ?? 0);
        return {
          playerId: c.player.id,
          sortValue: len,
          value: `${len} meczów`,
          details: s.length ? `GW${s.startGw}–GW${s.endGw}` : "—",
        };
      }),
      players
    )
  );

  h2hBoards.push(
    board(
      "biggest-win-margin",
      "Największe zwycięstwa",
      "Najwyższa różnica punktów FPL w jednym zwycięstwie H2H.",
      "Pozytywna",
      ctxs.map((c) => {
        const bw = c.highlights?.biggestWin as { margin?: number; opponent?: string; gw?: number; score?: string } | undefined;
        const fromH2h = c.h2h.filter((r) => r.outcome === "W").reduce(
          (best, r) => (r.margin > (best?.margin ?? -1) ? r : best),
          null as H2HRow | null
        );
        const margin = Math.max(bw?.margin ?? 0, fromH2h?.margin ?? 0);
        const opp = bw?.margin && bw.margin >= (fromH2h?.margin ?? 0) ? bw.opponent : fromH2h?.opponent;
        const gw = bw?.margin && bw.margin >= (fromH2h?.margin ?? 0) ? bw.gw : fromH2h?.gw;
        const score = bw?.score ?? (fromH2h ? `${fromH2h.fplPoints}:${fromH2h.oppPoints}` : "");
        return {
          playerId: c.player.id,
          sortValue: margin,
          value: `+${margin} pkt`,
          details: opp ? `${score}, GW${gw}` : "—",
          opponentTeam: opp || undefined,
        };
      }),
      players
    )
  );

  h2hBoards.push(
    board(
      "heaviest-loss",
      "Najbardziej bolesne porażki",
      "Największa ujemna różnica punktów w pojedynku H2H.",
      "Negatywna",
      ctxs.map((c) => {
        const hl = c.highlights?.heaviestLoss as { margin?: number; opponent?: string; gw?: number; score?: string } | undefined;
        const fromH2h = c.h2h.filter((r) => r.outcome === "L").reduce(
          (best, r) => (r.margin < (best?.margin ?? 0) ? r : best),
          null as H2HRow | null
        );
        const margin = Math.min(hl?.margin ?? 0, fromH2h?.margin ?? 0);
        const useHl = hl?.margin != null && hl.margin <= (fromH2h?.margin ?? 0);
        const opp = useHl ? hl?.opponent : fromH2h?.opponent;
        return {
          playerId: c.player.id,
          sortValue: Math.abs(margin),
          value: `${margin} pkt`,
          details: useHl
            ? `${hl?.score}, GW${hl?.gw}`
            : fromH2h
              ? `${fromH2h.fplPoints}:${fromH2h.oppPoints}, GW${fromH2h.gw}`
              : "—",
          opponentTeam: opp || undefined,
        };
      }),
      players
    )
  );

  h2hBoards.push(
    board(
      "high-score-win",
      "Najwyżej punktowane zwycięstwa",
      "Najwięcej punktów FPL zdobytych w wygranym meczu H2H.",
      "Pozytywna",
      ctxs.map((c) => {
        const best = c.h2h.filter((r) => r.outcome === "W").sort((a, b) => b.fplPoints - a.fplPoints)[0];
        return {
          playerId: c.player.id,
          sortValue: best?.fplPoints ?? 0,
          value: `${best?.fplPoints ?? 0} pkt`,
          details: best ? `GW${best.gw}` : "—",
          opponentTeam: best?.opponent,
        };
      }),
      players
    )
  );

  h2hBoards.push(
    board(
      "high-score-loss",
      "Najwyżej punktowane porażki",
      "Duży wynik FPL mimo przegranej w H2H.",
      "Ciekawostka",
      ctxs.map((c) => {
        const best = c.h2h.filter((r) => r.outcome === "L").sort((a, b) => b.fplPoints - a.fplPoints)[0];
        return {
          playerId: c.player.id,
          sortValue: best?.fplPoints ?? 0,
          value: `${best?.fplPoints ?? 0} pkt`,
          details: best ? `GW${best.gw}` : "—",
          opponentTeam: best?.opponent,
        };
      }),
      players
    )
  );

  const draws: { sum: number; teamA: string; teamB: string; pa: number; pb: number; gw: number }[] = [];
  for (const block of matchesByGw) {
    const gw = Number(block.gw);
    for (const m of block.matches || []) {
      const pa = Number(m.pointsA);
      const pb = Number(m.pointsB);
      if (pa === pb) {
        draws.push({ sum: pa + pb, teamA: m.teamA, teamB: m.teamB, pa, pb, gw });
      }
    }
  }

  if (draws.length > 0) {
    const topDraw = [...draws].sort((a, b) => b.sum - a.sum)[0];
    const botDraw = [...draws].sort((a, b) => a.sum - b.sum)[0];
    h2hBoards.push({
      id: "spectacular-draw",
      title: "Najbardziej widowiskowy remis",
      description: "Remis z najwyższą łączną punktacją w lidze.",
      badge: "Ciekawostka",
      entries: [
        {
          playerId: 0,
          manager: topDraw.teamA,
          team: topDraw.teamB,
          value: `${topDraw.sum} pkt łącznie`,
          details: `Wynik ${topDraw.pa}:${topDraw.pb} · GW${topDraw.gw}`,
          sortValue: topDraw.sum,
          matchupTeams: [topDraw.teamA, topDraw.teamB],
        },
      ],
    });
    h2hBoards.push({
      id: "dirty-draw",
      title: "Najbardziej „brudny” remis",
      description: "Remis z najniższą łączną punktacją.",
      badge: "Ciekawostka",
      entries: [
        {
          playerId: 0,
          manager: botDraw.teamA,
          team: botDraw.teamB,
          value: `${botDraw.sum} pkt łącznie`,
          details: `Wynik ${botDraw.pa}:${botDraw.pb} · GW${botDraw.gw}`,
          sortValue: botDraw.sum,
          matchupTeams: [botDraw.teamA, botDraw.teamB],
        },
      ],
    });
  }

  // —— 2. Punkty i regularność ——
  const ptsBoards: (LeaderboardResult | null)[] = [];

  ptsBoards.push(
    board(
      "best-gw",
      "Najwyższe wyniki kolejki",
      "Najlepszy pojedynczy wynik FPL w jednej kolejce.",
      "Pozytywna",
      ctxs.map((c) => {
        const best = [...c.gwPoints].sort((a, b) => b.points - a.points)[0];
        return {
          playerId: c.player.id,
          sortValue: best?.points ?? 0,
          value: `${best?.points ?? 0} pkt`,
          details: best ? `GW${best.gw}` : "—",
        };
      }),
      players
    )
  );

  ptsBoards.push(
    board(
      "worst-gw",
      "Najniższe wyniki kolejki",
      "Najgorszy pojedynczy wynik FPL w sezonie.",
      "Negatywna",
      ctxs.map((c) => {
        const worst = [...c.gwPoints].sort((a, b) => a.points - b.points)[0];
        return {
          playerId: c.player.id,
          sortValue: -(worst?.points ?? 999),
          value: `${worst?.points ?? 0} pkt`,
          details: worst ? `GW${worst.gw}` : "—",
        };
      }),
      players
    )
  );

  ptsBoards.push(
    board(
      "highest-avg",
      "Najwyższa średnia punktów",
      "Średnia punktów FPL na kolejkę w sezonie.",
      "Pozytywna",
      ctxs.map((c) => {
        const avg = (c.highlights?.avgGwPoints as number) ?? 0;
        const n = c.gwPoints.length;
        return {
          playerId: c.player.id,
          sortValue: avg,
          value: `${avg.toFixed(1)} pkt`,
          details: `${n} kolejek`,
        };
      }),
      players
    )
  );

  ptsBoards.push(
    board(
      "most-regular",
      "Największa regularność",
      "Najmniejsze wahania wyników (najniższe odchylenie standardowe).",
      "Pozytywna",
      ctxs.map((c) => {
        const pts = c.gwPoints.map((g) => g.points);
        const sd = stdDev(pts);
        const avg = pts.length ? pts.reduce((a, b) => a + b, 0) / pts.length : 0;
        return {
          playerId: c.player.id,
          sortValue: -sd,
          value: `σ ${sd.toFixed(1)}`,
          details: `śr. ${avg.toFixed(1)} pkt`,
        };
      }),
      players
    )
  );

  ptsBoards.push(
    board(
      "most-volatile",
      "Największa nieregularność",
      "Największe wahania wyników tygodniowych.",
      "Ciekawostka",
      ctxs.map((c) => {
        const pts = c.gwPoints.map((g) => g.points);
        const sd = stdDev(pts);
        const best = Math.max(...pts, 0);
        const worst = Math.min(...pts, 999);
        return {
          playerId: c.player.id,
          sortValue: sd,
          value: `σ ${sd.toFixed(1)}`,
          details: `zakres ${worst}–${best} pkt`,
        };
      }),
      players
    )
  );

  ptsBoards.push(
    board(
      "above-league-avg",
      "Najwięcej kolejek powyżej średniej ligi",
      "Regularne bicie średniej mini-ligi w danej kolejce.",
      "Pozytywna",
      ctxs.map((c) => {
        let count = 0;
        c.gwPoints.forEach((g) => {
          const league = avgGw[g.gw];
          if (league != null && g.points > league) count += 1;
        });
        const pct = c.gwPoints.length ? Math.round((count / c.gwPoints.length) * 100) : 0;
        return {
          playerId: c.player.id,
          sortValue: count,
          value: `${count} GW`,
          details: `${pct}% kolejek`,
        };
      }),
      players
    )
  );

  ptsBoards.push(
    board(
      "below-league-avg",
      "Najwięcej kolejek poniżej średniej ligi",
      "Kolejki poniżej średniej Areny w danym tygodniu.",
      "Negatywna",
      ctxs.map((c) => {
        let count = 0;
        c.gwPoints.forEach((g) => {
          const league = avgGw[g.gw];
          if (league != null && g.points < league) count += 1;
        });
        const pct = c.gwPoints.length ? Math.round((count / c.gwPoints.length) * 100) : 0;
        return {
          playerId: c.player.id,
          sortValue: count,
          value: `${count} GW`,
          details: `${pct}% kolejek`,
        };
      }),
      players
    )
  );

  ptsBoards.push(
    board(
      "above-median",
      "Najwięcej kolejek powyżej mediany ligi",
      "Stabilna forma względem połowy ligi w danym GW.",
      "Pozytywna",
      ctxs.map((c) => {
        let count = 0;
        c.gwPoints.forEach((g) => {
          const med = medGw[g.gw];
          if (med != null && g.points > med) count += 1;
        });
        const pct = c.gwPoints.length ? Math.round((count / c.gwPoints.length) * 100) : 0;
        return {
          playerId: c.player.id,
          sortValue: count,
          value: `${count} GW`,
          details: `${pct}% kolejek`,
        };
      }),
      players
    )
  );

  // —— 3. Forma sezonu ——
  const formBoards: (LeaderboardResult | null)[] = [];

  for (const [n, label] of [
    [3, "3"],
    [5, "5"],
    [8, "8"],
  ] as const) {
    formBoards.push(
      board(
        `form-last-${n}`,
        `Najlepsza forma (ostatnie ${label} GW)`,
        `Najwyższy dorobek punktów FPL w ${label} ostatnich kolejkach.`,
        "Pozytywna",
        ctxs.map((c) => {
          const { pts, range } = sumLastN(c.gwPoints, n);
          return {
            playerId: c.player.id,
            sortValue: pts,
            value: `${pts} pkt`,
            details: range,
          };
        }),
        players
      )
    );
  }

  formBoards.push(
    board(
      "best-start",
      "Najlepszy start sezonu",
      "Najwięcej punktów FPL w pierwszych 5 kolejkach.",
      "Pozytywna",
      ctxs.map((c) => {
        const { pts, range } = sumFirstN(c.gwPoints, 5);
        return {
          playerId: c.player.id,
          sortValue: pts,
          value: `${pts} pkt`,
          details: range,
        };
      }),
      players
    )
  );

  formBoards.push(
    board(
      "worst-start",
      "Najgorszy start sezonu",
      "Najsłabsze pierwsze 5 kolejek.",
      "Negatywna",
      ctxs.map((c) => {
        const { pts, range } = sumFirstN(c.gwPoints, 5);
        return {
          playerId: c.player.id,
          sortValue: -pts,
          value: `${pts} pkt`,
          details: range,
        };
      }),
      players
    )
  );

  formBoards.push(
    board(
      "second-half",
      "Najlepsza druga połowa",
      "Wyższa średnia punktów po półmetku sezonu (GW20+).",
      "Pozytywna",
      ctxs.map((c) => {
        const split = c.highlights?.seasonSplit as { secondHalfAvg?: number; firstHalfAvg?: number } | undefined;
        const avg = split?.secondHalfAvg ?? 0;
        const h2h2 = h2hWinsInRange(c.h2h, 20, maxGw);
        return {
          playerId: c.player.id,
          sortValue: avg,
          value: `${avg.toFixed(1)} śr./GW`,
          details: `H2H GW20+: ${h2h2.w}W-${h2h2.d}R-${h2h2.l}P`,
        };
      }),
      players
    )
  );

  formBoards.push(
    board(
      "comeback",
      "Największy comeback",
      "Największy awans względem najgorszej pozycji w tabeli H2H.",
      "Pozytywna",
      ctxs.map((c) => {
        const t = rankTrajectory(matchesByGw, c.player.team);
        const climb = t.maxRank - t.finalRank;
        return {
          playerId: c.player.id,
          sortValue: climb,
          value: `${climb} miejsc`,
          details: climb > 0 ? `z #${t.maxRank} (GW${t.maxGw}) → #${t.finalRank}` : `końcowo #${t.finalRank}`,
        };
      }),
      players
    )
  );

  formBoards.push(
    board(
      "slide",
      "Największy zjazd",
      "Spadek względem najlepszej pozycji w tabeli w trakcie sezonu.",
      "Negatywna",
      ctxs.map((c) => {
        const t = rankTrajectory(matchesByGw, c.player.team);
        const drop = t.finalRank - t.minRank;
        return {
          playerId: c.player.id,
          sortValue: drop,
          value: `${drop} miejsc`,
          details: drop > 0 ? `z #${t.minRank} (GW${t.minGw}) → #${t.finalRank}` : `końcowo #${t.finalRank}`,
        };
      }),
      players
    )
  );

  // —— 4. Pech i szczęście ——
  const luckBoards: (LeaderboardResult | null)[] = [];

  luckBoards.push(
    board(
      "unlucky-losses",
      "Najwięksi pechowcy",
      "Najwięcej porażek H2H przy wyniku powyżej mediany ligi w danej kolejce.",
      "Negatywna",
      ctxs.map((c) => {
        let count = 0;
        let ptsSum = 0;
        c.h2h.forEach((r) => {
          const med = medGw[r.gw];
          if (r.outcome === "L" && med != null && r.fplPoints >= med) {
            count += 1;
            ptsSum += r.fplPoints;
          }
        });
        const avg = count ? (ptsSum / count).toFixed(1) : "—";
        return {
          playerId: c.player.id,
          sortValue: count,
          value: `${count} meczów`,
          details: count ? `śr. ${avg} pkt w porażkach` : "—",
        };
      }),
      players
    )
  );

  luckBoards.push(
    board(
      "lucky-wins",
      "Najwięksi farciarze",
      "Najwięcej wygranych H2H przy wyniku poniżej mediany ligi.",
      "Ciekawostka",
      ctxs.map((c) => {
        let count = 0;
        let ptsSum = 0;
        c.h2h.forEach((r) => {
          const med = medGw[r.gw];
          if (r.outcome === "W" && med != null && r.fplPoints < med) {
            count += 1;
            ptsSum += r.fplPoints;
          }
        });
        const avg = count ? (ptsSum / count).toFixed(1) : "—";
        return {
          playerId: c.player.id,
          sortValue: count,
          value: `${count} meczów`,
          details: count ? `śr. ${avg} pkt w wygranych` : "—",
        };
      }),
      players
    )
  );

  const unluckySingle: RawRow[] = [];
  ctxs.forEach((c) => {
    c.h2h.forEach((r) => {
      if (r.outcome !== "L") return;
      const ptsInGw = allGwPts[r.gw] || [];
      const beaten = ptsInGw.filter((p) => p < r.fplPoints).length;
      const total = ptsInGw.length;
      const pct = total ? (beaten / total) * 100 : 0;
      if (pct >= 50) {
        unluckySingle.push({
          playerId: c.player.id,
          sortValue: pct,
          value: `${pct.toFixed(0)}% ligi`,
          details: `${r.fplPoints} pkt · GW${r.gw}`,
          opponentTeam: r.opponent,
        });
      }
    });
  });
  luckBoards.push(
    board(
      "unfair-loss",
      "Najbardziej niesprawiedliwa porażka",
      "Pojedyncza porażka przy wyniku, który pokonałby większość ligi w tym GW.",
      "Negatywna",
      unluckySingle,
      players
    )
  );

  luckBoards.push(
    board(
      "narrow-losses",
      "Najwięcej porażek minimalną różnicą",
      "Przegrane o 1–5 punktów różnicy.",
      "Negatywna",
      ctxs.map((c) => {
        const narrow = c.h2h.filter((r) => r.outcome === "L" && r.margin < 0 && r.margin >= -5);
        const avg =
          narrow.length
            ? (narrow.reduce((s, r) => s + Math.abs(r.margin), 0) / narrow.length).toFixed(1)
            : "—";
        return {
          playerId: c.player.id,
          sortValue: narrow.length,
          value: `${narrow.length} meczów`,
          details: narrow.length ? `śr. margines ${avg} pkt` : "—",
        };
      }),
      players
    )
  );

  luckBoards.push(
    board(
      "narrow-wins",
      "Najwięcej zwycięstw minimalną różnicą",
      "Wygrane o 1–5 punktów różnicy.",
      "Ciekawostka",
      ctxs.map((c) => {
        const narrow = c.h2h.filter((r) => r.outcome === "W" && r.margin > 0 && r.margin <= 5);
        const avg =
          narrow.length
            ? (narrow.reduce((s, r) => s + r.margin, 0) / narrow.length).toFixed(1)
            : "—";
        return {
          playerId: c.player.id,
          sortValue: narrow.length,
          value: `${narrow.length} meczów`,
          details: narrow.length ? `śr. margines ${avg} pkt` : "—",
        };
      }),
      players
    )
  );

  // —— 5. Transfery ——
  const transferBoards: (LeaderboardResult | null)[] = [];

  transferBoards.push(
    board(
      "best-transfer",
      "Najlepsze pojedyncze transfery",
      "Największy zysk punktowy (rpDiff) z jednego ruchu.",
      "Pozytywna",
      ctxs.flatMap((c) => {
        const list = (c.highlights?.bestTransfers as Array<{ rpDiff: number; gw: number; sold: string; bought: string }>) || [];
        const best = list[0];
        if (!best) return [];
        return [
          {
            playerId: c.player.id,
            sortValue: best.rpDiff,
            value: `+${best.rpDiff.toFixed(0)} pkt`,
            details: `${best.sold} → ${best.bought}, GW${best.gw}`,
          },
        ];
      }),
      players
    )
  );

  transferBoards.push(
    board(
      "worst-transfer",
      "Najgorsze pojedyncze transfery",
      "Największa strata punktowa z jednego ruchu.",
      "Negatywna",
      ctxs.flatMap((c) => {
        const list = (c.highlights?.worstTransfers as Array<{ rpDiff: number; gw: number; sold: string; bought: string }>) || [];
        const worst = list[0];
        if (!worst) return [];
        return [
          {
            playerId: c.player.id,
            sortValue: Math.abs(worst.rpDiff),
            value: `${worst.rpDiff.toFixed(0)} pkt`,
            details: `${worst.sold} → ${worst.bought}, GW${worst.gw}`,
          },
        ];
      }),
      players
    )
  );

  transferBoards.push(
    board(
      "most-transfers",
      "Najwięcej transferów",
      "Najbardziej aktywny menedżer w sezonie.",
      "Strategia",
      ctxs.map((c) => ({
        playerId: c.player.id,
        sortValue: c.player.transfers,
        value: `${c.player.transfers}`,
        details: `śr. ${(c.player.transfers / 38).toFixed(1)} / GW`,
      })),
      players
    )
  );

  transferBoards.push(
    board(
      "least-transfers",
      "Najmniej transferów",
      "Najbardziej cierpliwy menedżer.",
      "Strategia",
      ctxs.map((c) => ({
        playerId: c.player.id,
        sortValue: -c.player.transfers,
        value: `${c.player.transfers}`,
        details: `śr. ${(c.player.transfers / 38).toFixed(1)} / GW`,
      })),
      players
    )
  );

  transferBoards.push(
    board(
      "hit-cost",
      "Największy koszt hitów",
      "Najwięcej odjętych punktów za transfery (-4).",
      "Negatywna",
      ctxs.map((c) => {
        const cost = Math.abs(c.player.hits);
        const fromHl = (c.highlights?.totalHitCost as number) ?? cost;
        return {
          playerId: c.player.id,
          sortValue: Math.max(cost, fromHl),
          value: `-${Math.max(cost, fromHl)} pkt`,
          details: `transfery: ${c.player.transfers}`,
        };
      }),
      players
    )
  );

  transferBoards.push(
    board(
      "max-hit-gw",
      "Największy hit w jednej kolejce",
      "Maksymalna kara punktowa w pojedynczym GW.",
      "Negatywna",
      ctxs.map((c) => {
        const max = c.gwPoints.reduce((m, g) => Math.max(m, g.hitCost ?? 0), 0);
        const gw = c.gwPoints.find((g) => (g.hitCost ?? 0) === max)?.gw;
        return {
          playerId: c.player.id,
          sortValue: max,
          value: `-${max} pkt`,
          details: max ? `GW${gw}` : "brak hitów",
        };
      }),
      players
    )
  );

  transferBoards.push(
    board(
      "top-gain-player",
      "Najlepszy zawodnik sezonu (net)",
      "Najwyższy zysk netto z jednego zawodnika w składzie.",
      "Pozytywna",
      ctxs.map((c) => {
        const top = (c.highlights?.topGains as Array<{ name: string; net: number }>)?.[0];
        return {
          playerId: c.player.id,
          sortValue: top?.net ?? 0,
          value: top ? `+${top.net.toFixed(1)}` : "—",
          details: top?.name ?? "—",
        };
      }),
      players
    )
  );

  // —— 6. Kapitan (ograniczone) ——
  const capBoards: (LeaderboardResult | null)[] = [
    board(
      "captain-total",
      "Najwięcej punktów z kapitana",
      "Suma punktów z opaski w sezonie (dane agregowane).",
      "Pozytywna",
      ctxs.map((c) => ({
        playerId: c.player.id,
        sortValue: c.player.captainPts,
        value: `${c.player.captainPts} pkt`,
        details: c.player.mostCaptained.split("(")[0].trim(),
      })),
      players
    ),
  ];

  // —— 7. Ławka ——
  const benchBoards: (LeaderboardResult | null)[] = [
    board(
      "bench-total",
      "Najwięcej punktów na ławce",
      "Suma punktów zostawionych poza XI.",
      "Negatywna",
      ctxs.map((c) => {
        const bench = (c.highlights?.totalBench as number) ?? c.player.pointsBenched;
        return {
          playerId: c.player.id,
          sortValue: bench,
          value: `${bench} pkt`,
          details: `śr. ${(bench / 38).toFixed(1)} / GW`,
        };
      }),
      players
    ),
    board(
      "bench-max-gw",
      "Największa ławka w jednej kolejce",
      "Maksymalny bench haul w pojedynczym GW.",
      "Negatywna",
      ctxs.map((c) => {
        const best = [...c.gwPoints].sort((a, b) => (b.bench ?? 0) - (a.bench ?? 0))[0];
        return {
          playerId: c.player.id,
          sortValue: best?.bench ?? 0,
          value: `${best?.bench ?? 0} pkt`,
          details: best ? `GW${best.gw}` : "—",
        };
      }),
      players
    ),
  ];

  // —— 8. Chipy ——
  const chipBoards: (LeaderboardResult | null)[] = [];

  const chipTypes = [
    { key: "bboost", label: "Bench Boost" },
    { key: "3xc", label: "Triple Captain" },
    { key: "freehit", label: "Free Hit" },
    { key: "wildcard", label: "Wildcard" },
  ];

  for (const { key, label } of chipTypes) {
    chipBoards.push(
      board(
        `chip-best-${key}`,
        `Najlepszy ${label}`,
        `Najwyższy wynik FPL w kolejce z aktywnym chipem.`,
        "Strategia",
        ctxs.flatMap((c) => {
          const chips = (c.highlights?.chips as Array<{ chip: string; gw: number; points: number }>) || [];
          const match = chips.filter((ch) => ch.chip === key).sort((a, b) => b.points - a.points)[0];
          if (!match) return [];
          return [
            {
              playerId: c.player.id,
              sortValue: match.points,
              value: `${match.points} pkt`,
              details: `GW${match.gw}`,
            },
          ];
        }),
        players
      )
    );
  }

  chipBoards.push(
    board(
      "chip-total",
      "Najwięcej punktów w kolejkach z chipem",
      "Suma wyników FPL we wszystkich GW z zagranym chipem.",
      "Strategia",
      ctxs.map((c) => {
        const chips = (c.highlights?.chips as Array<{ points: number }>) || [];
        const sum = chips.reduce((s, ch) => s + ch.points, 0);
        return {
          playerId: c.player.id,
          sortValue: sum,
          value: `${sum} pkt`,
          details: `${chips.length} chipów`,
        };
      }),
      players
    )
  );

  // —— 9. Rywalizacje ——
  const rivalryBoards: (LeaderboardResult | null)[] = [];
  const pairStats: Record<
    string,
    { a: string; b: string; meetings: number; marginSum: number; pointsSum: number; winsA: number; winsB: number }
  > = {};

  const pairKey = (t1: string, t2: string) => [t1, t2].sort().join("|");

  for (const block of matchesByGw) {
    for (const m of block.matches || []) {
      const key = pairKey(m.teamA, m.teamB);
      if (!pairStats[key]) {
        pairStats[key] = { a: m.teamA, b: m.teamB, meetings: 0, marginSum: 0, pointsSum: 0, winsA: 0, winsB: 0 };
      }
      const pa = Number(m.pointsA);
      const pb = Number(m.pointsB);
      pairStats[key].meetings += 1;
      pairStats[key].marginSum += Math.abs(pa - pb);
      pairStats[key].pointsSum += pa + pb;
      if (pa > pb) pairStats[key].winsA += 1;
      else if (pb > pa) pairStats[key].winsB += 1;
    }
  }

  const pairs = Object.values(pairStats).filter((p) => p.meetings >= 2);

  const mapClosestPair = (p: (typeof pairs)[0]): RawRow => ({
    playerId: 0,
    manager: p.a,
    team: p.b,
    value: `śr. ${(p.marginSum / p.meetings).toFixed(1)} pkt`,
    details: `Bilans ${p.winsA}-${p.winsB} · ${p.meetings} mecze`,
    sortValue: -(p.marginSum / p.meetings),
    matchupTeams: [p.a, p.b],
  });

  const mapLopsidedPair = (p: (typeof pairs)[0]): RawRow => {
    const dom = p.winsA >= p.winsB ? p.a : p.b;
    return {
      playerId: 0,
      manager: p.a,
      team: p.b,
      value: `${Math.max(p.winsA, p.winsB)}-${Math.min(p.winsA, p.winsB)}`,
      details: `Dominacja: ${dom} · ${p.meetings} mecze`,
      sortValue: Math.abs(p.winsA - p.winsB),
      matchupTeams: [p.a, p.b],
    };
  };

  const mapSpectaclePair = (p: (typeof pairs)[0]): RawRow => ({
    playerId: 0,
    manager: p.a,
    team: p.b,
    value: `śr. ${(p.pointsSum / p.meetings).toFixed(0)} pkt`,
    details: `${p.meetings} mecze · łącznie na spotkanie`,
    sortValue: p.pointsSum / p.meetings,
    matchupTeams: [p.a, p.b],
  });

  if (pairs.length) {
    const closestTop = [...pairs]
      .sort((a, b) => a.marginSum / a.meetings - b.marginSum / b.meetings)
      .slice(0, 3)
      .map(mapClosestPair);
    rivalryBoards.push({
      id: "closest-rivalry",
      title: "Najciaśniejsza rywalizacja",
      description: "Para drużyn ze średnio najmniejszą różnicą punktową (min. 2 mecze).",
      badge: "Ciekawostka",
      entries: toEntries(closestTop, players),
    });

    const lopsidedTop = [...pairs]
      .sort(
        (a, b) =>
          Math.abs(b.winsA - b.winsB) / b.meetings - Math.abs(a.winsA - a.winsB) / a.meetings
      )
      .slice(0, 3)
      .map(mapLopsidedPair);
    rivalryBoards.push({
      id: "one-sided",
      title: "Najbardziej jednostronna rywalizacja",
      description: "Pary, w których jedna strona wyraźnie dominuje w bezpośrednich spotkaniach.",
      badge: "Ciekawostka",
      entries: toEntries(lopsidedTop, players),
    });

    const spectacleTop = [...pairs]
      .sort((a, b) => b.pointsSum / b.meetings - a.pointsSum / a.meetings)
      .slice(0, 3)
      .map(mapSpectaclePair);
    rivalryBoards.push({
      id: "spectacle-rivalry",
      title: "Najbardziej widowiskowa rywalizacja",
      description: "Najwyższa średnia łączna punktacja w parach meczów (min. 2 mecze).",
      badge: "Pozytywna",
      entries: toEntries(spectacleTop, players),
    });
  }

  rivalryBoards.push(
    board(
      "bogey-team",
      "Bogey team",
      "Przeciwnik, z którym dany menedżer ma najgorszy bilans H2H.",
      "Negatywna",
      ctxs.map((c) => {
        const byOpp: Record<string, { w: number; l: number }> = {};
        c.h2h.forEach((r) => {
          if (!byOpp[r.opponent]) byOpp[r.opponent] = { w: 0, l: 0 };
          if (r.outcome === "W") byOpp[r.opponent].w += 1;
          if (r.outcome === "L") byOpp[r.opponent].l += 1;
        });
        let worst = { opp: "", losses: 0, w: 0 };
        Object.entries(byOpp).forEach(([opp, s]) => {
          if (s.l > worst.losses) worst = { opp, losses: s.l, w: s.w };
        });
        return {
          playerId: c.player.id,
          sortValue: worst.losses,
          value: `${worst.losses}P`,
          details: worst.opp ? `${worst.w}W w H2H` : "—",
          opponentTeam: worst.opp || undefined,
        };
      }),
      players
    )
  );

  rivalryBoards.push(
    board(
      "favorite-rival",
      "Ulubiony rywal",
      "Przeciwnik, z którym najwięcej wygranych H2H.",
      "Pozytywna",
      ctxs.map((c) => {
        const byOpp: Record<string, { w: number; l: number }> = {};
        c.h2h.forEach((r) => {
          if (!byOpp[r.opponent]) byOpp[r.opponent] = { w: 0, l: 0 };
          if (r.outcome === "W") byOpp[r.opponent].w += 1;
          if (r.outcome === "L") byOpp[r.opponent].l += 1;
        });
        let best = { opp: "", wins: 0, l: 0 };
        Object.entries(byOpp).forEach(([opp, s]) => {
          if (s.w > best.wins) best = { opp, wins: s.w, l: s.l };
        });
        return {
          playerId: c.player.id,
          sortValue: best.wins,
          value: `${best.wins}W`,
          details: best.opp ? `${best.l}P w H2H` : "—",
          opponentTeam: best.opp || undefined,
        };
      }),
      players
    )
  );

  // —— 10. Finisz ——
  const finishFrom = Math.max(1, maxGw - 4);
  const finishBoards: (LeaderboardResult | null)[] = [
    board(
      "finish-points",
      "Najlepszy finisz (punkty)",
      "Najwięcej punktów FPL w ostatnich 5 kolejkach.",
      "Pozytywna",
      ctxs.map((c) => {
        const { pts, range } = sumLastN(c.gwPoints, 5);
        return {
          playerId: c.player.id,
          sortValue: pts,
          value: `${pts} pkt`,
          details: range,
        };
      }),
      players
    ),
    board(
      "finish-worst",
      "Najgorszy finisz (punkty)",
      "Najmniej punktów FPL w ostatnich 5 kolejkach.",
      "Negatywna",
      ctxs.map((c) => {
        const { pts, range } = sumLastN(c.gwPoints, 5);
        return {
          playerId: c.player.id,
          sortValue: -pts,
          value: `${pts} pkt`,
          details: range,
        };
      }),
      players
    ),
    board(
      "finish-h2h",
      "Najlepszy finisz H2H",
      `Najwięcej zwycięstw H2H w GW${finishFrom}–${maxGw}.`,
      "Pozytywna",
      ctxs.map((c) => {
        const h = h2hWinsInRange(c.h2h, finishFrom, maxGw);
        return {
          playerId: c.player.id,
          sortValue: h.w,
          value: `${h.w} wygranych`,
          details: `${h.w}W-${h.d}R-${h.l}P`,
        };
      }),
      players
    ),
    board(
      "finish-comeback",
      "Finiszowy comeback",
      "Awans w tabeli H2H między GW19 a końcem sezonu.",
      "Pozytywna",
      ctxs.map((c) => {
        const t19 = rankAtGw(matchesByGw, c.player.team, 19);
        const climb = (t19 ?? 20) - c.player.rank;
        return {
          playerId: c.player.id,
          sortValue: climb,
          value: climb > 0 ? `+${climb} miejsc` : `${climb} miejsc`,
          details: `GW19: #${t19 ?? "?"} → finał: #${c.player.rank}`,
        };
      }),
      players
    ),
  ];

  // —— 11. Nagrody sezonu (pochodne) ——
  const pickWinner = (boards: LeaderboardResult[], id: string) =>
    boards.find((b) => b.id === id)?.entries[0];

  const allH2h = h2hBoards.filter(Boolean) as LeaderboardResult[];
  const allPts = ptsBoards.filter(Boolean) as LeaderboardResult[];
  const allLuck = luckBoards.filter(Boolean) as LeaderboardResult[];
  const allTransfer = transferBoards.filter(Boolean) as LeaderboardResult[];

  const awards: LeaderboardResult[] = [];
  const addAward = (id: string, title: string, desc: string, entry: TopEntry | undefined) => {
    if (!entry?.playerId) return;
    awards.push({
      id,
      title,
      description: desc,
      badge: "Pozytywna",
      entries: [entry],
    });
  };

  addAward("award-streak", "Król serii", "Najdłuższa seria zwycięstw H2H.", pickWinner(allH2h, "win-streak"));
  addAward("award-regular", "Profesor regularności", "Najmniejsze wahania wyników.", pickWinner(allPts, "most-regular"));
  addAward("award-chaos", "Król chaosu", "Największa zmienność wyników.", pickWinner(allPts, "most-volatile"));
  addAward("award-unlucky", "Pechowiec sezonu", "Najwięcej „niesprawiedliwych” porażek.", pickWinner(allLuck, "unlucky-losses"));
  addAward("award-lucky", "Farciarz sezonu", "Najwięcej szczęśliwych wygranych.", pickWinner(allLuck, "lucky-wins"));
  addAward("award-transfer", "Cesarz transferów", "Najlepszy pojedynczy transfer.", pickWinner(allTransfer, "best-transfer"));
  addAward("award-hits", "Hazardzista", "Największy koszt hitów.", pickWinner(allTransfer, "hit-cost"));
  addAward("award-captain", "Król opaski", "Najwięcej punktów z kapitana.", pickWinner(capBoards.filter(Boolean) as LeaderboardResult[], "captain-total"));
  addAward("award-bench", "Ławkowy milioner", "Najwięcej punktów na ławce.", pickWinner(benchBoards.filter(Boolean) as LeaderboardResult[], "bench-total"));
  addAward("award-finish", "Mistrz finiszu", "Najlepsza końcówka punktowa.", pickWinner(finishBoards.filter(Boolean) as LeaderboardResult[], "finish-points"));
  addAward("award-comeback", "Król comebacku", "Największy awans od najgorszej pozycji.", pickWinner(formBoards.filter(Boolean) as LeaderboardResult[], "comeback"));

  // —— 12. Nietypowe ——
  const funBoards: (LeaderboardResult | null)[] = [
    board(
      "one-hit-wonder",
      "Mistrz jednego strzału",
      "Najwyższy stosunek najlepszego GW do średniej sezonowej.",
      "Ciekawostka",
      ctxs.map((c) => {
        const best = Math.max(...c.gwPoints.map((g) => g.points), 0);
        const avg = (c.highlights?.avgGwPoints as number) || 1;
        const ratio = best / avg;
        return {
          playerId: c.player.id,
          sortValue: ratio,
          value: `${ratio.toFixed(2)}×`,
          details: `max ${best} pkt, śr. ${avg.toFixed(1)}`,
        };
      }),
      players
    ),
    board(
      "chaos-week",
      "Tydzień totalnego chaosu",
      "Kolejki z największym rozrzutem wyników FPL w całej lidze (odchylenie standardowe).",
      "Ciekawostka",
      (() => {
        const teamsByGw: Record<number, Array<{ team: string; pts: number }>> = {};
        for (const block of matchesByGw) {
          const gw = Number(block.gw);
          teamsByGw[gw] = [];
          for (const m of block.matches || []) {
            teamsByGw[gw].push({ team: m.teamA, pts: Number(m.pointsA) });
            teamsByGw[gw].push({ team: m.teamB, pts: Number(m.pointsB) });
          }
        }

        return Object.entries(allGwPts)
          .map(([gwStr, pts]) => {
            const gw = Number(gwStr);
            const sd = stdDev(pts);
            const min = Math.min(...pts);
            const max = Math.max(...pts);
            const gwTeams = teamsByGw[gw] || [];
            const minTeam = gwTeams.find((t) => t.pts === min)?.team ?? "—";
            const maxTeam = gwTeams.find((t) => t.pts === max)?.team ?? "—";
            const avg = pts.reduce((s, p) => s + p, 0) / pts.length;
            return {
              gw,
              sd,
              min,
              max,
              spread: max - min,
              minTeam,
              maxTeam,
              avg,
            };
          })
          .sort((a, b) => b.sd - a.sd)
          .slice(0, 3)
          .map(({ gw, sd, min, max, spread, minTeam, maxTeam, avg }) => ({
            playerId: 0,
            sortValue: sd,
            value: `σ ${sd.toFixed(1)}`,
            manager: `GW${gw}`,
            team: `Rozstęp ${spread} pkt (${min}–${max})`,
            details: `Min: ${minTeam} · Max: ${maxTeam} · śr. ${avg.toFixed(0)} pkt`,
          }));
      })(),
      players
    ),
    board(
      "meme-transfer",
      "Najbardziej memiczny transfer",
      "Transfer z największą stratą rpDiff w sezonie.",
      "Ciekawostka",
      ctxs.flatMap((c) => {
        const list = (c.highlights?.worstTransfers as Array<{ rpDiff: number; gw: number; sold: string; bought: string }>) || [];
        const w = list.sort((a, b) => a.rpDiff - b.rpDiff)[0];
        if (!w) return [];
        return [
          {
            playerId: c.player.id,
            sortValue: Math.abs(w.rpDiff),
            value: `${w.rpDiff.toFixed(0)} pkt`,
            details: `${w.sold} → ${w.bought}, GW${w.gw}`,
          },
        ];
      }),
      players
    ),
    board(
      "overperform",
      "Geniusz vs oczekiwania",
      "Największe przekroczenie xP w sezonie.",
      "Pozytywna",
      ctxs.map((c) => {
        const over = (c.highlights?.expSummary as { overperform?: number })?.overperform ?? 0;
        return {
          playerId: c.player.id,
          sortValue: over,
          value: `+${over.toFixed(0)}`,
          details: "pkt ponad xP",
        };
      }),
      players
    ),
  ];

  return [
    section("dominacja", "Dominacja w tabeli", "👑", "Tron, piwnica, średnia pozycja i król weekendowych punktów w lidze.", dominanceBoards),
    section("fpl-global", "FPL vs świat", "🌍", "Porównanie z globalną elitą — dane z eksportów sezonu menedżerów.", fplGlobalBoards),
    section("h2h", "Rekordy H2H", "⚔️", "Serie, marginesy i ekstremalne wyniki meczów ligowych.", h2hBoards),
    section("points", "Punkty i regularność", "📈", "Wyniki kolejek, średnie i stabilność formy.", ptsBoards),
    section("form", "Forma sezonu", "🔥", "Start, finisz, comebacki i zjazdy w tabeli.", formBoards),
    section("luck", "Pech i szczęście", "🎲", "Wyniki FPL vs wynik meczu H2H.", luckBoards),
    section("transfers", "Transfery", "🔄", "Ruchy, hity i zyski z zawodników.", transferBoards),
    section("captain", "Kapitanowie", "©️", "Dostępne tylko dane sezonowe (bez wyborów per GW).", capBoards),
    section("bench", "Ławka i skład", "🪑", "Punkty zostawione na ławce.", benchBoards),
    section("chips", "Chipy i strategia", "🃏", "Bench Boost, TC, FH i Wildcard.", chipBoards),
    section("rivalry", "Rywalizacje", "🤝", "Pary drużyn i ulubieni przeciwnicy.", rivalryBoards),
    section("finish", "Finisz sezonu", "🏁", "Ostatnie 5 kolejek i końcówka tabeli.", finishBoards),
    section("awards", "Nagrody sezonu", "🏆", "Podsumowanie najważniejszych wyróżnień.", awards),
    section("fun", "Topki nietypowe", "🎭", "Zabawne i zaskakujące statystyki.", funBoards),
  ].filter((s) => s.leaderboards.length > 0);
}

function rankAtGw(matchesByGw: GwMatchesBlock[], team: string, gw: number): number | null {
  const { byGw } = buildStandingsHistory(matchesByGw);
  const row = byGw[gw]?.find((r) => r.team === team);
  return row?.rank ?? null;
}
