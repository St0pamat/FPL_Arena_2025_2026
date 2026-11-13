import { describe, expect, it } from "vitest";
import { formatFixturePillLabel } from "@/lib/stats-lab/plannerFixtureUi";

describe("U4b Predykcje — pigułki rywali jak w Planerze", () => {
  it("formatFixturePillLabel: WIELKIE litery + (D)/(W) PL i (H)/(A) EN", () => {
    expect(formatFixturePillLabel("pl", "hul", false)).toBe("HUL (W)");
    expect(formatFixturePillLabel("pl", "bou", true)).toBe("BOU (D)");
    expect(formatFixturePillLabel("en", "hul", false)).toBe("HUL (A)");
    expect(formatFixturePillLabel("en", "bou", true)).toBe("BOU (H)");
    expect(formatFixturePillLabel("pl", "hul", false)).toMatch(
      /^[A-Z]{3} \((D|W)\)$/,
    );
    expect(formatFixturePillLabel("en", "bou", true)).toMatch(
      /^[A-Z]{3} \((H|A)\)$/,
    );
  });

  it("tickerLabel path (Projections UI) uses same helper — no lowercase away codes", () => {
    // Symulacja StatsLabProjectionsClient.tickerLabel
    function tickerLabel(
      opponentShortName: string,
      wasHome: boolean,
      lang: "pl" | "en",
    ): string {
      return (
        formatFixturePillLabel(lang, opponentShortName, wasHome) ??
        opponentShortName
      );
    }
    expect(tickerLabel("hul", false, "pl")).toBe("HUL (W)");
    expect(tickerLabel("bou", false, "en")).toBe("BOU (A)");
    expect(tickerLabel("hul", false, "en")).not.toBe("hul");
  });
});
