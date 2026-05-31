import type { Player } from "@/types/player";
import { PLAYER_BY_ID } from "@/config/playersIndex";
import { TeamCrest } from "@/components/branding";
import { playerDisplayName, shouldShowPlayerName } from "@/lib/playerDisplay";
import {
  SOUNDTRACK_BUNDLE_FILE,
  SOUNDTRACK_TRACKS,
  soundtrackBundleUrl,
  soundtrackFileUrl,
} from "@/data/soundtrackTracks";

const TrackCard = ({
  order,
  player,
  file,
}: {
  order: number;
  player: Player;
  file: string;
}) => (
  <article className="glass-panel rounded-xl border border-slate-800 panel-pad flex items-center gap-4 hover:border-emerald-500/30 transition-colors group">
    <div
      className="shrink-0 w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center font-mono text-sm font-bold text-emerald-400 group-hover:border-emerald-500/40"
      aria-hidden
    >
      {String(order).padStart(2, "0")}
    </div>
    <TeamCrest fplId={player.id} size="md" className="shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="font-bold text-white text-fluid-sm leading-snug break-words">{player.team}</p>
      {shouldShowPlayerName(player) && (
        <p className="text-fluid-xs text-slate-500 mt-0.5 break-words leading-snug">
          {playerDisplayName(player)}
        </p>
      )}
    </div>
    <a
      href={soundtrackFileUrl(file)}
      download
      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-fluid-xs font-semibold border border-slate-700 bg-slate-900/80 text-slate-200 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors"
      title={`Pobierz: ${file}`}
    >
      <span aria-hidden>↓</span>
      WAV
    </a>
  </article>
);

export const SoundtrackDownloadList = () => {
  const tracks = SOUNDTRACK_TRACKS.map((t) => ({
    ...t,
    player: PLAYER_BY_ID[t.playerId],
  })).filter((t): t is typeof t & { player: Player } => Boolean(t.player));

  return (
    <section className="space-y-6">
      <div className="glass-panel panel-pad rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-slate-900/40 to-emerald-500/5 flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1 min-w-0">
          <p className="kpi-label mb-2 text-violet-300/90">Pakiet kompletny</p>
          <h3 className="text-fluid-xl font-athletic font-bold text-white uppercase tracking-wide leading-snug">
            Cała playlista · 20 utworów
          </h3>
          <p className="text-fluid-sm text-slate-400 mt-2 leading-relaxed">
            Wszystkie zapowiedzi Gladiatorów w jednym archiwum ZIP (WAV). Idealne do offline lub montażu.
          </p>
        </div>
        <a
          href={soundtrackBundleUrl()}
          download={SOUNDTRACK_BUNDLE_FILE}
          className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-fluid-sm font-bold border-2 border-emerald-500/50 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 hover:border-emerald-400 transition-all shadow-[0_0_24px_rgba(16,185,129,0.15)]"
        >
          <span aria-hidden>⬇</span>
          Pobierz całość (ZIP)
        </a>
      </div>

      <div>
        <h3 className="text-fluid-lg font-athletic font-bold text-white uppercase tracking-wide mb-1">
          Pojedyncze utwory
        </h3>
        <p className="text-fluid-sm text-slate-500 mb-4">
          {tracks.length} zapowiedzi — format WAV, w kolejności playlisty SoundCloud.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {tracks.map(({ order, player, file }) => (
            <TrackCard key={player.id} order={order} player={player} file={file} />
          ))}
        </div>
      </div>
    </section>
  );
};
