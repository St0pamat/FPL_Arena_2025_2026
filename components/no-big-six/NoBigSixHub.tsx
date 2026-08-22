"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type {
  NoBigSixGwResult,
  NoBigSixPenalty,
  NoBigSixTeam,
} from "@/lib/no-big-six/types";
import { OverallTableTab } from "@/components/no-big-six/tabs/OverallTableTab";
import { GwResultsTab } from "@/components/no-big-six/tabs/GwResultsTab";
import { TeamsTab } from "@/components/no-big-six/tabs/TeamsTab";
import { RulesTab } from "@/components/no-big-six/tabs/RulesTab";

type TabId = "table" | "results" | "teams" | "rules";

const TABS: { id: TabId; label: string }[] = [
  { id: "table", label: "Tabela" },
  { id: "results", label: "Wyniki kolejek" },
  { id: "teams", label: "Zespoły" },
  { id: "rules", label: "Zasady ligi" },
];

export type NoBigSixHubProps = {
  teams: NoBigSixTeam[];
  results: NoBigSixGwResult[];
  penalties: NoBigSixPenalty[];
};

export function NoBigSixHub({ teams, results, penalties }: NoBigSixHubProps) {
  const [activeTab, setActiveTab] = useState<TabId>("table");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-amber-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Strona główna
      </Link>

      <nav
        className="mb-8 flex flex-wrap gap-1 border-b border-slate-800 sm:gap-2"
        aria-label="Nawigacja No Big Six"
      >
        {TABS.map(({ id, label }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`px-4 py-3 text-sm font-semibold transition-colors ${
                active
                  ? "border-b-2 border-amber-500 text-amber-500"
                  : "border-b-2 border-transparent text-slate-400 hover:text-slate-200"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {label}
            </button>
          );
        })}
      </nav>

      <section
        className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6 lg:p-8"
        aria-live="polite"
      >
        {activeTab === "table" ? (
          <OverallTableTab teams={teams} results={results} penalties={penalties} />
        ) : null}
        {activeTab === "results" ? (
          <GwResultsTab teams={teams} results={results} penalties={penalties} />
        ) : null}
        {activeTab === "teams" ? (
          <TeamsTab teams={teams} penalties={penalties} />
        ) : null}
        {activeTab === "rules" ? <RulesTab /> : null}
      </section>
    </div>
  );
}
