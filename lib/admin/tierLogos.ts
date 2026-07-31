import { slugifyClubName } from "@/lib/admin/clubLogos";

export const TIER_LOGOS_DIR = "tier-logos";
export const TIER_LOGOS_PUBLIC_PATH = `/${TIER_LOGOS_DIR}`;
export const TIER_LOGOS_INDEX = "index.json";

export const TIER_LOGO_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif";
export const TIER_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const TIER_LOGO_HINT =
  "PNG z przezroczystością, kwadrat ~400×400. Osobna biblioteka od herbów klubowych.";

/** Stała piramida Na Minusie ™ — kolejność = Tier 1…5 */
export const PYRAMID_TIER_NAMES = [
  "Premier Division",
  "Championship",
  "League One",
  "League Two",
  "National League",
] as const;

export type PyramidTierName = (typeof PYRAMID_TIER_NAMES)[number];

export interface TierLogoRecord {
  tierKey: string;
  tierName: string;
  fileName: string;
  updatedAt: string;
}

export interface TierLogosIndex {
  version: 1;
  logos: TierLogoRecord[];
}

export function slugifyTierName(name: string): string {
  return slugifyClubName(name);
}

export function tierLogoPublicUrl(fileName: string): string {
  return `${TIER_LOGOS_PUBLIC_PATH}/${fileName}`;
}

export function findTierLogo(
  logos: TierLogoRecord[],
  tierName: string | null | undefined,
): TierLogoRecord | null {
  const raw = (tierName ?? "").trim();
  if (!raw) return null;

  const key = slugifyTierName(raw);
  return (
    logos.find((l) => l.tierKey === key) ??
    logos.find((l) => l.tierName.toLowerCase() === raw.toLowerCase()) ??
    null
  );
}

export function emptyTierLogosIndex(): TierLogosIndex {
  return { version: 1, logos: [] };
}

export function isPyramidTierName(name: string): name is PyramidTierName {
  return (PYRAMID_TIER_NAMES as readonly string[]).includes(name);
}
