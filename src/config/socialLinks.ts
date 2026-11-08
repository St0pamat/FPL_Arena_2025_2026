import {
  PLATFORM_DISCORD_INVITE,
  PLATFORM_X_FPL_ARENA,
  PLATFORM_X_STOPA,
} from "../../lib/platform/socialLinks";

export type SocialLink = {
  id: "discord" | "youtube" | "x-fpl-arena" | "x-stopa";
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  className: string;
};

export const SOCIAL_LINKS: SocialLink[] = [
  {
    id: "discord",
    href: PLATFORM_DISCORD_INVITE,
    label: "Discord FPL Arena",
    shortLabel: "Discord",
    description: "Dołącz do społeczności ligi",
    className:
      "border-slate-700 text-slate-300 hover:text-indigo-200 hover:border-indigo-400/50 hover:bg-indigo-500/15 hover:shadow-[0_0_20px_rgba(99,102,241,0.25)]",
  },
  {
    id: "youtube",
    href: "https://www.youtube.com/@fpl_arena/videos",
    label: "YouTube FPL Arena",
    shortLabel: "YouTube",
    description: "Prezentacje i nagrania sezonu",
    className:
      "border-slate-700 text-slate-300 hover:text-red-300 hover:border-red-500/50 hover:bg-red-500/15 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]",
  },
  {
    id: "x-fpl-arena",
    href: PLATFORM_X_FPL_ARENA.href,
    label: `X — ${PLATFORM_X_FPL_ARENA.label}`,
    shortLabel: "X · Arena",
    description: PLATFORM_X_FPL_ARENA.handle,
    className:
      "border-slate-700 text-slate-300 hover:text-white hover:border-slate-400/60 hover:bg-slate-700/40 hover:shadow-[0_0_20px_rgba(148,163,184,0.15)]",
  },
  {
    id: "x-stopa",
    href: PLATFORM_X_STOPA.href,
    label: `X — ${PLATFORM_X_STOPA.label}`,
    shortLabel: "X · St0pa",
    description: PLATFORM_X_STOPA.handle,
    className:
      "border-slate-700 text-slate-300 hover:text-emerald-200 hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]",
  },
];
