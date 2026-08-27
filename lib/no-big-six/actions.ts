"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  performDeleteNoBigSixLogo,
  performUploadNoBigSixLogo,
  type UploadNoBigSixLogoResult,
} from "@/lib/no-big-six/logoOps";

export type { UploadNoBigSixLogoResult };

const FPL_BASE = "https://fantasy.premierleague.com/api";
const FETCH_DELAY_MS = 600;

const FPL_HEADERS: HeadersInit = {
  Accept: "application/json",
  "User-Agent": "FPLArena-NoBigSix/1.0",
};

export type SyncNoBigSixResult = {
  ok: boolean;
  message: string;
  synced?: number;
  failed?: number;
  errors?: string[];
};

type PlayerMapEntry = {
  team: number;
  web_name: string;
  event_points: number;
};

type PenaltyLogRow = {
  entry_id: number;
  event: number;
  element_id: number;
  player_name: string;
  fpl_team_id: number;
  deducted_points: number;
  reason: string;
  is_auto_sub: boolean;
};

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function penaltyReason(isAutoSub: boolean): string {
  if (isAutoSub) return "Przypadkowe wejście z ławki (Auto-sub)";
  return "Celowe wystawienie w składzie";
}

async function fetchFplJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: FPL_HEADERS,
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`FPL API ${res.status}: ${url}`);
  }
  return res.json() as Promise<T>;
}

/** Picks dla GW — 404 = brak historii (np. nowy gracz dołączył później). */
async function fetchPicksOrNull<T>(url: string): Promise<T | null> {
  const res = await fetch(url, {
    headers: FPL_HEADERS,
    next: { revalidate: 0 },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`FPL API ${res.status}: ${url}`);
  }
  return res.json() as Promise<T>;
}

async function requireAuth() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Brak sesji — zaloguj się w panelu admina.");
  }

  return supabase;
}

