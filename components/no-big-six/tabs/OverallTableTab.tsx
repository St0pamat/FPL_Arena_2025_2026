import type { NoBigSixGwResult, NoBigSixPenalty, NoBigSixTeam } from "@/lib/no-big-six/types";
import { buildOverallStandings } from "@/lib/no-big-six/standings";
import {
  formatViolationLine,
  getIntentionalPenalties,
  hasIntentionalViolation,
} from "@/lib/no-big-six/penalties";
import { DoZbanowaniaBadge } from "@/components/no-big-six/DoZbanowaniaBadge";

type Props = {
  teams: NoBigSixTeam[];
  results: NoBigSixGwResult[];
  penalties: NoBigSixPenalty[];
};

export function OverallTableTab({ teams, results, penalties }: Props) {
  const standings = buildOverallStandings(teams, results);

  if (standings.length === 0) {
    return (
      <p className="py-8 text-center text-slate-400">
        Brak wyników — tabela pojawi się po pierwszej rozegranej kolejce.
      </p>
    );
  }

  let activeRank = 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Menedżer / Drużyna</th>
            <th className="px-4 py-3 text-right">FPL Pkt</th>
            <th className="px-4 py-3 text-right">Kary</th>
            <th className="px-4 py-3 text-right">Oficjalne Pkt</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => {
            if (!row.is_banned) activeRank += 1;
            const intentionalViolations = getIntentionalPenalties(penalties, row.entry_id);
            const flagForBan =
              !row.is_banned && hasIntentionalViolation(penalties, row.entry_id);

            return (
              <tr
                key={row.entry_id}
                className={`border-b border-slate-800/60 transition-colors ${
                  row.is_banned
                    ? "bg-rose-950/10 opacity-60"
                    : flagForBan
                      ? "bg-rose-950/5 ring-1 ring-inset ring-rose-500/15"
                      : "hover:bg-slate-800/30"
                }`}
              >
                <td className="px-4 py-3 font-bold text-slate-400">
                  {row.is_banned ? "—" : activeRank}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`font-semibold ${
                        row.is_banned
                          ? "text-slate-400 line-through decoration-rose-500/60"
                          : "text-white"
                      }`}
                    >
                      {row.team_name}
                    </p>
                    {row.is_banned ? (
                      <span className="rounded border border-rose-500/40 bg-rose-950/50 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-400">
                        Zbanowany
                      </span>
                    ) : null}
                    {flagForBan ? <DoZbanowaniaBadge /> : null}
                  </div>
                  <p className="text-xs text-slate-500">{row.player_name}</p>
                  {intentionalViolations.length > 0 ? (
                    <ul className="mt-2 max-w-md space-y-0.5">
                      {intentionalViolations.map((p) => (
                        <li key={p.id} className="text-[11px] leading-snug text-rose-400/90">
                          {formatViolationLine(p)}
                        </li>
                      ))}
                    </ul>
                  ) : row.is_banned ? (
                    <p className="mt-1 text-[11px] text-rose-400/60">
                      Brak celowych naruszeń w bazie
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                  {row.raw_fpl_points}
                </td>
                <td
                  className={`px-4 py-3 text-right tabular-nums ${
                    row.penalty_points > 0 ? "font-semibold text-rose-500" : "text-slate-500"
                  }`}
                >
                  {row.penalty_points > 0 ? `−${row.penalty_points}` : "0"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-lg font-bold text-amber-500">
                  {row.official_points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
