"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
  revalidatePath("/admin/fixture-draw");
  revalidatePath("/admin/dashboard");
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

  return (data ?? []) as Season[];
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
    const name =
      typeof nameOrPrev === "string"
        ? nameOrPrev.trim()
        : String(formData?.get("name") ?? "").trim();

    if (!name) return { error: "Podaj nazwę sezonu (np. Jesień 2026)." };

    const { error } = await supabase.from("seasons").insert({
      name,
      status: "DRAFT",
    });

    if (error) {
      console.error("[createSeason]", error);
      return { error: error.message };
    }

    revalidateAdmin();
    return { error: null, success: "Sezon utworzony jako Szkic (DRAFT)." };
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
      success: status === "PUBLISHED" ? "Sezon opublikowany." : "Sezon wrócił do szkicu.",
    };
  } catch (e) {
    console.error("[updateSeasonStatus]", e);
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
    .select("*")
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
    .select("*, divisions(id, name, tier, season_id, pyramid_id)")
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
    const division_id = String(formData.get("division_id") ?? "").trim();
    const fee_paid = formData.get("fee_paid") === "on";

    if (!manager_name) return { error: "Podaj nazwę menedżera." };
    if (!discord_nick) return { error: "Podaj nick Discord." };
    if (!chosen_club) return { error: "Podaj wybrany klub angielski." };
    if (!division_id) return { error: "Przypisz gracza do dywizji." };

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

    revalidateAdmin();
    return { error: null, success: "Drużyna została dodana." };
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
    const division_id = String(formData.get("division_id") ?? "").trim();
    const fee_paid = formData.get("fee_paid") === "on";

    if (!id) return { error: "Brak ID drużyny." };
    if (!manager_name) return { error: "Podaj nazwę menedżera." };
    if (!discord_nick) return { error: "Podaj nick Discord." };
    if (!chosen_club) return { error: "Podaj wybrany klub angielski." };
    if (!division_id) return { error: "Przypisz gracza do dywizji." };

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
    return { error: null, success: "Baza ligi wyczyszczona. Konta adminów zachowane." };
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
