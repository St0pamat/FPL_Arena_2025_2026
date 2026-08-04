import Image from "next/image";
import { Handshake } from "lucide-react";
import { ARENA_PORTAL_ALT, ARENA_PORTAL_LOGO } from "@/lib/arena";
import { NA_MINUSIE_LOGO, NA_MINUSIE_LOGO_ALT } from "@/lib/na-minusie";
import { NM_CONTAINER } from "@/lib/na-minusie/theme";

/**
 * Stały pasek współpracy — zawsze widoczny pod głównym menu Na Minusie.
 */
export function CollaborationCredits() {
  return (
    <div
      className="border-t border-slate-800/80 bg-slate-950/95 text-[11px] text-slate-300 backdrop-blur-md sm:text-xs"
      role="note"
      aria-label="Twórcy projektu"
    >
      <div
        className={`${NM_CONTAINER} flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 py-1.5 sm:py-2`}
      >
        {/* Mobile: kompakt */}
        <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 font-semibold tracking-wide text-slate-300 sm:hidden">
          <span className="text-sky-400">St0pa</span>
          <span className="text-slate-600">(</span>
          <span className="inline-flex items-center gap-1 text-slate-400">
            <Image
              src={ARENA_PORTAL_LOGO}
              alt=""
              width={14}
              height={14}
              className="h-3.5 w-3.5 object-contain"
              aria-hidden
            />
            FPL Arena
          </span>
          <span className="text-slate-600">)</span>
          <span className="mx-0.5 text-slate-600">×</span>
          <span className="text-emerald-400">Baldwiniasty</span>
          <span className="text-slate-600">(</span>
          <span className="inline-flex items-center gap-1 text-slate-400">
            <Image
              src={NA_MINUSIE_LOGO}
              alt=""
              width={14}
              height={14}
              className="h-3.5 w-3.5 object-contain"
              aria-hidden
            />
            Na Minusie
          </span>
          <span className="text-slate-600">)</span>
        </div>

        {/* Desktop: wyśrodkowana linia */}
        <div className="hidden flex-wrap items-center justify-center gap-x-3 gap-y-1.5 sm:flex">
          <p className="inline-flex items-center gap-1.5 font-medium text-slate-400">
            <Handshake className="h-3.5 w-3.5 text-amber-400" aria-hidden />
            Projekt powstał we współpracy:
          </p>

          <div className="inline-flex flex-wrap items-center justify-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/35 bg-sky-950/40 px-2.5 py-1">
              <span className="font-bold text-sky-400">St0pa</span>
              <span className="text-slate-600" aria-hidden>
                |
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
                <Image
                  src={ARENA_PORTAL_LOGO}
                  alt={ARENA_PORTAL_ALT}
                  width={16}
                  height={16}
                  className="h-4 w-4 object-contain drop-shadow-[0_0_6px_rgba(56,189,248,0.35)]"
                />
                FPL Arena
              </span>
              <span className="ml-0.5 hidden rounded bg-sky-950/70 px-1.5 py-0.5 text-[10px] font-medium text-sky-300/90 md:inline">
                Architekt &amp; Twórca Ligi
              </span>
            </div>

            <span className="font-black text-slate-600" aria-hidden>
              ×
            </span>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-950/30 px-2.5 py-1">
              <span className="font-bold text-emerald-400">Baldwiniasty</span>
              <span className="text-slate-600" aria-hidden>
                |
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
                <Image
                  src={NA_MINUSIE_LOGO}
                  alt={NA_MINUSIE_LOGO_ALT}
                  width={16}
                  height={16}
                  className="h-4 w-4 object-contain drop-shadow-[0_0_6px_rgba(57,255,20,0.3)]"
                />
                Na Minusie
              </span>
              <span className="ml-0.5 hidden rounded bg-violet-950/50 px-1.5 py-0.5 text-[10px] font-medium text-violet-300/90 md:inline">
                Założyciel Społeczności
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
