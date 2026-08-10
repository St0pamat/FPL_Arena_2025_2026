import { LEAGUE_STARTING_CAPACITY } from "@/lib/na-minusie/leagueCapacity";

function toCount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export function LeagueCapacityMeterCompact({
  occupied,
  pending = 0,
  capacity = LEAGUE_STARTING_CAPACITY,
}: {
  occupied: number;
  pending?: number;
  capacity?: number;
}) {
  const capacityCount = toCount(capacity) || LEAGUE_STARTING_CAPACITY;
  const taken = Math.min(toCount(occupied), capacityCount);
  const pendingCount = toCount(pending);
  const freeSpots = Math.max(0, capacityCount - taken - pendingCount);
  const pct =
    capacityCount > 0
      ? (Math.min(capacityCount, taken + pendingCount) / capacityCount) * 100
      : 0;

  return (
    <div
      className="mb-8 w-full rounded-xl border border-[#39FF14]/25 bg-slate-950/70 px-4 py-3 sm:px-5"
      aria-label={`Potwierdzeni: ${taken}, weryfikacja: ${pendingCount}, wolne miejsca: ${freeSpots} z ${capacityCount}`}
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-5">
        <div className="flex shrink-0 items-center justify-center gap-3 sm:justify-start">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#39FF14]/80">
            Miejsca · S1
          </p>
          <div className="flex items-baseline gap-1">
            <span className="font-athletic text-2xl font-bold tabular-nums text-white sm:text-3xl">
              {taken}
            </span>
            <span className="text-sm font-bold text-slate-500">/</span>
            <span className="font-athletic text-lg font-bold tabular-nums text-slate-400 sm:text-xl">
              {capacityCount}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-xs sm:justify-start sm:text-sm">
          <span className="font-semibold text-emerald-500">
            Potwierdzeni: {taken}
          </span>
          {pendingCount > 0 ? (
            <>
              <span className="text-slate-600">·</span>
              <span className="font-semibold text-amber-500">
                Weryfikacja: {pendingCount}
              </span>
            </>
          ) : null}
          <span className="text-slate-600">·</span>
          <span className="font-bold text-white">Wolne miejsca: {freeSpots}</span>
        </div>

        <div className="h-1.5 w-full shrink-0 overflow-hidden rounded-full bg-slate-800/90 sm:max-w-[120px] sm:flex-1 lg:max-w-[180px]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2ecc12] to-[#39FF14]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
