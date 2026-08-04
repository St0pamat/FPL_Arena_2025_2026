/** Paleta Na Minusie ™ — 2026 dark premium */
export const NM = {
  bg: "#050505",
  card: "#111111",
  cardHover: "#161616",
  border: "#1a1a1a",
  green: "#39FF14",
  greenDim: "#2ecc12",
  white: "#FFFFFF",
  muted: "#888888",
  dim: "#555555",
} as const;

export const NM_CONTAINER = "mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16";

/**
 * Offset sticky elementów pod StickyNavbar + CollaborationCredits.
 * Nav: 4rem / 4.5rem · credits: ~2.25rem
 */
export const NM_BELOW_STICKY_HEADER =
  "top-[calc(4rem+2.25rem)] sm:top-[calc(4.5rem+2.25rem)]";
