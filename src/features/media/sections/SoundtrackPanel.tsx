import {
  SOUNDCLOUD_EMBED_SRC,
  SOUNDCLOUD_PLAYLIST_TITLE,
  SOUNDCLOUD_PLAYLIST_URL,
  SOUNDCLOUD_PROFILE_URL,
} from "@/config/soundtrack";
import { SoundtrackDownloadList } from "@/features/media/components/SoundtrackDownloadList";

export const SoundtrackPanel = () => (
  <div className="space-y-10">
    <div className="glass-panel panel-pad rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
      <p className="text-fluid-sm text-slate-300 leading-relaxed">
        Oficjalny <strong className="text-emerald-300">soundtrack Areny</strong> — playlista utworów z zapowiedzi
        wszystkich Gladiatorów sezonu 2025/26. Odtwórz online lub pobierz utwory poniżej — pojedynczo albo wszystkie naraz.
      </p>
    </div>

    <article className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
      <div className="panel-pad border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <p className="kpi-label mb-1">Playlista</p>
          <h3 className="text-fluid-lg font-athletic font-bold text-white uppercase tracking-wide leading-snug break-words">
            Zapowiedzi Gladiatorów
          </h3>
          <p className="text-fluid-sm text-slate-500 mt-1 break-words">{SOUNDCLOUD_PLAYLIST_TITLE}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <a
            href={SOUNDCLOUD_PLAYLIST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-fluid-sm font-semibold border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-colors"
          >
            Otwórz w SoundCloud
            <span aria-hidden>↗</span>
          </a>
        </div>
      </div>

      <div className="relative bg-slate-950/90">
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(16,185,129,0.15), transparent 70%)",
          }}
        />
        <iframe
          title="FPL Arena — Soundtrack zapowiedzi Gladiatorów"
          width="100%"
          height={400}
          scrolling="no"
          frameBorder={0}
          allow="autoplay; encrypted-media"
          src={SOUNDCLOUD_EMBED_SRC}
          className="relative z-10 w-full block min-h-[300px]"
        />
      </div>

      <footer className="panel-pad border-t border-slate-800 flex flex-wrap items-center gap-x-2 gap-y-1 text-fluid-xs text-slate-500">
        <span>Utwory:</span>
        <a
          href={SOUNDCLOUD_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-emerald-300 transition-colors font-semibold"
        >
          St0pa
        </a>
        <span className="text-slate-600" aria-hidden>
          ·
        </span>
        <a
          href={SOUNDCLOUD_PLAYLIST_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-emerald-300 transition-colors truncate max-w-full"
        >
          {SOUNDCLOUD_PLAYLIST_TITLE}
        </a>
      </footer>
    </article>

    <SoundtrackDownloadList />

    <p className="text-fluid-xs text-slate-600 leading-relaxed max-w-3xl">
      Odtwarzacz hostowany przez SoundCloud. Pliki WAV hostowane lokalnie w Skarbie Kibica (~570 MB łącznie).
    </p>
  </div>
);
