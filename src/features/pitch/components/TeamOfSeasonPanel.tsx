import { useMemo, useState } from "react";
import type { DreamTeamPlayer, SquadPlayer } from "@/types/highlights";
import type { FplElementMap } from "@/types/fpl";
import { POSITION_COLORS, POSITION_SECTIONS } from "@/features/fpl/constants";
import { inferFormation, mapDreamTeamPlayer } from "@/services/fpl/api";

type PointBreakdown = {
  points: number;
  pointsBase?: number;
  captainBonus?: number;
  tcBonus?: number;
  captaincies?: number;
};

type MappedPlayer = ReturnType<typeof mapDreamTeamPlayer> & PointBreakdown;

const POSITION_ORDER = [1, 2, 3, 4] as const;

function groupByPosition(players: MappedPlayer[]) {
  const groups: Record<number, MappedPlayer[]> = { 1: [], 2: [], 3: [], 4: [] };
  players.forEach((p) => {
    if (groups[p.position]) groups[p.position].push(p);
  });
  POSITION_ORDER.forEach((k) => {
    groups[k].sort((a, b) => (b.points || 0) - (a.points || 0));
  });
  return groups;
}

function lineLabel(pos: number) {
  return POSITION_SECTIONS[pos as keyof typeof POSITION_SECTIONS]?.title ?? "Linia";
}

function hasCaptainBreakdown(p: PointBreakdown) {
  return (p.captainBonus ?? 0) > 0 || (p.tcBonus ?? 0) > 0;
}

function PointsBreakdownLine({ player }: { player: PointBreakdown }) {
  const base = player.pointsBase ?? player.points;
  const cap = player.captainBonus ?? 0;
  const tc = player.tcBonus ?? 0;

  if (!hasCaptainBreakdown(player)) {
    return null;
  }

  return (
    <div className="text-fluid-xs font-mono text-slate-500 tabular-nums leading-snug">
      <span>{base} baz.</span>
      {cap > 0 && (
        <span>
          {" "}
          + <span className="text-amber-400/90">{cap} ©</span>
        </span>
      )}
      {tc > 0 && (
        <span>
          {" "}
          + <span className="text-violet-400/90">{tc} TC</span>
        </span>
      )}
    </div>
  );
}

const PlayerRow = ({
  player,
  compact = false,
}: {
  player: MappedPlayer;
  compact?: boolean;
}) => {
  const style = POSITION_COLORS[player.position as keyof typeof POSITION_COLORS] || POSITION_COLORS[3];
  const section = POSITION_SECTIONS[player.position as keyof typeof POSITION_SECTIONS];
  const points = player.points ?? 0;
  const pointsClass =
    points > 0 ? "text-emerald-400" : points < 0 ? "text-red-400" : "text-slate-500";

  return (
    <div
      className={`flex items-start gap-3 px-3 sm:px-4 ${compact ? "min-h-11 py-2" : "h-auto min-h-12 py-2.5"}`}
    >
      <span
        className={`shrink-0 w-9 pt-0.5 text-center text-fluid-xs font-mono font-bold uppercase ${style.text}`}
        aria-label={section?.title}
      >
        {section?.short ?? "?"}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-fluid-sm sm:text-fluid-base font-medium text-slate-100 break-words leading-snug">
          {player.displayName}
          {(player.captaincies ?? 0) > 0 && (
            <span className="ml-1.5 text-fluid-xs font-mono text-amber-400/80 whitespace-nowrap">
              ©×{player.captaincies}
            </span>
          )}
        </div>
        <PointsBreakdownLine player={player} />
      </div>
      <span className={`shrink-0 self-start font-mono font-bold text-fluid-base sm:text-fluid-lg tabular-nums ${pointsClass}`}>
        {points}
        <span className="text-fluid-xs text-slate-500 font-normal ml-1">pkt</span>
      </span>
    </div>
  );
};

