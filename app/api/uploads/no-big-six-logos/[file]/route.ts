import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { NO_BIG_SIX_LOGOS_UPLOAD_DIR } from "@/lib/no-big-six/logos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET(
  _request: Request,
  context: { params: { file: string } },
) {
  const raw = decodeURIComponent(context.params.file ?? "").trim();

  if (!raw || raw.includes("..") || raw.includes("/") || raw.includes("\\")) {
    return new NextResponse("Bad request", { status: 400 });
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(raw)) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const abs = path.join(process.cwd(), "public", NO_BIG_SIX_LOGOS_UPLOAD_DIR, raw);

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
