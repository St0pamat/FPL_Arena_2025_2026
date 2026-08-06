/** Główne menu aplikacji (Header) */
export const NA_MINUSIE_MAIN_NAV = [
  { id: "o-lidze", label: "O lidze", href: "/na-minusie" },
  { id: "dywizje", label: "Dywizje", href: "/na-minusie/dywizje" },
  { id: "strefa-gracza", label: "Strefa Gracza", href: "/strefa-gracza" },
] as const;

/**
 * Sticky scroll-spy na stronie reklamowej `/na-minusie`.
 * To nie są pozycje głównego menu — tylko pod-nawigacja landingu.
 */
export const NA_MINUSIE_SECTION_NAV = [
  { id: "dlaczego-warto", label: "Dlaczego warto?", href: "#dlaczego-warto" },
  { id: "system-mediana", label: "System Mediana 2+1", href: "#system-mediana" },
  { id: "piramida", label: "Piramida Ligowa", href: "#piramida" },
  { id: "aktualni-uczestnicy", label: "Aktualni Uczestnicy", href: "#aktualni-uczestnicy" },
  { id: "dostepne-kluby", label: "Dostępne Kluby", href: "#dostepne-kluby" },
  { id: "jak-dolaczyc", label: "Jak dołączyć?", href: "#jak-dolaczyc" },
  { id: "kontakt", label: "Kontakt", href: "#kontakt" },
] as const;

export const NA_MINUSIE_SECTION_IDS = NA_MINUSIE_SECTION_NAV.map((item) => item.id);

/** @deprecated — używaj NA_MINUSIE_SECTION_NAV / NA_MINUSIE_MAIN_NAV */
export const NA_MINUSIE_NAV = NA_MINUSIE_SECTION_NAV;

export type NaMinusieNavId = (typeof NA_MINUSIE_SECTION_NAV)[number]["id"];
export type NaMinusieMainNavId = (typeof NA_MINUSIE_MAIN_NAV)[number]["id"];
