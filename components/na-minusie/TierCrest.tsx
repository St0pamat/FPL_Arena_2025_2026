"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import {
  findTierLogo,
  resolveTierLogoName,
  tierLogoPublicUrl,
  type TierLogoRecord,
} from "@/lib/admin/tierLogos";

export { resolveTierLogoName };

/** Herb / logo dywizji — fallback: zielona tarcza. */
export function TierCrest({
  tierName,
  logos = [],
  size = "md",
  className = "",
}: {
  tierName: string;
  logos?: TierLogoRecord[];
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const hit = findTierLogo(logos, tierName);
  const src = hit ? tierLogoPublicUrl(hit.fileName) : null;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src, tierName]);

  const box =
    size === "sm"
      ? "h-7 w-7 rounded-lg p-0.5"
      : "h-12 w-12 rounded-xl p-1 sm:h-14 sm:w-14";

  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5 sm:h-6 sm:w-6";

  if (!src || failed) {
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center bg-[#39FF14]/10 ring-1 ring-[#39FF14]/20 ${box} ${className}`.trim()}
      >
        <Shield className={`${icon} text-[#39FF14]`} strokeWidth={1.75} aria-hidden />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-white/95 ring-1 ring-slate-700/60 ${box} ${className}`.trim()}
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
