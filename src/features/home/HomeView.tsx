import { LeagueLogo } from "@arena/components/branding";
import { HomeNavButton } from "@arena/features/home/components/HomeNavButton";
import { NAV_GROUPS, type AppTab } from "@arena/config/tabs";

export const HomeView = ({
  magazynOpen,
  onOpenMagazyn,
  onNavigate,
}: {
  magazynOpen: boolean;
  onOpenMagazyn: () => void;
  onNavigate: (tab: AppTab) => void;
}) => (
  <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] text-center px-4 sm:px-8 py-12 lg:py-16 w-full max-w-5xl mx-auto">
    <div className="league-logo-wrap rounded-3xl p-5 lg:p-6 mb-8 lg:mb-10">
      <LeagueLogo size="hero" />
    </div>
    <h2 className="text-fluid-5xl font-athletic font-bold text-white uppercase tracking-tighter drop-shadow-2xl leading-none">
      Sezon <span className="gradient-text">Zakończony</span>
    </h2>
    <p className="text-fluid-lg text-slate-300 max-w-3xl leading-relaxed mt-8 lg:mt-10">
      To był spektakularny cyfrowy teatr. Za nami 38 morderczych kolejek pełnych dramaturgii w formacie H2H.
      Byliśmy świadkami upadków liderów, rzezi transferowych o 3 nad ranem, legendarnych serii i mrożących krew
      w żyłach wyników. Przed Tobą 20 Gladiatorów odartych z tajemnic przez bezwzględną matematykę.
    </p>
    <div className="flex flex-col items-center gap-5 pt-10 lg:pt-12 w-full max-w-3xl">
      {!magazynOpen ? (
        <button
          type="button"
          onClick={onOpenMagazyn}
          className="w-full sm:w-auto min-w-[16rem] px-12 py-4 lg:py-5 bg-emerald-500 text-slate-950 font-bold rounded-2xl hover:bg-emerald-400 transition-all text-fluid-lg shadow-[0_0_32px_rgba(16,185,129,0.35)]"
        >
          Otwórz magazyn
        </button>
      ) : (
        <div className="w-full space-y-8 animate-fade-in text-left">
          <p className="text-fluid-sm text-emerald-400/90 font-semibold uppercase tracking-widest text-center">
            Magazyn otwarty — wybierz sekcję
          </p>
          {NAV_GROUPS.filter((g) => g.items[0]?.id !== "home").map((group) => (
            <div key={group.label ?? "misc"}>
              {group.label && (
                <p className="kpi-label mb-3 px-1">{group.label}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {group.items.map(({ id, label, icon }) => (
                  <HomeNavButton key={id} onClick={() => onNavigate(id)} icon={icon}>
                    {label}
                  </HomeNavButton>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);
