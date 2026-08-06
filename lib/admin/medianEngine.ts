/**
 * Silnik Mediana 2+1 — czysta logika (bez I/O).
 *
 * H2H: wygrana 2–0, remis 1–1 (kolumny DB: 0|1|2).
 * Bonus mediany: w dywizji próg = 5. najwyższy wynik FPL (lub ostatni, gdy <5 graczy).
 * Wszyscy z FPL >= próg dostają +1 (obsługa remisów na progu).
 */

import { clampFplPoints, isValidFplPoints } from "@/lib/admin/constants";

export interface GwScoreLine {
  gameweek: number;
  fpl_id: string;
  points: number;
  lineNumber: number;
}

export interface ParseBatchResult {
  lines: GwScoreLine[];
  errors: string[];
}

/** Parsuje tekst: GW, FPL_ID, Punkty (przecinek / średnik / tab). */
export function parseGwBatchText(raw: string): ParseBatchResult {
  const errors: string[] = [];
  const lines: GwScoreLine[] = [];

  const rows = raw.split(/\r?\n/);
  rows.forEach((row, idx) => {
    const lineNumber = idx + 1;
    const trimmed = row.trim();
    if (!trimmed) return;
    if (/^(gw|gameweek|#)/i.test(trimmed) && /fpl/i.test(trimmed)) return;

    const parts = trimmed.split(/[,;\t]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 3) {
      errors.push(
        `Wiersz ${lineNumber}: oczekiwano 3 wartości (GW, FPL_ID, Punkty), jest ${parts.length}.`,
      );
      return;
    }

    const gw = Number.parseInt(parts[0]!, 10);
    const fpl_id = parts[1]!.replace(/\s+/g, "");
    const points = Number.parseFloat(parts[2]!.replace(",", "."));

    if (!Number.isFinite(gw) || gw < 1 || gw > 38) {
      errors.push(`Wiersz ${lineNumber}: nieprawidłowy GW „${parts[0]}”.`);
      return;
    }
    if (!/^\d+$/.test(fpl_id)) {
      errors.push(`Wiersz ${lineNumber}: FPL ID musi być liczbą („${parts[1]}”).`);
      return;
    }
    if (!isValidFplPoints(points)) {
      errors.push(`Wiersz ${lineNumber}: nieprawidłowe punkty „${parts[2]}”.`);
      return;
    }

    lines.push({
      gameweek: gw,
      fpl_id,
      points: clampFplPoints(points),
      lineNumber,
    });
  });

  return { lines, errors };
}

export type NamePointsLine = {
  name: string;
  points: number;
  lineNumber: number;
};

export type FplPointsLine = {
  team: string | null;
  manager: string | null;
  points: number;
  lineNumber: number;
  /** Etykieta do komunikatów (team / manager). */
  label: string;
};

export type FplGwPointsLine = FplPointsLine & {
  gameweek: number;
};

/** Wyciąga numer GW z komórki: „GW1”, „GW 2”, „1”, „kolejka 3”. */
export function parseGameweekToken(raw: string | null | undefined): number | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const m = s.match(/^(?:gw|game\s*week|gameweek|kolejka)?\s*[-:.]?\s*(\d{1,2})$/i);
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 10);
  if (!Number.isFinite(n) || n < 1 || n > 38) return null;
  return n;
}

function splitPasteCells(row: string): string[] {
  const trimmed = row.trim();
  if (!trimmed) return [];
  if (trimmed.includes("\t")) {
    return trimmed.split("\t").map((p) => p.trim());
  }
  // FPL czasem kopiuje z wieloma spacjami / pipe
  if (trimmed.includes("|")) {
    return trimmed.split("|").map((p) => p.trim()).filter(Boolean);
  }
  if (trimmed.includes(";")) {
    return trimmed.split(";").map((p) => p.trim()).filter(Boolean);
  }
  // Fallback: 2+ spacje jako separator kolumn
  const multi = trimmed.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean);
  if (multi.length >= 2) return multi;
  return [trimmed];
}

function isHeaderCell(value: string): boolean {
  return /^(rank|#|lp|pos|position|team|fpl\s*team|manager|fpl\s*manager|menedzer|gw|event|pts|points|punkty|tot|total|score|nazwa)$/i.test(
    value.replace(/\s+/g, " ").trim(),
  );
}

