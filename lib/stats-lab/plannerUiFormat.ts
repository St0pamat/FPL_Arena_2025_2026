/**
 * Helpery prezentacji Planera (U2) — odmiany PL, hit.bar, aria, ławka.
 * Zero logiki kosztów/xPts — tylko formatowanie tekstów.
 */

import { shellLabel, type StatsLabLang } from "@/lib/stats-lab/i18n";
import {
  formatTenthsAbsValue,
  plannerChipOfficialName,
  pt,
  ptTip,
  type PlannerChipType,
} from "@/lib/stats-lab/plannerI18n";

/** Klasyczna odmiana PL: 1 / 2–4 (bez 12–14) / reszta. */
export function polishCountForm(n: number): "one" | "few" | "many" {
  const abs = Math.abs(Math.round(n));
  if (abs === 1) return "one";
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "few";
  }
  return "many";
}

export function formatFtPhrase(lang: StatsLabLang, ft: number): string {
  const n = Math.max(0, Math.round(ft));
  if (lang === "en") {
    return pt(lang, "planner.hit.ftPhrase", { n });
  }
  const form = polishCountForm(n);
  if (form === "one") return pt(lang, "planner.hit.ftOne", { n });
  if (form === "few") return pt(lang, "planner.hit.ftFew", { n });
  return pt(lang, "planner.hit.ftMany", { n });
}

export function formatHitBar(args: {
  lang: StatsLabLang;
  used: number;
  ft: number;
  cost: number;
  activeChip?: PlannerChipType | string | null;
}): string {
  const { lang, used, ft, cost, activeChip } = args;
  if (activeChip === "wildcard" || activeChip === "freehit") {
    return pt(lang, "planner.hit.barUnlimited", {
      used,
      chip: plannerChipOfficialName(String(activeChip)),
    });
  }
  const ftPhrase = formatFtPhrase(lang, ft);
  if (cost > 0) {
    return pt(lang, "planner.hit.bar", {
      used,
      ft: ftPhrase,
      cost,
    });
  }
  return pt(lang, "planner.hit.barNoHit", { used, ft: ftPhrase });
}

export function formatTransfersCountLabel(
  lang: StatsLabLang,
  n: number,
): string {
  const count = Math.max(0, Math.round(n));
  if (lang === "en") {
    return count === 1
      ? pt(lang, "planner.gw.transfersOne", { n: count })
      : pt(lang, "planner.gw.transfersMany", { n: count });
  }
  const form = polishCountForm(count);
  if (form === "one") return pt(lang, "planner.gw.transfersOne", { n: count });
  if (form === "few") return pt(lang, "planner.gw.transfersFew", { n: count });
  return pt(lang, "planner.gw.transfersMany", { n: count });
}

export function formatTransfersBadgeTooltip(
  lang: StatsLabLang,
  n: number,
): string {
  return pt(lang, "planner.gw.transfersTip", {
    label: formatTransfersCountLabel(lang, n),
  });
}

export function formatBenchSlotLabel(
  lang: StatsLabLang,
  slot: number,
): string {
  if (slot === 12) return pt(lang, "planner.bench.gkp");
  if (slot === 13) return pt(lang, "planner.bench.outfield", { n: 1 });
  if (slot === 14) return pt(lang, "planner.bench.outfield", { n: 2 });
  if (slot === 15) return pt(lang, "planner.bench.outfield", { n: 3 });
  return pt(lang, "planner.bench.outfield", { n: Math.max(1, slot - 12) });
}

/** Zysk przy sprzedaży: max(0, SP − PP). */
export function lockedProfitTenths(
  purchasePriceTenths: number,
  sellingPriceTenths: number,
): number {
  return Math.max(
    0,
    Math.round(sellingPriceTenths) - Math.round(purchasePriceTenths),
  );
}

