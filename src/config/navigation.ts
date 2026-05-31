/** Główne zakładki aplikacji (po usunięciu „Centrum”) */
export type AppTab = "home" | "sezon" | "profiles" | "statystyki" | "udostepnij" | "media";

export type HubSection = {
  id: string;
  title: string;
  icon: string;
  description: string;
};

export type NavItem = {
  id: AppTab;
  label: string;
  icon: string;
};

export type NavGroup = {
  /** Etykieta grupy w stopce / stronie startowej (opcjonalna) */
  label?: string;
  items: NavItem[];
};

/** Menu główne — logiczne grupy zamiast płaskiej listy 9 pozycji */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ id: "home", label: "Start", icon: "🏠" }],
  },
  {
    label: "Liga",
    items: [{ id: "sezon", label: "Sezon", icon: "📊" }],
  },
  {
    label: "Społeczność",
    items: [
      { id: "profiles", label: "Gladiatorzy", icon: "⚔️" },
      { id: "statystyki", label: "Statystyki", icon: "📈" },
    ],
  },
  {
    label: "Narzędzia",
    items: [
      { id: "udostepnij", label: "Udostępnij", icon: "📤" },
      { id: "media", label: "Media", icon: "🎬" },
    ],
  },
];

export const APP_TABS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export const HUB_CONFIG: Record<
  Exclude<AppTab, "home" | "profiles">,
  { title: string; lead: string; sections: HubSection[] }
> = {
  sezon: {
    title: "Sezon 2025/26",
    lead: "Prognoza przed sezonem, tabela H2H, wyniki kolejek i oś czasu — pełny obraz rozgrywek.",
    sections: [
      {
        id: "prognoza",
        title: "Prognoza",
        icon: "🔮",
        description: "Typy przed GW1 vs rzeczywista tabela po 38 kolejkach.",
      },
      {
        id: "standings",
        title: "Tabela",
        icon: "📊",
        description: "Klasyfikacja ligowa po każdej kolejce i tabela końcowa.",
      },
      {
        id: "wyniki",
        title: "Wyniki H2H",
        icon: "📋",
        description: "Mecze head-to-head, punkty FPL i wynik ligowy w każdej kolejce.",
      },
      {
        id: "timeline",
        title: "Oś czasu",
        icon: "📅",
        description: "38 kolejek: lider tabeli, król punktów, hity i chipy.",
      },
    ],
  },
  statystyki: {
    title: "Statystyki i rekordy",
    lead: "Topki sezonu, Panteon Areny, porównywarka H2H i zestawienie z globalną elitą FPL.",
    sections: [
      {
        id: "topki",
        title: "Topki sezonu",
        icon: "🏅",
        description: "Rankingi H2H, formy, transferów i innych kategorii.",
      },
      {
        id: "hall",
        title: "Panteon Areny",
        icon: "📖",
        description: "Flagowe osiągnięcia i encyklopedia rekordów sezonu.",
      },
      {
        id: "porownaj",
        title: "Porównywarka H2H",
        icon: "⚔️",
        description: "Dwa kluby obok siebie: bilans meczów i punkty FPL.",
      },
      {
        id: "elita",
        title: "Elita vs reszta",
        icon: "🌍",
        description: "Kto grał lepiej niż globalne Top 10k FPL.",
      },
    ],
  },
  udostepnij: {
    title: "Udostępnij",
    lead: "Generatory grafik do Discorda i story — pobierz gotowe PNG.",
    sections: [
      {
        id: "karty",
        title: "Karty na Discord",
        icon: "🃏",
        description: "Kwadratowe karty z wynikiem, cytatem i rekordem (1080×1080).",
      },
      {
        id: "poster",
        title: "Sezon w liczbach",
        icon: "📱",
        description: "Pionowy plakat story z podsumowaniem menedżera (1080×1920).",
      },
    ],
  },
  media: {
    title: "Media",
    lead: "Prezentacje wideo, soundtrack zapowiedzi Gladiatorów oraz logotypy ligi i klubów do pobrania.",
    sections: [
      {
        id: "prezentacje",
        title: "Prezentacje",
        icon: "🎬",
        description: "Filmy podsumowujące sezon od menedżerów.",
      },
      {
        id: "soundtrack",
        title: "Soundtrack",
        icon: "🎵",
        description: "Playlista SoundCloud oraz pobieranie utworów WAV (pojedynczo lub wszystkie naraz).",
      },
      {
        id: "logotypy",
        title: "Logotypy",
        icon: "🖼️",
        description: "Logo FPL Arena i herby klubów — post, story i avatar.",
      },
    ],
  },
};
