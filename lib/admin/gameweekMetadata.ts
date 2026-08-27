/**
 * Metadane syncu FPL API → Na Minusie (status GW + last_sync_at).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type GwSyncStatus = "PROVISIONAL" | "CONFIRMED" | "NOT_STARTED";

export type GameweekMetadataRow = {
  season_id: string;
  gameweek: number;
  last_sync_at: string;
  gw_status: GwSyncStatus;
};

function isMissingTable(message: string): boolean {
  return /gameweek_metadata|does not exist|schema cache/i.test(message);
}

export function isGwSyncStatus(v: unknown): v is GwSyncStatus {
  return v === "PROVISIONAL" || v === "CONFIRMED" || v === "NOT_STARTED";
}

export async function upsertGameweekMetadata(
  supabase: any,
  row: {
    season_id: string;
    gameweek: number;
    last_sync_at: string;
    gw_status: GwSyncStatus;
  },
): Promise<string | null> {
  const { error } = await supabase.from("gameweek_metadata").upsert(
    {
      season_id: row.season_id,
      gameweek: row.gameweek,
      last_sync_at: row.last_sync_at,
      gw_status: row.gw_status,
    },
    { onConflict: "season_id,gameweek" },
  );
  if (error) {
    if (isMissingTable(error.message)) {
      return `Brak tabeli gameweek_metadata — uruchom migrację: supabase/migrations/20260827120000_create_gameweek_metadata.sql`;
    }
    return error.message;
  }
  return null;
}

export async function fetchGameweekMetadata(
  supabase: any,
  seasonId: string,
  gameweek?: number,
): Promise<{ rows: GameweekMetadataRow[]; error: string | null; missingTable?: boolean }> {
  if (!seasonId) return { rows: [], error: null };

  let q = supabase
    .from("gameweek_metadata")
    .select("season_id, gameweek, last_sync_at, gw_status")
    .eq("season_id", seasonId);

  if (gameweek != null) q = q.eq("gameweek", gameweek);

  const { data, error } = await q;
  if (error) {
    if (isMissingTable(error.message)) {
      return { rows: [], error: null, missingTable: true };
    }
    return { rows: [], error: error.message };
  }

  const rows: GameweekMetadataRow[] = (data ?? [])
    .map((r: Record<string, unknown>) => {
      const status = r.gw_status;
      if (!isGwSyncStatus(status)) return null;
      return {
        season_id: String(r.season_id),
        gameweek: Number(r.gameweek),
        last_sync_at: String(r.last_sync_at),
        gw_status: status,
      };
    })
    .filter(Boolean) as GameweekMetadataRow[];

  return { rows, error: null };
}

/** Format DD.MM.YYYY, HH:mm w Europe/Warsaw (CEST/CET). */
export function formatSyncAtCest(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}.${get("month")}.${get("year")}, ${get("hour")}:${get("minute")}`;
}

export function gwStatusPublicLabel(status: GwSyncStatus): string {
  if (status === "CONFIRMED") return "CONFIRMED (Oficjalne)";
  if (status === "PROVISIONAL") return "PROVISIONAL (w trakcie aktualizacji)";
  return "NOT_STARTED";
}
