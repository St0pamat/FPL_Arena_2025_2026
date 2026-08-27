/**
 * Punkty FPL per team × gameweek — źródło prawdy dla The FA Ranking.
 * Niezależne od fixtures H2H (krytyczne dla GW19/38).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type TeamGwScoreRow = {
  season_id: string;
  team_id: string;
  gameweek: number;
  fpl_points: number;
  is_published?: boolean;
};

export type FetchedGwScore = {
  season_id: string;
  team_id: string;
  gameweek: number;
  fpl_points: number;
  is_published: boolean;
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function isMissingTable(message: string): boolean {
  return /team_gameweek_scores|does not exist|schema cache/i.test(message);
}

/** Upsert punktów (brudnopis lub z flagą published). */
export async function upsertTeamGameweekScores(
  supabase: any,
  rows: TeamGwScoreRow[],
): Promise<string | null> {
  if (!rows.length) return null;
  const payload = rows.map((r) => ({
    season_id: r.season_id,
    team_id: r.team_id,
    gameweek: r.gameweek,
    fpl_points: Math.round(r.fpl_points),
    is_published: Boolean(r.is_published),
    updated_at: new Date().toISOString(),
  }));

  for (const batch of chunk(payload, 200)) {
    const { error } = await supabase.from("team_gameweek_scores").upsert(batch, {
      onConflict: "season_id,team_id,gameweek",
    });
    if (error) {
      if (isMissingTable(error.message)) {
        return `Brak tabeli team_gameweek_scores — uruchom migrację: supabase/migrations/add_team_gameweek_scores.sql`;
      }
      return error.message;
    }
  }
  return null;
}

/**
 * Upsert punktów z ochroną produkcji:
 * jeśli rekord już ma is_published=true → aktualizuj tylko fpl_points (flaga zostaje true).
 * nowe / brudnopis → is_published=false.
 */
export async function upsertTeamGameweekScoresPreservePublished(
  supabase: any,
  rows: Omit<TeamGwScoreRow, "is_published">[],
): Promise<string | null> {
  if (!rows.length) return null;

  const seasonId = rows[0]!.season_id;
  const gameweek = rows[0]!.gameweek;
  const teamIds = [...new Set(rows.map((r) => r.team_id))];

  const published = new Set<string>();
  for (const idBatch of chunk(teamIds, 200)) {
    const { data, error } = await supabase
      .from("team_gameweek_scores")
      .select("team_id, is_published")
      .eq("season_id", seasonId)
      .eq("gameweek", gameweek)
      .in("team_id", idBatch);
    if (error) {
      if (isMissingTable(error.message)) {
        return `Brak tabeli team_gameweek_scores — uruchom migrację: supabase/migrations/add_team_gameweek_scores.sql`;
      }
      return error.message;
    }
    for (const r of data ?? []) {
      if (r.is_published) published.add(String(r.team_id));
    }
  }

  return upsertTeamGameweekScores(
    supabase,
    rows.map((r) => ({
      ...r,
      is_published: published.has(r.team_id),
    })),
  );
}

export async function publishTeamGameweekScores(
  supabase: any,
  seasonId: string,
  gameweek: number,
  teamIds?: string[],
): Promise<string | null> {
  let q = supabase
    .from("team_gameweek_scores")
    .update({ is_published: true, updated_at: new Date().toISOString() })
    .eq("season_id", seasonId)
    .eq("gameweek", gameweek);
  if (teamIds?.length) q = q.in("team_id", teamIds);
  const { error } = await q;
  if (error) {
    if (isMissingTable(error.message)) return null;
    return error.message;
  }
  return null;
}

export async function unpublishTeamGameweekScores(
  supabase: any,
  seasonId: string,
  gameweek: number,
  teamIds?: string[],
): Promise<string | null> {
  let q = supabase
    .from("team_gameweek_scores")
    .update({ is_published: false, updated_at: new Date().toISOString() })
    .eq("season_id", seasonId)
    .eq("gameweek", gameweek);
  if (teamIds?.length) q = q.in("team_id", teamIds);
  const { error } = await q;
  if (error) {
    if (isMissingTable(error.message)) return null;
    return error.message;
  }
  return null;
}

export async function clearTeamGameweekScores(
  supabase: any,
  seasonId: string,
  gameweek: number,
  teamIds?: string[],
): Promise<string | null> {
  let q = supabase
    .from("team_gameweek_scores")
    .delete()
    .eq("season_id", seasonId)
    .eq("gameweek", gameweek);
  if (teamIds?.length) {
    q = q.in("team_id", teamIds);
  }
  const { error } = await q;
  if (error) {
    if (isMissingTable(error.message)) return null;
    return error.message;
  }
  return null;
}

export async function fetchPublishedTeamGameweekScores(
  supabase: any,
  seasonIds: string[],
): Promise<{ rows: FetchedGwScore[]; error: string | null; missingTable?: boolean }> {
  if (!seasonIds.length) return { rows: [], error: null };
  const { data, error } = await supabase
    .from("team_gameweek_scores")
    .select("season_id, team_id, gameweek, fpl_points, is_published")
    .in("season_id", seasonIds)
    .eq("is_published", true);

  if (error) {
    if (isMissingTable(error.message)) {
      return { rows: [], error: null, missingTable: true };
    }
    return { rows: [], error: error.message };
  }

  const rows: FetchedGwScore[] = (data ?? []).map(
    (r: Record<string, unknown>) => ({
      season_id: String(r.season_id),
      team_id: String(r.team_id),
      gameweek: Number(r.gameweek),
      fpl_points: Number(r.fpl_points),
      is_published: Boolean(r.is_published),
    }),
  );
  return { rows, error: null };
}
