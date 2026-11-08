import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import {
  ensurePlayerPhotoCached,
  playerSilhouetteSvg,
} from "@/lib/stats-lab/mediaArchive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: { code: string } },
) {
  const raw = String(context.params.code ?? "").trim();
  if (!/^\d+$/.test(raw)) {
    return new NextResponse("Bad request", { status: 400 });
  }
  const code = Number(raw);
  if (!Number.isFinite(code) || code <= 0) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const refresh =
    new URL(request.url).searchParams.get("refresh") === "1";

  try {
    const cached = await ensurePlayerPhotoCached(code, refresh);
    if (cached) {
      const buf = await readFile(cached.absPath);
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": cached.contentType,
          "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
        },
      });
    }
  } catch (e) {
    console.error("[fpl-lab/player]", code, e);
  }

  const svg = playerSilhouetteSvg(code);
  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
