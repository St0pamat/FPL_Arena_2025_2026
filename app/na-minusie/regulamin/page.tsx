import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RegulaminSection } from "@/components/na-minusie/RegulaminSection";
import { NA_MINUSIE_BRAND } from "@/lib/na-minusie";
import { NA_MINUSIE_PATHS } from "@/lib/na-minusie/links";
import { NM_CONTAINER } from "@/lib/na-minusie/theme";

export const metadata: Metadata = {
  title: `Regulamin — ${NA_MINUSIE_BRAND}`,
  description:
    "Oficjalny regulamin ligi H2H Na Minusie ™. Format rozgrywek, zapisy, system Mediana 2+1, awanse i spadki.",
};

export default function RegulaminPage() {
  return (
    <main>
      <div className={`${NM_CONTAINER} pt-8`}>
        <Link
          href={NA_MINUSIE_PATHS.home}
          className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#888] transition-colors hover:text-[#39FF14]"
        >
          <ArrowLeft className="h-4 w-4" />
          Powrót do strony głównej
        </Link>
      </div>
      <RegulaminSection />
    </main>
  );
}
