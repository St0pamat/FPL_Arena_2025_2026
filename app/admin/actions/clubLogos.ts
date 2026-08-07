"use server";

import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/admin/types";
import {
  CLUB_LOGO_MAX_BYTES,
  CLUB_LOGOS_DIR,
  CLUB_LOGOS_INDEX,
  CLUB_LOGOS_UPLOAD_DIR,
  CLUB_LOGOS_UPLOAD_INDEX,
  clubLogoUploadPublicUrl,
  emptyClubLogosIndex,
  findClubLogo,
  mergeClubLogoIndexes,
  resolveClubLogoSrc,
  sanitizeUploadBaseName,
  slugifyClubName,
  type ClubLogoRecord,
  type ClubLogosIndex,
} from "@/lib/admin/clubLogos";

/** Seed (git): public/club-logos */
function seedDir() {
  return path.join(process.cwd(), "public", CLUB_LOGOS_DIR);
}

function seedIndexPath() {
  return path.join(seedDir(), CLUB_LOGOS_INDEX);
}

/** Runtime (produkcja): public/uploads/logos — process.cwd(), nie __dirname */
function uploadDir() {
  return path.join(process.cwd(), "public", CLUB_LOGOS_UPLOAD_DIR);
}

function uploadIndexPath() {
  return path.join(uploadDir(), CLUB_LOGOS_UPLOAD_INDEX);
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

async function readJsonIndex(filePath: string): Promise<ClubLogosIndex> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as ClubLogosIndex;
    if (!parsed?.logos || !Array.isArray(parsed.logos)) return emptyClubLogosIndex();
    return { version: 1, logos: parsed.logos };
  } catch {
    return emptyClubLogosIndex();
  }
}

async function readSeedIndex(): Promise<ClubLogosIndex> {
  return readJsonIndex(seedIndexPath());
}

async function readRuntimeIndex(): Promise<ClubLogosIndex> {
  await ensureUploadDir();
  return readJsonIndex(uploadIndexPath());
}