function findColumnIndex(headers: string[], patterns: RegExp[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]!.toLowerCase().replace(/\s+/g, " ").trim();
    if (patterns.some((re) => re.test(h))) return i;
  }
  return -1;
}

function parseNumericCell(raw: string): number | null {
  const cleaned = raw.replace(/[^\d,.\-]/g, "").replace(",", ".");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") return null;
  const n = Number.parseFloat(cleaned);
  if (!isValidFplPoints(n)) return null;
  return clampFplPoints(n);
}

function looksLikeHeaderRow(cells: string[]): boolean {
  if (cells.length < 2) return false;
  const hits = cells.filter(isHeaderCell).length;
  return hits >= 2 || cells.some((c) => /^(team|manager|gw|points|punkty|fpl)/i.test(c));
}

/**
 * Wklejka ze strony / tabeli FPL.
 * Wyciąga FPL Team, FPL Manager oraz punkty GW/Event.
 */
export function parseFplPointsPaste(raw: string): {
  lines: FplPointsLine[];
  errors: string[];
} {
  return parseFplPointsPasteBody(raw);
}

function isLikelyNumericToken(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (/^[\d,.\-]+$/.test(t.replace(/\s/g, ""))) return true;
  return /^-?\d+[.,]?\d*$/.test(t);
}

/** Linie ze schowka FPL Classic — nagłówki, placeholdery, stopka paginacji. */
function isFplClassicGarbageLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;

  // Wiersz wyniku (rank + nazwa + GW + Total) nigdy nie jest śmieciem
  if (/^\d+\s+.+?\s+\d+\s+\d+$/.test(t)) return false;

  const lower = t.toLowerCase();
  // Stopka / nawigacja tabeli FPL (Showing 1 to 10…, Previous, Next, …)
  if (
    /\bshowing\b/.test(lower) ||
    /\bprevious\b/.test(lower) ||
    /\bnext\b/.test(lower) ||
    /\bentries\b/.test(lower) ||
    /\brank\b/.test(lower) ||
    /\btotal\b/.test(lower)
  ) {
    return true;
  }

  const compact = t.replace(/\s+/g, " ");
  const patterns = [
    /standings data will appear/i,
    /new entries/i,
    /team\s*&\s*manager/i,
    /^overall\s*rank/i,
    /^gameweek\s*points/i,
    /^#\s*team/i,
    /^team\s*manager\s*gw/i,
    /^league\s*standings/i,
    /^classic\s*league/i,
    /will appear here when the league starts/i,
    /no\s*data\s*available/i,
  ];
  if (patterns.some((re) => re.test(compact))) return true;

  const squashed = t.replace(/\s+/g, "").toLowerCase();
  if (squashed === "rankteammanagergwtotal") return true;
  if (squashed.startsWith("rankteam") && squashed.includes("manager")) return true;
  if (/^teammanager/i.test(squashed) && !/\d/.test(t)) return true;

  return false;
}

/**
 * Pojedynczy wiersz FPL Classic:
 * `1 \t Team \t Manager \t 85 \t 85` lub `1 Team Name Manager Name 85 85`
 */
function extractFplClassicRow(line: string): {
  team: string | null;
  manager: string | null;
  points: number;
} | null {
  const cleanLine = line.trim();
  if (!cleanLine) return null;

  // [rank] [dowolny tekst] [GW pts] [Total] — spacje lub taby
  const regex = /^\d+\s+(.+?)\s+(\d+)\s+(\d+)$/;
  const match = cleanLine.match(regex);

  let team: string | null = null;
  let manager: string | null = null;
  let extractedPoints = Number.NaN;

  if (match) {
    const rawMiddle = match[1]!.trim();
    extractedPoints = Number.parseInt(match[2]!, 10);

    if (rawMiddle.includes("\t")) {
      const parts = rawMiddle
        .split(/\t+/)
        .map((s) => s.trim())
        .filter(Boolean);
      team = parts[0] ?? null;
      manager = parts.slice(1).join(" ").trim() || null;
    } else {
      // Cały blok nazwy → team; matchTeamInPool złapie combined / fuzzy
      team = rawMiddle.replace(/\s+/g, " ").trim() || null;
      manager = null;
    }
  } else {
    const tokens = cleanLine
      .split(/\t+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (tokens.length >= 4) {
      const hasRank = /^\d+$/.test(tokens[0]!);
      const ti = hasRank ? 1 : 0;
      team = tokens[ti]?.trim() || null;
      manager = tokens[ti + 1]?.trim() || null;
      const prev = Number.parseInt(tokens[tokens.length - 2]!, 10);
      const last = Number.parseInt(tokens[tokens.length - 1]!, 10);
      extractedPoints = Number.isFinite(prev) ? prev : last;
    } else if (tokens.length === 3 && /^\d+$/.test(tokens[0]!)) {
      team = tokens[1]?.trim() || null;
      manager = null;
      extractedPoints = Number.parseInt(tokens[2]!, 10);
    }
  }

  const extractedName = [team, manager].filter(Boolean).join(" ").trim();
  if (!extractedName || !Number.isFinite(extractedPoints) || Number.isNaN(extractedPoints)) {
    return null;
  }
  if (!isValidFplPoints(extractedPoints)) return null;

  return {
    team,
    manager,
    points: clampFplPoints(extractedPoints),
  };
}

function splitFplClassicRow(row: string): string[] {
  const trimmed = row.trim();
  if (!trimmed) return [];
  if (trimmed.includes("\t")) {
    return trimmed.split("\t").map((p) => p.trim());
  }
  const multi = trimmed.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean);
  if (multi.length >= 3) return multi;
  return trimmed.split(/\s+/).map((p) => p.trim()).filter(Boolean);
}

