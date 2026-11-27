import { describe, expect, it } from "vitest";
import {
  formatCsText,
  formatFdrColumn,
  horizonXptsSum,
  playerProjectionsToCsv,
  queryPlayerProjectionTable,
  type PlayerGwSlice,
  type PlayerProjectionInput,
  type PlayerProjectionQuery,
} from "@/lib/stats-lab/playerProjectionTable";

function gw(patch: Partial<PlayerGwSlice> & Pick<PlayerGwSlice, "gw">): PlayerGwSlice {
  return {
    isBlank: false,
    xPts: 4,
    p60: 0.8,
    expectedMinutes: 70,
    fdrLevels: [3],
    opponents: ["MCI (H)"],
    teamCsPcts: [],
    ...patch,
  };
}

function player(
  patch: Partial<PlayerProjectionInput> & Pick<PlayerProjectionInput, "elementId" | "webName">,
): PlayerProjectionInput {
  return {
    position: 3,
    clubId: 1,
    clubShort: "ARS",
    clubPulseCode: null,
    priceTenths: 70,
    ownership: 10,
    status: "a",
    chanceNext: 100,
    chanceThis: undefined,
    news: "",
    newsAdded: undefined,
    gameweeks: [gw({ gw: 12, xPts: 5, p60: 0.8 })],
    ...patch,
  };
}

function query(patch: Partial<PlayerProjectionQuery> = {}) {
  return queryPlayerProjectionTable({
    rows: patch.rows ?? [],
    horizon: 3,
    search: "",
    positions: [],
    clubIds: [],
    minPriceTenths: null,
    maxPriceTenths: null,
    minPlayChancePct: null,
    hideInjured: false,
    sortKey: "name",
    sortDir: "asc",
    topN: null,
    ...patch,
  });
}

describe("U12 tabela predykcji piłkarzy", () => {
  const rows = [
    player({
      elementId: 1,
      webName: "Haaland",
      position: 4,
      clubId: 2,
      clubShort: "MCI",
      priceTenths: 150,
      gameweeks: [gw({ gw: 12, xPts: 8.2, p60: 0.9 })],
    }),
    player({
      elementId: 2,
      webName: "Raya",
      position: 1,
      clubShort: "ARS",
      priceTenths: 55,
      status: "d",
      chanceNext: 75,
      gameweeks: [
        gw({
          gw: 12,
          xPts: 4.2,
          p60: 0.4,
          teamCsPcts: [32],
        }),
      ],
    }),
    player({
      elementId: 3,
      webName: "Saka",
      position: 3,
      priceTenths: 100,
      status: "i",
      chanceNext: 0,
      gameweeks: [gw({ gw: 12, xPts: 1, p60: 0.1 })],
    }),
  ];

  it("filtruje pozycję, cenę, szansę gry, kontuzję i wyszukiwanie", () => {
    expect(query({ rows, positions: [1] }).map((v) => v.row.webName)).toEqual([
      "Raya",
    ]);
    expect(
      query({ rows, minPriceTenths: 90, maxPriceTenths: 140 }).map(
        (v) => v.row.webName,
      ),
    ).toEqual(["Saka"]);
    expect(
      query({ rows, minPlayChancePct: 50 }).map((v) => v.row.webName),
    ).toEqual(["Haaland"]);
    expect(query({ rows, hideInjured: true }).map((v) => v.row.webName)).toEqual([
      "Haaland",
      "Raya",
    ]);
    expect(query({ rows, search: "ray" }).map((v) => v.row.webName)).toEqual([
      "Raya",
    ]);
  });

  it("sortuje sumę xPts malejąco i cenę rosnąco, potem ucina TOP N", () => {
    expect(
      query({ rows, sortKey: "xptsSum", sortDir: "desc" }).map(
        (v) => v.row.webName,
      ),
    ).toEqual(["Haaland", "Raya", "Saka"]);
    expect(
      query({ rows, sortKey: "price", sortDir: "asc" }).map((v) => v.row.webName),
    ).toEqual(["Raya", "Saka", "Haaland"]);
    expect(
      query({ rows, sortKey: "xptsSum", sortDir: "desc", topN: 1 }).map(
        (v) => v.row.webName,
      ),
    ).toEqual(["Haaland"]);
  });

  it("BGW wchodzi do sumy jako 0, a szansa gola w CSV zostaje kreską", () => {
    const blank = player({
      elementId: 9,
      webName: "Blank",
      gameweeks: [
        gw({ gw: 12, isBlank: true, xPts: null, p60: null, opponents: [] }),
        gw({ gw: 13, xPts: 4.2, p60: 0.7 }),
      ],
    });
    expect(horizonXptsSum(blank.gameweeks)).toBeCloseTo(4.2);
    const [view] = query({ rows: [blank], horizon: 3 });
    expect(view?.xptsSum).toBeCloseTo(4.2);
    const csv = playerProjectionsToCsv({
      views: query({ rows: [player({ elementId: 4, webName: "Mid" })] }),
      lang: "pl",
      columns: ["goal", "assist", "cs"],
    });
    expect(csv).toContain("—");
    expect(csv.split("\n")[1]).toMatch(/—,—,—$/);
    expect(formatCsText(3, [gw({ gw: 12, teamCsPcts: [40] })])).toBe("—");
    expect(formatCsText(1, [gw({ gw: 12, teamCsPcts: [32] })])).toBe("32%");
    const fdrCsv = playerProjectionsToCsv({
      views: query({
        rows: [
          player({
            elementId: 8,
            webName: "Fdr",
            gameweeks: [
              gw({ gw: 12, opponents: ["MCI (H)"], fdrLevels: [2] }),
              gw({ gw: 13, isBlank: true, xPts: null, opponents: [], fdrLevels: [] }),
            ],
          }),
        ],
        horizon: 3,
      }),
      lang: "en",
      columns: ["fdr"],
    });
    expect(fdrCsv).toContain("MCI (H) 2");
    expect(formatFdrColumn([
      gw({ gw: 12, opponents: ["FUL (A)", "NEW (H)"], fdrLevels: [4, 3] }),
    ])).toBe("FUL (A) 4 · NEW (H) 3");
  });
});
