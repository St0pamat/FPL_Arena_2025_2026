"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_DISCORD_SERVER,
  DISCORD_SERVER_LABELS,
  DISCORD_SERVER_TARGETS,
  GLOBAL_WEBHOOK_LABELS,
  isDiscordWebhookUrl,
  parseDiscordServerTarget,
  type DiscordGlobalType,
  type DiscordServerTarget,
  type DiscordWebhookRow,
} from "@/lib/admin/discordWebhooks";
import type { ActionState } from "@/lib/admin/types";

async function requireAuth() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji. Zaloguj się ponownie.");
  return supabase;
}

function revalidateWebhooks() {
  revalidatePath("/admin/webhooks");
  revalidatePath("/admin/content-hub");
  revalidatePath("/admin/struktura");
  revalidatePath("/admin/settings");
}

function isMissingTable(message: string): boolean {
  return /discord_webhooks|does not exist|schema cache/i.test(message);
}

const MIGRATION_HINT =
  "Brak tabeli discord_webhooks albo kolumny server_target — uruchom migracje: supabase/migrations/add_discord_webhooks.sql oraz add_discord_webhooks_server_target.sql";

function mapRow(r: Record<string, unknown>): DiscordWebhookRow {
  return {
    id: String(r.id),
    scope: r.scope as DiscordWebhookRow["scope"],
    global_type: (r.global_type as DiscordGlobalType | null) ?? null,
    division_level:
      r.division_level != null ? Number(r.division_level) : null,
    server_target: parseDiscordServerTarget(
      r.server_target != null ? String(r.server_target) : null,
    ),
    url: String(r.url ?? ""),
    updated_at: r.updated_at ? String(r.updated_at) : undefined,
  };
}

export type WebhooksAdminDivisionSlot = {
  /** tier dywizji (= division_level w tabeli webhooków) */
  level: number;
  divisionId: string | null;
  divisionName: string | null;
  seasonName: string | null;
  webhookId: string | null;
  url: string;
  hasWebhook: boolean;
  /** Dywizja w sezonie bez zapisanego webhooka */
  missing: boolean;
  /** Slot webhooka bez dywizji w obecnym sezonie */
  orphan: boolean;
};

export type WebhooksAdminGlobals = {
  FA_RANKING: { id: string | null; url: string; hasWebhook: boolean };
  FA_CUP: { id: string | null; url: string; hasWebhook: boolean };
};

export type WebhooksAdminServerSlice = {
  globals: WebhooksAdminGlobals;
  divisions: WebhooksAdminDivisionSlot[];
};

export type WebhooksAdminPayload = {
  byServer: Record<DiscordServerTarget, WebhooksAdminServerSlice>;
  /** Brak sezonu / dywizji — tryb slotów poziomów */
  emptyStructure: boolean;
  maxConfiguredLevel: number;
  missingTable: boolean;
};

function emptyGlobals(): WebhooksAdminGlobals {
  return {
    FA_RANKING: { id: null, url: "", hasWebhook: false },
    FA_CUP: { id: null, url: "", hasWebhook: false },
  };
}

function emptySlice(): WebhooksAdminServerSlice {
  return { globals: emptyGlobals(), divisions: [] };
}

function emptyPayload(missingTable: boolean): WebhooksAdminPayload {
  return {
    byServer: {
      NA_MINUSIE: emptySlice(),
      FPL_ARENA: emptySlice(),
    },
    emptyStructure: true,
    maxConfiguredLevel: 0,
    missingTable,
  };
}

