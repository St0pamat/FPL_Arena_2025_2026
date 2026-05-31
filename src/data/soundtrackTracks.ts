/** Kolejność playlisty SoundCloud ↔ pliki WAV w /soundtracks/ (nazwa pliku = mapowanie). */
export type SoundtrackTrackMeta = {
  order: number;
  playerId: number;
  file: string;
};

export const SOUNDTRACK_TRACKS: SoundtrackTrackMeta[] = [
  { order: 1, playerId: 4002, file: "01. Morfeusz FPL - Furiosa FC Morfeusza.wav" },
  { order: 2, playerId: 9084, file: "02. 3palce - Wirtz Team Ever.wav" },
  { order: 3, playerId: 2953280, file: "03. Owen - Bolesławiec King.wav" },
  { order: 4, playerId: 546068, file: "04. Paweł P. - MQUC.wav" },
  { order: 5, playerId: 1178442, file: "05. Igor Janiak - FC Topka.wav" },
  { order: 6, playerId: 49321, file: "06. Baldwiniasty - Świnie Pepa.wav" },
  { order: 7, playerId: 425158, file: "07. Seb.19. - Scuderia Blaugrana.wav" },
  { order: 8, playerId: 3749264, file: "08. Ankara Messi - MntsrNaf.wav" },
  { order: 9, playerId: 43986, file: "09. Mroczny Goblin - Bad Kompany.wav" },
  { order: 10, playerId: 55981, file: "10. Panpawel14 - The Reds.wav" },
  { order: 11, playerId: 68435, file: "11. V10_Alan - FcPoNalewce.wav" },
  { order: 12, playerId: 22952, file: "12. St0pa - Kapcie Kłapcia.wav" },
  { order: 13, playerId: 298030, file: "13. Szybcio47 - Pewniaczki.wav" },
  { order: 14, playerId: 24962, file: "14. PuebloFPL - Ulane Warchlaki.wav" },
  { order: 15, playerId: 126745, file: "15. Michał - Przemsza Klucze.wav" },
  { order: 16, playerId: 418929, file: "16. Sergiusz Kaczmarek - Pusan.wav" },
  { order: 17, playerId: 3804416, file: "17. Mały - Veb.wav" },
  { order: 18, playerId: 1109898, file: "18. Kowal2k - Immigrants FC.wav" },
  { order: 19, playerId: 248187, file: "19. Mav - C30-C39.wav" },
  { order: 20, playerId: 3873739, file: "20. Jarząbek - Jarząbki.wav" },
];

export const SOUNDTRACK_BUNDLE_FILE = "FPL-Arena-Soundtrack-Sezon-2025-26.zip";

export const soundtrackFileUrl = (filename: string) =>
  `/soundtracks/${filename.split("/").map(encodeURIComponent).join("/")}`;

export const soundtrackBundleUrl = () => `/${encodeURIComponent(SOUNDTRACK_BUNDLE_FILE)}`;