export const TeamOfSeasonPanel = ({
  dreamTeam,
  squadPlayers = [],
  fplPlayersById = {},
}: {
  dreamTeam: DreamTeamPlayer[];
  squadPlayers?: SquadPlayer[];
  fplPlayersById?: FplElementMap;
}) => {
  const [showAllSquad, setShowAllSquad] = useState(false);

  const lineup = useMemo(() => {
    const raw = (dreamTeam || []).filter((p) => p.position >= 1 && p.position <= 4);
    return raw.map((p) => mapDreamTeamPlayer(p, fplPlayersById)) as MappedPlayer[];
  }, [dreamTeam, fplPlayersById]);

  const formation = useMemo(() => inferFormation(lineup), [lineup]);
  const groups = useMemo(() => groupByPosition(lineup), [lineup]);

  const top11Ids = useMemo(
    () => new Set(lineup.map((p) => p.elementId).filter(Boolean) as number[]),
    [lineup]
  );

  const otherSquadPlayers = useMemo(() => {
    if (!squadPlayers.length) return [];
    return squadPlayers
      .filter((p) => !p.elementId || !top11Ids.has(p.elementId))
      .map((p) => mapDreamTeamPlayer(p, fplPlayersById) as MappedPlayer)
      .sort((a, b) => (b.points || 0) - (a.points || 0));
  }, [squadPlayers, top11Ids, fplPlayersById]);

  const stats = useMemo(() => {
    if (!lineup.length) return null;
    const sorted = [...lineup].sort((a, b) => (b.points || 0) - (a.points || 0));
    const top = sorted[0];
    const total = lineup.reduce((s, p) => s + (p.points || 0), 0);
    const totalBase = lineup.reduce((s, p) => s + (p.pointsBase ?? p.points ?? 0), 0);
    const totalCap = lineup.reduce((s, p) => s + (p.captainBonus ?? 0), 0);
    const totalTc = lineup.reduce((s, p) => s + (p.tcBonus ?? 0), 0);
    const linePts = POSITION_ORDER.map((pos) => ({
      pos,
      pts: groups[pos].reduce((s, p) => s + (p.points || 0), 0),
      label: lineLabel(pos),
    }));
    const strongest = [...linePts].sort((a, b) => b.pts - a.pts)[0];
    return { top, total, totalBase, totalCap, totalTc, linePts, strongest };
  }, [lineup, groups]);

  if (!lineup.length || !stats) return null;

  const hasBreakdown = stats.totalCap > 0 || stats.totalTc > 0;

  return (
    <section className="glass-panel rounded-2xl border border-slate-800 panel-pad w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="min-w-0">
          <h5 className="text-fluid-xl font-athletic font-bold text-white uppercase tracking-wide">
            <span aria-hidden className="mr-2">🌟</span>
            Twoja jedenastka sezonu
          </h5>
          <p className="text-fluid-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Największy wkład punktowy w składzie startowym — najczęściej wybierana jedenastka sezonu.
            {hasBreakdown && (
              <>
                {" "}
                Suma łączna obejmuje bonus kapitana (©) i Potrójnego Kapitana (TC); przy każdym zawodniku
                widać rozbicie na punkty bazowe i bonusy.
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <span className="badge-pill bg-slate-900 text-slate-200 border-slate-700">
            {formation}
          </span>
          <span className="badge-pill bg-slate-900 text-slate-400 border-slate-700">
            {lineup.length} zawodników
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            label: "Największy wkład",
            primary: stats.top.displayName,
            secondary: `${stats.top.points} pkt`,
            breakdown: hasCaptainBreakdown(stats.top) ? stats.top : null,
          },
          {
            label: "Suma jedenastki",
            primary: String(stats.total),
            secondary: "pkt łącznie",
            breakdown: hasBreakdown
              ? { pointsBase: stats.totalBase, captainBonus: stats.totalCap, tcBonus: stats.totalTc, points: stats.total }
              : null,
          },
          {
            label: "Najsilniejsza linia",
            primary: stats.strongest.label,
            secondary: `${stats.strongest.pts} pkt`,
            breakdown: null,
          },
        ].map(({ label, primary, secondary, breakdown }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-4 min-h-[6.5rem]"
          >
            <div className="kpi-label mb-3">{label}</div>
            <div className="text-fluid-lg font-bold text-white leading-tight break-words">
              {primary}
            </div>
            <div className="text-fluid-base font-mono font-semibold text-emerald-400 mt-2">
              {secondary}
            </div>
            {breakdown && (
              <div className="mt-2">
                <PointsBreakdownLine player={breakdown} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div>
        <div className="kpi-label mb-2">Rozkład punktów wg linii</div>
        <div className="flex h-2 rounded-full overflow-hidden bg-slate-950 border border-slate-800">
          {stats.linePts.map(({ pos, pts }) => {
            const pct = stats.total ? (pts / stats.total) * 100 : 0;
            if (pct <= 0) return null;
            const style = POSITION_COLORS[pos as keyof typeof POSITION_COLORS];
            return (
              <div
                key={pos}
                className={`h-full bg-gradient-to-r ${style.bar}`}
                style={{ width: `${pct}%` }}
                title={`${lineLabel(pos)}: ${pts} pkt`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2">
          {stats.linePts.map(({ pos, pts }) => {
            const style = POSITION_COLORS[pos as keyof typeof POSITION_COLORS];
            return (
              <span key={pos} className={`text-fluid-xs font-mono ${style.text}`}>
                {lineLabel(pos)} {pts}
              </span>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4 gap-5">
        {POSITION_ORDER.map((pos) => {
          const players = groups[pos];
          if (!players.length) return null;
          const section = POSITION_SECTIONS[pos];
          const style = POSITION_COLORS[pos];

          return (
            <div key={pos} className="flex flex-col min-w-0">
              <h6
                className={`text-fluid-xs font-bold uppercase tracking-widest mb-2 px-1 ${style.text}`}
              >
                {section.title}
              </h6>
              <div className={`rounded-xl border ${style.border} bg-slate-950/40 divide-y divide-slate-800/70 overflow-hidden`}>
                {players.map((player) => (
                  <PlayerRow key={player.elementId || player.displayName} player={player} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {otherSquadPlayers.length > 0 && (
        <div className="pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setShowAllSquad((v) => !v)}
            className="w-full flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-left hover:bg-slate-900/60 transition-colors"
            aria-expanded={showAllSquad}
          >
            <span className="text-fluid-sm font-medium text-slate-200">
              {showAllSquad ? "Ukryj pozostałych zawodników" : "Pokaż wszystkich z składów sezonu"}
            </span>
            <span className="text-fluid-xs font-mono text-slate-500 shrink-0">
              {otherSquadPlayers.length} zawodników · sort. wg pkt
            </span>
          </button>

          {showAllSquad && (
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/40 divide-y divide-slate-800/70 overflow-hidden max-h-[28rem] overflow-y-auto">
              {otherSquadPlayers.map((player) => (
                <PlayerRow
                  key={player.elementId || player.displayName}
                  player={player}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
