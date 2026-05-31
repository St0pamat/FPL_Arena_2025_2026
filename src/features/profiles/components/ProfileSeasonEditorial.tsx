import { getProfileSeasonEditorial } from "@/features/profiles/lib/profileSeasonEditorial";

export const ProfileSeasonEditorial = ({ playerId }: { playerId: number }) => {
  const editorial = getProfileSeasonEditorial(playerId);
  if (!editorial) return null;

  return (
    <div className="mb-6 pb-6 border-b border-slate-800/80">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500/80 font-mono mb-2">
        Relacja sezonu 2025/26
      </p>
      <h5 className="text-fluid-xl font-athletic font-bold text-white leading-tight mb-3">
        {editorial.headline}
      </h5>
      <div className="space-y-3">
        {editorial.paragraphs.map((para, i) => (
          <p key={i} className="text-fluid-sm text-slate-300 leading-relaxed">
            {para}
          </p>
        ))}
      </div>
    </div>
  );
};
