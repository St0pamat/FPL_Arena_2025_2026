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
  clubLogoPublicUrl,
  emptyClubLogosIndex,
  findClubLogo,
  slugifyClubName,
  type ClubLogoRecord,
  type ClubLogosIndex,
} from "@/lib/admin/clubLogos";

function logosDir() {
  return path.join(process.cwd(), "public", CLUB_LOGOS_DIR);
}

function indexPath() {
  return path.join(logosDir(), CLUB_LOGOS_INDEX);
}

async function requireAuth() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji. Zaloguj się ponownie.");
  return supabase;
}

async function ensureDir() {
  await mkdir(logosDir(), { recursive: true });
}

async function readIndex(): Promise<ClubLogosIndex> {
  await ensureDir();
  try {
    const raw = await readFile(indexPath(), "utf8");
    const parsed = JSON.parse(raw) as ClubLogosIndex;
    if (!parsed?.logos || !Array.isArray(parsed.logos)) return emptyClubLogosIndex();
    return { version: 1, logos: parsed.logos };
  } catch {
    return emptyClubLogosIndex();
  }
}

async function writeIndex(index: ClubLogosIndex) {
  await ensureDir();
  const sorted = {
    version: 1 as const,
    logos: [...index.logos].sort((a, b) => a.clubName.localeCompare(b.clubName, "pl")),
  };
  await writeFile(indexPath(), `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
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
}

function extFromFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".png") || file.type === "image/png") return "png";
  if (name.endsWith(".webp") || file.type === "image/webp") return "webp";
  if (name.endsWith(".gif") || file.type === "image/gif") return "gif";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg") || file.type === "image/jpeg") return "jpg";
  return null;
}

export async function listClubLogos(): Promise<ClubLogoRecord[]> {
  const index = await readIndex();
  return index.logos;
}

export async function getClubLogoMap(): Promise<Record<string, string>> {
  const logos = await listClubLogos();
  const map: Record<string, string> = {};
  for (const logo of logos) {
    const url = clubLogoPublicUrl(logo.fileName);
    map[logo.clubKey] = url;
    map[slugifyClubName(logo.clubName)] = url;
    map[logo.clubName.toLowerCase()] = url;
  }
  return map;
}

export async function resolveClubLogoUrl(clubName: string): Promise<string | null> {
  const logos = await listClubLogos();
  const hit = findClubLogo(logos, clubName);
  return hit ? clubLogoPublicUrl(hit.fileName) : null;
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

    const index = await readIndex();
    const existing =
      index.logos.find((l) => l.clubKey === (replaceKey || clubKey)) ??
      index.logos.find((l) => l.clubKey === clubKey);

    const fileName = `${clubKey}.${ext}`;
    const abs = path.join(logosDir(), fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await ensureDir();
    await writeFile(abs, buffer);

    // Usuń stary plik przy zmianie rozszerzenia / klucza
    if (existing && existing.fileName !== fileName) {
      try {
        await unlink(path.join(logosDir(), existing.fileName));
      } catch {
        /* ignore */
      }
    }

    const next: ClubLogoRecord = {
      clubKey,
      clubName,
      fileName,
      updatedAt: new Date().toISOString(),
    };

    const logos = index.logos.filter((l) => l.clubKey !== existing?.clubKey && l.clubKey !== clubKey);
    logos.push(next);
    await writeIndex({ version: 1, logos });
    revalidateLogoSurfaces();

    return {
      error: null,
      success: existing ? `Zaktualizowano logo: ${clubName}` : `Dodano logo: ${clubName}`,
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

    const index = await readIndex();
    const existing = index.logos.find((l) => l.clubKey === clubKey);
    if (!existing) return { error: "Nie znaleziono logo." };

    try {
      await unlink(path.join(logosDir(), existing.fileName));
    } catch {
      /* plik mógł już nie istnieć */
    }

    await writeIndex({
      version: 1,
      logos: index.logos.filter((l) => l.clubKey !== clubKey),
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

    const index = await readIndex();
    const existing = index.logos.find((l) => l.clubKey === clubKey);
    if (!existing) return { error: "Nie znaleziono logo." };

    if (newKey !== clubKey && index.logos.some((l) => l.clubKey === newKey)) {
      return { error: "Logo dla tej nazwy już istnieje." };
    }

    let fileName = existing.fileName;
    if (newKey !== clubKey) {
      const ext = path.extname(existing.fileName);
      const nextName = `${newKey}${ext}`;
      const from = path.join(logosDir(), existing.fileName);
      const to = path.join(logosDir(), nextName);
      const data = await readFile(from);
      await writeFile(to, data);
      try {
        await unlink(from);
      } catch {
        /* ignore */
      }
      fileName = nextName;
    }

    const logos = index.logos.map((l) =>
      l.clubKey === clubKey
        ? {
            clubKey: newKey,
            clubName: name,
            fileName,
            updatedAt: new Date().toISOString(),
          }
        : l,
    );
    await writeIndex({ version: 1, logos });
    revalidateLogoSurfaces();
    return { error: null, success: `Zapisano nazwę: ${name}` };
  } catch (e) {
    console.error("[renameClubLogo]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}
