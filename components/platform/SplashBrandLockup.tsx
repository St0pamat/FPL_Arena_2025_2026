"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import { ARENA_PORTAL_ALT, ARENA_PORTAL_LOGO } from "@/lib/arena";

export function SplashBrandLockup() {
  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const tagRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const title = titleRef.current;
    const tag = tagRef.current;
    if (!root || !title || !tag) return;

    const fit = () => {
      const logoPx = root.getBoundingClientRect().height;
      if (logoPx < 8) return;

      const tagW = tag.getBoundingClientRect().width;
      const tagH = tag.getBoundingClientRect().height;
      const gap = logoPx * 0.05;
      const maxTitlePx = Math.max(20, (logoPx - tagH - gap) / 0.84);

      let lo = 12;
      let hi = maxTitlePx;
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        title.style.fontSize = `${mid}px`;
        if (title.scrollWidth <= tagW + 0.75) lo = mid;
        else hi = mid;
      }
      title.style.fontSize = `${lo}px`;
    };

    const run = () => {
      fit();
      requestAnimationFrame(fit);
    };

    run();
    const fonts = document.fonts;
    void fonts.ready.then(run);
    fonts.addEventListener("loadingdone", run);

    const ro = new ResizeObserver(run);
    ro.observe(root);
    ro.observe(tag);
    window.addEventListener("resize", run);

    return () => {
      fonts.removeEventListener("loadingdone", run);
      ro.disconnect();
      window.removeEventListener("resize", run);
    };
  }, []);

  return (
    <div ref={rootRef} className="splash-brand">
      <div className="splash-brand-logo">
        <Image
          src={ARENA_PORTAL_LOGO}
          alt={ARENA_PORTAL_ALT}
          fill
          priority
          quality={95}
          sizes="(max-width: 640px) 28vw, 272px"
          className="object-contain drop-shadow-[0_0_28px_rgba(56,189,248,0.35)]"
        />
      </div>
      <div className="splash-brand-text">
        <h1 ref={titleRef} className="splash-brand-title">
          FPL ARENA
        </h1>
        <p ref={tagRef} className="splash-brand-tagline">
          TWÓJ SKŁAD. NASZA ARENA.
        </p>
      </div>
    </div>
  );
}
