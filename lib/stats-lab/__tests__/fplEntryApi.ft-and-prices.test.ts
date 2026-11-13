import { describe, expect, it } from "vitest";
import {
  computeSellingPriceTenths,
  reconstructFreeTransfers,
  sellingPrice,
  type UsedChipRecord,
} from "@/lib/stats-lab/fplEntryApi";
import ftFixtureJson from "@/lib/stats-lab/__tests__/fixtures/ft-cases.json";

type FtCase = {
  id: string;
  startedEvent: number;
  history: Array<{
    event: number;
    event_transfers?: number;
    event_transfers_cost?: number;
  }>;
  chips: UsedChipRecord[];
  ftTopUps: Array<{ gw: number; setTo: number }>;
  expectedFreeTransfers: number;
  expectedMismatch: boolean;
};

type FtFixtureFile = {
  ftMax: number;
  cases: FtCase[];
};

const ftFixture = ftFixtureJson as FtFixtureFile;

describe("sellingPrice / computeSellingPriceTenths", () => {
  const cases: Array<[number, number, number]> = [
    [75, 78, 76],
    [75, 76, 75],
    [75, 75, 75],
    [75, 72, 72],
    [50, 57, 53],
  ];

  it.each(cases)(
    "(%i, %i) → %i",
    (purchase, now, expected) => {
      expect(sellingPrice(purchase, now)).toBe(expected);
      expect(computeSellingPriceTenths(purchase, now)).toBe(expected);
    },
  );
});

describe("reconstructFreeTransfers (ft-cases.json)", () => {
  it.each(ftFixture.cases.map((c) => [c.id, c] as const))(
    "%s",
    (_id, c) => {
      const result = reconstructFreeTransfers({
        historyCurrent: c.history,
        usedChips: c.chips,
        startedEvent: c.startedEvent,
        ftTopUps: c.ftTopUps,
        maxFreeTransfers: ftFixture.ftMax,
      });
      expect(result.freeTransfers).toBe(c.expectedFreeTransfers);
      expect(result.ftMismatchWarning).toBe(c.expectedMismatch);
    },
  );
});

describe("budget (*Tenths integers)", () => {
  it("spendingPowerTenths = bank + Σ sellingPrice", () => {
    const bankTenths = 15;
    const picks = [
      { purchase: 75, now: 78 },
      { purchase: 50, now: 57 },
      { purchase: 75, now: 72 },
    ];
    const squadSelling = picks.reduce(
      (s, p) => s + sellingPrice(p.purchase, p.now),
      0,
    );
    expect(squadSelling).toBe(76 + 53 + 72);
    expect(Number.isInteger(squadSelling)).toBe(true);
    expect(Number.isInteger(bankTenths)).toBe(true);
    const spendingPowerTenths = bankTenths + squadSelling;
    expect(spendingPowerTenths).toBe(15 + 201);
    expect(Number.isInteger(spendingPowerTenths)).toBe(true);
  });
});
