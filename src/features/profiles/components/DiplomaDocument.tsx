import { LEAGUE_LOGO_SRC, teamLogoSrc } from "@/config/branding";
import type { Player } from "@/types/player";
import { playerDisplayName } from "@/lib/playerDisplay";
import type { DiplomaContent } from "@/features/profiles/lib/diplomaContent";

export const DiplomaDocument = ({
  player,
  content,
}: {
  player: Player;
  content: DiplomaContent;
}) => (
  <div
    className="diploma-sheet relative box-border overflow-hidden bg-[#0a0e17] text-slate-100"
    style={{ width: "210mm", height: "297mm", fontFamily: "system-ui, Segoe UI, sans-serif" }}
  >
    {/* Tło dekoracyjne */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(16,185,129,0.18), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(59,130,246,0.12), transparent 50%), radial-gradient(ellipse 50% 35% at 0% 80%, rgba(251,191,36,0.08), transparent 45%)",
      }}
    />
    <div className="absolute inset-[6mm] rounded-[3mm] border-2 border-amber-400/40 pointer-events-none" />
    <div className="absolute inset-[8mm] rounded-[2mm] border border-emerald-500/25 pointer-events-none" />

    <div className="relative z-10 flex flex-col h-full px-[12mm] py-[10mm]">
      {/* Nagłówek */}
      <div className="flex items-start justify-between gap-[6mm] mb-[5mm]">
        <img
          src={LEAGUE_LOGO_SRC}
          alt="FPL Arena"
          className="h-[14mm] w-auto object-contain"
          crossOrigin="anonymous"
        />
        <div className="text-right">
          <p className="text-[9pt] uppercase tracking-[0.25em] text-emerald-400/90 font-bold">
            Sezon 2025/26
          </p>
          <p className="text-[8pt] text-slate-500 mt-[1mm]">Igrzyska Kapci Kłapcia · H2H</p>
        </div>
      </div>

      <div className="text-center mb-[4mm]">
        <p className="text-[11pt] uppercase tracking-[0.35em] text-amber-300/90 font-semibold mb-[2mm]">
          Dyplom uczestnictwa
        </p>
        <h1
          className="text-[28pt] font-bold uppercase tracking-wide text-white leading-tight"
          style={{ fontFamily: "Oswald, Impact, sans-serif" }}
        >
          FPL Arena
        </h1>
        <p className="text-[10pt] text-slate-400 mt-[2mm] max-w-[150mm] mx-auto leading-snug">
          Niniejszym potwierdzamy udział w ligowej arenie Fantasy Premier League
        </p>
      </div>

      {/* Herb + dane gracza */}
      <div className="flex items-center gap-[8mm] mb-[5mm] pb-[5mm] border-b border-slate-700/60">
        <div className="shrink-0 rounded-2xl border-2 border-amber-400/30 bg-slate-950/80 p-[3mm] shadow-[0_0_24px_rgba(251,191,36,0.15)]">
          <img
            src={teamLogoSrc(player.id)}
            alt=""
            className="w-[28mm] h-[28mm] object-contain"
            crossOrigin="anonymous"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9pt] uppercase tracking-widest text-emerald-400 font-bold mb-[1mm]">
            Menedżer
          </p>
          <h2
            className="text-[22pt] font-bold uppercase text-white leading-none mb-[2mm] break-words"
            style={{ fontFamily: "Oswald, Impact, sans-serif" }}
          >
            {player.team}
          </h2>
          <p className="text-[11pt] text-slate-300">{playerDisplayName(player)}</p>
        </div>
        <div className="shrink-0 text-center rounded-xl border border-amber-400/40 bg-gradient-to-b from-amber-500/20 to-amber-600/5 px-[5mm] py-[4mm] min-w-[32mm]">
          <p className="text-[8pt] uppercase tracking-wider text-amber-200/80">Miejsce</p>
          <p
            className="text-[36pt] font-bold text-amber-300 leading-none"
            style={{ fontFamily: "Oswald, Impact, sans-serif" }}
          >
            #{player.rank}
          </p>
          <p className="text-[7pt] text-slate-500 mt-[1mm]">z 20</p>
        </div>
      </div>

      {/* Tytuł rankingu */}
      <div className="text-center mb-[4mm]">
        <p
          className="text-[14pt] font-bold uppercase text-emerald-300 tracking-wide"
          style={{ fontFamily: "Oswald, Impact, sans-serif" }}
        >
          {content.rankTitle}
        </p>
        <p className="text-[9pt] text-slate-400 mt-[1.5mm] italic max-w-[170mm] mx-auto leading-snug">
          {content.rankSubtitle}
        </p>
      </div>

      {/* Cytat */}
      <blockquote className="mx-auto mb-[4mm] max-w-[175mm] rounded-xl border border-slate-700/80 bg-slate-900/50 px-[5mm] py-[3mm] text-center">
        <p className="text-[9pt] text-slate-300 italic leading-relaxed">
          „{player.quote}"
        </p>
      </blockquote>

      {/* Fakty */}
      <div className="flex-1 min-h-0">
        <p className="text-[8pt] uppercase tracking-[0.2em] text-slate-500 font-bold mb-[2mm] text-center">
          Najważniejsze wspomnienia sezonu
        </p>
        <div className="grid grid-cols-2 gap-[2.5mm]">
          {content.facts.map(({ emoji, label, value }) => (
            <div
              key={label}
              className="rounded-lg border border-slate-800/90 bg-slate-950/40 px-[3mm] py-[2.5mm]"
            >
              <p className="text-[7pt] uppercase tracking-wide text-emerald-400/80 font-semibold mb-[0.5mm]">
                {emoji} {label}
              </p>
              <p className="text-[8pt] text-slate-200 leading-snug break-words">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Podziękowanie */}
      <div className="mt-[4mm] pt-[3mm] border-t border-dashed border-slate-700/70">
        <p className="text-[8pt] text-slate-400 leading-relaxed whitespace-pre-line text-center">
          {content.thanks}
        </p>
        <p className="text-[7pt] text-slate-600 text-center mt-[3mm]">
          Dokument wygenerowany w Skarb Kibica · fpl-arena · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  </div>
);
