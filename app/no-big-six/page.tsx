import type { Metadata } from "next";
import { NoBigSixHub } from "@/components/no-big-six/NoBigSixHub";
import { createClient } from "@/lib/supabase/server";
import type {
  NoBigSixGwResult,
  NoBigSixPenalty,
  NoBigSixTeam,
} from "@/lib/no-big-six/types";

export const metadata: Metadata = {
  title: "FPL Arena: No Big Six",
  description:
    "Liga Fantasy Premier League bez graczy z Big Six. Punktują tylko zawodnicy spoza Arsenalu, Chelsea, Liverpoolu, Man City, Man Utd i Spurs.",
};

export const dynamic = "force-dynamic";

function mapTeam(row: Record<string, unknown>): NoBigSixTeam {
  return {
    entry_id: Number(row.entry_id),
    team_name: String(row.team_name ?? ""),
    player_name: String(row.player_name ?? ""),
    custom_logo_url: row.custom_logo_url != null ? String(row.custom_logo_url) : null,
    is_banned: Boolean(row.is_banned),
  };
}

function mapResult(row: Record<string, unknown>): NoBigSixGwResult {
  return {
    id: Number(row.id),
    entry_id: Number(row.entry_id),
    event: Number(row.event),
    raw_fpl_points: Number(row.raw_fpl_points ?? 0),
    penalty_points: Number(row.penalty_points ?? 0),
    official_points: Number(row.official_points ?? 0),
  };
}

function mapPenalty(row: Record<string, unknown>): NoBigSixPenalty {
  return {
    id: Number(row.id),
    entry_id: Number(row.entry_id),
    event: Number(row.event),
    element_id: Number(row.element_id),
    player_name: String(row.player_name ?? ""),
    fpl_team_id: Number(row.fpl_team_id),
    deducted_points: Number(row.deducted_points),
    reason: String(row.reason ?? ""),
    is_auto_sub: Boolean(row.is_auto_sub),
  };
}

async function loadNoBigSixData(): Promise<{
  teams: NoBigSixTeam[];
  results: NoBigSixGwResult[];
  penalties: NoBigSixPenalty[];
}> {
  const supabase = createClient();

  const [teamsRes, resultsRes, penaltiesRes] = await Promise.all([
    supabase
      .from("no_big_six_teams")
      .select("entry_id, team_name, player_name, custom_logo_url, is_banned")
      .order("team_name", { ascending: true }),
    supabase
      .from("no_big_six_gw_results")
      .select(
        "id, entry_id, event, raw_fpl_points, penalty_points, official_points",
      )
      .order("event", { ascending: true }),
    supabase
      .from("no_big_six_penalties")
      .select(
        "id, entry_id, event, element_id, player_name, fpl_team_id, deducted_points, reason, is_auto_sub",
      )
      .order("event", { ascending: true }),
  ]);

  if (teamsRes.error) throw new Error(teamsRes.error.message);
  if (resultsRes.error) throw new Error(resultsRes.error.message);
  if (penaltiesRes.error) throw new Error(penaltiesRes.error.message);

  return {
    teams: (teamsRes.data ?? []).map(mapTeam),
    results: (resultsRes.data ?? []).map(mapResult),
    penalties: (penaltiesRes.data ?? []).map(mapPenalty),
  };
}

export default async function NoBigSixPage() {
  let teams: NoBigSixTeam[] = [];
  let results: NoBigSixGwResult[] = [];
  let penalties: NoBigSixPenalty[] = [];
  let loadError: string | null = null;

  try {
    const data = await loadNoBigSixData();
    teams = data.teams;
    results = data.results;
    penalties = data.penalties;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Nie udało się wczytać danych ligi.";
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.08),_transparent_55%)]"
      />

      <header className="relative border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-500/80">
            FPL Arena
          </p>
          <h1 className="font-athletic mt-2 text-3xl font-bold tracking-wide text-white sm:text-4xl lg:text-5xl">
            No Big Six
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-400 sm:text-lg">
            Liga bez gigantów — tylko gracze spoza klasycznej Big Six liczą się do
            wyniku.
          </p>
        </div>
      </header>

      <div className="relative">
        {loadError ? (
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
            <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
              {loadError}
            </p>
          </div>
        ) : (
          <NoBigSixHub teams={teams} results={results} penalties={penalties} />
        )}
      </div>
    </main>
  );
}
