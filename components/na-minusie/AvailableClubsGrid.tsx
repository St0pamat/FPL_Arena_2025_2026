"use client";

import { Clock, Shield } from "lucide-react";
import { MarketingCrest } from "@/components/na-minusie/MarketingCrest";
import { SectionShell } from "@/components/na-minusie/SectionShell";
import type { ClubLogoRecord } from "@/lib/admin/clubLogos";
import type { RecruitmentClubsData } from "@/lib/public/getAvailableClubs";

export function AvailableClubsGrid({
  data,
  logos = [],
}: {
  data: RecruitmentClubsData;
  logos?: ClubLogoRecord[];
}) {
  return (
    <>
      <SectionShell id="aktualni-uczestnicy" tight>
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#39FF14]">
            Aktualni Uczestnicy
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Grają z Nami!
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-300 sm:text-lg">
            Aktualni uczestnicy ligi i kluby, które reprezentują.
          </p>
        </div>

        {data.players.length === 0 ? (
          <p className="mt-8 text-sm text-slate-500">
            Nie udało się wczytać listy uczestników. Odśwież stronę za chwilę.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {data.players.map((player) => (
              <article
                key={`${player.discordClub}-${player.fplManager}`}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 text-center"
              >
                <div className="w-full px-1.5 pt-1.5">
                  <MarketingCrest
                    clubName={player.discordClub}
                    logos={logos}
                    size="fill"
                  />
                </div>

                <div className="flex flex-1 flex-col px-2.5 pb-3 pt-2 sm:px-3">
                  <div className="flex min-h-[2.75rem] w-full items-center justify-center sm:min-h-[3rem]">
                    <h4 className="text-[13px] font-black uppercase leading-tight tracking-wide text-white sm:text-sm">
                      {player.discordClub}
                    </h4>
                  </div>

                  <div className="mt-1.5 flex min-h-[1.75rem] w-full items-center justify-center">
                    {player.fplTeam ? (
                      <p className="inline-flex max-w-full items-center justify-center rounded-md bg-[#39FF14]/10 px-2 py-1 text-[11px] font-bold leading-none text-[#39FF14] ring-1 ring-[#39FF14]/25 sm:text-xs">
                        <span className="truncate">{player.fplTeam}</span>
                      </p>
                    ) : null}
                  </div>

                  <p className="mt-2 truncate rounded-md border border-slate-700/80 bg-slate-950/60 px-2 py-1 text-[11px] font-semibold tracking-wide text-slate-200 sm:text-xs">
                    {player.fplManager}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}

        {data.reservedClubs.length > 0 ? (
          <div className="mt-12 mb-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Oczekują na potwierdzenie
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Kluby tymczasowo zarezerwowane — niedostępne do wyboru, dopóki status nie zostanie
              potwierdzony.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-4">
              {data.reservedClubs.map((club) => (
                <article
                  key={club}
                  className="flex flex-col items-center gap-2 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 text-center opacity-80"
                >
                  <MarketingCrest
                    clubName={club}
                    logos={logos}
                    size="md"
                    dimmed
                  />
                  <h4 className="w-full truncate text-xs font-bold uppercase tracking-wide text-slate-300 sm:text-[13px]">
                    {club}
                  </h4>
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-500 ring-1 ring-amber-500/25">
                    <Clock className="h-3 w-3" aria-hidden />
                    Rezerwacja
                  </span>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </SectionShell>

      <SectionShell id="dostepne-kluby" tight>
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#39FF14]">
            Dostępne Kluby
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Przykładowe dostępne kluby
          </h2>
          <p className="mt-5 text-base font-bold leading-relaxed text-[#39FF14] sm:text-lg">
            Pamiętaj! Możesz wybrać dowolny inny angielski klub, którego do tej pory nie wybrali nasi
            uczestnicy.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {data.availableClubs.map((club) => (
            <article
              key={club}
              className="flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-center sm:p-5"
            >
              <MarketingCrest clubName={club} logos={logos} size="lg" />
              <h4 className="text-sm font-black uppercase leading-snug tracking-wide text-white sm:text-base">
                {club}
              </h4>
              <span className="rounded-md bg-[#39FF14]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#39FF14] ring-1 ring-[#39FF14]/25">
                Dostępny
              </span>
            </article>
          ))}

          {/* Zawsze ostatni (20.) kafelek — ten sam rozmiar co pozostałe */}
          <article className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#39FF14]/40 bg-[#39FF14]/5 p-4 text-center sm:p-5">
            <span className="inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-[#39FF14]/25 bg-slate-950/40 text-[#39FF14] sm:h-24 sm:w-24">
              <Shield className="h-10 w-10 sm:h-12 sm:w-12" strokeWidth={1.5} aria-hidden />
            </span>
            <h4 className="text-sm font-black uppercase leading-snug tracking-wide text-white sm:text-base">
              Twój Własny Wybór
            </h4>
            <span className="rounded-md bg-[#39FF14]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#39FF14] ring-1 ring-[#39FF14]/25">
              Wybierz dowolny
            </span>
          </article>
        </div>
      </SectionShell>
    </>
  );
}
