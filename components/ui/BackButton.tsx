import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  href?: string;
  label?: string;
}

export function BackButton({ href = "/", label = "Powrót" }: BackButtonProps) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
    >
      <ArrowLeft
        className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1"
        aria-hidden
      />
      {label}
    </Link>
  );
}
