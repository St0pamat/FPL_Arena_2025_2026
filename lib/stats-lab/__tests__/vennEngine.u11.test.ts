import { describe, expect, it } from "vitest";
import {
  VENN_SELECTION_CAP,
  clampVennTopN,
  defaultVennConditionsForPosition,
  selectVennRoster,
  vennConditionsAfterPositionChange,
  vennPresetIdForPosition,
  type VennCondition,
  type VennSubject,
} from "@/lib/stats-lab/vennEngine";

const CONDITIONS: [VennCondition, VennCondition, VennCondition] = [
  { id: "A", metric: "clean_sheets", threshold: 4 },
  { id: "B", metric: "goals_assists", threshold: 3 },
  { id: "C", metric: "dc_bonus_matches", threshold: 4 },
];

function player(
  id: string,
  totals: Partial<Record<string, number | null>>,
  points = 10,
  minutes = 900,
): VennSubject {
  return { id, name: id, minutes, points, totals };
}

describe("U11 TOP N diagramu Venna", () => {
  it("sortuje po liczbie warunków, potem po punktach, i ucina do limitu", () => {
    const roster = selectVennRoster({
      players: [
        player("one-high-pts", { clean_sheets: 9, goals_assists: 0, dc_bonus_matches: 0 }, 200),
        player("three-low-pts", { clean_sheets: 4, goals_assists: 3, dc_bonus_matches: 4 }, 11),
        player("two-mid", { clean_sheets: 4, goals_assists: 3, dc_bonus_matches: 0 }, 40),
        player("none", { clean_sheets: 1, goals_assists: 1, dc_bonus_matches: 1 }, 300),
        player("two-low", { clean_sheets: 4, goals_assists: 0, dc_bonus_matches: 4 }, 15),
        player("three-high-pts", { clean_sheets: 6, goals_assists: 5, dc_bonus_matches: 5 }, 12),
      ],
      conditions: CONDITIONS,
      minMinutes: 270,
      mode: "AUTO",
      limit: 4,
    });
    expect(roster.map((row) => row.id)).toEqual([
      "three-high-pts",
      "three-low-pts",
      "two-mid",
      "two-low",
    ]);
  });

  it("remis punktów rozstrzyga id, a limit 0 i powyżej 20 zostają w widełkach", () => {
    const tied = selectVennRoster({
      players: [
        player("b", { clean_sheets: 4, goals_assists: 0, dc_bonus_matches: 0 }, 10),
        player("a", { clean_sheets: 4, goals_assists: 0, dc_bonus_matches: 0 }, 10),
      ],
      conditions: CONDITIONS,
      mode: "AUTO",
      limit: 10,
    });
    expect(tied.map((row) => row.id)).toEqual(["a", "b"]);
    expect(clampVennTopN(0)).toBe(10);
    expect(clampVennTopN(99)).toBe(VENN_SELECTION_CAP);
    expect(clampVennTopN(3)).toBe(3);

    const many = Array.from({ length: 25 }, (_, index) =>
      player(
        `p${String(index).padStart(2, "0")}`,
        { clean_sheets: 4, goals_assists: index, dc_bonus_matches: index },
        index,
      ),
    );
    expect(
      selectVennRoster({
        players: many,
        conditions: CONDITIONS,
        mode: "AUTO",
        limit: 20,
      }),
    ).toHaveLength(20);
  });

  it("ręczny wybór bierze tylko zaznaczonych, w kolejności zaznaczenia, maks. 20", () => {
    const pool = [
      player("star", { clean_sheets: 8, goals_assists: 8, dc_bonus_matches: 8 }, 99),
      player("pick-b", { clean_sheets: 0, goals_assists: 0, dc_bonus_matches: 0 }, 1),
      player("pick-a", { clean_sheets: 4, goals_assists: 0, dc_bonus_matches: 0 }, 5),
      player("short", { clean_sheets: 9, goals_assists: 9, dc_bonus_matches: 9 }, 50, 10),
    ];
    const roster = selectVennRoster({
      players: pool,
      conditions: CONDITIONS,
      minMinutes: 270,
      mode: "MANUAL",
      selectedIds: ["short", "pick-b", "missing", "pick-a", "star"],
      limit: 3,
    });
    expect(roster.map((row) => row.id)).toEqual(["short", "pick-b", "pick-a", "star"]);

    const cap = selectVennRoster({
      players: Array.from({ length: 25 }, (_, index) =>
        player(`id-${index}`, { clean_sheets: 1 }, 1),
      ),
      conditions: CONDITIONS,
      mode: "MANUAL",
      selectedIds: Array.from({ length: 25 }, (_, index) => `id-${index}`),
    });
    expect(cap.map((row) => row.id)).toEqual(
      Array.from({ length: 20 }, (_, index) => `id-${index}`),
    );
  });

  it("pusty wybór ręczny działa jak TOP N, a gracza bez minut nie wciąga do auto", () => {
    const players = [
      player("ok", { clean_sheets: 5, goals_assists: 0, dc_bonus_matches: 0 }, 20),
      player("bench", { clean_sheets: 9, goals_assists: 9, dc_bonus_matches: 9 }, 80, 0),
    ];
    expect(
      selectVennRoster({
        players,
        conditions: CONDITIONS,
        minMinutes: 270,
        mode: "MANUAL",
        selectedIds: [],
        limit: 10,
      }).map((row) => row.id),
    ).toEqual(["ok"]);
    expect(
      selectVennRoster({
        players,
        conditions: CONDITIONS,
        minMinutes: 270,
        mode: "AUTO",
        limit: 10,
      }).map((row) => row.id),
    ).toEqual(["ok"]);
  });
});

describe("U11 domyślne kryteria pozycji", () => {
  it("GK, DEF, MID i FWD mają trzy progi, a zmiana pozycji je przywraca", () => {
    expect(vennPresetIdForPosition(1)).toBe("GK_WALL");
    expect(vennPresetIdForPosition(2)).toBe("COMPLETE_DEFENDER");
    expect(vennPresetIdForPosition(3)).toBe("MID_CREATORS");
    expect(vennPresetIdForPosition(4)).toBe("FWD_FINISHERS");
    expect(vennPresetIdForPosition(0)).toBeNull();

    expect(defaultVennConditionsForPosition(1)?.map((row) => [row.metric, row.threshold])).toEqual([
      ["clean_sheets", 3],
      ["saves", 20],
      ["bonus", 2],
    ]);
    expect(defaultVennConditionsForPosition(2)?.map((row) => row.metric)).toEqual([
      "clean_sheets",
      "goals_assists",
      "dc_bonus_matches",
    ]);
    expect(defaultVennConditionsForPosition(3)?.map((row) => row.metric)).toEqual([
      "goals_assists",
      "expected_goal_involvements",
      "bonus",
    ]);
    expect(defaultVennConditionsForPosition(4)?.map((row) => [row.metric, row.threshold])).toEqual([
      ["goals_scored", 4],
      ["expected_goals", 3],
      ["bonus", 3],
    ]);

    const switched = vennConditionsAfterPositionChange({
      previousPositions: [2],
      nextPositions: [4],
    });
    expect(switched?.presetId).toBe("FWD_FINISHERS");
    expect(switched?.conditions.map((row) => row.metric)).toEqual([
      "goals_scored",
      "expected_goals",
      "bonus",
    ]);
    expect(
      vennConditionsAfterPositionChange({
        previousPositions: [4],
        nextPositions: [4],
      }),
    ).toBeNull();
    expect(
      vennConditionsAfterPositionChange({
        previousPositions: [4],
        nextPositions: [],
      }),
    ).toBeNull();
  });
});
