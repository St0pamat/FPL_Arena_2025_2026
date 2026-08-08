"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { resolvePublicCrestSrc } from "@/lib/public/clubCrest";

/**
 * Herb klubowy — bez białego tła.
 * `fill` / className z `h-full` = wypełnia wysokość rodzica (jak Piramida Ligowa).
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

  const fillsParent = /\bh-full\b|!h-full/.test(className);

  const shellBase = fillsParent
    ? "relative flex h-full w-full min-h-0 shrink-0 items-center justify-center"
    : size === "lg"
      ? "relative inline-flex h-16 w-16 shrink-0 items-center justify-center sm:h-20 sm:w-20"
      : size === "md"
        ? "relative inline-flex h-12 w-12 shrink-0 items-center justify-center sm:h-14 sm:w-14"
        : "relative flex aspect-square h-auto w-auto min-h-[2.75rem] shrink-0 items-center justify-center self-stretch";

  const shell = `${shellBase} ${className}`.trim();

  if (!resolved || failed) {
    return (
      <span
        className={`rounded-lg bg-slate-800/60 text-slate-400 ${shell}`}
        title={clubName ?? undefined}
      >
        {clubName ? (
          <span className={`font-black ${size === "lg" ? "text-xl" : "text-sm"}`}>
            {initial}
          </span>
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
        className="box-border h-full w-full object-contain p-0"
        loading="eager"
        crossOrigin="anonymous"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
