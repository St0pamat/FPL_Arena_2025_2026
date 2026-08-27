import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  performDeleteNoBigSixLogo,
  performUploadNoBigSixLogo,
  type UploadNoBigSixLogoResult,
} from "@/lib/no-big-six/logoOps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return supabase;
}

function jsonResult(result: UploadNoBigSixLogoResult, httpOk = 200) {
  return NextResponse.json(result, {
    status: result.ok ? httpOk : 400,
  });
}

/** POST multipart: fields `file` + `entryId` */
export async function POST(request: Request) {
  try {
    const supabase = await requireUser();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, message: "Brak sesji — zaloguj się w panelu admina." },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const entryRaw = formData.get("entryId");
    const entryId = Number(entryRaw);
    const result = await performUploadNoBigSixLogo(supabase, formData, entryId);
    return jsonResult(result);
  } catch (e) {
    console.error("[api/admin/no-big-six/logo POST]", e);
    return NextResponse.json(
      {
        ok: false,
        message:
          "Wystąpił nieoczekiwany błąd serwera podczas wgrywania pliku.",
      },
      { status: 500 },
    );
  }
}

/** DELETE JSON body: { entryId: number } */
export async function DELETE(request: Request) {
  try {
    const supabase = await requireUser();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, message: "Brak sesji — zaloguj się w panelu admina." },
        { status: 401 },
      );
    }

    let entryId = 0;
    try {
      const body = (await request.json()) as { entryId?: unknown };
      entryId = Number(body.entryId);
    } catch {
      return NextResponse.json(
        { ok: false, message: "Nieprawidłowe body (oczekiwano JSON z entryId)." },
        { status: 400 },
      );
    }

    const result = await performDeleteNoBigSixLogo(supabase, entryId);
    return jsonResult(result);
  } catch (e) {
    console.error("[api/admin/no-big-six/logo DELETE]", e);
    return NextResponse.json(
      {
        ok: false,
        message: "Wystąpił nieoczekiwany błąd serwera podczas usuwania herbu.",
      },
      { status: 500 },
    );
  }
}
