import { SectionShell } from "@/components/na-minusie/SectionShell";

function RuleCard({
  label,
  title,
  body,
  value,
  highlighted = false,
}: {
  label: string;
  title: string;
  body: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <article
      className={`nm-card flex h-full min-h-[22rem] flex-col border-slate-800 bg-slate-900/80 p-6 sm:min-h-[24rem] sm:p-8 lg:p-10 ${
        highlighted ? "border-[#39FF14]/20" : ""
      }`}
    >
      <p className="text-xs font-black uppercase tracking-[0.25em] text-[#39FF14]">{label}</p>
      <h3 className="mt-3 text-xl font-extrabold text-white sm:text-2xl">{title}</h3>
      <p className="mt-5 flex-1 text-base leading-relaxed text-slate-300 sm:text-lg">{body}</p>
      <p className="mt-6 font-mono text-5xl font-black text-[#39FF14] sm:text-6xl">{value}</p>
    </article>
  );
}

export function SystemSection() {
  return (
    <SectionShell id="system-mediana" tight>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#39FF14]">
        System Mediana 2+1
      </p>
      <h2 className="mt-4 text-xl font-extrabold tracking-tight text-white sm:text-2xl md:whitespace-nowrap md:text-3xl lg:text-4xl">
        Silnik naszej ligi: System &ldquo;Mediana 2+1&rdquo;
      </h2>
      <p className="mt-6 w-full text-base leading-relaxed text-slate-300 sm:text-lg">
        W klasycznym Head to Head istnieje jedna, wielka bolączka, która potrafi doprowadzić do
        szału: ślepy los. Wykręcasz genialne 85 punktów, ale Twój rywal zagrał &ldquo;mecz
        życia&rdquo; i ma 86. Przegrywasz przez pecha i zostajesz z zerowym kontem. W tym samym
        czasie inny gracz zdobywa nędzne 32 punkty, ale jego przeciwnik zaledwie 30. Wygrywa i
        dostaje 3 punkty w tabeli. To patologia, która zabija chęci do gry. Nasz system rozwiązuje
        to bezbłędnie.
      </p>

      <div className="mt-10 grid items-stretch gap-5 lg:grid-cols-2">
        <RuleCard
          label="Zasada 1"
          title="Zasada 1: Wygrana H2H = 2 pkt"
          body="Nasz system zachowuje emocje bezpośredniego pojedynku. Śledzenie punktów rywala na żywo i walka o każdy punkt FPL wciąż są kluczem do sukcesu. Zwycięstwo w cotygodniowym meczu H2H daje Ci 2 punkty do tabeli ligowej, natomiast remis gwarantuje 1 punkt dla każdego menedżera."
          value="2"
        />
        <RuleCard
          label="Zasada 2"
          title="Zasada 2: TOP 5 Dywizji = +1 pkt bonusowy"
          body="To nasza rewolucja. Bierzemy pod uwagę wyniki wszystkich 10 menedżerów w Twojej dywizji. Jeśli Twój wynik FPL znajdzie się w górnej połowie (TOP 5 danej kolejki), otrzymujesz +1 punkt bonusowy. Dostajesz go niezależnie od wyniku meczu H2H – to poduszka powietrzna chroniąca formę."
          value="+1"
          highlighted
        />
      </div>

      <div className="mt-12">
        <h3 className="text-center text-xl font-extrabold uppercase tracking-wide text-white sm:text-2xl">
          Zobacz to w praktyce
        </h3>

        <div className="mt-6 grid items-stretch gap-5 lg:grid-cols-2">
          <article className="flex h-full flex-col rounded-2xl border border-amber-500/30 bg-amber-950/20 p-6 sm:p-8 lg:p-10">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-400">
              Sytuacja A (&ldquo;Pechowa Porażka&rdquo;)
            </p>
            <p className="mt-4 font-mono text-2xl font-black text-white sm:text-3xl">85 : 86</p>
            <p className="mt-5 flex-1 text-base leading-relaxed text-slate-300 sm:text-lg">
              Wykręcasz niesamowite 85 punktów, ale Twój rywal ma 86. W klasycznym H2H Twój genialny
              wysiłek idzie do śmieci (0 pkt). U nas przegrywasz mecz (0 pkt), ale 85 oczek to
              zdecydowanie wynik powyżej mediany dywizji. Otrzymujesz na otarcie łez{" "}
              <span className="font-bold text-[#39FF14]">+1 pkt bonusowy</span>. Twoja forma została
              doceniona.
            </p>
          </article>

          <article className="flex h-full flex-col rounded-2xl border border-red-500/30 bg-red-950/15 p-6 sm:p-8 lg:p-10">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-red-400">
              Sytuacja B (&ldquo;Tania Wygrana&rdquo;)
            </p>
            <p className="mt-4 font-mono text-2xl font-black text-white sm:text-3xl">32 : 30</p>
            <p className="mt-5 flex-1 text-base leading-relaxed text-slate-300 sm:text-lg">
              Masz beznadziejny tydzień i robisz 32 punkty. Twój rywal zawalił kompletnie i ma 30
              punktów. W klasycznym H2H dostajesz pełną pulę 3 punktów, karcąc innych graczy w lidze. U
              nas wygrywasz mecz (2 pkt), ale Twój fatalny wynik ląduje poniżej mediany (0 pkt).
              Kończysz mecz ze sprawiedliwym dorobkiem 2 punktów, a nie maksem.
            </p>
          </article>
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-base leading-relaxed text-slate-300 sm:text-lg">
          To idealny system. Wciąż masz emocje ze starć H2H, ale najlepsze wyniki w kolejce są zawsze
          chronione przed niesprawiedliwością.
        </p>
      </div>
    </SectionShell>
  );
}