async function writeRuntimeIndex(index: ClubLogosIndex) {
  await ensureUploadDir();
  const sorted: ClubLogosIndex = {
    version: 1,
    logos: [...index.logos].sort((a, b) => a.clubName.localeCompare(b.clubName, "pl")),
  };
  await writeFile(uploadIndexPath(), `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
}

async function readMergedIndex(): Promise<ClubLogosIndex> {
  const [seed, runtime] = await Promise.all([readSeedIndex(), readRuntimeIndex()]);
  return mergeClubLogoIndexes(seed, runtime);
}

function revalidateLogoSurfaces() {
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/club-logos");
  revalidatePath("/admin/logos");
  revalidatePath("/admin/teams");
  revalidatePath("/admin/uczestnicy");
  revalidatePath("/admin/struktura");
  revalidatePath("/admin/fixture-draw");
  revalidatePath("/na-minusie");
  revalidatePath("/strefa-gracza");
}

function extFromFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".png") || file.type === "image/png") return "png";
  if (name.endsWith(".webp") || file.type === "image/webp") return "webp";
  if (name.endsWith(".gif") || file.type === "image/gif") return "gif";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg") || file.type === "image/jpeg") {
    return "jpg";
  }
  return null;
}

export async function listClubLogos(): Promise<ClubLogoRecord[]> {
  const index = await readMergedIndex();
  return index.logos;
}

export async function getClubLogoMap(): Promise<Record<string, string>> {
  const logos = await listClubLogos();
  const map: Record<string, string> = {};
  for (const logo of logos) {
    const url = resolveClubLogoSrc(logo);
    map[logo.clubKey] = url;
    map[slugifyClubName(logo.clubName)] = url;
    map[logo.clubName.toLowerCase()] = url;
  }
  return map;
}

export async function resolveClubLogoUrl(clubName: string): Promise<string | null> {
  const logos = await listClubLogos();
  const hit = findClubLogo(logos, clubName);
  return hit ? resolveClubLogoSrc(hit) : null;
}

export async function upsertClubLogo(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAuth();

    const clubName = String(formData.get("club_name") ?? "").trim();
    const file = formData.get("logo") as File | null;
    const replaceKey = String(formData.get("replace_key") ?? "").trim();

    if (!clubName) return { error: "Podaj nazwę klubu (np. Chelsea)." };
    if (!file || !(file instanceof File) || file.size === 0) {
      return { error: "Wybierz plik logo." };
    }
    if (file.size > CLUB_LOGO_MAX_BYTES) {
      return { error: "Plik jest za duży (max 2 MB)." };
    }

    const ext = extFromFile(file);
    if (!ext) return { error: "Dozwolone formaty: PNG, JPG, WEBP, GIF." };

    const clubKey = slugifyClubName(clubName);
    if (!clubKey) return { error: "Niepoprawna nazwa klubu." };

    const runtime = await readRuntimeIndex();
    const seed = await readSeedIndex();
    const existingRuntime =
      runtime.logos.find((l) => l.clubKey === (replaceKey || clubKey)) ??
      runtime.logos.find((l) => l.clubKey === clubKey);
    const existingSeed =
      seed.logos.find((l) => l.clubKey === (replaceKey || clubKey)) ??
      seed.logos.find((l) => l.clubKey === clubKey);

    const cleanBase = sanitizeUploadBaseName(clubKey);
    const uniqueFileName = `${Date.now()}-${cleanBase}.${ext}`;
    const abs = path.join(uploadDir(), uniqueFileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await ensureUploadDir();
    await writeFile(abs, buffer);

    // Usuń poprzedni plik runtime (seed w git zostawiamy)
    if (existingRuntime?.fileName && existingRuntime.fileName !== uniqueFileName) {
      try {
        await unlink(path.join(uploadDir(), existingRuntime.fileName));
      } catch {
        /* ignore */
      }
    }

    const publicUrl = clubLogoUploadPublicUrl(uniqueFileName);
    const next: ClubLogoRecord = {
      clubKey,
      clubName,
      fileName: uniqueFileName,
      publicUrl,
      updatedAt: new Date().toISOString(),
    };

    const logos = runtime.logos.filter(
      (l) => l.clubKey !== existingRuntime?.clubKey && l.clubKey !== clubKey,
    );
    logos.push(next);
    await writeRuntimeIndex({ version: 1, logos });
    revalidateLogoSurfaces();

    const replaced = Boolean(existingRuntime || existingSeed);
    return {
      error: null,
      success: replaced
        ? `Zaktualizowano logo: ${clubName}`
        : `Dodano logo: ${clubName}`,
    };
  } catch (e) {
    console.error("[upsertClubLogo]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}

export async function deleteClubLogo(clubKey: string): Promise<ActionState> {
  try {
    await requireAuth();
    if (!clubKey) return { error: "Brak klucza logo." };

    const runtime = await readRuntimeIndex();
    const existing = runtime.logos.find((l) => l.clubKey === clubKey);
    if (!existing) {
      const seed = await readSeedIndex();
      if (seed.logos.some((l) => l.clubKey === clubKey)) {
        return {
          error:
            "To logo jest w repozytorium (public/club-logos). Usuń je lokalnie i wypchnij na git — nie da się skasować z panelu na produkcji.",
        };
      }
      return { error: "Nie znaleziono logo." };
    }

    try {
      await unlink(path.join(uploadDir(), existing.fileName));
    } catch {
      /* plik mógł już nie istnieć */
    }

    await writeRuntimeIndex({
      version: 1,
      logos: runtime.logos.filter((l) => l.clubKey !== clubKey),
    });
    revalidateLogoSurfaces();
    return { error: null, success: `Usunięto logo: ${existing.clubName}` };
  } catch (e) {
    console.error("[deleteClubLogo]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}

export async function renameClubLogo(
  clubKey: string,
  newClubName: string,
): Promise<ActionState> {
  try {
    await requireAuth();
    const name = newClubName.trim();
    if (!clubKey) return { error: "Brak klucza logo." };
    if (!name) return { error: "Podaj nową nazwę klubu." };

    const newKey = slugifyClubName(name);
    if (!newKey) return { error: "Niepoprawna nazwa klubu." };

    const runtime = await readRuntimeIndex();
    const existing = runtime.logos.find((l) => l.clubKey === clubKey);
    if (!existing) {
      return {
        error:
          "Zmiana nazwy dotyczy tylko logo wgranych na serwer (uploads). Seed z gita edytuj lokalnie.",
      };
    }

    const merged = await readMergedIndex();
    if (newKey !== clubKey && merged.logos.some((l) => l.clubKey === newKey)) {
      return { error: "Logo dla tej nazwy już istnieje." };
    }

    let fileName = existing.fileName;
    let publicUrl = existing.publicUrl ?? clubLogoUploadPublicUrl(existing.fileName);

    if (newKey !== clubKey) {
      const ext = path.extname(existing.fileName) || ".png";
      const nextName = `${Date.now()}-${sanitizeUploadBaseName(newKey)}${ext}`;
      const from = path.join(uploadDir(), existing.fileName);
      const to = path.join(uploadDir(), nextName);
      const data = await readFile(from);
      await writeFile(to, data);
      try {
        await unlink(from);
      } catch {
        /* ignore */
      }
      fileName = nextName;
      publicUrl = clubLogoUploadPublicUrl(nextName);
    }

    const logos = runtime.logos.map((l) =>
      l.clubKey === clubKey
        ? {
            clubKey: newKey,
            clubName: name,
            fileName,
            publicUrl,
            updatedAt: new Date().toISOString(),
          }
        : l,
    );
    await writeRuntimeIndex({ version: 1, logos });
    revalidateLogoSurfaces();
    return { error: null, success: `Zapisano nazwę: ${name}` };
  } catch (e) {
    console.error("[renameClubLogo]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}
