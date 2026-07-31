import { Mail, MessageSquare } from "lucide-react";
import { SectionShell } from "@/components/na-minusie/SectionShell";
import { NA_MINUSIE_CONTACT, NA_MINUSIE_LINKS } from "@/lib/na-minusie/links";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

const tiles = [
  {
    id: "discord",
    label: "Discord",
    description: "Główny kanał komunikacji ligi",
    value: NA_MINUSIE_CONTACT.discordNick,
    href: NA_MINUSIE_LINKS.discordProfile,
    external: true,
    icon: MessageSquare,
  },
  {
    id: "x",
    label: "X (Twitter)",
    description: "Aktualizacje i analizy",
    value: NA_MINUSIE_CONTACT.xHandle,
    href: NA_MINUSIE_LINKS.x,
    external: true,
    icon: XIcon,
  },
  {
    id: "email",
    label: "E-mail",
    description: "Oficjalne zgłoszenia i sprawy techniczne",
    value: NA_MINUSIE_CONTACT.email,
    href: NA_MINUSIE_LINKS.emailMailto,
    external: false,
    icon: Mail,
  },
] as const;

export function ContactSection() {
  return (
    <SectionShell id="kontakt" tight>
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#39FF14]">
          Kontakt i społeczność
        </p>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Masz pytania? Porozmawiajmy!
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
          Pisz bezpośrednio do St0py — szybko pomożemy z zapisem, kodem do ligi i sprawami
          technicznymi.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <a
              key={tile.id}
              href={tile.href}
              {...(tile.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="nm-card group flex flex-col items-center border-slate-800 bg-slate-900/80 p-6 text-center transition-all duration-300 hover:border-[#39FF14]/30 sm:p-8"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#39FF14]/10 text-[#39FF14] ring-1 ring-[#39FF14]/20 transition-colors group-hover:bg-[#39FF14]/15">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-extrabold text-white">{tile.label}</h3>
              <p className="mt-2 text-sm text-slate-400">{tile.description}</p>
              <p className="mt-4 break-all font-mono text-sm font-bold text-[#39FF14] sm:text-base">
                {tile.value}
              </p>
            </a>
          );
        })}
      </div>
    </SectionShell>
  );
}
