import Link from "next/link";
import { Construction, HardHat } from "lucide-react";
import { NA_MINUSIE_PATHS } from "@/lib/na-minusie/links";

/** Publiczny ekran soft-launch — Strefa Gracza niedostępna dla gości. */
export function HubUnderConstruction() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center bg-[#0B0F19] px-6 py-16 text-center">
      <div className="relative mb-8">
        <div
          className="absolute inset-0 rounded-full bg-amber-500/20 blur-2xl"
          aria-hidden
        />
        <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 sm:h-24 sm:w-24">
          <HardHat className="h-10 w-10 sm:h-12 sm:w-12" strokeWidth={1.5} aria-hidden />
        </div>
      </div>

      <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-amber-400/90">
        <Construction className="h-3.5 w-3.5" aria-hidden />
        Soft launch
      </p>

      <h1 className="font-athletic max-w-xl text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl lg:text-5xl">
        Strefa Gracza w budowie
      </h1>

      <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-400 sm:text-lg">
        Trwają prace programistyczne. Twoje centrum dowodzenia będzie gotowe przed startem pierwszego
        sezonu.
      </p>

      <Link
        href={NA_MINUSIE_PATHS.home}
        className="nm-btn-primary mt-10 inline-flex items-center justify-center px-8 py-3.5 text-sm"
      >
        Wróć do strony głównej
      </Link>
    </section>
  );
}
