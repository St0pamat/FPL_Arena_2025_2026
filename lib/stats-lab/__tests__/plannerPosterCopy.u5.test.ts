import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pt } from "@/lib/stats-lab/plannerI18n";

const ROOT = path.resolve(__dirname, "../../..");

describe("U5 planner poster copy", () => {
  it("PL/EN: brand, empty slot, team value, footer Predykcje", () => {
    expect(pt("pl", "planner.poster.brand")).toBe("Planer FPL");
    expect(pt("en", "planner.poster.brand")).toBe("FPL Planner");
    expect(pt("pl", "planner.pitch.emptySlot")).toBe("Wolne miejsce");
    expect(pt("en", "planner.pitch.emptySlot")).toBe("Empty slot");
    expect(pt("pl", "planner.poster.teamValue")).toBe("Wartość drużyny");
    expect(pt("en", "planner.poster.teamValue")).toBe("Team value");
    expect(pt("pl", "planner.poster.footer")).toBe(
      "fpl-arena.com · Dane: FPL · Predykcje: FPL Arena",
    );
    expect(pt("en", "planner.poster.footer")).toBe(
      "fpl-arena.com · Data: FPL · Predictions: FPL Arena",
    );
  });

  it("KPI/market nadal „Do wydania”; plakat używa teamValue + computePosterTeamValueTenths", () => {
    expect(pt("pl", "planner.price.spendingPower")).toBe("Do wydania");
    expect(pt("pl", "planner.kpi.spendingPower")).toBe("Do wydania");
    const client = readFileSync(
      path.join(
        ROOT,
        "components/admin/stats-lab/StatsLabPlannerClient.tsx",
      ),
      "utf8",
    );
    expect(client).toMatch(/planner\.poster\.teamValue/);
    expect(client).toMatch(/computePosterTeamValueTenths/);
    expect(client).toMatch(/planner\.poster\.brand/);
    expect(client).not.toMatch(/STATS LAB PLANNER/);
    expect(client).not.toMatch(/planner\.poster\.squadValue/);
  });
});
