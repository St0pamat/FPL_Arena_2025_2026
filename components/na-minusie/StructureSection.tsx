import { SectionShell } from "@/components/na-minusie/SectionShell";
import { TierCrest } from "@/components/na-minusie/TierCrest";
import { listTierLogos } from "@/app/admin/actions/tierLogos";
import { PYRAMID_TIER_NAMES } from "@/lib/admin/tierLogos";

const pyramidTiers = [
  { tier: 1, name: PYRAMID_TIER_NAMES[0], leagueHint: "Premier League — Elita" },
  { tier: 2, name: PYRAMID_TIER_NAMES[1], leagueHint: "Championship — Mordercza walka" },
  { tier: 3, name: PYRAMID_TIER_NAMES[2], leagueHint: "League One — Awans albo ból" },
  { tier: 4, name: PYRAMID_TIER_NAMES[3], leagueHint: "League Two — Fundamenty" },
  { tier: 5, name: PYRAMID_TIER_NAMES[4], leagueHint: "National League — Błoto i chwała" },
] as const;

export async function StructureSection() {
  const logos = await listTierLogos().catch(() => []);

  return (
    <SectionShell id="piramida" tight>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#39FF14]">Piramida Ligowa</p>
      <h2 className="mt-4 text-xl font-extrabold tracking-tight text-white sm:text-2xl md:whitespace-nowrap md:text-3xl lg:text-4xl">
        Struktura Dywizji: Każdy z każdym (Mecz i Rewanż)
      </h2>
      <p className="mt-5 w-full text-base leading-relaxed text-slate-300 sm:text-lg">
        Nie gramy w jednej wielkiej lidze. Struktura Na Minusie ™ jest pionowa i przejrzysta –
        odwzorowuje angielską piramidę piłkarską. Gramy w zamkniętych, 10-osobowych dywizjach. Każdy
        sezon to 18 kolejek, w których rozgrywasz mecz i rewanż z każdym rywalem w swojej lidze.
        Liczba dywizji zależy od liczby graczy — piramida rośnie wraz z ligą.
      </p>

      <div className="mx-auto mt-10 flex w-full max-w-xl flex-col gap-3 sm:max-w-2xl sm:gap-4">
        {pyramidTiers.map((tier) => (
          <article
            key={tier.name}
            className="flex w-full items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:gap-5 sm:p-5"
          >
            <TierCrest tierName={tier.name} logos={logos} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-base font-extrabold text-white sm:text-lg">{tier.name}</h3>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:text-xs">
                  {tier.leagueHint}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400 sm:text-sm">10 zespołów · Mecz i rewanż</p>
            </div>
            <p className="shrink-0 font-mono text-xl font-black text-[#39FF14] sm:text-2xl">
              D{tier.tier}
            </p>
          </article>
        ))}
      </div>

      <article className="nm-card mt-10 border-slate-800 bg-slate-900/80 p-6 sm:p-8 lg:p-10">
        <h3 className="text-xl font-extrabold text-white sm:text-2xl lg:text-3xl">
          Awanse, Spadki i Emocjonujące Baraże
        </h3>
        <p className="mt-5 text-base leading-relaxed text-slate-300 sm:text-lg">
          Każdy sezon (Sezon 1 oraz Sezon 2) kończy się weryfikacją układu tabeli. Najlepsze zespoły
          uzyskują bezpośredni awans do wyższej dywizji, a najsłabsze spadają poziom niżej. Ostatnie
          kolejki obu sezonów (<strong className="text-white">GW19</strong> w Sezonie 1 oraz{" "}
          <strong className="text-white">GW38</strong> w Sezonie 2) to czas{" "}
          <strong className="text-white">Baraży</strong>. Menedżerowie z miejsc barażowych walczą o
          bezpośredni awans lub utrzymanie w jednym, rozstrzygającym pojedynku, co gwarantuje emocje
          do ostatnich minut!
        </p>
      </article>

      <article className="nm-card mt-5 border-slate-800 bg-slate-900/80 p-6 sm:p-8 lg:p-10">
        <h3 className="text-xl font-extrabold text-white sm:text-2xl lg:text-3xl">
          Jak przydzielamy graczy do dywizji przed 1. sezonem?
        </h3>
        <p className="mt-5 text-base leading-relaxed text-slate-300 sm:text-lg">
          Przydział do początkowych dywizji opiera się WYŁĄCZNIE na podstawie OR (Overall Rank) z
          ostatniego, zakończonego sezonu FPL. Nie patrzymy na historyczne średnie sprzed lat.
          Dlaczego? Bo Twój wynik z minionego sezonu to najlepszy, najbardziej aktualny dowód Twojej
          obecnej dyspozycji, wiedzy i zaangażowania. Najsilniejsi wchodzą od razu do elity i walczą
          z równymi sobie. Pozostali muszą udowodnić swoją wartość, pnąc się w górę od niższych lig.
        </p>
      </article>
    </SectionShell>
  );
}