export async function syncNoBigSixGameweek(gwNumber: number): Promise<SyncNoBigSixResult> {
  const errors: string[] = [];

  if (!Number.isFinite(gwNumber) || gwNumber < 1 || gwNumber > 38) {
    return { ok: false, message: "Nieprawidłowy numer kolejki (GW1–GW38)." };
  }

  try {
    const supabase = await requireAuth();

    const { data: configRows, error: configError } = await supabase
      .from("no_big_six_config")
      .select("id, fpl_league_id, forbidden_team_ids, last_synced_gw")
      .limit(1)
      .maybeSingle();

    if (configError) {
      return { ok: false, message: configError.message };
    }
    if (!configRows?.fpl_league_id) {
      return {
        ok: false,
        message:
          "Brak konfiguracji ligi — uzupełnij rekord w tabeli no_big_six_config (fpl_league_id).",
      };
    }

    const fplLeagueId = Number(configRows.fpl_league_id);
    const forbiddenTeamIds = new Set<number>(
      (configRows.forbidden_team_ids ?? []).map((id: number) => Number(id)),
    );

    if (forbiddenTeamIds.size === 0) {
      return { ok: false, message: "Lista forbidden_team_ids jest pusta w konfiguracji." };
    }

    type BootstrapPayload = {
      elements: { id: number; team: number; web_name: string }[];
    };
    type LivePayload = {
      elements: { id: number; stats: { total_points: number } }[];
    };
    type StandingsPayload = {
      standings: {
        results: {
          entry: number;
          entry_name: string;
          player_name: string;
        }[];
      };
    };
    type PicksPayload = {
      entry_history?: { points?: number };
      automatic_subs?: { element_in: number; element_out: number }[];
      picks: {
        element: number;
        multiplier: number;
        is_captain?: boolean;
        is_vice_captain?: boolean;
      }[];
    };

    const [bootstrap, live] = await Promise.all([
      fetchFplJson<BootstrapPayload>(`${FPL_BASE}/bootstrap-static/`),
      fetchFplJson<LivePayload>(`${FPL_BASE}/event/${gwNumber}/live/`),
    ]);

    const livePoints = new Map<number, number>();
    for (const el of live.elements ?? []) {
      livePoints.set(el.id, Number(el.stats?.total_points ?? 0));
    }

    const playerMap = new Map<number, PlayerMapEntry>();
    for (const el of bootstrap.elements ?? []) {
      playerMap.set(el.id, {
        team: el.team,
        web_name: el.web_name,
        event_points: livePoints.get(el.id) ?? 0,
      });
    }

    const leagueEntries: StandingsPayload["standings"]["results"] = [];
    let standingsPage = 1;
    let hasNextStandings = true;

    while (hasNextStandings) {
      const standingsPageData = await fetchFplJson<
        StandingsPayload & { standings?: { has_next?: boolean } }
      >(
        `${FPL_BASE}/leagues-classic/${fplLeagueId}/standings/?page=${standingsPage}`,
      );
      leagueEntries.push(...(standingsPageData.standings?.results ?? []));
      hasNextStandings = Boolean(standingsPageData.standings?.has_next);
      standingsPage += 1;
      if (hasNextStandings) await delay(300);
    }

    if (!leagueEntries.length) {
      return { ok: false, message: "FPL API zwróciło pustą listę graczy ligi." };
    }

    const teamsPayload = leagueEntries.map((row) => ({
      entry_id: row.entry,
      team_name: row.entry_name?.trim() || `Entry ${row.entry}`,
      player_name: row.player_name?.trim() || "—",
      is_banned: false,
    }));

    const { data: existingTeams, error: existingTeamsError } = await supabase
      .from("no_big_six_teams")
      .select("entry_id, custom_logo_url");

    if (existingTeamsError) {
      return { ok: false, message: existingTeamsError.message };
    }

    const logoByEntry = new Map<number, string | null>(
      (existingTeams ?? []).map((t) => [
        Number(t.entry_id),
        t.custom_logo_url != null ? String(t.custom_logo_url) : null,
      ]),
    );

    const upsertPayload = teamsPayload.map((team) => ({
      ...team,
      custom_logo_url: logoByEntry.get(team.entry_id) ?? null,
    }));

    const { error: teamsUpsertError } = await supabase
      .from("no_big_six_teams")
      .upsert(upsertPayload, { onConflict: "entry_id" });

    if (teamsUpsertError) {
      return { ok: false, message: `Błąd zapisu zespołów: ${teamsUpsertError.message}` };
    }

    const fplEntryIds = new Set(teamsPayload.map((t) => t.entry_id));
    const toBan = (existingTeams ?? [])
      .map((t) => Number(t.entry_id))
      .filter((id) => !fplEntryIds.has(id));

    if (toBan.length > 0) {
      const { error: banError } = await supabase
        .from("no_big_six_teams")
        .update({ is_banned: true })
        .in("entry_id", toBan);

      if (banError) {
        return { ok: false, message: `Błąd oznaczania zbanowanych: ${banError.message}` };
      }
    }

    let synced = 0;
    let failed = 0;

    for (const team of teamsPayload) {
      const entryId = team.entry_id;

      try {
        await delay(FETCH_DELAY_MS);

        const picksUrl = `${FPL_BASE}/entry/${entryId}/event/${gwNumber}/picks/`;
        const picksData = await fetchPicksOrNull<PicksPayload>(picksUrl);

        // Nowy gracz bez historii tej GW (FPL 404) → 0 pkt, bez kar, sync idzie dalej
        if (picksData == null) {
          const { error: zeroResultError } = await supabase
            .from("no_big_six_gw_results")
            .upsert(
              {
                entry_id: entryId,
                event: gwNumber,
                raw_fpl_points: 0,
                penalty_points: 0,
                official_points: 0,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "entry_id,event" },
            );

          if (zeroResultError) {
            throw new Error(zeroResultError.message);
          }

          const { error: deletePenaltiesError } = await supabase
            .from("no_big_six_penalties")
            .delete()
            .eq("entry_id", entryId)
            .eq("event", gwNumber);

          if (deletePenaltiesError) {
            throw new Error(deletePenaltiesError.message);
          }

          synced += 1;
          continue;
        }

        const subbedInIds = new Set(
          (picksData.automatic_subs ?? []).map((sub) => sub.element_in),
        );

        const rawFplPoints = Number(picksData.entry_history?.points ?? 0);
        let penaltyPoints = 0;
        const penaltiesLog: PenaltyLogRow[] = [];

        for (const pick of picksData.picks ?? []) {
          if (pick.multiplier <= 0) continue;

          const player = playerMap.get(pick.element);
          if (!player) continue;

          if (!forbiddenTeamIds.has(player.team)) continue;

          const deduction = player.event_points * pick.multiplier;
          if (deduction <= 0) continue;

          const isAutoSub = subbedInIds.has(pick.element);

          penaltyPoints += deduction;
          penaltiesLog.push({
            entry_id: entryId,
            event: gwNumber,
            element_id: pick.element,
            player_name: player.web_name,
            fpl_team_id: player.team,
            deducted_points: deduction,
            reason: penaltyReason(isAutoSub),
            is_auto_sub: isAutoSub,
          });
        }

        const officialPoints = rawFplPoints - penaltyPoints;

        const { error: resultError } = await supabase.from("no_big_six_gw_results").upsert(
          {
            entry_id: entryId,
            event: gwNumber,
            raw_fpl_points: rawFplPoints,
            penalty_points: penaltyPoints,
            official_points: officialPoints,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "entry_id,event" },
        );

        if (resultError) {
          throw new Error(resultError.message);
        }

        const { error: deletePenaltiesError } = await supabase
          .from("no_big_six_penalties")
          .delete()
          .eq("entry_id", entryId)
          .eq("event", gwNumber);

        if (deletePenaltiesError) {
          throw new Error(deletePenaltiesError.message);
        }

        if (penaltiesLog.length > 0) {
          const { error: insertPenaltiesError } = await supabase
            .from("no_big_six_penalties")
            .insert(penaltiesLog);

          if (insertPenaltiesError) {
            throw new Error(insertPenaltiesError.message);
          }
        }

        synced += 1;
      } catch (e) {
        failed += 1;
        const msg = e instanceof Error ? e.message : "Nieznany błąd";
        errors.push(`Entry ${entryId}: ${msg}`);
        console.error("[syncNoBigSixGameweek]", entryId, e);
      }
    }

    const lastSynced = Number(configRows.last_synced_gw ?? 0);
    if (synced > 0 && gwNumber > lastSynced) {
      await supabase
        .from("no_big_six_config")
        .update({ last_synced_gw: gwNumber })
        .eq("id", configRows.id);
    }

    revalidatePath("/no-big-six");
    revalidatePath("/admin/no-big-six/sync");

    if (synced === 0) {
      return {
        ok: false,
        message: "Synchronizacja nie powiodła się dla żadnego gracza.",
        synced: 0,
        failed,
        errors,
      };
    }

    const partial = failed > 0 ? ` (${failed} błędów — szczegóły poniżej).` : ".";
    return {
      ok: failed === 0,
      message: `Zsynchronizowano GW${gwNumber}: ${synced}/${teamsPayload.length} graczy${partial}`,
      synced,
      failed,
      errors: errors.length ? errors : undefined,
    };
  } catch (e) {
    console.error("[syncNoBigSixGameweek]", e);
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Nieznany błąd synchronizacji.",
    };
  }
}

export async function uploadNoBigSixLogo(
  formData: FormData,
  entryId: number,
): Promise<UploadNoBigSixLogoResult> {
  try {
    const supabase = await requireAuth();
    return performUploadNoBigSixLogo(supabase, formData, entryId);
  } catch (e) {
    console.error("[uploadNoBigSixLogo]", e);
    return {
      ok: false,
      message:
        "Wystąpił nieoczekiwany błąd serwera podczas wgrywania pliku.",
    };
  }
}

export async function deleteNoBigSixLogo(
  entryId: number,
): Promise<UploadNoBigSixLogoResult> {
  try {
    const supabase = await requireAuth();
    return performDeleteNoBigSixLogo(supabase, entryId);
  } catch (e) {
    console.error("[deleteNoBigSixLogo]", e);
    return {
      ok: false,
      message: "Wystąpił nieoczekiwany błąd serwera podczas usuwania herbu.",
    };
  }
}
