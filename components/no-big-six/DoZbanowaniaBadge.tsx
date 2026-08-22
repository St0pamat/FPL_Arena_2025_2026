type Props = {
  className?: string;
};

export function DoZbanowaniaBadge({ className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border border-rose-900/50 bg-rose-950/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-500 animate-pulse ${className}`}
    >
      🚨 Do zbanowania
    </span>
  );
}
