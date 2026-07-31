import Papa from "papaparse";
import { NA_MINUSIE_LINKS } from "@/lib/na-minusie/links";

/** Baza uczestników Na Minusie (FPL Manager / Team / Discord Club) */
export const NAMINUSIE_BAZA_CSV_URL =
  NA_MINUSIE_LINKS.bazaCsv ??
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vT3fetAUT-1ZaBK47qUKOGwRDsX9G8RdHEUJVDW8a9lstOOKl3MtCLc7CI8Y3fZvg/pub?gid=1080423590&single=true&output=csv";

/** LIVE VIEW formularza — kolumna S = przykładowe dostępne kluby */
export const FORM_LIVE_CSV_URL = NA_MINUSIE_LINKS.clubsCsv;

/** Indeks kolumny S w arkuszu (A=0 … S=18) */
const LIVE_COLUMN_S_INDEX = 18;

export interface RecruitmentPlayer {
  fplManager: string;
  fplTeam: string;
  discordClub: string;
}

export interface RecruitmentClubsData {
  players: RecruitmentPlayer[];
  /** Kluby z formularza: jest „Zajęty klub”, status ≠ Potwierdzony */
  reservedClubs: string[];
  availableClubs: string[];
}

function cleanCell(value: unknown): string {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

/** Szuka kolumny po nazwie, ignorując sufiksy typu `_1` po transformHeader / duplikatach. */
function cellByHeader(row: Record<string, unknown>, header: string): string {
  if (Object.prototype.hasOwnProperty.call(row, header)) {
    return cleanCell(row[header]);
  }
  const target = header.toLowerCase();
  const key = Object.keys(row).find((k) => {
    const base = k.replace(/_\d+$/, "").toLowerCase();
    return base === target || k.toLowerCase() === target;
  });
  return key ? cleanCell(row[key]) : "";
}

async function fetchCsv(url: string): Promise<string> {
  const res = await fetch(url, {
    next: { revalidate: 60 },
    headers: { Accept: "text/csv,text/plain,*/*" },
  });
  if (!res.ok) {
    throw new Error(`Błąd pobierania CSV (${res.status}): ${url}`);
  }
  return res.text();
}

/** Aktywni uczestnicy z arkusza NaMinusie Baza. */
export function parseBazaPlayers(csvText: string): RecruitmentPlayer[] {
  const parsed = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  console.log("[parseBazaPlayers] Pobrane z CSV:", parsed.data.length, "wierszy");
  if (parsed.meta.fields?.length) {
    console.log("[parseBazaPlayers] Kolumny:", parsed.meta.fields.join(" | "));
  }

  const players: RecruitmentPlayer[] = [];
  const seenClubs = new Set<string>();

  for (const row of parsed.data) {
    if (!row || typeof row !== "object") continue;

    const discordClub = cellByHeader(row, "Discord Club");
    const fplManager = cellByHeader(row, "FPL Manager");
    const fplTeam = cellByHeader(row, "FPL Team");
    const status = cellByHeader(row, "Status").toLowerCase();

    if (!discordClub || !fplManager) continue;
    // Pomijaj tylko jawnie nieaktywne; pusty status = OK
    if (status && status !== "aktywny") continue;

    const key = discordClub.toLowerCase();
    if (seenClubs.has(key)) continue;
    seenClubs.add(key);

    players.push({ fplManager, fplTeam, discordClub });
  }

  players.sort((a, b) => a.fplManager.localeCompare(b.fplManager, "pl", { sensitivity: "base" }));

  console.log("[parseBazaPlayers] Uczestnicy po filtrach:", players.length);
  return players;
}

/**
 * Kluby w trakcie rezerwacji z LIVE VIEW formularza.
 * Kolumna D (Zajęty klub) niepusta + kolumna C (Status udziału) ≠ „Potwierdzony”.
 * Kluby już potwierdzone w tym samym arkuszu są pomijane (bez dublowania).
 */
export function parseReservedClubsFromLiveForm(csvText: string): string[] {
  const parsed = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: false,
  });

  const confirmed = new Set<string>();
  const reservedCandidates: string[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    if (!Array.isArray(row) || i === 0) continue;

    const status = cleanCell(row[2]);
    const club = cleanCell(row[3]);
    if (!club) continue;

    const key = club.toLowerCase();
    if (status.toLowerCase() === "potwierdzony") {
      confirmed.add(key);
      continue;
    }

    reservedCandidates.push(club);
  }

  const reserved: string[] = [];
  const seen = new Set<string>();

  for (const club of reservedCandidates) {
    const key = club.toLowerCase();
    if (confirmed.has(key) || seen.has(key)) continue;
    seen.add(key);
    reserved.push(club);
  }

  console.log("[parseReservedClubsFromLiveForm] Zarezerwowane:", reserved.length, reserved);
  return reserved;
}

/**
 * Przykładowe wolne kluby z kolumny S arkusza LIVE VIEW.
 * Parsowanie bez headerów — wiersz 0 też zawiera nazwę klubu w kolumnie S.
 */
export function parseAvailableClubsFromColumnS(csvText: string): string[] {
  const parsed = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: false,
  });

  const clubs: string[] = [];
  const seen = new Set<string>();

  for (const row of parsed.data) {
    if (!Array.isArray(row)) continue;
    const raw = cleanCell(row[LIVE_COLUMN_S_INDEX]);
    if (!raw) continue;
    if (/^pamiętaj/i.test(raw)) continue;
    if (/premier league|championship|league one|league two/i.test(raw)) continue;

    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    clubs.push(raw);
  }

  console.log("[parseAvailableClubsFromColumnS] Kluby z kolumny S:", clubs.length);
  return clubs;
}

/**
 * Dane rekrutacyjne LIVE: kto gra + przykładowe dostępne kluby (kolumna S).
 * Fetchy są niezależne — awaria jednego arkusza nie kasuje drugiego.
 */
export async function getRecruitmentClubsData(): Promise<RecruitmentClubsData> {
  const empty: RecruitmentClubsData = {
    players: [],
    reservedClubs: [],
    availableClubs: [],
  };

  const [bazaResult, liveResult] = await Promise.allSettled([
    fetchCsv(NAMINUSIE_BAZA_CSV_URL),
    fetchCsv(FORM_LIVE_CSV_URL),
  ]);

  if (bazaResult.status === "fulfilled") {
    empty.players = parseBazaPlayers(bazaResult.value);
  } else {
    console.error("[getRecruitmentClubsData] Baza CSV:", bazaResult.reason);
  }

  if (liveResult.status === "fulfilled") {
    empty.reservedClubs = parseReservedClubsFromLiveForm(liveResult.value);
    const reservedKeys = new Set(empty.reservedClubs.map((c) => c.toLowerCase()));
    const playerKeys = new Set(empty.players.map((p) => p.discordClub.toLowerCase()));

    empty.availableClubs = parseAvailableClubsFromColumnS(liveResult.value).filter(
      (club) => {
        const key = club.toLowerCase();
        return !reservedKeys.has(key) && !playerKeys.has(key);
      },
    );
  } else {
    console.error("[getRecruitmentClubsData] LIVE CSV:", liveResult.reason);
  }

  return empty;
}

/** Unikalne nazwy klubów do panelu logo (uczestnicy + rezerwacje + kolumna S). */
export async function getMarketingClubNames(): Promise<string[]> {
  const data = await getRecruitmentClubsData();
  const names = [
    ...data.players.map((p) => p.discordClub),
    ...data.reservedClubs,
    ...data.availableClubs,
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.sort((a, b) => a.localeCompare(b, "pl"));
}
