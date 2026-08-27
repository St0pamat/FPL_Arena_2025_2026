"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";

function teamInitials(name: string, maxChars: 1 | 2): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (maxChars === 1) {
    return name.trim().charAt(0).toUpperCase() || "?";
  }
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

type Props = {
  url: string | null | undefined;
  teamName: string;
  /** Rozmiar w klasach Tailwind (np. h-20 w-20). */
  sizeClass?: string;
  /** Kształt: kółko (tabela) lub zaokrąglony kwadrat (karty). */
  shape?: "circle" | "rounded";
  /** Ile liter w placeholderze. */
  initialsChars?: 1 | 2;
  className?: string;
};

/**
 * Herb drużyny No Big Six z fallbackiem przy 404 / błędzie ładowania.
 */
export function NoBigSixTeamCrest({
  url,
  teamName,
  sizeClass = "h-8 w-8",
  shape = "circle",
  initialsChars = 1,
  className = "",
}: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  const showImage = Boolean(url) && !failed;
  const radius = shape === "circle" ? "rounded-full" : "rounded-2xl";

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url!}
        alt={`Herb ${teamName}`}
        onError={() => setFailed(true)}
        className={`${sizeClass} shrink-0 ${radius} border border-slate-700 object-cover ${className}`}
      />
    );
  }

  const initials = teamInitials(teamName, initialsChars);

  return (
    <div
      className={`flex ${sizeClass} shrink-0 items-center justify-center ${radius} border-2 border-amber-500/40 bg-amber-500/10 font-athletic font-bold text-amber-500 ${
        initialsChars === 1 ? "text-[11px]" : "text-2xl"
      } ${className}`}
      aria-hidden
    >
      {initials || <Shield className="h-3.5 w-3.5" />}
    </div>
  );
}
