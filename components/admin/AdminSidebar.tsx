"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ExternalLink, Home, Lock, type LucideIcon } from "lucide-react";
import {
  ADMIN_BRAND,
  ADMIN_PROJECTS,
  type AdminProject,
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

function ProjectButton({
  project,
  onClick,
}: {
  project: AdminProject;
  onClick?: () => void;
}) {
  const Icon = project.icon;
  const disabled = !project.enabled;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-bold transition-colors ${
        disabled
          ? "cursor-not-allowed border-[#1a1a1a] bg-[#0d0d0d] text-[#444]"
          : "border-[#222] bg-[#111] text-white hover:border-[#333] hover:bg-[#161616]"
      }`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${disabled ? "text-[#333]" : project.accent}`} strokeWidth={1.75} />
      <span className="flex-1 leading-tight">{project.label}</span>
      {disabled && <Lock className="h-3.5 w-3.5 shrink-0 text-[#333]" />}
    </button>
  );
}

export function AdminSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [activeProject, setActiveProject] = useState<AdminProject | null>(null);

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

      <nav className="flex-1 space-y-4 overflow-y-auto p-3" aria-label="Menu administratora">
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

        {activeProject ? (
          <>
            <button
              type="button"
              onClick={() => setActiveProject(null)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#666] transition-colors hover:text-white"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Wybierz projekt
            </button>

            <div className="rounded-xl border border-[#222] bg-[#111] px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <activeProject.icon
                  className={`h-4 w-4 shrink-0 ${activeProject.accent}`}
                  strokeWidth={1.75}
                />
                <span className="text-xs font-bold text-white">{activeProject.label}</span>
              </div>
            </div>

            {activeProject.sections.map((section) => (
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

            {activeProject.extra.length > 0 && (
              <div className="border-t border-[#1a1a1a] pt-3">
                <div className="space-y-0.5">
                  {activeProject.extra.map(({ href, label, icon }) => {
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
            )}
          </>
        ) : (
          <div className="space-y-2">
            <p className="px-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#444]">
              Projekty
            </p>
            {ADMIN_PROJECTS.map((project) => (
              <ProjectButton
                key={project.id}
                project={project}
                onClick={project.enabled ? () => setActiveProject(project) : undefined}
              />
            ))}
          </div>
        )}
      </nav>

      <div className="border-t border-[#1a1a1a] p-3">
        <LogoutButton />
      </div>
    </aside>
  );
}