export function formatPlusButtonLabel(args: {
  lang: StatsLabLang;
  playerName: string;
  alreadyInSquad: boolean;
  affordable: boolean;
  shortfallTenths: number;
  clubBlocked: boolean;
  clubShort: string;
}): string {
  const { lang, playerName, alreadyInSquad, affordable, clubBlocked } = args;
  if (alreadyInSquad) return pt(lang, "planner.market.alreadyIn");
  if (!affordable) {
    return pt(lang, "planner.market.cantAfford", {
      x: formatTenthsAbsValue(args.shortfallTenths),
    });
  }
  if (clubBlocked) {
    return pt(lang, "planner.market.clubLimit", { club: args.clubShort });
  }
  return pt(lang, "planner.market.add", { player: playerName });
}

export function formatPlayerTileAccessibleName(args: {
  lang: StatsLabLang;
  webName: string;
  /** Imię i nazwisko. Gdy różni się od web_name, trafia do aria-label. */
  fullName?: string | null;
  clubShort: string;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  benchLabel?: string | null;
}): string {
  const web = args.webName.trim();
  const full = args.fullName?.trim() ?? "";
  const spoken =
    full && full.toLowerCase() !== web.toLowerCase() ? full : web;
  const parts = [spoken];
  if (args.isCaptain) {
    parts.push(args.lang === "pl" ? "kapitan" : "captain");
  } else if (args.isViceCaptain) {
    parts.push(args.lang === "pl" ? "wicekapitan" : "vice-captain");
  }
  if (args.clubShort) parts.push(args.clubShort);
  if (args.benchLabel) parts.push(args.benchLabel);
  return parts.join(", ");
}

/**
 * Pełne imię i nazwisko do Info i aria-label.
 * Gdy katalog ma first === second === web_name (fixture testowe), zostaje web_name.
 */
export function plannerDisplayFullName(
  player:
    | {
        web_name?: string | null;
        first_name?: string | null;
        second_name?: string | null;
      }
    | null
    | undefined,
): string {
  const web = String(player?.web_name ?? "").trim();
  const first = String(player?.first_name ?? "").trim();
  const second = String(player?.second_name ?? "").trim();
  if (!first && !second) return web;
  if (
    first &&
    second &&
    first.toLowerCase() === second.toLowerCase()
  ) {
    return web || first;
  }
  const full = [first, second].filter(Boolean).join(" ");
  return full || web;
}

/** xPts na karcie: BGW = 0, DGW = suma meczów, brak liczby = 0 (nigdy NaN). */
export function cardDisplayedXPts(
  proj:
    | {
        isBlank?: boolean;
        xPts?: number;
        fixtures?: Array<{ matchXPts?: number }>;
      }
    | null
    | undefined,
): number {
  if (!proj || proj.isBlank) return 0;
  const fixtures = proj.fixtures ?? [];
  if (fixtures.length > 0) {
    let sum = 0;
    for (const fx of fixtures) {
      const n = Number(fx.matchXPts);
      if (Number.isFinite(n)) sum += n;
    }
    return Number.isFinite(sum) ? sum : 0;
  }
  const n = Number(proj.xPts);
  return Number.isFinite(n) ? n : 0;
}

export function formatCardXPts(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.0";
  return n.toFixed(1);
}

export type CardFdrDot = { gw: number; fdrLevel: number | null };

/** Trzy kropki FDR kolejnych kolejek. Brak meczu = null (szara kropka). */
export function cardNextFdrDots(
  byGw:
    | Record<
        number,
        | {
            isBlank?: boolean;
            fixtures?: Array<{ fdrLevel?: number }>;
          }
        | undefined
      >
    | undefined,
  currentGw: number,
): CardFdrDot[] {
  const dots: CardFdrDot[] = [];
  for (let offset = 1; offset <= 3; offset += 1) {
    const gw = currentGw + offset;
    const proj = byGw?.[gw];
    if (!proj || proj.isBlank || !proj.fixtures?.length) {
      dots.push({ gw, fdrLevel: null });
      continue;
    }
    let max = 0;
    let any = false;
    for (const fx of proj.fixtures) {
      const n = Number(fx.fdrLevel);
      if (!Number.isFinite(n)) continue;
      any = true;
      if (n > max) max = n;
    }
    dots.push({ gw, fdrLevel: any ? max : null });
  }
  return dots;
}

export type PitchLineKey = "gk" | "def" | "mid" | "fwd";

