import type { Player } from "@/types/player";
import type { ReactNode } from "react";
import { PLAYER_BY_ID, TEAM_BY_NAME } from "@/config/playersIndex";
import { TeamCrest } from "@/components/branding";
import { playerDisplayName, shouldShowPlayerName } from "@/lib/playerDisplay";
import { resolveTeamFplId } from "../lib/teamResolve";
import type { TopEntry } from "../types";

const VsLabel = () => (
  <span className="text-slate-500 font-bold text-xs uppercase tracking-wide shrink-0 px-1">vs</span>
);

const MatchupCrests = ({ teams }: { teams: [string, string] }) => {
  const [a, b] = teams;
  const idA = resolveTeamFplId(a);
  const idB = resolveTeamFplId(b);
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {idA ? <TeamCrest fplId={idA} size="md" /> : <TeamCrest fplId={null} size="md" />}
      <VsLabel />
      {idB ? <TeamCrest fplId={idB} size="md" /> : <TeamCrest fplId={null} size="md" />}
    </div>
  );
};

const NameBlock = ({
  primary,
  secondary,
}: {
  primary: string;
  secondary?: ReactNode;
}) => (
  <div className="min-w-0">
    <div className="font-semibold text-white text-base leading-snug break-words">{primary}</div>
    {secondary && (
      <div className="text-sm text-slate-400 leading-snug break-words mt-0.5">{secondary}</div>
    )}
  </div>
);

const playerLine = (player: Player) =>
  shouldShowPlayerName(player) ? playerDisplayName(player) : undefined;

export const LeaderboardEntryCell = ({ entry }: { entry: TopEntry }) => {
  const player = entry.playerId ? PLAYER_BY_ID[entry.playerId] : null;
  const oppId = entry.opponentTeam ? resolveTeamFplId(entry.opponentTeam) : null;
  const opponentPlayer = entry.opponentTeam ? TEAM_BY_NAME[entry.opponentTeam] : null;

  if (entry.matchupTeams) {
    const [a, b] = entry.matchupTeams;
    return (
      <div className="flex flex-col gap-2.5 min-w-0">
        <MatchupCrests teams={entry.matchupTeams} />
        <NameBlock primary={a} secondary={`vs ${b}`} />
      </div>
    );
  }

  if (player && oppId) {
    const line = playerLine(player);
    return (
      <div className="flex flex-col gap-2.5 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <TeamCrest fplId={player.id} size="md" />
          <VsLabel />
          <TeamCrest fplId={oppId} size="md" />
        </div>
        <NameBlock
          primary={player.team}
          secondary={
            line ? (
              <>
                {line}
                <span className="text-slate-500"> · </span>
                <span className="text-slate-300">vs {entry.opponentTeam}</span>
              </>
            ) : (
              <span className="text-slate-300">vs {entry.opponentTeam}</span>
            )
          }
        />
      </div>
    );
  }

  if (player) {
    return (
      <div className="flex flex-col gap-2.5 min-w-0 sm:flex-row sm:items-start sm:gap-3">
        <TeamCrest fplId={player.id} size="md" className="shrink-0" />
        <NameBlock primary={player.team} secondary={playerLine(player)} />
      </div>
    );
  }

  if (entry.opponentTeam && oppId) {
    const line = opponentPlayer ? playerLine(opponentPlayer) : undefined;
    return (
      <div className="flex flex-col gap-2.5 min-w-0 sm:flex-row sm:items-start sm:gap-3">
        <TeamCrest fplId={oppId} size="md" className="shrink-0" />
        <NameBlock primary={entry.opponentTeam} secondary={line} />
      </div>
    );
  }

  if (!player && !entry.matchupTeams && /^GW\d+$/.test(entry.manager || "") && entry.team) {
    return (
      <NameBlock
        primary={`Kolejka ${entry.manager!.slice(2)}`}
        secondary={entry.team}
      />
    );
  }

  const resolved = entry.team ? TEAM_BY_NAME[entry.team] : undefined;
  const line = resolved ? playerLine(resolved) : entry.manager;

  return (
    <NameBlock
      primary={entry.team || entry.manager || "—"}
      secondary={line && line !== entry.team ? line : undefined}
    />
  );
};
