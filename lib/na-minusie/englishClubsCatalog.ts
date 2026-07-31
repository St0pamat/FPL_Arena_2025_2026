import { slugifyClubName } from "@/lib/admin/clubLogos";

export type EnglishLeague =
  | "Premier League"
  | "Championship"
  | "League One"
  | "League Two"
  | "Inne";

export interface CatalogClub {
  name: string;
  league: EnglishLeague;
  /** Alternatywne nazwy z arkusza / Discorda */
  aliases?: string[];
}

/**
 * Katalog klubów do wyboru w Na Minusie ™ (poziomy EFL + Premier League).
 * Pozycje w ligach ≈ sezon 2025/26 + kluby pojawiające się w arkuszu LIVE VIEW.
 */
export const ENGLISH_CLUBS_CATALOG: CatalogClub[] = [
  // Premier League
  { name: "Arsenal", league: "Premier League" },
  { name: "Aston Villa", league: "Premier League" },
  { name: "AFC Bournemouth", league: "Premier League", aliases: ["Bournemouth"] },
  { name: "Brentford", league: "Premier League" },
  { name: "Brighton & Hove Albion", league: "Premier League", aliases: ["Brighton & Hove Albion F.C.", "Brighton"] },
  { name: "Chelsea", league: "Premier League", aliases: ["Chelsea F.C."] },
  { name: "Crystal Palace", league: "Premier League", aliases: ["Crystal Palace F.C."] },
  { name: "Everton", league: "Premier League", aliases: ["Everton F.C."] },
  { name: "Fulham", league: "Premier League" },
  { name: "Ipswich Town", league: "Premier League", aliases: ["Ipswich Town F.C.", "Ipswich"] },
  { name: "Liverpool", league: "Premier League" },
  { name: "Manchester City", league: "Premier League" },
  { name: "Manchester United", league: "Premier League" },
  { name: "Newcastle United", league: "Premier League", aliases: ["Newcastle United F.C.", "Newcastle"] },
  { name: "Nottingham Forest", league: "Premier League", aliases: ["Nottingham Forest F.C."] },
  { name: "Southampton", league: "Premier League" },
  { name: "Sunderland", league: "Premier League", aliases: ["Sunderland A.F.C."] },
  { name: "Tottenham Hotspur", league: "Premier League", aliases: ["Tottenham", "Spurs"] },
  { name: "West Ham United", league: "Premier League", aliases: ["West Ham"] },
  { name: "Wolverhampton Wanderers", league: "Premier League", aliases: ["Wolves", "Wolverhampton"] },

  // Championship
  { name: "Birmingham City", league: "Championship" },
  { name: "Blackburn Rovers", league: "Championship" },
  { name: "Bristol City", league: "Championship" },
  { name: "Burnley", league: "Championship" },
  { name: "Cardiff City", league: "Championship" },
  { name: "Charlton Athletic", league: "Championship" },
  { name: "Coventry City", league: "Championship" },
  { name: "Derby County", league: "Championship" },
  { name: "Hull City", league: "Championship", aliases: ["Hull City A.F.C.", "Hull"] },
  { name: "Leeds United", league: "Championship", aliases: ["Leeds", "Leeds Utd"] },
  { name: "Leicester City", league: "Championship" },
  { name: "Middlesbrough", league: "Championship" },
  { name: "Millwall", league: "Championship" },
  { name: "Norwich City", league: "Championship" },
  { name: "Portsmouth", league: "Championship" },
  { name: "Preston North End", league: "Championship" },
  { name: "Queens Park Rangers", league: "Championship", aliases: ["QPR"] },
  { name: "Sheffield United", league: "Championship" },
  { name: "Sheffield Wednesday", league: "Championship" },
  { name: "Stoke City", league: "Championship" },
  { name: "Swansea City", league: "Championship" },
  { name: "Watford", league: "Championship" },
  { name: "West Bromwich Albion", league: "Championship", aliases: ["West Brom"] },
  { name: "Wrexham", league: "Championship" },

  // League One
  { name: "AFC Wimbledon", league: "League One" },
  { name: "Barnsley", league: "League One" },
  { name: "Blackpool", league: "League One" },
  { name: "Bolton Wanderers", league: "League One" },
  { name: "Bradford City", league: "League One" },
  { name: "Burton Albion", league: "League One" },
  { name: "Cambridge United", league: "League One" },
  { name: "Doncaster Rovers", league: "League One" },
  { name: "Exeter City", league: "League One" },
  { name: "Huddersfield Town", league: "League One" },
  { name: "Leyton Orient", league: "League One" },
  { name: "Lincoln City", league: "League One" },
  { name: "Luton Town", league: "League One" },
  { name: "Mansfield Town", league: "League One" },
  { name: "Northampton Town", league: "League One" },
  { name: "Oxford United", league: "League One" },
  { name: "Peterborough United", league: "League One" },
  { name: "Plymouth Argyle", league: "League One" },
  { name: "Port Vale", league: "League One" },
  { name: "Reading", league: "League One" },
  { name: "Rotherham United", league: "League One" },
  { name: "Stevenage", league: "League One" },
  { name: "Stockport County", league: "League One" },
  { name: "Wigan Athletic", league: "League One" },
  { name: "Wycombe Wanderers", league: "League One" },

  // League Two
  { name: "Accrington Stanley", league: "League Two" },
  { name: "Barnet", league: "League Two" },
  { name: "Bristol Rovers", league: "League Two" },
  { name: "Bromley", league: "League Two" },
  { name: "Cheltenham Town", league: "League Two" },
  { name: "Chesterfield", league: "League Two" },
  { name: "Colchester United", league: "League Two" },
  { name: "Crawley Town", league: "League Two" },
  { name: "Crewe Alexandra", league: "League Two" },
  { name: "Fleetwood Town", league: "League Two" },
  { name: "Gillingham", league: "League Two" },
  { name: "Grimsby Town", league: "League Two" },
  { name: "Harrogate Town", league: "League Two" },
  { name: "Milton Keynes Dons", league: "League Two", aliases: ["MK Dons"] },
  { name: "Newport County", league: "League Two" },
  { name: "Notts County", league: "League Two" },
  { name: "Oldham Athletic", league: "League Two" },
  { name: "Salford City", league: "League Two" },
  { name: "Shrewsbury Town", league: "League Two" },
  { name: "Swindon Town", league: "League Two" },
  { name: "Tranmere Rovers", league: "League Two" },
  { name: "Walsall", league: "League Two" },
];

export const LEAGUE_ORDER: EnglishLeague[] = [
  "Premier League",
  "Championship",
  "League One",
  "League Two",
  "Inne",
];

export function normalizeClubKey(name: string): string {
  return slugifyClubName(
    name
      .replace(/\bF\.?\s*C\.?\b/gi, "")
      .replace(/\bA\.?\s*F\.?\s*C\.?\b/gi, "")
      .replace(/\bUnited\b/gi, "united")
      .trim(),
  );
}

/** Buduje mapę slug → wpis katalogu (nazwa kanoniczna + aliasy). */
export function buildClubLookup(catalog: CatalogClub[] = ENGLISH_CLUBS_CATALOG) {
  const map = new Map<string, CatalogClub>();
  for (const club of catalog) {
    map.set(normalizeClubKey(club.name), club);
    for (const alias of club.aliases ?? []) {
      map.set(normalizeClubKey(alias), club);
    }
  }
  return map;
}
