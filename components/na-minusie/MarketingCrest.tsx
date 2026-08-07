"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { findClubLogo, resolveClubLogoSrc } from "@/lib/admin/clubLogos";

/**
 * Duży herb na stronie reklamowej.
 * Źródło: biblioteka admina (seed /club-logos + uploady /uploads/logos).
 */
export function MarketingCrest({
  clubName,
  logos = [],
  size = "lg",
  dimmed = false,
  className = "",
}: {
  clubName: string;
  logos?: ClubLogoRecord[];
  /** fill = szerokość rodzica, minimalny margines od krawędzi kafelka */
  size?: "md" | "lg" | "xl" | "fill";
  dimmed?: boolean;
  className?: string;
}) {
  const hit = findClubLogo(logos, clubName);
  const src = hit ? resolveClubLogoSrc(hit) : null;
  const [failed, setFailed] = useState(false);
  const initial = (clubName.trim().charAt(0) || "?").toUpperCase();

  useEffect(() => {
    setFailed(false);
  }, [src, clubName]);

  const box =
    size === "fill"
      ? "aspect-square w-full"
      : size === "xl"
        ? "h-24 w-24 sm:h-28 sm:w-28"
        : size === "lg"
          ? "h-20 w-20 sm:h-24 sm:w-24"
          : "h-16 w-16 sm:h-20 sm:w-20";

  if (!src || failed) {
    return (
      <span
        className={`inline-flex ${box} items-center justify-center rounded-xl bg-slate-800/70 text-2xl font-black text-slate-400 ring-1 ring-slate-700 sm:text-3xl ${
          dimmed ? "opacity-60" : ""
        } ${className}`.trim()}
        title={clubName}
      >
        {clubName ? initial : <Shield className="h-8 w-8" />}
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex ${box} items-center justify-center ${
        dimmed ? "opacity-55" : ""
      } ${className}`.trim()}
      title={clubName}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Herb ${clubName}`}
        className="h-full w-full object-contain p-px"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
