import Image from "next/image";
import { Suspense } from "react";
import { ArrowDown } from "lucide-react";
import {
  HeroCapacityStrip,
  HeroCapacityStripSkeleton,
} from "@/components/na-minusie/HeroCapacityStrip";
import { NA_MINUSIE_BRAND, NA_MINUSIE_LOGO, NA_MINUSIE_LOGO_ALT } from "@/lib/na-minusie/branding";

export function HeroSection() {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-start px-6 pb-28 pt-6 sm:px-10 sm:pt-8 lg:px-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">
        <aside
          role="status"
          aria-label="Komunikat FA: Prezes na zgrupowaniu"
          className="mb-8 w-full rounded-2xl border-2 border-amber-500/60 bg-amber-950/40 p-5 text-left shadow-lg shadow-amber-500/10 sm:p-6"
        >
          <p className="mb-2 flex flex-wrap items-center gap-2 text-base font-extrabold text-amber-400 sm:text-lg">
            <span className="mr-0 animate-pulse rounded-md bg-amber-500 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-950 sm:mr-2">
              ⚠️ UWAGA!
            </span>
            <span>🌴 Komunikat FA: Prezes na zgrupowaniu (09.08 - 15.08) 🍹</span>
          </p>
          <p className="text-sm leading-relaxed text-amber-100/90 sm:text-base">
            W tych dniach główny organizator ładuje baterie, więc kontakt i aktualizacje list na
            stronie mogą łapać lekkie opóźnienia (VAR wciąż analizuje). Spokojnie – nigdzie nie
            uciekłem! Po prostu zbieram siły, by na tydzień przed deadlinem wrócić i dopiąć nasz
            projekt na absolutny guzik. Proszę się nie martwić: każdy, kto wyśle zgłoszenie i
            zmieści się w limicie 50 osób, zostanie bez problemu zapisany do ligi. Budujcie składy,
            widzimy się niedługo! ⚽
          </p>
        </aside>

        <Suspense fallback={<HeroCapacityStripSkeleton />}>
          <HeroCapacityStrip />
        </Suspense>

        <p className="nm-headline mb-8 text-3xl leading-[1.05] text-white sm:text-5xl lg:text-6xl xl:text-7xl">
          {NA_MINUSIE_BRAND}
        </p>

        <Image
          src={NA_MINUSIE_LOGO}
          alt={NA_MINUSIE_LOGO_ALT}
          width={200}
          height={200}
          priority
          quality={95}
          className="mb-10 h-32 w-32 object-contain sm:mb-12 sm:h-40 sm:w-40 lg:h-48 lg:w-48"
        />

        <h1 className="nm-headline text-3xl leading-[1.05] sm:text-5xl lg:text-6xl xl:text-7xl">
          <span className="nm-green nm-glow">Twój Wynik Ma Znaczenie</span>
        </h1>

        <div className="mt-10 max-w-4xl text-left text-base leading-relaxed text-slate-300 sm:mt-12 sm:text-lg">
          <p>
            W tradycyjnych ligach Head to Head ślepy los i pechowy terminarz potrafią odebrać całą
            satysfakcję z gry. W Na Minusie ™ zmieniamy zasady – łączymy bezpośrednią rywalizację z
            dodatkowym punktowaniem za dobrą formę. Wybierz swój ulubiony angielski klub piłkarski –
            od Premier League po najniższe ligi, a nawet kultowe drużyny z seriali, filmów, komiksów
            czy książek (też angielskie kluby piłkarskie). Klimat i wspólna zabawa na Discordzie
            wchodzą na zupełnie inny poziom.
          </p>
        </div>

        <a
          href="#jak-dolaczyc"
          className="nm-btn-primary mt-12 inline-flex items-center gap-2.5 px-6 py-3 text-xs sm:px-8 sm:text-sm"
        >
          Jak dołączyć?
          <span className="inline-flex items-center gap-1 rounded-md bg-black/15 px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-black/70">
            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
            skrót ↓
          </span>
        </a>
      </div>
    </section>
  );
}
