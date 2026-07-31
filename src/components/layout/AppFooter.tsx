import { LeagueLogo } from "@arena/components/branding";
import { NAV_GROUPS, type AppTab } from "@arena/config/tabs";
import { SocialLinks } from "@arena/components/layout/SocialLinks";

const LEAGUE_FACTS = [
  { label: "Format", value: "H2H · 20 menedżerów" },
  { label: "Sezon", value: "2025/26 · 38 kolejek" },
  { label: "Status", value: "Sezon zakończony" },
] as const;

export const AppFooter = ({ onTabChange }: { onTabChange: (tab: AppTab) => void }) => {
  const year = new Date().getFullYear();

  const handleNav = (tab: AppTab) => {
    onTabChange(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="site-footer mt-auto border-t border-emerald-500/15 bg-[#070a12]/95 backdrop-blur-md">
      <div className="w-full max-w-app-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-10 lg:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-10 xl:gap-8">
          <div className="xl:col-span-4 space-y-5">
            <div className="flex items-start gap-4">
              <div className="league-logo-wrap rounded-xl p-2.5 shrink-0">
                <LeagueLogo size="lg" />
              </div>
              <div className="min-w-0">
                <p className="text-fluid-xs font-mono font-bold uppercase tracking-widest text-emerald-400/90">
                  FPL Arena
                </p>
                <h2 className="text-fluid-xl font-athletic font-bold text-white uppercase tracking-tight mt-1 leading-tight">
                  Skarb Kibica
                </h2>
                <p className="text-fluid-sm text-slate-400 mt-2 leading-relaxed">
                  Interaktywny magazyn po zakończeniu sezonu — sezon, profile, statystyki i narzędzia do
                  udostępniania w jednym miejscu.
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-3">
              {LEAGUE_FACTS.map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-800/80 bg-slate-950/50 px-4 py-3"
                >
                  <dt className="kpi-label">{label}</dt>
                  <dd className="text-fluid-sm font-semibold text-slate-200 mt-1.5">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="xl:col-span-3">
            <h3 className="footer-heading">Nawigacja</h3>
            <nav aria-label="Stopka — nawigacja" className="space-y-4">
              {NAV_GROUPS.map((group) => (
                <div key={group.label ?? "start"}>
                  {group.label && (
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-2">
                      {group.label}
                    </p>
                  )}
                  <ul className="space-y-1">
                    {group.items.map(({ id, label, icon }) => (
                      <li key={id}>
                        <button type="button" onClick={() => handleNav(id)} className="footer-nav-link">
                          <span aria-hidden>{icon}</span>
                          {label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          <div className="xl:col-span-3">
            <h3 className="footer-heading">Społeczność</h3>
            <p className="text-fluid-sm text-slate-400 leading-relaxed mb-4">
              Dołącz do rozmów, obejrzyj prezentacje uczestników i śledź kolejne projekty ligi.
            </p>
            <SocialLinks variant="footer" />
          </div>

          <div className="xl:col-span-2">
            <h3 className="footer-heading">Projekt</h3>
            <ul className="space-y-3 text-fluid-sm text-slate-400 leading-relaxed">
              <li>
                <span className="text-slate-500 block kpi-label mb-1">Autor</span>
                <a
                  href="https://x.com/st0pamat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-200 font-semibold hover:text-emerald-400 transition-colors"
                >
                  St0pa ↗
                </a>
              </li>
              <li>
                <span className="text-slate-500 block kpi-label mb-1">Liga</span>
                Igrzyska Kapci Kłapcia
              </li>
              <li>
                <span className="text-slate-500 block kpi-label mb-1">Dane</span>
                Wyniki H2H, statystyki FPL i profile uczestników
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom mt-10 pt-6 border-t border-slate-800/80">
          <p className="text-fluid-xs text-slate-500 leading-relaxed">
            © {year} FPL Arena · Skarb Kibica · Sezon 2025/26. Niezależny projekt fanowski — niepowiązany z
            Premier League ani Fantasy Premier League.
          </p>
        </div>
      </div>
    </footer>
  );
};
