import { useMemo, useState } from "react";
import type { Player } from "@arena/types/player";
import type { PlayerHighlightsMap } from "@arena/types/highlights";
import {
  buildCardContent,
  type CardTemplateId,
} from "@arena/features/centrum/lib/cardContent";
import { ShareCardDocument } from "@arena/features/centrum/components/ShareCardDocument";
import { ImageExportModal } from "@arena/features/centrum/components/ImageExportModal";
import { playerDisplayName } from "@arena/lib/playerDisplay";

const CARD_PX = 1080;
const PREVIEW_SCALE = 0.36;
const PREVIEW_PX = CARD_PX * PREVIEW_SCALE;

const TEMPLATES: { id: CardTemplateId; label: string; desc: string }[] = [
  { id: "mvp", label: "MVP kolejki", desc: "Najlepszy weekend sezonu" },
  { id: "pechowiec", label: "Pechowiec", desc: "Najgorszy GW lub ciężka porażka" },
  { id: "milestone", label: "Transfer / kamień milowy", desc: "Najlepszy ruch lub miejsce w tabeli" },
  { id: "cytat", label: "Karta cytatu", desc: "Herb + statystyki + złoty cytat" },
];

const ScaledCardPreview = ({
  player,
  content,
}: {
  player: Player;
  content: ReturnType<typeof buildCardContent>;
}) => (
  <div
    className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/50 shrink-0"
    style={{ width: PREVIEW_PX, height: PREVIEW_PX }}
  >
    <div
      style={{
        width: CARD_PX,
        height: CARD_PX,
        transform: `scale(${PREVIEW_SCALE})`,
        transformOrigin: "top left",
      }}
    >
      <ShareCardDocument player={player} content={content} />
    </div>
  </div>
);

export const CardGeneratorPanel = ({
  players,
  highlights,
}: {
  players: Player[];
  highlights: PlayerHighlightsMap;
}) => {
  const [playerId, setPlayerId] = useState(players[0]?.id ?? 0);
  const [template, setTemplate] = useState<CardTemplateId>("mvp");
  const [open, setOpen] = useState(false);

  const player = players.find((p) => p.id === playerId)!;
  const hl = highlights[String(playerId)] ?? null;
  const content = useMemo(() => buildCardContent(player, hl, template), [player, hl, template]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="glass-panel panel-pad rounded-2xl border border-slate-800 space-y-4 w-full max-w-md shrink-0">
          <label className="block">
            <span className="kpi-label block mb-2">Gladiator</span>
            <select
              value={playerId}
              onChange={(e) => setPlayerId(Number(e.target.value))}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white"
            >
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.team} — {playerDisplayName(p)}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-2">
            <span className="kpi-label block">Szablon karty</span>
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplate(t.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  template === t.id
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                    : "border-slate-800 hover:border-slate-600 text-slate-300"
                }`}
              >
                <span className="font-semibold block">{t.label}</span>
                <span className="text-fluid-xs text-slate-500">{t.desc}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-colors"
          >
            Podgląd i pobierz PNG (1080×1080)
          </button>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 shrink-0 w-fit max-w-full mx-auto lg:mx-0">
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-3 text-center lg:text-left">
            Podgląd na żywo
          </p>
          <ScaledCardPreview player={player} content={content} />
        </div>
      </div>

      <ImageExportModal
        open={open}
        onClose={() => setOpen(false)}
        title={`Karta — ${player.team}`}
        subtitle="Kwadrat 1080×1080 · Discord / social"
        fileBase={`FPL-Arena-karta-${player.id}`}
        preview={<ScaledCardPreview player={player} content={content} />}
        exportNode={<ShareCardDocument player={player} content={content} />}
        exportWidth={1080}
        exportHeight={1080}
      />
    </div>
  );
};