const PITCH_LINE_MAX: Record<PitchLineKey, number> = {
  gk: 1,
  def: 5,
  mid: 5,
  fwd: 3,
};

/**
 * Rzędy boiska. Pusty slot (brak picka, elementType null) zostaje w linii,
 * żeby 14 zawodników pokazało wolne miejsce zamiast zniknąć.
 */
export function groupPitchSlots(
  slots: Array<{ slot: number; elementType: 1 | 2 | 3 | 4 | null }>,
): Record<PitchLineKey, number[]> {
  const lines: Record<PitchLineKey, number[]> = {
    gk: [],
    def: [],
    mid: [],
    fwd: [],
  };
  const empty: number[] = [];
  for (const row of slots) {
    if (row.slot < 1 || row.slot > 11) continue;
    if (row.elementType === 1) lines.gk.push(row.slot);
    else if (row.elementType === 2) lines.def.push(row.slot);
    else if (row.elementType === 3) lines.mid.push(row.slot);
    else if (row.elementType === 4) lines.fwd.push(row.slot);
    else empty.push(row.slot);
  }
  const order: PitchLineKey[] = ["gk", "def", "mid", "fwd"];
  for (const slot of empty) {
    let placed: PitchLineKey | null = null;
    for (const key of order) {
      const band = lines[key];
      if (!band.length || band.length >= PITCH_LINE_MAX[key]) continue;
      const min = Math.min(...band);
      const max = Math.max(...band);
      if (slot >= min && slot <= max) {
        placed = key;
        break;
      }
    }
    if (!placed) {
      let best: PitchLineKey = slot === 1 ? "gk" : "fwd";
      let bestDist = Infinity;
      for (const key of order) {
        if (lines[key].length >= PITCH_LINE_MAX[key]) continue;
        const anchor = lines[key].length
          ? Math.min(...lines[key])
          : key === "gk"
            ? 1
            : key === "def"
              ? 3
              : key === "mid"
                ? 7
                : 10;
        const dist = Math.abs(anchor - slot);
        if (dist < bestDist) {
          bestDist = dist;
          best = key;
        }
      }
      placed = best;
    }
    lines[placed].push(slot);
  }
  for (const key of order) lines[key].sort((a, b) => a - b);
  if (!lines.gk.length) lines.gk = [1];
  return lines;
}

/** Krótka etykieta nad kartą ławki: BR/1/2/3 (PL) albo GK/1/2/3 (EN). */
export function formatBenchSlotChipLabel(
  lang: StatsLabLang,
  slot: number,
): string {
  if (slot === 12) return pt(lang, "planner.bench.chipGkp");
  const n =
    slot === 13 ? 1 : slot === 14 ? 2 : slot === 15 ? 3 : Math.max(1, slot - 12);
  return pt(lang, "planner.bench.chipOut", { n });
}

export function formatChipAccessibleName(args: {
  lang: StatsLabLang;
  chip: PlannerChipType | string;
  usedGw: number | null;
}): string {
  const name = plannerChipOfficialName(String(args.chip));
  if (args.usedGw != null) {
    const status =
      args.lang === "pl"
        ? `użyty w GW${args.usedGw}`
        : `used in GW${args.usedGw}`;
    return `${name}, ${status}`;
  }
  const available = pt(args.lang, "chip.available");
  return `${name}, ${available.charAt(0).toLowerCase()}${available.slice(1)}`;
}

export function formatGwPillAccessibleName(args: {
  lang: StatsLabLang;
  gw: number;
  transferCount: number;
}): string {
  const gwPart = `GW${args.gw}`;
  if (args.transferCount <= 0) return gwPart;
  return `${gwPart}, ${formatTransfersCountLabel(args.lang, args.transferCount)}`;
}

export function actionAria(
  lang: StatsLabLang,
  key:
    | "planner.action.sell"
    | "planner.action.swap"
    | "planner.action.captain"
    | "planner.action.vice"
    | "planner.action.watch"
    | "planner.action.unwatch"
    | "planner.action.info",
  player: string,
): string {
  return ptTip(lang, key, { player });
}

