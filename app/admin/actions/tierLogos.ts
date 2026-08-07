"use server";

import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/admin/types";
import {
  TIER_LOGO_MAX_BYTES,
  TIER_LOGOS_DIR,
  TIER_LOGOS_INDEX,
  TIER_LOGOS_UPLOAD_DIR,
  TIER_LOGOS_UPLOAD_INDEX,
  emptyTierLogosIndex,
  isBrandingLogoName,
  mergeTierLogoIndexes,
  slugifyTierName,
  tierLogoUploadPublicUrl,
  type TierLogoRecord,
  type TierLogosIndex,
} from "@/lib/admin/tierLogos";

/** Seed (git): public/tier-logos */
function seedDir() {
  return path.join(process.cwd(), "public", TIER_LOGOS_DIR);
}

function seedIndexPath() {
  return path.join(seedDir(), TIER_LOGOS_INDEX);
}

/** Runtime (produkcja): public/uploads/tier-logos */
function uploadDir() {
  return path.join(process.cwd(), "public", TIER_LOGOS_UPLOAD_DIR);
}

function uploadIndexPath() {
  return path.join(uploadDir(), TIER_LOGOS_UPLOAD_INDEX);
}

async function requireAuth() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji. Zaloguj się ponownie.");
  return supabase;
}

async function ensureUploadDir() {
  await mkdir(uploadDir(), { recursive: true });
}

async function readJsonIndex(filePath: string): Promise<TierLogosIndex> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as TierLogosIndex;
    if (!parsed?.logos || !Array.isArray(parsed.logos)) return emptyTierLogosIndex();
    return {
      version: 1,
      logos: parsed.logos,
      deletedKeys: Array.isArray(parsed.deletedKeys)
        ? parsed.deletedKeys.filter(
            (k): k is string => typeof k === "string" && k.length > 0,
          )
        : [],
    };
  } catch {
    return emptyTierLogosIndex();
  }
}

async function readSeedIndex(): Promise<TierLogosIndex> {
  return readJsonIndex(seedIndexPath());
}

async function readRuntimeIndex(): Promise<TierLogosIndex> {
  await ensureUploadDir();
  return readJsonIndex(uploadIndexPath());
}

async function writeRuntimeIndex(index: TierLogosIndex) {
  await ensureUploadDir();
  const sorted = mergeTierLogoIndexes(emptyTierLogosIndex(), {
    version: 1,
    logos: index.logos,
    deletedKeys: index.deletedKeys,
  });
  await writeFile(
    uploadIndexPath(),
    `${JSON.stringify(sorted, null, 2)}\n`,
    "utf8",
  );
}

async function safeUnlinkTierLogoFile(logo: TierLogoRecord) {
  const candidates = new Set<string>();
  const fileName = String(logo.fileName ?? "").replace(/^\/+/, "").trim();
  if (fileName && !fileName.includes("..")) {
    candidates.add(path.join(uploadDir(), fileName));
    candidates.add(path.join(seedDir(), fileName));
  }
  const publicUrl = String(logo.publicUrl ?? "").trim();
  if (publicUrl.startsWith("/") && !publicUrl.includes("..")) {
    candidates.add(
      path.join(process.cwd(), "public", ...publicUrl.replace(/^\/+/, "").split("/")),
    );
  }

  for (const filePath of candidates) {
    try {
      await unlink(filePath);
    } catch {
      /* ignore */
    }
  }
}

function revalidateTierLogoSurfaces() {
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/tier-logos");
  revalidatePath("/na-minusie");
  revalidatePath("/strefa-gracza");
}

function extFromFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".png") || file.type === "image/png") return "png";
  if (name.endsWith(".webp") || file.type === "image/webp") return "webp";
  if (name.endsWith(".gif") || file.type === "image/gif") return "gif";
  if (
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    file.type === "image/jpeg"
  ) {
    return "jpg";
  }
  return null;
}

