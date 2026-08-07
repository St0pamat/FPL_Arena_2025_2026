import {
  findClubLogo,
  resolveClubLogoSrc,
  slugifyClubName,
  type ClubLogoRecord,
} from "@/lib/admin/clubLogos";

/**
 * Mapuje chosen_club → URL herbu.
 * Priorytet: index admina (seed + uploads), potem `/images/clubs/{slug}.png`.
 */
export function resolvePublicCrestSrc(
  clubName: string | null | undefined,
  logos: ClubLogoRecord[] = [],
): string | null {
  const raw = (clubName ?? "").trim();
  if (!raw || raw === "—") return null;

  const fromIndex = findClubLogo(logos, raw);
  if (fromIndex) return resolveClubLogoSrc(fromIndex);

  const slug = slugifyClubName(raw);
  if (!slug) return null;
  return `/images/clubs/${slug}.png`;
}

export function resolveCrestWithFallback(
  clubName: string | null | undefined,
  logos: ClubLogoRecord[] = [],
): { src: string | null; slug: string } {
  const slug = slugifyClubName(clubName ?? "");
  return { src: resolvePublicCrestSrc(clubName, logos), slug };
}