import Link from "next/link";
import { ArrowRight, ExternalLink, Mail, MessageSquare } from "lucide-react";
import { SectionShell } from "@/components/na-minusie/SectionShell";
import {
  NA_MINUSIE_CONTACT,
  NA_MINUSIE_LINKS,
  NA_MINUSIE_PATHS,
} from "@/lib/na-minusie/links";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function scrollHint(id: string) {
  return (
    <a
      href={`#${id}`}
      className="inline-flex items-center gap-1.5 text-sm font-bold text-[#39FF14] transition-colors hover:text-white"
    >
      Przejdź do listy klubów
      <ArrowRight className="h-4 w-4" aria-hidden />
    </a>
  );
}

const contactChannels = [
  {
    id: "discord",
    label: "Discord ID",
    hint: "Bezpośredni kontakt",
    value: NA_MINUSIE_CONTACT.discordNick,
    href: NA_MINUSIE_LINKS.discordProfile,
    Icon: MessageSquare,
  },
  {
    id: "x",
    label: "X (Twitter)",
    hint: "Aktualności i analizy",
    value: NA_MINUSIE_CONTACT.xHandle,
    href: NA_MINUSIE_LINKS.x,
    Icon: XIcon,
  },
  {
    id: "email",
    label: "E-mail",
    hint: "Oficjalne zgłoszenia",
    value: NA_MINUSIE_CONTACT.email,
    href: NA_MINUSIE_LINKS.emailMailto,
    Icon: Mail,
  },
] as const;

export function HowToJoinSection() {
  return (
    <>
      <SectionShell id="jak-dolaczyc" className="relative overflow-hidden" tight>
        <div className="nm-cta-glow pointer-events-none absolute inset-0" aria-hidden />

        <div className="relative">
          <h2 className="max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Jak dołączyć?
          </h2>

          <ol className="mt-8 space-y-5">
            <li className="nm-card border-slate-800 bg-slate-900/80 p-6 sm:p-8 lg:p-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#39FF14] font-mono text-xl font-black text-black">
                  1
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-extrabold text-white sm:text-2xl">
                    Wybierz wolny klub
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-slate-300 sm:text-lg">
                    Sprawdź listę powyżej i przygotuj 3 propozycje swoich ulubionych zespołów z Anglii
                    (priorytet 1–3 w formularzu).
                  </p>
                  <div className="mt-4">{scrollHint("dostepne-kluby")}</div>
                </div>
              </div>
            </li>

            <li className="nm-card border-slate-800 bg-slate-900/80 p-6 sm:p-8 lg:p-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#39FF14] font-mono text-xl font-black text-black">
                  2
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-extrabold text-white sm:text-2xl">
                    Formularz Zgłoszeniowy
                  </h3>
                  <span
                    role="status"
                    aria-disabled="true"
                    className="mt-6 inline-flex w-fit max-w-full cursor-not-allowed items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 text-xs font-black uppercase tracking-wider text-slate-500 sm:px-8 sm:text-sm"
                  >
                    FORMULARZ ZAMKNIĘTY - KONIEC REKRUTACJI
                  </span>
                </div>
              </div>
            </li>

            <li className="nm-card border-slate-800 bg-slate-900/80 p-6 sm:p-8 lg:p-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#39FF14] font-mono text-xl font-black text-black">
                  3
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-extrabold text-white sm:text-2xl">
                    Opłać wpisowe i odbierz kod
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-slate-300 sm:text-lg">
                    Po zaksięgowaniu wpłaty (pamiętaj o podaniu swojego nicku z Discorda!) otrzymasz
                    kod do ligi Na Minusie ™ w wiadomości prywatnej na Discordzie lub na wskazany
                    adres e-mail.
                  </p>
                  <Link
                    href={NA_MINUSIE_LINKS.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nm-btn-primary mt-6 inline-flex w-fit max-w-full gap-2 px-6 py-3 text-xs sm:px-8 sm:text-sm"
                  >
                    Dołącz do serwera Discord
                    <ExternalLink className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </li>
          </ol>
        </div>
      </SectionShell>

      <SectionShell id="kontakt" tight>
        <div className="nm-card border-slate-800 bg-slate-900/80 p-6 sm:p-8 lg:p-10">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#39FF14]">
            Kontakt i społeczność
          </p>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Masz pytania lub problem z zapisem? Porozmawiajmy!
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Szybko pomożemy z kodem do ligi, wpłatą i sprawami technicznymi:
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {contactChannels.map(({ id, label, hint, value, href, Icon }) => (
              <a
                key={id}
                href={href}
                {...(id !== "email"
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 transition-colors hover:border-[#39FF14]/35"
              >
                <div className="flex items-center gap-2 text-[#39FF14]">
                  <Icon className="h-4 w-4" />
                  <span className="text-[11px] font-black uppercase tracking-wider">{label}</span>
                </div>
                <p className="mt-2 truncate font-mono text-sm font-bold text-white">{value}</p>
                <p className="mt-1 text-xs text-slate-500">{hint}</p>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href={NA_MINUSIE_PATHS.regulamin}
            className="inline-flex w-full max-w-2xl items-center justify-center rounded-xl border border-emerald-500 bg-emerald-500/10 px-6 py-4 text-center text-sm font-black uppercase tracking-wider text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all hover:bg-emerald-500/20 hover:text-white sm:text-base"
          >
            📖 Przeczytaj pełny Regulamin ligi Na Minusie ™
          </Link>
        </div>
      </SectionShell>
    </>
  );
}
