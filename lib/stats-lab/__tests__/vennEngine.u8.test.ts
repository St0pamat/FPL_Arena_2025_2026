import { describe, expect, it } from "vitest";
import {
  VENN_PRESETS,
  VENN_REGION_IDS,
  applyVennPresetToFilter,
  assignPlayersToVennRegions,
  boxInsideVennRegion,
  boxesOverlap,
  layoutVennRegion,
  planVennTokens,
  shortenPlayerLabel,
  type VennCondition,
  type VennRegionId,
  type VennSubject,
} from "@/lib/stats-lab/vennEngine";
import { createDefaultStatsLabFilter } from "@/lib/stats-lab/presets";
import { plottedPlayerLimit } from "@/lib/stats-lab/analyticsEngine";

const CONDITIONS: [VennCondition, VennCondition, VennCondition] = [
  { id: "A", metric: "clean_sheets", threshold: 4 },
  { id: "B", metric: "goals_assists", threshold: 3 },
  { id: "C", metric: "dc_bonus_matches", threshold: 4 },
];

function player(
  id: string,
  totals: Partial<Record<string, number | null>>,
  extra: Partial<VennSubject> = {},
): VennSubject {
  return {
    id,
    name: id,
    minutes: 900,
    points: 10,
    totals,
    ...extra,
  };
}

describe("U8 przydział do 7 pól Venna", () => {
  it("wkłada graczy w A, B, C, AB, AC, BC i ABC, a puste pola zostawia puste", () => {
    const result = assignPlayersToVennRegions({
      players: [
        player("only-a", { clean_sheets: 4, goals_assists: 0, dc_bonus_matches: 0 }),
        player("only-b", { clean_sheets: 0, goals_assists: 3, dc_bonus_matches: 1 }),
        player("only-c", { clean_sheets: 1, goals_assists: 2, dc_bonus_matches: 4 }),
        player("ab", { clean_sheets: 5, goals_assists: 3, dc_bonus_matches: 0 }),
        player("ac", { clean_sheets: 4, goals_assists: 0, dc_bonus_matches: 9 }),
        player("bc", { clean_sheets: 0, goals_assists: 8, dc_bonus_matches: 4 }),
        player("abc", { clean_sheets: 7, goals_assists: 3, dc_bonus_matches: 4, total_points: 80 }),
        player("none", { clean_sheets: 3, goals_assists: 2, dc_bonus_matches: 3 }),
      ],
      conditions: CONDITIONS,
      minMinutes: 270,
    });

    expect(result.regions.A.map((p) => p.id)).toEqual(["only-a"]);
    expect(result.regions.B.map((p) => p.id)).toEqual(["only-b"]);
    expect(result.regions.C.map((p) => p.id)).toEqual(["only-c"]);
    expect(result.regions.AB.map((p) => p.id)).toEqual(["ab"]);
    expect(result.regions.AC.map((p) => p.id)).toEqual(["ac"]);
    expect(result.regions.BC.map((p) => p.id)).toEqual(["bc"]);
    expect(result.regions.ABC.map((p) => p.id)).toEqual(["abc"]);
    expect(result.none.map((p) => p.id)).toEqual(["none"]);
    expect(result.atLeastOne).toBe(7);
    expect(result.allThree).toBe(1);
    for (const id of VENN_REGION_IDS) {
      expect(Array.isArray(result.regions[id])).toBe(true);
    }
  });

  it("gracz bez minut nie wchodzi do kół i nie daje NaN", () => {
    const result = assignPlayersToVennRegions({
      players: [
        player(
          "zero",
          { clean_sheets: Number.NaN, goals_assists: undefined, dc_bonus_matches: null },
          { minutes: 0, points: Number.NaN },
        ),
        player("short", { clean_sheets: 9, goals_assists: 9, dc_bonus_matches: 9 }, { minutes: 90 }),
      ],
      conditions: CONDITIONS,
      minMinutes: 270,
    });

    expect(result.atLeastOne).toBe(0);
    expect(result.allThree).toBe(0);
    expect(result.belowMinutes.map((p) => p.id).sort()).toEqual(["short", "zero"]);
    for (const placed of result.belowMinutes) {
      expect(placed.values.every((value) => Number.isFinite(value))).toBe(true);
      expect(Number.isFinite(placed.pointsInScope)).toBe(true);
      expect(Number.isFinite(placed.minutesInScope)).toBe(true);
    }
    expect(result.belowMinutes.find((p) => p.id === "zero")?.values).toEqual([0, 0, 0]);
  });

  it("próg jest włącznie (≥) i nieskończony próg nikogo nie łapie", () => {
    const result = assignPlayersToVennRegions({
      players: [player("edge", { clean_sheets: 4, goals_assists: 2.9, dc_bonus_matches: 4 })],
      conditions: [
        { id: "A", metric: "clean_sheets", threshold: 4 },
        { id: "B", metric: "goals_assists", threshold: 3 },
        { id: "C", metric: "dc_bonus_matches", threshold: Number.NaN },
      ],
    });
    expect(result.regions.A.map((p) => p.id)).toEqual(["edge"]);
    expect(result.regions.ABC).toHaveLength(0);
    expect(result.regions.AC).toHaveLength(0);
  });

  it("sumuje tylko kolejki z podanego zakresu", () => {
    const rows = [
      { gameweek: 2, minutes: 90, values: { clean_sheets: 1, goals_assists: 1, dc_bonus_matches: 1 } },
      { gameweek: 5, minutes: 90, values: { clean_sheets: 1, goals_assists: 0, dc_bonus_matches: 1 } },
      { gameweek: 9, minutes: 90, values: { clean_sheets: 3, goals_assists: 4, dc_bonus_matches: 3 } },
    ];
    const early = assignPlayersToVennRegions({
      players: [{ id: "gw", name: "Gw", rows }],
      conditions: CONDITIONS,
      gwFrom: 1,
      gwTo: 6,
      minMinutes: 1,
    });
    expect(early.regions.A).toHaveLength(0);
    expect(early.none[0]?.values).toEqual([2, 1, 2]);
    expect(early.none[0]?.minutesInScope).toBe(180);

    const full = assignPlayersToVennRegions({
      players: [{ id: "gw", name: "Gw", rows }],
      conditions: CONDITIONS,
      gwFrom: 1,
      gwTo: 10,
      minMinutes: 1,
    });
    expect(full.regions.ABC.map((p) => p.id)).toEqual(["gw"]);
    expect(full.regions.ABC[0]?.values).toEqual([5, 5, 5]);
  });

  it("w polu zostawia najlepszych: suma metryk, potem punkty", () => {
    const result = assignPlayersToVennRegions({
      players: [
        player("low", { clean_sheets: 4, goals_assists: 0, dc_bonus_matches: 0 }, { points: 90 }),
        player("high", { clean_sheets: 8, goals_assists: 0, dc_bonus_matches: 0 }, { points: 10 }),
        player("tie-b", { clean_sheets: 5, goals_assists: 0, dc_bonus_matches: 0 }, { points: 20 }),
        player("tie-a", { clean_sheets: 5, goals_assists: 0, dc_bonus_matches: 0 }, { points: 40 }),
      ],
      conditions: CONDITIONS,
    });
    expect(result.regions.A.map((p) => p.id)).toEqual(["high", "tie-a", "tie-b", "low"]);
  });
});

