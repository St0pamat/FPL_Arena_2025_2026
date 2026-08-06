import Image from "next/image";
import { PortalCard } from "@/components/platform/PortalCard";
import { SplashAdminLink } from "@/components/platform/SplashAdminLink";
import { ARENA_PORTAL_ALT, ARENA_PORTAL_LOGO } from "@/lib/arena";
import { NA_MINUSIE_LOGO, NA_MINUSIE_LOGO_ALT } from "@/lib/na-minusie";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0B0F19] px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
      <SplashAdminLink />
      <div className="splash-grid pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-10 mb-10 max-w-3xl text-center sm:mb-14">
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
          <div className="relative h-24 w-24 shrink-0 sm:h-28 sm:w-28 lg:h-36 lg:w-36">
            <Image
              src={ARENA_PORTAL_LOGO}
              alt={ARENA_PORTAL_ALT}
              fill
              priority
              quality={95}
              sizes="(max-width: 640px) 96px, (max-width: 1024px) 112px, 144px"
              className="object-contain drop-shadow-[0_0_28px_rgba(56,189,248,0.35)]"
            />
          </div>
          <h1 className="font-athletic text-5xl font-bold tracking-[0.06em] text-white sm:text-6xl lg:text-7xl">
            FPL ARENA
          </h1>
        </div>
        <p className="mx-auto mt-5 max-w-xl text-base font-medium leading-relaxed text-slate-300 sm:mt-6 sm:text-lg">
          Organizujemy ligi FPL, w których każdy punkt ma swoją cenę.
        </p>
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
