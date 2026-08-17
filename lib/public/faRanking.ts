import { resolveSeasonPhase } from "@/lib/public/season";
import type { PublicTeam } from "@/lib/public/types";

export type FAFormEntry = { gw: number; points: number };

export type FARankingRow = {
  /** Klucz gracza (fpl_id lub discord_nick) */
  playerKey: string;
  position: number;
  previousPosition: number | null;
  /** Dodatnie = awans w rankingu */
  trendDelta: number;
  totalPoints: number;
  previousTotalPoints: number;
  formHistory: FAFormEntry[];
  team: PublicTeam;
  /** Nazwa dywizji z aktualnego / najnowszego sezonu kampanii */
  divisionName: string | null;
};

export type FAFormWindow =
  | { id: "last6"; label: string }
  | { id: `range:${number}-${number}`; label: string; from: number; to: number };

export type FARankingPayload = {
  anchorSeasonId: string;
  campaignSeasonIds: string[];
  campaignLabel: string;
  finishedGameweeks: number[];
  formWindows: FAFormWindow[];
  rows: FARankingRow[];
  latestFinishedGw: number | null;
};

export type FARankingFixtureInput = {
  gameweek: number;
  home_team_id: string;
  away_team_id: string;
  home_fpl_points: number | null;
  away_fpl_points: number | null;
  is_finished: boolean;
  is_published: boolean;
  is_playoff?: boolean;
};

export type FARankingTeamInput = PublicTeam & {
  division_id: string;
  season_id: string;
  division_name?: string | null;
  season_created_at?: string | null;
};

/** Unikalny klucz gracza między sezonami jesień/wiosna. */
export function faPlayerKey(team: {
  fpl_id?: string | null;
  discord_nick?: string | null;
}): string | null {
  const fpl = String(team.fpl_id ?? "").trim();
  if (fpl) return `fpl:${fpl}`;
  const nick = String(team.discord_nick ?? "").trim().toLowerCase();
  if (nick) return `discord:${nick}`;
  return null;
}

/**
 * Dobiera sezony kampanii (Rok Rozgrywkowy): Jesień + Wiosna wokół kotwicy.
 */
export function resolveCampaignSeasonIds(
  seasons: { id: string; name: string; created_at?: string | null }[],
  anchorSeasonId: string,
): string[] {
  if (!anchorSeasonId) return [];
  const sorted = [...seasons].sort((a, b) =>
    String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")),
  );
  const idx = sorted.findIndex((s) => s.id === anchorSeasonId);
  if (idx < 0) return [anchorSeasonId];

  const anchor = sorted[idx];
  const phase = resolveSeasonPhase(anchor.name);

  if (phase === "AUTUMN") {
    const next = sorted[idx + 1];
    if (next && resolveSeasonPhase(next.name) === "SPRING") {
      return [anchor.id, next.id];
    }
    return [anchor.id];
  }

  const prev = sorted[idx - 1];
  if (prev && resolveSeasonPhase(prev.name) === "AUTUMN") {
    return [prev.id, anchor.id];
  }
  return [anchor.id];
}

export function buildFormWindows(finishedGameweeks: number[]): FAFormWindow[] {
  const gws = [...finishedGameweeks].sort((a, b) => a - b);
  const windows: FAFormWindow[] = [
    { id: "last6", label: "Ostatnie 6 GW" },
  ];
  if (!gws.length) return windows;

  const min = gws[0];
  const max = gws[gws.length - 1];
  for (let from = min; from <= max; from += 6) {
    const to = Math.min(from + 5, max);
    windows.push({
      id: `range:${from}-${to}`,
      label: `Kolejki ${from}–${to}`,
      from,
      to,
    });
  }
  return windows;
}

export function sliceFormHistory(
  formHistory: FAFormEntry[],
  window: FAFormWindow,
  finishedGameweeks: number[],
): FAFormEntry[] {
  const byGw = new Map(formHistory.map((e) => [e.gw, e]));
  if (window.id === "last6") {
    const last = [...finishedGameweeks].sort((a, b) => a - b).slice(-6);
    return last.map((gw) => byGw.get(gw) ?? { gw, points: 0 });
  }
  const from = window.from;
  const to = window.to;
  const gws = finishedGameweeks
    .filter((g) => g >= from && g <= to)
    .sort((a, b) => a - b);
  return gws.map((gw) => byGw.get(gw) ?? { gw, points: 0 });
}

export function formBadgeClass(points: number): string {
  if (points >= 65) {
    return "bg-emerald-950/60 text-emerald-400 border border-emerald-800/50";
  }
  if (points <= 35) {
    return "bg-rose-950/60 text-rose-400 border border-rose-800/50";
  }
  return "bg-slate-800/50 text-slate-300 border border-slate-700";
}

function rankByPoints(
  entries: { key: string; points: number }[],
): Map<string, number> {
  const sorted = [...entries].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.key.localeCompare(b.key);
  });
  const map = new Map<string, number>();
  sorted.forEach((e, i) => map.set(e.key, i + 1));
  return map;
}

export type FARankingScoreInput = {
  team_id: string;
  gameweek: number;
  fpl_points: number;
  season_id?: string;
};

/**
 * Buduje FA Ranking z opublikowanych punktów FPL.
 * Preferuje `scores` (team_gameweek_scores); fallback: fixtures (legacy).
 */
