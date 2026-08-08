"use client";

import { useRef } from "react";
import { Loader2, Target } from "lucide-react";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type {
  GameweekDetailsPayload,
  PlayoffPreviewPayload,
  PublicFixture,
} from "@/lib/public/types";
import { LinkedCrestOnly } from "@/components/na-minusie/hub/LinkedTeamCell";
import { TeamIdentity } from "@/components/na-minusie/hub/TeamIdentity";
import { ExportControls } from "@/components/na-minusie/hub/ExportControls";
import { PlayoffMatchRow } from "@/components/na-minusie/hub/PlayoffMatchRow";
import { NA_MINUSIE_BRAND } from "@/lib/na-minusie";
import { slugForExport } from "@/components/na-minusie/hub/DiscordExport";
import {
  gameweekLabel,
  isPlayoffGameweek,
  PLAYOFF_GAMEWEEK,
} from "@/lib/public/season";

const EXPORT_BG = "#0B0F19";

const EMPTY_PLAYOFFS: PlayoffPreviewPayload = {
  gameweek: PLAYOFF_GAMEWEEK,
  matches: [],
  notices: [],
};

export function MatchCard({
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
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2.5 sm:gap-3">
        <div
          className={`flex min-w-0 items-stretch justify-end gap-2 sm:gap-2.5 ${
            homeWon ? "opacity-100" : awayWon ? "opacity-50" : "opacity-90"
          }`}
        >
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <TeamIdentity
              team={fixture.home_team}
              align="right"
              size="sm"
              truncate={false}
            />
          </div>
          <LinkedCrestOnly
            team={fixture.home_team}
            logos={logos}
            colClass="w-12 sm:w-14"
          />
        </div>

        <div className="flex shrink-0 flex-col items-center justify-center gap-1 px-1">
          <span className="font-athletic text-xl font-bold tabular-nums text-white sm:text-2xl">
            {fixture.is_finished
              ? `${fixture.home_fpl_points ?? 0} : ${fixture.away_fpl_points ?? 0}`
              : "– : –"}
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
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              Oczekuje na wyniki
            </span>
          )}
        </div>

        <div
          className={`flex min-w-0 items-stretch justify-start gap-2 sm:gap-2.5 ${
            awayWon ? "opacity-100" : homeWon ? "opacity-50" : "opacity-90"
          }`}
        >
          <LinkedCrestOnly
            team={fixture.away_team}
            logos={logos}
            colClass="w-12 sm:w-14"
          />
          <div className="flex min-w-0 flex-1 flex-col justify-center">
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
          className={`grid min-h-0 flex-1 grid-cols-[1.75rem_minmax(0,1fr)_auto] items-stretch gap-2.5 rounded-xl border px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-2.5 ${
            row.position === 5 ? "border-emerald-500/50" : "border-slate-800"
          } ${row.inMedianZone ? "bg-emerald-500/5" : "bg-slate-950/40"}`}
        >
          <span className="flex items-center font-mono text-sm font-bold tabular-nums text-slate-400">
            {row.position}
          </span>
          <div className="flex min-w-0 items-stretch gap-2 sm:gap-2.5">
            <LinkedCrestOnly
              team={row.team}
              logos={logos}
              colClass="w-11 sm:w-12"
            />
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <TeamIdentity team={row.team} size="md" truncate />
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end justify-center gap-1">
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
  availableGameweeks,
  finishedGameweeks,
  selectedGw,
  onSelectGw,
  details,
  loading,
  logos = [],
  exportMeta,
  fixtures = [],
  playoffs = EMPTY_PLAYOFFS,
  divisionId = "",
  showDiscordSend = false,
  hasWebhook = false,
}: {
  maxGameweek: number;
  /** Distinct GW z fixtures sezonu (np. 20–38); nie renderować 1…38 na ślepo. */
  availableGameweeks?: number[];
  finishedGameweeks: number[];
  selectedGw: number;
  onSelectGw: (gw: number) => void;
  details: GameweekDetailsPayload | null;
  loading: boolean;
  logos?: ClubLogoRecord[];
  exportMeta?: { season?: string; pyramid?: string; division?: string };
  fixtures?: PublicFixture[];
  playoffs?: PlayoffPreviewPayload;
  divisionId?: string;
  showDiscordSend?: boolean;
  hasWebhook?: boolean;
}) {
  const resultsRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const rankingRef = useRef<HTMLDivElement>(null);
  const playoffRef = useRef<HTMLDivElement>(null);

  const finishedSet = new Set(finishedGameweeks);
  const weeks =
    availableGameweeks && availableGameweeks.length > 0
      ? availableGameweeks
      : Array.from({ length: Math.max(maxGameweek, 1) }, (_, i) => i + 1);
  const isPlayoffView = isPlayoffGameweek(selectedGw);
  const metaBits = [exportMeta?.season, exportMeta?.pyramid, exportMeta?.division]
    .filter(Boolean)
    .join(" · ");

  const nextGw = details ? details.gameweek + 1 : selectedGw + 1;
  const nextIsPlayoff = isPlayoffGameweek(nextGw);
  const nextFixtures = nextIsPlayoff
    ? []
    : fixtures.filter((f) => f.gameweek === nextGw);

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

  const playoffFile = `${slugForExport([
    "baraze",
    `gw${selectedGw}`,
    exportMeta?.division,
    exportMeta?.pyramid,
  ]) || "baraze"}.png`;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Wybierz kolejkę
        </p>
        <div className="flex w-full gap-1 sm:gap-1.5">
          {weeks.map((gw) => {
            const playoff = isPlayoffGameweek(gw);
            const done = finishedSet.has(gw);
            const active = selectedGw === gw;
            return (
              <button
                key={gw}
                type="button"
                onClick={() => onSelectGw(gw)}
                title={playoff ? gameweekLabel(gw) : `GW${gw}`}
                className={`min-w-0 flex-1 rounded-lg px-0.5 py-1.5 font-athletic text-[10px] font-bold uppercase tracking-tight transition sm:rounded-xl sm:px-1 sm:py-2 sm:text-xs sm:tracking-wide ${
                  active
                    ? playoff
                      ? "bg-amber-400 text-black shadow-lg shadow-amber-500/25"
                      : "bg-emerald-400 text-black shadow-lg shadow-emerald-500/20"
                    : playoff
                      ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40 hover:bg-amber-500/25"
                      : done
                        ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                        : "bg-slate-950/50 text-slate-500 hover:bg-slate-800/80 hover:text-slate-300"
                }`}
              >
                {playoff ? (
                  <span className="flex flex-col items-center leading-none gap-0.5">
                    <span>GW{gw}</span>
                    <span className="text-[8px] font-black tracking-wider sm:text-[9px]">
                      BARAŻ
                    </span>
                  </span>
                ) : (
                  `GW${gw}`
                )}
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
      ) : isPlayoffView ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-950 p-5">
            <p className="font-athletic text-xl uppercase tracking-wide text-white">
              {gameweekLabel(selectedGw)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Oficjalna kolejka barażowa · 8. wyższej vs 3. niższej · mecz pucharowy (bez punktów H2H)
            </p>
          </div>

          <div className="flex justify-end">
            <ExportControls
              targetRef={playoffRef}
              fileName={playoffFile}
              divisionId={divisionId}
              discordMessage={`⚔️ Baraże GW${selectedGw} — awans / utrzymanie`}
              showDiscordSend={showDiscordSend}
              hasWebhook={hasWebhook}
              compact
            />
          </div>

          <div
            ref={playoffRef}
            id="export-gw-playoffs"
            className="overflow-hidden rounded-2xl border border-slate-800 shadow-2xl shadow-black/50"
            style={{ backgroundColor: EXPORT_BG }}
          >
            <div className="space-y-4 p-4 sm:p-6" style={{ backgroundColor: EXPORT_BG }}>
              <header className="border-b border-amber-500/30 pb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-400">
                  {NA_MINUSIE_BRAND}
                </p>
                <h2 className="mt-1 font-athletic text-2xl uppercase tracking-wide text-white">
                  {gameweekLabel(selectedGw)}
                </h2>
                {metaBits ? (
                  <p className="mt-1 text-xs text-slate-400">{metaBits}</p>
                ) : null}
              </header>

              {playoffs.notices.map((notice) => (
                <div
                  key={notice}
                  className="rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 px-5 py-4 text-sm leading-relaxed text-slate-300"
                >
                  {notice}
                </div>
              ))}

              {playoffs.matches.filter((m) => m.fixture.gameweek === selectedGw)
                .length > 0 ? (
                <div className="flex flex-col gap-3">
                  {playoffs.matches
                    .filter((m) => m.fixture.gameweek === selectedGw)
                    .map((m) => (
                      <PlayoffMatchRow
                        key={m.fixture.id}
                        match={m}
                        logos={logos}
                        compact
                      />
                    ))}
                </div>
              ) : playoffs.notices.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-10 text-center text-sm text-slate-500">
                  Brak par barażowych dla tej dywizji.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : !details ? (
        <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-12 text-center text-sm text-slate-500">
          Brak meczów dla tej kolejki.
        </div>
      ) : !details.isFinished ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-700/80 bg-slate-900/60 p-5">
            <p className="font-athletic text-xl uppercase tracking-wide text-white">
              {gameweekLabel(selectedGw)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Mecze zaplanowane · wyniki pojawią się po publikacji kolejki
            </p>
          </div>
          {details.matches.length > 0 ? (
            <div className="flex w-full flex-col gap-2.5">
              {details.matches.map((m) => (
                <MatchCard key={m.fixture.id} match={m} logos={logos} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-12 text-center text-sm text-slate-500">
              Brak meczów w terminarzu dla tej kolejki.
            </div>
          )}
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

                  {nextIsPlayoff ? (
                    <div
                      ref={previewRef}
                      id="export-gw-next"
                      className="rounded-xl p-1"
                      style={{ backgroundColor: EXPORT_BG }}
                    >
                      <p className="mb-3 text-center text-sm text-amber-400/90">
                        Zapowiedź · {gameweekLabel(nextGw)}
                      </p>
                      {playoffs.notices.length > 0 ? (
                        <div className="mb-3 space-y-2">
                          {playoffs.notices.map((n) => (
                            <p
                              key={n}
                              className="rounded-xl border border-dashed border-amber-500/25 px-3 py-2 text-xs leading-relaxed text-slate-400"
                            >
                              {n}
                            </p>
                          ))}
                        </div>
                      ) : null}
                      {playoffs.matches.length > 0 ? (
                        <div className="flex w-full flex-col gap-2.5">
                          {playoffs.matches.map((m) => (
                            <PlayoffMatchRow
                              key={m.fixture.id}
                              match={m}
                              logos={logos}
                              compact
                            />
                          ))}
                        </div>
                      ) : playoffs.notices.length === 0 ? (
                        <p className="py-4 text-center text-sm text-slate-500">
                          Brak par barażowych.
                        </p>
                      ) : null}
                    </div>
                  ) : nextFixtures.length > 0 ? (
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
                Zapowiedź · {nextIsPlayoff ? gameweekLabel(nextGw) : `GW${nextGw}`}
              </span>
              {nextIsPlayoff || nextFixtures.length > 0 ? (
                <ExportControls
                  targetRef={previewRef}
                  fileName={previewFile}
                  divisionId={divisionId}
                  discordMessage={
                    nextIsPlayoff
                      ? `⚔️ Zapowiedź baraży GW${nextGw}!`
                      : `👀 Z kim grasz w następnej kolejce? Zapowiedź GW${nextGw}!`
                  }
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
