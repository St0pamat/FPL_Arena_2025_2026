import type { DreamTeamPlayer } from "@/types/highlights";
import type { FplElementMap } from "@/types/fpl";

export const FPL_BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/";
export const FPL_PHOTO_SIZES = [
    (code) => `https://resources.premierleague.com/premierleague/photos/players/250x250/p${code}.png`,
    (code) => `https://resources.premierleague.com/premierleague/photos/players/110x140/p${code}.png`,
    (code) => `https://resources.premierleague.com/premierleague25/photos/players/250x250/p${code}.png`
];

export const getPhotoCode = (elementId, photoField) => {
    if (photoField) {
        const code = String(photoField).replace(/\.jpg$/i, "").split("/").pop();
        if (code && /^\d+$/.test(code)) return code;
    }
    if (elementId) return String(elementId);
    return null;
};

export const getPlayerPhotoUrl = (elementId, photoField, variantIndex = 0) => {
    const code = getPhotoCode(elementId, photoField);
    if (!code) return null;
    const builder = FPL_PHOTO_SIZES[variantIndex] || FPL_PHOTO_SIZES[0];
    return builder(code);
};

export const mapDreamTeamPlayer = (player, fplPlayersById) => {
    const fpl = player.elementId ? fplPlayersById[player.elementId] : null;
    let fplMatch = fpl;
    if (!fplMatch && player.name) {
        const key = String(player.name).toLowerCase();
        fplMatch = Object.values(fplPlayersById).find(
            (x) => x.web_name && x.web_name.toLowerCase() === key
        );
    }
    const elementId = player.elementId || fplMatch?.id || null;
    const photoField = fplMatch?.photo || null;
    return {
        ...player,
        elementId,
        displayName: player.name || fplMatch?.web_name || "Zawodnik",
        photoField,
        position: player.position || fplMatch?.element_type || 0
    };
};

export const inferFormation = (players) => {
    let def = 0;
    let mid = 0;
    let fwd = 0;
    players.forEach((p) => {
        if (p.position === 2) def += 1;
        else if (p.position === 3) mid += 1;
        else if (p.position === 4) fwd += 1;
    });
    return `${def}-${mid}-${fwd}`;
};

export const groupPlayersByPosition = (players) => {
    const rows = { 1: [], 2: [], 3: [], 4: [] };
    players.forEach((p) => {
        const key = p.position;
        if (rows[key]) rows[key].push(p);
    });
    [1, 2, 3, 4].forEach((k) => {
        rows[k].sort((a, b) => (a.pitchX || 0) - (b.pitchX || 0));
    });
    return rows;
};

/** Stały slot 60×104px — zmienia się tylko odstęp poziomy między slotami w rzędzie. */
