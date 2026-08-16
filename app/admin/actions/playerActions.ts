"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DIVISION_CAPACITY } from "@/lib/admin/divisionCapacity";
import type { ActionState } from "@/lib/admin/types";

export type PlayerFormInput = {
  manager_name: string;
  fpl_team_name?: string | null;
  fpl_id?: string | null;
  discord_nick: string;
  x_com?: string | null;
  email?: string | null;
  previous_season_or?: number | null;
  status?: string;
  chosen_club: string;
  /** null = pula bez dywizji */
  division_id: string | null;
};

async function requireAuth() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji. Zaloguj się ponownie.");
  return supabase;
}

function revalidatePlayers() {
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/players");
  revalidatePath("/admin/uczestnicy");
  revalidatePath("/admin/teams");
  revalidatePath("/admin/struktura");
  revalidatePath("/admin/fixture-draw");
  revalidatePath("/na-minusie/dywizje");
}

function parseIsActive(statusRaw: string): boolean {
  const s = statusRaw.trim().toLowerCase();
  if (!s) return true;
  if (
    /^nieaktyw/i.test(s) ||
    s === "inactive" ||
    s === "0" ||
    s === "nie" ||
    s === "no"
  ) {
    return false;
  }
  return true;
}

function normalizePayload(data: PlayerFormInput) {
  const manager_name = String(data.manager_name ?? "").trim();
  const discord_nick = String(data.discord_nick ?? "").trim();
  const chosen_club = String(data.chosen_club ?? "").trim();
  const fpl_team_name = String(data.fpl_team_name ?? "").trim() || null;
  const fpl_idRaw = String(data.fpl_id ?? "").trim();
  const fpl_id = fpl_idRaw || null;
  const x_com = String(data.x_com ?? "").trim() || null;
  const email = String(data.email ?? "").trim() || null;
  const status = String(data.status ?? "").trim() || "Aktywny";
  const is_active = parseIsActive(status);
  const division_id = data.division_id?.trim() || null;

  let previous_season_or: number | null = null;
  if (
    data.previous_season_or != null &&
    Number.isFinite(data.previous_season_or) &&
    data.previous_season_or > 0
  ) {
    previous_season_or = Math.floor(data.previous_season_or);
  }

  return {
    manager_name,
    discord_nick,
    chosen_club,
    fpl_team_name,
    fpl_id,
    x_com,
    email,
    status,
    is_active,
    previous_season_or,
    division_id,
  };
}

function stripOptionalTeamColumns(p: Record<string, unknown>, msg: string) {
  let changed = false;
  if (/x_com/i.test(msg)) {
    delete p.x_com;
    changed = true;
  }
  if (/email/i.test(msg)) {
    delete p.email;
    changed = true;
  }
  if (/\bstatus\b/i.test(msg)) {
    delete p.status;
    changed = true;
  }
  if (/previous_season_or/i.test(msg)) {
    delete p.previous_season_or;
    changed = true;
  }
  if (/is_active/i.test(msg)) {
    delete p.is_active;
    changed = true;
  }
  return changed;
}

async function assertDivisionCapacity(
  supabase: Awaited<ReturnType<typeof requireAuth>>,
  divisionId: string,
  excludeTeamId?: string,
): Promise<{ error: string } | null> {
  const { count, error } = await supabase
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("division_id", divisionId)
    .neq("is_active", false);

  if (error) return { error: error.message };

  // count with exclude: fetch ids if needed
  let n = count ?? 0;
  if (excludeTeamId) {
    const { data, error: listError } = await supabase
      .from("teams")
      .select("id")
      .eq("division_id", divisionId)
      .neq("is_active", false);
    if (listError) return { error: listError.message };
    n = (data ?? []).filter((t) => t.id !== excludeTeamId).length;
  }

  if (n >= DIVISION_CAPACITY) {
    return {
      error: `Dywizja jest już pełna (${DIVISION_CAPACITY}/${DIVISION_CAPACITY}).`,
    };
  }
  return null;
}

/** Dodaje gracza do wskazanej dywizji (bez auto-przekierowania do innej ligi). */
export async function createPlayer(data: PlayerFormInput): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    const payload = normalizePayload(data);

    if (!payload.manager_name) return { error: "Podaj FPL Manager." };
    if (!payload.discord_nick) return { error: "Podaj Discord Name." };
    if (!payload.chosen_club) return { error: "Podaj nazwę klubu." };
    if (!payload.division_id) {
      return { error: "Wybierz dywizję docelową." };
    }

    const cap = await assertDivisionCapacity(supabase, payload.division_id);
    if (cap) return cap;

    const insertPayload: Record<string, unknown> = {
      ...payload,
      fee_paid: false,
    };

    let { error } = await supabase.from("teams").insert(insertPayload);
    if (error && stripOptionalTeamColumns(insertPayload, error.message)) {
      ({ error } = await supabase.from("teams").insert(insertPayload));
    }
    if (error) {
      console.error("[createPlayer]", error);
      return { error: error.message };
    }

    revalidatePlayers();
    return { error: null, success: "Gracz został dodany." };
  } catch (e) {
    console.error("[createPlayer]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}

export async function updatePlayer(
  id: string,
  data: PlayerFormInput,
): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    if (!id.trim()) return { error: "Brak ID gracza." };

    const payload = normalizePayload(data);
    if (!payload.manager_name) return { error: "Podaj FPL Manager." };
    if (!payload.discord_nick) return { error: "Podaj Discord Name." };
    if (!payload.chosen_club) return { error: "Podaj nazwę klubu." };

    if (payload.division_id) {
      const cap = await assertDivisionCapacity(
        supabase,
        payload.division_id,
        id,
      );
      if (cap) return cap;
    }

    const updatePayload: Record<string, unknown> = { ...payload };

    let { error } = await supabase
      .from("teams")
      .update(updatePayload)
      .eq("id", id);
    if (error && stripOptionalTeamColumns(updatePayload, error.message)) {
      ({ error } = await supabase
        .from("teams")
        .update(updatePayload)
        .eq("id", id));
    }
    if (error) {
      console.error("[updatePlayer]", error);
      return { error: error.message };
    }

    revalidatePlayers();
    return { error: null, success: "Gracz zaktualizowany." };
  } catch (e) {
    console.error("[updatePlayer]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}

export async function deletePlayer(id: string): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    if (!id.trim()) return { error: "Brak ID gracza." };

    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) {
      console.error("[deletePlayer]", error);
      return { error: error.message };
    }

    revalidatePlayers();
    return { error: null, success: "Gracz usunięty." };
  } catch (e) {
    console.error("[deletePlayer]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}
