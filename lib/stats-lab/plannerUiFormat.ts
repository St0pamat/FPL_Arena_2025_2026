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
  clubShort: string;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
}): string {
  const parts = [args.webName];
  if (args.isCaptain) {
    parts.push(args.lang === "pl" ? "kapitan" : "captain");
  } else if (args.isViceCaptain) {
    parts.push(args.lang === "pl" ? "wicekapitan" : "vice-captain");
  }
  if (args.clubShort) parts.push(args.clubShort);
  return parts.join(", ");
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
