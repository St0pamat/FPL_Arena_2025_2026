import type { NoBigSixPenalty, NoBigSixTeam } from "@/lib/no-big-six/types";
import {
  formatViolationLine,
  getIntentionalPenalties,
} from "@/lib/no-big-six/penalties";
import { NoBigSixTeamCrest } from "@/components/no-big-six/NoBigSixTeamCrest";

type Props = {
  teams: NoBigSixTeam[];
  penalties: NoBigSixPenalty[];
};

export function TeamsTab({ teams, penalties }: Props) {
  const sorted = [...teams].sort((a, b) => {
    if (a.is_banned !== b.is_banned) return a.is_banned ? 1 : -1;
    return a.team_name.localeCompare(b.team_name, "pl");
  });

  if (sorted.length === 0) {
    return (
      <p className="py-8 text-center text-slate-400">
        Brak zarejestrowanych zespołów w lidze.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sorted.map((team) => {
        const intentionalViolations = getIntentionalPenalties(
          penalties,
          team.entry_id,
        );

        return (
          <article
            key={team.entry_id}
            className={`flex flex-col items-center rounded-xl border p-6 text-center ${
              team.is_banned
                ? "border-rose-900/50 bg-slate-900/30 opacity-60 grayscale"
                : "border-slate-800 bg-slate-900/50"
            }`}
          >
            {team.is_banned ? (
              <div className="mb-3 w-full rounded-lg border border-rose-500/50 bg-rose-950/60 px-3 py-2">
                <p className="text-xs font-black uppercase tracking-widest text-rose-400">
                  Zbanowany
                </p>
                {intentionalViolations.length > 0 ? (
                  <div className="mt-2 text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-500/80">
                      Przewinienia (celowe naruszenia):
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {intentionalViolations.map((p) => (
                        <li
                          key={p.id}
                          className="text-[11px] leading-snug text-rose-400/90"
                        >
                          {formatViolationLine(p)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-2 text-left text-[11px] text-rose-400/70">
                    Usunięty z ligi FPL — brak zarejestrowanych celowych naruszeń
                    w bazie.
                  </p>
                )}
              </div>
            ) : null}

            <NoBigSixTeamCrest
              url={team.custom_logo_url}
              teamName={team.team_name}
              sizeClass="mb-4 h-20 w-20"
              shape="circle"
              initialsChars={2}
            />
            <h3 className="font-semibold text-white">{team.team_name}</h3>
            <p className="mt-1 text-sm text-slate-400">{team.player_name}</p>
          </article>
        );
      })}
    </div>
  );
}
