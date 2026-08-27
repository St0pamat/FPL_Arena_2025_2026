"use client";

import { Activity, CheckCircle2, Clock3 } from "lucide-react";
import {
  formatSyncAtCest,
  gwStatusPublicLabel,
  type GameweekMetadataRow,
  type GwSyncStatus,
} from "@/lib/admin/gameweekMetadata";

function statusIcon(status: GwSyncStatus) {
  if (status === "CONFIRMED") {
    return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />;
  }
  if (status === "PROVISIONAL") {
    return <Activity className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />;
  }
  return <Clock3 className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />;
}

function statusTone(status: GwSyncStatus): string {
  if (status === "CONFIRMED") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
  }
  if (status === "PROVISIONAL") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  }
  return "border-slate-600/40 bg-slate-800/60 text-slate-300";
}

/** Badge statusu syncu FPL API (CEST / Europe/Warsaw). */
export function GameweekSyncStatusBadge({
  meta,
  className = "",
}: {
  meta: Pick<GameweekMetadataRow, "last_sync_at" | "gw_status"> | null | undefined;
  className?: string;
}) {
  if (!meta?.last_sync_at || !meta.gw_status) return null;

  const when = formatSyncAtCest(meta.last_sync_at);
  const statusText = gwStatusPublicLabel(meta.gw_status);

  return (
    <div
      className={`inline-flex max-w-full items-start gap-2 rounded-xl border px-3 py-2 text-[11px] leading-snug sm:items-center sm:text-xs ${statusTone(meta.gw_status)} ${className}`}
      role="status"
    >
      {statusIcon(meta.gw_status)}
      <span className="min-w-0">
        Wyniki aktualne na:{" "}
        <span className="font-semibold tabular-nums">{when} CEST</span>
        {" | "}
        Status: <span className="font-semibold">{statusText}</span>
      </span>
    </div>
  );
}
