import { DangerZonePanel } from "@/components/admin/DangerZonePanel";

export default function AdminSettingsPage() {
  return (
    <main className="flex-1 bg-[#0B0F19] p-6 sm:p-8 lg:p-10">
      <header className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-red-400">Danger Zone</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Ustawienia i bezpieczeństwo</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Narzędzia testowe i destrukcyjne. Używaj tylko poza sezonem produkcyjnym.
        </p>
      </header>

      <DangerZonePanel />
    </main>
  );
}