/**
 * Katalog nazw dostępnych wszystkich button / [role=button] Planera (U3).
 * Używane w teście a11y — każdy wpis musi być niepusty w PL i EN.
 */
export function listPlannerControlAccessibleNames(
  lang: StatsLabLang,
): Array<{ id: string; name: string }> {
  const player = "Haaland";
  const out: Array<{ id: string; name: string }> = [];

  const iconKeys = [
    "planner.action.sell",
    "planner.action.swap",
    "planner.action.captain",
    "planner.action.vice",
    "planner.action.watch",
    "planner.action.unwatch",
    "planner.action.info",
  ] as const;
  for (const key of iconKeys) {
    out.push({ id: key, name: actionAria(lang, key, player) });
  }

  out.push({
    id: "plus.enabled",
    name: formatPlusButtonLabel({
      lang,
      playerName: player,
      alreadyInSquad: false,
      affordable: true,
      shortfallTenths: 0,
      clubBlocked: false,
      clubShort: "MCI",
    }),
  });
  out.push({
    id: "plus.cantAfford",
    name: formatPlusButtonLabel({
      lang,
      playerName: player,
      alreadyInSquad: false,
      affordable: false,
      shortfallTenths: 15,
      clubBlocked: false,
      clubShort: "MCI",
    }),
  });
  out.push({
    id: "plus.alreadyIn",
    name: formatPlusButtonLabel({
      lang,
      playerName: player,
      alreadyInSquad: true,
      affordable: true,
      shortfallTenths: 0,
      clubBlocked: false,
      clubShort: "MCI",
    }),
  });
  out.push({
    id: "plus.clubLimit",
    name: formatPlusButtonLabel({
      lang,
      playerName: player,
      alreadyInSquad: false,
      affordable: true,
      shortfallTenths: 0,
      clubBlocked: true,
      clubShort: "MCI",
    }),
  });

  out.push({ id: "gw.prev", name: ptTip(lang, "planner.gw.prev") });
  out.push({ id: "gw.next", name: ptTip(lang, "planner.gw.next") });
  out.push({
    id: "gw.pill",
    name: formatGwPillAccessibleName({ lang, gw: 11, transferCount: 2 }),
  });

  for (const chip of ["wildcard", "freehit", "bboost", "3xc"] as const) {
    out.push({
      id: `chip.${chip}`,
      name: formatChipAccessibleName({ lang, chip, usedGw: null }),
    });
  }

  out.push({ id: "edit.ft", name: pt(lang, "planner.action.editFt") });
  out.push({ id: "edit.bank", name: pt(lang, "planner.action.editBank") });
  out.push({ id: "action.undo", name: pt(lang, "planner.action.undo") });
  out.push({ id: "action.optimise", name: pt(lang, "planner.action.optimise") });
  out.push({ id: "action.resetGw", name: pt(lang, "planner.action.resetGw") });
  out.push({
    id: "action.resetPlan",
    name: pt(lang, "planner.action.resetPlan"),
  });
  out.push({ id: "load.squad", name: pt(lang, "planner.loadSquad") });
  out.push({
    id: "variant.A",
    name: pt(lang, "planner.variant.label", { id: "A" }),
  });
  out.push({
    id: "variant.compare",
    name: pt(lang, "planner.variant.compare"),
  });
  out.push({
    id: "horizon.tab.fixturesPts",
    name: pt(lang, "planner.horizon.tab.fixturesPts"),
  });
  out.push({
    id: "horizon.tab.ptsOnly",
    name: pt(lang, "planner.horizon.tab.ptsOnly"),
  });
  out.push({
    id: "horizon.tab.minutes",
    name: pt(lang, "planner.horizon.tab.minutes"),
  });
  out.push({
    id: "horizon.tab.prices",
    name: pt(lang, "planner.horizon.tab.prices"),
  });
  out.push({
    id: "role.badgeTC.aria",
    name: pt(lang, "planner.role.badgeTC.aria"),
  });
  // Theme switcher żyje w shell Stats Lab — ta sama etykieta aria w PL/EN.
  out.push({
    id: "shell.aria.theme",
    name: shellLabel(lang, "shell.aria.theme"),
  });

  return out;
}
