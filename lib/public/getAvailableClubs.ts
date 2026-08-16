import Papa from "papaparse";
import { unstable_cache } from "next/cache";
import https from "node:https";
import { NA_MINUSIE_LINKS } from "@/lib/na-minusie/links";
import { resolveDiscordDisplayNick } from "@/lib/public/resolveDiscordDisplayNick";
import type {
  DivisionRosterBlock,
  DivisionRosterRow,
  PublicSeasonDivisionStructurePayload,
} from "@/lib/public/types";

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
  /** Kluby z formularza: jest „Zajęty klub”, status ≠ Potwierdzony i ≠ Brak zgłoszenia */
  reservedClubs: string[];
  /** Kluby ze statusem „Brak zgłoszenia” — niedostępne / zablokowane */
  blockedClubs: string[];
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

/** Kolumna OR — w arkuszu bywa „OR 2025/26”, „OR”, „Overall Rank”. */
function cellOr(row: Record<string, unknown>): string {
  const direct =
    cellByHeader(row, "OR 2025/26") ||
    cellByHeader(row, "OR") ||
    cellByHeader(row, "Overall Rank");
  if (direct) return direct;
  const key = Object.keys(row).find((k) => /^or\b/i.test(k.replace(/_\d+$/, "")));
  return key ? cleanCell(row[key]) : "";
}

function parseOptionalInt(raw: string): number | null {
  const cleaned = raw.replace(/\s+/g, "").replace(/,/g, "");
  if (!cleaned) return null;
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

function isActiveStatus(statusRaw: string): boolean {
  const s = statusRaw.trim().toLowerCase();
  if (!s) return true;
  return s === "aktywny" || s === "active" || s === "tak" || s === "yes" || s === "1";
}

/**
 * HTTPS GET z obsługą redirectów.
 * `rejectUnauthorized: false` — lokalny Windows / antivirus (SSL inspection)
 * często psuje domyślny fetch() do Google Sheets (UNABLE_TO_VERIFY_LEAF_SIGNATURE).
 */
function httpsGetText(
  url: string,
  redirectsLeft = 5,
): Promise<{ text: string; lastModified: string | null }> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          Accept: "text/csv,text/plain,*/*",
          "User-Agent": "fpl-arena-skarb-kibica",
        },
        rejectUnauthorized: false,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          if (redirectsLeft <= 0) {
            reject(new Error(`Zbyt wiele przekierowań: ${url}`));
            return;
          }
          const next = new URL(res.headers.location, url).toString();
          resolve(httpsGetText(next, redirectsLeft - 1));
          return;
        }
        if (status < 200 || status >= 300) {
          res.resume();
          reject(new Error(`Błąd pobierania CSV (${status}): ${url}`));
          return;
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const lastModifiedHeader = res.headers["last-modified"];
          let lastModified: string | null = null;
          if (typeof lastModifiedHeader === "string") {
            const d = new Date(lastModifiedHeader);
            if (!Number.isNaN(d.getTime())) lastModified = d.toISOString();
          }
          resolve({
            text: Buffer.concat(chunks).toString("utf8"),
            lastModified,
          });
        });
        res.on("error", reject);
      },
    );
    req.on("error", reject);
  });
}

const fetchCsvCached = unstable_cache(
  async (url: string) => (await httpsGetText(url)).text,
  ["na-minusie-google-csv"],
  { revalidate: 60 },
);

async function fetchCsv(url: string): Promise<string> {
  return fetchCsvCached(url);
}