function buildDivisionSlots(
  liveDivisions: Array<{
    id: string;
    name: string;
    tier: number;
  }>,
  seasonName: string | null,
  byLevel: Map<number, DiscordWebhookRow>,
  emptyStructure: boolean,
): WebhooksAdminDivisionSlot[] {
  const slots: WebhooksAdminDivisionSlot[] = [];
  const seenLevels = new Set<number>();

  if (!emptyStructure) {
    for (const d of liveDivisions) {
      const wh = byLevel.get(d.tier);
      seenLevels.add(d.tier);
      slots.push({
        level: d.tier,
        divisionId: d.id,
        divisionName: d.name,
        seasonName,
        webhookId: wh?.id ?? null,
        url: wh?.url ?? "",
        hasWebhook: Boolean(wh?.url?.trim()),
        missing: !wh?.url?.trim(),
        orphan: false,
      });
    }
    for (const [level, wh] of [...byLevel.entries()].sort(
      (a, b) => a[0] - b[0],
    )) {
      if (seenLevels.has(level)) continue;
      slots.push({
        level,
        divisionId: null,
        divisionName: null,
        seasonName: null,
        webhookId: wh.id,
        url: wh.url,
        hasWebhook: Boolean(wh.url.trim()),
        missing: false,
        orphan: true,
      });
    }
    return slots;
  }

  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  const maxLevel = levels.length ? Math.max(...levels) : 0;
  const showUntil = Math.max(maxLevel, 1);
  for (let level = 1; level <= showUntil; level++) {
    const wh = byLevel.get(level);
    slots.push({
      level,
      divisionId: null,
      divisionName: null,
      seasonName: null,
      webhookId: wh?.id ?? null,
      url: wh?.url ?? "",
      hasWebhook: Boolean(wh?.url?.trim()),
      missing: !wh?.url?.trim(),
      orphan: false,
    });
  }
  return slots;
}

export async function getWebhooksAdminPayload(): Promise<WebhooksAdminPayload> {
  try {
    const supabase = await requireAuth();
    const { data: rowsRaw, error } = await supabase
      .from("discord_webhooks")
      .select(
        "id, scope, global_type, division_level, server_target, url, updated_at",
      )
      .order("division_level", { ascending: true });

    if (error) {
      if (isMissingTable(error.message)) {
        return emptyPayload(true);
      }
      throw new Error(error.message);
    }

    const rows = (rowsRaw ?? []).map((r) => mapRow(r as Record<string, unknown>));

    const { data: seasons } = await supabase
      .from("seasons")
      .select("id, name, is_archived, status, created_at")
      .order("created_at", { ascending: false });

    const activeSeason =
      (seasons ?? []).find(
        (s) => !s.is_archived && s.status === "PUBLISHED",
      ) ??
      (seasons ?? []).find((s) => !s.is_archived) ??
      null;

    let liveDivisions: Array<{
      id: string;
      name: string;
      tier: number;
      season_id: string;
    }> = [];

    if (activeSeason) {
      const { data: divs } = await supabase
        .from("divisions")
        .select("id, name, tier, season_id")
        .eq("season_id", activeSeason.id)
        .order("tier", { ascending: true });
      liveDivisions = (divs ?? []) as typeof liveDivisions;
    }

    const emptyStructure = !activeSeason || liveDivisions.length === 0;
    const seasonName = activeSeason?.name ?? null;

    const byServer = {} as Record<DiscordServerTarget, WebhooksAdminServerSlice>;

    for (const server of DISCORD_SERVER_TARGETS) {
      const globals = emptyGlobals();
      const byLevel = new Map<number, DiscordWebhookRow>();
      for (const r of rows) {
        if (r.server_target !== server) continue;
        if (r.scope === "GLOBAL" && r.global_type) {
          globals[r.global_type] = {
            id: r.id,
            url: r.url,
            hasWebhook: Boolean(r.url.trim()),
          };
        }
        if (r.scope === "DIVISION" && r.division_level != null) {
          byLevel.set(r.division_level, r);
        }
      }
      byServer[server] = {
        globals,
        divisions: buildDivisionSlots(
          liveDivisions,
          seasonName,
          byLevel,
          emptyStructure,
        ),
      };
    }

    const maxConfiguredLevel = Math.max(
      0,
      ...DISCORD_SERVER_TARGETS.flatMap((s) =>
        byServer[s].divisions.map((d) => d.level),
      ),
    );

    return {
      byServer,
      emptyStructure,
      maxConfiguredLevel,
      missingTable: false,
    };
  } catch (e) {
    console.error("[getWebhooksAdminPayload]", e);
    return emptyPayload(false);
  }
}

