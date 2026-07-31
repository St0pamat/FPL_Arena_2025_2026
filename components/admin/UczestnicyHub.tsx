"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileSpreadsheet, ImagePlus, UserPlus, Users } from "lucide-react";
import { ClubLogoManager } from "@/components/admin/ClubLogoManager";
import { CsvImport } from "@/components/admin/CsvImport";
import { TeamForm } from "@/components/admin/TeamForm";
import { TeamsByDivision } from "@/components/admin/TeamsByDivision";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { Division, Pyramid, Season, Team } from "@/lib/admin/types";

type TabId = "lista" | "import" | "logo" | "dodaj";

const TABS: { id: TabId; label: string; icon: typeof Users; hint: string }[] = [
  {
    id: "lista",
    label: "Zarządzaj",
    icon: Users,
    hint: "Edycja, usuwanie, zmiana dywizji / klubu — zmiany wracają do terminarza i tabel.",
  },
  {
    id: "import",
    label: "Import CSV",
    icon: FileSpreadsheet,
    hint: "Dry-run: podgląd → potwierdzenie (UPSERT po FPL ID).",
  },
  {
    id: "logo",
    label: "Logo klubów",
    icon: ImagePlus,
    hint: "Cresty w public/club-logos/ — dopasowanie po nazwie klubu uczestnika.",
  },
  {
    id: "dodaj",
    label: "Dodaj ręcznie",
    icon: UserPlus,
    hint: "Pojedynczy uczestnik bez CSV.",
  },
];

function normalizeTab(raw: string | null): TabId {
  if (raw === "import" || raw === "logo" || raw === "dodaj" || raw === "lista") return raw;
  if (raw === "logos" || raw === "club-logos") return "logo";
  return "lista";
}

export function UczestnicyHub({
  teams,
  divisions,
  seasons,
  pyramids,
  logos,
}: {
  teams: Team[];
  divisions: Division[];
  seasons: Season[];
  pyramids: Pyramid[];
  logos: ClubLogoRecord[];
}) {
  const search = useSearchParams();
  const initial = useMemo(() => normalizeTab(search.get("tab")), [search]);
  const [tab, setTab] = useState<TabId>(initial);

  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  function selectTab(id: TabId) {
    setTab(id);
    const url = new URL(window.location.href);
    if (id === "lista") url.searchParams.delete("tab");
    else url.searchParams.set("tab", id);
    window.history.replaceState({}, "", url.pathname + url.search);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
        {TABS.map(({ id, label, icon: Icon }) => {
          const on = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectTab(id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                on
                  ? "bg-[#39FF14] text-black"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      <p className="text-sm text-slate-400">{active.hint}</p>

      {tab === "lista" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">
                Uczestnicy według dywizji ({teams.length})
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Ikona ołówka = edycja (klub, logo-powiązanie, dywizja, dane). Po zapisie odświeżają
                się tabele i Maszyna Losująca.
              </p>
            </div>
          </div>
          <TeamsByDivision
            teams={teams}
            divisions={divisions}
            seasons={seasons}
            pyramids={pyramids}
            logos={logos}
          />
        </div>
      )}

      {tab === "import" && (
        <CsvImport seasons={seasons} pyramids={pyramids} logos={logos} />
      )}

      {tab === "logo" && (
        <ClubLogoManager
          logos={logos}
          participantClubs={teams.map((t) => t.chosen_club)}
        />
      )}

      {tab === "dodaj" && <TeamForm divisions={divisions} logos={logos} />}
    </div>
  );
}