async function fetchCsvWithMeta(
  url: string,
): Promise<{ text: string; lastModified: string | null }> {
  return httpsGetText(url);
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
 * Pełny podział na dywizje z arkusza Baza (to samo źródło co „Grają z Nami”).
 * Grupuje po: Piramida + Dywizja (tier) + Nazwa dywizji.
 */
export function parseBazaDivisionStructure(
  csvText: string,
): DivisionRosterBlock[] {
  const parsed = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  type Acc = {
    key: string;
    name: string;
    tier: number;
    pyramidName: string;
    teams: DivisionRosterRow[];
  };

  const byKey = new Map<string, Acc>();

  for (const row of parsed.data) {
    if (!row || typeof row !== "object") continue;

    const status = cellByHeader(row, "Status");
    if (!isActiveStatus(status)) continue;

    const tier = parseOptionalInt(cellByHeader(row, "Dywizja"));
    const divisionName = cellByHeader(row, "Nazwa dywizji");
    const pyramidName = cellByHeader(row, "Piramida") || "—";
    const fplManager = cellByHeader(row, "FPL Manager");
    const discordNickRaw = cellByHeader(row, "Discord Name");
    const xComRaw =
      cellByHeader(row, "x.com") ||
      cellByHeader(row, "X.com") ||
      cellByHeader(row, "x_com");
    const discordClub = cellByHeader(row, "Discord Club");
    const fplTeam = cellByHeader(row, "FPL Team");
    const previousOr = parseOptionalInt(cellOr(row));

    if (tier == null || tier < 1 || !divisionName) continue;
    // Puste sloty w arkuszu (tylko LP/tier/nazwa)
    if (!fplManager || !discordClub) continue;
    const nick = resolveDiscordDisplayNick({
      discordName: discordNickRaw,
      xCom: xComRaw,
      fplManager,
    });
    if (!nick || /^[`'"\-–—._\s]+$/.test(nick)) continue;

    const key = `${pyramidName.toLowerCase()}::${tier}::${divisionName.toLowerCase()}`;
    let block = byKey.get(key);
    if (!block) {
      block = {
        key,
        name: divisionName,
        tier,
        pyramidName,
        teams: [],
      };
      byKey.set(key, block);
    }

    block.teams.push({
      lp: 0,
      teamId: `${key}::${nick.toLowerCase()}::${discordClub.toLowerCase()}`,
      fpl_team_name: fplTeam || null,
      manager_name: fplManager,
      discord_nick: nick,
      chosen_club: discordClub,
      previous_or: previousOr,
    });
  }

  const blocks: DivisionRosterBlock[] = [...byKey.values()]
    .sort(
      (a, b) =>
        a.tier - b.tier ||
        a.pyramidName.localeCompare(b.pyramidName, "pl") ||
        a.name.localeCompare(b.name, "pl"),
    )
    .map((acc) => {
      const teams = acc.teams
        .sort((a, b) => {
          const ao = a.previous_or;
          const bo = b.previous_or;
          if (ao == null && bo == null) {
            return a.manager_name.localeCompare(b.manager_name, "pl");
          }
          if (ao == null) return 1;
          if (bo == null) return -1;
          if (ao !== bo) return ao - bo;
          return a.manager_name.localeCompare(b.manager_name, "pl");
        })
        .map((row, i) => ({ ...row, lp: i + 1 }));

      return {
        divisionId: acc.key,
        name: acc.name,
        tier: acc.tier,
        pyramidId: acc.pyramidName.toLowerCase(),
        pyramidName: acc.pyramidName,
        teams,
      };
    });

  console.log(
    "[parseBazaDivisionStructure] Dywizje:",
    blocks.length,
    "graczy:",
    blocks.reduce((n, b) => n + b.teams.length, 0),
  );
  return blocks;
}

/**
 * Live podgląd dywizji z publicznego CSV bazy (jak „Grają z Nami”).
 * Cache: revalidate 60s.
 */
export async function getPublicDivisionsFromBaza(): Promise<PublicSeasonDivisionStructurePayload> {
  try {
    const { text, lastModified } = await fetchCsvWithMeta(NAMINUSIE_BAZA_CSV_URL);
    const divisions = parseBazaDivisionStructure(text);
    return {
      seasonId: "baza-live",
      seasonName: "Na Minusie",
      divisions,
      updatedAt: lastModified ?? new Date().toISOString(),
      isPreview: true,
    };
  } catch (e) {
    console.error("[getPublicDivisionsFromBaza]", e);
    return {
      seasonId: "",
      seasonName: "",
      divisions: [],
      updatedAt: null,
      isPreview: true,
      error:
        e instanceof Error
          ? e.message
          : "Nie udało się wczytać bazy uczestników.",
    };
  }
}

/**
 * Kluby w trakcie rezerwacji + zablokowane z LIVE VIEW formularza.
 * Kolumna D (Zajęty klub) niepusta + kolumna C (Status udziału):
 * - „Potwierdzony” → pomijany (jest w Bazie)
 * - „Brak zgłoszenia” → blockedClubs
 * - pozostałe → reservedClubs
 */
export function parseReservedClubsFromLiveForm(csvText: string): {
  reservedClubs: string[];
  blockedClubs: string[];
} {
  const parsed = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: false,
  });

  const confirmed = new Set<string>();
  const reservedCandidates: string[] = [];
  const blockedCandidates: string[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    if (!Array.isArray(row) || i === 0) continue;

    const status = cleanCell(row[2]);
    const club = cleanCell(row[3]);
    if (!club) continue;

    const key = club.toLowerCase();
    const statusLower = status.toLowerCase();

    if (statusLower === "potwierdzony") {
      confirmed.add(key);
      continue;
    }

    if (statusLower === "brak zgłoszenia") {
      blockedCandidates.push(club);
      continue;
    }

    reservedCandidates.push(club);
  }

  const reservedClubs: string[] = [];
  const blockedClubs: string[] = [];
  const seenReserved = new Set<string>();
  const seenBlocked = new Set<string>();

  for (const club of reservedCandidates) {
    const key = club.toLowerCase();
    if (confirmed.has(key) || seenReserved.has(key)) continue;
    seenReserved.add(key);
    reservedClubs.push(club);
  }

  for (const club of blockedCandidates) {
    const key = club.toLowerCase();
    if (confirmed.has(key) || seenBlocked.has(key) || seenReserved.has(key)) continue;
    seenBlocked.add(key);
    blockedClubs.push(club);
  }

  console.log(
    "[parseReservedClubsFromLiveForm] Zarezerwowane:",
    reservedClubs.length,
    reservedClubs,
  );
  console.log(
    "[parseReservedClubsFromLiveForm] Zablokowane (Brak zgłoszenia):",
    blockedClubs.length,
    blockedClubs,
  );
  return { reservedClubs, blockedClubs };
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
    blockedClubs: [],
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
    const { reservedClubs, blockedClubs } = parseReservedClubsFromLiveForm(
      liveResult.value,
    );

    const playerKeys = new Set(
      empty.players.map((p) => p.discordClub.toLowerCase()),
    );

    // Klub już przypisany w Bazie (Grają z Nami) — nie pokazuj go w rezerwacjach,
    // nawet jeśli LIVE formularz ma niezaktualizowany status (np. „Oczekuje”).
    empty.reservedClubs = reservedClubs.filter(
      (club) => !playerKeys.has(club.toLowerCase()),
    );
    empty.blockedClubs = blockedClubs.filter(
      (club) => !playerKeys.has(club.toLowerCase()),
    );

    const reservedKeys = new Set(empty.reservedClubs.map((c) => c.toLowerCase()));
    const blockedKeys = new Set(empty.blockedClubs.map((c) => c.toLowerCase()));

    empty.availableClubs = parseAvailableClubsFromColumnS(liveResult.value).filter(
      (club) => {
        const key = club.toLowerCase();
        return (
          !reservedKeys.has(key) && !blockedKeys.has(key) && !playerKeys.has(key)
        );
      },
    );
  } else {
    console.error("[getRecruitmentClubsData] LIVE CSV:", liveResult.reason);
  }

  return empty;
}

/** Unikalne nazwy klubów do panelu logo (uczestnicy + rezerwacje + zablokowane + kolumna S). */
export async function getMarketingClubNames(): Promise<string[]> {
  const data = await getRecruitmentClubsData();
  const names = [
    ...data.players.map((p) => p.discordClub),
    ...data.reservedClubs,
    ...data.blockedClubs,
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
