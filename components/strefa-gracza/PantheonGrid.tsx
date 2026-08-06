"use client";

import {
  Crown,
  Diamond,
  Flame,
  Skull,
  Sparkles,
  TrendingDown,
  Zap,
} from "lucide-react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import {
  GwBadge,
  OpponentContext,
  StatPlayerIdentity,
} from "@/components/strefa-gracza/StatPlayerIdentity";
import type { SeasonStatCard, SeasonStatKind } from "@/lib/public/seasonStats";

const CARD_META: Record<
  SeasonStatKind,
  {
    icon: typeof Crown;
    accent: string;
    border: string;
  }
> = {
  top_scorer_gw: {
    icon: Flame,
    accent: "text-emerald-400",
    border: "border-emerald-500/25",
  },
  red_lantern: {
    icon: Skull,
    accent: "text-red-400",
    border: "border-red-500/25",
  },
  unlucky_loser: {
    icon: TrendingDown,
    accent: "text-rose-400",
    border: "border-rose-500/25",
  },
  lucky_winner: {
    icon: Sparkles,
    accent: "text-violet-400",
    border: "border-violet-500/25",
  },
  median_king: {
    icon: Diamond,
    accent: "text-amber-400",
    border: "border-amber-500/25",
  },
  win_streak: {
    icon: Zap,
    accent: "text-sky-400",
    border: "border-sky-500/25",
  },
  gw_top: {
    icon: Crown,
    accent: "text-emerald-400",
    border: "border-emerald-500/25",
  },
  gw_low: {
    icon: Skull,
    accent: "text-red-400",
    border: "border-red-500/25",
  },
};

function PantheonCard({
  card,
  logos,
}: {
  card: SeasonStatCard;
  logos: ClubLogoRecord[];
}) {
  const meta = CARD_META[card.kind];
  const Icon = meta.icon;

  return (
    <article
      className={`relative flex flex-col rounded-lg border bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4 ${meta.border}`}
    >
      <div className="flex flex-col gap-2 sm:gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${meta.accent}`}>
              {card.label}
            </p>
            <p className="mt-1 font-mono text-2xl font-black tracking-tight text-white sm:text-3xl">
              {card.value}
              {card.valueUnit ? (
                <span className="ml-1.5 text-xs font-semibold text-slate-500">{card.valueUnit}</span>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {card.match ? <GwBadge gameweek={card.match.gameweek} /> : null}
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-black/25 ${meta.accent}`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
          </div>
        </div>

        <StatPlayerIdentity team={card.team} logos={logos} showFplTeam size="sm" />

        {(card.match?.opponent || card.footnote) ? (
          <div className="space-y-1.5 border-t border-slate-800 pt-2">
            {card.match?.opponent ? (
              <OpponentContext
                opponent={card.match.opponent}
                oppFpl={card.match.oppFpl}
                logos={logos}
              />
            ) : null}
            {card.footnote ? (
              <p className="text-[11px] leading-relaxed text-slate-400">{card.footnote}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function PantheonGrid({
  cards,
  logos,
}: {
  cards: SeasonStatCard[];
  logos: ClubLogoRecord[];
}) {
  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
      {cards.map((card) => (
        <PantheonCard key={card.kind} card={card} logos={logos} />
      ))}
    </div>
  );
}

export function MiniStatCard({
  card,
  logos,
}: {
  card: SeasonStatCard;
  logos: ClubLogoRecord[];
}) {
  return <PantheonCard card={card} logos={logos} />;
}
