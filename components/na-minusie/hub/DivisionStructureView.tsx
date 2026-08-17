import { Building2, Clock, Info } from "lucide-react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { TierLogoRecord } from "@/lib/admin/tierLogos";
import type { PublicSeasonDivisionStructurePayload } from "@/lib/public/types";
import { DivisionStructureCard } from "@/components/na-minusie/hub/DivisionStructureCard";

function formatUpdatedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date}, ${time}`;
}

export function DivisionStructureView({
  data,
  logos = [],
  tierLogos = [],
  variant = "page",
  linkToProfile = false,
}: {
  data: PublicSeasonDivisionStructurePayload;
  logos?: ClubLogoRecord[];
  tierLogos?: TierLogoRecord[];
  /** Ukryj duży nagłówek strony — osadzenie w HubShell */
  variant?: "page" | "embedded";
  linkToProfile?: boolean;
}) {
  const updatedLabel = formatUpdatedAt(data.updatedAt);

  if (data.error) {
    return (
      <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
        {data.error}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {variant === "page" ? (
        <header className="space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">
              Oficjalny · Sezon 2026/27
            </p>
            <h1 className="mt-1 font-athletic text-3xl uppercase tracking-wide text-white sm:text-4xl">
              Dywizje
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
              Potwierdzony podział uczestników na dywizje. Sortowanie w dywizji
              wg OR 2025/26.
            </p>
          </div>

          {updatedLabel ? (
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/70 px-3.5 py-1.5 text-xs font-semibold text-slate-300">
              <Clock className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
              Ostatnia aktualizacja:{" "}
              <time dateTime={data.updatedAt ?? undefined} className="text-white">
                {updatedLabel}
              </time>
            </p>
          ) : null}

          <aside
            className="flex gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] px-4 py-3.5 sm:px-5"
            role="note"
          >
            <Info
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300"
              aria-hidden
            />
            <div className="min-w-0 space-y-1 text-sm leading-relaxed text-emerald-50/90">
              <p className="font-bold text-emerald-200">
                Oficjalny, zamknięty podział
              </p>
              <p className="text-emerald-100/75">
                Rekrutacja na sezon FPL 2026/2027 została zakończona. Poniższe
                składy dywizji są potwierdzone i obowiązują w sezonie.
              </p>
            </div>
          </aside>
        </header>
      ) : (
        <p className="text-sm text-slate-400">
          Obsada dywizji · herby klubów, Discord, FPL Team, menedżer i OR 2025/26.
        </p>
      )}

      {!data.divisions.length ? (
        <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-16 text-center text-sm text-slate-500">
          <Building2 className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          Brak dywizji w tym sezonie — pojawią się wraz z pierwszymi
          przypisaniami.
        </div>
      ) : (
        data.divisions.map((block) => (
          <DivisionStructureCard
            key={block.divisionId}
            block={block}
            logos={logos}
            tierLogos={tierLogos}
            linkToProfile={linkToProfile}
          />
        ))
      )}
    </div>
  );
}