function parseFplClassicDataRow(cells: string[]): {
  team: string | null;
  manager: string | null;
  points: number;
} | null {
  if (cells.length < 2) return null;
  if (cells.every((c) => isHeaderCell(c) || !c.trim())) return null;

  const numericCells: { idx: number; value: number }[] = [];
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]!.trim();
    if (!isLikelyNumericToken(cell)) continue;
    const n = parseNumericCell(cell);
    if (n !== null) numericCells.push({ idx: i, value: n });
  }
  if (!numericCells.length) return null;

  let pointsIdx: number;
  if (numericCells.length >= 2) {
    const last = numericCells[numericCells.length - 1]!;
    const prev = numericCells[numericCells.length - 2]!;
    if (last.idx === cells.length - 1 && prev.idx === cells.length - 2) {
      pointsIdx = prev.idx;
    } else {
      const tail = numericCells.filter((n) => n.idx >= cells.length - 3);
      if (tail.length >= 2) {
        pointsIdx = tail[tail.length - 2]!.idx;
      } else {
        pointsIdx = numericCells[numericCells.length - 1]!.idx;
      }
    }
  } else {
    const only = numericCells[0]!;
    if (only.idx === 0 && only.value >= 1 && only.value <= 100 && cells.length >= 3) {
      return null;
    }
    pointsIdx = only.idx;
  }

  const points = parseNumericCell(cells[pointsIdx]!.trim());
  if (points === null || !isValidFplPoints(points)) return null;

  const textCells = cells
    .slice(0, pointsIdx)
    .map((c) => c.trim())
    .filter(Boolean);

  let start = 0;
  if (
    textCells.length >= 2 &&
    /^\d{1,3}$/.test(textCells[0]!) &&
    Number.parseInt(textCells[0]!, 10) >= 1 &&
    Number.parseInt(textCells[0]!, 10) <= 100
  ) {
    start = 1;
  }

  const rest = textCells.slice(start);
  let team: string | null = null;
  let manager: string | null = null;

  if (rest.length >= 2) {
    team = rest[0]!;
    manager = rest.slice(1).join(" ").trim() || null;
  } else if (rest.length === 1) {
    const single = rest[0]!;
    if (single.includes("|")) {
      const [a, b] = single.split("|").map((s) => s.trim());
      team = a || null;
      manager = b || null;
    } else {
      team = single;
    }
  }

  if (!team && !manager) return null;
  if (team && isHeaderCell(team) && (!manager || isHeaderCell(manager))) return null;

  return { team, manager, points };
}

export type FplClassicParseResult = {
  lines: FplPointsLine[];
  errors: string[];
  skipped: string[];
};

/**
 * Smart Parser — surowy tekst ze schowka strony FPL Classic League.
 * Nie wymaga numeru GW w wierszu (wybierany osobno w UI).
 */
