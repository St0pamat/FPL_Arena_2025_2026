"use client";

import { NA_MINUSIE_SECTION_IDS, NA_MINUSIE_SECTION_NAV, useActiveSection } from "@/lib/na-minusie";
import { NM_CONTAINER } from "@/lib/na-minusie/theme";

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  // Aktualizacja hash bez skoku (dla bookmarków / share)
  window.history.replaceState(null, "", `#${id}`);
}

export function LandingSubNav() {
  const activeId = useActiveSection(NA_MINUSIE_SECTION_IDS);

  return (
    <div className="sticky top-16 z-40 border-b border-[#1a1a1a]/80 bg-[#050505]/85 backdrop-blur-md sm:top-[4.5rem]">
      <div className={`${NM_CONTAINER} overflow-x-auto`}>
        <nav
          className="flex min-w-max items-center gap-1 py-2.5 sm:gap-2"
          aria-label="Sekcje strony reklamowej"
        >
          {NA_MINUSIE_SECTION_NAV.map((item) => {
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-300 sm:text-xs ${
                  isActive
                    ? "bg-[#39FF14]/10 text-[#39FF14] nm-glow ring-1 ring-[#39FF14]/30"
                    : "text-[#666] hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
