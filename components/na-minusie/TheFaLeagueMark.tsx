import {
  THE_FA_LEAGUE_LOGO,
  THE_FA_LEAGUE_MARK_ALT,
} from "@/lib/na-minusie/branding";

/**
 * Oficjalne logo The FA League — te same wymiary / okrągły crop
 * co dawny żółty placeholder (WWW + eksporty PNG).
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

type Props = {
  size?: MarkSize;
  className?: string;
};

export function TheFaLeagueMark({ size = "md", className = "" }: Props) {
  return (
    <div
      className={`aspect-square shrink-0 overflow-hidden rounded-full bg-black ring-1 ring-white/10 ${SIZE_BOX[size]} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- html-to-image / eksporty PNG */}
      <img
        src={THE_FA_LEAGUE_LOGO}
        alt={THE_FA_LEAGUE_MARK_ALT}
        className="box-border h-full max-h-full w-full max-w-full object-cover object-center"
        crossOrigin="anonymous"
        decoding="async"
      />
    </div>
  );
}
