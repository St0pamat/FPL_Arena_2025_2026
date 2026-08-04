/** Ścieżki wewnętrzne Na Minusie ™ */
export const NA_MINUSIE_PATHS = {
  home: "/na-minusie",
  hub: "/na-minusie/hub",
  regulamin: "/na-minusie/regulamin",
  admin: "/admin/dashboard",
  adminLogin: "/admin/login",
} as const;

/** Oficjalne kanały kontaktu administratora (St0pa) */
export const NA_MINUSIE_CONTACT = {
  /** Widoczny nick Discord (z kropką) */
  discordNick: "st0pa.",
  /** Snowflake ID — otwiera profil użytkownika w Discord */
  discordUserId: "1097839268405194833",
  email: "fpl.st0pa@gmail.com",
  xHandle: "@st0pamat",
  xUrl: "https://x.com/st0pamat",
} as const;

/** Oficjalne linki rekrutacyjne Na Minusie ™ */
export const NA_MINUSIE_LINKS = {
  discord: "https://discord.gg/8SADF9pHaA",
  /** Bezpośredni profil Discord (DM / dodanie znajomego) */
  discordProfile: `https://discord.com/users/${NA_MINUSIE_CONTACT.discordUserId}`,
  form: "https://docs.google.com/forms/d/e/1FAIpQLSef8QScJGz801roGR5-wlXSikqsWE4OnT8mCCyEvmQ6W4Ok1w/viewform?usp=dialog",
  /** LIVE VIEW — zajęte kluby + przykładowe wolne (arkusz Formularza Zgłoszeniowego) */
  clubsSheet:
    "https://docs.google.com/spreadsheets/d/1lkF4mQrfc9GhZBx9HshaGY9Ex6nf6Z9DhX7jkuMtTUY/edit?usp=drive_link",
  /** Publiczny CSV LIVE VIEW (kolumna S = przykładowe dostępne kluby) */
  clubsCsv:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRoYJEMgZsGZ24uFqiJzRESeB2VotvduN8vTcwqnl9DzAPmG3TJINqELuBW09PtGDylZfHkHu-7WinH/pub?gid=1290607709&single=true&output=csv",
  /** Publiczny CSV bazy uczestników (FPL Manager / Team / Discord Club) */
  bazaCsv:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vT3fetAUT-1ZaBK47qUKOGwRDsX9G8RdHEUJVDW8a9lstOOKl3MtCLc7CI8Y3fZvg/pub?gid=1080423590&single=true&output=csv",
  emailMailto: `mailto:${NA_MINUSIE_CONTACT.email}`,
  x: NA_MINUSIE_CONTACT.xUrl,
} as const;
