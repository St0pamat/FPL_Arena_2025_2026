import type { ReactNode } from "react";

export const GwNavigator = ({
  label,
  displayValue,
  canPrev,
  canNext,
  onPrev,
  onNext,
  gwList,
  selectedGw,
  onSelectGw,
  extraActions,
  children,
}: {
  label: string;
  displayValue: ReactNode;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  gwList: number[];
  selectedGw: number;
  onSelectGw: (gw: number) => void;
  extraActions?: ReactNode;
  children?: ReactNode;
}) => (
  <div className="glass-panel rounded-2xl border border-slate-800 panel-pad flex flex-col gap-5">
    <div className="flex flex-col lg:flex-row gap-5 lg:items-center lg:justify-between">
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          disabled={!canPrev}
          onClick={onPrev}
          className="btn-icon"
          aria-label="Poprzednia kolejka"
        >
          ←
        </button>
        <div className="text-center min-w-[12rem]">
          <div className="kpi-label">{label}</div>
          <div className="text-kpi-lg font-athletic font-bold text-emerald-400 leading-none mt-1">
            {displayValue}
          </div>
        </div>
        <button
          type="button"
          disabled={!canNext}
          onClick={onNext}
          className="btn-icon"
          aria-label="Następna kolejka"
        >
          →
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-1 lg:max-w-xl">
        <select
          value={selectedGw}
          onChange={(e) => onSelectGw(Number(e.target.value))}
          className="select-field flex-1"
          aria-label="Wybierz kolejkę"
        >
          {children}
        </select>
        {extraActions}
      </div>
    </div>

    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
      {gwList.map((g) => (
        <button
          key={g}
          type="button"
          onClick={() => onSelectGw(g)}
          className={`gw-chip ${g === selectedGw ? "gw-chip-active" : "gw-chip-inactive"}`}
        >
          {g}
        </button>
      ))}
    </div>
  </div>
);
