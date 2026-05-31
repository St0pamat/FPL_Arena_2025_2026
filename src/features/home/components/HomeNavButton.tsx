import type { ReactNode } from "react";

export const HomeNavButton = ({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: string;
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full px-6 py-4 lg:py-5 bg-slate-800/90 text-white font-semibold rounded-2xl hover:bg-slate-700 transition-all border border-slate-700 hover:border-emerald-500/40 flex items-center justify-center gap-3 text-fluid-base"
  >
    <span className="text-xl" aria-hidden>
      {icon}
    </span>
    {children}
  </button>
);
