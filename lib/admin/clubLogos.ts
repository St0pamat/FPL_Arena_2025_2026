/** Canonical club logo sizes (square crest, object-fit: contain). Master upload ≈ 400×400. */
export const CLUB_LOGO_SIZES = {
  /** CSV / gęste wiersze */
  xs: 36,
  /** Tabele uczestników — prawie pełna wysokość wiersza */
  sm: 44,
  /** Listy / sloty losowania */
  md: 56,
  /** Terminarz / VS — wypełnia kafelek */
  lg: 64,
  /** Formularz / ceremonia */
  xl: 72,
  /** Biblioteka logo */
  hero: 112,
} as const;

export type ClubLogoSize = keyof typeof CLUB_LOGO_SIZES;

/** Seed / git — logo wersjonowane w repo */
export const CLUB_LOGOS_DIR = "club-logos";
export const CLUB_LOGOS_PUBLIC_PATH = `/${CLUB_LOGOS_DIR}`;
export const CLUB_LOGOS_INDEX = "index.json";

/**
 * Runtime uploads (produkcja PM2 / DO) — poza git.
 * Zapis: public/uploads/logos/
 * URL publiczny: /uploads/logos/… (rewrite → API stream z dysku)
 */
export const CLUB_LOGOS_UPLOAD_DIR = "uploads/logos";
export const CLUB_LOGOS_UPLOAD_PUBLIC_PATH = "/uploads/logos";
export const CLUB_LOGOS_UPLOAD_INDEX = "index.json";

export const CLUB_LOGO_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif";
export const CLUB_LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const CLUB_LOGO_HINT =
  "PNG z przezroczystością, kwadrat ~400×400 (min. 200×200). UI nie dokłada czarnego tła.";

export interface ClubLogoRecord {
  clubKey: string;
  clubName: string;
  fileName: string;
  /**
   * Relatywny URL przeglądarki (np. /uploads/logos/171-chelsea.png).
   * Brak = seed z /club-logos/{fileName}.
   */
  publicUrl?: string;
  updatedAt: string;
}

export interface ClubLogosIndex {
  version: 1;
  logos: ClubLogoRecord[];
}

/** "West Ham United" → "west-ham-united" */
export function slugifyClubName(name: string | null | undefined | number): string {
  return String(name ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "l")
    .toLowerCase()
    .replace(/[''`´]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Czyści nazwę pliku z uploadu (ASCII, bez spacji / PL znaków). */
export function sanitizeUploadBaseName(raw: string): string {
  const base = raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "l")
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "")
    .replace(/^\.+/, "");
  return base.slice(0, 80) || "logo";
}

/**
 * Absolutna ścieżka katalogu uploadów (process.cwd — bezpieczne na PM2/Linux).
 * Tylko Server Actions / Route Handlers.
 */
export function clubLogosUploadAbsDir(cwd = process.cwd()): string {
  // path-like join bez importu node:path — unikamy bundlowania path w kliencie
  return [cwd, "public", ...CLUB_LOGOS_UPLOAD_DIR.split("/")].join(
    cwd.includes("\\") ? "\\" : "/",
  );
}

/** URL publiczny: preferuj publicUrl z rekordu, inaczej seed /club-logos. */
export function resolveClubLogoSrc(logo: ClubLogoRecord): string {
  const fromRecord = (logo.publicUrl ?? "").trim();
  if (fromRecord) {
    return fromRecord.replace(/([^:]\/)\/+/g, "$1");
  }
  return clubLogoPublicUrl(logo.fileName);
}

/** @deprecated Prefer resolveClubLogoSrc(logo) — zostawione dla seed `/club-logos/x`. */
export function clubLogoPublicUrl(fileName: string): string {
  const clean = String(fileName ?? "").replace(/^\/+/, "");
  return `${CLUB_LOGOS_PUBLIC_PATH}/${clean}`.replace(/([^:]\/)\/+/g, "$1");
}

export function clubLogoUploadPublicUrl(fileName: string): string {
  const clean = String(fileName ?? "").replace(/^\/+/, "");
  return `${CLUB_LOGOS_UPLOAD_PUBLIC_PATH}/${clean}`.replace(/([^:]\/)\/+/g, "$1");
}

export function findClubLogo(
  logos: ClubLogoRecord[] | unknown,
  clubName: string | null | undefined | number,
): ClubLogoRecord | null {
  const raw = String(clubName ?? "").trim();
  if (!raw || raw === "—") return null;

  const logosArray: ClubLogoRecord[] = Array.isArray(logos)
    ? logos
    : logos && typeof logos === "object" && Array.isArray((logos as ClubLogosIndex).logos)
      ? (logos as ClubLogosIndex).logos
      : logos && typeof logos === "object" && Array.isArray((logos as { default?: unknown }).default)
        ? ((logos as { default: ClubLogoRecord[] }).default)
        : [];

  const key = slugifyClubName(raw);
  const byKey = logosArray.find((l) => l.clubKey === key);
  if (byKey) return byKey;

  const lower = raw.toLowerCase();
  const stripped = slugifyClubName(
    raw.replace(/\bA\.?\s*F\.?\s*C\.?\b/gi, "").replace(/\bF\.?\s*C\.?\b/gi, "").trim(),
  );

  return (
    logosArray.find((l) => String(l.clubName ?? "").toLowerCase() === lower) ??
    logosArray.find((l) => slugifyClubName(l.clubName) === key) ??
    (stripped
      ? logosArray.find(
          (l) =>
            slugifyClubName(
              String(l.clubName ?? "")
                .replace(/\bA\.?\s*F\.?\s*C\.?\b/gi, "")
                .replace(/\bF\.?\s*C\.?\b/gi, "")
                .trim(),
            ) === stripped,
        )
      : undefined) ??
    null
  );
}

export function emptyClubLogosIndex(): ClubLogosIndex {
  return { version: 1, logos: [] };
}

/** Merge seed + runtime: runtime (uploads) wygrywa po clubKey. */
export function mergeClubLogoIndexes(
  seed: ClubLogosIndex,
  runtime: ClubLogosIndex,
): ClubLogosIndex {
  const map = new Map<string, ClubLogoRecord>();
  for (const l of seed.logos) map.set(l.clubKey, l);
  for (const l of runtime.logos) map.set(l.clubKey, l);
  return {
    version: 1,
    logos: [...map.values()].sort((a, b) => a.clubName.localeCompare(b.clubName, "pl")),
  };
}

/** Unikalne nazwy klubów z listy uczestników (Discord Club / chosen_club). */
export function uniqueParticipantClubs(
  clubNames: Array<string | null | undefined | number>,
): string[] {
  const map = new Map<string, string>();
  for (const raw of clubNames) {
    const name = String(raw ?? "").trim();
    if (!name || name === "—") continue;
    const key = slugifyClubName(name);
    if (!key) continue;
    if (!map.has(key)) map.set(key, name);
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, "pl"));
}
