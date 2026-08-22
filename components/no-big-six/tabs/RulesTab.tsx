import { Ban, BarChart3, Lightbulb, ShieldAlert } from "lucide-react";

const BIG_SIX_CLUBS = [
  "Arsenal",
  "Chelsea",
  "Liverpool",
  "Manchester City",
  "Manchester United",
  "Tottenham Hotspur",
] as const;

type RuleTile = {
  icon: typeof Ban;
  title: string;
  titleAccent?: boolean;
  warning?: boolean;
  body: React.ReactNode;
  tip?: string;
};

const RULE_TILES: RuleTile[] = [
  {
    icon: Ban,
    title: "1️⃣ Zero punktów z Big Six",
    titleAccent: true,
    body: (
      <>
        <p className="leading-relaxed text-slate-300">
          Zawodnicy z poniższych klubów u nas po prostu nie punktują:
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-slate-300 marker:text-amber-500/70">
          {BIG_SIX_CLUBS.map((club) => (
            <li key={club}>{club}</li>
          ))}
        </ul>
      </>
    ),
  },
  {
    icon: BarChart3,
    title: "2️⃣ Jak liczymy wyniki",
    body: (
      <p className="leading-relaxed text-slate-300">
        Tabela w oficjalnej aplikacji FPL to nasz główny wyznacznik. JEDNAK, jeśli
        jakiemuś menedżerowi przez przypadek wpadną punkty za gracza z Big Six,
        zostaną one odjęte. W takiej sytuacji oficjalne, skorygowane wyniki lądują
        w dedykowanym arkuszu Excel (a docelowo wszystko przeniesiemy na naszą stronę
        WWW). 📊
      </p>
    ),
  },
  {
    icon: Lightbulb,
    title: "3️⃣ Kary i przypadkowe auto-suby",
    body: (
      <p className="leading-relaxed text-slate-300">
        Twój zawodnik nagle zmienił klub na Big Six? Nie ma sprawy, nie grozi za to
        ban! Skąd system wie, że gracz wszedł przypadkiem? API FPL zwraca w każdej
        kolejce tablicę wprowadzonych rezerwowych. Nasz skrypt po prostu sprawdza, czy
        dany gracz wszedł z automatycznej zmiany. Jeśli tak – tylko odejmujemy punkty.
      </p>
    ),
    tip: "💡 Dobra rada: Wrzuć go na sam koniec ławki rezerwowych, żeby nie wszedł z auto-suba (wtedy unikniesz ujemnych punktów) i sprzedaj go przy najbliższym darmowym transferze.",
  },
  {
    icon: ShieldAlert,
    title: "4️⃣ Tylko dla grających fair",
    warning: true,
    body: (
      <>
        <p className="leading-relaxed text-slate-300">
          Z ligi wyrzucamy{" "}
          <span className="font-bold text-rose-500">JEDYNIE</span> w przypadku ewidentnego
          trollowania i psucia zabawy. System jest szczelny i bezbłędnie flaguje
          menedżera statusem{" "}
          <span className="font-bold text-rose-500">&quot;DO ZBANOWANIA&quot;</span> w
          sytuacjach takich jak:
        </p>
        <ul className="mt-3 list-disc space-y-2.5 pl-5 text-sm leading-relaxed text-slate-300 marker:text-rose-500/70">
          <li>
            <span className="font-bold text-slate-200">Podstawowa 11:</span> Celowe
            kupowanie i wystawianie gwiazd Big Six w pierwszym składzie z premedytacją.
          </li>
          <li>
            <span className="font-bold text-slate-200">Bench Boost:</span> Używasz chipu,
            żeby zapunktować graczem Big Six z ławki? FPL nie traktuje tego jako auto-sub,
            więc wyłapiemy to jako celowe zagranie.
          </li>
          <li>
            <span className="font-bold text-slate-200">Wicekapitan:</span> Kapitan nie gra,
            a punkty dostaje wicekapitan z Big Six? To celowe zagranie, bo sam go tam
            ustawiłeś.
          </li>
        </ul>
      </>
    ),
  },
];

export function RulesTab() {
  return (
    <div className="space-y-8">
      <section className="space-y-5">
        <h2 className="font-athletic text-2xl font-bold tracking-wide text-amber-500 sm:text-3xl">
          Zasady ligi
        </h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
          <p className="max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Witaj w lidze FPL Arena: No Big Six! 🚨 Szukasz odskoczni od klasycznych
            składów? Chcesz się po prostu dobrze bawić i poczuć frajdę z odkrywania
            niszowych perełek? To miejsce dla Ciebie! 🍻
          </p>
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-500/80">
            Zasady gry
          </h3>
          <p className="mt-1 text-sm text-slate-500">Krótko i bez wątpliwości.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {RULE_TILES.map((rule) => {
            const Icon = rule.icon;
            return (
              <article
                key={rule.title}
                className={`rounded-xl border bg-slate-900/50 p-6 ${
                  rule.warning ? "border-rose-900/40" : "border-slate-800"
                }`}
              >
                <div className="mb-4 flex items-start gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                      rule.warning
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-500"
                    }`}
                    aria-hidden
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <h4
                    className={`font-bold leading-snug ${
                      rule.titleAccent ? "text-amber-500" : "text-white"
                    }`}
                  >
                    {rule.title}
                  </h4>
                </div>

                <div>{rule.body}</div>

                {rule.tip ? (
                  <p className="mt-4 rounded-lg border-l-4 border-amber-500 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100">
                    {rule.tip}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
