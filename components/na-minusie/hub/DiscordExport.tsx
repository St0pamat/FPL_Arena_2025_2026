"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { NA_MINUSIE_EXPORT_BRAND } from "@/lib/na-minusie";
import { ExportControls } from "@/components/na-minusie/hub/ExportControls";
import {
  StandingsPromoHeader,
  type PromoHeaderParticipant,
} from "@/components/na-minusie/hub/StandingsPromoHeader";

const EXPORT_BG = "#0B0F19";

export function DiscordExportFrame({
  fileName,
  title,
  subtitle,
  children,
  className = "",
  exportId,
  divisionId,
  discordMessage,
  showDiscordSend = false,
  hasWebhook = false,
  /** Bez sztywnego min-width — do wąskich kolumn (Centrum Kolejki) */
  fluid = false,
  /** Ukryj przyciski Pobierz/Discord (Content Hub off-screen capture) */
  hideControls = false,
  /** Zewnętrzny ref na węzeł do html-to-image */
  captureRef,
  /**
   * Nagłówek z logo Arena | tekst | logo Na Minusie (domyślnie włączony).
   * Ten sam HTML idzie do PNG i webhooków Discord.
   */
  brandedHeader = true,
  /** Uczestnicy dywizji — po 5 herbów po lewej i prawej stronie tytułu */
  headerParticipants,
  clubLogos = [],
  /**
   * Bezpieczne krawędzie pod html-to-image: duży padding, overflow visible,
   * logo bez ujemnych marginesów (zapowiedź / terminarz).
   */
  safeExportEdges = false,
}: {
  fileName: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  exportId?: string;
  divisionId?: string;
  discordMessage?: string;
  showDiscordSend?: boolean;
  hasWebhook?: boolean;
  fluid?: boolean;
  hideControls?: boolean;
  captureRef?: RefObject<HTMLDivElement | null>;
  brandedHeader?: boolean;
  headerParticipants?: PromoHeaderParticipant[];
  clubLogos?: ClubLogoRecord[];
  safeExportEdges?: boolean;
}) {
  const localRef = useRef<HTMLDivElement>(null);
  const nodeRef = captureRef ?? localRef;
  const id =
    exportId ??
    `export-${fileName.replace(/[^a-z0-9_-]/gi, "-").toLowerCase()}`;

  const usePromoBanner =
    brandedHeader &&
    Array.isArray(headerParticipants) &&
    headerParticipants.length > 0;

  return (
    <div className={`space-y-3 ${className}`.trim()}>
      {!hideControls ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ExportControls
            targetRef={nodeRef}
            fileName={fileName}
            divisionId={divisionId ?? ""}
            discordMessage={discordMessage ?? title}
            showDiscordSend={showDiscordSend}
            hasWebhook={hasWebhook}
          />
        </div>
      ) : null}

      <div
        ref={nodeRef}
        id={id}
        className={`rounded-2xl border border-slate-800 shadow-2xl shadow-black/50 ${
          safeExportEdges
            ? "overflow-visible"
            : fluid
              ? "overflow-hidden"
              : "overflow-x-auto"
        }`}
        style={{ backgroundColor: EXPORT_BG }}
      >
        <div
          className={
            safeExportEdges
              ? "box-border flex w-[1200px] flex-col items-center justify-center bg-slate-950 p-12"
              : `p-4 sm:p-6 ${fluid ? "w-full min-w-0" : "min-w-[960px] sm:p-8"}`
          }
          style={{ backgroundColor: EXPORT_BG }}
        >
          <div className={safeExportEdges ? "flex w-full flex-col items-center" : undefined}>
            {usePromoBanner ? (
              <StandingsPromoHeader
                title={title}
                subtitle={subtitle}
                participants={headerParticipants}
                logos={clubLogos}
                safeEdges={safeExportEdges}
              />
            ) : brandedHeader ? (
              <StandingsPromoHeader
                title={title}
                subtitle={subtitle}
                safeEdges={safeExportEdges}
              />
            ) : (
              <header className="mb-5 border-b border-emerald-500/30 pb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-400">
                    {NA_MINUSIE_EXPORT_BRAND}
                  </p>
                  <h2 className="mt-1 font-athletic text-2xl uppercase tracking-wide text-white">
                    {title}
                  </h2>
                  {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
                </div>
              </header>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function slugForExport(parts: (string | number | null | undefined)[]): string {
  return parts
    .filter((p) => p != null && String(p).trim() !== "")
    .map((p) =>
      String(p)
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40),
    )
    .filter(Boolean)
    .join("_");
}
