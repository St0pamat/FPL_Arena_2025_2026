import type { ReactNode } from "react";
import { PLAYER_BY_ID } from "@/config/playersIndex";
import { TeamBrand, TeamCrest } from "@/components/branding";

export const HallFameCard = ({
  emoji,
  border,
  title,
  playerIds,
  body,
  children = null,
}: {
  emoji: string;
  border: string;
  title: string;
  playerIds?: number[];
  body: ReactNode;
  children?: ReactNode;
}) => (
  <article className={`glass-panel panel-pad rounded-2xl border-t-4 ${border} flex flex-col gap-4 h-full`}>
    <div className="flex items-center justify-between gap-4">
      <span className="text-5xl leading-none" aria-hidden>
        {emoji}
      </span>
      {playerIds?.length === 1 && <TeamCrest fplId={playerIds[0]} size="xl" />}
      {playerIds && playerIds.length > 1 && (
        <div className="flex -space-x-2">
          {playerIds.map((id, i) => (
            <TeamCrest key={id} fplId={id} size="lg" className={i > 0 ? "relative" : "relative z-10"} />
          ))}
        </div>
      )}
    </div>
    <h3 className="text-fluid-xs text-slate-400 uppercase tracking-widest font-bold">{title}</h3>
    {playerIds?.length === 1 && (
      <TeamBrand
        player={PLAYER_BY_ID[playerIds[0]]}
        crestSize="lg"
        layout="col"
        nameClassName="text-fluid-xl font-athletic text-white"
        subClassName="text-fluid-sm text-slate-400"
      />
    )}
    {playerIds && playerIds.length > 1 && (
      <div className="space-y-3">
        {playerIds.map((id) => (
          <TeamBrand
            key={id}
            player={PLAYER_BY_ID[id]}
            crestSize="md"
            layout="col"
            nameClassName="text-fluid-lg font-athletic text-white"
          />
        ))}
      </div>
    )}
    <p className="text-fluid-base text-slate-300 leading-relaxed flex-1">{body}</p>
    {children}
  </article>
);
