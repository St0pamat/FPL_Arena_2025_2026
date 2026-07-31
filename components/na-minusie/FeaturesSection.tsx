import Link from "next/link";
import { CalendarRange, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionShell } from "@/components/na-minusie/SectionShell";
import { NA_MINUSIE_LINKS } from "@/lib/na-minusie/links";

function FeatureCard({
  icon: Icon,
  title,
  paragraphs,
  footer,
}: {
  icon: LucideIcon;
  title: string;
  paragraphs: string[];
  footer?: React.ReactNode;
}) {
  return (
    <article className="nm-card flex h-full flex-col border-slate-800 bg-slate-900/80 p-6 sm:p-8 lg:p-10">
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#39FF14]/10 ring-1 ring-[#39FF14]/20">
        <Icon className="h-6 w-6 text-[#39FF14]" strokeWidth={1.75} aria-hidden />
      </div>
      <h3 className="text-xl font-extrabold leading-snug tracking-tight text-white sm:text-2xl">
        {title}
      </h3>
      <div className="mt-5 flex-1 space-y-4 text-base leading-relaxed text-slate-300 sm:text-lg">
        {paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 48)}>{paragraph}</p>
        ))}
      </div>
      {footer ? <div className="mt-6">{footer}</div> : null}
    </article>
  );
}

export function FeaturesSection() {
  return (
    <SectionShell id="dlaczego-warto" tight>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#39FF14]">Dlaczego warto?</p>
      <h2 className="mt-4 text-xl font-extrabold tracking-tight text-white sm:text-2xl md:whitespace-nowrap md:text-3xl lg:text-4xl">
        Dwa Sezony w Jednym Roku: Sezon 1 i Sezon 2
      </h2>

      <article className="nm-card mt-8 border-slate-800 bg-slate-900/80 p-6 sm:p-8 lg:p-10">
        <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#39FF14]/10 ring-1 ring-[#39FF14]/20">
          <CalendarRange className="h-6 w-6 text-[#39FF14]" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="space-y-4 text-base leading-relaxed text-slate-300 sm:text-lg">
          <p>
            Standardowy sezon FPL to 38 kolejek – wyczerpujący maraton, w którym słabszy początek
            potrafi odebrać chęci do gry na całe miesiące. My to zmieniamy. Dzielimy rok na dwa
            niezależne, krótkie sezony: <strong className="text-white">Sezon 1</strong> (Kolejki
            1–19) oraz <strong className="text-white">Sezon 2</strong> (Kolejki 20–38).
          </p>
          <p>
            W każdej rundzie rozgrywasz 18 spotkań wewnątrz swojej 10-osobowej dywizji (mecz i rewanż
            – każdy z każdym). Zawaliłeś pierwszy sezon? Od stycznia tabela się zeruje! Otwieramy
            czystą kartę, a Ty zaczynasz walkę o awans, puchary i mistrzostwo od nowa. Ten format
            całkowicie odmienia strategię wykorzystywania chipów.
          </p>
        </div>
      </article>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 md:items-stretch">
        <FeatureCard
          icon={Trophy}
          title="Fizyczne Nagrody Dla Zwycięzców"
          paragraphs={[
            "Całość puli ze składek przeznaczamy na ufundowanie pucharów lub statuetek dla mistrzów poszczególnych dywizji. Wysyłamy je bezpośrednio do Paczkomatu. Graj nie tylko o awans, ale o namacalny dowód Twoich menedżerskich umiejętności, który stanie na Twoim biurku.",
          ]}
        />
        <FeatureCard
          icon={Users}
          title="Aktywna i Przyjazna Społeczność"
          paragraphs={[
            "Na Minusie ™ to nie tylko tabele – to żywy serwer Discord, na którym znajdziesz wielu doświadczonych graczy. To idealne miejsce do wspólnego śledzenia wyników live, dyskusji i wymiany tipów przed każdą kolejką.",
          ]}
          footer={
            <Link
              href={NA_MINUSIE_LINKS.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="nm-btn-primary w-full"
            >
              Dołącz do Discorda Na Minusie 💬
            </Link>
          }
        />
      </div>
    </SectionShell>
  );
}
