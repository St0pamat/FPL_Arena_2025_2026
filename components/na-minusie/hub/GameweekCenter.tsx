"use client";

import { Loader2, Target } from "lucide-react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { GameweekDetailsPayload, PublicFixture } from "@/lib/public/types";
import { ClubCrest } from "@/components/na-minusie/hub/ClubCrest";
import { TeamIdentity } from "@/components/na-minusie/hub/TeamIdentity";
import {
  DiscordExportFrame,
  slugForExport,
} from "@/components/na-minusie/hub/DiscordExport";

function MedianBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/40">
      +1 Mediana
    </span>
  );
}

function MatchCard({
  match,
  logos,
}: {
  match: GameweekDetailsPayload["matches"][number];
  logos: ClubLogoRecord[];
}) {
  const { fixture, homeWon, awayWon, draw } = match;

  return (
    <article
      className={`rounded-2xl border bg-slate-900 p-4 ${
        draw
          ? "border-amber-500/30"
          : homeWon || awayWon
            ? "border-emerald-500/25"
            : "border-slate-800"
      }`}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
        <div
          className={`flex min-w-0 flex-col items-end gap-1 ${
            homeWon ? "opacity-100" : awayWon ? "opacity-50" : "opacity-90"
          }`}
        >
          <div className="flex min-h-[4rem] items-stretch gap-2">
            <TeamIdentity team={fixture.home_team} align="right" size="sm" />
            <ClubCrest
              clubName={fixture.home_team?.chosen_club}
              logos={logos}
            />
          </div>
          <MedianBadge show={fixture.home_median_bonus === 1} />
        </div>

        <div className="flex flex-col items-center gap-1 px-1">
          <span className="font-athletic text-2xl font-bold tabular-nums text-white">
            {fixture.is_finished
              ? `${fixture.home_fpl_points ?? 0} : ${fixture.away_fpl_points ?? 0}`
              : "vs"}
          </span>
          {fixture.is_finished ? (
            <span className="rounded bg-black/50 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
              H2H {fixture.home_h2h_points}-{fixture.away_h2h_points}
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-wider text-slate-600">
              Zaplanowany
            </span>
          )}
        </div>

        <div
          className={`flex min-w-0 flex-col items-start gap-1 ${
            awayWon ? "opacity-100" : homeWon ? "opacity-50" : "opacity-90"
          }`}
        >
          <div className="flex min-h-[4rem] items-stretch gap-2">
            <ClubCrest
              clubName={fixture.away_team?.chosen_club}
              logos={logos}
            />
            <TeamIdentity team={fixture.away_team} align="left" size="sm" />
          </div>
          <MedianBadge show={fixture.away_median_bonus === 1} />
        </div>
      </div>
    </article>
  );
}

