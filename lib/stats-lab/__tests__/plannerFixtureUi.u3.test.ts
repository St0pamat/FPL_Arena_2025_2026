import { describe, expect, it } from "vitest";
import type { PlayerGwProjection } from "@/lib/stats-lab/plannerEngine";
import {
  FIXTURE_PILL_CLASS,
  PLANNER_ACTION_HIT_CLASS,
  captainArmbandAria,
  captainArmbandKind,
  captainArmbandLabel,
  formatFixturePillLabel,
  formatFixturePills,
  matchPillRegex,
} from "@/lib/stats-lab/plannerFixtureUi";
import {
  PLANNER_LABELS,
  PLANNER_TOOLTIPS,
  pt,
  ptTip,
} from "@/lib/stats-lab/plannerI18n";
import { listPlannerControlAccessibleNames } from "@/lib/stats-lab/plannerUiFormat";

function proj(
  partial: Partial<PlayerGwProjection> & {
    fixtures?: PlayerGwProjection["fixtures"];
  },
): PlayerGwProjection {
  return {
    elementId: 1,
    gameweek: 10,
    xPts: 4.2,
    expectedMinutes: 80,
    p0: 0.1,
    p60: 0.8,
    p1: 0.9,
    isBlank: false,
    isDouble: false,
    fixtures: [],
    ...partial,
  };
}

function fx(
  short: string,
  isHome: boolean,
  fdrLevel = 3,
): PlayerGwProjection["fixtures"][number] {
  return {
    fixtureId: 1,
    matchXPts: 4,
    expectedMinutes: 80,
    p0: 0.1,
    p60: 0.8,
    p1: 0.9,
    opponentShortName: short,
    tickerLabel: "ignored",
    isHome,
    fdrLevel: fdrLevel as 1 | 2 | 3 | 4 | 5,
  };
}

