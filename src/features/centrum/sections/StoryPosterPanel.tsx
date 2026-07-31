import { useState } from "react";
import type { Player } from "@arena/types/player";
import type { PlayerHighlightsMap } from "@arena/types/highlights";
import { StoryPosterDocument } from "@arena/features/centrum/components/StoryPosterDocument";
import { ImageExportModal } from "@arena/features/centrum/components/ImageExportModal";

const POSTER_W = 1080;
const POSTER_H = 1920;
const PREVIEW_SCALE = 0.22;
const PREVIEW_W = POSTER_W * PREVIEW_SCALE;
const PREVIEW_H = POSTER_H * PREVIEW_SCALE;

export const StoryPosterPanel = ({
  players,
  highlights,
}: {
  players: Player[];
  highlights: PlayerHighlightsMap;
}) => {
  const [playerId, setPlayerId] = useState(players[0]?.id ?? 0);
  const [open, setOpen] = useState(false);
  const player = players.find((p) => p.id === playerId)!;
  const hl = highlights[String(playerId)] ?? null;

  const preview = (
    <div
      className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/50 shrink-0"
      style={{ width: PREVIEW_W, height: PREVIEW_H }}
    >
      <div
        style={{
          width: POSTER_W,
          height: POSTER_H,
          transform: `scale(${PREVIEW_SCALE})`,
          transformOrigin: "top left",
        }}
      >
        <StoryPosterDocument player={player} highlights={hl} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="glass-panel panel-pad rounded-2xl border border-slate-800 space-y-4 w-full max-w-md shrink-0">
          <p className="text-fluid-sm text-slate-400 leading-relaxed">
            Pionowy plakat 9:16 z miejscem w tabeli, score, serią win, bohaterem sezonu i mapą 38 kolejek.
          </p>
          <label className="block">
            <span className="kpi-label block mb-2">Wybierz menedżera</span>
            <select
              value={playerId}
              onChange={(e) => setPlayerId(Number(e.target.value))}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white"
            >
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.rank} {p.team}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"
          >
            Podgląd i pobierz PNG (1080×1920)
          </button>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 shrink-0 w-fit max-w-full mx-auto lg:mx-0">
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-3 text-center lg:text-left">
            Podgląd na żywo
          </p>
          {preview}
        </div>
      </div>

      <ImageExportModal
        open={open}
        onClose={() => setOpen(false)}
        title={`Story — ${player.team}`}
        subtitle="Pion 1080×1920 · Instagram / telefon"
        fileBase={`FPL-Arena-sezon-${player.id}`}
        preview={preview}
        exportNode={<StoryPosterDocument player={player} highlights={hl} />}
        exportWidth={1080}
        exportHeight={1920}
      />
    </div>
  );
};
