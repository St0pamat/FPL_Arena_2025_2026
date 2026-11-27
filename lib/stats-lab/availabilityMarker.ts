/**
 * Znacznik dostępności FPL (status + szansa gry).
 * Tylko prezentacja pól już odczytanych z wiersza zawodnika.
 * Nie dociąga bootstrapu i niczego nie zapisuje.
 */

import type { StatsLabLang } from "@/lib/stats-lab/i18n";

export type FplAvailabilityCode = "a" | "d" | "i" | "s" | "u" | "n" | "unknown";

export type AvailabilityTone = "yellow" | "orange" | "red" | "muted";

export type AvailabilityKind =
  | "chance"
  | "injury"
  | "suspension"
  | "unavailable"
  | "doubt";

export type AvailabilityMarker = {
  visible: boolean;
  status: FplAvailabilityCode;
  tone: AvailabilityTone;
  kind: AvailabilityKind;
  /** Tekst na plakietce: 75, 50, 25, 0, S, +. */
  badge: string;
  chanceNext: number | null;
  chanceThis: number | null;
};

export type AvailabilityInput = {
  status?: string | null;
  chanceOfPlayingNextRound?: number | null;
  /** `undefined` = kolumny nie ma w odczycie. `null` = FPL nie podał liczby. */
  chanceOfPlayingThisRound?: number | null;
  news?: string | null;
  /** `undefined` = kolumny nie ma w odczycie. `null` = FPL nie podał daty. */
  newsAdded?: string | null;
};

export type AvailabilityDetailLine = {
  id: "status" | "chanceNext" | "chanceThis" | "news" | "newsAdded";
  label: string;
  value: string;
  hint?: string;
};

const COPY = {
  pl: {
    status: "Status FPL",
    chanceNext: "Szansa na następną kolejkę",
    chanceThis: "Szansa na tę kolejkę",
    news: "Komunikat",
    newsAdded: "Data komunikatu",
    noNews: "Brak komunikatu",
    fplEmpty: "FPL nie podał wartości.",
    missingChanceThis:
      "Brak kolumny chance_of_playing_this_round. Źródło: bootstrap-static → elements[].chance_of_playing_this_round.",
    missingNewsAdded:
      "Brak kolumny news_added. Źródło: bootstrap-static → elements[].news_added.",
    available: "Dostępny",
    doubtful: "Wątpliwy",
    injured: "Kontuzja",
    suspended: "Zawieszenie",
    unavailable: "Niedostępny",
    notInSquad: "Poza kadrą",
    unknown: "Nieznany status",
    chance: "Szansa gry",
  },
  en: {
    status: "FPL status",
    chanceNext: "Chance of playing next round",
    chanceThis: "Chance of playing this round",
    news: "News",
    newsAdded: "News date",
    noNews: "No news",
    fplEmpty: "FPL did not provide a value.",
    missingChanceThis:
      "Column chance_of_playing_this_round is missing. Source: bootstrap-static → elements[].chance_of_playing_this_round.",
    missingNewsAdded:
      "Column news_added is missing. Source: bootstrap-static → elements[].news_added.",
    available: "Available",
    doubtful: "Doubtful",
    injured: "Injury",
    suspended: "Suspension",
    unavailable: "Unavailable",
    notInSquad: "Not in squad",
    unknown: "Unknown status",
    chance: "Playing chance",
  },
} as const;

export function availabilityCopy(lang: StatsLabLang) {
  return COPY[lang];
}

export function normalizeAvailabilityStatus(
  status: string | null | undefined,
): FplAvailabilityCode {
  const code = String(status ?? "a").trim().toLowerCase();
  if (
    code === "a" ||
    code === "d" ||
    code === "i" ||
    code === "s" ||
    code === "u" ||
    code === "n"
  ) {
    return code;
  }
  if (!code) return "a";
  return "unknown";
}

