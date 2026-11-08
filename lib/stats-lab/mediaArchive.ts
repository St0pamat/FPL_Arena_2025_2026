import { access, mkdir, readdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export {
  fplLabBadgeUrl,
  fplLabPlayerPhotoUrl,
} from "@/lib/stats-lab/mediaUrls";

export const FPL_LAB_PLAYERS_DIR = "uploads/fpl-lab/players";
export const FPL_LAB_BADGES_DIR = "uploads/fpl-lab/badges";

const MIN_FILE_BYTES = 500;

const PLAYER_CDN_URLS = (code: number) => [
  `https://resources.premierleague.com/premierleague25/photos/players/110x140/${code}.png`,
  `https://resources.premierleague.com/premierleague/photos/players/110x140/p${code}.png`,
  `https://resources.premierleague.com/premierleague/photos/players/250x250/p${code}.png`,
];

const BADGE_CDN_URLS = (code: number) => [
  `https://resources.premierleague.com/premierleague/badges/100/t${code}.png`,
  `https://resources.premierleague.com/premierleague/badges/70/t${code}.png`,
  `https://resources.premierleague.com/premierleague25/badges-alt/${code}.svg`,
];

const FETCH_HEADERS = {
  "User-Agent": "FPL-Arena-StatsLab/1.0 (+media-archive; admin)",
  Accept: "image/png,image/svg+xml,image/*,*/*",
} as const;

export function playersAbsDir(): string {
  return path.join(process.cwd(), "public", FPL_LAB_PLAYERS_DIR);
}

export function badgesAbsDir(): string {
  return path.join(process.cwd(), "public", FPL_LAB_BADGES_DIR);
}

export function playerPhotoAbsPath(code: number): string {
  return path.join(playersAbsDir(), `p${code}.png`);
}

export function badgePngAbsPath(code: number): string {
  return path.join(badgesAbsDir(), `t${code}.png`);
}

export function badgeSvgAbsPath(code: number): string {
  return path.join(badgesAbsDir(), `t${code}.svg`);
}

export async function ensureMediaDirs(): Promise<void> {
  await mkdir(playersAbsDir(), { recursive: true });
  await mkdir(badgesAbsDir(), { recursive: true });
}

async function fileIsUsable(abs: string): Promise<boolean> {
  try {
    const info = await stat(abs);
    return info.isFile() && info.size > MIN_FILE_BYTES;
  } catch {
    return false;
  }
}

export async function countCachedPlayerPhotos(): Promise<number> {
  try {
    await ensureMediaDirs();
    const files = await readdir(playersAbsDir());
    let n = 0;
    for (const f of files) {
      if (!/^p\d+\.png$/i.test(f)) continue;
      if (await fileIsUsable(path.join(playersAbsDir(), f))) n += 1;
    }
    return n;
  } catch {
    return 0;
  }
}

export async function countCachedBadges(): Promise<number> {
  try {
    await ensureMediaDirs();
    const files = await readdir(badgesAbsDir());
    const codes = new Set<number>();
    for (const f of files) {
      const m = /^t(\d+)\.(png|svg)$/i.exec(f);
      if (!m) continue;
      const abs = path.join(badgesAbsDir(), f);
      if (await fileIsUsable(abs)) codes.add(Number(m[1]));
    }
    return codes.size;
  } catch {
    return 0;
  }
}

async function fetchFirstImage(
  urls: string[],
): Promise<{ buf: Buffer; contentType: string } | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: FETCH_HEADERS,
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) continue;
      const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength < MIN_FILE_BYTES) continue;
      if (
        contentType.includes("png") ||
        contentType.includes("jpeg") ||
        contentType.includes("jpg") ||
        contentType.includes("webp") ||
        contentType.includes("svg") ||
        url.endsWith(".png") ||
        url.endsWith(".svg")
      ) {
        return { buf, contentType: contentType || "image/png" };
      }
    } catch {
      /* next URL */
    }
  }
  return null;
}

