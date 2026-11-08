"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { STATS_LAB_EXPORT_WIDTH } from "@/lib/stats-lab/exportCapture";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Stała geometria plakatu 1120px + płynne skalowanie, gdy kolumna jest węższa.
 * Gwarantuje WYSIWYG względem PNG (html-to-image bierze off-screen 1120px).
 */
export function StatsLabPosterFrame({ children, className = "" }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const measure = useCallback(() => {
    const host = hostRef.current;
    const content = contentRef.current;
    if (!host || !content) return;
    const avail = host.clientWidth;
    const next = avail > 0 ? Math.min(1, avail / STATS_LAB_EXPORT_WIDTH) : 1;
    setScale(next);
    setContentHeight(content.offsetHeight * next);
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure, children]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(host);
    const content = contentRef.current;
    if (content) ro.observe(content);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div
      ref={hostRef}
      className={`w-full overflow-hidden ${className}`}
      style={{ height: contentHeight ?? undefined }}
    >
      <div
        ref={contentRef}
        className="shadow-2xl"
        style={{
          width: STATS_LAB_EXPORT_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
