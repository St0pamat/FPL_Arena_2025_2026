"use client";

import Link from "next/link";
import {
  Crown,
  Flame,
  Skull,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import {
  OpponentContext,
  PlayerCompactIdentity,
} from "@/components/na-minusie/hub/PlayerCompactIdentity";
import type {
  SeasonStatCard,
  SeasonStatKind,
  SeasonStatsPayload,
} from "@/lib/public/seasonStats";

const CARD_META: Record<
  SeasonStatKind,
  {
    icon: typeof Crown;
    accent: string;
    border: string;
    gradient: string;
    span: string;
  }
> = {
  top_scorer_gw: {
    icon: Crown,
    accent: "text-emerald-400",
    border: "border-emerald-500/30 hover:border-emerald-400/50",
    gradient: "from-emerald-500/15 via-emerald-950/30 to-slate-900/70",
    span: "md:col-span-2",
  },
  median_king: {
    icon: Flame,
    accent: "text-amber-400",
    border: "border-amber-500/30 hover:border-amber-400/45",
    gradient: "from-amber-500/12 via-slate-900/50 to-slate-900/70",
    span: "md:col-span-1",
  },
  win_streak: {
    icon: Zap,
    accent: "text-sky-400",
    border: "border-sky-500/30 hover:border-sky-400/45",
    gradient: "from-sky-500/12 via-slate-900/50 to-slate-900/70",
    span: "md:col-span-1",
  },
  unlucky_loser: {
    icon: TrendingDown,
    accent: "text-rose-400",
    border: "border-rose-500/30 hover:border-rose-400/45",
    gradient: "from-rose-600/15 via-red-950/25 to-slate-900/70",
    span: "md:col-span-2",
  },
  lucky_winner: {
    icon: Sparkles,
    accent: "text-violet-400",
    border: "border-violet-500/30 hover:border-violet-400/45",
    gradient: "from-violet-500/12 via-slate-900/50 to-slate-900/70",
    span: "md:col-span-1",
  },
  red_lantern: {
    icon: Skull,
    accent: "text-red-400",
    border: "border-red-500/30 hover:border-red-400/45",
    gradient: "from-red-600/15 via-slate-900/50 to-slate-900/70",
    span: "md:col-span-1",
  },
};

function StatBentoCard({
  card,
  logos,
}: {
  card: SeasonStatCard;
  logos: ClubLogoRecord[];
}) {
  const meta = CARD_META[card.kind];
  const Icon = meta.icon;
  const isHero = card.kind === "top_scorer_gw" || card.kind === "unlucky_loser";

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-xl border bg-slate-800/50 p-4 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800/70 sm:p-5 ${meta.border} ${meta.span}`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90 ${meta.gradient}`}
        aria-hidden
      />

      <div className="relative z-10 flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${meta.accent}`}>
              {card.label}
            </p>
            <p
              className={`mt-2 font-extrabold tracking-tight text-white ${isHero ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"}`}
            >
              {card.value}
              {card.valueUnit ? (
                <span className="ml-2 text-sm font-semibold text-slate-500">{card.valueUnit}</span>
              ) : null}
            </p>
          </div>
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/25 ${meta.accent}`}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        </div>

        <PlayerCompactIdentity
          team={card.team}
          logos={logos}
          size={isHero ? "lg" : "md"}
        />

        <div className="mt-auto space-y-2 border-t border-white/5 pt-3">
          {card.match?.opponent ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {card.kind === "unlucky_loser"
                  ? "Przegrana z"
                  : card.kind === "lucky_winner"
                    ? "Wygrana z"
                    : "Rywal"}
              </span>
              <OpponentContext
                opponent={card.match.opponent}
                oppFpl={card.match.oppFpl}
                logos={logos}
              />
              <span className="rounded-md bg-slate-900/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-400">
                GW{card.match.gameweek}
              </span>
            </div>
          ) : card.match ? (
            <span className="inline-flex rounded-md bg-slate-900/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-400">
              GW{card.match.gameweek}
            </span>
          ) : null}

          {card.footnote ? (
            <p className="text-[11px] leading-relaxed text-slate-400">{card.footnote}</p>
          ) : null}

          <Link
            href={`/strefa-gracza/gracz/${card.team.id}`}
            className="inline-flex text-[11px] font-semibold text-emerald-400/80 transition-colors hover:text-emerald-300"
          >
            Zobacz profil gracza →
          </Link>
        </div>
      </div>
    </article>
  );
}

function StatSection({
  id,
  title,
  cards,
  logos,
}: {
  id: string;
  title: string;
  cards: SeasonStatCard[];
  logos: ClubLogoRecord[];
}) {
  if (cards.length === 0) return null;

  return (
    <section aria-labelledby={id} className="space-y-4">
      <h3
        id={id}
        className="font-athletic text-lg uppercase tracking-wide text-white sm:text-xl"
      >
        {title}
      </h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <StatBentoCard key={card.kind} card={card} logos={logos} />
        ))}
      </div>
    </section>
  );
}

export function SeasonStatsGrid({
  stats,
  logos,
}: {
  stats: SeasonStatsPayload;
  logos: ClubLogoRecord[];
}) {
  if (!stats.hasPlayedFixtures) {
    return (
      <div className="rounded-xl border border-slate-700/80 bg-slate-800/40 px-6 py-12 text-center backdrop-blur">
        <TrendingUp className="mx-auto mb-3 h-8 w-8 text-slate-600" aria-hidden />
        <p className="text-lg font-bold text-slate-300">Sezon się rozgrzewa</p>
        <p className="mt-2 text-sm text-slate-500">
          Centrum Statystyk wypełni się danymi po rozegraniu pierwszych meczów H2H.
        </p>
      </div>
    );
  }

  const total = stats.performance.length + stats.anomalies.length;
  if (total === 0) {
    return (
      <div className="rounded-xl border border-slate-700/80 bg-slate-800/40 px-6 py-12 text-center backdrop-blur">
        <p className="text-sm text-slate-400">Brak danych statystycznych dla bieżącego sezonu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <StatSection
        id="stats-performance"
        title="🔥 Najwyższe Osiągnięcia"
        cards={stats.performance}
        logos={logos}
      />
      <StatSection
        id="stats-anomalies"
        title="📉 Anomalie i Skrajności"
        cards={stats.anomalies}
        logos={logos}
      />
    </div>
  );
}
