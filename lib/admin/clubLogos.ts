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

export const CLUB_LOGOS_DIR = "club-logos";
export const CLUB_LOGOS_PUBLIC_PATH = `/${CLUB_LOGOS_DIR}`;
export const CLUB_LOGOS_INDEX = "index.json";

export const CLUB_LOGO_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif";
export const CLUB_LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const CLUB_LOGO_HINT =
  "PNG z przezroczystością, kwadrat ~400×400 (min. 200×200). UI nie dokłada czarnego tła.";

export interface ClubLogoRecord {
  clubKey: string;
  clubName: string;
  fileName: string;
  updatedAt: string;
}

export interface ClubLogosIndex {
  version: 1;
  logos: ClubLogoRecord[];
}

/** "West Ham United" → "west-ham-united" */
export function slugifyClubName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function clubLogoPublicUrl(fileName: string): string {
  return `${CLUB_LOGOS_PUBLIC_PATH}/${fileName}`;
}

export function findClubLogo(
  logos: ClubLogoRecord[],
  clubName: string | null | undefined,
): ClubLogoRecord | null {
  const raw = (clubName ?? "").trim();
  if (!raw || raw === "—") return null;

  const key = slugifyClubName(raw);
  const byKey = logos.find((l) => l.clubKey === key);
  if (byKey) return byKey;

  const lower = raw.toLowerCase();
  const stripped = slugifyClubName(
    raw.replace(/\bA\.?\s*F\.?\s*C\.?\b/gi, "").replace(/\bF\.?\s*C\.?\b/gi, "").trim(),
  );

  return (
    logos.find((l) => l.clubName.toLowerCase() === lower) ??
    logos.find((l) => slugifyClubName(l.clubName) === key) ??
    (stripped
      ? logos.find(
          (l) =>
            slugifyClubName(
              l.clubName.replace(/\bA\.?\s*F\.?\s*C\.?\b/gi, "").replace(/\bF\.?\s*C\.?\b/gi, "").trim(),
            ) === stripped,
        )
      : undefined) ??
    null
  );
}

export function emptyClubLogosIndex(): ClubLogosIndex {
  return { version: 1, logos: [] };
}

/** Unikalne nazwy klubów z listy uczestników (Discord Club / chosen_club). */
export function uniqueParticipantClubs(clubNames: string[]): string[] {
  const map = new Map<string, string>();
  for (const raw of clubNames) {
    const name = raw.trim();
    if (!name || name === "—") continue;
    const key = slugifyClubName(name);
    if (!key) continue;
    if (!map.has(key)) map.set(key, name);
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, "pl"));
}
