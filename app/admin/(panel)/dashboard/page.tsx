import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Calendar, Globe, Layers, Network, Shuffle, Users } from "lucide-react";

export default async function AdminDashboardPage() {
  const supabase = createClient();

  const [pyramidsRes, seasonsRes, divisionsRes, teamsRes] = await Promise.all([
    supabase.from("pyramids").select("id", { count: "exact", head: true }),
    supabase.from("seasons").select("id", { count: "exact", head: true }),
    supabase.from("divisions").select("id", { count: "exact", head: true }),
    supabase.from("teams").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Piramidy", value: pyramidsRes.error ? 0 : (pyramidsRes.count ?? 0), icon: Globe },
    { label: "Sezony", value: seasonsRes.error ? 0 : (seasonsRes.count ?? 0), icon: Calendar },
    { label: "Dywizje", value: divisionsRes.error ? 0 : (divisionsRes.count ?? 0), icon: Layers },
    { label: "Uczestnicy", value: teamsRes.error ? 0 : (teamsRes.count ?? 0), icon: Users },
  ];

  const shortcuts = [
    {
      href: "/admin/struktura",
      title: "Struktura Ligi",
      text: "Piramidy, sezony i dywizje — komplet architektury.",
      icon: Network,
    },
    {
      href: "/admin/uczestnicy",
      title: "Uczestnicy",
      text: "Edycja / import / logo — zarządzanie drużynami.",
      icon: Users,
    },
    {
      href: "/admin/fixture-draw",
      title: "Maszyna Losująca",
      text: "Pozycje startowe i terminarz H2H.",
      icon: Shuffle,
    },
  ];

  return (
    <main className="flex-1 bg-[#0B0F19] p-6 sm:p-8 lg:p-10">
      <header className="mb-10">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#39FF14]">Dashboard</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Panel administratora</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          Struktura Ligi → Uczestnicy → Maszyna Losująca. Logo klubów siedzi w sekcji Uczestnicy.
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
            <strong className="text-slate-200">Struktura Ligi</strong> — piramida + sezon (Szkic) +
            dywizje (tier).
          </li>
          <li>
            <strong className="text-slate-200">Uczestnicy</strong> — import CSV lub edycja ręczna;
            logo w zakładce Logo klubów.
          </li>
          <li>
            <strong className="text-slate-200">Maszyna Losująca</strong> — ceremonia + terminarz.
          </li>
          <li>Opublikuj sezon, gdy wszystko gotowe.</li>
        </ol>
      </section>
    </main>
  );
}
