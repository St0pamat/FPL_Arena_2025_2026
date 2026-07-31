"use client";

import { useEffect, useState } from "react";

/**
 * Śledzi aktywną sekcję podczas scrollu.
 * Ponawia obserwację, gdy sekcje doładowują się przez Suspense.
 */
export function useActiveSection(sectionIds: readonly string[]) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    let cancelled = false;

    const ratios = new Map<string, number>();

    const pickBest = () => {
      let bestId: string | null = null;
      let bestRatio = 0;
      for (const [id, ratio] of ratios) {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestId = id;
        }
      }
      if (bestId && bestRatio > 0) {
        setActiveId(bestId);
      }
    };

    const attach = () => {
      if (cancelled) return;

      observer?.disconnect();
      ratios.clear();

      const elements = sectionIds
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => el !== null);

      if (elements.length === 0) return;

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            ratios.set(entry.target.id, entry.intersectionRatio);
          }
          pickBest();
        },
        {
          // Pas pod sticky header + sub-nav (~7.5rem)
          rootMargin: "-30% 0px -55% 0px",
          threshold: [0, 0.05, 0.1, 0.2, 0.35, 0.5, 0.75, 1],
        },
      );

      for (const el of elements) {
        observer.observe(el);
      }
    };

    attach();

    // Suspense / async sekcje — dołącz, gdy pojawią się w DOM
    const mo = new MutationObserver(() => attach());
    mo.observe(document.body, { childList: true, subtree: true });

    // Fallback: okresowe dołączenie (Suspense)
    const retry = window.setInterval(attach, 800);
    const stopRetry = window.setTimeout(() => window.clearInterval(retry), 8000);

    return () => {
      cancelled = true;
      observer?.disconnect();
      mo.disconnect();
      window.clearInterval(retry);
      window.clearTimeout(stopRetry);
    };
  }, [sectionIds]);

  return activeId;
}
