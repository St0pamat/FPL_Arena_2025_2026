import { DangerZonePanel } from "@/components/admin/DangerZonePanel";
import { getSeasons } from "@/app/admin/actions/db";
import type { Season } from "@/lib/admin/types";

export default async function AdminSettingsPage() {
  let seasons: Season[] = [];
  try {
    seasons = await getSeasons();
  } catch {
    seasons = [];
  }

  return (
    <main className="flex-1 bg-[#0B0F19] p-6 sm:p-8 lg:p-10">
      <header className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-red-400">Danger Zone</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Ustawienia i bezpieczeństwo</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Granularne czyszczenie wyników / terminarza albo pełny reset bazy.
        </p>
      </header>

      <DangerZonePanel seasons={seasons} />
    </main>
  );
}
