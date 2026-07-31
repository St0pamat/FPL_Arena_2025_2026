import { useState, type ReactNode } from "react";
import { PageContainer, PageHeader } from "@arena/components/layout";
import type { HubSection } from "@arena/config/navigation";

export const HubShell = ({
  title,
  lead,
  sections,
  defaultSectionId,
  sectionsWithOwnHeader = [],
  children,
}: {
  title: string;
  lead: string;
  sections: HubSection[];
  defaultSectionId?: string;
  /** Sekcje z własnym PageHeader — bez duplikatu tytułu w hubie */
  sectionsWithOwnHeader?: string[];
  children: (sectionId: string) => ReactNode;
}) => {
  const [section, setSection] = useState(defaultSectionId ?? sections[0]?.id ?? "");
  const current = sections.find((s) => s.id === section) ?? sections[0];

  return (
    <PageContainer width="full">
      <PageHeader title={title} lead={lead} />

      <div className="flex flex-col xl:flex-row gap-8 xl:gap-10">
        <aside className="xl:w-72 2xl:w-80 shrink-0">
          <div className="xl:sticky xl:top-28 glass-panel rounded-2xl border border-slate-800 panel-pad">
            <h3 className="text-fluid-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-4">
              W sekcji
            </h3>
            <nav
              className="flex flex-row xl:flex-col gap-2 overflow-x-auto xl:overflow-visible pb-1 xl:pb-0"
              aria-label={`Podmenu: ${title}`}
            >
              {sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  className={`shrink-0 xl:shrink xl:w-full text-left px-3 py-3 rounded-xl text-fluid-sm font-semibold transition-all border flex items-center gap-2 ${
                    section === s.id
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "text-slate-400 border-slate-800 hover:text-white hover:border-slate-600"
                  }`}
                >
                  <span aria-hidden>{s.icon}</span>
                  <span className="whitespace-nowrap xl:whitespace-normal">{s.title}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <section className="flex-1 min-w-0 space-y-6">
          {current && !sectionsWithOwnHeader.includes(section) && (
            <div>
              <h2 className="text-fluid-2xl font-athletic font-bold text-white uppercase tracking-wide flex items-center gap-3">
                <span aria-hidden>{current.icon}</span>
                {current.title}
              </h2>
              <p className="text-fluid-base text-slate-400 mt-2 leading-relaxed">{current.description}</p>
            </div>
          )}
          {children(section)}
        </section>
      </div>
    </PageContainer>
  );
};
