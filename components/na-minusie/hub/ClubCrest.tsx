"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { resolvePublicCrestSrc } from "@/lib/public/clubCrest";

/**
 * Herb w kafelku.
 * `fill` = rozciąga się z wierszem (tabele).
 * `md` / `lg` = stały kwadrat (pojedynki H2H).
 */
export function ClubCrest({
  clubName,
  logos = [],
  size = "fill",
  className = "",
}: {
  clubName?: string | null;
  logos?: ClubLogoRecord[];
  size?: "fill" | "md" | "lg";
  className?: string;
}) {
  const resolved = resolvePublicCrestSrc(clubName, logos);
  const [failed, setFailed] = useState(false);
  const initial = (clubName?.trim()?.charAt(0) || "?").toUpperCase();

  useEffect(() => {
    setFailed(false);
  }, [resolved, clubName]);

  const shell =
    size === "lg"
      ? `relative h-16 w-16 shrink-0 sm:h-20 sm:w-20 ${className}`.trim()
      : size === "md"
        ? `relative h-12 w-12 shrink-0 sm:h-14 sm:w-14 ${className}`.trim()
        : `relative aspect-square h-auto w-auto min-h-[3rem] shrink-0 self-stretch py-px ${className}`.trim();

  if (!resolved || failed) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-lg bg-slate-800/60 text-slate-400 ${shell}`}
        title={clubName ?? undefined}
      >
        {clubName ? (
          <span className={`font-black ${size === "lg" ? "text-xl" : "text-sm"}`}>{initial}</span>
        ) : (
          <Shield className={size === "lg" ? "h-8 w-8" : "h-5 w-5"} />
        )}
      </span>
    );
  }

  return (
    <span className={shell} title={clubName ?? undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolved}
        alt={clubName ? `Herb ${clubName}` : ""}
        className="absolute inset-0 m-auto box-border h-full w-full object-contain p-0.5"
        loading="eager"
        crossOrigin="anonymous"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
