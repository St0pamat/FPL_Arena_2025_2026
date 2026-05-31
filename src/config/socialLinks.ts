export type SocialLink = {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  className: string;
};

export const SOCIAL_LINKS: SocialLink[] = [
  {
    href: "https://discord.gg/vrzQmgJ57",
    label: "Discord FPL Arena",
    shortLabel: "Discord",
    description: "Dołącz do społeczności ligi",
    className:
      "border-slate-700 text-slate-300 hover:text-indigo-200 hover:border-indigo-400/50 hover:bg-indigo-500/15 hover:shadow-[0_0_20px_rgba(99,102,241,0.25)]",
  },
  {
    href: "https://www.youtube.com/@fpl_arena/videos",
    label: "YouTube FPL Arena",
    shortLabel: "YouTube",
    description: "Prezentacje i nagrania sezonu",
    className:
      "border-slate-700 text-slate-300 hover:text-red-300 hover:border-red-500/50 hover:bg-red-500/15 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]",
  },
  {
    href: "https://x.com/st0pamat",
    label: "X — st0pamat",
    shortLabel: "X",
    description: "Aktualności i zapowiedzi",
    className:
      "border-slate-700 text-slate-300 hover:text-white hover:border-slate-400/60 hover:bg-slate-700/40 hover:shadow-[0_0_20px_rgba(148,163,184,0.15)]",
  },
];
