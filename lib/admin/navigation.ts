import {
  Calculator,
  Image,
  Layers,
  LayoutDashboard,
  Network,
  Shuffle,
  Users,
  ShieldAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/struktura", label: "Struktura Ligi", icon: Network },
  { href: "/admin/uczestnicy", label: "Uczestnicy", icon: Users },
  { href: "/admin/logos", label: "Logotypy Klubów", icon: Image },
  { href: "/admin/tier-logos", label: "Logotypy Dywizji", icon: Layers },
  { href: "/admin/fixture-draw", label: "Maszyna Losująca", icon: Shuffle },
  { href: "/admin/gw-results", label: "Kalkulator GW", icon: Calculator },
  { href: "/admin/settings", label: "Danger Zone", icon: ShieldAlert },
];

export const ADMIN_BRAND = "Na Minusie ™ Admin";
