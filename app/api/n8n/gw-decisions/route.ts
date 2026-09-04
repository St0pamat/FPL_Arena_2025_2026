import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BenchEntry = {
  points?: number | null;
};

type GwDecisionsReportJson = {
  gw_points_total?: number | null;
  chips?: string | null;
  transfers?: { hit_cost?: number | null } | null;
  captain?: { points_final?: number | null } | null;
  bench?: BenchEntry[] | null;
};

type GwDecisionsPayload = {
  fpl_entry?: number | string | null;
  gw?: number | null;
  report_json?: GwDecisionsReportJson | null;
};

type ResolvedTeam = {
  teamId: string;
  seasonId: string;
};

function safeBearerEqual(provided: string, expected: string): boolean {
  const a = provided.trim();
  const b = expected.trim();
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function authorize(request: Request): boolean {
  const secret = process.env.N8N_API_SECRET?.trim();
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return false;

  return safeBearerEqual(match[1], secret);
}

function parsePayload(body: unknown): GwDecisionsPayload | null {
  if (!body || typeof body !== "object") return null;
  return body as GwDecisionsPayload;
}

function validatePayload(payload: GwDecisionsPayload): string | null {
  const fplEntry = Number(payload.fpl_entry);
  if (!Number.isFinite(fplEntry) || fplEntry <= 0) {
    return "Pole fpl_entry musi być dodatnią liczbą.";
  }

  const gw = Number(payload.gw);
  if (!Number.isInteger(gw) || gw < 1 || gw > 38) {
    return "Pole gw musi być liczbą całkowitą od 1 do 38.";
  }

  if (!payload.report_json || typeof payload.report_json !== "object") {
    return "Pole report_json jest wymagane.";
  }

  return null;
}

function sumBenchPoints(bench: unknown): number {
  if (!Array.isArray(bench)) return 0;

  return bench.reduce((sum, item) => {
    if (!item || typeof item !== "object") return sum;
    const points = Number((item as BenchEntry).points);
    if (!Number.isFinite(points)) return sum;
    return sum + Math.round(points);
  }, 0);
}

function parseChip(chips: unknown): string | null {
  if (typeof chips !== "string") return null;
  const trimmed = chips.trim();
  if (!trimmed || trimmed.toLowerCase() === "none") return null;
  return trimmed;
}

function toInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n);
}

async function resolveActiveTeam(
  supabase: SupabaseClient,
  fplEntry: number,
): Promise<ResolvedTeam | null> {
  const fplId = String(fplEntry).trim();
  if (!fplId) return null;

  const { data: activeSeasons, error: seasonsError } = await supabase
    .from("seasons")
    .select("id, is_archived");

  if (seasonsError) throw seasonsError;

  const activeSeasonIds = (activeSeasons ?? [])
    .filter((s) => !s.is_archived)
    .map((s) => s.id)
    .filter(Boolean);
  if (!activeSeasonIds.length) return null;

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, divisions!inner(season_id)")
    .eq("fpl_id", fplId)
    .in("divisions.season_id", activeSeasonIds)
    .limit(1);

  if (teamsError) throw teamsError;

  const team = teams?.[0];
  if (!team) return null;

  const divisions = team.divisions as
    | { season_id: string }
    | { season_id: string }[]
    | null;
  const division = Array.isArray(divisions) ? divisions[0] : divisions;
  if (!division?.season_id) return null;

  return {
    teamId: team.id,
    seasonId: division.season_id,
  };
}

export async function POST(request: Request) {
  try {
    if (!authorize(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Nieprawidłowy JSON w ciele zapytania." },
        { status: 400 },
      );
    }

    const payload = parsePayload(body);
    if (!payload) {
      return NextResponse.json(
        { error: "Oczekiwano obiektu JSON w ciele zapytania." },
        { status: 400 },
      );
    }

    const validationError = validatePayload(payload);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const report = payload.report_json!;
    const fplEntry = Number(payload.fpl_entry);
    const gameweek = Number(payload.gw);

    const pointsBenched = sumBenchPoints(report.bench);
    const chipUsed = parseChip(report.chips);
    const captainPoints = toInt(report.captain?.points_final, 0);
    const pointsTotal = toInt(report.gw_points_total, 0);
    const hitCost = toInt(report.transfers?.hit_cost, 0);

    const supabase = createServiceClient();

    const resolved = await resolveActiveTeam(supabase, fplEntry);
    if (!resolved) {
      return NextResponse.json(
        { error: "Aktywna drużyna nie znaleziona dla podanego FPL ID" },
        { status: 404 },
      );
    }

    const { data, error } = await supabase
      .from("team_gw_decisions")
      .upsert(
        {
          season_id: resolved.seasonId,
          gameweek,
          team_id: resolved.teamId,
          points_total: pointsTotal,
          points_benched: pointsBenched,
          hit_cost: hitCost,
          chip_used: chipUsed,
          captain_points: captainPoints,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "season_id,gameweek,team_id" },
      )
      .select("id, season_id, team_id, gameweek")
      .single();

    if (error) {
      console.error("[api/n8n/gw-decisions] upsert error:", error);
      return NextResponse.json(
        { error: "Błąd zapisu decyzji w bazie danych." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        id: data.id,
        season_id: data.season_id,
        team_id: data.team_id,
        gameweek: data.gameweek,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[api/n8n/gw-decisions POST]", error);
    return NextResponse.json(
      { error: "Wystąpił nieoczekiwany błąd serwera." },
      { status: 500 },
    );
  }
}
