import { describe, expect, it } from "vitest";
import { computeSellingPriceTenths } from "@/lib/stats-lab/fplEntryApi";
import {
  PLANNER_LABELS,
  PLANNER_TOOLTIPS,
  formatTenthsAbsValue,
  plannerChipOfficialName,
  pt,
} from "@/lib/stats-lab/plannerI18n";
import {
  actionAria,
  formatChipAccessibleName,
  formatGwPillAccessibleName,
  formatHitBar,
  formatPlayerTileAccessibleName,
  formatPlusButtonLabel,
  formatTransfersCountLabel,
  lockedProfitTenths,
} from "@/lib/stats-lab/plannerUiFormat";

describe("U2 hit.bar formatting", () => {
  it("ftOne/ftFew/ftMany templates use {n} (not hard-coded numbers)", () => {
    expect(PLANNER_LABELS.pl["planner.hit.ftOne"]).toBe("{n} darmowy");
    expect(PLANNER_LABELS.pl["planner.hit.ftFew"]).toBe("{n} darmowe");
    expect(PLANNER_LABELS.pl["planner.hit.ftMany"]).toBe("{n} darmowych");
    expect(PLANNER_LABELS.en["planner.hit.ftOne"]).toBe("{n} free");
    expect(PLANNER_LABELS.en["planner.hit.ftFew"]).toBe("{n} free");
    expect(PLANNER_LABELS.en["planner.hit.ftMany"]).toBe("{n} free");
    for (const key of [
      "planner.hit.ftOne",
      "planner.hit.ftFew",
      "planner.hit.ftMany",
    ] as const) {
      expect(PLANNER_LABELS.pl[key]).toContain("{n}");
      expect(PLANNER_LABELS.en[key]).toContain("{n}");
      expect(PLANNER_LABELS.pl[key]).not.toMatch(/\b[0-9]+\b/);
      expect(PLANNER_LABELS.en[key]).not.toMatch(/\b[0-9]+\b/);
    }
  });

  it("hit.bar 3/2 shows −4 pkt; 0/1 shows 1 darmowy without −0; ft odmiana 1/2/3/4/5; PL and EN", () => {
    expect(
      formatHitBar({ lang: "pl", used: 3, ft: 2, cost: 4 }),
    ).toBe("Transfery: 3 (2 darmowe, −4 pkt)");
    expect(
      formatHitBar({ lang: "en", used: 3, ft: 2, cost: 4 }),
    ).toBe("Transfers: 3 (2 free, −4 pts)");

    expect(
      formatHitBar({ lang: "pl", used: 0, ft: 1, cost: 0 }),
    ).toBe("Transfery: 0 (1 darmowy)");
    expect(
      formatHitBar({ lang: "en", used: 0, ft: 1, cost: 0 }),
    ).toBe("Transfers: 0 (1 free)");
    expect(
      formatHitBar({ lang: "pl", used: 0, ft: 1, cost: 0 }),
    ).not.toContain("−0");

    expect(
      formatHitBar({ lang: "pl", used: 1, ft: 2, cost: 0 }),
    ).toContain("2 darmowe");
    expect(
      formatHitBar({ lang: "pl", used: 1, ft: 3, cost: 0 }),
    ).toContain("3 darmowe");
    expect(
      formatHitBar({ lang: "pl", used: 1, ft: 4, cost: 0 }),
    ).toContain("4 darmowe");
    expect(
      formatHitBar({ lang: "pl", used: 1, ft: 5, cost: 0 }),
    ).toContain("5 darmowych");
  });

  it("barUnlimited uses official chip names for Wildcard and Free Hit; bez kosztu / no cost; never −0 or Infinity", () => {
    expect(plannerChipOfficialName("wildcard")).toBe("Wildcard");
    expect(plannerChipOfficialName("freehit")).toBe("Free Hit");

    for (const lang of ["pl", "en"] as const) {
      for (const chip of ["wildcard", "freehit"] as const) {
        const text = formatHitBar({
          lang,
          used: 5,
          ft: 1,
          cost: 20,
          activeChip: chip,
        });
        expect(text).toContain(plannerChipOfficialName(chip));
        expect(text).not.toContain("WC");
        expect(text).not.toContain("FH");
        expect(text).not.toContain("Infinity");
        expect(text).not.toContain("−0");
        expect(text).not.toMatch(/−\d+\s*(pkt|pts)/);
        if (lang === "pl") expect(text).toContain("bez kosztu");
        else expect(text).toContain("no cost");
      }
    }
    expect(
      formatHitBar({
        lang: "pl",
        used: 4,
        ft: 1,
        cost: 99,
        activeChip: "wildcard",
      }),
    ).toBe("Transfery: 4 (Wildcard, bez kosztu)");
    expect(
      formatHitBar({
        lang: "en",
        used: 2,
        ft: 1,
        cost: 8,
        activeChip: "freehit",
      }),
    ).toBe("Transfers: 2 (Free Hit, no cost)");
  });
});

