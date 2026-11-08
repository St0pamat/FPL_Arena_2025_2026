import {
  THE_FA_LEAGUE_MARK_ALT,
  THE_FA_LEAGUE_MARK_LABEL,
} from "@/lib/na-minusie/branding";

/**
 * Tymczasowy placeholder marki The FA League (żółty okrąg + napis),
 * taki sam jak na eksportach PNG — do czasu docelowego logo.
 */
type MarkSize = "nav" | "sm" | "md" | "lg" | "hero" | "fill";

const SIZE_BOX: Record<MarkSize, string> = {
  nav: "h-8 w-8 sm:h-9 sm:w-9",
  sm: "h-16 w-16",
  md: "h-28 w-28 sm:h-36 sm:w-36",
  lg: "h-32 w-32 sm:h-40 sm:w-40",
  hero: "h-32 w-32 sm:h-40 sm:w-40 lg:h-48 lg:w-48",
  fill: "h-full w-full",
};

const SIZE_TEXT: Record<MarkSize, string> = {
  nav: "px-0.5 text-center text-[5px] font-black uppercase leading-[1.05] tracking-[0.02em] text-slate-950 sm:text-[6px]",
  sm: "px-1.5 text-center text-[9px] font-black uppercase leading-[1.05] tracking-[0.04em] text-slate-950",
  md: "px-2 text-center text-[0.85rem] font-black uppercase leading-[1.05] tracking-[0.05em] text-slate-950 sm:text-[1.05rem]",
  lg: "px-3 text-center text-[1.05rem] font-black uppercase leading-[1.05] tracking-[0.05em] text-slate-950 sm:text-[1.25rem]",
  hero: "px-3 text-center text-[1.05rem] font-black uppercase leading-[1.05] tracking-[0.05em] text-slate-950 sm:px-4 sm:text-[1.35rem] lg:text-[1.55rem]",
  fill: "px-2 text-center text-[0.7rem] font-black uppercase leading-[1.05] tracking-[0.04em] text-slate-950 sm:text-[0.95rem]",
};

type Props = {
  size?: MarkSize;
  className?: string;
  textClassName?: string;
};

export function TheFaLeagueMark({
  size = "md",
  className = "",
  textClassName,
}: Props) {
  return (
    <div
      className={`flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F5C542] ring-1 ring-white/10 ${SIZE_BOX[size]} ${className}`}
      role="img"
      aria-label={THE_FA_LEAGUE_MARK_ALT}
    >
      <span className={textClassName ?? SIZE_TEXT[size]}>
        {THE_FA_LEAGUE_MARK_LABEL}
      </span>
    </div>
  );
}
