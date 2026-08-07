"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateBergerFixtures, shuffleInPlace } from "@/lib/admin/berger";
import {
  MASTER_IMPORT_AUTO_SEASON,
} from "@/lib/admin/constants";
import { DIVISION_CAPACITY } from "@/lib/admin/divisionCapacity";
import { REGULAR_MAX_GAMEWEEK } from "@/lib/public/season";
import type { ActionState, Division, Pyramid, Team } from "@/lib/admin/types";

async function requireAuth() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji. Zaloguj się ponownie.");
  return supabase;
}

function revalidateMaster() {
  revalidatePath("/admin/players");
  revalidatePath("/admin/uczestnicy");
  revalidatePath("/admin/workspace");
  revalidatePath("/admin/fixture-draw");
  revalidatePath("/admin/struktura");
  revalidatePath("/na-minusie/dywizje");
  revalidatePath("/admin", "layout");
}

function normalizeKey(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseOptionalInt(raw: string): number | null {
  const cleaned = raw.replace(/\s+/g, "").replace(/,/g, "");
  if (!cleaned) return null;
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}

function parseIsActive(statusRaw: string): boolean {
  const s = statusRaw.trim().toLowerCase();
  if (!s) return true;
  return s === "aktywny" || s === "active" || s === "tak" || s === "yes" || s === "1";
}

function optionalCell(raw: string | undefined): string | null {
  const v = (raw ?? "").trim();
  return v || null;
}

function parseParticipantStatus(statusRaw: string): { status: string; isActive: boolean } {
  const status = statusRaw.trim() || "Aktywny";
  return { status, isActive: parseIsActive(statusRaw) };
}

function stripOptionalTeamColumns(p: Record<string, unknown>, msg: string) {
  let changed = false;
  if (/discord_id/i.test(msg)) {
    delete p.discord_id;
    changed = true;
  }
  if (/\bstatus\b/i.test(msg)) {
    delete p.status;
    changed = true;
  }
  if (/x_com/i.test(msg)) {
    delete p.x_com;
    changed = true;
  }
  if (/email/i.test(msg)) {
    delete p.email;
    changed = true;
  }
  return changed;
}

function migrationHintForTeamError(msg: string) {
  if (/status|x_com|email/i.test(msg)) {
    return "Uruchom migrację: supabase/add_teams_contact_fields.sql.";
  }
  if (/discord_id/i.test(msg)) {
    return "Uruchom migrację: add_teams_discord_id.sql.";
  }
  if (/is_active|previous_season_or/i.test(msg)) {
    return "Uruchom migrację: add_teams_pool_fields.sql.";
  }
  if (/division_id/i.test(msg)) {
    return "Uruchom migrację: add_teams_pool_fields.sql.";
  }
  return null;
}

type MasterImportRow = {
  lineNumber: number;
  pyramidName: string;
  tier: number;
  divisionName: string;
  fplTeam: string;
  fplManager: string;
  fplId: string | null;
  previousOr: number | null;
  discordName: string;
  discordClub: string;
  discordId: string | null;
  status: string;
  isActive: boolean;
  /** Excel kolumna x.com (indeks 12) — null gdy puste / brak komórki */
  x_com: string | null;
  email: string | null;
};

type MasterExcelImportResult = ActionState & {
  rowsParsed?: number;
  divisionsCreated?: number;
  divisionsUpdated?: number;
  teamsInserted?: number;
  teamsUpdated?: number;
  skipped?: string[];
};

function parseMasterExcelTsv(raw: string): {
  rows: MasterImportRow[];
  errors: string[];
} {
  const rows: MasterImportRow[] = [];
  const errors: string[] = [];

  raw.split(/\r?\n/).forEach((line, idx) => {
    const lineNumber = idx + 1;
    const trimmed = line.trim();
    if (!trimmed) return;

    // Prefer tab; fallbacks for paste quirks
    let parts = trimmed.split("\t").map((p) => p.trim());
    if (parts.length < 6) {
      parts = trimmed.split(/;+/).map((p) => p.trim());
    }

    // Header row (14 kolumn SSOT)
    if (
      /dywizja/i.test(trimmed) &&
      (/piramida/i.test(trimmed) ||
        /fpl\s*team/i.test(trimmed) ||
        /^lp\b/i.test(parts[0] ?? "") ||
        /x\.?com/i.test(trimmed) ||
        /email/i.test(trimmed))
    ) {
      return;
    }

    if (parts.length < 12) {
      errors.push(
        `Wiersz ${lineNumber}: za mało kolumn (oczekiwano min. 12 — do Status, mam ${parts.length}).`,
      );
      return;
    }

    // Indeksy 0–13: LP | Piramida | Dywizja | Nazwa dywizji | FPL Team | FPL Manager |
    // FPL ID | OR | Discord Name | Discord Club | Discord ID | Status | x.com | email
    const pyramidName = parts[1] ?? "";
    const tierRaw = parts[2] ?? "";
    const divisionName = parts[3] ?? "";
    const fplTeam = parts[4] ?? "";
    const fplManager = parts[5] ?? "";
    const fplIdRaw = parts[6] ?? "";
    const orRaw = parts[7] ?? "";
    const discordName = parts[8] ?? "";
    const discordClub = parts[9] ?? "";
    const discordIdRaw = parts[10] ?? "";
    const statusRaw = parts[11] ?? "";
    // Indeks 12: x.com — bezpieczne przy krótszych wierszach TSV (puste końcówki)
    const xComRaw = parts[12] ?? "";
    const emailRaw = parts[13] ?? "";

    const tier = parseOptionalInt(tierRaw);
    if (!pyramidName) {
      errors.push(`Wiersz ${lineNumber}: brak Piramidy.`);
      return;
    }
    if (tier == null || tier < 1) {
      errors.push(`Wiersz ${lineNumber}: nieprawidłowa Dywizja („${tierRaw}”).`);
      return;
    }
    if (!divisionName) {
      errors.push(`Wiersz ${lineNumber}: brak Nazwy dywizji.`);
      return;
    }
    if (!fplManager && !discordName) {
      errors.push(`Wiersz ${lineNumber}: brak FPL Manager i Discord Name.`);
      return;
    }
    if (!discordName) {
      errors.push(`Wiersz ${lineNumber}: brak Discord Name.`);
      return;
    }

    const fplIdNum = parseOptionalInt(fplIdRaw);
    const fplId = fplIdNum != null ? String(fplIdNum) : fplIdRaw.trim() || null;
    if (fplIdRaw.trim() && fplIdNum == null && !/^\d+$/.test(fplIdRaw.trim())) {
      errors.push(`Wiersz ${lineNumber}: FPL ID nie jest liczbą („${fplIdRaw}”) — ustawiam null.`);
    }

    const { status, isActive } = parseParticipantStatus(statusRaw);

    rows.push({
      lineNumber,
      pyramidName,
      tier,
      divisionName,
      fplTeam: fplTeam || "—",
      fplManager: fplManager || discordName,
      fplId: fplIdNum != null ? String(fplIdNum) : null,
      previousOr: parseOptionalInt(orRaw),
      discordName,
      discordClub: discordClub || "Do wyboru",
      discordId: optionalCell(discordIdRaw),
      status,
      isActive,
      x_com: optionalCell(xComRaw),
      email: optionalCell(emailRaw),
    });
  });

  return { rows, errors };
}

/**
 * Master Import Excel SSOT (14 kolumn TSV) → upsert piramid, dywizji i graczy.
 * Wymaga jawnego `seasonId` — sezon tworzy organizator ręcznie w Strukturze Ligi.
 */
async function resolveImportSeason(
  supabase: Awaited<ReturnType<typeof requireAuth>>,
  seasonId: string | null | undefined,
): Promise<{ id: string; name: string } | { error: string }> {
  const requested = String(seasonId ?? "").trim();
  if (!requested || requested === MASTER_IMPORT_AUTO_SEASON) {
    return {
      error:
        "Wybierz sezon utworzony w Strukturze Ligi. Master Import nie tworzy sezonu automatycznie.",
    };
  }

  const { data: season, error } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("id", requested)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!season) {
    return { error: "Nie znaleziono wybranego sezonu. Utwórz go w Strukturze Ligi." };
  }
  return { id: season.id, name: season.name };
}