describe("U3 fixture pills (formatFixturePillLabel / formatFixturePills)", () => {
  it("match pills match PL /^[A-Z]{3} \\((D|W)\\)$/ and EN /^[A-Z]{3} \\((H|A)\\)$/", () => {
    expect(formatFixturePillLabel("pl", "new", false)).toBe("NEW (W)");
    expect(formatFixturePillLabel("pl", "NFO", true)).toBe("NFO (D)");
    expect(formatFixturePillLabel("en", "new", false)).toBe("NEW (A)");
    expect(formatFixturePillLabel("en", "NFO", true)).toBe("NFO (H)");

    expect(formatFixturePillLabel("pl", "new", false)).toMatch(
      matchPillRegex("pl"),
    );
    expect(formatFixturePillLabel("en", "NFO", true)).toMatch(
      matchPillRegex("en"),
    );
  });

  it("always UPPERCASE opponent code (never lowercase away ticker)", () => {
    const away = formatFixturePillLabel("pl", "LEE", false);
    expect(away).toBe("LEE (W)");
    expect(away).not.toMatch(/[a-z]/);
  });

  it("DGW yields 2 pills; BGW = Bez meczu / No fixture; empty code = Brak danych / No data; never ()", () => {
    const dgw = formatFixturePills(
      "pl",
      proj({
        isDouble: true,
        fixtures: [fx("ARS", true), fx("new", false)],
      }),
    );
    expect(dgw).toHaveLength(2);
    expect(dgw.every((p) => p.kind === "match")).toBe(true);
    expect(dgw[0]!.label).toBe("ARS (D)");
    expect(dgw[1]!.label).toBe("NEW (W)");

    const bgwPl = formatFixturePills(
      "pl",
      proj({ isBlank: true, fixtures: [] }),
    );
    expect(bgwPl).toHaveLength(1);
    expect(bgwPl[0]!.kind).toBe("none");
    expect(bgwPl[0]!.label).toBe("Bez meczu");

    const bgwEn = formatFixturePills(
      "en",
      proj({ isBlank: true, fixtures: [] }),
    );
    expect(bgwEn[0]!.label).toBe("No fixture");

    const unknownPl = formatFixturePills(
      "pl",
      proj({ fixtures: [fx("", true)] }),
    );
    expect(unknownPl[0]!.kind).toBe("unknown");
    expect(unknownPl[0]!.label).toBe("Brak danych");

    const unknownEn = formatFixturePills(
      "en",
      proj({ fixtures: [fx("   ", false)] }),
    );
    expect(unknownEn[0]!.label).toBe("No data");

    for (const lang of ["pl", "en"] as const) {
      for (const pills of [
        formatFixturePills(lang, proj({ isBlank: true })),
        formatFixturePills(lang, proj({ fixtures: [fx("", true)] })),
        formatFixturePills(
          lang,
          proj({ fixtures: [fx("MCI", true), fx("AVL", false)] }),
        ),
      ]) {
        for (const p of pills) {
          expect(p.label).not.toContain("()");
          expect(p.label.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("FIXTURE_PILL_CLASS includes whitespace-nowrap; venueTip PL/EN present", () => {
    expect(FIXTURE_PILL_CLASS).toContain("whitespace-nowrap");
    expect(FIXTURE_PILL_CLASS).toContain("text-[11px]");
    expect(pt("pl", "planner.fixture.venueTip")).toBe(
      "D = u siebie, W = na wyjeździe",
    );
    expect(pt("en", "planner.fixture.venueTip")).toBe("H = home, A = away");
    expect(ptTip("pl", "planner.fixture.venueTip")).toBe(
      "D = u siebie, W = na wyjeździe",
    );
    expect(ptTip("en", "planner.fixture.venueTip")).toBe("H = home, A = away");
  });

  it("empty shortName returns null (UI uses unknown)", () => {
    expect(formatFixturePillLabel("pl", "", true)).toBeNull();
    expect(formatFixturePillLabel("en", null, false)).toBeNull();
    expect(formatFixturePillLabel("pl", "   ", true)).toBeNull();
  });

  it('empty "" and spaces "   " both yield Brak danych / No data (not only null)', () => {
    for (const lang of ["pl", "en"] as const) {
      const expected = lang === "pl" ? "Brak danych" : "No data";
      for (const raw of ["", "   "] as const) {
        const pills = formatFixturePills(
          lang,
          proj({ fixtures: [fx(raw, true)] }),
        );
        expect(pills).toHaveLength(1);
        expect(pills[0]!.kind).toBe("unknown");
        expect(pills[0]!.label).toBe(expected);
        expect(pills[0]!.label).not.toContain("()");
      }
    }
  });
});

describe("U3 captain armband (C / VC / TC)", () => {
  it("TC aria is Kapitan/Captain, Triple Captain; kind TC when 3xc + captain", () => {
    expect(
      captainArmbandKind({
        isCaptain: true,
        isViceCaptain: false,
        activeChip: "3xc",
      }),
    ).toBe("TC");
    expect(captainArmbandAria("pl", "TC")).toBe("Kapitan, Triple Captain");
    expect(captainArmbandAria("en", "TC")).toBe("Captain, Triple Captain");
    expect(pt("pl", "planner.role.badgeTC")).toBe("TC");
    expect(pt("en", "planner.role.badgeTC")).toBe("TC");
    expect(PLANNER_LABELS.pl["planner.role.badgeTC.aria"]).toBe(
      "Kapitan, Triple Captain",
    );
    expect(PLANNER_LABELS.en["planner.role.badgeTC.aria"]).toBe(
      "Captain, Triple Captain",
    );
  });

  it("captain without 3xc is C; vice is VC; neither is null", () => {
    expect(
      captainArmbandKind({
        isCaptain: true,
        isViceCaptain: false,
        activeChip: null,
      }),
    ).toBe("C");
    expect(
      captainArmbandKind({
        isCaptain: false,
        isViceCaptain: true,
        activeChip: "3xc",
      }),
    ).toBe("VC");
    expect(
      captainArmbandKind({
        isCaptain: false,
        isViceCaptain: false,
        activeChip: null,
      }),
    ).toBeNull();
  });

  it("tabela i boisko dają identyczne oznaczenia C/VC/TC (captainArmbandLabel)", () => {
    for (const lang of ["pl", "en"] as const) {
      expect(
        captainArmbandLabel(
          lang,
          captainArmbandKind({
            isCaptain: true,
            isViceCaptain: false,
            activeChip: null,
          }),
        ),
      ).toBe("C");
      expect(
        captainArmbandLabel(
          lang,
          captainArmbandKind({
            isCaptain: false,
            isViceCaptain: true,
            activeChip: null,
          }),
        ),
      ).toBe("VC");
      expect(
        captainArmbandLabel(
          lang,
          captainArmbandKind({
            isCaptain: true,
            isViceCaptain: false,
            activeChip: "3xc",
          }),
        ),
      ).toBe("TC");
    }
  });

  it("setting C on current VC clears VC (report behaviour, pure simulation)", () => {
    let captainElementId: number | null = 1;
    let viceCaptainElementId: number | null = 2;
    const onSetCaptain = (elementId: number) => {
      captainElementId = elementId;
      viceCaptainElementId =
        viceCaptainElementId === elementId ? null : viceCaptainElementId;
    };
    onSetCaptain(2);
    expect(captainElementId).toBe(2);
    expect(viceCaptainElementId).toBeNull();
  });
});

describe("U3 hit area and + styles", () => {
  it("PLANNER_ACTION_HIT_CLASS has 32px and coarse 44px classes", () => {
    expect(PLANNER_ACTION_HIT_CLASS).toContain("min-h-8");
    expect(PLANNER_ACTION_HIT_CLASS).toContain("min-w-8");
    expect(PLANNER_ACTION_HIT_CLASS).toContain(
      "[@media(pointer:coarse)]:min-h-11",
    );
    expect(PLANNER_ACTION_HIT_CLASS).toContain(
      "[@media(pointer:coarse)]:min-w-11",
    );
    expect(PLANNER_ACTION_HIT_CLASS).toContain("h-8");
  });
});

describe("U3 accessible names — every Planner button / role=button source", () => {
  it("every catalogued control has non-empty accessible name in PL and EN", () => {
    for (const lang of ["pl", "en"] as const) {
      const names = listPlannerControlAccessibleNames(lang);
      expect(names.length).toBeGreaterThan(20);
      for (const { id, name } of names) {
        expect(name.trim().length, `${lang} ${id}`).toBeGreaterThan(0);
      }
    }
  });

  it("EN planner.action.info tip is Details: {player}; PL unchanged", () => {
    expect(PLANNER_TOOLTIPS.pl["planner.action.info"]).toBe(
      "Informacje: {player}",
    );
    expect(PLANNER_TOOLTIPS.en["planner.action.info"]).toBe(
      "Details: {player}",
    );
  });
});

describe("U3 i18n key presence", () => {
  it("new fixture/role keys exist in PL and EN labels", () => {
    for (const key of [
      "planner.fixture.unknown",
      "planner.fixture.venueTip",
      "planner.role.badgeTC",
      "planner.role.badgeTC.aria",
    ] as const) {
      expect(PLANNER_LABELS.pl[key].trim().length).toBeGreaterThan(0);
      expect(PLANNER_LABELS.en[key].trim().length).toBeGreaterThan(0);
    }
    expect(PLANNER_LABELS.pl["planner.fixture.home"]).toBe("(D)");
    expect(PLANNER_LABELS.pl["planner.fixture.away"]).toBe("(W)");
  });
});
