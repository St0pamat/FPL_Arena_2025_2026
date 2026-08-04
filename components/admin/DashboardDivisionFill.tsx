import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export type DivisionFillRow = {
  id: string;
  name: string;
  tier: number;
  pyramidName: string;
  seasonName: string;
  playerCount: number;
  capacity: number;
};

export function DashboardDivisionFill({ rows }: { rows: DivisionFillRow[] }) {
  if (rows.length === 0) {
    return (
      <section className="mt-8 rounded-2xl border border-dashed border-slate-700 bg-slate-800/30 p-6">
        <h2 className="text-lg font-bold text-white">Struktura Dywizji i Zapełnienie</h2>
        <p className="mt-2 text-sm text-slate-500">
          Brak dywizji. Utwórz sezon w{" "}
          <Link href="/admin/struktura" className="text-[#39FF14] underline">
            Strukturze Ligi
          </Link>
          , potem zaimportuj graczy.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
      <h2 className="text-lg font-bold text-white">Struktura Dywizji i Zapełnienie</h2>
      <p className="mt-1 text-sm text-slate-400">
        Pełna dywizja = 10 graczy. Niepełne bloki wymagają uzupełnienia przed Bergerem / Workspace.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((d) => {
          const pct = Math.min(100, Math.round((d.playerCount / d.capacity) * 100));
          const incomplete = d.playerCount < d.capacity;
          return (
            <article
              key={d.id}
              className={`rounded-xl border p-4 ${
                incomplete
                  ? "border-amber-500/40 bg-amber-950/20"
                  : "border-emerald-500/30 bg-emerald-950/10"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#39FF14]">
                    Tier {d.tier} · {d.pyramidName}
                  </p>
                  <h3 className="mt-0.5 font-bold text-white">{d.name}</h3>
                  <p className="text-xs text-slate-500">{d.seasonName}</p>
                </div>
                <span
                  className={`shrink-0 rounded-lg px-2 py-1 text-xs font-black ${
                    incomplete ? "bg-amber-500/20 text-amber-200" : "bg-emerald-500/20 text-emerald-200"
                  }`}
                >
                  {d.playerCount} / {d.capacity}
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-900">
                <div
                  className={`h-full rounded-full transition-all ${
                    incomplete ? "bg-amber-400" : "bg-[#39FF14]"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {incomplete ? (
                <p className="mt-3 inline-flex items-start gap-1.5 text-xs font-semibold text-amber-200">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Dywizja Niepełna ({d.playerCount}/{d.capacity}). Rekrutacja w toku. Nie można
                  generować meczów ani publikować tej ligi.
                </p>
              ) : (
                <p className="mt-3 text-xs font-semibold text-emerald-300">Komplet — gotowa do Berger</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