export function buildFARanking(
  teams: FARankingTeamInput[],
  fixtures: FARankingFixtureInput[],
  campaignSeasonIds: string[],
  campaignLabel: string,
  anchorSeasonId: string,
  scores: FARankingScoreInput[] = [],
): FARankingPayload {
  type Acc = {
    total: number;
    byGw: Map<number, number>;
    displayTeam: FARankingTeamInput;
  };

  const byPlayer = new Map<string, Acc>();

  const preferTeam = (a: FARankingTeamInput, b: FARankingTeamInput) => {
    const aCreated = String(a.season_created_at ?? "");
    const bCreated = String(b.season_created_at ?? "");
    if (aCreated !== bCreated) return bCreated.localeCompare(aCreated) > 0 ? b : a;
    if (a.season_id === anchorSeasonId && b.season_id !== anchorSeasonId) return a;
    if (b.season_id === anchorSeasonId && a.season_id !== anchorSeasonId) return b;
    return a;
  };

  for (const team of teams) {
    const key = faPlayerKey(team);
    if (!key) continue;
    const existing = byPlayer.get(key);
    if (!existing) {
      byPlayer.set(key, {
        total: 0,
        byGw: new Map(),
        displayTeam: team,
      });
    } else {
      existing.displayTeam = preferTeam(existing.displayTeam, team);
    }
  }

  const teamIdToKey = new Map<string, string>();
  for (const team of teams) {
    const key = faPlayerKey(team);
    if (key) teamIdToKey.set(team.id, key);
  }

  const addPoints = (teamId: string, gameweek: number, pts: number) => {
    const key = teamIdToKey.get(teamId);
    if (!key) return;
    let acc = byPlayer.get(key);
    if (!acc) {
      const displayTeam = teams.find((t) => t.id === teamId);
      if (!displayTeam) return;
      acc = { total: 0, byGw: new Map(), displayTeam };
      byPlayer.set(key, acc);
    }
    // Jedna wartość na GW (nie sumuj podwójnie przy fallbacku)
    if (!acc.byGw.has(gameweek)) {
      acc.total += pts;
      acc.byGw.set(gameweek, pts);
    }
  };

  if (scores.length > 0) {
    for (const s of scores) {
      addPoints(s.team_id, s.gameweek, Number(s.fpl_points ?? 0));
    }
  } else {
    const published = fixtures.filter(
      (f) => f.is_published !== false && f.is_finished,
    );
    for (const f of published) {
      addPoints(f.home_team_id, f.gameweek, Number(f.home_fpl_points ?? 0));
      addPoints(f.away_team_id, f.gameweek, Number(f.away_fpl_points ?? 0));
    }
  }

  const finishedGameweeks = [
    ...new Set(
      [...byPlayer.values()].flatMap((acc) => [...acc.byGw.keys()]),
    ),
  ].sort((a, b) => a - b);
  const latestFinishedGw =
    finishedGameweeks.length > 0
      ? finishedGameweeks[finishedGameweeks.length - 1]
      : null;

  const currentEntries: { key: string; points: number }[] = [];
  const previousEntries: { key: string; points: number }[] = [];

  for (const [key, acc] of byPlayer) {
    const lastGwPts =
      latestFinishedGw != null ? (acc.byGw.get(latestFinishedGw) ?? 0) : 0;
    const previousTotal = acc.total - lastGwPts;
    currentEntries.push({ key, points: acc.total });
    previousEntries.push({ key, points: previousTotal });
  }

  const currentRank = rankByPoints(currentEntries);
  const previousRank = rankByPoints(previousEntries);
  const hasPrevious =
    latestFinishedGw != null && finishedGameweeks.length > 1;

  const rows: FARankingRow[] = [];
  for (const [key, acc] of byPlayer) {
    if (!acc.displayTeam) continue;
    const total = acc.total;
    const lastGwPts =
      latestFinishedGw != null ? (acc.byGw.get(latestFinishedGw) ?? 0) : 0;
    const previousTotal = total - lastGwPts;
    const position = currentRank.get(key) ?? 0;
    const prevPos = hasPrevious ? (previousRank.get(key) ?? null) : null;
    const trendDelta =
      prevPos != null && position > 0 ? prevPos - position : 0;

    const formHistory: FAFormEntry[] = [...acc.byGw.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([gw, points]) => ({ gw, points }));

    const t = acc.displayTeam;
    rows.push({
      playerKey: key,
      position,
      previousPosition: prevPos,
      trendDelta,
      totalPoints: total,
      previousTotalPoints: previousTotal,
      formHistory,
      team: {
        id: t.id,
        manager_name: t.manager_name,
        discord_nick: t.discord_nick,
        fpl_id: t.fpl_id,
        fpl_team_name: t.fpl_team_name,
        chosen_club: t.chosen_club,
        previous_season_or: t.previous_season_or ?? null,
      },
      divisionName: t.division_name ?? null,
    });
  }

  rows.sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return a.playerKey.localeCompare(b.playerKey);
  });

  return {
    anchorSeasonId,
    campaignSeasonIds,
    campaignLabel,
    finishedGameweeks,
    formWindows: buildFormWindows(finishedGameweeks),
    rows,
    latestFinishedGw,
  };
}

/** Paczki po N graczy do eksportu karuzeli. */
export function chunkFARankingRows<T>(rows: T[], size = 10): T[][] {
  if (size < 1) return [rows];
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    chunks.push(rows.slice(i, i + size));
  }
  return chunks.length ? chunks : [[]];
}