describe("U8 układ żetonów", () => {
  it("w każdym polu jest licznik wewnątrz, a żetony się nie nakładają", () => {
    for (const region of VENN_REGION_IDS) {
      const layout = layoutVennRegion(region);
      const countBox = { x: layout.count.x, y: layout.count.y, hw: 26, hh: 10 };
      expect(boxInsideVennRegion(countBox, region), region).toBe(true);
      expect(layout.slots.length, region).toBeGreaterThan(0);
      const box = region === "ABC" ? { hw: 34, hh: 20 } : { hw: 28, hh: 15 };
      const placed = [
        countBox,
        ...layout.slots.map((slot) => ({ ...slot, ...box })),
      ];
      for (const slot of layout.slots) {
        expect(boxInsideVennRegion({ ...slot, ...box }, region), region).toBe(
          true,
        );
      }
      for (let i = 0; i < placed.length; i += 1) {
        for (let j = i + 1; j < placed.length; j += 1) {
          expect(boxesOverlap(placed[i], placed[j]), region).toBe(false);
        }
      }
      const again = layoutVennRegion(region);
      expect(again).toEqual(layout);
    }
  });

  it("przy nadmiarze zostawia slot na +N", () => {
    const region: VennRegionId = "A";
    const cap = layoutVennRegion(region).slots.length;
    const plan = planVennTokens(region, cap + 5);
    expect(plan.shown).toBe(cap - 1);
    expect(plan.overflow).toBe(5 + 1);
    expect(plan.slots).toHaveLength(cap);
    expect(planVennTokens(region, 0)).toEqual({
      shown: 0,
      overflow: 0,
      slots: [],
    });
  });

  it("skraca długie nazwisko wielokropkiem, krótkiego nie rusza", () => {
    expect(shortenPlayerLabel("Vuskovic")).toBe("Vuskovic");
    expect(shortenPlayerLabel("Alexander-Arnold")).toBe("Alexander-A…");
    expect(shortenPlayerLabel("Alexander-Arnold").endsWith("…")).toBe(true);
  });
});

describe("U8 preset i limit puli", () => {
  it("kompletny obrońca ustawia pozycję, minuty i pełną pulę", () => {
    const preset = VENN_PRESETS[0];
    expect(preset.id).toBe("COMPLETE_DEFENDER");
    expect(preset.conditions.map((c) => [c.metric, c.threshold])).toEqual([
      ["clean_sheets", 4],
      ["goals_assists", 3],
      ["dc_bonus_matches", 4],
    ]);
    const next = applyVennPresetToFilter(
      {
        ...createDefaultStatsLabFilter("2025/26"),
        period: { mode: "CUSTOM_RANGE", gwFrom: 1, gwTo: 10 },
        clubIds: [1],
        maxCostTenths: 60,
      },
      "COMPLETE_DEFENDER",
    );
    expect(next.positions).toEqual([2]);
    expect(next.minMinutes).toBe(270);
    expect(next.returnAllEligible).toBe(true);
    expect(next.per90).toBe(false);
    expect(next.period).toEqual({ mode: "CUSTOM_RANGE", gwFrom: 1, gwTo: 10 });
    expect(next.clubIds).toEqual([1]);
    expect(next.maxCostTenths).toBe(60);
    expect(VENN_PRESETS.map((p) => p.id)).toEqual([
      "COMPLETE_DEFENDER",
      "MID_CREATORS",
      "FWD_FINISHERS",
      "GK_WALL",
    ]);
  });

  it("pełna pula Venna nie tnie do Top N, inne wykresy tak", () => {
    expect(plottedPlayerLimit({ returnAllEligible: true, limitPlayers: 10 }, 80)).toBe(80);
    expect(plottedPlayerLimit({ limitPlayers: 10 }, 80)).toBe(10);
    expect(plottedPlayerLimit({ limitPlayers: 99 }, 80)).toBe(50);
  });
});
