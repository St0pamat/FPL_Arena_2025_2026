import { LeagueLogo } from "@/components/branding";
import { NAV_GROUPS, type AppTab } from "@/config/tabs";
import { SocialLinks } from "@/components/layout/SocialLinks";

export const AppHeader = ({
  activeTab,
  onTabChange,
}: {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}) => (
  <header className="sticky top-0 z-50 border-b border-emerald-500/20 bg-[#0b0f19]/95 backdrop-blur-md shadow-2xl">
    <div className="w-full max-w-app-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-4 lg:py-5">
      <div className="flex flex-col gap-3 lg:gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="league-logo-wrap rounded-xl p-2.5 shrink-0">
              <LeagueLogo size="lg" />
            </div>
            <div className="min-w-0">
              <h1 className="text-fluid-xl lg:text-fluid-2xl font-bold tracking-tight text-white flex flex-wrap items-center gap-2">
                <span className="break-words leading-snug">Igrzyska Kapci Kłapcia</span>
                <span className="badge-pill bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shrink-0">
                  Ostateczny Raport
                </span>
              </h1>
              <p className="text-fluid-sm text-slate-400 mt-1">
                Oficjalny, interaktywny Skarb Kibica (Sezon 2025/26)
              </p>
            </div>
          </div>

          <SocialLinks variant="header" />
        </div>

        <nav
          className="nav-bar flex flex-nowrap items-center gap-1 bg-[#020617]/90 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto"
          aria-label="Główna nawigacja"
        >
          {NAV_GROUPS.map((group, groupIndex) => (
            <div key={group.label ?? `group-${groupIndex}`} className="flex items-center gap-1 shrink-0">
              {groupIndex > 0 && (
                <span
                  className="hidden sm:block w-px h-7 bg-slate-700/80 mx-1 shrink-0"
                  aria-hidden
                />
              )}
              {group.items.map(({ id, label, icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onTabChange(id)}
                  className={`nav-tab shrink-0 ${activeTab === id ? "nav-tab-active" : "nav-tab-inactive"}`}
                >
                  <span className="text-base leading-none" aria-hidden>
                    {icon}
                  </span>
                  {label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </div>
    </div>
  </header>
);