export function parseFplClassicLeaguePaste(raw: string): FplClassicParseResult {
  const lines: FplPointsLine[] = [];
  const errors: string[] = [];
  const skipped: string[] = [];

  const rows = raw.split(/\r?\n/);
  rows.forEach((row, idx) => {
    const lineNumber = idx + 1;
    const trimmed = row.trim();
    if (!trimmed) return;

    // Stopka / nagłówki FPL — ciche pominięcie (bez zaśmiecania UI)
    if (isFplClassicGarbageLine(trimmed)) {
      return;
    }

    // 1) Regex / tab — preferowana ścieżka
    let parsed = extractFplClassicRow(trimmed);

    // 2) Fallback: stary podział na komórki
    if (!parsed) {
      const cells = splitFplClassicRow(trimmed);
      if (cells.length < 2) {
        skipped.push(`Wiersz ${lineNumber}: za mało kolumn`);
        return;
      }
      if (looksLikeHeaderRow(cells) || looksLikeGwRowHeader(cells)) {
        return;
      }
      parsed = parseFplClassicDataRow(cells);
    }

    if (!parsed) {
      skipped.push(`Wiersz ${lineNumber}: nie rozpoznano gracza / punktów`);
      return;
    }

    const label = [parsed.team, parsed.manager].filter(Boolean).join(" · ") || "—";
    lines.push({
      team: parsed.team,
      manager: parsed.manager,
      points: parsed.points,
      lineNumber,
      label,
    });
  });

  if (!lines.length && !errors.length) {
    errors.push(
      "Nie znaleziono wyników w wklejce. Zaznacz tabelę ligową na fantasy.premierleague.com (Classic) i skopiuj ponownie.",
    );
  }

  return { lines, errors, skipped };
}

/**
 * Uniwersalny import Multi-GW:
 *   GW1\tKapcie Kłapcia\tMateusz Stopczyński\t85
 *   GW2\tKapcie Kłapcia\tMateusz Stopczyński\t55
 *
 * Kolumny: GW | FPL Team | FPL Manager | Punkty
 * `gameweek` w wyniku = pierwsza wykryta kolejka (dla kompatybilności UI).
 */
export function parseGlobalGameweekPaste(raw: string): {
  gameweek: number | null;
  body: { lines: FplPointsLine[]; errors: string[] };
  gwLines: FplGwPointsLine[];
} {
  const { lines: gwLines, errors } = parseMultiGameweekPaste(raw);
  const gameweeks = [...new Set(gwLines.map((l) => l.gameweek))].sort((a, b) => a - b);
  return {
    gameweek: gameweeks[0] ?? null,
    body: {
      lines: gwLines.map(({ gameweek: _gw, ...rest }) => rest),
      errors,
    },
    gwLines,
  };
}

/**
 * Parser wierszowy: `[GW] \t [FPL Team] \t [FPL Manager] \t [Punkty]`
 */
export function parseMultiGameweekPaste(raw: string): {
  lines: FplGwPointsLine[];
  errors: string[];
} {
  const lines: FplGwPointsLine[] = [];
  const errors: string[] = [];
  const rows = raw.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
  if (!rows.length) return { lines, errors };

  let start = 0;
  const firstCells = splitPasteCells(rows[0]!);
  if (looksLikeGwRowHeader(firstCells)) {
    start = 1;
  }

  for (let i = start; i < rows.length; i++) {
    const lineNumber = i + 1;
    const rowText = rows[i]!;
    if (isFplClassicGarbageLine(rowText)) continue;

    const cells = splitPasteCells(rowText);
    if (!cells.length) continue;
    if (looksLikeGwRowHeader(cells)) continue;

    if (cells.length < 3) {
      errors.push(
        `Wiersz ${lineNumber}: oczekiwano GW | FPL Team | FPL Manager | Punkty (min. 3–4 kolumny).`,
      );
      continue;
    }

    let gameweek = parseGameweekToken(cells[0]);
    let team: string | null;
    let manager: string | null;
    let points: number | null;

    if (gameweek != null && cells.length >= 4) {
      team = cells[1]?.trim() || null;
      manager = cells[2]?.trim() || null;
      points = parseNumericCell(cells[3]!);
    } else if (gameweek != null && cells.length === 3) {
      // GW | TeamOrManager | Punkty
      team = cells[1]?.trim() || null;
      manager = null;
      points = parseNumericCell(cells[2]!);
    } else {
      // Brak GW w kolumnie 0 — spróbuj stary format Team | Manager | Punkty (bez GW)
      errors.push(
        `Wiersz ${lineNumber}: brak numeru kolejki w 1. kolumnie („GW1”, „1”…).`,
      );
      continue;
    }

    if (points === null || !isValidFplPoints(points)) {
      errors.push(`Wiersz ${lineNumber}: nieprawidłowe punkty.`);
      continue;
    }
    if (!team && !manager) {
      errors.push(`Wiersz ${lineNumber}: brak FPL Team / FPL Manager.`);
      continue;
    }
    if (team && isHeaderCell(team) && (!manager || isHeaderCell(manager))) {
      continue;
    }

    const label = [team, manager].filter(Boolean).join(" · ") || "—";
    lines.push({
      gameweek,
      team,
      manager,
      points,
      lineNumber,
      label,
    });
  }

  return { lines, errors };
}

