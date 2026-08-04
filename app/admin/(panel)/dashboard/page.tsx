import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Calendar, Globe, Layers, Network, Shuffle, Users } from "lucide-react";
import {
  DashboardDivisionFill,
  type DivisionFillRow,
} from "@/components/admin/DashboardDivisionFill";

export default async function AdminDashboardPage() {
  const supabase = createClient();

  const [pyramidsRes, seasonsData, divisionsData, teamsData] = await Promise.all([
    supabase.from("pyramids").select("id", { count: "exact", head: true }),
    supabase
      .from("seasons")
      .select("id, name, status, is_archived, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("divisions")
      .select("id, name, tier, season_id, pyramid_id, pyramids(name), seasons(name, status)")
      .order("tier", { ascending: true }),
    supabase.from("teams").select("id, division_id, is_active"),
  ]);

  const seasons = seasonsData.data ?? [];
  const activeSeason =
    seasons.find((s) => s.status === "PUBLISHED" && !s.is_archived) ??
    seasons.find((s) => s.status === "PUBLISHED") ??
    seasons[0] ??
    null;

  const activeDivIds = new Set(
    (divisionsData.data ?? [])
      .filter((d) => activeSeason && d.season_id === activeSeason.id)
      .map((d) => d.id),
  );

  let playersInActiveSeason = 0;
  const countByDivision = new Map<string, number>();
  for (const t of teamsData.data ?? []) {
    if (!t.division_id || t.is_active === false) continue;
    countByDivision.set(t.division_id, (countByDivision.get(t.division_id) ?? 0) + 1);
    if (activeDivIds.has(t.division_id)) playersInActiveSeason += 1;
  }

  const divisionsInActiveSeason = activeDivIds.size;

  const stats = [
    {
      label: "Sezony (wszystkie)",
      value: seasons.length,
      icon: Calendar,
    },
    {
      label: "Piramidy",
      value: pyramidsRes.error ? 0 : (pyramidsRes.count ?? 0),
      icon: Globe,
    },
    {
      label: activeSeason ? `Dywizje · ${activeSeason.name}` : "Dywizje",
      value: divisionsInActiveSeason,
      icon: Layers,
    },
    {
      label: activeSeason ? `Uczestnicy · ${activeSeason.name}` : "Uczestnicy",
      value: playersInActiveSeason,
      icon: Users,
    },
  ];

  const fillRows: DivisionFillRow[] = (divisionsData.data ?? [])
    .filter((d) => !activeSeason || d.season_id === activeSeason.id)
    .map((d) => {
      const pyr = d.pyramids as { name?: string } | { name?: string }[] | null;
      const pyrName = Array.isArray(pyr) ? pyr[0]?.name : pyr?.name;
      const sea = d.seasons as { name?: string } | { name?: string }[] | null;
      const seaName = Array.isArray(sea) ? sea[0]?.name : sea?.name;
      return {
        id: d.id,
        name: d.name,
        tier: d.tier,
        pyramidName: pyrName ?? "—",
        seasonName: seaName ?? activeSeason?.name ?? "—",
        playerCount: countByDivision.get(d.id) ?? 0,
        capacity: 10,
      };
    });

  const shortcuts = [
    {
      href: "/admin/struktura",
      title: "Struktura Ligi",
      text: "Utwórz sezon ręcznie, potem piramidy i dywizje.",
      icon: Network,
    },
    {
      href: "/admin/players",
      title: "Baza Graczy i Dywizji",
      text: "Master Import Excel — roster, herby, Berger.",
      icon: Users,
    },
    {
      href: "/admin/workspace",
      title: "Edytor Kolejek",
      text: "Brudnopis GW, import punktów, publikacja.",
      icon: Shuffle,
    },
  ];

  return (
    <main className="flex-1 bg-[#0B0F19] p-6 sm:p-8 lg:p-10">
      <header className="mb-10">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#39FF14]">Dashboard</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Panel administratora</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          Sezon → Master Import → Berger → Workspace.{" "}
          {activeSeason ? (
            <>
              Aktywny kontekst: <strong className="text-slate-200">{activeSeason.name}</strong>
              {" "}(liczniki dywizji/graczy tylko dla tego sezonu)
            </>
          ) : (
            <>Brak sezonu — zacznij od Struktury Ligi.</>
          )}
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6"
          >
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#39FF14]/10">
              <Icon className="h-5 w-5 text-[#39FF14]" strokeWidth={1.75} />
            </div>
            <p className="text-3xl font-black text-white">{value}</p>
            <p className="mt-1 text-sm font-semibold text-slate-400">{label}</p>
          </article>
        ))}
      </div>

      <DashboardDivisionFill rows={fillRows} />

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {shortcuts.map(({ href, title, text, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5 transition-colors hover:border-[#39FF14]/40"
          >
            <Icon className="mb-3 h-5 w-5 text-[#39FF14]" />
            <p className="font-bold text-white">{title}</p>
            <p className="mt-1 text-sm text-slate-400">{text}</p>
          </Link>
        ))}
      </div>

      <section className="mt-8 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
        <h2 className="text-lg font-bold text-white">Workflow setupu sezonu</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-400">
          <li>
            <strong className="text-slate-200">Struktura Ligi</strong> — ręcznie utwórz sezon
            (Jesień/Wiosna), potem piramidę.
          </li>
          <li>
            <strong className="text-slate-200">Baza Graczy</strong> — Master Import do wybranego
            sezonu + herby + Generuj/Regeneruj Berger.
          </li>
          <li>
            <strong className="text-slate-200">Edytor Kolejek</strong> — punkty Excel, H2H + mediana,
            publikacja.
          </li>
        </ol>
      </section>
    </main>
  );
}
