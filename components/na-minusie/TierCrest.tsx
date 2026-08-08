"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import {
  findTierLogo,
  resolveTierLogoName,
  resolveTierLogoSrc,
  type TierLogoRecord,
} from "@/lib/admin/tierLogos";

export { resolveTierLogoName };

/** Herb / logo dywizji — fallback: zielona tarcza. */
export function TierCrest({
  tierName,
  logos = [],
  size = "md",
  className = "",
  /** Bez białego tła — logo na ciemnym UI (np. Piramida Ligowa). */
  plain = false,
}: {
  tierName: string;
  logos?: TierLogoRecord[];
  size?: "sm" | "md" | "lg";
  className?: string;
  plain?: boolean;
}) {
  const hit = findTierLogo(logos, tierName);
  const src = hit ? resolveTierLogoSrc(hit) : null;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src, tierName]);

  const box =
    size === "sm"
      ? "h-7 w-7 rounded-lg p-0.5"
      : "h-12 w-12 rounded-xl p-1 sm:h-14 sm:w-14";

  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5 sm:h-6 sm:w-6";

  // Gdy className nadaje !h-full (wypełnienie kafelka), nie doklejaj sztywnego boxa
  const fillsParent = /\bh-full\b|!h-full/.test(className);
  const sizeBox = fillsParent ? "h-full w-full min-h-0 p-0" : box;

  if (!src || failed) {
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center bg-[#39FF14]/10 ring-1 ring-[#39FF14]/20 ${sizeBox} ${className}`.trim()}
      >
        <Shield className={`${icon} text-[#39FF14]`} strokeWidth={1.75} aria-hidden />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${
        plain
          ? sizeBox
          : `bg-white/95 ring-1 ring-slate-700/60 ${sizeBox}`
      } ${className}`.trim()}
      title={tierName}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Logo ${tierName}`}
        className="h-full w-full object-contain"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