export async function masterExcelImport(
  data: string,
  seasonId?: string | null,
): Promise<MasterExcelImportResult> {
  try {
    const supabase = await requireAuth();
    if (!data.trim()) return { error: "Wklej dane z Excela." };

    const seasonResolved = await resolveImportSeason(supabase, seasonId);
    if ("error" in seasonResolved) return { error: seasonResolved.error };
    const resolvedSeasonId = seasonResolved.id;
    const season = { id: seasonResolved.id, name: seasonResolved.name };

    const { rows, errors } = parseMasterExcelTsv(data);
    if (!rows.length) {
      return {
        error: errors[0] ?? "Brak poprawnych wierszy do importu.",
        skipped: errors.slice(0, 30),
      };
    }

    const { data: pyramidsRaw, error: pyrError } = await supabase.from("pyramids").select("*");
    if (pyrError) return { error: pyrError.message };
    const pyramids = (pyramidsRaw ?? []) as Pyramid[];
    const pyramidByKey = new Map(
      pyramids.map((p) => [normalizeKey(p.name), p] as const),
    );

    const { data: divisionsRaw, error: divError } = await supabase
      .from("divisions")
      .select("*")
      .eq("season_id", resolvedSeasonId);
    if (divError) return { error: divError.message };
    let divisions = (divisionsRaw ?? []) as Division[];

    const { data: teamsRaw, error: teamsError } = await supabase
      .from("teams")
      .select("id, discord_nick, fpl_id, division_id");
    if (teamsError) return { error: teamsError.message };

    const teamByDiscord = new Map<string, string>();
    const teamByFpl = new Map<string, string>();
    for (const t of teamsRaw ?? []) {
      const dKey = normalizeKey(t.discord_nick);
      if (dKey && !teamByDiscord.has(dKey)) teamByDiscord.set(dKey, t.id);
      if (t.fpl_id) {
        const f = String(t.fpl_id).trim();
        if (f && !teamByFpl.has(f)) teamByFpl.set(f, t.id);
      }
    }

    let divisionsCreated = 0;
    let divisionsUpdated = 0;
    let teamsInserted = 0;
    let teamsUpdated = 0;
    const skipped = [...errors];

    async function ensurePyramid(name: string): Promise<string | { error: string }> {
      const key = normalizeKey(name);
      const existing = pyramidByKey.get(key);
      if (existing) return existing.id;

      const { data: created, error } = await supabase
        .from("pyramids")
        .insert({ name: name.trim() })
        .select("*")
        .single();
      if (error || !created) {
        return { error: error?.message ?? `Nie udało się utworzyć piramidy „${name}”.` };
      }
      const p = created as Pyramid;
      pyramidByKey.set(key, p);
      return p.id;
    }

    async function ensureDivision(
      pyramidId: string,
      tier: number,
      name: string,
    ): Promise<string | { error: string }> {
      const nameKey = normalizeKey(name);
      const byName = divisions.find(
        (d) =>
          d.pyramid_id === pyramidId &&
          d.season_id === resolvedSeasonId &&
          normalizeKey(d.name) === nameKey,
      );
      if (byName) {
        if (byName.tier !== tier) {
          const { error } = await supabase
            .from("divisions")
            .update({ tier })
            .eq("id", byName.id);
          if (error) return { error: error.message };
          byName.tier = tier;
          divisionsUpdated += 1;
        }
        return byName.id;
      }

      const byTier = divisions.find(
        (d) =>
          d.pyramid_id === pyramidId &&
          d.season_id === resolvedSeasonId &&
          d.tier === tier,
      );
      if (byTier) {
        if (normalizeKey(byTier.name) !== nameKey) {
          const { error } = await supabase
            .from("divisions")
            .update({ name: name.trim() })
            .eq("id", byTier.id);
          if (error) return { error: error.message };
          byTier.name = name.trim();
          divisionsUpdated += 1;
        }
        return byTier.id;
      }

      const { data: created, error } = await supabase
        .from("divisions")
        .insert({
          season_id: resolvedSeasonId,
          pyramid_id: pyramidId,
          tier,
          name: name.trim(),
        })
        .select("*")
        .single();
      if (error || !created) {
        return {
          error: error?.message ?? `Nie utworzono dywizji „${name}” (D${tier}).`,
        };
      }
      const d = created as Division;
      divisions = [...divisions, d];
      divisionsCreated += 1;
      return d.id;
    }

    for (const row of rows) {
      const pyramidResult = await ensurePyramid(row.pyramidName);
      if (typeof pyramidResult === "object") return { error: pyramidResult.error, skipped };
      const pyramidId = pyramidResult;

      const divisionResult = await ensureDivision(
        pyramidId,
        row.tier,
        row.divisionName,
      );
      if (typeof divisionResult === "object") return { error: divisionResult.error, skipped };
      const divisionId = divisionResult;

      const discordKey = normalizeKey(row.discordName);
      let teamId =
        (discordKey ? teamByDiscord.get(discordKey) : undefined) ??
        (row.fplId ? teamByFpl.get(row.fplId) : undefined);

      const patch: Record<string, unknown> = {
        division_id: divisionId,
        manager_name: row.fplManager,
        discord_nick: row.discordName,
        fpl_team_name: row.fplTeam,
        chosen_club: row.discordClub,
        fpl_id: row.fplId,
        previous_season_or: row.previousOr,
        is_active: row.isActive,
        status: row.status,
        discord_id: row.discordId,
        x_com: row.x_com,
        email: row.email,
      };

      if (teamId) {
        let updatePatch = { ...patch };
        let updError: { message: string } | null = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const { error } = await supabase.from("teams").update(updatePatch).eq("id", teamId);
          if (!error) {
            updError = null;
            break;
          }
          updError = error;
          if (!stripOptionalTeamColumns(updatePatch, error.message)) break;
        }
        if (updError) {
          return {
            error:
              migrationHintForTeamError(updError.message) ??
              `Update „${row.discordName}”: ${updError.message}`,
            skipped,
          };
        }
        teamsUpdated += 1;
      } else {
        let insertPatch = { ...patch, fee_paid: false };
        let created: { id: string; discord_nick: string; fpl_id: string | null } | null = null;
        let insError: { message: string } | null = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const { data, error } = await supabase
            .from("teams")
            .insert(insertPatch)
            .select("id, discord_nick, fpl_id")
            .single();
          if (!error && data) {
            created = data;
            insError = null;
            break;
          }
          insError = error;
          if (!error || !stripOptionalTeamColumns(insertPatch, error.message)) break;
        }
        if (insError || !created) {
          return {
            error:
              migrationHintForTeamError(insError?.message ?? "") ??
              `Insert „${row.discordName}”: ${insError?.message ?? "błąd"}`,
            skipped,
          };
        }
        teamId = created.id;
        teamByDiscord.set(discordKey, created.id);
        if (created.fpl_id) teamByFpl.set(String(created.fpl_id), created.id);
        teamsInserted += 1;
      }
    }

    revalidateMaster();

    const warn = skipped.length ? ` · Ostrzeżenia: ${skipped.length}` : "";
    return {
      error: null,
      success: `Import OK (sezon ${season.name}): ${rows.length} wierszy · dywizje +${divisionsCreated}/~${divisionsUpdated} · gracze +${teamsInserted}/↻${teamsUpdated}.${warn}`,
      rowsParsed: rows.length,
      divisionsCreated,
      divisionsUpdated,
      teamsInserted,
      teamsUpdated,
      skipped: skipped.slice(0, 40),
    };
  } catch (e) {
    console.error("[masterExcelImport]", e);
    return { error: e instanceof Error ? e.message : "Błąd Master Importu." };
  }
}