export async function listTierLogos(): Promise<TierLogoRecord[]> {
  const [seed, runtime] = await Promise.all([readSeedIndex(), readRuntimeIndex()]);
  return mergeTierLogoIndexes(seed, runtime).logos;
}

export async function upsertTierLogo(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAuth();

    const tierName = String(formData.get("tier_name") ?? "").trim();
    const file = formData.get("logo") as File | null;

    if (!tierName || !isBrandingLogoName(tierName)) {
      return { error: "Wybierz dywizję lub The FA Ranking z listy." };
    }
    if (!file || !(file instanceof File) || file.size === 0) {
      return { error: "Wybierz plik logo." };
    }
    if (file.size > TIER_LOGO_MAX_BYTES) {
      return { error: "Plik jest za duży (max 2 MB)." };
    }

    const ext = extFromFile(file);
    if (!ext) return { error: "Dozwolone formaty: PNG, JPG, WEBP, GIF." };

    const tierKey = slugifyTierName(tierName);
    const [seed, runtime] = await Promise.all([
      readSeedIndex(),
      readRuntimeIndex(),
    ]);
    const existingRuntime = runtime.logos.find((l) => l.tierKey === tierKey);
    const existingSeed = seed.logos.find((l) => l.tierKey === tierKey);
    const hadExisting = Boolean(existingRuntime || existingSeed);

    const fileName = `${Date.now()}-${tierKey}.${ext}`;
    const abs = path.join(uploadDir(), fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await ensureUploadDir();
    await writeFile(abs, buffer);

    // Usuń tylko poprzedni upload (seed zostaje w repo / na dysku do kolejnego deployu)
    if (existingRuntime) {
      const prev = existingRuntime.fileName;
      if (prev && !prev.includes("..")) {
        try {
          await unlink(path.join(uploadDir(), prev));
        } catch {
          /* ignore */
        }
      }
      const prevUrl = String(existingRuntime.publicUrl ?? "").trim();
      if (prevUrl.startsWith("/uploads/") && !prevUrl.includes("..")) {
        try {
          await unlink(
            path.join(
              process.cwd(),
              "public",
              ...prevUrl.replace(/^\/+/, "").split("/"),
            ),
          );
        } catch {
          /* ignore */
        }
      }
    }

    const next: TierLogoRecord = {
      tierKey,
      tierName,
      fileName,
      publicUrl: tierLogoUploadPublicUrl(fileName),
      updatedAt: new Date().toISOString(),
    };

    const deletedKeys = (runtime.deletedKeys ?? []).filter((k) => k !== tierKey);
    const logos = runtime.logos.filter((l) => l.tierKey !== tierKey);
    logos.push(next);
    await writeRuntimeIndex({ version: 1, logos, deletedKeys });
    revalidateTierLogoSurfaces();

    return {
      error: null,
      success: hadExisting
        ? `Zaktualizowano logo: ${tierName}`
        : `Dodano logo: ${tierName}`,
    };
  } catch (e) {
    console.error("[upsertTierLogo]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}

export async function deleteTierLogo(tierKey: string): Promise<ActionState> {
  try {
    await requireAuth();
    if (!tierKey) return { error: "Brak klucza logo." };

    const [seed, runtime] = await Promise.all([
      readSeedIndex(),
      readRuntimeIndex(),
    ]);
    const merged = mergeTierLogoIndexes(seed, runtime);
    const existing = merged.logos.find((l) => l.tierKey === tierKey);
    if (!existing) return { error: "Nie znaleziono logo." };

    await safeUnlinkTierLogoFile(existing);

    const deletedKeys = [
      ...new Set([...(runtime.deletedKeys ?? []), tierKey]),
    ].filter(Boolean);
    await writeRuntimeIndex({
      version: 1,
      logos: runtime.logos.filter((l) => l.tierKey !== tierKey),
      deletedKeys,
    });
    revalidateTierLogoSurfaces();
    return { error: null, success: `Usunięto logo: ${existing.tierName}` };
  } catch (e) {
    console.error("[deleteTierLogo]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}
