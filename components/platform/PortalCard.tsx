import Image from "next/image";
import Link from "next/link";
import type { PortalVariant } from "@/lib/platform/site";

interface PortalCardProps {
  title: string;
  description: string;
  href: string;
  logoSrc: string;
  logoAlt: string;
  variant: PortalVariant;
  ctaLabel: string;
  badge?: string;
}

const variantStyles: Record<
  PortalVariant,
  {
    card: string;
    logoRing: string;
    title: string;
    cta: string;
    badge: string;
  }
> = {
  arena: {
    card:
      "border-slate-700/80 bg-slate-900/50 shadow-none hover:border-fuchsia-500/40 hover:shadow-[0_0_40px_-12px_rgba(192,132,252,0.35)]",
    logoRing: "ring-slate-600/40 group-hover:ring-fuchsia-400/40",
    title: "text-slate-200 group-hover:text-white",
    cta:
      "border border-slate-600/70 bg-transparent text-slate-300 group-hover:border-fuchsia-400/50 group-hover:text-fuchsia-200",
    badge:
      "border-slate-600/50 bg-slate-800/60 text-slate-400 group-hover:border-fuchsia-500/30 group-hover:text-fuchsia-300/90",
  },
  "na-minusie": {
    card:
      "border-emerald-500/35 bg-slate-900/60 shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:border-emerald-400/55 hover:shadow-[0_0_50px_rgba(16,185,129,0.4)]",
    logoRing: "ring-emerald-500/35 group-hover:ring-emerald-400/60",
    title: "text-white",
    cta:
      "border border-emerald-600 bg-emerald-600 text-white group-hover:border-emerald-500 group-hover:bg-emerald-500 group-hover:shadow-[0_0_24px_rgba(16,185,129,0.45)]",
    badge:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.25)]",
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
      className={`group relative flex h-full min-h-[360px] w-full flex-col overflow-hidden rounded-3xl border p-7 backdrop-blur-xl transition-all duration-500 hover:scale-[1.02] sm:min-h-[420px] sm:p-9 ${styles.card}`}
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

        <div
          className={`relative mt-5 mb-6 flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-slate-950/70 p-3 ring-2 backdrop-blur-sm transition-all duration-500 group-hover:scale-105 sm:mb-7 sm:mt-6 sm:h-36 sm:w-36 ${styles.logoRing}`}
        >
          <Image
            src={logoSrc}
            alt={logoAlt}
            width={144}
            height={144}
            quality={95}
            sizes="(max-width: 640px) 112px, 144px"
            className="h-full w-full object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-transform duration-500 group-hover:scale-110"
            priority
          />
        </div>

        <h2
          className={`font-athletic min-h-[2.5rem] text-3xl font-bold tracking-wide sm:min-h-[2.75rem] sm:text-4xl ${styles.title}`}
        >
          {title}
        </h2>

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