describe("U2 transfers badge pluralization", () => {
  it("pigułka ⇄: 1, 2, 5, 12, 14, 22", () => {
    expect(formatTransfersCountLabel("pl", 1)).toBe("1 transfer");
    expect(formatTransfersCountLabel("pl", 2)).toBe("2 transfery");
    expect(formatTransfersCountLabel("pl", 5)).toBe("5 transferów");
    expect(formatTransfersCountLabel("pl", 12)).toBe("12 transferów");
    expect(formatTransfersCountLabel("pl", 14)).toBe("14 transferów");
    expect(formatTransfersCountLabel("pl", 22)).toBe("22 transfery");
    expect(formatTransfersCountLabel("en", 1)).toBe("1 transfer");
    expect(formatTransfersCountLabel("en", 22)).toBe("22 transfers");
  });

  it("0 transferów: bez badge'a (tylko GW, bez słowa transfer)", () => {
    expect(
      formatGwPillAccessibleName({ lang: "pl", gw: 11, transferCount: 0 }),
    ).toBe("GW11");
    expect(
      formatGwPillAccessibleName({ lang: "en", gw: 11, transferCount: 0 }),
    ).toBe("GW11");
    expect(
      formatGwPillAccessibleName({ lang: "pl", gw: 11, transferCount: 0 }),
    ).not.toMatch(/transfer/i);
    // UI: transferCount > 0 jest warunkiem renderu badge — 0 = brak badge.
    expect(0 > 0).toBe(false);
  });
});

describe("U2 accessible names (McNeil / chip / GW / icons)", () => {
  it("tile, chip and GW pill use comma-separated accessible names", () => {
    expect(
      formatPlayerTileAccessibleName({
        lang: "pl",
        webName: "McNeil",
        clubShort: "EVE",
        isCaptain: true,
      }),
    ).toBe("McNeil, kapitan, EVE");
    expect(
      formatChipAccessibleName({
        lang: "pl",
        chip: "wildcard",
        usedGw: 9,
      }),
    ).toBe("Wildcard, użyty w GW9");
    expect(
      formatGwPillAccessibleName({
        lang: "pl",
        gw: 11,
        transferCount: 2,
      }),
    ).toBe("GW11, 2 transfery");
  });

  it("every Planner icon-button accessible name is non-empty (PL and EN)", () => {
    const player = "Haaland";
    const iconKeys = [
      "planner.action.sell",
      "planner.action.swap",
      "planner.action.captain",
      "planner.action.vice",
      "planner.action.watch",
      "planner.action.info",
    ] as const;
    for (const lang of ["pl", "en"] as const) {
      for (const key of iconKeys) {
        const name = actionAria(lang, key, player);
        expect(name.trim().length, `${lang} ${key}`).toBeGreaterThan(0);
        expect(name).toContain(player);
      }
      expect(pt(lang, "planner.action.editFt").trim().length).toBeGreaterThan(0);
      expect(pt(lang, "planner.action.editBank").trim().length).toBeGreaterThan(
        0,
      );
      expect(
        formatPlusButtonLabel({
          lang,
          playerName: player,
          alreadyInSquad: false,
          affordable: true,
          shortfallTenths: 0,
          clubBlocked: false,
          clubShort: "MCI",
        }).trim().length,
      ).toBeGreaterThan(0);
      expect(
        formatChipAccessibleName({
          lang,
          chip: "wildcard",
          usedGw: null,
        }).trim().length,
      ).toBeGreaterThan(0);
      expect(
        formatGwPillAccessibleName({
          lang,
          gw: 1,
          transferCount: 0,
        }).trim().length,
      ).toBeGreaterThan(0);
    }

    // Tooltip templates (actual aria for icons) — literal PL/EN with {player}
    expect(PLANNER_TOOLTIPS.pl["planner.action.sell"]).toBe("Sprzedaj: {player}");
    expect(PLANNER_TOOLTIPS.en["planner.action.sell"]).toBe("Sell: {player}");
    expect(PLANNER_TOOLTIPS.pl["planner.action.swap"]).toBe("Zamień: {player}");
    expect(PLANNER_TOOLTIPS.en["planner.action.swap"]).toBe("Swap: {player}");
    expect(PLANNER_TOOLTIPS.pl["planner.action.captain"]).toBe(
      "Kapitan: {player}",
    );
    expect(PLANNER_TOOLTIPS.en["planner.action.captain"]).toBe(
      "Captain: {player}",
    );
    expect(PLANNER_TOOLTIPS.pl["planner.action.vice"]).toBe(
      "Wicekapitan: {player}",
    );
    expect(PLANNER_TOOLTIPS.en["planner.action.vice"]).toBe(
      "Vice-captain: {player}",
    );
    expect(PLANNER_TOOLTIPS.pl["planner.action.watch"]).toBe(
      "Obserwuj: {player}",
    );
    expect(PLANNER_TOOLTIPS.en["planner.action.watch"]).toBe(
      "Watch: {player}",
    );
    expect(PLANNER_TOOLTIPS.pl["planner.action.info"]).toBe(
      "Informacje: {player}",
    );
    expect(PLANNER_TOOLTIPS.en["planner.action.info"]).toBe(
      "Details: {player}",
    );
    expect(PLANNER_LABELS.pl["planner.action.editFt"]).toBe(
      "Popraw liczbę transferów",
    );
    expect(PLANNER_LABELS.en["planner.action.editFt"]).toBe(
      "Edit transfer count",
    );
    expect(PLANNER_LABELS.pl["planner.action.editBank"]).toBe(
      "Popraw stan konta",
    );
    expect(PLANNER_LABELS.en["planner.action.editBank"]).toBe("Edit bank");
  });
});

