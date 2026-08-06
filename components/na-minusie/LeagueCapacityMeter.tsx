"use client";

import { useEffect, useRef, useState } from "react";

export const LEAGUE_STARTING_CAPACITY = 50;

function useCountUp(target: number, enabled: boolean, durationMs = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setValue(0);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, enabled, durationMs]);

  return value;
}

export function LeagueCapacityMeter({
  occupied,
  capacity = LEAGUE_STARTING_CAPACITY,
}: {
  occupied: number;
  capacity?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const taken = Math.max(0, Math.min(occupied, capacity));
  const free = Math.max(0, capacity - taken);
  const pct = capacity > 0 ? (taken / capacity) * 100 : 0;
  const shownTaken = useCountUp(taken, visible);
  const shownFree = useCountUp(free, visible);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const almostFull = free <= 5 && free > 0;
  const full = free === 0;

  return (
    <div
      ref={rootRef}
      className="relative mt-8 overflow-hidden rounded-2xl border border-[#39FF14]/20 bg-gradient-to-br from-slate-950 via-slate-900/90 to-slate-950 px-5 py-7 sm:mt-10 sm:px-8 sm:py-9"
      aria-label={`Zajęte miejsca w lidze: ${taken} z ${capacity}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#39FF14]/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl"
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#39FF14]/90">
          Miejsca startowe · Sezon 1
        </p>

        <div className="mt-5 flex items-end justify-center gap-2 sm:gap-3">
          <span className="font-athletic text-5xl font-bold tabular-nums tracking-tight text-white sm:text-6xl lg:text-7xl">
            {shownTaken}
          </span>
          <span className="mb-1.5 font-athletic text-2xl font-bold text-slate-500 sm:mb-2 sm:text-3xl">
            /
          </span>
          <span className="mb-1 font-athletic text-3xl font-bold tabular-nums text-slate-400 sm:mb-1.5 sm:text-4xl lg:text-5xl">
            {capacity}
          </span>
        </div>

        <p className="mt-3 text-sm font-semibold text-slate-300 sm:text-base">
          {full ? (
            <>Limit startowy wyczerpany</>
          ) : almostFull ? (
            <>
              Zostało{" "}
              <span className="font-black text-amber-300">{shownFree}</span>{" "}
              {shownFree === 1 ? "miejsce" : shownFree < 5 ? "miejsca" : "miejsc"}
            </>
          ) : (
            <>
              Potwierdzeni uczestnicy · wolnych:{" "}
              <span className="font-black text-[#39FF14]">{shownFree}</span>
            </>
          )}
        </p>

        <div className="mt-6 h-2.5 w-full max-w-xl overflow-hidden rounded-full bg-slate-800/90 ring-1 ring-slate-700/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2ecc12] to-[#39FF14] shadow-[0_0_18px_rgba(57,255,20,0.45)] transition-[width] duration-1000 ease-out"
            style={{ width: visible ? `${pct}%` : "0%" }}
          />
        </div>

        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-[15px]">
          Startujemy z limitem {capacity} miejsc (5 dywizji × 10). Przy większym
          zainteresowaniu możemy rozważyć otwarcie kolejnych dywizji — o ile do
          pierwszej kolejki Fantasy Premier League zostanie wystarczająco dużo
          czasu i zbierze się pełny, 10-osobowy skład nowej ligi.
        </p>
      </div>
    </div>
  );
}
