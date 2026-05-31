/** Kolejność playlisty SoundCloud ↔ pliki WAV w /soundtracks/ ({kolejka}-{playerId}.wav).
 *  Manifest deploy: scripts/soundtrack-manifest.mjs (trzymaj zgodnosc nazw plikow). */
export type SoundtrackTrackMeta = {
  order: number;
  playerId: number;
  file: string;
};

export const SOUNDTRACK_TRACKS: SoundtrackTrackMeta[] = [
  { order: 1, playerId: 4002, file: "01-4002.wav" },
  { order: 2, playerId: 9084, file: "02-9084.wav" },
  { order: 3, playerId: 2953280, file: "03-2953280.wav" },
  { order: 4, playerId: 546068, file: "04-546068.wav" },
  { order: 5, playerId: 1178442, file: "05-1178442.wav" },
  { order: 6, playerId: 49321, file: "06-49321.wav" },
  { order: 7, playerId: 425158, file: "07-425158.wav" },
  { order: 8, playerId: 3749264, file: "08-3749264.wav" },
  { order: 9, playerId: 43986, file: "09-43986.wav" },
  { order: 10, playerId: 55981, file: "10-55981.wav" },
  { order: 11, playerId: 68435, file: "11-68435.wav" },
  { order: 12, playerId: 22952, file: "12-22952.wav" },
  { order: 13, playerId: 298030, file: "13-298030.wav" },
  { order: 14, playerId: 24962, file: "14-24962.wav" },
  { order: 15, playerId: 126745, file: "15-126745.wav" },
  { order: 16, playerId: 418929, file: "16-418929.wav" },
  { order: 17, playerId: 3804416, file: "17-3804416.wav" },
  { order: 18, playerId: 1109898, file: "18-1109898.wav" },
  { order: 19, playerId: 248187, file: "19-248187.wav" },
  { order: 20, playerId: 3873739, file: "20-3873739.wav" },
];

export const SOUNDTRACK_BUNDLE_FILE = "FPL-Arena-Soundtrack-Sezon-2025-26.zip";

/** Sciezka HTTP — plik musi lezec w {nginx root}/FPL-Arena-Soundtrack-Sezon-2025-26.zip (czyli dist/, nie public/). */
export const soundtrackBundleUrl = () => `/${SOUNDTRACK_BUNDLE_FILE}`;

export const soundtrackFileUrl = (filename: string) => `/soundtracks/${filename}`;