/** Upsert GLOBAL FA_RANKING / FA_CUP (pusty url = delete). */
export async function upsertGlobalWebhook(
  globalType: DiscordGlobalType,
  url: string,
  serverTarget: DiscordServerTarget = DEFAULT_DISCORD_SERVER,
): Promise<ActionState> {
  try {
    const server = parseDiscordServerTarget(serverTarget);
    const supabase = await requireAuth();
    const trimmed = url.trim();
    if (trimmed && !isDiscordWebhookUrl(trimmed)) {
      return {
        error: `Nieprawidłowy Discord Webhook URL (${GLOBAL_WEBHOOK_LABELS[globalType]} · ${DISCORD_SERVER_LABELS[server]}).`,
      };
    }

    const { data: existing } = await supabase
      .from("discord_webhooks")
      .select("id")
      .eq("scope", "GLOBAL")
      .eq("global_type", globalType)
      .eq("server_target", server)
      .maybeSingle();

    if (!trimmed) {
      if (existing?.id) {
        const { error } = await supabase
          .from("discord_webhooks")
          .delete()
          .eq("id", existing.id);
        if (error) {
          if (isMissingTable(error.message)) {
            return { error: MIGRATION_HINT };
          }
          return { error: error.message };
        }
      }
      revalidateWebhooks();
      return {
        error: null,
        success: `Usunięto webhook ${GLOBAL_WEBHOOK_LABELS[globalType]} · ${DISCORD_SERVER_LABELS[server]}.`,
      };
    }

    if (existing?.id) {
      const { error } = await supabase
        .from("discord_webhooks")
        .update({ url: trimmed, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("discord_webhooks").insert({
        scope: "GLOBAL",
        global_type: globalType,
        division_level: null,
        server_target: server,
        url: trimmed,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        if (isMissingTable(error.message)) {
          return { error: MIGRATION_HINT };
        }
        return { error: error.message };
      }
    }

    revalidateWebhooks();
    return {
      error: null,
      success: `Zapisano webhook ${GLOBAL_WEBHOOK_LABELS[globalType]} · ${DISCORD_SERVER_LABELS[server]}.`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Błąd zapisu webhooka." };
  }
}

/** Upsert DIVISION po level (= tier). Pusty url = delete. */
export async function upsertDivisionLevelWebhook(
  level: number,
  url: string,
  serverTarget: DiscordServerTarget = DEFAULT_DISCORD_SERVER,
): Promise<ActionState> {
  try {
    if (!Number.isInteger(level) || level < 1) {
      return { error: "Nieprawidłowy poziom dywizji." };
    }
    const server = parseDiscordServerTarget(serverTarget);
    const supabase = await requireAuth();
    const trimmed = url.trim();
    if (trimmed && !isDiscordWebhookUrl(trimmed)) {
      return {
        error: `Nieprawidłowy Discord Webhook URL (Level ${level} · ${DISCORD_SERVER_LABELS[server]}).`,
      };
    }

    const { data: existing } = await supabase
      .from("discord_webhooks")
      .select("id")
      .eq("scope", "DIVISION")
      .eq("division_level", level)
      .eq("server_target", server)
      .maybeSingle();

    if (!trimmed) {
      if (existing?.id) {
        const { error } = await supabase
          .from("discord_webhooks")
          .delete()
          .eq("id", existing.id);
        if (error) {
          if (isMissingTable(error.message)) {
            return { error: MIGRATION_HINT };
          }
          return { error: error.message };
        }
      }
      revalidateWebhooks();
      return {
        error: null,
        success: `Usunięto webhook Level ${level} · ${DISCORD_SERVER_LABELS[server]}.`,
      };
    }

    if (existing?.id) {
      const { error } = await supabase
        .from("discord_webhooks")
        .update({ url: trimmed, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("discord_webhooks").insert({
        scope: "DIVISION",
        global_type: null,
        division_level: level,
        server_target: server,
        url: trimmed,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        if (isMissingTable(error.message)) {
          return { error: MIGRATION_HINT };
        }
        return { error: error.message };
      }
    }

    revalidateWebhooks();
    return {
      error: null,
      success: `Zapisano webhook Level ${level} · ${DISCORD_SERVER_LABELS[server]}.`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Błąd zapisu webhooka." };
  }
}

/** Dodaje pusty slot kolejnego poziomu (tylko gdy struktura pusta / orphan mode). */
export async function ensureNextDivisionLevelSlot(
  currentMax: number,
): Promise<ActionState & { level?: number }> {
  const next = Math.max(0, currentMax) + 1;
  if (next > 20) return { error: "Maksymalnie 20 poziomów webhooków." };
  return {
    error: null,
    success: `Dodaj URL dla Level ${next} i zapisz.`,
    level: next,
  };
}

/** Resolve URL po level (tier dywizji). */
export async function resolveDivisionWebhookByLevel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  level: number,
  serverTarget: DiscordServerTarget = DEFAULT_DISCORD_SERVER,
): Promise<{ url: string } | { error: string }> {
  const server = parseDiscordServerTarget(serverTarget);
  const { data, error } = await supabase
    .from("discord_webhooks")
    .select("url")
    .eq("scope", "DIVISION")
    .eq("division_level", level)
    .eq("server_target", server)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error.message)) {
      return { error: MIGRATION_HINT };
    }
    return { error: error.message };
  }
  const url = String(data?.url ?? "").trim();
  if (!url) {
    return {
      error: `Brak webhooka dla Level ${level} · ${DISCORD_SERVER_LABELS[server]} — ustaw w adminie → Webhooki Discord.`,
    };
  }
  return { url };
}

/** Resolve URL po divisionId → tier → discord_webhooks. */
export async function resolveDivisionWebhookById(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  divisionId: string,
  serverTarget: DiscordServerTarget = DEFAULT_DISCORD_SERVER,
): Promise<{ url: string; label: string; tier: number } | { error: string }> {
  const { data: division, error } = await supabase
    .from("divisions")
    .select("id, name, tier")
    .eq("id", divisionId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!division) return { error: "Nie znaleziono dywizji." };

  const tier = Number(division.tier);
  const resolved = await resolveDivisionWebhookByLevel(
    supabase,
    tier,
    serverTarget,
  );
  if ("error" in resolved) return resolved;
  return {
    url: resolved.url,
    label: String(division.name),
    tier,
  };
}

export async function resolveGlobalWebhook(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  globalType: DiscordGlobalType,
  serverTarget: DiscordServerTarget = DEFAULT_DISCORD_SERVER,
): Promise<{ url: string; label: string } | { error: string }> {
  const server = parseDiscordServerTarget(serverTarget);
  const label = `${GLOBAL_WEBHOOK_LABELS[globalType]} · ${DISCORD_SERVER_LABELS[server]}`;
  const { data, error } = await supabase
    .from("discord_webhooks")
    .select("url")
    .eq("scope", "GLOBAL")
    .eq("global_type", globalType)
    .eq("server_target", server)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error.message)) {
      return { error: MIGRATION_HINT };
    }
    return { error: error.message };
  }
  const url = String(data?.url ?? "").trim();
  if (!url) {
    return {
      error: `Brak webhooka „${label}” — ustaw w adminie → Webhooki Discord.`,
    };
  }
  return { url, label };
}

export async function hasGlobalWebhook(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  globalType: DiscordGlobalType,
  serverTarget: DiscordServerTarget = DEFAULT_DISCORD_SERVER,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("discord_webhooks")
    .select("url")
    .eq("scope", "GLOBAL")
    .eq("global_type", globalType)
    .eq("server_target", parseDiscordServerTarget(serverTarget))
    .maybeSingle();
  if (error) return false;
  return Boolean(String(data?.url ?? "").trim());
}

export async function hasDivisionLevelWebhook(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  level: number,
  serverTarget: DiscordServerTarget = DEFAULT_DISCORD_SERVER,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("discord_webhooks")
    .select("url")
    .eq("scope", "DIVISION")
    .eq("division_level", level)
    .eq("server_target", parseDiscordServerTarget(serverTarget))
    .maybeSingle();
  if (error) return false;
  return Boolean(String(data?.url ?? "").trim());
}

export async function listDivisionWebhookLevels(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  serverTarget: DiscordServerTarget = DEFAULT_DISCORD_SERVER,
): Promise<Set<number>> {
  const { data, error } = await supabase
    .from("discord_webhooks")
    .select("division_level")
    .eq("scope", "DIVISION")
    .eq("server_target", parseDiscordServerTarget(serverTarget));
  if (error) return new Set();
  return new Set(
    (data ?? [])
      .map((r: { division_level: number | null }) => Number(r.division_level))
      .filter((n: number) => Number.isFinite(n) && n >= 1),
  );
}

export async function listDivisionWebhookLevelsByServer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<Record<DiscordServerTarget, Set<number>>> {
  const out: Record<DiscordServerTarget, Set<number>> = {
    NA_MINUSIE: new Set(),
    FPL_ARENA: new Set(),
  };
  const { data, error } = await supabase
    .from("discord_webhooks")
    .select("division_level, server_target")
    .eq("scope", "DIVISION");
  if (error) return out;
  for (const row of data ?? []) {
    const server = parseDiscordServerTarget(
      row.server_target != null ? String(row.server_target) : null,
    );
    const level = Number(row.division_level);
    if (Number.isFinite(level) && level >= 1) out[server].add(level);
  }
  return out;
}
