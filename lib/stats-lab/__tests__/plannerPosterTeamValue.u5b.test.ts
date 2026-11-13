import { describe, expect, it } from "vitest";
import { computePosterTeamValueTenths } from "@/lib/stats-lab/plannerEngine";
import { formatTenthsAsPounds, pt } from "@/lib/stats-lab/plannerI18n";

describe("U5b poster team value (CP + bank)", () => {
  it("fixture: bank 1.5 + suma now_cost 98.7 → £100.2m", () => {
    // 15 zawodników: 14×65 + 77 = 910+77 = 987 tenths (= £98.7m)
    const prices = [
      65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 77,
    ];
    expect(prices.reduce((a, b) => a + b, 0)).toBe(987);
    const tenths = computePosterTeamValueTenths({
      playerNowCostTenths: prices,
      bankTenths: 15, // £1.5m
    });
    expect(tenths).toBe(1002);
    expect(formatTenthsAsPounds(tenths)).toBe("£100.2m");
  });

  it("nie sumuje SP — tylko now_cost + bank", () => {
    const tenths = computePosterTeamValueTenths({
      playerNowCostTenths: [100, 200],
      bankTenths: 50,
    });
    expect(tenths).toBe(350);
  });

  it("etykieta PL/EN + stopka Predykcje", () => {
    expect(pt("pl", "planner.poster.teamValue")).toBe("Wartość drużyny");
    expect(pt("en", "planner.poster.teamValue")).toBe("Team value");
    expect(pt("pl", "planner.poster.footer")).toBe(
      "fpl-arena.com · Dane: FPL · Predykcje: FPL Arena",
    );
    expect(pt("en", "planner.poster.footer")).toBe(
      "fpl-arena.com · Data: FPL · Predictions: FPL Arena",
    );
  });
});
