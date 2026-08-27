/**
 * Operacje dysk + DB dla herbów No Big Six (wspólne dla API Route i Server Actions).
 */

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  NO_BIG_SIX_LOGO_MAX_BYTES,
  NO_BIG_SIX_LOGOS_PUBLIC_PATH,
  NO_BIG_SIX_LOGOS_UPLOAD_DIR,
  buildNoBigSixLogoFileName,
  isAllowedLogoMime,
  noBigSixLogoPublicUrl,
} from "@/lib/no-big-six/logos";

export type UploadNoBigSixLogoResult = {
  ok: boolean;
  message: string;
  url?: string;
};

export function uploadDir(): string {
  return path.join(process.cwd(), "public", NO_BIG_SIX_LOGOS_UPLOAD_DIR);
}

export function fileNameFromLogoUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const prefix = `${NO_BIG_SIX_LOGOS_PUBLIC_PATH}/`;
  if (!trimmed.startsWith(prefix)) return null;
  const name = trimmed.slice(prefix.length).split(/[?#]/)[0] ?? "";
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
    return null;
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) return null;
  return name;
}

export async function tryUnlinkLogoFile(fileName: string): Promise<void> {
  try {
    await unlink(path.join(uploadDir(), fileName));
  } catch {
    /* plik mógł już nie istnieć */
  }
}

function asUploadBlob(
  rawFile: FormDataEntryValue | null,
): (Blob & { type?: string; name?: string }) | null {
  if (
    rawFile != null &&
    typeof rawFile === "object" &&
    "arrayBuffer" in rawFile &&
    "size" in rawFile &&
    typeof (rawFile as Blob).arrayBuffer === "function"
  ) {
    return rawFile as Blob & { type?: string; name?: string };
  }
  return null;
}

export async function performUploadNoBigSixLogo(
  supabase: SupabaseClient,
  formData: FormData,
  entryId: number,
): Promise<UploadNoBigSixLogoResult> {
  try {
    if (!Number.isFinite(entryId) || entryId < 1) {
      return { ok: false, message: "Nieprawidłowy entry_id." };
    }

    const { data: team, error: teamError } = await supabase
      .from("no_big_six_teams")
      .select("entry_id, is_banned, custom_logo_url")
      .eq("entry_id", entryId)
      .maybeSingle();

    if (teamError) return { ok: false, message: teamError.message };
    if (!team) return { ok: false, message: "Nie znaleziono zespołu w bazie." };
    if (team.is_banned) {
      return {
        ok: false,
        message: "Nie można wgrać herbu dla zbanowanego gracza.",
      };
    }

    const file = asUploadBlob(formData.get("file"));
    if (!file || file.size === 0) {
      return {
        ok: false,
        message: "Wybierz plik obrazu (PNG, JPEG lub WebP).",
      };
    }

    const mime = String(file.type ?? "");
    if (!isAllowedLogoMime(mime)) {
      return { ok: false, message: "Dozwolone formaty: PNG, JPEG, WebP." };
    }

    if (file.size > NO_BIG_SIX_LOGO_MAX_BYTES) {
      return {
        ok: false,
        message: `Plik jest za duży (max ${NO_BIG_SIX_LOGO_MAX_BYTES / (1024 * 1024)} MB).`,
      };
    }

    const ext =
      mime === "image/png" ? ".png" : mime === "image/webp" ? ".webp" : ".jpg";
    const fileName = buildNoBigSixLogoFileName(entryId, ext);
    const dir = uploadDir();

    try {
      await mkdir(dir, { recursive: true });
    } catch (e) {
      console.error("[performUploadNoBigSixLogo] mkdir", e);
      return {
        ok: false,
        message: `Nie można utworzyć katalogu uploadów (${dir}). Sprawdź uprawnienia na VPS.`,
      };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      await writeFile(path.join(dir, fileName), buffer);
    } catch (e) {
      console.error("[performUploadNoBigSixLogo] writeFile", e);
      return {
        ok: false,
        message:
          "Nie udało się zapisać pliku na dysku serwera (uprawnienia / brak miejsca).",
      };
    }

    const publicUrl = noBigSixLogoPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from("no_big_six_teams")
      .update({ custom_logo_url: publicUrl })
      .eq("entry_id", entryId);

    if (updateError) {
      await tryUnlinkLogoFile(fileName);
      return { ok: false, message: updateError.message };
    }

    const previous = fileNameFromLogoUrl(
      team.custom_logo_url != null ? String(team.custom_logo_url) : null,
    );
    if (previous && previous !== fileName) {
      await tryUnlinkLogoFile(previous);
    }

    revalidatePath("/no-big-six");
    revalidatePath("/admin/no-big-six/logos");

    return { ok: true, message: "Herb zapisany.", url: publicUrl };
  } catch (e) {
    console.error("[performUploadNoBigSixLogo]", e);
    return {
      ok: false,
      message:
        "Wystąpił nieoczekiwany błąd serwera podczas wgrywania pliku.",
    };
  }
}

export async function performDeleteNoBigSixLogo(
  supabase: SupabaseClient,
  entryId: number,
): Promise<UploadNoBigSixLogoResult> {
  try {
    if (!Number.isFinite(entryId) || entryId < 1) {
      return { ok: false, message: "Nieprawidłowy entry_id." };
    }

    const { data: team, error: teamError } = await supabase
      .from("no_big_six_teams")
      .select("entry_id, custom_logo_url")
      .eq("entry_id", entryId)
      .maybeSingle();

    if (teamError) return { ok: false, message: teamError.message };
    if (!team) return { ok: false, message: "Nie znaleziono zespołu w bazie." };

    const fileName = fileNameFromLogoUrl(
      team.custom_logo_url != null ? String(team.custom_logo_url) : null,
    );
    if (fileName) {
      await tryUnlinkLogoFile(fileName);
    }

    const { error: updateError } = await supabase
      .from("no_big_six_teams")
      .update({ custom_logo_url: null })
      .eq("entry_id", entryId);

    if (updateError) return { ok: false, message: updateError.message };

    revalidatePath("/no-big-six");
    revalidatePath("/admin/no-big-six/logos");

    return { ok: true, message: "Herb usunięty." };
  } catch (e) {
    console.error("[performDeleteNoBigSixLogo]", e);
    return {
      ok: false,
      message: "Wystąpił nieoczekiwany błąd serwera podczas usuwania herbu.",
    };
  }
}