function finiteChance(value: number | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function toneForChance(chance: number): AvailabilityTone {
  if (chance <= 25) return "red";
  if (chance <= 50) return "orange";
  return "yellow";
}

/**
 * Kolor FPL: 75 żółty, 50 pomarańczowy, 25 i 0 czerwone.
 * Kontuzja i zawieszenie mają własny znak, gdy nie ma procentu albo procent to 0.
 */
export function mapAvailabilityMarker(
  input: AvailabilityInput,
): AvailabilityMarker {
  const status = normalizeAvailabilityStatus(input.status);
  const chanceNext = finiteChance(input.chanceOfPlayingNextRound);
  const chanceThis = finiteChance(input.chanceOfPlayingThisRound);
  const chance = chanceNext ?? chanceThis;

  const hidden: AvailabilityMarker = {
    visible: false,
    status,
    tone: "yellow",
    kind: "chance",
    badge: "",
    chanceNext,
    chanceThis,
  };

  const flaggedChance = chance != null && chance < 100;
  const available =
    (status === "a" || status === "unknown") && !flaggedChance;
  if (status === "a" && !flaggedChance) return hidden;
  if (available && status !== "unknown") return hidden;
  if (status === "unknown" && !flaggedChance) return hidden;

  if (status === "s") {
    return {
      visible: true,
      status,
      tone: "red",
      kind: "suspension",
      badge: flaggedChance && chance !== 0 ? String(chance) : "S",
      chanceNext,
      chanceThis,
    };
  }

  if (status === "i" && (chance == null || chance === 0)) {
    return {
      visible: true,
      status,
      tone: "red",
      kind: "injury",
      badge: "+",
      chanceNext,
      chanceThis,
    };
  }

  if (flaggedChance && chance != null) {
    return {
      visible: true,
      status,
      tone: toneForChance(chance),
      kind: status === "i" ? "injury" : status === "d" ? "doubt" : "chance",
      badge: String(chance),
      chanceNext,
      chanceThis,
    };
  }

  if (status === "u") {
    return {
      visible: true,
      status,
      tone: "red",
      kind: "unavailable",
      badge: "!",
      chanceNext,
      chanceThis,
    };
  }

  if (status === "n") {
    return {
      visible: true,
      status,
      tone: "muted",
      kind: "unavailable",
      badge: "n",
      chanceNext,
      chanceThis,
    };
  }

  if (status === "d" || status === "i") {
    return {
      visible: true,
      status,
      tone: status === "i" ? "red" : "yellow",
      kind: status === "i" ? "injury" : "doubt",
      badge: status === "i" ? "+" : "?",
      chanceNext,
      chanceThis,
    };
  }

  return hidden;
}

export function availabilityStatusLabel(
  lang: StatsLabLang,
  status: FplAvailabilityCode,
): string {
  const copy = COPY[lang];
  if (status === "a") return copy.available;
  if (status === "d") return copy.doubtful;
  if (status === "i") return copy.injured;
  if (status === "s") return copy.suspended;
  if (status === "u") return copy.unavailable;
  if (status === "n") return copy.notInSquad;
  return copy.unknown;
}

/** Pełny opis do tooltipa i aria-label. */
export function availabilityMarkerLabel(
  lang: StatsLabLang,
  marker: AvailabilityMarker,
): string {
  const name = availabilityStatusLabel(lang, marker.status);
  const chance = marker.chanceNext ?? marker.chanceThis;
  if (!marker.visible) return name;
  if (chance != null && chance < 100) {
    return `${name} (${marker.status}) · ${chance}%`;
  }
  return `${name} (${marker.status})`;
}

export function formatNewsAdded(
  value: string | null | undefined,
  lang: StatsLabLang,
): string | null {
  if (value == null || !String(value).trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).trim();
  return new Intl.DateTimeFormat(lang === "pl" ? "pl-PL" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function buildAvailabilityDetail(
  lang: StatsLabLang,
  input: AvailabilityInput,
): AvailabilityDetailLine[] {
  const copy = COPY[lang];
  const marker = mapAvailabilityMarker(input);
  const statusName = availabilityStatusLabel(lang, marker.status);
  const next = finiteChance(input.chanceOfPlayingNextRound);
  const flagged = marker.status !== "a";
  const thisRoundPresent = input.chanceOfPlayingThisRound !== undefined;
  const newsAddedPresent = input.newsAdded !== undefined;
  const thisChance = finiteChance(input.chanceOfPlayingThisRound);
  const news = String(input.news ?? "").trim();
  const formattedDate = formatNewsAdded(input.newsAdded, lang);

  return [
    {
      id: "status",
      label: copy.status,
      value: `${statusName} (${marker.status})`,
    },
    {
      id: "chanceNext",
      label: copy.chanceNext,
      value: next == null ? "—" : `${next}%`,
      hint: next == null && flagged ? copy.fplEmpty : undefined,
    },
    {
      id: "chanceThis",
      label: copy.chanceThis,
      value: !thisRoundPresent
        ? "—"
        : thisChance == null
          ? "—"
          : `${thisChance}%`,
      hint: !thisRoundPresent
        ? copy.missingChanceThis
        : thisChance == null && flagged
          ? copy.fplEmpty
          : undefined,
    },
    {
      id: "news",
      label: copy.news,
      value: news || copy.noNews,
    },
    {
      id: "newsAdded",
      label: copy.newsAdded,
      value: formattedDate ?? "—",
      hint: newsAddedPresent
        ? formattedDate
          ? undefined
          : copy.fplEmpty
        : copy.missingNewsAdded,
    },
  ];
}

export function availabilityFromCatalog(
  player:
    | {
        status?: string | null;
        chance_of_playing_next_round?: number | null;
        chance_of_playing_this_round?: number | null;
        news?: string | null;
        news_added?: string | null;
      }
    | null
    | undefined,
): AvailabilityInput {
  if (!player) {
    return { status: "a", chanceOfPlayingNextRound: null, news: "" };
  }
  const input: AvailabilityInput = {
    status: player.status,
    chanceOfPlayingNextRound: player.chance_of_playing_next_round ?? null,
    news: player.news ?? "",
  };
  if (
    Object.prototype.hasOwnProperty.call(
      player,
      "chance_of_playing_this_round",
    )
  ) {
    input.chanceOfPlayingThisRound = player.chance_of_playing_this_round ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(player, "news_added")) {
    input.newsAdded = player.news_added ?? null;
  }
  return input;
}

export function readFiniteChance(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function readNewsAdded(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
