import { PortalCard } from "@/components/platform/PortalCard";
import { SplashAdminLink } from "@/components/platform/SplashAdminLink";
import { SplashBrandLockup } from "@/components/platform/SplashBrandLockup";
import { NA_MINUSIE_LOGO, NA_MINUSIE_LOGO_ALT } from "@/lib/na-minusie";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0B0F19] px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
      <SplashAdminLink />
      <div className="splash-grid pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-10 mb-10 w-full sm:mb-14">
        <SplashBrandLockup />
      </div>

      <div className="relative z-10 grid w-full max-w-5xl grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 md:gap-8">
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
          title="NA MINUSIE ™"
          description="Projekt w ramach współpracy St0pa × Baldwiniasty. Wejdź w nowy wymiar Head to Head — system, w którym Twój wynik wreszcie ma znaczenie."
          href="/na-minusie"
          logoSrc={NA_MINUSIE_LOGO}
          logoAlt={NA_MINUSIE_LOGO_ALT}
          variant="na-minusie"
          ctaLabel="Dołącz do Ligi →"
          badge="Aktualny"
        />
      </div>

      <footer className="relative z-10 mt-12 text-center text-xs text-slate-600 sm:mt-16">
        Fantasy Premier League — niezależna platforma społecznościowa
      </footer>
    </main>
  );
}
