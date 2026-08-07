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
  emptyTierLogosIndex,
  isBrandingLogoName,
  slugifyTierName,
  type TierLogoRecord,
  type TierLogosIndex,
} from "@/lib/admin/tierLogos";

function logosDir() {
  return path.join(process.cwd(), "public", TIER_LOGOS_DIR);
}

function indexPath() {
  return path.join(logosDir(), TIER_LOGOS_INDEX);
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

async function readIndex(): Promise<TierLogosIndex> {
  await ensureDir();
  try {
    const raw = await readFile(indexPath(), "utf8");
    const parsed = JSON.parse(raw) as TierLogosIndex;
    if (!parsed?.logos || !Array.isArray(parsed.logos)) return emptyTierLogosIndex();
    return { version: 1, logos: parsed.logos };
  } catch {
    return emptyTierLogosIndex();
  }
}

async function writeIndex(index: TierLogosIndex) {
  await ensureDir();
  const order = new Map(
    [
      "premier-division",
      "championship",
      "league-one",
      "league-two",
      "national-league",
      "the-fa-ranking",
    ].map((k, i) => [k, i]),
  );
  const sorted = {
    version: 1 as const,
    logos: [...index.logos].sort(
      (a, b) => (order.get(a.tierKey) ?? 99) - (order.get(b.tierKey) ?? 99),
    ),
  };
  await writeFile(indexPath(), `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
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
  if (name.endsWith(".jpg") || name.endsWith(".jpeg") || file.type === "image/jpeg") return "jpg";
  return null;
}

export async function listTierLogos(): Promise<TierLogoRecord[]> {
  const index = await readIndex();
  return index.logos;
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
    const index = await readIndex();
    const existing = index.logos.find((l) => l.tierKey === tierKey);

    const fileName = `${tierKey}.${ext}`;
    const abs = path.join(logosDir(), fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await ensureDir();
    await writeFile(abs, buffer);

    if (existing && existing.fileName !== fileName) {
      try {
        await unlink(path.join(logosDir(), existing.fileName));
      } catch {
        /* ignore */
      }
    }

    const next: TierLogoRecord = {
      tierKey,
      tierName,
      fileName,
      updatedAt: new Date().toISOString(),
    };

    const logos = index.logos.filter((l) => l.tierKey !== tierKey);
    logos.push(next);
    await writeIndex({ version: 1, logos });
    revalidateTierLogoSurfaces();

    return {
      error: null,
      success: existing ? `Zaktualizowano logo: ${tierName}` : `Dodano logo: ${tierName}`,
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

    const index = await readIndex();
    const existing = index.logos.find((l) => l.tierKey === tierKey);
    if (!existing) return { error: "Nie znaleziono logo." };

    try {
      await unlink(path.join(logosDir(), existing.fileName));
    } catch {
      /* ignore */
    }

    await writeIndex({
      version: 1,
      logos: index.logos.filter((l) => l.tierKey !== tierKey),
    });
    revalidateTierLogoSurfaces();
    return { error: null, success: `Usunięto logo: ${existing.tierName}` };
  } catch (e) {
    console.error("[deleteTierLogo]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}
