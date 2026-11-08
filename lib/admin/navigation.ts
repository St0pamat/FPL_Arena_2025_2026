import {
  Ban,
  BarChart3,
  Calculator,
  Database,
  ExternalLink,
  FlaskConical,
  Gamepad2,
  Image,
  Layers,
  LayoutDashboard,
  Megaphone,
  RefreshCw,
  ShieldAlert,
  Swords,
  Table2,
  Trophy,
  Users,
  Webhook,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Krótki opis pod etykietą (opcjonalnie) */
  hint?: string;
}

export interface AdminNavSection {
  id: string;
  label: string;
  items: AdminNavItem[];
}

/* ─────────────────────────────────────────────────
 * Projekty (najwyższy poziom menu admina)
 * ───────────────────────────────────────────────── */

export interface AdminProject {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Kolor akcentu — klasa Tailwind text-* */
  accent: string;
  /** false = coming soon (zablokowany) */
  enabled: boolean;
  sections: AdminNavSection[];
  extra: AdminNavItem[];
}

const NA_MINUSIE_SECTIONS: AdminNavSection[] = [
  {
    id: "liga",
    label: "Liga (Live)",
    items: [
      {
        href: "/admin/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        hint: "Podsumowanie",
      },
      {
        href: "/admin/struktura",
        label: "Struktura Ligi",
        icon: Layers,
        hint: "Sezony, piramidy",
      },
      {
        href: "/admin/players",
        label: "Baza Graczy i Dywizji",
        icon: Users,
        hint: "Master Import Excel",
      },
      {
        href: "/admin/content-hub",
        label: "Content Hub",
        icon: Megaphone,
        hint: "X.com + Discord Embed",
      },
      {
        href: "/admin/webhooks",
        label: "Webhooki Discord",
        icon: Webhook,
        hint: "Trwałe — Hard Reset ich nie kasuje",
      },
    ],
  },
  {
    id: "rozgrywki",
    label: "Rozgrywki (Workspace)",
    items: [
      {
        href: "/admin/workspace",
        label: "Edytor Kolejek",
        icon: Calculator,
        hint: "Brudnopis GW, Excel, publikacja",
      },
      {
        href: "/admin/season-transition",
        label: "Rozliczenie Sezonu",
        icon: Trophy,
        hint: "Kaskady, draft, nowy sezon",
      },
    ],
  },
  {
    id: "assetty",
    label: "Assety",
    items: [
      {
        href: "/admin/tier-logos",
        label: "Logotypy Dywizji",
        icon: Layers,
      },
      {
        href: "/admin/logos",
        label: "Logotypy Klubów",
        icon: Image,
        hint: "Herby",
      },
    ],
  },
  {
    id: "symulacje",
    label: "Symulacje (Sandbox)",
    items: [
      {
        href: "/admin/simulator",
        label: "Symulator Sezonu",
        icon: Swords,
        hint: "Fikcyjne GW",
      },
    ],
  },
];

const NA_MINUSIE_EXTRA: AdminNavItem[] = [
  {
    href: "/admin/settings",
    label: "Danger Zone",
    icon: ShieldAlert,
  },
];

const NO_BIG_SIX_SECTIONS: AdminNavSection[] = [
  {
    id: "sync",
    label: "Synchronizacja",
    items: [
      {
        href: "/admin/no-big-six/sync",
        label: "Sync FPL",
        icon: RefreshCw,
        hint: "Pobierz składy, kary Big Six, wyniki GW",
      },
      {
        href: "/no-big-six",
        label: "Podgląd publiczny",
        icon: ExternalLink,
        hint: "Strona ligi /no-big-six",
      },
    ],
  },
  {
    id: "assets",
    label: "Assety",
    items: [
      {
        href: "/admin/no-big-six/logos",
        label: "Herby drużyn",
        icon: Image,
        hint: "Customowe herby — nie giną po synchronizacji",
      },
    ],
  },
];

const STATS_LAB_SECTIONS: AdminNavSection[] = [
  {
    id: "studio",
    label: "Analiza",
    items: [
      {
        href: "/admin/stats-lab?tab=centre",
        label: "Stats Centre (Tabele)",
        icon: Table2,
        hint: "Tabele analityczne PL / EN",
      },
      {
        href: "/admin/stats-lab?tab=studio",
        label: "Studio Wykresów",
        icon: BarChart3,
        hint: "Porównania zawodników PL",
      },
      {
        href: "/admin/stats-lab/sync",
        label: "Baza i Synchronizacja FPL",
        icon: Database,
        hint: "Incremental ETL z FPL API",
      },
    ],
  },
];

export const ADMIN_PROJECTS: AdminProject[] = [
  {
    id: "na-minusie",
    label: "FPL Arena: The FA League",
    icon: Trophy,
    accent: "text-[#39FF14]",
    enabled: true,
    sections: NA_MINUSIE_SECTIONS,
    extra: NA_MINUSIE_EXTRA,
  },
  {
    id: "no-big-six",
    label: "FPL Arena: No Big Six",
    icon: Ban,
    accent: "text-amber-500",
    enabled: true,
    sections: NO_BIG_SIX_SECTIONS,
    extra: [],
  },
  {
    id: "stats-lab",
    label: "Stats Lab",
    icon: FlaskConical,
    accent: "text-emerald-400",
    enabled: true,
    sections: STATS_LAB_SECTIONS,
    extra: [],
  },
  {
    id: "mates",
    label: "FPL Arena: Mates",
    icon: Users,
    accent: "text-sky-400",
    enabled: false,
    sections: [],
    extra: [],
  },
  {
    id: "igrzyska",
    label: "FPL Arena: Igrzyska Kapci Kłapcia",
    icon: Gamepad2,
    accent: "text-purple-400",
    enabled: false,
    sections: [],
    extra: [],
  },
];

/* ─── Kompatybilność wsteczna ─── */

export const ADMIN_NAV_SECTIONS = NA_MINUSIE_SECTIONS;
export const ADMIN_NAV_EXTRA = NA_MINUSIE_EXTRA;

/** Płaska lista (kompatybilność) */
export const ADMIN_NAV: AdminNavItem[] = [
  ...ADMIN_NAV_SECTIONS.flatMap((s) => s.items),
  ...ADMIN_NAV_EXTRA,
];

export const ADMIN_BRAND = "FPL Arena — Panel Admina";
