/** Client-safe URL helpers (bez Node fs). */

export function fplLabPlayerPhotoUrl(playerCode: number, refresh = false): string {
  const q = refresh ? "?refresh=1" : "";
  return `/api/uploads/fpl-lab/player/${playerCode}${q}`;
}

export function fplLabBadgeUrl(pulseCode: number, refresh = false): string {
  const q = refresh ? "?refresh=1" : "";
  return `/api/uploads/fpl-lab/badge/${pulseCode}${q}`;
}
