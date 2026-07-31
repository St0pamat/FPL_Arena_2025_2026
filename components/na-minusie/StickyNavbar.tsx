"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  NA_MINUSIE_BRAND,
  NA_MINUSIE_LOGO,
  NA_MINUSIE_LOGO_ALT,
  NA_MINUSIE_MAIN_NAV,
} from "@/lib/na-minusie";
import { NA_MINUSIE_PATHS } from "@/lib/na-minusie/links";
import { NM_CONTAINER } from "@/lib/na-minusie/theme";
import { createClient } from "@/lib/supabase/client";

const navLinkClass = (isActive: boolean) =>
  `rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 lg:text-sm ${
    isActive ? "text-[#39FF14] nm-glow" : "text-[#888] hover:text-white"
  }`;

function isMainNavActive(href: string, pathname: string): boolean {
  if (href === NA_MINUSIE_PATHS.hub) {
    return pathname === NA_MINUSIE_PATHS.hub || pathname.startsWith(`${NA_MINUSIE_PATHS.hub}/`);
  }
  if (href === NA_MINUSIE_PATHS.home) {
    // O lidze = landing (+ regulamin), NIE hub
    if (pathname === NA_MINUSIE_PATHS.hub || pathname.startsWith(`${NA_MINUSIE_PATHS.hub}/`)) {
      return false;
    }
    return (
      pathname === NA_MINUSIE_PATHS.home ||
      pathname.startsWith(`${NA_MINUSIE_PATHS.home}/`)
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StickyNavbar() {
  const pathname = usePathname();
  const router = useRouter();
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

  function goTo(href: string) {
    if (pathname === href) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    router.push(href);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#1a1a1a] bg-[#050505]/90 backdrop-blur-md">
      <div className={`${NM_CONTAINER} flex h-16 items-center justify-between gap-4 sm:h-[4.5rem]`}>
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="hidden items-center gap-1 text-xs text-[#555] transition-colors hover:text-white sm:inline-flex"
            aria-label="Powrót do wyboru platformy"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => goTo(NA_MINUSIE_PATHS.home)}
            className="flex min-w-0 items-center gap-2.5"
          >
            <Image
              src={NA_MINUSIE_LOGO}
              alt={NA_MINUSIE_LOGO_ALT}
              width={36}
              height={36}
              className="h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9"
            />
            <span className="truncate text-sm font-black uppercase tracking-wide text-white sm:text-base">
              {NA_MINUSIE_BRAND}
            </span>
          </button>
        </div>

        <nav className="flex items-center gap-1" aria-label="Główne menu">
          {NA_MINUSIE_MAIN_NAV.map((item) => {
            const isActive = isMainNavActive(item.href, pathname);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(item.href)}
                className={navLinkClass(isActive)}
              >
                {item.label}
              </button>
            );
          })}
          {isAdmin ? (
            <Link
              href={NA_MINUSIE_PATHS.admin}
              className={navLinkClass(pathname.startsWith("/admin"))}
            >
              Panel Admina
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
