import { Image } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NoBigSixLogosPanel } from "@/components/admin/no-big-six/NoBigSixLogosPanel";
import type { NoBigSixTeam } from "@/lib/no-big-six/types";

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

async function loadTeams(): Promise<NoBigSixTeam[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("no_big_six_teams")
    .select("entry_id, team_name, player_name, custom_logo_url, is_banned")
    .order("team_name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTeam);
}

export default async function AdminNoBigSixLogosPage() {
  let teams: NoBigSixTeam[] = [];
  let loadError: string | null = null;

  try {
    teams = await loadTeams();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Nie udało się wczytać zespołów.";
  }

  return (
    <main className="flex-1 bg-[#0B0F19] p-6 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">
            <Image className="h-3.5 w-3.5" />
            No Big Six · Assety
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-white">Herby drużyn</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Wgraj customowe herby dla uczestników ligi. Pliki są zapisywane lokalnie i nie
            znikają po synchronizacji z FPL. Publiczna strona{" "}
            <a
              href="/no-big-six"
              className="text-amber-500 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              /no-big-six
            </a>{" "}
            odświeży się po zapisie.
          </p>
        </header>

        {loadError ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {loadError}
          </p>
        ) : (
          <NoBigSixLogosPanel teams={teams} />
        )}
      </div>
    </main>
  );
}
