"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { resolvePublicCrestSrc } from "@/lib/public/clubCrest";

/**
 * Herb wypełnia wysokość kafelka (self-stretch + aspect-square).
 * Margines góra/dół ≈ 1–2px — logo zawsze max. duże w wierszu.
 */
export function ClubCrest({
  clubName,
  logos = [],
  className = "",
}: {
  clubName?: string | null;
  logos?: ClubLogoRecord[];
  /** @deprecated — herby zawsze fill; prop ignorowany */
  size?: string;
  className?: string;
}) {
  const resolved = resolvePublicCrestSrc(clubName, logos);
  const [failed, setFailed] = useState(false);
  const initial = (clubName?.trim()?.charAt(0) || "?").toUpperCase();

  useEffect(() => {
    setFailed(false);
  }, [resolved, clubName]);

  const shell =
    `relative aspect-square h-auto w-auto min-h-[3rem] shrink-0 self-stretch py-px ${className}`.trim();

  if (!resolved || failed) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-md bg-slate-800/60 text-slate-400 ${shell}`}
        title={clubName ?? undefined}
      >
        {clubName ? (
          <span className="text-sm font-black">{initial}</span>
        ) : (
          <Shield className="h-5 w-5" />
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
        className="absolute inset-0 m-auto box-border h-full w-full object-contain p-px"
        loading="eager"
        crossOrigin="anonymous"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
