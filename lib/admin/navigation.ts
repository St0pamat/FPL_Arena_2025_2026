import {
  Calculator,
  Image,
  Layers,
  LayoutDashboard,
  ShieldAlert,
  Swords,
  Trophy,
  Users,
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

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
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

/** Link pomocniczy poza sekcjami masterplanu */
export const ADMIN_NAV_EXTRA: AdminNavItem[] = [
  {
    href: "/admin/settings",
    label: "Danger Zone",
    icon: ShieldAlert,
  },
];

/** Płaska lista (kompatybilność) */
export const ADMIN_NAV: AdminNavItem[] = [
  ...ADMIN_NAV_SECTIONS.flatMap((s) => s.items),
  ...ADMIN_NAV_EXTRA,
];

export const ADMIN_BRAND = "Na Minusie ™ Admin";
