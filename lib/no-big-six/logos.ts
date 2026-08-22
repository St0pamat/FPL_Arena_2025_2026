/** Runtime upload herbów No Big Six — wzorzec jak club-logos (public/uploads + API rewrite). */

export const NO_BIG_SIX_LOGOS_UPLOAD_DIR = "uploads/no-big-six-logos";
export const NO_BIG_SIX_LOGOS_PUBLIC_PATH = "/uploads/no-big-six-logos";
export const NO_BIG_SIX_LOGO_MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

export function isAllowedLogoMime(mime: string): boolean {
  return ALLOWED_MIME.has(mime);
}

export function noBigSixLogoPublicUrl(fileName: string): string {
  return `${NO_BIG_SIX_LOGOS_PUBLIC_PATH}/${fileName}`;
}

export function buildNoBigSixLogoFileName(entryId: number, ext: string): string {
  const safeExt = ext.startsWith(".") ? ext : `.${ext}`;
  return `entry-${entryId}-${Date.now()}${safeExt}`;
}
