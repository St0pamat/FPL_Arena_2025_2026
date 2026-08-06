"use client";

import Link from "next/link";
import { Crown, Flame, Skull, TrendingDown } from "lucide-react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { ClubCrest } from "@/components/na-minusie/hub/ClubCrest";
import type { HighlightCard, HighlightKind } from "@/lib/public/playerZoneTypes";

const CARD_STYLES: Record<
  HighlightKind,
  {
    icon: typeof Crown;
    span: string;
    gradient: string;
    accent: string;
    glow: string;
    border: string;
  }
> = {
  top_scorer: {
    icon: Crown,
    span: "md:col-span-2 md:row-span-2",
    gradient: "from-emerald-500/20 via-emerald-950/40 to-slate-900/60",
    accent: "text-emerald-400",
    glow: "shadow-[0_0_60px_-15px_rgba(16,185,129,0.45)]",
    border: "border-emerald-500/30 hover:border-emerald-400/50",
  },
  median_king: {
    icon: Flame,
    span: "md:col-span-1",
    gradient: "from-emerald-600/15 via-slate-900/50 to-slate-900/70",
    accent: "text-emerald-300",
    glow: "shadow-[0_0_40px_-18px_rgba(52,211,153,0.35)]",
    border: "border-emerald-500/25 hover:border-emerald-400/40",
  },
  red_lantern: {
    icon: Skull,
    span: "md:col-span-1",
    gradient: "from-rose-600/20 via-slate-900/50 to-slate-900/70",
    accent: "text-rose-400",
    glow: "shadow-[0_0_40px_-18px_rgba(244,63,94,0.35)]",
    border: "border-rose-500/30 hover:border-rose-400/45",
  },
  unlucky: {
    icon: TrendingDown,
    span: "md:col-span-2",
    gradient: "from-rose-700/15 via-red-950/30 to-slate-900/60",
    accent: "text-rose-300",
    glow: "shadow-[0_0_50px_-15px_rgba(225,29,72,0.35)]",
    border: "border-rose-500/25 hover:border-rose-400/40",
  },
};

function HighlightBentoCard({
  card,
  logos,
}: {
  card: HighlightCard;
  logos: ClubLogoRecord[];
}) {
  const style = CARD_STYLES[card.kind];
  const Icon = style.icon;
  const isHero = card.kind === "top_scorer";

  return (
    <Link
      href={`/strefa-gracza/gracz/${card.team.id}`}
      className={`group relative flex flex-col overflow-hidden rounded-xl border bg-slate-800/50 p-5 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800/70 ${style.span} ${style.border} ${style.glow}`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80 ${style.gradient}`}
        aria-hidden
      />
      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${style.accent}`}>
              {card.title}
            </p>
            <p
              className={`mt-2 font-extrabold tracking-tight text-white ${isHero ? "text-5xl sm:text-6xl" : "text-3xl sm:text-4xl"}`}
            >
              {card.value}
              <span className="ml-1 text-lg font-semibold text-slate-500">pkt</span>
            </p>
          </div>
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20 ${style.accent}`}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        </div>

        <div className="mt-auto flex items-center gap-3">
          <span
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 transition-transform duration-300 group-hover:scale-105 ${isHero ? "h-16 w-16 sm:h-20 sm:w-20" : "h-12 w-12"}`}
          >
            <ClubCrest clubName={card.team.chosen_club} logos={logos} size={isHero ? "lg" : "md"} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white sm:text-base">{card.subtitle}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{card.meta}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function BentoHighlights({
  highlights,
  logos,
  hasPlayedFixtures,
}: {
  highlights: HighlightCard[];
  logos: ClubLogoRecord[];
  hasPlayedFixtures: boolean;
}) {
  if (!hasPlayedFixtures) {
    return (
      <div className="rounded-xl border border-slate-700/80 bg-slate-800/40 px-6 py-12 text-center backdrop-blur">
        <p className="text-lg font-bold text-slate-300">Sezon jeszcze się rozgrzewa</p>
        <p className="mt-2 text-sm text-slate-500">
          Hall of Fame &amp; Shame pojawi się po rozegraniu pierwszych meczów H2H.
        </p>
      </div>
    );
  }

  if (highlights.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700/80 bg-slate-800/40 px-6 py-12 text-center backdrop-blur">
        <p className="text-sm text-slate-400">Brak danych statystycznych dla bieżącego sezonu.</p>
      </div>
    );
  }

  return (
    <section aria-labelledby="bento-highlights-heading">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2
            id="bento-highlights-heading"
            className="font-athletic text-2xl font-bold uppercase tracking-wide text-white sm:text-3xl"
          >
            Hall of Fame &amp; Shame
          </h2>
          <p className="mt-1 text-sm text-slate-400">Ekstremalne liczby z bieżącego sezonu ligowego</p>
        </div>
      </div>

      <div className="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-4 md:grid-rows-2">
        {highlights.map((card) => (
          <HighlightBentoCard key={card.kind} card={card} logos={logos} />
        ))}
      </div>
    </section>
  );
}
