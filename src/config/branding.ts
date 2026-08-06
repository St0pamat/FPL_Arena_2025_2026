export const LOGO_BASE = "logo";

/** Hełm spartanina — wyłącznie Igrzyska Kapci Kłapcia / Skarb Kibica (/arena). */
export const LEAGUE_LOGO_SRC = `${LOGO_BASE}/fpl-arena-ikk.png`;

/** Stadion — strona główna, Na Minusie i przyszłe projekty (sync → /images/fpl-arena-logo.png). */
export const PLATFORM_LOGO_SRC = `${LOGO_BASE}/FPL Arena.png`;

export const teamLogoSrc = (fplId: number | string) => `${LOGO_BASE}/${fplId}.png`;
