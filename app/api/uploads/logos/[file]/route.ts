import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { CLUB_LOGOS_UPLOAD_DIR } from "@/lib/admin/clubLogos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/**
 * Serwuje logo wgrane w runtime (PM2 / produkcja).
 * Next czasem nie podaje świeżych plików z public/ po buildzie —
 * route czyta z dysku przez process.cwd().
 */
export async function GET(
  _request: Request,
  context: { params: { file: string } },
) {
  const raw = decodeURIComponent(context.params.file ?? "").trim();

  // Anti path-traversal: tylko sama nazwa pliku
  if (!raw || raw.includes("..") || raw.includes("/") || raw.includes("\\")) {
    return new NextResponse("Bad request", { status: 400 });
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(raw)) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const abs = path.join(process.cwd(), "public", CLUB_LOGOS_UPLOAD_DIR, raw);

  try {
    const info = await stat(abs);
    if (!info.isFile()) {
      return new NextResponse("Not found", { status: 404 });
    }
    const buf = await readFile(abs);
    const ext = path.extname(raw).toLowerCase();
    const contentType = MIME[ext] ?? "application/octet-stream";
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
