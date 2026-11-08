import { TheFaLeagueMark } from "@/components/na-minusie/TheFaLeagueMark";
import { PortalCard } from "@/components/platform/PortalCard";
import { PlatformSocialIcons } from "@/components/platform/PlatformSocialIcons";
import { SplashAdminLink } from "@/components/platform/SplashAdminLink";
import { SplashBrandLockup } from "@/components/platform/SplashBrandLockup";
import {
  NO_BIG_SIX_LOGO,
  NO_BIG_SIX_LOGO_ALT,
  NO_BIG_SIX_PORTAL_TITLE,
} from "@/lib/no-big-six/branding";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0B0F19] px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
      <SplashAdminLink />
      <div className="splash-grid pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-10 mb-10 w-full sm:mb-14">
        <SplashBrandLockup />
      </div>

      <div className="relative z-10 grid w-full max-w-6xl grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        <PortalCard
          title="IGRZYSKA KAPCI KŁAPCIA"
          description="Zamknięty projekt. Skarb Kibica i archiwum sezonu 2025/2026."
          href="/arena"
          logoSrc="/logo/22952.png"
          logoAlt="Logo Igrzyska Kapci Kłapcia"
          variant="arena"
          ctaLabel="Przejdź do Archiwum →"
          badge="Zamknięty"
        />
        <PortalCard
          title="THE FA LEAGUE"
          description="Wejdź w nowy wymiar Head to Head — system, w którym Twój wynik wreszcie ma znaczenie."
          href="/strefa-gracza"
          logoSlot={<TheFaLeagueMark size="fill" />}
          variant="na-minusie"
          ctaLabel="Wejdź do Ligi →"
          badge="Aktualny"
        />
        <PortalCard
          title={NO_BIG_SIX_PORTAL_TITLE}
          description="Liga bez gigantów. Punktują tylko gracze spoza klasycznej Big Six. Czy potrafisz wygrać bez gwiazd z topu?"
          href="/no-big-six"
          logoSrc={NO_BIG_SIX_LOGO}
          logoAlt={NO_BIG_SIX_LOGO_ALT}
          variant="no-big-six"
          ctaLabel="Wejdź do Ligi →"
          badge="Aktualny"
        />
      </div>

      <footer className="relative z-10 mt-12 space-y-4 text-center text-xs text-slate-600 sm:mt-16">
        <PlatformSocialIcons />
        <div className="space-y-1.5">
          <p>Fantasy Premier League — niezależna platforma społecznościowa</p>
          <p className="text-slate-500">
            www.fpl-arena.com · Powered by St0pa | FPL Arena
          </p>
        </div>
      </footer>
    </main>
  );
}