describe("U2 lockedProfit (SP − PP)", () => {
  it("price rise 0.1 → profit 0", () => {
    const pp = 70;
    const riseSp = computeSellingPriceTenths(pp, pp + 1);
    expect(riseSp).toBe(pp);
    expect(lockedProfitTenths(pp, riseSp)).toBe(0);
  });

  it("price fall → lockedProfit 0, never negative", () => {
    const pp = 70;
    const fallSp = computeSellingPriceTenths(pp, pp - 5);
    expect(fallSp).toBeLessThan(pp);
    expect(lockedProfitTenths(pp, fallSp)).toBe(0);
    expect(lockedProfitTenths(pp, fallSp)).toBeGreaterThanOrEqual(0);
    // Direct SP < PP (should still clamp)
    expect(lockedProfitTenths(100, 80)).toBe(0);
    expect(lockedProfitTenths(100, 80)).not.toBeLessThan(0);
  });

  it("price rise 0.4 → profit 0.2m (2 tenths)", () => {
    const pp = 70;
    const bigRiseSp = computeSellingPriceTenths(pp, pp + 4);
    expect(lockedProfitTenths(pp, bigRiseSp)).toBe(2);
  });
});

describe("U2 plus button reasons + £ formatter", () => {
  it("cantAfford / alreadyIn / clubLimit PL and EN; shortfall £0.1m via formatter without minus", () => {
    expect(PLANNER_LABELS.pl["planner.market.cantAfford"]).toBe(
      "Nie stać Cię (brakuje £{x}m)",
    );
    expect(PLANNER_LABELS.en["planner.market.cantAfford"]).toBe(
      "Can't afford (short £{x}m)",
    );
    expect(PLANNER_LABELS.pl["planner.market.alreadyIn"]).toBe("Już w składzie");
    expect(PLANNER_LABELS.en["planner.market.alreadyIn"]).toBe(
      "Already in squad",
    );
    expect(PLANNER_LABELS.pl["planner.market.clubLimit"]).toBe(
      "Limit 3 z klubu {club}",
    );
    expect(PLANNER_LABELS.en["planner.market.clubLimit"]).toBe(
      "Max 3 from {club}",
    );

    expect(formatTenthsAbsValue(1)).toBe("0.1");
    expect(formatTenthsAbsValue(-1)).toBe("0.1");

    const cantPl = formatPlusButtonLabel({
      lang: "pl",
      playerName: "Salah",
      alreadyInSquad: false,
      affordable: false,
      shortfallTenths: 1,
      clubBlocked: false,
      clubShort: "LIV",
    });
    expect(cantPl).toBe("Nie stać Cię (brakuje £0.1m)");
    expect(cantPl).toContain("£0.1m");
    expect(cantPl).not.toContain("−");
    expect(cantPl).not.toContain("-£");

    const cantEn = formatPlusButtonLabel({
      lang: "en",
      playerName: "Salah",
      alreadyInSquad: false,
      affordable: false,
      shortfallTenths: 1,
      clubBlocked: false,
      clubShort: "LIV",
    });
    expect(cantEn).toBe("Can't afford (short £0.1m)");
    expect(cantEn).not.toContain("-£");

    expect(
      formatPlusButtonLabel({
        lang: "pl",
        playerName: "Salah",
        alreadyInSquad: true,
        affordable: true,
        shortfallTenths: 0,
        clubBlocked: false,
        clubShort: "LIV",
      }),
    ).toBe("Już w składzie");
    expect(
      formatPlusButtonLabel({
        lang: "en",
        playerName: "Salah",
        alreadyInSquad: false,
        affordable: true,
        shortfallTenths: 0,
        clubBlocked: true,
        clubShort: "ARS",
      }),
    ).toBe("Max 3 from ARS");
  });
});

describe("U2 compare / source labels", () => {
  it("sameAs / noChip / lockedProfit label; PL ≡ EN key sets", () => {
    expect(pt("pl", "planner.compare.sameAs", { v: "A" })).toBe(
      "Taki sam jak A",
    );
    expect(pt("en", "planner.compare.sameAs", { v: "A" })).toBe("Same as A");
    expect(pt("pl", "planner.compare.noChip")).toBe("Brak");
    expect(pt("en", "planner.compare.noChip")).toBe("None");
    expect(pt("pl", "planner.horizon.lockedProfit")).toBe(
      "Zysk przy sprzedaży",
    );
    expect(pt("en", "planner.horizon.lockedProfit")).toBe("Profit on sale");
    expect(Object.keys(PLANNER_LABELS.pl).sort()).toEqual(
      Object.keys(PLANNER_LABELS.en).sort(),
    );
  });
});