export function GameweekCenter({
  maxGameweek,
  finishedGameweeks,
  selectedGw,
  onSelectGw,
  details,
  loading,
  logos = [],
  exportMeta,
  fixtures = [],
  divisionId = "",
  showDiscordSend = false,
  hasWebhook = false,
}: {
  maxGameweek: number;
  finishedGameweeks: number[];
  selectedGw: number;
  onSelectGw: (gw: number) => void;
  details: GameweekDetailsPayload | null;
  loading: boolean;
  logos?: ClubLogoRecord[];
  exportMeta?: { season?: string; pyramid?: string; division?: string };
  fixtures?: PublicFixture[];
  divisionId?: string;
  showDiscordSend?: boolean;
  hasWebhook?: boolean;
}) {
  const finishedSet = new Set(finishedGameweeks);
  const total = Math.max(maxGameweek, 18);
  const metaBits = [exportMeta?.season, exportMeta?.pyramid, exportMeta?.division]
    .filter(Boolean)
    .join(" · ");

  const nextGw = details ? details.gameweek + 1 : selectedGw + 1;
  const nextFixtures = fixtures.filter((f) => f.gameweek === nextGw);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Wybierz kolejkę
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: total }, (_, i) => i + 1).map((gw) => {
            const done = finishedSet.has(gw);
            const active = selectedGw === gw;
            return (
              <button
                key={gw}
                type="button"
                disabled={!done}
                onClick={() => onSelectGw(gw)}
                className={`shrink-0 rounded-xl px-3 py-2 font-athletic text-sm font-bold uppercase tracking-wide transition ${
                  active
                    ? "bg-emerald-400 text-black shadow-lg shadow-emerald-500/20"
                    : done
                      ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                      : "cursor-not-allowed bg-slate-950/50 text-slate-600"
                }`}
              >
                GW{gw}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 py-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
          Ładowanie kolejki…
        </div>
      ) : !details || !finishedSet.has(selectedGw) ? (
        <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-12 text-center text-sm text-slate-500">
          Wybierz rozliczoną kolejkę, aby zobaczyć medianę i wyniki H2H.
        </div>
      ) : (
        <>
          <DiscordExportFrame
            exportId="export-gw-results"
            fileName={`${slugForExport([
              "wyniki",
              `gw${details.gameweek}`,
              exportMeta?.division,
              exportMeta?.pyramid,
            ]) || `wyniki-gw${details.gameweek}`}.png`}
            title={`Wyniki · GW${details.gameweek}`}
            subtitle={metaBits || undefined}
            divisionId={divisionId}
            discordMessage={`🔥 Wyniki i Mediana za GW${details.gameweek}!`}
            showDiscordSend={showDiscordSend}
            hasWebhook={hasWebhook}
          >
            <div className="mb-5 rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-slate-900 to-slate-950 p-5">
              <div className="flex items-center gap-4">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/20 text-emerald-300">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-athletic text-xl uppercase tracking-wide text-white">
                    Mediana:{" "}
                    <span className="text-emerald-400">
                      {details.medianThreshold ?? "—"} pkt
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    TOP 5 (≥ {details.medianThreshold ?? "—"} pkt) → bonus +1 do tabeli
                  </p>
                </div>
              </div>
            </div>

            <h3 className="mb-3 font-athletic text-sm uppercase tracking-wide text-slate-300">
              Pojedynki H2H
            </h3>
            <div className="mb-6 grid gap-3 lg:grid-cols-2">
              {details.matches.map((m) => (
                <MatchCard key={m.fixture.id} match={m} logos={logos} />
              ))}
            </div>

            <h3 className="mb-3 font-athletic text-sm uppercase tracking-wide text-slate-300">
              Ranking FPL · linia po 5. = mediana
            </h3>
            <ul className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800">
              {details.fplRanking.map((row) => (
                <li
                  key={row.team.id}
                  className={`flex items-stretch gap-3 px-4 py-2 ${
                    row.position === 5 ? "border-b-2 border-b-emerald-500/50" : ""
                  } ${row.inMedianZone ? "bg-emerald-500/5" : ""}`}
                >
                  <span className="flex w-6 items-center font-mono text-xs font-bold text-slate-500">
                    {row.position}
                  </span>
                  <div className="flex min-h-[3.25rem] min-w-0 flex-1 items-stretch gap-2.5">
                    <ClubCrest clubName={row.team.chosen_club} logos={logos} />
                    <div className="flex min-w-0 flex-col justify-center">
                      <TeamIdentity team={row.team} size="sm" />
                    </div>
                  </div>
                  <span className="flex items-center font-athletic text-lg font-bold tabular-nums text-white">
                    {row.fplPoints}
                  </span>
                  {row.medianBonus ? (
                    <span className="flex items-center rounded-md bg-emerald-500/20 px-2 py-1 text-[10px] font-black uppercase text-emerald-300">
                      +1
                    </span>
                  ) : (
                    <span className="flex w-8 items-center" />
                  )}
                </li>
              ))}
            </ul>
          </DiscordExportFrame>

          {nextFixtures.length > 0 ? (
            <DiscordExportFrame
              exportId="export-gw-next"
              fileName={`${slugForExport([
                "zapowiedz",
                `gw${nextGw}`,
                exportMeta?.division,
                exportMeta?.pyramid,
              ]) || `zapowiedz-gw${nextGw}`}.png`}
              title={`Zapowiedź · GW${nextGw}`}
              subtitle={metaBits || undefined}
              divisionId={divisionId}
              discordMessage={`👀 Z kim grasz w następnej kolejce? Zapowiedź GW${nextGw}!`}
              showDiscordSend={showDiscordSend}
              hasWebhook={hasWebhook}
            >
              <p className="mb-4 text-sm text-slate-400">
                🔜 Mecze w następnej kolejce — zapowiedź H2H
              </p>
              <div className="grid gap-3 lg:grid-cols-2">
                {nextFixtures.map((f) => (
                  <MatchCard
                    key={f.id}
                    match={{
                      fixture: f,
                      homeWon: false,
                      awayWon: false,
                      draw: false,
                    }}
                    logos={logos}
                  />
                ))}
              </div>
            </DiscordExportFrame>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-8 text-center text-sm text-slate-500">
              Brak zaplanowanych meczów dla GW{nextGw} (koniec sezonu lub brak terminarza).
            </div>
          )}
        </>
      )}
    </div>
  );
}
