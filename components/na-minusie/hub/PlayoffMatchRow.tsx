import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import { cupOutcomeLabel, cupOutcomeTone } from "@/lib/admin/playoffTiebreak";
import type { PlayoffMatchMeta } from "@/lib/public/types";
import { LinkedCrestOnly } from "@/components/na-minusie/hub/LinkedTeamCell";
import { TeamIdentity } from "@/components/na-minusie/hub/TeamIdentity";

function teamLabel(side: "home" | "away", match: PlayoffMatchMeta) {
  const t = side === "home" ? match.fixture.home_team : match.fixture.away_team;
  if (!t) return "—";
  return t.fpl_team_name?.trim() || t.manager_name;
}

function OutcomeBadge({
  outcome,
}: {
  outcome: NonNullable<PlayoffMatchMeta["homeOutcome"]>;
}) {
  const win = cupOutcomeTone(outcome) === "win";
  return (
    <span
      className={`inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${
        win
          ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
          : "bg-red-500/15 text-red-400 ring-1 ring-red-500/30"
      }`}
    >
      {cupOutcomeLabel(outcome)}
    </span>
  );
}

/** Wiersz meczu barażowego — FPL + statusy pucharowe + ścieżka TB. */
export function PlayoffMatchRow({
  match,
  logos = [],
  highlight = false,
  compact = false,
}: {
  match: PlayoffMatchMeta;
  logos?: ClubLogoRecord[];
  highlight?: boolean;
  compact?: boolean;
}) {
  const f = match.fixture;
  const hasScore = f.home_fpl_points != null && f.away_fpl_points != null;
  const homeWon =
    match.homeOutcome === "UTRZYMANIE" ||
    (f.is_finished &&
      (f.tiebreaker_winner_id === f.home_team_id || f.home_h2h_points === 2));
  const awayWon =
    match.awayOutcome === "AWANS" ||
    (f.is_finished &&
      (f.tiebreaker_winner_id === f.away_team_id || f.away_h2h_points === 2));

  const path =
    match.decisionPath && match.decisionPath.length > 0
      ? match.decisionPath
      : null;

  return (
    <div
      className={`space-y-2 ${
        compact
          ? "rounded-2xl border border-amber-500/25 bg-slate-900 px-4 py-3 sm:px-5 sm:py-3.5"
          : ""
      }`}
    >
      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
          {match.badge}
        </span>
        <p className="text-xs text-slate-400">{match.contextLine}</p>
        {match.isProvisional && match.provisionalNote ? (
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
            {match.provisionalNote}
          </p>
        ) : null}
      </div>

      <div
        className={`grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 sm:gap-3 ${
          compact ? "pt-1" : `px-3 py-2.5 sm:px-5 sm:py-3 ${highlight ? "bg-emerald-500/5" : ""}`
        }`}
      >
        <div className="flex min-h-[3.25rem] min-w-0 flex-col items-end justify-center gap-1">
          <div className="flex w-full min-w-0 items-stretch justify-end gap-2">
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <TeamIdentity team={f.home_team} align="right" size="sm" truncate={false} />
            </div>
            <LinkedCrestOnly
              team={f.home_team}
              logos={logos}
              colClass={compact ? "w-12 sm:w-14" : "w-11 sm:w-12"}
            />
          </div>
          {f.home_division_name ? (
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
              [{f.home_division_name}]
            </span>
          ) : null}
          {match.homeOutcome ? <OutcomeBadge outcome={match.homeOutcome} /> : null}
        </div>

        <div className="flex flex-col items-center justify-center gap-0.5 px-1">
          {hasScore ? (
            <>
              <p className="font-mono text-xl font-black tabular-nums text-white sm:text-2xl">
                <span className={homeWon ? "text-emerald-400" : undefined}>
                  {f.home_fpl_points}
                </span>
                <span className="mx-1.5 text-slate-600">:</span>
                <span className={awayWon ? "text-emerald-400" : undefined}>
                  {f.away_fpl_points}
                </span>
              </p>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {f.is_finished ? "FPL" : "FPL · oczekuje"}
              </span>
            </>
          ) : (
            <span className="rounded bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400">
              vs
            </span>
          )}
        </div>

        <div className="flex min-h-[3.25rem] min-w-0 flex-col items-start justify-center gap-1">
          <div className="flex w-full min-w-0 items-stretch justify-start gap-2">
            <LinkedCrestOnly
              team={f.away_team}
              logos={logos}
              colClass={compact ? "w-12 sm:w-14" : "w-11 sm:w-12"}
            />
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <TeamIdentity team={f.away_team} align="left" size="sm" truncate={false} />
            </div>
          </div>
          {f.away_division_name ? (
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
              [{f.away_division_name}]
            </span>
          ) : null}
          {match.awayOutcome ? <OutcomeBadge outcome={match.awayOutcome} /> : null}
        </div>
      </div>

      {path ? (
        <div
          className={`rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-left ${
            compact ? "" : "mx-3 sm:mx-5"
          }`}
        >
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400/90">
            Ścieżka rozstrzygnięcia
          </p>
          <ul className="space-y-1">
            {path.map((step) => (
              <li
                key={step.key}
                className={`text-xs leading-relaxed ${
                  step.isDeciding
                    ? "font-semibold text-amber-100"
                    : "text-slate-400"
                }`}
              >
                {step.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasScore && compact && !path ? (
        <p className="text-center text-xs text-slate-400">
          <span className={homeWon ? "font-semibold text-emerald-300" : ""}>
            {teamLabel("home", match)}
          </span>{" "}
          <span className="font-mono text-slate-200">
            {f.home_fpl_points} : {f.away_fpl_points}
          </span>{" "}
          <span className={awayWon ? "font-semibold text-emerald-300" : ""}>
            {teamLabel("away", match)}
          </span>
        </p>
      ) : null}
    </div>
  );
}
