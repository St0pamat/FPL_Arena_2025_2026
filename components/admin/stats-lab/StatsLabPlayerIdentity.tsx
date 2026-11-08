"use client";

import {
  fplLabBadgeUrl,
  fplLabPlayerPhotoUrl,
} from "@/lib/stats-lab/mediaUrls";

type Props = {
  rank?: number | null;
  webName: string;
  clubShort: string;
  playerCode: number;
  clubPulseCode: number;
  /** np. £5.4m */
  priceLabel?: string | null;
  /** np. 46.0% */
  ownershipLabel?: string | null;
  showMeta?: boolean;
  /** Compact table variant (Stats Centre) */
  dense?: boolean;
};

/**
 * Sztywna wizytówka 3-piętrowa (identyczna u każdego gracza):
 * 1) # + herb + klub · 2) cena · TSB · 3) nazwisko
 */
export function StatsLabPlayerIdentity({
  rank,
  webName,
  clubShort,
  playerCode,
  clubPulseCode,
  priceLabel,
  ownershipLabel,
  showMeta = true,
  dense = false,
}: Props) {
  const photo = playerCode > 0 ? fplLabPlayerPhotoUrl(playerCode) : null;
  const badge = clubPulseCode > 0 ? fplLabBadgeUrl(clubPulseCode) : null;

  if (dense) {
    return (
      <span className="inline-flex items-center gap-2 whitespace-nowrap">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- lokalne API + html-to-image
          <img
            src={photo}
            alt={webName}
            width={36}
            height={36}
            crossOrigin="anonymous"
            className="h-9 w-9 shrink-0 rounded-full border border-slate-700/80 bg-slate-800/90 object-cover object-top"
          />
        ) : null}
        <span className="min-w-0">
          <span className="font-bold text-white">{webName}</span>
          <span className="ml-2 inline-flex items-center gap-1 font-mono text-[10px] text-slate-500">
            {badge ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={badge}
                alt={clubShort}
                width={20}
                height={20}
                crossOrigin="anonymous"
                className="h-5 w-5 object-contain drop-shadow-[0_0_2px_rgba(255,255,255,0.5)]"
              />
            ) : null}
            {clubShort}
            {showMeta && priceLabel ? ` · ${priceLabel}` : ""}
          </span>
        </span>
      </span>
    );
  }

  return (
    <div className="flex w-full min-w-0 items-center gap-3">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt={webName}
          width={48}
          height={48}
          crossOrigin="anonymous"
          className="h-12 w-12 shrink-0 rounded-full border border-slate-700/80 bg-slate-800 object-cover object-top"
        />
      ) : (
        <span className="h-12 w-12 shrink-0 rounded-full border border-slate-700/80 bg-slate-800" />
      )}

      <div className="flex min-w-0 flex-1 flex-col justify-center">
        {/* Wiersz 1 — tylko #, herb, skrót klubu */}
        <div className="flex items-center gap-1.5 leading-none">
          {rank != null ? (
            <span className="shrink-0 text-xs font-black tabular-nums text-[#39FF14]">
              #{rank}
            </span>
          ) : null}
          {badge ? (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 p-0.5 ring-1 ring-white/15">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={badge}
                alt={clubShort}
                width={16}
                height={16}
                crossOrigin="anonymous"
                className="h-full w-full object-contain drop-shadow-[0_0_2px_rgba(255,255,255,0.5)]"
              />
            </span>
          ) : null}
          <span className="shrink-0 text-xs font-extrabold tracking-wide text-slate-100">
            {clubShort}
          </span>
        </div>

        {/* Wiersz 2 — ZAWSZE osobna linia: cena · posiadanie */}
        {showMeta ? (
          <div className="mt-0.5 whitespace-nowrap text-[11px] font-semibold leading-tight text-slate-400">
            {[priceLabel, ownershipLabel].filter(Boolean).join(" · ") || "—"}
          </div>
        ) : null}

        {/* Wiersz 3 — pełne nazwisko */}
        <div className="mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-[17px] font-black leading-tight text-white">
          {webName}
        </div>
      </div>
    </div>
  );
}
