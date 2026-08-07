import { slugifyClubName } from "@/lib/admin/clubLogos";

/** Seed / git — logo wersjonowane w repo */
export const TIER_LOGOS_DIR = "tier-logos";
export const TIER_LOGOS_PUBLIC_PATH = `/${TIER_LOGOS_DIR}`;
export const TIER_LOGOS_INDEX = "index.json";

/**
 * Runtime uploads (produkcja PM2) — poza git.
 * Zapis: public/uploads/tier-logos/
 * URL: /uploads/tier-logos/… (rewrite → API)
 */
export const TIER_LOGOS_UPLOAD_DIR = "uploads/tier-logos";
export const TIER_LOGOS_UPLOAD_PUBLIC_PATH = "/uploads/tier-logos";
export const TIER_LOGOS_UPLOAD_INDEX = "index.json";

export const TIER_LOGO_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif";
export const TIER_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const TIER_LOGO_HINT =
  "PNG z przezroczystością, kwadrat ~400×400. Osobna biblioteka od herbów klubowych. Upload idzie do /uploads/tier-logos/ (jak herby klubów).";

/** Stała piramida Na Minusie ™ — kolejność = Tier 1…5 */
export const PYRAMID_TIER_NAMES = [
  "Premier Division",
  "Championship",
  "League One",
  "League Two",
  "National League",
] as const;

export type PyramidTierName = (typeof PYRAMID_TIER_NAMES)[number];

/** Logo brandingowe The FA Ranking (ta sama biblioteka plików co dywizje). */
export const FA_RANKING_LOGO_NAME = "The FA Ranking";

export const BRANDING_LOGO_NAMES = [
  ...PYRAMID_TIER_NAMES,
  FA_RANKING_LOGO_NAME,
] as const;

export type BrandingLogoName = (typeof BRANDING_LOGO_NAMES)[number];

export interface TierLogoRecord {
  tierKey: string;
  tierName: string;
  fileName: string;
  /**
   * Relatywny URL przeglądarki (np. /uploads/tier-logos/the-fa-ranking.png).
   * Brak = seed z /tier-logos/{fileName}.
   */
  publicUrl?: string;
  updatedAt: string;
}

export interface TierLogosIndex {
  version: 1;
  logos: TierLogoRecord[];
  /** Klucze usunięte z panelu — ukrywa też seed po git pull. */
  deletedKeys?: string[];
}

export function slugifyTierName(name: string): string {
  return slugifyClubName(name);
}

/** Seed URL: /tier-logos/x.png */
export function tierLogoPublicUrl(fileName: string): string {
  const clean = String(fileName ?? "").replace(/^\/+/, "");
  return `${TIER_LOGOS_PUBLIC_PATH}/${clean}`.replace(/([^:]\/)\/+/g, "$1");
}

export function tierLogoUploadPublicUrl(fileName: string): string {
  const clean = String(fileName ?? "").replace(/^\/+/, "");
  return `${TIER_LOGOS_UPLOAD_PUBLIC_PATH}/${clean}`.replace(/([^:]\/)\/+/g, "$1");
}

/** Preferuj publicUrl (upload), inaczej seed. */
export function resolveTierLogoSrc(logo: TierLogoRecord): string {
  const fromRecord = (logo.publicUrl ?? "").trim();
  if (fromRecord) {
    return fromRecord.replace(/([^:]\/)\/+/g, "$1");
  }
  return tierLogoPublicUrl(logo.fileName);
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
  return { version: 1, logos: [], deletedKeys: [] };
}

/** Merge seed + runtime: runtime wygrywa po tierKey; deletedKeys ukrywa seed. */
export function mergeTierLogoIndexes(
  seed: TierLogosIndex,
  runtime: TierLogosIndex,
): TierLogosIndex {
  const deleted = new Set(
    [...(seed.deletedKeys ?? []), ...(runtime.deletedKeys ?? [])].filter(Boolean),
  );
  const order = new Map(
    [
      "premier-division",
      "championship",
      "league-one",
      "league-two",
      "national-league",
      "the-fa-ranking",
    ].map((k, i) => [k, i]),
  );
  const map = new Map<string, TierLogoRecord>();
  for (const l of seed.logos) {
    if (!deleted.has(l.tierKey)) map.set(l.tierKey, l);
  }
  for (const l of runtime.logos) {
    if (deleted.has(l.tierKey)) {
      map.delete(l.tierKey);
      continue;
    }
    map.set(l.tierKey, l);
  }
  return {
    version: 1,
    logos: [...map.values()].sort(
      (a, b) => (order.get(a.tierKey) ?? 99) - (order.get(b.tierKey) ?? 99),
    ),
    deletedKeys: [...deleted].sort(),
  };
}

export function isPyramidTierName(name: string): name is PyramidTierName {
  return (PYRAMID_TIER_NAMES as readonly string[]).includes(name);
}

export function isBrandingLogoName(name: string): name is BrandingLogoName {
  return (BRANDING_LOGO_NAMES as readonly string[]).includes(name);
}

export function isFaRankingLogoName(name: string): boolean {
  return name.trim() === FA_RANKING_LOGO_NAME;
}

/** Mapuje nazwę/tier dywizji na klucz logo piramidy (bez zależności od React). */
export function resolveTierLogoName(divisionName: string, tier?: number): string {
  const raw = divisionName.trim();
  const lower = raw.toLowerCase();

  if (lower.includes("premier")) return PYRAMID_TIER_NAMES[0];
  if (lower.includes("championship")) return PYRAMID_TIER_NAMES[1];
  if (lower.includes("league one") || lower.includes("league 1")) return PYRAMID_TIER_NAMES[2];
  if (lower.includes("league two") || lower.includes("league 2")) return PYRAMID_TIER_NAMES[3];
  if (lower.includes("national")) return PYRAMID_TIER_NAMES[4];

  if (tier && tier >= 1 && tier <= 5) return PYRAMID_TIER_NAMES[tier - 1];
  return raw;
}
