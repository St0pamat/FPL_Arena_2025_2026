/**
 * Kanoniczne linki społecznościowe FPL Arena — jedno źródło prawdy
 * dla splash `/`, The FA League, Areny i No Big Six.
 */
export const PLATFORM_DISCORD_INVITE = "https://discord.gg/5PFRuwKJEr";

export const PLATFORM_X_FPL_ARENA = {
  handle: "@_FPL_Arena",
  href: "https://x.com/_FPL_Arena",
  label: "FPL Arena",
} as const;

export const PLATFORM_X_STOPA = {
  handle: "@st0pamat",
  href: "https://x.com/st0pamat",
  label: "St0pa | FPL Arena",
} as const;

export type PlatformSocialId = "discord" | "x-fpl-arena" | "x-stopa";

export type PlatformSocialLink = {
  id: PlatformSocialId;
  href: string;
  label: string;
  shortLabel: string;
};

export const PLATFORM_SOCIAL_LINKS: readonly PlatformSocialLink[] = [
  {
    id: "discord",
    href: PLATFORM_DISCORD_INVITE,
    label: "Discord FPL Arena",
    shortLabel: "Discord",
  },
  {
    id: "x-fpl-arena",
    href: PLATFORM_X_FPL_ARENA.href,
    label: `X — ${PLATFORM_X_FPL_ARENA.label}`,
    shortLabel: PLATFORM_X_FPL_ARENA.handle,
  },
  {
    id: "x-stopa",
    href: PLATFORM_X_STOPA.href,
    label: `X — ${PLATFORM_X_STOPA.label}`,
    shortLabel: PLATFORM_X_STOPA.handle,
  },
] as const;
