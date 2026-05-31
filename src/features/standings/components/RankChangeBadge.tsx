export const RankChangeBadge = ({ change }: { change: number | null | undefined }) => {
  if (change == null) {
    return (
      <span
        className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-800/80 text-slate-500 text-fluid-sm font-mono"
        title="Pierwsza kolejka — brak poprzedniej pozycji"
      >
        —
      </span>
    );
  }
  if (change > 0) {
    return (
      <span
        className="inline-flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400"
        title={`Awans o ${change} ${change === 1 ? "miejsce" : "miejsca"}`}
      >
        <span className="text-base leading-none">▲</span>
        <span className="text-fluid-xs font-bold font-mono">{change}</span>
      </span>
    );
  }
  if (change < 0) {
    const drop = Math.abs(change);
    return (
      <span
        className="inline-flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-red-500/15 border border-red-500/40 text-red-400"
        title={`Spadek o ${drop} ${drop === 1 ? "miejsce" : "miejsc"}`}
      >
        <span className="text-base leading-none">▼</span>
        <span className="text-fluid-xs font-bold font-mono">{drop}</span>
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-700/50 border border-slate-600 text-slate-400"
      title="Bez zmian względem poprzedniej kolejki"
    >
      <span className="text-lg leading-none">▬</span>
    </span>
  );
};
