import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function ArenaHomeLink() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-slate-400 transition-colors hover:text-white"
    >
      <ArrowLeft
        className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
        aria-hidden
      />
      Powrót
    </Link>
  );
}