/**
 * Losowy terminarz Bergera dla jednej dywizji (GW1–18), is_published = false.
 */
export async function generateBergerForDivision(
  divisionId: string,
  force = false,
): Promise<ActionState & { fixturesCreated?: number }> {
  try {
    const supabase = await requireAuth();
    if (!divisionId) return { error: "Brak ID dywizji." };

    const { data: division, error: divError } = await supabase
      .from("divisions")
      .select("id, name, season_id, tier")
      .eq("id", divisionId)
      .maybeSingle();
    if (divError) return { error: divError.message };
    if (!division) return { error: "Nie znaleziono dywizji." };

    const { count: publishedCount, error: pubError } = await supabase
      .from("fixtures")
      .select("id", { count: "exact", head: true })
      .eq("division_id", divisionId)
      .eq("is_published", true);
    if (pubError) return { error: pubError.message };
    if ((publishedCount ?? 0) > 0) {
      return {
        error:
          "Są już opublikowane mecze w tej dywizji. Najpierw Unpublish w Workspace.",
      };
    }

    const { count: existingCount, error: countError } = await supabase
      .from("fixtures")
      .select("id", { count: "exact", head: true })
      .eq("division_id", divisionId)
      .eq("is_published", false);
    if (countError) return { error: countError.message };

    if ((existingCount ?? 0) > 0 && !force) {
      return {
        error: `Terminarz już istnieje (${existingCount} meczów). Potwierdź ponowne losowanie.`,
      };
    }

    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, manager_name, is_active")
      .eq("division_id", divisionId);
    if (teamsError) return { error: teamsError.message };

    const active = ((teams ?? []) as Pick<Team, "id" | "manager_name" | "is_active">[]).filter(
      (t) => t.is_active !== false,
    );
    if (active.length !== DIVISION_CAPACITY) {
      return {
        error: `Terminarz Bergera wymaga równe ${DIVISION_CAPACITY} zespołów (obecnie ${active.length}/${DIVISION_CAPACITY}).`,
      };
    }

    if (force && (existingCount ?? 0) > 0) {
      const { error: delError } = await supabase
        .from("fixtures")
        .delete()
        .eq("division_id", divisionId)
        .eq("is_published", false);
      if (delError) return { error: delError.message };
    }

    const shuffledIds = shuffleInPlace(active.map((t) => t.id));
    const matches = generateBergerFixtures(shuffledIds).filter(
      (m) => m.gameweek <= REGULAR_MAX_GAMEWEEK,
    );

    const payload = matches.map((m) => ({
      season_id: division.season_id,
      division_id: divisionId,
      gameweek: m.gameweek,
      home_team_id: m.home_team_id,
      away_team_id: m.away_team_id,
      home_fpl_points: null,
      away_fpl_points: null,
      home_h2h_points: 0,
      away_h2h_points: 0,
      home_median_bonus: 0,
      away_median_bonus: 0,
      is_finished: false,
      is_published: false,
    }));

    const { error: insertError } = await supabase.from("fixtures").insert(payload);
    if (insertError) return { error: insertError.message };

    revalidateMaster();
    return {
      error: null,
      success: `Berger „${division.name}”: ${payload.length} meczów (GW1–${REGULAR_MAX_GAMEWEEK}, staging).`,
      fixturesCreated: payload.length,
    };
  } catch (e) {
    console.error("[generateBergerForDivision]", e);
    return { error: e instanceof Error ? e.message : "Błąd generowania terminarza." };
  }
}

