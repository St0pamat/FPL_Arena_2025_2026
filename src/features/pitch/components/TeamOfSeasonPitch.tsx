import { useMemo, useState } from "react";
import type { DreamTeamPlayer } from "@/types/highlights";
import type { FplElementMap } from "@/types/fpl";
import {
  FPL_PHOTO_SIZES,
  getPlayerPhotoUrl,
  groupPlayersByPosition,
  inferFormation,
  mapDreamTeamPlayer,
} from "@/services/fpl/api";

export const PITCH_SLOT_WIDTH = 60;
export const PITCH_SLOT_GAP = { 1: 0, 2: 22, 3: 16, 4: 10, 5: 6 };

export const computeRowGap = (playerCount) => {
    const n = Math.max(1, Math.min(playerCount, 5));
    return PITCH_SLOT_GAP[n] ?? 6;
};

export const rowLayoutStyle = (playerCount) => ({
    "--row-gap": `${computeRowGap(playerCount)}px`
});

export const PlayerSlot = ({ player }) => {
    const [photoIndex, setPhotoIndex] = useState(0);
    const [failed, setFailed] = useState(false);
    const initials = (player.displayName || "?")
        .split(/[\s.]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0])
        .join("")
        .toUpperCase();

    const photoUrl = failed
        ? null
        : getPlayerPhotoUrl(player.elementId, player.photoField, photoIndex);

    const handleImgError = () => {
        if (photoIndex < FPL_PHOTO_SIZES.length - 1) {
            setPhotoIndex((i) => i + 1);
        } else {
            setFailed(true);
        }
    };

    return (
        <div className="player-slot">
            <div className="player-slot__avatar">
                {photoUrl && !failed ? (
                    <img
                        src={photoUrl}
                        alt=""
                        loading="lazy"
                        onError={handleImgError}
                    />
                ) : (
                    <div className="player-slot__avatar-fallback">{initials}</div>
                )}
            </div>
            <div className="player-slot__body">
                <div className="player-slot__name" title={player.displayName}>
                    {player.displayName}
                </div>
                <div className="player-slot__points">{player.points} pkt</div>
                <div
                    className={`player-slot__captain ${player.captaincies > 0 ? "" : "player-slot__captain--empty"}`}
                    title={player.captaincies > 0 ? `Kapitan w ${player.captaincies} kolejkach` : undefined}
                >
                    {player.captaincies > 0 ? `Kapitan ×${player.captaincies}` : "\u00a0"}
                </div>
            </div>
        </div>
    );
};

export const PitchLineRow = ({ players, rowClass, label }) => {
    if (!players.length) return null;
    const layoutStyle = rowLayoutStyle(players.length);
    return (
        <div
            className={`season-pitch__row ${rowClass}`}
            style={layoutStyle}
            aria-label={label}
        >
            {players.map((p) => (
                <PlayerSlot
                    key={`${p.elementId || p.displayName}-${rowClass}`}
                    player={p}
                />
            ))}
        </div>
    );
};

export const TeamOfSeasonPitch = ({ dreamTeam, fplPlayersById }) => {
    const lineup = useMemo(() => {
        const raw = (dreamTeam || []).filter((p) => p.position >= 1 && p.position <= 4);
        return raw.map((p) => mapDreamTeamPlayer(p, fplPlayersById));
    }, [dreamTeam, fplPlayersById]);

    const formation = useMemo(() => inferFormation(lineup), [lineup]);
    const rows = useMemo(() => groupPlayersByPosition(lineup), [lineup]);

    if (lineup.length === 0) return null;

    const pitchRows = [
        { key: "fwd", rowClass: "season-pitch__row--fwd", players: rows[4], label: "Napastnicy" },
        { key: "mid", rowClass: "season-pitch__row--mid", players: rows[3], label: "Pomocnicy" },
        { key: "def", rowClass: "season-pitch__row--def", players: rows[2], label: "Obrońcy" },
        { key: "gk", rowClass: "season-pitch__row--gk", players: rows[1], label: "Bramkarz" }
    ];

    return (
        <div className="season-pitch-wrap">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
                <span className="text-xs text-slate-400">Układ z najczęściej wybieranej jedenastki sezonu</span>
                <span className="text-sm font-athletic font-bold text-yellow-200/90 tracking-widest bg-slate-950/50 border border-yellow-500/30 px-3 py-1 rounded-lg">
                    {formation}
                </span>
            </div>
            <div className="season-pitch">
                <div className="season-pitch__inner">
                    {pitchRows.map((row) => (
                        <PitchLineRow
                            key={row.key}
                            players={row.players}
                            rowClass={row.rowClass}
                            label={row.label}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