function looksLikeGwRowHeader(cells: string[]): boolean {
  if (cells.length < 2) return false;
  const joined = cells.map((c) => c.toLowerCase()).join(" ");
  const hasGw = /^(gw|gameweek|kolejka)$/i.test(cells[0]!.trim()) || /\bgw\b/.test(joined);
  const hasTeamOrMgr = /team|manager|fpl|punkty|points/.test(joined);
  return hasGw && hasTeamOrMgr && cells.filter(isHeaderCell).length >= 2;
}

function parseFplPointsPasteBody(raw: string): {
  lines: FplPointsLine[];
  errors: string[];
} {
  const lines: FplPointsLine[] = [];
  const errors: string[] = [];
  const rows = raw.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
  if (!rows.length) return { lines, errors };

  let start = 0;
  let teamIdx = -1;
  let managerIdx = -1;
  let pointsIdx = -1;

  const firstCells = splitPasteCells(rows[0]!);
  if (looksLikeHeaderRow(firstCells)) {
    teamIdx = findColumnIndex(firstCells, [
      /^fpl\s*team$/,
      /^team$/,
      /team\s*name/,
      /nazwa\s*(zespołu|druzyny|drużyny)/,
    ]);
    managerIdx = findColumnIndex(firstCells, [
      /^fpl\s*manager$/,
      /^manager$/,
      /mened[zż]er/,
      /player\s*name/,
    ]);
    pointsIdx = findColumnIndex(firstCells, [
      /^gw$/,
      /^event$/,
      /gw\s*pts/,
      /event\s*points/,
      /^points$/,
      /^pts$/,
      /^punkty$/,
      /zdobyte/,
    ]);
    if (pointsIdx < 0) {
      pointsIdx = findColumnIndex(firstCells, [/^tot$/, /^total$/, /score/]);
    }
    start = 1;
  }

  for (let i = start; i < rows.length; i++) {
    const lineNumber = i + 1;
    const cells = splitPasteCells(rows[i]!);
    if (!cells.length) continue;
    if (looksLikeHeaderRow(cells)) continue;

    let team: string | null = null;
    let manager: string | null = null;
    let points: number | null = null;

    if (teamIdx >= 0 || managerIdx >= 0 || pointsIdx >= 0) {
      team = teamIdx >= 0 ? cells[teamIdx]?.trim() || null : null;
      manager = managerIdx >= 0 ? cells[managerIdx]?.trim() || null : null;
      const ptsCell = pointsIdx >= 0 ? cells[pointsIdx] : cells[cells.length - 1];
      points = ptsCell ? parseNumericCell(ptsCell) : null;
    } else {
      const numericTail: { idx: number; value: number }[] = [];
      for (let c = 0; c < cells.length; c++) {
        const n = parseNumericCell(cells[c]!);
        if (n !== null && /^-?\d+[.,]?\d*$/.test(cells[c]!.replace(/\s/g, ""))) {
          numericTail.push({ idx: c, value: n });
        }
      }

      if (!numericTail.length) {
        const m = rows[i]!.match(/^(.+?)[,\s]+(\d+[.,]?\d*)\s*$/);
        if (m) {
          team = m[1]!.trim();
          points = parseNumericCell(m[2]!);
        } else {
          errors.push(
            `Wiersz ${lineNumber}: nie znaleziono punktów (oczekiwano FPL Team / Manager / Punkty).`,
          );
          continue;
        }
      } else {
        const lastNum = numericTail[numericTail.length - 1]!;
        const prevNum =
          numericTail.length >= 2 ? numericTail[numericTail.length - 2]! : null;
        const useGw =
          prevNum &&
          lastNum.idx === cells.length - 1 &&
          prevNum.idx === cells.length - 2 &&
          lastNum.value >= prevNum.value;
        points = useGw ? prevNum!.value : lastNum.value;
        const pointsCellIdx = useGw ? prevNum!.idx : lastNum.idx;

        let textCells = cells
          .slice(0, pointsCellIdx)
          .map((c) => c.trim())
          .filter(Boolean);

        if (
          textCells.length >= 2 &&
          /^\d{1,3}$/.test(textCells[0]!) &&
          Number.parseInt(textCells[0]!, 10) <= 50
        ) {
          textCells = textCells.slice(1);
        }

        if (textCells.length >= 2) {
          team = textCells[0]!;
          manager = textCells.slice(1).join(" ").trim() || null;
        } else if (textCells.length === 1) {
          team = textCells[0]!;
        }
      }
    }

    if (points === null || !isValidFplPoints(points)) {
      errors.push(`Wiersz ${lineNumber}: nieprawidłowe punkty.`);
      continue;
    }
    if (!team && !manager) {
      errors.push(`Wiersz ${lineNumber}: brak FPL Team / FPL Manager.`);
      continue;
    }

    if (team && isHeaderCell(team) && (!manager || isHeaderCell(manager))) {
      continue;
    }

    const label = [team, manager].filter(Boolean).join(" · ") || "—";
    lines.push({ team, manager, points, lineNumber, label });
  }

  return { lines, errors };
}

