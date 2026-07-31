"use client";

import { useRef } from "react";
import { Loader2, Target } from "lucide-react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { GameweekDetailsPayload, PublicFixture } from "@/lib/public/types";
import { ClubCrest } from "@/components/na-minusie/hub/ClubCrest";
import { TeamIdentity } from "@/components/na-minusie/hub/TeamIdentity";
import { ExportControls } from "@/components/na-minusie/hub/ExportControls";
import { NA_MINUSIE_BRAND } from "@/lib/na-minusie";
import { slugForExport } from "@/components/na-minusie/hub/DiscordExport";

const EXPORT_BG = "#0B0F19";

function MatchCard({
  match,
  logos,
}: {
  match: GameweekDetailsPayload["matches"][number];
  logos: ClubLogoRecord[];
}) {
  const { fixture, homeWon, awayWon, draw } = match;
  const homeMed = fixture.home_median_bonus === 1 ? 1 : 0;
  const awayMed = fixture.away_median_bonus === 1 ? 1 : 0;

  return (
    <article
      className={`rounded-2xl border bg-slate-900 px-4 py-3 sm:px-5 sm:py-3.5 ${
        draw
          ? "border-amber-500/30"
          : homeWon || awayWon
            ? "border-emerald-500/25"
            : "border-slate-800"
      }`}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-4">
        <div
          className={`flex min-w-0 items-center justify-end gap-2.5 sm:gap-3 ${
            homeWon ? "opacity-100" : awayWon ? "opacity-50" : "opacity-90"
          }`}
        >
          <div className="min-w-0 flex-1">
            <TeamIdentity
              team={fixture.home_team}
              align="right"
              size="sm"
              truncate={false}
            />
          </div>
          <ClubCrest
            clubName={fixture.home_team?.chosen_club}
            logos={logos}
            size="lg"
          />
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1 px-1">
          <span className="font-athletic text-xl font-bold tabular-nums text-white sm:text-2xl">
            {fixture.is_finished
              ? `${fixture.home_fpl_points ?? 0} : ${fixture.away_fpl_points ?? 0}`
              : "vs"}
          </span>
          {fixture.is_finished ? (
            <>
              <span className="rounded bg-black/50 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                H2H {fixture.home_h2h_points}-{fixture.away_h2h_points}
              </span>
              <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                M {homeMed}-{awayMed}
              </span>
            </>
          ) : (
            <span className="text-[10px] uppercase tracking-wider text-slate-600">
              Zaplanowany
            </span>
          )}
        </div>

        <div
          className={`flex min-w-0 items-center justify-start gap-2.5 sm:gap-3 ${
            awayWon ? "opacity-100" : homeWon ? "opacity-50" : "opacity-90"
          }`}
        >
          <ClubCrest
            clubName={fixture.away_team?.chosen_club}
            logos={logos}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <TeamIdentity
              team={fixture.away_team}
              align="left"
              size="sm"
              truncate={false}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function FplMedianRanking({
  details,
  logos,
}: {
  details: GameweekDetailsPayload;
  logos: ClubLogoRecord[];
}) {
  return (
    <ul className="flex min-h-0 flex-1 flex-col gap-2">
      {details.fplRanking.map((row) => (
        <li
          key={row.team.id}
          className={`grid min-h-0 flex-1 grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-2.5 ${
            row.position === 5 ? "border-emerald-500/50" : "border-slate-800"
          } ${row.inMedianZone ? "bg-emerald-500/5" : "bg-slate-950/40"}`}
        >
          <span className="font-mono text-sm font-bold tabular-nums text-slate-400">
            {row.position}
          </span>
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <ClubCrest clubName={row.team.chosen_club} logos={logos} size="lg" />
            <TeamIdentity team={row.team} size="md" truncate />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="font-athletic text-2xl font-bold tabular-nums leading-none text-white sm:text-3xl">
              {row.fplPoints}
            </span>
            {row.medianBonus ? (
              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300">
                +1
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
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
  const resultsRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const rankingRef = useRef<HTMLDivElement>(null);

  const finishedSet = new Set(finishedGameweeks);
  const total = Math.max(maxGameweek, 18);
  const metaBits = [exportMeta?.season, exportMeta?.pyramid, exportMeta?.division]
    .filter(Boolean)
    .join(" · ");

  const nextGw = details ? details.gameweek + 1 : selectedGw + 1;
  const nextFixtures = fixtures.filter((f) => f.gameweek === nextGw);

  const resultsFile = `${slugForExport([
    "wyniki",
    details ? `gw${details.gameweek}` : "gw",
    exportMeta?.division,
    exportMeta?.pyramid,
  ]) || "wyniki"}.png`;

  const previewFile = `${slugForExport([
    "zapowiedz",
    `gw${nextGw}`,
    exportMeta?.division,
    exportMeta?.pyramid,
  ]) || `zapowiedz-gw${nextGw}`}.png`;

  const rankingFile = `${slugForExport([
    "tabela-mediany",
    details ? `gw${details.gameweek}` : "gw",
    exportMeta?.division,
    exportMeta?.pyramid,
  ]) || "tabela-mediany"}.png`;

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
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-slate-900 to-slate-950 p-5">
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

          {/*
            Lewa: H2H + Zapowiedź | Prawa: Ranking (stretch).
            Eksport: 3 osobne grafiki (wyniki / zapowiedź / tabela mediany).
          */}
          <div
            className="overflow-hidden rounded-2xl border border-slate-800 shadow-2xl shadow-black/50"
            style={{ backgroundColor: EXPORT_BG }}
          >
            <div className="p-4 sm:p-6" style={{ backgroundColor: EXPORT_BG }}>
              <header className="mb-5 border-b border-emerald-500/30 pb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-400">
                  {NA_MINUSIE_BRAND}
                </p>
                {metaBits ? (
                  <p className="mt-2 text-xs text-slate-400">{metaBits}</p>
                ) : null}
              </header>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.9fr)] lg:items-stretch">
                <div className="flex min-w-0 flex-col gap-3">
                  <div
                    ref={resultsRef}
                    id="export-gw-results"
                    className="rounded-xl p-1"
                    style={{ backgroundColor: EXPORT_BG }}
                  >
                    <h3 className="mb-3 text-center font-athletic text-sm uppercase tracking-wide text-slate-300">
                      Wyniki · GW{details.gameweek}
                    </h3>
                    <div className="flex w-full flex-col gap-2.5">
                      {details.matches.map((m) => (
                        <MatchCard key={m.fixture.id} match={m} logos={logos} />
                      ))}
                    </div>
                  </div>

                  {nextFixtures.length > 0 ? (
                    <div
                      ref={previewRef}
                      id="export-gw-next"
                      className="rounded-xl p-1"
                      style={{ backgroundColor: EXPORT_BG }}
                    >
                      <p className="mb-3 text-center text-sm text-slate-400">
                        Zapowiedź · GW{nextGw}
                      </p>
                      <div className="flex w-full flex-col gap-2.5">
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
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-8 text-center text-sm text-slate-500">
                      Brak zaplanowanych meczów dla GW{nextGw}.
                    </div>
                  )}
                </div>

                <div
                  ref={rankingRef}
                  id="export-gw-ranking"
                  className="flex h-full min-h-0 min-w-0 flex-col self-stretch rounded-xl p-1"
                  style={{ backgroundColor: EXPORT_BG }}
                >
                  <h3 className="mb-3 font-athletic text-sm uppercase tracking-wide text-slate-300">
                    Tabela Mediany
                  </h3>
                  <FplMedianRanking details={details} logos={logos} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="flex min-w-0 flex-col items-center gap-1">
              <span className="text-center text-[9px] font-bold uppercase tracking-wider text-slate-500 sm:text-[10px]">
                Wyniki · GW{details.gameweek}
              </span>
              <ExportControls
                targetRef={resultsRef}
                fileName={resultsFile}
                divisionId={divisionId}
                discordMessage={`🔥 Wyniki H2H za GW${details.gameweek}!`}
                showDiscordSend={showDiscordSend}
                hasWebhook={hasWebhook}
                compact
                hideWebhookHint
              />
            </div>
            <div className="flex min-w-0 flex-col items-center gap-1">
              <span className="text-center text-[9px] font-bold uppercase tracking-wider text-slate-500 sm:text-[10px]">
                Zapowiedź · GW{nextGw}
              </span>
              {nextFixtures.length > 0 ? (
                <ExportControls
                  targetRef={previewRef}
                  fileName={previewFile}
                  divisionId={divisionId}
                  discordMessage={`👀 Z kim grasz w następnej kolejce? Zapowiedź GW${nextGw}!`}
                  showDiscordSend={showDiscordSend}
                  hasWebhook={hasWebhook}
                  compact
                  hideWebhookHint
                />
              ) : (
                <p className="text-[10px] text-slate-600">Brak meczów</p>
              )}
            </div>
            <div className="flex min-w-0 flex-col items-center gap-1">
              <span className="text-center text-[9px] font-bold uppercase tracking-wider text-slate-500 sm:text-[10px]">
                Tabela Mediany
              </span>
              <ExportControls
                targetRef={rankingRef}
                fileName={rankingFile}
                divisionId={divisionId}
                discordMessage={`📊 Tabela Mediany — GW${details.gameweek}`}
                showDiscordSend={showDiscordSend}
                hasWebhook={hasWebhook}
                compact
                hideWebhookHint
              />
            </div>
          </div>
          {showDiscordSend && !hasWebhook ? (
            <p className="text-center text-[10px] text-amber-400/80">
              Ustaw Discord Webhook URL dla tej dywizji w adminie → Struktura Ligi.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
