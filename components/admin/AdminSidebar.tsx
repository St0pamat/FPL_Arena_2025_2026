"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ExternalLink, Home, Lock, Menu, X, type LucideIcon } from "lucide-react";
import {
  ADMIN_BRAND,
  ADMIN_PROJECTS,
  type AdminProject,
} from "@/lib/admin/navigation";
import { LogoutButton } from "@/components/admin/LogoutButton";

const STATS_LAB_EN: Record<string, { label: string; hint?: string }> = {
  "/admin/stats-lab?tab=centre": {
    label: "Stats Centre (Tables)",
    hint: "Stats tables",
  },
  "/admin/stats-lab?tab=studio": {
    label: "Chart Studio",
    hint: "Player comparisons",
  },
  "/admin/stats-lab/sync": {
    label: "FPL Data & Sync",
  },
};

function useStatsLabMenuPrefs(): { lang: "pl" | "en"; themeId: string } {
  const [lang, setLang] = useState<"pl" | "en">("pl");
  const [themeId, setThemeId] = useState("ARENA_DARK");
  useEffect(() => {
    const read = () => {
      try {
        const value = window.localStorage.getItem("fpl-arena-stats-lab-lang");
        const theme = window.localStorage.getItem("fpl-arena-stats-lab-theme");
        setLang(value === "en" ? "en" : "pl");
        setThemeId(theme || "ARENA_DARK");
      } catch {
        setLang("pl");
      }
    };
    read();
    const onSync = (event: Event) => {
      const detail = (event as CustomEvent<{ lang?: string; themeId?: string }>).detail;
      if (detail?.lang === "en" || detail?.lang === "pl") setLang(detail.lang);
      if (detail?.themeId) setThemeId(detail.themeId);
      if (!detail?.lang && !detail?.themeId) read();
    };
    window.addEventListener("fpl-stats-lab-theme-sync", onSync);
    return () => window.removeEventListener("fpl-stats-lab-theme-sync", onSync);
  }, []);
  return { lang, themeId };
}

function NavLink({
  href,
  label,
  hint,
  icon: Icon,
  active,
  external = false,
  onNavigate,
}: {
  href: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  active: boolean;
  external?: boolean;
  onNavigate?: () => void;
}) {
  const className = `flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
    active
      ? "bg-[#39FF14]/10 text-[#39FF14]"
      : "text-[#aaa] hover:bg-[#161616] hover:text-white"
  }`;

  const content = (
    <>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
      <span className="min-w-0 flex-1 leading-tight">
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
      {external ? (
        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
      ) : null}
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onNavigate}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={onNavigate}>
      {content}
    </Link>
  );
}

function findProjectForAdminPath(pathname: string): AdminProject | null {
  if (pathname.startsWith("/admin/no-big-six")) {
    return ADMIN_PROJECTS.find((p) => p.id === "no-big-six") ?? null;
  }
  if (pathname.startsWith("/admin/stats-lab")) {
    return ADMIN_PROJECTS.find((p) => p.id === "stats-lab") ?? null;
  }
  return null;
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

const SIDEBAR_ID = "admin-sidebar-panel";

export function AdminSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const { lang: menuLang, themeId: menuTheme } = useStatsLabMenuPrefs();
  const lightNav =
    pathname.startsWith("/admin/stats-lab") && menuTheme === "ANALYST_LIGHT";
  const [activeProject, setActiveProject] = useState<AdminProject | null>(null);
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const detected = findProjectForAdminPath(pathname);
    if (detected) setActiveProject(detected);
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const node = panelRef.current;
    if (!node) return;
    if (isMobile && !open) node.setAttribute("inert", "");
    else node.removeAttribute("inert");
  }, [isMobile, open]);

  useEffect(() => {
    if (!open) return;
    const node = panelRef.current;
    const focusable = node?.querySelector<HTMLElement>("a, button");
    (focusable ?? node)?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <>
      <div className="sticky top-0 z-50 flex h-12 shrink-0 items-center border-b border-[#1a1a1a] bg-[#0a0a0a] px-2 md:hidden">
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-white"
          aria-expanded={open}
          aria-controls={SIDEBAR_ID}
          aria-label={open ? "Zamknij menu" : "Otwórz menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open ? (
        <button
          type="button"
          className="fixed inset-x-0 bottom-0 top-12 z-30 bg-black/60 md:hidden"
          aria-label="Zamknij menu"
          onClick={closeMenu}
        />
      ) : null}
      <aside
        ref={panelRef}
        id={SIDEBAR_ID}
        tabIndex={-1}
        aria-hidden={isMobile && !open ? true : undefined}
        className={`flex w-64 shrink-0 flex-col border-r max-md:fixed max-md:bottom-0 max-md:left-0 max-md:top-12 max-md:z-40 md:static ${
          lightNav
            ? "border-slate-300 bg-slate-50 text-slate-900 shadow-md"
            : "border-[#1a1a1a] bg-[#0a0a0a]"
        } ${
          open
            ? "max-md:translate-x-0"
            : "max-md:-translate-x-full max-md:pointer-events-none"
        }`}
      >
      {lightNav ? (
        <style>{`#admin-sidebar-panel a, #admin-sidebar-panel button, #admin-sidebar-panel p, #admin-sidebar-panel span { color: #0f172a; }`}</style>
      ) : null}
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
          onClick={closeMenu}
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
                    const translated =
                      menuLang === "en" ? STATS_LAB_EN[href] : undefined;
                    const shownLabel = translated?.label ?? label;
                    const shownHint = translated ? translated.hint : hint;
                    const active =
                      !href.startsWith("/no-big-six") &&
                      (pathname === href || pathname.startsWith(`${href}/`));
                    const external = !href.startsWith("/admin");
                    return (
                      <NavLink
                        key={href}
                        href={href}
                        label={shownLabel}
                        hint={shownHint}
                        icon={icon}
                        active={active}
                        external={external}
                        onNavigate={closeMenu}
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
                        onNavigate={closeMenu}
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
    </>
  );
}
