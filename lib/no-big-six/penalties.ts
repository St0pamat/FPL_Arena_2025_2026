import type { NoBigSixPenalty } from "@/lib/no-big-six/types";

/** Kara za celowe wystawienie (nie auto-sub). */
export function isIntentionalViolation(p: NoBigSixPenalty): boolean {
  return !p.is_auto_sub;
}

export function formatViolationLine(p: NoBigSixPenalty): string {
  return `${p.player_name} (GW${p.event}): ${p.reason} — −${p.deducted_points} pkt`;
}

export function getIntentionalPenalties(
  penalties: NoBigSixPenalty[],
  entryId: number,
  event?: number,
): NoBigSixPenalty[] {
  return penalties.filter(
    (p) =>
      p.entry_id === entryId &&
      isIntentionalViolation(p) &&
      (event == null || p.event === event),
  );
}

export function hasIntentionalViolation(
  penalties: NoBigSixPenalty[],
  entryId: number,
  event?: number,
): boolean {
  return getIntentionalPenalties(penalties, entryId, event).length > 0;
}
