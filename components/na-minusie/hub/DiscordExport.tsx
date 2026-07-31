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
}: {
  fileName: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  /** Stabilne id węzła (export-standings / export-gw-results / export-gw-next) */
  exportId?: string;
  divisionId?: string;
  discordMessage?: string;
  showDiscordSend?: boolean;
  hasWebhook?: boolean;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const id =
    exportId ??
    `export-${fileName.replace(/[^a-z0-9_-]/gi, "-").toLowerCase()}`;

  return (
    <div className={`space-y-3 ${className}`.trim()}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
          Export Discord · PNG Retina
        </p>
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
        className="overflow-x-auto rounded-2xl border border-slate-800 shadow-2xl shadow-black/50"
        style={{ backgroundColor: EXPORT_BG }}
      >
        <div className="min-w-[880px] p-6 sm:p-8" style={{ backgroundColor: EXPORT_BG }}>
          <header className="mb-5 flex items-end justify-between gap-4 border-b border-emerald-500/30 pb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-400">
                {NA_MINUSIE_BRAND}
              </p>
              <h2 className="mt-1 font-athletic text-2xl uppercase tracking-wide text-white">
                {title}
              </h2>
              {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
            </div>
            <p className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Mediana 2+1
            </p>
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
