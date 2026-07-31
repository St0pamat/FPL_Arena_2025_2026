import { useState } from "react";
import type { Player } from "@arena/types/player";
import { playerDisplayName } from "@arena/lib/playerDisplay";
import type { GladiatorPresentation } from "@arena/data/presentations";
import { TeamCrest } from "@arena/components/branding";

const ACCENT_BY_RANK = (rank: number) => {
  if (rank <= 5) return { border: "border-t-amber-400", glow: "shadow-[0_0_24px_rgba(251,191,36,0.12)]", badge: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
  if (rank <= 10) return { border: "border-t-emerald-400", glow: "shadow-[0_0_24px_rgba(52,211,153,0.12)]", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
  if (rank <= 15) return { border: "border-t-sky-400", glow: "shadow-[0_0_24px_rgba(56,189,248,0.12)]", badge: "bg-sky-500/15 text-sky-300 border-sky-500/30" };
  return { border: "border-t-violet-400", glow: "shadow-[0_0_24px_rgba(167,139,250,0.12)]", badge: "bg-violet-500/15 text-violet-300 border-violet-500/30" };
};

export const PresentationCard = ({
  player,
  presentation,
}: {
  player: Player;
  presentation: GladiatorPresentation;
}) => {
  const [playing, setPlaying] = useState(false);
  const accent = ACCENT_BY_RANK(player.rank);
  const thumb = `https://img.youtube.com/vi/${presentation.youtubeId}/hqdefault.jpg`;

  return (
    <article
      className={`glass-panel rounded-2xl border border-slate-800 border-t-4 ${accent.border} ${accent.glow} flex flex-col overflow-hidden h-full`}
    >
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-start gap-3">
          <TeamCrest fplId={player.id} size="lg" className="shrink-0" />
          <div className="min-w-0 flex-1">
            <span
              className={`inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border mb-2 ${accent.badge}`}
            >
              #{player.rank} · H2H
            </span>
            <h3 className="text-fluid-base font-athletic font-bold text-white leading-snug break-words">
              {player.team}
            </h3>
            <p className="text-fluid-sm text-slate-400 mt-0.5 break-words">{playerDisplayName(player)}</p>
            <p className="text-fluid-xs text-slate-500 mt-1 break-words">{presentation.scriptTitle.replace(/^\d+\.\s*/, "")}</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-3">
        {!playing ? (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group relative w-full aspect-video rounded-xl overflow-hidden border border-slate-700 bg-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label={`Odtwórz prezentację: ${player.team}`}
          >
            <img
              src={thumb}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/25 transition-colors" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <span className="w-14 h-14 rounded-full bg-red-600/90 group-hover:bg-red-500 flex items-center justify-center shadow-lg">
                <span className="ml-1 text-white text-2xl leading-none" aria-hidden>
                  ▶
                </span>
              </span>
              <span className="text-fluid-xs font-semibold text-white uppercase tracking-wide">
                Odtwórz prezentację
              </span>
            </div>
          </button>
        ) : (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-700 bg-black">
            <iframe
              title={`Prezentacja: ${player.team}`}
              src={`https://www.youtube.com/embed/${presentation.youtubeId}?autoplay=1&rel=0`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <a
            href={presentation.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-fluid-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Otwórz na YouTube ↗
          </a>
          {playing && (
            <button
              type="button"
              onClick={() => setPlaying(false)}
              className="text-fluid-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors"
            >
              Ukryj odtwarzacz
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 px-4 sm:px-5 pb-4 sm:pb-5">
        <div className="kpi-label mb-2">Skrypt filmu</div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 sm:p-4 max-h-56 overflow-y-auto text-fluid-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
          {presentation.script}
        </div>
      </div>
    </article>
  );
};