/** @deprecated Użyj parseFplPointsPaste — zostawione dla kompatybilności. */
export function parseNamePointsPaste(raw: string): {
  lines: NamePointsLine[];
  errors: string[];
} {
  const { lines, errors } = parseFplPointsPaste(raw);
  return {
    errors,
    lines: lines.map((l) => ({
      name: l.label,
      points: l.points,
      lineNumber: l.lineNumber,
    })),
  };
}

export function normalizeMatchKey(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "l")
    .replace(/ą/g, "a")
    .replace(/ę/g, "e")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ć/g, "c")
    .replace(/ź|ż/g, "z")
    .replace(/ń/g, "n")
    .toLowerCase()
    // Apostrofy / cudzysłowy — znikają (Sebastian's → sebastians), nie robią dziury w słowie
    .replace(/[''`´""„”]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Bezpieczne dopasowanie nazw FPL (trim / case / spacje / diakrytyki). */
export function fplNamesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const ka = normalizeMatchKey(a);
  const kb = normalizeMatchKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  // Lekki fuzzy: containment przy sensownej długości
  if (ka.length >= 4 && kb.length >= 4 && (ka.includes(kb) || kb.includes(ka))) {
    return true;
  }
  return false;
}

export function groupScoresByGameweek(
  lines: GwScoreLine[],
): Map<number, Map<string, number>> {
  const byGw = new Map<number, Map<string, number>>();
  for (const line of lines) {
    let map = byGw.get(line.gameweek);
    if (!map) {
      map = new Map();
      byGw.set(line.gameweek, map);
    }
    map.set(line.fpl_id, line.points);
  }
  return byGw;
}

export function resolveH2h(
  homeFpl: number,
  awayFpl: number,
): { home: 0 | 1 | 2; away: 0 | 1 | 2 } {
  if (homeFpl > awayFpl) return { home: 2, away: 0 };
  if (awayFpl > homeFpl) return { home: 0, away: 2 };
  return { home: 1, away: 1 };
}

/**
 * Próg mediany: K-ty najwyższy wynik (domyślnie K=5 dla dywizji 10-osobowej).
 * Remisy na progu: wszyscy z wynikiem >= próg dostają bonus.
 */
export function medianThreshold(sortedDesc: number[], k = 5): number | null {
  if (sortedDesc.length === 0) return null;
  const rank = Math.min(k, sortedDesc.length);
  return sortedDesc[rank - 1]!;
}

export function computeMedianBonusSet(
  pointsByTeam: Map<string, number>,
  k = 5,
): Set<string> {
  const entries = [...pointsByTeam.entries()];
  if (entries.length === 0) return new Set();

  const sortedDesc = entries.map(([, pts]) => pts).sort((a, b) => b - a);
  const threshold = medianThreshold(sortedDesc, k);
  if (threshold === null) return new Set();

  const winners = new Set<string>();
  for (const [teamId, pts] of entries) {
    if (pts >= threshold) winners.add(teamId);
  }
  return winners;
}

export function h2hTotal(h2h: number, medianBonus: number): number {
  return h2h + medianBonus;
}
