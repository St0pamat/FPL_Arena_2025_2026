import type { ReactElement } from "react";
import {
  PLATFORM_SOCIAL_LINKS,
  type PlatformSocialId,
} from "@/lib/platform/socialLinks";

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 12.3 12.3 0 0 0-.608 1.25 18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

const ICON_BY_ID: Record<
  PlatformSocialId,
  (props: { className?: string }) => ReactElement
> = {
  discord: DiscordIcon,
  "x-fpl-arena": XIcon,
  "x-stopa": XIcon,
};

const TONE_BY_ID: Record<PlatformSocialId, string> = {
  discord:
    "border-indigo-500/35 text-indigo-300 hover:border-indigo-400/60 hover:bg-indigo-500/15 hover:text-indigo-200",
  "x-fpl-arena":
    "border-slate-600/50 text-slate-300 hover:border-slate-400/60 hover:bg-slate-700/40 hover:text-white",
  "x-stopa":
    "border-emerald-500/30 text-emerald-300/90 hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-emerald-200",
};

type Props = {
  /** compact = tylko ikony; labeled = ikona + krótka etykieta */
  variant?: "compact" | "labeled";
  className?: string;
};

export function PlatformSocialIcons({
  variant = "labeled",
  className = "",
}: Props) {
  return (
    <nav
      aria-label="Media społecznościowe"
      className={`flex flex-wrap items-center justify-center gap-2.5 ${className}`}
    >
      {PLATFORM_SOCIAL_LINKS.map((link) => {
        const Icon = ICON_BY_ID[link.id];
        const tone = TONE_BY_ID[link.id];
        return (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            title={link.label}
            aria-label={link.label}
            className={`group inline-flex items-center gap-2 rounded-full border bg-slate-950/50 px-3 py-2 text-xs font-semibold transition ${tone}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {variant === "labeled" ? (
              <span className="leading-none">{link.shortLabel}</span>
            ) : null}
          </a>
        );
      })}
    </nav>
  );
}
