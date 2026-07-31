import Link from "next/link";
import { CtaButtons } from "@/components/na-minusie/CtaButtons";
import { SectionShell } from "@/components/na-minusie/SectionShell";
import { NA_MINUSIE_PATHS } from "@/lib/na-minusie/links";

export function CtaSection() {
  return (
    <SectionShell id="dolacz" className="relative overflow-hidden" tight>
      <div className="nm-cta-glow pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative mx-auto max-w-4xl text-center">
        <h2 className="nm-headline text-4xl sm:text-5xl lg:text-6xl">
          Dołącz
          <br />
          <span className="nm-green nm-glow">do elity.</span>
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
          Ilość miejsc w dywizjach startowych jest ograniczona. Pierwsze miejsca gwarantują start w
          wyższych ligach.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4">
          <CtaButtons
            layout="column"
            formLabel="Wypełnij Formularz Zgłoszeniowy"
            discordLabel="Dołącz do naszej Społeczności"
          />
          <Link href={NA_MINUSIE_PATHS.regulamin} className="nm-btn-secondary w-full max-w-lg">
            Przeczytaj pełny Regulamin ligi
          </Link>
        </div>
      </div>
    </SectionShell>
  );
}
