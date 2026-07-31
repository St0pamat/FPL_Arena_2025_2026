"use client";

import { useRef, type ReactNode } from "react";
import { NA_MINUSIE_BRAND } from "@/lib/na-minusie";
import { ExportControls } from "@/components/na-minusie/hub/ExportControls";

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
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const id =
    exportId ??
    `export-${fileName.replace(/[^a-z0-9_-]/gi, "-").toLowerCase()}`;

  return (
    <div className={`space-y-3 ${className}`.trim()}>
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

      <div
        ref={nodeRef}
        id={id}
        className={`rounded-2xl border border-slate-800 shadow-2xl shadow-black/50 ${
          fluid ? "overflow-hidden" : "overflow-x-auto"
        }`}
        style={{ backgroundColor: EXPORT_BG }}
      >
        <div
          className={`p-4 sm:p-6 ${fluid ? "w-full min-w-0" : "min-w-[880px] sm:p-8"}`}
          style={{ backgroundColor: EXPORT_BG }}
        >
          <header className="mb-5 border-b border-emerald-500/30 pb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-400">
                {NA_MINUSIE_BRAND}
              </p>
              <h2 className="mt-1 font-athletic text-2xl uppercase tracking-wide text-white">
                {title}
              </h2>
              {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
            </div>
          </header>
          {children}
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