async function writeAtomic(abs: string, buf: Buffer): Promise<void> {
  await ensureMediaDirs();
  const tmp = `${abs}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, buf);
  await rename(tmp, abs);
}

export function playerSilhouetteSvg(code: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="110" height="140" viewBox="0 0 110 140" role="img" aria-label="Player">
  <rect width="110" height="140" rx="12" fill="#0B1220"/>
  <circle cx="55" cy="46" r="22" fill="#334155"/>
  <path d="M20 128c8-28 24-42 35-42s27 14 35 42" fill="#334155"/>
  <text x="55" y="18" text-anchor="middle" fill="#64748b" font-family="Arial,sans-serif" font-size="9" font-weight="700">FPL</text>
  <text x="55" y="134" text-anchor="middle" fill="#475569" font-family="Arial,sans-serif" font-size="8">${code}</text>
</svg>`;
}

export function clubShieldSvg(code: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" role="img" aria-label="Club">
  <path d="M50 6 L86 22 V52 C86 74 68 90 50 96 C32 90 14 74 14 52 V22 Z" fill="#0B1220" stroke="#39FF14" stroke-width="3"/>
  <text x="50" y="56" text-anchor="middle" fill="#94a3b8" font-family="Arial,sans-serif" font-size="14" font-weight="800">${code}</text>
</svg>`;
}

/**
 * Zapewnia lokalny plik portretu. Zwraca ścieżkę absolutną albo null (użyj SVG).
 */
export async function ensurePlayerPhotoCached(
  code: number,
  forceRefresh = false,
): Promise<{ absPath: string; contentType: string } | null> {
  if (!Number.isFinite(code) || code <= 0) return null;
  const abs = playerPhotoAbsPath(code);
  if (!forceRefresh && (await fileIsUsable(abs))) {
    return { absPath: abs, contentType: "image/png" };
  }
  const fetched = await fetchFirstImage(PLAYER_CDN_URLS(code));
  if (!fetched) return null;
  await writeAtomic(abs, fetched.buf);
  return { absPath: abs, contentType: "image/png" };
}

/**
 * Zapewnia lokalny herb. Preferuje PNG; SVG z CDN zapisywane jako .svg.
 */
export async function ensureBadgeCached(
  code: number,
  forceRefresh = false,
): Promise<{ absPath: string; contentType: string } | null> {
  if (!Number.isFinite(code) || code <= 0) return null;
  const png = badgePngAbsPath(code);
  const svg = badgeSvgAbsPath(code);

  if (!forceRefresh) {
    if (await fileIsUsable(png)) {
      return { absPath: png, contentType: "image/png" };
    }
    if (await fileIsUsable(svg)) {
      return { absPath: svg, contentType: "image/svg+xml" };
    }
  }

  const fetched = await fetchFirstImage(BADGE_CDN_URLS(code));
  if (!fetched) return null;

  const isSvg =
    fetched.contentType.includes("svg") ||
    fetched.buf.subarray(0, 200).toString("utf8").includes("<svg");
  const abs = isSvg ? svg : png;
  await writeAtomic(abs, fetched.buf);
  return {
    absPath: abs,
    contentType: isSvg ? "image/svg+xml" : "image/png",
  };
}

export async function playerPhotoExists(code: number): Promise<boolean> {
  return fileIsUsable(playerPhotoAbsPath(code));
}

export async function badgeExists(code: number): Promise<boolean> {
  return (
    (await fileIsUsable(badgePngAbsPath(code))) ||
    (await fileIsUsable(badgeSvgAbsPath(code)))
  );
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

/** Map concurrent workers with delay between starts (Anti-Ban). */
export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  delayMs: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function runWorker() {
    while (next < items.length) {
      const i = next;
      next += 1;
      if (delayMs > 0 && i > 0) await sleep(delayMs);
      results[i] = await worker(items[i], i);
    }
  }

  const n = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(Array.from({ length: n }, () => runWorker()));
  return results;
}

export async function pathExists(abs: string): Promise<boolean> {
  try {
    await access(abs);
    return true;
  } catch {
    return false;
  }
}
