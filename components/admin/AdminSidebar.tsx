"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Home } from "lucide-react";
import { ADMIN_BRAND, ADMIN_NAV } from "@/lib/admin/navigation";
import { LogoutButton } from "@/components/admin/LogoutButton";

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

      <nav className="flex-1 space-y-1 p-3" aria-label="Menu administratora">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 flex items-center gap-3 rounded-lg border border-[#39FF14]/25 bg-[#39FF14]/5 px-3 py-2.5 text-sm font-semibold text-[#39FF14] transition-colors hover:bg-[#39FF14]/10"
        >
          <Home className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span className="leading-tight">Strona startowa</span>
          <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        </a>

        {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-[#39FF14]/10 text-[#39FF14]"
                  : "text-[#aaa] hover:bg-[#161616] hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className="leading-tight">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#1a1a1a] p-3">
        <LogoutButton />
      </div>
    </aside>
  );
}
