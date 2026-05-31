/** Playlist SoundCloud — zapowiedzi Gladiatorów (sezon 2025/26). */
export const SOUNDCLOUD_PLAYLIST_URL =
  "https://soundcloud.com/mateusz-stopczy-ski-1/sets/fpl-arena-igrzyska-kapci-k-1";

export const SOUNDCLOUD_PROFILE_URL = "https://soundcloud.com/mateusz-stopczy-ski-1";

export const SOUNDCLOUD_PLAYLIST_TITLE =
  "FPL Arena - Igrzyska Kapci Kłapcia Sezon 2025/2026";

/** Kolor akcentu odtwarzacza — emerald Areny (#10b981). */
const SOUNDCLOUD_ACCENT = "%2310b981";

const PLAYLIST_API_URL =
  "https://api.soundcloud.com/playlists/soundcloud%3Aplaylists%3A2245555490";

export const SOUNDCLOUD_EMBED_SRC =
  `https://w.soundcloud.com/player/?url=${encodeURIComponent(PLAYLIST_API_URL)}` +
  `&color=${SOUNDCLOUD_ACCENT}` +
  "&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=true&visual=true";
