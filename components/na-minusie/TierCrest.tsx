"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import {
  findTierLogo,
  tierLogoPublicUrl,
  type TierLogoRecord,
} from "@/lib/admin/tierLogos";

/** Herb / logo dywizji na piramidzie — fallback: zielona tarcza. */
export function TierCrest({
  tierName,
  logos = [],
  className = "",
}: {
  tierName: string;
  logos?: TierLogoRecord[];
  className?: string;
}) {
  const hit = findTierLogo(logos, tierName);
  const src = hit ? tierLogoPublicUrl(hit.fileName) : null;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src, tierName]);

  if (!src || failed) {
    return (
      <div
        className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#39FF14]/10 ring-1 ring-[#39FF14]/20 sm:h-14 sm:w-14 ${className}`.trim()}
      >
        <Shield className="h-5 w-5 text-[#39FF14] sm:h-6 sm:w-6" strokeWidth={1.75} aria-hidden />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/95 p-1 ring-1 ring-slate-700/60 sm:h-14 sm:w-14 ${className}`.trim()}
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
