import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NoBigSixSyncPanel } from "@/components/admin/no-big-six/NoBigSixSyncPanel";

export const dynamic = "force-dynamic";

async function getDefaultSyncGw(): Promise<number> {
  const supabase = createClient();
  const [{ data: config }, { data: results }] = await Promise.all([
    supabase.from("no_big_six_config").select("last_synced_gw").limit(1).maybeSingle(),
    supabase.from("no_big_six_gw_results").select("event").order("event", { ascending: false }).limit(1),
  ]);

  const lastSynced = Number(config?.last_synced_gw ?? 0);
  const maxEvent = Number(results?.[0]?.event ?? 0);

  return Math.min(38, Math.max(1, lastSynced > 0 ? lastSynced + 1 : maxEvent > 0 ? maxEvent : 1));
}

export default async function AdminNoBigSixSyncPage() {
  const defaultGw = await getDefaultSyncGw();

  return (
    <main className="flex-1 bg-[#0B0F19] p-6 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">
          <RefreshCw className="h-3.5 w-3.5" />
          No Big Six · FPL API
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Synchronizacja kolejki</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Pobiera składy z Fantasy Premier League, nalicza kary za zawodników Big Six i
          zapisuje wyniki do Supabase. Publiczna strona{" "}
          <a href="/no-big-six" className="text-amber-500 hover:underline" target="_blank" rel="noopener noreferrer">
            /no-big-six
          </a>{" "}
          odświeży się po sync.
        </p>
      </header>

      <NoBigSixSyncPanel defaultGw={defaultGw} />
      </div>
    </main>
  );
}
