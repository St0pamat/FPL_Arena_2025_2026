"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  DIVISION_CAPACITY,
  findFirstIncompleteDivisionId,
} from "@/lib/admin/divisionCapacity";
import type {
  ActionState,
  Division,
  Pyramid,
  Season,
  SeasonStatus,
  Team,
} from "@/lib/admin/types";

function revalidateAdmin() {
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/struktura");
  revalidatePath("/admin/uczestnicy");
  revalidatePath("/admin/players");
  revalidatePath("/admin/divisions");
  revalidatePath("/admin/fixture-draw");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/settings");
  revalidatePath("/na-minusie/dywizje");
}

async function requireAuth() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Brak sesji. Zaloguj się ponownie.");
  }

  return supabase;
}

// ─── Pyramids ────────────────────────────────────────────────────────────────

export async function getPyramids(): Promise<Pyramid[]> {
  const supabase = await requireAuth();
  const { data, error } = await supabase
    .from("pyramids")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("[getPyramids]", error);
    throw new Error(error.message);
  }

  return (data ?? []) as Pyramid[];
}

export async function createPyramid(name: string): Promise<ActionState>;
export async function createPyramid(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState>;
export async function createPyramid(
  nameOrPrev: string | ActionState,
  formData?: FormData,
): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    const name =
      typeof nameOrPrev === "string"
        ? nameOrPrev.trim()
        : String(formData?.get("name") ?? "").trim();

    if (!name) return { error: "Podaj nazwę piramidy (np. Anglia A)." };

    const { error } = await supabase.from("pyramids").insert({ name });
    if (error) {
      console.error("[createPyramid]", error);
      return { error: error.message };
    }

    revalidateAdmin();
    return { error: null, success: "Piramida została dodana." };
  } catch (e) {
    console.error("[createPyramid]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}

export async function deletePyramid(id: string): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    if (!id) return { error: "Brak ID piramidy." };

    const { error } = await supabase.from("pyramids").delete().eq("id", id);
    if (error) {
      console.error("[deletePyramid]", error);
      return { error: error.message };
    }

    revalidateAdmin();
    return { error: null, success: "Piramida usunięta." };
  } catch (e) {
    console.error("[deletePyramid]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}

// ─── Seasons ─────────────────────────────────────────────────────────────────

export async function getSeasons(): Promise<Season[]> {
  const supabase = await requireAuth();
  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getSeasons]", error);
    throw new Error(error.message);
  }

  const seasons = (data ?? []) as Season[];
  // Aktywne (PUBLISHED) na górze listy wyboru w imporcie / workspace
  return [...seasons].sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === "PUBLISHED" ? -1 : 1;
  });
}