export type DivisionScheduleMeta = {
  divisionId: string;
  fixtureCount: number;
  minGw: number | null;
  maxGw: number | null;
  hasSchedule: boolean;
};

/** Meta terminarza per dywizja (dla UI Generuj / Regeneruj). */
export async function getDivisionScheduleStats(
  divisionIds: string[],
): Promise<DivisionScheduleMeta[]> {
  const supabase = await requireAuth();
  if (!divisionIds.length) return [];

  const { data, error } = await supabase
    .from("fixtures")
    .select("division_id, gameweek")
    .in("division_id", divisionIds);

  if (error) throw new Error(error.message);

  const byDiv = new Map<string, { count: number; min: number; max: number }>();
  for (const row of data ?? []) {
    const cur = byDiv.get(row.division_id);
    if (!cur) {
      byDiv.set(row.division_id, {
        count: 1,
        min: row.gameweek,
        max: row.gameweek,
      });
    } else {
      cur.count += 1;
      cur.min = Math.min(cur.min, row.gameweek);
      cur.max = Math.max(cur.max, row.gameweek);
    }
  }

  return divisionIds.map((id) => {
    const cur = byDiv.get(id);
    return {
      divisionId: id,
      fixtureCount: cur?.count ?? 0,
      minGw: cur?.min ?? null,
      maxGw: cur?.max ?? null,
      hasSchedule: (cur?.count ?? 0) > 0,
    };
  });
}
