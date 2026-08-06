import Link from "next/link";
import { Archive, ClipboardList, ExternalLink, Mail, MessageSquare } from "lucide-react";
import {
  NA_MINUSIE_CONTACT,
  NA_MINUSIE_LINKS,
  NA_MINUSIE_PATHS,
} from "@/lib/na-minusie/links";
import { NA_MINUSIE_BRAND } from "@/lib/na-minusie/branding";
import { NM_CONTAINER } from "@/lib/na-minusie/theme";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

const navLinks = [
  { label: "O lidze", href: NA_MINUSIE_PATHS.home },
  { label: "Dywizje", href: NA_MINUSIE_PATHS.dywizje },
  { label: "Strefa Gracza", href: NA_MINUSIE_PATHS.strefaGracza },
  { label: "Dostępne Kluby", href: `${NA_MINUSIE_PATHS.home}#dostepne-kluby` },
  { label: "Jak dołączyć", href: `${NA_MINUSIE_PATHS.home}#jak-dolaczyc` },
  { label: "Pełny Regulamin", href: NA_MINUSIE_PATHS.regulamin },
] as const;

const contactItems = [
  {
    id: "discord",
    label: "Discord",
    value: NA_MINUSIE_CONTACT.discordNick,
    hint: "Główny koordynator",
    href: NA_MINUSIE_LINKS.discordProfile,
    external: true,
    Icon: MessageSquare,
  },
  {
    id: "x",
    label: "X (Twitter)",
    value: NA_MINUSIE_CONTACT.xHandle,
    hint: null,
    href: NA_MINUSIE_LINKS.x,
    external: true,
    Icon: XIcon,
  },
  {
    id: "email",
    label: "E-mail",
    value: NA_MINUSIE_CONTACT.email,
    hint: null,
    href: NA_MINUSIE_LINKS.emailMailto,
    external: false,
    Icon: Mail,
  },
] as const;

const linkClass =
  "inline-flex items-center gap-2 text-sm text-slate-400 transition-colors duration-200 hover:text-emerald-400";

const headingClass =
  "mb-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-800 bg-[#0B0F19] text-slate-300">
      <div className={`${NM_CONTAINER} py-10 md:py-12`}>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Kolumna 1 — Brand */}
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <p className="font-athletic text-xl font-bold uppercase tracking-wide text-emerald-400 sm:text-2xl">
              NA MINUSIE <span className="text-emerald-400/90">™</span>
            </p>
            <p className="text-sm leading-relaxed text-slate-400">
              Nowy wymiar rozgrywek Head to Head w Fantasy Premier League. Autorski system Mediana
              2+1, zamknięte 10-osobowe dywizje i sprawiedliwa rywalizacja bez pechowych terminarzy.
            </p>
            <p className="text-sm font-medium leading-relaxed text-slate-300">
              Projekt społecznościowy stworzony z pasji do FPL.
            </p>
          </div>

          {/* Kolumna 2 — Nawigacja */}
          <div>
            <h3 className={headingClass}>Nawigacja</h3>
            <nav aria-label="Stopka — nawigacja">
              <ul className="space-y-2.5">
                {navLinks.map(({ label, href }) => (
                  <li key={href}>
                    <Link href={href} className={linkClass}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Kolumna 3 — Kontakt */}
          <div>
            <h3 className={headingClass}>Kontakt &amp; Społeczność</h3>
            <ul className="space-y-3.5">
              {contactItems.map(({ id, label, value, hint, href, external, Icon }) => (
                <li key={id}>
                  <a
                    href={href}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="group flex items-start gap-3"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/60 text-emerald-400 transition-colors group-hover:border-emerald-500/40">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {label}
                      </span>
                      <span className="mt-0.5 block truncate text-sm font-semibold text-slate-200 transition-colors group-hover:text-emerald-400">
                        {value}
                      </span>
                      {hint ? (
                        <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
                      ) : null}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Kolumna 4 — Odnośniki */}
          <div>
            <h3 className={headingClass}>Odnośniki</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href={NA_MINUSIE_LINKS.form}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  <ClipboardList className="h-4 w-4 shrink-0 text-emerald-400/80" aria-hidden />
                  Formularz Zgłoszeniowy
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-50" aria-hidden />
                </a>
              </li>
              <li>
                <Link href="/arena" className={linkClass}>
                  <Archive className="h-4 w-4 shrink-0 text-fuchsia-400/70" aria-hidden />
                  <span>Archiwum FPL Arena</span>
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Sezon 25/26
                  </span>
                </Link>
              </li>
              <li>
                <a
                  href="https://fantasy.premierleague.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  <ExternalLink className="h-4 w-4 shrink-0 text-emerald-400/80" aria-hidden />
                  Oficjalna strona FPL
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-slate-800/80 pt-6 text-center text-xs text-slate-500 md:flex-row md:text-left">
          <p>© 2026 {NA_MINUSIE_BRAND}. Wszystkie prawa zastrzeżone.</p>
          <p className="text-slate-500">
            Architektura &amp; Organizacja:{" "}
            <span className="font-semibold text-slate-400">St0pa</span>
            {" | "}
            Społeczność:{" "}
            <span className="font-semibold text-slate-400">Baldwiniasty</span>
          </p>
        </div>
        <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-600 md:text-left">
          Fantasy Premier League oraz FPL są zastrzeżonymi znakami towarowymi Premier League / FA.
          Strona jest niezależnym projektem fanowskim.
        </p>
      </div>
    </footer>
  );
}
