"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Home, type LucideIcon } from "lucide-react";
import {
  ADMIN_BRAND,
  ADMIN_NAV_EXTRA,
  ADMIN_NAV_SECTIONS,
} from "@/lib/admin/navigation";
import { LogoutButton } from "@/components/admin/LogoutButton";

function NavLink({
  href,
  label,
  hint,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
        active
          ? "bg-[#39FF14]/10 text-[#39FF14]"
          : "text-[#aaa] hover:bg-[#161616] hover:text-white"
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
      <span className="min-w-0 leading-tight">
        <span className="block">{label}</span>
        {hint ? (
          <span
            className={`mt-0.5 block text-[10px] font-medium normal-case tracking-normal ${
              active ? "text-[#39FF14]/70" : "text-[#555]"
            }`}
          >
            {hint}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function AdminSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-[#1a1a1a] bg-[#0a0a0a]">
      <div className="border-b border-[#1a1a1a] px-5 py-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#39FF14]">Panel</p>
        <p className="mt-1 text-sm font-bold text-white">{ADMIN_BRAND}</p>
        {userEmail && (
          <p className="mt-2 truncate text-xs text-[#666]" title={userEmail}>
            {userEmail}
          </p>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto p-3" aria-label="Menu administratora">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg border border-[#39FF14]/25 bg-[#39FF14]/5 px-3 py-2.5 text-sm font-semibold text-[#39FF14] transition-colors hover:bg-[#39FF14]/10"
        >
          <Home className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span className="leading-tight">Strona startowa</span>
          <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        </a>

        {ADMIN_NAV_SECTIONS.map((section) => (
          <div key={section.id}>
            <p className="mb-1.5 px-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#444]">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, hint, icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <NavLink
                    key={href}
                    href={href}
                    label={label}
                    hint={hint}
                    icon={icon}
                    active={active}
                  />
                );
              })}
            </div>
          </div>
        ))}

        <div className="border-t border-[#1a1a1a] pt-3">
          <div className="space-y-0.5">
            {ADMIN_NAV_EXTRA.map(({ href, label, icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <NavLink
                  key={href}
                  href={href}
                  label={label}
                  icon={icon}
                  active={active}
                />
              );
            })}
          </div>
        </div>
      </nav>

      <div className="border-t border-[#1a1a1a] p-3">
        <LogoutButton />
      </div>
    </aside>
  );
}
