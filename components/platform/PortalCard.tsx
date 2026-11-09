import Image from "next/image";
import Link from "next/link";
import type { PortalVariant } from "@/lib/platform/site";

interface PortalCardProps {
  title: string;
  description: string;
  href: string;
  logoSrc: string;
  logoAlt?: string;
  variant: PortalVariant;
  ctaLabel: string;
  badge?: string;
}

/** Wspólny okrągły kontener — identyczny rozmiar dla wszystkich lig. */
const LOGO_BOX =
  "mt-5 mb-6 h-40 w-40 shrink-0 overflow-hidden rounded-full sm:mb-8 sm:mt-7 sm:h-52 sm:w-52";

const LOGO_IMG =
  "h-full w-full object-cover object-center drop-shadow-[0_12px_28px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-105";

const variantStyles: Record<
  PortalVariant,
  {
    card: string;
    showTitle: boolean;
    title: string;
    cta: string;
    badge: string;
  }
> = {
  arena: {
    card:
      "border-slate-700/80 bg-slate-900/50 shadow-none hover:border-fuchsia-500/40 hover:shadow-[0_0_40px_-12px_rgba(192,132,252,0.35)]",
    showTitle: true,
    title: "text-slate-200 group-hover:text-white",
    cta:
      "border border-slate-600/70 bg-transparent text-slate-300 group-hover:border-fuchsia-400/50 group-hover:text-fuchsia-200",
    badge:
      "border-slate-600/50 bg-slate-800/60 text-slate-400 group-hover:border-fuchsia-500/30 group-hover:text-fuchsia-300/90",
  },
  "na-minusie": {
    card:
      "border-emerald-500/35 bg-slate-900/60 shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:border-emerald-400/55 hover:shadow-[0_0_50px_rgba(16,185,129,0.4)]",
    showTitle: true,
    title: "text-white",
    cta:
      "border border-emerald-600 bg-emerald-600 text-white group-hover:border-emerald-500 group-hover:bg-emerald-500 group-hover:shadow-[0_0_24px_rgba(16,185,129,0.45)]",
    badge:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.25)]",
  },
  "no-big-six": {
    card:
      "border-amber-500/30 bg-slate-900/60 shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:border-amber-400 hover:shadow-[0_0_50px_rgba(245,158,11,0.35)]",
    showTitle: true,
    title: "text-amber-500 group-hover:text-amber-400",
    cta:
      "border border-amber-500/50 bg-amber-500/10 text-amber-500 group-hover:border-amber-400 group-hover:bg-amber-500/20 group-hover:shadow-[0_0_24px_rgba(245,158,11,0.35)]",
    badge:
      "border-amber-500/30 bg-amber-500/10 text-amber-500 shadow-[0_0_18px_rgba(245,158,11,0.2)]",
  },
};

export function PortalCard({
  title,
  description,
  href,
  logoSrc,
  logoAlt,
  variant,
  ctaLabel,
  badge,
}: PortalCardProps) {
  const styles = variantStyles[variant];

  return (
    <Link
      href={href}
      className={`group relative flex h-full min-h-[400px] w-full flex-col overflow-hidden rounded-3xl border p-7 backdrop-blur-xl transition-all duration-500 hover:scale-[1.02] sm:min-h-[460px] sm:p-9 ${styles.card}`}
    >
      <div className="relative z-10 flex h-full flex-1 flex-col items-center text-center">
        <div className="flex min-h-[1.75rem] items-center justify-center">
          {badge ? (
            <span
              className={`inline-flex min-w-[7.5rem] items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors duration-300 ${styles.badge}`}
            >
              {badge}
            </span>
          ) : null}
        </div>

        <div className={`relative ${LOGO_BOX}`}>
          <Image
            src={logoSrc}
            alt={logoAlt ?? title}
            width={208}
            height={208}
            quality={95}
            sizes="(max-width: 640px) 160px, 208px"
            className={LOGO_IMG}
            priority
          />
        </div>

        {styles.showTitle ? (
          <h2
            className={`font-athletic min-h-[2.5rem] text-3xl font-bold tracking-wide sm:min-h-[2.75rem] sm:text-4xl ${styles.title}`}
          >
            {title}
          </h2>
        ) : (
          <span className="sr-only">{title}</span>
        )}

        <p className="mt-4 flex-1 text-base leading-relaxed text-slate-400 transition-colors duration-300 group-hover:text-slate-300 sm:text-lg">
          {description}
        </p>

        <span
          className={`mt-8 inline-flex min-h-[3rem] w-full max-w-xs items-center justify-center rounded-xl px-6 py-3 text-center text-sm font-bold uppercase tracking-wider transition-all duration-300 ${styles.cta}`}
        >
          {ctaLabel}
        </span>
      </div>
    </Link>
  );
}