export async function createSeason(name: string): Promise<ActionState>;
export async function createSeason(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState>;
export async function createSeason(
  nameOrPrev: string | ActionState,
  formData?: FormData,
): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    let name =
      typeof nameOrPrev === "string"
        ? nameOrPrev.trim()
        : String(formData?.get("name") ?? "").trim();

    if (!name && formData) {
      const { count } = await supabase
        .from("seasons")
        .select("id", { count: "exact", head: true });
      name = `Sezon ${(count ?? 0) + 1}`;
    }

    if (!name) return { error: "Podaj nazwę sezonu (np. Sezon 1)." };

    const statusRaw = formData
      ? String(formData.get("status") ?? "DRAFT").trim().toUpperCase()
      : "DRAFT";
    // DB: DRAFT | PUBLISHED (UI: Szkic / Aktywny)
    const status =
      statusRaw === "PUBLISHED" || statusRaw === "ACTIVE" ? "PUBLISHED" : "DRAFT";

    const { error } = await supabase.from("seasons").insert({
      name,
      status,
    });

    if (error) {
      console.error("[createSeason]", error);
      return { error: error.message };
    }

    revalidateAdmin();
    return {
      error: null,
      success:
        status === "PUBLISHED"
          ? "Sezon utworzony jako Aktywny (PUBLISHED)."
          : "Sezon utworzony jako Szkic (DRAFT).",
    };
  } catch (e) {
    console.error("[createSeason]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}

export async function updateSeasonStatus(
  id: string,
  status: SeasonStatus,
): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    if (!id) return { error: "Brak ID sezonu." };
    if (status !== "DRAFT" && status !== "PUBLISHED") {
      return { error: "Nieprawidłowy status." };
    }

    const { error } = await supabase.from("seasons").update({ status }).eq("id", id);
    if (error) {
      console.error("[updateSeasonStatus]", error);
      return { error: error.message };
    }

    revalidateAdmin();
    return {
      error: null,
      success: status === "PUBLISHED" ? "Sezon aktywny (PUBLISHED)." : "Sezon jako szkic (DRAFT).",
    };
  } catch (e) {
    console.error("[updateSeasonStatus]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}

export async function updateSeasonName(
  id: string,
  newName: string,
): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    if (!id) return { error: "Brak ID sezonu." };
    const name = newName.trim();
    if (!name) return { error: "Nazwa nie może być pusta." };
    if (name.length > 120) return { error: "Nazwa jest za długa (max 120)." };

    const { error } = await supabase.from("seasons").update({ name }).eq("id", id);
    if (error) {
      console.error("[updateSeasonName]", error);
      return { error: error.message };
    }

    revalidateAdmin();
    return { error: null, success: `Nazwa sezonu zmieniona na „${name}”.` };
  } catch (e) {
    console.error("[updateSeasonName]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}

export async function deleteSeason(id: string): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    if (!id) return { error: "Brak ID sezonu." };

    const { error } = await supabase.from("seasons").delete().eq("id", id);
    if (error) {
      console.error("[deleteSeason]", error);
      return { error: error.message };
    }

    revalidateAdmin();
    return { error: null, success: "Sezon usunięty (wraz z dywizjami i drużynami)." };
  } catch (e) {
    console.error("[deleteSeason]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}

// ─── Divisions ───────────────────────────────────────────────────────────────

export async function getDivisions(): Promise<Division[]> {
  const supabase = await requireAuth();
  const { data, error } = await supabase
    .from("divisions")
    .select("*, pyramids(id, name), seasons(id, name, status)")
    .order("tier", { ascending: true });

  if (error) {
    console.error("[getDivisions]", error);
    throw new Error(error.message);
  }

  return (data ?? []) as Division[];
}

export async function createDivision(input: {
  season_id: string;
  pyramid_id: string;
  name: string;
  tier: number;
  discord_webhook_url?: string | null;
}): Promise<ActionState>;
export async function createDivision(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState>;
export async function createDivision(
  inputOrPrev:
    | {
        season_id: string;
        pyramid_id: string;
        name: string;
        tier: number;
        discord_webhook_url?: string | null;
      }
    | ActionState,
  formData?: FormData,
): Promise<ActionState> {
  try {
    const supabase = await requireAuth();

    let season_id: string;
    let pyramid_id: string;
    let name: string;
    let tier: number;
    let discord_webhook_url: string | null;

    if (formData) {
      season_id = String(formData.get("season_id") ?? "").trim();
      pyramid_id = String(formData.get("pyramid_id") ?? "").trim();
      name = String(formData.get("name") ?? "").trim();
      tier = Number.parseInt(String(formData.get("tier") ?? ""), 10);
      discord_webhook_url =
        String(formData.get("discord_webhook_url") ?? "").trim() || null;
    } else {
      const input = inputOrPrev as {
        season_id: string;
        pyramid_id: string;
        name: string;
        tier: number;
        discord_webhook_url?: string | null;
      };
      season_id = input.season_id;
      pyramid_id = input.pyramid_id;
      name = input.name.trim();
      tier = input.tier;
      discord_webhook_url = input.discord_webhook_url?.trim() || null;
    }

    if (!season_id) return { error: "Wybierz sezon." };
    if (!pyramid_id) return { error: "Wybierz piramidę." };
    if (!name) return { error: "Podaj nazwę dywizji." };
    if (!Number.isFinite(tier) || tier < 1) {
      return { error: "Tier musi być liczbą całkowitą ≥ 1." };
    }
    if (discord_webhook_url && !isDiscordWebhookUrl(discord_webhook_url)) {
      return { error: "Nieprawidłowy Discord Webhook URL." };
    }

    // Zakaz nowego tieru, dopóki wyższe nie są pełne (10/10).
    const { data: siblingDivs, error: sibError } = await supabase
      .from("divisions")
      .select("id, tier, name")
      .eq("season_id", season_id)
      .eq("pyramid_id", pyramid_id)
      .order("tier", { ascending: true });
    if (sibError) return { error: sibError.message };

    const siblings = siblingDivs ?? [];
    if (siblings.some((d) => d.tier === tier)) {
      return { error: `Tier ${tier} już istnieje w tej piramidzie.` };
    }

    if (tier > 1) {
      const higher = siblings.filter((d) => d.tier < tier);
      if (higher.length === 0) {
        return {
          error: `Najpierw utwórz Tier 1 przed Tier ${tier}.`,
        };
      }
      const expectedTiers = Array.from({ length: tier - 1 }, (_, i) => i + 1);
      for (const t of expectedTiers) {
        if (!higher.some((d) => d.tier === t)) {
          return {
            error: `Brakuje Tier ${t} — twórz dywizje po kolei od góry.`,
          };
        }
      }

      const higherIds = higher.map((d) => d.id);
      const { data: teamsInHigher, error: thError } = await supabase
        .from("teams")
        .select("id, division_id, is_active")
        .in("division_id", higherIds);
      if (thError) return { error: thError.message };

      const countByDiv = new Map<string, number>();
      for (const t of teamsInHigher ?? []) {
        if (t.is_active === false || !t.division_id) continue;
        countByDiv.set(t.division_id, (countByDiv.get(t.division_id) ?? 0) + 1);
      }
      for (const d of higher) {
        const n = countByDiv.get(d.id) ?? 0;
        if (n !== DIVISION_CAPACITY) {
          return {
            error: `Nie można utworzyć Tier ${tier}: „${d.name}” (T${d.tier}) ma ${n}/${DIVISION_CAPACITY}. Najpierw uzupełnij wyższe dywizje do pełnych 10-tek.`,
          };
        }
      }
    }

    const { error } = await supabase.from("divisions").insert({
      season_id,
      pyramid_id,
      name,
      tier,
      discord_webhook_url,
    });

    if (error) {
      console.error("[createDivision]", error);
      return { error: error.message };
    }

    revalidateAdmin();
    return { error: null, success: "Dywizja została dodana." };
  } catch (e) {
    console.error("[createDivision]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}

function isDiscordWebhookUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname === "discord.com" || u.hostname === "discordapp.com";
    return u.protocol === "https:" && host && u.pathname.startsWith("/api/webhooks/");
  } catch {
    return false;
  }
}

export async function updateDivision(
  id: string,
  patch: { discord_webhook_url?: string | null; name?: string; tier?: number },
): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    if (!id) return { error: "Brak ID dywizji." };

    const payload: Record<string, unknown> = {};
    if (patch.name != null) {
      const name = patch.name.trim();
      if (!name) return { error: "Nazwa nie może być pusta." };
      payload.name = name;
    }
    if (patch.tier != null) {
      if (!Number.isFinite(patch.tier) || patch.tier < 1) {
        return { error: "Tier musi być liczbą całkowitą ≥ 1." };
      }
      payload.tier = patch.tier;
    }
    if ("discord_webhook_url" in patch) {
      const url = patch.discord_webhook_url?.trim() || null;
      if (url && !isDiscordWebhookUrl(url)) {
        return { error: "Nieprawidłowy Discord Webhook URL." };
      }
      payload.discord_webhook_url = url;
    }

    if (!Object.keys(payload).length) {
      return { error: "Brak zmian do zapisania." };
    }

    const { error } = await supabase.from("divisions").update(payload).eq("id", id);
    if (error) {
      console.error("[updateDivision]", error);
      return { error: error.message };
    }

    revalidateAdmin();
    // Hub jest force-dynamic + dane idą przez server actions — bez revalidatePath
    // (w Next 14 potrafiło chwilowo dawać 404 na /na-minusie/hub).
    return { error: null, success: "Dywizja zaktualizowana." };
  } catch (e) {
    console.error("[updateDivision]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}

export async function deleteDivision(id: string): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    if (!id) return { error: "Brak ID dywizji." };

    const { error } = await supabase.from("divisions").delete().eq("id", id);
    if (error) {
      console.error("[deleteDivision]", error);
      return { error: error.message };
    }

    revalidateAdmin();
    return { error: null, success: "Dywizja usunięta." };
  } catch (e) {
    console.error("[deleteDivision]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}

// ─── Teams ───────────────────────────────────────────────────────────────────

export async function getTeams(): Promise<Team[]> {
  const supabase = await requireAuth();
  const { data, error } = await supabase
    .from("teams")
    .select(
      "*, divisions(id, name, tier, season_id, pyramid_id, seasons(id, name, status), pyramids(id, name))",
    )
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getTeams]", error);
    throw new Error(error.message);
  }

  return (data ?? []) as Team[];
}

export async function createTeam(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    const manager_name = String(formData.get("manager_name") ?? "").trim();
    const discord_nick = String(formData.get("discord_nick") ?? "").trim();
    const fpl_id = String(formData.get("fpl_id") ?? "").trim() || null;
    const fpl_team_name = String(formData.get("fpl_team_name") ?? "").trim() || null;
    const chosen_club = String(formData.get("chosen_club") ?? "").trim();
    let division_id = String(formData.get("division_id") ?? "").trim();
    const fee_paid = formData.get("fee_paid") === "on";

    if (!manager_name) return { error: "Podaj nazwę menedżera." };
    if (!discord_nick) return { error: "Podaj nick Discord." };
    if (!chosen_club) return { error: "Podaj wybrany klub angielski." };
    if (!division_id) return { error: "Przypisz gracza do dywizji." };

    const { data: hintDiv, error: hintError } = await supabase
      .from("divisions")
      .select("id, season_id, pyramid_id, tier, name")
      .eq("id", division_id)
      .maybeSingle();
    if (hintError) return { error: hintError.message };
    if (!hintDiv) return { error: "Nie znaleziono wybranej dywizji." };

    const { data: seasonDivs, error: sdError } = await supabase
      .from("divisions")
      .select("id, tier, name")
      .eq("season_id", hintDiv.season_id)
      .eq("pyramid_id", hintDiv.pyramid_id)
      .order("tier", { ascending: true });
    if (sdError) return { error: sdError.message };

    const divList = seasonDivs ?? [];
    const divIds = divList.map((d) => d.id);
    const { data: teamsInPyramid, error: tipError } = await supabase
      .from("teams")
      .select("id, division_id, is_active")
      .in("division_id", divIds);
    if (tipError) return { error: tipError.message };

    const countByDiv = new Map<string, number>();
    for (const t of teamsInPyramid ?? []) {
      if (t.is_active === false || !t.division_id) continue;
      countByDiv.set(t.division_id, (countByDiv.get(t.division_id) ?? 0) + 1);
    }

    const firstIncomplete = findFirstIncompleteDivisionId(divList, countByDiv);
    if (firstIncomplete) {
      // Auto-kieruj do pierwszej luki od góry (nie do najniższej niepełnej).
      division_id = firstIncomplete;
    } else {
      // Wszystkie pełne — nie wolno dokładać do pełnej 10-tki.
      const n = countByDiv.get(division_id) ?? 0;
      if (n >= DIVISION_CAPACITY) {
        return {
          error: `Wszystkie dywizje mają ${DIVISION_CAPACITY}/10. Utwórz nowy tier dopiero gdy wyższe są pełne, albo zostaw gracza w poczekalni (bez dywizji).`,
        };
      }
    }

    const targetCount = countByDiv.get(division_id) ?? 0;
    if (targetCount >= DIVISION_CAPACITY) {
      return {
        error: `Dywizja jest już pełna (${DIVISION_CAPACITY}/${DIVISION_CAPACITY}).`,
      };
    }

    const { error } = await supabase.from("teams").insert({
      manager_name,
      discord_nick,
      fpl_id,
      fpl_team_name,
      chosen_club,
      division_id,
      fee_paid,
    });

    if (error) {
      console.error("[createTeam]", error);
      return { error: error.message };
    }

    const assigned = divList.find((d) => d.id === division_id);
    revalidateAdmin();
    return {
      error: null,
      success: assigned
        ? `Drużyna dodana do ${assigned.name} (T${assigned.tier}) — pierwsza luka od góry.`
        : "Drużyna została dodana.",
    };
  } catch (e) {
    console.error("[createTeam]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}

export async function deleteTeam(id: string): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    if (!id) return { error: "Brak ID drużyny." };

    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) {
      console.error("[deleteTeam]", error);
      return { error: error.message };
    }

    revalidateAdmin();
    return { error: null, success: "Drużyna usunięta." };
  } catch (e) {
    console.error("[deleteTeam]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}

export async function updateTeam(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const supabase = await requireAuth();
    const id = String(formData.get("id") ?? "").trim();
    const manager_name = String(formData.get("manager_name") ?? "").trim();
    const discord_nick = String(formData.get("discord_nick") ?? "").trim();
    const fpl_id = String(formData.get("fpl_id") ?? "").trim() || null;
    const fpl_team_name = String(formData.get("fpl_team_name") ?? "").trim() || null;
    const chosen_club = String(formData.get("chosen_club") ?? "").trim();
    const division_id = String(formData.get("division_id") ?? "").trim() || null;
    const fee_paid = formData.get("fee_paid") === "on";

    if (!id) return { error: "Brak ID drużyny." };
    if (!manager_name) return { error: "Podaj nazwę menedżera." };
    if (!discord_nick) return { error: "Podaj nick Discord." };
    if (!chosen_club) return { error: "Podaj wybrany klub angielski." };

    if (division_id) {
      const { data: targetDiv, error: tdError } = await supabase
        .from("divisions")
        .select("id, season_id, pyramid_id, tier, name")
        .eq("id", division_id)
        .maybeSingle();
      if (tdError) return { error: tdError.message };
      if (!targetDiv) return { error: "Nie znaleziono dywizji." };

      const { data: seasonDivs, error: sdError } = await supabase
        .from("divisions")
        .select("id, tier, name")
        .eq("season_id", targetDiv.season_id)
        .eq("pyramid_id", targetDiv.pyramid_id)
        .order("tier", { ascending: true });
      if (sdError) return { error: sdError.message };

      const divList = seasonDivs ?? [];
      const { data: teamsInPyramid, error: tipError } = await supabase
        .from("teams")
        .select("id, division_id, is_active")
        .in(
          "division_id",
          divList.map((d) => d.id),
        );
      if (tipError) return { error: tipError.message };

      const countByDiv = new Map<string, number>();
      for (const t of teamsInPyramid ?? []) {
        if (t.is_active === false || !t.division_id || t.id === id) continue;
        countByDiv.set(t.division_id, (countByDiv.get(t.division_id) ?? 0) + 1);
      }

      const firstIncomplete = findFirstIncompleteDivisionId(divList, countByDiv);
      if (firstIncomplete && firstIncomplete !== division_id) {
        const gap = divList.find((d) => d.id === firstIncomplete);
        return {
          error: `Najpierw uzupełnij lukę od góry: ${gap?.name ?? "wyższa dywizja"} (T${gap?.tier ?? "?"}). System nie pozwala dokładać do niższych tierów przy niepełnej wyższej lidze.`,
        };
      }

      const n = countByDiv.get(division_id) ?? 0;
      if (n >= DIVISION_CAPACITY) {
        return {
          error: `Dywizja jest już pełna (${DIVISION_CAPACITY}/${DIVISION_CAPACITY}).`,
        };
      }
    }

    const { error } = await supabase
      .from("teams")
      .update({
        manager_name,
        discord_nick,
        fpl_id,
        fpl_team_name,
        chosen_club,
        division_id,
        fee_paid,
      })
      .eq("id", id);

    if (error) {
      console.error("[updateTeam]", error);
      return { error: error.message };
    }

    revalidateAdmin();
    return { error: null, success: "Drużyna zaktualizowana." };
  } catch (e) {
    console.error("[updateTeam]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}

// ─── Bulk / CSV ──────────────────────────────────────────────────────────────

export interface BulkTeamInsert {
  division_id: string;
  manager_name: string;
  discord_nick: string;
  fpl_id: string | null;
  fpl_team_name: string | null;
  chosen_club: string;
  fee_paid: boolean;
}

/** Payload z dry-run (bez division_id) — serwer mapuje tier → division_id */
export interface BulkUpsertTeamInput {
  tier: number;
  manager_name: string;
  discord_nick: string;
  fpl_id: string;
  fpl_team_name: string;
  chosen_club: string;
  fee_paid: boolean;
}

export async function bulkCreateTeams(teams: BulkTeamInsert[]): Promise<ActionState> {
  try {
    const supabase = await requireAuth();

    if (!Array.isArray(teams) || teams.length === 0) {
      return { error: "Brak drużyn do zaimportowania." };
    }

    for (const t of teams) {
      if (!t.division_id) return { error: "Każdy rekord musi mieć division_id." };
      if (!t.manager_name?.trim()) return { error: "Brak manager_name w jednym z wierszy." };
      if (!t.discord_nick?.trim()) return { error: "Brak discord_nick w jednym z wierszy." };
      if (!t.chosen_club?.trim()) return { error: "Brak chosen_club w jednym z wierszy." };
    }

    const payload = teams.map((t) => ({
      division_id: t.division_id,
      manager_name: t.manager_name.trim(),
      discord_nick: t.discord_nick.trim(),
      fpl_id: t.fpl_id?.trim() || null,
      fpl_team_name: t.fpl_team_name?.trim() || null,
      chosen_club: t.chosen_club.trim(),
      fee_paid: Boolean(t.fee_paid),
    }));

    const { error } = await supabase.from("teams").insert(payload);

    if (error) {
      console.error("[bulkCreateTeams]", error);
      return { error: error.message };
    }

    revalidateAdmin();
    return {
      error: null,
      success: `Zaimportowano ${payload.length} drużyn.`,
    };
  } catch (e) {
    console.error("[bulkCreateTeams]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}

/**
 * Dry-run → commit: mapuje tier na division_id w sezonie×piramidzie,
 * potem UPSERT po fpl_id (update istniejącego / insert nowego).
 */
export async function bulkUpsertTeams(
  teams: BulkUpsertTeamInput[],
  seasonId: string,
  pyramidId: string,
): Promise<ActionState> {
  try {
    const supabase = await requireAuth();

    if (!seasonId || !pyramidId) {
      return { error: "Wybierz sezon i piramidę." };
    }

    if (!Array.isArray(teams) || teams.length === 0) {
      return { error: "Brak poprawnych wierszy do importu." };
    }

    const { data: divisions, error: divError } = await supabase
      .from("divisions")
      .select("id, tier")
      .eq("season_id", seasonId)
      .eq("pyramid_id", pyramidId);

    if (divError) {
      console.error("[bulkUpsertTeams] divisions:", divError);
      return { error: divError.message };
    }

    if (!divisions?.length) {
      return { error: "Brak dywizji dla wybranego sezonu i piramidy." };
    }

    const tierToDivisionId = new Map<number, string>();
    for (const d of divisions) {
      tierToDivisionId.set(d.tier, d.id);
    }

    const divisionIds = divisions.map((d) => d.id);

    const prepared: Array<{
      division_id: string;
      manager_name: string;
      discord_nick: string;
      fpl_id: string;
      fpl_team_name: string | null;
      chosen_club: string;
      fee_paid: boolean;
    }> = [];

    const mappingErrors: string[] = [];

    for (const t of teams) {
      const fpl_id = String(t.fpl_id ?? "").trim();
      if (!fpl_id) {
        mappingErrors.push("Pominięto wiersz bez FPL ID.");
        continue;
      }

      const division_id = tierToDivisionId.get(t.tier);
      if (!division_id) {
        mappingErrors.push(`FPL ID ${fpl_id}: brak dywizji Tier ${t.tier} w bazie.`);
        continue;
      }

      prepared.push({
        division_id,
        manager_name: String(t.manager_name ?? "").trim() || "Bez nazwy",
        discord_nick: String(t.discord_nick ?? "").trim() || "Bez nicku",
        fpl_id,
        fpl_team_name: String(t.fpl_team_name ?? "").trim() || null,
        chosen_club: String(t.chosen_club ?? "").trim(),
        fee_paid: Boolean(t.fee_paid),
      });
    }

    if (prepared.length === 0) {
      return {
        error:
          mappingErrors[0] ??
          "Żaden wiersz nie został zmapowany do dywizji. Sprawdź tierry w CSV vs baza.",
      };
    }

    const { data: existing, error: existingError } = await supabase
      .from("teams")
      .select("id, fpl_id")
      .in("division_id", divisionIds)
      .not("fpl_id", "is", null);

    if (existingError) {
      console.error("[bulkUpsertTeams] existing:", existingError);
      return { error: existingError.message };
    }

    const fplToId = new Map<string, string>();
    for (const row of existing ?? []) {
      if (row.fpl_id) fplToId.set(String(row.fpl_id), row.id);
    }

    const toInsert = prepared.filter((t) => !fplToId.has(t.fpl_id));
    const toUpdate = prepared.filter((t) => fplToId.has(t.fpl_id));

    let inserted = 0;
    let updated = 0;

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from("teams").insert(toInsert);
      if (insertError) {
        console.error("[bulkUpsertTeams] insert:", insertError);
        return { error: `Insert: ${insertError.message}` };
      }
      inserted = toInsert.length;
    }

    for (const t of toUpdate) {
      const id = fplToId.get(t.fpl_id)!;
      const { error: updateError } = await supabase
        .from("teams")
        .update({
          division_id: t.division_id,
          manager_name: t.manager_name,
          discord_nick: t.discord_nick,
          fpl_team_name: t.fpl_team_name,
          chosen_club: t.chosen_club,
          fee_paid: t.fee_paid,
        })
        .eq("id", id);

      if (updateError) {
        console.error("[bulkUpsertTeams] update:", updateError, t.fpl_id);
        return { error: `Update FPL ID ${t.fpl_id}: ${updateError.message}` };
      }
      updated += 1;
    }

    revalidatePath("/admin/teams");
    revalidatePath("/admin/uczestnicy");
    revalidateAdmin();

    const extra =
      mappingErrors.length > 0 ? ` · Ostrzeżenia mapowania: ${mappingErrors.length}` : "";

    return {
      error: null,
      success: `Import OK: ${inserted} nowych, ${updated} zaktualizowanych (łącznie ${prepared.length}).${extra}`,
    };
  } catch (e) {
    console.error("[bulkUpsertTeams]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd upsertu." };
  }
}

export type BulkImportPlayersResult = ActionState & {
  imported?: number;
  inserted?: number;
  updated?: number;
  skipped?: string[];
};

type ParsedBulkPlayer = {
  fpl_team_name: string;
  manager_name: string;
  fpl_id: string | null;
  previous_season_or: number | null;
  discord_nick: string;
  /** Discord Club → kolumna `chosen_club` w teams */
  chosen_club: string | null;
  lineNumber: number;
};

function normalizeDiscordKey(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseBulkPlayersPaste(raw: string): {
  rows: ParsedBulkPlayer[];
  errors: string[];
} {
  const rows: ParsedBulkPlayer[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  raw.split(/\r?\n/).forEach((line, idx) => {
    const lineNumber = idx + 1;
    const trimmed = line.trim();
    if (!trimmed) return;

    // Nagłówek z Excela / Sheets
    if (
      /fpl\s*team/i.test(trimmed) &&
      /discord/i.test(trimmed)
    ) {
      return;
    }

    // Preferuj tab (kopiuj-wklej z Excela); fallback: średnik / wiele spacji
    let parts = trimmed.split("\t").map((p) => p.trim());
    if (parts.length < 2) {
      parts = trimmed.split(/;+/).map((p) => p.trim());
    }
    if (parts.length < 2) {
      parts = trimmed.split(/ {2,}/).map((p) => p.trim());
    }
    if (parts.length < 2) {
      // Ostatnia szansa: przecinek (CSV) — ale Discord może mieć przecinki rzadko
      parts = trimmed.split(",").map((p) => p.trim());
    }

    // Format: [FPL Team] \t [FPL Manager] \t [FPL ID] \t [OR] \t [Discord Name] \t [Discord Club]
    if (parts.length < 3) {
      errors.push(
        `Wiersz ${lineNumber}: za mało kolumn (oczekiwano Team, Manager, …, Discord Name [, Discord Club]).`,
      );
      return;
    }

    const fpl_team_name = parts[0] ?? "";
    const manager_name = parts[1] ?? "";
    let fpl_id: string | null = null;
    let previous_season_or: number | null = null;
    let discord_nick = "";
    let chosen_club: string | null = null;

    if (parts.length >= 6) {
      const idRaw = (parts[2] ?? "").replace(/\s+/g, "");
      const orRaw = (parts[3] ?? "").replace(/\s+/g, "").replace(/,/g, "");
      discord_nick = parts[4] ?? "";
      // Discord Club — reszta kolumn (nazwy typu "West Ham United")
      chosen_club = parts.slice(5).join(" ").trim() || null;
      if (idRaw && /^\d+$/.test(idRaw)) fpl_id = idRaw;
      else if (idRaw) {
        errors.push(`Wiersz ${lineNumber}: FPL ID nie jest liczbą („${parts[2]}”) — pomijam ID.`);
      }
      if (orRaw && /^\d+$/.test(orRaw)) {
        previous_season_or = Math.max(1, Number.parseInt(orRaw, 10));
      }
    } else if (parts.length === 5) {
      const idRaw = (parts[2] ?? "").replace(/\s+/g, "");
      const orRaw = (parts[3] ?? "").replace(/\s+/g, "").replace(/,/g, "");
      discord_nick = parts[4] ?? "";
      if (idRaw && /^\d+$/.test(idRaw)) fpl_id = idRaw;
      else if (idRaw) {
        errors.push(`Wiersz ${lineNumber}: FPL ID nie jest liczbą („${parts[2]}”) — pomijam ID.`);
      }
      if (orRaw && /^\d+$/.test(orRaw)) {
        previous_season_or = Math.max(1, Number.parseInt(orRaw, 10));
      }
    } else if (parts.length === 4) {
      // Team, Manager, FPL ID|OR, Discord
      const mid = (parts[2] ?? "").replace(/\s+/g, "").replace(/,/g, "");
      discord_nick = parts[3] ?? "";
      if (/^\d+$/.test(mid)) fpl_id = mid;
    } else {
      // 3 kolumny: Team, Manager, Discord
      discord_nick = parts[2] ?? "";
    }

    if (!fpl_team_name) {
      errors.push(`Wiersz ${lineNumber}: brak FPL Team.`);
      return;
    }
    if (!manager_name) {
      errors.push(`Wiersz ${lineNumber}: brak FPL Manager.`);
      return;
    }
    if (!discord_nick) {
      errors.push(`Wiersz ${lineNumber}: brak Discord Name.`);
      return;
    }

    const key = normalizeDiscordKey(discord_nick);
    if (!key) {
      errors.push(`Wiersz ${lineNumber}: niepoprawny Discord Name.`);
      return;
    }
    if (seen.has(key)) {
      errors.push(`Wiersz ${lineNumber}: duplikat Discord „${discord_nick}” w wklejce — pominięty.`);
      return;
    }
    seen.add(key);

    rows.push({
      fpl_team_name,
      manager_name,
      fpl_id,
      previous_season_or,
      discord_nick,
      chosen_club,
      lineNumber,
    });
  });

  return { rows, errors };
}

/**
 * Masowy import z wklejki Excela (tab-separated):
 * FPL Team | FPL Manager | FPL ID | OR | Discord Name | Discord Club
 * Upsert po Discord Name. Discord Club → `chosen_club`.
 * Nowi gracze → division_id NULL, is_active true.
 */
export async function bulkImportPlayers(data: string): Promise<BulkImportPlayersResult> {
  try {
    const supabase = await requireAuth();
    const { rows, errors } = parseBulkPlayersPaste(data);

    if (!rows.length) {
      return {
        error:
          errors[0] ??
          "Brak poprawnych wierszy. Format: FPL Team \\t FPL Manager \\t FPL ID \\t OR \\t Discord Name \\t Discord Club",
        skipped: errors.slice(0, 20),
      };
    }

    const { data: existing, error: existingError } = await supabase
      .from("teams")
      .select("id, discord_nick, fpl_id, previous_season_or, division_id, is_active, chosen_club");

    if (existingError) {
      console.error("[bulkImportPlayers] select:", existingError);
      return {
        error: /is_active|division_id/i.test(existingError.message)
          ? "Uruchom migrację supabase/add_teams_pool_fields.sql (is_active + nullable division_id)."
          : existingError.message,
      };
    }

    const byDiscord = new Map<string, { id: string; discord_nick: string }>();
    for (const t of existing ?? []) {
      const key = normalizeDiscordKey(t.discord_nick);
      if (key && !byDiscord.has(key)) {
        byDiscord.set(key, { id: t.id, discord_nick: t.discord_nick });
      }
    }

    let inserted = 0;
    let updated = 0;
    const skipped = [...errors];

    for (const row of rows) {
      const key = normalizeDiscordKey(row.discord_nick);
      const match = byDiscord.get(key);

      if (match) {
        const patch: Record<string, unknown> = {
          manager_name: row.manager_name,
          fpl_team_name: row.fpl_team_name,
          discord_nick: row.discord_nick,
          is_active: true,
        };
        if (row.fpl_id) patch.fpl_id = row.fpl_id;
        if (row.previous_season_or != null) {
          patch.previous_season_or = row.previous_season_or;
        }
        if (row.chosen_club) {
          patch.chosen_club = row.chosen_club;
        }

        const { error: updError } = await supabase
          .from("teams")
          .update(patch)
          .eq("id", match.id);

        if (updError) {
          return {
            error: /is_active/i.test(updError.message)
              ? "Uruchom migrację supabase/add_teams_pool_fields.sql"
              : `Update „${row.discord_nick}”: ${updError.message}`,
          };
        }
        updated += 1;
      } else {
        const insertRow: Record<string, unknown> = {
          division_id: null,
          manager_name: row.manager_name,
          discord_nick: row.discord_nick,
          fpl_id: row.fpl_id,
          fpl_team_name: row.fpl_team_name,
          chosen_club: row.chosen_club || "Do wyboru",
          fee_paid: false,
          is_active: true,
        };
        if (row.previous_season_or != null) {
          insertRow.previous_season_or = row.previous_season_or;
        }

        const { data: created, error: insError } = await supabase
          .from("teams")
          .insert(insertRow)
          .select("id, discord_nick")
          .single();

        if (insError) {
          return {
            error: /division_id|null|is_active/i.test(insError.message)
              ? "Uruchom migrację supabase/add_teams_pool_fields.sql (nullable division_id + is_active)."
              : `Insert „${row.discord_nick}”: ${insError.message}`,
          };
        }
        if (created) {
          byDiscord.set(key, { id: created.id, discord_nick: created.discord_nick });
        }
        inserted += 1;
      }
    }

    revalidatePath("/admin/uczestnicy");
    revalidatePath("/admin/players");
    revalidatePath("/admin/divisions");
    revalidatePath("/admin/teams");
    revalidateAdmin();

    const imported = inserted + updated;
    const warn =
      skipped.length > 0 ? ` · Ostrzeżenia: ${skipped.length}` : "";

    return {
      error: null,
      success: `Pomyślnie zaimportowano ${imported} graczy (${inserted} nowych, ${updated} zaktualizowanych).${warn}`,
      imported,
      inserted,
      updated,
      skipped: skipped.slice(0, 25),
    };
  } catch (e) {
    console.error("[bulkImportPlayers]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd importu." };
  }
}

export async function getDivisionsForSeasonPyramid(
  seasonId: string,
  pyramidId: string,
): Promise<Division[]> {
  const supabase = await requireAuth();
  const { data, error } = await supabase
    .from("divisions")
    .select("*")
    .eq("season_id", seasonId)
    .eq("pyramid_id", pyramidId)
    .order("tier", { ascending: true });

  if (error) {
    console.error("[getDivisionsForSeasonPyramid]", error);
    throw new Error(error.message);
  }

  return (data ?? []) as Division[];
}

// ─── Danger Zone ─────────────────────────────────────────────────────────────

function normalizeWipeConfirm(value: string) {
  return value
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

/** Zeruje wyniki meczów (FPL/H2H/mediana/TB), zostawia terminarz. */
export async function clearSeasonFixtureResults(
  seasonId: string,
  confirmation: string,
): Promise<ActionState> {
  try {
    if (!seasonId) return { error: "Wybierz sezon." };
    if (normalizeWipeConfirm(confirmation) !== "POTWIERDZAM") {
      return { error: "Wpisz dokładnie: POTWIERDZAM" };
    }

    const supabase = await requireAuth();
    const { data, error } = await supabase
      .from("fixtures")
      .update(
        {
          home_fpl_points: null,
          away_fpl_points: null,
          home_h2h_points: 0,
          away_h2h_points: 0,
          home_median_bonus: 0,
          away_median_bonus: 0,
          is_finished: false,
          is_published: false,
          tiebreaker_home_goals: null,
          tiebreaker_away_goals: null,
          tiebreaker_home_goals_conceded: null,
          tiebreaker_away_goals_conceded: null,
          tiebreaker_home_bench: null,
          tiebreaker_away_bench: null,
          tiebreaker_winner_id: null,
          tiebreaker_method: null,
          tiebreaker_reason: null,
        },
        { count: "exact" },
      )
      .eq("season_id", seasonId)
      .select("id");

    if (error) {
      console.error("[clearSeasonFixtureResults]", error);
      return { error: error.message };
    }

    revalidateAdmin();
    return {
      error: null,
      success: `Wyczyszczono wyniki ${data?.length ?? 0} meczów (terminarz został).`,
    };
  } catch (e) {
    console.error("[clearSeasonFixtureResults]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}

/** Usuwa całą siatkę meczów sezonu (DELETE fixtures). */
export async function clearSeasonFixtures(
  seasonId: string,
  confirmation: string,
): Promise<ActionState> {
  try {
    if (!seasonId) return { error: "Wybierz sezon." };
    if (normalizeWipeConfirm(confirmation) !== "POTWIERDZAM") {
      return { error: "Wpisz dokładnie: POTWIERDZAM" };
    }

    const supabase = await requireAuth();
    const { data, error } = await supabase
      .from("fixtures")
      .delete()
      .eq("season_id", seasonId)
      .select("id");

    if (error) {
      console.error("[clearSeasonFixtures]", error);
      return { error: error.message };
    }

    revalidateAdmin();
    return {
      error: null,
      success: `Usunięto terminarz: ${data?.length ?? 0} meczów. Drużyny i dywizje zostały.`,
    };
  } catch (e) {
    console.error("[clearSeasonFixtures]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}

export async function clearSeasonFixtureResultsForm(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const seasonId = String(formData.get("season_id") ?? "").trim();
  const confirmation = String(formData.get("confirm") ?? "");
  const acknowledged = formData.get("acknowledge") === "on";
  if (!acknowledged) return { error: "Zaznacz checkbox potwierdzenia." };
  return clearSeasonFixtureResults(seasonId, confirmation);
}

export async function clearSeasonFixturesForm(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const seasonId = String(formData.get("season_id") ?? "").trim();
  const confirmation = String(formData.get("confirm") ?? "");
  const acknowledged = formData.get("acknowledge") === "on";
  if (!acknowledged) return { error: "Zaznacz checkbox potwierdzenia." };
  return clearSeasonFixtures(seasonId, confirmation);
}

export async function wipeLeagueData(confirmation: string): Promise<ActionState> {
  try {
    if (normalizeWipeConfirm(confirmation) !== "POTWIERDZAM") {
      return { error: "Wpisz dokładnie: POTWIERDZAM" };
    }

    const supabase = await requireAuth();

    // Kolejność: dzieci → rodzice (Auth / admin_users zostaje)
    const tables = ["fixtures", "teams", "divisions", "seasons", "pyramids"] as const;

    for (const table of tables) {
      const { error } = await supabase.from(table).delete().gte("created_at", "1970-01-01");
      if (error) {
        console.error(`[wipeLeagueData] ${table}:`, error);
        return { error: `Błąd czyszczenia ${table}: ${error.message}` };
      }
    }

    revalidateAdmin();
    return {
      error: null,
      success: "Pomyślnie wyczyszczono bazę graczy i strukturę ligową.",
    };
  } catch (e) {
    console.error("[wipeLeagueData]", e);
    return { error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}

/** Formularz HTML → działa nawet gdy client JS/hydration padnie. */
export async function wipeLeagueDataForm(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const confirmation = String(formData.get("confirm") ?? "");
  const acknowledged = formData.get("acknowledge") === "on";

  if (!acknowledged) {
    return { error: "Zaznacz checkbox potwierdzenia przed wipe." };
  }

  return wipeLeagueData(confirmation);
}
