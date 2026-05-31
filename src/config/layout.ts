import type { AppTab } from "./tabs";

/** Szerokość głównego kontenera per zakładka */
export const CONTAINER_BY_TAB: Record<AppTab, "default" | "wide" | "full"> = {
  home: "full",
  sezon: "full",
  profiles: "full",
  statystyki: "full",
  udostepnij: "full",
  media: "full",
};

export const CONTAINER_CLASS: Record<"default" | "wide" | "full", string> = {
  default: "max-w-app",
  wide: "max-w-app-wide",
  full: "max-w-app-full",
};
