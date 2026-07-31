"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NA_MINUSIE_PATHS } from "@/lib/na-minusie/links";

/** Widoczny tylko dla zalogowanego admina — otwiera panel w nowej karcie. */
export function SplashAdminLink() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!cancelled) setIsAdmin(Boolean(data.user));
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isAdmin) return null;

  return (
    <a
      href={NA_MINUSIE_PATHS.admin}
      target="_blank"
      rel="noopener noreferrer"
      className="absolute right-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-300 backdrop-blur-sm transition-colors hover:border-emerald-500/40 hover:text-emerald-300 sm:right-6 sm:top-6"
    >
      Panel Admina
      <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
    </a>
  );
}
